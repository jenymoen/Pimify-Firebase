import { RolePermissions } from '../role-permissions';
import { permissionAuditLogger, AuditLogType, SecurityRiskLevel } from '../permission-audit-logger';
import { UserRole, WorkflowAction } from '../../types/workflow';
import { PermissionCheckContext } from '../role-permissions';

describe('Permission Audit Integration', () => {
  let rolePermissions: RolePermissions;

  beforeEach(() => {
    rolePermissions = new RolePermissions();
    // Clear audit logs before each test
    permissionAuditLogger.clearAuditLogs();
  });

  afterEach(() => {
    rolePermissions.clearAllCaches();
    rolePermissions.clearAllDynamicPermissions();
  });

  describe('Permission Check Audit Logging', () => {
    it('should log successful permission checks', async () => {
      const context: PermissionCheckContext = {
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        userEmail: 'admin@example.com',
        metadata: {
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: 'session-1',
        },
      };

      const result = await rolePermissions.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );

      expect(result.hasPermission).toBe(true);

      const auditLogs = permissionAuditLogger.getAuditLogs();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].type).toBe(AuditLogType.PERMISSION_GRANTED);
      expect(auditLogs[0].userId).toBe('admin-1');
      expect(auditLogs[0].action).toBe('create');
      expect(auditLogs[0].success).toBe(true);
      expect(auditLogs[0].metadata?.ipAddress).toBe('192.168.1.1');
    });

    it('should log failed permission checks', async () => {
      const context: PermissionCheckContext = {
        userId: 'viewer-1',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
        metadata: {
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
        },
      };

      const result = await rolePermissions.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );

      expect(result.hasPermission).toBe(false);

      const auditLogs = permissionAuditLogger.getAuditLogs();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].type).toBe(AuditLogType.PERMISSION_DENIED);
      expect(auditLogs[0].userId).toBe('viewer-1');
      expect(auditLogs[0].action).toBe('create');
      expect(auditLogs[0].success).toBe(false);
    });

    it('should log security violations for high-risk actions', async () => {
      const context: PermissionCheckContext = {
        userId: 'viewer-1',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
        metadata: {
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0',
        },
      };

      const result = await rolePermissions.hasPermission(
        context,
        'products:delete',
        'products'
      );

      expect(result.hasPermission).toBe(false);

      const auditLogs = permissionAuditLogger.getAuditLogs();
      expect(auditLogs).toHaveLength(2); // Permission denied + security violation
      
      const securityViolation = auditLogs.find(log => log.type === AuditLogType.SECURITY_VIOLATION);
      expect(securityViolation).toBeDefined();
      expect(securityViolation?.action).toBe('products:delete');
      expect(securityViolation?.riskLevel).toBe(SecurityRiskLevel.CRITICAL);
      expect(securityViolation?.reason).toContain('Security violation');
    });

    it('should log cached permission checks', async () => {
      const context: PermissionCheckContext = {
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        userEmail: 'admin@example.com',
      };

      // First call - not cached
      await rolePermissions.hasPermission(context, WorkflowAction.CREATE, 'products');
      
      // Second call - cached
      await rolePermissions.hasPermission(context, WorkflowAction.CREATE, 'products');

      const auditLogs = permissionAuditLogger.getAuditLogs();
      expect(auditLogs).toHaveLength(2);
      
      const cachedLog = auditLogs.find(log => log.metadata?.cached === true);
      expect(cachedLog).toBeDefined();
      expect(cachedLog?.metadata?.cached).toBe(true);
    });
  });

  describe('Dynamic Permission Audit Logging', () => {
    it('should log dynamic permission assignments', () => {
      const result = rolePermissions.assignDynamicPermission(
        'editor-1',
        'products:delete',
        'admin-1',
        'Temporary delete access for cleanup',
        {
          userRole: UserRole.EDITOR,
          userEmail: 'editor@example.com',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          metadata: {
            ipAddress: '192.168.1.3',
            reason: 'Cleanup task',
          },
        }
      );

      expect(result.success).toBe(true);

      const auditLogs = permissionAuditLogger.getAuditLogs();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].type).toBe(AuditLogType.DYNAMIC_PERMISSION_ASSIGNED);
      expect(auditLogs[0].userId).toBe('editor-1');
      expect(auditLogs[0].action).toBe('assign_dynamic_permission');
      expect(auditLogs[0].resourceId).toBe('products:delete');
      expect(auditLogs[0].metadata?.grantedBy).toBe('admin-1');
      expect(auditLogs[0].metadata?.permission).toBe('products:delete');
    });

    it('should log dynamic permission revocations', () => {
      // First assign a permission
      const assignResult = rolePermissions.assignDynamicPermission(
        'editor-1',
        'products:delete',
        'admin-1',
        'Temporary delete access',
        {
          userRole: UserRole.EDITOR,
          userEmail: 'editor@example.com',
        }
      );

      expect(assignResult.success).toBe(true);

      // Then revoke it
      const revokeResult = rolePermissions.revokeDynamicPermission(
        assignResult.assignment!.id,
        'admin-1',
        'Cleanup task completed',
        {
          userEmail: 'editor@example.com',
        }
      );

      expect(revokeResult.success).toBe(true);

      const auditLogs = permissionAuditLogger.getAuditLogs();
      expect(auditLogs).toHaveLength(2);
      
      const revocationLog = auditLogs.find(log => log.type === AuditLogType.DYNAMIC_PERMISSION_REVOKED);
      expect(revocationLog).toBeDefined();
      expect(revocationLog?.userId).toBe('editor-1');
      expect(revocationLog?.action).toBe('revoke_dynamic_permission');
      expect(revocationLog?.resourceId).toBe('products:delete');
      expect(revocationLog?.metadata?.revokedBy).toBe('admin-1');
    });
  });

  describe('Audit Log Filtering and Statistics', () => {
    beforeEach(async () => {
      // Create diverse audit data
      const adminContext: PermissionCheckContext = {
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        userEmail: 'admin@example.com',
        metadata: { ipAddress: '192.168.1.1' },
      };

      const viewerContext: PermissionCheckContext = {
        userId: 'viewer-1',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
        metadata: { ipAddress: '192.168.1.2' },
      };

      // Admin actions
      await rolePermissions.hasPermission(adminContext, WorkflowAction.CREATE, 'products');
      await rolePermissions.hasPermission(adminContext, WorkflowAction.APPROVE, 'products');
      
      // Viewer actions (some will fail)
      await rolePermissions.hasPermission(viewerContext, WorkflowAction.CREATE, 'products');
      await rolePermissions.hasPermission(viewerContext, 'products:delete', 'products');
      
      // Dynamic permission
      rolePermissions.assignDynamicPermission(
        'editor-1',
        'products:edit',
        'admin-1',
        'Temporary edit access',
        { userRole: UserRole.EDITOR, userEmail: 'editor@example.com' }
      );
    });

    it('should filter audit logs by user', () => {
      const adminLogs = permissionAuditLogger.getAuditLogs({ userId: 'admin-1' });
      expect(adminLogs.length).toBeGreaterThan(0);
      expect(adminLogs.every(log => log.userId === 'admin-1')).toBe(true);
    });

    it('should filter audit logs by type', () => {
      const permissionLogs = permissionAuditLogger.getAuditLogs({ 
        type: AuditLogType.PERMISSION_GRANTED 
      });
      expect(permissionLogs.length).toBeGreaterThan(0);
      expect(permissionLogs.every(log => log.type === AuditLogType.PERMISSION_GRANTED)).toBe(true);
    });

    it('should filter audit logs by risk level', () => {
      const criticalLogs = permissionAuditLogger.getAuditLogs({ 
        riskLevel: SecurityRiskLevel.CRITICAL 
      });
      expect(criticalLogs.length).toBeGreaterThan(0);
      expect(criticalLogs.every(log => log.riskLevel === SecurityRiskLevel.CRITICAL)).toBe(true);
    });

    it('should calculate comprehensive statistics', () => {
      const stats = permissionAuditLogger.getStatistics();
      
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.byType[AuditLogType.PERMISSION_GRANTED]).toBeGreaterThan(0);
      expect(stats.byType[AuditLogType.PERMISSION_DENIED]).toBeGreaterThan(0);
      expect(stats.byType[AuditLogType.SECURITY_VIOLATION]).toBeGreaterThan(0);
      expect(stats.byType[AuditLogType.DYNAMIC_PERMISSION_ASSIGNED]).toBeGreaterThan(0);
      expect(stats.securityViolations).toBeGreaterThan(0);
      expect(stats.byUser['admin-1']).toBeGreaterThan(0);
      expect(stats.byUser['viewer-1']).toBeGreaterThan(0);
    });

    it('should export audit logs in different formats', () => {
      const jsonExport = permissionAuditLogger.exportAuditLogs({
        format: 'json',
        includeMetadata: true,
        includeDeviceInfo: true,
      });

      const csvExport = permissionAuditLogger.exportAuditLogs({
        format: 'csv',
        includeMetadata: true,
      });

      const xmlExport = permissionAuditLogger.exportAuditLogs({
        format: 'xml',
        includeLocationInfo: true,
      });

      expect(jsonExport).toContain('"type": "permission_granted"');
      expect(csvExport).toContain('ID,Type,Timestamp');
      expect(xmlExport).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    });
  });

  describe('Security Monitoring', () => {
    it('should detect and log suspicious activity patterns', async () => {
      // Clear audit logs to ensure clean test
      permissionAuditLogger.clearAuditLogs();
      
      const context: PermissionCheckContext = {
        userId: 'suspicious-user',
        userRole: UserRole.VIEWER,
        userEmail: 'suspicious@example.com',
        metadata: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
        },
      };

      // Simulate rapid failed access attempts
      for (let i = 0; i < 5; i++) {
        await rolePermissions.hasPermission(
          context,
          'products:delete',
          'products'
        );
      }

      const auditLogs = permissionAuditLogger.getAuditLogs();
      const securityViolations = auditLogs.filter(log => 
        log.type === AuditLogType.SECURITY_VIOLATION
      );
      
      // Each failed permission check creates a permission_denied log
      // Security violations are logged once per user/action combination
      expect(securityViolations.length).toBe(1);
      expect(securityViolations.every(log => log.riskLevel === SecurityRiskLevel.CRITICAL)).toBe(true);
    });

    it('should track user-specific audit logs', () => {
      const userLogs = permissionAuditLogger.getUserAuditLogs('admin-1');
      expect(Array.isArray(userLogs)).toBe(true);
    });

    it('should get security violations', () => {
      const violations = permissionAuditLogger.getSecurityViolations();
      expect(Array.isArray(violations)).toBe(true);
    });

    it('should get suspicious activity', () => {
      const suspicious = permissionAuditLogger.getSuspiciousActivity();
      expect(Array.isArray(suspicious)).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of permission checks efficiently', async () => {
      const context: PermissionCheckContext = {
        userId: 'perf-test-user',
        userRole: UserRole.ADMIN,
        userEmail: 'perf@example.com',
      };

      const startTime = Date.now();
      
      // Perform many permission checks
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          rolePermissions.hasPermission(context, `action${i}`, 'resource')
        );
      }
      
      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      const auditLogs = permissionAuditLogger.getAuditLogs();
      expect(auditLogs.length).toBeGreaterThanOrEqual(100);
    });

    it('should maintain audit log size limits', () => {
      const smallLogger = new (permissionAuditLogger.constructor as any)({
        maxLogSize: 10,
      });

      // Add more entries than the limit
      for (let i = 0; i < 15; i++) {
        smallLogger.logPermissionCheck(
          {
            userId: `user-${i}`,
            userRole: UserRole.VIEWER,
            userEmail: `user${i}@example.com`,
          },
          `action${i}`,
          'resource',
          true,
          'Test'
        );
      }

      const logs = smallLogger.getAuditLogs();
      expect(logs.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Integration with Role Hierarchy', () => {
    it('should log hierarchy-based permission grants', async () => {
      const context: PermissionCheckContext = {
        userId: 'editor-1',
        userRole: UserRole.EDITOR,
        userEmail: 'editor@example.com',
      };

      // Test a permission that might be inherited through hierarchy
      const result = await rolePermissions.hasPermission(
        context,
        'products:view_published',
        'products'
      );

      const auditLogs = permissionAuditLogger.getAuditLogs();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].metadata).toBeDefined();
    });
  });

  describe('Context-Aware Logging', () => {
    it('should include product context in audit logs', async () => {
      const context: PermissionCheckContext = {
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        userEmail: 'admin@example.com',
        productId: 'product-123',
        productOwnerId: 'owner-1',
        currentWorkflowState: 'DRAFT' as any,
        resourceType: 'product',
      };

      await rolePermissions.hasPermission(context, WorkflowAction.EDIT, 'products');

      const auditLogs = permissionAuditLogger.getAuditLogs();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].metadata?.productId).toBe('product-123');
      expect(auditLogs[0].metadata?.workflowState).toBe('DRAFT');
      expect(auditLogs[0].metadata?.resourceType).toBe('product');
    });

    it('should include user management context in audit logs', async () => {
      const context: PermissionCheckContext = {
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        userEmail: 'admin@example.com',
        targetUserId: 'user-456',
        resourceType: 'user',
      };

      await rolePermissions.hasPermission(context, WorkflowAction.MANAGE_USERS, 'users');

      const auditLogs = permissionAuditLogger.getAuditLogs();
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].metadata?.targetUserId).toBe('user-456');
      expect(auditLogs[0].metadata?.resourceType).toBe('user');
    });
  });
});
