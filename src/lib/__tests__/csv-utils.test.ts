// src/lib/__tests__/csv-utils.test.ts

import {
  productToCSVRow,
  csvRowToProduct,
  getCSVHeaders,
  escapeCSVField,
  productsToCSV,
  parseCSV,
  validateCSVData,
  CSVProductRow,
} from '../csv-utils';
import type { Product } from '@/types/product';

// Mock product data
const mockProduct: Product = {
  id: 'test-product-1',
  basicInfo: {
    name: { en: 'Test Product', no: 'Test Produkt' },
    sku: 'TEST-001',
    gtin: '1234567890123',
    descriptionShort: { en: 'Short description', no: 'Kort beskrivelse' },
    descriptionLong: { en: 'Long description', no: 'Lang beskrivelse' },
    brand: 'Test Brand',
    status: 'active',
    launchDate: '2024-01-01',
    endDate: '2024-12-31',
  },
  attributesAndSpecs: {
    categories: ['Electronics', 'Gadgets'],
    properties: [
      { id: '1', key: 'Color', value: 'Black' },
      { id: '2', key: 'Material', value: 'Plastic' },
    ],
    technicalSpecs: [
      { id: '1', key: 'Weight', value: '500g' },
      { id: '2', key: 'Dimensions', value: '10x15x5cm' },
    ],
    countryOfOrigin: 'Norway',
  },
  media: {
    images: [
      { id: '1', url: 'https://example.com/image1.jpg', type: 'image', altText: { en: 'Image 1', no: 'Bilde 1' } },
      { id: '2', url: 'https://example.com/image2.jpg', type: 'image', altText: { en: 'Image 2', no: 'Bilde 2' } },
    ],
  },
  marketingSEO: {
    seoTitle: { en: 'SEO Title', no: 'SEO Tittel' },
    seoDescription: { en: 'SEO Description', no: 'SEO Beskrivelse' },
    keywords: ['test', 'product', 'demo'],
  },
  pricingAndStock: {
    standardPrice: [{ id: '1', amount: 999.99, currency: 'NOK' }],
    salePrice: [{ id: '2', amount: 799.99, currency: 'NOK' }],
    costPrice: [{ id: '3', amount: 500.00, currency: 'NOK' }],
  },
  options: [],
  variants: [],
  aiSummary: { en: 'AI Summary', no: 'AI Sammendrag' },
  qualityMetrics: {
    completenessScore: 95,
    missingFields: [],
    validationErrors: [],
    lastChecked: '2024-01-01T10:00:00.000Z',
  },
  createdAt: '2024-01-01T10:00:00.000Z',
  updatedAt: '2024-01-01T10:00:00.000Z',
};

