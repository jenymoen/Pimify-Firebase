import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RolePermissions } from '@/lib/role-permissions';
import { WorkflowAction, UserRole } from '@/types/workflow';

// Validation schemas
const NotificationRequestSchema = z.object({
  type: z.enum(['email', 'in-app', 'both']).default('both'),
  template: z.string().min(1, 'Template is required'),
  recipients: z.array(z.object({
    userId: z.string(),
    email: z.string().email().optional(),
    name: z.string().optional(),
  })).min(1, 'At least one recipient is required'),
  data: z.record(z.any()).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  scheduledAt: z.string().optional(), // ISO date string
  expiresAt: z.string().optional(), // ISO date string
});

const NotificationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    notificationId: z.string(),
    status: z.enum(['pending', 'sent', 'failed', 'scheduled']),
    recipients: z.array(z.object({
      userId: z.string(),
      status: z.enum(['pending', 'sent', 'failed']),
      messageId: z.string().optional(),
      error: z.string().optional(),
    })),
    scheduledAt: z.string().optional(),
    expiresAt: z.string().optional(),
  }).optional(),
  error: z.string().optional(),
});

const NotificationQuerySchema = z.object({
  userId: z.string().optional(),
  status: z.enum(['pending', 'sent', 'failed', 'scheduled']).optional(),
  type: z.enum(['email', 'in-app', 'both']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dateRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
  }).optional(),
});

// Initialize services
const rolePermissions = new RolePermissions();

// In-memory notification storage (in production, use database)
const notifications = new Map<string, any>();
const notificationTemplates = new Map<string, any>();

// Initialize default templates
notificationTemplates.set('product_submitted', {
  id: 'product_submitted',
  name: 'Product Submitted for Review',
  subject: 'Product "{productName}" submitted for review',
  body: 'Product "{productName}" has been submitted for review by {submitterName}.',
  type: 'email',
  priority: 'medium',
});

notificationTemplates.set('product_approved', {
  id: 'product_approved',
  name: 'Product Approved',
  subject: 'Product "{productName}" has been approved',
  body: 'Product "{productName}" has been approved and is ready for publication.',
  type: 'email',
  priority: 'medium',
});

notificationTemplates.set('product_rejected', {
  id: 'product_rejected',
  name: 'Product Rejected',
  subject: 'Product "{productName}" has been rejected',
  body: 'Product "{productName}" has been rejected. Reason: {reason}',
  type: 'email',
  priority: 'high',
});

notificationTemplates.set('product_published', {
  id: 'product_published',
  name: 'Product Published',
  subject: 'Product "{productName}" has been published',
  body: 'Product "{productName}" has been successfully published.',
  type: 'email',
  priority: 'medium',
});

