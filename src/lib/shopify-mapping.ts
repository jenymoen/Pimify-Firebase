// src/lib/shopify-mapping.ts — which Pimify field is sent to which Shopify field.
// Pure module (no server imports): used by the mapping settings page and by the export.
import type { Product, ProductVariant, MultilingualString } from '@/types/product';
import { WorkflowState } from '@/types/workflow';

export type MappingLevel = 'product' | 'variant';
type Value = string | number | null;

// ─── Pimify sources ────────────────────────────────────────────────────────────

export interface PimSource {
  id: string;
  label: string;
  level: MappingLevel;
  get: (product: Product, variant?: ProductVariant) => Value;
}

/** Language fields fall back to the other language when empty */
const lang = (value: MultilingualString | undefined, primary: 'en' | 'no'): string | null => {
  const other = primary === 'en' ? 'no' : 'en';
  return (value?.[primary] || value?.[other] || '').trim() || null;
};
const joined = (values: string[] | undefined) => (values?.filter(Boolean).join(', ') || null);
const slug = (text: string | null) =>
  text ? text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || null : null;

const prices = (product: Product, variant?: ProductVariant) => {
  const standard = variant?.standardPrice?.[0]?.amount ?? product.pricingAndStock?.standardPrice?.[0]?.amount ?? null;
  const sale = variant?.salePrice?.[0]?.amount ?? product.pricingAndStock?.salePrice?.[0]?.amount ?? null;
  const onSale = sale !== null && standard !== null && sale < standard;
  return { standard, sale, onSale };
};

export const PIM_SOURCES: PimSource[] = [
  // Product level
  { id: 'name.en', label: 'Name (English)', level: 'product', get: p => lang(p.basicInfo.name, 'en') },
  { id: 'name.no', label: 'Name (Norwegian)', level: 'product', get: p => lang(p.basicInfo.name, 'no') },
  { id: 'descriptionLong.en', label: 'Long description (English)', level: 'product', get: p => lang(p.basicInfo.descriptionLong, 'en') },
  { id: 'descriptionLong.no', label: 'Long description (Norwegian)', level: 'product', get: p => lang(p.basicInfo.descriptionLong, 'no') },
  { id: 'descriptionShort.en', label: 'Short description (English)', level: 'product', get: p => lang(p.basicInfo.descriptionShort, 'en') },
  { id: 'descriptionShort.no', label: 'Short description (Norwegian)', level: 'product', get: p => lang(p.basicInfo.descriptionShort, 'no') },
  { id: 'brand', label: 'Brand', level: 'product', get: p => p.basicInfo.brand || null },
  { id: 'manufacturer', label: 'Manufacturer', level: 'product', get: p => p.basicInfo.manufacturer || null },
  { id: 'category.first', label: 'First category', level: 'product', get: p => p.attributesAndSpecs?.categories?.[0] || null },
  { id: 'categories', label: 'All categories (comma separated)', level: 'product', get: p => joined(p.attributesAndSpecs?.categories) },
  { id: 'tags', label: 'Tags', level: 'product', get: p => joined(p.tags) },
  { id: 'shopifyCategory', label: 'Shopify category', level: 'product', get: p => p.shopifyCategory?.id || null },
  { id: 'googleCategory.id', label: 'Google category code', level: 'product', get: p => (p.googleCategory?.id ? String(p.googleCategory.id) : null) },
  { id: 'googleCategory.path', label: 'Google category path (English)', level: 'product', get: p => p.googleCategory?.path || null },
  { id: 'googleCategory.pathNo', label: 'Google category path (Norwegian)', level: 'product', get: p => p.googleCategory?.pathNo || p.googleCategory?.path || null },
  { id: 'googleCategory.leaf', label: 'Google category, last level (Norwegian)', level: 'product', get: p => (p.googleCategory?.pathNo || p.googleCategory?.path || '').split('>').pop()?.trim() || null },
  { id: 'keywords', label: 'SEO keywords (comma separated)', level: 'product', get: p => joined(p.marketingSEO?.keywords) },
  { id: 'seoTitle.en', label: 'SEO title (English)', level: 'product', get: p => lang(p.marketingSEO?.seoTitle, 'en') },
  { id: 'seoTitle.no', label: 'SEO title (Norwegian)', level: 'product', get: p => lang(p.marketingSEO?.seoTitle, 'no') },
  { id: 'seoDescription.en', label: 'SEO description (English)', level: 'product', get: p => lang(p.marketingSEO?.seoDescription, 'en') },
  { id: 'seoDescription.no', label: 'SEO description (Norwegian)', level: 'product', get: p => lang(p.marketingSEO?.seoDescription, 'no') },
  { id: 'countryOfOrigin', label: 'Country of origin', level: 'product', get: p => p.attributesAndSpecs?.countryOfOrigin || null },
  { id: 'handle.nameEn', label: 'URL handle from English name', level: 'product', get: p => slug(lang(p.basicInfo.name, 'en')) },
  { id: 'handle.nameNo', label: 'URL handle from Norwegian name', level: 'product', get: p => slug(lang(p.basicInfo.name, 'no')) },
  { id: 'handle.id', label: 'URL handle from Pimify id', level: 'product', get: p => slug(p.id) },
  {
    id: 'status.workflow', label: 'Workflow (published → active)', level: 'product',
    get: p => (p.workflowState === WorkflowState.PUBLISHED || p.workflowState === WorkflowState.APPROVED ? 'active' : 'draft'),
  },
  {
    id: 'status.product', label: 'Product status (discontinued → archived)', level: 'product',
    get: p => (p.basicInfo.status === 'active' ? 'active' : p.basicInfo.status === 'discontinued' ? 'archived' : 'draft'),
  },
  // Variant level (products without variants are sent as one variant)
  { id: 'price.effective', label: 'Selling price (sale price when lower)', level: 'variant', get: (p, v) => { const x = prices(p, v); return x.onSale ? x.sale : x.standard; } },
  { id: 'price.compareAt', label: 'Original price when on sale', level: 'variant', get: (p, v) => { const x = prices(p, v); return x.onSale ? x.standard : null; } },
  { id: 'price.standard', label: 'Standard price', level: 'variant', get: (p, v) => prices(p, v).standard },
  { id: 'price.sale', label: 'Sale price', level: 'variant', get: (p, v) => prices(p, v).sale },
  { id: 'variant.sku', label: 'Variant SKU (or product SKU)', level: 'variant', get: (p, v) => v?.sku || p.basicInfo.sku || null },
  { id: 'variant.gtin', label: 'Variant GTIN/EAN (or product GTIN)', level: 'variant', get: (p, v) => v?.gtin || p.basicInfo.gtin || null },
  { id: 'logistics.weightKg', label: 'Weight in kg', level: 'variant', get: p => p.logistics?.weightKg ?? null },
];

