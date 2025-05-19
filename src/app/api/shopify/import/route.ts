
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import type { Product, ProductStatus as PimStatus, MediaEntry, KeyValueEntry, PriceEntry, ProductOption as PimProductOption, ProductVariant as PimProductVariant, MultilingualString } from '@/types/product';
import { initialProductData, defaultMultilingualString } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';
import { dbAdmin } from '@/lib/firebase-admin';

const SHOPIFY_CONFIG_DOC_ID = 'configuration';

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
      return null;
    }
    const configData = doc.data() as { storeUrl: string; apiKey: string };
    if (!configData.storeUrl || !configData.apiKey) {
        console.log(`Shopify config incomplete in Firestore for tenant ${tenantId} in import route.`);
        return null;
    }
    return configData;
  } catch (error: any) {
    console.error(`Error fetching Shopify config from Firestore for tenant ${tenantId} in import route:`, error);
    return null;
  }
}

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
  barcode: string | null;
  inventory_quantity: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
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
      return 'inactive';
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
  const pimId = String(shopifyProduct.id); // Using Shopify ID as PIM ID is risky if SKUs are primary keys in PIM
                                          // It's better to use Shopify's SKU if available, or generate a new PIM ID.
                                          // For this iteration, we'll use SKU from first variant or a fallback based on Shopify ID.
  const firstVariant = shopifyProduct.variants?.[0];
  const productSkuForPim = firstVariant?.sku || `SHOPIFY-ID-${shopifyProduct.id}`;


  const longDescriptionEn = shopifyProduct.body_html || '';
  const shortDescriptionEn = stripHtml(longDescriptionEn).substring(0, 200) + (stripHtml(longDescriptionEn).length > 200 ? '...' : '');

  const baseStandardPrice: PriceEntry[] = [];
  const baseSalePrice: PriceEntry[] = [];

  if (firstVariant && (!shopifyProduct.options || shopifyProduct.options.length === 0)) {
    const currentPrice = parseFloat(firstVariant.price);
    const originalPrice = firstVariant.compare_at_price ? parseFloat(firstVariant.compare_at_price) : null;

    if (originalPrice && originalPrice > currentPrice) {
      baseStandardPrice.push({
        id: uuidv4(),
        amount: originalPrice,
        currency: storeCurrency,
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
    id: String(opt.id) || uuidv4(),
    name: opt.name,
    values: opt.values,
  })) : [];

  const pimVariants: PimProductVariant[] = [];
  if (shopifyProduct.variants && shopifyProduct.options && shopifyProduct.options.length > 0) {
    shopifyProduct.variants.forEach(sv => {
      const optionValues: Record<string, string> = {};
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
        id: String(sv.id) || uuidv4(),
        sku: sv.sku || `SHOPIFY-VAR-${sv.id}`,
        gtin: sv.barcode || undefined,
        optionValues,
        standardPrice: variantStandardPrice,
        salePrice: variantSalePrice.length > 0 ? variantSalePrice : [],
        costPrice: [],
      });
    });
  }


  return {
    ...initialProductData,
    id: productSkuForPim, // Use the determined SKU as the PIM ID
    basicInfo: {
      name: { ...defaultMultilingualString, en: shopifyProduct.title },
      sku: productSkuForPim,
      gtin: firstVariant?.barcode || undefined,
      descriptionShort: { ...defaultMultilingualString, en: shortDescriptionEn },
      descriptionLong: { ...defaultMultilingualString, en: longDescriptionEn },
      brand: shopifyProduct.vendor || 'Unknown Brand',
      status: mapShopifyStatusToPim(shopifyProduct.status),
      launchDate: shopifyProduct.published_at || shopifyProduct.created_at || undefined,
      endDate: undefined,
      internalId: String(shopifyProduct.id),
    },
    attributesAndSpecs: {
      ...initialProductData.attributesAndSpecs,
      categories: shopifyProduct.product_type ? [shopifyProduct.product_type] : [],
    },
    media: {
      ...initialProductData.media,
      images: shopifyProduct.images.map((img): MediaEntry => ({
        id: String(img.id) || uuidv4(),
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
    pricingAndStock: (pimVariants.length > 0) ?
      initialProductData.pricingAndStock :
      {
        standardPrice: baseStandardPrice,
        salePrice: baseSalePrice.length > 0 ? baseSalePrice : [],
        costPrice: [],
      },
    options: pimOptions,
    variants: pimVariants,
    aiSummary: { ...defaultMultilingualString },
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

  let shopifyApiUrl = `https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/products.json?limit=50`; // Fetching 50 to test pagination
  if (pageInfo) {
    shopifyApiUrl += `&page_info=${pageInfo}`;
  }
  console.log(`[Tenant: ${tenantId}] Shopify Import: Fetching products from ${shopifyApiUrl}`);

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
      console.error(`[Tenant: ${tenantId}] Shopify API Error (Import):`, errorDetail.substring(0, 500));
      return NextResponse.json({ error: errorDetail }, { status: shopifyResponse.status });
    }

    const contentType = shopifyResponse.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await shopifyResponse.text();
        console.error(`[Tenant: ${tenantId}] Shopify API Error (Import): Expected JSON for successful response, got different content type.`, textResponse.substring(0, 500));
        return NextResponse.json({ error: 'Invalid success response format from Shopify. Expected JSON.', details: textResponse.substring(0,500) }, { status: 502 });
    }

    const shopifyData = await shopifyResponse.json();
    console.log(`[Tenant: ${tenantId}] Shopify Import: Raw Shopify data received:`, JSON.stringify(shopifyData.products?.length, null, 2), "products.");


    if (!shopifyData.products || !Array.isArray(shopifyData.products)) {
        console.error(`[Tenant: ${tenantId}] Shopify API Error (Import): "products" array not found or not an array in response. Received:`, shopifyData);
        return NextResponse.json({ error: 'Invalid product data received from Shopify (missing or malformed products array).' }, { status: 500 });
    }
    console.log(`[Tenant: ${tenantId}] Shopify Import: Received ${shopifyData.products.length} products from Shopify.`);


    let storeCurrency = "USD";
    try {
        const shopifyStoreInfoResponse = await fetch(`https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/shop.json`, {
            method: 'GET',
            headers: { 'X-Shopify-Access-Token': apiKey, 'Content-Type': 'application/json' },
        });
        if(shopifyStoreInfoResponse.ok) {
            const shopData = await shopifyStoreInfoResponse.json();
            storeCurrency = shopData.shop?.currency || "USD";
            console.log(`[Tenant: ${tenantId}] Shopify Import: Fetched store currency: ${storeCurrency}`);
        } else {
             console.warn(`[Tenant: ${tenantId}] Shopify Import: Could not fetch Shopify store currency, defaulting to USD. Status: ${shopifyStoreInfoResponse.status}`);
        }
    } catch (currencyError) {
        console.warn(`[Tenant: ${tenantId}] Shopify Import: Error fetching Shopify store currency, defaulting to USD:`, currencyError);
    }


    const importedPimProducts: Product[] = [];
    const saveErrors: any[] = [];
    let productsSavedCount = 0;

    for (const shopifyProd of shopifyData.products as ShopifyProductShopify[]) {
        console.log(`[Tenant: ${tenantId}] Shopify Import: Processing Shopify product ID ${shopifyProd.id} - Title: ${shopifyProd.title}`);
        const pimProduct = mapShopifyToPimProduct(shopifyProd, storeCurrency);
        console.log(`[Tenant: ${tenantId}] Shopify Import: Mapped PIM product for SKU ${pimProduct.basicInfo.sku}:`, JSON.stringify(pimProduct, null, 2));
        try {
          const docId = pimProduct.basicInfo.sku; // Using PIM's SKU as Firestore document ID
          const productToSave: Product = {
            ...initialProductData,
            ...pimProduct,
            id: docId, // Ensure PIM ID matches SKU
            options: pimProduct.options || [],
            variants: pimProduct.variants || [],
            aiSummary: pimProduct.aiSummary || { ...defaultMultilingualString },
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
            pricingAndStock: {
                standardPrice: pimProduct.pricingAndStock?.standardPrice || [],
                salePrice: pimProduct.pricingAndStock?.salePrice || [],
                costPrice: pimProduct.pricingAndStock?.costPrice || [],
            },
            createdAt: pimProduct.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const productRef = dbAdmin.collection('tenants').doc(tenantId).collection('products').doc(docId);
          console.log(`[Tenant: ${tenantId}] Shopify Import: Attempting to save product with ID ${docId} to Firestore.`);
          await productRef.set(productToSave, { merge: true });
          console.log(`[Tenant: ${tenantId}] Shopify Import: Product ${docId} saved/updated to Firestore.`);
          importedPimProducts.push(productToSave);
          productsSavedCount++;
        } catch (dbError: any) {
          console.error(`[Tenant: ${tenantId}] Shopify Import: Error saving imported product (Shopify ID ${shopifyProd.id}, PIM SKU ${pimProduct.basicInfo.sku}) to Firestore:`, dbError.message, dbError.stack);
          saveErrors.push({ productId: shopifyProd.id, sku: pimProduct.basicInfo.sku, error: dbError.message });
        }
    }

    const nextPageCursor = parseLinkHeader(shopifyResponse.headers.get('Link'));
    console.log(`[Tenant: ${tenantId}] Shopify Import: Next page cursor: ${nextPageCursor}`);

    let message = `${productsSavedCount} of ${shopifyData.products.length} products imported and saved for ${storeUrl}.`;
    if (saveErrors.length > 0) {
      message += ` ${saveErrors.length} products failed to save. Check server logs for details.`;
    }
    if (nextPageCursor) {
      message += ' More products available.';
    } else {
      message += ' All available products from this page imported.';
    }
    
    console.log(`[Tenant: ${tenantId}] Shopify Import: Final message: ${message}`);

    return NextResponse.json({
      products: importedPimProducts, // Return the products that were successfully processed and saved
      message,
      nextPageCursor,
      errors: saveErrors.length > 0 ? saveErrors : undefined,
    });

  } catch (error: any) {
    console.error(`[Tenant: ${tenantId}] Shopify Import API Error (Outer Catch):`, error.message, error.stack);
    return NextResponse.json({ error: error.message || 'An internal server error occurred during Shopify import.' }, { status: 500 });
  }
}

