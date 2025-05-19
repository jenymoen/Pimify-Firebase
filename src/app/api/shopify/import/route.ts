
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import type { Product, ProductStatus as PimStatus, MediaEntry, KeyValueEntry, PriceEntry, ProductOption as PimProductOption, ProductVariant as PimProductVariant, MultilingualString } from '@/types/product';
import { initialProductData, defaultMultilingualString } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';
import { dbAdmin } from '@/lib/firebase-admin'; // Import dbAdmin

const SHOPIFY_CONFIG_DOC_ID = 'configuration'; // Consistent with config route

async function getShopifyConfigForTenant(tenantId: string): Promise<{ storeUrl: string; apiKey: string } | null> {
  if (!tenantId) {
    console.error('[Shopify Import] getShopifyConfigForTenant called without tenantId');
    return null;
  }
  try {
    const configRef = dbAdmin.collection('tenants').doc(tenantId).collection('shopifyConfigs').doc(SHOPIFY_CONFIG_DOC_ID);
    const doc = await configRef.get();

    if (!doc.exists) {
      console.log(`[Shopify Import] Shopify config not found in Firestore for tenant ${tenantId}.`);
      return null; // Config not found
    }
    const configData = doc.data() as { storeUrl: string; apiKey: string };
     if (!configData.storeUrl || !configData.apiKey) {
        console.log(`[Shopify Import] Shopify config incomplete in Firestore for tenant ${tenantId}.`);
        return null; // Config incomplete
    }
    return configData;
  } catch (error: any) {
    console.error(`[Shopify Import] Error fetching Shopify config from Firestore for tenant ${tenantId}:`, error);
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
  barcode: string | null; // GTIN
  inventory_quantity?: number; // Optional
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
      return 'inactive'; // Or 'discontinued'
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


function mapShopifyToPimProduct(shopifyProduct: ShopifyProductShopify, storeCurrency: string = "NOK"): Partial<Product> {
  const firstVariant = shopifyProduct.variants?.[0];
  // Use Shopify variant SKU if available, otherwise product ID from Shopify.
  // PIM ID will be this SKU.
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
        validFrom: null,
        validTo: null,
      });
      baseSalePrice.push({
        id: uuidv4(),
        amount: currentPrice,
        currency: storeCurrency,
        validFrom: null,
        validTo: null,
      });
    } else {
      baseStandardPrice.push({
        id: uuidv4(),
        amount: currentPrice,
        currency: storeCurrency,
        validFrom: null,
        validTo: null,
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
        variantStandardPrice.push({ id: uuidv4(), amount: varOriginalPrice, currency: storeCurrency, validFrom: null, validTo: null });
        variantSalePrice.push({ id: uuidv4(), amount: varCurrentPrice, currency: storeCurrency, validFrom: null, validTo: null });
      } else {
        variantStandardPrice.push({ id: uuidv4(), amount: varCurrentPrice, currency: storeCurrency, validFrom: null, validTo: null });
      }

      pimVariants.push({
        id: String(sv.id) || uuidv4(),
        sku: sv.sku || `SHOPIFY-VAR-${sv.id}`, // Fallback SKU for variant
        gtin: sv.barcode || undefined,
        optionValues,
        standardPrice: variantStandardPrice,
        salePrice: variantSalePrice.length > 0 ? variantSalePrice : [],
        costPrice: [], // Cost price not typically available directly from Shopify product/variant data
      });
    });
  }

  const pimProductPartial: Partial<Product> = {
    // id will be set to productSkuForPim later
    basicInfo: {
      name: { ...defaultMultilingualString, en: shopifyProduct.title },
      sku: productSkuForPim,
      gtin: firstVariant?.barcode || null,
      descriptionShort: { ...defaultMultilingualString, en: shortDescriptionEn },
      descriptionLong: { ...defaultMultilingualString, en: longDescriptionEn },
      brand: shopifyProduct.vendor || 'Unknown Brand',
      status: mapShopifyStatusToPim(shopifyProduct.status),
      launchDate: shopifyProduct.published_at || shopifyProduct.created_at || null, // Ensure it's null if undefined
      endDate: null, // Not typically available from Shopify
      internalId: String(shopifyProduct.id),
    },
    attributesAndSpecs: {
      categories: shopifyProduct.product_type ? [shopifyProduct.product_type] : [],
      properties: [], // Example: map from tags or metafields if needed
      technicalSpecs: [], // Example: map from tags or metafields if needed
      maintenanceInstructions: null,
      warrantyInfo: null,
      countryOfOrigin: null, // Not typically available
    },
    media: {
      images: shopifyProduct.images.map((img): MediaEntry => ({
        id: String(img.id) || uuidv4(),
        url: img.src,
        altText: { ...defaultMultilingualString, en: img.alt || shopifyProduct.title },
        type: 'image',
        dataAiHint: 'product image' // Default hint
      })),
      videos: [],
      models3d: [],
      manuals: [],
      certificates: [],
    },
    marketingSEO: {
      seoTitle: { ...defaultMultilingualString, en: shopifyProduct.title },
      seoDescription: { ...defaultMultilingualString, en: shortDescriptionEn },
      keywords: shopifyProduct.tags ? shopifyProduct.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      marketingTexts: null,
      campaignCodes: null,
    },
    pricingAndStock: (pimVariants.length > 0 || pimOptions.length > 0) ? // If options are defined, assume variant pricing dominates
      initialProductData.pricingAndStock : // Rely on variant pricing, base pricing can be empty
      {
        standardPrice: baseStandardPrice,
        salePrice: baseSalePrice.length > 0 ? baseSalePrice : [],
        costPrice: [], // Cost price not mapped
      },
    options: pimOptions,
    variants: pimVariants,
    relations: initialProductData.relations,
    localizationNorway: initialProductData.localizationNorway,
    aiSummary: { ...defaultMultilingualString }, // AI summary to be generated later
    createdAt: shopifyProduct.created_at || new Date().toISOString(),
    // updatedAt will be set when saving
  };
  return pimProductPartial;
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
        console.error("[Shopify Import] Error parsing next link URL for page_info:", e);
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
      // No body or invalid JSON, proceed without pageInfo (first page)
  }

  const shopifyConfig = await getShopifyConfigForTenant(tenantId);

  if (!shopifyConfig || !shopifyConfig.storeUrl || !shopifyConfig.apiKey) {
    console.error(`[Shopify Import] Tenant ${tenantId}: Shopify configuration is missing or incomplete.`);
    return NextResponse.json({ error: 'Shopify configuration is missing or incomplete for this tenant.' }, { status: 400 });
  }
  const { storeUrl, apiKey } = shopifyConfig;

  // Construct Shopify API URL
  let shopifyApiUrl = `https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/products.json?limit=50`; // Fetching 50
  if (pageInfo) {
    shopifyApiUrl += `&page_info=${pageInfo}`;
  }
  console.log(`[Shopify Import] Tenant ${tenantId}: Fetching products from ${shopifyApiUrl.split('?')[0]}... (Page info: ${pageInfo || 'first page'})`);

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
      console.error(`[Shopify Import] Tenant ${tenantId}: Shopify API Error:`, errorDetail.substring(0, 500));
      return NextResponse.json({ error: errorDetail }, { status: shopifyResponse.status });
    }
    
    const contentType = shopifyResponse.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await shopifyResponse.text();
        console.error(`[Shopify Import] Tenant ${tenantId}: Shopify API Error: Expected JSON for successful response, got different content type. Response:`, textResponse.substring(0, 500));
        return NextResponse.json({ error: 'Invalid success response format from Shopify. Expected JSON.', details: textResponse.substring(0,500) }, { status: 502 });
    }

    const shopifyData = await shopifyResponse.json();

    if (!shopifyData.products || !Array.isArray(shopifyData.products)) {
        console.error(`[Shopify Import] Tenant ${tenantId}: Shopify API Error: "products" array not found or not an array in response. Received:`, shopifyData);
        return NextResponse.json({ error: 'Invalid product data received from Shopify (missing or malformed products array).' }, { status: 500 });
    }
    console.log(`[Shopify Import] Tenant ${tenantId}: Received ${shopifyData.products.length} products from Shopify.`);


    let storeCurrency = "USD"; // Default currency
    try {
        const shopifyStoreInfoUrl = `https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/shop.json`;
        const shopifyStoreInfoResponse = await fetch(shopifyStoreInfoUrl, {
            method: 'GET',
            headers: { 'X-Shopify-Access-Token': apiKey, 'Content-Type': 'application/json' },
        });
        if(shopifyStoreInfoResponse.ok) {
            const shopData = await shopifyStoreInfoResponse.json();
            storeCurrency = shopData.shop?.currency || "USD"; // Use fetched currency or default
            console.log(`[Shopify Import] Tenant ${tenantId}: Fetched store currency: ${storeCurrency}`);
        } else {
             console.warn(`[Shopify Import] Tenant ${tenantId}: Could not fetch Shopify store currency, defaulting to USD. Status: ${shopifyStoreInfoResponse.status}`);
        }
    } catch (currencyError) {
        console.warn(`[Shopify Import] Tenant ${tenantId}: Error fetching Shopify store currency, defaulting to USD:`, currencyError);
    }


    const importedPimProducts: Product[] = [];
    const saveErrors: any[] = [];
    let productsSavedCount = 0;

    for (const shopifyProd of shopifyData.products as ShopifyProductShopify[]) {
        console.log(`[Shopify Import] Tenant ${tenantId}: Processing Shopify product ID ${shopifyProd.id} - Title: ${shopifyProd.title}`);
        const pimProductPartial = mapShopifyToPimProduct(shopifyProd, storeCurrency);
        
        // Use SKU from basicInfo as Firestore document ID
        const docId = pimProductPartial.basicInfo!.sku!; 
        if (!docId) {
            console.error(`[Shopify Import] Tenant ${tenantId}: Skipping product due to missing SKU after mapping. Shopify ID: ${shopifyProd.id}`);
            saveErrors.push({ productId: shopifyProd.id, sku: 'N/A - SKU missing', error: 'SKU missing after mapping, cannot save.' });
            continue;
        }

        // Construct the full Product object for Firestore, ensuring all defaults
        const productToSave: Product = {
            ...initialProductData, // Base defaults
            ...pimProductPartial,   // Mapped data from Shopify
            id: docId,              // Override ID with SKU
            basicInfo: {
              ...initialProductData.basicInfo,
              ...(pimProductPartial.basicInfo || {}), // Spread Shopify mapped basicInfo
              name: { ...defaultMultilingualString, ...(pimProductPartial.basicInfo?.name || {}) },
              descriptionShort: { ...defaultMultilingualString, ...(pimProductPartial.basicInfo?.descriptionShort || {}) },
              descriptionLong: { ...defaultMultilingualString, ...(pimProductPartial.basicInfo?.descriptionLong || {}) },
              sku: docId, // Ensure SKU is the docId
            },
            attributesAndSpecs: {
              ...initialProductData.attributesAndSpecs,
              ...(pimProductPartial.attributesAndSpecs || {}),
               categories: pimProductPartial.attributesAndSpecs?.categories || [],
               properties: pimProductPartial.attributesAndSpecs?.properties || [],
               technicalSpecs: pimProductPartial.attributesAndSpecs?.technicalSpecs || [],
            },
            media: {
              ...initialProductData.media,
              ...(pimProductPartial.media || {}),
              images: (pimProductPartial.media?.images || []).map(img => ({
                  ...img, // Spread the mapped image entry
                  altText: { ...defaultMultilingualString, ...(img.altText || {}) } // Ensure altText structure
              })),
              videos: pimProductPartial.media?.videos || [],
              models3d: pimProductPartial.media?.models3d || [],
              manuals: pimProductPartial.media?.manuals || [],
              certificates: pimProductPartial.media?.certificates || [],
            },
            marketingSEO: {
              ...initialProductData.marketingSEO,
              ...(pimProductPartial.marketingSEO || {}),
              seoTitle: { ...defaultMultilingualString, ...(pimProductPartial.marketingSEO?.seoTitle || {}) },
              seoDescription: { ...defaultMultilingualString, ...(pimProductPartial.marketingSEO?.seoDescription || {}) },
              keywords: pimProductPartial.marketingSEO?.keywords || [],
            },
            pricingAndStock: { // Ensure structure is complete
              standardPrice: pimProductPartial.pricingAndStock?.standardPrice || [],
              salePrice: pimProductPartial.pricingAndStock?.salePrice || [],
              costPrice: pimProductPartial.pricingAndStock?.costPrice || [],
            },
            options: pimProductPartial.options || [],
            variants: (pimProductPartial.variants || []).map(variant => ({
              ...variant, // Spread the mapped variant
              standardPrice: variant.standardPrice || [], // Ensure price arrays exist
              salePrice: variant.salePrice || [],
              costPrice: variant.costPrice || [],
            })),
            aiSummary: { ...defaultMultilingualString, ...(pimProductPartial.aiSummary || {}) },
            createdAt: pimProductPartial.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(), // Always set/update updatedAt
        };
        
        // console.log(`[Shopify Import] Tenant ${tenantId}: Product object to save for SKU ${docId}:`, JSON.stringify(productToSave, null, 2));

        try {
          const productRef = dbAdmin.collection('tenants').doc(tenantId).collection('products').doc(docId);
          console.log(`[Shopify Import] Tenant ${tenantId}: Attempting to save product with ID ${docId} to Firestore.`);
          await productRef.set(productToSave, { merge: true }); // Use merge: true to update if exists, create if not
          console.log(`[Shopify Import] Tenant ${tenantId}: Product ${docId} saved/updated to Firestore.`);
          importedPimProducts.push(productToSave);
          productsSavedCount++;
        } catch (dbError: any) {
          console.error(`[Shopify Import] Tenant ${tenantId}: Error saving imported product (Shopify ID ${shopifyProd.id}, PIM SKU ${docId}) to Firestore:`, dbError.message, dbError.stack ? dbError.stack.substring(0,300) : '');
          saveErrors.push({ productId: shopifyProd.id, sku: docId, error: dbError.message });
        }
    }

    const nextPageCursor = parseLinkHeader(shopifyResponse.headers.get('Link'));
    console.log(`[Shopify Import] Tenant ${tenantId}: Next page cursor: ${nextPageCursor}`);

    let message = `${productsSavedCount} of ${shopifyData.products.length} products processed from Shopify page for ${storeUrl}.`;
    if (saveErrors.length > 0) {
      message += ` ${saveErrors.length} products failed to save to PIM. Check server logs for details.`;
    }
    if (nextPageCursor) {
      message += ' More products available.';
    } else {
      message += ' All available products from this page processed.';
    }
    
    console.log(`[Shopify Import] Tenant ${tenantId}: Final message: ${message}`);

    return NextResponse.json({
      products: importedPimProducts, // Return the products that were successfully processed and saved/updated in PIM
      message,
      nextPageCursor,
      errors: saveErrors.length > 0 ? saveErrors : undefined,
    });

  } catch (error: any) {
    console.error(`[Shopify Import] Tenant ${tenantId}: API Error (Outer Catch):`, error.message, error.stack ? error.stack.substring(0,500) : '');
    return NextResponse.json({ error: error.message || 'An internal server error occurred during Shopify import.' }, { status: 500 });
  }
}