export const PIM_SOURCE_BY_ID = new Map(PIM_SOURCES.map(s => [s.id, s]));

// ─── Shopify targets ───────────────────────────────────────────────────────────

export interface ShopifyTarget {
  id: string;
  label: string;
  level: MappingLevel;
  description: string;
  /** Sources to try, best first; `lang` picks the language variant matching the store */
  candidates: (lang: 'en' | 'no') => string[];
  /** Map the first candidate even without sample data (values that only exist sometimes, e.g. sale prices) */
  mapWithoutData?: boolean;
  /** Not a REST product field: 'category' uses productUpdate, 'metafield' is written as namespace.key */
  kind?: 'category' | 'metafield';
}

const other = (l: 'en' | 'no') => (l === 'en' ? 'no' : 'en');

export const SHOPIFY_TARGETS: ShopifyTarget[] = [
  { id: 'title', label: 'Title', level: 'product', description: 'Product title', candidates: l => [`name.${l}`, `name.${other(l)}`] },
  { id: 'body_html', label: 'Description', level: 'product', description: 'Product description (HTML)', candidates: l => [`descriptionLong.${l}`, `descriptionShort.${l}`, `descriptionLong.${other(l)}`] },
  { id: 'vendor', label: 'Vendor', level: 'product', description: 'Brand / manufacturer shown in Shopify', candidates: () => ['brand', 'manufacturer'] },
  { id: 'product_type', label: 'Product type', level: 'product', description: 'Used for filtering and collections', candidates: () => ['category.first', 'googleCategory.leaf'] },
  { id: 'category', label: 'Shopify product category', level: 'product', description: "Shopify's standard taxonomy; used by Shopify and its Google channel", candidates: () => ['shopifyCategory'], kind: 'category', mapWithoutData: true },
  { id: 'metafield:mm-google-shopping.google_product_category', label: 'Google product category (metafield)', level: 'product', description: 'Code read by the Google Shopping feed app (mm-google-shopping)', candidates: () => ['googleCategory.id'], kind: 'metafield', mapWithoutData: true },
  { id: 'tags', label: 'Tags', level: 'product', description: 'Comma separated tags', candidates: () => ['tags', 'keywords', 'categories'] },
  { id: 'status', label: 'Status', level: 'product', description: 'active / draft / archived', candidates: () => ['status.workflow'] },
  { id: 'handle', label: 'URL handle', level: 'product', description: 'Only used for new products; existing handles are kept', candidates: l => [`handle.name${l === 'en' ? 'En' : 'No'}`] },
  { id: 'metafields_global_title_tag', label: 'SEO title', level: 'product', description: 'Search engine title', candidates: l => [`seoTitle.${l}`, `seoTitle.${other(l)}`] },
  { id: 'metafields_global_description_tag', label: 'SEO description', level: 'product', description: 'Search engine description', candidates: l => [`seoDescription.${l}`, `seoDescription.${other(l)}`, `descriptionShort.${l}`] },
  { id: 'variant.price', label: 'Price', level: 'variant', description: 'Selling price', candidates: () => ['price.effective', 'price.standard'] },
  { id: 'variant.compare_at_price', label: 'Compare-at price', level: 'variant', description: 'Struck-through "before" price (only when on sale)', candidates: () => ['price.compareAt'], mapWithoutData: true },
  { id: 'variant.sku', label: 'SKU', level: 'variant', description: 'Only filled in where Shopify has no SKU yet', candidates: () => ['variant.sku'] },
  { id: 'variant.barcode', label: 'Barcode', level: 'variant', description: 'GTIN / EAN / UPC', candidates: () => ['variant.gtin'] },
  { id: 'variant.weight', label: 'Weight (kg)', level: 'variant', description: 'Shipping weight', candidates: () => ['logistics.weightKg'] },
];

