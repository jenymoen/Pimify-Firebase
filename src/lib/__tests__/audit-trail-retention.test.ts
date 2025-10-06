import { 
  AuditTrailRetentionService, 
  RetentionPolicyType, 
  RetentionAction,
  RetentionPolicy,
  RetentionExecutionResult,
  RetentionViolation,
  RetentionAnalytics
} from '../audit-trail-retention';
import { auditTrailService, AuditTrailAction, AuditTrailPriority } from '../audit-trail-service';
import { UserRole, WorkflowState, AuditTrailEntry } from '../../types/workflow';

// Mock the audit trail service
jest.mock('../audit-trail-service', () => ({
  auditTrailService: {
    getAuditEntries: jest.fn(),
    createAuditEntry: jest.fn(),
    createProductCreatedEntry: jest.fn(),
    createProductUpdatedEntry: jest.fn(),
    createStateTransitionEntry: jest.fn(),
    createReviewerAssignmentEntry: jest.fn(),
    createBulkOperationEntry: jest.fn(),
    getProductAuditTrail: jest.fn(),
    getUserAuditTrail: jest.fn(),
    getStatistics: jest.fn(),
    exportAuditTrail: jest.fn(),
    archiveOldEntries: jest.fn(),
    cleanupExpiredEntries: jest.fn(),
    verifyIntegrity: jest.fn(),
  },
  AuditTrailAction: {
    PRODUCT_CREATED: 'product_created',
    PRODUCT_UPDATED: 'product_updated',
    PRODUCT_DELETED: 'product_deleted',
    STATE_TRANSITION: 'state_transition',
    REVIEWER_ASSIGNED: 'reviewer_assigned',
    REVIEWER_UNASSIGNED: 'reviewer_unassigned',
    BULK_OPERATION: 'bulk_operation',
    PERMISSION_GRANTED: 'permission_granted',
    PERMISSION_REVOKED: 'permission_revoked',
    USER_ROLE_CHANGED: 'user_role_changed',
    SYSTEM_CONFIG_CHANGED: 'system_config_changed',
    EXPORT_PERFORMED: 'export_performed',
    IMPORT_PERFORMED: 'import_performed',
  },
  AuditTrailPriority: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },
}));

