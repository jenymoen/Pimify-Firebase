import {
  InAppNotificationSystem,
  InAppNotification,
  NotificationSubscription,
  UpdateMethod,
  NotificationFilterOptions,
  inAppNotificationSystem,
} from '../in-app-notification-system';
import { NotificationTemplate, NotificationPriority } from '../notification-service';

describe('InAppNotificationSystem', () => {
  let system: InAppNotificationSystem;
  const testUserId = 'user-123';

  beforeEach(() => {
    system = new InAppNotificationSystem({
      updateMethod: UpdateMethod.POLLING,
      pollingInterval: 1000,
      maxNotifications: 50,
      defaultExpiration: 30,
      enableGrouping: true,
      enableBadgeCount: true,
    });
  });

  afterEach(() => {
    // Clean up subscriptions
    system.unsubscribe(testUserId);
  });

  describe('Notification Creation', () => {
    it('should create a new notification', async () => {
      const notification = await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Product Submitted',
        message: 'Your product has been submitted for review',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });

      expect(notification.id).toBeDefined();
      expect(notification.userId).toBe(testUserId);
      expect(notification.title).toBe('Product Submitted');
      expect(notification.createdAt).toBeInstanceOf(Date);
      expect(notification.expiresAt).toBeInstanceOf(Date);
    });

    it('should add notification to user notifications', async () => {
      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_APPROVED,
        title: 'Product Approved',
        message: 'Your product has been approved',
        priority: NotificationPriority.HIGH,
        isRead: false,
        isArchived: false,
      });

      const notifications = system.getNotifications(testUserId);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Product Approved');
    });

    it('should limit total notifications per user', async () => {
      const limitedSystem = new InAppNotificationSystem({
        maxNotifications: 3,
      });

      // Create 5 notifications
      for (let i = 0; i < 5; i++) {
        await limitedSystem.createNotification({
          userId: testUserId,
          type: NotificationTemplate.PRODUCT_SUBMITTED,
          title: `Notification ${i}`,
          message: `Message ${i}`,
          priority: NotificationPriority.NORMAL,
          isRead: false,
          isArchived: false,
        });
      }

      const notifications = limitedSystem.getNotifications(testUserId);
      expect(notifications).toHaveLength(3); // Limited to 3
    });
  });

  describe('Getting Notifications', () => {
    beforeEach(async () => {
      // Create test notifications
      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Notification 1',
        message: 'Message 1',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });

      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_APPROVED,
        title: 'Notification 2',
        message: 'Message 2',
        priority: NotificationPriority.HIGH,
        isRead: true,
        isArchived: false,
      });

      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_REJECTED,
        title: 'Notification 3',
        message: 'Message 3',
        priority: NotificationPriority.URGENT,
        isRead: false,
        isArchived: true,
      });
    });

    it('should get all notifications for user', () => {
      const notifications = system.getNotifications(testUserId);
      expect(notifications).toHaveLength(3);
    });

    it('should filter by read status', () => {
      const unreadNotifications = system.getNotifications(testUserId, {
        isRead: false,
      });
      expect(unreadNotifications).toHaveLength(2);
    });

    it('should filter by archived status', () => {
      const activeNotifications = system.getNotifications(testUserId, {
        isArchived: false,
      });
      expect(activeNotifications).toHaveLength(2);
    });

    it('should filter by notification type', () => {
      const submittedNotifications = system.getNotifications(testUserId, {
        types: [NotificationTemplate.PRODUCT_SUBMITTED],
      });
      expect(submittedNotifications).toHaveLength(1);
      expect(submittedNotifications[0].type).toBe(NotificationTemplate.PRODUCT_SUBMITTED);
    });

    it('should filter by priority', () => {
      const highPriorityNotifications = system.getNotifications(testUserId, {
        priorities: [NotificationPriority.HIGH, NotificationPriority.URGENT],
      });
      expect(highPriorityNotifications).toHaveLength(2);
    });

    it('should apply limit and offset', () => {
      const limitedNotifications = system.getNotifications(testUserId, {
        limit: 2,
        offset: 1,
      });
      expect(limitedNotifications).toHaveLength(2);
    });
  });

  describe('Grouped Notifications', () => {
    beforeEach(async () => {
      // Create notifications with same groupId
      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Product 1 Submitted',
        message: 'Message 1',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
        groupId: 'group-1',
      });

      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Product 2 Submitted',
        message: 'Message 2',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
        groupId: 'group-1',
      });

      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_APPROVED,
        title: 'Product Approved',
        message: 'Message 3',
        priority: NotificationPriority.HIGH,
        isRead: false,
        isArchived: false,
      });
    });

    it('should group notifications by groupId', () => {
      const groups = system.getGroupedNotifications(testUserId);
      expect(groups).toHaveLength(2); // One group + one ungrouped
    });

    it('should count notifications in group', () => {
      const groups = system.getGroupedNotifications(testUserId);
      const group1 = groups.find(g => g.id === 'group-1');
      expect(group1).toBeDefined();
      expect(group1!.count).toBe(2);
    });

    it('should track group read status', () => {
      const groups = system.getGroupedNotifications(testUserId);
      groups.forEach(group => {
        expect(group.isRead).toBe(false); // All unread
      });
    });
  });

  describe('Marking as Read', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Test Notification',
        message: 'Test Message',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });
      notificationId = notification.id;
    });

    it('should mark single notification as read', () => {
      const result = system.markAsRead(testUserId, notificationId);
      expect(result).toBe(true);

      const notifications = system.getNotifications(testUserId);
      expect(notifications[0].isRead).toBe(true);
      expect(notifications[0].readAt).toBeInstanceOf(Date);
    });

    it('should not mark already read notification', () => {
      system.markAsRead(testUserId, notificationId);
      const result = system.markAsRead(testUserId, notificationId);
      expect(result).toBe(false);
    });

    it('should mark all notifications as read', async () => {
      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_APPROVED,
        title: 'Another Notification',
        message: 'Another Message',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });

      const count = system.markAllAsRead(testUserId);
      expect(count).toBe(2);

      const unreadNotifications = system.getNotifications(testUserId, {
        isRead: false,
      });
      expect(unreadNotifications).toHaveLength(0);
    });
  });

  describe('Archiving Notifications', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Test Notification',
        message: 'Test Message',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });
      notificationId = notification.id;
    });

    it('should archive notification', () => {
      const result = system.archiveNotification(testUserId, notificationId);
      expect(result).toBe(true);

      const notifications = system.getNotifications(testUserId);
      expect(notifications[0].isArchived).toBe(true);
      expect(notifications[0].archivedAt).toBeInstanceOf(Date);
    });

    it('should not archive already archived notification', () => {
      system.archiveNotification(testUserId, notificationId);
      const result = system.archiveNotification(testUserId, notificationId);
      expect(result).toBe(false);
    });
  });

  describe('Deleting Notifications', () => {
    let notificationId: string;

    beforeEach(async () => {
      const notification = await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Test Notification',
        message: 'Test Message',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });
      notificationId = notification.id;
    });

    it('should delete notification', () => {
      const result = system.deleteNotification(testUserId, notificationId);
      expect(result).toBe(true);

      const notifications = system.getNotifications(testUserId);
      expect(notifications).toHaveLength(0);
    });

    it('should return false for non-existent notification', () => {
      const result = system.deleteNotification(testUserId, 'non-existent');
      expect(result).toBe(false);
    });

    it('should clear all notifications', async () => {
      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_APPROVED,
        title: 'Another Notification',
        message: 'Another Message',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });

      const count = system.clearAllNotifications(testUserId);
      expect(count).toBe(2);

      const notifications = system.getNotifications(testUserId);
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Real-Time Subscriptions', () => {
    it('should subscribe to notifications', (done) => {
      const subscription: NotificationSubscription = {
        userId: testUserId,
        callback: (notification) => {
          expect(notification.title).toBe('Real-Time Test');
          done();
        },
      };

      const unsubscribe = system.subscribe(subscription);

      // Create notification to trigger callback
      system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Real-Time Test',
        message: 'Test Message',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });

      // Cleanup
      unsubscribe();
    });

    it('should filter notifications by type in subscription', (done) => {
      let callbackCalled = false;

      const subscription: NotificationSubscription = {
        userId: testUserId,
        callback: (notification) => {
          callbackCalled = true;
        },
        filters: {
          types: [NotificationTemplate.PRODUCT_APPROVED],
        },
      };

      const unsubscribe = system.subscribe(subscription);

      // Create notification that doesn't match filter
      system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Should Not Trigger',
        message: 'Test Message',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });

      setTimeout(() => {
        expect(callbackCalled).toBe(false);
        unsubscribe();
        done();
      }, 100);
    });

    it('should filter notifications by priority in subscription', (done) => {
      let urgentNotificationReceived = false;

      const subscription: NotificationSubscription = {
        userId: testUserId,
        callback: (notification) => {
          if (notification.priority === NotificationPriority.URGENT) {
            urgentNotificationReceived = true;
          }
        },
        filters: {
          minPriority: NotificationPriority.HIGH,
        },
      };

      const unsubscribe = system.subscribe(subscription);

      // Create low priority notification (should not trigger)
      system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Low Priority',
        message: 'Test Message',
        priority: NotificationPriority.LOW,
        isRead: false,
        isArchived: false,
      });

      // Create urgent notification (should trigger)
      system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.DEADLINE_EXCEEDED,
        title: 'Urgent',
        message: 'Test Message',
        priority: NotificationPriority.URGENT,
        isRead: false,
        isArchived: false,
      });

      setTimeout(() => {
        expect(urgentNotificationReceived).toBe(true);
        unsubscribe();
        done();
      }, 100);
    });

    it('should unsubscribe from notifications', () => {
      let callbackCalled = false;

      const subscription: NotificationSubscription = {
        userId: testUserId,
        callback: () => {
          callbackCalled = true;
        },
      };

      const unsubscribe = system.subscribe(subscription);
      unsubscribe();

      // Create notification after unsubscribe
      system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'After Unsubscribe',
        message: 'Test Message',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });

      expect(callbackCalled).toBe(false);
    });
  });

  describe('Badge Count', () => {
    beforeEach(async () => {
      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Unread 1',
        message: 'Message 1',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });

      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_APPROVED,
        title: 'Unread 2',
        message: 'Message 2',
        priority: NotificationPriority.HIGH,
        isRead: false,
        isArchived: false,
      });

      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_REJECTED,
        title: 'Read',
        message: 'Message 3',
        priority: NotificationPriority.URGENT,
        isRead: true,
        isArchived: false,
      });
    });

    it('should get badge count', () => {
      const badge = system.getBadgeCount(testUserId);
      expect(badge.unreadCount).toBe(2);
      expect(badge.userId).toBe(testUserId);
      expect(badge.lastUpdate).toBeInstanceOf(Date);
    });

    it('should track unread count by priority', () => {
      const badge = system.getBadgeCount(testUserId);
      expect(badge.unreadByPriority[NotificationPriority.NORMAL]).toBe(1);
      expect(badge.unreadByPriority[NotificationPriority.HIGH]).toBe(1);
      expect(badge.unreadByPriority[NotificationPriority.URGENT]).toBe(0); // Read
    });

    it('should update badge count when marking as read', () => {
      const notifications = system.getNotifications(testUserId, { isRead: false });
      system.markAsRead(testUserId, notifications[0].id);

      const badge = system.getBadgeCount(testUserId);
      expect(badge.unreadCount).toBe(1);
    });
  });

  describe('Expired Notifications Cleanup', () => {
    it('should remove expired notifications', async () => {
      // Create expired notification
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Expired',
        message: 'Expired Message',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
        expiresAt: expiredDate,
      });

      // Create valid notification
      await system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_APPROVED,
        title: 'Valid',
        message: 'Valid Message',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });

      const cleanedCount = system.cleanupExpiredNotifications();
      expect(cleanedCount).toBe(1);

      const notifications = system.getNotifications(testUserId);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Valid');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await system.createNotification({
        userId: 'user1',
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Test 1',
        message: 'Message 1',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });

      await system.createNotification({
        userId: 'user2',
        type: NotificationTemplate.PRODUCT_APPROVED,
        title: 'Test 2',
        message: 'Message 2',
        priority: NotificationPriority.NORMAL,
        isRead: true,
        isArchived: false,
      });
    });

    it('should get system statistics', () => {
      const stats = system.getStatistics();
      expect(stats.totalUsers).toBe(2);
      expect(stats.totalNotifications).toBe(2);
      expect(stats.totalUnread).toBe(1);
    });
  });

  describe('Configuration', () => {
    it('should get configuration', () => {
      const config = system.getConfig();
      expect(config.updateMethod).toBe(UpdateMethod.POLLING);
      expect(config.pollingInterval).toBe(1000);
      expect(config.enableGrouping).toBe(true);
    });

    it('should update configuration', () => {
      system.updateConfig({
        pollingInterval: 5000,
        enableGrouping: false,
      });

      const config = system.getConfig();
      expect(config.pollingInterval).toBe(5000);
      expect(config.enableGrouping).toBe(false);
    });
  });

  describe('Default Instance', () => {
    it('should provide default instance', () => {
      expect(inAppNotificationSystem).toBeInstanceOf(InAppNotificationSystem);
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations on non-existent user', () => {
      const notifications = system.getNotifications('non-existent-user');
      expect(notifications).toHaveLength(0);
    });

    it('should handle marking non-existent notification as read', () => {
      const result = system.markAsRead(testUserId, 'non-existent');
      expect(result).toBe(false);
    });

    it('should handle archiving non-existent notification', () => {
      const result = system.archiveNotification(testUserId, 'non-existent');
      expect(result).toBe(false);
    });

    it('should handle deleting from empty notifications', () => {
      const result = system.deleteNotification(testUserId, 'any-id');
      expect(result).toBe(false);
    });

    it('should handle clearing empty notifications', () => {
      const count = system.clearAllNotifications(testUserId);
      expect(count).toBe(0);
    });

    it('should handle multiple subscriptions for same user', () => {
      let callback1Called = false;
      let callback2Called = false;

      const sub1: NotificationSubscription = {
        userId: testUserId,
        callback: () => { callback1Called = true; },
      };

      const sub2: NotificationSubscription = {
        userId: testUserId,
        callback: () => { callback2Called = true; },
      };

      const unsub1 = system.subscribe(sub1);
      const unsub2 = system.subscribe(sub2);

      system.createNotification({
        userId: testUserId,
        type: NotificationTemplate.PRODUCT_SUBMITTED,
        title: 'Test',
        message: 'Test',
        priority: NotificationPriority.NORMAL,
        isRead: false,
        isArchived: false,
      });

      expect(callback1Called).toBe(true);
      expect(callback2Called).toBe(true);

      unsub1();
      unsub2();
    });
  });
});
