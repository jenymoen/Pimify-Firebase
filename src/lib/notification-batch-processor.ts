/**
 * Notification Batch Processor
 * 
 * Handles batching and processing of notifications for bulk operations
 */

import { NotificationTemplate, NotificationChannel, NotificationPriority } from './notification-service';
import { UserRole } from '@/types/workflow';

/**
 * Batch notification item
 */
export interface BatchNotificationItem {
  userId: string;
  template: NotificationTemplate;
  data: Record<string, any>;
  priority: NotificationPriority;
  channels: NotificationChannel[];
}

/**
 * Batch configuration
 */
export interface BatchConfig {
  maxBatchSize: number;
  batchInterval: number; // milliseconds
  maxWaitTime: number; // milliseconds
  priorityBatching: boolean; // Separate batches by priority
  channelBatching: boolean; // Separate batches by channel
}

/**
 * Batch status
 */
export enum BatchStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

/**
 * Notification batch
 */
export interface NotificationBatch {
  id: string;
  items: BatchNotificationItem[];
  priority: NotificationPriority;
  channel?: NotificationChannel;
  status: BatchStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  successCount: number;
  failureCount: number;
  errors: Array<{ itemIndex: number; error: string }>;
}

/**
 * Batch statistics
 */
export interface BatchStatistics {
  totalBatches: number;
  activeBatches: number;
  completedBatches: number;
  failedBatches: number;
  partialBatches: number;
  totalNotifications: number;
  successfulNotifications: number;
  failedNotifications: number;
  averageBatchSize: number;
  averageProcessingTime: number; // milliseconds
  batchesByPriority: Record<NotificationPriority, number>;
  batchesByChannel: Record<NotificationChannel, number>;
}

/**
 * Batch result
 */
export interface BatchResult {
  batchId: string;
  status: BatchStatus;
  successCount: number;
  failureCount: number;
  processingTime: number;
  errors: Array<{ itemIndex: number; error: string }>;
}

/**
 * Notification Batch Processor
 */
export class NotificationBatchProcessor {
  private config: BatchConfig;
  private pendingItems: BatchNotificationItem[] = [];
  private activeBatches: Map<string, NotificationBatch> = new Map();
  private completedBatches: NotificationBatch[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;
  private stats: BatchStatistics;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = {
      maxBatchSize: config.maxBatchSize || 100,
      batchInterval: config.batchInterval || 5000, // 5 seconds
      maxWaitTime: config.maxWaitTime || 30000, // 30 seconds
      priorityBatching: config.priorityBatching !== undefined ? config.priorityBatching : true,
      channelBatching: config.channelBatching !== undefined ? config.channelBatching : false,
    };

    this.stats = this.initializeStats();
    this.startBatchTimer();
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): BatchStatistics {
    return {
      totalBatches: 0,
      activeBatches: 0,
      completedBatches: 0,
      failedBatches: 0,
      partialBatches: 0,
      totalNotifications: 0,
      successfulNotifications: 0,
      failedNotifications: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      batchesByPriority: {} as Record<NotificationPriority, number>,
      batchesByChannel: {} as Record<NotificationChannel, number>,
    };
  }

  /**
   * Add notification to batch queue
   */
  addNotification(item: BatchNotificationItem): void {
    this.pendingItems.push(item);

    // Check if we should process immediately
    if (this.shouldProcessImmediately()) {
      this.processBatches();
    }
  }

  /**
   * Add multiple notifications
   */
  addNotifications(items: BatchNotificationItem[]): void {
    this.pendingItems.push(...items);

    if (this.shouldProcessImmediately()) {
      this.processBatches();
    }
  }

  /**
   * Check if should process immediately
   */
  private shouldProcessImmediately(): boolean {
    // Process immediately if:
    // 1. Batch size threshold reached
    if (this.pendingItems.length >= this.config.maxBatchSize) {
      return true;
    }

    // 2. High/urgent priority items present
    const hasUrgent = this.pendingItems.some(
      item => item.priority === NotificationPriority.URGENT || item.priority === NotificationPriority.HIGH
    );
    if (hasUrgent && this.pendingItems.length >= this.config.maxBatchSize * 0.5) {
      return true;
    }

    return false;
  }

