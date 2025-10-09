/**
 * Bulk State Change Service
 * 
 * Handles bulk workflow state changes with role-based permissions
 */

import { Product } from '@/types/product';
import { WorkflowState, WorkflowAction, UserRole } from '@/types/workflow';

/**
 * Bulk state change request
 */
export interface BulkStateChangeRequest {
  productIds: string[];
  targetState: WorkflowState;
  userId: string;
  userName: string;
  userRole: UserRole;
  reason?: string;
  comment?: string;
  notifyUsers?: boolean;
  bypassValidation?: boolean;
}

/**
 * Bulk state change result
 */
export interface BulkStateChangeResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  successfulIds: string[];
  failedIds: string[];
  skippedIds: string[];
  errors: Array<{
    productId: string;
    productName: string;
    error: string;
    errorCode: string;
  }>;
  executionTime: number;
}

/**
 * State change validation result
 */
export interface StateChangeValidationResult {
  valid: boolean;
  productId: string;
  productName: string;
  currentState: WorkflowState;
  targetState: WorkflowState;
  error?: string;
  errorCode?: string;
  canChange: boolean;
  warnings?: string[];
}

/**
 * Allowed state transitions by role
 */
const ROLE_STATE_PERMISSIONS: Record<UserRole, WorkflowState[]> = {
  [UserRole.ADMIN]: [
    WorkflowState.DRAFT,
    WorkflowState.REVIEW,
    WorkflowState.APPROVED,
    WorkflowState.PUBLISHED,
    WorkflowState.REJECTED,
  ],
  [UserRole.EDITOR]: [
    WorkflowState.DRAFT,
    WorkflowState.REVIEW, // Can submit for review
  ],
  [UserRole.REVIEWER]: [
    WorkflowState.APPROVED,
    WorkflowState.REJECTED,
  ],
  [UserRole.VIEWER]: [], // Cannot change states
};

/**
 * Valid state transitions
 */
const VALID_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  [WorkflowState.DRAFT]: [WorkflowState.REVIEW],
  [WorkflowState.REVIEW]: [WorkflowState.APPROVED, WorkflowState.REJECTED],
  [WorkflowState.APPROVED]: [WorkflowState.PUBLISHED, WorkflowState.REVIEW],
  [WorkflowState.PUBLISHED]: [WorkflowState.REVIEW], // Can unpublish
  [WorkflowState.REJECTED]: [WorkflowState.DRAFT], // Auto-transition or manual
};

/**
 * Bulk State Change Service
 */
export class BulkStateChangeService {
  /**
   * Validate bulk state change request
   */
  validateBulkStateChange(
    products: Product[],
    request: BulkStateChangeRequest
  ): StateChangeValidationResult[] {
    const results: StateChangeValidationResult[] = [];

    products.forEach(product => {
      const validation = this.validateSingleStateChange(product, request);
      results.push(validation);
    });

    return results;
  }

  /**
   * Validate single product state change
   */
  private validateSingleStateChange(
    product: Product,
    request: BulkStateChangeRequest
  ): StateChangeValidationResult {
    const currentState = product.workflowState || WorkflowState.DRAFT;
    
    const result: StateChangeValidationResult = {
      valid: true,
      productId: product.id,
      productName: product.name,
      currentState,
      targetState: request.targetState,
      canChange: true,
      warnings: [],
    };

    // Check user permissions
    if (!this.hasPermissionForTargetState(request.userRole, request.targetState)) {
      result.valid = false;
      result.canChange = false;
      result.error = `User role ${request.userRole} cannot set products to ${request.targetState} state`;
      result.errorCode = 'PERMISSION_DENIED';
      return result;
    }

    // Check if transition is valid
    if (!this.isValidTransition(currentState, request.targetState)) {
      result.valid = false;
      result.canChange = false;
      result.error = `Cannot transition from ${currentState} to ${request.targetState}`;
      result.errorCode = 'INVALID_TRANSITION';
      return result;
    }

    // Additional validation for specific states
    if (request.targetState === WorkflowState.REJECTED && (!request.reason || request.reason.trim() === '')) {
      result.valid = false;
      result.canChange = false;
      result.error = 'Rejection reason is required';
      result.errorCode = 'MISSING_REASON';
      return result;
    }

    // Warnings
    if (request.targetState === WorkflowState.PUBLISHED && (!product.images || product.images.length === 0)) {
      result.warnings?.push('Product has no images');
    }

    if (request.targetState === WorkflowState.PUBLISHED && (!product.description || product.description.trim() === '')) {
      result.warnings?.push('Product description is empty');
    }

    return result;
  }

