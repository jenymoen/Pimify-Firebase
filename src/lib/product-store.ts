
import { create } from 'zustand';
import type { Product, PriceEntry } from '@/types/product'; 
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
  products: [], 
  addProduct: (productData, aiSummary) => {
    const newProduct: Product = {
      ...initialProductData, // Start with initialProductData to ensure all fields are present
      ...productData, // Then spread the incoming productData
      id: productData.basicInfo.sku || uuidv4(), // Ensure ID based on SKU or generate new
      aiSummary: aiSummary || { ...defaultMultilingualString },
      // Ensure pricingAndStock is initialized if not provided fully by productData
      pricingAndStock: productData.pricingAndStock ? {
        standardPrice: productData.pricingAndStock.standardPrice || [],
        salePrice: productData.pricingAndStock.salePrice || [],
        costPrice: productData.pricingAndStock.costPrice || [],
      } : { ...initialProductData.pricingAndStock },
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
      p.id === productId ? { 
        ...p, 
        ...productUpdate, 
        // Ensure pricingAndStock structure is preserved if partially updated
        pricingAndStock: productUpdate.pricingAndStock ? {
            ...p.pricingAndStock,
            ...productUpdate.pricingAndStock,
            standardPrice: productUpdate.pricingAndStock.standardPrice || p.pricingAndStock?.standardPrice || [],
            salePrice: productUpdate.pricingAndStock.salePrice || p.pricingAndStock?.salePrice || [],
            costPrice: productUpdate.pricingAndStock.costPrice || p.pricingAndStock?.costPrice || [],
        } : p.pricingAndStock,
        updatedAt: new Date().toISOString() 
      } : p
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
      const id = np.id || np.basicInfo?.sku || uuidv4(); 
      const existingP = productMap.get(id);
      productMap.set(id, { 
        ...initialProductData, 
        ...existingP, 
        ...np, 
        id, 
        // Ensure pricingAndStock is merged correctly
        pricingAndStock: np.pricingAndStock ? {
            standardPrice: np.pricingAndStock.standardPrice || existingP?.pricingAndStock?.standardPrice || [],
            salePrice: np.pricingAndStock.salePrice || existingP?.pricingAndStock?.salePrice || [],
            costPrice: np.pricingAndStock.costPrice || existingP?.pricingAndStock?.costPrice || [],
        } : (existingP?.pricingAndStock || initialProductData.pricingAndStock),
        updatedAt: new Date().toISOString(),
        createdAt: existingP?.createdAt || new Date().toISOString() 
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
      pricingAndStock: {
        standardPrice: [{id: uuidv4(), amount: 9999, currency: 'NOK'}],
        salePrice: [{id: uuidv4(), amount: 8999, currency: 'NOK'}],
        costPrice: [{id: uuidv4(), amount: 6000, currency: 'NOK'}],
      },
      aiSummary: { en: 'A high-performance Silver laptop with 16GB RAM and 512GB SSD.', no: 'En høytytende sølvfarget bærbar PC med 16 GB RAM og 512 GB SSD.' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    useProductStore.getState().setProducts([exampleProduct]);
    localStorage.setItem('products_initialized', 'true');
  }
}
