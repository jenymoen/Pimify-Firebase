// src/lib/product-quality.ts

import type { Product, ProductStatus } from '@/types/product';
import type { QualityMetrics, ValidationError } from '@/types/quality';

/**
 * Field weight constants for quality scoring
 * Total weight should sum to 100 for percentage calculation
 */

// Critical fields (40% total weight) - Essential for product listing
export const CRITICAL_FIELDS = {
  'basicInfo.name': 10,
  'basicInfo.sku': 10,
  'basicInfo.status': 5,
  'pricingAndStock.standardPrice': 15,
} as const;

// Important fields (40% total weight) - Needed for good product experience
export const IMPORTANT_FIELDS = {
  'basicInfo.descriptionShort': 10,
  'basicInfo.descriptionLong': 10,
  'basicInfo.brand': 10,
  'media.images': 10,
} as const;

// Optional fields (20% total weight) - Nice to have
export const OPTIONAL_FIELDS = {
  'basicInfo.gtin': 5,
  'marketingSEO.seoTitle': 5,
  'marketingSEO.seoDescription': 5,
  'marketingSEO.keywords': 5,
} as const;

// Combine all field weights
export const ALL_FIELD_WEIGHTS = {
  ...CRITICAL_FIELDS,
  ...IMPORTANT_FIELDS,
  ...OPTIONAL_FIELDS,
} as const;

/**
 * Status-based completeness thresholds
 */
export const STATUS_THRESHOLDS = {
  active: 90,      // Active products need 90%+ completeness
  development: 60, // Development products need 60%+
  inactive: 80,    // Inactive products need 80%+
  discontinued: 0, // Discontinued products are excluded from quality checks
} as const;

/**
 * Check if a product has missing required fields
 * @param product - Product to check
 * @returns Array of field names that are missing
 */
export function checkMissingFields(product: Product): string[] {
  const missingFields: string[] = [];

  // Check basic info fields
  if (!product.basicInfo.name?.en && !product.basicInfo.name?.no) {
    missingFields.push('name');
  }
  if (!product.basicInfo.sku || product.basicInfo.sku.trim() === '') {
    missingFields.push('sku');
  }
  if (!product.basicInfo.descriptionShort?.en && !product.basicInfo.descriptionShort?.no) {
    missingFields.push('descriptionShort');
  }
  if (!product.basicInfo.descriptionLong?.en && !product.basicInfo.descriptionLong?.no) {
    missingFields.push('descriptionLong');
  }
  if (!product.basicInfo.brand || product.basicInfo.brand.trim() === '') {
    missingFields.push('brand');
  }
  if (!product.basicInfo.status) {
    missingFields.push('status');
  }

  // Check pricing
  if (!product.pricingAndStock?.standardPrice || 
      product.pricingAndStock.standardPrice.length === 0 ||
      product.pricingAndStock.standardPrice[0]?.amount === undefined) {
    missingFields.push('standardPrice');
  }

  return missingFields;
}

/**
 * Check if a product has missing images
 * @param product - Product to check
 * @returns True if product has zero images
 */
export function checkMissingImages(product: Product): boolean {
  return !product.media?.images || product.media.images.length === 0;
}

/**
 * Validate product data for common issues
 * @param product - Product to validate
 * @returns Array of validation errors
 */
export function validateProduct(product: Product): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate GTIN format (must be numeric, 8/12/13/14 digits)
  if (product.basicInfo.gtin) {
    const gtin = product.basicInfo.gtin.trim();
    const isNumeric = /^\d+$/.test(gtin);
    const validLengths = [8, 12, 13, 14];
    
    if (!isNumeric || !validLengths.includes(gtin.length)) {
      errors.push({
        type: 'invalid-gtin',
        message: `GTIN must be numeric and 8, 12, 13, or 14 digits. Current: "${gtin}"`,
        severity: 'warning',
      });
    }
  }

  // Validate negative price amounts
  const checkNegativePrice = (priceArray: any[] | undefined, priceType: string) => {
    if (priceArray && priceArray.length > 0) {
      priceArray.forEach((price, index) => {
        if (price.amount !== undefined && price.amount < 0) {
          errors.push({
            type: 'negative-price',
            message: `${priceType} amount cannot be negative. Found: ${price.amount}`,
            severity: 'critical',
          });
        }
      });
    }
  };

  checkNegativePrice(product.pricingAndStock?.standardPrice, 'Standard price');
  checkNegativePrice(product.pricingAndStock?.salePrice, 'Sale price');
  checkNegativePrice(product.pricingAndStock?.costPrice, 'Cost price');

  // Validate currency codes (must be 3 uppercase letters)
  const checkCurrencyCode = (priceArray: any[] | undefined, priceType: string) => {
    if (priceArray && priceArray.length > 0) {
      priceArray.forEach((price, index) => {
        if (price.currency) {
          const isValid = /^[A-Z]{3}$/.test(price.currency);
          if (!isValid) {
            errors.push({
              type: 'invalid-currency',
              message: `${priceType} currency code must be 3 uppercase letters. Found: "${price.currency}"`,
              severity: 'critical',
            });
          }
        }
      });
    }
  };

  checkCurrencyCode(product.pricingAndStock?.standardPrice, 'Standard price');
  checkCurrencyCode(product.pricingAndStock?.salePrice, 'Sale price');
  checkCurrencyCode(product.pricingAndStock?.costPrice, 'Cost price');

  // Validate sale price not higher than standard price
  if (product.pricingAndStock?.standardPrice?.[0] && product.pricingAndStock?.salePrice?.[0]) {
    const standardAmount = product.pricingAndStock.standardPrice[0].amount;
    const saleAmount = product.pricingAndStock.salePrice[0].amount;
    
    if (saleAmount > standardAmount) {
      errors.push({
        type: 'sale-price-higher',
        message: `Sale price (${saleAmount}) cannot be higher than standard price (${standardAmount})`,
        severity: 'warning',
      });
    }
  }

  // Validate products with options but no variants
  if (product.options && product.options.length > 0) {
    if (!product.variants || product.variants.length === 0) {
      errors.push({
        type: 'options-without-variants',
        message: 'Product has options defined but no variants generated',
        severity: 'warning',
      });
    }
  }

  // Validate variants with missing SKUs
  if (product.variants && product.variants.length > 0) {
    product.variants.forEach((variant, index) => {
      if (!variant.sku || variant.sku.trim() === '') {
        errors.push({
          type: 'variant-missing-sku',
          message: `Variant at index ${index} is missing SKU`,
          severity: 'critical',
        });
      }
    });
  }

  return errors;
}

