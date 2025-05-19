// src/app/api/products/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import type { Product } from '@/types/product';
import { initialProductData, defaultMultilingualString } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';
import { dbAdmin } from '@/lib/firebase-admin'; // Import initialized Firebase Admin SDK

// GET /api/products - List all products for a tenant
export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is missing' }, { status: 400 });
  }

  try {
    const productsCollectionRef = dbAdmin.collection('tenants').doc(tenantId).collection('products');
    const snapshot = await productsCollectionRef.get();

    if (snapshot.empty && (tenantId === 'default_host' || tenantId === 'localhost_dev')) {
      // Seed initial data for demo tenants if Firestore is empty for them
      const exampleProduct: Product = {
          ...initialProductData, // Ensure all default fields are present
          id: 'EXAMPLE-SKU-001', // Use SKU as ID for the example
          basicInfo: {
              name: { en: 'Example Laptop (Firestore)', no: 'Eksempel Bærbar PC (Firestore)' },
              sku: 'EXAMPLE-SKU-001',
              gtin: '1234567890123',
              descriptionShort: { en: 'A powerful and versatile laptop from Firestore.', no: 'En kraftig og allsidig bærbar PC fra Firestore.' },
              descriptionLong: { en: 'This laptop features the latest generation processor, a stunning display, and long battery life, perfect for work and play. Sourced from Firestore.', no: 'Denne bærbare PC-en har siste generasjons prosessor, en fantastisk skjerm og lang batterilevetid, perfekt for arbeid og fritid. Hentet fra Firestore.' },
              brand: 'TechBrandDB',
              status: 'active',
              launchDate: new Date('2023-01-15T00:00:00.000Z').toISOString(),
          },
          attributesAndSpecs: { // Ensure this matches Product type
            categories: ['Electronics', 'Computers'],
            properties: [{ id: uuidv4(), key: 'Color', value: 'Silver'}],
            technicalSpecs: [{ id: uuidv4(), key: 'RAM', value: '16GB'}],
          },
          media: { // Ensure this matches Product type
            images: [{
              id: uuidv4(),
              url: 'https://placehold.co/600x400.png',
              altText: { en: 'Example Laptop Image', no: 'Eksempel Bærbar PC Bilde'},
              type: 'image',
              dataAiHint: 'laptop computer'
            }]
          },
          marketingSEO: { // Ensure this matches Product type
             seoTitle: { en: 'Buy Example Laptop Online', no: 'Kjøp Eksempel Bærbar PC'},
             seoDescription: { en: 'Get the best deal on Example Laptop.', no: 'Få den beste prisen på Eksempel Bærbar PC.'},
             keywords: ['laptop', 'firestore', 'example']
          },
          pricingAndStock: { // Ensure this matches Product type
            standardPrice: [{ id: uuidv4(), amount: 1299.99, currency: 'USD' }],
            salePrice: [],
            costPrice: []
          },
          options: [ { id: 'opt1_fs', name: 'Size', values: ['S', 'M', 'L'] } ],
          variants: [
            { id: 'var1_fs', sku: 'EX-LAP-FS-S', optionValues: { Size: 'S' }, standardPrice: [{id: uuidv4(), amount: 999, currency: 'USD' }], salePrice: [] },
            { id: 'var2_fs', sku: 'EX-LAP-FS-M', optionValues: { Size: 'M' }, standardPrice: [{id: uuidv4(), amount: 1099, currency: 'USD' }], salePrice: []  },
          ],
          aiSummary: { en: 'Firestore seeded summary.', no: 'Firestore-sådd sammendrag.'},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
      };
      await productsCollectionRef.doc(exampleProduct.id).set(exampleProduct);
      console.log(`Seeded example product for tenant ${tenantId} in Firestore.`);
      return NextResponse.json([exampleProduct]);
    }

    const products = snapshot.docs.map(doc => ({ ...doc.data() } as Product));
    return NextResponse.json(products);

  } catch (error: any) {
    console.error(`Error fetching products for tenant ${tenantId} from Firestore:`, error);
    return NextResponse.json({ error: 'Failed to fetch products', details: error.message }, { status: 500 });
  }
}

// POST /api/products - Create a new product for a tenant
export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is missing' }, { status: 400 });
  }

  let productDataFromRequest: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
  try {
    productDataFromRequest = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!productDataFromRequest || !productDataFromRequest.basicInfo || !productDataFromRequest.basicInfo.sku) {
    return NextResponse.json({ error: 'Missing SKU or basicInfo in product data' }, { status: 400 });
  }
  
  const newProductId = productDataFromRequest.basicInfo.sku; // Using SKU as document ID for products
  const now = new Date().toISOString();

  const newProduct: Product = {
    ...initialProductData, // Start with defaults
    ...productDataFromRequest,        // Spread incoming data
    id: newProductId, // Ensure ID is the SKU
    // Ensure options and variants are always arrays, even if empty
    options: productDataFromRequest.options || [], 
    variants: productDataFromRequest.variants || [],
    aiSummary: productDataFromRequest.aiSummary || { ...defaultMultilingualString },
    createdAt: now,
    updatedAt: now,
  };

  try {
    const productRef = dbAdmin.collection('tenants').doc(tenantId).collection('products').doc(newProduct.id);
    await productRef.set(newProduct); // Using set() with SKU as ID means it will create or overwrite.
    console.log(`Product ${newProduct.id} created/updated for tenant ${tenantId} in Firestore.`);
    return NextResponse.json(newProduct, { status: 201 }); // Return 201 for created
  } catch (error: any) {
    console.error(`Error creating product ${newProduct.id} for tenant ${tenantId} in Firestore:`, error);
    return NextResponse.json({ error: 'Failed to create product', details: error.message }, { status: 500 });
  }
}
