
'use client';

import { useEffect, useState } from 'react';
import { useProductStore } from '@/lib/product-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, Users, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { isProductComplete } from '@/lib/product-utils';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart"

interface ProductCompletenessData {
  name: string;
  value: number;
  fill: string;
}

export default function DashboardPage() {
  const { products, fetchProducts, isLoading, error } = useProductStore();
  const [mounted, setMounted] = useState(false);
  const [completenessData, setCompletenessData] = useState<ProductCompletenessData[]>([]);

  useEffect(() => {
    fetchProducts();
    setMounted(true);
  }, [fetchProducts]);

  useEffect(() => {
    if (mounted && products.length > 0 && !isLoading) {
      let completeCount = 0;
      products.forEach(p => {
        if (isProductComplete(p)) {
          completeCount++;
        }
      });
      const incompleteCount = products.length - completeCount;
      
      setCompletenessData([
        { name: 'Complete', value: completeCount, fill: 'hsl(var(--chart-2))' },
        { name: 'Incomplete', value: incompleteCount, fill: 'hsl(var(--chart-4))' },
      ]);
    } else if (mounted && products.length === 0 && !isLoading) {
      setCompletenessData([]);
    }
  }, [products, mounted, isLoading]);

  const productCount = products.length;
  const activeProducts = products.filter(p => p.basicInfo.status === 'active').length;
  
  const averagePrice = mounted && !isLoading && productCount > 0 
    ? products.reduce((acc, p) => acc + (p.pricingAndStock?.standardPrice?.[0]?.amount || 0), 0) / productCount
    : 0;

  const chartConfig = {
    complete: {
      label: "Complete",
      color: "hsl(var(--chart-2))",
    },
    incomplete: {
      label: "Incomplete",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig;

  if (error) {
    return <div className="text-center py-12 text-destructive">Error loading dashboard data: {error}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-primary mb-8">Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {(!mounted || isLoading && productCount === 0) ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{productCount}</div>
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
             {(!mounted || isLoading && activeProducts === 0 && productCount === 0) ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{activeProducts}</div>
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
            {(!mounted || isLoading && averagePrice === 0 && productCount === 0) ? (
               <Skeleton className="h-8 w-24" />
            ) : mounted && !isLoading && productCount > 0 ? (
                <div className="text-2xl font-bold">
                    NOK {averagePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            ) : (
                 <div className="text-2xl font-bold">N/A</div>
            )}
            <p className="text-xs text-muted-foreground">
              Based on standard prices of all products
            </p>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Completeness</CardTitle>
            <CheckCircle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[200px] aspect-square">
            {(!mounted || isLoading && products.length === 0) ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-32 w-32 rounded-full" />
              </div>
            ) : products.length === 0 && !isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">No product data to display.</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={completenessData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={60}
                      labelLine={false}
                    >
                      {completenessData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                     <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
