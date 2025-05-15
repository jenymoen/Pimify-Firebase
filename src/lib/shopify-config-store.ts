
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ShopifyConfigState {
  storeUrl: string;
  apiKey: string;
  setStoreUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  isConfigured: () => boolean;
}

export const useShopifyConfigStore = create<ShopifyConfigState>()(
  persist(
    (set, get) => ({
      storeUrl: '',
      apiKey: '',
      setStoreUrl: (url) => set({ storeUrl: url }),
      setApiKey: (key) => set({ apiKey: key }),
      isConfigured: () => {
        const { storeUrl, apiKey } = get();
        return !!(storeUrl && apiKey);
      }
    }),
    {
      name: 'shopify-config-storage', 
      storage: createJSONStorage(() => localStorage), 
    }
  )
);
