// src/app/api/products/[id]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import type { Product } from '@/types/product';

// VERY SIMPLIFIED IN-MEMORY DB FOR DEMO - REPLACE WITH FIRESTORE
// This should be the same instance as in /api/products/route.ts if running in a single process environment.
// For serverless, each function invocation is separate, so this in-memory store won't persist across different API calls reliably.
// This is a major reason to move to a proper database like Firestore.
const tenantDatabases: Record<string, Record<string, Product>> = {}; // Needs to be populated by product creation

interface ProductParams {
  params: {
    id: string;
  };
}

// GET /api/products/[id] - Get a single product by ID
export async function GET(request: NextRequest, { params }: ProductParams) {
  const tenantId = request.headers.get('x-tenant-id') || 'default_tenant';
  const { id } = params;

  if (!tenantDatabases[tenantId] || !tenantDatabases[tenantId][id]) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
  return NextResponse.json(tenantDatabases[tenantId][id]);
}

// PUT /api/products/[id] - Update a product by ID
export async function PUT(request: NextRequest, { params }: ProductParams) {
  const tenantId = request.headers.get('x-tenant-id') || 'default_tenant';
  const { id } = params;
  let productUpdateData: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>;

  try {
    productUpdateData = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!tenantDatabases[tenantId] || !tenantDatabases[tenantId][id]) {
    return NextResponse.json({ error: 'Product not found for update' }, { status: 404 });
  }

  const existingProduct = tenantDatabases[tenantId][id];
  const updatedProduct: Product = {
    ...existingProduct,
    ...productUpdateData,
    basicInfo: { ...existingProduct.basicInfo, ...productUpdateData.basicInfo },
    attributesAndSpecs: { ...existingProduct.attributesAndSpecs, ...productUpdateData.attributesAndSpecs },
    media: productUpdateData.media ? { ...existingProduct.media, ...productUpdateData.media } : existingProduct.media,
    marketingSEO: { ...existingProduct.marketingSEO, ...productUpdateData.marketingSEO },
    pricingAndStock: productUpdateData.pricingAndStock ? {
      ...existingProduct.pricingAndStock,
      ...productUpdateData.pricingAndStock,
    } : existingProduct.pricingAndStock,
    options: productUpdateData.options !== undefined ? [...productUpdateData.options] : existingProduct.options || [],
    variants: productUpdateData.variants !== undefined ? [...productUpdateData.variants] : existingProduct.variants || [],
    aiSummary: productUpdateData.aiSummary ? { ...existingProduct.aiSummary, ...productUpdateData.aiSummary } : existingProduct.aiSummary,
    updatedAt: new Date().toISOString(),
  };

  tenantDatabases[tenantId][id] = updatedProduct;
  return NextResponse.json(updatedProduct);
}

// DELETE /api/products/[id] - Delete a product by ID
export async function DELETE(request: NextRequest, { params }: ProductParams) {
  const tenantId = request.headers.get('x-tenant-id') || 'default_tenant';
  const { id } = params;

  if (!tenantDatabases[tenantId] || !tenantDatabases[tenantId][id]) {
    return NextResponse.json({ error: 'Product not found for deletion' }, { status: 404 });
  }

  delete tenantDatabases[tenantId][id];
  return NextResponse.json({ message: 'Product deleted successfully' }, { status: 200 });
}
