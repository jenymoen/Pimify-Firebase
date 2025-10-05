// src/lib/csv-utils.ts

import type { Product } from '@/types/product';

/**
 * CSV Export/Import utilities for product data
 */

export interface CSVProductRow {
  id: string;
  sku: string;
  name_en: string;
  name_no: string;
  description_short_en: string;
  description_short_no: string;
  description_long_en: string;
  description_long_no: string;
  brand: string;
  status: string;
  gtin: string;
  launch_date: string;
  end_date: string;
  categories: string;
  properties: string;
  technical_specs: string;
  country_of_origin: string;
  image_urls: string;
  seo_title_en: string;
  seo_title_no: string;
  seo_description_en: string;
  seo_description_no: string;
  keywords: string;
  standard_price_amount: string;
  standard_price_currency: string;
  sale_price_amount: string;
  sale_price_currency: string;
  cost_price_amount: string;
  cost_price_currency: string;
  quality_score: string;
  created_at: string;
  updated_at: string;
}

/**
 * Converts a Product object to CSV row format
 */
export function productToCSVRow(product: Product): CSVProductRow {
  const basicInfo = product.basicInfo;
  const attributes = product.attributesAndSpecs;
  const media = product.media;
  const marketing = product.marketingSEO;
  const pricing = product.pricingAndStock;
  const quality = product.qualityMetrics;

  return {
    id: product.id,
    sku: basicInfo.sku || '',
    name_en: basicInfo.name?.en || '',
    name_no: basicInfo.name?.no || '',
    description_short_en: basicInfo.descriptionShort?.en || '',
    description_short_no: basicInfo.descriptionShort?.no || '',
    description_long_en: basicInfo.descriptionLong?.en || '',
    description_long_no: basicInfo.descriptionLong?.no || '',
    brand: basicInfo.brand || '',
    status: basicInfo.status || '',
    gtin: basicInfo.gtin || '',
    launch_date: basicInfo.launchDate || '',
    end_date: basicInfo.endDate || '',
    categories: attributes?.categories?.join('; ') || '',
    properties: attributes?.properties?.map(p => `${p.key}: ${p.value}`).join('; ') || '',
    technical_specs: attributes?.technicalSpecs?.map(s => `${s.key}: ${s.value}`).join('; ') || '',
    country_of_origin: attributes?.countryOfOrigin || '',
    image_urls: media?.images?.map(img => img.url).join('; ') || '',
    seo_title_en: marketing?.seoTitle?.en || '',
    seo_title_no: marketing?.seoTitle?.no || '',
    seo_description_en: marketing?.seoDescription?.en || '',
    seo_description_no: marketing?.seoDescription?.no || '',
    keywords: marketing?.keywords?.join('; ') || '',
    standard_price_amount: pricing?.standardPrice?.[0]?.amount?.toString() || '',
    standard_price_currency: pricing?.standardPrice?.[0]?.currency || '',
    sale_price_amount: pricing?.salePrice?.[0]?.amount?.toString() || '',
    sale_price_currency: pricing?.salePrice?.[0]?.currency || '',
    cost_price_amount: pricing?.costPrice?.[0]?.amount?.toString() || '',
    cost_price_currency: pricing?.costPrice?.[0]?.currency || '',
    quality_score: quality?.completenessScore?.toString() || '',
    created_at: product.createdAt || '',
    updated_at: product.updatedAt || '',
  };
}

/**
 * Converts a CSV row to Product object format
 */
export function csvRowToProduct(row: CSVProductRow): Partial<Product> {
  const product: Partial<Product> = {
    id: row.id,
    basicInfo: {
      name: {
        en: row.name_en || '',
        no: row.name_no || '',
      },
      sku: row.sku || '',
      gtin: row.gtin || undefined,
      descriptionShort: {
        en: row.description_short_en || '',
        no: row.description_short_no || '',
      },
      descriptionLong: {
        en: row.description_long_en || '',
        no: row.description_long_no || '',
      },
      brand: row.brand || '',
      status: (row.status as any) || 'development',
      launchDate: row.launch_date || undefined,
      endDate: row.end_date || undefined,
    },
    attributesAndSpecs: {
      categories: row.categories ? row.categories.split('; ').filter(Boolean) : [],
      properties: row.properties ? row.properties.split('; ').map(prop => {
        const [key, ...valueParts] = prop.split(': ');
        return {
          id: `prop-${Math.random().toString(36).substr(2, 9)}`,
          key: key || '',
          value: valueParts.join(': ') || '',
        };
      }) : [],
      technicalSpecs: row.technical_specs ? row.technical_specs.split('; ').map(spec => {
        const [key, ...valueParts] = spec.split(': ');
        return {
          id: `spec-${Math.random().toString(36).substr(2, 9)}`,
          key: key || '',
          value: valueParts.join(': ') || '',
        };
      }) : [],
      countryOfOrigin: row.country_of_origin || undefined,
    },
    media: {
      images: row.image_urls ? row.image_urls.split('; ').filter(Boolean).map((url, index) => ({
        id: `img-${Math.random().toString(36).substr(2, 9)}`,
        url: url,
        type: 'image' as const,
        altText: {
          en: '',
          no: '',
        },
      })) : [],
    },
    marketingSEO: {
      seoTitle: {
        en: row.seo_title_en || '',
        no: row.seo_title_no || '',
      },
      seoDescription: {
        en: row.seo_description_en || '',
        no: row.seo_description_no || '',
      },
      keywords: row.keywords ? row.keywords.split('; ').filter(Boolean) : [],
    },
    pricingAndStock: {
      standardPrice: row.standard_price_amount ? [{
        id: `price-${Math.random().toString(36).substr(2, 9)}`,
        amount: parseFloat(row.standard_price_amount) || 0,
        currency: row.standard_price_currency || 'NOK',
      }] : [],
      salePrice: row.sale_price_amount ? [{
        id: `sale-${Math.random().toString(36).substr(2, 9)}`,
        amount: parseFloat(row.sale_price_amount) || 0,
        currency: row.sale_price_currency || 'NOK',
      }] : [],
      costPrice: row.cost_price_amount ? [{
        id: `cost-${Math.random().toString(36).substr(2, 9)}`,
        amount: parseFloat(row.cost_price_amount) || 0,
        currency: row.cost_price_currency || 'NOK',
      }] : [],
    },
    options: [],
    variants: [],
    aiSummary: {
      en: '',
      no: '',
    },
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };

  return product;
}

