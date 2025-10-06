import { 
  AuditTrailIntegration, 
  EnhancedWorkflowStateManager 
} from '../audit-trail-integration';
import { WorkflowStateManager } from '../workflow-state-manager';
import { RolePermissions } from '../role-permissions';
import { auditTrailService, AuditTrailAction } from '../audit-trail-service';
import { 
  WorkflowState, 
  UserRole, 
  ProductWorkflow, 
  FieldChange 
} from '../../types/workflow';

// Mock the audit trail service
jest.mock('../audit-trail-service', () => ({
  auditTrailService: {
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
}));

describe('AuditTrailIntegration', () => {
  let integration: AuditTrailIntegration;
  let workflowStateManager: WorkflowStateManager;
  let rolePermissions: RolePermissions;
  let mockAuditTrailService: any;

  beforeEach(() => {
    workflowStateManager = new WorkflowStateManager();
    rolePermissions = new RolePermissions();
    integration = new AuditTrailIntegration(workflowStateManager, rolePermissions);
    mockAuditTrailService = auditTrailService as any;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Product Operations', () => {
    it('should create audit entry for product creation', () => {
      const productData = {
        name: 'Test Product',
        price: 100,
        description: 'Test Description',
      };

      integration.createProductAuditEntry(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        'product-1',
        productData,
        { ipAddress: '192.168.1.1' }
      );

      expect(mockAuditTrailService.createProductCreatedEntry).toHaveBeenCalledWith(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        'product-1',
        productData,
        { ipAddress: '192.168.1.1' }
      );
    });

    it('should create audit entry for product update with enhanced field change tracking', () => {
      const oldData = {
        name: 'Old Name',
        price: 100,
        description: 'Old Description',
      };

      const newData = {
        name: 'New Name',
        price: 150,
        description: 'New Description',
      };

      const enhancedChanges = integration.createProductUpdateAuditEntry(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        'product-1',
        oldData,
        newData,
        'Updated product details',
        { sessionId: 'session-123' }
      );

      expect(enhancedChanges).toBeDefined();
      expect(enhancedChanges.length).toBeGreaterThan(0);
      expect(mockAuditTrailService.createProductUpdatedEntry).toHaveBeenCalledWith(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        'product-1',
        expect.any(Array), // Basic field changes
        'Updated product details',
        expect.objectContaining({
          sessionId: 'session-123',
          enhancedChanges: expect.any(Array),
          changeAnalysis: expect.any(Object),
          changeValidation: expect.any(Object),
        })
      );
    });

    it('should create audit entry for product deletion', () => {
      const productData = {
        name: 'Test Product',
        price: 100,
        description: 'Test Description',
      };

      integration.createProductDeleteAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        'product-1',
        productData,
        'Product no longer needed',
        { ipAddress: '192.168.1.1' }
      );

      expect(mockAuditTrailService.createAuditEntry).toHaveBeenCalledWith(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_DELETED,
        'product-1',
        [
          { field: 'name', oldValue: 'Test Product', newValue: null },
          { field: 'price', oldValue: 100, newValue: null },
          { field: 'description', oldValue: 'Test Description', newValue: null },
        ],
        'Product no longer needed',
        { ipAddress: '192.168.1.1' }
      );
    });
  });

  describe('Workflow Operations', () => {
    it('should create audit entry for state transition', () => {
      integration.createStateTransitionAuditEntry(
        'user-1',
        UserRole.REVIEWER,
        'reviewer@example.com',
        'product-1',
        WorkflowState.REVIEW,
        WorkflowState.APPROVED,
        'Product approved after review',
        { requestId: 'req-123' }
      );

      expect(mockAuditTrailService.createStateTransitionEntry).toHaveBeenCalledWith(
        'user-1',
        UserRole.REVIEWER,
        'reviewer@example.com',
        'product-1',
        WorkflowState.REVIEW,
        WorkflowState.APPROVED,
        'Product approved after review',
        { requestId: 'req-123' }
      );
    });

    it('should create audit entry for reviewer assignment', () => {
      integration.createReviewerAssignmentAuditEntry(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'product-1',
        'reviewer-1',
        true,
        'Assigned reviewer for product review',
        { ipAddress: '192.168.1.1' }
      );

      expect(mockAuditTrailService.createReviewerAssignmentEntry).toHaveBeenCalledWith(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'product-1',
        'reviewer-1',
        true,
        'Assigned reviewer for product review',
        { ipAddress: '192.168.1.1' }
      );
    });

    it('should create audit entry for reviewer unassignment', () => {
      integration.createReviewerAssignmentAuditEntry(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'product-1',
        'reviewer-1',
        false,
        'Unassigned reviewer',
        { ipAddress: '192.168.1.1' }
      );

      expect(mockAuditTrailService.createReviewerAssignmentEntry).toHaveBeenCalledWith(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'product-1',
        'reviewer-1',
        false,
        'Unassigned reviewer',
        { ipAddress: '192.168.1.1' }
      );
    });

    it('should create audit entry for bulk operation', () => {
      const productIds = ['product-1', 'product-2', 'product-3'];
      const results = [
        { productId: 'product-1', success: true },
        { productId: 'product-2', success: true },
        { productId: 'product-3', success: false, error: 'Product not found' },
      ];

      integration.createBulkOperationAuditEntry(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'approve',
        productIds,
        results,
        'Bulk approval of products',
        { sessionId: 'session-123' }
      );

      expect(mockAuditTrailService.createBulkOperationEntry).toHaveBeenCalledWith(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'approve',
        productIds,
        results,
        'Bulk approval of products',
        { sessionId: 'session-123' }
      );
    });
  });

  describe('Permission Operations', () => {
    it('should create audit entry for permission grant', () => {
      integration.createPermissionGrantAuditEntry(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'user-1',
        'products:create',
        'Granted create permission',
        { ipAddress: '192.168.1.1' }
      );

      expect(mockAuditTrailService.createAuditEntry).toHaveBeenCalledWith(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PERMISSION_GRANTED,
        'user-1',
        [{ field: 'permissions', oldValue: null, newValue: 'products:create' }],
        'Granted create permission',
        { ipAddress: '192.168.1.1' }
      );
    });

    it('should create audit entry for permission revocation', () => {
      integration.createPermissionRevokeAuditEntry(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'user-1',
        'products:create',
        'Revoked create permission',
        { ipAddress: '192.168.1.1' }
      );

      expect(mockAuditTrailService.createAuditEntry).toHaveBeenCalledWith(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PERMISSION_REVOKED,
        'user-1',
        [{ field: 'permissions', oldValue: 'products:create', newValue: null }],
        'Revoked create permission',
        { ipAddress: '192.168.1.1' }
      );
    });

    it('should create audit entry for user role change', () => {
      integration.createUserRoleChangeAuditEntry(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'user-1',
        UserRole.EDITOR,
        UserRole.REVIEWER,
        'Promoted user to reviewer',
        { ipAddress: '192.168.1.1' }
      );

      expect(mockAuditTrailService.createAuditEntry).toHaveBeenCalledWith(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.USER_ROLE_CHANGED,
        'user-1',
        [{ field: 'userRole', oldValue: UserRole.EDITOR, newValue: UserRole.REVIEWER }],
        'Promoted user to reviewer',
        { ipAddress: '192.168.1.1' }
      );
    });
  });

  describe('System Operations', () => {
    it('should create audit entry for system configuration change', () => {
      integration.createSystemConfigChangeAuditEntry(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'maxProductsPerUser',
        100,
        200,
        'Increased product limit',
        { ipAddress: '192.168.1.1' }
      );

      expect(mockAuditTrailService.createAuditEntry).toHaveBeenCalledWith(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.SYSTEM_CONFIG_CHANGED,
        undefined,
        [{ field: 'maxProductsPerUser', oldValue: 100, newValue: 200 }],
        'Increased product limit',
        { ipAddress: '192.168.1.1' }
      );
    });

    it('should create audit entry for export operation', () => {
      integration.createExportAuditEntry(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        'CSV',
        50,
        { category: 'electronics' },
        'Exported products for analysis',
        { ipAddress: '192.168.1.1' }
      );

      expect(mockAuditTrailService.createAuditEntry).toHaveBeenCalledWith(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        AuditTrailAction.EXPORT_PERFORMED,
        undefined,
        [{
          field: 'export',
          oldValue: null,
          newValue: {
            type: 'CSV',
            productCount: 50,
            filters: { category: 'electronics' },
          },
        }],
        'Exported products for analysis',
        { ipAddress: '192.168.1.1' }
      );
    });

    it('should create audit entry for import operation', () => {
      const results = [
        { productId: 'product-1', success: true },
        { productId: 'product-2', success: true },
        { productId: 'product-3', success: false, error: 'Invalid data' },
      ];

      integration.createImportAuditEntry(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        'CSV',
        3,
        results,
        'Imported products from CSV',
        { ipAddress: '192.168.1.1' }
      );

      expect(mockAuditTrailService.createAuditEntry).toHaveBeenCalledWith(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        AuditTrailAction.IMPORT_PERFORMED,
        undefined,
        [{
          field: 'import',
          oldValue: null,
          newValue: {
            type: 'CSV',
            productCount: 3,
            successCount: 2,
            failureCount: 1,
          },
        }],
        'Imported products from CSV',
        {
          ipAddress: '192.168.1.1',
          results,
        }
      );
    });
  });

  describe('Audit Trail Access', () => {
    it('should get product audit trail', () => {
      const mockTrail = [{ id: 'audit-1', action: 'product_created' }];
      mockAuditTrailService.getProductAuditTrail.mockReturnValue(mockTrail);

      const result = integration.getProductAuditTrail('product-1', { limit: 10 });

      expect(mockAuditTrailService.getProductAuditTrail).toHaveBeenCalledWith('product-1', { limit: 10 });
      expect(result).toBe(mockTrail);
    });

    it('should get user audit trail', () => {
      const mockTrail = [{ id: 'audit-1', action: 'product_created' }];
      mockAuditTrailService.getUserAuditTrail.mockReturnValue(mockTrail);

      const result = integration.getUserAuditTrail('user-1', { limit: 10 });

      expect(mockAuditTrailService.getUserAuditTrail).toHaveBeenCalledWith('user-1', { limit: 10 });
      expect(result).toBe(mockTrail);
    });

    it('should get audit trail statistics', () => {
      const mockStats = { totalEntries: 100, byAction: {} };
      mockAuditTrailService.getStatistics.mockReturnValue(mockStats);

      const result = integration.getAuditTrailStatistics();

      expect(mockAuditTrailService.getStatistics).toHaveBeenCalled();
      expect(result).toBe(mockStats);
    });

    it('should export audit trail', () => {
      const mockExport = 'exported data';
      mockAuditTrailService.exportAuditTrail.mockReturnValue(mockExport);

      const result = integration.exportAuditTrail({ format: 'json' });

      expect(mockAuditTrailService.exportAuditTrail).toHaveBeenCalledWith({ format: 'json' });
      expect(result).toBe(mockExport);
    });
  });

  describe('Maintenance Operations', () => {
    it('should archive old entries', () => {
      mockAuditTrailService.archiveOldEntries.mockReturnValue(10);

      const result = integration.archiveOldEntries(365);

      expect(mockAuditTrailService.archiveOldEntries).toHaveBeenCalledWith(365);
      expect(result).toBe(10);
    });

    it('should cleanup expired entries', () => {
      mockAuditTrailService.cleanupExpiredEntries.mockReturnValue(5);

      const result = integration.cleanupExpiredEntries();

      expect(mockAuditTrailService.cleanupExpiredEntries).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should verify integrity', () => {
      const mockResults = [{ entryId: 'audit-1', valid: true }];
      mockAuditTrailService.verifyIntegrity.mockReturnValue(mockResults);

      const result = integration.verifyIntegrity();

      expect(mockAuditTrailService.verifyIntegrity).toHaveBeenCalled();
      expect(result).toBe(mockResults);
    });
  });
});

