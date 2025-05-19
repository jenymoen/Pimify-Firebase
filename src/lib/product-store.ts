
import { create } from 'zustand';
import type { Product } from '@/types/product';
import { initialProductData, defaultMultilingualString } from '@/types/product'; 
import { v4 as uuidv4 } from 'uuid';

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'aiSummary'>, aiSummary?: Product['aiSummary']) => Promise<Product | null>;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<Product | null>;
  deleteProduct: (productId: string) => Promise<void>;
  findProductById: (productId: string) => Product | undefined; 
  setProducts: (products: Product[]) => void; 
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Failed to fetch products: ${response.statusText}` }));
        throw new Error(errorData.error || `Failed to fetch products: ${response.statusText}`);
      }
      const data: Product[] = await response.json();
      set({ products: data, isLoading: false });
    } catch (err: any) {
      console.error("Error fetching products:", err);
      set({ error: err.message, isLoading: false, products: [] }); 
    }
  },
  addProduct: async (productDataWithoutMeta, aiSummaryArgument) => {
    set({ isLoading: true, error: null });
    const payloadForApi = { 
        ...productDataWithoutMeta,
        options: productDataWithoutMeta.options || [], // Ensure options is an array
        variants: productDataWithoutMeta.variants || [], // Ensure variants is an array
        aiSummary: aiSummaryArgument || { ...defaultMultilingualString },
    };
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadForApi),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Failed to add product: ${response.statusText}` }));
        throw new Error(errorData.error || `Failed to add product: ${response.statusText}`);
      }
      const newProduct: Product = await response.json();
      set(state => ({
        products: [...state.products, newProduct],
        isLoading: false,
      }));
      return newProduct;
    } catch (err: any) {
      console.error("Error adding product:", err);
      set({ error: err.message, isLoading: false });
      return null;
    }
  },
  updateProduct: async (productId, productUpdateData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productUpdateData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Failed to update product: ${response.statusText}` }));
        throw new Error(errorData.error || `Failed to update product: ${response.statusText}`);
      }
      const updatedProduct: Product = await response.json();
      set(state => ({
        products: state.products.map(p => (p.id === productId ? updatedProduct : p)),
        isLoading: false,
      }));
      return updatedProduct;
    } catch (err: any) {
      console.error("Error updating product:", err);
      set({ error: err.message, isLoading: false });
      return null;
    }
  },
  deleteProduct: async (productId) => {
    set({ isLoading: true, error: null }); // Re-enabled loading state
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ error: `Failed to delete product: ${response.statusText}` }));
        throw new Error(errorData.error || `Failed to delete product: ${response.statusText}`);
      }
      set(state => ({
        products: state.products.filter(p => p.id !== productId),
        isLoading: false,
      }));
    } catch (err: any) {
      console.error("Error deleting product:", err); // This will log the error (e.g., "Product not found for deletion")
      set({ error: err.message, isLoading: false });
      throw err; // Re-throw to allow UI to catch and display it
    }
  },
  findProductById: (productId) => {
    return get().products.find(p => p.id === productId);
  },
  setProducts: (products) => { 
    set({ products, isLoading: false, error: null });
  }
}));
