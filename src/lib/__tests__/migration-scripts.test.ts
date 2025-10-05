/**
 * Unit tests for migration scripts
 */

import {
  migrateProductsToWorkflow,
  isMigrationCompleted,
  runMigrationIfNeeded,
  createInitialAdminUser,
  setupDefaultNotificationPreferences,
  createSampleWorkflowData,
  validateMigratedData,
  runCompleteMigration,
  MIGRATION_VERSION,
  MIGRATION_KEY,
} from '../migration-scripts';
import { WorkflowState } from '@/types/workflow';
import type { Product } from '@/types/product';
import type { ProductWorkflow } from '@/types/workflow';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock useProductStore
const mockProductStore = {
  products: [],
  setProducts: jest.fn(),
};

jest.mock('../product-store', () => ({
  useProductStore: {
    getState: () => mockProductStore,
  },
}));

describe('Migration Scripts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    mockProductStore.products = [];
    mockProductStore.setProducts.mockClear();
  });

  describe('migrateProductsToWorkflow', () => {
    test('should migrate products without workflow fields', () => {
      const sampleProduct: Product = {
        id: 'test-product-1',
        basicInfo: {
          name: { en: 'Test Product', no: 'Test Produkt' },
          sku: 'TEST-001',
          descriptionShort: { en: 'Test description', no: 'Test beskrivelse' },
          descriptionLong: { en: 'Long test description', no: 'Lang test beskrivelse' },
          brand: 'Test Brand',
          status: 'active',
        },
        attributesAndSpecs: {
          categories: ['Electronics'],
          properties: [],
          technicalSpecs: [],
        },
        media: {
          images: [],
        },
        marketingSEO: {
          seoTitle: { en: 'Test Product', no: 'Test Produkt' },
          seoDescription: { en: 'Test description', no: 'Test beskrivelse' },
          keywords: ['test'],
        },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      };

      mockProductStore.products = [sampleProduct];

      const result = migrateProductsToWorkflow();

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockProductStore.setProducts).toHaveBeenCalledTimes(1);

      const migratedProducts = mockProductStore.setProducts.mock.calls[0][0];
      expect(migratedProducts).toHaveLength(1);
      
      const migratedProduct = migratedProducts[0] as ProductWorkflow;
      expect(migratedProduct.workflowState).toBe(WorkflowState.PUBLISHED);
      expect(migratedProduct.workflowHistory).toHaveLength(1);
      expect(migratedProduct.workflowHistory[0].state).toBe(WorkflowState.PUBLISHED);
      expect(migratedProduct.workflowHistory[0].userId).toBe('system');
      expect(migratedProduct.publishedAt).toBe(sampleProduct.updatedAt);
    });

    test('should skip products that already have workflow fields', () => {
      const productWithWorkflow: ProductWorkflow = {
        id: 'test-product-2',
        basicInfo: {
          name: { en: 'Test Product 2', no: 'Test Produkt 2' },
          sku: 'TEST-002',
          descriptionShort: { en: 'Test description', no: 'Test beskrivelse' },
          descriptionLong: { en: 'Long test description', no: 'Lang test beskrivelse' },
          brand: 'Test Brand',
          status: 'active',
        },
        attributesAndSpecs: {
          categories: ['Electronics'],
          properties: [],
          technicalSpecs: [],
        },
        media: {
          images: [],
        },
        marketingSEO: {
          seoTitle: { en: 'Test Product 2', no: 'Test Produkt 2' },
          seoDescription: { en: 'Test description', no: 'Test beskrivelse' },
          keywords: ['test'],
        },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        workflowState: WorkflowState.DRAFT,
        workflowHistory: [
          {
            state: WorkflowState.DRAFT,
            timestamp: '2024-01-15T10:00:00Z',
            userId: 'test-user',
            reason: 'Initial creation',
          },
        ],
      };

      mockProductStore.products = [productWithWorkflow];

      const result = migrateProductsToWorkflow();

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockProductStore.setProducts).toHaveBeenCalledTimes(1);
    });

    test('should handle empty products array', () => {
      mockProductStore.products = [];

      const result = migrateProductsToWorkflow();

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle invalid products data', () => {
      mockProductStore.products = null as any;

      const result = migrateProductsToWorkflow();

      expect(result.success).toBe(false);
      expect(result.migratedCount).toBe(0);
      expect(result.errors).toContain('Products data is not an array');
    });
  });

  describe('isMigrationCompleted', () => {
    test('should return true when migration is completed', () => {
      localStorageMock.getItem.mockReturnValue(MIGRATION_VERSION);

      const result = isMigrationCompleted();

      expect(result).toBe(true);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(MIGRATION_KEY);
    });

    test('should return false when migration is not completed', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = isMigrationCompleted();

      expect(result).toBe(false);
    });

    test('should return false when migration version is different', () => {
      localStorageMock.getItem.mockReturnValue('0.9.0');

      const result = isMigrationCompleted();

      expect(result).toBe(false);
    });
  });

  describe('runMigrationIfNeeded', () => {
    test('should run migration when not completed', () => {
      localStorageMock.getItem.mockReturnValue(null);
      mockProductStore.products = [];

      const result = runMigrationIfNeeded();

      expect(result.wasNeeded).toBe(true);
      expect(result.success).toBe(true);
    });

    test('should skip migration when already completed', () => {
      localStorageMock.getItem.mockReturnValue(MIGRATION_VERSION);

      const result = runMigrationIfNeeded();

      expect(result.wasNeeded).toBe(false);
      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
    });
  });

  describe('createInitialAdminUser', () => {
    test('should create admin user successfully', () => {
      localStorageMock.getItem.mockReturnValue('[]');
      localStorageMock.setItem.mockImplementation(() => {});

      const result = createInitialAdminUser();

      expect(result.success).toBe(true);
      expect(result.userId).toMatch(/^admin-user-\d+$/);
      expect(result.errors).toHaveLength(0);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user_roles', expect.any(String));
    });

    test('should handle localStorage errors', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const result = createInitialAdminUser();

      expect(result.success).toBe(false);
      expect(result.userId).toBe('');
      expect(result.errors).toContain('Failed to create admin user: localStorage error');
    });
  });

  describe('setupDefaultNotificationPreferences', () => {
    test('should setup notification preferences for users without them', () => {
      const existingRoles = [
        {
          id: 'role-1',
          userId: 'user-1',
          role: 'editor',
          permissions: [],
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingRoles));
      localStorageMock.setItem.mockImplementation(() => {});

      const result = setupDefaultNotificationPreferences();

      expect(result.success).toBe(true);
      expect(result.usersUpdated).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user_roles', expect.any(String));
    });

    test('should skip users that already have notification preferences', () => {
      const existingRoles = [
        {
          id: 'role-1',
          userId: 'user-1',
          role: 'editor',
          permissions: [],
          notificationPreferences: {
            email: { productSubmitted: true },
            inApp: { productSubmitted: true },
          },
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingRoles));
      localStorageMock.setItem.mockImplementation(() => {});

      const result = setupDefaultNotificationPreferences();

      expect(result.success).toBe(true);
      expect(result.usersUpdated).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('createSampleWorkflowData', () => {
    test('should create sample data successfully', () => {
      mockProductStore.products = [];
      localStorageMock.getItem.mockReturnValue('[]');
      localStorageMock.setItem.mockImplementation(() => {});

      const result = createSampleWorkflowData();

      expect(result.success).toBe(true);
      expect(result.sampleDataCreated.products).toBe(2);
      expect(result.sampleDataCreated.auditEntries).toBe(2);
      expect(result.sampleDataCreated.userRoles).toBe(2);
      expect(result.sampleDataCreated.notificationTemplates).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle errors during sample data creation', () => {
      mockProductStore.products = null as any;

      const result = createSampleWorkflowData();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateMigratedData', () => {
    test('should validate data successfully', () => {
      const validProduct: ProductWorkflow = {
        id: 'test-product',
        basicInfo: {
          name: { en: 'Test Product', no: 'Test Produkt' },
          sku: 'TEST-001',
          descriptionShort: { en: 'Test description', no: 'Test beskrivelse' },
          descriptionLong: { en: 'Long test description', no: 'Lang test beskrivelse' },
          brand: 'Test Brand',
          status: 'active',
        },
        attributesAndSpecs: {
          categories: ['Electronics'],
          properties: [],
          technicalSpecs: [],
        },
        media: {
          images: [],
        },
        marketingSEO: {
          seoTitle: { en: 'Test Product', no: 'Test Produkt' },
          seoDescription: { en: 'Test description', no: 'Test beskrivelse' },
          keywords: ['test'],
        },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        workflowState: WorkflowState.DRAFT,
        workflowHistory: [],
      };

      mockProductStore.products = [validProduct];
      localStorageMock.getItem.mockReturnValue('[]');

      const result = validateMigratedData();

      expect(result.success).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.statistics.totalProducts).toBe(1);
      expect(result.statistics.productsWithWorkflow).toBe(1);
    });

    test('should identify validation issues', () => {
      const invalidProduct = {
        id: 'test-product',
        basicInfo: {
          name: { en: 'Test Product', no: 'Test Produkt' },
          sku: 'TEST-001',
          descriptionShort: { en: 'Test description', no: 'Test beskrivelse' },
          descriptionLong: { en: 'Long test description', no: 'Lang test beskrivelse' },
          brand: 'Test Brand',
          status: 'active',
        },
        attributesAndSpecs: {
          categories: ['Electronics'],
          properties: [],
          technicalSpecs: [],
        },
        media: {
          images: [],
        },
        marketingSEO: {
          seoTitle: { en: 'Test Product', no: 'Test Produkt' },
          seoDescription: { en: 'Test description', no: 'Test beskrivelse' },
          keywords: ['test'],
        },
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        // Missing workflow fields
      };

      mockProductStore.products = [invalidProduct];
      localStorageMock.getItem.mockReturnValue('[]');

      const result = validateMigratedData();

      expect(result.success).toBe(false);
      expect(result.issues).toContain('Product test-product is missing workflow fields');
    });
  });

  describe('runCompleteMigration', () => {
    test('should run complete migration successfully', () => {
      mockProductStore.products = [];
      localStorageMock.getItem.mockReturnValue('[]');
      localStorageMock.setItem.mockImplementation(() => {});

      const result = runCompleteMigration();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.results.productsMigration.success).toBe(true);
      expect(result.results.adminUserCreation.success).toBe(true);
      expect(result.results.notificationPreferences.success).toBe(true);
      expect(result.results.sampleDataCreation.success).toBe(true);
      expect(result.results.dataValidation.success).toBe(true);
    });

    test('should handle migration errors', () => {
      mockProductStore.products = null as any;

      const result = runCompleteMigration();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
