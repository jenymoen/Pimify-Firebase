// src/lib/shopify-metafields.ts — product metafield definitions from Shopify and which ones Pimify edits
import { adminDb } from './firebase-admin';
import { shopifyRequest, shopifyErrorText } from './shopify-sync';
import {
  isEditableMetafieldType, isMetaobjectType, metafieldChoices, metafieldId, toShopifyMetafieldValue, validationValue,
  type MetafieldDefinition,
} from './metafield-types';

export * from './metafield-types';

const SETTINGS_DOC = 'settings/shopifyMetafields';

async function graphql<T>(domain: string, token: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await shopifyRequest(domain, token, 'graphql.json', { method: 'POST', body: JSON.stringify({ query, variables }) });
  if (!response.ok) throw new Error(`Shopify GraphQL request failed: ${await shopifyErrorText(response)}`);
  const body = await response.json();
  if (body.errors?.length) throw new Error(`Shopify GraphQL error: ${JSON.stringify(body.errors).slice(0, 300)}`);
  return body.data as T;
}

export async function fetchProductMetafieldDefinitions(domain: string, token: string): Promise<MetafieldDefinition[]> {
  const definitions: MetafieldDefinition[] = [];
  let after: string | null = null;
  do {
    const data: any = await graphql(domain, token, `
      query($after: String) {
        metafieldDefinitions(first: 100, ownerType: PRODUCT, after: $after) {
          nodes { namespace key name description type { name } validations { name value } }
          pageInfo { hasNextPage endCursor }
        }
      }`, { after });
    for (const n of data.metafieldDefinitions.nodes) {
      definitions.push({
        namespace: n.namespace, key: n.key, name: n.name, type: n.type.name, description: n.description,
        validations: (n.validations || []).map((v: any) => ({ name: v.name, value: String(v.value) })),
      });
    }
    after = data.metafieldDefinitions.pageInfo.hasNextPage ? data.metafieldDefinitions.pageInfo.endCursor : null;
  } while (after);
  return definitions;
}

export const MISSING_METAOBJECT_SCOPE =
  'The Shopify app needs the read_metaobjects and read_metaobject_definitions scopes to list these values. ' +
  'Add them to the app version in the Dev Dashboard, release it and approve the update in the store.';

/** All entries of the metaobject type a reference metafield points to */
async function fetchMetaobjectOptions(domain: string, token: string, definitionId: string): Promise<{ options?: { value: string; label: string }[]; error?: string }> {
  const def: any = await graphql(domain, token, `query($id: ID!) { metaobjectDefinition(id: $id) { type } }`, { id: definitionId });
  const type = def.metaobjectDefinition?.type;
  if (!type) return { error: MISSING_METAOBJECT_SCOPE };

  const options: { value: string; label: string }[] = [];
  let after: string | null = null;
  do {
    const data: any = await graphql(domain, token, `
      query($type: String!, $after: String) {
        metaobjects(type: $type, first: 250, after: $after) {
          nodes { id displayName handle }
          pageInfo { hasNextPage endCursor }
        }
      }`, { type, after });
    for (const n of data.metaobjects.nodes) options.push({ value: n.id, label: n.displayName || n.handle });
    after = data.metaobjects.pageInfo.hasNextPage && options.length < 1000 ? data.metaobjects.pageInfo.endCursor : null;
  } while (after);
  options.sort((a, b) => a.label.localeCompare(b.label, 'nb'));
  return { options };
}

/** Adds selectable values: fixed choices, or the entries of the referenced metaobject type */
export async function withMetafieldOptions(domain: string, token: string, definitions: MetafieldDefinition[]): Promise<MetafieldDefinition[]> {
  const cache = new Map<string, Promise<{ options?: { value: string; label: string }[]; error?: string }>>();
  return Promise.all(definitions.map(async d => {
    const choices = metafieldChoices(d);
    if (choices.length) return { ...d, options: choices.map(c => ({ value: c, label: c })) };
    const definitionId = isMetaobjectType(d.type) ? validationValue(d, 'metaobject_definition_id') : undefined;
    if (!definitionId) return d;
    if (!cache.has(definitionId)) {
      cache.set(definitionId, fetchMetaobjectOptions(domain, token, definitionId).catch(e => {
        const message = e instanceof Error ? e.message : String(e);
        return { error: /access denied/i.test(message) ? MISSING_METAOBJECT_SCOPE : message };
      }));
    }
    const { options, error } = await cache.get(definitionId)!;
    return { ...d, options, optionsError: error };
  }));
}

