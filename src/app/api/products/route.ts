// src/app/api/products/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import type { Product } from '@/types/product';
import { initialProductData } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';

// VERY SIMPLIFIED IN-MEMORY DB FOR DEMO - REPLACE WITH FIRESTORE
const tenantDatabases: Record<string, Record<string, Product>> = {
  // Example: 'tenant1_products': { 'prod1': { ...productData } }
};

// GET /api/products - List all products for a tenant
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id') || 'default_tenant';

  if (!tenantDatabases[tenantId]) {
    tenantDatabases[tenantId] = {};
    // Optional: Seed initial data for demo tenants for first-time fetch
    if ((tenantId === 'default_host' || tenantId === 'localhost_dev') && Object.keys(tenantDatabases[tenantId]).length === 0) {
        const exampleProduct: Product = {
            ...initialProductData,
            id: 'EXAMPLE-SKU-001',
            basicInfo: {
                name: { en: 'Example Laptop (DB)', no: 'Eksempel Bærbar PC (DB)' },
                sku: 'EXAMPLE-SKU-001',
                gtin: '1234567890123',
                descriptionShort: { en: 'A powerful and versatile laptop from DB.', no: 'En kraftig og allsidig bærbar PC fra DB.' },
                descriptionLong: { en: 'This laptop features the latest generation processor, a stunning display, and long battery life, perfect for work and play. Sourced from DB.', no: 'Denne bærbare PC-en har siste generasjons prosessor, en fantastisk skjerm og lang batterilevetid, perfekt for arbeid og fritid. Hentet fra DB.' },
                brand: 'TechBrandDB',
                status: 'active',
                launchDate: '2023-01-15T00:00:00.000Z',
            },
            aiSummary: { en: 'DB seeded summary.', no: 'DB-sådd sammendrag.'},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
      tenantDatabases[tenantId][exampleProduct.id] = exampleProduct;
    }
  }

  const products = Object.values(tenantDatabases[tenantId]);
  return NextResponse.json(products);
}

// POST /api/products - Create a new product for a tenant
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id') || 'default_tenant';
  let productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

  try {
    productData = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!productData || !productData.basicInfo || !productData.basicInfo.sku) {
    return NextResponse.json({ error: 'Missing SKU or basicInfo in product data' }, { status: 400 });
  }
  
  const newId = productData.basicInfo.sku || uuidv4();

  if (!tenantDatabases[tenantId]) {
    tenantDatabases[tenantId] = {};
  }

  if (tenantDatabases[tenantId][newId]) {
    return NextResponse.json({ error: `Product with ID ${newId} already exists` }, { status: 409 });
  }
  
  const newProduct: Product = {
    ...initialProductData, // Ensure all fields from initialProductData are present
    ...productData,        // Spread the incoming data
    id: newId,
    options: productData.options || [], // Ensure options is always an array
    variants: productData.variants || [], // Ensure variants is always an array
    aiSummary: productData.aiSummary || { en: '', no: '' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tenantDatabases[tenantId][newProduct.id] = newProduct;

  // In a real Firestore setup, you'd save to Firestore and return the saved product.
  // For simulation, we return the product as it was added to the in-memory store.
  return NextResponse.json(newProduct, { status: 201 });
}
