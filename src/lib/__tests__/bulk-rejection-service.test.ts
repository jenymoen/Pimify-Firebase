import {
  BulkRejectionService,
  BulkRejectionRequest,
  bulkRejectionService,
} from '../bulk-rejection-service';
import { Product } from '@/types/product';
import { WorkflowState, UserRole } from '@/types/workflow';

// Mock console.log to avoid noise
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});
afterAll(() => {
  console.log = originalConsoleLog;
});

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Product 1',
    sku: 'SKU-001',
    brand: 'Brand A',
    category: 'Category 1',
    description: 'Description 1',
    workflowState: WorkflowState.REVIEW,
    images: ['image1.jpg'],
    variants: [],
    metafields: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
  },
  {
    id: '2',
    name: 'Product 2',
    sku: 'SKU-002',
    brand: 'Brand B',
    category: 'Category 2',
    description: 'Description 2',
    workflowState: WorkflowState.REVIEW,
    images: ['image2.jpg'],
    variants: [],
    metafields: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-2',
  },
  {
    id: '3',
    name: 'Product 3',
    sku: 'SKU-003',
    brand: 'Brand A',
    category: 'Category 1',
    description: 'Description 3',
    workflowState: WorkflowState.APPROVED, // Not in review
    images: [],
    variants: [],
    metafields: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('BulkRejectionService', () => {
  let service: BulkRejectionService;

  beforeEach(() => {
    service = new BulkRejectionService();
  });

  describe('Validation', () => {
    const validRequest: BulkRejectionRequest = {
      productIds: ['1', '2'],
      reviewerId: 'reviewer-1',
      reviewerName: 'Reviewer One',
      reviewerRole: UserRole.REVIEWER,
      reason: 'Quality issues found',
    };

    it('should validate products in review state', () => {
      const validations = service.validateBulkRejection(mockProducts, validRequest);
      
      const product1Validation = validations.find(v => v.productId === '1');
      expect(product1Validation?.valid).toBe(true);
      expect(product1Validation?.canReject).toBe(true);
    });

    it('should reject products not in review state', () => {
      const validations = service.validateBulkRejection(mockProducts, {
        ...validRequest,
        productIds: ['3'], // Product in APPROVED state
      });
      
      const product3Validation = validations.find(v => v.productId === '3');
      expect(product3Validation?.valid).toBe(false);
      expect(product3Validation?.canReject).toBe(false);
      expect(product3Validation?.errorCode).toBe('INVALID_STATE');
    });

    it('should reject requests without reason', () => {
      const invalidRequest = {
        ...validRequest,
        reason: '',
      };

      // Only validate products in REVIEW state
      const reviewProducts = mockProducts.filter(p => p.workflowState === WorkflowState.REVIEW);
      const validations = service.validateBulkRejection(reviewProducts, invalidRequest);
      
      validations.forEach(validation => {
        expect(validation.valid).toBe(false);
        expect(validation.errorCode).toBe('MISSING_REASON');
      });
    });

    it('should reject requests from users without rejection permission', () => {
      const invalidRequest = {
        ...validRequest,
        reviewerRole: UserRole.VIEWER,
      };

      const validations = service.validateBulkRejection(mockProducts, invalidRequest);
      
      validations.forEach(validation => {
        expect(validation.valid).toBe(false);
        expect(validation.errorCode).toBe('PERMISSION_DENIED');
      });
    });

    it('should allow admin to reject', () => {
      const adminRequest = {
        ...validRequest,
        reviewerRole: UserRole.ADMIN,
      };

      const validations = service.validateBulkRejection([mockProducts[0]], adminRequest);
      
      expect(validations[0].valid).toBe(true);
      expect(validations[0].canReject).toBe(true);
    });

    it('should warn about missing product data', () => {
      const productWithMissingData: Product = {
        ...mockProducts[0],
        name: '',
      };

      const validations = service.validateBulkRejection([productWithMissingData], validRequest);
      
      expect(validations[0].warnings).toBeDefined();
      expect(validations[0].warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('Execute Bulk Rejection', () => {
    const validRequest: BulkRejectionRequest = {
      productIds: ['1', '2'],
      reviewerId: 'reviewer-1',
      reviewerName: 'Reviewer One',
      reviewerRole: UserRole.REVIEWER,
      reason: 'Quality issues found',
    };

    it('should reject valid products', async () => {
      const result = await service.executeBulkRejection(mockProducts, validRequest);
      
      expect(result.totalRequested).toBe(2);
      expect(result.successCount).toBeGreaterThanOrEqual(1);
      expect(result.successfulIds.length).toBeGreaterThanOrEqual(1);
    });

    it('should fail invalid products', async () => {
      const invalidRequest = {
        ...validRequest,
        productIds: ['3'], // Product in APPROVED state
      };

      const result = await service.executeBulkRejection(mockProducts, invalidRequest);
      
      expect(result.failureCount).toBe(1);
      expect(result.failedIds).toContain('3');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorCode).toBe('INVALID_STATE');
    });

    it('should fail when no reason provided', async () => {
      const requestWithoutReason = {
        ...validRequest,
        reason: '',
      };

      const result = await service.executeBulkRejection(mockProducts, requestWithoutReason);
      
      expect(result.failureCount).toBeGreaterThanOrEqual(2);
      expect(result.errors.some(e => e.errorCode === 'MISSING_REASON')).toBe(true);
    });

    it('should skip non-existent products', async () => {
      const requestWithMissing = {
        ...validRequest,
        productIds: ['1', 'non-existent'],
      };

      const result = await service.executeBulkRejection(mockProducts, requestWithMissing);
      
      expect(result.skippedCount).toBe(1);
      expect(result.skippedIds).toContain('non-existent');
    });

    it('should handle mixed results', async () => {
      const mixedRequest = {
        ...validRequest,
        productIds: ['1', '3', 'non-existent'], // Valid, invalid, missing
      };

      const result = await service.executeBulkRejection(mockProducts, mixedRequest);
      
      expect(result.successCount).toBeGreaterThanOrEqual(1); // Product 1
      expect(result.failureCount).toBeGreaterThanOrEqual(1); // Product 3 (wrong state)
      expect(result.skippedCount).toBe(1); // non-existent
    });

    it('should track execution time', async () => {
      const result = await service.executeBulkRejection(mockProducts, validRequest);
      
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should bypass validation when requested', async () => {
      const bypassRequest = {
        ...validRequest,
        productIds: ['3'], // Product in APPROVED state
        bypassValidation: true,
      };

      const result = await service.executeBulkRejection(mockProducts, bypassRequest);
      
      // Should still skip since not found in validation, but no validation errors
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Rejection Statistics', () => {
    it('should calculate success rate', async () => {
      const request: BulkRejectionRequest = {
        productIds: ['1', '2'],
        reviewerId: 'reviewer-1',
        reviewerName: 'Reviewer One',
        reviewerRole: UserRole.REVIEWER,
        reason: 'Quality issues',
      };

      const result = await service.executeBulkRejection(mockProducts, request);
      const stats = service.getRejectionStatistics(result);
      
      expect(stats.successRate).toBeGreaterThan(0);
      expect(stats.failureRate).toBeLessThan(1);
    });

    it('should calculate failure rate', async () => {
      const request: BulkRejectionRequest = {
        productIds: ['3'], // Invalid product
        reviewerId: 'reviewer-1',
        reviewerName: 'Reviewer One',
        reviewerRole: UserRole.REVIEWER,
        reason: 'Quality issues',
      };

      const result = await service.executeBulkRejection(mockProducts, request);
      const stats = service.getRejectionStatistics(result);
      
      expect(stats.successRate).toBe(0);
      expect(stats.failureRate).toBe(1); // 100%
    });

    it('should calculate average time per product', async () => {
      const request: BulkRejectionRequest = {
        productIds: ['1', '2'],
        reviewerId: 'reviewer-1',
        reviewerName: 'Reviewer One',
        reviewerRole: UserRole.REVIEWER,
        reason: 'Quality issues',
      };

      const result = await service.executeBulkRejection(mockProducts, request);
      const stats = service.getRejectionStatistics(result);
      
      expect(stats.averageTimePerProduct).toBeGreaterThan(0);
    });
  });

  describe('Default Instance', () => {
    it('should provide default service instance', () => {
      expect(bulkRejectionService).toBeInstanceOf(BulkRejectionService);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty product list', async () => {
      const request: BulkRejectionRequest = {
        productIds: ['1'],
        reviewerId: 'reviewer-1',
        reviewerName: 'Reviewer One',
        reviewerRole: UserRole.REVIEWER,
        reason: 'Quality issues',
      };

      const result = await service.executeBulkRejection([], request);
      
      expect(result.totalRequested).toBe(1);
      expect(result.skippedCount).toBe(1);
    });

    it('should handle empty product ID list', async () => {
      const request: BulkRejectionRequest = {
        productIds: [],
        reviewerId: 'reviewer-1',
        reviewerName: 'Reviewer One',
        reviewerRole: UserRole.REVIEWER,
        reason: 'Quality issues',
      };

      const result = await service.executeBulkRejection(mockProducts, request);
      
      expect(result.totalRequested).toBe(0);
      expect(result.successCount).toBe(0);
    });

    it('should handle rejection with comment', async () => {
      const request: BulkRejectionRequest = {
        productIds: ['1'],
        reviewerId: 'reviewer-1',
        reviewerName: 'Reviewer One',
        reviewerRole: UserRole.REVIEWER,
        reason: 'Quality issues',
        comment: 'Please review the product images',
      };

      const result = await service.executeBulkRejection(mockProducts, request);
      
      expect(result.successCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle notification flag', async () => {
      const request: BulkRejectionRequest = {
        productIds: ['1'],
        reviewerId: 'reviewer-1',
        reviewerName: 'Reviewer One',
        reviewerRole: UserRole.REVIEWER,
        reason: 'Quality issues',
        notifyUsers: true,
      };

      const result = await service.executeBulkRejection(mockProducts, request);
      
      expect(result.successCount).toBeGreaterThanOrEqual(1);
    });
  });
});
