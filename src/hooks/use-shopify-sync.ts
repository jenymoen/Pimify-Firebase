/**
 * Shopify Sync React Query Hooks
 * 
 * Hooks for product synchronization with Shopify
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Product } from '@/types/product';

/**
 * Sync result from API
 */
export interface SyncResultResponse {
    success: boolean;
    productId: string;
    storeId: string;
    shopifyProductId?: number;
    action: 'created' | 'updated' | 'skipped';
    error?: string;
    timestamp: string;
}

/**
 * Push product to Shopify
 */
export function usePushToShopify() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ product, storeId }: { product: Product; storeId: string }) => {
            const res = await fetch('/api/shopify/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product, storeId }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Failed to sync with Shopify' }));
                throw new Error(err.error || 'Failed to sync with Shopify');
            }

            return res.json();
        },
        onSuccess: (data, variables) => {
            // Invalidate product queries to refresh sync status
            queryClient.invalidateQueries({ queryKey: ['products', variables.product.id] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

/**
 * Bulk push products to Shopify
 */
export function useBulkPushToShopify() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ products, storeId }: { products: Product[]; storeId: string }) => {
            const res = await fetch('/api/shopify/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ products, storeId }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Failed to bulk sync with Shopify' }));
                throw new Error(err.error || 'Failed to bulk sync with Shopify');
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}

/**
 * Pull product data from Shopify
 */
export function usePullFromShopify() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ product, storeId }: { product: Product; storeId: string }) => {
            const params = new URLSearchParams({
                productId: product.id,
                storeId,
                product: JSON.stringify(product),
            });

            const res = await fetch(`/api/shopify/sync?${params}`);

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Failed to pull from Shopify' }));
                throw new Error(err.error || 'Failed to pull from Shopify');
            }

            return res.json();
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['products', variables.product.id] });
        },
    });
}