export async function fetchShopifyProductTags(domain: string, token: string): Promise<string[]> {
  const tags: string[] = [];
  let after: string | null = null;
  do {
    const data: any = await graphql(domain, token, `
      query($after: String) { productTags(first: 250, after: $after) { nodes pageInfo { hasNextPage endCursor } } }`, { after });
    tags.push(...data.productTags.nodes);
    after = data.productTags.pageInfo.hasNextPage ? data.productTags.pageInfo.endCursor : null;
  } while (after);
  return tags;
}

/** Current metafield values of one Shopify product, keyed "namespace.key" */
export async function fetchProductMetafieldValues(domain: string, token: string, shopifyProductId: string): Promise<Record<string, string>> {
  const values: Record<string, string> = {};
  let after: string | null = null;
  do {
    const data: any = await graphql(domain, token, `
      query($id: ID!, $after: String) {
        product(id: $id) {
          metafields(first: 100, after: $after) { nodes { namespace key value } pageInfo { hasNextPage endCursor } }
        }
      }`, { id: `gid://shopify/Product/${shopifyProductId}`, after });
    if (!data.product) break;
    for (const m of data.product.metafields.nodes) values[`${m.namespace}.${m.key}`] = m.value;
    after = data.product.metafields.pageInfo.hasNextPage ? data.product.metafields.pageInfo.endCursor : null;
  } while (after);
  return values;
}

/** Definitions the user chose to edit in Pimify */
export async function getSelectedMetafields(): Promise<MetafieldDefinition[]> {
  const snap = await adminDb.doc(SETTINGS_DOC).get();
  return (snap.data()?.selected as MetafieldDefinition[] | undefined) || [];
}

export async function saveSelectedMetafields(selected: MetafieldDefinition[]): Promise<MetafieldDefinition[]> {
  const clean = selected
    .filter(d => d && d.namespace && d.key && isEditableMetafieldType(d.type))
    .map(d => ({
      namespace: d.namespace, key: d.key, name: d.name || d.key, type: d.type, description: d.description || null,
      validations: (d.validations || []).map(v => ({ name: String(v.name), value: String(v.value) })),
    }));
  await adminDb.doc(SETTINGS_DOC).set({ selected: clean, updatedAt: new Date().toISOString() });
  return clean;
}

/**
 * Writes metafield values to a Shopify product with metafieldsSet (creates or updates).
 * Values are Pimify strings; empty values are skipped (existing Shopify values are kept).
 */
export async function setProductMetafields(
  domain: string,
  token: string,
  shopifyProductId: string,
  values: Record<string, string> | undefined,
  definitions: MetafieldDefinition[]
): Promise<string[]> {
  const errors: string[] = [];
  const inputs = definitions
    .map(d => ({ d, value: values?.[metafieldId(d)] }))
    .filter(({ value }) => value !== undefined && value !== null && String(value).trim() !== '' && String(value).trim() !== '[]')
    .map(({ d, value }) => ({
      ownerId: `gid://shopify/Product/${shopifyProductId}`,
      namespace: d.namespace,
      key: d.key,
      type: d.type,
      value: toShopifyMetafieldValue(d.type, String(value)),
    }));

  for (let i = 0; i < inputs.length; i += 25) {
    const data: any = await graphql(domain, token, `
      mutation($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { userErrors { field message } }
      }`, { metafields: inputs.slice(i, i + 25) });
    for (const e of data.metafieldsSet.userErrors || []) errors.push(`${(e.field || []).join('.')}: ${e.message}`);
  }
  return errors;
}
