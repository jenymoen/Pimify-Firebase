
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
import { Skeleton } from '@/components/ui/skeleton';

export default function ImportExportPage() {
  const { products, importProducts: storeImportProducts, setProducts: storeSetProducts, fetchProducts: fetchPimProducts } = useProductStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingJson, setIsImportingJson] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const {
    storeUrl,
    apiKey,
    setStoreUrl: setLocalShopifyStoreUrl,
    setApiKey: setLocalShopifyApiKey,
    isConfigured,
    fetchShopifyConfig,
    saveShopifyConfig,
    isLoading: isShopifyConfigLoading,
    isFetched: isShopifyConfigFetched,
    error: shopifyConfigError
  } = useShopifyConfigStore();

  const [inputStoreUrl, setInputStoreUrl] = useState('');
  const [inputApiKey, setInputApiKey] = useState('');
  const [clientShopifyReady, setClientShopifyReady] = useState(false);

  const [isImportingFromShopify, setIsImportingFromShopify] = useState(false);
  const [isExportingToShopify, setIsExportingToShopify] = useState(false);
  const [nextPageCursor, setNextPageCursor] = useState<string | null>(null);

  useEffect(() => {
    if (!isShopifyConfigFetched && !isShopifyConfigLoading) {
      fetchShopifyConfig();
    }
  }, [fetchShopifyConfig, isShopifyConfigFetched, isShopifyConfigLoading]);

  useEffect(() => {
    setInputStoreUrl(storeUrl);
    setInputApiKey(apiKey);
  }, [storeUrl, apiKey]);

  useEffect(() => {
    setClientShopifyReady(isConfigured());
  }, [isConfigured, storeUrl, apiKey]);


  const handleExportJson = () => {
    if (products.length === 0) {
      toast({ title: 'No Products', description: 'There are no products to export.', variant: 'destructive' });
      return;
    }
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
    toast({ title: 'Export Successful', description: 'Product data has been exported to JSON.' });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setFileName(null);
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsImportingJson(true);

    try {
      const fileContent = await file.text();
      const importedData = JSON.parse(fileContent) as Product[];

      if (!Array.isArray(importedData) || !importedData.every(item => typeof item === 'object' && item.id && item.basicInfo && item.basicInfo.sku)) {
        throw new Error("Invalid JSON format. Expected an array of products with id and basicInfo.sku.");
      }
      
      // Instead of direct store manipulation, call API for each product (or a batch API if available)
      let successCount = 0;
      let errorCount = 0;
      for (const product of importedData) {
        try {
          // Attempt to save each product via API - this will either create or update (if using SKU as ID)
          const response = await fetch(`/api/products`, { // Assuming POST to /api/products handles create/update by SKU
            method: 'POST', // Or PUT to /api/products/${product.id} if ID is not SKU
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product),
          });
          if (!response.ok) {
            errorCount++;
            console.warn(`Failed to import product ${product.basicInfo.sku} via API: ${response.statusText}`);
          } else {
            successCount++;
          }
        } catch (apiError) {
          errorCount++;
          console.error(`Error importing product ${product.basicInfo.sku} via API:`, apiError);
        }
      }
      await fetchPimProducts(); // Re-fetch all products from PIM to reflect changes

      if (errorCount > 0) {
        toast({ title: 'JSON Import Partially Successful', description: `${successCount} products imported/updated. ${errorCount} products failed.`, variant: successCount > 0 ? 'default' : 'destructive' });
      } else {
        toast({ title: 'JSON Import Successful', description: `${successCount} products imported/updated.` });
      }

    } catch (err: any) {
      console.error('JSON Import error:', err);
      setImportError(`Failed to import: ${err.message || 'Invalid JSON file.'}`);
      toast({ title: 'JSON Import Failed', description: err.message || 'Please check the file format and try again.', variant: 'destructive' });
    } finally {
      setIsImportingJson(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveShopifyConfig = async () => {
    try {
      await saveShopifyConfig({ storeUrl: inputStoreUrl, apiKey: inputApiKey });
      setLocalShopifyStoreUrl(inputStoreUrl); // these are optimistic updates to local state
      setLocalShopifyApiKey(inputApiKey);
      setNextPageCursor(null); // Reset pagination on config change
      toast({ title: 'Shopify Configuration Saved', description: 'Your Shopify settings have been saved.' });
    } catch (error) {
      toast({ title: 'Save Failed', description: 'Could not save Shopify configuration.', variant: 'destructive' });
    }
  };


  const handleImportFromShopify = async () => {
    if (!clientShopifyReady) {
      toast({ title: 'Configuration Incomplete', description: 'Please configure Shopify Store URL and API Key.', variant: 'destructive' });
      return;
    }
    setIsImportingFromShopify(true);
    try {
      const response = await fetch('/api/shopify/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageInfo: nextPageCursor }),
      });

      if (!response.ok) {
        let errorBody = `API request failed: ${response.status} ${response.statusText}`;
        const responseText = await response.text();
        try {
          const errorData = JSON.parse(responseText);
          errorBody = errorData.error || errorData.message || JSON.stringify(errorData);
        } catch (e) {
          errorBody = responseText || errorBody;
        }
        throw new Error(errorBody);
      }
      
      const data = await response.json();
      console.log('Data from /api/shopify/import:', data); // Log the full response

      await fetchPimProducts(); // Re-fetch products from PIM to reflect changes
      setNextPageCursor(data.nextPageCursor || null);
      toast({ title: 'Shopify Import Status', description: data.message });

      if (data.errors && data.errors.length > 0) {
        console.error('Shopify import encountered errors saving some products:', data.errors);
        toast({
          title: 'Shopify Import Incomplete',
          description: `Some products could not be saved. Check console for details. ${data.message}`,
          variant: 'destructive',
          duration: 10000,
        });
      }

    } catch (error: any) {
      console.error('Shopify Import Error:', error);
      setNextPageCursor(null); // Reset pagination on error
      toast({ title: 'Shopify Import Failed', description: error.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setIsImportingFromShopify(false);
    }
  };

  const handleExportToShopify = async () => {
    if (!clientShopifyReady) {
      toast({ title: 'Configuration Incomplete', description: 'Please configure Shopify Store URL and API Key.', variant: 'destructive' });
      return;
    }
    if (products.length === 0) {
      toast({ title: 'No Products to Export', description: 'Add some products before exporting.' });
      return;
    }

    setIsExportingToShopify(true);
    try {
      const response = await fetch('/api/shopify/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productsToExport: products }),
      });

      if (!response.ok) {
        let errorBody = `API request failed: ${response.status} ${response.statusText}`;
        const responseText = await response.text();
        try {
          const errorData = JSON.parse(responseText);
          errorBody = errorData.error || errorData.message || JSON.stringify(errorData);
        } catch (e) {
          errorBody = responseText || errorBody;
        }
        throw new Error(errorBody);
      }

      const data = await response.json();
      toast({ title: 'Shopify Export Successful', description: data.message });
       if (data.errors && data.errors.length > 0) {
        console.error('Shopify export encountered errors for some products:', data.errors);
        toast({
          title: 'Shopify Export Incomplete',
          description: `Some products could not be exported. Check console for details. ${data.message}`,
          variant: 'destructive',
          duration: 10000,
        });
      }
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
              Import products from a JSON file. This will attempt to create or update products in the PIM based on SKU.
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
            <Button onClick={() => fileInputRef.current?.click()} disabled={isImportingJson} className="w-full">
              <FileJson className="mr-2 h-5 w-5" /> {isImportingJson ? 'Importing...' : 'Choose JSON File'}
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
              Ensure your JSON file is an array of product objects matching the PIM's data structure. Products will be created/updated via API.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <DownloadCloud className="h-6 w-6 text-primary" /> Export Products (JSON)
            </CardTitle>
            <CardDescription>
              Export all current product data from the PIM to a JSON file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExportJson} disabled={products.length === 0} className="w-full">
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
            Connect to your Shopify store to import or export products. Your Store URL and Admin API Access Token are required and saved per-tenant to the database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           {(isShopifyConfigLoading && !isShopifyConfigFetched) ? (
            <div className="space-y-4 p-4 border rounded-md bg-muted/20">
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-1/4" />
            </div>
          ) : (
          <div className="space-y-4 p-4 border rounded-md bg-muted/20">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5" /> Store Configuration
            </h3>
             {shopifyConfigError && !isShopifyConfigLoading && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error Loading Config</AlertTitle>
                  <AlertDescription>{shopifyConfigError}</AlertDescription>
                </Alert>
              )}
            <div className="space-y-3">
              <div>
                <Label htmlFor="shopify-store-url" className="text-sm font-medium">Shopify Store URL</Label>
                <Input
                  id="shopify-store-url"
                  type="text"
                  placeholder="e.g., your-store-name.myshopify.com"
                  value={inputStoreUrl}
                  onChange={(e) => setInputStoreUrl(e.target.value)}
                  className="mt-1"
                />
                 <p className="text-xs text-muted-foreground mt-1">
                  Enter the full URL of your Shopify store.
                </p>
              </div>
              <div>
                <Label htmlFor="shopify-api-key" className="text-sm font-medium">Shopify Admin API Access Token</Label>
                <Input
                  id="shopify-api-key"
                  type="password"
                  placeholder="Enter your Shopify Admin API Access Token (e.g., shpat_...)"
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                  className="mt-1"
                />
                 <p className="text-xs text-muted-foreground mt-1">
                  Your Admin API Access Token is used to authenticate with Shopify. Stored securely per tenant.
                </p>
              </div>
              <Button onClick={handleSaveShopifyConfig} disabled={isShopifyConfigLoading}>
                {isShopifyConfigLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Configuration
              </Button>
            </div>
          </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t mt-6">
            <Button
              variant="outline"
              onClick={handleImportFromShopify}
              disabled={!clientShopifyReady || isImportingFromShopify || isExportingToShopify || isShopifyConfigLoading}
            >
              {isImportingFromShopify ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <DownloadCloud className="mr-2 h-5 w-5" />}
              {isImportingFromShopify
                ? 'Importing...'
                : (nextPageCursor ? 'Import Next 50 Products' : 'Import from Shopify')}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportToShopify}
              disabled={!clientShopifyReady || isImportingFromShopify || isExportingToShopify || products.length === 0 || isShopifyConfigLoading}
            >
              {isExportingToShopify ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
              {isExportingToShopify ? 'Exporting...' : 'Export to Shopify'}
            </Button>
          </div>
          {!clientShopifyReady && isShopifyConfigFetched && !isShopifyConfigLoading &&(
             <Alert variant="default" className="bg-accent/10 border-accent/30 text-accent-foreground">
                <Settings className="h-4 w-4 text-accent" />
                <AlertTitle>Configuration Required</AlertTitle>
                <AlertDescription>
                 Please enter and save your Shopify Store URL and Admin API Access Token to enable Shopify integration.
                </AlertDescription>
              </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

