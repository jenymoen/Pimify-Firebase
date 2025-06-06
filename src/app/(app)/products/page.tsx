
'use client';

import { useEffect, useState, useMemo } from 'react';
import { ProductCard } from '@/components/products/product-card';
import { useProductStore } from '@/lib/product-store';
import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Search, Package, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const ALL_STATUSES_SELECT_VALUE = "__all_statuses__";
const ALL_BRANDS_SELECT_VALUE = "__all_brands__";

export default function ProductsPage() {
  const {
    products: allProducts,
    fetchProducts,
    isLoading,
    error
  } = useProductStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<Product['basicInfo']['status'] | ''>('');
  const [filterBrand, setFilterBrand] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetchProducts();
    setMounted(true);
  }, [fetchProducts]);

  const productStatusesOptions: Array<{ value: Product['basicInfo']['status'] | typeof ALL_STATUSES_SELECT_VALUE, label: string }> = [
    { value: ALL_STATUSES_SELECT_VALUE, label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'development', label: 'Development' },
    { value: 'discontinued', label: 'Discontinued' },
  ];

  const uniqueBrandOptions = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [{ label: 'All Brands', value: ALL_BRANDS_SELECT_VALUE }];
    const brands = allProducts.map(p => p.basicInfo.brand).filter((brand): brand is string => !!brand && brand.trim() !== '');
    const distinctBrands = Array.from(new Set(brands)).sort();
    return [
      { label: 'All Brands', value: ALL_BRANDS_SELECT_VALUE },
      ...distinctBrands.map(b => ({ label: b, value: b }))
    ];
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    return allProducts
      .filter(product => {
        if (!searchTerm) return true;
        const nameMatch = product.basicInfo.name.en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.basicInfo.name.no?.toLowerCase().includes(searchTerm.toLowerCase());
        const skuMatch = product.basicInfo.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const brandSearchMatch = product.basicInfo.brand?.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || skuMatch || brandSearchMatch;
      })
      .filter(product => {
        if (!filterStatus) return true;
        return product.basicInfo.status === filterStatus;
      })
      .filter(product => {
        if (!filterBrand) return true;
        return product.basicInfo.brand === filterBrand;
      });
  }, [allProducts, searchTerm, filterStatus, filterBrand]);

  if (!mounted || isLoading && allProducts.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
            <Skeleton className="h-10 w-full sm:w-48" />
            <Skeleton className="h-10 w-full sm:w-48" />
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h1 className="text-3xl font-bold text-primary">Product Catalog</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center">
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
            <Button className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" /> Add New
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6 p-4 border rounded-lg shadow-sm bg-card">
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center">
            <Filter className="mr-2 h-5 w-5 text-primary" /> Filters
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div>
                <Label htmlFor="status-filter" className="text-sm font-medium text-muted-foreground">Status</Label>
                <Select
                  value={filterStatus === '' ? ALL_STATUSES_SELECT_VALUE : filterStatus}
                  onValueChange={(value) => setFilterStatus(value === ALL_STATUSES_SELECT_VALUE ? '' : value as Product['basicInfo']['status'])}
                >
                    <SelectTrigger id="status-filter" className="w-full mt-1">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        {productStatusesOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="brand-filter" className="text-sm font-medium text-muted-foreground">Brand</Label>
                <Select
                  value={filterBrand === '' ? ALL_BRANDS_SELECT_VALUE : filterBrand}
                  onValueChange={(value) => setFilterBrand(value === ALL_BRANDS_SELECT_VALUE ? '' : value)}
                  disabled={uniqueBrandOptions.length <= 1 && !isLoading}
                >
                    <SelectTrigger id="brand-filter" className="w-full mt-1">
                        <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                        {uniqueBrandOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 {uniqueBrandOptions.length <= 1 && !isLoading && (
                    <p className="text-xs text-muted-foreground mt-1">No brands available to filter.</p>
                )}
            </div>
             <Button onClick={() => {setSearchTerm(''); setFilterStatus(''); setFilterBrand('');}} variant="outline" className="w-full sm:w-auto self-end">
                Clear Filters
            </Button>
        </div>
      </div>


      {allProducts.length === 0 && !isLoading ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Products Yet</h2>
          <p className="text-muted-foreground mb-6">
            It looks like there are no products in your catalog.
            <Link href="/products/new" className="text-primary hover:underline">
              Add a new product
            </Link> to get started.
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
         <div className="text-center py-12">
          <Package className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Products Match Filters</h2>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search or filter criteria.
            {searchTerm && <span className="block mt-1 text-xs">Search term: "{searchTerm}"</span>}
            {filterStatus && <span className="block mt-1 text-xs">Status: {productStatusesOptions.find(opt => opt.value === filterStatus)?.label || filterStatus}</span>}
            {filterBrand && <span className="block mt-1 text-xs">Brand: {filterBrand}</span>}
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
