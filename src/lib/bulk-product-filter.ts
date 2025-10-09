/**
 * Bulk Product Filter
 * 
 * Advanced filtering system for bulk product operations
 */

import { Product } from '@/types/product';
import { WorkflowState, UserRole } from '@/types/workflow';

/**
 * Filter criteria for bulk operations
 */
export interface BulkProductFilterCriteria {
  // Text search
  searchQuery?: string;
  
  // Product attributes
  categories?: string[];
  brands?: string[];
  skus?: string[];
  tags?: string[];
  
  // Workflow filters
  workflowStates?: WorkflowState[];
  assignedReviewers?: string[];
  createdBy?: string[];
  lastModifiedBy?: string[];
  
  // Date range filters
  createdDateRange?: {
    from?: Date;
    to?: Date;
  };
  modifiedDateRange?: {
    from?: Date;
    to?: Date;
  };
  dueDateRange?: {
    from?: Date;
    to?: Date;
  };
  
  // Status filters
  hasImages?: boolean;
  hasVariants?: boolean;
  hasMetafields?: boolean;
  isPublished?: boolean;
  isArchived?: boolean;
  
  // Price range
  priceRange?: {
    min?: number;
    max?: number;
  };
  
  // Stock filters
  stockRange?: {
    min?: number;
    max?: number;
  };
  inStock?: boolean;
  outOfStock?: boolean;
  
  // Custom filters
  customFilters?: Record<string, any>;
}

/**
 * Filter operator
 */
export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  BETWEEN = 'between',
  IN = 'in',
  NOT_IN = 'not_in',
}

/**
 * Filter rule
 */
export interface FilterRule {
  field: string;
  operator: FilterOperator;
  value: any;
  caseSensitive?: boolean;
}

/**
 * Filter group (AND/OR logic)
 */
export interface FilterGroup {
  logic: 'AND' | 'OR';
  rules: (FilterRule | FilterGroup)[];
}

/**
 * Filter preset
 */
export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  criteria: BulkProductFilterCriteria;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Filter result
 */
export interface FilterResult {
  products: Product[];
  totalCount: number;
  matchedCount: number;
  executionTime: number; // milliseconds
  appliedFilters: string[];
}

/**
 * Bulk Product Filter Class
 */
export class BulkProductFilter {
  private presets: Map<string, FilterPreset> = new Map();

