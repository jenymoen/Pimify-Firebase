
// src/app/(app)/products/[id]/edit/page.tsx
'use client';

import { ProductFormClient } from '@/app/(app)/products/product-form-client';
import { useProductStore } from '@/lib/product-store';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Product } from '@/types/product';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button'; 

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const { findProductById, fetchProducts, products, isLoading, error } = useProductStore();
  // Local state for the product to edit, separate from the store's list until save
  const [productToEdit, setProductToEdit] = useState<Product | undefined | null>(undefined); 

  useEffect(() => {
    // If products array is empty and not loading, fetch them
    if (products.length === 0 && !isLoading) {
      fetchProducts();
    }
  }, [products.length, isLoading, fetchProducts]);

  useEffect(() => {
    if (productId && products.length > 0) {
      const foundProduct = findProductById(productId);
      setProductToEdit(foundProduct || null); 
    } else if (productId && isLoading) {
      setProductToEdit(undefined); // Still loading
    } else if (productId && !isLoading && products.length === 0 && !error) {
      // Products fetched, but array is empty, implies product not found if not an error state
      setProductToEdit(null);
    }
  }, [productId, products, findProductById, isLoading, error]);


  if (productToEdit === undefined || (isLoading && !productToEdit)) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (error && !productToEdit) { // Check if there was an error fetching products
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-semibold mb-4 text-destructive">Error Loading Product</h1>
        <p className="text-muted-foreground">Could not load product data: {error}</p>
        <Button onClick={() => router.push('/products')} className="mt-4">Go to Products</Button>
      </div>
    );
  }

  if (productToEdit === null) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-semibold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground">The product with ID "{productId}" could not be found.</p>
        <Button onClick={() => router.push('/products')} className="mt-4">Go to Products</Button>
      </div>
    );
  }
  
  return <ProductFormClient product={productToEdit} />;
}
