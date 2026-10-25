'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/products/product-card';
import { useProductStore } from '@/lib/product-store';
import type { Product, ProductStatus } from '@/types/product';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Search, Package, Filter, X, ListChecks } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  calculateQualityMetrics,
  checkMissingImages,
  validateProduct
} from '@/lib/product-quality';
import { WorkflowFilters } from '@/components/workflow/workflow-filters';
import { BulkOperationsPanel } from '@/components/workflow/bulk-operations-panel';
import { WorkflowState, UserRole } from '@/types/workflow';
import type { ProductWorkflow } from '@/types/workflow';

export default function ProductsPage() {
  const { products: allProducts, fetchProducts, isLoading } = useProductStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showBulkOps, setShowBulkOps] = useState(false);
  const [showWorkflowFilters, setShowWorkflowFilters] = useState(false);
  // 'all' | 'published' | 'unpublished' | a specific WorkflowState
  const [publicationFilter, setPublicationFilter] = useState<string>('all');
  const [productStatusFilter, setProductStatusFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');

  // Mock current user role - in a real app, this would come from auth context
  const currentUserRole = UserRole.ADMIN;
  const currentUserId = 'user-1';

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

    // Apply publication / workflow filter (products without a workflow state count as draft)
    if (publicationFilter !== 'all') {
      filtered = filtered.filter(product => {
        const state = product.workflowState || WorkflowState.DRAFT;
        if (publicationFilter === 'published') return state === WorkflowState.PUBLISHED;
        if (publicationFilter === 'unpublished') return state !== WorkflowState.PUBLISHED;
        return state === publicationFilter;
      });
    }

    if (productStatusFilter !== 'all') {
      filtered = filtered.filter(product => product.basicInfo.status === productStatusFilter);
    }

    if (brandFilter !== 'all') {
      filtered = filtered.filter(product => (product.basicInfo.brand || '') === brandFilter);
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
  }, [allProducts, searchTerm, selectedStatuses, qualityFilter, publicationFilter, productStatusFilter, brandFilter]);

  const brands = useMemo(
    () => Array.from(new Set(allProducts.map(p => p.basicInfo.brand).filter(Boolean) as string[])).sort(),
    [allProducts]
  );
  const hasCatalogFilters = publicationFilter !== 'all' || productStatusFilter !== 'all' || brandFilter !== 'all';
  const resetCatalogFilters = () => {
    setPublicationFilter('all');
    setProductStatusFilter('all');
    setBrandFilter('all');
  };

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

  if (!mounted || isLoading) {
    return <div className="flex justify-center items-center h-64"><p>Loading products...</p></div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-primary">Product Catalog</h1>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
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
          <Button
            variant="outline"
            onClick={() => setShowWorkflowFilters(!showWorkflowFilters)}
          >
            <Filter className="mr-2 h-5 w-5" />
            Workflow Filters
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowBulkOps(!showBulkOps)}
          >
            <ListChecks className="mr-2 h-5 w-5" />
            Bulk Operations
          </Button>
          <Link href="/products/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Add New
            </Button>
          </Link>
        </div>
      </div>

      {/* Catalog filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Select value={publicationFilter} onValueChange={setPublicationFilter}>
          <SelectTrigger className="w-[190px]"><SelectValue placeholder="Publication" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All publication states</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="unpublished">Not published</SelectItem>
            <SelectItem value={WorkflowState.DRAFT}>Draft</SelectItem>
            <SelectItem value={WorkflowState.REVIEW}>In review</SelectItem>
            <SelectItem value={WorkflowState.APPROVED}>Approved</SelectItem>
            <SelectItem value={WorkflowState.REJECTED}>Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Product status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All product statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="development">Development</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="discontinued">Discontinued</SelectItem>
          </SelectContent>
        </Select>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasCatalogFilters && (
          <>
            <Button variant="ghost" size="sm" onClick={resetCatalogFilters}>
              <X className="mr-1 h-4 w-4" /> Reset filters
            </Button>
            <span className="text-sm text-muted-foreground">
              Showing {filteredProducts.length} of {allProducts.length} products
            </span>
          </>
        )}
      </div>

      {/* Workflow Filters Panel */}
      {showWorkflowFilters && (
        <div className="mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Workflow Filters</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowWorkflowFilters(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <WorkflowFilters
                userRole={currentUserRole}
                onFiltersChange={(filters) => {
                  console.log('Filters changed:', filters);
                  // In a real app, this would filter the products list
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Operations Panel */}
      {showBulkOps && (
        <div className="mb-6">
          <BulkOperationsPanel
            products={allProducts.map(p => ({
              ...p,
              workflowState: p.workflowState || WorkflowState.DRAFT,
              assignedReviewer: p.assignedReviewer?.userId,
              workflowHistory: p.workflowHistory?.map(h => ({
                state: h.toState,
                timestamp: h.timestamp,
                userId: h.userId,
                reason: h.reason,
              })) || [],
            }))}
            userRole={currentUserRole}
            isVisible={showBulkOps}
            onVisibilityChange={(visible) => setShowBulkOps(visible)}
            onBulkOperation={(operation) => {
              console.log('Bulk operation:', operation);
              // In a real app, this would refresh the product list
            }}
          />
        </div>
      )}

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
