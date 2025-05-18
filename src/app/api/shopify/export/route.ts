
import { type NextRequest, NextResponse } from 'next/server';
import type { Product, ProductStatus as PimStatus, MediaEntry, PriceEntry, ProductOption as PimProductOption, ProductVariant as PimProductVariant } from '@/types/product';

// Placeholder for Shopify Config API
async function getShopifyConfigForTenant(tenantId: string): Promise<{ storeUrl: string; apiKey: string } | null> {
  // SIMULATION: This should fetch from your tenant-specific Shopify config storage (e.g., Firestore)
  // This is a HACK. In a real app, API routes should not call other API routes directly like this.
  try {
    const configResponse = await fetch(new URL('/api/shopify/config', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'), {
      method: 'GET',
      headers: { 'x-tenant-id': tenantId },
    });
    if (configResponse.ok) {
      return await configResponse.json();
    }
  } catch (e) {
     console.error("Error fetching shopify config within export route:", e);
  }
  return null;
}

interface ShopifyOptionPayload {
  name: string;
  values: string[];
}
interface ShopifyProductVariantPayload {
  sku?: string;
  price: string; 
  compare_at_price?: string | null; 
  barcode?: string; // GTIN
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  // inventory_quantity?: number; 
  // image_id?: number; 
}
interface ShopifyProductPayload {
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  status?: 'active' | 'draft' | 'archived';
  tags?: string; 
  options?: ShopifyOptionPayload[];
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
    title: product.basicInfo.name.en || product.basicInfo.name.no || 'Untitled Product', 
    body_html: product.basicInfo.descriptionLong.en || product.basicInfo.descriptionLong.no,
    vendor: product.basicInfo.brand,
    product_type: product.attributesAndSpecs.categories?.[0] || undefined, 
    status: mapPimStatusToShopify(product.basicInfo.status),
    tags: product.marketingSEO.keywords?.join(', ') || undefined,
  };

  if (product.media.images && product.media.images.length > 0) {
    shopifyPayload.images = product.media.images
      .filter(img => img.type === 'image' && img.url && (img.url.startsWith('http') || img.url.startsWith('/'))) 
      .map(img => ({
        src: img.url!, 
        alt: img.altText?.en || product.basicInfo.name.en || '',
      }));
  }

  if (product.options && product.options.length > 0 && product.variants && product.variants.length > 0) {
    shopifyPayload.options = product.options.map(opt => ({
      name: opt.name,
      values: opt.values,
    }));

    shopifyPayload.variants = product.variants.map(v => {
      const variantPayload: ShopifyProductVariantPayload = {
        sku: v.sku,
        barcode: v.gtin || undefined,
        price: "0.00", 
      };

      const stdPriceEntry = v.standardPrice?.[0];
      const slPriceEntry = v.salePrice?.[0];

      if (slPriceEntry && stdPriceEntry && slPriceEntry.amount < stdPriceEntry.amount) {
        variantPayload.price = slPriceEntry.amount.toString();
        variantPayload.compare_at_price = stdPriceEntry.amount.toString();
      } else if (stdPriceEntry) {
        variantPayload.price = stdPriceEntry.amount.toString();
      } else {
        const mainStdPrice = product.pricingAndStock?.standardPrice?.[0];
        const mainSalePrice = product.pricingAndStock?.salePrice?.[0];
        if (mainSalePrice && mainStdPrice && mainSalePrice.amount < mainStdPrice.amount) {
            variantPayload.price = mainSalePrice.amount.toString();
            variantPayload.compare_at_price = mainStdPrice.amount.toString();
        } else if (mainStdPrice) {
            variantPayload.price = mainStdPrice.amount.toString();
        }
      }
      
      product.options?.forEach((opt, index) => {
        if (index < 3) { 
          (variantPayload as any)[`option${index + 1}`] = v.optionValues[opt.name] || null;
        }
      });
      return variantPayload;
    });
  } else {
    const standardPriceEntry = product.pricingAndStock?.standardPrice?.[0];
    const salePriceEntry = product.pricingAndStock?.salePrice?.[0];
    let shopifyPrice: string = "0.00";
    let shopifyCompareAtPrice: string | null = null;

    if (salePriceEntry && standardPriceEntry && salePriceEntry.amount < standardPriceEntry.amount) {
      shopifyPrice = salePriceEntry.amount.toString();
      shopifyCompareAtPrice = standardPriceEntry.amount.toString();
    } else if (standardPriceEntry) {
      shopifyPrice = standardPriceEntry.amount.toString();
    }
    
    shopifyPayload.variants = [{
      sku: product.basicInfo.sku,
      price: shopifyPrice,
      compare_at_price: shopifyCompareAtPrice,
      barcode: product.basicInfo.gtin || undefined,
    }];
  }
  
  return { product: shopifyPayload };
}


export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id') || 'default_tenant';
  let productsToExport: Product[];

  try {
    const body = await request.json();
    productsToExport = body.productsToExport;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload for export request' }, { status: 400 });
  }

  if (!productsToExport || !Array.isArray(productsToExport) || productsToExport.length === 0) {
    return NextResponse.json({ error: 'No products provided for export.' }, { status: 400 });
  }

  const shopifyConfig = await getShopifyConfigForTenant(tenantId);

  if (!shopifyConfig || !shopifyConfig.storeUrl || !shopifyConfig.apiKey) {
    return NextResponse.json({ error: 'Shopify configuration is missing or incomplete for this tenant.' }, { status: 400 });
  }
  const { storeUrl, apiKey } = shopifyConfig;

  let exportedCount = 0;
  const errors: string[] = [];

  for (const product of productsToExport) {
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
      let errorDetail = `Shopify API request failed (${shopifyResponse.status}): ${shopifyResponse.statusText}`;
      try {
          const contentType = shopifyResponse.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
              const errorData = await shopifyResponse.json();
              errorDetail = errorData.errors || errorData.error || JSON.stringify(errorData);
          } else {
              errorDetail = await shopifyResponse.text();
          }
      } catch (e) {
          errorDetail = await shopifyResponse.text().catch(() => `Failed to retrieve error details, status: ${shopifyResponse.status}`);
      }
      const errorMessage = `Failed to export product "${product.basicInfo.name.en || product.basicInfo.sku}": ${errorDetail}`;
      console.error(errorMessage.substring(0,1000)); 
      errors.push(errorMessage);
      continue; 
    }
    
    exportedCount++;
  }

  if (errors.length > 0) {
    const fullMessage = `${exportedCount} products exported. ${errors.length} products failed.`;
    const status = exportedCount === 0 && errors.length === productsToExport.length ? 500 : 207; 
    return NextResponse.json({ 
      message: fullMessage,
      errors, 
    }, { status }); 
  }

  return NextResponse.json({ message: `${exportedCount} products exported successfully to Shopify.` });
}
