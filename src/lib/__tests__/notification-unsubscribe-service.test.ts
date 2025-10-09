import {
  NotificationUnsubscribeService,
  UnsubscribeScope,
  NotificationCategory,
  UnsubscribeRequest,
  ResubscribeRequest,
  notificationUnsubscribeService,
} from '../notification-unsubscribe-service';
import { NotificationTemplate, NotificationChannel } from '../notification-service';

describe('NotificationUnsubscribeService', () => {
  let service: NotificationUnsubscribeService;
  const testUserId = 'user-123';
  const testEmail = 'test@example.com';

  beforeEach(() => {
    service = new NotificationUnsubscribeService();
  });

  describe('Generate Unsubscribe Token', () => {
    it('should generate unsubscribe token', () => {
      const token = service.generateUnsubscribeToken(
        testUserId,
        testEmail,
        UnsubscribeScope.ALL
      );

      expect(token).toBeDefined();
      expect(token).toContain('unsub_');
    });

    it('should generate token with specific scope', () => {
      const token = service.generateUnsubscribeToken(
        testUserId,
        testEmail,
        UnsubscribeScope.CHANNEL,
        NotificationChannel.EMAIL
      );

      const tokenData = service.validateToken(token);
      expect(tokenData).not.toBeNull();
      expect(tokenData?.scope).toBe(UnsubscribeScope.CHANNEL);
      expect(tokenData?.target).toBe(NotificationChannel.EMAIL);
    });

    it('should set token expiration', () => {
      const token = service.generateUnsubscribeToken(
        testUserId,
        testEmail,
        UnsubscribeScope.ALL,
        undefined,
        30 // 30 days
      );

      const tokenData = service.validateToken(token);
      expect(tokenData?.expiresAt).toBeInstanceOf(Date);
      
      const daysUntilExpiry = Math.floor(
        (tokenData!.expiresAt.getTime() - tokenData!.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(daysUntilExpiry).toBe(30);
    });
  });

  describe('Validate Token', () => {
    it('should validate valid token', () => {
      const token = service.generateUnsubscribeToken(testUserId, testEmail);
      const tokenData = service.validateToken(token);

      expect(tokenData).not.toBeNull();
      expect(tokenData?.userId).toBe(testUserId);
      expect(tokenData?.email).toBe(testEmail);
    });

    it('should reject invalid token', () => {
      const tokenData = service.validateToken('invalid-token');
      expect(tokenData).toBeNull();
    });

    it('should reject used token', async () => {
      const token = service.generateUnsubscribeToken(testUserId, testEmail);
      
      // Use the token
      await service.unsubscribeViaToken(token);
      
      // Try to validate again
      const tokenData = service.validateToken(token);
      expect(tokenData).toBeNull();
    });

    it('should reject expired token', () => {
      const token = service.generateUnsubscribeToken(
        testUserId,
        testEmail,
        UnsubscribeScope.ALL,
        undefined,
        -1 // Expired yesterday
      );

      const tokenData = service.validateToken(token);
      expect(tokenData).toBeNull();
    });
  });

  describe('Unsubscribe', () => {
    it('should process unsubscribe request', async () => {
      const request: UnsubscribeRequest = {
        userId: testUserId,
        scope: UnsubscribeScope.ALL,
        reason: 'Too many emails',
        timestamp: new Date(),
        sourceEmail: testEmail,
      };

      const record = await service.unsubscribe(request);

      expect(record.id).toBeDefined();
      expect(record.userId).toBe(testUserId);
      expect(record.scope).toBe(UnsubscribeScope.ALL);
      expect(record.reason).toBe('Too many emails');
      expect(record.isActive).toBe(true);
    });

    it('should unsubscribe via token', async () => {
      const token = service.generateUnsubscribeToken(testUserId, testEmail);
      const record = await service.unsubscribeViaToken(token, 'Not interested');

      expect(record).not.toBeNull();
      expect(record?.userId).toBe(testUserId);
      expect(record?.reason).toBe('Not interested');
    });

    it('should return null for invalid token', async () => {
      const record = await service.unsubscribeViaToken('invalid-token');
      expect(record).toBeNull();
    });

    it('should mark token as used after unsubscribe', async () => {
      const token = service.generateUnsubscribeToken(testUserId, testEmail);
      await service.unsubscribeViaToken(token);

      const tokenData = service.validateToken(token);
      expect(tokenData).toBeNull();
    });
  });

  describe('Resubscribe', () => {
    beforeEach(async () => {
      // Create an unsubscribe record first
      await service.unsubscribe({
        userId: testUserId,
        scope: UnsubscribeScope.ALL,
        timestamp: new Date(),
        sourceEmail: testEmail,
      });
    });

    it('should resubscribe user', async () => {
      const request: ResubscribeRequest = {
        userId: testUserId,
        scope: UnsubscribeScope.ALL,
        timestamp: new Date(),
      };

      const result = await service.resubscribe(request);
      expect(result).toBe(true);

      // Check if unsubscribe is no longer active
      const records = service.getUnsubscribeRecords(testUserId, true);
      expect(records).toHaveLength(0);
    });

    it('should return false for non-existent unsubscribe', async () => {
      const request: ResubscribeRequest = {
        userId: 'non-existent-user',
        scope: UnsubscribeScope.ALL,
        timestamp: new Date(),
      };

      const result = await service.resubscribe(request);
      expect(result).toBe(false);
    });

    it('should track resubscribe timestamp', async () => {
      const request: ResubscribeRequest = {
        userId: testUserId,
        scope: UnsubscribeScope.ALL,
        timestamp: new Date(),
      };

      await service.resubscribe(request);

      const records = service.getUnsubscribeRecords(testUserId, false); // Include inactive
      expect(records[0].resubscribedAt).toBeInstanceOf(Date);
      expect(records[0].isActive).toBe(false);
    });
  });

  describe('Check Unsubscribe Status', () => {
    it('should detect global unsubscribe', async () => {
      await service.unsubscribe({
        userId: testUserId,
        scope: UnsubscribeScope.ALL,
        timestamp: new Date(),
        sourceEmail: testEmail,
      });

      const isUnsubscribed = service.isUnsubscribed(testUserId);
      expect(isUnsubscribed).toBe(true);
    });

    it('should detect channel-specific unsubscribe', async () => {
      await service.unsubscribe({
        userId: testUserId,
        scope: UnsubscribeScope.CHANNEL,
        target: NotificationChannel.EMAIL,
        timestamp: new Date(),
        sourceEmail: testEmail,
      });

      const isUnsubscribedEmail = service.isUnsubscribed(testUserId, NotificationChannel.EMAIL);
      const isUnsubscribedInApp = service.isUnsubscribed(testUserId, NotificationChannel.IN_APP);
      
      expect(isUnsubscribedEmail).toBe(true);
      expect(isUnsubscribedInApp).toBe(false);
    });

    it('should detect template-specific unsubscribe', async () => {
      await service.unsubscribe({
        userId: testUserId,
        scope: UnsubscribeScope.TEMPLATE,
        target: NotificationTemplate.PRODUCT_SUBMITTED,
        timestamp: new Date(),
        sourceEmail: testEmail,
      });

      const isUnsubscribedSubmitted = service.isUnsubscribed(
        testUserId,
        undefined,
        NotificationTemplate.PRODUCT_SUBMITTED
      );
      const isUnsubscribedApproved = service.isUnsubscribed(
        testUserId,
        undefined,
        NotificationTemplate.PRODUCT_APPROVED
      );
      
      expect(isUnsubscribedSubmitted).toBe(true);
      expect(isUnsubscribedApproved).toBe(false);
    });

    it('should detect category-specific unsubscribe', async () => {
      await service.unsubscribe({
        userId: testUserId,
        scope: UnsubscribeScope.CATEGORY,
        target: NotificationCategory.WORKFLOW,
        timestamp: new Date(),
        sourceEmail: testEmail,
      });

      const isUnsubscribedWorkflow = service.isUnsubscribed(
        testUserId,
        undefined,
        NotificationTemplate.PRODUCT_SUBMITTED // Workflow category
      );
      const isUnsubscribedDeadline = service.isUnsubscribed(
        testUserId,
        undefined,
        NotificationTemplate.DEADLINE_APPROACHING // Deadline category
      );
      
      expect(isUnsubscribedWorkflow).toBe(true);
      expect(isUnsubscribedDeadline).toBe(false);
    });

    it('should return false for non-unsubscribed user', () => {
      const isUnsubscribed = service.isUnsubscribed('non-existent-user');
      expect(isUnsubscribed).toBe(false);
    });
  });

  describe('Get Unsubscribe Records', () => {
    beforeEach(async () => {
      await service.unsubscribe({
        userId: testUserId,
        scope: UnsubscribeScope.ALL,
        timestamp: new Date(),
        sourceEmail: testEmail,
      });

      await service.unsubscribe({
        userId: testUserId,
        scope: UnsubscribeScope.CHANNEL,
        target: NotificationChannel.EMAIL,
        timestamp: new Date(),
        sourceEmail: testEmail,
      });

      // Resubscribe from the channel
      await service.resubscribe({
        userId: testUserId,
        scope: UnsubscribeScope.CHANNEL,
        target: NotificationChannel.EMAIL,
        timestamp: new Date(),
      });
    });

    it('should get active unsubscribe records', () => {
      const records = service.getUnsubscribeRecords(testUserId, true);
      expect(records).toHaveLength(1); // Only the ALL scope is active
    });

    it('should get all unsubscribe records including inactive', () => {
      const records = service.getUnsubscribeRecords(testUserId, false);
      expect(records).toHaveLength(2); // Both records
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await service.unsubscribe({
        userId: 'user-1',
        scope: UnsubscribeScope.ALL,
        reason: 'Too many emails',
        timestamp: new Date(),
        sourceEmail: 'user1@example.com',
      });

      await service.unsubscribe({
        userId: 'user-2',
        scope: UnsubscribeScope.CHANNEL,
        target: NotificationChannel.EMAIL,
        reason: 'Too many emails',
        timestamp: new Date(),
        sourceEmail: 'user2@example.com',
      });

      await service.unsubscribe({
        userId: 'user-3',
        scope: UnsubscribeScope.TEMPLATE,
        target: NotificationTemplate.PRODUCT_SUBMITTED,
        reason: 'Not relevant',
        timestamp: new Date(),
        sourceEmail: 'user3@example.com',
      });
    });

    it('should track unsubscribe statistics', () => {
      const stats = service.getStatistics();
      
      expect(stats.totalUnsubscribes).toBe(3);
      expect(stats.activeUnsubscribes).toBe(3);
    });

    it('should track unsubscribes by scope', () => {
      const stats = service.getStatistics();
      
      expect(stats.unsubscribesByScope[UnsubscribeScope.ALL]).toBe(1);
      expect(stats.unsubscribesByScope[UnsubscribeScope.CHANNEL]).toBe(1);
      expect(stats.unsubscribesByScope[UnsubscribeScope.TEMPLATE]).toBe(1);
    });

    it('should track common unsubscribe reasons', () => {
      const stats = service.getStatistics();
      
      expect(stats.commonReasons.length).toBeGreaterThan(0);
      expect(stats.commonReasons[0].reason).toBe('Too many emails');
      expect(stats.commonReasons[0].count).toBe(2);
    });

    it('should clear statistics', () => {
      service.clearStatistics();
      const stats = service.getStatistics();
      
      expect(stats.totalUnsubscribes).toBe(0);
      expect(stats.activeUnsubscribes).toBe(0);
    });
  });

  describe('Unsubscribe Links', () => {
    it('should generate unsubscribe link', () => {
      const link = service.generateUnsubscribeLink(
        testUserId,
        testEmail,
        'https://pimify.com'
      );

      expect(link).toContain('https://pimify.com/unsubscribe');
      expect(link).toContain('token=');
    });

    it('should generate List-Unsubscribe header', () => {
      const header = service.generateListUnsubscribeHeader(
        testUserId,
        testEmail,
        'https://pimify.com'
      );

      expect(header).toContain('https://pimify.com/unsubscribe');
      expect(header).toContain('mailto:unsubscribe@pimify.com');
    });

    it('should generate List-Unsubscribe-Post header', () => {
      const header = service.generateListUnsubscribePostHeader();
      expect(header).toBe('List-Unsubscribe=One-Click');
    });
  });

  describe('Export Unsubscribe List', () => {
    beforeEach(async () => {
      await service.unsubscribe({
        userId: 'user-1',
        scope: UnsubscribeScope.ALL,
        reason: 'Too many emails',
        timestamp: new Date(),
        sourceEmail: 'user1@example.com',
      });

      await service.unsubscribe({
        userId: 'user-2',
        scope: UnsubscribeScope.CHANNEL,
        target: NotificationChannel.EMAIL,
        timestamp: new Date(),
        sourceEmail: 'user2@example.com',
      });
    });

    it('should export as JSON', () => {
      const exported = service.exportUnsubscribeList('json');
      
      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
    });

    it('should export as CSV', () => {
      const exported = service.exportUnsubscribeList('csv');
      
      expect(exported).toContain('Email,Scope,Target,Reason,Unsubscribed At');
      expect(exported).toContain('user1@example.com');
      expect(exported).toContain('user2@example.com');
    });
  });

  describe('Token Cleanup', () => {
    it('should clean up expired tokens', () => {
      // Generate expired token
      service.generateUnsubscribeToken(
        testUserId,
        testEmail,
        UnsubscribeScope.ALL,
        undefined,
        -1 // Expired yesterday
      );

      // Generate valid token
      service.generateUnsubscribeToken(
        'user-2',
        'user2@example.com',
        UnsubscribeScope.ALL
      );

      const cleanedCount = service.cleanupExpiredTokens();
      expect(cleanedCount).toBe(1);
    });

    it('should clean up used tokens', async () => {
      const token = service.generateUnsubscribeToken(testUserId, testEmail);
      await service.unsubscribeViaToken(token);

      const cleanedCount = service.cleanupExpiredTokens();
      expect(cleanedCount).toBe(1);
    });

    it('should count tokens by filter', () => {
      service.generateUnsubscribeToken(testUserId, testEmail);
      service.generateUnsubscribeToken('user-2', 'user2@example.com');

      const unusedCount = service.getTokenCount({ used: false });
      expect(unusedCount).toBe(2);

      const expiredCount = service.getTokenCount({ expired: true });
      expect(expiredCount).toBe(0);
    });
  });

  describe('Get All Records', () => {
    beforeEach(async () => {
      await service.unsubscribe({
        userId: 'user-1',
        scope: UnsubscribeScope.ALL,
        timestamp: new Date(),
        sourceEmail: 'user1@example.com',
      });

      await service.unsubscribe({
        userId: 'user-2',
        scope: UnsubscribeScope.CHANNEL,
        target: NotificationChannel.EMAIL,
        timestamp: new Date(),
        sourceEmail: 'user2@example.com',
      });

      await service.unsubscribe({
        userId: 'user-3',
        scope: UnsubscribeScope.TEMPLATE,
        target: NotificationTemplate.PRODUCT_SUBMITTED,
        timestamp: new Date(),
        sourceEmail: 'user3@example.com',
      });
    });

    it('should get all unsubscribe records', () => {
      const records = service.getAllUnsubscribeRecords();
      expect(records).toHaveLength(3);
    });

    it('should filter by scope', () => {
      const records = service.getAllUnsubscribeRecords({
        scope: UnsubscribeScope.ALL,
      });
      expect(records).toHaveLength(1);
      expect(records[0].scope).toBe(UnsubscribeScope.ALL);
    });

    it('should filter by active only', async () => {
      // Resubscribe one user
      await service.resubscribe({
        userId: 'user-1',
        scope: UnsubscribeScope.ALL,
        timestamp: new Date(),
      });

      const activeRecords = service.getAllUnsubscribeRecords({ activeOnly: true });
      expect(activeRecords).toHaveLength(2);
    });

    it('should apply limit', () => {
      const records = service.getAllUnsubscribeRecords({ limit: 2 });
      expect(records).toHaveLength(2);
    });
  });

  describe('Default Instance', () => {
    it('should provide default service instance', () => {
      expect(notificationUnsubscribeService).toBeInstanceOf(NotificationUnsubscribeService);
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple unsubscribes for same user', async () => {
      await service.unsubscribe({
        userId: testUserId,
        scope: UnsubscribeScope.CHANNEL,
        target: NotificationChannel.EMAIL,
        timestamp: new Date(),
        sourceEmail: testEmail,
      });

      await service.unsubscribe({
        userId: testUserId,
        scope: UnsubscribeScope.CHANNEL,
        target: NotificationChannel.IN_APP,
        timestamp: new Date(),
        sourceEmail: testEmail,
      });

      const records = service.getUnsubscribeRecords(testUserId);
      expect(records).toHaveLength(2);
    });

    it('should handle unsubscribe without reason', async () => {
      const record = await service.unsubscribe({
        userId: testUserId,
        scope: UnsubscribeScope.ALL,
        timestamp: new Date(),
        sourceEmail: testEmail,
      });

      expect(record.reason).toBeUndefined();
    });

    it('should handle category-based unsubscribe for all workflow events', async () => {
      await service.unsubscribe({
        userId: testUserId,
        scope: UnsubscribeScope.CATEGORY,
        target: NotificationCategory.WORKFLOW,
        timestamp: new Date(),
        sourceEmail: testEmail,
      });

      // Should be unsubscribed from all workflow events
      expect(service.isUnsubscribed(testUserId, undefined, NotificationTemplate.PRODUCT_SUBMITTED)).toBe(true);
      expect(service.isUnsubscribed(testUserId, undefined, NotificationTemplate.PRODUCT_APPROVED)).toBe(true);
      expect(service.isUnsubscribed(testUserId, undefined, NotificationTemplate.PRODUCT_REJECTED)).toBe(true);
      
      // Should not be unsubscribed from deadline events
      expect(service.isUnsubscribed(testUserId, undefined, NotificationTemplate.DEADLINE_APPROACHING)).toBe(false);
    });
  });
});
