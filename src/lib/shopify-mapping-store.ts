// src/lib/shopify-mapping-store.ts — server-only persistence of the Shopify field mapping
import { adminDb } from './firebase-admin';
import { withDefaults, SHOPIFY_TARGETS, PIM_SOURCE_BY_ID, type ShopifyFieldMapping } from './shopify-mapping';

const DOC = 'settings/shopifyFieldMapping';

export async function getShopifyMapping(): Promise<ShopifyFieldMapping> {
  const snap = await adminDb.doc(DOC).get();
  return withDefaults(snap.exists ? (snap.data()?.mapping as ShopifyFieldMapping) : null);
}

/** Saves only known targets with sources of the matching level */
export async function saveShopifyMapping(mapping: ShopifyFieldMapping, updatedBy: string): Promise<ShopifyFieldMapping> {
  const clean: ShopifyFieldMapping = {};
  for (const target of SHOPIFY_TARGETS) {
    const sourceId = mapping[target.id];
    const source = sourceId ? PIM_SOURCE_BY_ID.get(sourceId) : undefined;
    clean[target.id] = source && source.level === target.level ? source.id : null;
  }
  await adminDb.doc(DOC).set({ mapping: clean, updatedAt: new Date().toISOString(), updatedBy });
  return clean;
}
