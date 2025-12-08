/**
 * Shopify API Client
 * 
 * Handles all direct communication with Shopify Admin API including:
 * - Product CRUD operations
 * - Image uploads
 * - Variant management
 */

import { Product, ProductVariant } from '@/types/product';

// Shopify API version
const SHOPIFY_API_VERSION = '2024-01';

/**
 * Shopify Product type (API response format)
 */
export interface ShopifyProduct {
    id: number;
    title: string;
    body_html: string;
    vendor: string;
    product_type: string;
    handle: string;
    status: 'active' | 'archived' | 'draft';
    tags: string;
    variants: ShopifyVariant[];
    images: ShopifyImage[];
    created_at: string;
    updated_at: string;
}

/**
 * Shopify Variant type
 */
export interface ShopifyVariant {
    id: number;
    product_id: number;
    title: string;
    sku: string;
    barcode: string | null;
    price: string;
    compare_at_price: string | null;
    inventory_quantity: number;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Shopify Image type
 */
export interface ShopifyImage {
    id: number;
    product_id: number;
    position: number;
    src: string;
    alt: string | null;
    width: number;
    height: number;
}

/**
 * Product creation/update input for Shopify
 */
interface ShopifyProductInput {
    title: string;
    body_html: string;
    vendor?: string;
    product_type?: string;
    status?: 'active' | 'archived' | 'draft';
    tags?: string;
    variants?: Array<{
        sku?: string;
        barcode?: string;
        price?: string;
        compare_at_price?: string;
        option1?: string;
        option2?: string;
        option3?: string;
    }>;
    images?: Array<{
        src?: string;
        attachment?: string;  // Base64 encoded
        alt?: string;
        position?: number;
    }>;
    options?: Array<{
        name: string;
        values: string[];
    }>;
}

/**
 * API response wrapper
 */
interface ShopifyApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode?: number;
}

/**
 * Shopify API Client Class
 */
export class ShopifyClient {
    private shop: string;
    private accessToken: string;

    constructor(shop: string, accessToken: string) {
        this.shop = shop;
        this.accessToken = accessToken;
    }

    /**
     * Build API URL
     */
    private buildUrl(endpoint: string): string {
        return `https://${this.shop}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;
    }

    /**
     * Make authenticated API request
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ShopifyApiResponse<T>> {
        const url = this.buildUrl(endpoint);

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'X-Shopify-Access-Token': this.accessToken,
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Shopify API error: ${response.status} - ${errorText}`);

