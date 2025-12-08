/**
 * Shopify Stores API Route
 * 
 * Manages Shopify store connections:
 * - GET: List all connected stores
 * - POST: Complete store connection (after OAuth callback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { shopifyStoreService } from '@/lib/shopify-store-service';

/**
 * GET /api/shopify/stores
 * 
 * List all connected Shopify stores
 */
export async function GET() {
    try {
        const result = shopifyStoreService.listStores();

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }

        // Return stores without sensitive data
        const stores = result.data?.map(store => ({
            id: store.id,
            shop: store.shop,
            shopName: store.shopName,
            status: store.status,
            connectedAt: store.connectedAt,
            lastSyncedAt: store.lastSyncedAt,
            errorMessage: store.errorMessage,
        })) || [];

        return NextResponse.json({
            stores,
            total: stores.length,
        });

    } catch (error) {
        console.error('Error listing Shopify stores:', error);
        return NextResponse.json(
            { error: 'Failed to list stores' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/shopify/stores
 * 
 * Complete store connection after OAuth callback.
 * Reads pending store data from cookie and persists it.
 */
export async function POST(request: NextRequest) {
    try {
        // Get pending store data from cookie (set by OAuth callback)
        const pendingStoreCookie = request.cookies.get('shopify_store_pending')?.value;

        if (!pendingStoreCookie) {
            return NextResponse.json(
                { error: 'No pending store connection. Please restart OAuth flow.' },
                { status: 400 }
            );
        }

        let pendingStore;
        try {
            pendingStore = JSON.parse(pendingStoreCookie);
        } catch {
            return NextResponse.json(
                { error: 'Invalid pending store data' },
                { status: 400 }
            );
        }

        const { shop, shopName, encryptedToken, scope } = pendingStore;

        if (!shop || !encryptedToken) {
            return NextResponse.json(
                { error: 'Missing required store data' },
                { status: 400 }
            );
        }

        // Add store to service
        const result = shopifyStoreService.addStore({
            shop,
            shopName: shopName || shop.replace('.myshopify.com', ''),
            encryptedToken,
            scope: scope || '',
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        // Clear pending cookie
        const response = NextResponse.json({
            success: true,
            store: {
                id: result.data?.id,
                shop: result.data?.shop,
                shopName: result.data?.shopName,
                status: result.data?.status,
                connectedAt: result.data?.connectedAt,
            },
        });

        response.cookies.delete('shopify_store_pending');

        return response;

    } catch (error) {
        console.error('Error completing store connection:', error);
        return NextResponse.json(
            { error: 'Failed to complete store connection' },
            { status: 500 }
        );
    }
}
