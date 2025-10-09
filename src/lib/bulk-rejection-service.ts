/**
 * Bulk Rejection Service
 * 
 * Handles bulk rejection operations for products in review state
 */

import { Product } from '@/types/product';
import { WorkflowState, WorkflowAction, UserRole } from '@/types/workflow';

/**
 * Bulk rejection request
 */
export interface BulkRejectionRequest {
  productIds: string[];
  reviewerId: string;
  reviewerName: string;
  reviewerRole: UserRole;
  reason: string; // Required for rejection
  comment?: string;
  notifyUsers?: boolean;
  bypassValidation?: boolean;
}

/**
 * Bulk rejection result
 */
export interface BulkRejectionResult {
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
 * Rejection validation result
 */
export interface RejectionValidationResult {
  valid: boolean;
  productId: string;
  productName: string;
  error?: string;
  errorCode?: string;
  canReject: boolean;
  warnings?: string[];
}

/**
 * Bulk Rejection Service
 */
export class BulkRejectionService {
  /**
   * Validate bulk rejection request
   */
  validateBulkRejection(
    products: Product[],
    request: BulkRejectionRequest
  ): RejectionValidationResult[] {
    const results: RejectionValidationResult[] = [];

    products.forEach(product => {
      const validation = this.validateSingleRejection(product, request);
      results.push(validation);
    });

    return results;
  }

  /**
   * Validate single product rejection
   */
  private validateSingleRejection(
    product: Product,
    request: BulkRejectionRequest
  ): RejectionValidationResult {
    const result: RejectionValidationResult = {
      valid: true,
      productId: product.id,
      productName: product.name,
      canReject: true,
      warnings: [],
    };

    // Check user permissions first
    if (!this.hasRejectionPermission(request.reviewerRole)) {
      result.valid = false;
      result.canReject = false;
      result.error = 'User does not have rejection permissions';
      result.errorCode = 'PERMISSION_DENIED';
      return result;
    }

    // Check if product is in review state
    if (product.workflowState !== WorkflowState.REVIEW) {
      result.valid = false;
      result.canReject = false;
      result.error = `Product is in ${product.workflowState} state, not in review`;
      result.errorCode = 'INVALID_STATE';
      return result;
    }

    // Check if reason is provided
    if (!request.reason || request.reason.trim() === '') {
      result.valid = false;
      result.canReject = false;
      result.error = 'Rejection reason is required';
      result.errorCode = 'MISSING_REASON';
      return result;
    }

    // Warnings for incomplete data
    if (!product.name || product.name.trim() === '') {
      result.warnings?.push('Product name is empty');
    }

    return result;
  }

  /**
   * Execute bulk rejection
   */
  async executeBulkRejection(
    products: Product[],
    request: BulkRejectionRequest
  ): Promise<BulkRejectionResult> {
    const startTime = Date.now();
    const result: BulkRejectionResult = {
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
      const validations = this.validateBulkRejection(products, request);
      
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

    // Process rejections
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
        // Reject product
        await this.rejectProduct(product, request);
        result.successCount++;
        result.successfulIds.push(productId);
      } catch (error) {
        result.failureCount++;
        result.failedIds.push(productId);
        result.errors.push({
          productId: product.id,
          productName: product.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'REJECTION_ERROR',
        });
      }
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * Reject single product
   */
  private async rejectProduct(
    product: Product,
    request: BulkRejectionRequest
  ): Promise<void> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));

    // In a real implementation, this would:
    // 1. Update product state to REJECTED
    // 2. Record audit trail with reason
    // 3. Send notifications if requested
    // 4. Update product metadata
    // 5. Transition to DRAFT state (auto-transition)
    
    // For testing purposes, we'll just log
    console.log(`Rejected product ${product.id} by ${request.reviewerName}: ${request.reason}`);
  }

  /**
   * Check if user has rejection permission
   */
  private hasRejectionPermission(role: UserRole): boolean {
    return role === UserRole.ADMIN || role === UserRole.REVIEWER;
  }

  /**
   * Get rejection statistics
   */
  getRejectionStatistics(result: BulkRejectionResult): {
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
 * Default bulk rejection service instance
 */
export const bulkRejectionService = new BulkRejectionService();

export default BulkRejectionService;
