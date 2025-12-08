'use client';

/**
 * Shopify Bulk Push Panel
 * 
 * Panel for selecting multiple products and pushing them to Shopify.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    CloudUpload,
    X,
    CheckCircle,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { Product } from '@/types/product';
import { WorkflowState } from '@/types/workflow';
import { useShopifyStores, ShopifyStoreInfo } from '@/hooks/use-shopify-stores';
import { useBulkPushToShopify } from '@/hooks/use-shopify-sync';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface ShopifyBulkPushPanelProps {
    products: Product[];
    onClose: () => void;
    onComplete?: (result: BulkPushResult) => void;
}

interface BulkPushResult {
    success: boolean;
    totalProducts: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
}

export function ShopifyBulkPushPanel({
    products,
    onClose,
    onComplete,
}: ShopifyBulkPushPanelProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [pushResult, setPushResult] = useState<BulkPushResult | null>(null);

    const { data: storesData, isLoading: storesLoading } = useShopifyStores();
    const bulkPushMutation = useBulkPushToShopify();

    const stores = storesData?.stores?.filter(s => s.status === 'connected') || [];

    // Filter products that can be synced (APPROVED, PUBLISHED, or SYNCED)
    const syncableProducts = useMemo(() => {
        const validStates = [WorkflowState.APPROVED, WorkflowState.PUBLISHED, WorkflowState.SYNCED];
        return products.filter(p => validStates.includes(p.workflowState as WorkflowState));
    }, [products]);

    const nonSyncableCount = products.length - syncableProducts.length;

    // Toggle product selection
    const toggleSelection = (productId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(productId)) {
            newSelected.delete(productId);
        } else {
            newSelected.add(productId);
        }
        setSelectedIds(newSelected);
    };

    // Select all syncable products
    const selectAll = () => {
        setSelectedIds(new Set(syncableProducts.map(p => p.id)));
    };

    // Clear selection
    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    // Execute bulk push
    const handleBulkPush = async () => {
        if (!selectedStoreId || selectedIds.size === 0) return;

        const selectedProducts = products.filter(p => selectedIds.has(p.id));

        try {
            const result = await bulkPushMutation.mutateAsync({
                products: selectedProducts,
                storeId: selectedStoreId,
            });

            const pushResult: BulkPushResult = {
                success: result.result?.success ?? false,
                totalProducts: result.result?.totalProducts ?? 0,
                successCount: result.result?.successCount ?? 0,
                failedCount: result.result?.failedCount ?? 0,
                skippedCount: result.result?.skippedCount ?? 0,
            };

            setPushResult(pushResult);
            onComplete?.(pushResult);
        } catch (error) {
            console.error('Bulk push failed:', error);
        }
    };

    // Progress percentage
    const progressPercent = bulkPushMutation.isPending ? 50 : (pushResult ? 100 : 0);

    return (
        <Card className="shadow-lg border-2 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="flex items-center gap-2">
                    <CloudUpload className="h-5 w-5 text-primary" />
                    Bulk Push to Shopify
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Store Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Select Shopify Store</label>
                    {storesLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading stores...
                        </div>
                    ) : stores.length === 0 ? (
                        <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm">
                            No Shopify stores connected. Go to Settings → Integrations to connect a store.
                        </div>
                    ) : (
                        <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a store..." />
                            </SelectTrigger>
                            <SelectContent>
                                {stores.map((store) => (
                                    <SelectItem key={store.id} value={store.id}>
                                        {store.shopName} ({store.shop})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Product Selection Stats */}
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                        <span>
                            <strong>{selectedIds.size}</strong> of <strong>{syncableProducts.length}</strong> selected
                        </span>
                        {nonSyncableCount > 0 && (
                            <Badge variant="secondary">
                                {nonSyncableCount} not eligible (needs approval)
                            </Badge>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={selectAll} disabled={syncableProducts.length === 0}>
                            Select All
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearSelection} disabled={selectedIds.size === 0}>
                            Clear
                        </Button>
                    </div>
                </div>

                {/* Product List */}
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                    {syncableProducts.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                            No products eligible for sync. Products must be in APPROVED or PUBLISHED state.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {syncableProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className={`flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer ${selectedIds.has(product.id) ? 'bg-primary/5' : ''
                                        }`}
                                    onClick={() => toggleSelection(product.id)}
                                >
                                    <Checkbox
                                        checked={selectedIds.has(product.id)}
                                        onCheckedChange={() => toggleSelection(product.id)}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">
                                            {product.basicInfo.name.en || product.basicInfo.sku}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            SKU: {product.basicInfo.sku}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        {product.workflowState}
                                    </Badge>
                                    {product.shopifySync?.some(s => s.storeId === selectedStoreId) && (
                                        <Badge variant="secondary" className="text-xs">
                                            Update
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Progress/Result */}
                {(bulkPushMutation.isPending || pushResult) && (
                    <div className="space-y-2">
                        <Progress value={progressPercent} className="h-2" />

                        {bulkPushMutation.isPending && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Pushing products to Shopify...
                            </div>
                        )}

                        {pushResult && (
                            <div className={`flex items-center gap-2 p-3 rounded-lg ${pushResult.success
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                                }`}>
                                {pushResult.success ? (
                                    <CheckCircle className="h-5 w-5" />
                                ) : (
                                    <AlertCircle className="h-5 w-5" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {pushResult.success ? 'Bulk push complete!' : 'Bulk push completed with errors'}
                                    </p>
                                    <p className="text-sm">
                                        {pushResult.successCount} succeeded, {pushResult.failedCount} failed, {pushResult.skippedCount} skipped
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose}>
                        {pushResult ? 'Close' : 'Cancel'}
                    </Button>
                    {!pushResult && (
                        <Button
                            onClick={handleBulkPush}
                            disabled={
                                selectedIds.size === 0 ||
                                !selectedStoreId ||
                                bulkPushMutation.isPending
                            }
                        >
                            {bulkPushMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Pushing...
                                </>
                            ) : (
                                <>
                                    <CloudUpload className="mr-2 h-4 w-4" />
                                    Push {selectedIds.size} Products
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default ShopifyBulkPushPanel;
