// src/lib/__tests__/product-quality.test.ts

import { 
  checkMissingFields, 
  checkMissingImages, 
  validateProduct, 
  calculateCompletenessScore, 
  calculateQualityMetrics,
  getQualityColor 
} from '../product-quality';
import type { Product, ProductStatus } from '@/types/product';

// Test data factories
const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'test-product-1',
  basicInfo: {
    name: { en: 'Test Product', no: 'Test Produkt' },
    sku: 'TEST-SKU-001',
    gtin: '1234567890123',
    descriptionShort: { en: 'Short description', no: 'Kort beskrivelse' },
    descriptionLong: { en: 'Long description', no: 'Lang beskrivelse' },
    brand: 'Test Brand',
    status: 'active' as ProductStatus,
  },
  attributesAndSpecs: {
    categories: ['Electronics'],
    properties: [{ id: '1', key: 'Color', value: 'Black' }],
    technicalSpecs: [{ id: '1', key: 'Weight', value: '1kg' }],
    countryOfOrigin: 'Norway',
  },
  media: {
    images: [{ id: '1', url: 'https://example.com/image.jpg', type: 'image' }],
  },
  marketingSEO: {
    seoTitle: { en: 'SEO Title', no: 'SEO Tittel' },
    seoDescription: { en: 'SEO Description', no: 'SEO Beskrivelse' },
    keywords: ['test', 'product'],
  },
  pricingAndStock: {
    standardPrice: [{ id: '1', amount: 1000, currency: 'NOK' }],
    salePrice: [],
    costPrice: [],
  },
  options: [],
  variants: [],
  aiSummary: { en: 'AI Summary', no: 'AI Sammendrag' },
  createdAt: '2023-01-01T00:00:00.000Z',
  updatedAt: '2023-01-01T00:00:00.000Z',
  ...overrides,
});

