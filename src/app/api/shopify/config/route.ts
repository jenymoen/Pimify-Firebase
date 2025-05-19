// src/app/api/shopify/config/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';

interface ShopifyConfig {
  storeUrl: string;
  apiKey: string;
}

const SHOPIFY_CONFIG_DOC_ID = 'configuration'; // Using a fixed ID for the config document

// GET /api/shopify/config - Get Shopify config for a tenant
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is missing' }, { status: 400 });
  }

  try {
    const configRef = dbAdmin.collection('tenants').doc(tenantId).collection('shopifyConfigs').doc(SHOPIFY_CONFIG_DOC_ID);
    const doc = await configRef.get();

    if (!doc.exists) {
      // Return empty config if not found, client can treat as not configured
      return NextResponse.json({ storeUrl: '', apiKey: '' });
    }
    const configData = doc.data() as ShopifyConfig;
    return NextResponse.json(configData);
  } catch (error: any) {
    console.error(`Error fetching Shopify config for tenant ${tenantId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch Shopify configuration', details: error.message }, { status: 500 });
  }
}

// POST /api/shopify/config - Save Shopify config for a tenant
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is missing' }, { status: 400 });
  }

  let newConfig: ShopifyConfig;
  try {
    newConfig = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!newConfig.storeUrl || !newConfig.apiKey) {
    return NextResponse.json({ error: 'Missing storeUrl or apiKey' }, { status: 400 });
  }

  try {
    const configRef = dbAdmin.collection('tenants').doc(tenantId).collection('shopifyConfigs').doc(SHOPIFY_CONFIG_DOC_ID);
    await configRef.set(newConfig, { merge: true }); // Using set with merge to create or update

    console.log(`Shopify configuration saved for tenant ${tenantId} in Firestore.`);
    return NextResponse.json({ message: 'Shopify configuration saved successfully.' });
  } catch (error: any) {
    console.error(`Error saving Shopify config for tenant ${tenantId}:`, error);
    return NextResponse.json({ error: 'Failed to save Shopify configuration', details: error.message }, { status: 500 });
  }
}
