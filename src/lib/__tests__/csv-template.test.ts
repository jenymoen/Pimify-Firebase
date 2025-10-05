// src/lib/__tests__/csv-template.test.ts

import { generateCSVTemplate } from '../csv-template';
import { parseCSV } from '../csv-utils';

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement and related DOM methods
const mockLink = {
  download: '',
  href: '',
  style: { visibility: '' },
  setAttribute: jest.fn(),
  click: jest.fn(),
};

Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => mockLink),
});

Object.defineProperty(document.body, 'appendChild', {
  value: jest.fn(),
});

Object.defineProperty(document.body, 'removeChild', {
  value: jest.fn(),
});

describe('CSV Template', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateCSVTemplate', () => {
    it('should generate valid CSV template with headers and sample data', () => {
      const template = generateCSVTemplate();
      
      expect(template).toBeTruthy();
      expect(template).toContain('id,sku,name_en,name_no');
      expect(template).toContain('sample-product-1');
      expect(template).toContain('SAMPLE-001');
      expect(template).toContain('Sample Product');
      expect(template).toContain('Eksempel Produkt');
      expect(template).toContain('Sample Brand');
      expect(template).toContain('active');
    });

    it('should have valid CSV structure', () => {
      const template = generateCSVTemplate();
      const lines = template.split('\n');
      
      expect(lines).toHaveLength(2); // Header + sample row
      expect(lines[0]).toContain('id');
      expect(lines[0]).toContain('sku');
      expect(lines[0]).toContain('name_en');
      expect(lines[1]).toContain('sample-product-1');
      expect(lines[1]).toContain('SAMPLE-001');
    });

    it('should contain all required CSV headers', () => {
      const template = generateCSVTemplate();
      const headers = lines[0].split(',');
      
      const expectedHeaders = [
        'id', 'sku', 'name_en', 'name_no', 'description_short_en', 'description_short_no',
        'description_long_en', 'description_long_no', 'brand', 'status', 'gtin',
        'launch_date', 'end_date', 'categories', 'properties', 'technical_specs',
        'country_of_origin', 'image_urls', 'seo_title_en', 'seo_title_no',
        'seo_description_en', 'seo_description_no', 'keywords', 'standard_price_amount',
        'standard_price_currency', 'sale_price_amount', 'sale_price_currency',
        'cost_price_amount', 'cost_price_currency', 'quality_score', 'created_at', 'updated_at'
      ];

      expectedHeaders.forEach(header => {
        expect(headers).toContain(header);
      });
    });

    it('should contain realistic sample data', () => {
      const template = generateCSVTemplate();
      
      expect(template).toContain('Sample Product');
      expect(template).toContain('Eksempel Produkt');
      expect(template).toContain('Sample Brand');
      expect(template).toContain('active');
      expect(template).toContain('1234567890123');
      expect(template).toContain('Electronics');
      expect(template).toContain('Gadgets');
      expect(template).toContain('999.00');
      expect(template).toContain('NOK');
      expect(template).toContain('95');
    });

    it('should be parseable as valid CSV', () => {
      const template = generateCSVTemplate();
      const csvRows = parseCSV(template);
      
      expect(csvRows).toHaveLength(1); // One sample row
      expect(csvRows[0].id).toBe('sample-product-1');
      expect(csvRows[0].sku).toBe('SAMPLE-001');
      expect(csvRows[0].name_en).toBe('Sample Product');
      expect(csvRows[0].name_no).toBe('Eksempel Produkt');
      expect(csvRows[0].brand).toBe('Sample Brand');
      expect(csvRows[0].status).toBe('active');
    });

    it('should contain proper multilingual content', () => {
      const template = generateCSVTemplate();
      
      expect(template).toContain('Sample Product'); // English
      expect(template).toContain('Eksempel Produkt'); // Norwegian
      expect(template).toContain('A sample product for demonstration'); // English description
      expect(template).toContain('Et eksempelprodukt for demonstrasjon'); // Norwegian description
    });

    it('should contain proper category and property formatting', () => {
      const template = generateCSVTemplate();
      
      expect(template).toContain('Electronics; Gadgets'); // Categories with semicolon separator
      expect(template).toContain('Color: Black; Material: Plastic'); // Properties with key:value format
      expect(template).toContain('Weight: 500g; Dimensions: 10x15x5cm'); // Technical specs
    });

    it('should contain proper URL formatting', () => {
      const template = generateCSVTemplate();
      
      expect(template).toContain('https://example.com/image1.jpg; https://example.com/image2.jpg');
    });

    it('should contain proper pricing information', () => {
      const template = generateCSVTemplate();
      
      expect(template).toContain('999.00'); // Standard price
      expect(template).toContain('799.00'); // Sale price
      expect(template).toContain('500.00'); // Cost price
      expect(template).toContain('NOK'); // Currency
    });

    it('should contain proper date formatting', () => {
      const template = generateCSVTemplate();
      
      expect(template).toContain('2024-01-01'); // Launch date
      expect(template).toContain('2024-01-01T10:00:00.000Z'); // ISO timestamps
    });

    it('should contain SEO and keyword information', () => {
      const template = generateCSVTemplate();
      
      expect(template).toContain('Sample Product - Best Quality');
      expect(template).toContain('Eksempel Produkt - Beste Kvalitet');
      expect(template).toContain('sample; product; quality; demo');
    });

    it('should have consistent field count between header and data row', () => {
      const template = generateCSVTemplate();
      const lines = template.split('\n');
      
      const headerCount = lines[0].split(',').length;
      const dataCount = lines[1].split(',').length;
      
      expect(headerCount).toBe(dataCount);
    });
  });

  describe('downloadCSVTemplate', () => {
    it('should create blob with correct content type', () => {
      const { downloadCSVTemplate } = require('../csv-template');
      
      downloadCSVTemplate();
      
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text/csv;charset=utf-8;'
        })
      );
    });

    it('should create download link with correct filename', () => {
      const { downloadCSVTemplate } = require('../csv-template');
      
      downloadCSVTemplate();
      
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'Pimify_Product_Template.csv');
    });

    it('should trigger download process', () => {
      const { downloadCSVTemplate } = require('../csv-template');
      
      downloadCSVTemplate();
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    it('should handle download attribute check', () => {
      const { downloadCSVTemplate } = require('../csv-template');
      
      // Mock link without download attribute
      const mockLinkNoDownload = { ...mockLink, download: undefined };
      Object.defineProperty(document, 'createElement', {
        value: jest.fn(() => mockLinkNoDownload),
      });
      
      downloadCSVTemplate();
      
      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });
});
