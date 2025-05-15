
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ShopifyConfigState {
  storeUrl: string;
  setStoreUrl: (url: string) => void;
  isConfigured: () => boolean;
}

export const useShopifyConfigStore = create<ShopifyConfigState>()(
  persist(
    (set, get) => ({
      storeUrl: '',
      setStoreUrl: (url) => set({ storeUrl: url }),
      isConfigured: () => {
        const { storeUrl } = get();
        // API Key is now managed server-side via environment variables
        return !!storeUrl; 
      }
    }),
    {
      name: 'shopify-config-storage', 
      storage: createJSONStorage(() => localStorage), 
    }
  )
);
