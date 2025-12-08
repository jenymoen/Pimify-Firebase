
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Product, KeyValueEntry, MediaEntry, PriceEntry, ProductOption, ProductVariant } from '@/types/product';
import { useProductStore } from '@/lib/product-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ArrowLeft, Edit, Tag, Info, ImageIcon, BarChart3, Brain, Package, DollarSign, Cog, History, UserPlus, GitBranch, CloudUpload } from 'lucide-react';
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
import { SyncStatusBadge } from '@/components/products/SyncStatusBadge';
import { PushToShopifyDialog } from '@/components/products/PushToShopifyDialog';

const DetailSection: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
  <div className="mb-8">
    <h2 className="text-xl font-semibold text-primary mb-3 flex items-center">
      <Icon className="mr-2 h-5 w-5" /> {title}
    </h2>
    <Card className="shadow-sm">
      <CardContent className="p-6 space-y-3">
        {children}
      </CardContent>
    </Card>
  </div>
);

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

const MediaDisplay: React.FC<{ label: string; items?: MediaEntry[] }> = ({ label, items }) => {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground">{label}: No media available</p>;
  return (
    <div>
      <p className="font-medium text-foreground/90 mb-2">{label}:</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.map(item => (
          item.type === 'image' && item.url && (
            <div key={item.id} className="relative aspect-square rounded-md overflow-hidden border">
              <Image src={item.url} alt={item.altText?.en || 'Product Media'} layout="fill" objectFit="cover" data-ai-hint="product image detail" />
            </div>
          )
        ))}
      </div>
    </div>
  );
};

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


