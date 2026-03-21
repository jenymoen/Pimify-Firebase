
// src/app/(app)/products/product-form-client.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Accordion } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductFormSection } from "@/components/products/product-form-section";
import { KeyValueEditor } from "@/components/products/key-value-editor";
import { MediaEditor } from "@/components/products/media-editor";
import { MultilingualInput } from "@/components/shared/multilingual-input";
import type { Product, MultilingualString, KeyValueEntry, MediaEntry, ProductStatus, PriceEntry, ProductOption, ProductVariant } from "@/types/product";
import { initialProductData, defaultMultilingualString } from "@/types/product";
import { useProductStore } from "@/lib/product-store";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { summarizeProductInformation } from "@/ai/flows/summarize-product-information";
import { generateProductDescriptions } from "@/ai/flows/generate-product-descriptions";
import { Info, Package, Tag, Image as ImageIconLucide, BarChart3, Brain, CalendarDays, CheckCircle, Save, Trash2, Sparkles, Languages, Edit, DollarSign, ListPlus, Cog, Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from "react";
import Image from "next/image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const requiredMultilingualStringSchema = z.object({
  en: z.string().optional(),
  no: z.string().optional(),
}).catchall(z.string().optional())
  .superRefine((data, ctx) => {
    const enEmpty = !data.en || data.en.trim() === "";
    const noEmpty = !data.no || data.no.trim() === "";
    if (enEmpty && noEmpty) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one language (English or Norwegian) is required.",
        path: ['en'],
      });
    }
  });

const baseMultilingualStringSchema = z.object({
  en: z.string().optional(),
  no: z.string().optional(),
}).catchall(z.string().optional());


const keyValueEntrySchema = z.object({
  id: z.string(),
  key: z.string().min(1, "Key cannot be empty"),
  value: z.string().min(1, "Value cannot be empty"),
});

const mediaEntrySchema = z.object({
  id: z.string(),
  url: z.string().refine(val => {
    if (val === '' || val === undefined) return true; // Allow empty URL for removal
    try {
      const url = new URL(val);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      // Allow relative paths starting with '/'
      return val.startsWith('/') || val.startsWith('data:');
    }
  }, {
    message: "Must be a valid HTTP/HTTPS URL, a relative path starting with '/', or a data URL. Leave empty to remove image.",
  }).optional(),
  altText: baseMultilingualStringSchema.optional(),
  type: z.enum(['image', 'video', '3d_model', 'manual', 'certificate']),
  language: z.string().optional(),
  title: z.string().optional(),
});

const productOptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Option name is required."),
  values: z.string()
    .min(1, "Option values are required (comma-separated).")
    .refine(val => val.split(',').map(v => v.trim()).filter(v => v).length > 0, { message: "Please provide at least one valid, non-empty option value (e.g., 'Red' or 'Red,Blue'). Values like ' , ' are not valid." })
});

