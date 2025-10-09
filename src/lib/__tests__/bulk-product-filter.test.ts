import {
  BulkProductFilter,
  BulkProductFilterCriteria,
  FilterRule,
  FilterGroup,
  FilterOperator,
  FilterPreset,
  bulkProductFilter,
} from '../bulk-product-filter';
import { Product } from '@/types/product';
import { WorkflowState } from '@/types/workflow';

// Mock products for testing
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Product A',
    sku: 'SKU-001',
    brand: 'Brand X',
    category: 'Electronics',
    description: 'Electronic product',
    workflowState: WorkflowState.DRAFT,
    assignedTo: 'reviewer-1',
    createdBy: 'user-1',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-15'),
    images: ['image1.jpg'],
    variants: [],
    metafields: [],
  },
  {
    id: '2',
    name: 'Product B',
    sku: 'SKU-002',
    brand: 'Brand Y',
    category: 'Clothing',
    description: 'Clothing item',
    workflowState: WorkflowState.REVIEW,
    assignedTo: 'reviewer-2',
    createdBy: 'user-2',
    createdAt: new Date('2023-02-01'),
    updatedAt: new Date('2023-02-15'),
    images: [],
    variants: [{ id: 'v1', title: 'Variant 1' }] as any,
    metafields: [],
  },
  {
    id: '3',
    name: 'Product C',
    sku: 'SKU-003',
    brand: 'Brand X',
    category: 'Electronics',
    description: 'Another electronic product',
    workflowState: WorkflowState.APPROVED,
    assignedTo: 'reviewer-1',
    createdBy: 'user-1',
    createdAt: new Date('2023-03-01'),
    updatedAt: new Date('2023-03-15'),
    images: ['image1.jpg', 'image2.jpg'],
    variants: [],
    metafields: [{ key: 'meta1', value: 'value1' }] as any,
  },
];

