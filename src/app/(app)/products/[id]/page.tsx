'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Product, KeyValueEntry, MediaEntry, PriceEntry, ProductOption, ProductVariant } from '@/types/product';
import { useProductStore } from '@/lib/product-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import {
  ArrowLeft, Edit, Tag, Info, ImageIcon, BarChart3, Brain, Package, DollarSign,
  Cog, History, UserPlus, GitBranch, Copy, Archive, Search, Save, Filter, Plus,
  MoreVertical, CheckCircle, AlertTriangle, Pencil, Zap, Settings2
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkflowStateBadge } from '@/components/workflow/workflow-state-badge';
import { StateTransitionButtons } from '@/components/workflow/state-transition-buttons';
import { WorkflowProgressIndicator } from '@/components/workflow/workflow-progress-indicator';
import { AuditTrailViewer } from '@/components/workflow/audit-trail-viewer';
import { ReviewerAssignment } from '@/components/workflow/reviewer-assignment';
import { WorkflowState, UserRole } from '@/types/workflow';
import type { ProductWorkflow } from '@/types/workflow';
import { Checkbox } from '@/components/ui/checkbox';

// ─── Color mapping utilities ───────────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  red: '#EF4444', blue: '#3B82F6', green: '#22C55E', black: '#1F2937',
  white: '#F9FAFB', gray: '#9CA3AF', grey: '#9CA3AF', yellow: '#EAB308',
  orange: '#F97316', purple: '#A855F7', pink: '#EC4899', brown: '#92400E',
  navy: '#1E3A5F', teal: '#14B8A6', gold: '#D97706', silver: '#D1D5DB',
};

