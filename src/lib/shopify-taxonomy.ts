// src/lib/shopify-taxonomy.ts — Shopify's Standard Product Taxonomy, server-only
import { shopifyRequest, shopifyErrorText } from './shopify-sync';

export interface ShopifyCategory {
  /** gid://shopify/TaxonomyCategory/… */
  id: string;
  fullName: string;
}

async function graphql<T>(domain: string, token: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await shopifyRequest(domain, token, 'graphql.json', { method: 'POST', body: JSON.stringify({ query, variables }) });
  if (!response.ok) throw new Error(`Shopify GraphQL request failed: ${await shopifyErrorText(response)}`);
  const body = await response.json();
  if (body.errors?.length) throw new Error(`Shopify GraphQL error: ${JSON.stringify(body.errors).slice(0, 300)}`);
  return body.data as T;
}

export async function searchShopifyCategories(domain: string, token: string, search: string, first = 25): Promise<ShopifyCategory[]> {
  const data: any = await graphql(domain, token, `
    query($search: String!, $first: Int!) { taxonomy { categories(search: $search, first: $first) { nodes { id fullName } } } }`,
    { search, first });
  return data.taxonomy.categories.nodes;
}

const levels = (path: string) => path.split('>').map(p => p.trim().toLowerCase());

/**
 * Shopify's taxonomy is built on Google's, so most Google paths exist 1:1 in Shopify.
 * Searches by the deepest level names and picks the exact path, else the Shopify
 * category sharing the longest leading part of the path.
 */
export async function matchShopifyCategory(domain: string, token: string, googlePath: string): Promise<ShopifyCategory | null> {
  const wanted = levels(googlePath);
  const candidates = new Map<string, ShopifyCategory>();
  // Try the leaf name first, then its parents, until something is found
  for (let i = wanted.length - 1; i >= 0 && candidates.size === 0; i--) {
    const original = googlePath.split('>')[i].trim();
    for (const c of await searchShopifyCategories(domain, token, original, 50)) candidates.set(c.id, c);
  }

  let best: { category: ShopifyCategory; shared: number } | null = null;
  for (const category of candidates.values()) {
    const have = levels(category.fullName);
    let shared = 0;
    while (shared < have.length && shared < wanted.length && have[shared] === wanted[shared]) shared++;
    if (shared === wanted.length && have.length === wanted.length) return category;
    // Only accept categories that are fully on the Google path (no unrelated deeper branch)
    if (shared === have.length && (!best || shared > best.shared)) best = { category, shared };
  }
  return best?.category ?? null;
}

/** Current category of a Shopify product */
export async function getShopifyProductCategory(domain: string, token: string, shopifyProductId: string): Promise<ShopifyCategory | null> {
  const data: any = await graphql(domain, token, `query($id: ID!) { product(id: $id) { category { id fullName } } }`,
    { id: `gid://shopify/Product/${shopifyProductId}` });
  return data.product?.category ?? null;
}

/** Sets the Shopify product category (not available through the REST product endpoint) */
export async function setShopifyProductCategory(domain: string, token: string, shopifyProductId: string, categoryId: string): Promise<string[]> {
  const data: any = await graphql(domain, token, `
    mutation($product: ProductUpdateInput!) {
      productUpdate(product: $product) { userErrors { field message } }
    }`, { product: { id: `gid://shopify/Product/${shopifyProductId}`, category: categoryId } });
  return (data.productUpdate.userErrors || []).map((e: any) => `${(e.field || []).join('.')}: ${e.message}`);
}