                return {
                    success: false,
                    error: `API error: ${response.status} ${response.statusText}`,
                    statusCode: response.status,
                };
            }

            // Handle 204 No Content
            if (response.status === 204) {
                return { success: true };
            }

            const data = await response.json();
            return { success: true, data };

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('Shopify API request failed:', message);
            return { success: false, error: message };
        }
    }

    /**
     * Get product by ID
     */
    async getProduct(productId: number): Promise<ShopifyApiResponse<ShopifyProduct>> {
        const result = await this.request<{ product: ShopifyProduct }>(`products/${productId}.json`);
        if (result.success && result.data) {
            return { success: true, data: result.data.product };
        }
        return { success: false, error: result.error };
    }

    /**
     * Get product by SKU
     */
    async getProductBySku(sku: string): Promise<ShopifyApiResponse<ShopifyProduct | null>> {
        // Search products by SKU using GraphQL or REST query
        const params = new URLSearchParams({ limit: '1' });
        const result = await this.request<{ products: ShopifyProduct[] }>(
            `products.json?${params}`
        );

        if (!result.success || !result.data) {
            return { success: false, error: result.error };
        }

        // Find product with matching variant SKU
        // Note: This is a simplified approach - for better performance, use GraphQL
        const allProducts = await this.request<{ products: ShopifyProduct[] }>(
            `products.json?limit=250`
        );

        if (!allProducts.success || !allProducts.data) {
            return { success: false, error: allProducts.error };
        }

        for (const product of allProducts.data.products) {
            const matchingVariant = product.variants.find(v => v.sku === sku);
            if (matchingVariant) {
                return { success: true, data: product };
            }
        }

        return { success: true, data: null };
    }

    /**
     * Create a new product
     */
    async createProduct(input: ShopifyProductInput): Promise<ShopifyApiResponse<ShopifyProduct>> {
        const result = await this.request<{ product: ShopifyProduct }>('products.json', {
            method: 'POST',
            body: JSON.stringify({ product: input }),
        });

        if (result.success && result.data) {
            return { success: true, data: result.data.product };
        }
        return { success: false, error: result.error };
    }

    /**
     * Update an existing product
     */
    async updateProduct(
        productId: number,
        input: Partial<ShopifyProductInput>
    ): Promise<ShopifyApiResponse<ShopifyProduct>> {
        const result = await this.request<{ product: ShopifyProduct }>(
            `products/${productId}.json`,
            {
                method: 'PUT',
                body: JSON.stringify({ product: input }),
            }
        );

        if (result.success && result.data) {
            return { success: true, data: result.data.product };
        }
        return { success: false, error: result.error };
    }

    /**
     * Delete a product
     */
    async deleteProduct(productId: number): Promise<ShopifyApiResponse<void>> {
        return this.request<void>(`products/${productId}.json`, {
            method: 'DELETE',
        });
    }

    /**
     * Upload image to product
     */
    async uploadProductImage(
        productId: number,
        imageData: { src?: string; attachment?: string; alt?: string }
    ): Promise<ShopifyApiResponse<ShopifyImage>> {
        const result = await this.request<{ image: ShopifyImage }>(
            `products/${productId}/images.json`,
            {
                method: 'POST',
                body: JSON.stringify({ image: imageData }),
            }
        );

        if (result.success && result.data) {
            return { success: true, data: result.data.image };
        }
        return { success: false, error: result.error };
    }

    /**
     * Map Pimify product to Shopify format
     */
    mapPimifyToShopify(product: Product): ShopifyProductInput {
        // Map basic fields
        const shopifyProduct: ShopifyProductInput = {
            title: product.basicInfo.name.en || product.basicInfo.name.no || product.basicInfo.sku,
            body_html: product.marketingSEO?.seoDescription?.en ||
                product.basicInfo.descriptionLong?.en ||
                product.basicInfo.descriptionShort?.en || '',
            vendor: product.basicInfo.brand || '',
            product_type: product.attributesAndSpecs?.categories?.[0] || '',
            status: this.mapStatus(product.basicInfo.status),
            tags: product.marketingSEO?.keywords?.join(', ') || '',
        };

        // Map variants
        if (product.variants && product.variants.length > 0) {
            shopifyProduct.variants = product.variants.map(variant => this.mapVariant(variant));

            // Map options
            if (product.options && product.options.length > 0) {
                shopifyProduct.options = product.options.map(opt => ({
                    name: opt.name,
                    values: opt.values,
                }));
            }
        } else {
            // Single variant (no options)
            shopifyProduct.variants = [{
                sku: product.basicInfo.sku,
                barcode: product.basicInfo.gtin || undefined,
                price: String(product.pricingAndStock?.standardPrice?.[0]?.amount || 0),
            }];
        }

        // Map images (URLs only - base64 handled separately)
        if (product.media?.images && product.media.images.length > 0) {
            shopifyProduct.images = product.media.images
                .filter(img => img.url && !img.url.startsWith('data:'))  // Skip base64 for now
                .map((img, index) => ({
                    src: img.url,
                    alt: img.altText?.en || img.altText?.no || undefined,
                    position: index + 1,
                }));
        }

        return shopifyProduct;
    }

    /**
     * Map Pimify variant to Shopify format
     */
    private mapVariant(variant: ProductVariant): {
        sku?: string;
        barcode?: string;
        price?: string;
        compare_at_price?: string;
        option1?: string;
        option2?: string;
        option3?: string;
    } {
        const options = Object.values(variant.optionValues || {}) as string[];

        return {
            sku: variant.sku,
            barcode: variant.gtin || undefined,
            price: String(variant.standardPrice?.[0]?.amount || 0),
            compare_at_price: variant.salePrice?.[0]?.amount
                ? String(variant.standardPrice?.[0]?.amount || 0)
                : undefined,
            option1: options[0] || undefined,
            option2: options[1] || undefined,
            option3: options[2] || undefined,
        };
    }

    /**
     * Map Pimify status to Shopify status
     */
    private mapStatus(status: string): 'active' | 'archived' | 'draft' {
        switch (status) {
            case 'active':
                return 'active';
            case 'discontinued':
                return 'archived';
            case 'development':
            case 'inactive':
            default:
                return 'draft';
        }
    }

    /**
     * Verify API connection
     */
    async verifyConnection(): Promise<ShopifyApiResponse<{ name: string }>> {
        const result = await this.request<{ shop: { name: string } }>('shop.json');

        if (result.success && result.data) {
            return { success: true, data: { name: result.data.shop.name } };
        }
        return { success: false, error: result.error };
    }
}

/**
 * Create a Shopify client instance
 */
export function createShopifyClient(shop: string, accessToken: string): ShopifyClient {
    return new ShopifyClient(shop, accessToken);
}

export default ShopifyClient;
