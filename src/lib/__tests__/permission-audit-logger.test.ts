import { PermissionAuditLogger, AuditLogType, SecurityRiskLevel } from '../permission-audit-logger';
import { UserRole } from '../../types/workflow';
import { PermissionCheckContext } from '../role-permissions';

describe('PermissionAuditLogger', () => {
  let logger: PermissionAuditLogger;
  let mockContext: PermissionCheckContext;

  beforeEach(() => {
    logger = new PermissionAuditLogger({
      maxLogSize: 1000,
      retentionDays: 30,
      enableRealTimeAlerts: false, // Disable for testing
    });

    mockContext = {
      userId: 'user-1',
      userRole: UserRole.ADMIN,
      userEmail: 'admin@example.com',
      resourceId: 'product-1',
      metadata: {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-1',
        requestId: 'request-1',
        location: {
          country: 'US',
          region: 'CA',
          city: 'San Francisco',
        },
        device: {
          type: 'desktop',
          os: 'Windows',
          browser: 'Chrome',
        },
      },
    };
  });

  afterEach(() => {
    logger.clearAuditLogs();
  });

  describe('Permission Check Logging', () => {
    it('should log successful permission checks', () => {
      logger.logPermissionCheck(
        mockContext,
        'products:create',
        'products',
        true,
        'User has create permission'
      );

      const logs = logger.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe(AuditLogType.PERMISSION_GRANTED);
      expect(logs[0].action).toBe('products:create');
      expect(logs[0].success).toBe(true);
      expect(logs[0].userId).toBe('user-1');
      expect(logs[0].userRole).toBe(UserRole.ADMIN);
    });

    it('should log failed permission checks', () => {
      logger.logPermissionCheck(
        mockContext,
        'products:delete',
        'products',
        false,
        'User lacks delete permission'
      );

      const logs = logger.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe(AuditLogType.PERMISSION_DENIED);
      expect(logs[0].action).toBe('products:delete');
      expect(logs[0].success).toBe(false);
      expect(logs[0].riskLevel).toBe(SecurityRiskLevel.HIGH);
    });

    it('should include metadata in permission check logs', () => {
      const metadata = { customField: 'customValue' };
      
      logger.logPermissionCheck(
        mockContext,
        'products:view',
        'products',
        true,
        'Access granted',
        metadata
      );

      const logs = logger.getAuditLogs();
      expect(logs[0].metadata).toMatchObject({
        ...mockContext.metadata,
        ...metadata,
      });
    });
  });

  describe('Dynamic Permission Logging', () => {
    it('should log dynamic permission assignments', () => {
      logger.logDynamicPermissionAssigned(
        'user-2',
        UserRole.EDITOR,
        'editor@example.com',
        'products:delete',
        'admin-1',
        'Temporary delete access for cleanup task'
      );

      const logs = logger.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe(AuditLogType.DYNAMIC_PERMISSION_ASSIGNED);
      expect(logs[0].userId).toBe('user-2');
      expect(logs[0].userRole).toBe(UserRole.EDITOR);
      expect(logs[0].action).toBe('assign_dynamic_permission');
      expect(logs[0].resourceId).toBe('products:delete');
      expect(logs[0].metadata?.grantedBy).toBe('admin-1');
      expect(logs[0].metadata?.permission).toBe('products:delete');
    });

    it('should log dynamic permission revocations', () => {
      logger.logDynamicPermissionRevoked(
        'user-2',
        UserRole.EDITOR,
        'editor@example.com',
        'products:delete',
        'admin-1',
        'Cleanup task completed'
      );

      const logs = logger.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe(AuditLogType.DYNAMIC_PERMISSION_REVOKED);
      expect(logs[0].userId).toBe('user-2');
      expect(logs[0].action).toBe('revoke_dynamic_permission');
      expect(logs[0].resourceId).toBe('products:delete');
      expect(logs[0].metadata?.revokedBy).toBe('admin-1');
    });
  });

  describe('Security Violation Logging', () => {
    it('should log security violations', () => {
      logger.logSecurityViolation(
        mockContext,
        'products:delete',
        'products',
        'Unauthorized access attempt',
        { additionalInfo: 'Multiple failed attempts' }
      );

      const logs = logger.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe(AuditLogType.SECURITY_VIOLATION);
      expect(logs[0].action).toBe('products:delete');
      expect(logs[0].success).toBe(false);
      expect(logs[0].riskLevel).toBe(SecurityRiskLevel.CRITICAL);
      expect(logs[0].reason).toContain('Security violation: Unauthorized access attempt');
      expect(logs[0].metadata?.violation).toBe('Unauthorized access attempt');
    });

    it('should log suspicious activity', () => {
      logger.logSuspiciousActivity(
        mockContext,
        'Rapid API calls',
        'User made 100+ requests in 1 minute',
        { requestCount: 150, timeWindow: '1 minute' }
      );

      const logs = logger.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe(AuditLogType.SUSPICIOUS_ACTIVITY);
      expect(logs[0].action).toBe('suspicious_activity');
      expect(logs[0].riskLevel).toBe(SecurityRiskLevel.HIGH);
      expect(logs[0].metadata?.activity).toBe('Rapid API calls');
    });
  });

  describe('System and Data Access Logging', () => {
    it('should log system access', () => {
      logger.logSystemAccess(
        mockContext,
        'admin_panel',
        'view_dashboard',
        true,
        { dashboardType: 'analytics' }
      );

      const logs = logger.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe(AuditLogType.SYSTEM_ACCESS);
      expect(logs[0].action).toBe('view_dashboard');
      expect(logs[0].resource).toBe('admin_panel');
      expect(logs[0].success).toBe(true);
    });

    it('should log data access', () => {
      logger.logDataAccess(
        mockContext,
        'products',
        'export',
        1000,
        true,
        { exportFormat: 'csv', filters: ['active'] }
      );

      const logs = logger.getAuditLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe(AuditLogType.DATA_ACCESS);
      expect(logs[0].action).toBe('export');
      expect(logs[0].resource).toBe('products');
      expect(logs[0].metadata?.recordCount).toBe(1000);
    });
  });

  describe('Risk Level Calculation', () => {
    it('should assign high risk to failed operations', () => {
      logger.logPermissionCheck(
        mockContext,
        'products:view',
        'products',
        false,
        'Access denied'
      );

      const logs = logger.getAuditLogs();
      expect(logs[0].riskLevel).toBe(SecurityRiskLevel.HIGH);
    });

    it('should assign high risk to dangerous actions', () => {
      logger.logPermissionCheck(
        mockContext,
        'products:delete',
        'products',
        true,
        'Delete permission granted'
      );

      const logs = logger.getAuditLogs();
      expect(logs[0].riskLevel).toBe(SecurityRiskLevel.HIGH);
    });

    it('should assign medium risk to moderate actions', () => {
      logger.logPermissionCheck(
        mockContext,
        'products:create',
        'products',
        true,
        'Create permission granted'
      );

      const logs = logger.getAuditLogs();
      expect(logs[0].riskLevel).toBe(SecurityRiskLevel.MEDIUM);
    });

    it('should assign low risk to safe actions', () => {
      logger.logPermissionCheck(
        mockContext,
        'products:view',
        'products',
        true,
        'View permission granted'
      );

      const logs = logger.getAuditLogs();
      expect(logs[0].riskLevel).toBe(SecurityRiskLevel.LOW);
    });
  });

  describe('Audit Log Filtering', () => {
    beforeEach(() => {
      // Create test data
      logger.logPermissionCheck(
        { ...mockContext, userId: 'user-1', userRole: UserRole.ADMIN },
        'products:create',
        'products',
        true
      );
      
      logger.logPermissionCheck(
        { ...mockContext, userId: 'user-2', userRole: UserRole.EDITOR },
        'products:view',
        'products',
        true
      );
      
      logger.logPermissionCheck(
        { ...mockContext, userId: 'user-1', userRole: UserRole.ADMIN },
        'products:delete',
        'products',
        false
      );
    });

    it('should filter by user ID', () => {
      const logs = logger.getAuditLogs({ userId: 'user-1' });
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.userId === 'user-1')).toBe(true);
    });

    it('should filter by user role', () => {
      const logs = logger.getAuditLogs({ userRole: UserRole.ADMIN });
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.userRole === UserRole.ADMIN)).toBe(true);
    });

    it('should filter by audit log type', () => {
      const logs = logger.getAuditLogs({ type: AuditLogType.PERMISSION_GRANTED });
      expect(logs).toHaveLength(2);
      expect(logs.every(log => log.type === AuditLogType.PERMISSION_GRANTED)).toBe(true);
    });

    it('should filter by action', () => {
      const logs = logger.getAuditLogs({ action: 'products:create' });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('products:create');
    });

    it('should filter by success status', () => {
      const logs = logger.getAuditLogs({ success: false });
      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(false);
    });

    it('should filter by risk level', () => {
      const logs = logger.getAuditLogs({ riskLevel: SecurityRiskLevel.HIGH });
      expect(logs).toHaveLength(1);
      expect(logs[0].riskLevel).toBe(SecurityRiskLevel.HIGH);
    });

    it('should filter by date range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const logs = logger.getAuditLogs({ 
        startDate: oneHourAgo,
        endDate: now 
      });
      expect(logs).toHaveLength(3);
    });

    it('should combine multiple filters', () => {
      const logs = logger.getAuditLogs({
        userId: 'user-1',
        success: true,
        riskLevel: SecurityRiskLevel.MEDIUM,
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].userId).toBe('user-1');
      expect(logs[0].success).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Create diverse test data
      logger.logPermissionCheck(mockContext, 'products:view', 'products', true);
      logger.logPermissionCheck(mockContext, 'products:create', 'products', true);
      logger.logPermissionCheck(mockContext, 'products:delete', 'products', false);
      logger.logSecurityViolation(mockContext, 'products:admin', 'products', 'Unauthorized access');
      logger.logSuspiciousActivity(mockContext, 'Rapid requests', 'Too many API calls');
    });

    it('should calculate correct statistics', () => {
      const stats = logger.getStatistics();
      
      expect(stats.totalEntries).toBe(5);
      expect(stats.byType[AuditLogType.PERMISSION_GRANTED]).toBe(2);
      expect(stats.byType[AuditLogType.PERMISSION_DENIED]).toBe(1);
      expect(stats.byType[AuditLogType.SECURITY_VIOLATION]).toBe(1);
      expect(stats.byType[AuditLogType.SUSPICIOUS_ACTIVITY]).toBe(1);
      expect(stats.securityViolations).toBe(1);
      expect(stats.suspiciousActivity).toBe(1);
      expect(stats.successRate).toBe(0.4); // 2 out of 5 successful
    });

    it('should track entries by user', () => {
      const stats = logger.getStatistics();
      expect(stats.byUser['user-1']).toBe(5);
    });

    it('should track entries by IP address', () => {
      const stats = logger.getStatistics();
      expect(stats.byIpAddress['192.168.1.1']).toBe(5);
    });

    it('should identify top actions', () => {
      const stats = logger.getStatistics();
      expect(stats.topActions).toHaveLength(5);
      expect(stats.topActions[0].count).toBe(1); // All actions have count 1
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      logger.logPermissionCheck(mockContext, 'products:view', 'products', true);
      logger.logSecurityViolation(mockContext, 'products:delete', 'products', 'Unauthorized');
    });

    it('should export to JSON format', () => {
      const json = logger.exportAuditLogs({
        format: 'json',
        includeMetadata: true,
        includeDeviceInfo: true,
        includeLocationInfo: true,
      });

      const data = JSON.parse(json);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('type');
      expect(data[0]).toHaveProperty('metadata');
      expect(data[0]).toHaveProperty('device');
      expect(data[0]).toHaveProperty('location');
    });

    it('should export to CSV format', () => {
      const csv = logger.exportAuditLogs({
        format: 'csv',
        includeMetadata: true,
      });

      const lines = csv.split('\n');
      expect(lines).toHaveLength(3); // Header + 2 data rows
      expect(lines[0]).toContain('ID,Type,Timestamp');
      expect(lines[0]).toContain('Metadata');
    });

    it('should export to XML format', () => {
      const xml = logger.exportAuditLogs({
        format: 'xml',
        includeDeviceInfo: true,
      });

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<auditLogs>');
      expect(xml).toContain('<entry>');
      expect(xml).toContain('<device>');
    });

    it('should apply filters during export', () => {
      const json = logger.exportAuditLogs({
        format: 'json',
        filters: { type: AuditLogType.SECURITY_VIOLATION },
      });

      const data = JSON.parse(json);
      expect(data).toHaveLength(1);
      expect(data[0].type).toBe(AuditLogType.SECURITY_VIOLATION);
    });
  });

  describe('User-Specific Queries', () => {
    beforeEach(() => {
      logger.logPermissionCheck(
        { ...mockContext, userId: 'user-1' },
        'products:view',
        'products',
        true
      );
      logger.logPermissionCheck(
        { ...mockContext, userId: 'user-2' },
        'products:create',
        'products',
        true
      );
      logger.logSecurityViolation(
        { ...mockContext, userId: 'user-1' },
        'products:delete',
        'products',
        'Unauthorized access'
      );
    });

    it('should get audit logs for specific user', () => {
      const userLogs = logger.getUserAuditLogs('user-1');
      expect(userLogs).toHaveLength(2);
      expect(userLogs.every(log => log.userId === 'user-1')).toBe(true);
    });

    it('should limit user audit logs', () => {
      const userLogs = logger.getUserAuditLogs('user-1', 1);
      expect(userLogs).toHaveLength(1);
    });

    it('should get security violations', () => {
      const violations = logger.getSecurityViolations();
      expect(violations).toHaveLength(1);
      expect(violations[0].type).toBe(AuditLogType.SECURITY_VIOLATION);
    });

    it('should get suspicious activity', () => {
      logger.logSuspiciousActivity(mockContext, 'Test activity', 'Test reason');
      const suspicious = logger.getSuspiciousActivity();
      expect(suspicious).toHaveLength(1);
      expect(suspicious[0].type).toBe(AuditLogType.SUSPICIOUS_ACTIVITY);
    });
  });

  describe('Log Management', () => {
    it('should clear all audit logs', () => {
      logger.logPermissionCheck(mockContext, 'products:view', 'products', true);
      expect(logger.getAuditLogs()).toHaveLength(1);
      
      logger.clearAuditLogs();
      expect(logger.getAuditLogs()).toHaveLength(0);
    });

    it('should respect maximum log size', () => {
      const smallLogger = new PermissionAuditLogger({ maxLogSize: 2 });
      
      smallLogger.logPermissionCheck(mockContext, 'action1', 'resource', true);
      smallLogger.logPermissionCheck(mockContext, 'action2', 'resource', true);
      smallLogger.logPermissionCheck(mockContext, 'action3', 'resource', true);
      
      const logs = smallLogger.getAuditLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe('action2'); // Oldest entry removed
      expect(logs[1].action).toBe('action3');
    });
  });

  describe('Unusual Access Detection', () => {
    it('should detect unusual time access', () => {
      // Mock current time to be outside business hours (3 AM)
      const originalDate = global.Date;
      const mockDate = new Date('2024-01-01T03:00:00Z');
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = jest.fn(() => mockDate.getTime());

      logger.logPermissionCheck(mockContext, 'products:view', 'products', true);
      
      const logs = logger.getAuditLogs();
      expect(logs[0].riskLevel).toBe(SecurityRiskLevel.MEDIUM);

      global.Date = originalDate;
    });

    it('should detect rapid successive access', () => {
      // Create many rapid entries
      for (let i = 0; i < 25; i++) {
        logger.logPermissionCheck(mockContext, `action${i}`, 'resource', true);
      }

      const logs = logger.getAuditLogs();
      // The last few entries should have medium risk due to rapid access
      const recentLogs = logs.slice(-5);
      expect(recentLogs.some(log => log.riskLevel === SecurityRiskLevel.MEDIUM)).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customLogger = new PermissionAuditLogger({
        maxLogSize: 500,
        retentionDays: 60,
        enableRealTimeAlerts: true,
        alertThresholds: {
          [SecurityRiskLevel.LOW]: 500,
          [SecurityRiskLevel.MEDIUM]: 50,
          [SecurityRiskLevel.HIGH]: 5,
          [SecurityRiskLevel.CRITICAL]: 1,
        },
      });

      expect(customLogger).toBeInstanceOf(PermissionAuditLogger);
    });
  });
});
