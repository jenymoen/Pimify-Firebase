import { 
  AuditTrailService, 
  AuditTrailAction, 
  AuditTrailPriority,
  EnhancedAuditTrailEntry 
} from '../audit-trail-service';
import { UserRole, WorkflowState, FieldChange } from '../../types/workflow';

describe('AuditTrailService', () => {
  let service: AuditTrailService;

  beforeEach(() => {
    service = new AuditTrailService({
      maxEntries: 1000,
      defaultRetentionDays: 365,
      enableIntegrityChecking: true,
      enableArchiving: true,
      archiveThreshold: 100,
    });
  });

  afterEach(() => {
    service.clearAllEntries();
  });

  describe('Basic Audit Entry Creation', () => {
    it('should create a basic audit entry', () => {
      const entry = service.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_CREATED,
        'product-1',
        [],
        'Product created',
        { ipAddress: '192.168.1.1' }
      );

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.userId).toBe('user-1');
      expect(entry.userRole).toBe(UserRole.ADMIN);
      expect(entry.userEmail).toBe('admin@example.com');
      expect(entry.action).toBe(AuditTrailAction.PRODUCT_CREATED);
      expect(entry.productId).toBe('product-1');
      expect(entry.reason).toBe('Product created');
      expect(entry.priority).toBe(AuditTrailPriority.MEDIUM);
      expect(entry.ipAddress).toBe('192.168.1.1');
      expect(entry.immutable).toBe(true);
      expect(entry.archived).toBe(false);
      expect(entry.retentionDays).toBe(365);
      expect(entry.expiresAt).toBeInstanceOf(Date);
    });

    it('should calculate correct priority for different actions', () => {
      const criticalEntry = service.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_DELETED,
        'product-1'
      );
      expect(criticalEntry.priority).toBe(AuditTrailPriority.CRITICAL);

      const highEntry = service.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.STATE_TRANSITION,
        'product-1'
      );
      expect(highEntry.priority).toBe(AuditTrailPriority.HIGH);

      const mediumEntry = service.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_CREATED,
        'product-1'
      );
      expect(mediumEntry.priority).toBe(AuditTrailPriority.MEDIUM);
    });

    it('should calculate high priority for sensitive field changes', () => {
      const sensitiveFieldChanges: FieldChange[] = [
        { field: 'price', oldValue: 100, newValue: 150 },
        { field: 'name', oldValue: 'Old Name', newValue: 'New Name' },
      ];

      const entry = service.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_UPDATED,
        'product-1',
        sensitiveFieldChanges
      );

      expect(entry.priority).toBe(AuditTrailPriority.HIGH);
    });

    it('should generate integrity hash when enabled', () => {
      const entry = service.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_CREATED,
        'product-1'
      );

      expect(entry.integrityHash).toBeDefined();
      expect(entry.integrityHash).toMatch(/^[a-zA-Z0-9]{16}$/);
    });
  });

  describe('Specialized Audit Entry Creation', () => {
    it('should create product created entry', () => {
      const productData = {
        name: 'Test Product',
        price: 100,
        description: 'Test Description',
      };

      const entry = service.createProductCreatedEntry(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        'product-1',
        productData,
        { ipAddress: '192.168.1.1' }
      );

      expect(entry.action).toBe(AuditTrailAction.PRODUCT_CREATED);
      expect(entry.productId).toBe('product-1');
      expect(entry.fieldChanges).toHaveLength(3);
      expect(entry.fieldChanges[0]).toEqual({
        field: 'name',
        oldValue: null,
        newValue: 'Test Product',
      });
    });

    it('should create product updated entry', () => {
      const fieldChanges: FieldChange[] = [
        { field: 'name', oldValue: 'Old Name', newValue: 'New Name' },
        { field: 'price', oldValue: 100, newValue: 150 },
      ];

      const entry = service.createProductUpdatedEntry(
        'user-1',
        UserRole.EDITOR,
        'editor@example.com',
        'product-1',
        fieldChanges,
        'Updated product details'
      );

      expect(entry.action).toBe(AuditTrailAction.PRODUCT_UPDATED);
      expect(entry.productId).toBe('product-1');
      expect(entry.fieldChanges).toEqual(fieldChanges);
      expect(entry.reason).toBe('Updated product details');
    });

    it('should create state transition entry', () => {
      const entry = service.createStateTransitionEntry(
        'user-1',
        UserRole.REVIEWER,
        'reviewer@example.com',
        'product-1',
        WorkflowState.REVIEW,
        WorkflowState.APPROVED,
        'Product approved after review'
      );

      expect(entry.action).toBe(AuditTrailAction.STATE_TRANSITION);
      expect(entry.productId).toBe('product-1');
      expect(entry.fieldChanges).toHaveLength(1);
      expect(entry.fieldChanges[0]).toEqual({
        field: 'workflowState',
        oldValue: WorkflowState.REVIEW,
        newValue: WorkflowState.APPROVED,
      });
      expect(entry.reason).toBe('Product approved after review');
    });

    it('should create reviewer assignment entry', () => {
      const entry = service.createReviewerAssignmentEntry(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'product-1',
        'reviewer-1',
        true,
        'Assigned reviewer for product review'
      );

      expect(entry.action).toBe(AuditTrailAction.REVIEWER_ASSIGNED);
      expect(entry.productId).toBe('product-1');
      expect(entry.fieldChanges).toHaveLength(1);
      expect(entry.fieldChanges[0]).toEqual({
        field: 'assignedReviewerId',
        oldValue: null,
        newValue: 'reviewer-1',
      });
      expect(entry.reason).toBe('Assigned reviewer for product review');
    });

    it('should create reviewer unassignment entry', () => {
      const entry = service.createReviewerAssignmentEntry(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'product-1',
        'reviewer-1',
        false,
        'Unassigned reviewer'
      );

      expect(entry.action).toBe(AuditTrailAction.REVIEWER_UNASSIGNED);
      expect(entry.fieldChanges[0]).toEqual({
        field: 'assignedReviewerId',
        oldValue: 'reviewer-1',
        newValue: null,
      });
    });

    it('should create bulk operation entry', () => {
      const productIds = ['product-1', 'product-2', 'product-3'];
      const results = [
        { productId: 'product-1', success: true },
        { productId: 'product-2', success: true },
        { productId: 'product-3', success: false, error: 'Product not found' },
      ];

      const entry = service.createBulkOperationEntry(
        'admin-1',
        UserRole.ADMIN,
        'admin@example.com',
        'approve',
        productIds,
        results,
        'Bulk approval of products'
      );

      expect(entry.action).toBe(AuditTrailAction.BULK_OPERATION);
      expect(entry.fieldChanges).toHaveLength(1);
      expect(entry.fieldChanges[0].field).toBe('bulkOperation');
      expect(entry.metadata?.productIds).toEqual(productIds);
      expect(entry.metadata?.results).toEqual(results);
    });
  });

  describe('Audit Entry Retrieval', () => {
    beforeEach(() => {
      // Create test data
      service.createAuditEntry('user-1', UserRole.ADMIN, 'admin@example.com', AuditTrailAction.PRODUCT_CREATED, 'product-1');
      service.createAuditEntry('user-2', UserRole.EDITOR, 'editor@example.com', AuditTrailAction.PRODUCT_UPDATED, 'product-1');
      service.createAuditEntry('user-1', UserRole.ADMIN, 'admin@example.com', AuditTrailAction.PRODUCT_CREATED, 'product-2');
      service.createAuditEntry('user-3', UserRole.REVIEWER, 'reviewer@example.com', AuditTrailAction.STATE_TRANSITION, 'product-1');
    });

    it('should get all audit entries', () => {
      const entries = service.getAuditEntries();
      expect(entries).toHaveLength(4);
    });

    it('should filter entries by user ID', () => {
      const entries = service.getAuditEntries({ userId: 'user-1' });
      expect(entries).toHaveLength(2);
      expect(entries.every(entry => entry.userId === 'user-1')).toBe(true);
    });

    it('should filter entries by user role', () => {
      const entries = service.getAuditEntries({ userRole: UserRole.ADMIN });
      expect(entries).toHaveLength(2);
      expect(entries.every(entry => entry.userRole === UserRole.ADMIN)).toBe(true);
    });

    it('should filter entries by action', () => {
      const entries = service.getAuditEntries({ action: AuditTrailAction.PRODUCT_CREATED });
      expect(entries).toHaveLength(2);
      expect(entries.every(entry => entry.action === AuditTrailAction.PRODUCT_CREATED)).toBe(true);
    });

    it('should filter entries by product ID', () => {
      const entries = service.getAuditEntries({ productId: 'product-1' });
      expect(entries).toHaveLength(3);
      expect(entries.every(entry => entry.productId === 'product-1')).toBe(true);
    });

    it('should filter entries by date range', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const entries = service.getAuditEntries({
        startDate: oneHourAgo,
        endDate: now,
      });
      expect(entries).toHaveLength(4);
    });

    it('should filter entries by priority', () => {
      const entries = service.getAuditEntries({ priority: AuditTrailPriority.HIGH });
      expect(entries).toHaveLength(1); // Only state transition has high priority
      expect(entries[0].action).toBe(AuditTrailAction.STATE_TRANSITION);
    });

    it('should combine multiple filters', () => {
      const entries = service.getAuditEntries({
        userId: 'user-1',
        action: AuditTrailAction.PRODUCT_CREATED,
      });
      expect(entries).toHaveLength(2);
    });

    it('should sort entries by timestamp', () => {
      const entries = service.getAuditEntries(undefined, {
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });
      
      expect(entries).toHaveLength(4);
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].timestamp.getTime()).toBeGreaterThanOrEqual(entries[i + 1].timestamp.getTime());
      }
    });

    it('should apply pagination', () => {
      const entries = service.getAuditEntries(undefined, {
        limit: 2,
        offset: 1,
      });
      
      expect(entries).toHaveLength(2);
    });

    it('should exclude field changes when not requested', () => {
      const entries = service.getAuditEntries(undefined, {
        includeFieldChanges: false,
      });
      
      expect(entries.every(entry => entry.fieldChanges.length === 0)).toBe(true);
    });

    it('should exclude metadata when not requested', () => {
      const entries = service.getAuditEntries(undefined, {
        includeMetadata: false,
      });
      
      expect(entries.every(entry => entry.metadata === undefined)).toBe(true);
    });
  });

  describe('Product and User Audit Trails', () => {
    beforeEach(() => {
      service.createAuditEntry('user-1', UserRole.ADMIN, 'admin@example.com', AuditTrailAction.PRODUCT_CREATED, 'product-1');
      service.createAuditEntry('user-2', UserRole.EDITOR, 'editor@example.com', AuditTrailAction.PRODUCT_UPDATED, 'product-1');
      service.createAuditEntry('user-1', UserRole.ADMIN, 'admin@example.com', AuditTrailAction.PRODUCT_CREATED, 'product-2');
    });

    it('should get audit trail for specific product', () => {
      const entries = service.getProductAuditTrail('product-1');
      expect(entries).toHaveLength(2);
      expect(entries.every(entry => entry.productId === 'product-1')).toBe(true);
    });

    it('should get audit trail for specific user', () => {
      const entries = service.getUserAuditTrail('user-1');
      expect(entries).toHaveLength(2);
      expect(entries.every(entry => entry.userId === 'user-1')).toBe(true);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Create diverse test data
      service.createAuditEntry('user-1', UserRole.ADMIN, 'admin@example.com', AuditTrailAction.PRODUCT_CREATED, 'product-1');
      service.createAuditEntry('user-2', UserRole.EDITOR, 'editor@example.com', AuditTrailAction.PRODUCT_UPDATED, 'product-1');
      service.createAuditEntry('user-1', UserRole.ADMIN, 'admin@example.com', AuditTrailAction.PRODUCT_CREATED, 'product-2');
      service.createAuditEntry('user-3', UserRole.REVIEWER, 'reviewer@example.com', AuditTrailAction.STATE_TRANSITION, 'product-1');
      service.createAuditEntry('user-1', UserRole.ADMIN, 'admin@example.com', AuditTrailAction.PRODUCT_DELETED, 'product-3');
    });

    it('should calculate correct statistics', () => {
      const stats = service.getStatistics();
      
      expect(stats.totalEntries).toBe(5);
      expect(stats.byAction[AuditTrailAction.PRODUCT_CREATED]).toBe(2);
      expect(stats.byAction[AuditTrailAction.PRODUCT_UPDATED]).toBe(1);
      expect(stats.byAction[AuditTrailAction.STATE_TRANSITION]).toBe(1);
      expect(stats.byAction[AuditTrailAction.PRODUCT_DELETED]).toBe(1);
      
      expect(stats.byUser['user-1']).toBe(3);
      expect(stats.byUser['user-2']).toBe(1);
      expect(stats.byUser['user-3']).toBe(1);
      
      expect(stats.byPriority[AuditTrailPriority.CRITICAL]).toBe(1); // Product deleted
      expect(stats.byPriority[AuditTrailPriority.HIGH]).toBe(1); // State transition
      expect(stats.byPriority[AuditTrailPriority.MEDIUM]).toBe(3); // Others
      
      expect(stats.topUsers).toHaveLength(3);
      expect(stats.topUsers[0].userId).toBe('user-1');
      expect(stats.topUsers[0].count).toBe(3);
      
      expect(stats.topActions).toHaveLength(4);
      expect(stats.topActions[0].action).toBe(AuditTrailAction.PRODUCT_CREATED);
      expect(stats.topActions[0].count).toBe(2);
    });
  });

  describe('Export Functionality', () => {
    beforeEach(() => {
      service.createAuditEntry('user-1', UserRole.ADMIN, 'admin@example.com', AuditTrailAction.PRODUCT_CREATED, 'product-1');
      service.createAuditEntry('user-2', UserRole.EDITOR, 'editor@example.com', AuditTrailAction.PRODUCT_UPDATED, 'product-1');
    });

    it('should export to JSON format', () => {
      const json = service.exportAuditTrail({
        format: 'json',
        includeFieldChanges: true,
        includeMetadata: true,
      });

      const data = JSON.parse(json);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('timestamp');
      expect(data[0]).toHaveProperty('userId');
      expect(data[0]).toHaveProperty('action');
    });

    it('should export to CSV format', () => {
      const csv = service.exportAuditTrail({
        format: 'csv',
        includeFieldChanges: true,
      });

      const lines = csv.split('\n');
      expect(lines).toHaveLength(3); // Header + 2 data rows
      expect(lines[0]).toContain('ID,Timestamp,User ID');
      expect(lines[0]).toContain('Field Changes');
    });

    it('should export to XML format', () => {
      const xml = service.exportAuditTrail({
        format: 'xml',
        includeMetadata: true,
      });

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<auditTrail>');
      expect(xml).toContain('<entry>');
      expect(xml).toContain('<id>');
      expect(xml).toContain('<timestamp>');
      expect(xml).toContain('<userId>');
    });

    it('should export to PDF format', () => {
      const pdf = service.exportAuditTrail({
        format: 'pdf',
      });

      expect(pdf).toContain('AUDIT TRAIL REPORT');
      expect(pdf).toContain('Total Entries: 2');
    });

    it('should apply filters during export', () => {
      const json = service.exportAuditTrail({
        format: 'json',
        filters: { userId: 'user-1' },
      });

      const data = JSON.parse(json);
      expect(data).toHaveLength(1);
      expect(data[0].userId).toBe('user-1');
    });
  });

  describe('Archive and Cleanup', () => {
    it('should archive old entries', () => {
      // Create an old entry by manually setting timestamp
      const entry = service.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_CREATED,
        'product-1'
      );
      
      // Manually set timestamp to be old
      (entry as any).timestamp = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000); // 400 days ago
      
      const archivedCount = service.archiveOldEntries(365); // Archive entries older than 1 year
      expect(archivedCount).toBe(1);
      expect(entry.archived).toBe(true);
      expect(entry.archivedAt).toBeInstanceOf(Date);
    });

    it('should clean up expired entries', () => {
      // Create an entry with short retention
      const entry = service.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_CREATED,
        'product-1'
      );
      
      // Manually set expiration to past date
      (entry as any).expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      
      const removedCount = service.cleanupExpiredEntries();
      expect(removedCount).toBe(1);
      
      const entries = service.getAuditEntries();
      expect(entries).toHaveLength(0);
    });
  });

  describe('Integrity Verification', () => {
    it('should verify integrity of entries', () => {
      service.createAuditEntry('user-1', UserRole.ADMIN, 'admin@example.com', AuditTrailAction.PRODUCT_CREATED, 'product-1');
      service.createAuditEntry('user-2', UserRole.EDITOR, 'editor@example.com', AuditTrailAction.PRODUCT_UPDATED, 'product-1');
      
      const results = service.verifyIntegrity();
      expect(results).toHaveLength(2);
      expect(results.every(result => result.valid)).toBe(true);
    });

    it('should detect integrity violations', () => {
      const entry = service.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_CREATED,
        'product-1'
      );
      
      // Manually corrupt the integrity hash
      (entry as any).integrityHash = 'corrupted_hash';
      
      const results = service.verifyIntegrity();
      expect(results).toHaveLength(1);
      expect(results[0].valid).toBe(false);
      expect(results[0].error).toBe('Integrity hash mismatch');
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customService = new AuditTrailService({
        maxEntries: 500,
        defaultRetentionDays: 180,
        enableIntegrityChecking: false,
        enableArchiving: false,
        archiveThreshold: 50,
      });

      const entry = customService.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_CREATED,
        'product-1'
      );

      expect(entry.integrityHash).toBeUndefined();
      expect(entry.retentionDays).toBe(180);
    });
  });

  describe('Edge Cases', () => {
    it('should handle entries without product ID', () => {
      const entry = service.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.BULK_OPERATION
      );

      expect(entry.productId).toBeUndefined();
      expect(entry.action).toBe(AuditTrailAction.BULK_OPERATION);
    });

    it('should handle entries without field changes', () => {
      const entry = service.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_CREATED,
        'product-1'
      );

      expect(entry.fieldChanges).toEqual([]);
    });

    it('should handle entries without reason', () => {
      const entry = service.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_CREATED,
        'product-1'
      );

      expect(entry.reason).toBeUndefined();
    });

    it('should handle entries without metadata', () => {
      const entry = service.createAuditEntry(
        'user-1',
        UserRole.ADMIN,
        'admin@example.com',
        AuditTrailAction.PRODUCT_CREATED,
        'product-1'
      );

      expect(entry.metadata).toBeUndefined();
    });
  });
});
