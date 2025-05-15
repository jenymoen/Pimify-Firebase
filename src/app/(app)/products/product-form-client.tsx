// src/app/(app)/products/product-form-client.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
import type { Product, MultilingualString, KeyValueEntry, MediaEntry, ProductStatus } from "@/types/product";
import { initialProductData, defaultMultilingualString } from "@/types/product";
import { useProductStore } from "@/lib/product-store";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { summarizeProductInformation } from "@/ai/flows/summarize-product-information";
import { Info, Package, Tag, Image as ImageIconLucide, BarChart3, Brain, CalendarDays, CheckCircle, Save, Trash2, Sparkles, Languages, Edit } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useState } from "react";
import Image from "next/image"; // Added for image preview

const multilingualStringSchema = z.object({
  en: z.string().min(1, "English version is required"),
  no: z.string().min(1, "Norwegian version is required"),
}).catchall(z.string());

const keyValueEntrySchema = z.object({
  id: z.string(),
  key: z.string().min(1, "Key cannot be empty"),
  value: z.string().min(1, "Value cannot be empty"),
});

const mediaEntrySchema = z.object({
  id: z.string(),
  url: z.string().url("Must be a valid URL"),
  altText: multilingualStringSchema.optional(),
  type: z.enum(['image', 'video', '3d_model', 'manual', 'certificate']),
  language: z.string().optional(),
  title: z.string().optional(),
});