describe('BulkProductFilter', () => {
  let filter: BulkProductFilter;

  beforeEach(() => {
    filter = new BulkProductFilter();
  });

  describe('Basic Filtering', () => {
    it('should return all products with no filters', () => {
      const result = filter.filter(mockProducts, {});
      
      expect(result.matchedCount).toBe(3);
      expect(result.totalCount).toBe(3);
      expect(result.appliedFilters).toHaveLength(0);
    });

    it('should filter by search query', () => {
      const result = filter.filter(mockProducts, {
        searchQuery: 'Product A',
      });
      
      expect(result.matchedCount).toBe(1);
      expect(result.products[0].name).toBe('Product A');
      expect(result.appliedFilters).toContain('search');
    });

    it('should filter by category', () => {
      const result = filter.filter(mockProducts, {
        categories: ['Electronics'],
      });
      
      expect(result.matchedCount).toBe(2);
      expect(result.products.every(p => p.category === 'Electronics')).toBe(true);
      expect(result.appliedFilters).toContain('categories');
    });

    it('should filter by brand', () => {
      const result = filter.filter(mockProducts, {
        brands: ['Brand X'],
      });
      
      expect(result.matchedCount).toBe(2);
      expect(result.products.every(p => p.brand === 'Brand X')).toBe(true);
      expect(result.appliedFilters).toContain('brands');
    });

    it('should filter by workflow state', () => {
      const result = filter.filter(mockProducts, {
        workflowStates: [WorkflowState.DRAFT, WorkflowState.REVIEW],
      });
      
      expect(result.matchedCount).toBe(2);
      expect(result.appliedFilters).toContain('workflow_states');
    });

    it('should filter by assigned reviewer', () => {
      const result = filter.filter(mockProducts, {
        assignedReviewers: ['reviewer-1'],
      });
      
      expect(result.matchedCount).toBe(2);
      expect(result.products.every(p => p.assignedTo === 'reviewer-1')).toBe(true);
      expect(result.appliedFilters).toContain('assigned_reviewers');
    });
  });

  describe('Date Range Filtering', () => {
    it('should filter by created date range', () => {
      const result = filter.filter(mockProducts, {
        createdDateRange: {
          from: new Date('2023-02-01'),
          to: new Date('2023-03-31'),
        },
      });
      
      expect(result.matchedCount).toBe(2); // Products B and C
      expect(result.appliedFilters).toContain('created_date');
    });

    it('should filter by modified date range', () => {
      const result = filter.filter(mockProducts, {
        modifiedDateRange: {
          from: new Date('2023-02-01'),
        },
      });
      
      expect(result.matchedCount).toBe(2); // Products B and C
      expect(result.appliedFilters).toContain('modified_date');
    });
  });

  describe('Boolean Filters', () => {
    it('should filter by has images', () => {
      const result = filter.filter(mockProducts, {
        hasImages: true,
      });
      
      expect(result.matchedCount).toBe(2); // Products A and C
      expect(result.products.every(p => p.images.length > 0)).toBe(true);
      expect(result.appliedFilters).toContain('has_images');
    });

    it('should filter by has variants', () => {
      const result = filter.filter(mockProducts, {
        hasVariants: true,
      });
      
      expect(result.matchedCount).toBe(1); // Product B
      expect(result.products[0].variants.length).toBeGreaterThan(0);
      expect(result.appliedFilters).toContain('has_variants');
    });

    it('should filter by has metafields', () => {
      const result = filter.filter(mockProducts, {
        hasMetafields: true,
      });
      
      expect(result.matchedCount).toBe(1); // Product C
      expect(result.products[0].metafields.length).toBeGreaterThan(0);
      expect(result.appliedFilters).toContain('has_metafields');
    });
  });

  describe('Combined Filters', () => {
    it('should apply multiple filters together', () => {
      const result = filter.filter(mockProducts, {
        categories: ['Electronics'],
        workflowStates: [WorkflowState.DRAFT],
      });
      
      expect(result.matchedCount).toBe(1); // Only Product A
      expect(result.appliedFilters).toContain('categories');
      expect(result.appliedFilters).toContain('workflow_states');
    });

    it('should handle no matches', () => {
      const result = filter.filter(mockProducts, {
        categories: ['NonExistent'],
      });
      
      expect(result.matchedCount).toBe(0);
      expect(result.products).toHaveLength(0);
    });
  });

  describe('Advanced Filtering', () => {
    it('should apply AND filter group', () => {
      const group: FilterGroup = {
        logic: 'AND',
        rules: [
          { field: 'brand', operator: FilterOperator.EQUALS, value: 'Brand X' },
          { field: 'category', operator: FilterOperator.EQUALS, value: 'Electronics' },
        ],
      };

      const result = filter.applyFilterGroup(mockProducts, group);
      expect(result).toHaveLength(2); // Products A and C
    });

    it('should apply OR filter group', () => {
      const group: FilterGroup = {
        logic: 'OR',
        rules: [
          { field: 'brand', operator: FilterOperator.EQUALS, value: 'Brand X' },
          { field: 'brand', operator: FilterOperator.EQUALS, value: 'Brand Y' },
        ],
      };

      const result = filter.applyFilterGroup(mockProducts, group);
      expect(result).toHaveLength(3); // All products
    });

    it('should handle nested filter groups', () => {
      const group: FilterGroup = {
        logic: 'AND',
        rules: [
          { field: 'category', operator: FilterOperator.EQUALS, value: 'Electronics' },
          {
            logic: 'OR',
            rules: [
              { field: 'workflowState', operator: FilterOperator.EQUALS, value: WorkflowState.DRAFT },
              { field: 'workflowState', operator: FilterOperator.EQUALS, value: WorkflowState.APPROVED },
            ],
          },
        ],
      };

      const result = filter.applyFilterGroup(mockProducts, group);
      expect(result).toHaveLength(2); // Products A and C
    });
  });

  describe('Filter Operators', () => {
    it('should support CONTAINS operator', () => {
      const group: FilterGroup = {
        logic: 'AND',
        rules: [
          { field: 'name', operator: FilterOperator.CONTAINS, value: 'Product' },
        ],
      };

      const result = filter.applyFilterGroup(mockProducts, group);
      expect(result).toHaveLength(3);
    });

    it('should support STARTS_WITH operator', () => {
      const group: FilterGroup = {
        logic: 'AND',
        rules: [
          { field: 'sku', operator: FilterOperator.STARTS_WITH, value: 'SKU-00' },
        ],
      };

      const result = filter.applyFilterGroup(mockProducts, group);
      expect(result).toHaveLength(3);
    });

    it('should support IN operator', () => {
      const group: FilterGroup = {
        logic: 'AND',
        rules: [
          { field: 'brand', operator: FilterOperator.IN, value: ['Brand X', 'Brand Y'], caseSensitive: true },
        ],
      };

      const result = filter.applyFilterGroup(mockProducts, group);
      expect(result).toHaveLength(3);
    });
  });

  describe('Filter Presets', () => {
    const mockPreset: FilterPreset = {
      id: 'preset-1',
      name: 'Electronics in Draft',
      description: 'All electronics products in draft state',
      criteria: {
        categories: ['Electronics'],
        workflowStates: [WorkflowState.DRAFT],
      },
      isPublic: true,
      createdBy: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should save filter preset', () => {
      filter.savePreset(mockPreset);
      
      const retrieved = filter.getPreset('preset-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Electronics in Draft');
    });

    it('should get filter preset', () => {
      filter.savePreset(mockPreset);
      
      const preset = filter.getPreset('preset-1');
      expect(preset).toEqual(mockPreset);
    });

    it('should get all presets', () => {
      filter.savePreset(mockPreset);
      filter.savePreset({
        ...mockPreset,
        id: 'preset-2',
        name: 'Preset 2',
      });

      const presets = filter.getPresets();
      expect(presets).toHaveLength(2);
    });

    it('should filter presets by user', () => {
      filter.savePreset(mockPreset);
      filter.savePreset({
        ...mockPreset,
        id: 'preset-2',
        name: 'Private Preset',
        isPublic: false,
        createdBy: 'user-2',
      });

      const userPresets = filter.getPresets('user-1');
      // user-1 should see: public preset (1) but not user-2's private preset
      expect(userPresets).toHaveLength(1);
    });

    it('should get only public presets', () => {
      filter.savePreset(mockPreset);
      filter.savePreset({
        ...mockPreset,
        id: 'preset-2',
        name: 'Private Preset',
        isPublic: false,
      });

      const publicPresets = filter.getPresets(undefined, true);
      expect(publicPresets).toHaveLength(1);
      expect(publicPresets[0].isPublic).toBe(true);
    });

    it('should delete filter preset', () => {
      filter.savePreset(mockPreset);
      
      const result = filter.deletePreset('preset-1');
      expect(result).toBe(true);
      
      const preset = filter.getPreset('preset-1');
      expect(preset).toBeNull();
    });
  });

  describe('Available Filter Values', () => {
    it('should get available categories', () => {
      const values = filter.getAvailableFilterValues(mockProducts);
      
      expect(values.categories).toContain('Electronics');
      expect(values.categories).toContain('Clothing');
      expect(values.categories).toHaveLength(2);
    });

    it('should get available brands', () => {
      const values = filter.getAvailableFilterValues(mockProducts);
      
      expect(values.brands).toContain('Brand X');
      expect(values.brands).toContain('Brand Y');
      expect(values.brands).toHaveLength(2);
    });

    it('should get available workflow states', () => {
      const values = filter.getAvailableFilterValues(mockProducts);
      
      expect(values.workflowStates).toContain(WorkflowState.DRAFT);
      expect(values.workflowStates).toContain(WorkflowState.REVIEW);
      expect(values.workflowStates).toContain(WorkflowState.APPROVED);
    });

    it('should get available reviewers', () => {
      const values = filter.getAvailableFilterValues(mockProducts);
      
      expect(values.reviewers).toContain('reviewer-1');
      expect(values.reviewers).toContain('reviewer-2');
      expect(values.reviewers).toHaveLength(2);
    });
  });

  describe('Performance', () => {
    it('should track execution time', () => {
      const result = filter.filter(mockProducts, {
        categories: ['Electronics'],
      });
      
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle large product sets', () => {
      const largeProductSet: Product[] = [];
      for (let i = 0; i < 1000; i++) {
        largeProductSet.push({
          ...mockProducts[0],
          id: `product-${i}`,
          name: `Product ${i}`,
        });
      }

      const result = filter.filter(largeProductSet, {
        categories: ['Electronics'],
      });
      
      expect(result.matchedCount).toBe(1000);
      expect(result.executionTime).toBeLessThan(1000); // Should be fast
    });
  });

  describe('Default Instance', () => {
    it('should provide default instance', () => {
      expect(bulkProductFilter).toBeInstanceOf(BulkProductFilter);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty product list', () => {
      const result = filter.filter([], { categories: ['Electronics'] });
      
      expect(result.matchedCount).toBe(0);
      expect(result.totalCount).toBe(0);
    });

    it('should handle undefined product fields', () => {
      const productsWithMissingFields: Product[] = [{
        id: '1',
        name: 'Product',
        sku: 'SKU-001',
        brand: 'Brand',
        category: 'Category',
        createdAt: new Date(),
        updatedAt: new Date(),
        images: [],
        variants: [],
        metafields: [],
      }];

      const result = filter.filter(productsWithMissingFields, {
        workflowStates: [WorkflowState.DRAFT],
      });
      
      expect(result.matchedCount).toBe(0);
    });

    it('should handle case-insensitive search', () => {
      const result = filter.filter(mockProducts, {
        searchQuery: 'product a',
      });
      
      expect(result.matchedCount).toBe(1);
    });

    it('should handle multiple categories', () => {
      const result = filter.filter(mockProducts, {
        categories: ['Electronics', 'Clothing'],
      });
      
      expect(result.matchedCount).toBe(3);
    });

    it('should handle date range with only from date', () => {
      const result = filter.filter(mockProducts, {
        createdDateRange: {
          from: new Date('2023-02-01'),
        },
      });
      
      expect(result.matchedCount).toBe(2); // Products B and C
    });

    it('should handle date range with only to date', () => {
      const result = filter.filter(mockProducts, {
        createdDateRange: {
          to: new Date('2023-02-01'),
        },
      });
      
      expect(result.matchedCount).toBe(2); // Products A and B
    });
  });
});
