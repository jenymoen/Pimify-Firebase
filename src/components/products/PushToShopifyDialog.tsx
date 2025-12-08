'use client';

/**
 * Push to Shopify Dialog Component
 * 
 * Modal dialog for selecting Shopify stores and pushing a product.
 */

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CloudUpload, AlertTriangle, CheckCircle } from 'lucide-react';
import { useShopifyStores, ShopifyStoreInfo } from '@/hooks/use-shopify-stores';
import { usePushToShopify } from '@/hooks/use-shopify-sync';
import { Product } from '@/types/product';
import { WorkflowState } from '@/types/workflow';

interface PushToShopifyDialogProps {
    product: Product;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (storeId: string, shopifyProductId: string) => void;
}

export function PushToShopifyDialog({
    product,
    isOpen,
    onClose,
    onSuccess,
}: PushToShopifyDialogProps) {
    const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
    const { data: storesData, isLoading: storesLoading } = useShopifyStores();
    const pushMutation = usePushToShopify();

    const stores = storesData?.stores || [];
    const connectedStores = stores.filter(s => s.status === 'connected');

    // Check if product can be synced
    const canSync = [WorkflowState.APPROVED, WorkflowState.PUBLISHED, WorkflowState.SYNCED]
        .includes(product.workflowState as WorkflowState);

    // Check if already synced to selected store
    const isAlreadySynced = (storeId: string) =>
        product.shopifySync?.some(s => s.storeId === storeId);

    const handlePush = async () => {
        if (!selectedStoreId) return;

        try {
            const result = await pushMutation.mutateAsync({
                product,
                storeId: selectedStoreId,
            });

            if (result.success && result.syncUpdate?.shopifyProductId) {
                onSuccess?.(selectedStoreId, result.syncUpdate.shopifyProductId);
            }

            onClose();
        } catch (error) {
            // Error handled by mutation
            console.error('Push failed:', error);
        }
    };

    const handleStoreSelect = (storeId: string) => {
        setSelectedStoreId(prev => prev === storeId ? null : storeId);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CloudUpload className="h-5 w-5 text-primary" />
                        Push to Shopify
                    </DialogTitle>
                    <DialogDescription>
                        Select a Shopify store to push "{product.basicInfo.name.en || product.basicInfo.sku}" to.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {/* Validation Warning */}
                    {!canSync && (
                        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium">Product cannot be synced</p>
                                <p className="text-yellow-700 dark:text-yellow-300">
                                    Only products in APPROVED or PUBLISHED state can be pushed to Shopify.
                                    Current state: {product.workflowState}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* No Stores Warning */}
                    {!storesLoading && connectedStores.length === 0 && (
                        <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-muted text-muted-foreground">
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium">No Shopify stores connected</p>
                                <p>Go to Settings → Integrations to connect a Shopify store.</p>
                            </div>
                        </div>
                    )}

                    {/* Store List */}
                    {storesLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {connectedStores.map((store) => (
                                <div
                                    key={store.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                    ${selectedStoreId === store.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                        }
                    ${!canSync ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                                    onClick={() => canSync && handleStoreSelect(store.id)}
                                >
                                    <Checkbox
                                        checked={selectedStoreId === store.id}
                                        disabled={!canSync}
                                        onCheckedChange={() => handleStoreSelect(store.id)}
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{store.shopName}</span>
                                            {isAlreadySynced(store.id) && (
                                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Synced
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{store.shop}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePush}
                        disabled={!canSync || !selectedStoreId || pushMutation.isPending}
                    >
                        {pushMutation.isPending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Pushing...
                            </>
                        ) : isAlreadySynced(selectedStoreId || '') ? (
                            'Update in Shopify'
                        ) : (
                            'Push to Shopify'
                        )}
                    </Button>
                </DialogFooter>

                {/* Error Display */}
                {pushMutation.isError && (
                    <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
                        {pushMutation.error?.message || 'Failed to push to Shopify'}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default PushToShopifyDialog;