function getColorDot(colorName: string) {
  const lower = colorName.toLowerCase();
  const hex = COLOR_MAP[lower] || '#9CA3AF';
  const isLight = ['white', 'silver', 'gold', 'yellow'].includes(lower);
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full mr-2 shrink-0 ${isLight ? 'border border-gray-300' : ''}`}
      style={{ backgroundColor: hex }}
    />
  );
}

// ─── Inventory status icon ─────────────────────────────────────────────────────
function InventoryStatus({ count }: { count: number }) {
  if (count > 5) {
    return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  } else if (count > 0) {
    return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  }
  return <AlertTriangle className="h-4 w-4 text-red-500" />;
}

// ─── Multilingual text display ─────────────────────────────────────────────────
const MultilingualTextDisplay: React.FC<{ label: string; data?: Product['basicInfo']['name'] }> = ({ label, data }) => {
  if (!data || (!data.en && !data.no)) return null;
  return (
    <div>
      <p className="font-medium text-foreground/90">{label}:</p>
      {data.en && <p className="text-sm text-muted-foreground pl-2">EN: {data.en}</p>}
      {data.no && <p className="text-sm text-muted-foreground pl-2">NO: {data.no}</p>}
    </div>
  );
};

// ─── Key-Value display ─────────────────────────────────────────────────────────
const KeyValueDisplay: React.FC<{ label: string; items?: KeyValueEntry[] }> = ({ label, items }) => {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">{label}: Not specified</p>;
  return (
    <div>
      <p className="font-medium text-foreground/90">{label}:</p>
      <ul className="list-disc list-inside pl-2">
        {items.map(item => <li key={item.id} className="text-sm text-muted-foreground">{item.key}: {item.value}</li>)}
      </ul>
    </div>
  );
};

// ─── Price display ─────────────────────────────────────────────────────────────
const PriceDisplay: React.FC<{ label: string; priceEntries?: PriceEntry[] }> = ({ label, priceEntries }) => {
  if (!priceEntries || priceEntries.length === 0 || priceEntries[0].amount === undefined) {
    return <p className="text-sm"><span className="font-medium text-foreground/90">{label}:</span> <span className="text-muted-foreground">Not specified</span></p>;
  }
  const price = priceEntries[0];
  return (
    <p className="text-sm">
      <span className="font-medium text-foreground/90">{label}:</span>{' '}
      <span className="text-muted-foreground">{price.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {price.currency}</span>
    </p>
  );
};

// ─── Variant name builder ──────────────────────────────────────────────────────
function buildVariantName(productName: string, variant: ProductVariant): string {
  const optParts = Object.values(variant.optionValues || {}).join(' / ');
  return optParts ? `${productName} - ${optParts}` : variant.sku;
}

// ─── Status badge mapping ──────────────────────────────────────────────────────
function getStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: 'PUBLISHED', className: 'bg-emerald-600 hover:bg-emerald-700 text-white border-0' },
    development: { label: 'DRAFT', className: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-0' },
    inactive: { label: 'INACTIVE', className: 'bg-gray-200 text-gray-700 hover:bg-gray-300 border-0' },
    discontinued: { label: 'DISCONTINUED', className: 'bg-red-100 text-red-800 hover:bg-red-200 border-0' },
  };
  const cfg = map[status] || map.development;
  return <Badge className={`text-xs font-semibold px-2.5 py-0.5 ${cfg.className}`}>{cfg.label}</Badge>;
}


export default function ProductDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const { findProductById, updateProduct: storeUpdateProduct } = useProductStore();
  const [product, setProduct] = useState<Product | undefined | null>(undefined);
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(new Set());
  const [globalPrice, setGlobalPrice] = useState('');

  const currentUserRole = UserRole.ADMIN;
  const currentUserId = 'user-1';
  const [reviewers, setReviewers] = useState<Array<{ id: string; name: string; role: UserRole }>>([]);

  useEffect(() => {
    const fetchReviewers = async () => {
      try {
        const res = await fetch('/api/users?role=reviewer');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setReviewers(data.data.map((u: any) => ({ id: u.id, name: u.name, role: u.role })));
          }
        }
      } catch (error) {
        console.error('Failed to fetch reviewers', error);
      }
    };
    fetchReviewers();
  }, []);

  useEffect(() => {
    if (productId) {
      const foundProduct = findProductById(productId);
      setProduct(foundProduct || null);
    }
  }, [productId, findProductById]);

  const handleWorkflowAction = async (action: string, newState: WorkflowState, reason?: string) => {
    if (!product) return;
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId,
          'x-user-role': currentUserRole,
          'x-user-name': 'Admin User'
        },
        body: JSON.stringify({ workflowState: newState }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setProduct(data.data);
      }
    } catch (error) {
      console.error('Error updating product state', error);
    }
  };

  const handleReviewerAssign = async (reviewerId: string) => {
    if (!product) return;
    const selectedReviewer = reviewers.find(r => r.id === reviewerId);
    if (!selectedReviewer) return;
    const updateData = {
      workflowState: WorkflowState.REVIEW,
      assignedReviewer: { userId: selectedReviewer.id, userName: selectedReviewer.name, userRole: selectedReviewer.role },
      workflowHistory: [
        ...(product.workflowHistory || []),
        {
          id: `history_${Date.now()}`,
          action: 'ASSIGN_REVIEWER',
          fromState: product.workflowState || WorkflowState.DRAFT,
          toState: WorkflowState.REVIEW,
          userId: currentUserId,
          userName: 'Admin User',
          timestamp: new Date().toISOString(),
          reason: `Reviewer assigned: ${selectedReviewer.name}`,
        }
      ]
    };
    await storeUpdateProduct(product.id, updateData);
    const updatedProduct = findProductById(product.id);
    if (updatedProduct) setProduct(updatedProduct);
  };

  // ── Variant selection helpers ──
  const toggleVariant = (id: string) => {
    setSelectedVariants(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllVariants = () => {
    if (!product?.variants) return;
    if (selectedVariants.size === product.variants.length) {
      setSelectedVariants(new Set());
    } else {
      setSelectedVariants(new Set(product.variants.map(v => v.id)));
    }
  };

  // ── Loading / Not found ──
  if (product === undefined) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 bg-[#fafafa]">
        <Skeleton className="h-12 w-1/4 mb-4 bg-gray-200" />
        <Skeleton className="h-8 w-1/2 mb-8 bg-gray-200" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full bg-gray-200" />
            <Skeleton className="h-48 w-full bg-gray-200" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full bg-gray-200" />
            <Skeleton className="h-72 w-full bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="container mx-auto py-12 text-center bg-[#fafafa]">
        <Package className="mx-auto h-24 w-24 text-muted-foreground mb-4" />
        <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-6">The product you are looking for does not exist or may have been removed.</p>
        <Button onClick={() => router.push('/products')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
        </Button>
      </div>
    );
  }

  const { basicInfo, attributesAndSpecs, media, marketingSEO, pricingAndStock, options, variants } = product;
  const workflowState = product.workflowState || WorkflowState.DRAFT;
  const productName = basicInfo.name.en || basicInfo.name.no || basicInfo.sku;
  const variantCount = variants?.length || 0;
  const firstImage = media.images && media.images.length > 0 && media.images[0].url ? media.images[0] : null;

  // Determine option names for the table
  const optionNames = options?.map(o => o.name) || [];
  // Extract unique option values for variant attributes section
  const optionSummaries = options?.map(o => ({
    name: o.name,
    values: Array.isArray(o.values) ? o.values : [],
  })) || [];

  // Generate mock inventory for display (since the product model doesn't have inventory yet)
  const getVariantInventory = (variant: ProductVariant): number => {
    // Deterministic pseudo-random based on sku
    const hash = variant.sku.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return (hash % 50) + 1;
  };
  return (
    <div className="flex flex-col -mx-6 -mt-6 h-[calc(100vh-4rem)] font-sans">
      {/* ═══ TOP HEADER BAR ═══ */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#eaf0f0] bg-white dark:bg-[#1c1f22] px-8 py-3 shrink-0 gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/products" className="text-[#5e8787] text-xs font-medium hover:text-[#2f7979] transition-colors">Products</Link>
            <span className="text-[#5e8787] text-xs">/</span>
            <span className="text-[#111818] dark:text-white text-xs font-semibold">{productName}</span>
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-[#111818] dark:text-white text-xl font-bold tracking-tight">{productName}</h2>
            {basicInfo.status === 'active' ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">Published</span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">Draft</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64 group hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5e8787] w-4 h-4" />
            <input className="w-full bg-[#f3f7f7] border-none rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#2f7979]/20 placeholder:text-[#5e8787] outline-none" placeholder="Search attributes..." type="text" />
          </div>
          <div className="h-6 w-[1px] bg-[#eaf0f0] hidden md:block"></div>
          <button className="flex items-center justify-center rounded-lg px-4 py-2 bg-[#eaf0f0] text-[#111818] text-sm font-bold hover:bg-[#dfe9e9] transition-colors">
            Publish
          </button>
          <Link href={`/products/${product.id}/edit`}>
            <button className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 bg-[#2f7979] text-white text-sm font-bold hover:opacity-90 transition-opacity">
              <Edit className="w-4 h-4" />
              Edit Product
            </button>
          </Link>
        </div>
      </header>

      {/* Scrollable Product Content */}
      <div className="flex-1 overflow-y-auto bg-[#fafafa] dark:bg-[#1c1f22] p-8 custom-scrollbar w-full">
        <div className="w-full mx-auto flex flex-col gap-8">
          {/* Product Quick Info Bar */}
          <div className="bg-white dark:bg-[#1c1f22] border border-[#eaf0f0] rounded-xl p-6 flex items-center justify-between shadow-sm flex-wrap gap-4">
            <div className="flex gap-6 items-center">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#eaf0f0] bg-gray-50 shrink-0">
                {firstImage ? (
                  <Image src={firstImage.url} alt={productName} fill className="object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[#5e8787] text-xs font-semibold uppercase tracking-wider">Base SKU</p>
                <p className="text-[#111818] dark:text-white text-lg font-bold">{basicInfo.sku}</p>
                <div className="flex gap-4 mt-1 flex-wrap">
                  {attributesAndSpecs.categories && attributesAndSpecs.categories.length > 0 && (
                     <div className="flex items-center gap-1.5 text-xs text-[#5e8787]">
                       <Tag className="w-4 h-4" />
                       {attributesAndSpecs.categories[0]}
                     </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-[#5e8787]">
                    <Package className="w-4 h-4" />
                    {variantCount} Variants Active
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 border border-[#eaf0f0] px-4 py-2 rounded-lg text-sm font-semibold text-[#5e8787] hover:bg-[#fafafa] transition-colors">
                <Copy className="w-4 h-4" /> Duplicate
              </button>
              <button className="flex items-center gap-2 border border-red-100 px-4 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
                <Archive className="w-4 h-4 text-red-600" /> Archive
              </button>
            </div>
          </div>

          {/* TABS SECTION */}
          <Tabs defaultValue="variants" className="flex flex-col gap-6 w-full font-sans">
            <TabsList className="bg-transparent p-0 flex border-b border-[#eaf0f0] gap-8 rounded-none h-auto w-full justify-start overflow-x-auto">
              {['basic-info', 'media', 'variants', 'seo'].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="flex flex-col items-center border-b-2 border-transparent data-[state=active]:border-[#2f7979] text-[#5e8787] data-[state=active]:text-[#2f7979] hover:text-[#111818] pb-4 pt-2 rounded-none shadow-none bg-transparent transition-colors group px-1"
                >
                  <span className="text-sm font-bold capitalize group-hover:text-[#111818] data-[state=active]:text-[#2f7979]">{tab.replace('-', ' ')}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* VARIANTS TAB CONTENT */}
            <TabsContent value="variants" className="flex flex-col gap-4 focus-visible:outline-none focus-visible:ring-0">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-[#111818] dark:text-white">Product Variants</h3>
                  <span className="bg-[#eaf0f0] text-[#5e8787] px-2 py-0.5 rounded-full text-xs font-bold">{variantCount} items</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 w-9 h-9 flex items-center justify-center rounded-lg border border-[#eaf0f0] text-[#5e8787] hover:bg-white hover:shadow-sm transition-all text-sm font-semibold">
                    <Filter className="w-4 h-4" />
                  </button>
                  <Link href={`/products/${product.id}/edit`}>
                    <button className="flex items-center gap-2 bg-[#2f7979] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:opacity-90 transition-opacity">
                      <Plus className="w-4 h-4" /> Add Variant
                    </button>
                  </Link>
                </div>
              </div>

              {/* Variants Table */}
              <div className="bg-white dark:bg-background-dark border border-[#eaf0f0] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f9fbfb] border-b border-[#eaf0f0]">
                        <th className="px-6 py-4 text-[11px] font-bold text-[#5e8787] uppercase tracking-widest w-12">
                          <Checkbox
                            checked={selectedVariants.size === variants?.length && variants?.length > 0}
                            onCheckedChange={toggleAllVariants}
                          />
                        </th>
                        <th className="px-6 py-4 text-[11px] font-bold text-[#5e8787] uppercase tracking-widest whitespace-nowrap">Variant Name</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-[#5e8787] uppercase tracking-widest">SKU</th>
                        {optionNames.map(name => (
                          <th key={name} className="px-6 py-4 text-[11px] font-bold text-[#5e8787] uppercase tracking-widest">{name}</th>
                        ))}
                        <th className="px-6 py-4 text-[11px] font-bold text-[#5e8787] uppercase tracking-widest">Inventory</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-[#5e8787] uppercase tracking-widest text-right">Price</th>
                        <th className="px-6 py-4 text-[11px] font-bold text-[#5e8787] uppercase tracking-widest w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eaf0f0] bg-white">
                      {variants && variants.length > 0 ? variants.map((variant) => {
                        const inv = getVariantInventory(variant);
                        const variantDisplayName = buildVariantName(productName.split(' ')[0] || 'Product', variant);
                        const stdPrice = variant.standardPrice?.[0];

                        return (
                          <tr key={variant.id} className="hover:bg-[#fcfdfd] transition-colors group">
                            <td className="px-6 py-4">
                              <Checkbox
                                checked={selectedVariants.has(variant.id)}
                                onCheckedChange={() => toggleVariant(variant.id)}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="relative w-8 h-8 rounded bg-cover bg-center border border-[#eaf0f0] overflow-hidden shrink-0">
                                  {firstImage ? (
                                    <Image src={firstImage.url} alt={variantDisplayName} fill className="object-cover" />
                                  ) : (
                                    <div className="flex items-center justify-center w-full h-full bg-gray-50">
                                      <Package className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <span className="text-sm font-semibold text-[#111818] dark:text-white">{variantDisplayName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-mono text-[#5e8787]">{variant.sku}</span>
                            </td>
                            {optionNames.map(optName => {
                              const val = variant.optionValues?.[optName] || '—';
                              const isColor = optName.toLowerCase() === 'color' || optName.toLowerCase() === 'colour' || optName.toLowerCase() === 'farge';
                              const isSize = optName.toLowerCase() === 'size' || optName.toLowerCase() === 'størrelse';

                              if (isColor) {
                                return (
                                  <td key={optName} className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      {getColorDot(val)}
                                      <span className="text-sm">{val}</span>
                                    </div>
                                  </td>
                                );
                              }
                              if (isSize) {
                                return (
                                  <td key={optName} className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 rounded bg-[#eaf0f0] text-[11px] font-bold">{val}</span>
                                  </td>
                                );
                              }
                              return <td key={optName} className="px-6 py-4 text-sm whitespace-nowrap">{val}</td>;
                            })}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  defaultValue={inv}
                                  className={`w-16 rounded px-2 py-1 text-sm focus:ring-[#2f7979]/20 focus:border-[#2f7979] outline-none ${inv <= 5 ? 'border-orange-200 bg-orange-50/50' : 'border-[#eaf0f0]'}`}
                                />
                                {inv > 5 ? (
                                  <CheckCircle className="text-emerald-500 w-4 h-4" />
                                ) : (
                                  <span title="Low Stock">
                                    <AlertTriangle className="text-[#E6BF6B] w-4 h-4" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-sm text-[#5e8787]">{stdPrice?.currency || '$'}</span>
                                <input
                                  type="text"
                                  defaultValue={stdPrice ? stdPrice.amount.toFixed(2) : '0.00'}
                                  className="w-24 text-right border-none bg-transparent hover:bg-[#f3f7f7] rounded px-2 py-1 text-sm font-bold focus:ring-[#2f7979]/20 outline-none"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-[#5e8787] hover:text-[#111818] p-1">
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={6 + optionNames.length} className="px-6 py-12 text-center text-[#5e8787]">
                            <Cog className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            No variants defined.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="px-6 py-3 bg-[#f9fbfb] border-t border-[#eaf0f0] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <p className="text-xs text-[#5e8787] font-medium flex items-center">{selectedVariants.size > 0 ? `${selectedVariants.size} variants selected` : '0 variants selected'}</p>
                    {selectedVariants.size > 0 && (
                      <>
                        <button className="text-xs font-bold text-[#2f7979] hover:underline transition-colors">Apply Price Adjustment</button>
                        <button className="text-xs font-bold text-[#2f7979] hover:underline transition-colors">Sync Inventory</button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-xs text-[#5e8787]">Showing {variants && variants.length > 0 ? 1 : 0}-{variantCount} of {variantCount}</p>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Detail Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                {/* Attributes Config */}
                <div className="bg-white dark:bg-[#1c1f22] border border-[#eaf0f0] rounded-xl p-6 shadow-sm">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Settings2 className="text-[#2f7979] w-5 h-5" />
                    Variant Attributes
                  </h4>
                  <div className="flex flex-col gap-4">
                    {optionSummaries.map((opt, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-[#f3f7f7]">
                        <div className="flex flex-col">
                          <p className="text-sm font-bold text-[#111818]">{opt.name}</p>
                          <p className="text-xs text-[#5e8787]">{opt.values.length} options: {opt.values.join(', ')}</p>
                        </div>
                        <button className="text-[#5e8787] hover:text-[#2f7979] p-1">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button className="mt-2 text-[#2f7979] text-xs font-bold flex items-center gap-1 hover:underline w-fit">
                      <Plus className="w-4 h-4" /> Add another attribute
                    </button>
                  </div>
                </div>

                {/* Bulk Updater */}
                <div className="bg-white dark:bg-[#1c1f22] border border-[#eaf0f0] rounded-xl p-6 shadow-sm">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Zap className="text-[#2f7979] w-5 h-5" />
                    Quick Updates
                  </h4>
                  <p className="text-xs text-[#5e8787] mb-4 leading-relaxed">Modify pricing or stock across all active variants for this product series.</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-[#5e8787] uppercase mb-1">Set Global Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5e8787]">
                          {pricingAndStock?.standardPrice?.[0]?.currency || '$'}
                        </span>
                        <input
                          className="w-full pl-7 pr-3 py-2 text-sm border border-[#eaf0f0] rounded-lg focus:ring-[#2f7979]/20 focus:border-[#2f7979] outline-none"
                          placeholder="0.00"
                          type="text"
                          value={globalPrice}
                          onChange={(e) => setGlobalPrice(e.target.value)}
                        />
                      </div>
                    </div>
                    <button className="self-end px-4 py-2 bg-[#eaf0f0] text-[#111818] text-sm font-bold rounded-lg hover:bg-[#dfe9e9] transition-colors h-[38px]">
                      Apply All
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* BASIC INFO TAB */}
            <TabsContent value="basic-info" className="mt-2 space-y-6">
              <div className="bg-white border border-[#eaf0f0] rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 text-[#111818]">Basic Information</h3>
                <div className="space-y-4">
                  <MultilingualTextDisplay label="Product Name" data={basicInfo.name} />
                  <MultilingualTextDisplay label="Short Description" data={basicInfo.descriptionShort} />
                  <MultilingualTextDisplay label="Long Description" data={basicInfo.descriptionLong} />
                </div>
              </div>

              {/* Workflow */}
              <div className="bg-white border border-[#eaf0f0] rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4 text-[#111818]">Product Workflow & Approvals</h3>
                <Tabs defaultValue="workflow" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-[#f3f7f7] rounded-lg p-1">
                    <TabsTrigger value="workflow" className="data-[state=active]:bg-white data-[state=active]:text-[#2f7979] text-[#5e8787] font-semibold"><GitBranch className="mr-2 h-4 w-4" /> Workflow</TabsTrigger>
                    <TabsTrigger value="audit" className="data-[state=active]:bg-white data-[state=active]:text-[#2f7979] text-[#5e8787] font-semibold"><History className="mr-2 h-4 w-4" /> Audit Trail</TabsTrigger>
                    <TabsTrigger value="reviewer" className="data-[state=active]:bg-white data-[state=active]:text-[#2f7979] text-[#5e8787] font-semibold"><UserPlus className="mr-2 h-4 w-4" /> Reviewer</TabsTrigger>
                  </TabsList>
                  <TabsContent value="workflow" className="mt-6 space-y-4">
                    <WorkflowProgressIndicator currentState={workflowState} workflowHistory={product.workflowHistory} size="lg" />
                    <StateTransitionButtons
                      currentState={workflowState} userRole={currentUserRole} productId={product.id}
                      onStateTransition={handleWorkflowAction} onAssignReviewer={handleReviewerAssign}
                      availableReviewers={reviewers} size="md"
                    />
                  </TabsContent>
                  <TabsContent value="audit" className="mt-6">
                    <AuditTrailViewer productId={product.id} userRole={currentUserRole} enableExport={true} />
                  </TabsContent>
                  <TabsContent value="reviewer" className="mt-6">
                    <ReviewerAssignment
                      productId={product.id} productName={productName} userRole={currentUserRole}
                      onAssign={(a) => handleReviewerAssign(a.reviewerId)} showReviewerDetails={true}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            {/* MEDIA */}
            <TabsContent value="media" className="mt-2">
              <div className="bg-white border border-[#eaf0f0] rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4">Media</h3>
                {media.images && media.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {media.images.filter(img => img.type === 'image' && img.url).map((img, idx) => (
                      <div key={img.id || idx} className="relative aspect-square rounded-lg overflow-hidden border bg-gray-50">
                        <Image src={img.url} alt="Media" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No media uploaded yet.</p>
                )}
              </div>
            </TabsContent>

            {/* SEO */}
            <TabsContent value="seo" className="mt-2">
              <div className="bg-white border border-[#eaf0f0] rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-4">SEO</h3>
                <div className="space-y-4">
                  <MultilingualTextDisplay label="SEO Title" data={marketingSEO.seoTitle} />
                  <MultilingualTextDisplay label="SEO Description" data={marketingSEO.seoDescription} />
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
}
