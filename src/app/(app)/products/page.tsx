
'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/products/product-card';
import { useProductStore } from '@/lib/product-store';
import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Search, Package } from 'lucide-react'; // Added Package
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton'; // Added Skeleton
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'; // Added Card imports

export default function ProductsPage() {
  const {
    products: allProducts,
    fetchProducts,
    isLoading,
    error
  } = useProductStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Fetch products from API when component mounts
    fetchProducts();
    setMounted(true);
  }, [fetchProducts]);


  const filteredProducts = allProducts.filter(product => {
    const nameMatch = product.basicInfo.name.en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      product.basicInfo.name.no?.toLowerCase().includes(searchTerm.toLowerCase());
    const skuMatch = product.basicInfo.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const brandMatch = product.basicInfo.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || skuMatch || brandMatch;
  });

  if (!mounted || isLoading && allProducts.length === 0) { // Show skeletons if loading and no products yet
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card className="flex flex-col overflow-hidden shadow-lg" key={i}>
              <CardHeader className="p-0">
                <Skeleton className="relative w-full aspect-square bg-muted/20" />
                <div className="p-6">
                  <Skeleton className="h-5 w-20 mb-2" />
                  <Skeleton className="h-6 w-3/4 mb-1" />
                  <Skeleton className="h-4 w-1/2 mb-1" />
                  <Skeleton className="h-10 w-full mb-2" />
                </div>
              </CardHeader>
              <CardContent className="flex-grow p-6 pt-0">
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter className="p-4 bg-muted/30 flex justify-between items-center">
                <Skeleton className="h-8 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-destructive">Error loading products: {error}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-primary">Product Catalog</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
          <Link href="/products/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Add New
            </Button>
          </Link>
        </div>
      </div>

      {allProducts.length === 0 && !isLoading ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Products Found</h2>
          <p className="text-muted-foreground mb-6">
            It looks like there are no products yet.
            <Link href="/products/new" className="text-primary hover:underline">
              Add a new product
            </Link> to get started.
          </p>
        </div>
      ) : filteredProducts.length === 0 && searchTerm ? (
         <div className="text-center py-12">
          <Package className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Products Found for "{searchTerm}"</h2>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search term or <Link href="/products/new" className="text-primary hover:underline">add a new product</Link>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
