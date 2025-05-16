
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

// Function to get the dynamic storage name
const getProductStorageName = () => {
  const tenantId = getCurrentTenantId();
  return `products-storage-${tenantId}`;
}

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      addProduct: (productDataWithoutMeta, aiSummaryArgument) => {
        const newProduct: Product = {
          // Start with initialProductData for all defaults
          ...initialProductData,

          // Explicitly spread known top-level sections from productDataWithoutMeta
          basicInfo: productDataWithoutMeta.basicInfo,
          attributesAndSpecs: productDataWithoutMeta.attributesAndSpecs,
          media: productDataWithoutMeta.media,
          marketingSEO: productDataWithoutMeta.marketingSEO,

          // Handle pricingAndStock carefully (it's optional on Product)
          pricingAndStock: productDataWithoutMeta.pricingAndStock ? {
            standardPrice: productDataWithoutMeta.pricingAndStock.standardPrice || [],
            salePrice: productDataWithoutMeta.pricingAndStock.salePrice || [],
            costPrice: productDataWithoutMeta.pricingAndStock.costPrice || [],
          } : { ...(initialProductData.pricingAndStock || { standardPrice: [], salePrice: [], costPrice: [] }) }, // Ensure fallback has arrays

          // Crucially, include options and variants from productDataWithoutMeta
          options: productDataWithoutMeta.options || [], // Ensure it's an array
          variants: productDataWithoutMeta.variants || [], // Ensure it's an array

          // Relations are not yet in the form, but good practice to include if they were
          relations: productDataWithoutMeta.relations || initialProductData.relations,
          localizationNorway: productDataWithoutMeta.localizationNorway || initialProductData.localizationNorway,

          // Now set the metadata
          id: productDataWithoutMeta.basicInfo.sku || uuidv4(), // Use SKU or generate new ID
          aiSummary: aiSummaryArgument || { ...defaultMultilingualString }, // Use passed aiSummary
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedProducts = [...get().products, newProduct];
        set({ products: updatedProducts });
        return newProduct;
      },
      updateProduct: (productId, productUpdate) => {
        set(state => ({
          products: state.products.map(p =>
            p.id === productId ? {
              ...p,
              ...productUpdate,
              pricingAndStock: productUpdate.pricingAndStock ? {
                  ...p.pricingAndStock,
                  ...productUpdate.pricingAndStock,
                  standardPrice: productUpdate.pricingAndStock.standardPrice || p.pricingAndStock?.standardPrice || [],
                  salePrice: productUpdate.pricingAndStock.salePrice || p.pricingAndStock?.salePrice || [],
                  costPrice: productUpdate.pricingAndStock.costPrice || p.pricingAndStock?.costPrice || [],
              } : p.pricingAndStock,
              // Ensure options and variants are arrays if present in productUpdate, or keep existing
              options: productUpdate.options ? [...productUpdate.options] : p.options || [],
              variants: productUpdate.variants ? [...productUpdate.variants] : p.variants || [],
              updatedAt: new Date().toISOString()
            } : p
          )
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
      name: getProductStorageName(), // Use dynamic name
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Initialize with example product only for a specific tenant or if no products exist for the current tenant
// This logic runs when the module is first loaded.
if (typeof window !== 'undefined') {
  const tenantId = getCurrentTenantId();
  const storageName = `products-storage-${tenantId}`;
  const productsInitializedKey = `products_initialized-${tenantId}`;

  const productsInitialized = localStorage.getItem(productsInitializedKey);
  const currentProductsRaw = localStorage.getItem(storageName);
  let currentProducts: Product[] = [];
  try {
    currentProducts = currentProductsRaw ? JSON.parse(currentProductsRaw)?.state?.products : [];
  } catch (e) {
    console.error("Failed to parse products from localStorage", e);
    currentProducts = [];
  }


  if (!productsInitialized || (!currentProducts || currentProducts.length === 0)) {
    if (tenantId === 'default_host' || tenantId.startsWith('default_') || tenantId.startsWith('localhost')) { // Only seed for default or localhost for demo
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
              { id: uuidv4(), sku: "EX-LT-SIL-256", optionValues: {"Color": "Silver", "Storage": "256GB"}, standardPrice: [{id: uuidv4(), amount: 9999, currency: 'NOK'}]},
              { id: uuidv4(), sku: "EX-LT-SIL-512", optionValues: {"Color": "Silver", "Storage": "512GB"}, standardPrice: [{id: uuidv4(), amount: 10999, currency: 'NOK'}]},
              { id: uuidv4(), sku: "EX-LT-GRY-256", optionValues: {"Color": "Space Gray", "Storage": "256GB"}, standardPrice: [{id: uuidv4(), amount: 9999, currency: 'NOK'}]},
              { id: uuidv4(), sku: "EX-LT-GRY-512", optionValues: {"Color": "Space Gray", "Storage": "512GB"}, standardPrice: [{id: uuidv4(), amount: 10999, currency: 'NOK'}]}
            ],
            aiSummary: { en: 'A high-performance Silver laptop with 16GB RAM and 512GB SSD.', no: 'En høytytende sølvfarget bærbar PC med 16 GB RAM og 512 GB SSD.' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        useProductStore.setState({ products: [exampleProduct] }); // Directly set state for initial seed
        localStorage.setItem(productsInitializedKey, 'true');
        console.log(`Seeded example product for tenant: ${tenantId}`);
    } else {
        // For other tenants, just mark as initialized without seeding, or seed with tenant-specific examples if desired
        localStorage.setItem(productsInitializedKey, 'true');
        console.log(`Initialized (no seed) for new tenant: ${tenantId}`);
    }
  }
}
