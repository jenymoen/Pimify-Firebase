
import { type NextRequest, NextResponse } from 'next/server';
import type { Product } from '@/types/product';
import { initialProductData, defaultMultilingualString } from '@/types/product'; // For dummy data
import { v4 as uuidv4 } from 'uuid'; // For dummy data

// IMPORTANT SECURITY NOTE:
// In a production environment, the Shopify API Key (apiKey) should NOT be passed from the client.
// It should be stored securely as an environment variable on the server and accessed here directly.
// The storeUrl could also be an environment variable if it's fixed, or configured securely.

export async function POST(request: NextRequest) {
  try {
    const { storeUrl, apiKey } = await request.json();

    if (!storeUrl || !apiKey) {
      return NextResponse.json({ error: 'Shopify store URL and API key are required.' }, { status: 400 });
    }

    // --- Actual Shopify API Call Would Go Here (Simulated for now) ---
    const shopifyApiUrl = `https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/products.json`;
    console.log(`Backend: Simulating Shopify import from ${shopifyApiUrl} with key: ${apiKey.substring(0, 5)}...`);

    // Example:
    // const shopifyResponse = await fetch(shopifyApiUrl, {
    //   method: 'GET',
    //   headers: {
    //     'X-Shopify-Access-Token': apiKey,
    //     'Content-Type': 'application/json',
    //   },
    // });
    //
    // if (!shopifyResponse.ok) {
    //   const errorData = await shopifyResponse.json();
    //   throw new Error(errorData.errors || `Shopify API request failed: ${shopifyResponse.statusText}`);
    // }
    // const shopifyData = await shopifyResponse.json();
    // const productsToImport = shopifyData.products.map(product => mapShopifyToPimProduct(product)); // You'd need a mapping function

    // --- Simulated Data for demonstration ---
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay

    const dummyShopifyProducts: Product[] = [
      {
        ...initialProductData,
        id: 'BE-SKU-001',
        basicInfo: {
          ...initialProductData.basicInfo,
          name: { en: 'Backend Imported T-Shirt', no: 'Backend Importert T-skjorte' },
          sku: 'BE-SKU-001',
          descriptionShort: { en: 'A cool t-shirt from Shopify (via backend).', no: 'En kul t-skjorte fra Shopify (via backend).' },
        },
        media: { images: [{ id: uuidv4(), url: 'https://placehold.co/300x300.png', type: 'image', altText: defaultMultilingualString, dataAiHint: "t-shirt" }]},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        ...initialProductData,
        id: 'BE-SKU-002',
        basicInfo: {
          ...initialProductData.basicInfo,
          name: { en: 'Backend Imported Mug', no: 'Backend Importert Krus' },
          sku: 'BE-SKU-002',
          descriptionShort: { en: 'A nice mug from Shopify (via backend).', no: 'Et fint krus fra Shopify (via backend).' },
        },
        media: { images: [{ id: uuidv4(), url: 'https://placehold.co/300x300.png', type: 'image', altText: defaultMultilingualString, dataAiHint: "mug" }]},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
    // End of simulated data

    return NextResponse.json({ products: dummyShopifyProducts, message: `${dummyShopifyProducts.length} products 'imported' from Shopify (via backend).` });

  } catch (error: any) {
    console.error('Shopify Import API Error:', error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred during Shopify import.' }, { status: 500 });
  }
}
