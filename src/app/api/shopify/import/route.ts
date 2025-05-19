
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import type { Product, ProductStatus as PimStatus, MediaEntry, KeyValueEntry, PriceEntry, ProductOption as PimProductOption, ProductVariant as PimProductVariant, MultilingualString } from '@/types/product';
import { initialProductData, defaultMultilingualString } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';
import { dbAdmin } from '@/lib/firebase-admin'; // Corrected import path

const SHOPIFY_CONFIG_DOC_ID = 'configuration'; // Consistent with config route

async function getShopifyConfigForTenant(tenantId: string): Promise<{ storeUrl: string; apiKey: string } | null> {
  if (!tenantId) {
    console.error('getShopifyConfigForTenant called without tenantId in import route');
    return null;
  }
  try {
    const configRef = dbAdmin.collection('tenants').doc(tenantId).collection('shopifyConfigs').doc(SHOPIFY_CONFIG_DOC_ID);
    const doc = await configRef.get();

    if (!doc.exists) {
      console.log(`Shopify config not found in Firestore for tenant ${tenantId} in import route.`);
      return null; // Config not found
    }
    const configData = doc.data() as { storeUrl: string; apiKey: string };
    if (!configData.storeUrl || !configData.apiKey) {
        console.log(`Shopify config incomplete in Firestore for tenant ${tenantId} in import route.`);
        return null; // Config incomplete
    }
    return configData;
  } catch (error: any) {
    console.error(`Error fetching Shopify config from Firestore for tenant ${tenantId} in import route:`, error);
    return null;
  }
}

// Shopify API types (simplified)
interface ShopifyImageShopify {
  id: number;
  product_id: number;
  src: string;
  alt: string | null;
  width: number;
  height: number;
}

interface ShopifyOptionShopify {
  id: number;
  product_id: number;
  name: string;
  position: number;
  values: string[];
}

interface ShopifyVariantShopify {
  id: number;
  product_id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  sku: string | null;
  barcode: string | null; // GTIN
  inventory_quantity: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  // image_id?: number; // Link to specific image
}

interface ShopifyProductShopify {
  id: number;
  title: string;
  body_html: string | null;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  status: 'active' | 'archived' | 'draft';
  tags: string;
  options: ShopifyOptionShopify[];
  variants: ShopifyVariantShopify[];
  images: ShopifyImageShopify[];
}

function mapShopifyStatusToPim(shopifyStatus: ShopifyProductShopify['status']): PimStatus {
  switch (shopifyStatus) {
    case 'active':
      return 'active';
    case 'archived':
      return 'inactive'; // Or 'discontinued' based on preference
    case 'draft':
      return 'development';
    default:
      return 'development';
  }
}

function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
}


