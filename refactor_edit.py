import os

filepath = 'C:/Utvikling/Pimify/src/app/(app)/products/product-form-client.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Insert Tabs import at the top (after other UI imports)
import_tabs = 'import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";\n'
import_inserted = False

for i, line in enumerate(lines):
    if 'import { Accordion' in line:
        lines.insert(i+1, import_tabs)
        import_inserted = True
        break

if not import_inserted:
    # Just insert it at line 10
    lines.insert(10, import_tabs)

# 2. Find the return statement around line 612
return_index = -1
for i, line in enumerate(lines):
    if 'return (' in line and 'Card className="mx-auto"' in lines[i+1]:
        return_index = i
        break

if return_index == -1:
    print("Could not find the return statement!")
    exit(1)

# Keep the code before the return
new_lines = lines[:return_index]

new_return = """  return (
    <div className="flex flex-col -mx-6 -mt-6 h-[calc(100vh-4rem)] font-sans">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="flex flex-col h-full overflow-hidden">
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

          <div className="flex-1 overflow-y-auto bg-[#fafafa] dark:bg-[#1c1f22] p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto flex flex-col gap-8">
              
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
"""

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
    f.write(new_return)
