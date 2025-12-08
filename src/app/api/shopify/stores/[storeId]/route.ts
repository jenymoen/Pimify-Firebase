/**
 * Shopify Individual Store API Route
 * 
 * Operations on a specific store:
 * - GET: Get store details
 * - DELETE: Disconnect store
 * - POST: Verify store connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { shopifyStoreService } from '@/lib/shopify-store-service';

interface RouteParams {
    params: Promise<{ storeId: string }>;
}

/**
 * GET /api/shopify/stores/[storeId]
 * 
 * Get store details
 */
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { storeId } = await params;

        const result = shopifyStoreService.getStoreById(storeId);

        if (!result.success || !result.data) {
            return NextResponse.json(
                { error: result.error || 'Store not found' },
                { status: 404 }
            );
        }

        // Return store without sensitive data
        const store = result.data;
        return NextResponse.json({
            id: store.id,
            shop: store.shop,
            shopName: store.shopName,
            status: store.status,
            scope: store.scope,
            connectedAt: store.connectedAt,
            lastSyncedAt: store.lastSyncedAt,
            errorMessage: store.errorMessage,
        });

    } catch (error) {
        console.error('Error getting store:', error);
        return NextResponse.json(
            { error: 'Failed to get store' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/shopify/stores/[storeId]
 * 
 * Disconnect/remove store
 */
export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { storeId } = await params;

        const result = shopifyStoreService.removeStore(storeId);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Store disconnected successfully',
        });

    } catch (error) {
        console.error('Error disconnecting store:', error);
        return NextResponse.json(
            { error: 'Failed to disconnect store' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/shopify/stores/[storeId]/verify
 * 
 * Verify store connection is still valid
 */
export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { storeId } = await params;

        // Check if this is a verify action
        const body = await request.json().catch(() => ({}));

        if (body.action === 'verify') {
            const result = await shopifyStoreService.verifyConnection(storeId);

            if (!result.success) {
                return NextResponse.json(
                    { error: result.error },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                connected: result.data,
            });
        }

        return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Error verifying store:', error);
        return NextResponse.json(
            { error: 'Failed to verify store connection' },
            { status: 500 }
        );
    }
}
