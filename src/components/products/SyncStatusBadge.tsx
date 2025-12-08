'use client';

/**
 * Sync Status Badge Component
 * 
 * Displays the sync status for a product in the product list/detail views.
 * Shows SYNCED state with appropriate styling.
 */

import { CloudUpload, CheckCircle } from 'lucide-react';
import { Product } from '@/types/product';
import { WorkflowState } from '@/types/workflow';

interface SyncStatusBadgeProps {
    product: Product;
    showDetails?: boolean;
    className?: string;
}

/**
 * Get Shopify store names from sync records
 */
function getSyncedStoreNames(product: Product): string[] {
    if (!product.shopifySync || product.shopifySync.length === 0) {
        return [];
    }

    // In a real app, we'd fetch store names from the service
    // For now, return store IDs
    return product.shopifySync.map(s => s.storeId.replace('store_', 'Store '));
}

/**
 * Format last sync timestamp
 */
function formatLastSync(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
}

export function SyncStatusBadge({
    product,
    showDetails = false,
    className = ''
}: SyncStatusBadgeProps) {
    const isSynced = product.workflowState === WorkflowState.SYNCED ||
        (product.shopifySync && product.shopifySync.length > 0);

    if (!isSynced) {
        return null;
    }

    const syncRecords = product.shopifySync || [];
    const latestSync = syncRecords.length > 0
        ? syncRecords.reduce((latest, current) =>
            new Date(current.lastSyncedAt) > new Date(latest.lastSyncedAt) ? current : latest
        )
        : null;

    if (showDetails) {
        return (
            <div className={`flex flex-col gap-1 ${className}`}>
                <div className="flex items-center gap-2">
                    <CloudUpload className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        Synced to Shopify
                    </span>
                </div>
                {latestSync && (
                    <div className="text-xs text-muted-foreground ml-7">
                        Last synced: {formatLastSync(latestSync.lastSyncedAt)}
                    </div>
                )}
                {syncRecords.length > 1 && (
                    <div className="text-xs text-muted-foreground ml-7">
                        {syncRecords.length} stores connected
                    </div>
                )}
            </div>
        );
    }

    // Compact badge view
    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full 
                     bg-emerald-100 dark:bg-emerald-900/30 
                     text-emerald-700 dark:text-emerald-400 
                     text-xs font-medium ${className}`}>
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Synced</span>
            {syncRecords.length > 1 && (
                <span className="text-emerald-500">({syncRecords.length})</span>
            )}
        </div>
    );
}

/**
 * Simple sync indicator for table/list views
 */
export function SyncIndicator({ product }: { product: Product }) {
    const isSynced = product.shopifySync && product.shopifySync.length > 0;

    if (!isSynced) {
        return null;
    }

    return (
        <div
            className="h-2 w-2 rounded-full bg-emerald-500"
            title={`Synced to ${product.shopifySync?.length} store(s)`}
        />
    );
}

export default SyncStatusBadge;
