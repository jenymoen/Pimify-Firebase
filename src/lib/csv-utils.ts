// src/lib/csv-utils.ts

import type { Product, ProductStatus } from '@/types/product';

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
  // Variant columns (optional). One row per variant; rows sharing the same `id`
  // belong to one product. Only the first row of a product needs the product columns.
  variant_sku?: string;
  variant_gtin?: string;
  option1_name?: string;
  option1_value?: string;
  option2_name?: string;
  option2_value?: string;
  option3_name?: string;
  option3_value?: string;
  variant_price_amount?: string;
  variant_sale_price_amount?: string;
  variant_cost_price_amount?: string;
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
      status: normalizeStatus(row.status) as ProductStatus,
      launchDate: row.launch_date || undefined,
      endDate: row.end_date || undefined,
    },
    attributesAndSpecs: {
      categories: row.categories ? row.categories.split('; ').filter(Boolean) : [],
      properties: parseKeyValueList(row.properties, 'prop', 'Property'),
      technicalSpecs: parseKeyValueList(row.technical_specs, 'spec', 'Feature'),
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
    ...VARIANT_HEADERS,
  ];
}

const VARIANT_HEADERS = [
  'variant_sku',
  'variant_gtin',
  'option1_name',
  'option1_value',
  'option2_name',
  'option2_value',
  'option3_name',
  'option3_value',
  'variant_price_amount',
  'variant_sale_price_amount',
  'variant_cost_price_amount',
] as const;

const OPTION_SLOTS = [1, 2, 3] as const;

function optionPairs(row: CSVProductRow): Array<{ name: string; value: string }> {
  return OPTION_SLOTS
    .map(n => ({
      name: (row[`option${n}_name` as keyof CSVProductRow] || '').trim(),
      value: (row[`option${n}_value` as keyof CSVProductRow] || '').trim(),
    }))
    .filter(pair => pair.name && pair.value);
}

/** True if the row describes a variant (has a variant SKU or at least one option value) */
export function rowHasVariant(row: CSVProductRow): boolean {
  return !!(row.variant_sku || '').trim() || optionPairs(row).length > 0;
}

/**
 * Groups parsed rows into products. Rows with the same `id` form one product
 * (first row = product data, every row may describe a variant). Rows without
 * an id are always their own product. Original row numbers are kept for errors.
 */
export function groupCSVRows(rows: CSVProductRow[]): Array<{ rows: CSVProductRow[]; rowNumbers: number[] }> {
  const groups: Array<{ rows: CSVProductRow[]; rowNumbers: number[] }> = [];
  const byId = new Map<string, { rows: CSVProductRow[]; rowNumbers: number[] }>();
  rows.forEach((row, index) => {
    const rowNumber = index + 2; // header is row 1
    const id = (row.id || '').trim();
    const existing = id ? byId.get(id) : undefined;
    if (existing) {
      existing.rows.push(row);
      existing.rowNumbers.push(rowNumber);
      return;
    }
    const group = { rows: [row], rowNumbers: [rowNumber] };
    groups.push(group);
    if (id) byId.set(id, group);
  });
  return groups;
}

/**
 * Builds one product from a group of rows: product data from the first row,
 * options and variants from every row that carries variant columns.
 */
export function csvGroupToProduct(rows: CSVProductRow[]): Partial<Product> {
  const product = csvRowToProduct(rows[0]);
  const variantRows = rows.filter(rowHasVariant);
  if (variantRows.length === 0) return product;

  const currency = rows[0].standard_price_currency || 'NOK';
  const baseSku = product.basicInfo?.sku || '';
  const options: Array<{ id: string; name: string; values: string[] }> = [];

  const variants = variantRows.map(row => {
    const optionValues: Record<string, string> = {};
    for (const { name, value } of optionPairs(row)) {
      optionValues[name] = value;
      let option = options.find(o => o.name === name);
      if (!option) {
        option = { id: `opt-${Math.random().toString(36).substr(2, 9)}`, name, values: [] };
        options.push(option);
      }
      if (!option.values.includes(value)) option.values.push(value);
    }
    // Same convention as the product form's variant generator: BASE-SKU-VALUE1-VALUE2
    const suffix = Object.values(optionValues).join('-').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const price = (amount: string | undefined, prefix: string) =>
      amount && amount.trim() ? [{ id: `${prefix}-${Math.random().toString(36).substr(2, 9)}`, amount: parseFloat(amount) || 0, currency }] : undefined;

    return {
      id: `var-${Math.random().toString(36).substr(2, 9)}`,
      sku: (row.variant_sku || '').trim() || (baseSku && suffix ? `${baseSku}-${suffix}` : baseSku),
      gtin: (row.variant_gtin || '').trim() || undefined,
      optionValues,
      standardPrice: price(row.variant_price_amount, 'vprice'),
      salePrice: price(row.variant_sale_price_amount, 'vsale'),
      costPrice: price(row.variant_cost_price_amount, 'vcost'),
    };
  });

  return { ...product, options: options.slice(0, 3), variants };
}

