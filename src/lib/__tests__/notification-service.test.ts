import { 
  NotificationService, 
  NotificationChannel, 
  NotificationPriority, 
  NotificationStatus, 
  NotificationTemplate,
  EmailServiceConfig,
  UserNotificationPreferences,
  NotificationRecipient,
  NotificationTemplateData,
  InAppNotification
} from '../notification-service';
import { UserRole, WorkflowState, WorkflowAction } from '@/types/workflow';

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockEmailConfig: EmailServiceConfig;
  let mockRecipient: NotificationRecipient;
  let mockPreferences: UserNotificationPreferences;

  beforeEach(() => {
    mockEmailConfig = {
      provider: 'smtp',
      fromEmail: 'test@pimify.com',
      fromName: 'Test Notifications',
      smtpConfig: {
        host: 'localhost',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'password',
        },
      },
    };

    mockPreferences = {
      userId: 'user1',
      globalEnabled: true,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      frequency: 'immediate',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
      },
      eventPreferences: {
        [NotificationTemplate.PRODUCT_SUBMITTED]: {
          enabled: true,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.NORMAL,
        },
        [NotificationTemplate.PRODUCT_APPROVED]: {
          enabled: true,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.NORMAL,
        },
        [NotificationTemplate.PRODUCT_REJECTED]: {
          enabled: true,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.HIGH,
        },
        [NotificationTemplate.PRODUCT_PUBLISHED]: {
          enabled: true,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.NORMAL,
        },
        [NotificationTemplate.PRODUCT_COMMENTED]: {
          enabled: true,
          channels: [NotificationChannel.IN_APP],
          priority: NotificationPriority.LOW,
        },
        [NotificationTemplate.PRODUCT_ASSIGNED]: {
          enabled: true,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.HIGH,
        },
        [NotificationTemplate.REVIEWER_ASSIGNED]: {
          enabled: true,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.HIGH,
        },
        [NotificationTemplate.DEADLINE_APPROACHING]: {
          enabled: true,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.HIGH,
        },
        [NotificationTemplate.DEADLINE_EXCEEDED]: {
          enabled: true,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.URGENT,
        },
        [NotificationTemplate.SYSTEM_MAINTENANCE]: {
          enabled: true,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.NORMAL,
        },
        [NotificationTemplate.USER_ROLE_CHANGED]: {
          enabled: true,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.HIGH,
        },
        [NotificationTemplate.PERMISSION_CHANGED]: {
          enabled: true,
          channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
          priority: NotificationPriority.HIGH,
        },
      },
      language: 'en',
      timezone: 'UTC',
    };

    mockRecipient = {
      userId: 'user1',
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.REVIEWER,
      preferences: mockPreferences,
      isActive: true,
    };

    notificationService = new NotificationService(mockEmailConfig);
  });

  describe('Basic Functionality', () => {
    it('should create notification service instance', () => {
      expect(notificationService).toBeInstanceOf(NotificationService);
    });

    it('should initialize with empty statistics', () => {
      const stats = notificationService.getStats();
      expect(stats.totalSent).toBe(0);
      expect(stats.totalDelivered).toBe(0);
      expect(stats.totalFailed).toBe(0);
    });

    it('should initialize with empty queue', () => {
      const queueStatus = notificationService.getQueueStatus();
      expect(queueStatus.pending).toBe(0);
      expect(queueStatus.processing).toBe(false);
    });
  });

  describe('Send Notification', () => {
    it('should send notification when user preferences allow', async () => {
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      const messages = await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        mockRecipient,
        templateData
      );

      expect(messages).toHaveLength(2); // EMAIL and IN_APP
      expect(messages[0].template).toBe(NotificationTemplate.PRODUCT_SUBMITTED);
      expect(messages[0].recipient).toBe(mockRecipient);
      expect(messages[0].status).toBe(NotificationStatus.PENDING);
    });

    it('should not send notification when globally disabled', async () => {
      const disabledRecipient = {
        ...mockRecipient,
        preferences: {
          ...mockPreferences,
          globalEnabled: false,
        },
      };

      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: disabledRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      const messages = await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        disabledRecipient,
        templateData
      );

      expect(messages).toHaveLength(0);
    });

    it('should not send notification when event is disabled', async () => {
      const recipientWithDisabledEvent = {
        ...mockRecipient,
        preferences: {
          ...mockPreferences,
          eventPreferences: {
            ...mockPreferences.eventPreferences,
            [NotificationTemplate.PRODUCT_SUBMITTED]: {
              enabled: false,
              channels: [NotificationChannel.EMAIL],
              priority: NotificationPriority.NORMAL,
            },
          },
        },
      };

      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: recipientWithDisabledEvent,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      const messages = await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        recipientWithDisabledEvent,
        templateData
      );

      expect(messages).toHaveLength(0);
    });

    it('should respect channel preferences', async () => {
      const recipientWithEmailOnly = {
        ...mockRecipient,
        preferences: {
          ...mockPreferences,
          eventPreferences: {
            ...mockPreferences.eventPreferences,
            [NotificationTemplate.PRODUCT_SUBMITTED]: {
              enabled: true,
              channels: [NotificationChannel.EMAIL],
              priority: NotificationPriority.NORMAL,
            },
          },
        },
      };

      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: recipientWithEmailOnly,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      const messages = await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        recipientWithEmailOnly,
        templateData
      );

      expect(messages).toHaveLength(1);
      expect(messages[0].channel).toBe(NotificationChannel.EMAIL);
    });

    it('should handle quiet hours correctly', async () => {
      const recipientWithQuietHours = {
        ...mockRecipient,
        preferences: {
          ...mockPreferences,
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '08:00',
            timezone: 'UTC',
          },
        },
      };

      // Mock current time to be within quiet hours
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => new Date('2023-01-01T23:00:00Z').getTime());

      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: recipientWithQuietHours,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      const messages = await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        recipientWithQuietHours,
        templateData
      );

      // Should schedule for after quiet hours
      expect(messages).toHaveLength(2);
      expect(messages[0].scheduledFor).toBeDefined();

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });

  describe('Template Content Generation', () => {
    it('should generate correct content for product submitted', async () => {
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      const messages = await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        mockRecipient,
        templateData
      );

      expect(messages[0].subject).toBe('Product "Test Product" submitted for review');
      expect(messages[0].content).toContain('Test Product');
      expect(messages[0].content).toContain('submitted for review');
    });

    it('should generate correct content for product approved', async () => {
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_APPROVED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.APPROVED,
        },
      };

      const messages = await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_APPROVED,
        mockRecipient,
        templateData
      );

      expect(messages[0].subject).toBe('Product "Test Product" approved');
      expect(messages[0].content).toContain('approved');
    });

    it('should generate correct content for product rejected with reason', async () => {
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_REJECTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REJECTED,
        },
        workflow: {
          action: WorkflowAction.REJECT,
          newState: WorkflowState.REJECTED,
          reason: 'Quality issues found',
        },
      };

      const messages = await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_REJECTED,
        mockRecipient,
        templateData
      );

      expect(messages[0].subject).toBe('Product "Test Product" rejected');
      expect(messages[0].content).toContain('Quality issues found');
    });

    it('should generate correct content for deadline approaching', async () => {
      const dueDate = new Date('2023-12-31T23:59:59Z');
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.DEADLINE_APPROACHING,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
          dueDate,
        },
      };

      const messages = await notificationService.sendNotification(
        NotificationTemplate.DEADLINE_APPROACHING,
        mockRecipient,
        templateData
      );

      expect(messages[0].subject).toBe('Deadline approaching for "Test Product"');
      expect(messages[0].content).toContain('deadline');
      expect(messages[0].content).toContain(dueDate.toLocaleDateString());
    });
  });

  describe('In-App Notifications', () => {
    it('should create in-app notification', async () => {
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        mockRecipient,
        templateData
      );

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const notifications = notificationService.getInAppNotifications(mockRecipient.userId);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe(NotificationTemplate.PRODUCT_SUBMITTED);
      expect(notifications[0].isRead).toBe(false);
    });

    it('should mark notification as read', async () => {
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        mockRecipient,
        templateData
      );

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const notifications = notificationService.getInAppNotifications(mockRecipient.userId);
      const notificationId = notifications[0].id;

      const result = notificationService.markAsRead(mockRecipient.userId, notificationId);
      expect(result).toBe(true);

      const updatedNotifications = notificationService.getInAppNotifications(mockRecipient.userId);
      expect(updatedNotifications[0].isRead).toBe(true);
      expect(updatedNotifications[0].readAt).toBeDefined();
    });

    it('should archive notification', async () => {
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        mockRecipient,
        templateData
      );

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const notifications = notificationService.getInAppNotifications(mockRecipient.userId);
      const notificationId = notifications[0].id;

      const result = notificationService.archiveNotification(mockRecipient.userId, notificationId);
      expect(result).toBe(true);

      const updatedNotifications = notificationService.getInAppNotifications(mockRecipient.userId);
      expect(updatedNotifications).toHaveLength(0); // Archived notifications are filtered out
    });

    it('should filter notifications by read status', async () => {
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        mockRecipient,
        templateData
      );

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const notifications = notificationService.getInAppNotifications(mockRecipient.userId);
      const notificationId = notifications[0].id;

      // Mark as read
      notificationService.markAsRead(mockRecipient.userId, notificationId);

      // Get only unread notifications
      const unreadNotifications = notificationService.getInAppNotifications(mockRecipient.userId, {
        includeRead: false,
      });
      expect(unreadNotifications).toHaveLength(0);

      // Get all notifications including read
      const allNotifications = notificationService.getInAppNotifications(mockRecipient.userId, {
        includeRead: true,
      });
      expect(allNotifications).toHaveLength(1);
    });
  });

  describe('Statistics', () => {
    it('should update statistics when notifications are sent', async () => {
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        mockRecipient,
        templateData
      );

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = notificationService.getStats();
      expect(stats.totalSent).toBeGreaterThan(0);
      expect(stats.channelStats[NotificationChannel.EMAIL]).toBeDefined();
      expect(stats.channelStats[NotificationChannel.IN_APP]).toBeDefined();
    });

    it('should clear statistics', () => {
      // First send some notifications to populate stats
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        mockRecipient,
        templateData
      );

      // Clear stats
      notificationService.clearStats();

      const stats = notificationService.getStats();
      expect(stats.totalSent).toBe(0);
      expect(stats.totalDelivered).toBe(0);
      expect(stats.totalFailed).toBe(0);
    });
  });

  describe('Queue Management', () => {
    it('should process queue asynchronously', async () => {
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        mockRecipient,
        templateData
      );

      // Queue should be processed asynchronously
      const queueStatus = notificationService.getQueueStatus();
      expect(queueStatus.pending).toBe(0); // Should be processed
    });

    it('should handle multiple notifications in queue', async () => {
      const templateData1: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product 1',
          state: WorkflowState.REVIEW,
        },
      };

      const templateData2: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_APPROVED,
        recipient: mockRecipient,
        product: {
          id: 'product2',
          name: 'Test Product 2',
          state: WorkflowState.APPROVED,
        },
      };

      await Promise.all([
        notificationService.sendNotification(
          NotificationTemplate.PRODUCT_SUBMITTED,
          mockRecipient,
          templateData1
        ),
        notificationService.sendNotification(
          NotificationTemplate.PRODUCT_APPROVED,
          mockRecipient,
          templateData2
        ),
      ]);

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = notificationService.getStats();
      expect(stats.totalSent).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid recipient gracefully', async () => {
      const invalidRecipient = {
        ...mockRecipient,
        email: 'invalid-email',
      };

      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: invalidRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      // Should not throw error
      const messages = await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        invalidRecipient,
        templateData
      );

      expect(messages).toHaveLength(2); // Should still create messages
    });

    it('should handle missing product data gracefully', async () => {
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        // Missing product data
      };

      const messages = await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        mockRecipient,
        templateData
      );

      expect(messages).toHaveLength(2);
      expect(messages[0].subject).toContain('undefined'); // Should handle missing product name
    });
  });

  describe('Custom Options', () => {
    it('should respect custom channels option', async () => {
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      const messages = await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        mockRecipient,
        templateData,
        {
          channels: [NotificationChannel.EMAIL],
        }
      );

      expect(messages).toHaveLength(1);
      expect(messages[0].channel).toBe(NotificationChannel.EMAIL);
    });

    it('should respect custom priority option', async () => {
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      const messages = await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        mockRecipient,
        templateData,
        {
          priority: NotificationPriority.URGENT,
        }
      );

      expect(messages[0].priority).toBe(NotificationPriority.URGENT);
    });

    it('should respect scheduled delivery option', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const templateData: NotificationTemplateData = {
        template: NotificationTemplate.PRODUCT_SUBMITTED,
        recipient: mockRecipient,
        product: {
          id: 'product1',
          name: 'Test Product',
          state: WorkflowState.REVIEW,
        },
      };

      const messages = await notificationService.sendNotification(
        NotificationTemplate.PRODUCT_SUBMITTED,
        mockRecipient,
        templateData,
        {
          scheduledFor: futureDate,
        }
      );

      expect(messages[0].scheduledFor).toEqual(futureDate);
    });
  });
});
