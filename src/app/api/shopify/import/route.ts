
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
      return null;
    }
    const configData = doc.data() as { storeUrl: string; apiKey: string };
     if (!configData.storeUrl || !configData.apiKey) {
        console.log(`[Shopify Import] Shopify config incomplete in Firestore for tenant ${tenantId}.`);
        return null;
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


function mapShopifyToPimProduct(shopifyProduct: ShopifyProductShopify, storeCurrency: string = "NOK"): Partial<Product> {
  const firstVariant = shopifyProduct.variants?.[0];
  const productSkuForPim = firstVariant?.sku || `SHOPIFY-ID-${shopifyProduct.id}`;

  const longDescriptionEn = shopifyProduct.body_html || '';
  const shortDescriptionEn = stripHtml(longDescriptionEn).substring(0, 200) + (stripHtml(longDescriptionEn).length > 200 ? '...' : '');

  const baseStandardPrice: PriceEntry[] = [];
  const baseSalePrice: PriceEntry[] = [];

  if (firstVariant && (!shopifyProduct.options || shopifyProduct.options.length === 0)) {
    const currentPriceNum = parseFloat(firstVariant.price);
    const originalPriceNum = firstVariant.compare_at_price ? parseFloat(firstVariant.compare_at_price) : null;

    const currentPriceAmount = isNaN(currentPriceNum) ? 0 : currentPriceNum;
    const originalPriceAmount = (originalPriceNum !== null && !isNaN(originalPriceNum)) ? originalPriceNum : null;


    if (originalPriceAmount !== null && originalPriceAmount > currentPriceAmount) {
      baseStandardPrice.push({
        id: uuidv4(),
        amount: originalPriceAmount,
        currency: storeCurrency,
        validFrom: null,
        validTo: null,
      });
      baseSalePrice.push({
        id: uuidv4(),
        amount: currentPriceAmount,
        currency: storeCurrency,
        validFrom: null,
        validTo: null,
      });
    } else {
      baseStandardPrice.push({
        id: uuidv4(),
        amount: currentPriceAmount,
        currency: storeCurrency,
        validFrom: null,
        validTo: null,
      });
    }
  }


  const pimOptions: PimProductOption[] = shopifyProduct.options ? shopifyProduct.options.map(opt => ({
    id: String(opt.id) || uuidv4(),
    name: opt.name || '',
    values: opt.values || [],
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

      const varCurrentPriceNum = parseFloat(sv.price);
      const varOriginalPriceNum = sv.compare_at_price ? parseFloat(sv.compare_at_price) : null;

      const varCurrentPriceAmount = isNaN(varCurrentPriceNum) ? 0 : varCurrentPriceNum;
      const varOriginalPriceAmount = (varOriginalPriceNum !== null && !isNaN(varOriginalPriceNum)) ? varOriginalPriceNum : null;


      if (varOriginalPriceAmount !== null && varOriginalPriceAmount > varCurrentPriceAmount) {
        variantStandardPrice.push({ id: uuidv4(), amount: varOriginalPriceAmount, currency: storeCurrency, validFrom: null, validTo: null });
        variantSalePrice.push({ id: uuidv4(), amount: varCurrentPriceAmount, currency: storeCurrency, validFrom: null, validTo: null });
      } else {
        variantStandardPrice.push({ id: uuidv4(), amount: varCurrentPriceAmount, currency: storeCurrency, validFrom: null, validTo: null });
      }

      pimVariants.push({
        id: String(sv.id) || uuidv4(),
        sku: sv.sku || `SHOPIFY-VAR-${sv.id}`, 
        gtin: sv.barcode || null,
        optionValues,
        standardPrice: variantStandardPrice,
        salePrice: variantSalePrice.length > 0 ? variantSalePrice : [],
        costPrice: [], 
        imageIds: [],
      });
    });
  }

  const pimProductPartial: Partial<Product> = {
    basicInfo: {
      name: { ...defaultMultilingualString, en: shopifyProduct.title || '' },
      sku: productSkuForPim,
      gtin: firstVariant?.barcode || null,
      descriptionShort: { ...defaultMultilingualString, en: shortDescriptionEn },
      descriptionLong: { ...defaultMultilingualString, en: longDescriptionEn },
      brand: shopifyProduct.vendor || 'Unknown Brand',
      status: mapShopifyStatusToPim(shopifyProduct.status),
      launchDate: shopifyProduct.published_at || shopifyProduct.created_at || null,
      endDate: null, 
      internalId: String(shopifyProduct.id),
    },
    attributesAndSpecs: {
      categories: shopifyProduct.product_type ? [shopifyProduct.product_type] : [],
      properties: [], 
      technicalSpecs: [],
      maintenanceInstructions: null,
      warrantyInfo: null,
      countryOfOrigin: null, 
    },
    media: {
      images: shopifyProduct.images ? shopifyProduct.images.map((img): MediaEntry => ({
        id: String(img.id) || uuidv4(),
        url: img.src || '',
        altText: { ...defaultMultilingualString, en: img.alt || '' },
        type: 'image',
        dataAiHint: null, // Default to null, can be set later
        language: null,
        title: null,
      })) : [],
      videos: [],
      models3d: [],
      manuals: [],
      certificates: [],
    },
    marketingSEO: {
      seoTitle: { ...defaultMultilingualString, en: shopifyProduct.title || '' },
      seoDescription: { ...defaultMultilingualString, en: shortDescriptionEn },
      keywords: shopifyProduct.tags ? shopifyProduct.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
      marketingTexts: null,
      campaignCodes: null,
    },
    pricingAndStock: (pimVariants.length > 0 || pimOptions.length > 0) 
      ? initialProductData.pricingAndStock 
      : {
        standardPrice: baseStandardPrice,
        salePrice: baseSalePrice.length > 0 ? baseSalePrice : [],
        costPrice: [], 
      },
    options: pimOptions,
    variants: pimVariants,
    relations: initialProductData.relations,
    localizationNorway: initialProductData.localizationNorway,
    aiSummary: { ...defaultMultilingualString }, 
    createdAt: shopifyProduct.created_at || new Date().toISOString(),
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
  console.log(`[Shopify Import] Tenant ${tenantId}: Import process started.`);

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

  let shopifyApiUrl = `https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/products.json?limit=50`; 
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
        console.error(`[Shopify Import] Tenant ${tenantId}: Shopify API Error: "products" array not found or not an array in response. Received:`, JSON.stringify(shopifyData).substring(0,500));
        return NextResponse.json({ error: 'Invalid product data received from Shopify (missing or malformed products array).' }, { status: 500 });
    }
    console.log(`[Shopify Import] Tenant ${tenantId}: Received ${shopifyData.products.length} products from Shopify.`);


    let storeCurrency = "USD"; 
    try {
        const shopifyStoreInfoUrl = `https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/shop.json`;
        const shopifyStoreInfoResponse = await fetch(shopifyStoreInfoUrl, {
            method: 'GET',
            headers: { 'X-Shopify-Access-Token': apiKey, 'Content-Type': 'application/json' },
        });
        if(shopifyStoreInfoResponse.ok) {
            const shopData = await shopifyStoreInfoResponse.json();
            storeCurrency = shopData.shop?.currency || "USD"; 
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
        
        const docId = pimProductPartial.basicInfo!.sku!; 
        if (!docId) {
            console.error(`[Shopify Import] Tenant ${tenantId}: Skipping product due to missing SKU after mapping. Shopify ID: ${shopifyProd.id}`);
            saveErrors.push({ productId: shopifyProd.id, sku: 'N/A - SKU missing', error: 'SKU missing after mapping, cannot save.' });
            continue;
        }

        const productToSave: Product = {
            ...initialProductData, 
            ...pimProductPartial,   
            id: docId,              
            basicInfo: {
              ...initialProductData.basicInfo,
              ...(pimProductPartial.basicInfo || {}),
              name: { ...defaultMultilingualString, ...(pimProductPartial.basicInfo?.name || {}) },
              descriptionShort: { ...defaultMultilingualString, ...(pimProductPartial.basicInfo?.descriptionShort || {}) },
              descriptionLong: { ...defaultMultilingualString, ...(pimProductPartial.basicInfo?.descriptionLong || {}) },
              sku: docId, 
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
                  id: img.id || uuidv4(),
                  url: img.url || '', // Ensure URL is a string
                  altText: { ...defaultMultilingualString, ...(img.altText || {}) }, 
                  type: img.type || 'image',
                  language: img.language || null, // Ensure null if not present
                  title: img.title || null, // Ensure null if not present
                  dataAiHint: img.dataAiHint || null, // Ensure null if not present
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
            pricingAndStock: { 
              standardPrice: (pimProductPartial.pricingAndStock?.standardPrice || []).map(p => ({id: p.id || uuidv4(), amount: p.amount, currency: p.currency, validFrom: p.validFrom || null, validTo: p.validTo || null})),
              salePrice: (pimProductPartial.pricingAndStock?.salePrice || []).map(p => ({id: p.id || uuidv4(), amount: p.amount, currency: p.currency, validFrom: p.validFrom || null, validTo: p.validTo || null})),
              costPrice: (pimProductPartial.pricingAndStock?.costPrice || []).map(p => ({id: p.id || uuidv4(), amount: p.amount, currency: p.currency, validFrom: p.validFrom || null, validTo: p.validTo || null})),
            },
            options: (pimProductPartial.options || []).map(opt => ({
                id: opt.id || uuidv4(),
                name: opt.name || '',
                values: opt.values || [],
            })),
            variants: (pimProductPartial.variants || []).map(v => ({
                id: v.id || uuidv4(),
                sku: v.sku || '',
                gtin: v.gtin || null,
                optionValues: v.optionValues || {},
                standardPrice: (v.standardPrice || []).map(p => ({id: p.id || uuidv4(), amount: p.amount, currency: p.currency, validFrom: p.validFrom || null, validTo: p.validTo || null})),
                salePrice: (v.salePrice || []).map(p => ({id: p.id || uuidv4(), amount: p.amount, currency: p.currency, validFrom: p.validFrom || null, validTo: p.validTo || null})),
                costPrice: (v.costPrice || []).map(p => ({id: p.id || uuidv4(), amount: p.amount, currency: p.currency, validFrom: p.validFrom || null, validTo: p.validTo || null})),
                imageIds: v.imageIds || [],
            })),
            aiSummary: { ...defaultMultilingualString, ...(pimProductPartial.aiSummary || {}) },
            createdAt: pimProductPartial.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(), 
        };
        
        console.log(`[Shopify Import] Tenant ${tenantId}: Product object to save for SKU ${docId} (first 500 chars):`, JSON.stringify(productToSave).substring(0, 500));

        try {
          const productRef = dbAdmin.collection('tenants').doc(tenantId).collection('products').doc(docId);
          console.log(`[Shopify Import] Tenant ${tenantId}: Attempting to save product with ID ${docId} to Firestore.`);
          await productRef.set(productToSave, { merge: true }); 
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
      products: importedPimProducts, 
      message,
      nextPageCursor,
      errors: saveErrors.length > 0 ? saveErrors : undefined,
    });

  } catch (error: any) {
    console.error(`[Shopify Import] Tenant ${tenantId}: API Error (Outer Catch):`, error.message, error.stack ? error.stack.substring(0,500) : '');
    return NextResponse.json({ error: error.message || 'An internal server error occurred during Shopify import.' }, { status: 500 });
  }
}