function mapShopifyToPimProduct(shopifyProduct: ShopifyProductShopify, storeCurrency: string = "NOK"): Product {
  const pimId = String(shopifyProduct.id);
  const firstVariant = shopifyProduct.variants?.[0];

  const longDescriptionEn = shopifyProduct.body_html || '';
  const shortDescriptionEn = stripHtml(longDescriptionEn).substring(0, 200) + (stripHtml(longDescriptionEn).length > 200 ? '...' : '');

  const baseStandardPrice: PriceEntry[] = [];
  const baseSalePrice: PriceEntry[] = [];

  // This pricing logic is for products WITHOUT Shopify options.
  // If a product has options, variant pricing should be used.
  if (firstVariant && (!shopifyProduct.options || shopifyProduct.options.length === 0)) {
    const currentPrice = parseFloat(firstVariant.price);
    const originalPrice = firstVariant.compare_at_price ? parseFloat(firstVariant.compare_at_price) : null;

    if (originalPrice && originalPrice > currentPrice) {
      baseStandardPrice.push({
        id: uuidv4(),
        amount: originalPrice,
        currency: storeCurrency, // Assuming Shopify variant price is in store's default currency
      });
      baseSalePrice.push({
        id: uuidv4(),
        amount: currentPrice,
        currency: storeCurrency,
      });
    } else {
      baseStandardPrice.push({
        id: uuidv4(),
        amount: currentPrice,
        currency: storeCurrency,
      });
    }
  }


  const pimOptions: PimProductOption[] = shopifyProduct.options ? shopifyProduct.options.map(opt => ({
    id: String(opt.id) || uuidv4(), // Use Shopify option ID or generate one
    name: opt.name,
    values: opt.values,
  })) : [];

  const pimVariants: PimProductVariant[] = [];
  if (shopifyProduct.variants && shopifyProduct.options && shopifyProduct.options.length > 0) {
    shopifyProduct.variants.forEach(sv => {
      const optionValues: Record<string, string> = {};
      // Map Shopify's option1, option2, option3 to PIM's optionValues using names from shopifyProduct.options
      if (shopifyProduct.options[0] && sv.option1) optionValues[shopifyProduct.options[0].name] = sv.option1;
      if (shopifyProduct.options[1] && sv.option2) optionValues[shopifyProduct.options[1].name] = sv.option2;
      if (shopifyProduct.options[2] && sv.option3) optionValues[shopifyProduct.options[2].name] = sv.option3;

      const variantStandardPrice: PriceEntry[] = [];
      const variantSalePrice: PriceEntry[] = [];

      const varCurrentPrice = parseFloat(sv.price);
      const varOriginalPrice = sv.compare_at_price ? parseFloat(sv.compare_at_price) : null;

      if (varOriginalPrice && varOriginalPrice > varCurrentPrice) {
        variantStandardPrice.push({ id: uuidv4(), amount: varOriginalPrice, currency: storeCurrency });
        variantSalePrice.push({ id: uuidv4(), amount: varCurrentPrice, currency: storeCurrency });
      } else {
        variantStandardPrice.push({ id: uuidv4(), amount: varCurrentPrice, currency: storeCurrency });
      }

      pimVariants.push({
        id: String(sv.id) || uuidv4(), // Use Shopify variant ID or generate one
        sku: sv.sku || `SHOPIFY-VAR-${sv.id}`,
        gtin: sv.barcode || undefined,
        optionValues,
        standardPrice: variantStandardPrice,
        salePrice: variantSalePrice.length > 0 ? variantSalePrice : [],
        costPrice: [], // Cost price not typically available directly on Shopify variant, needs other source
      });
    });
  }


  return {
    ...initialProductData, // Start with defaults to ensure all fields are present
    id: pimId,              // Use Shopify ID as PIM ID for easier matching
    basicInfo: {
      name: { ...defaultMultilingualString, en: shopifyProduct.title },
      sku: firstVariant?.sku || `SKU-SHOPIFY-${shopifyProduct.id}`, // Fallback SKU
      gtin: firstVariant?.barcode || undefined, // GTIN from first variant
      descriptionShort: { ...defaultMultilingualString, en: shortDescriptionEn },
      descriptionLong: { ...defaultMultilingualString, en: longDescriptionEn },
      brand: shopifyProduct.vendor || 'Unknown Brand',
      status: mapShopifyStatusToPim(shopifyProduct.status),
      launchDate: shopifyProduct.published_at || shopifyProduct.created_at || undefined,
      endDate: undefined, // Shopify doesn't have a direct 'end date'
      internalId: String(shopifyProduct.id), // Store original Shopify ID
    },
    attributesAndSpecs: {
      ...initialProductData.attributesAndSpecs,
      categories: shopifyProduct.product_type ? [shopifyProduct.product_type] : [],
    },
    media: {
      ...initialProductData.media, // Ensure all media arrays are initialized
      images: shopifyProduct.images.map((img): MediaEntry => ({
        id: String(img.id) || uuidv4(), // Use Shopify image ID or generate one
        url: img.src,
        altText: { ...defaultMultilingualString, en: img.alt || shopifyProduct.title },
        type: 'image',
        dataAiHint: 'product image'
      })),
    },
    marketingSEO: {
      ...initialProductData.marketingSEO,
      seoTitle: { ...defaultMultilingualString, en: shopifyProduct.title },
      seoDescription: { ...defaultMultilingualString, en: shortDescriptionEn },
      keywords: shopifyProduct.tags ? shopifyProduct.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
    },
    pricingAndStock: (pimVariants.length > 0) ? // If variants exist, base pricing might be less relevant or empty
      initialProductData.pricingAndStock : // Or specifically derive from first variant if appropriate
      { // For products without variants from Shopify options
        standardPrice: baseStandardPrice,
        salePrice: baseSalePrice.length > 0 ? baseSalePrice : [],
        costPrice: [], // Cost price needs other source
      },
    options: pimOptions,
    variants: pimVariants,
    aiSummary: { ...defaultMultilingualString }, // AI summary to be generated later
    createdAt: shopifyProduct.created_at || new Date().toISOString(),
    updatedAt: shopifyProduct.updated_at || new Date().toISOString(),
  };
}

function parseLinkHeader(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const links = linkHeader.split(',');
  const nextLink = links.find(link => link.includes('rel="next"'));
  if (nextLink) {
    const match = nextLink.match(/<([^>]+)>/);
    if (match && match[1]) {
      try {
        const url = new URL(match[1]);
        return url.searchParams.get('page_info');
      } catch (e) {
        console.error("Error parsing next link URL for page_info:", e);
        return null;
      }
    }
  }
  return null;
}


