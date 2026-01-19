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
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'aiSummary'> & { id?: string }, aiSummary?: Product['aiSummary']) => Promise<Product | null>;
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

      const response = await fetch('/api/products?limit=100', { headers }); // Fetch reasonable batch
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
      const results = [];

      // Process in parallel (or sequential if consistency matters more, but parallel is faster)
      // Limit concurrency if needed, but for 50 items it's fine.
      await Promise.all(products.map(async (prod) => {
        // We assume imported products have IDs. We want to preserve them.
        // addProduct calls the API which now respects ID.
        const { id, createdAt, updatedAt, aiSummary, ...rest } = prod;
        // Pass ID explicitly
        await addProduct({ ...rest, id }, aiSummary);
      }));

      // Refresh list
      await get().fetchProducts();
      set({ isLoading: false });
    } catch (error) {
      console.error('Error importing products:', error);
      set({ error: (error as Error).message, isLoading: false });
      throw error; // Re-throw so UI can show toast failure
    }
  },

  addProduct: async (productData, aiSummary) => {
    set({ isLoading: true, error: null });
    try {
      // Prepare payload to match what API expects (validatedData)
      // The API creates the ID and timestamps, so we just send the fields
      // However, for imports, we might provide an ID, which the API should respect.
      const payload = {
        id: (productData as any).id, // Pass ID if provided (for imports)
        basicInfo: productData.basicInfo,
        attributesAndSpecs: productData.attributesAndSpecs,
        media: productData.media,
        marketingSEO: productData.marketingSEO,
        pricingAndStock: productData.pricingAndStock,
        options: productData.options,
        variants: productData.variants,
        workflowState: productData.workflowState,
        assignedReviewer: productData.assignedReviewer,
        aiSummary: aiSummary,
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
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create product');
      }

      const data = await response.json();
      const newProduct = data.data;

      // Optimistic update or Append result
      set(state => ({
        products: [...state.products, newProduct],
        isLoading: false
      }));

      return newProduct;
    } catch (error) {
      console.error('Error adding product:', error);
      set({ error: (error as Error).message, isLoading: false });
      return null;
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
