
export type MultilingualString = {
  en: string;
  no: string;
  [key: string]: string; // For other languages
};

export type KeyValueEntry = {
  id: string; // for react list keys
  key: string;
  value: string;
};

export type MediaEntry = {
  id: string; // for react list keys
  url: string;
  altText?: MultilingualString;
  type: 'image' | 'video' | '3d_model' | 'manual' | 'certificate';
  language?: string; // for manuals
  title?: string; // for videos, 3d models, manuals, certificates
  dataAiHint?: string; // for placeholder images
};

export type PriceEntry = {
  id: string; // for react list keys
  currency: string;
  amount: number;
  validFrom?: string;
  validTo?: string;
};

export type CampaignEntry = {
  id: string; // for react list keys
  code: string;
  validFrom: string;
  validTo: string;
  description?: MultilingualString;
};

export type ProductStatus = 'active' | 'inactive' | 'development' | 'discontinued';

export interface Product {
  id: string; // Unique product ID, can be auto-generated or SKU
  
  // Basic Product Information
  basicInfo: {
    name: MultilingualString;
    sku: string; // Stock Keeping Unit
    gtin?: string; // GTIN/EAN/UPC
    internalId?: string; // PIM-specific ID, could be same as id
    descriptionShort: MultilingualString;
    descriptionLong: MultilingualString;
    brand: string;
    status: ProductStatus;
    launchDate?: string; // ISO date string
    endDate?: string; // ISO date string for discontinuation
  };

  // Attributes and Specifications
  attributesAndSpecs: {
    categories: string[]; // e.g., ["Electronics", "Audio", "Headphones"]
    properties: KeyValueEntry[]; // e.g., material, color, size
    technicalSpecs: KeyValueEntry[];
    maintenanceInstructions?: MultilingualString;
    warrantyInfo?: MultilingualString;
    countryOfOrigin?: string;
  };

  // Media and Visual Content
  media: {
    images: MediaEntry[]; // type: 'image'
    videos?: MediaEntry[]; // type: 'video'
    models3d?: MediaEntry[]; // type: '3d_model'
    manuals?: MediaEntry[]; // type: 'manual'
    certificates?: MediaEntry[]; // type: 'certificate'
  };

  // Marketing and SEO
  marketingSEO: {
    seoTitle: MultilingualString;
    seoDescription: MultilingualString;
    keywords: string[]; // For search tags
    marketingTexts?: Array<{ id: string; channel: string; text: MultilingualString }>;
    campaignCodes?: CampaignEntry[];
  };

  // Pricing and Stock
  pricingAndStock?: {
    standardPrice: PriceEntry[]; // "Original Price"
    salePrice?: PriceEntry[];    // "Sales Price"
    costPrice?: PriceEntry[];     // "Cost Price"
    // Stock level might be too dynamic for PIM, usually from ERP
  };

  // Relations and Connections
  relations?: {
    relatedProducts?: string[]; // Array of product IDs/SKUs
    accessories?: string[]; // Array of product IDs/SKUs
    replacementProducts?: string[]; // Array of product IDs/SKUs
  };

  // Localization (Norway specific as example)
  localizationNorway?: {
    // Specific Norwegian names/descriptions if different from basicInfo.name.no
    // This section might be redundant if MultilingualString is used well
    norwegianRegulations?: string; // Information about Norwegian standards/regulations
  };

  // AI Generated Summary
  aiSummary?: MultilingualString;

  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// For form handling, partial product and default values
export const defaultMultilingualString: MultilingualString = { en: '', no: '' };

export const initialProductData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
  basicInfo: {
    name: { ...defaultMultilingualString },
    sku: '',
    descriptionShort: { ...defaultMultilingualString },
    descriptionLong: { ...defaultMultilingualString },
    brand: '',
    status: 'development',
  },
  attributesAndSpecs: {
    categories: [],
    properties: [],
    technicalSpecs: [],
  },
  media: {
    images: [],
  },
  marketingSEO: {
    seoTitle: { ...defaultMultilingualString },
    seoDescription: { ...defaultMultilingualString },
    keywords: [],
  },
  pricingAndStock: { // Initialize pricingAndStock
    standardPrice: [],
    salePrice: [],
    costPrice: [],
  },
};
