import { NextRequest, NextResponse } from 'next/server';
import { withRoleBasedAccess } from '@/lib/api-middleware';
import { WorkflowAction } from '@/types/workflow';
import { productService } from '@/lib/product-service';
import { normalizeShopifyDomain } from '@/lib/shopify-url';
import { resolveShopifyCredentials } from '@/lib/shopify-auth';
import { fetchProductMetafieldValues, getSelectedMetafields, metafieldId } from '@/lib/shopify-metafields';

/**
 * GET /api/shopify/product-metafields?productId=<pimify id>
 * Current Shopify values of the chosen metafields for a product that is linked to Shopify.
 */
async function getProductMetafields(request: NextRequest) {
  const productId = new URL(request.url).searchParams.get('productId');
  if (!productId) return NextResponse.json({ success: false, error: 'productId is required' }, { status: 400 });

  const product = await productService.getProductById(productId);
  const shopifyProductId = product?.externalIds?.shopifyProductId;
  if (!shopifyProductId) {
    return NextResponse.json({ success: false, error: 'This product is not linked to a Shopify product yet (export or import it first).' }, { status: 404 });
  }

  try {
    const { storeUrl, apiKey } = await resolveShopifyCredentials({});
    if (!storeUrl || !apiKey) throw new Error('Shopify is not configured on the server');
    const [all, selected] = await Promise.all([
      fetchProductMetafieldValues(normalizeShopifyDomain(storeUrl), apiKey, shopifyProductId),
      getSelectedMetafields(),
    ]);
    const values = Object.fromEntries(selected.map(metafieldId).filter(id => all[id] !== undefined).map(id => [id, all[id]]));
    return NextResponse.json({ success: true, data: values });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Could not read Shopify values' }, { status: 502 });
  }
}

export const GET = withRoleBasedAccess(getProductMetafields, WorkflowAction.VIEW_ALL_PRODUCTS);
