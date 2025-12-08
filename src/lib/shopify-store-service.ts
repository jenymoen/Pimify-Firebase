/**
 * Shopify Store Service
 * 
 * Manages multiple Shopify store connections including:
 * - Store CRUD operations
 * - Token encryption/decryption
 * - Connection status management
 */

import * as crypto from 'crypto';

/**
 * Shopify store connection status
 */
export type ShopifyStoreStatus = 'connected' | 'disconnected' | 'error';

/**
 * Shopify store configuration
 */
export interface ShopifyStore {
    id: string;
    shop: string; // mystore.myshopify.com
    shopName: string; // Display name
    encryptedToken: string;
    scope: string;
    status: ShopifyStoreStatus;
    connectedAt: string;
    lastSyncedAt?: string;
    errorMessage?: string;
}

/**
 * Store input for adding a new store
 */
export interface AddStoreInput {
    shop: string;
    shopName: string;
    encryptedToken: string;
    scope: string;
}

/**
 * Result type for service operations
 */
export interface StoreServiceResult<T = void> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Shopify Store Service Class
 */
export class ShopifyStoreService {
    private stores: Map<string, ShopifyStore> = new Map();
    private storesByShop: Map<string, string> = new Map(); // shop -> id mapping
    private encryptionKey: string;

    constructor() {
        this.encryptionKey = process.env.ENCRYPTION_KEY || process.env.SHOPIFY_API_SECRET || 'default-dev-key';
    }

    /**
     * Generate a unique store ID
     */
    private generateId(): string {
        return `store_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    /**
     * Add a new Shopify store connection
     */
    addStore(input: AddStoreInput): StoreServiceResult<ShopifyStore> {
        // Check if store already exists
        if (this.storesByShop.has(input.shop)) {
            return {
                success: false,
                error: `Store ${input.shop} is already connected`,
            };
        }

        const store: ShopifyStore = {
            id: this.generateId(),
            shop: input.shop,
            shopName: input.shopName,
            encryptedToken: input.encryptedToken,
            scope: input.scope,
            status: 'connected',
            connectedAt: new Date().toISOString(),
        };

        this.stores.set(store.id, store);
        this.storesByShop.set(store.shop, store.id);

        return { success: true, data: store };
    }

    /**
     * Get a store by ID
     */
    getStoreById(storeId: string): StoreServiceResult<ShopifyStore> {
        const store = this.stores.get(storeId);
        if (!store) {
            return { success: false, error: 'Store not found' };
        }
        return { success: true, data: store };
    }

    /**
     * Get a store by shop domain
     */
    getStoreByShop(shop: string): StoreServiceResult<ShopifyStore> {
        const storeId = this.storesByShop.get(shop);
        if (!storeId) {
            return { success: false, error: 'Store not found' };
        }
        return this.getStoreById(storeId);
    }

    /**
     * List all connected stores
     */
    listStores(): StoreServiceResult<ShopifyStore[]> {
        const stores = Array.from(this.stores.values());
        return { success: true, data: stores };
    }

    /**
     * Remove a store connection
     */
    removeStore(storeId: string): StoreServiceResult {
        const store = this.stores.get(storeId);
        if (!store) {
            return { success: false, error: 'Store not found' };
        }

        this.stores.delete(storeId);
        this.storesByShop.delete(store.shop);

        return { success: true };
    }

    /**
     * Update store status
     */
    updateStoreStatus(
        storeId: string,
        status: ShopifyStoreStatus,
        errorMessage?: string
    ): StoreServiceResult<ShopifyStore> {
        const store = this.stores.get(storeId);
        if (!store) {
            return { success: false, error: 'Store not found' };
        }

        store.status = status;
        store.errorMessage = status === 'error' ? errorMessage : undefined;
        this.stores.set(storeId, store);

        return { success: true, data: store };
    }

    /**
     * Update last synced timestamp
     */
    updateLastSynced(storeId: string): StoreServiceResult<ShopifyStore> {
        const store = this.stores.get(storeId);
        if (!store) {
            return { success: false, error: 'Store not found' };
        }

        store.lastSyncedAt = new Date().toISOString();
        this.stores.set(storeId, store);

        return { success: true, data: store };
    }

    /**
     * Decrypt an access token
     */
    decryptToken(encryptedToken: string): string {
        try {
            const [ivHex, encrypted] = encryptedToken.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Token decryption failed:', error);
            throw new Error('Failed to decrypt access token');
        }
    }

    /**
     * Get decrypted access token for a store
     */
    getAccessToken(storeId: string): StoreServiceResult<string> {
        const store = this.stores.get(storeId);
        if (!store) {
            return { success: false, error: 'Store not found' };
        }

        try {
            const token = this.decryptToken(store.encryptedToken);
            return { success: true, data: token };
        } catch (error) {
            return { success: false, error: 'Failed to decrypt token' };
        }
    }

    /**
     * Verify store connection is still valid
     */
    async verifyConnection(storeId: string): Promise<StoreServiceResult<boolean>> {
        const tokenResult = this.getAccessToken(storeId);
        if (!tokenResult.success || !tokenResult.data) {
            return { success: false, error: tokenResult.error };
        }

        const store = this.stores.get(storeId);
        if (!store) {
            return { success: false, error: 'Store not found' };
        }

        try {
            const response = await fetch(`https://${store.shop}/admin/api/2024-01/shop.json`, {
                headers: {
                    'X-Shopify-Access-Token': tokenResult.data,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                this.updateStoreStatus(storeId, 'connected');
                return { success: true, data: true };
            } else if (response.status === 401) {
                this.updateStoreStatus(storeId, 'error', 'Access token expired or revoked');
                return { success: true, data: false };
            } else {
                this.updateStoreStatus(storeId, 'error', `API error: ${response.status}`);
                return { success: true, data: false };
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Connection failed';
            this.updateStoreStatus(storeId, 'error', message);
            return { success: false, error: message };
        }
    }

    /**
     * Get store count
     */
    getStoreCount(): number {
        return this.stores.size;
    }

    /**
     * Check if any stores are connected
     */
    hasConnectedStores(): boolean {
        return Array.from(this.stores.values()).some(s => s.status === 'connected');
    }
}

// Singleton instance with global persistence for development
const globalForService = global as unknown as { shopifyStoreService: ShopifyStoreService };

export const shopifyStoreService = globalForService.shopifyStoreService || new ShopifyStoreService();

if (process.env.NODE_ENV !== 'production') {
    globalForService.shopifyStoreService = shopifyStoreService;
}

export default ShopifyStoreService;
