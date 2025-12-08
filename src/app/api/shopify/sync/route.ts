/**
 * Shopify Sync API Route
 * 
 * Handles product synchronization with Shopify:
 * - POST: Push product(s) to Shopify
 * - GET: Pull product data from Shopify
 */

import { NextRequest, NextResponse } from 'next/server';
import { shopifySyncService } from '@/lib/shopify-sync-service';
import { shopifyStoreService } from '@/lib/shopify-store-service';
import { Product } from '@/types/product';
import { WorkflowState } from '@/types/workflow';

/**
 * POST /api/shopify/sync
 * 
 * Push product(s) to Shopify
 * 
 * Body: {
 *   productId?: string,      // Single product
 *   productIds?: string[],   // Multiple products
 *   storeId: string,         // Target store
 *   product?: Product,       // Product data (if not fetching from store)
 *   products?: Product[]     // Products data (for bulk)
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { productId, productIds, storeId, product, products } = body;

        // Validate store ID
        if (!storeId) {
            return NextResponse.json(
                { error: 'Store ID is required' },
                { status: 400 }
            );
        }

        // Verify store exists
        const storeResult = shopifyStoreService.getStoreById(storeId);
        if (!storeResult.success) {
            return NextResponse.json(
                { error: 'Store not found' },
                { status: 404 }
            );
        }

        // Single product sync
        if (product || productId) {
            const targetProduct = product as Product;

            if (!targetProduct) {
                return NextResponse.json(
                    { error: 'Product data is required' },
                    { status: 400 }
                );
            }

            const result = await shopifySyncService.pushProductToShopify(targetProduct, storeId);

            if (!result.success) {
                return NextResponse.json(
                    { error: result.error, result },
                    { status: 400 }
                );
            }

            // Return updated product data with sync info
            return NextResponse.json({
                success: true,
                result,
                syncUpdate: {
                    storeId,
                    shopifyProductId: String(result.shopifyProductId),
                    lastSyncedAt: result.timestamp,
                },
            });
        }

        // Bulk product sync
        if (products || productIds) {
            const targetProducts = products as Product[];

            if (!targetProducts || targetProducts.length === 0) {
                return NextResponse.json(
                    { error: 'Products array is required' },
                    { status: 400 }
                );
            }

            const result = await shopifySyncService.bulkPushToShopify(targetProducts, storeId);

            return NextResponse.json({
                success: result.success,
                result,
            });
        }

        return NextResponse.json(
            { error: 'Either product/productId or products/productIds is required' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Shopify sync error:', error);
        return NextResponse.json(
            { error: 'Failed to sync with Shopify' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/shopify/sync
 * 
 * Pull product data from Shopify
 * 
 * Query params:
 * - productId: string    // Pimify product ID
 * - storeId: string      // Store to pull from
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const productId = searchParams.get('productId');
        const storeId = searchParams.get('storeId');
        const productData = searchParams.get('product'); // JSON encoded product

        if (!productId || !storeId) {
            return NextResponse.json(
                { error: 'productId and storeId are required' },
                { status: 400 }
            );
        }

        // Verify store exists
        const storeResult = shopifyStoreService.getStoreById(storeId);
        if (!storeResult.success) {
            return NextResponse.json(
                { error: 'Store not found' },
                { status: 404 }
            );
        }

        // Need product data to check sync status
        if (!productData) {
            return NextResponse.json(
                { error: 'Product data is required' },
                { status: 400 }
            );
        }

        let product: Product;
        try {
            product = JSON.parse(productData);
        } catch {
            return NextResponse.json(
                { error: 'Invalid product data' },
                { status: 400 }
            );
        }

        const result = await shopifySyncService.pullProductFromShopify(product, storeId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error, result },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            result,
            syncUpdate: result.shopifyPrice !== undefined ? {
                shopifyPrice: result.shopifyPrice,
                lastSyncedAt: result.timestamp,
            } : undefined,
        });

    } catch (error) {
        console.error('Shopify pull error:', error);
        return NextResponse.json(
            { error: 'Failed to pull from Shopify' },
            { status: 500 }
        );
    }
}
