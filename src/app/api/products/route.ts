// src/app/api/products/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import type { Product } from '@/types/product';
import { initialProductData, defaultMultilingualString } from '@/types/product'; // Ensure defaultMultilingualString is exported
import { v4 as uuidv4 } from 'uuid';
import { dbAdmin } from '@/lib/firebase-admin'; // Import initialized Firebase Admin SDK

// GET /api/products - List all products for a tenant
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is missing' }, { status: 400 });
  }

  try {
    // TODO: Replace with actual Firestore query
    // const productsCollection = dbAdmin.collection('tenants').doc(tenantId).collection('products');
    // const snapshot = await productsCollection.get();
    // if (snapshot.empty && (tenantId === 'default_host' || tenantId === 'localhost_dev')) {
    //   // Seed initial data for demo tenants if Firestore is empty
    //   const exampleProduct: Product = {
    //       ...initialProductData,
    //       id: 'EXAMPLE-SKU-001',
    //       basicInfo: {
    //           name: { en: 'Example Laptop (DB)', no: 'Eksempel Bærbar PC (DB)' },
    //           sku: 'EXAMPLE-SKU-001',
    //           gtin: '1234567890123',
    //           descriptionShort: { en: 'A powerful and versatile laptop from DB.', no: 'En kraftig og allsidig bærbar PC fra DB.' },
    //           descriptionLong: { en: 'This laptop features the latest generation processor, a stunning display, and long battery life, perfect for work and play. Sourced from DB.', no: 'Denne bærbare PC-en har siste generasjons prosessor, en fantastisk skjerm og lang batterilevetid, perfekt for arbeid og fritid. Hentet fra DB.' },
    //           brand: 'TechBrandDB',
    //           status: 'active',
    //           launchDate: '2023-01-15T00:00:00.000Z',
    //       },
    //       options: [ { id: 'opt1', name: 'Size', values: ['S', 'M', 'L'] } ],
    //       variants: [
    //         { id: 'var1', sku: 'EX-LAP-S', optionValues: { Size: 'S' }, standardPrice: [{id: 'p1', amount: 999, currency: 'USD' }], salePrice: [] },
    //         { id: 'var2', sku: 'EX-LAP-M', optionValues: { Size: 'M' }, standardPrice: [{id: 'p2', amount: 1099, currency: 'USD' }], salePrice: []  },
    //       ],
    //       aiSummary: { en: 'DB seeded summary.', no: 'DB-sådd sammendrag.'},
    //       createdAt: new Date().toISOString(),
    //       updatedAt: new Date().toISOString(),
    //   };
    //   await productsCollection.doc(exampleProduct.id).set(exampleProduct);
    //   return NextResponse.json([exampleProduct]);
    // }
    // const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    // return NextResponse.json(products);

    // --- SIMULATED Firestore Logic (Remove when implementing actual Firestore) ---
    // Simulate fetching an empty list for now, or a seeded product for default tenants
    if ((tenantId === 'default_host' || tenantId === 'localhost_dev')) {
        const exampleProduct: Product = {
            ...initialProductData,
            id: 'EXAMPLE-SKU-001',
            basicInfo: {
                name: { en: 'Example Laptop (Simulated Firestore)', no: 'Eksempel Bærbar PC (Simulated Firestore)' },
                sku: 'EXAMPLE-SKU-001',
                gtin: '1234567890123',
                descriptionShort: { en: 'A powerful and versatile laptop.', no: 'En kraftig og allsidig bærbar PC.' },
                descriptionLong: { en: 'This laptop features the latest generation processor, a stunning display, and long battery life.', no: 'Denne bærbare PC-en har siste generasjons prosessor, en fantastisk skjerm og lang batterilevetid.' },
                brand: 'TechBrandDB',
                status: 'active',
                launchDate: '2023-01-15T00:00:00.000Z',
            },
            options: [ { id: 'opt1', name: 'Size', values: ['S', 'M', 'L'] } ],
            variants: [
              { id: 'var1', sku: 'EX-LAP-S', optionValues: { Size: 'S' }, standardPrice: [{id: 'p1', amount: 999, currency: 'USD' }], salePrice: [] },
              { id: 'var2', sku: 'EX-LAP-M', optionValues: { Size: 'M' }, standardPrice: [{id: 'p2', amount: 1099, currency: 'USD' }], salePrice: []  },
            ],
            aiSummary: { en: 'Simulated DB summary.', no: 'Simulert DB-sammendrag.'},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
      return NextResponse.json([exampleProduct]);
    }
    return NextResponse.json([]);
    // --- END SIMULATED Logic ---

  } catch (error: any) {
    console.error(`Error fetching products for tenant ${tenantId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch products', details: error.message }, { status: 500 });
  }
}

// POST /api/products - Create a new product for a tenant
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is missing' }, { status: 400 });
  }

  let productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
  try {
    productData = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!productData || !productData.basicInfo || !productData.basicInfo.sku) {
    return NextResponse.json({ error: 'Missing SKU or basicInfo in product data' }, { status: 400 });
  }
  
  const newId = productData.basicInfo.sku || uuidv4(); // Use SKU as ID if available, otherwise generate UUID
  const now = new Date().toISOString();

  const newProduct: Product = {
    ...initialProductData, // Start with defaults
    ...productData,        // Spread incoming data
    id: newId,
    options: productData.options || [], // Ensure options is always an array
    variants: productData.variants || [], // Ensure variants is always an array
    aiSummary: productData.aiSummary || { ...defaultMultilingualString },
    createdAt: now,
    updatedAt: now,
  };

  try {
    // TODO: Replace with actual Firestore operation
    // const productRef = dbAdmin.collection('tenants').doc(tenantId).collection('products').doc(newProduct.id);
    // await productRef.set(newProduct);
    // console.log(`Product ${newProduct.id} created for tenant ${tenantId}`);

    // --- SIMULATED Firestore Logic (Remove when implementing actual Firestore) ---
    console.log(`SIMULATED: Product ${newProduct.id} would be created for tenant ${tenantId} in Firestore.`);
    // In a real scenario, you'd fetch this from Firestore after creation or use the set data.
    // For simulation, we return the object as if it was successfully created.
    // --- END SIMULATED Logic ---

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error: any) {
    console.error(`Error creating product ${newProduct.id} for tenant ${tenantId}:`, error);
    // Check for specific Firestore error codes if needed, e.g., if a document already exists when it shouldn't
    return NextResponse.json({ error: 'Failed to create product', details: error.message }, { status: 500 });
  }
}
