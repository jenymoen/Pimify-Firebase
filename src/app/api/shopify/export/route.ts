
import { type NextRequest, NextResponse } from 'next/server';
import type { Product, ProductStatus as PimStatus, MediaEntry, PriceEntry, ProductOption as PimProductOption, ProductVariant as PimProductVariant } from '@/types/product';
import { WorkflowState } from '@/types/workflow';

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
  // inventory_quantity?: number; // Requires inventory management setup
  // image_id?: number; // For associating variant with a specific image (more complex to map by URL directly)
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

function mapPimStatusToShopify(pimStatus: PimStatus, workflowState?: WorkflowState): ShopifyProductPayload['status'] {
  // Workflow state takes precedence over product status for Shopify export
  if (workflowState) {
    switch (workflowState) {
      case 'PUBLISHED':
        return 'active';
      case 'APPROVED':
        return 'active';
      case 'DRAFT':
      case 'REVIEW':
      case 'REJECTED':
        return 'draft';
      default:
        return 'draft';
    }
  }

  // Fallback to original product status mapping
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
    status: mapPimStatusToShopify(product.basicInfo.status, product.workflowState),
    tags: product.marketingSEO.keywords?.join(', ') || undefined,
  };

  if (product.media.images && product.media.images.length > 0) {
    shopifyPayload.images = product.media.images
      .filter(img => img.type === 'image' && img.url && (img.url.startsWith('http') || img.url.startsWith('/'))) // Ensure valid URL
      .map(img => ({
        src: img.url!, // Assert non-null as it's filtered
        alt: img.altText?.en || product.basicInfo.name.en || '',
      }));
  }

  // Handle variants
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
         // Fallback to main product pricing if variant price is missing - or set a default
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
      // This assumes product.options (PIM) order matches shopifyPayload.options order
      product.options?.forEach((opt, index) => {
        if (index < 3) { // Shopify supports up to 3 options
          (variantPayload as any)[`option${index + 1}`] = v.optionValues[opt.name] || null;
        }
      });
      return variantPayload;
    });
  } else {
    // Single variant logic (fallback or product without options)
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
  try {
    const { storeUrl, apiKey, productsToExport, workflowStates } = await request.json();

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

    // Filter products by workflow state if specified
    let filteredProducts = productsToExport as Product[];
    if (workflowStates && Array.isArray(workflowStates) && workflowStates.length > 0) {
      filteredProducts = filteredProducts.filter(product => 
        workflowStates.includes(product.workflowState)
      );
    }

    for (const product of filteredProducts) {
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
            errorDetail = await shopifyResponse.text().catch(() => `Failed to retrieve error details for product, status: ${shopifyResponse.status}`);
        }
        const errorMessage = `Failed to export product "${product.basicInfo.name.en || product.basicInfo.sku}": ${errorDetail}`;
        console.error(errorMessage.substring(0,1000)); // Log a snippet
        errors.push(errorMessage);
        continue; // Continue with the next product
      }
      
      exportedCount++;
    }

    if (errors.length > 0) {
      const fullMessage = `${exportedCount} products exported. ${errors.length} products failed.`;
      // If all failed, return 500, otherwise 207 (Multi-Status)
      const status = errors.length === filteredProducts.length ? 500 : 207; 
      return NextResponse.json({ 
        message: fullMessage,
        errors, // Send back the detailed errors
      }, { status }); 
    }

    return NextResponse.json({ message: `${exportedCount} products exported successfully to Shopify.` });

  } catch (error: any) {
    console.error('Shopify Export API Error:', error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred during Shopify export.' }, { status: 500 });
  }
}

