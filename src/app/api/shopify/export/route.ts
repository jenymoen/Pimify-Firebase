
import { type NextRequest, NextResponse } from 'next/server';
import type { Product, ProductStatus as PimStatus, MediaEntry, PriceEntry, ProductOption as PimProductOption, ProductVariant as PimProductVariant } from '@/types/product';
import { dbAdmin } from '@/lib/firebase-admin'; // Corrected import path

const SHOPIFY_CONFIG_DOC_ID = 'configuration'; // Consistent with config route

async function getShopifyConfigForTenant(tenantId: string): Promise<{ storeUrl: string; apiKey: string } | null> {
  if (!tenantId) {
    console.error('getShopifyConfigForTenant called without tenantId in export route');
    return null;
  }
  try {
    const configRef = dbAdmin.collection('tenants').doc(tenantId).collection('shopifyConfigs').doc(SHOPIFY_CONFIG_DOC_ID);
    const doc = await configRef.get();

    if (!doc.exists) {
      console.log(`Shopify config not found in Firestore for tenant ${tenantId} in export route.`);
      return null; // Config not found
    }
    const configData = doc.data() as { storeUrl: string; apiKey: string };
     if (!configData.storeUrl || !configData.apiKey) {
        console.log(`Shopify config incomplete in Firestore for tenant ${tenantId} in export route.`);
        return null; // Config incomplete
    }
    return configData;
  } catch (error: any) {
    console.error(`Error fetching Shopify config from Firestore for tenant ${tenantId} in export route:`, error);
    return null;
  }
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
      return 'draft'; // Or 'archived' depending on desired behavior
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

  // Handle options and variants
  if (product.options && product.options.length > 0 && product.variants && product.variants.length > 0) {
    shopifyPayload.options = product.options.map(opt => ({
      name: opt.name,
      values: opt.values,
    }));

    shopifyPayload.variants = product.variants.map(v => {
      const variantPayload: ShopifyProductVariantPayload = {
        sku: v.sku,
        barcode: v.gtin || undefined,
        price: "0.00", // Default, will be overridden
      };

      const stdPriceEntry = v.standardPrice?.[0];
      const slPriceEntry = v.salePrice?.[0];

      if (slPriceEntry && stdPriceEntry && slPriceEntry.amount < stdPriceEntry.amount) {
        variantPayload.price = slPriceEntry.amount.toString();
        variantPayload.compare_at_price = stdPriceEntry.amount.toString();
      } else if (stdPriceEntry) {
        variantPayload.price = stdPriceEntry.amount.toString();
      } else {
        // Fallback to main product pricing if variant pricing is missing
        const mainStdPrice = product.pricingAndStock?.standardPrice?.[0];
        const mainSalePrice = product.pricingAndStock?.salePrice?.[0];
        if (mainSalePrice && mainStdPrice && mainSalePrice.amount < mainStdPrice.amount) {
            variantPayload.price = mainSalePrice.amount.toString();
            variantPayload.compare_at_price = mainStdPrice.amount.toString();
        } else if (mainStdPrice) {
            variantPayload.price = mainStdPrice.amount.toString();
        }
      }

      // Map option values to option1, option2, option3
      product.options?.forEach((opt, index) => {
        if (index < 3) { // Shopify supports max 3 options
          (variantPayload as any)[`option${index + 1}`] = v.optionValues[opt.name] || null;
        }
      });
      return variantPayload;
    });
  } else {
    // No PIM variants, create a single default variant for Shopify
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
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is missing from request headers.' }, { status: 400 });
  }

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
          // Fallback if reading/parsing the error response fails
          errorDetail = await shopifyResponse.text().catch(() => `Failed to retrieve error details, status: ${shopifyResponse.status}`);
      }
      const errorMessage = `Failed to export product "${product.basicInfo.name.en || product.basicInfo.sku}": ${errorDetail}`;
      console.error(errorMessage.substring(0,1000)); // Log a truncated version to avoid flooding logs
      errors.push(errorMessage);
      continue; // Move to the next product
    }

    exportedCount++;
  }

  if (errors.length > 0) {
    const fullMessage = `${exportedCount} products exported. ${errors.length} products failed.`;
    // Use 207 Multi-Status if some succeeded and some failed
    // Use 500 if all failed due to backend/Shopify issues
    const status = exportedCount === 0 && errors.length === productsToExport.length ? 500 : 207;
    return NextResponse.json({
      message: fullMessage,
      errors, // Send back the list of errors
    }, { status });
  }

  return NextResponse.json({ message: `${exportedCount} products exported successfully to Shopify.` });
}
    