/** targetId → sourceId (null = not sent) */
export type ShopifyFieldMapping = Record<string, string | null>;

/** Reproduces the export's behaviour from before mappings existed */
export const DEFAULT_SHOPIFY_MAPPING: ShopifyFieldMapping = {
  title: 'name.en',
  body_html: 'descriptionLong.en',
  vendor: 'brand',
  product_type: 'category.first',
  tags: 'keywords',
  status: 'status.workflow',
  category: 'shopifyCategory',
  'metafield:mm-google-shopping.google_product_category': 'googleCategory.id',
  handle: null,
  metafields_global_title_tag: null,
  metafields_global_description_tag: null,
  'variant.price': 'price.effective',
  'variant.compare_at_price': 'price.compareAt',
  'variant.sku': 'variant.sku',
  'variant.barcode': 'variant.gtin',
  'variant.weight': null,
};

export function withDefaults(mapping: Partial<ShopifyFieldMapping> | null | undefined): ShopifyFieldMapping {
  return { ...DEFAULT_SHOPIFY_MAPPING, ...(mapping || {}) } as ShopifyFieldMapping;
}

// ─── Auto mapping ──────────────────────────────────────────────────────────────

export interface AutoMapResult {
  mapping: ShopifyFieldMapping;
  /** Targets where no candidate had data in any sample product: the user should choose */
  unresolved: string[];
  /** For each mapped target: share of sample products that have a value (0–1) */
  coverage: Record<string, number>;
}

/** Shopify locales like "nb", "nb-NO", "no", "nn" count as Norwegian */
export function languageForLocale(locale: string | null | undefined): 'en' | 'no' {
  return /^(nb|nn|no)\b/i.test(locale || '') ? 'no' : 'en';
}

function sampleValues(product: Product, source: PimSource): Value[] {
  if (source.level === 'product') return [source.get(product)];
  const variants = product.variants?.length ? product.variants : [undefined];
  return variants.map(v => source.get(product, v));
}

/** Share of products where the source yields a value */
export function sourceCoverage(sourceId: string, products: Product[]): number {
  const source = PIM_SOURCE_BY_ID.get(sourceId);
  if (!source || products.length === 0) return 0;
  const filled = products.filter(p => sampleValues(p, source).some(v => v !== null && v !== '')).length;
  return filled / products.length;
}

/**
 * Picks, per Shopify field, the best candidate source that actually has data in the
 * sample products (in the store's language first). Fields without any usable
 * candidate are left unmapped and reported as unresolved.
 */