describe('CSV Utils', () => {
  describe('productToCSVRow', () => {
    it('should convert product to CSV row format', () => {
      const csvRow = productToCSVRow(mockProduct);
      
      expect(csvRow.id).toBe('test-product-1');
      expect(csvRow.sku).toBe('TEST-001');
      expect(csvRow.name_en).toBe('Test Product');
      expect(csvRow.name_no).toBe('Test Produkt');
      expect(csvRow.brand).toBe('Test Brand');
      expect(csvRow.status).toBe('active');
      expect(csvRow.gtin).toBe('1234567890123');
      expect(csvRow.launch_date).toBe('2024-01-01');
      expect(csvRow.end_date).toBe('2024-12-31');
      expect(csvRow.categories).toBe('Electronics; Gadgets');
      expect(csvRow.properties).toBe('Color: Black; Material: Plastic');
      expect(csvRow.technical_specs).toBe('Weight: 500g; Dimensions: 10x15x5cm');
      expect(csvRow.country_of_origin).toBe('Norway');
      expect(csvRow.image_urls).toBe('https://example.com/image1.jpg; https://example.com/image2.jpg');
      expect(csvRow.keywords).toBe('test; product; demo');
      expect(csvRow.standard_price_amount).toBe('999.99');
      expect(csvRow.standard_price_currency).toBe('NOK');
      expect(csvRow.quality_score).toBe('95');
    });

    it('should handle empty or undefined values', () => {
      const emptyProduct: Product = {
        id: 'empty-product',
        basicInfo: {
          name: { en: '', no: '' },
          sku: '',
          status: 'development',
        },
        attributesAndSpecs: {
          categories: [],
          properties: [],
          technicalSpecs: [],
        },
        media: { images: [] },
        marketingSEO: {
          seoTitle: { en: '', no: '' },
          seoDescription: { en: '', no: '' },
          keywords: [],
        },
        pricingAndStock: {
          standardPrice: [],
          salePrice: [],
          costPrice: [],
        },
        options: [],
        variants: [],
        aiSummary: { en: '', no: '' },
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z',
      };

      const csvRow = productToCSVRow(emptyProduct);
      
      expect(csvRow.id).toBe('empty-product');
      expect(csvRow.sku).toBe('');
      expect(csvRow.name_en).toBe('');
      expect(csvRow.categories).toBe('');
      expect(csvRow.properties).toBe('');
      expect(csvRow.image_urls).toBe('');
      expect(csvRow.standard_price_amount).toBe('');
    });
  });

  describe('csvRowToProduct', () => {
    it('should convert CSV row to product format', () => {
      const csvRow: CSVProductRow = {
        id: 'csv-product-1',
        sku: 'CSV-001',
        name_en: 'CSV Product',
        name_no: 'CSV Produkt',
        description_short_en: 'CSV Description',
        description_short_no: 'CSV Beskrivelse',
        description_long_en: 'Long CSV Description',
        description_long_no: 'Lang CSV Beskrivelse',
        brand: 'CSV Brand',
        status: 'active',
        gtin: '9876543210987',
        launch_date: '2024-02-01',
        end_date: '2024-11-30',
        categories: 'Books; Education',
        properties: 'Author: John Doe; Pages: 200',
        technical_specs: 'Format: Paperback; Size: A5',
        country_of_origin: 'USA',
        image_urls: 'https://example.com/book1.jpg; https://example.com/book2.jpg',
        seo_title_en: 'CSV SEO Title',
        seo_title_no: 'CSV SEO Tittel',
        seo_description_en: 'CSV SEO Description',
        seo_description_no: 'CSV SEO Beskrivelse',
        keywords: 'book; education; learning',
        standard_price_amount: '299.99',
        standard_price_currency: 'NOK',
        sale_price_amount: '199.99',
        sale_price_currency: 'NOK',
        cost_price_amount: '100.00',
        cost_price_currency: 'NOK',
        quality_score: '85',
        created_at: '2024-02-01T12:00:00.000Z',
        updated_at: '2024-02-01T12:00:00.000Z',
      };

      const product = csvRowToProduct(csvRow);
      
      expect(product.id).toBe('csv-product-1');
      expect(product.basicInfo?.sku).toBe('CSV-001');
      expect(product.basicInfo?.name?.en).toBe('CSV Product');
      expect(product.basicInfo?.name?.no).toBe('CSV Produkt');
      expect(product.basicInfo?.brand).toBe('CSV Brand');
      expect(product.basicInfo?.status).toBe('active');
      expect(product.basicInfo?.gtin).toBe('9876543210987');
      expect(product.attributesAndSpecs?.categories).toEqual(['Books', 'Education']);
      expect(product.attributesAndSpecs?.properties).toHaveLength(2);
      expect(product.attributesAndSpecs?.properties?.[0].key).toBe('Author');
      expect(product.attributesAndSpecs?.properties?.[0].value).toBe('John Doe');
      expect(product.media?.images).toHaveLength(2);
      expect(product.marketingSEO?.keywords).toEqual(['book', 'education', 'learning']);
      expect(product.pricingAndStock?.standardPrice?.[0].amount).toBe(299.99);
      expect(product.pricingAndStock?.standardPrice?.[0].currency).toBe('NOK');
    });

    it('should handle empty CSV fields', () => {
      const emptyCsvRow: CSVProductRow = {
        id: 'empty-csv',
        sku: '',
        name_en: '',
        name_no: '',
        description_short_en: '',
        description_short_no: '',
        description_long_en: '',
        description_long_no: '',
        brand: '',
        status: 'development',
        gtin: '',
        launch_date: '',
        end_date: '',
        categories: '',
        properties: '',
        technical_specs: '',
        country_of_origin: '',
        image_urls: '',
        seo_title_en: '',
        seo_title_no: '',
        seo_description_en: '',
        seo_description_no: '',
        keywords: '',
        standard_price_amount: '',
        standard_price_currency: '',
        sale_price_amount: '',
        sale_price_currency: '',
        cost_price_amount: '',
        cost_price_currency: '',
        quality_score: '',
        created_at: '2024-01-01T10:00:00.000Z',
        updated_at: '2024-01-01T10:00:00.000Z',
      };

      const product = csvRowToProduct(emptyCsvRow);
      
      expect(product.basicInfo?.sku).toBe('');
      expect(product.basicInfo?.name?.en).toBe('');
      expect(product.attributesAndSpecs?.categories).toEqual([]);
      expect(product.attributesAndSpecs?.properties).toEqual([]);
      expect(product.media?.images).toEqual([]);
      expect(product.marketingSEO?.keywords).toEqual([]);
      expect(product.pricingAndStock?.standardPrice).toEqual([]);
    });
  });

  describe('getCSVHeaders', () => {
    it('should return all CSV headers', () => {
      const headers = getCSVHeaders();
      
      expect(headers).toContain('id');
      expect(headers).toContain('sku');
      expect(headers).toContain('name_en');
      expect(headers).toContain('name_no');
      expect(headers).toContain('brand');
      expect(headers).toContain('status');
      expect(headers).toContain('categories');
      expect(headers).toContain('standard_price_amount');
      expect(headers).toContain('quality_score');
      expect(headers.length).toBeGreaterThan(20);
    });
  });

  describe('escapeCSVField', () => {
    it('should escape fields with commas', () => {
      expect(escapeCSVField('Hello, World')).toBe('"Hello, World"');
    });

    it('should escape fields with quotes', () => {
      expect(escapeCSVField('Say "Hello"')).toBe('"Say ""Hello"""');
    });

    it('should escape fields with newlines', () => {
      expect(escapeCSVField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('should not escape simple fields', () => {
      expect(escapeCSVField('Simple Field')).toBe('Simple Field');
      expect(escapeCSVField('123')).toBe('123');
    });

    it('should handle empty fields', () => {
      expect(escapeCSVField('')).toBe('');
    });
  });

  describe('productsToCSV', () => {
    it('should convert products array to CSV string', () => {
      const csvContent = productsToCSV([mockProduct]);
      
      expect(csvContent).toContain('id,sku,name_en,name_no');
      expect(csvContent).toContain('test-product-1,TEST-001,Test Product,Test Produkt');
      expect(csvContent.split('\n')).toHaveLength(2); // Header + 1 product
    });

    it('should handle empty products array', () => {
      const csvContent = productsToCSV([]);
      expect(csvContent).toBe('');
    });

    it('should handle multiple products', () => {
      const product2 = { ...mockProduct, id: 'test-product-2', basicInfo: { ...mockProduct.basicInfo, sku: 'TEST-002' } };
      const csvContent = productsToCSV([mockProduct, product2]);
      
      expect(csvContent.split('\n')).toHaveLength(3); // Header + 2 products
      expect(csvContent).toContain('TEST-001');
      expect(csvContent).toContain('TEST-002');
    });
  });

  describe('parseCSV', () => {
    it('should parse CSV string to rows', () => {
      const csvContent = 'id,sku,name_en\nproduct-1,SKU-001,Product 1\nproduct-2,SKU-002,Product 2';
      const rows = parseCSV(csvContent);
      
      expect(rows).toHaveLength(2);
      expect(rows[0].id).toBe('product-1');
      expect(rows[0].sku).toBe('SKU-001');
      expect(rows[0].name_en).toBe('Product 1');
      expect(rows[1].id).toBe('product-2');
      expect(rows[1].sku).toBe('SKU-002');
      expect(rows[1].name_en).toBe('Product 2');
    });

    it('should handle quoted fields', () => {
      const csvContent = 'id,sku,name_en\n"product-1","SKU,001","Product with, comma"';
      const rows = parseCSV(csvContent);
      
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('product-1');
      expect(rows[0].sku).toBe('SKU,001');
      expect(rows[0].name_en).toBe('Product with, comma');
    });

    it('should handle empty CSV', () => {
      const rows = parseCSV('');
      expect(rows).toEqual([]);
    });

    it('should handle CSV with only headers', () => {
      const csvContent = 'id,sku,name_en';
      const rows = parseCSV(csvContent);
      expect(rows).toEqual([]);
    });

    it('should skip malformed rows', () => {
      const csvContent = 'id,sku,name_en\nproduct-1,SKU-001,Product 1\nmalformed-row\nproduct-2,SKU-002,Product 2';
      const rows = parseCSV(csvContent);
      
      expect(rows).toHaveLength(2);
      expect(rows[0].id).toBe('product-1');
      expect(rows[1].id).toBe('product-2');
    });
  });

  describe('validateCSVData', () => {
    it('should validate correct CSV data', () => {
      const csvRows: CSVProductRow[] = [
        {
          id: 'valid-1',
          sku: 'VALID-001',
          name_en: 'Valid Product',
          name_no: '',
          description_short_en: '',
          description_short_no: '',
          description_long_en: '',
          description_long_no: '',
          brand: 'Valid Brand',
          status: 'active',
          gtin: '1234567890123',
          launch_date: '2024-01-01',
          end_date: '',
          categories: '',
          properties: '',
          technical_specs: '',
          country_of_origin: '',
          image_urls: '',
          seo_title_en: '',
          seo_title_no: '',
          seo_description_en: '',
          seo_description_no: '',
          keywords: '',
          standard_price_amount: '100.00',
          standard_price_currency: 'NOK',
          sale_price_amount: '',
          sale_price_currency: '',
          cost_price_amount: '',
          cost_price_currency: '',
          quality_score: '',
          created_at: '2024-01-01T10:00:00.000Z',
          updated_at: '2024-01-01T10:00:00.000Z',
        },
      ];

      const validation = validateCSVData(csvRows);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const csvRows: CSVProductRow[] = [
        {
          id: 'invalid-1',
          sku: '',
          name_en: '',
          name_no: '',
          description_short_en: '',
          description_short_no: '',
          description_long_en: '',
          description_long_no: '',
          brand: '',
          status: 'active',
          gtin: '',
          launch_date: '',
          end_date: '',
          categories: '',
          properties: '',
          technical_specs: '',
          country_of_origin: '',
          image_urls: '',
          seo_title_en: '',
          seo_title_no: '',
          seo_description_en: '',
          seo_description_no: '',
          keywords: '',
          standard_price_amount: '',
          standard_price_currency: '',
          sale_price_amount: '',
          sale_price_currency: '',
          cost_price_amount: '',
          cost_price_currency: '',
          quality_score: '',
          created_at: '2024-01-01T10:00:00.000Z',
          updated_at: '2024-01-01T10:00:00.000Z',
        },
      ];

      const validation = validateCSVData(csvRows);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Row 2: SKU is required');
      expect(validation.errors).toContain('Row 2: English name is required');
    });

    it('should detect invalid status', () => {
      const csvRows: CSVProductRow[] = [
        {
          id: 'invalid-status',
          sku: 'TEST-001',
          name_en: 'Test Product',
          name_no: '',
          description_short_en: '',
          description_short_no: '',
          description_long_en: '',
          description_long_no: '',
          brand: 'Test Brand',
          status: 'invalid-status',
          gtin: '',
          launch_date: '',
          end_date: '',
          categories: '',
          properties: '',
          technical_specs: '',
          country_of_origin: '',
          image_urls: '',
          seo_title_en: '',
          seo_title_no: '',
          seo_description_en: '',
          seo_description_no: '',
          keywords: '',
          standard_price_amount: '',
          standard_price_currency: '',
          sale_price_amount: '',
          sale_price_currency: '',
          cost_price_amount: '',
          cost_price_currency: '',
          quality_score: '',
          created_at: '2024-01-01T10:00:00.000Z',
          updated_at: '2024-01-01T10:00:00.000Z',
        },
      ];

      const validation = validateCSVData(csvRows);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Row 2: Invalid status "invalid-status"');
    });

    it('should detect invalid price amounts', () => {
      const csvRows: CSVProductRow[] = [
        {
          id: 'invalid-price',
          sku: 'TEST-001',
          name_en: 'Test Product',
          name_no: '',
          description_short_en: '',
          description_short_no: '',
          description_long_en: '',
          description_long_no: '',
          brand: 'Test Brand',
          status: 'active',
          gtin: '',
          launch_date: '',
          end_date: '',
          categories: '',
          properties: '',
          technical_specs: '',
          country_of_origin: '',
          image_urls: '',
          seo_title_en: '',
          seo_title_no: '',
          seo_description_en: '',
          seo_description_no: '',
          keywords: '',
          standard_price_amount: 'invalid-price',
          standard_price_currency: '',
          sale_price_amount: '',
          sale_price_currency: '',
          cost_price_amount: '',
          cost_price_currency: '',
          quality_score: '',
          created_at: '2024-01-01T10:00:00.000Z',
          updated_at: '2024-01-01T10:00:00.000Z',
        },
      ];

      const validation = validateCSVData(csvRows);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Row 2: Invalid standard price amount "invalid-price"');
    });

    it('should detect invalid dates', () => {
      const csvRows: CSVProductRow[] = [
        {
          id: 'invalid-date',
          sku: 'TEST-001',
          name_en: 'Test Product',
          name_no: '',
          description_short_en: '',
          description_short_no: '',
          description_long_en: '',
          description_long_no: '',
          brand: 'Test Brand',
          status: 'active',
          gtin: '',
          launch_date: 'invalid-date',
          end_date: '',
          categories: '',
          properties: '',
          technical_specs: '',
          country_of_origin: '',
          image_urls: '',
          seo_title_en: '',
          seo_title_no: '',
          seo_description_en: '',
          seo_description_no: '',
          keywords: '',
          standard_price_amount: '',
          standard_price_currency: '',
          sale_price_amount: '',
          sale_price_currency: '',
          cost_price_amount: '',
          cost_price_currency: '',
          quality_score: '',
          created_at: '2024-01-01T10:00:00.000Z',
          updated_at: '2024-01-01T10:00:00.000Z',
        },
      ];

      const validation = validateCSVData(csvRows);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Row 2: Invalid launch date "invalid-date"');
    });

    it('should detect invalid GTIN format', () => {
      const csvRows: CSVProductRow[] = [
        {
          id: 'invalid-gtin',
          sku: 'TEST-001',
          name_en: 'Test Product',
          name_no: '',
          description_short_en: '',
          description_short_no: '',
          description_long_en: '',
          description_long_no: '',
          brand: 'Test Brand',
          status: 'active',
          gtin: 'invalid-gtin',
          launch_date: '',
          end_date: '',
          categories: '',
          properties: '',
          technical_specs: '',
          country_of_origin: '',
          image_urls: '',
          seo_title_en: '',
          seo_title_no: '',
          seo_description_en: '',
          seo_description_no: '',
          keywords: '',
          standard_price_amount: '',
          standard_price_currency: '',
          sale_price_amount: '',
          sale_price_currency: '',
          cost_price_amount: '',
          cost_price_currency: '',
          quality_score: '',
          created_at: '2024-01-01T10:00:00.000Z',
          updated_at: '2024-01-01T10:00:00.000Z',
        },
      ];

      const validation = validateCSVData(csvRows);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Row 2: Invalid GTIN format "invalid-gtin"');
    });

    it('should collect multiple validation errors', () => {
      const csvRows: CSVProductRow[] = [
        {
          id: 'multiple-errors',
          sku: '',
          name_en: '',
          name_no: '',
          description_short_en: '',
          description_short_no: '',
          description_long_en: '',
          description_long_no: '',
          brand: '',
          status: 'invalid',
          gtin: 'invalid',
          launch_date: 'invalid-date',
          end_date: '',
          categories: '',
          properties: '',
          technical_specs: '',
          country_of_origin: '',
          image_urls: '',
          seo_title_en: '',
          seo_title_no: '',
          seo_description_en: '',
          seo_description_no: '',
          keywords: '',
          standard_price_amount: 'invalid',
          standard_price_currency: '',
          sale_price_amount: '',
          sale_price_currency: '',
          cost_price_amount: '',
          cost_price_currency: '',
          quality_score: '',
          created_at: '2024-01-01T10:00:00.000Z',
          updated_at: '2024-01-01T10:00:00.000Z',
        },
      ];

      const validation = validateCSVData(csvRows);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(3);
    });
  });
});
