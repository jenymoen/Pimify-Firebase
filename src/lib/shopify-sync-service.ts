/**
 * Shopify Sync Service
 * 
 * Orchestrates product synchronization between Pimify and Shopify:
 * - Push products to Shopify
 * - Pull updates from Shopify
 * - Handle sync status and audit trail
 */

import { Product } from '@/types/product';
import { WorkflowState } from '@/types/workflow';
import { ShopifyClient, ShopifyProduct, createShopifyClient } from './shopify-client';
import { ShopifyStoreService, shopifyStoreService, ShopifyStore } from './shopify-store-service';

/**
 * Sync operation result
 */
export interface SyncResult {
    success: boolean;
    productId: string;
    storeId: string;
    shopifyProductId?: number;
    action: 'created' | 'updated' | 'skipped';
    error?: string;
    timestamp: string;
}

/**
 * Bulk sync result
 */
export interface BulkSyncResult {
    success: boolean;
    totalProducts: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
    results: SyncResult[];
    startedAt: string;
    completedAt: string;
}

/**
 * Pull sync result
 */
export interface PullSyncResult {
    success: boolean;
    productId: string;
    storeId: string;
    priceUpdated: boolean;
    newVariantsFound: number;
    shopifyPrice?: number;
    error?: string;
    timestamp: string;
}

/**
 * Shopify Sync Service Class
 */
export class ShopifySyncService {
    private storeService: ShopifyStoreService;

    constructor(storeService: ShopifyStoreService = shopifyStoreService) {
        this.storeService = storeService;
    }

    /**
     * Get a Shopify client for a specific store
     */
    private getClient(storeId: string): ShopifyClient | null {
        const storeResult = this.storeService.getStoreById(storeId);
        if (!storeResult.success || !storeResult.data) {
            console.error('Store not found:', storeId);
            return null;
        }

        const tokenResult = this.storeService.getAccessToken(storeId);
        if (!tokenResult.success || !tokenResult.data) {
            console.error('Failed to get access token for store:', storeId);
            return null;
        }

        return createShopifyClient(storeResult.data.shop, tokenResult.data);
    }

