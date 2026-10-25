import { NextResponse } from 'next/server';
import { normalizeShopifyDomain } from '@/lib/shopify-url';
import { resolveShopifyCredentials, ShopifyAuthError } from '@/lib/shopify-auth';
import { shopifyRequest, shopifyErrorText } from '@/lib/shopify-sync';

/** GET /api/shopify/shop-info — store name, language and currency (used by auto-mapping) */
export async function GET() {
  try {
    const { storeUrl, apiKey } = await resolveShopifyCredentials({});
    if (!storeUrl || !apiKey) {
      return NextResponse.json({ error: 'Shopify is not configured on the server' }, { status: 400 });
    }
    const response = await shopifyRequest(normalizeShopifyDomain(storeUrl), apiKey, 'shop.json');
    if (!response.ok) return NextResponse.json({ error: await shopifyErrorText(response) }, { status: 502 });
    const { shop } = await response.json();
    return NextResponse.json({ name: shop.name, primaryLocale: shop.primary_locale, currency: shop.currency });
  } catch (error) {
    const message = error instanceof ShopifyAuthError || error instanceof Error ? error.message : 'Failed to read shop info';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
