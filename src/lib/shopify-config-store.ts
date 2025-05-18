
'use client';

import { create } from 'zustand';

interface ShopifyConfig {
  storeUrl: string;
  apiKey: string;
}

interface ShopifyConfigState extends ShopifyConfig {
  isFetched: boolean; // To know if config has been fetched initially
  isLoading: boolean;
  error: string | null;
  setStoreUrl: (url: string) => void; // Still allow local update before save
  setApiKey: (key: string) => void;   // Still allow local update before save
  fetchShopifyConfig: () => Promise<void>;
  saveShopifyConfig: (config: ShopifyConfig) => Promise<void>;
  isConfigured: () => boolean;
}

export const useShopifyConfigStore = create<ShopifyConfigState>((set, get) => ({
  storeUrl: '',
  apiKey: '',
  isFetched: false,
  isLoading: false,
  error: null,
  setStoreUrl: (url) => set({ storeUrl: url }),
  setApiKey: (key) => set({ apiKey: key }),
  fetchShopifyConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/shopify/config');
      if (!response.ok) {
        throw new Error('Failed to fetch Shopify config');
      }
      const config: ShopifyConfig = await response.json();
      set({ ...config, isFetched: true, isLoading: false });
    } catch (err: any) {
      console.error("Error fetching Shopify config:", err);
      set({ error: err.message, isLoading: false, isFetched: true }); // isFetched true to prevent re-fetch loop
    }
  },
  saveShopifyConfig: async (config) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/shopify/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        throw new Error('Failed to save Shopify config');
      }
      // Assuming API returns a success message, we've already updated state optimistically via setStoreUrl/setApiKey
      // Or, we could re-fetch if API returns the saved config:
      // const savedConfig = await response.json();
      // set({ ...savedConfig, isLoading: false });
      set({ isLoading: false }); // Simple approach: just stop loading
    } catch (err: any) {
      console.error("Error saving Shopify config:", err);
      set({ error: err.message, isLoading: false });
      throw err; // Re-throw for the caller to handle
    }
  },
  isConfigured: () => {
    const { storeUrl, apiKey } = get();
    return !!storeUrl && !!apiKey;
  }
}));
