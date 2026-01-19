/**
 * Notification Service
 * 
 * Handles email and in-app notifications for workflow events
 */

import { UserRole, WorkflowState, WorkflowAction } from '@/types/workflow';

/**
 * Notification channel types
 */
export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  PUSH = 'push',
  SMS = 'sms',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification status
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  READ = 'read',
}

/**
 * Notification template types
 */
export enum NotificationTemplate {
  PRODUCT_SUBMITTED = 'product_submitted',
  PRODUCT_APPROVED = 'product_approved',
  PRODUCT_REJECTED = 'product_rejected',
  PRODUCT_PUBLISHED = 'product_published',
  PRODUCT_COMMENTED = 'product_commented',
  PRODUCT_ASSIGNED = 'product_assigned',
  REVIEWER_ASSIGNED = 'reviewer_assigned',
  DEADLINE_APPROACHING = 'deadline_approaching',
  DEADLINE_EXCEEDED = 'deadline_exceeded',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  USER_ROLE_CHANGED = 'user_role_changed',
  PERMISSION_CHANGED = 'permission_changed',
}

/**
 * User notification preferences
 */
export interface UserNotificationPreferences {
  userId: string;
  globalEnabled: boolean;
  channels: NotificationChannel[];
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
    timezone: string;
  };
  eventPreferences: Record<NotificationTemplate, {
    enabled: boolean;
    channels: NotificationChannel[];
    priority: NotificationPriority;
  }>;
  language: string;
  timezone: string;
}

/**
 * Notification recipient
 */
export interface NotificationRecipient {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  preferences: UserNotificationPreferences;
  isActive: boolean;
}

/**
 * Notification template data
 */
export interface NotificationTemplateData {
  template: NotificationTemplate;
  recipient: NotificationRecipient;
  product?: {
    id: string;
    name: string;
    state: WorkflowState;
    assignedTo?: string;
    dueDate?: Date;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  workflow?: {
    action: WorkflowAction;
    previousState?: WorkflowState;
    newState: WorkflowState;
    reason?: string;
  };
  system?: {
    maintenanceWindow?: {
      start: Date;
      end: Date;
      description: string;
    };
    feature?: {
      name: string;
      description: string;
    };
  };
  customData?: Record<string, any>;
}

/**
 * Notification message
 */
export interface NotificationMessage {
  id: string;
  template: NotificationTemplate;
  recipient: NotificationRecipient;
  channel: NotificationChannel;
  priority: NotificationPriority;
  subject: string;
  content: string;
  htmlContent?: string;
  data: NotificationTemplateData;
  status: NotificationStatus;
  scheduledFor?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Email service configuration
 */
export interface EmailServiceConfig {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun';
  apiKey?: string;
  apiSecret?: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  smtpConfig?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

/**
 * In-app notification storage
 */
export interface InAppNotification {
  id: string;
  userId: string;
  type: NotificationTemplate;
  title: string;
  message: string;
  data: NotificationTemplateData;
  isRead: boolean;
  isArchived: boolean;
  priority: NotificationPriority;
  createdAt: Date;
  readAt?: Date;
  archivedAt?: Date;
  expiresAt?: Date;
}

/**
 * Notification delivery result
 */
export interface NotificationDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryAfter?: number; // seconds
  permanentFailure?: boolean;
}

/**
 * Notification statistics
 */
export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalBounced: number;
  totalRead: number;
  deliveryRate: number;
  readRate: number;
  averageDeliveryTime: number; // milliseconds
  channelStats: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
  templateStats: Record<NotificationTemplate, {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
}

/**
 * Notification Service Class
 */
export class NotificationService {
  private emailConfig: EmailServiceConfig;
  private inAppNotifications: Map<string, InAppNotification[]> = new Map();
  private messageQueue: NotificationMessage[] = [];
  private isProcessing: boolean = false;
  private stats: NotificationStats;

  constructor(emailConfig: EmailServiceConfig) {
    this.emailConfig = emailConfig;
    this.stats = this.initializeStats();
  }

  /**
   * Initialize notification statistics
   */
  private initializeStats(): NotificationStats {
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalBounced: 0,
      totalRead: 0,
      deliveryRate: 0,
      readRate: 0,
      averageDeliveryTime: 0,
      channelStats: {} as Record<NotificationChannel, any>,
      templateStats: {} as Record<NotificationTemplate, any>,
    };
  }

