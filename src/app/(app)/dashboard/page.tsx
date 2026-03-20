'use client';

import { useEffect, useState } from 'react';
import { useProductStore } from '@/lib/product-store';
import { Skeleton } from '@/components/ui/skeleton';
import { isProductComplete } from '@/lib/product-utils';
import { ClientOnly } from '@/components/ui/client-only';
import Link from 'next/link';
import {
  Package,
  CheckCircle2,
  Clock,
  Layers,
  Upload,
  Download,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Sofa,
  ChefHat,
  TreePine,
} from 'lucide-react';

export default function DashboardPage() {
  const { products, fetchProducts, isLoading } = useProductStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const productCount = products.length;
  const activeProducts = products.filter(p => p.basicInfo.status === 'active').length;
  const pendingProducts = products.filter(p => p.workflowState === 'review' || p.workflowState === 'pending_review').length;
  const completeCount = products.filter(p => isProductComplete(p)).length;
  const enrichmentScore = productCount > 0 ? Math.round((completeCount / productCount) * 100) : 0;
  const variantCount = products.reduce((acc, p) => acc + (p.variants?.length || 0), 0);

  // Category enrichment data
  const categoryCounts: Record<string, { total: number; complete: number }> = {};
  products.forEach(p => {
    const cats = p.attributesAndSpecs?.categories || [];
    const isComplete = isProductComplete(p);
    cats.forEach(cat => {
      if (!categoryCounts[cat]) categoryCounts[cat] = { total: 0, complete: 0 };
      categoryCounts[cat].total++;
      if (isComplete) categoryCounts[cat].complete++;
    });
  });

  const categoryIcons: Record<string, React.ReactNode> = {
    // default icons for common categories
  };

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3);

  // Recent activity from workflow history
  const recentActivity = products
    .flatMap(p => (p.workflowHistory || []).map(h => ({
      ...h,
      productName: p.basicInfo.name.en || p.basicInfo.sku || 'Unknown Product',
      productId: p.id,
    })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 4);

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const StatCard = ({ label, value, icon, trend }: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
  }) => (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <span className="text-muted-foreground text-sm font-medium">{label}</span>
        <div className="text-primary bg-primary/10 p-1.5 rounded-lg">
          {icon}
        </div>
      </div>
      <div className="flex items-end justify-between">
        {mounted && !isLoading ? (
          <h3 className="text-2xl font-bold">{value}</h3>
        ) : (
          <Skeleton className="h-8 w-16" />
        )}
        {trend && mounted && !isLoading && (
          <span className={`text-sm font-bold flex items-center gap-1 ${
            trend.direction === 'up' ? 'text-emerald-600' :
            trend.direction === 'down' ? 'text-amber-500' :
            'text-muted-foreground'
          }`}>
            {trend.value}
            {trend.direction === 'up' && <TrendingUp className="h-4 w-4" />}
            {trend.direction === 'down' && <TrendingDown className="h-4 w-4" />}
            {trend.direction === 'neutral' && <Minus className="h-4 w-4" />}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor your product catalog health and recent activity.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Products"
          value={productCount.toLocaleString()}
          icon={<Package className="h-5 w-5" />}
          trend={{ value: `${activeProducts} active`, direction: 'neutral' }}
        />
        <StatCard
          label="Enrichment Score"
          value={`${enrichmentScore}%`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          trend={{ value: `${completeCount}/${productCount}`, direction: enrichmentScore >= 70 ? 'up' : 'down' }}
        />
        <StatCard
          label="Pending Approvals"
          value={pendingProducts}
          icon={<Clock className="h-5 w-5" />}
          trend={{ value: pendingProducts > 0 ? 'Needs review' : 'All clear', direction: pendingProducts > 0 ? 'down' : 'up' }}
        />
        <StatCard
          label="Total Variants"
          value={variantCount.toLocaleString()}
          icon={<Layers className="h-5 w-5" />}
          trend={{ value: '—', direction: 'neutral' }}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enrichment Progress */}
          <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold">Enrichment Progress</h3>
              <Link href="/products" className="text-primary text-sm font-bold hover:underline">
                View All Products
              </Link>
            </div>
            <div className="space-y-8">
              {mounted && !isLoading ? (
                topCategories.length > 0 ? (
                  topCategories.map(([category, data]) => {
                    const pct = data.total > 0 ? Math.round((data.complete / data.total) * 100) : 0;
                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-muted-foreground" />
                            <span className="font-bold">{category}</span>
                          </div>
                          <span className={`text-sm font-bold ${pct >= 70 ? 'text-primary' : 'text-amber-500'}`}>{pct}%</span>
                        </div>
                        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${pct >= 70 ? 'bg-primary' : 'bg-amber-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{data.complete}/{data.total} items fully enriched</p>
                      </div>
                    );
                  })
                ) : (
                  // Fallback: show overall enrichment
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <span className="font-bold">All Products</span>
                      </div>
                      <span className={`text-sm font-bold ${enrichmentScore >= 70 ? 'text-primary' : 'text-amber-500'}`}>{enrichmentScore}%</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${enrichmentScore >= 70 ? 'bg-primary' : 'bg-amber-500'}`}
                        style={{ width: `${enrichmentScore}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{completeCount}/{productCount} items fully enriched</p>
                  </div>
                )
              ) : (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3 w-full rounded-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-3 gap-6">
            <Link href="/import-export" className="flex flex-col items-center justify-center gap-3 p-6 bg-card rounded-xl border border-border hover:border-primary/40 transition-all group">
              <Upload className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">Import Products</span>
            </Link>
            <Link href="/import-export" className="flex flex-col items-center justify-center gap-3 p-6 bg-card rounded-xl border border-border hover:border-primary/40 transition-all group">
              <Download className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">Export Catalog</span>
            </Link>
            <Link href="/products/new" className="flex flex-col items-center justify-center gap-3 p-6 bg-primary rounded-xl text-white hover:bg-primary/90 transition-all group">
              <PlusCircle className="h-8 w-8 group-hover:rotate-90 transition-transform" />
              <span className="text-sm font-bold">New Product</span>
            </Link>
          </div>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="space-y-8">
          {/* Recent Activity */}
          <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
            <h3 className="text-lg font-bold mb-6">Recent Activity</h3>
            {mounted && !isLoading ? (
              recentActivity.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-px before:bg-border">
                  {recentActivity.map((activity, i) => (
                    <div key={activity.id || i} className={`relative pl-8 ${i === recentActivity.length - 1 ? 'opacity-60' : ''}`}>
                      <div className={`absolute left-0 top-1.5 h-6 w-6 rounded-full flex items-center justify-center ${
                        i === recentActivity.length - 1 ? 'bg-muted' : 'bg-primary/10'
                      }`}>
                        <div className={`h-2 w-2 rounded-full ${
                          i === recentActivity.length - 1 ? 'bg-muted-foreground' : 'bg-primary'
                        }`} />
                      </div>
                      <p className="text-sm font-medium">
                        {activity.userName} {activity.action.toLowerCase().replace(/_/g, ' ')}{' '}
                        <Link href={`/products/${activity.productId}/edit`} className="text-primary hover:underline">
                          &apos;{activity.productName}&apos;
                        </Link>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity to display.</p>
              )
            ) : (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Variant Distribution */}
          <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
            <h3 className="text-lg font-bold mb-4">Product Status Distribution</h3>
            {mounted && !isLoading ? (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-full border-[6px] border-primary border-r-amber-500 border-b-muted rotate-45 shrink-0" />
                  <div>
                    <p className="text-2xl font-bold">{productCount}</p>
                    <p className="text-xs text-muted-foreground">Total Products</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" /> Active
                    </span>
                    <span className="font-bold">{productCount > 0 ? Math.round((activeProducts / productCount) * 100) : 0}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" /> Development
                    </span>
                    <span className="font-bold">
                      {productCount > 0 ? Math.round((products.filter(p => p.basicInfo.status === 'development').length / productCount) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground" /> Inactive / Discontinued
                    </span>
                    <span className="font-bold">
                      {productCount > 0 ? Math.round((products.filter(p => p.basicInfo.status === 'inactive' || p.basicInfo.status === 'discontinued').length / productCount) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
