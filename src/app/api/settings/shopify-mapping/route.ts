import { NextRequest, NextResponse } from 'next/server';
import { withRoleBasedAccess } from '@/lib/api-middleware';
import { WorkflowAction } from '@/types/workflow';
import { getShopifyMapping, saveShopifyMapping } from '@/lib/shopify-mapping-store';

async function getMapping() {
  return NextResponse.json({ success: true, data: await getShopifyMapping() });
}

async function putMapping(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.mapping !== 'object') {
    return NextResponse.json({ success: false, error: 'Body must be { mapping: { [shopifyField]: pimifySource | null } }' }, { status: 400 });
  }
  const user = (request as any).user;
  const saved = await saveShopifyMapping(body.mapping, user?.userName || user?.userId || 'unknown');
  return NextResponse.json({ success: true, data: saved });
}

export const GET = withRoleBasedAccess(getMapping, WorkflowAction.EXPORT_PRODUCTS);
export const PUT = withRoleBasedAccess(putMapping, WorkflowAction.MANAGE_USERS);
