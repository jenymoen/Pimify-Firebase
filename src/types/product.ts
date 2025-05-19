
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
  validFrom?: string | null; // Changed to allow null
  validTo?: string | null;   // Changed to allow null
};

export type CampaignEntry = {
  id: string; // for react list keys
  code: string;
  validFrom: string;
  validTo: string;
  description?: MultilingualString;
};

export type ProductStatus = 'active' | 'inactive' | 'development' | 'discontinued';

export type ProductOption = {
  id: string;
  name: string; // e.g., "Color", "Size"
  values: string[]; // e.g., ["Red", "Blue"], ["S", "M", "L"]
};

export type ProductVariant = {
  id: string; // Unique ID for the variant
  sku: string;
  gtin?: string;
  optionValues: Record<string, string>; // e.g., { "Color": "Red", "Size": "M" }
  standardPrice?: PriceEntry[];
  salePrice?: PriceEntry[];
  costPrice?: PriceEntry[];
  imageIds?: string[]; // Array of MediaEntry IDs linked to this variant
  // Potentially other variant-specific fields like weight, dimensions if they differ
};

export interface Product {
  id: string; // Unique product ID, can be auto-generated or SKU
  
  basicInfo: {
    name: MultilingualString;
    sku: string; // Stock Keeping Unit - for products without variants or as a base SKU
    gtin?: string | null; // Allow null
    internalId?: string | null; // PIM-specific ID, could be same as id
    descriptionShort: MultilingualString;
    descriptionLong: MultilingualString;
    brand: string;
    status: ProductStatus;
    launchDate?: string | null; // ISO date string
    endDate?: string | null; // ISO date string for discontinuation
  };

  attributesAndSpecs: {
    categories: string[];
    properties: KeyValueEntry[]; 
    technicalSpecs: KeyValueEntry[];
    maintenanceInstructions?: MultilingualString | null;
    warrantyInfo?: MultilingualString | null;
    countryOfOrigin?: string | null;
  };

  media: {
    images: MediaEntry[];
    videos?: MediaEntry[];
    models3d?: MediaEntry[];
    manuals?: MediaEntry[];
    certificates?: MediaEntry[];
  };

  marketingSEO: {
    seoTitle: MultilingualString;
    seoDescription: MultilingualString;
    keywords: string[];
    marketingTexts?: Array<{ id: string; channel: string; text: MultilingualString }> | null;
    campaignCodes?: CampaignEntry[] | null;
  };

  pricingAndStock?: { 
    standardPrice: PriceEntry[];
    salePrice?: PriceEntry[] | null;
    costPrice?: PriceEntry[] | null;
  };

  options: ProductOption[]; 
  variants: ProductVariant[]; 

  relations?: {
    relatedProducts?: string[] | null;
    accessories?: string[] | null;
    replacementProducts?: string[] | null;
  };

  localizationNorway?: {
    norwegianRegulations?: string | null;
  };

  aiSummary?: MultilingualString | null;

  createdAt: string;
  updatedAt: string;
}

export const defaultMultilingualString: MultilingualString = { en: '', no: '' };

export const initialProductData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
  basicInfo: {
    name: { ...defaultMultilingualString },
    sku: '',
    gtin: null,
    internalId: null,
    descriptionShort: { ...defaultMultilingualString },
    descriptionLong: { ...defaultMultilingualString },
    brand: '',
    status: 'development',
    launchDate: null,
    endDate: null,
  },
  attributesAndSpecs: {
    categories: [],
    properties: [],
    technicalSpecs: [],
    maintenanceInstructions: null,
    warrantyInfo: null,
    countryOfOrigin: null,
  },
  media: {
    images: [],
    videos: [],
    models3d: [],
    manuals: [],
    certificates: [],
  },
  marketingSEO: {
    seoTitle: { ...defaultMultilingualString },
    seoDescription: { ...defaultMultilingualString },
    keywords: [],
    marketingTexts: null,
    campaignCodes: null,
  },
  pricingAndStock: {
    standardPrice: [],
    salePrice: [],
    costPrice: [],
  },
  options: [],
  variants: [],
  relations: {
    relatedProducts: null,
    accessories: null,
    replacementProducts: null,
  },
  localizationNorway: {
    norwegianRegulations: null,
  },
  aiSummary: { ...defaultMultilingualString },
};