describe('Product Quality Functions', () => {
  describe('checkMissingFields', () => {
    it('should return empty array for complete product', () => {
      const product = createMockProduct();
      const missing = checkMissingFields(product);
      expect(missing).toEqual([]);
    });

    it('should detect missing name', () => {
      const product = createMockProduct({
        basicInfo: {
          ...createMockProduct().basicInfo,
          name: { en: '', no: '' },
        },
      });
      const missing = checkMissingFields(product);
      expect(missing).toContain('basicInfo.name');
    });

    it('should detect missing SKU', () => {
      const product = createMockProduct({
        basicInfo: {
          ...createMockProduct().basicInfo,
          sku: '',
        },
      });
      const missing = checkMissingFields(product);
      expect(missing).toContain('basicInfo.sku');
    });

    it('should detect missing brand', () => {
      const product = createMockProduct({
        basicInfo: {
          ...createMockProduct().basicInfo,
          brand: '',
        },
      });
      const missing = checkMissingFields(product);
      expect(missing).toContain('basicInfo.brand');
    });

    it('should detect missing descriptionShort', () => {
      const product = createMockProduct({
        basicInfo: {
          ...createMockProduct().basicInfo,
          descriptionShort: { en: '', no: '' },
        },
      });
      const missing = checkMissingFields(product);
      expect(missing).toContain('basicInfo.descriptionShort');
    });

    it('should detect missing descriptionLong', () => {
      const product = createMockProduct({
        basicInfo: {
          ...createMockProduct().basicInfo,
          descriptionLong: { en: '', no: '' },
        },
      });
      const missing = checkMissingFields(product);
      expect(missing).toContain('basicInfo.descriptionLong');
    });

    it('should detect missing standard price', () => {
      const product = createMockProduct({
        pricingAndStock: {
          standardPrice: [],
          salePrice: [],
          costPrice: [],
        },
      });
      const missing = checkMissingFields(product);
      expect(missing).toContain('pricingAndStock.standardPrice');
    });

    it('should detect multiple missing fields', () => {
      const product = createMockProduct({
        basicInfo: {
          ...createMockProduct().basicInfo,
          name: { en: '', no: '' },
          sku: '',
          brand: '',
        },
      });
      const missing = checkMissingFields(product);
      expect(missing).toContain('basicInfo.name');
      expect(missing).toContain('basicInfo.sku');
      expect(missing).toContain('basicInfo.brand');
    });
  });

  describe('checkMissingImages', () => {
    it('should return false for product with images', () => {
      const product = createMockProduct();
      const hasMissingImages = checkMissingImages(product);
      expect(hasMissingImages).toBe(false);
    });

    it('should return true for product with no images', () => {
      const product = createMockProduct({
        media: { images: [] },
      });
      const hasMissingImages = checkMissingImages(product);
      expect(hasMissingImages).toBe(true);
    });

    it('should return true for product with undefined images', () => {
      const product = createMockProduct({
        media: { images: undefined as any },
      });
      const hasMissingImages = checkMissingImages(product);
      expect(hasMissingImages).toBe(true);
    });
  });

  describe('validateProduct', () => {
    it('should return empty array for valid product', () => {
      const product = createMockProduct();
      const errors = validateProduct(product);
      expect(errors).toEqual([]);
    });

    it('should detect invalid GTIN format', () => {
      const product = createMockProduct({
        basicInfo: {
          ...createMockProduct().basicInfo,
          gtin: 'invalid-gtin',
        },
      });
      const errors = validateProduct(product);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('invalid-gtin');
      expect(errors[0].severity).toBe('critical');
    });

    it('should detect negative price', () => {
      const product = createMockProduct({
        pricingAndStock: {
          standardPrice: [{ id: '1', amount: -100, currency: 'NOK' }],
          salePrice: [],
          costPrice: [],
        },
      });
      const errors = validateProduct(product);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('negative-price');
      expect(errors[0].severity).toBe('critical');
    });

    it('should detect invalid currency code', () => {
      const product = createMockProduct({
        pricingAndStock: {
          standardPrice: [{ id: '1', amount: 1000, currency: 'invalid' }],
          salePrice: [],
          costPrice: [],
        },
      });
      const errors = validateProduct(product);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('invalid-currency-code');
      expect(errors[0].severity).toBe('critical');
    });

    it('should detect sale price higher than standard price', () => {
      const product = createMockProduct({
        pricingAndStock: {
          standardPrice: [{ id: '1', amount: 1000, currency: 'NOK' }],
          salePrice: [{ id: '2', amount: 1500, currency: 'NOK' }],
          costPrice: [],
        },
      });
      const errors = validateProduct(product);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('sale-price-higher-than-standard');
      expect(errors[0].severity).toBe('warning');
    });

    it('should detect options without variants', () => {
      const product = createMockProduct({
        options: [{ id: '1', name: 'Color', values: ['Red', 'Blue'] }],
        variants: [],
      });
      const errors = validateProduct(product);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('options-no-variants');
      expect(errors[0].severity).toBe('critical');
    });

    it('should detect variant without SKU', () => {
      const product = createMockProduct({
        variants: [{ id: '1', sku: '', optionValues: { Color: 'Red' } }],
      });
      const errors = validateProduct(product);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('missing-variant-sku');
      expect(errors[0].severity).toBe('critical');
    });

    it('should detect multiple validation errors', () => {
      const product = createMockProduct({
        basicInfo: {
          ...createMockProduct().basicInfo,
          gtin: 'invalid',
        },
        pricingAndStock: {
          standardPrice: [{ id: '1', amount: -100, currency: 'invalid' }],
          salePrice: [],
          costPrice: [],
        },
      });
      const errors = validateProduct(product);
      expect(errors).toHaveLength(3);
    });
  });

  describe('calculateCompletenessScore', () => {
    it('should return 100 for complete product', () => {
      const product = createMockProduct();
      const score = calculateCompletenessScore(product);
      expect(score).toBe(100);
    });

    it('should return lower score for incomplete product', () => {
      const product = createMockProduct({
        basicInfo: {
          ...createMockProduct().basicInfo,
          name: { en: '', no: '' },
          brand: '',
        },
      });
      const score = calculateCompletenessScore(product);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(0);
    });

    it('should return 100 for discontinued products', () => {
      const product = createMockProduct({
        basicInfo: {
          ...createMockProduct().basicInfo,
          status: 'discontinued' as ProductStatus,
          name: { en: '', no: '' },
        },
      });
      const score = calculateCompletenessScore(product);
      expect(score).toBe(100);
    });

    it('should handle products with no quality metrics', () => {
      const product = createMockProduct({
        qualityMetrics: undefined,
      });
      const score = calculateCompletenessScore(product);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateQualityMetrics', () => {
    it('should calculate metrics for complete product', () => {
      const product = createMockProduct();
      const metrics = calculateQualityMetrics(product);
      
      expect(metrics).toHaveProperty('completenessScore');
      expect(metrics).toHaveProperty('missingFields');
      expect(metrics).toHaveProperty('validationErrors');
      expect(metrics).toHaveProperty('lastChecked');
      
      expect(metrics.completenessScore).toBe(100);
      expect(metrics.missingFields).toEqual([]);
      expect(metrics.validationErrors).toEqual([]);
      expect(metrics.lastChecked).toBeDefined();
    });

    it('should calculate metrics for incomplete product', () => {
      const product = createMockProduct({
        basicInfo: {
          ...createMockProduct().basicInfo,
          name: { en: '', no: '' },
          brand: '',
        },
      });
      const metrics = calculateQualityMetrics(product);
      
      expect(metrics.completenessScore).toBeLessThan(100);
      expect(metrics.missingFields.length).toBeGreaterThan(0);
      expect(metrics.validationErrors).toEqual([]);
    });

    it('should include validation errors in metrics', () => {
      const product = createMockProduct({
        basicInfo: {
          ...createMockProduct().basicInfo,
          gtin: 'invalid-gtin',
        },
      });
      const metrics = calculateQualityMetrics(product);
      
      expect(metrics.validationErrors.length).toBeGreaterThan(0);
      expect(metrics.validationErrors[0].type).toBe('invalid-gtin');
    });
  });

  describe('getQualityColor', () => {
    it('should return green for scores >= 90', () => {
      expect(getQualityColor(95)).toBe('green');
      expect(getQualityColor(90)).toBe('green');
      expect(getQualityColor(100)).toBe('green');
    });

    it('should return yellow for scores 70-89', () => {
      expect(getQualityColor(85)).toBe('yellow');
      expect(getQualityColor(70)).toBe('yellow');
    });

    it('should return red for scores < 70', () => {
      expect(getQualityColor(65)).toBe('red');
      expect(getQualityColor(0)).toBe('red');
    });

    it('should handle edge cases', () => {
      expect(getQualityColor(89.9)).toBe('yellow');
      expect(getQualityColor(90.1)).toBe('green');
      expect(getQualityColor(69.9)).toBe('red');
    });
  });
});

describe('Quality Rules and Configuration', () => {
  it('should handle different product statuses correctly', () => {
    const statuses: ProductStatus[] = ['active', 'development', 'inactive', 'discontinued'];
    
    statuses.forEach(status => {
      const product = createMockProduct({
        basicInfo: {
          ...createMockProduct().basicInfo,
          status,
        },
      });
      const metrics = calculateQualityMetrics(product);
      expect(metrics.completenessScore).toBeDefined();
    });
  });

  it('should handle products with variants correctly', () => {
    const product = createMockProduct({
      options: [{ id: '1', name: 'Color', values: ['Red', 'Blue'] }],
      variants: [
        { id: '1', sku: 'VARIANT-1', optionValues: { Color: 'Red' } },
        { id: '2', sku: 'VARIANT-2', optionValues: { Color: 'Blue' } },
      ],
    });
    const metrics = calculateQualityMetrics(product);
    expect(metrics).toBeDefined();
    expect(metrics.completenessScore).toBeGreaterThanOrEqual(0);
  });
});