  /**
   * Start batch timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer) return;

    this.batchTimer = setInterval(() => {
      if (this.pendingItems.length > 0) {
        this.processBatches();
      }
    }, this.config.batchInterval);
  }

  /**
   * Stop batch timer
   */
  stopBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Process pending batches
   */
  private async processBatches(): Promise<void> {
    if (this.isProcessing || this.pendingItems.length === 0) return;

    this.isProcessing = true;

    try {
      const batches = this.createBatches();
      
      for (const batch of batches) {
        await this.processBatch(batch);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Create batches from pending items
   */
  private createBatches(): NotificationBatch[] {
    const batches: NotificationBatch[] = [];
    const items = [...this.pendingItems];
    this.pendingItems = [];

    if (this.config.priorityBatching) {
      // Group by priority
      const byPriority = new Map<NotificationPriority, BatchNotificationItem[]>();
      
      items.forEach(item => {
        if (!byPriority.has(item.priority)) {
          byPriority.set(item.priority, []);
        }
        byPriority.get(item.priority)!.push(item);
      });

      // Create batches for each priority
      byPriority.forEach((priorityItems, priority) => {
        batches.push(...this.splitIntoBatches(priorityItems, priority));
      });
    } else if (this.config.channelBatching) {
      // Group by channel
      const byChannel = new Map<NotificationChannel, BatchNotificationItem[]>();
      
      items.forEach(item => {
        item.channels.forEach(channel => {
          if (!byChannel.has(channel)) {
            byChannel.set(channel, []);
          }
          byChannel.get(channel)!.push(item);
        });
      });

      // Create batches for each channel
      byChannel.forEach((channelItems, channel) => {
        batches.push(...this.splitIntoBatches(channelItems, NotificationPriority.NORMAL, channel));
      });
    } else {
      // No grouping - create batches from all items
      batches.push(...this.splitIntoBatches(items, NotificationPriority.NORMAL));
    }

    return batches;
  }

  /**
   * Split items into batches
   */
  private splitIntoBatches(
    items: BatchNotificationItem[],
    priority: NotificationPriority,
    channel?: NotificationChannel
  ): NotificationBatch[] {
    const batches: NotificationBatch[] = [];
    
    for (let i = 0; i < items.length; i += this.config.maxBatchSize) {
      const batchItems = items.slice(i, i + this.config.maxBatchSize);
      
      const batch: NotificationBatch = {
        id: this.generateBatchId(),
        items: batchItems,
        priority,
        channel,
        status: BatchStatus.PENDING,
        createdAt: new Date(),
        successCount: 0,
        failureCount: 0,
        errors: [],
      };

      batches.push(batch);
      this.activeBatches.set(batch.id, batch);
    }

    return batches;
  }

  /**
   * Process a single batch
   */
  private async processBatch(batch: NotificationBatch): Promise<BatchResult> {
    batch.status = BatchStatus.PROCESSING;
    batch.startedAt = new Date();
    
    const startTime = Date.now();
    const errors: Array<{ itemIndex: number; error: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    try {
      // Process each item in the batch
      for (let i = 0; i < batch.items.length; i++) {
        const item = batch.items[i];
        
        try {
          // In a real implementation, this would send the actual notification
          await this.sendNotification(item);
          successCount++;
          this.stats.successfulNotifications++;
        } catch (error) {
          failureCount++;
          this.stats.failedNotifications++;
          errors.push({
            itemIndex: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Update batch status
      if (failureCount === 0) {
        batch.status = BatchStatus.COMPLETED;
        this.stats.completedBatches++;
      } else if (successCount === 0) {
        batch.status = BatchStatus.FAILED;
        this.stats.failedBatches++;
      } else {
        batch.status = BatchStatus.PARTIAL;
        this.stats.partialBatches++;
      }

      batch.successCount = successCount;
      batch.failureCount = failureCount;
      batch.errors = errors;
      batch.completedAt = new Date();

      // Move to completed batches
      this.activeBatches.delete(batch.id);
      this.completedBatches.push(batch);

      // Update stats
      this.stats.totalBatches++;
      this.stats.totalNotifications += batch.items.length;
      this.updateAverages(batch, Date.now() - startTime);

      // Update priority/channel stats
      if (!this.stats.batchesByPriority[batch.priority]) {
        this.stats.batchesByPriority[batch.priority] = 0;
      }
      this.stats.batchesByPriority[batch.priority]++;

      if (batch.channel) {
        if (!this.stats.batchesByChannel[batch.channel]) {
          this.stats.batchesByChannel[batch.channel] = 0;
        }
        this.stats.batchesByChannel[batch.channel]++;
      }

      return {
        batchId: batch.id,
        status: batch.status,
        successCount,
        failureCount,
        processingTime: Date.now() - startTime,
        errors,
      };
    } catch (error) {
      batch.status = BatchStatus.FAILED;
      batch.completedAt = new Date();
      this.stats.failedBatches++;
      
      this.activeBatches.delete(batch.id);
      this.completedBatches.push(batch);

      throw error;
    }
  }

  /**
   * Send notification (simulated)
   */
  private async sendNotification(item: BatchNotificationItem): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Simulate 95% success rate
    if (Math.random() > 0.95) {
      throw new Error('Simulated delivery failure');
    }
  }

  /**
   * Update average statistics
   */
  private updateAverages(batch: NotificationBatch, processingTime: number): void {
    const totalBatches = this.stats.totalBatches + 1;
    
    this.stats.averageBatchSize = 
      (this.stats.averageBatchSize * this.stats.totalBatches + batch.items.length) / totalBatches;
    
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * this.stats.totalBatches + processingTime) / totalBatches;
  }

  /**
   * Get batch by ID
   */
  getBatch(batchId: string): NotificationBatch | null {
    return this.activeBatches.get(batchId) || 
           this.completedBatches.find(b => b.id === batchId) || 
           null;
  }

  /**
   * Get active batches
   */
  getActiveBatches(): NotificationBatch[] {
    return Array.from(this.activeBatches.values());
  }

  /**
   * Get completed batches
   */
  getCompletedBatches(limit?: number): NotificationBatch[] {
    const batches = [...this.completedBatches].sort(
      (a, b) => b.completedAt!.getTime() - a.completedAt!.getTime()
    );
    
    return limit ? batches.slice(0, limit) : batches;
  }

  /**
   * Get pending queue size
   */
  getPendingCount(): number {
    return this.pendingItems.length;
  }

  /**
   * Get statistics
   */
  getStatistics(): BatchStatistics {
    this.stats.activeBatches = this.activeBatches.size;
    return { ...this.stats };
  }

  /**
   * Clear statistics
   */
  clearStatistics(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Clear completed batches
   */
  clearCompletedBatches(olderThan?: Date): number {
    const initialCount = this.completedBatches.length;
    
    if (olderThan) {
      this.completedBatches = this.completedBatches.filter(
        batch => batch.completedAt! > olderThan
      );
    } else {
      this.completedBatches = [];
    }

    return initialCount - this.completedBatches.length;
  }

  /**
   * Get batch configuration
   */
  getConfig(): BatchConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart timer if interval changed
    if (config.batchInterval) {
      this.stopBatchTimer();
      this.startBatchTimer();
    }
  }

  /**
   * Process all pending items immediately
   */
  async flush(): Promise<BatchResult[]> {
    if (this.pendingItems.length === 0) {
      return [];
    }

    const batches = this.createBatches();
    const results: BatchResult[] = [];

    for (const batch of batches) {
      const result = await this.processBatch(batch);
      results.push(result);
    }

    return results;
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown processor
   */
  shutdown(): void {
    this.stopBatchTimer();
  }
}

/**
 * Bulk notification helper
 */
export class BulkNotificationHelper {
  private processor: NotificationBatchProcessor;

  constructor(config?: Partial<BatchConfig>) {
    this.processor = new NotificationBatchProcessor(config);
  }

  /**
   * Send notifications to multiple users for a product event
   */
  async notifyProductEvent(
    userIds: string[],
    template: NotificationTemplate,
    productData: {
      id: string;
      name: string;
      [key: string]: any;
    },
    options: {
      priority?: NotificationPriority;
      channels?: NotificationChannel[];
    } = {}
  ): Promise<void> {
    const items: BatchNotificationItem[] = userIds.map(userId => ({
      userId,
      template,
      data: { product: productData },
      priority: options.priority || NotificationPriority.NORMAL,
      channels: options.channels || [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    }));

    this.processor.addNotifications(items);
  }

  /**
   * Send digest notifications
   */
  async sendDigest(
    userDigests: Array<{
      userId: string;
      notifications: Array<{ template: NotificationTemplate; data: any }>;
    }>,
    options: {
      priority?: NotificationPriority;
      channels?: NotificationChannel[];
    } = {}
  ): Promise<void> {
    const items: BatchNotificationItem[] = userDigests.map(digest => ({
      userId: digest.userId,
      template: NotificationTemplate.SYSTEM_MAINTENANCE, // Use a generic template for digests
      data: { digest: digest.notifications },
      priority: options.priority || NotificationPriority.NORMAL,
      channels: options.channels || [NotificationChannel.EMAIL],
    }));

    this.processor.addNotifications(items);
  }

  /**
   * Send bulk approval notifications
   */
  async notifyBulkApproval(
    products: Array<{ id: string; name: string; assignedTo: string }>,
    approverName: string
  ): Promise<void> {
    const items: BatchNotificationItem[] = products.map(product => ({
      userId: product.assignedTo,
      template: NotificationTemplate.PRODUCT_APPROVED,
      data: { 
        product,
        approver: { name: approverName },
      },
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    }));

    this.processor.addNotifications(items);
  }

  /**
   * Send bulk rejection notifications
   */
  async notifyBulkRejection(
    products: Array<{ id: string; name: string; assignedTo: string }>,
    reviewerName: string,
    reason: string
  ): Promise<void> {
    const items: BatchNotificationItem[] = products.map(product => ({
      userId: product.assignedTo,
      template: NotificationTemplate.PRODUCT_REJECTED,
      data: { 
        product,
        reviewer: { name: reviewerName },
        reason,
      },
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    }));

    this.processor.addNotifications(items);
  }

  /**
   * Get processor statistics
   */
  getStatistics(): BatchStatistics {
    return this.processor.getStatistics();
  }

  /**
   * Flush pending notifications
   */
  async flush(): Promise<BatchResult[]> {
    return this.processor.flush();
  }

  /**
   * Shutdown helper
   */
  shutdown(): void {
    this.processor.shutdown();
  }
}

/**
 * Default batch processor instance
 */
export const notificationBatchProcessor = new NotificationBatchProcessor();

/**
 * Default bulk notification helper instance
 */
export const bulkNotificationHelper = new BulkNotificationHelper();

export default NotificationBatchProcessor;
