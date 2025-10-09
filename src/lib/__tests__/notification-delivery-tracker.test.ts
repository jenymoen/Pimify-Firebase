import {
  NotificationDeliveryTracker,
  NotificationDeliveryRecord,
  RetryStrategy,
  DeliveryFilterOptions,
  notificationDeliveryTracker,
} from '../notification-delivery-tracker';
import { NotificationTemplate, NotificationChannel, NotificationPriority, NotificationStatus } from '../notification-service';

describe('NotificationDeliveryTracker', () => {
  let tracker: NotificationDeliveryTracker;
  const testUserId = 'user-123';
  const testNotificationId = 'notif-456';

  beforeEach(() => {
    tracker = new NotificationDeliveryTracker();
  });

  afterEach(() => {
    tracker.stopRetryProcessor();
  });

  describe('Create Record', () => {
    it('should create a delivery record', () => {
      const record = tracker.createRecord(
        testNotificationId,
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );

      expect(record.id).toBeDefined();
      expect(record.notificationId).toBe(testNotificationId);
      expect(record.userId).toBe(testUserId);
      expect(record.template).toBe(NotificationTemplate.PRODUCT_SUBMITTED);
      expect(record.channel).toBe(NotificationChannel.EMAIL);
      expect(record.priority).toBe(NotificationPriority.NORMAL);
      expect(record.status).toBe(NotificationStatus.PENDING);
      expect(record.currentAttempt).toBe(0);
      expect(record.attempts).toHaveLength(0);
      expect(record.createdAt).toBeInstanceOf(Date);
    });

    it('should create record with custom options', () => {
      const scheduledFor = new Date(Date.now() + 60000);
      const retryStrategy: RetryStrategy = {
        type: 'fixed',
        baseDelay: 30,
      };

      const record = tracker.createRecord(
        testNotificationId,
        testUserId,
        NotificationTemplate.PRODUCT_APPROVED,
        NotificationChannel.IN_APP,
        NotificationPriority.HIGH,
        {
          maxAttempts: 5,
          retryStrategy,
          scheduledFor,
          metadata: { custom: 'data' },
        }
      );

      expect(record.maxAttempts).toBe(5);
      expect(record.retryStrategy).toEqual(retryStrategy);
      expect(record.scheduledFor).toEqual(scheduledFor);
      expect(record.metadata).toEqual({ custom: 'data' });
    });
  });

  describe('Record Attempt', () => {
    let recordId: string;

    beforeEach(() => {
      const record = tracker.createRecord(
        testNotificationId,
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );
      recordId = record.id;
    });

    it('should record successful delivery attempt', () => {
      const result = tracker.recordAttempt(
        recordId,
        NotificationStatus.DELIVERED,
        150, // 150ms response time
        { providerId: 'smtp' }
      );

      expect(result).toBe(true);

      const record = tracker.getRecord(recordId);
      expect(record?.status).toBe(NotificationStatus.DELIVERED);
      expect(record?.currentAttempt).toBe(1);
      expect(record?.attempts).toHaveLength(1);
      expect(record?.attempts[0].responseTime).toBe(150);
      expect(record?.deliveredAt).toBeInstanceOf(Date);
    });

    it('should record failed attempt with error', () => {
      const result = tracker.recordAttempt(
        recordId,
        NotificationStatus.FAILED,
        200,
        {
          error: 'Connection timeout',
          errorCode: 'TIMEOUT',
          providerId: 'smtp',
        }
      );

      expect(result).toBe(true);

      const record = tracker.getRecord(recordId);
      expect(record?.status).toBe(NotificationStatus.FAILED);
      expect(record?.lastError).toBe('Connection timeout');
      expect(record?.lastErrorCode).toBe('TIMEOUT');
    });

    it('should track multiple attempts', () => {
      tracker.recordAttempt(recordId, NotificationStatus.FAILED, 100, {
        error: 'First failure',
      });
      tracker.recordAttempt(recordId, NotificationStatus.FAILED, 120, {
        error: 'Second failure',
      });
      tracker.recordAttempt(recordId, NotificationStatus.DELIVERED, 150);

      const record = tracker.getRecord(recordId);
      expect(record?.attempts).toHaveLength(3);
      expect(record?.currentAttempt).toBe(3);
      expect(record?.status).toBe(NotificationStatus.DELIVERED);
    });

    it('should return false for non-existent record', () => {
      const result = tracker.recordAttempt('non-existent', NotificationStatus.SENT, 100);
      expect(result).toBe(false);
    });
  });

  describe('Mark as Read', () => {
    let recordId: string;

    beforeEach(() => {
      const record = tracker.createRecord(
        testNotificationId,
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.IN_APP,
        NotificationPriority.NORMAL
      );
      recordId = record.id;
      
      tracker.recordAttempt(recordId, NotificationStatus.DELIVERED, 100);
    });

    it('should mark notification as read', () => {
      const result = tracker.markAsRead(recordId);
      expect(result).toBe(true);

      const record = tracker.getRecord(recordId);
      expect(record?.status).toBe(NotificationStatus.READ);
      expect(record?.readAt).toBeInstanceOf(Date);
    });

    it('should return false for non-existent record', () => {
      const result = tracker.markAsRead('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Get Records', () => {
    beforeEach(() => {
      // Create multiple records
      const record1 = tracker.createRecord(
        'notif-1',
        'user-1',
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );
      tracker.recordAttempt(record1.id, NotificationStatus.DELIVERED, 100);

      const record2 = tracker.createRecord(
        'notif-2',
        'user-1',
        NotificationTemplate.PRODUCT_APPROVED,
        NotificationChannel.IN_APP,
        NotificationPriority.HIGH
      );
      tracker.recordAttempt(record2.id, NotificationStatus.FAILED, 150, {
        error: 'Failed',
      });

      const record3 = tracker.createRecord(
        'notif-3',
        'user-2',
        NotificationTemplate.PRODUCT_REJECTED,
        NotificationChannel.EMAIL,
        NotificationPriority.URGENT
      );
      tracker.recordAttempt(record3.id, NotificationStatus.SENT, 120);
    });

    it('should get all records', () => {
      const records = tracker.getRecords();
      expect(records).toHaveLength(3);
    });

    it('should filter by userId', () => {
      const records = tracker.getRecords({ userId: 'user-1' });
      expect(records).toHaveLength(2);
      expect(records.every(r => r.userId === 'user-1')).toBe(true);
    });

    it('should filter by template', () => {
      const records = tracker.getRecords({ template: NotificationTemplate.PRODUCT_SUBMITTED });
      expect(records).toHaveLength(1);
      expect(records[0].template).toBe(NotificationTemplate.PRODUCT_SUBMITTED);
    });

    it('should filter by channel', () => {
      const records = tracker.getRecords({ channel: NotificationChannel.EMAIL });
      expect(records).toHaveLength(2);
      expect(records.every(r => r.channel === NotificationChannel.EMAIL)).toBe(true);
    });

    it('should filter by status', () => {
      const records = tracker.getRecords({ status: NotificationStatus.FAILED });
      expect(records).toHaveLength(1);
      expect(records[0].status).toBe(NotificationStatus.FAILED);
    });

    it('should filter by priority', () => {
      const records = tracker.getRecords({ priority: NotificationPriority.HIGH });
      expect(records).toHaveLength(1);
      expect(records[0].priority).toBe(NotificationPriority.HIGH);
    });

    it('should filter by errors', () => {
      const records = tracker.getRecords({ hasErrors: true });
      expect(records).toHaveLength(1);
      expect(records[0].lastError).toBeDefined();
    });

    it('should apply pagination', () => {
      const records = tracker.getRecords({ limit: 2, offset: 1 });
      expect(records).toHaveLength(2);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Create test records with various statuses
      const record1 = tracker.createRecord(
        'notif-1',
        'user-1',
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );
      tracker.recordAttempt(record1.id, NotificationStatus.DELIVERED, 100);

      const record2 = tracker.createRecord(
        'notif-2',
        'user-1',
        NotificationTemplate.PRODUCT_APPROVED,
        NotificationChannel.IN_APP,
        NotificationPriority.HIGH
      );
      tracker.recordAttempt(record2.id, NotificationStatus.DELIVERED, 150);
      tracker.markAsRead(record2.id);

      const record3 = tracker.createRecord(
        'notif-3',
        'user-2',
        NotificationTemplate.PRODUCT_REJECTED,
        NotificationChannel.EMAIL,
        NotificationPriority.URGENT
      );
      tracker.recordAttempt(record3.id, NotificationStatus.FAILED, 200);

      const record4 = tracker.createRecord(
        'notif-4',
        'user-2',
        NotificationTemplate.PRODUCT_PUBLISHED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );
      // Pending - no attempt recorded
    });

    it('should calculate overall statistics', () => {
      const stats = tracker.getStatistics();
      
      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(1);
      expect(stats.delivered).toBe(1);
      expect(stats.read).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should calculate delivery rate', () => {
      const stats = tracker.getStatistics();
      expect(stats.deliveryRate).toBe(0.5); // 2 delivered out of 4 total
    });

    it('should calculate read rate', () => {
      const stats = tracker.getStatistics();
      expect(stats.readRate).toBe(0.5); // 1 read out of 2 delivered
    });

    it('should calculate average response time', () => {
      const stats = tracker.getStatistics();
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(stats.averageResponseTime).toBe(150); // (100 + 150 + 200) / 3
    });

    it('should calculate statistics by channel', () => {
      const stats = tracker.getStatistics();
      
      expect(stats.byChannel[NotificationChannel.EMAIL].total).toBe(3);
      expect(stats.byChannel[NotificationChannel.IN_APP].total).toBe(1);
    });

    it('should calculate statistics by template', () => {
      const stats = tracker.getStatistics();
      
      expect(stats.byTemplate[NotificationTemplate.PRODUCT_SUBMITTED].total).toBe(1);
      expect(stats.byTemplate[NotificationTemplate.PRODUCT_APPROVED].total).toBe(1);
    });

    it('should calculate statistics by priority', () => {
      const stats = tracker.getStatistics();
      
      expect(stats.byPriority[NotificationPriority.NORMAL].total).toBe(2);
      expect(stats.byPriority[NotificationPriority.HIGH].total).toBe(1);
      expect(stats.byPriority[NotificationPriority.URGENT].total).toBe(1);
    });

    it('should filter statistics by options', () => {
      const stats = tracker.getStatistics({
        userId: 'user-1',
      });
      
      expect(stats.total).toBe(2);
    });
  });

  describe('Retry Logic', () => {
    it('should schedule retry for failed delivery', () => {
      const record = tracker.createRecord(
        testNotificationId,
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );

      tracker.recordAttempt(record.id, NotificationStatus.FAILED, 100, {
        error: 'Temporary failure',
      });

      const updatedRecord = tracker.getRecord(record.id);
      expect(updatedRecord?.nextRetryAt).toBeDefined();
    });

    it('should not schedule retry for permanent failure', () => {
      const record = tracker.createRecord(
        testNotificationId,
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL,
        { maxAttempts: 1 }
      );

      tracker.recordAttempt(record.id, NotificationStatus.FAILED, 100, {
        error: 'Permanent failure',
        errorCode: 'INVALID_EMAIL',
      });

      const updatedRecord = tracker.getRecord(record.id);
      expect(updatedRecord?.permanentFailure).toBe(true);
    });

    it('should calculate exponential backoff delay', () => {
      const record = tracker.createRecord(
        testNotificationId,
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL,
        {
          retryStrategy: {
            type: 'exponential',
            baseDelay: 60,
            multiplier: 2,
            jitter: false,
          },
        }
      );

      tracker.recordAttempt(record.id, NotificationStatus.FAILED, 100);
      const record1 = tracker.getRecord(record.id);
      const delay1 = record1?.nextRetryAt;

      tracker.recordAttempt(record.id, NotificationStatus.FAILED, 100);
      const record2 = tracker.getRecord(record.id);
      const delay2 = record2?.nextRetryAt;

      // Second retry should be scheduled later than first
      if (delay1 && delay2) {
        expect(delay2.getTime()).toBeGreaterThan(delay1.getTime());
      }
    });

    it('should process retry queue', async () => {
      const record = tracker.createRecord(
        testNotificationId,
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL,
        {
          retryStrategy: {
            type: 'fixed',
            baseDelay: 1, // 1 second
          },
        }
      );

      tracker.recordAttempt(record.id, NotificationStatus.FAILED, 100);

      const queueStatus = tracker.getRetryQueueStatus();
      expect(queueStatus.queueSize).toBe(1);

      // Wait for retry to be processed
      await new Promise(resolve => setTimeout(resolve, 12000));

      const updatedRecord = tracker.getRecord(record.id);
      expect(updatedRecord?.status).toBe(NotificationStatus.PENDING);
    }, 15000);
  });

  describe('Get Record', () => {
    it('should get record by ID', () => {
      const created = tracker.createRecord(
        testNotificationId,
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );

      const record = tracker.getRecord(created.id);
      expect(record).not.toBeNull();
      expect(record?.id).toBe(created.id);
    });

    it('should return null for non-existent record', () => {
      const record = tracker.getRecord('non-existent');
      expect(record).toBeNull();
    });
  });

  describe('Clear Old Records', () => {
    it('should clear records older than specified date', () => {
      // Create old record
      const oldRecord = tracker.createRecord(
        'old-notif',
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );
      
      // Manually set old date
      oldRecord.createdAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago

      // Create recent record
      tracker.createRecord(
        'recent-notif',
        testUserId,
        NotificationTemplate.PRODUCT_APPROVED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );

      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const clearedCount = tracker.clearOldRecords(cutoffDate);

      expect(clearedCount).toBe(1);
      
      const remainingRecords = tracker.getRecords();
      expect(remainingRecords).toHaveLength(1);
    });
  });

  describe('Retry Queue Status', () => {
    it('should get retry queue status', () => {
      const record = tracker.createRecord(
        testNotificationId,
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );

      tracker.recordAttempt(record.id, NotificationStatus.FAILED, 100);

      const status = tracker.getRetryQueueStatus();
      expect(status.queueSize).toBe(1);
      expect(status.processing).toBe(true);
      expect(status.nextRetryAt).toBeInstanceOf(Date);
    });

    it('should return empty status when queue is empty', () => {
      const status = tracker.getRetryQueueStatus();
      expect(status.queueSize).toBe(0);
      expect(status.processing).toBe(false);
      expect(status.nextRetryAt).toBeUndefined();
    });
  });

  describe('Default Instance', () => {
    it('should provide default instance', () => {
      expect(notificationDeliveryTracker).toBeInstanceOf(NotificationDeliveryTracker);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid successive attempts', () => {
      const record = tracker.createRecord(
        testNotificationId,
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );

      for (let i = 0; i < 5; i++) {
        tracker.recordAttempt(record.id, NotificationStatus.FAILED, 100);
      }

      const updatedRecord = tracker.getRecord(record.id);
      expect(updatedRecord?.attempts).toHaveLength(5);
      expect(updatedRecord?.currentAttempt).toBe(5);
    });

    it('should handle different retry strategies', () => {
      const strategies: RetryStrategy[] = [
        { type: 'exponential', baseDelay: 60, multiplier: 2 },
        { type: 'linear', baseDelay: 60 },
        { type: 'fixed', baseDelay: 60 },
        { type: 'none', baseDelay: 0 },
      ];

      strategies.forEach((strategy, index) => {
        const record = tracker.createRecord(
          `notif-${index}`,
          testUserId,
          NotificationTemplate.PRODUCT_SUBMITTED,
          NotificationChannel.EMAIL,
          NotificationPriority.NORMAL,
          { retryStrategy: strategy }
        );

        expect(record.retryStrategy).toEqual(strategy);
      });
    });

    it('should handle bounced status as permanent failure', () => {
      const record = tracker.createRecord(
        testNotificationId,
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );

      tracker.recordAttempt(record.id, NotificationStatus.BOUNCED, 100, {
        errorCode: 'INVALID_EMAIL',
      });

      const updatedRecord = tracker.getRecord(record.id);
      expect(updatedRecord?.permanentFailure).toBe(true);
    });

    it('should handle zero response time', () => {
      const record = tracker.createRecord(
        testNotificationId,
        testUserId,
        NotificationTemplate.PRODUCT_SUBMITTED,
        NotificationChannel.EMAIL,
        NotificationPriority.NORMAL
      );

      tracker.recordAttempt(record.id, NotificationStatus.DELIVERED, 0);

      const stats = tracker.getStatistics();
      expect(stats.averageResponseTime).toBe(0);
    });
  });
});
