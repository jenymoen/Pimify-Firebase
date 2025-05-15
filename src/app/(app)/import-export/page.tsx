
'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProductStore } from '@/lib/product-store';
import type { Product } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, DownloadCloud, FileJson, AlertTriangle, ShoppingCart, Save, Settings, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useShopifyConfigStore } from '@/lib/shopify-config-store';
import { initialProductData, defaultMultilingualString } from '@/types/product'; // For dummy data
import { v4 as uuidv4 } from 'uuid'; // For dummy data

export default function ImportExportPage() {
  const { products, setProducts: setStoreProducts, importProducts: storeImportProducts } = useProductStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const { 
    storeUrl, 
    apiKey, 
    setStoreUrl: setShopifyStoreUrl, // Renamed to avoid conflict
    setApiKey: setShopifyApiKey,     // Renamed to avoid conflict
    isConfigured 
  } = useShopifyConfigStore();

  const [localStoreUrl, setLocalStoreUrl] = useState('');
  const [localApiKey, setLocalApiKey] = useState('');

  const [isImportingFromShopify, setIsImportingFromShopify] = useState(false);
  const [isExportingToShopify, setIsExportingToShopify] = useState(false);

  useEffect(() => {
    setLocalStoreUrl(storeUrl);
    setLocalApiKey(apiKey);
  }, [storeUrl, apiKey]);

  const handleExport = () => {
    const jsonString = JSON.stringify(products, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pimify_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Export Successful', description: 'Product data has been exported.' });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setFileName(null);
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsImporting(true);

    try {
      const fileContent = await file.text();
      const importedData = JSON.parse(fileContent);
      
      if (!Array.isArray(importedData) || !importedData.every(item => typeof item === 'object' && (item.id || (item.basicInfo && item.basicInfo.sku)))) {
        throw new Error("Invalid JSON format. Expected an array of products.");
      }
      
      storeImportProducts(importedData as Product[]); // Use store's import function
      toast({ title: 'Import Successful', description: `${importedData.length} products imported.` });

    } catch (err: any) {
      console.error('Import error:', err);
      setImportError(`Failed to import: ${err.message || 'Invalid JSON file.'}`);
      toast({ title: 'Import Failed', description: err.message || 'Please check the file format and try again.', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveShopifyConfig = () => {
    setShopifyStoreUrl(localStoreUrl);
    setShopifyApiKey(localApiKey);
    toast({ title: 'Shopify Configuration Saved', description: 'Your Shopify API settings have been saved locally.' });
  };

  const shopifyReady = isConfigured();

  const handleImportFromShopify = async () => {
    if (!shopifyReady) {
      toast({ title: 'Configuration Incomplete', description: 'Please configure Shopify URL and API Key.', variant: 'destructive' });
      return;
    }
    setIsImportingFromShopify(true);
    try {
      const apiUrl = `https://${storeUrl}/admin/api/2024-04/products.json`; // Example API version
      console.log(`Simulating fetch from: ${apiUrl} with key: ${apiKey.substring(0, 5)}...`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate received data (this would come from Shopify)
      const dummyShopifyProducts: Product[] = [
        {
          ...initialProductData,
          id: 'SHOPIFY-SKU-001',
          basicInfo: {
            name: { en: 'Shopify Imported T-Shirt', no: 'Shopify Importert T-skjorte' },
            sku: 'SHOPIFY-SKU-001',
            descriptionShort: { en: 'A cool t-shirt from Shopify.', no: 'En kul t-skjorte fra Shopify.' },
            descriptionLong: { en: 'Detailed description for the Shopify t-shirt.', no: 'Detaljert beskrivelse for Shopify t-skjorten.' },
            brand: 'ShopifyBrand',
            status: 'active',
          },
          media: { images: [{ id: uuidv4(), url: 'https://placehold.co/300x300.png?text=Shopify+T-Shirt', type: 'image', altText: defaultMultilingualString }]},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
         {
          ...initialProductData,
          id: 'SHOPIFY-SKU-002',
          basicInfo: {
            name: { en: 'Shopify Imported Mug', no: 'Shopify Importert Krus' },
            sku: 'SHOPIFY-SKU-002',
            descriptionShort: { en: 'A nice mug from Shopify.', no: 'Et fint krus fra Shopify.' },
            descriptionLong: { en: 'Detailed description for the Shopify mug.', no: 'Detaljert beskrivelse for Shopify kruset.' },
            brand: 'ShopifyBrand',
            status: 'active',
          },
           media: { images: [{ id: uuidv4(), url: 'https://placehold.co/300x300.png?text=Shopify+Mug', type: 'image', altText: defaultMultilingualString }]},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      
      storeImportProducts(dummyShopifyProducts); // Use the merging import function
      
      toast({ title: 'Shopify Import (Simulated)', description: `${dummyShopifyProducts.length} products 'imported' from Shopify.` });
    } catch (error: any) {
      console.error('Shopify Import Error:', error);
      toast({ title: 'Shopify Import Failed', description: error.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setIsImportingFromShopify(false);
    }
  };

  const handleExportToShopify = async () => {
    if (!shopifyReady) {
      toast({ title: 'Configuration Incomplete', description: 'Please configure Shopify URL and API Key.', variant: 'destructive' });
      return;
    }
    if (products.length === 0) {
      toast({ title: 'No Products to Export', description: 'Add some products before exporting.', variant: 'default' });
      return;
    }

    setIsExportingToShopify(true);
    try {
      let exportedCount = 0;
      for (const product of products) {
        // Example: Shopify API endpoint for creating a product
        const apiUrl = `https://${storeUrl}/admin/api/2024-04/products.json`;
        console.log(`Simulating export of "${product.basicInfo.name.en}" to: ${apiUrl} with key: ${apiKey.substring(0,5)}...`);
        
        // Simulate API call for each product
        // In a real scenario, you'd map your product data to Shopify's format here
        // const shopifyProductPayload = { product: { title: product.basicInfo.name.en, ... } };
        // await fetch(apiUrl, { method: 'POST', headers: { 'X-Shopify-Access-Token': apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(shopifyProductPayload) });
        
        await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay per product
        exportedCount++;
      }
      
      toast({ title: 'Shopify Export (Simulated)', description: `${exportedCount} products 'exported' to Shopify.` });
    } catch (error: any) {
      console.error('Shopify Export Error:', error);
      toast({ title: 'Shopify Export Failed', description: error.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setIsExportingToShopify(false);
    }
  };


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Import / Export Products</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UploadCloud className="h-6 w-6 text-primary" /> Import Products (JSON)
            </CardTitle>
            <CardDescription>
              Import products from a JSON file. This will merge with existing product data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              id="import-file-input"
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="w-full">
              <FileJson className="mr-2 h-5 w-5" /> {isImporting ? 'Importing...' : 'Choose JSON File'}
            </Button>
            {fileName && <p className="text-sm text-muted-foreground">Selected file: {fileName}</p>}
            {importError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Import Error</AlertTitle>
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              Ensure your JSON file is an array of product objects matching the system's data structure.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <DownloadCloud className="h-6 w-6 text-primary" /> Export Products (JSON)
            </CardTitle>
            <CardDescription>
              Export all current product data to a JSON file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={products.length === 0} className="w-full">
              <FileJson className="mr-2 h-5 w-5" /> Export All Products
            </Button>
            {products.length === 0 && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                There are no products to export.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-semibold text-primary mb-6 pt-4 border-t">Shopify Integration</h2>
      <Card className="shadow-lg col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="h-6 w-6 text-primary" /> Shopify Sync
          </CardTitle>
          <CardDescription>
            Connect to your Shopify store to import or export products. API key and store URL are required.
            <br />
            <span className="text-destructive text-xs font-semibold">
              Note: API interactions are simulated. For production, use server-side API calls for security.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 p-4 border rounded-md bg-muted/20">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5" /> API Configuration
            </h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="shopify-store-url" className="text-sm font-medium">Shopify Store URL</Label>
                <Input 
                  id="shopify-store-url" 
                  type="text" 
                  placeholder="e.g., your-store-name.myshopify.com" 
                  value={localStoreUrl}
                  onChange={(e) => setLocalStoreUrl(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="shopify-api-key" className="text-sm font-medium">Shopify Admin API Access Token</Label>
                <Input 
                  id="shopify-api-key" 
                  type="password" 
                  placeholder="Enter your Shopify Admin API Access Token" 
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  className="mt-1"
                />
                 <p className="text-xs text-muted-foreground mt-1">
                  This is typically an Admin API access token (starting with "shpat_"). Stored locally in your browser.
                </p>
              </div>
              <Button onClick={handleSaveShopifyConfig}>
                <Save className="mr-2 h-4 w-4" /> Save Configuration
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t mt-6">
            <Button 
              variant="outline" 
              onClick={handleImportFromShopify} 
              disabled={!shopifyReady || isImportingFromShopify || isExportingToShopify}
            >
              {isImportingFromShopify ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <DownloadCloud className="mr-2 h-5 w-5" />}
              {isImportingFromShopify ? 'Importing...' : 'Import from Shopify'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportToShopify} 
              disabled={!shopifyReady || isImportingFromShopify || isExportingToShopify || products.length === 0}
            >
              {isExportingToShopify ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
              {isExportingToShopify ? 'Exporting...' : 'Export to Shopify'}
            </Button>
          </div>
          {!shopifyReady && (
             <Alert variant="default" className="bg-accent/10 border-accent/30 text-accent-foreground">
                <Settings className="h-4 w-4 text-accent" />
                <AlertTitle>Configuration Required</AlertTitle>
                <AlertDescription>
                 Please enter and save your Shopify Store URL and API Access Token to enable Shopify integration.
                </AlertDescription>
              </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

