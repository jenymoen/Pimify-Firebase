import { NextRequest, NextResponse } from 'next/server';
import { withRoleBasedAccess } from '@/lib/api-middleware';
import { WorkflowAction } from '@/types/workflow';
import { searchGoogleCategories, getGoogleCategory, findGoogleCategoryByPath } from '@/lib/google-taxonomy';
import { matchShopifyCategory, searchShopifyCategories, getShopifyProductCategory } from '@/lib/shopify-taxonomy';
import { normalizeShopifyDomain } from '@/lib/shopify-url';
import { resolveShopifyCredentials } from '@/lib/shopify-auth';
import { productService } from '@/lib/product-service';

async function shopify() {
  const { storeUrl, apiKey } = await resolveShopifyCredentials({});
  if (!storeUrl || !apiKey) throw new Error('Shopify is not configured on the server');
  return { domain: normalizeShopifyDomain(storeUrl), token: apiKey };
}

/**
 * GET /api/categories
 *   ?google=<text or id>        search Google product categories (English + Norwegian)
 *   ?shopify=<text>             search Shopify's product taxonomy
 *   ?matchGoogleId=<id>         Shopify category matching a Google category
 *   ?fromProduct=<pimify id>    current Shopify category of a linked product, plus the matching Google category
 */
async function getCategories(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  try {
    if (params.has('google')) {
      return NextResponse.json({ success: true, data: await searchGoogleCategories(params.get('google') || '') });
    }
    if (params.has('shopify')) {
      const { domain, token } = await shopify();
      return NextResponse.json({ success: true, data: await searchShopifyCategories(domain, token, params.get('shopify') || '') });
    }
    if (params.has('matchGoogleId')) {
      const google = await getGoogleCategory(Number(params.get('matchGoogleId')));
      if (!google) return NextResponse.json({ success: false, error: 'Unknown Google category id' }, { status: 404 });
      const { domain, token } = await shopify();
      return NextResponse.json({ success: true, data: await matchShopifyCategory(domain, token, google.path) });
    }
    if (params.has('fromProduct')) {
      const product = await productService.getProductById(params.get('fromProduct') || '');
      const shopifyProductId = product?.externalIds?.shopifyProductId;
      if (!shopifyProductId) return NextResponse.json({ success: false, error: 'This product is not linked to Shopify yet' }, { status: 404 });
      const { domain, token } = await shopify();
      const category = await getShopifyProductCategory(domain, token, shopifyProductId);
      const google = category ? await findGoogleCategoryByPath(category.fullName) : undefined;
      return NextResponse.json({ success: true, data: { shopifyCategory: category, googleCategory: google ?? null } });
    }
    return NextResponse.json({ success: false, error: 'Use ?google=, ?shopify=, ?matchGoogleId= or ?fromProduct=' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Category lookup failed' }, { status: 502 });
  }
}

export const GET = withRoleBasedAccess(getCategories, WorkflowAction.VIEW_ALL_PRODUCTS);
