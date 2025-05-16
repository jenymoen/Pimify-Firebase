
import { type NextRequest, NextResponse } from 'next/server';
import type { Product, ProductStatus as PimStatus, MediaEntry, PriceEntry } from '@/types/product';

interface ShopifyProductVariantPayload {
  sku?: string;
  price: string; 
  compare_at_price?: string | null; 
  barcode?: string; // GTIN
  // inventory_quantity?: number; 
  // option1?: string; // For variants
}
interface ShopifyProductPayload {
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  status?: 'active' | 'draft' | 'archived';
  tags?: string; 
  variants?: ShopifyProductVariantPayload[];
  images?: Array<{
    src: string;
    alt?: string;
  }>;
}

function mapPimStatusToShopify(pimStatus: PimStatus): ShopifyProductPayload['status'] {
  switch (pimStatus) {
    case 'active':
      return 'active';
    case 'development':
      return 'draft';
    case 'inactive':
      return 'draft'; 
    case 'discontinued':
      return 'archived';
    default:
      return 'draft';
  }
}

function mapPimToShopifyProduct(product: Product): { product: ShopifyProductPayload } {
  const shopifyPayload: ShopifyProductPayload = {
    title: product.basicInfo.name.en || product.basicInfo.name.no, 
    body_html: product.basicInfo.descriptionLong.en || product.basicInfo.descriptionLong.no,
    vendor: product.basicInfo.brand,
    product_type: product.attributesAndSpecs.categories?.[0] || undefined, 
    status: mapPimStatusToShopify(product.basicInfo.status),
    tags: product.marketingSEO.keywords?.join(', ') || undefined,
  };

  const standardPriceEntry = product.pricingAndStock?.standardPrice?.[0];
  const salePriceEntry = product.pricingAndStock?.salePrice?.[0];
  // Cost price is not typically sent to Shopify's main product endpoint this way.

  let shopifyPrice: string;
  let shopifyCompareAtPrice: string | null = null;

  if (salePriceEntry && salePriceEntry.amount !== undefined && standardPriceEntry && standardPriceEntry.amount !== undefined && salePriceEntry.amount < standardPriceEntry.amount) {
    shopifyPrice = salePriceEntry.amount.toString();
    shopifyCompareAtPrice = standardPriceEntry.amount.toString();
  } else if (standardPriceEntry && standardPriceEntry.amount !== undefined) {
    shopifyPrice = standardPriceEntry.amount.toString();
  } else {
    shopifyPrice = "0.00"; // Default if no price info
  }
  
  shopifyPayload.variants = [{
    sku: product.basicInfo.sku,
    price: shopifyPrice,
    compare_at_price: shopifyCompareAtPrice,
    barcode: product.basicInfo.gtin,
  }];


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
      
      exportedCount++;
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        message: `${exportedCount} products exported. ${errors.length} products failed.`,
        errors, 
      }, { status: errors.length === productsToExport.length ? 500 : 207 }); 
    }

    return NextResponse.json({ message: `${exportedCount} products exported successfully to Shopify.` });

  } catch (error: any) {
    console.error('Shopify Export API Error:', error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred during Shopify export.' }, { status: 500 });
  }
}
