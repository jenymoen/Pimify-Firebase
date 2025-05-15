
import { type NextRequest, NextResponse } from 'next/server';
import type { Product, ProductStatus as PimStatus, MediaEntry } from '@/types/product';

// Simplified Shopify Product structure for POST/PUT
interface ShopifyProductPayload {
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  status?: 'active' | 'draft' | 'archived';
  tags?: string; // Comma-separated
  variants?: Array<{
    sku?: string;
    price?: string; // Shopify expects price as string
    barcode?: string; // GTIN
    // inventory_quantity?: number; // For inventory management
  }>;
  images?: Array<{
    src: string;
    alt?: string;
  }>;
  // We can add metafields here if needed
}

function mapPimStatusToShopify(pimStatus: PimStatus): ShopifyProductPayload['status'] {
  switch (pimStatus) {
    case 'active':
      return 'active';
    case 'development':
      return 'draft';
    case 'inactive':
      return 'draft'; // Or 'archived', 'draft' is safer for "inactive" not meant to be public yet
    case 'discontinued':
      return 'archived';
    default:
      return 'draft';
  }
}

function mapPimToShopifyProduct(product: Product): { product: ShopifyProductPayload } {
  const shopifyPayload: ShopifyProductPayload = {
    title: product.basicInfo.name.en, // Assuming English as primary for Shopify
    body_html: product.basicInfo.descriptionLong.en,
    vendor: product.basicInfo.brand,
    product_type: product.attributesAndSpecs.categories?.[0] || undefined, // Take first category
    status: mapPimStatusToShopify(product.basicInfo.status),
    tags: product.marketingSEO.keywords?.join(', ') || undefined,
  };

  // Basic variant mapping (assumes single variant or primary one)
  shopifyPayload.variants = [{
    sku: product.basicInfo.sku,
    barcode: product.basicInfo.gtin,
    // price: product.pricingAndStock?.standardPrice?.[0]?.amount.toString() || "0.00", // Price needs careful handling
  }];

  // Image mapping
  if (product.media.images && product.media.images.length > 0) {
    shopifyPayload.images = product.media.images
      .filter(img => img.type === 'image' && img.url)
      .map(img => ({
        src: img.url,
        alt: img.altText?.en || product.basicInfo.name.en,
      }));
  }
  
  return { product: shopifyPayload };
}


export async function POST(request: NextRequest) {
  try {
    const { storeUrl, apiKey, productsToExport } = await request.json();

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
    const errors: string[] = [];

    for (const product of productsToExport as Product[]) {
      const shopifyApiUrl = `https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/products.json`;
      const shopifyPayload = mapPimToShopifyProduct(product);
      
      // console.log(`Exporting to Shopify: ${product.basicInfo.name.en}`, JSON.stringify(shopifyPayload, null, 2));

      const shopifyResponse = await fetch(shopifyApiUrl, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shopifyPayload),
      });

      if (!shopifyResponse.ok) {
        const errorData = await shopifyResponse.json().catch(() => ({ error: shopifyResponse.statusText }));
        const errorMessage = `Failed to export product "${product.basicInfo.name.en || product.basicInfo.sku}": ${JSON.stringify(errorData.errors || errorData.error || shopifyResponse.statusText)}`;
        console.error(errorMessage);
        errors.push(errorMessage);
        continue;
      }
      
      // const responseData = await shopifyResponse.json();
      // console.log(`Successfully exported product: ${responseData.product?.id}`);
      exportedCount++;
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        message: `${exportedCount} products exported. ${errors.length} products failed.`,
        errors, 
      }, { status: errors.length === productsToExport.length ? 500 : 207 }); // 207 Multi-Status if some succeed
    }

    return NextResponse.json({ message: `${exportedCount} products exported successfully to Shopify.` });

  } catch (error: any) {
    console.error('Shopify Export API Error:', error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred during Shopify export.' }, { status: 500 });
  }
}

