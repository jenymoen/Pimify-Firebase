
import { create } from 'zustand';
import type { Product } from '@/types/product'; // Ensure 'type' import for Product if it's only a type
import { initialProductData, defaultMultilingualString } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';

interface ProductState {
  products: Product[];
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'aiSummary'>, aiSummary?: Product['aiSummary']) => Product;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteProduct: (productId: string) => void;
  findProductById: (productId: string) => Product | undefined;
  importProducts: (newProducts: Product[]) => void;
  setProducts: (products: Product[]) => void;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [], // Initialize with an empty array for server/client consistency
  addProduct: (productData, aiSummary) => {
    const newProduct: Product = {
      ...initialProductData,
      ...productData,
      id: productData.basicInfo.sku || uuidv4(),
      aiSummary: aiSummary || { ...defaultMultilingualString },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedProducts = [...get().products, newProduct];
    if (typeof window !== 'undefined') {
      localStorage.setItem('products', JSON.stringify(updatedProducts));
    }
    set({ products: updatedProducts });
    return newProduct;
  },
  updateProduct: (productId, productUpdate) => {
    const updatedProducts = get().products.map(p =>
      p.id === productId ? { ...p, ...productUpdate, updatedAt: new Date().toISOString() } : p
    );
    if (typeof window !== 'undefined') {
      localStorage.setItem('products', JSON.stringify(updatedProducts));
    }
    set({ products: updatedProducts });
  },
  deleteProduct: (productId) => {
    const updatedProducts = get().products.filter(p => p.id !== productId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('products', JSON.stringify(updatedProducts));
    }
    set({ products: updatedProducts });
  },
  findProductById: (productId) => {
    return get().products.find(p => p.id === productId);
  },
  importProducts: (newProducts) => {
    if (!Array.isArray(newProducts)) {
      console.error("Import failed: data is not an array.");
      return;
    }
    const existingProducts = get().products;
    const productMap = new Map(existingProducts.map(p => [p.id, p]));

    newProducts.forEach(np => {
      const id = np.id || np.basicInfo?.sku || uuidv4(); // Ensure an ID exists or is generated
      productMap.set(id, { 
        ...initialProductData, // ensure all fields are present
        ...productMap.get(id), // existing data
        ...np, // new data
        id, // ensure id is set
        updatedAt: new Date().toISOString(),
        createdAt: productMap.get(id)?.createdAt || new Date().toISOString() // preserve original creation date if updating
      });
    });
    
    const updatedProducts = Array.from(productMap.values());
    if (typeof window !== 'undefined') {
      localStorage.setItem('products', JSON.stringify(updatedProducts));
    }
    set({ products: updatedProducts });
  },
  setProducts: (products) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('products', JSON.stringify(products));
    }
    set({ products });
  }
}));

// Example initial product for testing (optional)
// This logic runs on the client after the store is created.
// It seeds localStorage if it's the first time and products are not already there.
if (typeof window !== 'undefined') {
  const productsInitialized = localStorage.getItem('products_initialized');
  const currentProducts = localStorage.getItem('products');

  if (!productsInitialized || (!currentProducts || JSON.parse(currentProducts).length === 0)) {
    const exampleProduct: Product = {
      id: 'EXAMPLE-SKU-001',
      basicInfo: {
        name: { en: 'Example Laptop', no: 'Eksempel Bærbar PC' },
        sku: 'EXAMPLE-SKU-001',
        gtin: '1234567890123',
        descriptionShort: { en: 'A powerful and versatile laptop.', no: 'En kraftig og allsidig bærbar PC.' },
        descriptionLong: { en: 'This laptop features the latest generation processor, a stunning display, and long battery life, perfect for work and play.', no: 'Denne bærbare PC-en har siste generasjons prosessor, en fantastisk skjerm og lang batterilevetid, perfekt for arbeid og fritid.' },
        brand: 'TechBrand',
        status: 'active',
        launchDate: '2023-01-15T00:00:00.000Z',
      },
      attributesAndSpecs: {
        categories: ['Electronics', 'Computers', 'Laptops'],
        properties: [
          { id: uuidv4(), key: 'Color', value: 'Silver' },
          { id: uuidv4(), key: 'RAM', value: '16GB' },
          { id: uuidv4(), key: 'Storage', value: '512GB SSD' },
        ],
        technicalSpecs: [
          { id: uuidv4(), key: 'Processor', value: 'Intel Core i7 12th Gen' },
          { id: uuidv4(), key: 'Screen Size', value: '14 inch' },
          { id: uuidv4(), key: 'Weight', value: '1.3 kg' },
        ],
        countryOfOrigin: 'China',
      },
      media: {
        images: [{ id: uuidv4(), url: 'https://placehold.co/600x400.png', altText: { en: 'Laptop front view', no: 'Bærbar PC forfra' }, type: 'image'  }],
      },
      marketingSEO: {
        seoTitle: { en: 'Buy Example Laptop | TechBrand', no: 'Kjøp Eksempel Bærbar PC | TechBrand' },
        seoDescription: { en: 'Get the best deals on the Example Laptop. High performance, great value.', no: 'Få de beste tilbudene på Eksempel Bærbar PC. Høy ytelse, god verdi.' },
        keywords: ['laptop', 'computer', 'TechBrand', 'notebook', 'bærbar pc'],
      },
      aiSummary: { en: 'A high-performance Silver laptop with 16GB RAM and 512GB SSD.', no: 'En høytytende sølvfarget bærbar PC med 16 GB RAM og 512 GB SSD.' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Use the store's setProducts action to ensure localStorage is updated correctly by the store itself
    useProductStore.getState().setProducts([exampleProduct]);
    localStorage.setItem('products_initialized', 'true');
  }
}
