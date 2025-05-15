import { create } from 'zustand';
import { Product, initialProductData } from '@/types/product';
import { v4 as uuidv4 } from 'uuid'; // Using uuid for generating unique IDs

// For this example, we'll use uuid. In a real app, you might need to install it:
// npm install uuid
// npm install @types/uuid

interface ProductState {
  products: Product[];
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'aiSummary'>, aiSummary?: Product['aiSummary']) => Product;
  updateProduct: (productId: string, productData: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  findProductById: (productId: string) => Product | undefined;
  importProducts: (newProducts: Product[]) => void;
  setProducts: (products: Product[]) => void; // For initializing or replacing all products
}

const getInitialProducts = (): Product[] => {
  if (typeof window !== 'undefined') {
    const storedProducts = localStorage.getItem('products');
    if (storedProducts) {
      try {
        return JSON.parse(storedProducts);
      } catch (error) {
        console.error("Failed to parse products from localStorage", error);
        return [];
      }
    }
  }
  return [];
};

export const useProductStore = create<ProductState>((set, get) => ({
  products: getInitialProducts(),
  addProduct: (productData, aiSummary) => {
    const newProduct: Product = {
      ...initialProductData, // Spread initial structure first
      ...productData,         // Then spread new product data
      id: productData.basicInfo.sku || uuidv4(), // Use SKU as ID if available, else generate UUID
      aiSummary: aiSummary || { en: '', no: '' },
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
    // Basic validation: ensure newProducts is an array
    if (!Array.isArray(newProducts)) {
      console.error("Import failed: data is not an array.");
      return;
    }
    // Simple merge: add new products, update existing ones by ID
    const existingProducts = get().products;
    const productMap = new Map(existingProducts.map(p => [p.id, p]));

    newProducts.forEach(np => {
      if (typeof np.id === 'string') { // Check if product has an ID
         productMap.set(np.id, { ...productMap.get(np.id), ...np, updatedAt: new Date().toISOString() });
      } else {
        // If no ID, treat as new product with a generated ID (or handle error)
        const newId = uuidv4();
        productMap.set(newId, {...initialProductData, ...np, id: newId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
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
    set({products});
  }
}));

// Ensure uuid is available or use a simpler ID generation for client-side.
// Example initial product for testing (optional)
if (typeof window !== 'undefined' && !localStorage.getItem('products_initialized')) {
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
  useProductStore.getState().setProducts([exampleProduct]);
  localStorage.setItem('products_initialized', 'true');
}

// Add uuid to dependencies if not already present:
// package.json: "uuid": "^9.0.0", "@types/uuid": "^9.0.0"
// (Assuming it's okay to suggest adding dependencies if critical like this for core functionality)
// For now, as per instructions, I won't modify package.json. If uuid is not found, this will error.
// Let's use Math.random for a simpler ID if uuid is problematic for the scaffold.
// Switched to SKU or uuid for ID generation.
