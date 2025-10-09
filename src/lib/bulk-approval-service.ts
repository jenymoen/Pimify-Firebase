/**
 * Bulk Approval Service
 * 
 * Handles bulk approval operations for products in review state
 */

import { Product } from '@/types/product';
import { WorkflowState, WorkflowAction, UserRole } from '@/types/workflow';

/**
 * Bulk approval request
 */
export interface BulkApprovalRequest {
  productIds: string[];
  approverId: string;
  approverName: string;
  approverRole: UserRole;
  comment?: string;
  notifyUsers?: boolean;
  bypassValidation?: boolean;
}

/**
 * Bulk approval result
 */
export interface BulkApprovalResult {
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
 * Approval validation result
 */
export interface ApprovalValidationResult {
  valid: boolean;
  productId: string;
  productName: string;
  error?: string;
  errorCode?: string;
  canApprove: boolean;
  warnings?: string[];
}

/**
 * Bulk Approval Service
 */
export class BulkApprovalService {
  /**
   * Validate bulk approval request
   */
  validateBulkApproval(
    products: Product[],
    request: BulkApprovalRequest
  ): ApprovalValidationResult[] {
    const results: ApprovalValidationResult[] = [];

    products.forEach(product => {
      const validation = this.validateSingleApproval(product, request);
      results.push(validation);
    });

    return results;
  }

  /**
   * Validate single product approval
   */
  private validateSingleApproval(
    product: Product,
    request: BulkApprovalRequest
  ): ApprovalValidationResult {
    const result: ApprovalValidationResult = {
      valid: true,
      productId: product.id,
      productName: product.name,
      canApprove: true,
      warnings: [],
    };

    // Check user permissions first
    if (!this.hasApprovalPermission(request.approverRole)) {
      result.valid = false;
      result.canApprove = false;
      result.error = 'User does not have approval permissions';
      result.errorCode = 'PERMISSION_DENIED';
      return result;
    }

    // Check if product is in review state
    if (product.workflowState !== WorkflowState.REVIEW) {
      result.valid = false;
      result.canApprove = false;
      result.error = `Product is in ${product.workflowState} state, not in review`;
      result.errorCode = 'INVALID_STATE';
      return result;
    }

    // Check if product has required data
    if (!product.name || product.name.trim() === '') {
      result.warnings?.push('Product name is empty');
    }

    if (!product.images || product.images.length === 0) {
      result.warnings?.push('Product has no images');
    }

    if (!product.description || product.description.trim() === '') {
      result.warnings?.push('Product description is empty');
    }

    return result;
  }

  /**
   * Execute bulk approval
   */
  async executeBulkApproval(
    products: Product[],
    request: BulkApprovalRequest
  ): Promise<BulkApprovalResult> {
    const startTime = Date.now();
    const result: BulkApprovalResult = {
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
      const validations = this.validateBulkApproval(products, request);
      
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

    // Process approvals
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
        // Approve product
        await this.approveProduct(product, request);
        result.successCount++;
        result.successfulIds.push(productId);
      } catch (error) {
        result.failureCount++;
        result.failedIds.push(productId);
        result.errors.push({
          productId: product.id,
          productName: product.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'APPROVAL_ERROR',
        });
      }
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * Approve single product
   */
  private async approveProduct(
    product: Product,
    request: BulkApprovalRequest
  ): Promise<void> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));

    // In a real implementation, this would:
    // 1. Update product state to APPROVED
    // 2. Record audit trail
    // 3. Send notifications if requested
    // 4. Update product metadata
    
    // For testing purposes, we'll just log
    console.log(`Approved product ${product.id} by ${request.approverName}`);
  }

  /**
   * Check if user has approval permission
   */
  private hasApprovalPermission(role: UserRole): boolean {
    return role === UserRole.ADMIN || role === UserRole.REVIEWER;
  }

  /**
   * Get approval statistics
   */
  getApprovalStatistics(result: BulkApprovalResult): {
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
 * Default bulk approval service instance
 */
export const bulkApprovalService = new BulkApprovalService();

export default BulkApprovalService;
