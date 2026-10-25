import { NextRequest, NextResponse } from 'next/server';
import { withRoleBasedAccess } from '@/lib/api-middleware';
import { WorkflowAction } from '@/types/workflow';
import { normalizeShopifyDomain } from '@/lib/shopify-url';
import { resolveShopifyCredentials } from '@/lib/shopify-auth';
import {
  fetchProductMetafieldDefinitions, getSelectedMetafields, saveSelectedMetafields, isEditableMetafieldType,
  withMetafieldOptions, metafieldId,
} from '@/lib/shopify-metafields';

async function shopifyConnection() {
  const { storeUrl, apiKey } = await resolveShopifyCredentials({});
  if (!storeUrl || !apiKey) throw new Error('Shopify is not configured on the server');
  return { domain: normalizeShopifyDomain(storeUrl), token: apiKey };
}

/**
 * GET /api/settings/shopify-metafields — the definitions chosen for editing in Pimify.
 * ?available=true also returns every product metafield definition in Shopify.
 * ?withOptions=true returns the chosen ones with current validations and selectable values.
 */
async function getMetafields(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const selected = await getSelectedMetafields();
  const wantAvailable = params.get('available') === 'true';
  const wantOptions = params.get('withOptions') === 'true';
  if ((!wantAvailable && !wantOptions) || selected.length === 0 && !wantAvailable) {
    return NextResponse.json({ success: true, data: { selected } });
  }

  try {
    const { domain, token } = await shopifyConnection();
    const definitions = await fetchProductMetafieldDefinitions(domain, token);
    if (wantAvailable) {
      return NextResponse.json({
        success: true,
        data: { selected, available: definitions.map(d => ({ ...d, editable: isEditableMetafieldType(d.type) })) },
      });
    }
    // Fresh definition from Shopify where it still exists, so validations/choices are current
    const byId = new Map(definitions.map(d => [metafieldId(d), d]));
    const current = selected.map(s => ({ ...s, ...(byId.get(metafieldId(s)) || {}) }));
    return NextResponse.json({ success: true, data: { selected: await withMetafieldOptions(domain, token, current) } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Could not read Shopify metafields', data: { selected } },
      { status: 502 }
    );
  }
}

async function putMetafields(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.selected)) {
    return NextResponse.json({ success: false, error: 'Body must be { selected: MetafieldDefinition[] }' }, { status: 400 });
  }
  return NextResponse.json({ success: true, data: { selected: await saveSelectedMetafields(body.selected) } });
}

export const GET = withRoleBasedAccess(getMetafields, WorkflowAction.VIEW_ALL_PRODUCTS);
export const PUT = withRoleBasedAccess(putMetafields, WorkflowAction.MANAGE_USERS);
