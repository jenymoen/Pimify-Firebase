
'use client';

import { useEffect, useState } from 'react';
import { useProductStore } from '@/lib/product-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, Users, DollarSign } from 'lucide-react'; // Example icons
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { products, setProducts } = useProductStore(); // Added setProducts
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydrate Zustand store from localStorage on mount
    // This ensures client-side state is consistent with localStorage
    // and product count is accurate.
    if (typeof window !== 'undefined') {
      const storedProducts = localStorage.getItem('products');
      if (storedProducts) {
        try {
          setProducts(JSON.parse(storedProducts));
        } catch (e) {
          console.error("Error parsing products from local storage for dashboard", e);
        }
      }
    }
    setMounted(true);
  }, [setProducts]);

  const productCount = products.length;

  // Placeholder data for other stats - you can replace these with real data sources
  const activeProducts = products.filter(p => p.basicInfo.status === 'active').length;
  const averagePrice = mounted && productCount > 0 
    ? products.reduce((acc, p) => acc + (p.pricingAndStock?.standardPrice?.[0]?.amount || 0), 0) / productCount
    : 0;


  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {mounted ? (
              <div className="text-2xl font-bold">{productCount}</div>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
            <p className="text-xs text-muted-foreground">
              Currently managed in the PIM
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {mounted ? (
              <div className="text-2xl font-bold">{activeProducts}</div>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
            <p className="text-xs text-muted-foreground">
              Products currently marked as active
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Price (Standard)</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {mounted && productCount > 0 ? (
                <div className="text-2xl font-bold">
                    NOK {averagePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            ) : mounted && productCount === 0 ? (
                 <div className="text-2xl font-bold">N/A</div>
            ) : (
              <Skeleton className="h-8 w-24" />
            )}
            <p className="text-xs text-muted-foreground">
              Based on standard prices of all products
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* You can add more charts or detailed statistics here later */}
      {/* For example, a chart showing products by category or status */}

    </div>
  );
}
