
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

export default function ImportExportPage() {
  const { products, importProducts: storeImportProducts } = useProductStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingJson, setIsImportingJson] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const { 
    storeUrl, 
    apiKey,
    setStoreUrl: setShopifyStoreUrl,
    setApiKey: setShopifyApiKey,
    isConfigured 
  } = useShopifyConfigStore();

  const [localStoreUrl, setLocalStoreUrl] = useState('');
  const [localApiKey, setLocalApiKey] = useState('');
  const [clientShopifyReady, setClientShopifyReady] = useState(false); 

  const [isImportingFromShopify, setIsImportingFromShopify] = useState(false);
  const [isExportingToShopify, setIsExportingToShopify] = useState(false);
  const [nextPageCursor, setNextPageCursor] = useState<string | null>(null);

  useEffect(() => {
    setLocalStoreUrl(storeUrl);
    setLocalApiKey(apiKey);
  }, [storeUrl, apiKey]);

  useEffect(() => {
    setClientShopifyReady(isConfigured());
  }, [isConfigured, storeUrl, apiKey]);


  const handleExportJson = () => {
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
      const importedData = JSON.parse(fileContent);
      
      if (!Array.isArray(importedData) || !importedData.every(item => typeof item === 'object' && (item.id || (item.basicInfo && item.basicInfo.sku)))) {
        throw new Error("Invalid JSON format. Expected an array of products.");
      }
      
      storeImportProducts(importedData as Product[]);
      toast({ title: 'JSON Import Successful', description: `${importedData.length} products imported.` });

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

  const handleSaveShopifyConfig = () => {
    setShopifyStoreUrl(localStoreUrl);
    setShopifyApiKey(localApiKey);
    setNextPageCursor(null); // Reset pagination on config change
    toast({ title: 'Shopify Configuration Saved', description: 'Your Shopify Store URL and API Key have been saved locally.' });
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
        body: JSON.stringify({ storeUrl, apiKey, pageInfo: nextPageCursor }),
      });

      if (!response.ok) {
        let errorBody = `API request failed: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorBody = errorData.error || JSON.stringify(errorData);
        } catch (e) {
          errorBody = await response.text(); // Fallback to text if JSON parsing fails
        }
        throw new Error(errorBody);
      }
      
      const data = await response.json(); // Safe to parse as JSON if response.ok
      
      storeImportProducts(data.products as Product[]);
      setNextPageCursor(data.nextPageCursor || null);
      toast({ title: 'Shopify Import Successful', description: data.message });
    } catch (error: any) {
      console.error('Shopify Import Error:', error);
      setNextPageCursor(null); // Reset cursor on error
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
        body: JSON.stringify({ storeUrl, apiKey, productsToExport: products }),
      });

      if (!response.ok) {
        let errorBody = `API request failed: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorBody = errorData.error || JSON.stringify(errorData);
        } catch (e) {
           errorBody = await response.text(); // Fallback to text if JSON parsing fails
        }
        throw new Error(errorBody);
      }
      
      const data = await response.json(); // Safe to parse as JSON if response.ok
      
      toast({ title: 'Shopify Export Successful', description: data.message });
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
            Connect to your Shopify store to import or export products. Your Store URL and Admin API Access Token are required.
            <br />
            <span className="text-xs font-semibold text-destructive">
              Security Note: Your API Access Token will be stored in your browser's local storage.
              Ensure you are on a secure computer and network.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 p-4 border rounded-md bg-muted/20">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5" /> Store Configuration
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
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  className="mt-1"
                />
                 <p className="text-xs text-muted-foreground mt-1">
                  Your Admin API Access Token is used to authenticate with Shopify.
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
              disabled={!clientShopifyReady || isImportingFromShopify || isExportingToShopify}
            >
              {isImportingFromShopify ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <DownloadCloud className="mr-2 h-5 w-5" />}
              {isImportingFromShopify 
                ? 'Importing...' 
                : (nextPageCursor ? 'Import Next 50 Products' : 'Import from Shopify')}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportToShopify} 
              disabled={!clientShopifyReady || isImportingFromShopify || isExportingToShopify || products.length === 0}
            >
              {isExportingToShopify ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
              {isExportingToShopify ? 'Exporting...' : 'Export to Shopify'}
            </Button>
          </div>
          {!clientShopifyReady && (
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

