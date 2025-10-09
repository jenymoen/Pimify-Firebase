import {
  NotificationBatchProcessor,
  BulkNotificationHelper,
  BatchNotificationItem,
  BatchConfig,
  BatchStatus,
  notificationBatchProcessor,
  bulkNotificationHelper,
} from '../notification-batch-processor';
import { NotificationTemplate, NotificationChannel, NotificationPriority } from '../notification-service';

describe('NotificationBatchProcessor', () => {
  let processor: NotificationBatchProcessor;

  beforeEach(() => {
    processor = new NotificationBatchProcessor({
      maxBatchSize: 10,
      batchInterval: 1000,
      maxWaitTime: 5000,
      priorityBatching: true,
      channelBatching: false,
    });
  });

  afterEach(() => {
    processor.shutdown();
  });

  describe('Initialization', () => {
    it('should create processor with default config', () => {
      const defaultProcessor = new NotificationBatchProcessor();
      const config = defaultProcessor.getConfig();
      
      expect(config.maxBatchSize).toBe(100);
      expect(config.batchInterval).toBe(5000);
      expect(config.priorityBatching).toBe(true);
      
      defaultProcessor.shutdown();
    });

    it('should create processor with custom config', () => {
      const config = processor.getConfig();
      
      expect(config.maxBatchSize).toBe(10);
      expect(config.batchInterval).toBe(1000);
      expect(config.priorityBatching).toBe(true);
    });

    it('should initialize with empty statistics', () => {
      const stats = processor.getStatistics();
      
      expect(stats.totalBatches).toBe(0);
      expect(stats.totalNotifications).toBe(0);
      expect(stats.successfulNotifications).toBe(0);
    });
  });

  describe('Adding Notifications', () => {
    it('should add single notification to queue', () => {
      const item: BatchNotificationItem = {
        userId: 'user-1',
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        data: { product: { id: 'prod-1', name: 'Test Product' } },
        priority: NotificationPriority.NORMAL,
        channels: [NotificationChannel.EMAIL],
      };

      processor.addNotification(item);
      
      expect(processor.getPendingCount()).toBe(1);
    });

    it('should add multiple notifications at once', () => {
      const items: BatchNotificationItem[] = [
        {
          userId: 'user-1',
          template: NotificationTemplate.PRODUCT_SUBMITTED,
          data: {},
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.EMAIL],
        },
        {
          userId: 'user-2',
          template: NotificationTemplate.PRODUCT_APPROVED,
          data: {},
          priority: NotificationPriority.HIGH,
          channels: [NotificationChannel.IN_APP],
        },
      ];

      processor.addNotifications(items);
      
      expect(processor.getPendingCount()).toBe(2);
    });

    it('should process immediately when batch size threshold reached', () => {
      const items: BatchNotificationItem[] = [];
      
      for (let i = 0; i < 10; i++) {
        items.push({
          userId: `user-${i}`,
          template: NotificationTemplate.PRODUCT_SUBMITTED,
          data: {},
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.EMAIL],
        });
      }

      processor.addNotifications(items);
      
      // Should have triggered processing
      expect(processor.getPendingCount()).toBe(0);
    });

    it('should process immediately for urgent notifications', () => {
      const items: BatchNotificationItem[] = [];
      
      // Add 5 urgent items (50% of max batch size)
      for (let i = 0; i < 5; i++) {
        items.push({
          userId: `user-${i}`,
          template: NotificationTemplate.DEADLINE_EXCEEDED,
          data: {},
          priority: NotificationPriority.URGENT,
          channels: [NotificationChannel.EMAIL],
        });
      }

      processor.addNotifications(items);
      
      // Should have triggered processing due to urgency
      expect(processor.getPendingCount()).toBe(0);
    });
  });

  describe('Batch Processing', () => {
    it('should process batches automatically', async () => {
      const items: BatchNotificationItem[] = [
        {
          userId: 'user-1',
          template: NotificationTemplate.PRODUCT_SUBMITTED,
          data: {},
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.EMAIL],
        },
      ];

      processor.addNotifications(items);
      
      // Wait for batch interval
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const stats = processor.getStatistics();
      expect(stats.totalBatches).toBeGreaterThan(0);
    });

    it('should create separate batches by priority when enabled', async () => {
      const items: BatchNotificationItem[] = [
        {
          userId: 'user-1',
          template: NotificationTemplate.PRODUCT_SUBMITTED,
          data: {},
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.EMAIL],
        },
        {
          userId: 'user-2',
          template: NotificationTemplate.DEADLINE_EXCEEDED,
          data: {},
          priority: NotificationPriority.URGENT,
          channels: [NotificationChannel.EMAIL],
        },
      ];

      processor.addNotifications(items);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const stats = processor.getStatistics();
      expect(stats.batchesByPriority[NotificationPriority.NORMAL]).toBeDefined();
      expect(stats.batchesByPriority[NotificationPriority.URGENT]).toBeDefined();
    });

    it('should split large batches', async () => {
      const items: BatchNotificationItem[] = [];
      
      // Create 25 items (should create 3 batches with max size 10)
      for (let i = 0; i < 25; i++) {
        items.push({
          userId: `user-${i}`,
          template: NotificationTemplate.PRODUCT_SUBMITTED,
          data: {},
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.EMAIL],
        });
      }

      processor.addNotifications(items);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const stats = processor.getStatistics();
      expect(stats.totalBatches).toBe(3); // 25 items / 10 max = 3 batches
    });
  });

  describe('Batch Status', () => {
    it('should track batch status', async () => {
      const items: BatchNotificationItem[] = [
        {
          userId: 'user-1',
          template: NotificationTemplate.PRODUCT_SUBMITTED,
          data: {},
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.EMAIL],
        },
      ];

      processor.addNotifications(items);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const completedBatches = processor.getCompletedBatches();
      expect(completedBatches.length).toBeGreaterThan(0);
      expect(completedBatches[0].status).toBe(BatchStatus.COMPLETED);
    });

    it('should get batch by ID', async () => {
      const items: BatchNotificationItem[] = [
        {
          userId: 'user-1',
          template: NotificationTemplate.PRODUCT_SUBMITTED,
          data: {},
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.EMAIL],
        },
      ];

      processor.addNotifications(items);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const completedBatches = processor.getCompletedBatches();
      const batchId = completedBatches[0]?.id;
      
      if (batchId) {
        const batch = processor.getBatch(batchId);
        expect(batch).not.toBeNull();
        expect(batch?.id).toBe(batchId);
      }
    });
  });

  describe('Statistics', () => {
    it('should track batch statistics', async () => {
      const items: BatchNotificationItem[] = [];
      
      for (let i = 0; i < 5; i++) {
        items.push({
          userId: `user-${i}`,
          template: NotificationTemplate.PRODUCT_SUBMITTED,
          data: {},
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.EMAIL],
        });
      }

      processor.addNotifications(items);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const stats = processor.getStatistics();
      expect(stats.totalBatches).toBeGreaterThan(0);
      expect(stats.totalNotifications).toBe(5);
      expect(stats.averageBatchSize).toBeGreaterThan(0);
    });

    it('should clear statistics', async () => {
      const items: BatchNotificationItem[] = [
        {
          userId: 'user-1',
          template: NotificationTemplate.PRODUCT_SUBMITTED,
          data: {},
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.EMAIL],
        },
      ];

      processor.addNotifications(items);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      processor.clearStatistics();
      const stats = processor.getStatistics();
      
      expect(stats.totalBatches).toBe(0);
      expect(stats.totalNotifications).toBe(0);
    });
  });

  describe('Flush', () => {
    it('should flush pending items immediately', async () => {
      const items: BatchNotificationItem[] = [
        {
          userId: 'user-1',
          template: NotificationTemplate.PRODUCT_SUBMITTED,
          data: {},
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.EMAIL],
        },
        {
          userId: 'user-2',
          template: NotificationTemplate.PRODUCT_APPROVED,
          data: {},
          priority: NotificationPriority.HIGH,
          channels: [NotificationChannel.IN_APP],
        },
      ];

      processor.addNotifications(items);
      const results = await processor.flush();
      
      expect(results.length).toBeGreaterThan(0);
      expect(processor.getPendingCount()).toBe(0);
    });

    it('should return empty array when no pending items', async () => {
      const results = await processor.flush();
      expect(results).toHaveLength(0);
    });
  });

  describe('Configuration', () => {
    it('should get configuration', () => {
      const config = processor.getConfig();
      
      expect(config.maxBatchSize).toBe(10);
      expect(config.batchInterval).toBe(1000);
    });

    it('should update configuration', () => {
      processor.updateConfig({
        maxBatchSize: 50,
        batchInterval: 2000,
      });

      const config = processor.getConfig();
      expect(config.maxBatchSize).toBe(50);
      expect(config.batchInterval).toBe(2000);
    });
  });

  describe('Cleanup', () => {
    it('should clear completed batches', async () => {
      const items: BatchNotificationItem[] = [
        {
          userId: 'user-1',
          template: NotificationTemplate.PRODUCT_SUBMITTED,
          data: {},
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.EMAIL],
        },
      ];

      processor.addNotifications(items);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const clearedCount = processor.clearCompletedBatches();
      expect(clearedCount).toBeGreaterThan(0);
      
      const completedBatches = processor.getCompletedBatches();
      expect(completedBatches).toHaveLength(0);
    });

    it('should clear batches older than specified date', async () => {
      const items: BatchNotificationItem[] = [
        {
          userId: 'user-1',
          template: NotificationTemplate.PRODUCT_SUBMITTED,
          data: {},
          priority: NotificationPriority.NORMAL,
          channels: [NotificationChannel.EMAIL],
        },
      ];

      processor.addNotifications(items);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Clear batches older than 1 hour from now (should clear all)
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      const clearedCount = processor.clearCompletedBatches(futureDate);
      
      expect(clearedCount).toBeGreaterThan(0);
    });
  });

  describe('Default Instance', () => {
    it('should provide default processor instance', () => {
      expect(notificationBatchProcessor).toBeInstanceOf(NotificationBatchProcessor);
    });
  });
});

