import { auditTrailService, AuditTrailAction } from './audit-trail-service';
import { WorkflowStateManager, StateTransitionRequest, StateTransitionResult } from './workflow-state-manager';
import { RolePermissions, PermissionCheckContext } from './role-permissions';
import { fieldChangeTracker, EnhancedFieldChange } from './field-change-tracker';
import { 
  WorkflowState, 
  UserRole, 
  ProductWorkflow, 
  AuditTrailEntry, 
  FieldChange 
} from '../types/workflow';

/**
 * Audit Trail Integration Service
 * Integrates the AuditTrailService with workflow and permission systems
 */
export class AuditTrailIntegration {
  private workflowStateManager: WorkflowStateManager;
  private rolePermissions: RolePermissions;

  constructor(
    workflowStateManager: WorkflowStateManager,
    rolePermissions: RolePermissions
  ) {
    this.workflowStateManager = workflowStateManager;
    this.rolePermissions = rolePermissions;
    
    // Set up audit trail callback for workflow state manager
    this.workflowStateManager.setAuditTrailCallback(this.handleWorkflowAuditEntry.bind(this));
  }

  /**
   * Handle audit entries from workflow state manager
   */
  private handleWorkflowAuditEntry(entry: AuditTrailEntry): void {
    // Convert legacy audit entry to enhanced audit entry
    const enhancedEntry = auditTrailService.createAuditEntry(
      entry.userId,
      entry.userRole,
      entry.userEmail,
      entry.action,
      entry.productId,
      entry.fieldChanges,
      entry.reason,
      {
        ipAddress: entry.metadata?.ipAddress,
        userAgent: entry.metadata?.userAgent,
        sessionId: entry.metadata?.sessionId,
        requestId: entry.metadata?.requestId,
        workflowState: entry.metadata?.workflowState,
        targetWorkflowState: entry.metadata?.targetWorkflowState,
        resourceType: entry.metadata?.resourceType,
      }
    );
  }

