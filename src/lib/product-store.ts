import { create } from 'zustand';
import type { Product } from '@/types/product';
import { initialProductData, defaultMultilingualString } from '@/types/product';
import { calculateQualityMetrics } from './product-quality';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProducts: () => Promise<void>;
  addProduct: (productData: (Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'aiSummary'> & { id?: string; createdAt?: string; updatedAt?: string; aiSummary?: Product['aiSummary'] }) | any, aiSummary?: Product['aiSummary']) => Promise<Product | null>;
  importProducts: (products: Product[]) => Promise<void>;
  updateProduct: (productId: string, productData: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  recalculateAllQuality: () => void; // Added back to fix runtime crash

  // Helpers (synchronous lookup from state)
  findProductById: (productId: string) => Product | undefined;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/products?all=true', { headers });
      if (!response.ok) {
        console.error(`Fetch failed: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.error('Response body:', text);
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data.products)) {
        set({ products: data.data.products, isLoading: false });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  importProducts: async (products) => {
    set({ isLoading: true, error: null });
    try {
      const { addProduct } = get();
      const errors: string[] = [];
      let successCount = 0;

      for (const prod of products) {
        try {
          const { id, createdAt, updatedAt, aiSummary, ...rest } = prod;
          await addProduct({ ...rest, id, createdAt, updatedAt }, aiSummary);
          successCount++;
        } catch (err: any) {
          const identifier = prod.basicInfo?.sku || (prod as any).sku || prod.basicInfo?.name?.en || (prod as any).name || prod.id || 'Unknown';
          errors.push(`[${identifier}]: ${err.message || 'Validation failed'}`);
        }
      }

      // Refresh list
      await get().fetchProducts();
      set({ isLoading: false });

      if (errors.length > 0) {
        const summary = `${successCount} products imported, ${errors.length} failed:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''}`;
        throw new Error(summary);
      }
    } catch (error) {
      console.error('Error importing products:', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error; // Re-throw so UI can show toast failure
    }
  },

  addProduct: async (productData, aiSummary) => {
    set({ isLoading: true, error: null });
    try {
      // Prepare payload and normalize fields if flat structure was provided
      const rawBasic = productData.basicInfo || {};
      const nameVal = rawBasic.name || (productData as any).name;
      const name = typeof nameVal === 'string'
        ? { en: nameVal, no: nameVal }
        : (nameVal || { en: '', no: '' });

      const descShortVal = rawBasic.descriptionShort || (productData as any).descriptionShort;
      const descriptionShort = typeof descShortVal === 'string'
        ? { en: descShortVal, no: descShortVal }
        : (descShortVal || { en: '', no: '' });

      const descLongVal = rawBasic.descriptionLong || (productData as any).descriptionLong;
      const descriptionLong = typeof descLongVal === 'string'
        ? { en: descLongVal, no: descLongVal }
        : (descLongVal || { en: '', no: '' });

      const payload = {
        ...productData,
        id: (productData as any).id,
        basicInfo: {
          ...rawBasic,
          name,
          sku: rawBasic.sku ?? (productData as any).sku ?? '',
          gtin: rawBasic.gtin ?? (productData as any).gtin ?? undefined,
          brand: rawBasic.brand ?? (productData as any).brand ?? '',
          status: rawBasic.status ?? (productData as any).status ?? 'development',
          descriptionShort,
          descriptionLong,
        },
        aiSummary: aiSummary || (productData as any).aiSummary,
      };

      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Failed to create product' }));
        const detailsStr = errData.details
          ? (typeof errData.details === 'object' ? JSON.stringify(errData.details) : String(errData.details))
          : '';
        const errorMessage = errData.error
          ? (detailsStr ? `${errData.error} (${detailsStr})` : errData.error)
          : 'Failed to create product';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const newProduct = data.data;

      // Optimistic update or Append result
      set(state => ({
        // Upsert: re-importing an existing id overwrites it server-side, so replace instead of appending
        products: [...state.products.filter(p => p.id !== newProduct.id), newProduct],
        isLoading: false
      }));

      return newProduct;
    } catch (error) {
      console.error('Error adding product:', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateProduct: async (productId, productUpdateData) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(productUpdateData),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update product');
      }

      const data = await response.json();
      const updatedProduct = data.data;

      set(state => ({
        products: state.products.map(p => p.id === productId ? updatedProduct : p),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error updating product:', error);
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteProduct: async (productId) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('accessToken');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        let errorMessage = `Failed to delete product (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('Delete product error response:', errorData);
        } catch (e) {
          console.error('Delete product error (non-JSON response):', response.statusText);
        }
        throw new Error(errorMessage);
      }

      set(state => ({
        products: state.products.filter(p => p.id !== productId),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error deleting product:', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error; // Re-throw so UI can handle it
    }
  },

  recalculateAllQuality: () => {
    set(state => ({
      products: state.products.map(product => ({
        ...product,
        qualityMetrics: calculateQualityMetrics(product)
      }))
    }));
  },

  findProductById: (productId) => {
    return get().products.find(p => p.id === productId);
  },
}));
