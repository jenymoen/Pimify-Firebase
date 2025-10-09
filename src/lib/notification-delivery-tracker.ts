/**
 * Notification Delivery Tracker
 * 
 * Tracks notification delivery status, handles retries, and provides delivery analytics
 */

import { NotificationChannel, NotificationTemplate, NotificationPriority, NotificationStatus } from './notification-service';

/**
 * Delivery attempt record
 */
export interface DeliveryAttempt {
  attemptNumber: number;
  timestamp: Date;
  channel: NotificationChannel;
  status: NotificationStatus;
  error?: string;
  errorCode?: string;
  responseTime: number; // milliseconds
  providerId?: string;
  metadata?: Record<string, any>;
}

/**
 * Notification delivery record
 */
export interface NotificationDeliveryRecord {
  id: string;
  notificationId: string;
  userId: string;
  template: NotificationTemplate;
  channel: NotificationChannel;
  priority: NotificationPriority;
  
  // Delivery status
  status: NotificationStatus;
  currentAttempt: number;
  maxAttempts: number;
  
  // Attempts history
  attempts: DeliveryAttempt[];
  
  // Timestamps
  createdAt: Date;
  scheduledFor?: Date;
  firstAttemptAt?: Date;
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  
  // Retry configuration
  retryStrategy: RetryStrategy;
  nextRetryAt?: Date;
  
  // Error tracking
  lastError?: string;
  lastErrorCode?: string;
  permanentFailure: boolean;
  
  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Retry strategy configuration
 */
export interface RetryStrategy {
  type: 'exponential' | 'linear' | 'fixed' | 'none';
  baseDelay: number; // seconds
  maxDelay?: number; // seconds
  multiplier?: number; // for exponential backoff
  jitter?: boolean; // add randomization to prevent thundering herd
}

/**
 * Delivery statistics
 */
export interface DeliveryStatistics {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  read: number;
  
  // Rates
  deliveryRate: number;
  readRate: number;
  failureRate: number;
  bounceRate: number;
  
  // Performance
  averageResponseTime: number;
  averageRetries: number;
  
  // By channel
  byChannel: Record<NotificationChannel, {
    total: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
    averageResponseTime: number;
  }>;
  
  // By template
  byTemplate: Record<NotificationTemplate, {
    total: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
  
  // By priority
  byPriority: Record<NotificationPriority, {
    total: number;
    delivered: number;
    averageResponseTime: number;
  }>;
}

/**
 * Delivery filter options
 */
export interface DeliveryFilterOptions {
  userId?: string;
  template?: NotificationTemplate;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  fromDate?: Date;
  toDate?: Date;
  hasErrors?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Retry policy
 */
export interface RetryPolicy {
  maxAttempts: number;
  strategy: RetryStrategy;
  retryableStatuses: NotificationStatus[];
  retryableErrorCodes: string[];
  shouldRetry: (record: NotificationDeliveryRecord) => boolean;
}

/**
 * Notification Delivery Tracker
 */
export class NotificationDeliveryTracker {
  private records: Map<string, NotificationDeliveryRecord> = new Map();
  private defaultRetryPolicy: RetryPolicy;
  private retryQueue: NotificationDeliveryRecord[] = [];
  private isProcessingRetries: boolean = false;
  private retryInterval: NodeJS.Timeout | null = null;

  constructor(defaultRetryPolicy?: Partial<RetryPolicy>) {
    this.defaultRetryPolicy = {
      maxAttempts: 3,
      strategy: {
        type: 'exponential',
        baseDelay: 60, // 1 minute
        maxDelay: 3600, // 1 hour
        multiplier: 2,
        jitter: true,
      },
      retryableStatuses: [NotificationStatus.FAILED],
      retryableErrorCodes: ['TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE'],
      shouldRetry: (record) => {
        return (
          record.currentAttempt < record.maxAttempts &&
          !record.permanentFailure &&
          this.isRetryableStatus(record.status)
        );
      },
      ...defaultRetryPolicy,
    };
  }

