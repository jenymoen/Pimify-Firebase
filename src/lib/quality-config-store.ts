// src/lib/quality-config-store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { QualityRule } from '@/types/quality';
import type { ProductStatus } from '@/types/product';

interface QualityConfigState {
  rules: QualityRule[];
  getQualityRules: () => QualityRule[];
  updateQualityRule: (field: string, updates: Partial<QualityRule>) => void;
  resetToDefaults: () => void;
}

/**
 * Default quality rules with sensible defaults for all Product fields
 * Weight values determine importance in completeness scoring
 * requiredForStatus determines which product statuses require this field
 */
export const DEFAULT_QUALITY_RULES: QualityRule[] = [
  // Critical fields (40% total weight)
  {
    field: 'basicInfo.name',
    weight: 10,
    requiredForStatus: ['active', 'development', 'inactive'],
  },
  {
    field: 'basicInfo.sku',
    weight: 10,
    requiredForStatus: ['active', 'development', 'inactive'],
  },
  {
    field: 'basicInfo.status',
    weight: 5,
    requiredForStatus: ['active', 'development', 'inactive'],
  },
  {
    field: 'pricingAndStock.standardPrice',
    weight: 15,
    requiredForStatus: ['active', 'inactive'],
  },
  
  // Important fields (40% total weight)
  {
    field: 'basicInfo.descriptionShort',
    weight: 10,
    requiredForStatus: ['active', 'inactive'],
  },
  {
    field: 'basicInfo.descriptionLong',
    weight: 10,
    requiredForStatus: ['active', 'inactive'],
  },
  {
    field: 'basicInfo.brand',
    weight: 10,
    requiredForStatus: ['active', 'inactive'],
  },
  {
    field: 'media.images',
    weight: 10,
    requiredForStatus: ['active'],
  },
  
  // Optional fields (20% total weight)
  {
    field: 'basicInfo.gtin',
    weight: 5,
    requiredForStatus: ['active'],
  },
  {
    field: 'marketingSEO.seoTitle',
    weight: 5,
    requiredForStatus: ['active'],
  },
  {
    field: 'marketingSEO.seoDescription',
    weight: 5,
    requiredForStatus: ['active'],
  },
  {
    field: 'marketingSEO.keywords',
    weight: 5,
    requiredForStatus: ['active'],
  },
];

/**
 * Quality Configuration Store
 * Manages configurable quality rules with localStorage persistence
 */
export const useQualityConfigStore = create<QualityConfigState>()(
  persist(
    (set, get) => ({
      rules: DEFAULT_QUALITY_RULES,

      /**
       * Get current quality rules
       * @returns Array of quality rules
       */
      getQualityRules: () => {
        return get().rules;
      },

      /**
       * Update a specific quality rule
       * @param field - Field identifier to update
       * @param updates - Partial updates to apply to the rule
       */
      updateQualityRule: (field: string, updates: Partial<QualityRule>) => {
        set(state => ({
          rules: state.rules.map(rule =>
            rule.field === field
              ? { ...rule, ...updates }
              : rule
          ),
        }));
      },

      /**
       * Reset all quality rules to default values
       */
      resetToDefaults: () => {
        set({ rules: [...DEFAULT_QUALITY_RULES] });
      },
    }),
    {
      name: 'quality-rules-storage',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          // Server-side rendering fallback
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
    }
  )
);

