// src/app/api/products/[id]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import type { Product } from '@/types/product';
import { dbAdmin } from '@/lib/firebase-admin'; // Import initialized Firebase Admin SDK

interface ProductParams {
  params: {
    id: string;
  };
}

// GET /api/products/[id] - Get a single product by ID
export async function GET(request: NextRequest, { params }: ProductParams) {
  const tenantId = request.headers.get('x-tenant-id');
  const { id } = params;

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is missing' }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: 'Product ID is missing' }, { status: 400 });
  }

  try {
    const productRef = dbAdmin.collection('tenants').doc(tenantId).collection('products').doc(id);
    const doc = await productRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(doc.data() as Product);
  } catch (error: any) {
    console.error(`Error fetching product ${id} for tenant ${tenantId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch product', details: error.message }, { status: 500 });
  }
}

// PUT /api/products/[id] - Update a product by ID
export async function PUT(request: NextRequest, { params }: ProductParams) {
  const tenantId = request.headers.get('x-tenant-id');
  const { id } = params;

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is missing' }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: 'Product ID is missing' }, { status: 400 });
  }

  let productUpdateData: Partial<Omit<Product, 'id' | 'createdAt'>>; // Allow updatedAt to be part of payload

  try {
    productUpdateData = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  try {
    const productRef = dbAdmin.collection('tenants').doc(tenantId).collection('products').doc(id);
    const doc = await productRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Product not found for update' }, { status: 404 });
    }

    const updatePayload = {
      ...productUpdateData,
      updatedAt: new Date().toISOString(), // Always set/update the updatedAt timestamp
    };

    await productRef.update(updatePayload);
    
    // Fetch the updated document to return it
    const updatedDoc = await productRef.get();
    const updatedProduct = updatedDoc.data() as Product;

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    console.error(`Error updating product ${id} for tenant ${tenantId}:`, error);
    return NextResponse.json({ error: 'Failed to update product', details: error.message }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete a product by ID
export async function DELETE(request: NextRequest, { params }: ProductParams) {
  const tenantId = request.headers.get('x-tenant-id');
  const { id } = params;

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is missing' }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: 'Product ID is missing' }, { status: 400 });
  }

  try {
    const productRef = dbAdmin.collection('tenants').doc(tenantId).collection('products').doc(id);
    const doc = await productRef.get();

    if (!doc.exists) {
      // Product already doesn't exist, so from client's perspective, it's "deleted"
      // Or return 404 if strict "must exist to be deleted" is required
      // For idempotency, 200 or 204 is often fine.
      // However, to match the previous error, let's return 404.
      return NextResponse.json({ error: 'Product not found for deletion' }, { status: 404 });
    }

    await productRef.delete();
    return NextResponse.json({ message: 'Product deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error deleting product ${id} for tenant ${tenantId}:`, error);
    return NextResponse.json({ error: 'Failed to delete product', details: error.message }, { status: 500 });
  }
}
