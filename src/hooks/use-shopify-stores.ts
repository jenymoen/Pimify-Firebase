/**
 * Shopify React Query Hooks
 * 
 * Hooks for managing Shopify store connections and sync operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Shopify store type (from API response)
 */
export interface ShopifyStoreInfo {
    id: string;
    shop: string;
    shopName: string;
    status: 'connected' | 'disconnected' | 'error';
    connectedAt: string;
    lastSyncedAt?: string;
    errorMessage?: string;
}

/**
 * Query keys for Shopify operations
 */
const QUERY_KEYS = {
    stores: ['shopify', 'stores'] as const,
    store: (id: string) => ['shopify', 'stores', id] as const,
};

/**
 * Fetch all connected Shopify stores
 */
export function useShopifyStores() {
    return useQuery<{ stores: ShopifyStoreInfo[]; total: number }>({
        queryKey: QUERY_KEYS.stores,
        queryFn: async () => {
            const res = await fetch('/api/shopify/stores');
            if (!res.ok) throw new Error('Failed to fetch stores');
            return res.json();
        },
    });
}

/**
 * Fetch single store details
 */
export function useShopifyStore(storeId: string, enabled = true) {
    return useQuery<ShopifyStoreInfo>({
        queryKey: QUERY_KEYS.store(storeId),
        queryFn: async () => {
            const res = await fetch(`/api/shopify/stores/${storeId}`);
            if (!res.ok) throw new Error('Failed to fetch store');
            return res.json();
        },
        enabled: enabled && !!storeId,
    });
}

/**
 * Complete store connection (after OAuth callback)
 */
export function useCompleteStoreConnection() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/shopify/stores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Failed to complete connection' }));
                throw new Error(err.error || 'Failed to complete connection');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stores });
        },
    });
}

/**
 * Disconnect a Shopify store
 */
export function useDisconnectStore() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (storeId: string) => {
            const res = await fetch(`/api/shopify/stores/${storeId}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Failed to disconnect store' }));
                throw new Error(err.error || 'Failed to disconnect store');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stores });
        },
    });
}

/**
 * Verify store connection
 */
export function useVerifyStoreConnection() {
    return useMutation({
        mutationFn: async (storeId: string) => {
            const res = await fetch(`/api/shopify/stores/${storeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify' }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Failed to verify connection' }));
                throw new Error(err.error || 'Failed to verify connection');
            }
            return res.json();
        },
    });
}
