
'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCurrentTenantId } from './tenant';

interface ShopifyConfigState {
  storeUrl: string;
  apiKey: string;
  setStoreUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  isConfigured: () => boolean;
}

// Function to get the dynamic storage name
const getShopifyConfigStorageName = () => {
  const tenantId = getCurrentTenantId();
  return `shopify-config-storage-${tenantId}`;
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
        return !!storeUrl && !!apiKey;
      }
    }),
    {
      name: getShopifyConfigStorageName(), // Use dynamic name
      storage: createJSONStorage(() => localStorage), 
      // onRehydrateStorage: () => { // Optional: useful for debugging
      //   console.log(`Shopify config store for tenant "${getCurrentTenantId()}" rehydrated.`);
      //   return (state, error) => {
      //     if (error) {
      //       console.error(`An error occurred during Shopify config store rehydration for tenant "${getCurrentTenantId()}":`, error);
      //     }
      //   };
      // }
    }
  )
);
