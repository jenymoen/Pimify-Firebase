
'use client';

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorkflowState } from '@/types/workflow';
import { useProductStore } from '@/lib/product-store';
import { useSkuSeriesStore } from '@/lib/sku-series-store';
import type { Product } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, DownloadCloud, FileJson, AlertTriangle, ShoppingCart, Save, Settings, RefreshCw, FileText, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useShopifyConfigStore } from '@/lib/shopify-config-store';
import { productsToCSV, parseCSV, validateCSVData, groupCSVRows, csvGroupToProduct } from '@/lib/csv-utils';
import { downloadCSVTemplate } from '@/lib/csv-template';

import { useBusinessCentralConfigStore } from '@/lib/business-central-config-store';

export default function ImportExportPage() {
  const { products, importProducts: storeImportProducts } = useProductStore();
  const skuSeries = useSkuSeriesStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [isImportingJson, setIsImportingJson] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [csvImportError, setCsvImportError] = useState<string | null>(null);

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

  // Business Central State
  const {
    tenantId,
    environment,
    clientId,
    clientSecret,
    companyId,
    setTenantId,
    setEnvironment,
    setClientId,
    setClientSecret,
    setCompanyId,
    isConfigured: isBcConfigured
  } = useBusinessCentralConfigStore();

  const [localTenantId, setLocalTenantId] = useState('');
  const [localEnvironment, setLocalEnvironment] = useState('');
  const [localClientId, setLocalClientId] = useState('');
  const [localClientSecret, setLocalClientSecret] = useState('');
  const [localCompanyId, setLocalCompanyId] = useState('');
  const [clientBcReady, setClientBcReady] = useState(false);
  const [isImportingFromBc, setIsImportingFromBc] = useState(false);
  const [isExportingToBc, setIsExportingToBc] = useState(false);

  useEffect(() => {
    setLocalStoreUrl(storeUrl);
    setLocalApiKey(apiKey);
  }, [storeUrl, apiKey]);

  useEffect(() => {
    setClientShopifyReady(isConfigured());
  }, [isConfigured, storeUrl, apiKey]);

  useEffect(() => {
    setLocalTenantId(tenantId);
    setLocalEnvironment(environment);
    setLocalClientId(clientId);
    setLocalClientSecret(clientSecret);
    setLocalCompanyId(companyId);
  }, [tenantId, environment, clientId, clientSecret, companyId]);

  useEffect(() => {
    setClientBcReady(isBcConfigured());
  }, [isBcConfigured, tenantId, environment, clientId, clientSecret, companyId]);


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

  const handleExportCsv = () => {
    try {
      const csvContent = productsToCSV(products);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Pimify_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'CSV Export Successful', description: 'Product data has been exported to CSV.' });
    } catch (error: any) {
      toast({ title: 'CSV Export Failed', description: error.message || 'Failed to export CSV file.', variant: 'destructive' });
    }
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

      if (!Array.isArray(importedData) || !importedData.every(item => typeof item === 'object' && item !== null && (item.id || (item.basicInfo && (item.basicInfo.sku || item.basicInfo.name)) || item.sku || item.name))) {
        throw new Error("Invalid JSON format. Expected an array of products.");
      }

      await storeImportProducts(importedData as Product[]);
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

  const handleCSVFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setCsvImportError(null);
    setCsvFileName(null);
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setIsImportingCsv(true);

    try {
      const fileContent = await file.text();
      const csvRows = parseCSV(fileContent);

      if (csvRows.length === 0) {
        throw new Error("No valid data found in CSV file.");
      }

      // Assign SKUs from the configured series to rows that have none
      // Only the first row of each product carries the product SKU; variant rows don't need one
      const missing = groupCSVRows(csvRows).map(g => g.rows[0]).filter(row => !row.sku || row.sku.trim() === '');
      if (missing.length > 0) {
        const generated = await skuSeries.allocate(missing.length);
        missing.forEach((row, i) => { if (generated[i]) row.sku = generated[i]; });
      }

      // Validate CSV data
      const validation = validateCSVData(csvRows);
      if (!validation.valid) {
        throw new Error(`Validation errors found:\n${validation.errors.join('\n')}`);
      }

      // Convert CSV rows to products
      // Rows sharing an id are one product with several variants
      const products = groupCSVRows(csvRows).map(g => csvGroupToProduct(g.rows)).filter(Boolean) as Product[];

      if (products.length === 0) {
        throw new Error("No valid products could be created from the CSV data.");
      }

      await storeImportProducts(products);
      toast({ title: 'CSV Import Successful', description: `${products.length} products imported from CSV.` });

    } catch (err: any) {
      console.error('CSV Import error:', err);
      setCsvImportError(`Failed to import: ${err.message || 'Invalid CSV file.'}`);
      toast({ title: 'CSV Import Failed', description: err.message || 'Please check the file format and try again.', variant: 'destructive' });
    } finally {
      setIsImportingCsv(false);
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = '';
      }
    }
  };

  const handleSaveShopifyConfig = () => {
    setShopifyStoreUrl(localStoreUrl);
    setShopifyApiKey(localApiKey);
    setNextPageCursor(null); // Reset pagination on config change
    toast({ title: 'Shopify Configuration Saved', description: 'Your Shopify Store URL and API Key have been saved locally.' });
  };


  // Shopify credentials may be configured on the server (.env.local) instead of in the browser
  const [shopifyServerConfig, setShopifyServerConfig] = useState<{ configured: boolean; storeDomain: string | null } | null>(null);
  useEffect(() => {
    fetch('/api/shopify/config')
      .then(res => res.json())
      .then(setShopifyServerConfig)
      .catch(() => setShopifyServerConfig({ configured: false, storeDomain: null }));
  }, []);
  const shopifyReady = !!shopifyServerConfig?.configured || (!!localStoreUrl.trim() && !!localApiKey.trim());

  // Use what is in the form fields right now (and save it), so an edited but
  // unsaved Store URL / token is never silently ignored in favour of the old one
  const getShopifyCredentials = () => {
    // Credentials in the server environment win; don't send browser-stored ones at all
    if (shopifyServerConfig?.configured) return {};
    const url = localStoreUrl.trim();
    const key = localApiKey.trim();
    if (url !== storeUrl) setShopifyStoreUrl(url);
    if (key !== apiKey) setShopifyApiKey(key);
    return { storeUrl: url, apiKey: key };
  };

  const handleImportFromShopify = async () => {
    if (!shopifyReady) {
      toast({ title: 'Configuration Incomplete', description: 'Please configure Shopify Store URL and API Key.', variant: 'destructive' });
      return;
    }
    setIsImportingFromShopify(true);
    try {
      const response = await fetch('/api/shopify/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getShopifyCredentials(), pageInfo: nextPageCursor }),
      });

      if (!response.ok) {
        let errorBody = `API request failed: ${response.status} ${response.statusText}`;
        try {
          const text = await response.text();
          try {
            const errorData = JSON.parse(text);
            errorBody = errorData.error || JSON.stringify(errorData);
          } catch {
            errorBody = text || errorBody;
          }
        } catch (e) {
          // Fallback if text() fails
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
    if (!shopifyReady) {
      toast({ title: 'Configuration Incomplete', description: 'Please configure Shopify Store URL and API Key.', variant: 'destructive' });
      return;
    }
    setIsExportingToShopify(true);
    try {
      const callExport = async (dryRun: boolean) => {
        const response = await fetch('/api/shopify/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // No product list: the server exports every published product from the database
          body: JSON.stringify({ ...getShopifyCredentials(), dryRun }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const details = Array.isArray(data.errors) ? `\n${data.errors.slice(0, 3).join('\n')}` : '';
          throw new Error((data.error || data.message || `Request failed (${response.status})`) + details);
        }
        return data;
      };

      // 1. Preview: what would be updated vs. created in Shopify
      const preview = await callExport(true);
      const createList = preview.create.slice(0, 10).map((p: any) => `  • ${p.name} (${p.sku})`).join('\n');
      const confirmed = window.confirm(
        `Export ${preview.update.length + preview.create.length} published products to Shopify?\n\n` +
        `• ${preview.update.length} will UPDATE existing Shopify products ` +
        `(matched by: linked ${preview.matchedBy.linked}, variant id ${preview.matchedBy.variantId}, SKU ${preview.matchedBy.sku}, title ${preview.matchedBy.title})\n` +
        `• ${preview.create.length} will be CREATED as new products` +
        (createList ? `:\n${createList}${preview.create.length > 10 ? `\n  …and ${preview.create.length - 10} more` : ''}` : '') +
        (preview.warnings?.length ? `\n\nWarnings:\n${preview.warnings.slice(0, 5).join('\n')}` : '') +
        `\n\nUpdates change title, description, vendor, type, tags, status and variant prices. Images and variants in Shopify are not removed.`
      );
      if (!confirmed) {
        toast({ title: 'Export cancelled', description: 'Nothing was sent to Shopify.' });
        return;
      }

      // 2. Run it
      const data = await callExport(false);
      if (data.warnings?.length) console.warn('Shopify export warnings:', data.warnings);
      toast({
        title: data.errors?.length ? 'Shopify Export Partly Failed' : 'Shopify Export Successful',
        description: data.message + (data.warnings?.length ? ` (${data.warnings.length} warnings, see console)` : ''),
        variant: data.errors?.length ? 'destructive' : undefined,
      });
    } catch (error: any) {
      console.error('Shopify Export Error:', error);
      toast({ title: 'Shopify Export Failed', description: error.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setIsExportingToShopify(false);
    }
  };

  const handleSaveBcConfig = () => {
    setTenantId(localTenantId);
    setEnvironment(localEnvironment);
    setClientId(localClientId);
    setClientSecret(localClientSecret);
    setCompanyId(localCompanyId);
    toast({ title: 'Business Central Configuration Saved', description: 'Your Business Central credentials have been saved locally.' });
  };

  const handleImportFromBc = async () => {
    if (!clientBcReady) {
      toast({ title: 'Configuration Incomplete', description: 'Please configure Business Central credentials.', variant: 'destructive' });
      return;
    }
    setIsImportingFromBc(true);
    try {
      const response = await fetch('/api/business-central/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, environment, clientId, clientSecret, companyId }),
      });

      if (!response.ok) {
        let errorBody = `API request failed: ${response.status} ${response.statusText}`;
        try {
          const text = await response.text();
          try {
            const errorData = JSON.parse(text);
            errorBody = errorData.error || JSON.stringify(errorData);
          } catch {
            errorBody = text || errorBody;
          }
        } catch (e) {
          // Fallback if text() fails
        }
        throw new Error(errorBody);
      }

      const data = await response.json();

      storeImportProducts(data.products as Product[]);
      toast({ title: 'Business Central Import Successful', description: data.message });
    } catch (error: any) {
      console.error('Business Central Import Error:', error);
      toast({ title: 'Business Central Import Failed', description: error.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setIsImportingFromBc(false);
    }
  };

  const handleExportToBc = async () => {
    if (!clientBcReady) {
      toast({ title: 'Configuration Incomplete', description: 'Please configure Business Central credentials.', variant: 'destructive' });
      return;
    }
    if (products.length === 0) {
      toast({ title: 'No Products to Export', description: 'Add some products before exporting.' });
      return;
    }

    setIsExportingToBc(true);
    try {
      const response = await fetch('/api/business-central/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, environment, clientId, clientSecret, companyId, productsToExport: products }),
      });

      if (!response.ok) {
        let errorBody = `API request failed: ${response.status} ${response.statusText}`;
        try {
          const text = await response.text();
          try {
            const errorData = JSON.parse(text);
            errorBody = errorData.error || JSON.stringify(errorData);
          } catch {
            errorBody = text || errorBody;
          }
        } catch (e) {
          // Fallback if text() fails
        }
        throw new Error(errorBody);
      }

      const data = await response.json();

      toast({ title: 'Business Central Export Successful', description: data.message });
    } catch (error: any) {
      console.error('Business Central Export Error:', error);
      toast({ title: 'Business Central Export Failed', description: error.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setIsExportingToBc(false);
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UploadCloud className="h-6 w-6 text-primary" /> Import Products (CSV)
            </CardTitle>
            <CardDescription>
              Import products from a CSV file. Download the template first to see the required format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="file"
              accept=".csv"
              ref={csvFileInputRef}
              onChange={handleCSVFileChange}
              className="hidden"
              id="import-csv-file-input"
            />
            <div className="space-y-2">
              <Button onClick={() => csvFileInputRef.current?.click()} disabled={isImportingCsv} className="w-full">
                <FileText className="mr-2 h-5 w-5" /> {isImportingCsv ? 'Importing...' : 'Choose CSV File'}
              </Button>
              <Button onClick={downloadCSVTemplate} variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" /> Download Template
              </Button>
            </div>
            {csvFileName && <p className="text-sm text-muted-foreground">Selected file: {csvFileName}</p>}
            {csvImportError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>CSV Import Error</AlertTitle>
                <AlertDescription className="whitespace-pre-line">{csvImportError}</AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              Use the template to ensure proper CSV format. Required fields: SKU, English name, brand.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <DownloadCloud className="h-6 w-6 text-primary" /> Export Products (CSV)
            </CardTitle>
            <CardDescription>
              Export all current product data to a CSV file for spreadsheet editing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExportCsv} disabled={products.length === 0} className="w-full">
              <FileText className="mr-2 h-5 w-5" /> Export All Products
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
          {shopifyServerConfig?.configured && (
            <div className="p-3 rounded-md border border-emerald-200 bg-emerald-50 text-sm text-emerald-800">
              Shopify is configured on the server for <strong>{shopifyServerConfig.storeDomain}</strong> (.env.local).
              Those credentials are used for import and export; the fields below are ignored.
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Which Pimify fields are sent to which Shopify fields is set under{' '}
            <a href="/settings/shopify-mapping" className="underline text-primary">Settings → Shopify Mapping</a>.
          </p>
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
              disabled={!shopifyReady || isImportingFromShopify || isExportingToShopify}
            >
              {isImportingFromShopify ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <DownloadCloud className="mr-2 h-5 w-5" />}
              {isImportingFromShopify
                ? 'Importing...'
                : (nextPageCursor ? 'Import Next 50 Products' : 'Import from Shopify')}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportToShopify}
              disabled={!shopifyReady || isImportingFromShopify || isExportingToShopify}
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

      <h2 className="text-2xl font-semibold text-primary mb-6 pt-4 border-t mt-8">Business Central Integration</h2>
      <Card className="shadow-lg col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <RefreshCw className="h-6 w-6 text-primary" /> Business Central Sync
          </CardTitle>
          <CardDescription>
            Connect to Microsoft Dynamics 365 Business Central.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 p-4 border rounded-md bg-muted/20">
            <h3 className="font-medium text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5" /> Connection Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bc-tenant-id" className="text-sm font-medium">Tenant ID</Label>
                <Input
                  id="bc-tenant-id"
                  type="text"
                  placeholder="e.g., 00000000-0000-0000-0000-000000000000"
                  value={localTenantId}
                  onChange={(e) => setLocalTenantId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="bc-environment" className="text-sm font-medium">Environment</Label>
                <Input
                  id="bc-environment"
                  type="text"
                  placeholder="e.g., Production"
                  value={localEnvironment}
                  onChange={(e) => setLocalEnvironment(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="bc-client-id" className="text-sm font-medium">Client ID</Label>
                <Input
                  id="bc-client-id"
                  type="text"
                  placeholder="Azure AD App Client ID"
                  value={localClientId}
                  onChange={(e) => setLocalClientId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="bc-client-secret" className="text-sm font-medium">Client Secret</Label>
                <Input
                  id="bc-client-secret"
                  type="password"
                  placeholder="Azure AD App Client Secret"
                  value={localClientSecret}
                  onChange={(e) => setLocalClientSecret(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="bc-company-id" className="text-sm font-medium">Company ID</Label>
                <Input
                  id="bc-company-id"
                  type="text"
                  placeholder="e.g., My Company Ltd."
                  value={localCompanyId}
                  onChange={(e) => setLocalCompanyId(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  The ID or Name of the company in Business Central to sync with.
                </p>
              </div>
            </div>
            <Button onClick={handleSaveBcConfig}>
              <Save className="mr-2 h-4 w-4" /> Save Configuration
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t mt-6">
            <Button
              variant="outline"
              onClick={handleImportFromBc}
              disabled={!clientBcReady || isImportingFromBc || isExportingToBc}
            >
              {isImportingFromBc ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <DownloadCloud className="mr-2 h-5 w-5" />}
              {isImportingFromBc ? 'Importing...' : 'Import from Business Central'}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportToBc}
              disabled={!clientBcReady || isImportingFromBc || isExportingToBc || products.length === 0}
            >
              {isExportingToBc ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <UploadCloud className="mr-2 h-5 w-5" />}
              {isExportingToBc ? 'Exporting...' : 'Export to Business Central'}
            </Button>
          </div>
          {!clientBcReady && (
            <Alert variant="default" className="bg-accent/10 border-accent/30 text-accent-foreground">
              <Settings className="h-4 w-4 text-accent" />
              <AlertTitle>Configuration Required</AlertTitle>
              <AlertDescription>
                Please enter and save your Business Central credentials to enable integration.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