/**
 * Generates CSV headers based on the CSVProductRow interface
 */
export function getCSVHeaders(): string[] {
  return [
    'id',
    'sku',
    'name_en',
    'name_no',
    'description_short_en',
    'description_short_no',
    'description_long_en',
    'description_long_no',
    'brand',
    'status',
    'gtin',
    'launch_date',
    'end_date',
    'categories',
    'properties',
    'technical_specs',
    'country_of_origin',
    'image_urls',
    'seo_title_en',
    'seo_title_no',
    'seo_description_en',
    'seo_description_no',
    'keywords',
    'standard_price_amount',
    'standard_price_currency',
    'sale_price_amount',
    'sale_price_currency',
    'cost_price_amount',
    'cost_price_currency',
    'quality_score',
    'created_at',
    'updated_at',
  ];
}

/**
 * Escapes CSV field values to handle commas, quotes, and newlines
 */
export function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Converts array of products to CSV string
 */
export function productsToCSV(products: Product[]): string {
  if (products.length === 0) return '';

  const headers = getCSVHeaders();
  const csvRows = products.map(product => productToCSVRow(product));
  
  const csvLines = [
    headers.join(','),
    ...csvRows.map(row => 
      headers.map(header => escapeCSVField(String(row[header as keyof CSVProductRow] || ''))).join(',')
    )
  ];

  return csvLines.join('\n');
}

/**
 * Parses CSV string to array of CSVProductRow objects
 */
export function parseCSV(csvText: string): CSVProductRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows: CSVProductRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length !== headers.length) continue;

    const row: Partial<CSVProductRow> = {};
    headers.forEach((header, index) => {
      row[header as keyof CSVProductRow] = values[index] || '';
    });

    rows.push(row as CSVProductRow);
  }

  return rows;
}

/**
 * Parses a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
    i++;
  }

  // Add the last field
  values.push(current.trim());

  return values;
}

/**
 * Validates CSV data structure
 */
export function validateCSVData(csvRows: CSVProductRow[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  csvRows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because CSV has header and is 1-indexed

    // Required fields validation
    if (!row.sku || row.sku.trim() === '') {
      errors.push(`Row ${rowNum}: SKU is required`);
    }

    if (!row.name_en || row.name_en.trim() === '') {
      errors.push(`Row ${rowNum}: English name is required`);
    }

    // Status validation
    const validStatuses = ['active', 'development', 'inactive', 'discontinued'];
    if (row.status && !validStatuses.includes(row.status)) {
      errors.push(`Row ${rowNum}: Invalid status "${row.status}". Must be one of: ${validStatuses.join(', ')}`);
    }

    // Price validation
    if (row.standard_price_amount && isNaN(parseFloat(row.standard_price_amount))) {
      errors.push(`Row ${rowNum}: Invalid standard price amount "${row.standard_price_amount}"`);
    }

    if (row.sale_price_amount && isNaN(parseFloat(row.sale_price_amount))) {
      errors.push(`Row ${rowNum}: Invalid sale price amount "${row.sale_price_amount}"`);
    }

    if (row.cost_price_amount && isNaN(parseFloat(row.cost_price_amount))) {
      errors.push(`Row ${rowNum}: Invalid cost price amount "${row.cost_price_amount}"`);
    }

    // Date validation
    if (row.launch_date && !isValidDate(row.launch_date)) {
      errors.push(`Row ${rowNum}: Invalid launch date "${row.launch_date}"`);
    }

    if (row.end_date && !isValidDate(row.end_date)) {
      errors.push(`Row ${rowNum}: Invalid end date "${row.end_date}"`);
    }

    // GTIN validation (basic format check)
    if (row.gtin && !/^\d{8,14}$/.test(row.gtin.replace(/\D/g, ''))) {
      errors.push(`Row ${rowNum}: Invalid GTIN format "${row.gtin}"`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper function to validate date strings
 */
function isValidDate(dateString: string): boolean {
  if (!dateString) return true;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