const productFormSchema = z.object({
  basicInfo: z.object({
    name: multilingualStringSchema,
    sku: z.string().min(1, "SKU is required"),
    gtin: z.string().optional(),
    descriptionShort: multilingualStringSchema,
    descriptionLong: multilingualStringSchema,
    brand: z.string().min(1, "Brand is required"),
    status: z.enum(['active', 'inactive', 'development', 'discontinued']),
    launchDate: z.date().optional(),
    endDate: z.date().optional(),
  }),
  attributesAndSpecs: z.object({
    categories: z.array(z.string()).optional(), // For now, simple string array. Could be more complex.
    properties: z.array(keyValueEntrySchema).optional(),
    technicalSpecs: z.array(keyValueEntrySchema).optional(),
    countryOfOrigin: z.string().optional(),
  }),
  media: z.object({
    images: z.array(mediaEntrySchema).min(0, "At least one image is recommended").optional(),
  }),
  marketingSEO: z.object({
    seoTitle: multilingualStringSchema,
    seoDescription: multilingualStringSchema,
    keywords: z.array(z.string()).optional(),
  }),
  aiSummary: multilingualStringSchema.optional(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormClientProps {
  product?: Product; // For editing existing product
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
        gtin: existingProduct.basicInfo.gtin || '', // Ensure empty string
        launchDate: existingProduct.basicInfo.launchDate ? parseISO(existingProduct.basicInfo.launchDate) : undefined,
        endDate: existingProduct.basicInfo.endDate ? parseISO(existingProduct.basicInfo.endDate) : undefined,
      },
      attributesAndSpecs: {
        ...existingProduct.attributesAndSpecs,
        countryOfOrigin: existingProduct.attributesAndSpecs.countryOfOrigin || '', // Ensure empty string
        categories: existingProduct.attributesAndSpecs.categories || [],
        properties: existingProduct.attributesAndSpecs.properties || [],
        technicalSpecs: existingProduct.attributesAndSpecs.technicalSpecs || [],
      },
      media: {
        images: existingProduct.media.images || [],
      },
      marketingSEO: {
        ...existingProduct.marketingSEO,
        keywords: existingProduct.marketingSEO.keywords || [],
      },
      aiSummary: existingProduct.aiSummary || defaultMultilingualString,
    } : {
    basicInfo: {
      name: { ...defaultMultilingualString },
      sku: '',
      gtin: '', // Initialize as empty string
      descriptionShort: { ...defaultMultilingualString },
      descriptionLong: { ...defaultMultilingualString },
      brand: '',
      status: 'development',
    },
    attributesAndSpecs: {
      categories: [],
      properties: [],
      technicalSpecs: [],
      countryOfOrigin: '', // Initialize as empty string
    },
    media: {
      images: [],
    },
    marketingSEO: {
      seoTitle: { ...defaultMultilingualString },
      seoDescription: { ...defaultMultilingualString },
      keywords: [],
    },
    aiSummary: { ...defaultMultilingualString },
  };


  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const { fields: propertiesFields, append: appendProperty, remove: removeProperty } = useFieldArray({
    control: form.control,
    name: "attributesAndSpecs.properties",
  });
   const { fields: techSpecsFields, append: appendTechSpec, remove: removeTechSpec } = useFieldArray({
    control: form.control,
    name: "attributesAndSpecs.technicalSpecs",
  });
  const { fields: imagesFields, append: appendImage, remove: removeImage } = useFieldArray({
    control: form.control,
    name: "media.images",
  });
  
  const watchedImages = form.watch("media.images");


  async function onSubmit(data: ProductFormData) {
    setIsSubmitting(true);
    try {
      const productPayload: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'aiSummary'> & { aiSummary?: Product['aiSummary'] } = {
        basicInfo: {
          ...data.basicInfo,
          launchDate: data.basicInfo.launchDate ? data.basicInfo.launchDate.toISOString() : undefined,
          endDate: data.basicInfo.endDate ? data.basicInfo.endDate.toISOString() : undefined,
        },
        attributesAndSpecs: data.attributesAndSpecs,
        media: data.media,
        marketingSEO: data.marketingSEO,
        aiSummary: data.aiSummary,
      };

      if (existingProduct) {
        storeUpdateProduct(existingProduct.id, productPayload as Partial<Product>);
        toast({ title: "Product Updated", description: `"${data.basicInfo.name.en}" has been successfully updated.` });
      } else {
        const newProd = addProduct(productPayload, data.aiSummary);
        toast({ title: "Product Created", description: `"${newProd.basicInfo.name.en}" has been successfully created.` });
      }
      router.push("/products");
      router.refresh(); // Refresh server components
    } catch (error) {
      console.error("Submission error:", error);
      toast({ title: "Error", description: "Failed to save product. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    const currentData = form.getValues();
    if (!currentData.basicInfo.name.en || !currentData.basicInfo.descriptionLong.en) {
      toast({ title: "Missing Information", description: "Please fill in English product name and long description to generate summary.", variant: "destructive" });
      setIsGeneratingSummary(false);
      return;
    }

    try {
      const techSpecsString = (currentData.attributesAndSpecs.technicalSpecs || [])
        .map(spec => `${spec.key}: ${spec.value}`).join('\n');
      const propertiesString = (currentData.attributesAndSpecs.properties || [])
        .map(prop => `${prop.key}: ${prop.value}`).join('\n');
      
      const result = await summarizeProductInformation({
        productName: currentData.basicInfo.name.en,
        productDescription: currentData.basicInfo.descriptionLong.en,
        productSpecifications: `Technical Specifications:\n${techSpecsString}\n\nProperties:\n${propertiesString}`,
      });

      if (result.summary) {
        const currentAiSummary = form.getValues("aiSummary") || { ...defaultMultilingualString };
        form.setValue("aiSummary.en", result.summary, { shouldValidate: true, shouldDirty: true });
        // Potentially, generate for other languages or use a translation service. For now, only EN.
        form.setValue("aiSummary.no", result.summary + " (automatisk oppsummert)", { shouldValidate: true, shouldDirty: true }); // Placeholder for NO summary
        toast({ title: "AI Summary Generated", description: "English summary has been populated." });
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
  
  // For Keywords input (string array)
  const keywords = form.watch("marketingSEO.keywords") || [];
  const handleKeywordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKeywords = e.target.value.split(',').map(k => k.trim()).filter(k => k !== "");
    form.setValue("marketingSEO.keywords", newKeywords, { shouldValidate: true, shouldDirty: true });
  };
  
  // For Categories input (string array)
  const categories = form.watch("attributesAndSpecs.categories") || [];
  const handleCategoriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCategories = e.target.value.split(',').map(c => c.trim()).filter(c => c !== "");
    form.setValue("attributesAndSpecs.categories", newCategories, { shouldValidate: true, shouldDirty: true });
  };


  return (
    <Card className="max-w-6xl mx-auto"> {/* Increased max-width for two columns */}
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
          {existingProduct ? <Edit className="h-7 w-7"/> : <Package className="h-7 w-7"/>}
          {existingProduct ? "Edit Product" : "Create New Product"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Accordion type="multiple" defaultValue={["basic-info", "attributes-specs"]} className="w-full">
                  
                  <ProductFormSection title="Basic Information" value="basic-info" icon={Info} description="Core details about the product.">
                    <FormField
                      control={form.control}
                      name="basicInfo.name"
                      render={({ field }) => (
                        <MultilingualInput id="name" label="Product Name" required {...field} />
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="basicInfo.sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU (Stock Keeping Unit) <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input placeholder="Enter unique SKU" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="basicInfo.gtin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GTIN/EAN/UPC</FormLabel>
                          <FormControl><Input placeholder="Global Trade Item Number" {...field} /></FormControl>
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
                        <MultilingualInput id="descriptionShort" label="Short Description" type="textarea" required {...field} />
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="basicInfo.descriptionLong"
                      render={({ field }) => (
                        <MultilingualInput id="descriptionLong" label="Long Description" type="textarea" required {...field} />
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

                  <ProductFormSection title="Attributes & Specifications" value="attributes-specs" icon={Tag} description="Define product features, technical details, and categorization.">
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
                          keyPlaceholder="e.g., Color"
                          valuePlaceholder="e.g., Red"
                        />
                      )}
                    />
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
                     <FormField
                      control={form.control}
                      name="attributesAndSpecs.countryOfOrigin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country of Origin</FormLabel>
                          <FormControl><Input placeholder="e.g., Norway, China" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                     {/* Add more media types (videos, 3D models) here later if needed */}
                  </ProductFormSection>

                  <ProductFormSection title="Marketing & SEO" value="marketing-seo" icon={BarChart3} description="Optimize product visibility for search engines and marketing campaigns.">
                    <FormField
                      control={form.control}
                      name="marketingSEO.seoTitle"
                      render={({ field }) => (
                        <MultilingualInput id="seoTitle" label="SEO Title" required {...field} />
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="marketingSEO.seoDescription"
                      render={({ field }) => (
                        <MultilingualInput id="seoDescription" label="SEO Meta Description" type="textarea" required {...field} />
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
                      {isGeneratingSummary ? "Generating..." : "Generate AI Summary (EN)"}
                    </Button>
                    <FormField
                      control={form.control}
                      name="aiSummary"
                      render={({ field }) => (
                        <MultilingualInput 
                          id="aiSummary" 
                          label="AI Generated Summary" 
                          type="textarea" 
                          disabled={true} // Make it read-only or editable by user
                          value={field.value || defaultMultilingualString} 
                          onChange={field.onChange} 
                        />
                      )}
                    />
                  </ProductFormSection>
                </Accordion>
              </div>

              <div className="lg:col-span-1 space-y-4 sticky top-6 self-start">
                <h3 className="text-lg font-semibold text-foreground">Image Preview</h3>
                {watchedImages && watchedImages.length > 0 ? (
                  <div className="space-y-3 max-h-[calc(100vh-10rem)] overflow-y-auto p-2 rounded-md border bg-muted/10">
                    {watchedImages.filter(img => img.type === 'image' && img.url).map((image, index) => (
                      <div key={image.id || index} className="border p-3 rounded-lg shadow-sm bg-card">
                        <div className="relative aspect-video w-full rounded-md overflow-hidden border mb-2">
                          <Image 
                            src={image.url} 
                            alt={image.altText?.en || `Product image ${index + 1}`} 
                            layout="fill" 
                            objectFit="contain"
                            data-ai-hint="product form image"
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
                    <p className="text-sm text-center">No images uploaded yet for preview.</p>
                    <p className="text-xs text-center mt-1">Add images in the "Media" section.</p>
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