const productVariantSchema = z.object({
  id: z.string(),
  sku: z.string().min(1, "Variant SKU is required."),
  gtin: z.string().optional(),
  optionValues: z.record(z.string()),
  standardPriceAmount: z.preprocess(
    (val) => (String(val).trim() === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number({ invalid_type_error: "Price must be a number" }).min(0, "Price cannot be negative").optional().nullable()
  ),
  standardPriceCurrency: z.string().length(3, "Currency code must be 3 letters").optional().default("NOK"),
  salePriceAmount: z.preprocess(
    (val) => (String(val).trim() === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number({ invalid_type_error: "Sale price must be a number" }).min(0, "Sale price cannot be negative").optional().nullable()
  ),
  salePriceCurrency: z.string().length(3, "Currency code must be 3 letters").optional().default("NOK"),
});


const productFormSchema = z.object({
  basicInfo: z.object({
    name: requiredMultilingualStringSchema,
    sku: z.string().min(1, "SKU is required"),
    gtin: z.string().optional(),
    descriptionShort: requiredMultilingualStringSchema,
    descriptionLong: requiredMultilingualStringSchema,
    brand: z.string().min(1, "Brand is required"),
    status: z.enum(['active', 'inactive', 'development', 'discontinued']),
    launchDate: z.date().optional(),
    endDate: z.date().optional(),
  }),
  attributesAndSpecs: z.object({
    categories: z.array(z.string()).optional(),
    properties: z.array(keyValueEntrySchema).optional(),
    technicalSpecs: z.array(keyValueEntrySchema).optional(),
    countryOfOrigin: z.string().optional(),
  }),
  media: z.object({
    images: z.array(mediaEntrySchema).optional(),
  }),
  marketingSEO: z.object({
    seoTitle: baseMultilingualStringSchema, // Changed to base (optional content)
    seoDescription: baseMultilingualStringSchema, // Changed to base (optional content)
    keywords: z.array(z.string()).optional(),
  }),
  pricingAndStock: z.object({
    standardPriceAmount: z.preprocess(
      (val) => (String(val).trim() === "" || val === null || val === undefined ? undefined : val),
      z.coerce.number({ required_error: "Original price amount is required.", invalid_type_error: "Original price must be a number" }).min(0, "Original price cannot be negative")
    ),
    standardPriceCurrency: z.string().length(3, "Currency code must be 3 letters").default("NOK"),
    salePriceAmount: z.preprocess(
      (val) => (String(val).trim() === "" || val === null || val === undefined ? undefined : val),
      z.coerce.number({ invalid_type_error: "Sale price must be a number" }).min(0, "Sale price cannot be negative").optional().nullable()
    ),
    salePriceCurrency: z.string().length(3, "Currency code must be 3 letters").optional().default("NOK"),
    costPriceAmount: z.preprocess(
      (val) => (String(val).trim() === "" || val === null || val === undefined ? undefined : val),
      z.coerce.number({ invalid_type_error: "Cost price must be a number" }).min(0, "Cost price cannot be negative").optional().nullable()
    ),
    costPriceCurrency: z.string().length(3, "Currency code must be 3 letters").optional().default("NOK"),
  }).optional(),
  options: z.array(productOptionSchema).max(3, "Maximum of 3 options allowed.").optional(),
  variants: z.array(productVariantSchema).optional(),
  aiSummary: baseMultilingualStringSchema.optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormClientProps {
  product?: Product;
}

export function ProductFormClient({ product: existingProduct }: ProductFormClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { addProduct, updateProduct: storeUpdateProduct } = useProductStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingDescriptions, setIsGeneratingDescriptions] = useState(false);

  const defaultValues = existingProduct ? {
    basicInfo: {
      ...existingProduct.basicInfo,
      name: existingProduct.basicInfo.name || defaultMultilingualString,
      descriptionShort: existingProduct.basicInfo.descriptionShort || defaultMultilingualString,
      descriptionLong: existingProduct.basicInfo.descriptionLong || { ...defaultMultilingualString },
      gtin: existingProduct.basicInfo.gtin || '',
      launchDate: existingProduct.basicInfo.launchDate ? parseISO(existingProduct.basicInfo.launchDate) : undefined,
      endDate: existingProduct.basicInfo.endDate ? parseISO(existingProduct.basicInfo.endDate) : undefined,
    },
    attributesAndSpecs: {
      ...existingProduct.attributesAndSpecs,
      countryOfOrigin: existingProduct.attributesAndSpecs.countryOfOrigin || '',
      categories: existingProduct.attributesAndSpecs.categories || [],
      properties: existingProduct.attributesAndSpecs.properties || [],
      technicalSpecs: existingProduct.attributesAndSpecs.technicalSpecs || [],
    },
    media: {
      images: (existingProduct.media.images || []).map(img => ({
        ...img,
        url: img.url || '',
        altText: img.altText || { ...defaultMultilingualString }
      })),
    },
    marketingSEO: {
      ...existingProduct.marketingSEO,
      seoTitle: existingProduct.marketingSEO.seoTitle || { ...defaultMultilingualString },
      seoDescription: existingProduct.marketingSEO.seoDescription || { ...defaultMultilingualString },
      keywords: existingProduct.marketingSEO.keywords || [],
    },
    pricingAndStock: {
      standardPriceAmount: existingProduct.pricingAndStock?.standardPrice?.[0]?.amount ?? undefined,
      standardPriceCurrency: existingProduct.pricingAndStock?.standardPrice?.[0]?.currency || "NOK",
      salePriceAmount: existingProduct.pricingAndStock?.salePrice?.[0]?.amount ?? undefined,
      salePriceCurrency: existingProduct.pricingAndStock?.salePrice?.[0]?.currency || "NOK",
      costPriceAmount: existingProduct.pricingAndStock?.costPrice?.[0]?.amount ?? undefined,
      costPriceCurrency: existingProduct.pricingAndStock?.costPrice?.[0]?.currency || "NOK",
    },
    options: (existingProduct.options || []).map(opt => ({
      id: opt.id,
      name: opt.name,
      values: Array.isArray(opt.values) ? opt.values.join(',') : opt.values,
    })),
    variants: (existingProduct.variants || []).map(v => {
      return {
        id: v.id,
        sku: v.sku,
        gtin: v.gtin || '',
        optionValues: v.optionValues,
        standardPriceAmount: v.standardPrice?.[0]?.amount,
        standardPriceCurrency: v.standardPrice?.[0]?.currency || "NOK",
        salePriceAmount: v.salePrice?.[0]?.amount,
        salePriceCurrency: v.salePrice?.[0]?.currency || "NOK",
      };
    }),
    aiSummary: existingProduct.aiSummary || { ...defaultMultilingualString },
  } : {
    basicInfo: {
      name: { ...defaultMultilingualString },
      sku: '',
      gtin: '',
      descriptionShort: { ...defaultMultilingualString },
      descriptionLong: { ...defaultMultilingualString },
      brand: '',
      status: 'development',
    },
    attributesAndSpecs: {
      categories: [],
      properties: [],
      technicalSpecs: [],
      countryOfOrigin: '',
    },
    media: {
      images: [],
    },
    marketingSEO: {
      seoTitle: { ...defaultMultilingualString },
      seoDescription: { ...defaultMultilingualString },
      keywords: [],
    },
    pricingAndStock: {
      standardPriceAmount: undefined,
      standardPriceCurrency: "NOK",
      salePriceAmount: undefined,
      salePriceCurrency: "NOK",
      costPriceAmount: undefined,
      costPriceCurrency: "NOK",
    },
    options: [],
    variants: [],
    aiSummary: { ...defaultMultilingualString },
  };


  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaultValues as any,
    mode: "onChange",
  });

  const { fields: optionsFields, append: appendOption, remove: removeOption } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const { fields: variantsFields, replace: replaceVariants } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const watchedImages = form.watch("media.images");


  async function onSubmit(data: ProductFormData) {
    setIsSubmitting(true);
    try {
      const productPayloadForSave: Product = {
        id: existingProduct?.id || data.basicInfo.sku || uuidv4(),
        createdAt: existingProduct?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        basicInfo: {
          ...data.basicInfo,
          name: {
            en: data.basicInfo.name.en || '',
            no: data.basicInfo.name.no || ''
          },
          descriptionShort: {
            en: data.basicInfo.descriptionShort.en || '',
            no: data.basicInfo.descriptionShort.no || ''
          },
          descriptionLong: {
            en: data.basicInfo.descriptionLong.en || '',
            no: data.basicInfo.descriptionLong.no || ''
          },
          launchDate: data.basicInfo.launchDate ? data.basicInfo.launchDate.toISOString() : undefined,
          endDate: data.basicInfo.endDate ? data.basicInfo.endDate.toISOString() : undefined,
        },
        attributesAndSpecs: {
          categories: data.attributesAndSpecs.categories || [],
          properties: data.attributesAndSpecs.properties || [],
          technicalSpecs: data.attributesAndSpecs.technicalSpecs || [],
          countryOfOrigin: data.attributesAndSpecs.countryOfOrigin,
        },
        media: {
          images: (data.media.images || [])
            .filter(img => {
              if (!img.url || img.url.trim() === '') return false;
              try {
                const url = new URL(img.url);
                return url.protocol === "http:" || url.protocol === "https:";
              } catch (_) {
                return img.url.startsWith('/') || img.url.startsWith('data:');
              }
            })
            .map(img => ({
              ...img,
              url: img.url!,
              altText: img.altText ? {
                en: img.altText.en || '',
                no: img.altText.no || ''
              } : undefined
            }))
        },
        marketingSEO: {
          seoTitle: {
            en: data.marketingSEO.seoTitle.en || '',
            no: data.marketingSEO.seoTitle.no || ''
          },
          seoDescription: {
            en: data.marketingSEO.seoDescription.en || '',
            no: data.marketingSEO.seoDescription.no || ''
          },
          keywords: data.marketingSEO.keywords || [],
        },
        aiSummary: {
          en: data.aiSummary?.en || '',
          no: data.aiSummary?.no || ''
        },
        pricingAndStock: {
          standardPrice: [],
          salePrice: [],
          costPrice: [],
        },
        options: (data.options || []).map(opt => ({
          id: opt.id,
          name: opt.name,
          values: opt.values.split(',').map(v => v.trim()).filter(v => v),
        })),
        variants: (data.variants || []).map(vFormData => {
          const stdPriceEntries: PriceEntry[] = (vFormData.standardPriceAmount !== undefined && vFormData.standardPriceAmount !== null)
            ? [{ id: uuidv4(), amount: Number(vFormData.standardPriceAmount), currency: vFormData.standardPriceCurrency || "NOK" }]
            : [];
          const slPriceEntries: PriceEntry[] = (vFormData.salePriceAmount !== undefined && vFormData.salePriceAmount !== null)
            ? [{ id: uuidv4(), amount: Number(vFormData.salePriceAmount), currency: vFormData.salePriceCurrency || "NOK" }]
            : [];

          const variantForPayload: ProductVariant = {
            id: vFormData.id,
            sku: vFormData.sku,
            optionValues: vFormData.optionValues,
            standardPrice: stdPriceEntries,
            salePrice: slPriceEntries,
          };
          if (vFormData.gtin) variantForPayload.gtin = vFormData.gtin;
          return variantForPayload;
        }),
      };

      if (data.pricingAndStock) {
        if (data.pricingAndStock.standardPriceAmount !== undefined && data.pricingAndStock.standardPriceAmount !== null) {
          productPayloadForSave.pricingAndStock!.standardPrice = [{
            id: uuidv4(),
            amount: Number(data.pricingAndStock.standardPriceAmount),
            currency: data.pricingAndStock.standardPriceCurrency || "NOK",
          }];
        }
        if (data.pricingAndStock.salePriceAmount !== undefined && data.pricingAndStock.salePriceAmount !== null) {
          productPayloadForSave.pricingAndStock!.salePrice = [{
            id: uuidv4(),
            amount: Number(data.pricingAndStock.salePriceAmount),
            currency: data.pricingAndStock.salePriceCurrency || "NOK",
          }];
        }
        if (data.pricingAndStock.costPriceAmount !== undefined && data.pricingAndStock.costPriceAmount !== null) {
          productPayloadForSave.pricingAndStock!.costPrice = [{
            id: uuidv4(),
            amount: Number(data.pricingAndStock.costPriceAmount),
            currency: data.pricingAndStock.costPriceCurrency || "NOK",
          }];
        }
      }


      if (existingProduct) {
        const { id, createdAt, updatedAt, ...updatePayload } = productPayloadForSave;
        await storeUpdateProduct(existingProduct.id, updatePayload);
        toast({ title: "Product Updated", description: `"${data.basicInfo.name.en || data.basicInfo.name.no || data.basicInfo.sku}" has been successfully updated.` });
      } else {
        const { id, createdAt, updatedAt, aiSummary: _aiSummaryFromPayload, ...productDataForStore } = productPayloadForSave;
        const newProd = await addProduct(productDataForStore, productPayloadForSave.aiSummary);

        if (newProd) {
          toast({ title: "Product Created", description: `"${newProd.basicInfo.name.en || newProd.basicInfo.name.no || newProd.basicInfo.sku}" has been successfully created.` });
        } else {
          throw new Error("Failed to create product (API returned no data)");
        }
      }
      router.push("/products");
      router.refresh();
    } catch (error) {
      console.error("Submission error:", error);
      toast({ title: "Error", description: "Failed to save product. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const onError = (errors: FieldErrors<ProductFormData>) => {
    console.error("Form validation errors (raw object):", errors);
    console.error("Form validation errors (JSON stringified):", JSON.stringify(errors, null, 2));
    toast({
      title: "Validation Error",
      description: "Please check the form for errors. Some required fields might be missing or invalid.",
      variant: "destructive",
    });
  };

  const handleGenerateDescriptions = async () => {
    setIsGeneratingDescriptions(true);
    const currentData = form.getValues();
    const name = currentData.basicInfo.name.en || currentData.basicInfo.name.no;
    const category = currentData.attributesAndSpecs.categories?.[0] || '';

    // Get image URLs that are valid http/https
    const imageUrls = (currentData.media.images || [])
      .map(img => img.url)
      .filter((url): url is string => !!(url && (url.startsWith('http:') || url.startsWith('https:'))));

    if (!name) {
      toast({ title: "Name Required", description: "Please enter a product name first.", variant: "destructive" });
      setIsGeneratingDescriptions(false);
      return;
    }

    try {
      const result = await generateProductDescriptions({
        productName: name,
        category: category,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined
      });

      if (result) {
        if (result.shortDescription) {
          if (result.shortDescription.en) form.setValue("basicInfo.descriptionShort.en", result.shortDescription.en, { shouldValidate: true, shouldDirty: true });
          if (result.shortDescription.no) form.setValue("basicInfo.descriptionShort.no", result.shortDescription.no, { shouldValidate: true, shouldDirty: true });
        }
        if (result.longDescription) {
          if (result.longDescription.en) form.setValue("basicInfo.descriptionLong.en", result.longDescription.en, { shouldValidate: true, shouldDirty: true });
          if (result.longDescription.no) form.setValue("basicInfo.descriptionLong.no", result.longDescription.no, { shouldValidate: true, shouldDirty: true });
        }
        if (result.categories && result.categories.length > 0) {
          form.setValue("attributesAndSpecs.categories", result.categories, { shouldValidate: true, shouldDirty: true });
        }
        if (result.properties && result.properties.length > 0) {
          form.setValue("attributesAndSpecs.properties", result.properties.map(p => ({ ...p, id: uuidv4() })), { shouldValidate: true, shouldDirty: true });
        }
        if (result.technicalSpecs && result.technicalSpecs.length > 0) {
          form.setValue("attributesAndSpecs.technicalSpecs", result.technicalSpecs.map(p => ({ ...p, id: uuidv4() })), { shouldValidate: true, shouldDirty: true });
        }
        toast({ title: "Product Data Generated", description: "AI has populated descriptions, categories, properties, and specs." });
      }
    } catch (error) {
      console.error("Description generation error:", error);
      toast({ title: "AI Error", description: "Failed to generate descriptions.", variant: "destructive" });
    } finally {
      setIsGeneratingDescriptions(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    const currentData = form.getValues();
    const primaryName = currentData.basicInfo.name.en || currentData.basicInfo.name.no;
    const primaryDescription = currentData.basicInfo.descriptionLong.en || currentData.basicInfo.descriptionLong.no;

    if (!primaryName || !primaryDescription) {
      toast({ title: "Missing Information", description: "Please fill in product name and long description in at least one language to generate summary.", variant: "destructive" });
      setIsGeneratingSummary(false);
      return;
    }

    try {
      const techSpecsString = (currentData.attributesAndSpecs.technicalSpecs || [])
        .map(spec => `${spec.key}: ${spec.value}`).join('\n');
      const propertiesString = (currentData.attributesAndSpecs.properties || [])
        .map(prop => `${prop.key}: ${prop.value}`).join('\n');

      const result = await summarizeProductInformation({
        productName: primaryName,
        productDescription: primaryDescription,
        productSpecifications: `Technical Specifications:\n${techSpecsString}\n\nProperties:\n${propertiesString}`,
      });

      if (result.summary) {
        form.setValue("aiSummary.en", result.summary, { shouldValidate: true, shouldDirty: true });
        form.setValue("aiSummary.no", result.summary + " (automatisk oppsummert)", { shouldValidate: true, shouldDirty: true });
        toast({ title: "AI Summary Generated", description: "Summary has been populated." });
      } else {
        toast({ title: "AI Summary Failed", description: "Could not generate summary.", variant: "destructive" });
      }
    } catch (error) {
      console.error("AI Summary error:", error);
      toast({ title: "AI Error", description: "An error occurred while generating summary.", variant: "destructive" });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const keywords = form.watch("marketingSEO.keywords") || [];
  const handleKeywordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKeywords = e.target.value.split(',').map(k => k.trim()).filter(k => k !== "");
    form.setValue("marketingSEO.keywords", newKeywords, { shouldValidate: true, shouldDirty: true });
  };

  const categories = form.watch("attributesAndSpecs.categories") || [];
  const handleCategoriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCategories = e.target.value.split(',').map(c => c.trim()).filter(c => c !== "");
    form.setValue("attributesAndSpecs.categories", newCategories, { shouldValidate: true, shouldDirty: true });
  };

  const generateVariants = () => {
    const options = form.getValues("options");
    if (!options || options.length === 0) {
      toast({ title: "No Options Defined", description: "Please define at least one option to generate variants.", variant: "destructive" });
      replaceVariants([]);
      return;
    }

    const validOptions = options.filter(opt => {
      const hasName = opt.name && opt.name.trim();
      const values = opt.values as string | string[];
      const hasValues = Array.isArray(values) ? values.length > 0 : values && typeof values === 'string' && values.trim();
      const parsedValues = Array.isArray(values) ? values : (values && typeof values === 'string' ? values.split(',').map(v => v.trim()).filter(v => v) : []);
      const hasValidValues = parsedValues.length > 0;

      return hasName && hasValidValues;
    });

    if (validOptions.length !== options.length || validOptions.length === 0) {
      toast({ title: "Incomplete Options", description: "Ensure all defined options have a name and at least one value.", variant: "destructive" });
      replaceVariants([]);
      return;
    }

    const parsedOptions = validOptions.map(opt => {
      const values = opt.values as string | string[];
      return {
        name: opt.name.trim(),
        values: Array.isArray(values) ? values : (typeof values === 'string' ? values.split(',').map(v => v.trim()).filter(v => v) : []),
      };
    });


    if (parsedOptions.some(opt => opt.values.length === 0)) {
      toast({ title: "Invalid Option Values", description: "Some option values (e.g., ' , ' or ' ,,, ') are invalid because they don't produce any actual items after parsing. Please use comma-separated words like 'Red, Blue, Green'.", variant: "destructive" });
      replaceVariants([]);
      return;
    }

    const cartesian = <T,>(...a: T[][]): T[][] => a.reduce((acc, curr) => acc.flatMap(x => curr.map(y => [...x, y])), [[]] as T[][]);
    const combinations = cartesian(...parsedOptions.map(opt => opt.values));
    const baseSku = form.getValues("basicInfo.sku");

    const newVariants = combinations.map((combination) => {
      const variantSkuSuffix = combination.join('-').toUpperCase().replace(/[^A-Z0-9-]/g, '');
      const optionValues: Record<string, string> = {};
      parsedOptions.forEach((opt, idx) => {
        optionValues[opt.name] = combination[idx] as string;
      });

      return {
        id: uuidv4(),
        sku: `${baseSku}-${variantSkuSuffix}`,
        gtin: '',
        optionValues,
        standardPriceAmount: form.getValues("pricingAndStock.standardPriceAmount"),
        standardPriceCurrency: form.getValues("pricingAndStock.standardPriceCurrency") || "NOK",
        salePriceAmount: form.getValues("pricingAndStock.salePriceAmount"),
        salePriceCurrency: form.getValues("pricingAndStock.salePriceCurrency") || "NOK",
      };
    });
    replaceVariants(newVariants);
    toast({ title: "Variants Generated", description: `${newVariants.length} variants created based on options.` });
  };


  return (
    <div className="flex flex-col -mx-6 -mt-6 h-[calc(100vh-4rem)] font-sans">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="flex flex-col h-full overflow-hidden w-full">
          {/* TOP HEADER BAR */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#eaf0f0] bg-white dark:bg-[#1c1f22] px-8 py-3 shrink-0 gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <button type="button" onClick={() => router.back()} className="text-[#5e8787] text-xs font-medium hover:text-[#2f7979] transition-colors">Products</button>
                <span className="text-[#5e8787] text-xs">/</span>
                <span className="text-[#111818] dark:text-white text-xs font-semibold">{existingProduct ? form.watch("basicInfo.name").en || "Edit Product" : "Create New Product"}</span>
              </div>
              <div className="flex items-center gap-3">
                <h2 className="text-[#111818] dark:text-white text-xl font-bold tracking-tight">{existingProduct ? "Edit Product" : "Create New Product"}</h2>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => router.back()} disabled={isSubmitting} className="flex items-center justify-center rounded-lg px-4 py-2 bg-[#eaf0f0] text-[#111818] text-sm font-bold hover:bg-[#dfe9e9] transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting || isGeneratingSummary} className="flex items-center gap-2 rounded-lg px-4 py-2 bg-[#2f7979] text-white text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
                <Save className="w-4 h-4" />
                {isSubmitting ? "Saving..." : (existingProduct ? "Save Changes" : "Create Product")}
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-[#fafafa] dark:bg-[#1c1f22] p-8 custom-scrollbar w-full">
            <div className="w-full mx-auto flex flex-col gap-8">
              
              <Tabs defaultValue="basic-info" className="flex flex-col gap-6 w-full font-sans">
                <TabsList className="bg-transparent p-0 flex border-b border-[#eaf0f0] gap-8 rounded-none h-auto w-full justify-start overflow-x-auto">
                  {['basic-info', 'media', 'variants', 'seo'].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="flex flex-col items-center border-b-2 border-transparent data-[state=active]:border-[#2f7979] text-[#5e8787] data-[state=active]:text-[#2f7979] hover:text-[#111818] pb-4 pt-2 rounded-none shadow-none bg-transparent transition-colors group px-1"
                    >
                      <span className="text-sm font-bold capitalize group-hover:text-[#111818] data-[state=active]:text-[#2f7979]">{tab.replace('-', ' ')}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {/* BASIC INFO TAB */}
                <TabsContent value="basic-info" className="focus-visible:outline-none focus-visible:ring-0 mt-2 space-y-8">
                  <div className="bg-white border border-[#eaf0f0] rounded-xl p-8 shadow-sm">
                    <h3 className="text-lg font-bold mb-6 text-[#111818]">Core Details</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                      <FormField control={form.control} name="basicInfo.name" render={({ field }) => (
                          <FormItem className="lg:col-span-2">
                            <FormLabel className="text-[#111818] font-semibold">Product Name <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <MultilingualInput id="name" label="" {...field} value={{ en: field.value?.en || '', no: field.value?.no || '' }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                      <FormField control={form.control} name="basicInfo.sku" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#111818] font-semibold">Base SKU <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input placeholder="Enter unique base SKU" className="border-[#eaf0f0] focus:ring-[#2f7979]/20" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                      <FormField control={form.control} name="basicInfo.gtin" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#111818] font-semibold">Base GTIN/EAN/UPC</FormLabel>
                            <FormControl><Input placeholder="Global Trade Item Number" className="border-[#eaf0f0] focus:ring-[#2f7979]/20" {...field} value={field.value || ''} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                      <FormField control={form.control} name="basicInfo.brand" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#111818] font-semibold">Brand <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input placeholder="Product brand name" className="border-[#eaf0f0] focus:ring-[#2f7979]/20" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />

                      <FormField control={form.control} name="basicInfo.status" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#111818] font-semibold">Product Status <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger className="border-[#eaf0f0] focus:ring-[#2f7979]/20"><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                              <SelectContent>
                                {['development', 'active', 'inactive', 'discontinued'].map(status => (
                                  <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                    </div>
                  </div>

                  <div className="bg-white border border-[#eaf0f0] rounded-xl p-8 shadow-sm">
                    <h3 className="text-lg font-bold mb-6 text-[#111818]">Descriptions</h3>
                    <div className="space-y-6">
                      <FormField control={form.control} name="basicInfo.descriptionShort" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2 text-[#111818] font-semibold">
                              Short Description <span className="text-red-500">*</span>
                              <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-transparent" onClick={handleGenerateDescriptions} disabled={isGeneratingDescriptions}>
                                <Sparkles className={cn("h-4 w-4 text-purple-600", isGeneratingDescriptions && "animate-spin")} />
                              </Button>
                            </FormLabel>
                            <FormControl>
                              <MultilingualInput id="descriptionShort" label="" type="textarea" {...field} value={{ en: field.value?.en || '', no: field.value?.no || '' }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      <FormField control={form.control} name="basicInfo.descriptionLong" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#111818] font-semibold">Long Description <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <MultilingualInput id="descriptionLong" label="" type="textarea" {...field} value={{ en: field.value?.en || '', no: field.value?.no || '' }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                    </div>
                  </div>

                  <div className="bg-white border border-[#eaf0f0] rounded-xl p-8 shadow-sm">
                    <h3 className="text-lg font-bold mb-6 text-[#111818]">Base Pricing & Stock</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <FormField control={form.control} name="pricingAndStock.standardPriceAmount" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#111818] font-semibold">Standard Price <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input type="number" placeholder="0.00" className="border-[#eaf0f0] focus:ring-[#2f7979]/20" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      <FormField control={form.control} name="pricingAndStock.standardPriceCurrency" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#111818] font-semibold">Currency <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input className="border-[#eaf0f0] focus:ring-[#2f7979]/20" placeholder="NOK" {...field} value={field.value ?? 'NOK'} maxLength={3} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      <FormField control={form.control} name="pricingAndStock.salePriceAmount" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#111818] font-semibold">Sale Price</FormLabel>
                            <FormControl><Input type="number" placeholder="0.00" className="border-[#eaf0f0] focus:ring-[#2f7979]/20" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                    </div>
                  </div>

                  <div className="bg-white border border-[#eaf0f0] rounded-xl p-8 shadow-sm">
                    <h3 className="text-lg font-bold mb-6 text-[#111818]">Attributes & Specifications</h3>
                    <div className="space-y-6">
                      <FormField control={form.control} name="attributesAndSpecs.categories" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#111818] font-semibold">Categories</FormLabel>
                            <FormControl><Input placeholder="e.g. Electronics, Audio (comma-separated)" className="border-[#eaf0f0] focus:ring-[#2f7979]/20" value={categories.join(', ')} onChange={handleCategoriesChange} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      <Controller control={form.control} name="attributesAndSpecs.properties" render={({ field }) => (
                          <div className="border border-[#eaf0f0] rounded-xl p-4 bg-[#f9fbfb]">
                            <KeyValueEditor label="Properties (e.g. Material: Cotton)" entries={field.value || []} onChange={field.onChange} keyPlaceholder="e.g., Material" valuePlaceholder="e.g., Cotton" />
                          </div>
                        )} />
                      <Controller control={form.control} name="attributesAndSpecs.technicalSpecs" render={({ field }) => (
                          <div className="border border-[#eaf0f0] rounded-xl p-4 bg-[#f9fbfb]">
                            <KeyValueEditor label="Technical Specs (e.g. Weight: 2.5kg)" entries={field.value || []} onChange={field.onChange} keyPlaceholder="e.g., Weight" valuePlaceholder="e.g., 2.5kg" />
                          </div>
                        )} />
                    </div>
                  </div>
                </TabsContent>

                {/* MEDIA TAB */}
                <TabsContent value="media" className="focus-visible:outline-none focus-visible:ring-0 mt-2 space-y-6">
                  <div className="bg-white border border-[#eaf0f0] rounded-xl p-8 shadow-sm">
                    <h3 className="text-lg font-bold mb-6 text-[#111818] flex items-center gap-2"><ImageIconLucide className="text-[#2f7979] w-5 h-5"/> Manage Product Assets</h3>
                    <Controller control={form.control} name="media.images" render={({ field }) => (
                          <MediaEditor label="Images" entries={(field.value || []).map(img => ({ ...img, url: img.url || '', altText: img.altText ? { en: img.altText.en || '', no: img.altText.no || '' } : undefined }))} onChange={field.onChange} allowedTypes={['image']} />
                      )} />
                      {form.formState.errors.media?.images && (<FormMessage className="mt-2 text-red-500">{typeof form.formState.errors.media.images === 'string' ? form.formState.errors.media.images : 'Error in media images.'}</FormMessage>)}
                  </div>
                </TabsContent>

                {/* VARIANTS TAB */}
                <TabsContent value="variants" className="focus-visible:outline-none focus-visible:ring-0 mt-2 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Options configuration */}
                    <div className="md:col-span-1 border border-[#eaf0f0] bg-white rounded-xl p-6 shadow-sm self-start">
                       <h3 className="text-lg font-bold mb-4 text-[#111818] flex items-center gap-2"><Settings2 className="w-5 h-5 text-[#2f7979]"/> Variant Options</h3>
                       <div className="space-y-6">
                         {optionsFields.map((optionField, index) => (
                           <div key={optionField.id} className="p-4 bg-[#f9fbfb] border border-[#eaf0f0] rounded-lg">
                             <div className="flex items-center justify-between mb-2">
                               <p className="font-semibold text-xs text-[#5e8787] uppercase tracking-wider">Option {index + 1}</p>
                               <button type="button" onClick={() => removeOption(index)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 className="w-4 h-4"/></button>
                             </div>
                             <FormField control={form.control} name={`options.${index}.name`} render={({ field }) => (
                               <FormItem className="mb-3">
                                 <FormControl><Input placeholder="Option Name (e.g. Color)" className="bg-white border-[#eaf0f0]" {...field} /></FormControl>
                                 <FormMessage />
                               </FormItem>
                             )} />
                             <FormField control={form.control} name={`options.${index}.values`} render={({ field }) => (
                               <FormItem>
                                 <FormControl><Input placeholder="Values (Red, Blue)" className="bg-white border-[#eaf0f0]" {...field} /></FormControl>
                                 <FormMessage />
                               </FormItem>
                             )} />
                           </div>
                         ))}
                         {optionsFields.length < 3 && (
                           <button type="button" onClick={() => appendOption({ id: uuidv4(), name: '', values: '' })} className="w-full py-2 border border-dashed border-[#5e8787] rounded-lg text-sm text-[#2f7979] font-bold hover:bg-[#f3f7f7] transition-colors flex items-center justify-center gap-2">
                             <ListPlus className="w-4 h-4" /> Add Option
                           </button>
                         )}
                         <Button type="button" onClick={generateVariants} className="w-full bg-[#2f7979] hover:bg-[#1a5b5b] font-bold mt-4" disabled={optionsFields.length === 0}>
                           <Sparkles className="mr-2 h-4 w-4" /> Generate Variants
                         </Button>
                       </div>
                    </div>

                    {/* Generated Variants Table */}
                    <div className="md:col-span-2 border border-[#eaf0f0] bg-white rounded-xl shadow-sm overflow-hidden">
                       <div className="px-6 py-4 border-b border-[#eaf0f0] flex justify-between items-center bg-[#f9fbfb]">
                         <h3 className="text-sm font-bold text-[#111818]">Generated Variants</h3>
                         <span className="bg-[#eaf0f0] text-[#5e8787] px-2 py-0.5 rounded-full text-xs font-bold">{variantsFields.length} items</span>
                       </div>
                       {variantsFields.length > 0 ? (
                         <div className="overflow-x-auto custom-scrollbar">
                           <table className="w-full text-left border-collapse">
                             <thead>
                               <tr className="bg-white border-b border-[#eaf0f0]">
                                 {optionsFields.map((optField, idx) => form.getValues(`options.${idx}.name` as any) && (
                                   <th key={optField.id} className="px-4 py-3 text-[11px] font-bold text-[#5e8787] uppercase tracking-widest">{form.getValues(`options.${idx}.name` as any)}</th>
                                 ))}
                                 <th className="px-4 py-3 text-[11px] font-bold text-[#5e8787] uppercase tracking-widest">SKU</th>
                                 <th className="px-4 py-3 text-[11px] font-bold text-[#5e8787] uppercase tracking-widest">Price</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-[#eaf0f0] bg-white">
                               {variantsFields.map((variantField, index) => (
                                 <tr key={variantField.id} className="hover:bg-[#fcfdfd]">
                                    {optionsFields.map((optField, optIdx) => form.getValues(`options.${optIdx}.name` as any) && (
                                      <td key={`${variantField.id}-${optField.id}`} className="px-4 py-3 text-sm font-medium">
                                        {/* @ts-ignore dynamic field access */}
                                        {form.getValues(`variants.${index}.optionValues.${form.getValues(`options.${optIdx}.name` as any)}`)}
                                      </td>
                                    ))}
                                    <td className="px-4 py-3">
                                      <FormField control={form.control} name={`variants.${index}.sku`} render={({ field }) => (<Input {...field} className="h-8 text-xs border-[#eaf0f0]" placeholder="SKU" />)} />
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-1 w-32">
                                        <span className="text-xs text-[#5e8787] font-semibold">{form.getValues(`pricingAndStock.standardPriceCurrency`)}</span>
                                        <FormField control={form.control} name={`variants.${index}.standardPriceAmount`} render={({ field }) => (<Input type="number" {...field} className="h-8 text-xs border-[#eaf0f0] w-24 text-right" value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} placeholder="Amount" />)} />
                                      </div>
                                    </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       ) : (
                         <div className="p-12 text-center text-[#5e8787] flex flex-col items-center justify-center">
                           <Cog className="w-8 h-8 opacity-40 mb-3" />
                           <p className="text-sm">No variants generated yet.</p>
                         </div>
                       )}
                    </div>
                  </div>
                </TabsContent>

                {/* SEO TAB */}
                <TabsContent value="seo" className="focus-visible:outline-none focus-visible:ring-0 mt-2 space-y-6">
                  <div className="bg-white border border-[#eaf0f0] rounded-xl p-8 shadow-sm">
                    <h3 className="text-lg font-bold mb-6 text-[#111818]"><BarChart3 className="inline-block mr-2 w-5 h-5 text-[#2f7979]"/> SEO & Discovery</h3>
                    <div className="space-y-6">
                      <FormField control={form.control} name="marketingSEO.seoTitle" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#111818] font-semibold">SEO Title</FormLabel>
                            <FormControl><MultilingualInput id="seoTitle" label="" {...field} value={{ en: field.value?.en || '', no: field.value?.no || '' }} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      <FormField control={form.control} name="marketingSEO.seoDescription" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#111818] font-semibold">SEO Description</FormLabel>
                            <FormControl><MultilingualInput id="seoDescription" label="" type="textarea" {...field} value={{ en: field.value?.en || '', no: field.value?.no || '' }} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      <FormField control={form.control} name="marketingSEO.keywords" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[#111818] font-semibold">Keywords/Tags</FormLabel>
                            <FormControl><Input placeholder="laptop, gaming (comma-separated)" className="border-[#eaf0f0]" value={keywords.join(', ')} onChange={handleKeywordsChange} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                    </div>
                  </div>

                  <div className="bg-white border border-[#eaf0f0] rounded-xl p-8 shadow-sm">
                    <h3 className="text-lg font-bold mb-6 text-[#111818]"><Brain className="inline-block mr-2 w-5 h-5 text-[#2f7979]"/> AI Extracted Summary</h3>
                    <Button type="button" onClick={handleGenerateSummary} disabled={isGeneratingSummary || isSubmitting} className="mb-4 bg-[#2f7979] hover:bg-[#1a5b5b]">
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isGeneratingSummary ? "Generating..." : "Generate AI Summary"}
                    </Button>
                    <FormField control={form.control} name="aiSummary" render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <MultilingualInput id="aiSummary" label="" type="textarea" disabled={true} value={{ en: field.value?.en || '', no: field.value?.no || '' }} onChange={field.onChange} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                  </div>
                </TabsContent>

              </Tabs>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
