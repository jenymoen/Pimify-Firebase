
import { type NextRequest, NextResponse } from 'next/server';
import type { Product, ProductStatus as PimStatus, MediaEntry, KeyValueEntry } from '@/types/product';
import { initialProductData, defaultMultilingualString } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';

// Shopify API types (simplified)
interface ShopifyImage {
  id: number;
  product_id: number;
  src: string;
  alt: string | null;
  width: number;
  height: number;
}

interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  price: string;
  sku: string | null;
  barcode: string | null; // GTIN
  inventory_quantity: number;
  // ... other variant fields
}

interface ShopifyProductShopify {
  id: number;
  title: string; // Maps to basicInfo.name.en
  body_html: string | null; // Maps to basicInfo.descriptionLong.en
  vendor: string; // Maps to basicInfo.brand
  product_type: string; // Maps to attributesAndSpecs.categories
  created_at: string;
  updated_at: string;
  published_at: string | null; // Can indicate launchDate
  status: 'active' | 'archived' | 'draft'; // Maps to basicInfo.status
  tags: string; // Comma-separated, maps to marketingSEO.keywords
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  // ... other Shopify product fields
}

function mapShopifyStatusToPim(shopifyStatus: ShopifyProductShopify['status']): PimStatus {
  switch (shopifyStatus) {
    case 'active':
      return 'active';
    case 'archived':
      return 'inactive'; // Or 'discontinued', 'inactive' seems more general
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


function mapShopifyToPimProduct(shopifyProduct: ShopifyProductShopify): Product {
  const pimId = shopifyProduct.variants?.[0]?.sku || `SHOPIFY-${shopifyProduct.id}` || uuidv4();
  const firstVariant = shopifyProduct.variants?.[0];

  const longDescriptionEn = shopifyProduct.body_html || '';
  const shortDescriptionEn = stripHtml(longDescriptionEn).substring(0, 200) + (longDescriptionEn.length > 200 ? '...' : '');


  return {
    ...initialProductData, // Start with defaults to ensure all fields exist
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
      internalId: String(shopifyProduct.id), // Store Shopify ID
    },
    attributesAndSpecs: {
      ...initialProductData.attributesAndSpecs,
      categories: shopifyProduct.product_type ? [shopifyProduct.product_type] : [],
      // properties and technicalSpecs would require mapping from Shopify metafields typically
    },
    media: {
      images: shopifyProduct.images.map((img): MediaEntry => ({
        id: uuidv4(),
        url: img.src,
        altText: { ...defaultMultilingualString, en: img.alt || shopifyProduct.title },
        type: 'image',
        dataAiHint: 'product image' // generic hint
      })),
      // videos, models3d, etc. would need custom logic (e.g. from metafields or description parsing)
    },
    marketingSEO: {
      ...initialProductData.marketingSEO,
      seoTitle: { ...defaultMultilingualString, en: shopifyProduct.title }, // Default to product title
      seoDescription: { ...defaultMultilingualString, en: shortDescriptionEn }, // Default to short description
      keywords: shopifyProduct.tags ? shopifyProduct.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
    },
    aiSummary: { ...defaultMultilingualString }, // AI summary would be generated post-import if needed
    createdAt: shopifyProduct.created_at || new Date().toISOString(),
    updatedAt: shopifyProduct.updated_at || new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { storeUrl, apiKey } = await request.json();

    if (!storeUrl) {
      return NextResponse.json({ error: 'Shopify store URL is required.' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Shopify Admin API Access Token is required.' }, { status: 400 });
    }

    const shopifyApiUrl = `https://${storeUrl.replace(/^https?:\/\//, '')}/admin/api/2024-04/products.json?limit=50`; // Limit for now

    const shopifyResponse = await fetch(shopifyApiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!shopifyResponse.ok) {
      const errorData = await shopifyResponse.json().catch(() => ({ error: shopifyResponse.statusText }));
      console.error('Shopify API Error (Import):', errorData);
      return NextResponse.json({ error: errorData.errors || errorData.error || `Shopify API request failed: ${shopifyResponse.statusText}` }, { status: shopifyResponse.status });
    }
    
    const shopifyData = await shopifyResponse.json();
    
    if (!shopifyData.products || !Array.isArray(shopifyData.products)) {
        return NextResponse.json({ error: 'Invalid product data received from Shopify.' }, { status: 500 });
    }

    const productsToImport = shopifyData.products.map((product: ShopifyProductShopify) => mapShopifyToPimProduct(product));

    return NextResponse.json({ products: productsToImport, message: `${productsToImport.length} products imported from ${storeUrl}.` });

  } catch (error: any) {
    console.error('Shopify Import API Error:', error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred during Shopify import.' }, { status: 500 });
  }
}