  /**
   * Execute bulk state change
   */
  async executeBulkStateChange(
    products: Product[],
    request: BulkStateChangeRequest
  ): Promise<BulkStateChangeResult> {
    const startTime = Date.now();
    const result: BulkStateChangeResult = {
      totalRequested: request.productIds.length,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      successfulIds: [],
      failedIds: [],
      skippedIds: [],
      errors: [],
      executionTime: 0,
    };

    // Validate request
    if (!request.bypassValidation) {
      const validations = this.validateBulkStateChange(products, request);
      
      validations.forEach(validation => {
        if (!validation.valid) {
          result.failureCount++;
          result.failedIds.push(validation.productId);
          result.errors.push({
            productId: validation.productId,
            productName: validation.productName,
            error: validation.error || 'Validation failed',
            errorCode: validation.errorCode || 'VALIDATION_ERROR',
          });
        }
      });
    }

    // Process state changes
    for (const productId of request.productIds) {
      const product = products.find(p => p.id === productId);
      
      if (!product) {
        result.skippedCount++;
        result.skippedIds.push(productId);
        continue;
      }

      // Skip if already failed validation
      if (result.failedIds.includes(productId)) {
        continue;
      }

      try {
        // Change product state
        await this.changeProductState(product, request);
        result.successCount++;
        result.successfulIds.push(productId);
      } catch (error) {
        result.failureCount++;
        result.failedIds.push(productId);
        result.errors.push({
          productId: product.id,
          productName: product.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'STATE_CHANGE_ERROR',
        });
      }
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * Change single product state
   */
  private async changeProductState(
    product: Product,
    request: BulkStateChangeRequest
  ): Promise<void> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));

    // In a real implementation, this would:
    // 1. Update product state
    // 2. Record audit trail
    // 3. Send notifications if requested
    // 4. Handle auto-transitions (e.g., REJECTED -> DRAFT)
    
    console.log(`Changed product ${product.id} from ${product.workflowState} to ${request.targetState} by ${request.userName}`);
  }

  /**
   * Check if user has permission for target state
   */
  private hasPermissionForTargetState(role: UserRole, targetState: WorkflowState): boolean {
    return ROLE_STATE_PERMISSIONS[role]?.includes(targetState) || false;
  }

  /**
   * Check if state transition is valid
   */
  private isValidTransition(currentState: WorkflowState, targetState: WorkflowState): boolean {
    // Allow staying in same state
    if (currentState === targetState) {
      return true;
    }

    return VALID_TRANSITIONS[currentState]?.includes(targetState) || false;
  }

  /**
   * Get allowed transitions for current state and role
   */
  getAllowedTransitions(currentState: WorkflowState, userRole: UserRole): WorkflowState[] {
    const validTransitions = VALID_TRANSITIONS[currentState] || [];
    const rolePermissions = ROLE_STATE_PERMISSIONS[userRole] || [];
    
    return validTransitions.filter(state => rolePermissions.includes(state));
  }

  /**
   * Get state change statistics
   */
  getStateChangeStatistics(result: BulkStateChangeResult): {
    successRate: number;
    failureRate: number;
    averageTimePerProduct: number;
  } {
    const total = result.totalRequested;
    
    return {
      successRate: total > 0 ? result.successCount / total : 0,
      failureRate: total > 0 ? result.failureCount / total : 0,
      averageTimePerProduct: total > 0 ? result.executionTime / total : 0,
    };
  }
}

/**
 * Default bulk state change service instance
 */
export const bulkStateChangeService = new BulkStateChangeService();

export default BulkStateChangeService;
