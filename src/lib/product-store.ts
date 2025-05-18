
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, PriceEntry, ProductOption, ProductVariant } from '@/types/product';
import { initialProductData, defaultMultilingualString } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentTenantId } from './tenant';

interface ProductState {
  products: Product[];
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'aiSummary'>, aiSummary?: Product['aiSummary']) => Product;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteProduct: (productId: string) => void;
  findProductById: (productId:string) => Product | undefined;
  importProducts: (newProducts: Product[]) => void;
  setProducts: (products: Product[]) => void;
}

const getProductStorageName = () => {
  const tenantId = getCurrentTenantId(); // For client-side localStorage key
  return `products-storage-${tenantId}`;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      addProduct: (productDataWithoutMeta, aiSummaryArgument) => {
        const newProduct: Product = {
          ...initialProductData,
          ...productDataWithoutMeta,
          id: productDataWithoutMeta.basicInfo.sku || uuidv4(),
          options: productDataWithoutMeta.options || [], // Ensure options is an array
          variants: productDataWithoutMeta.variants || [], // Ensure variants is an array
          aiSummary: aiSummaryArgument || { ...defaultMultilingualString },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedProducts = [...get().products, newProduct];
        set({ products: updatedProducts });
        return newProduct;
      },
      updateProduct: (productId, productUpdateData) => {
        set(state => ({
          products: state.products.map(p => {
            if (p.id === productId) {
              const updatedProduct: Product = {
                ...p, 
                ...productUpdateData, 
                basicInfo: { ...p.basicInfo, ...productUpdateData.basicInfo },
                attributesAndSpecs: { ...p.attributesAndSpecs, ...productUpdateData.attributesAndSpecs },
                media: productUpdateData.media ? { ...p.media, ...productUpdateData.media } : p.media,
                marketingSEO: { ...p.marketingSEO, ...productUpdateData.marketingSEO },
                pricingAndStock: productUpdateData.pricingAndStock ? {
                  ...p.pricingAndStock,
                  ...productUpdateData.pricingAndStock,
                  standardPrice: productUpdateData.pricingAndStock.standardPrice !== undefined ? productUpdateData.pricingAndStock.standardPrice : p.pricingAndStock?.standardPrice || [],
                  salePrice: productUpdateData.pricingAndStock.salePrice !== undefined ? productUpdateData.pricingAndStock.salePrice : p.pricingAndStock?.salePrice || [],
                  costPrice: productUpdateData.pricingAndStock.costPrice !== undefined ? productUpdateData.pricingAndStock.costPrice : p.pricingAndStock?.costPrice || [],
                } : p.pricingAndStock,
                options: productUpdateData.options !== undefined ? [...productUpdateData.options] : p.options || [],
                variants: productUpdateData.variants !== undefined ? [...productUpdateData.variants] : p.variants || [],
                aiSummary: productUpdateData.aiSummary ? { ...p.aiSummary, ...productUpdateData.aiSummary } : p.aiSummary,
                updatedAt: new Date().toISOString(),
              };
              return updatedProduct;
            }
            return p;
          })
        }));
      },
      deleteProduct: (productId) => {
        set(state => ({
          products: state.products.filter(p => p.id !== productId)
        }));
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
            pricingAndStock: np.pricingAndStock ? {
                standardPrice: np.pricingAndStock.standardPrice || existingP?.pricingAndStock?.standardPrice || [],
                salePrice: np.pricingAndStock.salePrice || existingP?.pricingAndStock?.salePrice || [],
                costPrice: np.pricingAndStock.costPrice || existingP?.pricingAndStock?.costPrice || [],
            } : (existingP?.pricingAndStock || { ...(initialProductData.pricingAndStock || { standardPrice: [], salePrice: [], costPrice: [] }) }),
             options: np.options || existingP?.options || [],
             variants: np.variants || existingP?.variants || [],
            updatedAt: new Date().toISOString(),
            createdAt: existingP?.createdAt || new Date().toISOString()
          });
        });

        const updatedProducts = Array.from(productMap.values());
        set({ products: updatedProducts });
      },
      setProducts: (products) => {
        set({ products });
      }
    }),
    {
      name: getProductStorageName(), // Dynamic name based on tenant
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// This effect runs once on client mount to seed example data for default/localhost tenants
if (typeof window !== 'undefined') {
  const tenantId = getCurrentTenantId();
  const productsInitializedKey = `products_initialized-${tenantId}`;
  
  // Defer the check and potential seeding slightly to allow persist middleware to rehydrate
  setTimeout(() => {
    const isAlreadyInitialized = localStorage.getItem(productsInitializedKey);

    if (!isAlreadyInitialized && (tenantId === 'default_host' || tenantId === 'localhost_dev')) {
      localStorage.setItem(productsInitializedKey, 'true'); 
      
      const currentStoreState = useProductStore.getState();
      if (currentStoreState.products.length === 0) { 
        const exampleProduct: Product = {
            id: 'EXAMPLE-SKU-001',
            basicInfo: {
                name: { en: 'Example Laptop (Default)', no: 'Eksempel Bærbar PC (Standard)' },
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
                images: [{ id: uuidv4(), url: 'https://placehold.co/600x400.png', altText: { en: 'Laptop front view', no: 'Bærbar PC forfra' }, type: 'image', dataAiHint: 'laptop' }],
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
            options: [
              { id: uuidv4(), name: "Color", values: ["Silver", "Space Gray"]},
              { id: uuidv4(), name: "Storage", values: ["256GB", "512GB"]}
            ],
            variants: [
              { id: uuidv4(), sku: "EX-LT-SIL-256", optionValues: {"Color": "Silver", "Storage": "256GB"}, standardPrice: [{id: uuidv4(), amount: 9999, currency: 'NOK'}], salePrice: []},
              { id: uuidv4(), sku: "EX-LT-SIL-512", optionValues: {"Color": "Silver", "Storage": "512GB"}, standardPrice: [{id: uuidv4(), amount: 10999, currency: 'NOK'}], salePrice: []},
              { id: uuidv4(), sku: "EX-LT-GRY-256", optionValues: {"Color": "Space Gray", "Storage": "256GB"}, standardPrice: [{id: uuidv4(), amount: 9999, currency: 'NOK'}], salePrice: []},
              { id: uuidv4(), sku: "EX-LT-GRY-512", optionValues: {"Color": "Space Gray", "Storage": "512GB"}, standardPrice: [{id: uuidv4(), amount: 10999, currency: 'NOK'}], salePrice: []}
            ],
            aiSummary: { en: 'A high-performance Silver laptop with 16GB RAM and 512GB SSD.', no: 'En høytytende sølvfarget bærbar PC med 16 GB RAM og 512 GB SSD.' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        currentStoreState.setProducts([exampleProduct]);
        console.log(`Seeded example product for tenant: ${tenantId} because store was empty after initialization and init flag not set.`);
      }
    }
  }, 100); 
}