/** Product → CSV rows: one row per variant (product columns on the first row only) */
export function productToCSVRows(product: Product): CSVProductRow[] {
  const base = productToCSVRow(product);
  const variants = product.variants || [];
  if (variants.length === 0) return [base];

  return variants.map((variant, index) => {
    const row: CSVProductRow = index === 0
      ? { ...base }
      : ({ id: base.id } as CSVProductRow);
    Object.entries(variant.optionValues || {}).slice(0, 3).forEach(([name, value], i) => {
      (row as any)[`option${i + 1}_name`] = name;
      (row as any)[`option${i + 1}_value`] = value;
    });
    row.variant_sku = variant.sku || '';
    row.variant_gtin = variant.gtin || '';
    row.variant_price_amount = variant.standardPrice?.[0]?.amount?.toString() || '';
    row.variant_sale_price_amount = variant.salePrice?.[0]?.amount?.toString() || '';
    row.variant_cost_price_amount = variant.costPrice?.[0]?.amount?.toString() || '';
    return row;
  });
}

/**
 * Parses "Key: value; Key – value; free text" into key/value entries.
 * Accepts ":" or a spaced dash (–, —, -) as separator. Entries without a
 * separator (plain feature bullets) get a numbered key so the value is never lost.
 */
export function parseKeyValueList(
  text: string | undefined,
  idPrefix: string,
  fallbackKey: string
): Array<{ id: string; key: string; value: string }> {
  if (!text) return [];
  return text
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map((part, index) => {
      const match = part.match(/^(.+?)(?::\s+|\s+[–—-]\s+)(.+)$/);
      return {
        id: `${idPrefix}-${Math.random().toString(36).substr(2, 9)}`,
        key: match ? match[1].trim() : `${fallbackKey} ${index + 1}`,
        value: match ? match[2].trim() : part,
      };
    });
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
  const csvRows = products.flatMap(product => productToCSVRows(product));
  
  const csvLines = [
    headers.join(','),
    ...csvRows.map(row => 
      headers.map(header => escapeCSVField(String(row[header as keyof CSVProductRow] || ''))).join(',')
    )
  ];

  return csvLines.join('\n');
}

/**
 * Parses CSV text into records, honoring quoted fields that contain
 * commas, escaped quotes ("") and embedded newlines (CRLF or LF).
 */
function parseCSVRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let current = '';
  let inQuotes = false;

  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      record.push(current.trim());
      current = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      record.push(current.trim());
      current = '';
      if (record.some(v => v !== '')) records.push(record);
      record = [];
    } else {
      current += char;
    }
  }

  record.push(current.trim());
  if (record.some(v => v !== '')) records.push(record);

  return records;
}

/**
 * Parses CSV string to array of CSVProductRow objects
 */
export function parseCSV(csvText: string): CSVProductRow[] {
  const records = parseCSVRecords(csvText);
  if (records.length < 2) return [];

  const headers = records[0];
  const rows: CSVProductRow[] = [];

  for (let i = 1; i < records.length; i++) {
    const values = records[i];
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
 * Validates CSV data structure
 */
export function validateCSVData(csvRows: CSVProductRow[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const group of groupCSVRows(csvRows)) {
    group.rows.forEach((row, i) => {
      const rowNum = group.rowNumbers[i];
      for (const field of ['variant_price_amount', 'variant_sale_price_amount', 'variant_cost_price_amount'] as const) {
        const value = row[field];
        if (value && isNaN(parseFloat(value))) errors.push(`Row ${rowNum}: Invalid ${field.replace(/_/g, ' ')} "${value}"`);
      }
      OPTION_SLOTS.forEach(n => {
        const name = (row[`option${n}_name` as keyof CSVProductRow] || '').trim();
        const value = (row[`option${n}_value` as keyof CSVProductRow] || '').trim();
        if (!!name !== !!value) errors.push(`Row ${rowNum}: option${n}_name and option${n}_value must both be filled in`);
      });
      if (row.variant_gtin && !/^\d{8,14}$/.test(row.variant_gtin.replace(/\D/g, ''))) {
        errors.push(`Row ${rowNum}: Invalid variant GTIN format "${row.variant_gtin}"`);
      }
    });
    const variantRows = group.rows.filter(rowHasVariant);
    if (variantRows.length > 1) {
      const seen = new Set<string>();
      variantRows.forEach(row => {
        const key = optionPairs(row).map(p => `${p.name}=${p.value}`).join('|');
        if (key && seen.has(key)) errors.push(`Row ${group.rowNumbers[group.rows.indexOf(row)]}: Duplicate variant (${key.replace(/\|/g, ', ')}) for product "${row.id}"`);
        seen.add(key);
      });
    }
  }

  // Product-level checks only apply to the first row of each product
  const productRows = groupCSVRows(csvRows).map(g => ({ row: g.rows[0], rowNum: g.rowNumbers[0] }));
  productRows.forEach(({ row, rowNum }) => {

    // Required fields validation
    if (!row.sku || row.sku.trim() === '') {
      errors.push(`Row ${rowNum}: SKU is required`);
    }

    if (!row.name_en || row.name_en.trim() === '') {
      errors.push(`Row ${rowNum}: English name is required`);
    }

    // Status validation
    const validStatuses = ['active', 'development', 'inactive', 'discontinued'];
    if (row.status && !validStatuses.includes(normalizeStatus(row.status))) {
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
 * Maps external status values (e.g. Shopify "draft") to Pimify statuses
 */
function normalizeStatus(status: string | undefined): string {
  const value = (status || '').trim().toLowerCase();
  if (!value || value === 'draft') return 'development';
  if (value === 'archived') return 'inactive';
  return value;
}

/**
 * Helper function to validate date strings
 */
function isValidDate(dateString: string): boolean {
  if (!dateString) return true;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}