/**
 * Calculate product completeness score using weighted scoring
 * @param product - Product to score
 * @param status - Optional status override for threshold checking
 * @returns Completeness score from 0-100
 */
export function calculateCompletenessScore(product: Product, status?: ProductStatus): number {
  let totalScore = 0;
  let maxPossibleScore = 0;

  // Helper to check if a field has a value
  const hasValue = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'object' && !Array.isArray(value)) {
      // For multilingual strings, check if at least one language has value
      return Object.values(value).some(v => v && typeof v === 'string' && v.trim() !== '');
    }
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  // Calculate critical fields score (40% weight)
  Object.entries(CRITICAL_FIELDS).forEach(([field, weight]) => {
    maxPossibleScore += weight;
    
    if (field === 'basicInfo.name') {
      if (hasValue(product.basicInfo.name)) totalScore += weight;
    } else if (field === 'basicInfo.sku') {
      if (hasValue(product.basicInfo.sku)) totalScore += weight;
    } else if (field === 'basicInfo.status') {
      if (hasValue(product.basicInfo.status)) totalScore += weight;
    } else if (field === 'pricingAndStock.standardPrice') {
      if (product.pricingAndStock?.standardPrice?.[0]?.amount !== undefined) {
        totalScore += weight;
      }
    }
  });

  // Calculate important fields score (40% weight)
  Object.entries(IMPORTANT_FIELDS).forEach(([field, weight]) => {
    maxPossibleScore += weight;
    
    if (field === 'basicInfo.descriptionShort') {
      if (hasValue(product.basicInfo.descriptionShort)) totalScore += weight;
    } else if (field === 'basicInfo.descriptionLong') {
      if (hasValue(product.basicInfo.descriptionLong)) totalScore += weight;
    } else if (field === 'basicInfo.brand') {
      if (hasValue(product.basicInfo.brand)) totalScore += weight;
    } else if (field === 'media.images') {
      if (product.media?.images && product.media.images.length > 0) {
        totalScore += weight;
      }
    }
  });

  // Calculate optional fields score (20% weight)
  Object.entries(OPTIONAL_FIELDS).forEach(([field, weight]) => {
    maxPossibleScore += weight;
    
    if (field === 'basicInfo.gtin') {
      if (hasValue(product.basicInfo.gtin)) totalScore += weight;
    } else if (field === 'marketingSEO.seoTitle') {
      if (hasValue(product.marketingSEO.seoTitle)) totalScore += weight;
    } else if (field === 'marketingSEO.seoDescription') {
      if (hasValue(product.marketingSEO.seoDescription)) totalScore += weight;
    } else if (field === 'marketingSEO.keywords') {
      if (product.marketingSEO?.keywords && product.marketingSEO.keywords.length > 0) {
        totalScore += weight;
      }
    }
  });

  // Calculate percentage score
  const score = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
  
  return Math.round(score);
}

/**
 * Calculate complete quality metrics for a product
 * @param product - Product to assess
 * @returns Complete quality metrics object
 */
export function calculateQualityMetrics(product: Product): QualityMetrics {
  const missingFields = checkMissingFields(product);
  const validationErrors = validateProduct(product);
  const completenessScore = calculateCompletenessScore(product);

  return {
    completenessScore,
    missingFields,
    validationErrors,
    lastChecked: new Date().toISOString(),
  };
}

/**
 * Get color code based on quality score
 * @param score - Completeness score (0-100)
 * @returns Color name: 'green', 'yellow', or 'red'
 */
export function getQualityColor(score: number): 'green' | 'yellow' | 'red' {
  if (score > 90) return 'green';
  if (score >= 70) return 'yellow';
  return 'red';
}

