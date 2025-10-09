import {
  BulkStateChangeService,
  BulkStateChangeRequest,
  bulkStateChangeService,
} from '../bulk-state-change-service';
import { Product } from '@/types/product';
import { WorkflowState, UserRole } from '@/types/workflow';

// Mock console.log
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
    workflowState: WorkflowState.DRAFT,
    images: ['image1.jpg'],
    variants: [],
    metafields: [],
    createdAt: new Date(),
    updatedAt: new Date(),
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
  },
  {
    id: '3',
    name: 'Product 3',
    sku: 'SKU-003',
    brand: 'Brand A',
    category: 'Category 1',
    description: 'Description 3',
    workflowState: WorkflowState.APPROVED,
    images: [],
    variants: [],
    metafields: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('BulkStateChangeService', () => {
  let service: BulkStateChangeService;

  beforeEach(() => {
    service = new BulkStateChangeService();
  });

  describe('Validation', () => {
    it('should validate valid state transition', () => {
      const request: BulkStateChangeRequest = {
        productIds: ['1'],
        targetState: WorkflowState.REVIEW,
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.EDITOR,
      };

      const validations = service.validateBulkStateChange([mockProducts[0]], request);
      
      expect(validations[0].valid).toBe(true);
      expect(validations[0].canChange).toBe(true);
    });

    it('should reject invalid state transition', () => {
      const request: BulkStateChangeRequest = {
        productIds: ['1'],
        targetState: WorkflowState.PUBLISHED, // Can't go from DRAFT to PUBLISHED
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.ADMIN,
      };

      const validations = service.validateBulkStateChange([mockProducts[0]], request);
      
      expect(validations[0].valid).toBe(false);
      expect(validations[0].errorCode).toBe('INVALID_TRANSITION');
    });

    it('should reject transition without permission', () => {
      const request: BulkStateChangeRequest = {
        productIds: ['2'],
        targetState: WorkflowState.APPROVED, // Editors can't approve
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.EDITOR,
      };

      const validations = service.validateBulkStateChange([mockProducts[1]], request);
      
      expect(validations[0].valid).toBe(false);
      expect(validations[0].errorCode).toBe('PERMISSION_DENIED');
    });

    it('should require reason for rejection', () => {
      const request: BulkStateChangeRequest = {
        productIds: ['2'],
        targetState: WorkflowState.REJECTED,
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.REVIEWER,
        reason: '', // Empty reason
      };

      const validations = service.validateBulkStateChange([mockProducts[1]], request);
      
      expect(validations[0].valid).toBe(false);
      expect(validations[0].errorCode).toBe('MISSING_REASON');
    });

    it('should warn about publishing without images', () => {
      const request: BulkStateChangeRequest = {
        productIds: ['3'],
        targetState: WorkflowState.PUBLISHED,
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.ADMIN,
      };

      const validations = service.validateBulkStateChange([mockProducts[2]], request);
      
      expect(validations[0].warnings?.some(w => w.includes('images'))).toBe(true);
    });
  });

  describe('Execute Bulk State Change', () => {
    it('should change state for valid products', async () => {
      const request: BulkStateChangeRequest = {
        productIds: ['1'],
        targetState: WorkflowState.REVIEW,
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.EDITOR,
      };

      const result = await service.executeBulkStateChange(mockProducts, request);
      
      expect(result.totalRequested).toBe(1);
      expect(result.successCount).toBeGreaterThanOrEqual(1);
    });

    it('should fail invalid state changes', async () => {
      const request: BulkStateChangeRequest = {
        productIds: ['1'],
        targetState: WorkflowState.PUBLISHED,
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.ADMIN,
      };

      const result = await service.executeBulkStateChange(mockProducts, request);
      
      expect(result.failureCount).toBeGreaterThanOrEqual(1);
      expect(result.errors.some(e => e.errorCode === 'INVALID_TRANSITION')).toBe(true);
    });

    it('should skip non-existent products', async () => {
      const request: BulkStateChangeRequest = {
        productIds: ['non-existent'],
        targetState: WorkflowState.REVIEW,
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.EDITOR,
      };

      const result = await service.executeBulkStateChange(mockProducts, request);
      
      expect(result.skippedCount).toBe(1);
      expect(result.skippedIds).toContain('non-existent');
    });

    it('should track execution time', async () => {
      const request: BulkStateChangeRequest = {
        productIds: ['1'],
        targetState: WorkflowState.REVIEW,
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.EDITOR,
      };

      const result = await service.executeBulkStateChange(mockProducts, request);
      
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Role Permissions', () => {
    it('should allow admin to change to any state', () => {
      const transitions = service.getAllowedTransitions(WorkflowState.DRAFT, UserRole.ADMIN);
      expect(transitions).toContain(WorkflowState.REVIEW);
    });

    it('should allow editor to submit for review', () => {
      const transitions = service.getAllowedTransitions(WorkflowState.DRAFT, UserRole.EDITOR);
      expect(transitions).toContain(WorkflowState.REVIEW);
    });

    it('should allow reviewer to approve/reject', () => {
      const transitions = service.getAllowedTransitions(WorkflowState.REVIEW, UserRole.REVIEWER);
      expect(transitions).toContain(WorkflowState.APPROVED);
      expect(transitions).toContain(WorkflowState.REJECTED);
    });

    it('should not allow viewer to change states', () => {
      const transitions = service.getAllowedTransitions(WorkflowState.DRAFT, UserRole.VIEWER);
      expect(transitions).toHaveLength(0);
    });
  });

  describe('State Change Statistics', () => {
    it('should calculate success rate', async () => {
      const request: BulkStateChangeRequest = {
        productIds: ['1'],
        targetState: WorkflowState.REVIEW,
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.EDITOR,
      };

      const result = await service.executeBulkStateChange(mockProducts, request);
      const stats = service.getStateChangeStatistics(result);
      
      expect(stats.successRate).toBeGreaterThan(0);
    });

    it('should calculate average time per product', async () => {
      const request: BulkStateChangeRequest = {
        productIds: ['1'],
        targetState: WorkflowState.REVIEW,
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.EDITOR,
      };

      const result = await service.executeBulkStateChange(mockProducts, request);
      const stats = service.getStateChangeStatistics(result);
      
      expect(stats.averageTimePerProduct).toBeGreaterThan(0);
    });
  });

  describe('Default Instance', () => {
    it('should provide default service instance', () => {
      expect(bulkStateChangeService).toBeInstanceOf(BulkStateChangeService);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty product list', async () => {
      const request: BulkStateChangeRequest = {
        productIds: ['1'],
        targetState: WorkflowState.REVIEW,
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.EDITOR,
      };

      const result = await service.executeBulkStateChange([], request);
      
      expect(result.totalRequested).toBe(1);
      expect(result.skippedCount).toBe(1);
    });

    it('should handle bypass validation', async () => {
      const request: BulkStateChangeRequest = {
        productIds: ['1'],
        targetState: WorkflowState.PUBLISHED, // Invalid transition
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.ADMIN,
        bypassValidation: true,
      };

      const result = await service.executeBulkStateChange(mockProducts, request);
      
      // No validation errors
      expect(result.errors).toHaveLength(0);
    });

    it('should allow same state transition', () => {
      const request: BulkStateChangeRequest = {
        productIds: ['1'],
        targetState: WorkflowState.DRAFT,
        userId: 'user-1',
        userName: 'User One',
        userRole: UserRole.EDITOR,
      };

      const validations = service.validateBulkStateChange([mockProducts[0]], request);
      
      expect(validations[0].valid).toBe(true);
    });
  });
});
