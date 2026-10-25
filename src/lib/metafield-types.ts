// src/lib/metafield-types.ts — metafield helpers shared by browser and server

export interface MetafieldOption {
  /** What is stored and sent to Shopify (a metaobject GID or a choice) */
  value: string;
  label: string;
}

export interface MetafieldDefinition {
  namespace: string;
  key: string;
  name: string;
  type: string;
  description?: string | null;
  /** Shopify validations, e.g. choices, min/max, metaobject_definition_id */
  validations?: Array<{ name: string; value: string }>;
  /** Selectable values (filled in when the definition is loaded with options) */
  options?: MetafieldOption[];
  /** Why options could not be loaded (e.g. missing access scope) */
  optionsError?: string;
}

/** Metafield types Pimify can edit (product/file references need Shopify's own pickers) */
export const EDITABLE_METAFIELD_TYPES = [
  'single_line_text_field',
  'multi_line_text_field',
  'number_integer',
  'number_decimal',
  'boolean',
  'url',
  'color',
  'date',
  'list.single_line_text_field',
  'metaobject_reference',
  'list.metaobject_reference',
] as const;

export const isEditableMetafieldType = (type: string) => (EDITABLE_METAFIELD_TYPES as readonly string[]).includes(type);
export const isListMetafieldType = (type: string) => type.startsWith('list.');
export const isMetaobjectType = (type: string) => type === 'metaobject_reference' || type === 'list.metaobject_reference';

/** "namespace.key" — how values are keyed on a Pimify product */
export const metafieldId = (d: { namespace: string; key: string }) => `${d.namespace}.${d.key}`;

export const validationValue = (d: MetafieldDefinition, name: string) => d.validations?.find(v => v.name === name)?.value;

/** Fixed choices defined on a text metafield in Shopify */
export function metafieldChoices(d: MetafieldDefinition): string[] {
  const raw = validationValue(d, 'choices');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Values of a list metafield as stored in Pimify (JSON array, or comma separated) */
export function parseListValue(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // not JSON: treat as comma separated
  }
  return value.split(',').map(v => v.trim()).filter(Boolean);
}

/** Shopify expects lists as JSON arrays and booleans as "true"/"false" */
export function toShopifyMetafieldValue(type: string, value: string): string {
  if (isListMetafieldType(type)) return JSON.stringify(parseListValue(value));
  if (type === 'boolean') return /^(true|1|yes|ja)$/i.test(value.trim()) ? 'true' : 'false';
  return value;
}
