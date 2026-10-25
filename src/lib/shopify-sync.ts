// src/lib/shopify-sync.ts — server-only helpers for matching Pimify products to existing Shopify products
import type { Product } from '@/types/product';

const API_VERSION = '2024-04';

/** Admin REST call with retry on rate limiting (429) */
export async function shopifyRequest(domain: string, token: string, path: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
  const url = path.startsWith('https://') ? path : `https://${domain}/admin/api/${API_VERSION}/${path}`;
  const response = await fetch(url, {
    ...init,
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (response.status === 429 && attempt < 5) {
    const retryAfter = parseFloat(response.headers.get('Retry-After') || '2');
    await new Promise(resolve => setTimeout(resolve, Math.max(1, retryAfter) * 1000));
    return shopifyRequest(domain, token, path, init, attempt + 1);
  }
  return response;
}

export async function shopifyErrorText(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  try {
    const json = JSON.parse(text);
    const errors = json.errors ?? json.error ?? json;
    return typeof errors === 'string' ? errors : JSON.stringify(errors);
  } catch {
    return text || `${response.status} ${response.statusText}`;
  }
}

export interface ShopifyVariantRef { id: string; sku: string }

export interface ShopifyIndex {
  productIds: Set<string>;
  variantsByProduct: Map<string, ShopifyVariantRef[]>;
  productIdBySku: Map<string, string>;
  productIdByVariantId: Map<string, string>;
  productIdByTitle: Map<string, string>;
}

const skuKey = (sku: string | undefined | null) => (sku || '').trim().toLowerCase();
const titleKey = (title: string | undefined | null) => (title || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Reads every product in the store (id + variants only) so local products can be matched */
export async function fetchShopifyIndex(domain: string, token: string): Promise<ShopifyIndex> {
  const index: ShopifyIndex = {
    productIds: new Set(),
    variantsByProduct: new Map(),
    productIdBySku: new Map(),
    productIdByVariantId: new Map(),
    productIdByTitle: new Map(),
  };

  let next: string | null = 'products.json?limit=250&fields=id,title,variants';
  while (next) {
    const response = await shopifyRequest(domain, token, next);
    if (!response.ok) throw new Error(`Could not read existing Shopify products: ${await shopifyErrorText(response)}`);
    const { products } = await response.json() as { products: Array<{ id: number; title?: string; variants?: Array<{ id: number; sku: string | null }> }> };

    for (const p of products) {
      const productId = String(p.id);
      index.productIds.add(productId);
      if (titleKey(p.title)) index.productIdByTitle.set(titleKey(p.title), productId);
      const variants = (p.variants || []).map(v => ({ id: String(v.id), sku: v.sku || '' }));
      index.variantsByProduct.set(productId, variants);
      for (const v of variants) {
        index.productIdByVariantId.set(v.id, productId);
        if (skuKey(v.sku)) index.productIdBySku.set(skuKey(v.sku), productId);
      }
    }

    // Cursor pagination via the Link header: <url>; rel="next"
    const link = response.headers.get('link') || '';
    const match = link.split(',').find(part => part.includes('rel="next"'))?.match(/<([^>]+)>/);
    next = match ? match[1] : null;
  }
  return index;
}

export type MatchReason = 'linked' | 'variant-id' | 'sku' | 'title';

/**
 * Finds the Shopify product a Pimify product corresponds to, in order of reliability:
 * 1. the Shopify product id stored on the product after an earlier import/export
 * 2. variant ids (products imported from Shopify keep Shopify's variant ids)
 * 3. SKUs (base SKU and variant SKUs)
 * 4. exact product title (English or Norwegian) — least reliable, shown in the preview
 */
export function matchShopifyProduct(product: Product, index: ShopifyIndex): { shopifyProductId: string; reason: MatchReason } | null {
  const linked = product.externalIds?.shopifyProductId;
  if (linked && index.productIds.has(linked)) return { shopifyProductId: linked, reason: 'linked' };

  for (const variant of product.variants || []) {
    const hit = index.productIdByVariantId.get(String(variant.id));
    if (hit) return { shopifyProductId: hit, reason: 'variant-id' };
  }

  const skus = [product.basicInfo.sku, ...(product.variants || []).map(v => v.sku)];
  for (const sku of skus) {
    const hit = index.productIdBySku.get(skuKey(sku));
    if (hit) return { shopifyProductId: hit, reason: 'sku' };
  }

  for (const title of [product.basicInfo.name?.en, product.basicInfo.name?.no]) {
    const hit = index.productIdByTitle.get(titleKey(title));
    if (hit) return { shopifyProductId: hit, reason: 'title' };
  }
  return null;
}

/** Shopify variant to update for a Pimify variant (or the single default variant) */
export function findShopifyVariant(
  shopifyVariants: ShopifyVariantRef[],
  pim: { id?: string; sku?: string }
): ShopifyVariantRef | undefined {
  return shopifyVariants.find(v => pim.id && v.id === String(pim.id))
    || shopifyVariants.find(v => skuKey(pim.sku) && skuKey(v.sku) === skuKey(pim.sku));
}

// ─── Variant images ────────────────────────────────────────────────────────────

/** Comparable form of an image URL: host-less path without query string or size suffix */
function imageKey(url: string): string {
  try {
    const path = decodeURIComponent(new URL(url, 'https://x').pathname).toLowerCase();
    // Shopify CDN may add size suffixes like _800x800 before the extension
    return path.replace(/_(\d+x\d*|\d*x\d+|small|medium|large|grande|master)(?=\.[a-z0-9]+$)/, '');
  } catch {
    return url.split('?')[0].toLowerCase();
  }
}
const fileName = (key: string) => key.split('/').pop() || key;

/**
 * Shopify image id for each Pimify image used by a variant. Images already on the
 * Shopify product are matched by URL (or file name). If that fails but the product has
 * the same number of images in both systems, the image at the same position is used:
 * images renamed/converted in Shopify after an import keep their order. Only images
 * that can't be matched either way are uploaded.
 */
export async function resolveVariantImageIds(
  domain: string,
  token: string,
  shopifyProductId: string,
  product: Product,
  warnings: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const usedImageIds = new Set((product.variants || []).map(v => v.imageIds?.[0]).filter((id): id is string => !!id));
  if (usedImageIds.size === 0) return result;

  const response = await shopifyRequest(domain, token, `products/${shopifyProductId}/images.json`);
  if (!response.ok) {
    warnings.push(`Could not read images of Shopify product ${shopifyProductId}: ${await shopifyErrorText(response)}`);
    return result;
  }
  const { images: unsorted } = await response.json() as { images: Array<{ id: number; src: string; position?: number }> };
  const images = [...unsorted].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const pimImages = (product.media?.images || []).filter(img => img.type === 'image' && img.url);
  const samePositions = pimImages.length === images.length;
  const byKey = new Map(images.map(img => [imageKey(img.src), img.id]));
  const byFile = new Map(images.map(img => [fileName(imageKey(img.src)), img.id]));

  for (const pimImageId of usedImageIds) {
    const pimImage = product.media?.images?.find(img => img.id === pimImageId);
    if (!pimImage?.url) continue;
    const key = imageKey(pimImage.url);
    const position = pimImages.findIndex(img => img.id === pimImageId);
    const existing = byKey.get(key) ?? byFile.get(fileName(key)) ?? (samePositions && position >= 0 ? images[position].id : undefined);
    if (existing) {
      result.set(pimImageId, existing);
      continue;
    }
    if (!/^https?:\/\//i.test(pimImage.url)) {
      warnings.push(`Image ${pimImage.url} is not a public URL and cannot be sent to Shopify.`);
      continue;
    }
    const upload = await shopifyRequest(domain, token, `products/${shopifyProductId}/images.json`, {
      method: 'POST',
      body: JSON.stringify({ image: { src: pimImage.url, alt: pimImage.altText?.no || pimImage.altText?.en || undefined } }),
    });
    if (!upload.ok) {
      warnings.push(`Could not upload image ${pimImage.url}: ${await shopifyErrorText(upload)}`);
      continue;
    }
    const { image } = await upload.json();
    result.set(pimImageId, image.id);
  }
  return result;
}
