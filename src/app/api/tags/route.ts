import { NextRequest, NextResponse } from 'next/server';
import { withRoleBasedAccess } from '@/lib/api-middleware';
import { WorkflowAction } from '@/types/workflow';
import { getTagLibrary, addToTagLibrary, removeFromTagLibrary } from '@/lib/tag-library';
import { normalizeShopifyDomain } from '@/lib/shopify-url';
import { resolveShopifyCredentials } from '@/lib/shopify-auth';
import { fetchShopifyProductTags } from '@/lib/shopify-metafields';

/** GET /api/tags — all remembered tags */
async function listTags() {
  return NextResponse.json({ success: true, data: await getTagLibrary() });
}

/** POST /api/tags — { tags: string[] } to remember, or { importFromShopify: true } */
async function addTags(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (body.importFromShopify) {
    try {
      const { storeUrl, apiKey } = await resolveShopifyCredentials({});
      if (!storeUrl || !apiKey) throw new Error('Shopify is not configured on the server');
      const tags = await fetchShopifyProductTags(normalizeShopifyDomain(storeUrl), apiKey);
      await addToTagLibrary(tags);
      return NextResponse.json({ success: true, data: await getTagLibrary(), imported: tags.length });
    } catch (error) {
      return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Import failed' }, { status: 502 });
    }
  }
  await addToTagLibrary(body.tags);
  return NextResponse.json({ success: true, data: await getTagLibrary() });
}

/** DELETE /api/tags?tag=... — forget a tag (does not remove it from products) */
async function deleteTag(request: NextRequest) {
  const tag = new URL(request.url).searchParams.get('tag');
  if (!tag) return NextResponse.json({ success: false, error: 'tag is required' }, { status: 400 });
  await removeFromTagLibrary(tag);
  return NextResponse.json({ success: true, data: await getTagLibrary() });
}

export const GET = withRoleBasedAccess(listTags, WorkflowAction.VIEW_ALL_PRODUCTS);
export const POST = withRoleBasedAccess(addTags, WorkflowAction.EDIT);
export const DELETE = withRoleBasedAccess(deleteTag, WorkflowAction.MANAGE_USERS);
