import {
  LocalWorkflowPersistenceService,
  WorkflowSearchFilters,
  BulkUpdateResult,
  ImportResult,
} from '../workflow-persistence';
import {
  ProductWorkflow,
  WorkflowState,
  AuditTrailEntry,
  UserRole,
} from '@/types/workflow';
import { Product } from '@/types/product';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('LocalWorkflowPersistenceService', () => {
  let service: LocalWorkflowPersistenceService;
  let sampleProduct: ProductWorkflow;

  beforeEach(() => {
    service = new LocalWorkflowPersistenceService();
    localStorageMock.clear();
    sampleProduct = createSampleProduct();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('saveProductWorkflow', () => {
    test('should save a new product workflow', async () => {
      const result = await service.saveProductWorkflow(sampleProduct);
      
      expect(result).toBe(true);
      
      const saved = await service.loadProductWorkflow(sampleProduct.id);
      expect(saved).toEqual(sampleProduct);
    });

    test('should update an existing product workflow', async () => {
      await service.saveProductWorkflow(sampleProduct);
      
      const updatedProduct = { ...sampleProduct, workflowState: WorkflowState.REVIEW };
      const result = await service.saveProductWorkflow(updatedProduct);
      
      expect(result).toBe(true);
      
      const saved = await service.loadProductWorkflow(sampleProduct.id);
      expect(saved?.workflowState).toBe(WorkflowState.REVIEW);
    });

    test('should handle save errors gracefully', async () => {
      // Mock localStorage to throw an error
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = jest.fn(() => {
        throw new Error('Storage error');
      });

      const result = await service.saveProductWorkflow(sampleProduct);
      
      expect(result).toBe(false);
      
      // Restore original function
      localStorageMock.setItem = originalSetItem;
    });
  });

  describe('loadProductWorkflow', () => {
    test('should load an existing product workflow', async () => {
      await service.saveProductWorkflow(sampleProduct);
      
      const loaded = await service.loadProductWorkflow(sampleProduct.id);
      
      expect(loaded).toEqual(sampleProduct);
    });

    test('should return null for non-existent product', async () => {
      const loaded = await service.loadProductWorkflow('non-existent-id');
      
      expect(loaded).toBeNull();
    });

    test('should ensure workflow fields are present', async () => {
      // Save a product without workflow fields
      const productWithoutWorkflow = { ...sampleProduct } as any;
      delete productWithoutWorkflow.workflowState;
      delete productWithoutWorkflow.workflowHistory;
      
      localStorageMock.setItem('pimify_workflow_products', JSON.stringify([productWithoutWorkflow]));
      
      const loaded = await service.loadProductWorkflow(sampleProduct.id);
      
      expect(loaded?.workflowState).toBe(WorkflowState.DRAFT);
      expect(loaded?.workflowHistory).toEqual([]);
    });
  });

  describe('loadAllProductWorkflows', () => {
    test('should load all product workflows', async () => {
      const product1 = createSampleProduct('product-1');
      const product2 = createSampleProduct('product-2');
      
      await service.saveProductWorkflow(product1);
      await service.saveProductWorkflow(product2);
      
      const allProducts = await service.loadAllProductWorkflows();
      
      expect(allProducts).toHaveLength(2);
      expect(allProducts).toContainEqual(product1);
      expect(allProducts).toContainEqual(product2);
    });

    test('should return empty array when no products exist', async () => {
      const allProducts = await service.loadAllProductWorkflows();
      
      expect(allProducts).toEqual([]);
    });
  });

  describe('updateWorkflowState', () => {
    test('should update workflow state and add to history', async () => {
      await service.saveProductWorkflow(sampleProduct);
      
      const result = await service.updateWorkflowState(
        sampleProduct.id,
        WorkflowState.REVIEW,
        'user-1',
        'Moving to review'
      );
      
      expect(result).toBe(true);
      
      const updated = await service.loadProductWorkflow(sampleProduct.id);
      expect(updated?.workflowState).toBe(WorkflowState.REVIEW);
      expect(updated?.workflowHistory).toHaveLength(2); // Original + new entry
      expect(updated?.workflowHistory?.[1].state).toBe(WorkflowState.REVIEW);
      expect(updated?.workflowHistory?.[1].comment).toBe('Moving to review');
    });

    test('should return false for non-existent product', async () => {
      const result = await service.updateWorkflowState(
        'non-existent-id',
        WorkflowState.REVIEW,
        'user-1'
      );
      
      expect(result).toBe(false);
    });

    test('should add audit trail entry', async () => {
      await service.saveProductWorkflow(sampleProduct);
      
      await service.updateWorkflowState(
        sampleProduct.id,
        WorkflowState.REVIEW,
        'user-1',
        'Moving to review'
      );
      
      const auditTrail = await service.getAuditTrail(sampleProduct.id);
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].action).toBe('STATE_CHANGE');
      expect(auditTrail[0].userId).toBe('user-1');
    });
  });

  describe('addAuditTrailEntry', () => {
    test('should add audit trail entry', async () => {
      const entry: Omit<AuditTrailEntry, 'id' | 'timestamp'> = {
        action: 'EDIT',
        userId: 'user-1',
        fieldChanges: [{
          field: 'name',
          oldValue: 'Old Name',
          newValue: 'New Name',
        }],
        reason: 'Updated product name',
        productState: WorkflowState.DRAFT,
      };
      
      const result = await service.addAuditTrailEntry(sampleProduct.id, entry);
      
      expect(result).toBe(true);
      
      const auditTrail = await service.getAuditTrail(sampleProduct.id);
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].action).toBe('EDIT');
      expect(auditTrail[0].userId).toBe('user-1');
    });
  });

  describe('getAuditTrail', () => {
    test('should return audit trail for product', async () => {
      const entry: Omit<AuditTrailEntry, 'id' | 'timestamp'> = {
        action: 'EDIT',
        userId: 'user-1',
        fieldChanges: [],
        reason: 'Test entry',
        productState: WorkflowState.DRAFT,
      };
      
      await service.addAuditTrailEntry(sampleProduct.id, entry);
      
      const auditTrail = await service.getAuditTrail(sampleProduct.id);
      expect(auditTrail).toHaveLength(1);
    });

    test('should return empty array for product with no audit trail', async () => {
      const auditTrail = await service.getAuditTrail('non-existent-id');
      expect(auditTrail).toEqual([]);
    });
  });

  describe('getProductsByState', () => {
    test('should return products in specific state', async () => {
      const draftProduct = createSampleProduct('draft-product');
      const reviewProduct = createSampleProduct('review-product');
      reviewProduct.workflowState = WorkflowState.REVIEW;
      
      await service.saveProductWorkflow(draftProduct);
      await service.saveProductWorkflow(reviewProduct);
      
      const draftProducts = await service.getProductsByState(WorkflowState.DRAFT);
      const reviewProducts = await service.getProductsByState(WorkflowState.REVIEW);
      
      expect(draftProducts).toHaveLength(1);
      expect(draftProducts[0].id).toBe('draft-product');
      
      expect(reviewProducts).toHaveLength(1);
      expect(reviewProducts[0].id).toBe('review-product');
    });
  });

  describe('getProductsByUser', () => {
    test('should return products submitted by specific user', async () => {
      const user1Product = createSampleProduct('user1-product');
      user1Product.submittedBy = 'user-1';
      
      const user2Product = createSampleProduct('user2-product');
      user2Product.submittedBy = 'user-2';
      
      await service.saveProductWorkflow(user1Product);
      await service.saveProductWorkflow(user2Product);
      
      const user1Products = await service.getProductsByUser('user-1');
      const user2Products = await service.getProductsByUser('user-2');
      
      expect(user1Products).toHaveLength(1);
      expect(user1Products[0].id).toBe('user1-product');
      
      expect(user2Products).toHaveLength(1);
      expect(user2Products[0].id).toBe('user2-product');
    });
  });

  describe('getProductsByReviewer', () => {
    test('should return products assigned to specific reviewer', async () => {
      const reviewer1Product = createSampleProduct('reviewer1-product');
      reviewer1Product.assignedReviewer = 'reviewer-1';
      
      const reviewer2Product = createSampleProduct('reviewer2-product');
      reviewer2Product.assignedReviewer = 'reviewer-2';
      
      await service.saveProductWorkflow(reviewer1Product);
      await service.saveProductWorkflow(reviewer2Product);
      
      const reviewer1Products = await service.getProductsByReviewer('reviewer-1');
      const reviewer2Products = await service.getProductsByReviewer('reviewer-2');
      
      expect(reviewer1Products).toHaveLength(1);
      expect(reviewer1Products[0].id).toBe('reviewer1-product');
      
      expect(reviewer2Products).toHaveLength(1);
      expect(reviewer2Products[0].id).toBe('reviewer2-product');
    });
  });

  describe('searchProducts', () => {
    beforeEach(async () => {
      const product1 = createSampleProduct('product-1');
      product1.basicInfo.name.en = 'Test Product One';
      product1.basicInfo.sku = 'SKU-001';
      product1.basicInfo.brand = 'Brand A';
      product1.workflowState = WorkflowState.DRAFT;
      product1.submittedBy = 'user-1';
      product1.assignedReviewer = 'reviewer-1';
      
      const product2 = createSampleProduct('product-2');
      product2.basicInfo.name.en = 'Another Product';
      product2.basicInfo.sku = 'SKU-002';
      product2.basicInfo.brand = 'Brand B';
      product2.workflowState = WorkflowState.REVIEW;
      product2.submittedBy = 'user-2';
      product2.assignedReviewer = 'reviewer-2';
      
      await service.saveProductWorkflow(product1);
      await service.saveProductWorkflow(product2);
    });

    test('should search products by text query', async () => {
      const results = await service.searchProducts('Test Product');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('product-1');
    });

    test('should filter by workflow state', async () => {
      const filters: WorkflowSearchFilters = {
        states: [WorkflowState.DRAFT],
      };
      
      const results = await service.searchProducts('', filters);
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('product-1');
    });

    test('should filter by assigned reviewer', async () => {
      const filters: WorkflowSearchFilters = {
        assignedReviewer: 'reviewer-1',
      };
      
      const results = await service.searchProducts('', filters);
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('product-1');
    });

    test('should filter by submitted by', async () => {
      const filters: WorkflowSearchFilters = {
        submittedBy: 'user-2',
      };
      
      const results = await service.searchProducts('', filters);
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('product-2');
    });

    test('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const filters: WorkflowSearchFilters = {
        dateRange: {
          start: yesterday,
          end: tomorrow,
        },
      };
      
      const results = await service.searchProducts('', filters);
      
      expect(results).toHaveLength(2);
    });

    test('should filter by rejection reason', async () => {
      const productWithRejection = createSampleProduct('rejected-product');
      productWithRejection.workflowHistory = [{
        state: WorkflowState.REJECTED,
        timestamp: new Date().toISOString(),
        userId: 'reviewer-1',
        comment: 'Rejection: Quality issues found',
      }];
      
      await service.saveProductWorkflow(productWithRejection);
      
      const filters: WorkflowSearchFilters = {
        hasRejectionReason: true,
      };
      
      const results = await service.searchProducts('', filters);
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('rejected-product');
    });

    test('should filter by overdue status', async () => {
      const overdueProduct = createSampleProduct('overdue-product');
      overdueProduct.workflowState = WorkflowState.REVIEW;
      overdueProduct.workflowHistory = [{
        state: WorkflowState.REVIEW,
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
        userId: 'user-1',
        comment: 'Moved to review',
      }];
      
      await service.saveProductWorkflow(overdueProduct);
      
      const filters: WorkflowSearchFilters = {
        isOverdue: true,
      };
      
      const results = await service.searchProducts('', filters);
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('overdue-product');
    });
  });

  describe('bulkUpdateWorkflowState', () => {
    test('should update multiple products successfully', async () => {
      const product1 = createSampleProduct('product-1');
      const product2 = createSampleProduct('product-2');
      
      await service.saveProductWorkflow(product1);
      await service.saveProductWorkflow(product2);
      
      const result = await service.bulkUpdateWorkflowState(
        ['product-1', 'product-2'],
        WorkflowState.REVIEW,
        'user-1',
        'Bulk update to review'
      );
      
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(result.failedUpdates).toHaveLength(0);
      
      const updated1 = await service.loadProductWorkflow('product-1');
      const updated2 = await service.loadProductWorkflow('product-2');
      
      expect(updated1?.workflowState).toBe(WorkflowState.REVIEW);
      expect(updated2?.workflowState).toBe(WorkflowState.REVIEW);
    });

    test('should handle partial failures', async () => {
      const product1 = createSampleProduct('product-1');
      await service.saveProductWorkflow(product1);
      
      const result = await service.bulkUpdateWorkflowState(
        ['product-1', 'non-existent-product'],
        WorkflowState.REVIEW,
        'user-1'
      );
      
      expect(result.success).toBe(false);
      expect(result.updatedCount).toBe(1);
      expect(result.failedUpdates).toHaveLength(1);
      expect(result.failedUpdates[0].productId).toBe('non-existent-product');
    });
  });

  describe('exportWorkflowData', () => {
    test('should export data as JSON', async () => {
      await service.saveProductWorkflow(sampleProduct);
      
      const jsonData = await service.exportWorkflowData('json');
      
      expect(() => JSON.parse(jsonData)).not.toThrow();
      const parsed = JSON.parse(jsonData);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe(sampleProduct.id);
    });

    test('should export data as CSV', async () => {
      await service.saveProductWorkflow(sampleProduct);
      
      const csvData = await service.exportWorkflowData('csv');
      
      expect(csvData).toContain('ID,Name,SKU,Brand,State');
      expect(csvData).toContain(sampleProduct.id);
      expect(csvData).toContain(sampleProduct.basicInfo.name.en);
    });
  });

  describe('importWorkflowData', () => {
    test('should import JSON data successfully', async () => {
      const jsonData = JSON.stringify([sampleProduct]);
      
      const result = await service.importWorkflowData(jsonData, 'json');
      
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(result.failedImports).toHaveLength(0);
      
      const imported = await service.loadProductWorkflow(sampleProduct.id);
      expect(imported).toEqual(sampleProduct);
    });

    test('should import CSV data successfully', async () => {
      const csvData = `ID,Name,SKU,Brand,State,Submitted By,Assigned Reviewer,Created At,Last Modified,Rejection Reason
${sampleProduct.id},${sampleProduct.basicInfo.name.en},${sampleProduct.basicInfo.sku},${sampleProduct.basicInfo.brand},${sampleProduct.workflowState},${sampleProduct.submittedBy},,${sampleProduct.createdAt},${sampleProduct.createdAt},`;
      
      const result = await service.importWorkflowData(csvData, 'csv');
      
      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(result.failedImports).toHaveLength(0);
    });

    test('should handle import errors', async () => {
      const invalidJsonData = 'invalid json';
      
      const result = await service.importWorkflowData(invalidJsonData, 'json');
      
      expect(result.success).toBe(false);
      expect(result.importedCount).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

// Helper function to create sample products
function createSampleProduct(id: string = 'test-product'): ProductWorkflow {
  return {
    id,
    basicInfo: {
      name: { en: 'Test Product' },
      sku: 'TEST-001',
      brand: 'Test Brand',
      descriptionShort: { en: 'Short description' },
      descriptionLong: { en: 'Long description' },
    },
    media: {
      images: [],
      videos: [],
    },
    attributesAndSpecs: {
      categories: [],
      attributes: [],
      specifications: [],
    },
    pricingAndInventory: {
      price: 0,
      compareAtPrice: 0,
      costPrice: 0,
      stock: 0,
      trackQuantity: false,
      allowBackorder: false,
    },
    shipping: {
      weight: 0,
      dimensions: {
        length: 0,
        width: 0,
        height: 0,
      },
      requiresShipping: false,
    },
    seo: {
      title: { en: '' },
      description: { en: '' },
      keywords: [],
    },
    marketingSEO: {
      keywords: [],
      metaTitle: { en: '' },
      metaDescription: { en: '' },
    },
    workflowState: WorkflowState.DRAFT,
    workflowHistory: [{
      state: WorkflowState.DRAFT,
      timestamp: new Date().toISOString(),
      userId: 'system',
      comment: 'Initial state',
    }],
    assignedReviewer: null,
    submittedBy: 'system',
    rejectionReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