  /**
   * Send notification to recipient
   */
  async sendNotification(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    data: NotificationTemplateData,
    options: {
      channels?: NotificationChannel[];
      priority?: NotificationPriority;
      scheduledFor?: Date;
      maxRetries?: number;
    } = {}
  ): Promise<NotificationMessage[]> {
    const messages: NotificationMessage[] = [];
    const channels = options.channels || recipient.preferences.channels;
    const priority = options.priority || NotificationPriority.NORMAL;
    const maxRetries = options.maxRetries || 3;

    // Check if notifications are globally enabled for this user
    if (!recipient.preferences.globalEnabled) {
      return messages;
    }

    // Check if this event type is enabled for this user
    const eventPrefs = recipient.preferences.eventPreferences[template];
    if (!eventPrefs?.enabled) {
      return messages;
    }

    // Check quiet hours
    if (this.isInQuietHours(recipient.preferences)) {
      // Schedule for after quiet hours
      const scheduledFor = this.getNextAvailableTime(recipient.preferences);
      if (scheduledFor) {
        options.scheduledFor = scheduledFor;
      } else {
        return messages; // Skip if no available time
      }
    }

    // Create notification messages for each channel
    for (const channel of channels) {
      if (eventPrefs.channels.includes(channel)) {
        const message = await this.createNotificationMessage(
          template,
          recipient,
          data,
          channel,
          priority,
          maxRetries,
          options.scheduledFor
        );
        messages.push(message);
      }
    }

    // Queue messages for delivery
    this.messageQueue.push(...messages);

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }

    return messages;
  }