    /**
     * Push a single product to Shopify
     */
    async pushProductToShopify(
        product: Product,
        storeId: string
    ): Promise<SyncResult> {
        const timestamp = new Date().toISOString();

        // Validate product state
        if (!this.canSync(product)) {
            return {
                success: false,
                productId: product.id,
                storeId,
                action: 'skipped',
                error: `Product must be in APPROVED or PUBLISHED state. Current state: ${product.workflowState}`,
                timestamp,
            };
        }

        // Get Shopify client
        const client = this.getClient(storeId);
        if (!client) {
            return {
                success: false,
                productId: product.id,
                storeId,
                action: 'skipped',
                error: 'Failed to connect to Shopify store',
                timestamp,
            };
        }

        try {
            // Check if product already exists in Shopify (by checking sync record)
            const existingSync = product.shopifySync?.find(s => s.storeId === storeId);

            if (existingSync?.shopifyProductId) {
                // Update existing product
                const shopifyInput = client.mapPimifyToShopify(product);
                const result = await client.updateProduct(
                    parseInt(existingSync.shopifyProductId),
                    shopifyInput
                );

                if (!result.success) {
                    return {
                        success: false,
                        productId: product.id,
                        storeId,
                        action: 'updated',
                        error: result.error,
                        timestamp,
                    };
                }

                // Update last synced timestamp
                this.storeService.updateLastSynced(storeId);

                return {
                    success: true,
                    productId: product.id,
                    storeId,
                    shopifyProductId: result.data?.id,
                    action: 'updated',
                    timestamp,
                };

            } else {
                // Check if product exists by SKU
                const existingResult = await client.getProductBySku(product.basicInfo.sku);

                if (existingResult.success && existingResult.data) {
                    // Product exists - update it
                    const shopifyInput = client.mapPimifyToShopify(product);
                    const result = await client.updateProduct(existingResult.data.id, shopifyInput);

                    if (!result.success) {
                        return {
                            success: false,
                            productId: product.id,
                            storeId,
                            action: 'updated',
                            error: result.error,
                            timestamp,
                        };
                    }

                    this.storeService.updateLastSynced(storeId);

                    return {
                        success: true,
                        productId: product.id,
                        storeId,
                        shopifyProductId: result.data?.id,
                        action: 'updated',
                        timestamp,
                    };

                } else {
                    // Create new product
                    const shopifyInput = client.mapPimifyToShopify(product);
                    const result = await client.createProduct(shopifyInput);

                    if (!result.success) {
                        return {
                            success: false,
                            productId: product.id,
                            storeId,
                            action: 'created',
                            error: result.error,
                            timestamp,
                        };
                    }

                    // Upload images if any are base64
                    if (product.media?.images) {
                        for (const image of product.media.images) {
                            if (image.url.startsWith('data:')) {
                                // Extract base64 content
                                const base64Content = image.url.split(',')[1];
                                if (base64Content && result.data?.id) {
                                    await client.uploadProductImage(result.data.id, {
                                        attachment: base64Content,
                                        alt: image.altText?.en || image.altText?.no || undefined,
                                    });
                                }
                            }
                        }
                    }

                    this.storeService.updateLastSynced(storeId);

                    return {
                        success: true,
                        productId: product.id,
                        storeId,
                        shopifyProductId: result.data?.id,
                        action: 'created',
                        timestamp,
                    };
                }
            }

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                productId: product.id,
                storeId,
                action: 'skipped',
                error: message,
                timestamp,
            };
        }
    }

    /**
     * Bulk push products to Shopify
     */
    async bulkPushToShopify(
        products: Product[],
        storeId: string
    ): Promise<BulkSyncResult> {
        const startedAt = new Date().toISOString();
        const results: SyncResult[] = [];

        let successCount = 0;
        let failedCount = 0;
        let skippedCount = 0;

        for (const product of products) {
            const result = await this.pushProductToShopify(product, storeId);
            results.push(result);

            if (result.success) {
                successCount++;
            } else if (result.action === 'skipped') {
                skippedCount++;
            } else {
                failedCount++;
            }

            // Basic rate limiting - wait 250ms between requests
            await this.delay(250);
        }

        return {
            success: failedCount === 0,
            totalProducts: products.length,
            successCount,
            failedCount,
            skippedCount,
            results,
            startedAt,
            completedAt: new Date().toISOString(),
        };
    }

    /**
     * Pull product data from Shopify
     */
    async pullProductFromShopify(
        product: Product,
        storeId: string
    ): Promise<PullSyncResult> {
        const timestamp = new Date().toISOString();

        // Check if product has been synced to this store
        const syncRecord = product.shopifySync?.find(s => s.storeId === storeId);
        if (!syncRecord?.shopifyProductId) {
            return {
                success: false,
                productId: product.id,
                storeId,
                priceUpdated: false,
                newVariantsFound: 0,
                error: 'Product has not been synced to this store',
                timestamp,
            };
        }

        // Get Shopify client
        const client = this.getClient(storeId);
        if (!client) {
            return {
                success: false,
                productId: product.id,
                storeId,
                priceUpdated: false,
                newVariantsFound: 0,
                error: 'Failed to connect to Shopify store',
                timestamp,
            };
        }

        try {
            // Fetch product from Shopify
            const shopifyResult = await client.getProduct(parseInt(syncRecord.shopifyProductId));

            if (!shopifyResult.success || !shopifyResult.data) {
                return {
                    success: false,
                    productId: product.id,
                    storeId,
                    priceUpdated: false,
                    newVariantsFound: 0,
                    error: shopifyResult.error || 'Product not found in Shopify',
                    timestamp,
                };
            }

            const shopifyProduct = shopifyResult.data;

            // Check for price changes
            const shopifyPrice = parseFloat(shopifyProduct.variants[0]?.price || '0');
            const priceUpdated = shopifyPrice !== syncRecord.shopifyPrice;

            // Check for new variants
            const existingVariantIds = Object.values(syncRecord.shopifyVariantIds || {});
            const newVariants = shopifyProduct.variants.filter(
                v => !existingVariantIds.includes(String(v.id))
            );

            this.storeService.updateLastSynced(storeId);

            return {
                success: true,
                productId: product.id,
                storeId,
                priceUpdated,
                newVariantsFound: newVariants.length,
                shopifyPrice,
                timestamp,
            };

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                productId: product.id,
                storeId,
                priceUpdated: false,
                newVariantsFound: 0,
                error: message,
                timestamp,
            };
        }
    }

    /**
     * Check if product can be synced
     */
    canSync(product: Product): boolean {
        const validStates: WorkflowState[] = [
            WorkflowState.APPROVED,
            WorkflowState.PUBLISHED,
            WorkflowState.SYNCED,
        ];
        return validStates.includes(product.workflowState as WorkflowState);
    }

    /**
     * Get sync status for a product
     */
    getSyncStatus(product: Product, storeId: string): {
        isSynced: boolean;
        lastSyncedAt?: string;
        shopifyProductId?: string;
    } {
        const syncRecord = product.shopifySync?.find(s => s.storeId === storeId);

        return {
            isSynced: !!syncRecord?.shopifyProductId,
            lastSyncedAt: syncRecord?.lastSyncedAt,
            shopifyProductId: syncRecord?.shopifyProductId,
        };
    }

    /**
     * Delay helper for rate limiting
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create singleton instance
const globalForService = global as unknown as { shopifySyncService: ShopifySyncService };

export const shopifySyncService = globalForService.shopifySyncService || new ShopifySyncService();

if (process.env.NODE_ENV !== 'production') {
    globalForService.shopifySyncService = shopifySyncService;
}

export default ShopifySyncService;
