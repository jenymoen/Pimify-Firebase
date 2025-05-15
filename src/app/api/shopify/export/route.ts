
import { type NextRequest, NextResponse } from 'next/server';
import type { Product } from '@/types/product';

export async function POST(request: NextRequest) {
  try {
    const { storeUrl, apiKey, productsToExport } = await request.json(); // API Key is now sent from client

    if (!storeUrl) {
      return NextResponse.json({ error: 'Shopify store URL is required.' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Shopify Admin API Access Token is required.' }, { status: 400 });
    }
    if (!productsToExport || !Array.isArray(productsToExport) || productsToExport.length === 0) {
      return NextResponse.json({ error: 'No products provided for export.' }, { status: 400 });
    }

    let exportedCount = 0;
    for (const product of productsToExport as Product[]) {
      const shopifyApiUrl = `https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/products.json`;
      console.log(`Backend: Simulating export of "${product.basicInfo.name.en}" to ${shopifyApiUrl} with client-provided key: ${apiKey.substring(0,5)}...`);

      // --- Actual Shopify API Call Would Go Here (Simulated) ---
      // Example:
      // const shopifyProductPayload = { product: mapPimToShopifyProduct(product) }; // You'd need a mapping function
      // const shopifyResponse = await fetch(shopifyApiUrl, {
      //   method: 'POST',
      //   headers: {
      //     'X-Shopify-Access-Token': apiKey, // Use the apiKey from the client request
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(shopifyProductPayload),
      // });
      //
      // if (!shopifyResponse.ok) {
      //   const errorData = await shopifyResponse.json();
      //   console.error(`Failed to export product ${product.id}:`, errorData.errors || shopifyResponse.statusText);
      //   continue; 
      // }
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay per product
      exportedCount++;
    }

    return NextResponse.json({ message: `${exportedCount} products 'exported' to Shopify (using client-provided key).` });

  } catch (error: any) {
    console.error('Shopify Export API Error:', error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred during Shopify export.' }, { status: 500 });
  }
}
