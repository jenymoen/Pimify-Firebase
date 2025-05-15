'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useProductStore } from '@/lib/product-store';
import type { Product } from '@/types/product';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, DownloadCloud, FileJson, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ImportExportPage() {
  const { products, importProducts, setProducts } = useProductStore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    const jsonString = JSON.stringify(products, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `produkthjelp_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: 'Export Successful', description: 'Product data has been exported.' });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setFileName(null);
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsImporting(true);

    try {
      const fileContent = await file.text();
      const importedData = JSON.parse(fileContent);
      
      // Basic validation: check if it's an array of objects with at least an 'id' or 'basicInfo.sku'
      if (!Array.isArray(importedData) || !importedData.every(item => typeof item === 'object' && (item.id || (item.basicInfo && item.basicInfo.sku)))) {
        throw new Error("Invalid JSON format. Expected an array of products.");
      }
      
      // Option 1: Replace all products
      setProducts(importedData as Product[]);
      toast({ title: 'Import Successful', description: `${importedData.length} products imported and replaced existing data.` });

      // Option 2: Merge products (more complex, using the store's importProducts for merging)
      // importProducts(importedData as Product[]);
      // toast({ title: 'Import Successful', description: `${importedData.length} products processed.` });

    } catch (err: any) {
      console.error('Import error:', err);
      setError(`Failed to import: ${err.message || 'Invalid JSON file.'}`);
      toast({ title: 'Import Failed', description: err.message || 'Please check the file format and try again.', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Import / Export Products</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UploadCloud className="h-6 w-6 text-primary" /> Import Products
            </CardTitle>
            <CardDescription>
              Import products from a JSON file. This will replace all existing product data.
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
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Import Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
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
              <DownloadCloud className="h-6 w-6 text-primary" /> Export Products
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
    </div>
  );
}