/**
 * POST /api/notifications
 * Send notifications to users
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = NotificationRequestSchema.parse(body);
    
    const { type, template, recipients, data, priority, scheduledAt, expiresAt } = validatedData;

    // Extract user context from headers
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (!userId || !userRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User authentication required' 
        },
        { status: 401 }
      );
    }

    // Check if user has permission to send notifications
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.SEND_NOTIFICATIONS,
      { userId }
    );

    if (!hasPermission.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient permissions: ${hasPermission.reason}` 
        },
        { status: 403 }
      );
    }

    // Get notification template
    const templateData = notificationTemplates.get(template);
    if (!templateData) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Notification template '${template}' not found` 
        },
        { status: 400 }
      );
    }

    // Generate notification ID
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Process recipients
    const processedRecipients = [];
    for (const recipient of recipients) {
      try {
        // Send notification based on type
        const result = await sendNotification({
          type,
          template: templateData,
          recipient,
          data,
          priority,
        });

        processedRecipients.push({
          userId: recipient.userId,
          status: result.success ? 'sent' : 'failed',
          messageId: result.messageId,
          error: result.error,
        });
      } catch (error) {
        processedRecipients.push({
          userId: recipient.userId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Determine overall status
    const hasFailures = processedRecipients.some(r => r.status === 'failed');
    const allPending = processedRecipients.every(r => r.status === 'pending');
    const status = scheduledAt ? 'scheduled' : 
                   allPending ? 'pending' : 
                   hasFailures ? 'failed' : 'sent';

    // Store notification
    const notification = {
      id: notificationId,
      type,
      template,
      recipients: processedRecipients,
      data,
      priority,
      status,
      createdBy: {
        userId,
        userName: request.headers.get('x-user-name') || 'Unknown User',
        userRole,
      },
      createdAt: new Date().toISOString(),
      scheduledAt,
      expiresAt,
    };

    notifications.set(notificationId, notification);

    // Prepare response
    const response = NotificationResponseSchema.parse({
      success: true,
      message: `Notification sent to ${processedRecipients.length} recipients`,
      data: {
        notificationId,
        status,
        recipients: processedRecipients,
        scheduledAt,
        expiresAt,
      },
    });

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Send notification error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications
 * Get notifications with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract user context from headers
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (!userId || !userRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User authentication required' 
        },
        { status: 401 }
      );
    }

    // Check if user has permission to view notifications
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.VIEW_NOTIFICATIONS,
      { userId }
    );

    if (!hasPermission.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient permissions: ${hasPermission.reason}` 
        },
        { status: 403 }
      );
    }

    // Parse query parameters
    const queryParams = {
      userId: searchParams.get('userId') || undefined,
      status: searchParams.get('status') as any || undefined,
      type: searchParams.get('type') as any || undefined,
      priority: searchParams.get('priority') as any || undefined,
      dateRange: {
        start: searchParams.get('dateStart') || undefined,
        end: searchParams.get('dateEnd') || undefined,
      },
      pagination: {
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '20'),
      },
    };

    // Validate query parameters
    const validatedQuery = NotificationQuerySchema.parse(queryParams);

    // Filter notifications
    let filteredNotifications = Array.from(notifications.values());

    // Apply filters
    if (validatedQuery.userId) {
      filteredNotifications = filteredNotifications.filter(n => 
        n.recipients.some((r: any) => r.userId === validatedQuery.userId)
      );
    }

    if (validatedQuery.status) {
      filteredNotifications = filteredNotifications.filter(n => 
        n.status === validatedQuery.status
      );
    }

    if (validatedQuery.type) {
      filteredNotifications = filteredNotifications.filter(n => 
        n.type === validatedQuery.type
      );
    }

    if (validatedQuery.priority) {
      filteredNotifications = filteredNotifications.filter(n => 
        n.priority === validatedQuery.priority
      );
    }

    if (validatedQuery.dateRange.start) {
      const startDate = new Date(validatedQuery.dateRange.start);
      filteredNotifications = filteredNotifications.filter(n => 
        new Date(n.createdAt) >= startDate
      );
    }

    if (validatedQuery.dateRange.end) {
      const endDate = new Date(validatedQuery.dateRange.end);
      filteredNotifications = filteredNotifications.filter(n => 
        new Date(n.createdAt) <= endDate
      );
    }

    // Apply pagination
    const { page, limit } = validatedQuery.pagination;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

    // Calculate pagination info
    const total = filteredNotifications.length;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        notifications: paginatedNotifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    });

  } catch (error) {
    console.error('Get notifications error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid query parameters',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications
 * Update notification status or mark as read
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const action = searchParams.get('action'); // 'mark-read', 'cancel', 'resend'

    if (!notificationId || !action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Notification ID and action are required' 
        },
        { status: 400 }
      );
    }

    // Extract user context from headers
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (!userId || !userRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User authentication required' 
        },
        { status: 401 }
      );
    }

    // Check if user has permission to update notifications
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.UPDATE_NOTIFICATIONS,
      { userId }
    );

    if (!hasPermission.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient permissions: ${hasPermission.reason}` 
        },
        { status: 403 }
      );
    }

    // Get notification
    const notification = notifications.get(notificationId);
    if (!notification) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Notification not found' 
        },
        { status: 404 }
      );
    }

    // Perform action
    switch (action) {
      case 'mark-read':
        // Mark notification as read for user
        notification.readBy = notification.readBy || [];
        if (!notification.readBy.includes(userId)) {
          notification.readBy.push(userId);
        }
        break;

      case 'cancel':
        if (notification.status === 'scheduled') {
          notification.status = 'cancelled';
          notification.cancelledAt = new Date().toISOString();
        } else {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Only scheduled notifications can be cancelled' 
            },
            { status: 400 }
          );
        }
        break;

      case 'resend':
        if (notification.status === 'failed') {
          // Resend failed notifications
          for (const recipient of notification.recipients) {
            if (recipient.status === 'failed') {
              try {
                const result = await sendNotification({
                  type: notification.type,
                  template: notificationTemplates.get(notification.template),
                  recipient,
                  data: notification.data,
                  priority: notification.priority,
                });
                
                recipient.status = result.success ? 'sent' : 'failed';
                recipient.messageId = result.messageId;
                recipient.error = result.error;
              } catch (error) {
                recipient.status = 'failed';
                recipient.error = error instanceof Error ? error.message : 'Unknown error';
              }
            }
          }
          
          // Update overall status
          const hasFailures = notification.recipients.some((r: any) => r.status === 'failed');
          notification.status = hasFailures ? 'failed' : 'sent';
        } else {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Only failed notifications can be resent' 
            },
            { status: 400 }
          );
        }
        break;

      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action' 
          },
          { status: 400 }
        );
    }

    // Update notification
    notification.updatedAt = new Date().toISOString();
    notifications.set(notificationId, notification);

    return NextResponse.json({
      success: true,
      message: `Notification ${action} completed successfully`,
      data: {
        notificationId,
        status: notification.status,
      },
    });

  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Delete notification
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Notification ID is required' 
        },
        { status: 400 }
      );
    }

    // Extract user context from headers
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (!userId || !userRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User authentication required' 
        },
        { status: 401 }
      );
    }

    // Check if user has permission to delete notifications
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.DELETE_NOTIFICATIONS,
      { userId }
    );

    if (!hasPermission.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient permissions: ${hasPermission.reason}` 
        },
        { status: 403 }
      );
    }

    // Check if notification exists
    if (!notifications.has(notificationId)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Notification not found' 
        },
        { status: 404 }
      );
    }

    // Delete notification
    notifications.delete(notificationId);

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Helper functions
async function sendNotification(options: {
  type: string;
  template: any;
  recipient: any;
  data: any;
  priority: string;
}) {
  const { type, template, recipient, data, priority } = options;

  // This is a placeholder - replace with your actual notification service
  // For email notifications, integrate with services like SendGrid, AWS SES, etc.
  // For in-app notifications, store in database and use WebSocket/SSE for real-time updates

  console.log('Sending notification:', {
    type,
    template: template.id,
    recipient: recipient.userId,
    priority,
  });

  // Simulate sending
  const success = Math.random() > 0.1; // 90% success rate for demo

  return {
    success,
    messageId: success ? `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : undefined,
    error: success ? undefined : 'Failed to send notification',
  };
}
