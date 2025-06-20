'use client';

import { useEffect, useState } from 'react';
import { ProductCard } from '@/components/products/product-card';
import { useProductStore } from '@/lib/product-store';
import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function ProductsPage() {
  const { products: allProducts } = useProductStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredProducts = allProducts.filter(product => {
    const nameMatch = product.basicInfo.name.en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      product.basicInfo.name.no?.toLowerCase().includes(searchTerm.toLowerCase());
    const skuMatch = product.basicInfo.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const brandMatch = product.basicInfo.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || skuMatch || brandMatch;
  });
  
  if (!mounted) {
    return <div className="flex justify-center items-center h-64"><p>Loading products...</p></div>;
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

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Products Found</h2>
          <p className="text-muted-foreground mb-6">
            {searchTerm ? "Try adjusting your search term or " : "It looks like there are no products yet. "}
            <Link href="/products/new" className="text-primary hover:underline">
              add a new product
            </Link> to get started.
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
