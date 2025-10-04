'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/products/product-card';
import { useProductStore } from '@/lib/product-store';
import type { Product, ProductStatus } from '@/types/product';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Search, Package, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  calculateQualityMetrics, 
  checkMissingImages, 
  validateProduct 
} from '@/lib/product-quality';

export default function ProductsPage() {
  const { products: allProducts } = useProductStore();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract URL parameters
  const qualityFilter = searchParams.get('quality');
  const statusFilter = searchParams.get('status');
  const selectedStatuses = statusFilter ? statusFilter.split(',') as ProductStatus[] : [];

  // Apply filters
  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(product => {
        const nameMatch = product.basicInfo.name.en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.basicInfo.name.no?.toLowerCase().includes(searchTerm.toLowerCase());
        const skuMatch = product.basicInfo.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const brandMatch = product.basicInfo.brand?.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || skuMatch || brandMatch;
      });
    }

    // Apply status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(product => selectedStatuses.includes(product.basicInfo.status));
    }

    // Apply quality filter
    if (qualityFilter) {
      filtered = filtered.filter(product => {
        switch (qualityFilter) {
          case 'incomplete':
            const metrics = product.qualityMetrics || calculateQualityMetrics(product);
            return metrics.completenessScore < 70;
          case 'missing-images':
            return checkMissingImages(product);
          case 'validation-errors':
            const errors = validateProduct(product);
            return errors.length > 0;
          case 'missing-fields':
            const qualityMetrics = product.qualityMetrics || calculateQualityMetrics(product);
            return qualityMetrics.missingFields.length > 0;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [allProducts, searchTerm, selectedStatuses, qualityFilter]);
  
  // Helper function to build URL with updated parameters
  const buildFilterUrl = (newQuality?: string | null, newStatus?: string | null) => {
    const params = new URLSearchParams();
    if (newQuality) params.set('quality', newQuality);
    if (newStatus) params.set('status', newStatus);
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };

  // Helper function to clear all filters
  const clearAllFilters = () => {
    window.history.pushState({}, '', '/products');
    window.location.reload();
  };

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

      {/* Active Filters Display */}
      {(qualityFilter || selectedStatuses.length > 0) && (
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Active Filters:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {qualityFilter && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Quality: {qualityFilter.replace('-', ' ')}
                <Link href={`/products${buildFilterUrl(null, statusFilter)}`}>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" />
                </Link>
              </Badge>
            )}
            {selectedStatuses.map(status => (
              <Badge key={status} variant="secondary" className="flex items-center gap-1">
                Status: {status}
                <Link href={`/products${buildFilterUrl(qualityFilter, selectedStatuses.filter(s => s !== status).join(','))}`}>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" />
                </Link>
              </Badge>
            ))}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs"
            >
              Clear All
            </Button>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Showing {filteredProducts.length} of {allProducts.length} products
          </div>
        </div>
      )}

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