  /**
   * Create notification message
   */
  private async createNotificationMessage(
    template: NotificationTemplate,
    recipient: NotificationRecipient,
    data: NotificationTemplateData,
    channel: NotificationChannel,
    priority: NotificationPriority,
    maxRetries: number,
    scheduledFor?: Date
  ): Promise<NotificationMessage> {
    const messageId = this.generateMessageId();
    const now = new Date();

    // Generate subject and content based on template
    const { subject, content, htmlContent } = await this.generateNotificationContent(
      template,
      data,
      channel
    );

    return {
      id: messageId,
      template,
      recipient,
      channel,
      priority,
      subject,
      content,
      htmlContent,
      data,
      status: NotificationStatus.PENDING,
      scheduledFor,
      retryCount: 0,
      maxRetries,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Generate notification content based on template
   */
  private async generateNotificationContent(
    template: NotificationTemplate,
    data: NotificationTemplateData,
    channel: NotificationChannel
  ): Promise<{ subject: string; content: string; htmlContent?: string }> {
    const { product, user, workflow, system } = data;
    const recipient = data.recipient;

    switch (template) {
      case NotificationTemplate.PRODUCT_SUBMITTED:
        return {
          subject: `Product "${product?.name}" submitted for review`,
          content: `The product "${product?.name}" has been submitted for review and is awaiting approval.`,
          htmlContent: this.generateHtmlContent('product_submitted', data),
        };

      case NotificationTemplate.PRODUCT_APPROVED:
        return {
          subject: `Product "${product?.name}" approved`,
          content: `The product "${product?.name}" has been approved and is ready for publication.`,
          htmlContent: this.generateHtmlContent('product_approved', data),
        };

      case NotificationTemplate.PRODUCT_REJECTED:
        return {
          subject: `Product "${product?.name}" rejected`,
          content: `The product "${product?.name}" has been rejected. ${workflow?.reason ? `Reason: ${workflow.reason}` : ''}`,
          htmlContent: this.generateHtmlContent('product_rejected', data),
        };

      case NotificationTemplate.PRODUCT_PUBLISHED:
        return {
          subject: `Product "${product?.name}" published`,
          content: `The product "${product?.name}" has been published and is now live.`,
          htmlContent: this.generateHtmlContent('product_published', data),
        };

      case NotificationTemplate.PRODUCT_COMMENTED:
        return {
          subject: `New comment on "${product?.name}"`,
          content: `A new comment has been added to the product "${product?.name}".`,
          htmlContent: this.generateHtmlContent('product_commented', data),
        };

      case NotificationTemplate.PRODUCT_ASSIGNED:
        return {
          subject: `Product "${product?.name}" assigned to you`,
          content: `The product "${product?.name}" has been assigned to you for review.`,
          htmlContent: this.generateHtmlContent('product_assigned', data),
        };

      case NotificationTemplate.REVIEWER_ASSIGNED:
        return {
          subject: `You have been assigned as reviewer`,
          content: `You have been assigned as a reviewer for the product "${product?.name}".`,
          htmlContent: this.generateHtmlContent('reviewer_assigned', data),
        };

      case NotificationTemplate.DEADLINE_APPROACHING:
        return {
          subject: `Deadline approaching for "${product?.name}"`,
          content: `The deadline for reviewing "${product?.name}" is approaching. Due: ${product?.dueDate?.toLocaleDateString()}`,
          htmlContent: this.generateHtmlContent('deadline_approaching', data),
        };

      case NotificationTemplate.DEADLINE_EXCEEDED:
        return {
          subject: `Deadline exceeded for "${product?.name}"`,
          content: `The deadline for reviewing "${product?.name}" has been exceeded.`,
          htmlContent: this.generateHtmlContent('deadline_exceeded', data),
        };

      case NotificationTemplate.SYSTEM_MAINTENANCE:
        return {
          subject: `System Maintenance Scheduled`,
          content: `System maintenance is scheduled from ${system?.maintenanceWindow?.start.toLocaleString()} to ${system?.maintenanceWindow?.end.toLocaleString()}. ${system?.maintenanceWindow?.description}`,
          htmlContent: this.generateHtmlContent('system_maintenance', data),
        };

      case NotificationTemplate.USER_ROLE_CHANGED:
        return {
          subject: `Your role has been updated`,
          content: `Your user role has been changed to ${user?.role}.`,
          htmlContent: this.generateHtmlContent('user_role_changed', data),
        };

      case NotificationTemplate.PERMISSION_CHANGED:
        return {
          subject: `Your permissions have been updated`,
          content: `Your permissions have been updated. Please review your new access levels.`,
          htmlContent: this.generateHtmlContent('permission_changed', data),
        };

      default:
        return {
          subject: 'Notification',
          content: 'You have received a notification.',
        };
    }
  }

  /**
   * Generate HTML content for email notifications
   */
  private generateHtmlContent(template: string, data: NotificationTemplateData): string {
    // This would typically use a templating engine like Handlebars or Mustache
    // For now, we'll return a simple HTML structure
    const { product, user, workflow } = data;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${this.getTemplateTitle(template)}</h2>
        <p>Hello ${data.recipient.name},</p>
        <p>${this.getTemplateMessage(template, data)}</p>
        ${product ? `<p><strong>Product:</strong> ${product.name}</p>` : ''}
        ${workflow ? `<p><strong>Action:</strong> ${workflow.action}</p>` : ''}
        <p>Best regards,<br>The Pimify Team</p>
      </div>
    `;
  }

  /**
   * Get template title
   */
  private getTemplateTitle(template: string): string {
    const titles: Record<string, string> = {
      product_submitted: 'Product Submitted for Review',
      product_approved: 'Product Approved',
      product_rejected: 'Product Rejected',
      product_published: 'Product Published',
      product_commented: 'New Comment Added',
      product_assigned: 'Product Assigned',
      reviewer_assigned: 'Reviewer Assignment',
      deadline_approaching: 'Deadline Approaching',
      deadline_exceeded: 'Deadline Exceeded',
      system_maintenance: 'System Maintenance',
      user_role_changed: 'Role Updated',
      permission_changed: 'Permissions Updated',
    };
    return titles[template] || 'Notification';
  }

  /**
   * Get template message
   */
  private getTemplateMessage(template: string, data: NotificationTemplateData): string {
    const { product, user, workflow } = data;

    switch (template) {
      case 'product_submitted':
        return `The product "${product?.name}" has been submitted for review and is awaiting approval.`;
      case 'product_approved':
        return `The product "${product?.name}" has been approved and is ready for publication.`;
      case 'product_rejected':
        return `The product "${product?.name}" has been rejected.${workflow?.reason ? ` Reason: ${workflow.reason}` : ''}`;
      case 'product_published':
        return `The product "${product?.name}" has been published and is now live.`;
      case 'product_commented':
        return `A new comment has been added to the product "${product?.name}".`;
      case 'product_assigned':
        return `The product "${product?.name}" has been assigned to you for review.`;
      case 'reviewer_assigned':
        return `You have been assigned as a reviewer for the product "${product?.name}".`;
      case 'deadline_approaching':
        return `The deadline for reviewing "${product?.name}" is approaching.`;
      case 'deadline_exceeded':
        return `The deadline for reviewing "${product?.name}" has been exceeded.`;
      case 'system_maintenance':
        return `System maintenance is scheduled.`;
      case 'user_role_changed':
        return `Your user role has been changed to ${user?.role}.`;
      case 'permission_changed':
        return `Your permissions have been updated.`;
      default:
        return 'You have received a notification.';
    }
  }

  /**
   * Process notification queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (!message) break;

        // Check if message should be sent now
        if (message.scheduledFor && message.scheduledFor > new Date()) {
          // Re-queue for later
          this.messageQueue.push(message);
          continue;
        }

        await this.deliverNotification(message);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Deliver notification message
   */
  private async deliverNotification(message: NotificationMessage): Promise<void> {
    try {
      let result: NotificationDeliveryResult;

      switch (message.channel) {
        case NotificationChannel.EMAIL:
          result = await this.sendEmail(message);
          break;
        case NotificationChannel.IN_APP:
          result = await this.sendInAppNotification(message);
          break;
        case NotificationChannel.PUSH:
          result = await this.sendPushNotification(message);
          break;
        case NotificationChannel.SMS:
          result = await this.sendSmsNotification(message);
          break;
        default:
          result = { success: false, error: 'Unsupported channel' };
      }

      if (result.success) {
        message.status = NotificationStatus.SENT;
        message.sentAt = new Date();
        this.updateStats(message, 'sent');
      } else {
        message.retryCount++;
        if (message.retryCount >= message.maxRetries || result.permanentFailure) {
          message.status = NotificationStatus.FAILED;
          message.errorMessage = result.error;
          this.updateStats(message, 'failed');
        } else {
          // Re-queue for retry
          const retryDelay = Math.pow(2, message.retryCount) * 1000; // Exponential backoff
          setTimeout(() => {
            this.messageQueue.push(message);
            this.processQueue();
          }, retryDelay);
        }
      }

      message.updatedAt = new Date();
    } catch (error) {
      message.status = NotificationStatus.FAILED;
      message.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      message.updatedAt = new Date();
      this.updateStats(message, 'failed');
    }
  }

  /**
   * Send a raw email directly (used by system services like password reset)
   */
  async sendRawEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
      console.log('=================================================================');
      console.log(`EMAIL SENT TO: ${to}`);
      console.log(`SUBJECT: ${subject}`);
      console.log('CONTENT:');
      console.log(htmlContent);
      console.log('=================================================================');
      return true;
    } catch (error) {
      console.error('Failed to send raw email:', error);
      return false;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(message: NotificationMessage): Promise<NotificationDeliveryResult> {
    try {
      // This would integrate with an actual email service
      // For now, we'll simulate the email sending
      console.log(`Sending email to ${message.recipient.email}: ${message.subject}`);

      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 100));

      return {
        success: true,
        messageId: `email_${message.id}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email sending failed',
      };
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(message: NotificationMessage): Promise<NotificationDeliveryResult> {
    try {
      const inAppNotification: InAppNotification = {
        id: `inapp_${message.id}`,
        userId: message.recipient.userId,
        type: message.template,
        title: message.subject,
        message: message.content,
        data: message.data,
        isRead: false,
        isArchived: false,
        priority: message.priority,
        createdAt: new Date(),
      };

      // Store in-app notification
      if (!this.inAppNotifications.has(message.recipient.userId)) {
        this.inAppNotifications.set(message.recipient.userId, []);
      }
      this.inAppNotifications.get(message.recipient.userId)!.push(inAppNotification);

      return {
        success: true,
        messageId: inAppNotification.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'In-app notification failed',
      };
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(message: NotificationMessage): Promise<NotificationDeliveryResult> {
    try {
      // This would integrate with a push notification service like FCM
      console.log(`Sending push notification to ${message.recipient.userId}: ${message.subject}`);

      return {
        success: true,
        messageId: `push_${message.id}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Push notification failed',
      };
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSmsNotification(message: NotificationMessage): Promise<NotificationDeliveryResult> {
    try {
      // This would integrate with an SMS service like Twilio
      console.log(`Sending SMS to ${message.recipient.userId}: ${message.content}`);

      return {
        success: true,
        messageId: `sms_${message.id}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS notification failed',
      };
    }
  }

  /**
   * Get in-app notifications for user
   */
  getInAppNotifications(userId: string, options: {
    includeRead?: boolean;
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  } = {}): InAppNotification[] {
    const notifications = this.inAppNotifications.get(userId) || [];

    return notifications
      .filter(notification => {
        if (!options.includeRead && notification.isRead) return false;
        if (!options.includeArchived && notification.isArchived) return false;
        if (notification.expiresAt && notification.expiresAt < new Date()) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(options.offset || 0, (options.offset || 0) + (options.limit || 50));
  }

  /**
   * Mark in-app notification as read
   */
  markAsRead(userId: string, notificationId: string): boolean {
    const notifications = this.inAppNotifications.get(userId);
    if (!notifications) return false;

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || notification.isRead) return false;

    notification.isRead = true;
    notification.readAt = new Date();
    return true;
  }

  /**
   * Archive in-app notification
   */
  archiveNotification(userId: string, notificationId: string): boolean {
    const notifications = this.inAppNotifications.get(userId);
    if (!notifications) return false;

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || notification.isArchived) return false;

    notification.isArchived = true;
    notification.archivedAt = new Date();
    return true;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isInQuietHours(preferences: UserNotificationPreferences): boolean {
    if (!preferences.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: preferences.quietHours.timezone
    });

    const start = preferences.quietHours.start;
    const end = preferences.quietHours.end;

    // Handle quiet hours that span midnight
    if (start > end) {
      return currentTime >= start || currentTime <= end;
    } else {
      return currentTime >= start && currentTime <= end;
    }
  }

  /**
   * Get next available time after quiet hours
   */
  private getNextAvailableTime(preferences: UserNotificationPreferences): Date | null {
    if (!preferences.quietHours.enabled) return null;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Set to end of quiet hours tomorrow
    const [hours, minutes] = preferences.quietHours.end.split(':').map(Number);
    tomorrow.setHours(hours, minutes, 0, 0);

    return tomorrow;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update notification statistics
   */
  private updateStats(message: NotificationMessage, event: 'sent' | 'delivered' | 'failed' | 'bounced' | 'read'): void {
    this.stats.totalSent++;

    if (event === 'delivered') {
      this.stats.totalDelivered++;
    } else if (event === 'failed') {
      this.stats.totalFailed++;
    } else if (event === 'bounced') {
      this.stats.totalBounced++;
    } else if (event === 'read') {
      this.stats.totalRead++;
    }

    // Update delivery rate
    this.stats.deliveryRate = this.stats.totalDelivered / this.stats.totalSent;

    // Update read rate
    this.stats.readRate = this.stats.totalRead / this.stats.totalDelivered;

    // Update channel stats
    if (!this.stats.channelStats[message.channel]) {
      this.stats.channelStats[message.channel] = { sent: 0, delivered: 0, failed: 0, deliveryRate: 0 };
    }
    this.stats.channelStats[message.channel].sent++;
    if (event === 'delivered') {
      this.stats.channelStats[message.channel].delivered++;
    } else if (event === 'failed') {
      this.stats.channelStats[message.channel].failed++;
    }
    this.stats.channelStats[message.channel].deliveryRate =
      this.stats.channelStats[message.channel].delivered / this.stats.channelStats[message.channel].sent;

    // Update template stats
    if (!this.stats.templateStats[message.template]) {
      this.stats.templateStats[message.template] = { sent: 0, delivered: 0, failed: 0, deliveryRate: 0 };
    }
    this.stats.templateStats[message.template].sent++;
    if (event === 'delivered') {
      this.stats.templateStats[message.template].delivered++;
    } else if (event === 'failed') {
      this.stats.templateStats[message.template].failed++;
    }
    this.stats.templateStats[message.template].deliveryRate =
      this.stats.templateStats[message.template].delivered / this.stats.templateStats[message.template].sent;
  }

  /**
   * Get notification statistics
   */
  getStats(): NotificationStats {
    return { ...this.stats };
  }

  /**
   * Clear notification statistics
   */
  clearStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    pending: number;
    processing: boolean;
    totalProcessed: number;
  } {
    return {
      pending: this.messageQueue.length,
      processing: this.isProcessing,
      totalProcessed: this.stats.totalSent,
    };
  }

  async sendSlackWebhook(url: string, text: string): Promise<{ success: boolean }> {
    // Stubbed webhook call
    if (!url || !text) throw new Error('INVALID_WEBHOOK');
    return { success: true };
  }

  async sendTeamsWebhook(url: string, text: string): Promise<{ success: boolean }> {
    if (!url || !text) throw new Error('INVALID_WEBHOOK');
    return { success: true };
  }
}

/**
 * Default notification service instance
 */
export const notificationService = new NotificationService({
  provider: 'smtp',
  fromEmail: 'notifications@pimify.com',
  fromName: 'Pimify Notifications',
  smtpConfig: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
});

export default NotificationService;
