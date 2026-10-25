import { NextResponse } from 'next/server';
import { normalizeShopifyDomain } from '@/lib/shopify-url';
import { isShopifyConfiguredOnServer } from '@/lib/shopify-auth';

/** GET /api/shopify/config — whether Shopify credentials are set in the server environment (never returns the token) */
export async function GET() {
  const configured = isShopifyConfiguredOnServer();
  return NextResponse.json({
    configured,
    storeDomain: configured ? normalizeShopifyDomain(process.env.SHOPIFY_STORE_DOMAIN || '') : null,
  });
}
