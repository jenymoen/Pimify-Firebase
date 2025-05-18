
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
import { Info, Package, Tag, Image as ImageIconLucide, BarChart3, Brain, CalendarDays, CheckCircle, Save, Trash2, Sparkles, Languages, Edit, DollarSign, ListPlus, Cog } from "lucide-react";
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
      return val.startsWith('/'); 
    }
  }, {
    message: "Must be a valid HTTP/HTTPS URL or a relative path starting with '/'. Leave empty to remove image.",
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
    .min(1, "Option values are required (comma-separated).") // Ensures the input string isn't empty
    .transform(val => val.split(',').map(v => v.trim()).filter(v => v)) // Transforms to string[]
    .refine(arr => arr.length > 0, { message: "Please provide at least one valid, non-empty option value (e.g., 'Red' or 'Red,Blue'). Values like ' , ' are not valid." }) // Ensures the array isn't empty after transform
});

const productVariantSchema = z.object({
    id: z.string(),
    sku: z.string().min(1, "Variant SKU is required."),
    gtin: z.string().optional(),
    optionValues: z.record(z.string()), 
    standardPriceAmount: z.preprocess(
        (val) => (String(val).trim() === "" || val === null || val === undefined ? undefined : val),
        z.coerce.number({invalid_type_error: "Price must be a number"}).min(0, "Price cannot be negative").optional().nullable()
    ),
    standardPriceCurrency: z.string().length(3, "Currency code must be 3 letters").optional().default("NOK"),
    salePriceAmount: z.preprocess(
        (val) => (String(val).trim() === "" || val === null || val === undefined ? undefined : val),
        z.coerce.number({invalid_type_error: "Sale price must be a number"}).min(0, "Sale price cannot be negative").optional().nullable()
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
        z.coerce.number({ required_error: "Original price amount is required.", invalid_type_error: "Original price must be a number"}).min(0, "Original price cannot be negative")
    ),
    standardPriceCurrency: z.string().length(3, "Currency code must be 3 letters").default("NOK"),
    salePriceAmount: z.preprocess(
        (val) => (String(val).trim() === "" || val === null || val === undefined ? undefined : val),
        z.coerce.number({invalid_type_error: "Sale price must be a number"}).min(0, "Sale price cannot be negative").optional().nullable()
    ),
    salePriceCurrency: z.string().length(3, "Currency code must be 3 letters").optional().default("NOK"),
    costPriceAmount: z.preprocess(
        (val) => (String(val).trim() === "" || val === null || val === undefined ? undefined : val),
        z.coerce.number({invalid_type_error: "Cost price must be a number"}).min(0, "Cost price cannot be negative").optional().nullable()
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

  const defaultValues: ProductFormData = existingProduct ? {
      basicInfo: {
        ...existingProduct.basicInfo,
        name: existingProduct.basicInfo.name || {...defaultMultilingualString},
        descriptionShort: existingProduct.basicInfo.descriptionShort || {...defaultMultilingualString},
        descriptionLong: existingProduct.basicInfo.descriptionLong || {...defaultMultilingualString},
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
          altText: img.altText || {...defaultMultilingualString}
        })),
      },
      marketingSEO: {
        ...existingProduct.marketingSEO,
        seoTitle: existingProduct.marketingSEO.seoTitle || {...defaultMultilingualString},
        seoDescription: existingProduct.marketingSEO.seoDescription || {...defaultMultilingualString},
        keywords: existingProduct.marketingSEO.keywords || [],
      },
      pricingAndStock: {
        standardPriceAmount: existingProduct.pricingAndStock?.standardPrice?.[0]?.amount,
        standardPriceCurrency: existingProduct.pricingAndStock?.standardPrice?.[0]?.currency || "NOK",
        salePriceAmount: existingProduct.pricingAndStock?.salePrice?.[0]?.amount,
        salePriceCurrency: existingProduct.pricingAndStock?.salePrice?.[0]?.currency || "NOK",
        costPriceAmount: existingProduct.pricingAndStock?.costPrice?.[0]?.amount,
        costPriceCurrency: existingProduct.pricingAndStock?.costPrice?.[0]?.currency || "NOK",
      },
      options: (existingProduct.options || []).map(opt => ({ 
        id: opt.id,
        name: opt.name,
        values: opt.values.join(','), 
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
    defaultValues,
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
          launchDate: data.basicInfo.launchDate ? data.basicInfo.launchDate.toISOString() : undefined,
          endDate: data.basicInfo.endDate ? data.basicInfo.endDate.toISOString() : undefined,
        },
        attributesAndSpecs: data.attributesAndSpecs,
        media: {
          images: (data.media.images || []).filter(img => {
            if (!img.url || img.url.trim() === '') return false;
             try {
                const url = new URL(img.url); 
                return url.protocol === "http:" || url.protocol === "https:";
              } catch (_) {
                return img.url.startsWith('/');
              }
          })
        },
        marketingSEO: data.marketingSEO,
        aiSummary: data.aiSummary,
        pricingAndStock: { 
            standardPrice: [],
            salePrice: [],
            costPrice: [],
        },
        options: (data.options || []).map(opt => ({ 
            id: opt.id,
            name: opt.name,
            values: opt.values, 
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
        const {id, createdAt, updatedAt, ...updatePayload} = productPayloadForSave;
        storeUpdateProduct(existingProduct.id, updatePayload);
        toast({ title: "Product Updated", description: `"${data.basicInfo.name.en || data.basicInfo.name.no || data.basicInfo.sku}" has been successfully updated.` });
      } else {
        const { id, createdAt, updatedAt, aiSummary: _aiSummaryFromPayload, ...productDataForStore } = productPayloadForSave;
        const newProd = addProduct(productDataForStore, productPayloadForSave.aiSummary);
        toast({ title: "Product Created", description: `"${newProd.basicInfo.name.en || newProd.basicInfo.name.no || newProd.basicInfo.sku}" has been successfully created.` });
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

    const validOptions = options.filter(opt => opt.name && opt.name.trim() && opt.values && typeof opt.values === 'string' && opt.values.trim() !== '');
    if (validOptions.length !== options.length || validOptions.length === 0) {
        toast({ title: "Incomplete Options", description: "Ensure all defined options have a name and a non-empty values string.", variant: "destructive" });
        replaceVariants([]); 
        return;
    }

    const parsedOptions = validOptions.map(opt => ({
        name: opt.name.trim(),
        values: opt.values.split(',').map(v => v.trim()).filter(v => v),
    }));


    if (parsedOptions.some(opt => opt.values.length === 0)) {
        toast({ title: "Invalid Option Values", description: "Some option values (e.g., ' , ' or ' ,,, ') are invalid because they don't produce any actual items after parsing. Please use comma-separated words like 'Red, Blue, Green'.", variant: "destructive" });
        replaceVariants([]);
        return;
    }

    const cartesian = <T,>(...a: T[][]): T[][] => a.reduce((acc, curr) => acc.flatMap(x => curr.map(y => [...x, y])), [[]] as T[][]);

    const optionValueArrays = parsedOptions.map(opt => opt.values);
    const combinations = cartesian(...optionValueArrays);

    const newVariants = combinations.map(combo => {
        const optionValues: Record<string, string> = {};
        let variantSkuSuffixParts: string[] = [];
        parsedOptions.forEach((opt, i) => {
            optionValues[opt.name] = combo[i];
            variantSkuSuffixParts.push(combo[i].replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase());
        });
        const baseSku = form.getValues("basicInfo.sku") || "VARSKU";
        const variantSkuSuffix = variantSkuSuffixParts.join('-');

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
    <Card className="mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
          {existingProduct ? <Edit className="h-7 w-7"/> : <Package className="h-7 w-7"/>}
          {existingProduct ? "Edit Product" : "Create New Product"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Accordion type="multiple" defaultValue={["basic-info", "options-variants", "attributes-specs", "pricing-stock"]} className="w-full">

                  <ProductFormSection title="Basic Information" value="basic-info" icon={Info} description="Core details about the product.">
                    <FormField
                      control={form.control}
                      name="basicInfo.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name <span className="text-destructive">*</span></FormLabel>
                           <FormControl>
                            <MultilingualInput id="name" label="" {...field} value={field.value || defaultMultilingualString} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="basicInfo.sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base SKU (Stock Keeping Unit) <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="Enter unique base SKU" {...field} /></FormControl>
                          <FormDescription>This SKU is used as a base if variants are generated.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="basicInfo.gtin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base GTIN/EAN/UPC</FormLabel>
                          <FormControl><Input placeholder="Global Trade Item Number for base product" {...field} value={field.value || ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="basicInfo.brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="Product brand name" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="basicInfo.status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Status <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {(['development', 'active', 'inactive', 'discontinued'] as ProductStatus[]).map(status => (
                                <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="basicInfo.descriptionShort"
                      render={({ field }) => (
                         <FormItem>
                          <FormLabel>Short Description <span className="text-destructive">*</span></FormLabel>
                           <FormControl>
                            <MultilingualInput id="descriptionShort" label="" type="textarea" {...field} value={field.value || defaultMultilingualString} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="basicInfo.descriptionLong"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Long Description <span className="text-destructive">*</span></FormLabel>
                           <FormControl>
                            <MultilingualInput id="descriptionLong" label="" type="textarea" {...field} value={field.value || defaultMultilingualString} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="basicInfo.launchDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Launch Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="basicInfo.endDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>End Date (Discontinuation)</FormLabel>
                               <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                  </ProductFormSection>

                  <ProductFormSection title="Product Options & Variants" value="options-variants" icon={Cog} description="Define options (like color, size) to generate product variants. Max 3 options.">
                    <div className="space-y-4">
                        <Label className="text-base">Define Options</Label>
                        {optionsFields.map((optionField, index) => (
                            <Card key={optionField.id} className="p-4 bg-muted/30">
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-end">
                                    <FormField
                                        control={form.control}
                                        name={`options.${index}.name`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Option Name {index + 1}</FormLabel>
                                                <FormControl><Input placeholder="e.g., Color" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`options.${index}.values`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Option Values (comma-separated)</FormLabel>
                                                <FormControl><Input placeholder="e.g., Red, Blue, Green" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="button" variant="destructive" size="icon" onClick={() => removeOption(index)} className="mb-1">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                        {optionsFields.length < 3 && (
                            <Button type="button" variant="outline" onClick={() => appendOption({ id: uuidv4(), name: '', values: '' })}>
                                <ListPlus className="mr-2 h-4 w-4" /> Add Option
                            </Button>
                        )}
                        {form.formState.errors.options && <FormMessage>{typeof form.formState.errors.options === 'string' ? form.formState.errors.options : form.formState.errors.options.message}</FormMessage>}
                    </div>

                    <Button type="button" onClick={generateVariants} className="mt-4" disabled={optionsFields.length === 0}>
                        <Sparkles className="mr-2 h-4 w-4" /> Generate Variants
                    </Button>

                    {variantsFields.length > 0 && (
                        <div className="mt-6 space-y-4">
                            <h4 className="text-md font-semibold">Generated Variants ({variantsFields.length})</h4>
                            <div className="rounded-md border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {optionsFields.map((optField,idx) => form.getValues(`options.${idx}.name` as any) && (
                                            <TableHead key={optField.id}>{form.getValues(`options.${idx}.name` as any)}</TableHead>
                                        ))}
                                        <TableHead>SKU</TableHead>
                                        <TableHead>GTIN</TableHead>
                                        <TableHead>Std. Price</TableHead>
                                        <TableHead>Std. Currency</TableHead>
                                        <TableHead>Sale Price</TableHead>
                                        <TableHead>Sale Currency</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {variantsFields.map((variantField, index) => (
                                        <TableRow key={variantField.id}>
                                            {optionsFields.map((optField, optIdx) => form.getValues(`options.${optIdx}.name` as any) && (
                                                <TableCell key={`${variantField.id}-${optField.id}`}>
                                                    {form.getValues(`variants.${index}.optionValues.${form.getValues(`options.${optIdx}.name` as any)}`)}
                                                </TableCell>
                                            ))}
                                            <TableCell>
                                                <FormField control={form.control} name={`variants.${index}.sku`} render={({ field }) => ( <Input {...field} placeholder="Variant SKU" /> )} />
                                                <FormMessage>{form.formState.errors.variants?.[index]?.sku?.message}</FormMessage>
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`variants.${index}.gtin`} render={({ field }) => ( <Input {...field} value={field.value || ''} placeholder="Variant GTIN" /> )} />
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`variants.${index}.standardPriceAmount`} render={({ field }) => ( <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} placeholder="Amount"/> )} />
                                                 <FormMessage>{form.formState.errors.variants?.[index]?.standardPriceAmount?.message}</FormMessage>
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`variants.${index}.standardPriceCurrency`} render={({ field }) => ( <Input {...field} value={field.value ?? 'NOK'} placeholder="NOK" maxLength={3}/> )} />
                                                 <FormMessage>{form.formState.errors.variants?.[index]?.standardPriceCurrency?.message}</FormMessage>
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`variants.${index}.salePriceAmount`} render={({ field }) => ( <Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} placeholder="Amount"/> )} />
                                                 <FormMessage>{form.formState.errors.variants?.[index]?.salePriceAmount?.message}</FormMessage>
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`variants.${index}.salePriceCurrency`} render={({ field }) => ( <Input {...field} value={field.value ?? 'NOK'} placeholder="NOK" maxLength={3}/> )} />
                                                 <FormMessage>{form.formState.errors.variants?.[index]?.salePriceCurrency?.message}</FormMessage>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            </div>
                             {form.formState.errors.variants && typeof form.formState.errors.variants.message === 'string' && <FormMessage>{form.formState.errors.variants.message}</FormMessage>}
                        </div>
                    )}
                  </ProductFormSection>


                  <ProductFormSection title="Attributes & Specifications (General)" value="attributes-specs" icon={Tag} description="Define product features, technical details, and categorization. These apply to the main product, not specific variants.">
                    <FormField
                      control={form.control}
                      name="attributesAndSpecs.categories"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categories</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Electronics, Audio, Headphones (comma-separated)"
                              value={categories.join(', ')}
                              onChange={handleCategoriesChange}
                            />
                          </FormControl>
                          <FormDescription>Enter categories separated by commas.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="attributesAndSpecs.properties"
                      render={({ field }) => (
                        <KeyValueEditor
                          label="Properties"
                          entries={field.value || []}
                          onChange={field.onChange}
                          keyPlaceholder="e.g., Material"
                          valuePlaceholder="e.g., Cotton"
                        />
                      )}
                    />
                     {form.formState.errors.attributesAndSpecs?.properties && (
                        <FormMessage>{typeof form.formState.errors.attributesAndSpecs.properties === 'string' ? form.formState.errors.attributesAndSpecs.properties : 'Error in properties (check fields).'}</FormMessage>
                     )}
                    <Controller
                      control={form.control}
                      name="attributesAndSpecs.technicalSpecs"
                      render={({ field }) => (
                        <KeyValueEditor
                          label="Technical Specifications"
                          entries={field.value || []}
                          onChange={field.onChange}
                          keyPlaceholder="e.g., Weight"
                          valuePlaceholder="e.g., 2.5kg"
                        />
                      )}
                    />
                    {form.formState.errors.attributesAndSpecs?.technicalSpecs && (
                        <FormMessage>{typeof form.formState.errors.attributesAndSpecs.technicalSpecs === 'string' ? form.formState.errors.attributesAndSpecs.technicalSpecs : 'Error in technical specs (check fields).'}</FormMessage>
                     )}
                     <FormField
                      control={form.control}
                      name="attributesAndSpecs.countryOfOrigin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country of Origin</FormLabel>
                          <FormControl><Input placeholder="e.g., Norway, China" {...field} value={field.value || ''}/></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </ProductFormSection>

                  <ProductFormSection title="Base Pricing & Stock (if no variants)" value="pricing-stock" icon={DollarSign} description="Manage base product pricing. If variants are defined, their prices take precedence.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField
                            control={form.control}
                            name="pricingAndStock.standardPriceAmount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Original Price Amount <span className="text-destructive">*</span></FormLabel>
                                <FormControl><Input
                                    type="number"
                                    placeholder="e.g., 999.99"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="pricingAndStock.standardPriceCurrency"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Original Price Currency <span className="text-destructive">*</span></FormLabel>
                                <FormControl><Input placeholder="e.g., NOK" {...field} value={field.value ?? 'NOK'} maxLength={3} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="pricingAndStock.salePriceAmount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Sales Price Amount</FormLabel>
                                <FormControl><Input
                                    type="number"
                                    placeholder="e.g., 799.99"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                /></FormControl>
                                <FormDescription>Optional. If set, this is the active selling price.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="pricingAndStock.salePriceCurrency"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Sales Price Currency</FormLabel>
                                <FormControl><Input placeholder="e.g., NOK" {...field} value={field.value ?? 'NOK'} maxLength={3} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="pricingAndStock.costPriceAmount"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Cost Price Amount</FormLabel>
                                <FormControl><Input
                                    type="number"
                                    placeholder="e.g., 499.99"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                /></FormControl>
                                <FormDescription>Optional. Internal cost price.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="pricingAndStock.costPriceCurrency"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Cost Price Currency</FormLabel>
                                <FormControl><Input placeholder="e.g., NOK" {...field} value={field.value ?? 'NOK'} maxLength={3} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                  </ProductFormSection>


                  <ProductFormSection title="Media" value="media" icon={ImageIconLucide} description="Manage product images and other visual assets.">
                     <Controller
                      control={form.control}
                      name="media.images"
                      render={({ field }) => (
                        <MediaEditor
                          label="Images"
                          entries={field.value || []}
                          onChange={field.onChange}
                          allowedTypes={['image']}
                        />
                      )}
                    />
                    {form.formState.errors.media?.images && (
                        <FormMessage>{typeof form.formState.errors.media.images === 'string' ? form.formState.errors.media.images : 'Error in media images (check URLs/alt text).'}</FormMessage>
                    )}
                  </ProductFormSection>

                  <ProductFormSection title="Marketing & SEO" value="marketing-seo" icon={BarChart3} description="Optimize product visibility for search engines and marketing campaigns.">
                     <FormField
                      control={form.control}
                      name="marketingSEO.seoTitle"
                      render={({ field }) => (
                         <FormItem>
                           <FormLabel>SEO Title</FormLabel>
                           <FormControl>
                            <MultilingualInput id="seoTitle" label="" {...field} value={field.value || defaultMultilingualString} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marketingSEO.seoDescription"
                      render={({ field }) => (
                        <FormItem>
                           <FormLabel>SEO Meta Description</FormLabel>
                          <FormControl>
                            <MultilingualInput id="seoDescription" label="" type="textarea" {...field} value={field.value || defaultMultilingualString} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marketingSEO.keywords"
                      render={({ field }) => (
                         <FormItem>
                          <FormLabel>Keywords/Tags</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., laptop, gaming, high-performance (comma-separated)"
                              value={keywords.join(', ')}
                              onChange={handleKeywordsChange}
                            />
                          </FormControl>
                          <FormDescription>Enter keywords separated by commas. These help in product search and SEO.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </ProductFormSection>

                  <ProductFormSection title="AI Summary" value="ai-summary" icon={Brain} description="Generate or review AI-powered product summaries.">
                    <Button type="button" onClick={handleGenerateSummary} disabled={isGeneratingSummary || isSubmitting} className="mb-4">
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isGeneratingSummary ? "Generating..." : "Generate AI Summary"}
                    </Button>
                     <FormField
                      control={form.control}
                      name="aiSummary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>AI Generated Summary</FormLabel>
                          <FormControl>
                            <MultilingualInput
                              id="aiSummary"
                              label=""
                              type="textarea"
                              disabled={true}
                              value={field.value || defaultMultilingualString}
                              onChange={field.onChange}
                            />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                  </ProductFormSection>
                </Accordion>
              </div>

              <div className="lg:col-span-1 space-y-4 sticky top-6 self-start">
                <h3 className="text-lg font-semibold text-foreground">Image Preview</h3>
                {watchedImages && watchedImages.length > 0 && watchedImages.some(img => {
                  if (img.type !== 'image' || !img.url || img.url.trim() === '') return false;
                  try { new URL(img.url); return true; } catch (_) { return img.url.startsWith('/'); }
                }) ? (
                  <div className="space-y-3 max-h-[calc(100vh-10rem)] overflow-y-auto p-2 rounded-md border bg-muted/10">
                    {watchedImages.filter(img => {
                        if (img.type !== 'image' || !img.url || img.url.trim() === '') return false;
                        try { new URL(img.url); return true; } catch (_) { return img.url.startsWith('/'); }
                    }).map((image, index) => (
                      <div key={image.id || index} className="border p-3 rounded-lg shadow-sm bg-card">
                        <div className="relative aspect-video w-full rounded-md overflow-hidden border mb-2">
                          <Image
                            src={image.url!}
                            alt={image.altText?.en || `Product image ${index + 1}`}
                            layout="fill"
                            objectFit="contain"
                            data-ai-hint="product form image"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.src.includes('placehold.co')) {
                                target.src = 'https://placehold.co/300x200.png?text=Invalid+URL';
                                target.alt = 'Invalid image URL';
                              }
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground truncate" title={image.url}>{image.url}</p>
                        {image.altText?.en && <p className="text-xs text-muted-foreground mt-1">Alt (EN): {image.altText.en}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg text-muted-foreground bg-card p-4" data-ai-hint="product image placeholder">
                    <ImageIconLucide className="h-16 w-16 mb-3" />
                    <p className="text-sm text-center">No valid images uploaded yet for preview.</p>
                    <p className="text-xs text-center mt-1">Add image URLs in the "Media" section.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t mt-8">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isGeneratingSummary}>
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Saving..." : (existingProduct ? "Save Changes" : "Create Product")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