  /**
   * Apply filters to products
   */
  filter(
    products: Product[],
    criteria: BulkProductFilterCriteria
  ): FilterResult {
    const startTime = Date.now();
    const appliedFilters: string[] = [];

    let filtered = [...products];

    // Text search
    if (criteria.searchQuery) {
      const query = criteria.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query)
      );
      appliedFilters.push('search');
    }

    // Category filter
    if (criteria.categories && criteria.categories.length > 0) {
      filtered = filtered.filter(p => criteria.categories!.includes(p.category));
      appliedFilters.push('categories');
    }

    // Brand filter
    if (criteria.brands && criteria.brands.length > 0) {
      filtered = filtered.filter(p => criteria.brands!.includes(p.brand));
      appliedFilters.push('brands');
    }

    // SKU filter
    if (criteria.skus && criteria.skus.length > 0) {
      filtered = filtered.filter(p => criteria.skus!.includes(p.sku));
      appliedFilters.push('skus');
    }

    // Workflow state filter
    if (criteria.workflowStates && criteria.workflowStates.length > 0) {
      filtered = filtered.filter(p => 
        p.workflowState && criteria.workflowStates!.includes(p.workflowState)
      );
      appliedFilters.push('workflow_states');
    }

    // Assigned reviewer filter
    if (criteria.assignedReviewers && criteria.assignedReviewers.length > 0) {
      filtered = filtered.filter(p => 
        p.assignedTo && criteria.assignedReviewers!.includes(p.assignedTo)
      );
      appliedFilters.push('assigned_reviewers');
    }

    // Created by filter
    if (criteria.createdBy && criteria.createdBy.length > 0) {
      filtered = filtered.filter(p => 
        p.createdBy && criteria.createdBy!.includes(p.createdBy)
      );
      appliedFilters.push('created_by');
    }

    // Created date range filter
    if (criteria.createdDateRange) {
      const { from, to } = criteria.createdDateRange;
      if (from) {
        filtered = filtered.filter(p => p.createdAt >= from);
      }
      if (to) {
        filtered = filtered.filter(p => p.createdAt <= to);
      }
      if (from || to) {
        appliedFilters.push('created_date');
      }
    }

    // Modified date range filter
    if (criteria.modifiedDateRange) {
      const { from, to } = criteria.modifiedDateRange;
      if (from) {
        filtered = filtered.filter(p => p.updatedAt >= from);
      }
      if (to) {
        filtered = filtered.filter(p => p.updatedAt <= to);
      }
      if (from || to) {
        appliedFilters.push('modified_date');
      }
    }

    // Has images filter
    if (criteria.hasImages !== undefined) {
      filtered = filtered.filter(p => 
        criteria.hasImages ? p.images.length > 0 : p.images.length === 0
      );
      appliedFilters.push('has_images');
    }

    // Has variants filter
    if (criteria.hasVariants !== undefined) {
      filtered = filtered.filter(p => 
        criteria.hasVariants ? p.variants.length > 0 : p.variants.length === 0
      );
      appliedFilters.push('has_variants');
    }

    // Has metafields filter
    if (criteria.hasMetafields !== undefined) {
      filtered = filtered.filter(p => 
        criteria.hasMetafields ? p.metafields.length > 0 : p.metafields.length === 0
      );
      appliedFilters.push('has_metafields');
    }

    const executionTime = Date.now() - startTime;

    return {
      products: filtered,
      totalCount: products.length,
      matchedCount: filtered.length,
      executionTime,
      appliedFilters,
    };
  }

  /**
   * Apply filter group (advanced filtering)
   */
  applyFilterGroup(products: Product[], group: FilterGroup): Product[] {
    if (group.logic === 'AND') {
      return group.rules.reduce((filtered, rule) => {
        if ('logic' in rule) {
          return this.applyFilterGroup(filtered, rule);
        } else {
          return this.applyFilterRule(filtered, rule);
        }
      }, products);
    } else {
      // OR logic
      const results = new Set<Product>();
      group.rules.forEach(rule => {
        const ruleResults = 'logic' in rule
          ? this.applyFilterGroup(products, rule)
          : this.applyFilterRule(products, rule);
        ruleResults.forEach(p => results.add(p));
      });
      return Array.from(results);
    }
  }

  /**
   * Apply single filter rule
   */
  private applyFilterRule(products: Product[], rule: FilterRule): Product[] {
    return products.filter(product => {
      const value = this.getProductFieldValue(product, rule.field);
      return this.evaluateRule(value, rule);
    });
  }

  /**
   * Get product field value
   */
  private getProductFieldValue(product: Product, field: string): any {
    const parts = field.split('.');
    let value: any = product;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Evaluate filter rule
   */
  private evaluateRule(value: any, rule: FilterRule): boolean {
    const compareValue = rule.caseSensitive ? rule.value : rule.value?.toString().toLowerCase();
    const actualValue = rule.caseSensitive ? value : value?.toString().toLowerCase();

    switch (rule.operator) {
      case FilterOperator.EQUALS:
        return actualValue === compareValue;
      case FilterOperator.NOT_EQUALS:
        return actualValue !== compareValue;
      case FilterOperator.CONTAINS:
        return actualValue?.includes(compareValue);
      case FilterOperator.NOT_CONTAINS:
        return !actualValue?.includes(compareValue);
      case FilterOperator.STARTS_WITH:
        return actualValue?.startsWith(compareValue);
      case FilterOperator.ENDS_WITH:
        return actualValue?.endsWith(compareValue);
      case FilterOperator.GREATER_THAN:
        return actualValue > compareValue;
      case FilterOperator.LESS_THAN:
        return actualValue < compareValue;
      case FilterOperator.BETWEEN:
        return actualValue >= rule.value.min && actualValue <= rule.value.max;
      case FilterOperator.IN:
        return Array.isArray(rule.value) && rule.value.includes(actualValue);
      case FilterOperator.NOT_IN:
        return Array.isArray(rule.value) && !rule.value.includes(actualValue);
      default:
        return true;
    }
  }

  /**
   * Save filter preset
   */
  savePreset(preset: FilterPreset): void {
    this.presets.set(preset.id, preset);
  }

  /**
   * Get filter preset
   */
  getPreset(id: string): FilterPreset | null {
    return this.presets.get(id) || null;
  }

  /**
   * Get all presets
   */
  getPresets(userId?: string, publicOnly: boolean = false): FilterPreset[] {
    let presets = Array.from(this.presets.values());

    if (publicOnly) {
      presets = presets.filter(p => p.isPublic);
    }

    if (userId) {
      presets = presets.filter(p => p.isPublic || p.createdBy === userId);
    }

    return presets.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Delete filter preset
   */
  deletePreset(id: string): boolean {
    return this.presets.delete(id);
  }

  /**
   * Get available filter values
   */
  getAvailableFilterValues(products: Product[]): {
    categories: string[];
    brands: string[];
    workflowStates: WorkflowState[];
    reviewers: string[];
  } {
    const categories = new Set<string>();
    const brands = new Set<string>();
    const workflowStates = new Set<WorkflowState>();
    const reviewers = new Set<string>();

    products.forEach(product => {
      if (product.category) categories.add(product.category);
      if (product.brand) brands.add(product.brand);
      if (product.workflowState) workflowStates.add(product.workflowState);
      if (product.assignedTo) reviewers.add(product.assignedTo);
    });

    return {
      categories: Array.from(categories).sort(),
      brands: Array.from(brands).sort(),
      workflowStates: Array.from(workflowStates).sort(),
      reviewers: Array.from(reviewers).sort(),
    };
  }
}

/**
 * Default bulk product filter instance
 */
export const bulkProductFilter = new BulkProductFilter();

export default BulkProductFilter;
