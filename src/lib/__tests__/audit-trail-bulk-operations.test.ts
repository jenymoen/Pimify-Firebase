import { 
  AuditTrailBulkOperationsService, 
  BulkOperationType, 
  BulkOperationStatus,
  BulkOperationConfig,
  BulkOperationTemplate,
  BulkOperationStatistics
} from '../audit-trail-bulk-operations';
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

describe('AuditTrailBulkOperationsService', () => {
  let bulkOperationsService: AuditTrailBulkOperationsService;
  let mockAuditTrailService: any;

  const mockAuditEntries: AuditTrailEntry[] = [
    {
      id: 'audit-1',
      timestamp: new Date('2023-01-01T10:00:00Z').toISOString(),
      userId: 'user-1',
      userRole: UserRole.ADMIN,
      userEmail: 'admin@example.com',
      action: AuditTrailAction.BULK_OPERATION,
      productId: 'bulk-operation-1',
      reason: 'Bulk product approval operation',
      priority: AuditTrailPriority.HIGH,
      ipAddress: '192.168.1.1',
      sessionId: 'session-1',
      requestId: 'req-1',
      userAgent: 'Mozilla/5.0',
      fieldChanges: [
        { field: 'status', oldValue: 'review', newValue: 'approved' },
      ],
      metadata: { source: 'bulk_operation', automatic: false },
      archived: false,
      expiresAt: new Date('2025-01-01T10:00:00Z').toISOString(),
      retentionDays: 730,
    },
  ];

  beforeEach(() => {
    bulkOperationsService = new AuditTrailBulkOperationsService();
    mockAuditTrailService = auditTrailService as any;
    mockAuditTrailService.getAuditEntries.mockReturnValue(mockAuditEntries);
    mockAuditTrailService.createBulkOperationEntry.mockReturnValue({
      id: 'audit-entry-1',
      timestamp: new Date().toISOString(),
    });
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Bulk Operation Management', () => {
    it('should create a new bulk operation', () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Test Bulk Operation',
        'Test bulk operation for product approval',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1',
        {
          operation: {
            action: 'approve_products',
            parameters: {
              reason: 'Bulk approval for testing',
              notifyUsers: true,
            },
            filters: {
              products: ['product-1', 'product-2'],
              states: [WorkflowState.REVIEW],
            },
            options: {
              batchSize: 50,
              maxConcurrency: 3,
              retryAttempts: 2,
              retryDelay: 1000,
              continueOnError: true,
              validateBeforeExecution: true,
              dryRun: false,
            },
          },
        }
      );

      expect(operation).toBeDefined();
      expect(operation.name).toBe('Test Bulk Operation');
      expect(operation.type).toBe(BulkOperationType.PRODUCT_APPROVAL);
      expect(operation.status).toBe(BulkOperationStatus.PENDING);
      expect(operation.createdBy).toBe('user-1');
      expect(operation.operation.action).toBe('approve_products');
      expect(operation.operation.parameters.reason).toBe('Bulk approval for testing');
      expect(operation.operation.filters.products).toEqual(['product-1', 'product-2']);
      expect(operation.operation.options.batchSize).toBe(50);
    });

    it('should create a bulk operation from a template', () => {
      const template = bulkOperationsService.createBulkOperationTemplate(
        'Test Template',
        'Test template for bulk operations',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1',
        {
          operation: {
            action: 'approve_products',
            parameters: {
              reason: 'Template-based approval',
            },
            options: {
              batchSize: 25,
              maxConcurrency: 2,
            },
          },
        }
      );

      const operation = bulkOperationsService.createBulkOperationFromTemplate(
        template.id,
        'Template Operation',
        'Operation created from template',
        'user-2',
        {
          operation: {
            action: 'approve_products', // Explicitly set the action
            parameters: {
              reason: 'Custom reason from template',
            },
          },
        }
      );

      expect(operation).toBeDefined();
      expect(operation.name).toBe('Template Operation');
      expect(operation.type).toBe(BulkOperationType.PRODUCT_APPROVAL);
      expect(operation.operation.action).toBe('approve_products');
      expect(operation.operation.options?.batchSize).toBe(25);
      expect(operation.operation.parameters.reason).toBe('Custom reason from template');
      expect(template.usageCount).toBe(1);
      expect(template.lastUsed).toBeDefined();
    });

    it('should get a bulk operation', () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Test Operation',
        'Test bulk operation',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      const retrievedOperation = bulkOperationsService.getBulkOperation(operation.id);
      expect(retrievedOperation).toBeDefined();
      expect(retrievedOperation?.id).toBe(operation.id);
      expect(retrievedOperation?.name).toBe('Test Operation');
    });

    it('should get all bulk operations', () => {
      const operation1 = bulkOperationsService.createBulkOperation(
        'Operation 1',
        'First bulk operation',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      const operation2 = bulkOperationsService.createBulkOperation(
        'Operation 2',
        'Second bulk operation',
        BulkOperationType.PRODUCT_REJECTION,
        'user-2'
      );

      const operations = bulkOperationsService.getBulkOperations();
      expect(operations.length).toBeGreaterThanOrEqual(2);
      expect(operations.find(o => o.id === operation1.id)).toBeDefined();
      expect(operations.find(o => o.id === operation2.id)).toBeDefined();
    });

    it('should cancel a bulk operation', () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Test Operation',
        'Test bulk operation',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      const cancelled = bulkOperationsService.cancelBulkOperation(operation.id);
      expect(cancelled).toBe(true);

      const retrievedOperation = bulkOperationsService.getBulkOperation(operation.id);
      expect(retrievedOperation?.status).toBe(BulkOperationStatus.CANCELLED);
      expect(retrievedOperation?.cancelledAt).toBeDefined();
    });

    it('should not cancel a completed operation', () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Test Operation',
        'Test bulk operation',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      // Simulate completed operation
      operation.status = BulkOperationStatus.COMPLETED;

      const cancelled = bulkOperationsService.cancelBulkOperation(operation.id);
      expect(cancelled).toBe(false);
    });
  });

  describe('Bulk Operation Templates', () => {
    it('should create a bulk operation template', () => {
      const template = bulkOperationsService.createBulkOperationTemplate(
        'Test Template',
        'Test template for bulk operations',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1',
        {
          operation: {
            action: 'approve_products',
            parameters: {
              reason: 'Template-based approval',
            },
            options: {
              batchSize: 50,
              maxConcurrency: 3,
            },
          },
          filters: {
            states: [WorkflowState.REVIEW],
          },
          notifications: {
            enabled: true,
            recipients: ['admin@example.com'],
            events: ['completed', 'failed'],
            channels: ['email'],
          },
        }
      );

      expect(template).toBeDefined();
      expect(template.name).toBe('Test Template');
      expect(template.type).toBe(BulkOperationType.PRODUCT_APPROVAL);
      expect(template.operation.action).toBe('approve_products');
      expect(template.operation.options.batchSize).toBe(50);
      expect(template.filters.states).toEqual([WorkflowState.REVIEW]);
      expect(template.notifications.enabled).toBe(true);
      expect(template.enabled).toBe(true);
    });

    it('should update a bulk operation template', () => {
      const template = bulkOperationsService.createBulkOperationTemplate(
        'Test Template',
        'Test template',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      const updatedTemplate = bulkOperationsService.updateBulkOperationTemplate(template.id, {
        name: 'Updated Template',
        description: 'Updated template description',
        operation: {
          action: 'updated_action',
          parameters: {
            reason: 'Updated reason',
          },
        },
      });

      expect(updatedTemplate.name).toBe('Updated Template');
      expect(updatedTemplate.description).toBe('Updated template description');
      expect(updatedTemplate.operation.action).toBe('updated_action');
      expect(updatedTemplate.operation.parameters.reason).toBe('Updated reason');
    });

    it('should delete a bulk operation template', () => {
      const template = bulkOperationsService.createBulkOperationTemplate(
        'Test Template',
        'Test template',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      const deleted = bulkOperationsService.deleteBulkOperationTemplate(template.id);
      expect(deleted).toBe(true);

      const retrievedTemplate = bulkOperationsService.getBulkOperationTemplate(template.id);
      expect(retrievedTemplate).toBeUndefined();
    });

    it('should get all bulk operation templates', () => {
      const template1 = bulkOperationsService.createBulkOperationTemplate(
        'Template 1',
        'First template',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      const template2 = bulkOperationsService.createBulkOperationTemplate(
        'Template 2',
        'Second template',
        BulkOperationType.PRODUCT_REJECTION,
        'user-2'
      );

      const templates = bulkOperationsService.getBulkOperationTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(2);
      expect(templates.find(t => t.id === template1.id)).toBeDefined();
      expect(templates.find(t => t.id === template2.id)).toBeDefined();
    });

    it('should get a specific bulk operation template', () => {
      const template = bulkOperationsService.createBulkOperationTemplate(
        'Test Template',
        'Test template',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      const retrievedTemplate = bulkOperationsService.getBulkOperationTemplate(template.id);
      expect(retrievedTemplate).toBeDefined();
      expect(retrievedTemplate?.id).toBe(template.id);
      expect(retrievedTemplate?.name).toBe('Test Template');
    });

    it('should initialize with default templates', () => {
      const templates = bulkOperationsService.getBulkOperationTemplates();
      
      // Should have at least the default templates
      expect(templates.length).toBeGreaterThanOrEqual(3);
      
      const approvalTemplate = templates.find(t => t.name === 'Product Approval Template');
      expect(approvalTemplate).toBeDefined();
      expect(approvalTemplate?.type).toBe(BulkOperationType.PRODUCT_APPROVAL);
      
      const rejectionTemplate = templates.find(t => t.name === 'Product Rejection Template');
      expect(rejectionTemplate).toBeDefined();
      expect(rejectionTemplate?.type).toBe(BulkOperationType.PRODUCT_REJECTION);
      
      const exportTemplate = templates.find(t => t.name === 'Data Export Template');
      expect(exportTemplate).toBeDefined();
      expect(exportTemplate?.type).toBe(BulkOperationType.DATA_EXPORT);
    });
  });

  describe('Bulk Operation Execution', () => {
    it('should execute a bulk operation successfully', async () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Test Operation',
        'Test bulk operation',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1',
        {
          operation: {
            action: 'approve_products',
            parameters: {
              reason: 'Test approval',
            },
            options: {
              batchSize: 10,
              maxConcurrency: 2,
              retryAttempts: 1,
              retryDelay: 100,
              continueOnError: true,
              validateBeforeExecution: true,
              dryRun: false,
            },
          },
        }
      );

      const result = await bulkOperationsService.executeBulkOperation(operation.id);

      expect(result).toBeDefined();
      expect(result.status).toBe(BulkOperationStatus.COMPLETED);
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
      expect(result.progress.totalItems).toBe(3); // Mock items count
      expect(result.progress.processedItems).toBe(3);
      expect(result.progress.successfulItems).toBe(3);
      expect(result.results.summary.totalProcessed).toBe(3);
      expect(result.results.summary.totalSuccessful).toBe(3);
    });

    it('should handle bulk operation execution errors', async () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Test Operation',
        'Test bulk operation',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1',
        {
          operation: {
            action: 'approve_products',
            parameters: {
              reason: 'Test approval',
            },
            options: {
              batchSize: 10,
              maxConcurrency: 2,
              retryAttempts: 0, // No retries
              retryDelay: 100,
              continueOnError: false, // Stop on first error
              validateBeforeExecution: true,
              dryRun: false,
            },
          },
        }
      );

      // Mock a failing operation
      jest.spyOn(bulkOperationsService as any, 'processBulkOperationItem')
        .mockRejectedValueOnce(new Error('Simulated failure'));

      const result = await bulkOperationsService.executeBulkOperation(operation.id);

      expect(result.status).toBe(BulkOperationStatus.FAILED);
      expect(result.completedAt).toBeDefined();
      expect(result.results.errors.length).toBeGreaterThan(0);
    });

    it('should not execute a non-pending operation', async () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Test Operation',
        'Test bulk operation',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      // Set operation to completed status
      operation.status = BulkOperationStatus.COMPLETED;

      await expect(
        bulkOperationsService.executeBulkOperation(operation.id)
      ).rejects.toThrow('Bulk operation is not in pending status');
    });

    it('should not execute a non-existent operation', async () => {
      await expect(
        bulkOperationsService.executeBulkOperation('non-existent-operation')
      ).rejects.toThrow('Bulk operation not found');
    });
  });

  describe('Bulk Operation Statistics', () => {
    it('should provide bulk operation statistics', () => {
      const stats = bulkOperationsService.getBulkOperationStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalOperations).toBeGreaterThanOrEqual(0);
      expect(stats.successfulOperations).toBeGreaterThanOrEqual(0);
      expect(stats.failedOperations).toBeGreaterThanOrEqual(0);
      expect(stats.cancelledOperations).toBeGreaterThanOrEqual(0);
      expect(stats.totalItemsProcessed).toBeGreaterThanOrEqual(0);
      expect(stats.totalItemsSuccessful).toBeGreaterThanOrEqual(0);
      expect(stats.totalItemsFailed).toBeGreaterThanOrEqual(0);
      expect(stats.averageOperationTime).toBeGreaterThanOrEqual(0);
      expect(stats.averageItemsPerOperation).toBeGreaterThanOrEqual(0);
      expect(stats.operationTypeDistribution).toBeDefined();
      expect(stats.userDistribution).toBeDefined();
      expect(stats.performanceTrends).toBeDefined();
      expect(stats.errorAnalysis).toBeDefined();
    });

    it('should update statistics when operations are created', () => {
      const initialStats = bulkOperationsService.getBulkOperationStatistics();
      const initialOperationCount = initialStats.totalOperations;

      bulkOperationsService.createBulkOperation(
        'Test Operation',
        'Test bulk operation',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      const updatedStats = bulkOperationsService.getBulkOperationStatistics();
      expect(updatedStats.totalOperations).toBe(initialOperationCount + 1);
    });

    it('should track operation type distribution', () => {
      bulkOperationsService.createBulkOperation(
        'Approval Operation',
        'Product approval operation',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      bulkOperationsService.createBulkOperation(
        'Rejection Operation',
        'Product rejection operation',
        BulkOperationType.PRODUCT_REJECTION,
        'user-2'
      );

      const stats = bulkOperationsService.getBulkOperationStatistics();
      expect(stats.operationTypeDistribution[BulkOperationType.PRODUCT_APPROVAL]).toBeGreaterThan(0);
      expect(stats.operationTypeDistribution[BulkOperationType.PRODUCT_REJECTION]).toBeGreaterThan(0);
    });

    it('should track user distribution', () => {
      bulkOperationsService.createBulkOperation(
        'User 1 Operation',
        'Operation by user 1',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      bulkOperationsService.createBulkOperation(
        'User 2 Operation',
        'Operation by user 2',
        BulkOperationType.PRODUCT_REJECTION,
        'user-2'
      );

      const stats = bulkOperationsService.getBulkOperationStatistics();
      expect(stats.userDistribution.length).toBeGreaterThanOrEqual(2);
      
      const user1Stats = stats.userDistribution.find(u => u.userId === 'user-1');
      expect(user1Stats).toBeDefined();
      expect(user1Stats?.operationCount).toBeGreaterThan(0);
    });
  });

  describe('Bulk Operation Types', () => {
    it('should support product approval operations', async () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Product Approval',
        'Bulk product approval',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      expect(operation.type).toBe(BulkOperationType.PRODUCT_APPROVAL);
    });

    it('should support product rejection operations', async () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Product Rejection',
        'Bulk product rejection',
        BulkOperationType.PRODUCT_REJECTION,
        'user-1'
      );

      expect(operation.type).toBe(BulkOperationType.PRODUCT_REJECTION);
    });

    it('should support product publication operations', async () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Product Publication',
        'Bulk product publication',
        BulkOperationType.PRODUCT_PUBLICATION,
        'user-1'
      );

      expect(operation.type).toBe(BulkOperationType.PRODUCT_PUBLICATION);
    });

    it('should support data export operations', async () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Data Export',
        'Bulk data export',
        BulkOperationType.DATA_EXPORT,
        'user-1'
      );

      expect(operation.type).toBe(BulkOperationType.DATA_EXPORT);
    });

    it('should support custom operations', async () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Custom Operation',
        'Custom bulk operation',
        BulkOperationType.CUSTOM,
        'user-1'
      );

      expect(operation.type).toBe(BulkOperationType.CUSTOM);
    });
  });

  describe('Bulk Operation Progress Tracking', () => {
    it('should track operation progress', async () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Test Operation',
        'Test bulk operation',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1',
        {
          operation: {
            action: 'approve_products',
            options: {
              batchSize: 5,
              maxConcurrency: 2,
            },
          },
        }
      );

      const result = await bulkOperationsService.executeBulkOperation(operation.id);

      expect(result.progress.totalItems).toBe(3); // Mock items count
      expect(result.progress.processedItems).toBe(3);
      expect(result.progress.percentage).toBe(100);
      expect(result.progress.currentBatch).toBe(1);
      expect(result.progress.totalBatches).toBe(1);
    });

    it('should calculate estimated time remaining', async () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Test Operation',
        'Test bulk operation',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      const result = await bulkOperationsService.executeBulkOperation(operation.id);

      expect(result.progress.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Bulk Operation Error Handling', () => {
    it('should handle missing template gracefully', () => {
      expect(() => {
        bulkOperationsService.createBulkOperationFromTemplate(
          'nonexistent-template',
          'Test Operation',
          'Test operation',
          'user-1'
        );
      }).toThrow('Bulk operation template not found');
    });

    it('should handle missing operation gracefully', () => {
      const operation = bulkOperationsService.getBulkOperation('nonexistent-operation');
      expect(operation).toBeUndefined();
    });

    it('should handle cancellation of non-existent operation', () => {
      const cancelled = bulkOperationsService.cancelBulkOperation('nonexistent-operation');
      expect(cancelled).toBe(false);
    });

    it('should handle missing template update gracefully', () => {
      expect(() => {
        bulkOperationsService.updateBulkOperationTemplate('nonexistent-template', { name: 'updated' });
      }).toThrow('Bulk operation template not found');
    });
  });

  describe('Bulk Operation Notifications', () => {
    it('should configure notifications for bulk operations', () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Test Operation',
        'Test bulk operation',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1',
        {
          notifications: {
            enabled: true,
            recipients: ['admin@example.com', 'manager@example.com'],
            events: ['started', 'completed', 'failed'],
            channels: ['email', 'webhook'],
            webhookUrl: 'https://example.com/webhook',
          },
        }
      );

      expect(operation.notifications.enabled).toBe(true);
      expect(operation.notifications.recipients).toEqual(['admin@example.com', 'manager@example.com']);
      expect(operation.notifications.events).toEqual(['started', 'completed', 'failed']);
      expect(operation.notifications.channels).toEqual(['email', 'webhook']);
      expect(operation.notifications.webhookUrl).toBe('https://example.com/webhook');
    });
  });

  describe('Bulk Operation Performance Metrics', () => {
    it('should track performance metrics', async () => {
      const operation = bulkOperationsService.createBulkOperation(
        'Test Operation',
        'Test bulk operation',
        BulkOperationType.PRODUCT_APPROVAL,
        'user-1'
      );

      const result = await bulkOperationsService.executeBulkOperation(operation.id);

      expect(result.performance.startTime).toBeDefined();
      expect(result.performance.endTime).toBeDefined();
      expect(result.performance.totalDuration).toBeGreaterThan(0);
      expect(result.performance.averageItemTime).toBeGreaterThanOrEqual(0);
      expect(result.performance.peakMemoryUsage).toBeGreaterThanOrEqual(0);
      expect(result.performance.databaseQueries).toBeGreaterThanOrEqual(0);
    });
  });
});
