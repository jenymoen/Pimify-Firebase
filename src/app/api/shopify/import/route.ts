
'use server';

import { type NextRequest, NextResponse } from 'next/server';
import type { Product, ProductStatus as PimStatus, MediaEntry, KeyValueEntry, PriceEntry, ProductOption as PimProductOption, ProductVariant as PimProductVariant } from '@/types/product';
import { initialProductData, defaultMultilingualString } from '@/types/product';
import { WorkflowState } from '@/types/workflow';
import { v4 as uuidv4 } from 'uuid';

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
  name: string;
  position: number;
  values: string[];
}

interface ShopifyVariantShopify {
  id: number;
  product_id: number;
  title: string; // e.g., "Red / S"
  price: string; 
  compare_at_price: string | null; 
  sku: string | null;
  barcode: string | null; // GTIN
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

function mapShopifyStatusToWorkflowState(shopifyStatus: ShopifyProductShopify['status']): WorkflowState {
  switch (shopifyStatus) {
    case 'active':
      return 'PUBLISHED';
    case 'archived':
      return 'REJECTED';
    case 'draft':
      return 'DRAFT';
    default:
      return 'DRAFT';
  }
}

function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
}


function mapShopifyToPimProduct(shopifyProduct: ShopifyProductShopify): Product {
  const pimId = shopifyProduct.variants?.[0]?.sku || `SHOPIFY-${shopifyProduct.id}` || uuidv4();
  const firstVariant = shopifyProduct.variants?.[0];

  const longDescriptionEn = shopifyProduct.body_html || '';
  const shortDescriptionEn = stripHtml(longDescriptionEn).substring(0, 200) + (longDescriptionEn.length > 200 ? '...' : '');

  // Base pricing from the first variant (used if no variants are mapped or as a fallback)
  const baseStandardPrice: PriceEntry[] = [];
  const baseSalePrice: PriceEntry[] = [];
  const shopifyStoreCurrency = "NOK"; // Assuming NOK as default, ideally this would come from store settings or Shopify API

  if (firstVariant) {
    const currentPrice = parseFloat(firstVariant.price);
    const originalPrice = firstVariant.compare_at_price ? parseFloat(firstVariant.compare_at_price) : null;

    if (originalPrice && originalPrice > currentPrice) {
      baseStandardPrice.push({
        id: uuidv4(),
        amount: originalPrice,
        currency: shopifyStoreCurrency, 
      });
      baseSalePrice.push({
        id: uuidv4(),
        amount: currentPrice,
        currency: shopifyStoreCurrency,
      });
    } else {
      baseStandardPrice.push({
        id: uuidv4(),
        amount: currentPrice,
        currency: shopifyStoreCurrency,
      });
    }
  }

  // Map Shopify options to PIM options
  const pimOptions: PimProductOption[] = shopifyProduct.options ? shopifyProduct.options.map(opt => ({
    id: String(opt.id), // Using Shopify option ID
    name: opt.name,
    values: opt.values,
  })) : [];

  // Map Shopify variants to PIM variants
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
        variantStandardPrice.push({ id: uuidv4(), amount: varOriginalPrice, currency: shopifyStoreCurrency });
        variantSalePrice.push({ id: uuidv4(), amount: varCurrentPrice, currency: shopifyStoreCurrency });
      } else {
        variantStandardPrice.push({ id: uuidv4(), amount: varCurrentPrice, currency: shopifyStoreCurrency });
      }

      pimVariants.push({
        id: String(sv.id), // Using Shopify variant ID
        sku: sv.sku || `SHOPIFY-VAR-${sv.id}`,
        gtin: sv.barcode || undefined,
        optionValues,
        standardPrice: variantStandardPrice,
        salePrice: variantSalePrice.length > 0 ? variantSalePrice : [], // store as empty array if no sale price
        costPrice: [], // Shopify doesn't directly expose cost price here
      });
    });
  }


  return {
    ...initialProductData, 
    id: pimId,
    basicInfo: {
      name: { ...defaultMultilingualString, en: shopifyProduct.title },
      sku: firstVariant?.sku || `SKU-${shopifyProduct.id}`,
      gtin: firstVariant?.barcode || undefined,
      descriptionShort: { ...defaultMultilingualString, en: shortDescriptionEn },
      descriptionLong: { ...defaultMultilingualString, en: longDescriptionEn },
      brand: shopifyProduct.vendor || 'Unknown Brand',
      status: mapShopifyStatusToPim(shopifyProduct.status),
      launchDate: shopifyProduct.published_at || undefined,
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
    pricingAndStock: { // This is for the base product if no variants, or as a fallback
        standardPrice: baseStandardPrice,
        salePrice: baseSalePrice.length > 0 ? baseSalePrice : [],
        costPrice: [], 
    },
    options: pimOptions,
    variants: pimVariants,
    aiSummary: { ...defaultMultilingualString },
    workflowState: mapShopifyStatusToWorkflowState(shopifyProduct.status),
    workflowHistory: [{
      id: uuidv4(),
      action: 'IMPORT_FROM_SHOPIFY',
      fromState: 'DRAFT' as WorkflowState,
      toState: mapShopifyStatusToWorkflowState(shopifyProduct.status),
      userId: 'system',
      userName: 'System Import',
      timestamp: new Date().toISOString(),
      reason: `Imported from Shopify with status: ${shopifyProduct.status}`,
    }],
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
  try {
    const { storeUrl, apiKey, pageInfo } = await request.json();

    if (!storeUrl) {
      return NextResponse.json({ error: 'Shopify store URL is required.' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Shopify Admin API Access Token is required.' }, { status: 400 });
    }

    let shopifyApiUrl = `https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/products.json?limit=50`; 
    if (pageInfo) {
      shopifyApiUrl += `&page_info=${pageInfo}`;
    }


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

    const productsToImport = shopifyData.products.map((product: ShopifyProductShopify) => mapShopifyToPimProduct(product));
    const nextPageCursor = parseLinkHeader(shopifyResponse.headers.get('Link'));

    return NextResponse.json({ 
      products: productsToImport, 
      message: `${productsToImport.length} products imported from ${storeUrl}. ${nextPageCursor ? 'More products available.' : 'All products imported.'}`,
      nextPageCursor 
    });

  } catch (error: any) {
    console.error('Shopify Import API Error:', error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred during Shopify import.' }, { status: 500 });
  }
}

