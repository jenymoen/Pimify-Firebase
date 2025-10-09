import {
  BulkApprovalService,
  BulkApprovalRequest,
  bulkApprovalService,
} from '../bulk-approval-service';
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
    workflowState: WorkflowState.DRAFT, // Not in review
    images: [],
    variants: [],
    metafields: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('BulkApprovalService', () => {
  let service: BulkApprovalService;

  beforeEach(() => {
    service = new BulkApprovalService();
  });

  describe('Validation', () => {
    const validRequest: BulkApprovalRequest = {
      productIds: ['1', '2'],
      approverId: 'reviewer-1',
      approverName: 'Reviewer One',
      approverRole: UserRole.REVIEWER,
    };

    it('should validate products in review state', () => {
      const validations = service.validateBulkApproval(mockProducts, validRequest);
      
      const product1Validation = validations.find(v => v.productId === '1');
      expect(product1Validation?.valid).toBe(true);
      expect(product1Validation?.canApprove).toBe(true);
    });

    it('should reject products not in review state', () => {
      const validations = service.validateBulkApproval(mockProducts, {
        ...validRequest,
        productIds: ['3'], // Product in DRAFT state
      });
      
      const product3Validation = validations.find(v => v.productId === '3');
      expect(product3Validation?.valid).toBe(false);
      expect(product3Validation?.canApprove).toBe(false);
      expect(product3Validation?.errorCode).toBe('INVALID_STATE');
    });

    it('should reject requests from users without approval permission', () => {
      const invalidRequest = {
        ...validRequest,
        approverRole: UserRole.VIEWER,
      };

      const validations = service.validateBulkApproval(mockProducts, invalidRequest);
      
      validations.forEach(validation => {
        expect(validation.valid).toBe(false);
        expect(validation.errorCode).toBe('PERMISSION_DENIED');
      });
    });

    it('should allow admin to approve', () => {
      const adminRequest = {
        ...validRequest,
        approverRole: UserRole.ADMIN,
      };

      const validations = service.validateBulkApproval([mockProducts[0]], adminRequest);
      
      expect(validations[0].valid).toBe(true);
      expect(validations[0].canApprove).toBe(true);
    });

    it('should warn about missing product data', () => {
      const productWithMissingData: Product = {
        ...mockProducts[0],
        description: '',
        images: [],
      };

      const validations = service.validateBulkApproval([productWithMissingData], validRequest);
      
      expect(validations[0].warnings).toBeDefined();
      expect(validations[0].warnings?.length).toBeGreaterThan(0);
    });
  });

  describe('Execute Bulk Approval', () => {
    const validRequest: BulkApprovalRequest = {
      productIds: ['1', '2'],
      approverId: 'reviewer-1',
      approverName: 'Reviewer One',
      approverRole: UserRole.REVIEWER,
    };

    it('should approve valid products', async () => {
      const result = await service.executeBulkApproval(mockProducts, validRequest);
      
      expect(result.totalRequested).toBe(2);
      expect(result.successCount).toBeGreaterThanOrEqual(1);
      expect(result.successfulIds.length).toBeGreaterThanOrEqual(1);
    });

    it('should fail invalid products', async () => {
      const invalidRequest = {
        ...validRequest,
        productIds: ['3'], // Product in DRAFT state
      };

      const result = await service.executeBulkApproval(mockProducts, invalidRequest);
      
      expect(result.failureCount).toBe(1);
      expect(result.failedIds).toContain('3');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].errorCode).toBe('INVALID_STATE');
    });

    it('should skip non-existent products', async () => {
      const requestWithMissing = {
        ...validRequest,
        productIds: ['1', 'non-existent'],
      };

      const result = await service.executeBulkApproval(mockProducts, requestWithMissing);
      
      expect(result.skippedCount).toBe(1);
      expect(result.skippedIds).toContain('non-existent');
    });

    it('should handle mixed results', async () => {
      const mixedRequest = {
        ...validRequest,
        productIds: ['1', '3', 'non-existent'], // Valid, invalid, missing
      };

      const result = await service.executeBulkApproval(mockProducts, mixedRequest);
      
      expect(result.successCount).toBe(1); // Product 1
      expect(result.failureCount).toBe(1); // Product 3 (wrong state)
      expect(result.skippedCount).toBe(1); // non-existent
    });

    it('should track execution time', async () => {
      const result = await service.executeBulkApproval(mockProducts, validRequest);
      
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should bypass validation when requested', async () => {
      const bypassRequest = {
        ...validRequest,
        productIds: ['3'], // Product in DRAFT state
        bypassValidation: true,
      };

      const result = await service.executeBulkApproval(mockProducts, bypassRequest);
      
      // Should still skip since not found in validation, but no validation errors
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Approval Statistics', () => {
    it('should calculate success rate', async () => {
      const request: BulkApprovalRequest = {
        productIds: ['1', '2'],
        approverId: 'reviewer-1',
        approverName: 'Reviewer One',
        approverRole: UserRole.REVIEWER,
      };

      const result = await service.executeBulkApproval(mockProducts, request);
      const stats = service.getApprovalStatistics(result);
      
      expect(stats.successRate).toBeGreaterThan(0);
      expect(stats.failureRate).toBeLessThan(1);
    });

    it('should calculate failure rate', async () => {
      const request: BulkApprovalRequest = {
        productIds: ['3'], // Invalid product
        approverId: 'reviewer-1',
        approverName: 'Reviewer One',
        approverRole: UserRole.REVIEWER,
      };

      const result = await service.executeBulkApproval(mockProducts, request);
      const stats = service.getApprovalStatistics(result);
      
      expect(stats.successRate).toBe(0);
      expect(stats.failureRate).toBe(1); // 100%
    });

    it('should calculate average time per product', async () => {
      const request: BulkApprovalRequest = {
        productIds: ['1', '2'],
        approverId: 'reviewer-1',
        approverName: 'Reviewer One',
        approverRole: UserRole.REVIEWER,
      };

      const result = await service.executeBulkApproval(mockProducts, request);
      const stats = service.getApprovalStatistics(result);
      
      expect(stats.averageTimePerProduct).toBeGreaterThan(0);
    });
  });

  describe('Default Instance', () => {
    it('should provide default service instance', () => {
      expect(bulkApprovalService).toBeInstanceOf(BulkApprovalService);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty product list', async () => {
      const request: BulkApprovalRequest = {
        productIds: ['1'],
        approverId: 'reviewer-1',
        approverName: 'Reviewer One',
        approverRole: UserRole.REVIEWER,
      };

      const result = await service.executeBulkApproval([], request);
      
      expect(result.totalRequested).toBe(1);
      expect(result.skippedCount).toBe(1);
    });

    it('should handle empty product ID list', async () => {
      const request: BulkApprovalRequest = {
        productIds: [],
        approverId: 'reviewer-1',
        approverName: 'Reviewer One',
        approverRole: UserRole.REVIEWER,
      };

      const result = await service.executeBulkApproval(mockProducts, request);
      
      expect(result.totalRequested).toBe(0);
      expect(result.successCount).toBe(0);
    });

    it('should handle approval with comment', async () => {
      const request: BulkApprovalRequest = {
        productIds: ['1'],
        approverId: 'reviewer-1',
        approverName: 'Reviewer One',
        approverRole: UserRole.REVIEWER,
        comment: 'Looks good!',
      };

      const result = await service.executeBulkApproval(mockProducts, request);
      
      expect(result.successCount).toBe(1);
    });

    it('should handle notification flag', async () => {
      const request: BulkApprovalRequest = {
        productIds: ['1'],
        approverId: 'reviewer-1',
        approverName: 'Reviewer One',
        approverRole: UserRole.REVIEWER,
        notifyUsers: true,
      };

      const result = await service.executeBulkApproval(mockProducts, request);
      
      expect(result.successCount).toBe(1);
    });
  });
});