describe('BulkNotificationHelper', () => {
  let helper: BulkNotificationHelper;

  beforeEach(() => {
    helper = new BulkNotificationHelper({
      maxBatchSize: 10,
      batchInterval: 1000,
    });
  });

  afterEach(() => {
    helper.shutdown();
  });

  describe('Product Event Notifications', () => {
    it('should send notifications for product event', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const productData = {
        id: 'prod-1',
        name: 'Test Product',
      };

      await helper.notifyProductEvent(
        userIds,
        NotificationTemplate.PRODUCT_SUBMITTED,
        productData
      );

      // Flush to process immediately
      await helper.flush();

      const stats = helper.getStatistics();
      expect(stats.totalNotifications).toBe(3);
    });

    it('should respect custom priority', async () => {
      const userIds = ['user-1'];
      const productData = { id: 'prod-1', name: 'Test Product' };

      await helper.notifyProductEvent(
        userIds,
        NotificationTemplate.DEADLINE_EXCEEDED,
        productData,
        { priority: NotificationPriority.URGENT }
      );

      await helper.flush();

      const stats = helper.getStatistics();
      expect(stats.batchesByPriority[NotificationPriority.URGENT]).toBeGreaterThan(0);
    });
  });

  describe('Digest Notifications', () => {
    it('should send digest notifications', async () => {
      const userDigests = [
        {
          userId: 'user-1',
          notifications: [
            { template: NotificationTemplate.PRODUCT_SUBMITTED, data: {} },
            { template: NotificationTemplate.PRODUCT_APPROVED, data: {} },
          ],
        },
        {
          userId: 'user-2',
          notifications: [
            { template: NotificationTemplate.PRODUCT_REJECTED, data: {} },
          ],
        },
      ];

      await helper.sendDigest(userDigests);
      await helper.flush();

      const stats = helper.getStatistics();
      expect(stats.totalNotifications).toBe(2); // 2 users
    });
  });

  describe('Bulk Approval Notifications', () => {
    it('should send bulk approval notifications', async () => {
      const products = [
        { id: 'prod-1', name: 'Product 1', assignedTo: 'user-1' },
        { id: 'prod-2', name: 'Product 2', assignedTo: 'user-2' },
        { id: 'prod-3', name: 'Product 3', assignedTo: 'user-3' },
      ];

      await helper.notifyBulkApproval(products, 'Approver Name');
      await helper.flush();

      const stats = helper.getStatistics();
      expect(stats.totalNotifications).toBe(3);
    });
  });

  describe('Bulk Rejection Notifications', () => {
    it('should send bulk rejection notifications', async () => {
      const products = [
        { id: 'prod-1', name: 'Product 1', assignedTo: 'user-1' },
        { id: 'prod-2', name: 'Product 2', assignedTo: 'user-2' },
      ];

      await helper.notifyBulkRejection(products, 'Reviewer Name', 'Quality issues');
      await helper.flush();

      const stats = helper.getStatistics();
      expect(stats.totalNotifications).toBe(2);
    });
  });

  describe('Statistics', () => {
    it('should get statistics from helper', async () => {
      const userIds = ['user-1', 'user-2'];
      const productData = { id: 'prod-1', name: 'Test Product' };

      await helper.notifyProductEvent(userIds, NotificationTemplate.PRODUCT_SUBMITTED, productData);
      await helper.flush();

      const stats = helper.getStatistics();
      expect(stats.totalNotifications).toBe(2);
      expect(stats.successfulNotifications).toBeGreaterThan(0);
    });
  });

  describe('Default Instance', () => {
    it('should provide default helper instance', () => {
      expect(bulkNotificationHelper).toBeInstanceOf(BulkNotificationHelper);
    });
  });
});