  /**
   * Create a new delivery record
   */
  createRecord(
    notificationId: string,
    userId: string,
    template: NotificationTemplate,
    channel: NotificationChannel,
    priority: NotificationPriority,
    options: {
      maxAttempts?: number;
      retryStrategy?: RetryStrategy;
      scheduledFor?: Date;
      metadata?: Record<string, any>;
    } = {}
  ): NotificationDeliveryRecord {
    const record: NotificationDeliveryRecord = {
      id: this.generateRecordId(),
      notificationId,
      userId,
      template,
      channel,
      priority,
      status: NotificationStatus.PENDING,
      currentAttempt: 0,
      maxAttempts: options.maxAttempts || this.defaultRetryPolicy.maxAttempts,
      attempts: [],
      createdAt: new Date(),
      scheduledFor: options.scheduledFor,
      retryStrategy: options.retryStrategy || this.defaultRetryPolicy.strategy,
      permanentFailure: false,
      metadata: options.metadata,
    };

    this.records.set(record.id, record);
    return record;
  }

  /**
   * Record a delivery attempt
   */
  recordAttempt(
    recordId: string,
    status: NotificationStatus,
    responseTime: number,
    options: {
      error?: string;
      errorCode?: string;
      providerId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): boolean {
    const record = this.records.get(recordId);
    if (!record) return false;

    const attempt: DeliveryAttempt = {
      attemptNumber: record.currentAttempt + 1,
      timestamp: new Date(),
      channel: record.channel,
      status,
      error: options.error,
      errorCode: options.errorCode,
      responseTime,
      providerId: options.providerId,
      metadata: options.metadata,
    };

    record.attempts.push(attempt);
    record.currentAttempt++;
    record.status = status;
    record.lastAttemptAt = attempt.timestamp;
    
    if (!record.firstAttemptAt) {
      record.firstAttemptAt = attempt.timestamp;
    }

    if (status === NotificationStatus.SENT || status === NotificationStatus.DELIVERED) {
      record.deliveredAt = attempt.timestamp;
    }

    if (options.error) {
      record.lastError = options.error;
      record.lastErrorCode = options.errorCode;
    }

    // Check if this is a permanent failure
    if (this.isPermanentFailure(status, options.errorCode)) {
      record.permanentFailure = true;
    }

    // Schedule retry if needed
    if (this.shouldRetry(record)) {
      this.scheduleRetry(record);
    }

    return true;
  }

  /**
   * Mark notification as read
   */
  markAsRead(recordId: string): boolean {
    const record = this.records.get(recordId);
    if (!record) return false;

    record.status = NotificationStatus.READ;
    record.readAt = new Date();
    return true;
  }

  /**
   * Get delivery record
   */
  getRecord(recordId: string): NotificationDeliveryRecord | null {
    return this.records.get(recordId) || null;
  }

  /**
   * Get records by filter
   */
  getRecords(filter: DeliveryFilterOptions = {}): NotificationDeliveryRecord[] {
    let records = Array.from(this.records.values());

    // Apply filters
    if (filter.userId) {
      records = records.filter(r => r.userId === filter.userId);
    }

    if (filter.template) {
      records = records.filter(r => r.template === filter.template);
    }

    if (filter.channel) {
      records = records.filter(r => r.channel === filter.channel);
    }

    if (filter.status) {
      records = records.filter(r => r.status === filter.status);
    }

    if (filter.priority) {
      records = records.filter(r => r.priority === filter.priority);
    }

    if (filter.fromDate) {
      records = records.filter(r => r.createdAt >= filter.fromDate!);
    }

    if (filter.toDate) {
      records = records.filter(r => r.createdAt <= filter.toDate!);
    }

    if (filter.hasErrors !== undefined) {
      records = records.filter(r => filter.hasErrors ? !!r.lastError : !r.lastError);
    }

    // Sort by creation date (newest first)
    records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    if (filter.offset) {
      records = records.slice(filter.offset);
    }

    if (filter.limit) {
      records = records.slice(0, filter.limit);
    }

    return records;
  }

  /**
   * Get delivery statistics
   */
  getStatistics(filter: DeliveryFilterOptions = {}): DeliveryStatistics {
    const records = this.getRecords(filter);

    const stats: DeliveryStatistics = {
      total: records.length,
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
      bounced: 0,
      read: 0,
      deliveryRate: 0,
      readRate: 0,
      failureRate: 0,
      bounceRate: 0,
      averageResponseTime: 0,
      averageRetries: 0,
      byChannel: {} as any,
      byTemplate: {} as any,
      byPriority: {} as any,
    };

    // Initialize channel stats
    Object.values(NotificationChannel).forEach(channel => {
      stats.byChannel[channel] = {
        total: 0,
        delivered: 0,
        failed: 0,
        deliveryRate: 0,
        averageResponseTime: 0,
      };
    });

    // Initialize template stats
    Object.values(NotificationTemplate).forEach(template => {
      stats.byTemplate[template] = {
        total: 0,
        delivered: 0,
        failed: 0,
        deliveryRate: 0,
      };
    });

    // Initialize priority stats
    Object.values(NotificationPriority).forEach(priority => {
      stats.byPriority[priority] = {
        total: 0,
        delivered: 0,
        averageResponseTime: 0,
      };
    });

    let totalResponseTime = 0;
    let totalRetries = 0;
    let responseTimeCount = 0;

    records.forEach(record => {
      // Status counts
      switch (record.status) {
        case NotificationStatus.PENDING:
          stats.pending++;
          break;
        case NotificationStatus.SENT:
          stats.sent++;
          break;
        case NotificationStatus.DELIVERED:
          stats.delivered++;
          break;
        case NotificationStatus.FAILED:
          stats.failed++;
          break;
        case NotificationStatus.BOUNCED:
          stats.bounced++;
          break;
        case NotificationStatus.READ:
          stats.read++;
          break;
      }

      // Channel stats
      stats.byChannel[record.channel].total++;
      if (record.status === NotificationStatus.DELIVERED || record.status === NotificationStatus.READ) {
        stats.byChannel[record.channel].delivered++;
      }
      if (record.status === NotificationStatus.FAILED) {
        stats.byChannel[record.channel].failed++;
      }

      // Template stats
      stats.byTemplate[record.template].total++;
      if (record.status === NotificationStatus.DELIVERED || record.status === NotificationStatus.READ) {
        stats.byTemplate[record.template].delivered++;
      }
      if (record.status === NotificationStatus.FAILED) {
        stats.byTemplate[record.template].failed++;
      }

      // Priority stats
      stats.byPriority[record.priority].total++;
      if (record.status === NotificationStatus.DELIVERED || record.status === NotificationStatus.READ) {
        stats.byPriority[record.priority].delivered++;
      }

      // Response time and retries
      if (record.attempts.length > 0) {
        const lastAttempt = record.attempts[record.attempts.length - 1];
        totalResponseTime += lastAttempt.responseTime;
        responseTimeCount++;
        
        stats.byChannel[record.channel].averageResponseTime += lastAttempt.responseTime;
        stats.byPriority[record.priority].averageResponseTime += lastAttempt.responseTime;
      }
      totalRetries += record.currentAttempt;
    });

    // Calculate rates
    if (stats.total > 0) {
      stats.deliveryRate = (stats.delivered + stats.read) / stats.total;
      stats.failureRate = stats.failed / stats.total;
      stats.bounceRate = stats.bounced / stats.total;
    }

    if (stats.delivered + stats.read > 0) {
      stats.readRate = stats.read / (stats.delivered + stats.read);
    }

    if (responseTimeCount > 0) {
      stats.averageResponseTime = totalResponseTime / responseTimeCount;
    }

    if (stats.total > 0) {
      stats.averageRetries = totalRetries / stats.total;
    }

    // Calculate channel delivery rates
    Object.values(NotificationChannel).forEach(channel => {
      const channelStats = stats.byChannel[channel];
      if (channelStats.total > 0) {
        channelStats.deliveryRate = channelStats.delivered / channelStats.total;
        channelStats.averageResponseTime = channelStats.averageResponseTime / channelStats.total;
      }
    });

    // Calculate template delivery rates
    Object.values(NotificationTemplate).forEach(template => {
      const templateStats = stats.byTemplate[template];
      if (templateStats.total > 0) {
        templateStats.deliveryRate = templateStats.delivered / templateStats.total;
      }
    });

    // Calculate priority average response times
    Object.values(NotificationPriority).forEach(priority => {
      const priorityStats = stats.byPriority[priority];
      if (priorityStats.total > 0) {
        priorityStats.averageResponseTime = priorityStats.averageResponseTime / priorityStats.total;
      }
    });

    return stats;
  }

  /**
   * Schedule retry for failed delivery
   */
  private scheduleRetry(record: NotificationDeliveryRecord): void {
    const delay = this.calculateRetryDelay(record);
    record.nextRetryAt = new Date(Date.now() + delay * 1000);
    
    // Add to retry queue if not already there
    if (!this.retryQueue.includes(record)) {
      this.retryQueue.push(record);
    }

    // Start retry processor if not running
    if (!this.isProcessingRetries) {
      this.startRetryProcessor();
    }
  }

  /**
   * Calculate retry delay based on strategy
   */
  private calculateRetryDelay(record: NotificationDeliveryRecord): number {
    const { type, baseDelay, maxDelay, multiplier, jitter } = record.retryStrategy;
    let delay: number;

    switch (type) {
      case 'exponential':
        delay = baseDelay * Math.pow(multiplier || 2, record.currentAttempt - 1);
        break;
      case 'linear':
        delay = baseDelay * record.currentAttempt;
        break;
      case 'fixed':
        delay = baseDelay;
        break;
      case 'none':
        return 0;
      default:
        delay = baseDelay;
    }

    // Apply max delay cap
    if (maxDelay && delay > maxDelay) {
      delay = maxDelay;
    }

    // Add jitter to prevent thundering herd
    if (jitter) {
      const jitterAmount = delay * 0.2; // 20% jitter
      delay += (Math.random() * jitterAmount * 2) - jitterAmount;
    }

    return Math.max(0, delay);
  }

  /**
   * Check if should retry
   */
  private shouldRetry(record: NotificationDeliveryRecord): boolean {
    return this.defaultRetryPolicy.shouldRetry(record);
  }

  /**
   * Check if status is retryable
   */
  private isRetryableStatus(status: NotificationStatus): boolean {
    return this.defaultRetryPolicy.retryableStatuses.includes(status);
  }

  /**
   * Check if error is permanent
   */
  private isPermanentFailure(status: NotificationStatus, errorCode?: string): boolean {
    const permanentStatuses = [NotificationStatus.BOUNCED];
    const permanentErrorCodes = ['INVALID_EMAIL', 'BLOCKED', 'UNSUBSCRIBED'];

    return (
      permanentStatuses.includes(status) ||
      (errorCode !== undefined && permanentErrorCodes.includes(errorCode))
    );
  }

  /**
   * Start retry processor
   */
  private startRetryProcessor(): void {
    if (this.isProcessingRetries) return;

    this.isProcessingRetries = true;
    this.retryInterval = setInterval(() => {
      this.processRetryQueue();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop retry processor
   */
  stopRetryProcessor(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    this.isProcessingRetries = false;
  }

  /**
   * Process retry queue
   */
  private processRetryQueue(): void {
    const now = new Date();
    const retryableRecords = this.retryQueue.filter(
      record => record.nextRetryAt && record.nextRetryAt <= now
    );

    retryableRecords.forEach(record => {
      // Remove from queue
      const index = this.retryQueue.indexOf(record);
      if (index !== -1) {
        this.retryQueue.splice(index, 1);
      }

      // In a real implementation, this would trigger the actual retry
      // For now, we just update the status to indicate retry is ready
      record.status = NotificationStatus.PENDING;
      delete record.nextRetryAt;
    });

    // Stop processor if queue is empty
    if (this.retryQueue.length === 0) {
      this.stopRetryProcessor();
    }
  }

  /**
   * Get retry queue status
   */
  getRetryQueueStatus(): {
    queueSize: number;
    processing: boolean;
    nextRetryAt?: Date;
  } {
    let nextRetryAt: Date | undefined;
    
    if (this.retryQueue.length > 0) {
      const sortedQueue = [...this.retryQueue].sort((a, b) => {
        const aTime = a.nextRetryAt?.getTime() || Infinity;
        const bTime = b.nextRetryAt?.getTime() || Infinity;
        return aTime - bTime;
      });
      nextRetryAt = sortedQueue[0].nextRetryAt;
    }

    return {
      queueSize: this.retryQueue.length,
      processing: this.isProcessingRetries,
      nextRetryAt,
    };
  }

  /**
   * Clear old records
   */
  clearOldRecords(olderThan: Date): number {
    let count = 0;
    this.records.forEach((record, id) => {
      if (record.createdAt < olderThan) {
        this.records.delete(id);
        count++;
      }
    });
    return count;
  }

  /**
   * Generate unique record ID
   */
  private generateRecordId(): string {
    return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Default notification delivery tracker instance
 */
export const notificationDeliveryTracker = new NotificationDeliveryTracker();

export default NotificationDeliveryTracker;