  /**
   * Create audit entry for product creation
   */
  createProductAuditEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    productId: string,
    productData: Record<string, any>,
    metadata?: Record<string, any>
  ): void {
    auditTrailService.createProductCreatedEntry(
      userId,
      userRole,
      userEmail,
      productId,
      productData,
      metadata
    );
  }

  /**
   * Create audit entry for product update with enhanced field change tracking
   */
  createProductUpdateAuditEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    productId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    reason?: string,
    metadata?: Record<string, any>
  ): EnhancedFieldChange[] {
    // Use enhanced field change tracker
    const enhancedChanges = fieldChangeTracker.trackFieldChanges(
      productId,
      oldData,
      newData,
      {
        userId,
        userRole,
        action: 'product_update',
        source: metadata?.source,
        automatic: metadata?.automatic,
      }
    );

    // Convert enhanced changes to basic field changes for audit trail
    const basicFieldChanges: FieldChange[] = enhancedChanges.map(change => ({
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
    }));

    auditTrailService.createProductUpdatedEntry(
      userId,
      userRole,
      userEmail,
      productId,
      basicFieldChanges,
      reason,
      {
        ...metadata,
        enhancedChanges: enhancedChanges,
        changeAnalysis: fieldChangeTracker.analyzeFieldChanges(enhancedChanges),
        changeValidation: fieldChangeTracker.validateFieldChanges(enhancedChanges),
      }
    );

    return enhancedChanges;
  }

  /**
   * Create audit entry for product deletion
   */
  createProductDeleteAuditEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    productId: string,
    productData: Record<string, any>,
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    const fieldChanges: FieldChange[] = Object.entries(productData).map(([field, value]) => ({
      field,
      oldValue: value,
      newValue: null,
    }));

    auditTrailService.createAuditEntry(
      userId,
      userRole,
      userEmail,
      AuditTrailAction.PRODUCT_DELETED,
      productId,
      fieldChanges,
      reason || 'Product deleted',
      metadata
    );
  }

  /**
   * Create audit entry for state transition
   */
  createStateTransitionAuditEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    productId: string,
    fromState: WorkflowState,
    toState: WorkflowState,
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    auditTrailService.createStateTransitionEntry(
      userId,
      userRole,
      userEmail,
      productId,
      fromState,
      toState,
      reason,
      metadata
    );
  }

  /**
   * Create audit entry for reviewer assignment
   */
  createReviewerAssignmentAuditEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    productId: string,
    reviewerId: string,
    assigned: boolean,
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    auditTrailService.createReviewerAssignmentEntry(
      userId,
      userRole,
      userEmail,
      productId,
      reviewerId,
      assigned,
      reason,
      metadata
    );
  }

  /**
   * Create audit entry for bulk operation
   */
  createBulkOperationAuditEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    action: string,
    productIds: string[],
    results: Array<{ productId: string; success: boolean; error?: string }>,
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    auditTrailService.createBulkOperationEntry(
      userId,
      userRole,
      userEmail,
      action,
      productIds,
      results,
      reason,
      metadata
    );
  }

  /**
   * Create audit entry for permission grant
   */
  createPermissionGrantAuditEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    targetUserId: string,
    permission: string,
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    const fieldChanges: FieldChange[] = [
      {
        field: 'permissions',
        oldValue: null,
        newValue: permission,
      },
    ];

    auditTrailService.createAuditEntry(
      userId,
      userRole,
      userEmail,
      AuditTrailAction.PERMISSION_GRANTED,
      targetUserId,
      fieldChanges,
      reason || `Permission granted: ${permission}`,
      metadata
    );
  }

  /**
   * Create audit entry for permission revocation
   */
  createPermissionRevokeAuditEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    targetUserId: string,
    permission: string,
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    const fieldChanges: FieldChange[] = [
      {
        field: 'permissions',
        oldValue: permission,
        newValue: null,
      },
    ];

    auditTrailService.createAuditEntry(
      userId,
      userRole,
      userEmail,
      AuditTrailAction.PERMISSION_REVOKED,
      targetUserId,
      fieldChanges,
      reason || `Permission revoked: ${permission}`,
      metadata
    );
  }

  /**
   * Create audit entry for user role change
   */
  createUserRoleChangeAuditEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    targetUserId: string,
    oldRole: UserRole,
    newRole: UserRole,
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    const fieldChanges: FieldChange[] = [
      {
        field: 'userRole',
        oldValue: oldRole,
        newValue: newRole,
      },
    ];

    auditTrailService.createAuditEntry(
      userId,
      userRole,
      userEmail,
      AuditTrailAction.USER_ROLE_CHANGED,
      targetUserId,
      fieldChanges,
      reason || `User role changed from ${oldRole} to ${newRole}`,
      metadata
    );
  }

  /**
   * Create audit entry for system configuration change
   */
  createSystemConfigChangeAuditEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    configKey: string,
    oldValue: any,
    newValue: any,
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    const fieldChanges: FieldChange[] = [
      {
        field: configKey,
        oldValue,
        newValue,
      },
    ];

    auditTrailService.createAuditEntry(
      userId,
      userRole,
      userEmail,
      AuditTrailAction.SYSTEM_CONFIG_CHANGED,
      undefined, // No specific product for system config changes
      fieldChanges,
      reason || `System configuration changed: ${configKey}`,
      metadata
    );
  }

  /**
   * Create audit entry for export operation
   */
  createExportAuditEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    exportType: string,
    productCount: number,
    filters?: Record<string, any>,
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    const fieldChanges: FieldChange[] = [
      {
        field: 'export',
        oldValue: null,
        newValue: {
          type: exportType,
          productCount,
          filters,
        },
      },
    ];

    auditTrailService.createAuditEntry(
      userId,
      userRole,
      userEmail,
      AuditTrailAction.EXPORT_PERFORMED,
      undefined, // No specific product for exports
      fieldChanges,
      reason || `Export performed: ${exportType} (${productCount} products)`,
      metadata
    );
  }

  /**
   * Create audit entry for import operation
   */
  createImportAuditEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    importType: string,
    productCount: number,
    results: Array<{ productId: string; success: boolean; error?: string }>,
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    const fieldChanges: FieldChange[] = [
      {
        field: 'import',
        oldValue: null,
        newValue: {
          type: importType,
          productCount,
          successCount: results.filter(r => r.success).length,
          failureCount: results.filter(r => !r.success).length,
        },
      },
    ];

    auditTrailService.createAuditEntry(
      userId,
      userRole,
      userEmail,
      AuditTrailAction.IMPORT_PERFORMED,
      undefined, // No specific product for imports
      fieldChanges,
      reason || `Import performed: ${importType} (${productCount} products)`,
      {
        ...metadata,
        results,
      }
    );
  }

  /**
   * Get audit trail for a specific product
   */
  getProductAuditTrail(productId: string, options?: any) {
    return auditTrailService.getProductAuditTrail(productId, options);
  }

  /**
   * Get audit trail for a specific user
   */
  getUserAuditTrail(userId: string, options?: any) {
    return auditTrailService.getUserAuditTrail(userId, options);
  }

  /**
   * Get audit trail statistics
   */
  getAuditTrailStatistics() {
    return auditTrailService.getStatistics();
  }

  /**
   * Export audit trail
   */
  exportAuditTrail(options: any) {
    return auditTrailService.exportAuditTrail(options);
  }

  /**
   * Archive old audit entries
   */
  archiveOldEntries(olderThanDays: number = 365) {
    return auditTrailService.archiveOldEntries(olderThanDays);
  }

  /**
   * Clean up expired audit entries
   */
  cleanupExpiredEntries() {
    return auditTrailService.cleanupExpiredEntries();
  }

  /**
   * Verify audit trail integrity
   */
  verifyIntegrity() {
    return auditTrailService.verifyIntegrity();
  }

  /**
   * Get enhanced field change history for a product
   */
  getProductFieldChangeHistory(
    productId: string,
    options?: {
      limit?: number;
      offset?: number;
      field?: string;
      changeType?: any;
      severity?: any;
      category?: any;
    }
  ): EnhancedFieldChange[] {
    return fieldChangeTracker.getChangeHistory(productId, options);
  }

  /**
   * Get field change statistics for a product
   */
  getProductFieldChangeStatistics(productId?: string) {
    return fieldChangeTracker.getFieldChangeStatistics(productId);
  }

  /**
   * Analyze field changes for a product
   */
  analyzeProductFieldChanges(changes: EnhancedFieldChange[]) {
    return fieldChangeTracker.analyzeFieldChanges(changes);
  }

  /**
   * Validate field changes for a product
   */
  validateProductFieldChanges(changes: EnhancedFieldChange[]) {
    return fieldChangeTracker.validateFieldChanges(changes);
  }

  /**
   * Compare field changes between two sets
   */
  compareProductFieldChanges(changes1: EnhancedFieldChange[], changes2: EnhancedFieldChange[]) {
    return fieldChangeTracker.compareFieldChanges(changes1, changes2);
  }

  /**
   * Export field changes in various formats
   */
  exportProductFieldChanges(
    changes: EnhancedFieldChange[],
    format: 'json' | 'csv' | 'xml' = 'json'
  ): string {
    return fieldChangeTracker.exportFieldChanges(changes, format);
  }
}

