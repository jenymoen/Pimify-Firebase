
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import type { Product, ProductStatus as PimStatus, MediaEntry, KeyValueEntry, PriceEntry, ProductOption as PimProductOption, ProductVariant as PimProductVariant, MultilingualString } from '@/types/product';
import { initialProductData, defaultMultilingualString } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';
import { dbAdmin } from '../../../lib/firebase-admin'; // Import dbAdmin

const SHOPIFY_CONFIG_DOC_ID = 'configuration'; // Consistent with config route

// Updated function to fetch Shopify config directly from Firestore
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

// Placeholder for Product Create API - In real app, save to DB via tenantId
async function saveProductForTenant(tenantId: string, product: Product): Promise<Product | null> {
    if (!tenantId) {
        console.error("saveProductForTenant called without tenantId in import route");
        return null;
    }
    try {
        const productRef = dbAdmin.collection('tenants').doc(tenantId).collection('products').doc(product.id);
        await productRef.set(product);
        return product;
    } catch (e) {
        console.error(`Error saving product ${product.id} to Firestore for tenant ${tenantId} in import route:`, e);
    }
    return null;
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
  const pimId = shopifyProduct.variants?.[0]?.sku || `SHOPIFY-${shopifyProduct.id}` || uuidv4();
  const firstVariant = shopifyProduct.variants?.[0];

  const longDescriptionEn = shopifyProduct.body_html || '';
  const shortDescriptionEn = stripHtml(longDescriptionEn).substring(0, 200) + (stripHtml(longDescriptionEn).length > 200 ? '...' : '');

  const baseStandardPrice: PriceEntry[] = [];
  const baseSalePrice: PriceEntry[] = [];

  if (firstVariant) {
    const currentPrice = parseFloat(firstVariant.price);
    const originalPrice = firstVariant.compare_at_price ? parseFloat(firstVariant.compare_at_price) : null;

    if (originalPrice && originalPrice > currentPrice) { // It's a sale
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
    id: String(opt.id),
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
        id: String(sv.id),
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
    id: pimId,
    basicInfo: {
      name: { ...defaultMultilingualString, en: shopifyProduct.title },
      sku: firstVariant?.sku || `SKU-SHOPIFY-${shopifyProduct.id}`,
      gtin: firstVariant?.barcode || undefined,
      descriptionShort: { ...defaultMultilingualString, en: shortDescriptionEn },
      descriptionLong: { ...defaultMultilingualString, en: longDescriptionEn },
      brand: shopifyProduct.vendor || 'Unknown Brand',
      status: mapShopifyStatusToPim(shopifyProduct.status),
      launchDate: shopifyProduct.published_at || undefined,
      endDate: undefined, // Shopify doesn't have a direct 'end date' for products
      internalId: String(shopifyProduct.id),
    },
    attributesAndSpecs: {
      ...initialProductData.attributesAndSpecs,
      categories: shopifyProduct.product_type ? [shopifyProduct.product_type] : [],
    },
    media: {
      images: shopifyProduct.images.map((img): MediaEntry => ({
        id: uuidv4(),
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
    pricingAndStock: {
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
        return NextResponse.json({ error: 'Invalid product data received from Shopify.' }, { status: 500 });
    }

    const shopifyStoreInfoResponse = await fetch(`https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/shop.json`, {
        method: 'GET',
        headers: { 'X-Shopify-Access-Token': apiKey, 'Content-Type': 'application/json' },
    });
    let storeCurrency = "USD"; // Default
    if(shopifyStoreInfoResponse.ok) {
        const shopData = await shopifyStoreInfoResponse.json();
        storeCurrency = shopData.shop?.currency || "USD";
    }


    const importedPimProducts: Product[] = [];
    for (const shopifyProd of shopifyData.products as ShopifyProductShopify[]) {
        const pimProduct = mapShopifyToPimProduct(shopifyProd, storeCurrency);
        const savedProduct = await saveProductForTenant(tenantId, pimProduct);
        if (savedProduct) {
            importedPimProducts.push(savedProduct);
        } else {
            console.warn(`Failed to save imported product ${pimProduct.id} for tenant ${tenantId}`);
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
