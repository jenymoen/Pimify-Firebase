// src/app/api/shopify/config/route.ts
import { type NextRequest, NextResponse } from 'next/server';

interface ShopifyConfig {
  storeUrl: string;
  apiKey: string;
}

// VERY SIMPLIFIED IN-MEMORY DB FOR DEMO - REPLACE WITH FIRESTORE
const tenantShopifyConfigs: Record<string, ShopifyConfig> = {};

// GET /api/shopify/config - Get Shopify config for a tenant
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id') || 'default_tenant';

  const config = tenantShopifyConfigs[tenantId];
  if (!config) {
    // Return empty config if not found, client can treat as not configured
    return NextResponse.json({ storeUrl: '', apiKey: '' });
  }
  return NextResponse.json(config);
}

// POST /api/shopify/config - Save Shopify config for a tenant
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id') || 'default_tenant';
  let newConfig: ShopifyConfig;

  try {
    newConfig = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!newConfig.storeUrl || !newConfig.apiKey) {
    return NextResponse.json({ error: 'Missing storeUrl or apiKey' }, { status: 400 });
  }

  tenantShopifyConfigs[tenantId] = newConfig;
  // In a real Firestore setup, you'd save to Firestore.
  return NextResponse.json({ message: 'Shopify configuration saved successfully.' }, { status: 200 });
}