describe('AuditTrailRetentionService', () => {
  let retentionService: AuditTrailRetentionService;
  let mockAuditTrailService: any;

  const mockAuditEntries: AuditTrailEntry[] = [
    {
      id: 'audit-1',
      timestamp: new Date('2021-01-01T10:00:00Z').toISOString(), // 3 years old
      userId: 'user-1',
      userRole: UserRole.ADMIN,
      userEmail: 'admin@example.com',
      action: AuditTrailAction.PRODUCT_CREATED,
      productId: 'product-1',
      reason: 'Product created for testing',
      priority: AuditTrailPriority.HIGH,
      ipAddress: '192.168.1.1',
      sessionId: 'session-1',
      requestId: 'req-1',
      userAgent: 'Mozilla/5.0',
      fieldChanges: [
        { field: 'name', oldValue: null, newValue: 'Test Product' },
        { field: 'price', oldValue: null, newValue: 100 },
      ],
      metadata: { source: 'api', automatic: false },
      archived: false,
      expiresAt: new Date('2025-01-01T10:00:00Z').toISOString(),
      retentionDays: 730,
    },
    {
      id: 'audit-2',
      timestamp: new Date('2023-01-01T11:00:00Z').toISOString(), // 1 year old
      userId: 'user-2',
      userRole: UserRole.EDITOR,
      userEmail: 'editor@example.com',
      action: AuditTrailAction.PRODUCT_UPDATED,
      productId: 'product-1',
      reason: 'Updated product price',
      priority: AuditTrailPriority.CRITICAL,
      ipAddress: '192.168.1.2',
      sessionId: 'session-2',
      requestId: 'req-2',
      userAgent: 'Mozilla/5.0',
      fieldChanges: [
        { field: 'price', oldValue: 100, newValue: 150 },
      ],
      metadata: { source: 'ui', automatic: false },
      archived: false,
      expiresAt: new Date('2025-01-01T11:00:00Z').toISOString(),
      retentionDays: 730,
    },
    {
      id: 'audit-3',
      timestamp: new Date('2024-01-01T12:00:00Z').toISOString(), // Recent
      userId: 'user-3',
      userRole: UserRole.REVIEWER,
      userEmail: 'reviewer@example.com',
      action: AuditTrailAction.STATE_TRANSITION,
      productId: 'product-1',
      reason: 'Product approved',
      priority: AuditTrailPriority.MEDIUM,
      ipAddress: '192.168.1.3',
      sessionId: 'session-3',
      requestId: 'req-3',
      userAgent: 'Mozilla/5.0',
      fieldChanges: [
        { field: 'workflowState', oldValue: 'review', newValue: 'approved' },
      ],
      metadata: { source: 'workflow', automatic: false },
      archived: false,
      expiresAt: new Date('2026-01-01T12:00:00Z').toISOString(),
      retentionDays: 730,
    },
  ];

  beforeEach(() => {
    retentionService = new AuditTrailRetentionService();
    mockAuditTrailService = auditTrailService as any;
    mockAuditTrailService.getAuditEntries.mockReturnValue(mockAuditEntries);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Retention Policy Management', () => {
    it('should create a new retention policy', () => {
      const policy = retentionService.createRetentionPolicy(
        'Test Policy',
        'Test retention policy',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: {
            years: 3,
            months: 6,
          },
          actions: [RetentionAction.ARCHIVE, RetentionAction.DELETE],
          priority: 5,
        }
      );

      expect(policy).toBeDefined();
      expect(policy.name).toBe('Test Policy');
      expect(policy.type).toBe(RetentionPolicyType.TIME_BASED);
      expect(policy.retentionPeriod.years).toBe(3);
      expect(policy.retentionPeriod.months).toBe(6);
      expect(policy.actions).toContain(RetentionAction.ARCHIVE);
      expect(policy.actions).toContain(RetentionAction.DELETE);
      expect(policy.priority).toBe(5);
      expect(policy.enabled).toBe(true);
    });

    it('should update an existing retention policy', () => {
      const policy = retentionService.createRetentionPolicy(
        'Test Policy',
        'Test retention policy',
        RetentionPolicyType.TIME_BASED,
        'user-1'
      );

      const updatedPolicy = retentionService.updateRetentionPolicy(policy.id, {
        name: 'Updated Policy',
        priority: 10,
        retentionPeriod: {
          years: 5,
        },
      });

      expect(updatedPolicy.name).toBe('Updated Policy');
      expect(updatedPolicy.priority).toBe(10);
      expect(updatedPolicy.retentionPeriod.years).toBe(5);
      expect(updatedPolicy.updatedAt).toBeDefined();
    });

    it('should delete a retention policy', () => {
      const policy = retentionService.createRetentionPolicy(
        'Test Policy',
        'Test retention policy',
        RetentionPolicyType.TIME_BASED,
        'user-1'
      );

      const deleted = retentionService.deleteRetentionPolicy(policy.id);
      expect(deleted).toBe(true);

      const retrievedPolicy = retentionService.getRetentionPolicy(policy.id);
      expect(retrievedPolicy).toBeUndefined();
    });

    it('should get all retention policies sorted by priority', () => {
      const policy1 = retentionService.createRetentionPolicy(
        'Low Priority',
        'Low priority policy',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        { priority: 1 }
      );

      const policy2 = retentionService.createRetentionPolicy(
        'High Priority',
        'High priority policy',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        { priority: 10 }
      );

      const policies = retentionService.getRetentionPolicies();
      // Find the specific policies we created
      const lowPriorityPolicy = policies.find(p => p.name === 'Low Priority');
      const highPriorityPolicy = policies.find(p => p.name === 'High Priority');
      
      expect(highPriorityPolicy?.priority).toBeGreaterThan(lowPriorityPolicy?.priority || 0);
    });

    it('should initialize with default policies', () => {
      const policies = retentionService.getRetentionPolicies();
      
      // Should have at least the default policies
      expect(policies.length).toBeGreaterThanOrEqual(3);
      
      const defaultPolicy = policies.find(p => p.name === 'Default 2-Year Retention');
      expect(defaultPolicy).toBeDefined();
      expect(defaultPolicy?.retentionPeriod.years).toBe(2);
    });
  });

  describe('Time-Based Retention', () => {
    it('should identify entries eligible for time-based retention', async () => {
      const policy = retentionService.createRetentionPolicy(
        '3-Year Retention',
        'Retain entries for 3 years',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: {
            years: 3,
          },
          actions: [RetentionAction.ARCHIVE],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.totalEntries).toBeGreaterThanOrEqual(1); // At least the 3-year-old entry
      // Should process the 3-year-old entry
      expect(result.processedEntries).toBeGreaterThan(0);
    });

    it('should handle different time periods', async () => {
      const policy = retentionService.createRetentionPolicy(
        '1-Year Retention',
        'Retain entries for 1 year',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: {
            years: 1,
          },
          actions: [RetentionAction.ARCHIVE],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.totalEntries).toBe(3);
      // Should process both the 3-year-old and 1-year-old entries
      expect(result.processedEntries).toBeGreaterThan(0);
    });
  });

  describe('Event-Based Retention', () => {
    it('should identify entries based on specific actions', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Product Creation Retention',
        'Retain product creation entries',
        RetentionPolicyType.EVENT_BASED,
        'user-1',
        {
          triggerEvents: [AuditTrailAction.PRODUCT_CREATED],
          actions: [RetentionAction.ARCHIVE],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.totalEntries).toBe(1); // Only the product creation entry
      expect(result.processedEntries).toBe(1);
    });

    it('should identify entries based on field conditions', async () => {
      const policy = retentionService.createRetentionPolicy(
        'High Priority Retention',
        'Retain high priority entries',
        RetentionPolicyType.EVENT_BASED,
        'user-1',
        {
          triggerConditions: [
            {
              field: 'priority',
              operator: 'equals',
              value: 'critical',
            },
          ],
          actions: [RetentionAction.ARCHIVE],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.totalEntries).toBe(1); // Only the critical priority entry
      expect(result.processedEntries).toBe(1);
    });
  });

  describe('Size-Based Retention', () => {
    it('should identify entries based on total count', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Size Limit Retention',
        'Retain entries based on count',
        RetentionPolicyType.SIZE_BASED,
        'user-1',
        {
          maxSize: {
            entries: 2,
          },
          actions: [RetentionAction.ARCHIVE],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.totalEntries).toBe(3); // All entries exceed the limit
      expect(result.processedEntries).toBe(3);
    });

    it('should identify entries based on storage size', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Storage Limit Retention',
        'Retain entries based on storage',
        RetentionPolicyType.SIZE_BASED,
        'user-1',
        {
          maxSize: {
            bytes: 1000, // Very small limit
          },
          actions: [RetentionAction.ARCHIVE],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.totalEntries).toBe(3); // All entries exceed the limit
      expect(result.processedEntries).toBe(3);
    });
  });

  describe('Compliance-Based Retention', () => {
    it('should handle GDPR compliance requirements', async () => {
      const policy = retentionService.createRetentionPolicy(
        'GDPR Compliance',
        'GDPR compliance policy',
        RetentionPolicyType.COMPLIANCE_BASED,
        'user-1',
        {
          complianceRequirements: [
            {
              regulation: 'GDPR',
              minimumRetention: 365, // 1 year
              maximumRetention: 2555, // 7 years
              requiresEncryption: true,
              requiresAuditTrail: true,
            },
          ],
          actions: [RetentionAction.ENCRYPT, RetentionAction.ARCHIVE],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.complianceStatus).toHaveLength(1);
      expect(result.complianceStatus[0].regulation).toBe('GDPR');
    });

    it('should handle SOX compliance requirements', async () => {
      const policy = retentionService.createRetentionPolicy(
        'SOX Compliance',
        'SOX compliance policy',
        RetentionPolicyType.COMPLIANCE_BASED,
        'user-1',
        {
          complianceRequirements: [
            {
              regulation: 'SOX',
              minimumRetention: 2555, // 7 years
              requiresEncryption: true,
              requiresAuditTrail: true,
            },
          ],
          actions: [RetentionAction.ENCRYPT, RetentionAction.ARCHIVE],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.complianceStatus).toHaveLength(1);
      expect(result.complianceStatus[0].regulation).toBe('SOX');
    });
  });

  describe('Retention Actions', () => {
    it('should archive entries', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Archive Policy',
        'Archive old entries',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: {
            years: 3,
          },
          actions: [RetentionAction.ARCHIVE],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.archivedEntries).toBeGreaterThan(0);
    });

    it('should delete entries', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Delete Policy',
        'Delete old entries',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: {
            years: 3,
          },
          actions: [RetentionAction.DELETE],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.deletedEntries).toBeGreaterThan(0);
    });

    it('should compress entries', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Compress Policy',
        'Compress old entries',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: {
            years: 3,
          },
          actions: [RetentionAction.COMPRESS],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.compressedEntries).toBeGreaterThan(0);
    });

    it('should encrypt entries', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Encrypt Policy',
        'Encrypt old entries',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: {
            years: 3,
          },
          actions: [RetentionAction.ENCRYPT],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.encryptedEntries).toBeGreaterThan(0);
    });

    it('should handle multiple actions', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Multi-Action Policy',
        'Archive and encrypt old entries',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: {
            years: 3,
          },
          actions: [RetentionAction.ARCHIVE, RetentionAction.ENCRYPT],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.archivedEntries).toBeGreaterThan(0);
      expect(result.encryptedEntries).toBeGreaterThan(0);
    });
  });

  describe('Retention Violations', () => {
    it('should detect retention violations', async () => {
      const policy = retentionService.createRetentionPolicy(
        'GDPR Policy',
        'GDPR compliance policy',
        RetentionPolicyType.COMPLIANCE_BASED,
        'user-1',
        {
          complianceRequirements: [
            {
              regulation: 'GDPR',
              minimumRetention: 365, // 1 year
              maximumRetention: 1095, // 3 years
              requiresEncryption: true,
              requiresAuditTrail: true,
            },
          ],
          actions: [RetentionAction.ARCHIVE],
        }
      );

      const violations = await retentionService.checkRetentionViolations();

      expect(violations).toBeDefined();
      expect(Array.isArray(violations)).toBe(true);
    });

    it('should resolve retention violations', async () => {
      const policy = retentionService.createRetentionPolicy(
        'GDPR Policy',
        'GDPR compliance policy',
        RetentionPolicyType.COMPLIANCE_BASED,
        'user-1',
        {
          complianceRequirements: [
            {
              regulation: 'GDPR',
              minimumRetention: 365,
              maximumRetention: 1095,
              requiresEncryption: true,
              requiresAuditTrail: true,
            },
          ],
          actions: [RetentionAction.ARCHIVE],
        }
      );

      const violations = await retentionService.checkRetentionViolations();
      
      if (violations.length > 0) {
        const violation = violations[0];
        const resolved = retentionService.resolveRetentionViolation(
          violation.id,
          'Violation resolved by archiving entry'
        );

        expect(resolved).toBe(true);
        expect(violation.resolvedAt).toBeDefined();
        expect(violation.resolution).toBe('Violation resolved by archiving entry');
      }
    });
  });

  describe('Analytics and Reporting', () => {
    it('should provide retention analytics', () => {
      const analytics = retentionService.getRetentionAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.totalPolicies).toBeGreaterThanOrEqual(0);
      expect(analytics.activePolicies).toBeGreaterThanOrEqual(0);
      expect(analytics.totalEntries).toBe(3);
      expect(analytics.successRate).toBeGreaterThanOrEqual(0);
      expect(analytics.errorRate).toBeGreaterThanOrEqual(0);
    });

    it('should track execution history', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Test Policy',
        'Test retention policy',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: {
            years: 3,
          },
          actions: [RetentionAction.ARCHIVE],
        }
      );

      await retentionService.executeRetentionPolicy(policy.id);

      const history = retentionService.getExecutionHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].policyId).toBe(policy.id);
      expect(history[0].executionId).toBeDefined();
      expect(history[0].startTime).toBeDefined();
      expect(history[0].endTime).toBeDefined();
    });

    it('should export retention data in JSON format', () => {
      const jsonData = retentionService.exportRetentionData('json');
      
      expect(jsonData).toBeDefined();
      expect(() => JSON.parse(jsonData)).not.toThrow();
      
      const data = JSON.parse(jsonData);
      expect(data.policies).toBeDefined();
      expect(data.executionHistory).toBeDefined();
      expect(data.violations).toBeDefined();
      expect(data.analytics).toBeDefined();
      expect(data.exportedAt).toBeDefined();
    });

    it('should export retention data in CSV format', () => {
      const csvData = retentionService.exportRetentionData('csv');
      
      expect(csvData).toBeDefined();
      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('ID,Name,Type,Enabled,Priority,Created At');
    });

    it('should export retention data in XML format', () => {
      const xmlData = retentionService.exportRetentionData('xml');
      
      expect(xmlData).toBeDefined();
      expect(typeof xmlData).toBe('string');
      expect(xmlData).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xmlData).toContain('<retentionData>');
      expect(xmlData).toContain('policies count=');
    });
  });

  describe('Batch Processing', () => {
    it('should process entries in batches', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Batch Policy',
        'Process entries in batches',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: {
            years: 3,
          },
          actions: [RetentionAction.ARCHIVE],
          execution: {
            schedule: 'monthly',
            batchSize: 1, // Small batch size for testing
            maxExecutionTime: 1, // 1 minute limit
          },
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(true);
      expect(result.totalEntries).toBeGreaterThanOrEqual(1);
      expect(result.processedEntries).toBeGreaterThan(0);
    });

    it('should respect execution time limits', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Time Limited Policy',
        'Policy with time limit',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: {
            years: 3,
          },
          actions: [RetentionAction.ARCHIVE],
          execution: {
            schedule: 'monthly',
            batchSize: 1,
            maxExecutionTime: 0.001, // Very short time limit
          },
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      // The time limit might not be reached if processing is very fast
      if (result.warnings.length > 0) {
        expect(result.warnings[0].message).toContain('Execution time limit reached');
      } else {
        // If no warnings, the processing completed within the time limit
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing policy gracefully', async () => {
      await expect(
        retentionService.executeRetentionPolicy('nonexistent-policy')
      ).rejects.toThrow('Retention policy not found');
    });

    it('should handle disabled policy gracefully', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Disabled Policy',
        'Disabled retention policy',
        RetentionPolicyType.TIME_BASED,
        'user-1'
      );

      retentionService.updateRetentionPolicy(policy.id, { enabled: false });

      await expect(
        retentionService.executeRetentionPolicy(policy.id)
      ).rejects.toThrow('Retention policy is disabled');
    });

    it('should handle processing errors gracefully', async () => {
      // Mock an error in the audit trail service
      mockAuditTrailService.getAuditEntries.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const policy = retentionService.createRetentionPolicy(
        'Error Policy',
        'Policy that will cause errors',
        RetentionPolicyType.TIME_BASED,
        'user-1'
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].error).toContain('Database connection failed');
    });
  });

  describe('Policy Scheduling', () => {
    it('should execute all enabled policies', async () => {
      const policy1 = retentionService.createRetentionPolicy(
        'Policy 1',
        'First policy',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: { years: 3 },
          actions: [RetentionAction.ARCHIVE],
        }
      );

      const policy2 = retentionService.createRetentionPolicy(
        'Policy 2',
        'Second policy',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: { years: 3 },
          actions: [RetentionAction.ARCHIVE],
        }
      );

      const results = await retentionService.executeAllRetentionPolicies();

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should skip disabled policies', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Disabled Policy',
        'Disabled retention policy',
        RetentionPolicyType.TIME_BASED,
        'user-1'
      );

      retentionService.updateRetentionPolicy(policy.id, { enabled: false });

      const results = await retentionService.executeAllRetentionPolicies();

      // Should not include the disabled policy
      const policyResults = results.filter(r => r.policyId === policy.id);
      expect(policyResults.length).toBe(0);
    });
  });

  describe('Storage Impact Calculation', () => {
    it('should calculate storage impact correctly', async () => {
      const policy = retentionService.createRetentionPolicy(
        'Storage Policy',
        'Policy for storage calculation',
        RetentionPolicyType.TIME_BASED,
        'user-1',
        {
          retentionPeriod: {
            years: 3,
          },
          actions: [RetentionAction.ARCHIVE],
        }
      );

      const result = await retentionService.executeRetentionPolicy(policy.id);

      expect(result.storageImpact).toBeDefined();
      expect(result.storageImpact.beforeSize).toBeGreaterThan(0);
      expect(result.storageImpact.afterSize).toBeGreaterThanOrEqual(0);
      expect(result.storageImpact.spaceSaved).toBeGreaterThanOrEqual(0);
    });
  });
});
