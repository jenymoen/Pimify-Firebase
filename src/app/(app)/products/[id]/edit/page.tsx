// src/app/(app)/products/[id]/edit/page.tsx
'use client';

import { ProductFormClient } from '@/app/(app)/products/product-form-client';
import { useProductStore } from '@/lib/product-store';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Product } from '@/types/product';
import { Skeleton } from '@/components/ui/skeleton'; // Assuming you have a Skeleton component
import { Button } from '@/components/ui/button'; // Added import

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const { findProductById } = useProductStore();
  const [product, setProduct] = useState<Product | undefined | null>(undefined); // undefined: loading, null: not found

  useEffect(() => {
    if (productId) {
      const foundProduct = findProductById(productId);
      setProduct(foundProduct || null); // if not found, set to null
    }
  }, [productId, findProductById]);

  if (product === undefined) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-semibold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground">The product with ID "{productId}" could not be found.</p>
        <Button onClick={() => router.push('/products')} className="mt-4">Go to Products</Button>
      </div>
    );
  }
  
  return <ProductFormClient product={product} />;
}