describe('EnhancedWorkflowStateManager', () => {
  let enhancedManager: EnhancedWorkflowStateManager;
  let mockAuditTrailService: any;

  beforeEach(() => {
    enhancedManager = new EnhancedWorkflowStateManager(undefined, new RolePermissions());
    mockAuditTrailService = auditTrailService as any;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Product Operations with Audit', () => {
    it('should create product with audit logging', () => {
      const productData = {
        name: 'Test Product',
        price: 100,
        description: 'Test Description',
      };

      const product = enhancedManager.createProductWithAudit(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        productData,
        { ipAddress: '192.168.1.1' }
      );

      expect(product.id).toBeDefined();
      expect(product.workflowState).toBe(WorkflowState.DRAFT);
      expect(product.name).toBe('Test Product');
      expect(product.price).toBe(100);
      expect(product.description).toBe('Test Description');
      expect(product.createdAt).toBeDefined();
      expect(product.updatedAt).toBeDefined();

      expect(mockAuditTrailService.createProductCreatedEntry).toHaveBeenCalledWith(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        product.id,
        productData,
        { ipAddress: '192.168.1.1' }
      );
    });

    it('should update product with enhanced audit logging', () => {
      const product: ProductWorkflow = {
        id: 'product-1',
        name: 'Old Name',
        price: 100,
        description: 'Old Description',
        workflowState: WorkflowState.DRAFT,
        workflowHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updates = {
        name: 'New Name',
        price: 150,
        description: 'New Description',
      };

      const updatedProduct = enhancedManager.updateProductWithAudit(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        product,
        updates,
        'Updated product details',
        { sessionId: 'session-123' }
      );

      expect(updatedProduct.name).toBe('New Name');
      expect(updatedProduct.price).toBe(150);
      expect(updatedProduct.description).toBe('New Description');
      expect(updatedProduct.updatedAt).toBeDefined();

      // Check that enhanced change analysis is included
      expect((updatedProduct as any)._changeAnalysis).toBeDefined();
      expect((updatedProduct as any)._changeValidation).toBeDefined();

      expect(mockAuditTrailService.createProductUpdatedEntry).toHaveBeenCalledWith(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        'product-1',
        expect.any(Array), // Basic field changes
        'Updated product details',
        expect.objectContaining({
          sessionId: 'session-123',
          enhancedChanges: expect.any(Array),
          changeAnalysis: expect.any(Object),
          changeValidation: expect.any(Object),
        })
      );
    });

    it('should delete product with audit logging', () => {
      const product: ProductWorkflow = {
        id: 'product-1',
        name: 'Test Product',
        price: 100,
        description: 'Test Description',
        workflowState: WorkflowState.DRAFT,
        workflowHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      enhancedManager.deleteProductWithAudit(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        product,
        'Product no longer needed',
        { ipAddress: '192.168.1.1' }
      );

      expect(mockAuditTrailService.createAuditEntry).toHaveBeenCalledWith(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_DELETED,
        'product-1',
        [
          { field: 'id', oldValue: 'product-1', newValue: null },
          { field: 'name', oldValue: 'Test Product', newValue: null },
          { field: 'price', oldValue: 100, newValue: null },
          { field: 'description', oldValue: 'Test Description', newValue: null },
          { field: 'workflowState', oldValue: WorkflowState.DRAFT, newValue: null },
          { field: 'workflowHistory', oldValue: [], newValue: null },
          { field: 'createdAt', oldValue: product.createdAt, newValue: null },
          { field: 'updatedAt', oldValue: product.updatedAt, newValue: null },
        ],
        'Product no longer needed',
        { ipAddress: '192.168.1.1' }
      );
    });
  });

  describe('Reviewer Operations with Audit', () => {
    it('should assign reviewer with audit logging', () => {
      const product: ProductWorkflow = {
        id: 'product-1',
        name: 'Test Product',
        workflowState: WorkflowState.REVIEW,
        workflowHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedProduct = enhancedManager.assignReviewerWithAudit(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        product,
        'reviewer-1',
        'Assigned reviewer for review',
        { ipAddress: '192.168.1.1' }
      );

      expect(updatedProduct.assignedReviewerId).toBe('reviewer-1');
      expect(updatedProduct.updatedAt).toBeDefined();

      expect(mockAuditTrailService.createReviewerAssignmentEntry).toHaveBeenCalledWith(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'product-1',
        'reviewer-1',
        true,
        'Assigned reviewer for review',
        { ipAddress: '192.168.1.1' }
      );
    });

    it('should unassign reviewer with audit logging', () => {
      const product: ProductWorkflow = {
        id: 'product-1',
        name: 'Test Product',
        workflowState: WorkflowState.REVIEW,
        assignedReviewerId: 'reviewer-1',
        workflowHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedProduct = enhancedManager.unassignReviewerWithAudit(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        product,
        'Unassigned reviewer',
        { ipAddress: '192.168.1.1' }
      );

      expect(updatedProduct.assignedReviewerId).toBeUndefined();
      expect(updatedProduct.updatedAt).toBeDefined();

      expect(mockAuditTrailService.createReviewerAssignmentEntry).toHaveBeenCalledWith(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'product-1',
        'reviewer-1',
        false,
        'Unassigned reviewer',
        { ipAddress: '192.168.1.1' }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle product update with no changes', () => {
      const product: ProductWorkflow = {
        id: 'product-1',
        name: 'Test Product',
        price: 100,
        workflowState: WorkflowState.DRAFT,
        workflowHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updates = {
        name: 'Test Product', // Same value
        price: 100, // Same value
      };

      const updatedProduct = enhancedManager.updateProductWithAudit(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        product,
        updates,
        'No changes made'
      );

      expect(updatedProduct.name).toBe('Test Product');
      expect(updatedProduct.price).toBe(100);
      expect(updatedProduct.updatedAt).toBeDefined();

      // Should create audit entry even for no changes (enhanced tracking always tracks)
      expect(mockAuditTrailService.createProductUpdatedEntry).toHaveBeenCalledWith(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        'product-1',
        [], // No basic field changes
        'No changes made',
        expect.objectContaining({
          enhancedChanges: [],
          changeAnalysis: expect.any(Object),
          changeValidation: expect.any(Object),
        })
      );
    });

    it('should handle product update with partial changes', () => {
      const product: ProductWorkflow = {
        id: 'product-1',
        name: 'Test Product',
        price: 100,
        description: 'Test Description',
        workflowState: WorkflowState.DRAFT,
        workflowHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updates = {
        name: 'New Name', // Changed
        price: 100, // Same value
        description: 'New Description', // Changed
      };

      const updatedProduct = enhancedManager.updateProductWithAudit(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        product,
        updates,
        'Partial update'
      );

      expect(updatedProduct.name).toBe('New Name');
      expect(updatedProduct.price).toBe(100);
      expect(updatedProduct.description).toBe('New Description');

      expect(mockAuditTrailService.createProductUpdatedEntry).toHaveBeenCalledWith(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        'product-1',
        expect.any(Array), // Basic field changes
        'Partial update',
        expect.objectContaining({
          enhancedChanges: expect.any(Array),
          changeAnalysis: expect.any(Object),
          changeValidation: expect.any(Object),
        })
      );
    });
  });
});