export function autoMap(products: Product[], locale?: string | null): AutoMapResult {
  const language = languageForLocale(locale);
  const mapping: ShopifyFieldMapping = {};
  const unresolved: string[] = [];
  const coverage: Record<string, number> = {};

  for (const target of SHOPIFY_TARGETS) {
    const candidates = target.candidates(language);
    const scored = candidates.map(id => ({ id, coverage: sourceCoverage(id, products) }));
    // First candidate that covers at least half the products, else the best covered one
    const pick = scored.find(c => c.coverage >= 0.5) || scored.filter(c => c.coverage > 0).sort((a, b) => b.coverage - a.coverage)[0];
    if (pick) {
      mapping[target.id] = pick.id;
      coverage[target.id] = pick.coverage;
    } else if (target.mapWithoutData) {
      mapping[target.id] = candidates[0];
      coverage[target.id] = 0;
    } else {
      mapping[target.id] = null;
      unresolved.push(target.id);
    }
  }
  return { mapping, unresolved, coverage };
}

// ─── Applying a mapping ────────────────────────────────────────────────────────

const asString = (v: Value) => (v === null || v === '' ? undefined : String(v));
const asPrice = (v: Value) => (v === null || v === '' || isNaN(Number(v)) ? undefined : Number(v).toFixed(2));

function valueFor(mapping: ShopifyFieldMapping, targetId: string, product: Product, variant?: ProductVariant): Value {
  const sourceId = mapping[targetId];
  const source = sourceId ? PIM_SOURCE_BY_ID.get(sourceId) : undefined;
  return source ? source.get(product, variant) : null;
}

/** Product-level Shopify fields (only mapped ones with a value) */
export function buildShopifyProductFields(product: Product, mapping: ShopifyFieldMapping): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const target of SHOPIFY_TARGETS.filter(t => t.level === 'product' && !t.kind)) {
    const value = asString(valueFor(mapping, target.id, product));
    if (value !== undefined) fields[target.id] = value;
  }
  if (fields.status && !['active', 'draft', 'archived'].includes(fields.status)) delete fields.status;
  return fields;
}

/** Category and metafield targets, which the export writes with separate GraphQL calls */
export function buildShopifySpecialFields(product: Product, mapping: ShopifyFieldMapping): { category?: string; metafields: Array<{ namespace: string; key: string; value: string }> } {
  const result: { category?: string; metafields: Array<{ namespace: string; key: string; value: string }> } = { metafields: [] };
  for (const target of SHOPIFY_TARGETS.filter(t => t.kind)) {
    const value = asString(valueFor(mapping, target.id, product));
    if (value === undefined) continue;
    if (target.kind === 'category') result.category = value;
    else {
      const [namespace, ...rest] = target.id.slice('metafield:'.length).split('.');
      result.metafields.push({ namespace, key: rest.join('.'), value });
    }
  }
  return result;
}

/** Variant-level Shopify fields for one variant (or the product itself when it has none) */
export function buildShopifyVariantFields(product: Product, variant: ProductVariant | undefined, mapping: ShopifyFieldMapping): Record<string, string | number | null> {
  const fields: Record<string, string | number | null> = {};
  const price = asPrice(valueFor(mapping, 'variant.price', product, variant));
  fields.price = price ?? '0.00';
  if (mapping['variant.compare_at_price']) fields.compare_at_price = asPrice(valueFor(mapping, 'variant.compare_at_price', product, variant)) ?? null;
  const sku = asString(valueFor(mapping, 'variant.sku', product, variant));
  if (sku) fields.sku = sku;
  const barcode = asString(valueFor(mapping, 'variant.barcode', product, variant));
  if (barcode) fields.barcode = barcode;
  const weight = valueFor(mapping, 'variant.weight', product, variant);
  if (weight !== null && !isNaN(Number(weight))) {
    fields.weight = Number(weight);
    fields.weight_unit = 'kg';
  }
  return fields;
}

/** Human-readable preview of what a target would receive for one product */
export function previewValue(product: Product, targetId: string, mapping: ShopifyFieldMapping): string {
  const target = SHOPIFY_TARGETS.find(t => t.id === targetId);
  const value = valueFor(mapping, targetId, product, target?.level === 'variant' ? product.variants?.[0] : undefined);
  if (value === null || value === '') return '';
  const text = String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}