/**
 * Enhanced Workflow State Manager with integrated audit trail
 */
export class EnhancedWorkflowStateManager extends WorkflowStateManager {
  private auditTrailIntegration: AuditTrailIntegration;

  constructor(
    stateTransitionRules?: any,
    rolePermissions?: RolePermissions
  ) {
    super(stateTransitionRules);
    
    if (rolePermissions) {
      this.auditTrailIntegration = new AuditTrailIntegration(this, rolePermissions);
    }
  }

  /**
   * Execute state transition with enhanced audit logging
   */
  async executeStateTransitionWithAudit(
    request: StateTransitionRequest,
    product: ProductWorkflow,
    metadata?: Record<string, any>
  ): Promise<StateTransitionResult> {
    const result = await this.executeStateTransition(request, product);

    // Create enhanced audit entry if transition was successful
    if (result.success && result.auditEntry) {
      this.auditTrailIntegration.createStateTransitionAuditEntry(
        request.userId,
        request.userRole,
        result.auditEntry.userEmail,
        request.productId,
        request.fromState,
        request.toState,
        request.reason,
        metadata
      );
    }

    return result;
  }

  /**
   * Create product with audit logging
   */
  createProductWithAudit(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    productData: Record<string, any>,
    metadata?: Record<string, any>
  ): ProductWorkflow {
    const product: ProductWorkflow = {
      ...productData,
      id: productData.id || `product_${Date.now()}`,
      workflowState: WorkflowState.DRAFT,
      assignedReviewerId: undefined,
      workflowHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create audit entry for product creation
    this.auditTrailIntegration.createProductAuditEntry(
      userId,
      userRole,
      userEmail,
      product.id,
      productData,
      metadata
    );

    return product;
  }

  /**
   * Update product with enhanced audit logging
   */
  updateProductWithAudit(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    product: ProductWorkflow,
    updates: Record<string, any>,
    reason?: string,
    metadata?: Record<string, any>
  ): ProductWorkflow {
    const updatedProduct = { ...product };

    // Apply updates
    for (const [field, newValue] of Object.entries(updates)) {
      (updatedProduct as any)[field] = newValue;
    }

    // Update timestamp
    updatedProduct.updatedAt = new Date().toISOString();

    // Create enhanced audit entry for product update
    const enhancedChanges = this.auditTrailIntegration.createProductUpdateAuditEntry(
      userId,
      userRole,
      userEmail,
      product.id,
      product,
      updatedProduct,
      reason,
      metadata
    );

    // Return updated product with change analysis metadata
    return {
      ...updatedProduct,
      _changeAnalysis: fieldChangeTracker.analyzeFieldChanges(enhancedChanges),
      _changeValidation: fieldChangeTracker.validateFieldChanges(enhancedChanges),
    } as ProductWorkflow & {
      _changeAnalysis?: any;
      _changeValidation?: any;
    };
  }

  /**
   * Delete product with audit logging
   */
  deleteProductWithAudit(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    product: ProductWorkflow,
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    // Create audit entry for product deletion
    this.auditTrailIntegration.createProductDeleteAuditEntry(
      userId,
      userRole,
      userEmail,
      product.id,
      product,
      reason,
      metadata
    );
  }

  /**
   * Assign reviewer with audit logging
   */
  assignReviewerWithAudit(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    product: ProductWorkflow,
    reviewerId: string,
    reason?: string,
    metadata?: Record<string, any>
  ): ProductWorkflow {
    const updatedProduct = {
      ...product,
      assignedReviewerId: reviewerId,
      updatedAt: new Date().toISOString(),
    };

    // Create audit entry for reviewer assignment
    this.auditTrailIntegration.createReviewerAssignmentAuditEntry(
      userId,
      userRole,
      userEmail,
      product.id,
      reviewerId,
      true,
      reason,
      metadata
    );

    return updatedProduct;
  }

  /**
   * Unassign reviewer with audit logging
   */
  unassignReviewerWithAudit(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    product: ProductWorkflow,
    reason?: string,
    metadata?: Record<string, any>
  ): ProductWorkflow {
    const updatedProduct = {
      ...product,
      assignedReviewerId: undefined,
      updatedAt: new Date().toISOString(),
    };

    // Create audit entry for reviewer unassignment
    this.auditTrailIntegration.createReviewerAssignmentAuditEntry(
      userId,
      userRole,
      userEmail,
      product.id,
      product.assignedReviewerId || '',
      false,
      reason,
      metadata
    );

    return updatedProduct;
  }
}

// Export singleton instances
export const auditTrailIntegration = new AuditTrailIntegration(
  new WorkflowStateManager(),
  new RolePermissions()
);

export const enhancedWorkflowStateManager = new EnhancedWorkflowStateManager(
  undefined,
  new RolePermissions()
);
