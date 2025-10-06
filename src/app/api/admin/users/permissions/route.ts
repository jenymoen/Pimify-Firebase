import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RolePermissions } from '@/lib/role-permissions';
import { DynamicPermissionManager } from '@/lib/dynamic-permissions';
import { WorkflowAction, UserRole } from '@/types/workflow';

// Validation schemas
const PermissionRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
  expiresAt: z.string().optional(), // ISO date string
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const PermissionRevokeSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  permissionIds: z.array(z.string()).optional(), // If not provided, revoke all
  reason: z.string().optional(),
});

const PermissionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    userId: z.string(),
    permissions: z.array(z.object({
      id: z.string(),
      permission: z.string(),
      grantedAt: z.string(),
      expiresAt: z.string().optional(),
      grantedBy: z.object({
        userId: z.string(),
        userName: z.string(),
        userRole: z.nativeEnum(UserRole),
      }),
    })),
  }).optional(),
  error: z.string().optional(),
});

// Initialize services
const rolePermissions = new RolePermissions();
const dynamicPermissionManager = new DynamicPermissionManager();

/**
 * POST /api/admin/users/permissions
 * Grant dynamic permissions to a user
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = PermissionRequestSchema.parse(body);
    
    const { userId, permissions, expiresAt, reason, metadata } = validatedData;

    // Extract user context from headers
    const currentUserId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (!currentUserId || !userRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User authentication required' 
        },
        { status: 401 }
      );
    }

    // Check if user has permission to manage user permissions
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.MANAGE_USER_PERMISSIONS,
      { userId: currentUserId }
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

    // Grant permissions
    const grantedPermissions = [];
    for (const permission of permissions) {
      try {
        const result = await dynamicPermissionManager.assignPermission(
          userId,
          permission,
          {
            grantedBy: {
              userId: currentUserId,
              userName: request.headers.get('x-user-name') || 'Unknown User',
              userRole,
            },
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            reason,
            metadata,
          }
        );

        if (result.success && result.assignment) {
          grantedPermissions.push({
            id: result.assignment.id,
            permission: result.assignment.permission,
            grantedAt: result.assignment.grantedAt.toISOString(),
            expiresAt: result.assignment.expiresAt?.toISOString(),
            grantedBy: result.assignment.grantedBy,
          });
        }
      } catch (error) {
        console.error(`Failed to grant permission ${permission}:`, error);
        // Continue with other permissions
      }
    }

    // Prepare response
    const response = PermissionResponseSchema.parse({
      success: true,
      message: `Granted ${grantedPermissions.length} permissions to user`,
      data: {
        userId,
        permissions: grantedPermissions,
      },
    });

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Grant permissions error:', error);

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
 * GET /api/admin/users/permissions
 * Get user permissions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User ID is required' 
        },
        { status: 400 }
      );
    }

    // Extract user context from headers
    const currentUserId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (!currentUserId || !userRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User authentication required' 
        },
        { status: 401 }
      );
    }

    // Check if user has permission to view user permissions
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.VIEW_USER_PERMISSIONS,
      { userId: currentUserId }
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

    // Get user's dynamic permissions
    const userPermissions = await dynamicPermissionManager.getUserPermissions(userId);

    // Get user's role-based permissions
    const rolePermissions = await rolePermissions.getRolePermissions(userRole);

    // Prepare response
    const response = {
      success: true,
      data: {
        userId,
        rolePermissions: rolePermissions.permissions,
        dynamicPermissions: userPermissions.map(p => ({
          id: p.id,
          permission: p.permission,
          grantedAt: p.grantedAt.toISOString(),
          expiresAt: p.expiresAt?.toISOString(),
          grantedBy: p.grantedBy,
          reason: p.reason,
          metadata: p.metadata,
        })),
        effectivePermissions: await rolePermissions.getEffectivePermissions(userRole, { userId }),
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Get user permissions error:', error);
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
 * DELETE /api/admin/users/permissions
 * Revoke dynamic permissions from a user
 */
export async function DELETE(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = PermissionRevokeSchema.parse(body);
    
    const { userId, permissionIds, reason } = validatedData;

    // Extract user context from headers
    const currentUserId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (!currentUserId || !userRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User authentication required' 
        },
        { status: 401 }
      );
    }

    // Check if user has permission to manage user permissions
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.MANAGE_USER_PERMISSIONS,
      { userId: currentUserId }
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

    let revokedCount = 0;

    if (permissionIds && permissionIds.length > 0) {
      // Revoke specific permissions
      for (const permissionId of permissionIds) {
        try {
          const result = await dynamicPermissionManager.revokePermission(
            permissionId,
            {
              revokedBy: {
                userId: currentUserId,
                userName: request.headers.get('x-user-name') || 'Unknown User',
                userRole,
              },
              reason,
            }
          );

          if (result.success) {
            revokedCount++;
          }
        } catch (error) {
          console.error(`Failed to revoke permission ${permissionId}:`, error);
          // Continue with other permissions
        }
      }
    } else {
      // Revoke all user permissions
      const result = await dynamicPermissionManager.revokeAllUserPermissions(
        userId,
        {
          revokedBy: {
            userId: currentUserId,
            userName: request.headers.get('x-user-name') || 'Unknown User',
            userRole,
          },
          reason,
        }
      );

      revokedCount = result.revokedCount;
    }

    return NextResponse.json({
      success: true,
      message: `Revoked ${revokedCount} permissions from user`,
      data: {
        userId,
        revokedCount,
      },
    });

  } catch (error) {
    console.error('Revoke permissions error:', error);

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