export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is missing from request headers.' }, { status: 400 });
  }

  let pageInfo: string | null = null;
  try {
      const body = await request.json();
      pageInfo = body.pageInfo || null;
  } catch (e) {
      // No body or invalid JSON, proceed without pageInfo
  }

  const shopifyConfig = await getShopifyConfigForTenant(tenantId);

  if (!shopifyConfig || !shopifyConfig.storeUrl || !shopifyConfig.apiKey) {
    return NextResponse.json({ error: 'Shopify configuration is missing or incomplete for this tenant.' }, { status: 400 });
  }
  const { storeUrl, apiKey } = shopifyConfig;

  let shopifyApiUrl = `https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/products.json?limit=50`;
  if (pageInfo) {
    shopifyApiUrl += `&page_info=${pageInfo}`;
  }

  try {
    const shopifyResponse = await fetch(shopifyApiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': apiKey,
        'Content-Type': 'application/json',
      },
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
        errorDetail = await shopifyResponse.text().catch(() => `Failed to get error details, status: ${shopifyResponse.status}`);
      }
      console.error('Shopify API Error (Import):', errorDetail.substring(0, 500));
      return NextResponse.json({ error: errorDetail }, { status: shopifyResponse.status });
    }

    const contentType = shopifyResponse.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await shopifyResponse.text();
        console.error('Shopify API Error (Import): Expected JSON for successful response, got different content type.', textResponse.substring(0, 500));
        return NextResponse.json({ error: 'Invalid success response format from Shopify. Expected JSON.', details: textResponse.substring(0,500) }, { status: 502 });
    }

    const shopifyData = await shopifyResponse.json();

    if (!shopifyData.products || !Array.isArray(shopifyData.products)) {
        console.error('Shopify API Error (Import): "products" array not found in response.', shopifyData);
        return NextResponse.json({ error: 'Invalid product data received from Shopify (missing products array).' }, { status: 500 });
    }

    let storeCurrency = "USD"; // Default currency
    try {
        const shopifyStoreInfoResponse = await fetch(`https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/shop.json`, {
            method: 'GET',
            headers: { 'X-Shopify-Access-Token': apiKey, 'Content-Type': 'application/json' },
        });
        if(shopifyStoreInfoResponse.ok) {
            const shopData = await shopifyStoreInfoResponse.json();
            storeCurrency = shopData.shop?.currency || "USD";
        } else {
             console.warn(`Could not fetch Shopify store currency, defaulting to USD. Status: ${shopifyStoreInfoResponse.status}`);
        }
    } catch (currencyError) {
        console.warn("Error fetching Shopify store currency, defaulting to USD:", currencyError);
    }


    const importedPimProducts: Product[] = [];
    for (const shopifyProd of shopifyData.products as ShopifyProductShopify[]) {
        const pimProduct = mapShopifyToPimProduct(shopifyProd, storeCurrency);
        try {
          const docId = pimProduct.basicInfo.sku || pimProduct.id; // Using SKU as primary ID, fallback to Shopify ID
          const productToSave: Product = {
            ...initialProductData, // Ensure all fields exist
            ...pimProduct,         // Spread imported data
            id: docId,              // Override ID
            options: pimProduct.options || [], // Ensure arrays exist
            variants: pimProduct.variants || [],
            aiSummary: pimProduct.aiSummary || { ...defaultMultilingualString },
            // Ensure basicInfo and its nested multilingual strings are fully formed
            basicInfo: {
                ...initialProductData.basicInfo,
                ...pimProduct.basicInfo,
                name: { ...defaultMultilingualString, ...pimProduct.basicInfo.name },
                descriptionShort: { ...defaultMultilingualString, ...pimProduct.basicInfo.descriptionShort },
                descriptionLong: { ...defaultMultilingualString, ...pimProduct.basicInfo.descriptionLong },
            },
            marketingSEO: {
                ...initialProductData.marketingSEO,
                ...pimProduct.marketingSEO,
                seoTitle: { ...defaultMultilingualString, ...pimProduct.marketingSEO.seoTitle },
                seoDescription: { ...defaultMultilingualString, ...pimProduct.marketingSEO.seoDescription },
            },
            media: {
                ...initialProductData.media,
                ...pimProduct.media,
                images: (pimProduct.media.images || []).map(img => ({
                    ...img,
                    altText: { ...defaultMultilingualString, ...(img.altText || {}) }
                })),
            },
            // Ensure pricingAndStock and its nested price arrays are handled
            pricingAndStock: {
                standardPrice: pimProduct.pricingAndStock?.standardPrice || [],
                salePrice: pimProduct.pricingAndStock?.salePrice || [],
                costPrice: pimProduct.pricingAndStock?.costPrice || [],
            },
            createdAt: pimProduct.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(), // Always set updatedAt on import/update
          };

          const productRef = dbAdmin.collection('tenants').doc(tenantId).collection('products').doc(docId);
          await productRef.set(productToSave, { merge: true }); // Use merge:true to update if exists, create if not
          console.log(`Product ${docId} saved/updated via Shopify import for tenant ${tenantId}`);
          importedPimProducts.push(productToSave);
        } catch (dbError: any) {
          console.error(`Error saving imported product ${pimProduct.id} to Firestore for tenant ${tenantId}:`, dbError.message, dbError.stack);
          // Optionally skip this product or collect errors
        }
    }

    const nextPageCursor = parseLinkHeader(shopifyResponse.headers.get('Link'));

    return NextResponse.json({
      products: importedPimProducts,
      message: `${importedPimProducts.length} products imported and processed for ${storeUrl}. ${nextPageCursor ? 'More products available.' : 'All products imported.'}`,
      nextPageCursor
    });

  } catch (error: any) {
    console.error('Shopify Import API Error:', error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred during Shopify import.' }, { status: 500 });
  }
}

    