export default function ProductDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const { findProductById, updateProduct: storeUpdateProduct } = useProductStore();
  const [product, setProduct] = useState<Product | undefined | null>(undefined);

  // Mock current user - in a real app, this would come from auth context
  const currentUserRole = UserRole.ADMIN;
  const currentUserId = 'user-1';

  const [reviewers, setReviewers] = useState<Array<{ id: string; name: string; role: UserRole }>>([]);
  const [showPushDialog, setShowPushDialog] = useState(false);

  useEffect(() => {
    // Fetch reviewers
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
          'x-user-name': 'Admin User' // Mock name
        },
        body: JSON.stringify({
          workflowState: newState,
          // If rejecting, we might want to store the reason somewhere, but the current API might not support it directly in the body unless we add a field.
          // For now, we just update the state.
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProduct(data.data);
          // Refresh product store if needed, or just rely on local state update
        }
      } else {
        console.error('Failed to update product state');
      }
    } catch (error) {
      console.error('Error updating product state', error);
    }
  };

  const handleReviewerAssign = async (reviewerId: string) => {
    if (!product) return;

    const selectedReviewer = reviewers.find(r => r.id === reviewerId);
    if (!selectedReviewer) return;

    // Update product in store directly
    const updateData = {
      workflowState: WorkflowState.REVIEW,
      assignedReviewer: {
        userId: selectedReviewer.id,
        userName: selectedReviewer.name,
        userRole: selectedReviewer.role
      },
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

    storeUpdateProduct(product.id, updateData);

    // Update local state to reflect changes
    const updatedProduct = findProductById(product.id);
    if (updatedProduct) {
      setProduct(updatedProduct);
    }
  };

  if (product === undefined) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <Skeleton className="h-12 w-1/4 mb-4" />
        <Skeleton className="h-8 w-1/2 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="container mx-auto py-12 text-center">
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

  // Cast to ProductWorkflow to access workflow fields
  const productWorkflow = product as ProductWorkflow;
  const workflowState = productWorkflow.workflowState || WorkflowState.DRAFT;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <Button variant="outline" onClick={() => router.push('/products')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
      </Button>

      <Card className="mb-8 shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-3xl font-bold text-primary">{basicInfo.name.en || basicInfo.sku}</CardTitle>
              <WorkflowStateBadge state={workflowState} size="lg" />
            </div>
            {basicInfo.name.no && basicInfo.name.no !== basicInfo.name.en && <CardDescription className="text-lg">{basicInfo.name.no}</CardDescription>}
            <p className="text-sm text-muted-foreground mt-1">Base SKU: {basicInfo.sku} {basicInfo.gtin && `| Base GTIN: ${basicInfo.gtin}`}</p>
          </div>
          <div className="flex flex-col sm:items-end gap-2">
            <Badge variant={basicInfo.status === 'active' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
              Status: {basicInfo.status.charAt(0).toUpperCase() + basicInfo.status.slice(1)}
            </Badge>
            <div className="flex gap-2">
              <Link href={`/products/${product.id}/edit`} passHref>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" /> Edit Product
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          <WorkflowProgressIndicator
            currentState={workflowState}
            history={productWorkflow.workflowHistory}
            size="md"
            showHistory={true}
          />
          <div className="mt-4">
            <StateTransitionButtons
              currentState={workflowState}
              userRole={currentUserRole}
              productId={product.id}
              onStateTransition={handleWorkflowAction}
              onAssignReviewer={handleReviewerAssign}
              availableReviewers={reviewers}
              size="default"
            />
          </div>
        </CardContent>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-1">
              {media.images && media.images.length > 0 && media.images[0].url ? (
                <div className="relative aspect-square rounded-lg overflow-hidden border shadow-md">
                  <Image src={media.images[0].url} alt={media.images[0].altText?.en || basicInfo.name.en || ''} layout="fill" objectFit="contain" data-ai-hint="product main image" />
                </div>
              ) : (
                <div className="relative aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center" data-ai-hint="product placeholder">
                  <ImageIcon className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-4">
              <MultilingualTextDisplay label="Short Description" data={basicInfo.descriptionShort} />
              <MultilingualTextDisplay label="Long Description" data={basicInfo.descriptionLong} />
              <p className="text-sm"><span className="font-medium text-foreground/90">Brand:</span> <span className="text-muted-foreground">{basicInfo.brand}</span></p>
              {basicInfo.launchDate && <p className="text-sm"><span className="font-medium text-foreground/90">Launch Date:</span> <span className="text-muted-foreground">{format(parseISO(basicInfo.launchDate), "PPP")}</span></p>}
              {basicInfo.endDate && <p className="text-sm"><span className="font-medium text-foreground/90">End Date:</span> <span className="text-muted-foreground">{format(parseISO(basicInfo.endDate), "PPP")}</span></p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {product.aiSummary && (product.aiSummary.en || product.aiSummary.no) && (
        <DetailSection title="AI Summary" icon={Brain}>
          <MultilingualTextDisplay label="Summary" data={product.aiSummary} />
        </DetailSection>
      )}

      <DetailSection title="Attributes &amp; Specifications" icon={Tag}>
        {attributesAndSpecs.categories && attributesAndSpecs.categories.length > 0 && (
          <p className="text-sm"><span className="font-medium text-foreground/90">Categories:</span> <span className="text-muted-foreground">{attributesAndSpecs.categories.join(', ')}</span></p>
        )}
        <KeyValueDisplay label="Properties" items={attributesAndSpecs.properties} />
        <KeyValueDisplay label="Technical Specifications" items={attributesAndSpecs.technicalSpecs} />
        {attributesAndSpecs.countryOfOrigin && <p className="text-sm"><span className="font-medium text-foreground/90">Country of Origin:</span> <span className="text-muted-foreground">{attributesAndSpecs.countryOfOrigin}</span></p>}
      </DetailSection>

      {options && options.length > 0 && (
        <DetailSection title="Product Options &amp; Variants" icon={Cog}>
          <div className="space-y-3 mb-4">
            {options.map(opt => (
              <div key={opt.id}>
                <p className="font-medium text-foreground/90">{opt.name}:</p>
                <p className="text-sm text-muted-foreground pl-2">{opt.values.join(', ')}</p>
              </div>
            ))}
          </div>
          {variants && variants.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {options.map(opt => <TableHead key={opt.id}>{opt.name}</TableHead>)}
                    <TableHead>SKU</TableHead>
                    <TableHead>GTIN</TableHead>
                    <TableHead>Standard Price</TableHead>
                    <TableHead>Sale Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map(variant => (
                    <TableRow key={variant.id}>
                      {options.map(opt => <TableCell key={`${variant.id}-${opt.id}`}>{variant.optionValues[opt.name]}</TableCell>)}
                      <TableCell>{variant.sku}</TableCell>
                      <TableCell>{variant.gtin || 'N/A'}</TableCell>
                      <TableCell>
                        {variant.standardPrice?.[0] ? `${variant.standardPrice[0].amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${variant.standardPrice[0].currency}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {variant.salePrice?.[0] ? `${variant.salePrice[0].amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${variant.salePrice[0].currency}` : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No variants defined for these options. You can generate them in the product edit form.</p>
          )}
        </DetailSection>
      )}

      <DetailSection title="Marketing &amp; SEO" icon={BarChart3}>
        <MultilingualTextDisplay label="SEO Title" data={marketingSEO.seoTitle} />
        <MultilingualTextDisplay label="SEO Description" data={marketingSEO.seoDescription} />
        {marketingSEO.keywords && marketingSEO.keywords.length > 0 && (
          <p className="text-sm"><span className="font-medium text-foreground/90">Keywords:</span> <span className="text-muted-foreground">{marketingSEO.keywords.join(', ')}</span></p>
        )}
      </DetailSection>

      {pricingAndStock && (!variants || variants.length === 0) && (pricingAndStock.standardPrice?.length > 0 || pricingAndStock.salePrice?.length > 0 || pricingAndStock.costPrice?.length > 0) && (
        <DetailSection title="Base Pricing" icon={DollarSign}>
          <PriceDisplay label="Original Price" priceEntries={pricingAndStock.standardPrice} />
          <PriceDisplay label="Sales Price" priceEntries={pricingAndStock.salePrice} />
          <PriceDisplay label="Cost Price" priceEntries={pricingAndStock.costPrice} />
        </DetailSection>
      )}

      {media.images && media.images.length > 1 && (
        <DetailSection title="Additional Media" icon={ImageIcon}>
          <MediaDisplay label="Images" items={media.images.slice(1)} />
        </DetailSection>
      )}

      {/* Workflow Management Tabs */}
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <Tabs defaultValue="workflow" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="workflow">
                <GitBranch className="mr-2 h-4 w-4" />
                Workflow
              </TabsTrigger>
              <TabsTrigger value="shopify">
                <CloudUpload className="mr-2 h-4 w-4" />
                Shopify
              </TabsTrigger>
              <TabsTrigger value="audit">
                <History className="mr-2 h-4 w-4" />
                Audit Trail
              </TabsTrigger>
              <TabsTrigger value="reviewer">
                <UserPlus className="mr-2 h-4 w-4" />
                Reviewer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workflow" className="mt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Workflow Progress</h3>
                <WorkflowProgressIndicator
                  currentState={workflowState}
                  history={productWorkflow.workflowHistory}
                  variant="vertical"
                  size="lg"
                  showHistory={true}
                  colorScheme="status"
                />
              </div>
            </TabsContent>

            <TabsContent value="shopify" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Shopify Sync</h3>
                  <SyncStatusBadge product={product} showDetails />
                </div>

                {/* Sync eligibility check */}
                {[WorkflowState.APPROVED, WorkflowState.PUBLISHED, WorkflowState.SYNCED].includes(workflowState) ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      This product is ready to be pushed to Shopify.
                    </p>
                    <Button onClick={() => setShowPushDialog(true)}>
                      <CloudUpload className="mr-2 h-4 w-4" />
                      Push to Shopify
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                    <p className="text-sm">
                      Products must be in <strong>Approved</strong> or <strong>Published</strong> state before syncing to Shopify.
                    </p>
                    <p className="text-sm mt-1">
                      Current state: <strong>{workflowState}</strong>
                    </p>
                  </div>
                )}

                {/* Sync history */}
                {product.shopifySync && product.shopifySync.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-2">Sync History</h4>
                    <div className="space-y-2">
                      {product.shopifySync.map((sync, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded border bg-card">
                          <div>
                            <p className="font-medium">Store: {sync.storeId}</p>
                            <p className="text-sm text-muted-foreground">
                              Shopify ID: {sync.shopifyProductId}
                            </p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <p>Last synced:</p>
                            <p>{format(parseISO(sync.lastSyncedAt), 'MMM d, yyyy h:mm a')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="audit" className="mt-6">
              <AuditTrailViewer
                productId={product.id}
                userRole={currentUserRole}
                showFilters={true}
                enableExport={true}
              />
            </TabsContent>

            <TabsContent value="reviewer" className="mt-6">
              <ReviewerAssignment
                productId={product.id}
                productName={basicInfo.name.en || basicInfo.sku}
                currentReviewer={productWorkflow.assignedReviewer}
                userRole={currentUserRole}
                onAssign={handleReviewerAssign}
                showReviewerDetails={true}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Push to Shopify Dialog */}
      <PushToShopifyDialog
        product={product}
        isOpen={showPushDialog}
        onClose={() => setShowPushDialog(false)}
        onSuccess={(storeId, shopifyProductId) => {
          // Update product with sync info
          const existingSync = product.shopifySync || [];
          const syncIndex = existingSync.findIndex(s => s.storeId === storeId);
          const newSyncRecord = {
            storeId,
            shopifyProductId,
            lastSyncedAt: new Date().toISOString(),
          };

          const updatedSync = syncIndex >= 0
            ? existingSync.map((s, i) => i === syncIndex ? newSyncRecord : s)
            : [...existingSync, newSyncRecord];

          storeUpdateProduct(product.id, {
            shopifySync: updatedSync,
            workflowState: WorkflowState.SYNCED,
          });

          // Refresh product
          const updated = findProductById(product.id);
          if (updated) setProduct(updated);
        }}
      />
    </div>
  );
}

