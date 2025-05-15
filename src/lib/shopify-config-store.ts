
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ShopifyConfigState {
  storeUrl: string;
  apiKey: string; // Added API Key back
  setStoreUrl: (url: string) => void;
  setApiKey: (key: string) => void; // Added setter for API Key
  isConfigured: () => boolean;
}

export const useShopifyConfigStore = create<ShopifyConfigState>()(
  persist(
    (set, get) => ({
      storeUrl: '',
      apiKey: '', // Initialize API Key
      setStoreUrl: (url) => set({ storeUrl: url }),
      setApiKey: (key) => set({ apiKey: key }), // Implement setter
      isConfigured: () => {
        const { storeUrl, apiKey } = get();
        return !!storeUrl && !!apiKey; // Configuration now depends on both URL and API Key
      }
    }),
    {
      name: 'shopify-config-storage', 
      storage: createJSONStorage(() => localStorage), 
    }
  )
);

