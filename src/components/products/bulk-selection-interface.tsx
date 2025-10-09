'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CheckSquare, 
  Square, 
  MinusSquare,
  X,
  Filter,
  Download,
  Upload,
  Trash2,
  Archive,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Product } from '@/types/product';
import { WorkflowState } from '@/types/workflow';

/**
 * Selection mode
 */
export enum SelectionMode {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  RANGE = 'range',
  ALL = 'all',
}

/**
 * Props for BulkSelectionInterface
 */
export interface BulkSelectionInterfaceProps {
  products: Product[];
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onBulkAction?: (action: string, productIds: string[]) => void;
  selectionMode?: SelectionMode;
  maxSelection?: number;
  showActions?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  customActions?: Array<{
    id: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    requiresConfirmation?: boolean;
  }>;
}

/**
 * Bulk Selection Interface Component
 */
export const BulkSelectionInterface: React.FC<BulkSelectionInterfaceProps> = ({
  products,
  selectedIds,
  onSelectionChange,
  onBulkAction,
  selectionMode = SelectionMode.MULTIPLE,
  maxSelection,
  showActions = true,
  showHeader = true,
  showFooter = true,
  disabled = false,
  readOnly = false,
  className,
  customActions = [],
}) => {
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  /**
   * Check if all products are selected
   */
  const allSelected = useMemo(() => {
    return products.length > 0 && products.every(p => selectedIds.has(p.id));
  }, [products, selectedIds]);

  /**
   * Check if some (but not all) products are selected
   */
  const someSelected = useMemo(() => {
    return !allSelected && products.some(p => selectedIds.has(p.id));
  }, [products, selectedIds, allSelected]);

  /**
   * Toggle single product selection
   */
  const toggleProduct = useCallback((productId: string, index: number, event?: React.MouseEvent) => {
    if (disabled || readOnly) return;

    const newSelection = new Set(selectedIds);

    // Handle range selection with Shift key
    if (
      selectionMode === SelectionMode.RANGE &&
      event?.shiftKey &&
      lastSelectedIndex !== null
    ) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      
      for (let i = start; i <= end; i++) {
        if (products[i]) {
          newSelection.add(products[i].id);
        }
      }
    } else {
      // Regular toggle
      if (selectedIds.has(productId)) {
        newSelection.delete(productId);
      } else {
        // Check max selection limit
        if (maxSelection && newSelection.size >= maxSelection) {
          return;
        }

        if (selectionMode === SelectionMode.SINGLE) {
          newSelection.clear();
        }
        newSelection.add(productId);
      }
    }

    setLastSelectedIndex(index);
    onSelectionChange(newSelection);
  }, [disabled, readOnly, selectedIds, selectionMode, lastSelectedIndex, maxSelection, products, onSelectionChange]);

  /**
   * Select all products
   */
  const selectAll = useCallback(() => {
    if (disabled || readOnly) return;

    if (maxSelection && products.length > maxSelection) {
      // Select only up to max
      const newSelection = new Set(products.slice(0, maxSelection).map(p => p.id));
      onSelectionChange(newSelection);
    } else {
      const newSelection = new Set(products.map(p => p.id));
      onSelectionChange(newSelection);
    }
  }, [disabled, readOnly, maxSelection, products, onSelectionChange]);

  /**
   * Deselect all products
   */
  const deselectAll = useCallback(() => {
    if (disabled || readOnly) return;
    onSelectionChange(new Set());
  }, [disabled, readOnly, onSelectionChange]);

  /**
   * Toggle all selection
   */
  const toggleAll = useCallback(() => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [allSelected, selectAll, deselectAll]);

  /**
   * Handle bulk action
   */
  const handleBulkAction = useCallback((action: string) => {
    if (disabled || readOnly || selectedIds.size === 0) return;
    
    const selectedProducts = Array.from(selectedIds);
    onBulkAction?.(action, selectedProducts);
  }, [disabled, readOnly, selectedIds, onBulkAction]);

  /**
   * Get selection icon
   */
  const getSelectionIcon = () => {
    if (allSelected) {
      return <CheckSquare className="h-5 w-5 text-blue-600" />;
    } else if (someSelected) {
      return <MinusSquare className="h-5 w-5 text-blue-600" />;
    } else {
      return <Square className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      {showHeader && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {getSelectionIcon()}
                  Bulk Selection
                </CardTitle>
                <CardDescription>
                  {selectedIds.size > 0 ? (
                    <>
                      {selectedIds.size} of {products.length} products selected
                      {maxSelection && ` (max: ${maxSelection})`}
                    </>
                  ) : (
                    `Select products to perform bulk actions`
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={disabled || readOnly || allSelected}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                  disabled={disabled || readOnly || selectedIds.size === 0}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Bulk Actions Bar */}
      {showActions && selectedIds.size > 0 && !readOnly && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {selectedIds.size} selected
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {customActions.map(action => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant={action.variant || 'outline'}
                      size="sm"
                      onClick={() => handleBulkAction(action.id)}
                      disabled={disabled}
                    >
                      {Icon && <Icon className="h-4 w-4 mr-2" />}
                      {action.label}
                    </Button>
                  );
                })}
                {/* Default actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('export')}
                  disabled={disabled}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('archive')}
                  disabled={disabled}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    disabled={disabled || readOnly}
                    aria-label="Select all products"
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    No products available
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product, index) => (
                  <TableRow
                    key={product.id}
                    className={cn(
                      'cursor-pointer hover:bg-gray-50',
                      { 'bg-blue-50': selectedIds.has(product.id) }
                    )}
                    onClick={(e) => toggleProduct(product.id, index, e)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(product.id)}
                        onCheckedChange={() => toggleProduct(product.id, index)}
                        disabled={disabled || readOnly}
                        aria-label={`Select ${product.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.brand}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>
                      <Badge variant={getWorkflowStateBadgeVariant(product.workflowState)}>
                        {product.workflowState}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{product.category}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer */}
      {showFooter && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            {selectedIds.size} of {products.length} products selected
            {maxSelection && ` (max: ${maxSelection})`}
          </div>
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={deselectAll}
              disabled={disabled || readOnly}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Selection
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Compact bulk selection for smaller spaces
 */
export interface CompactBulkSelectionProps {
  products: Product[];
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  disabled?: boolean;
  maxSelection?: number;
}

export const CompactBulkSelection: React.FC<CompactBulkSelectionProps> = ({
  products,
  selectedIds,
  onSelectionChange,
  disabled = false,
  maxSelection,
}) => {
  const toggleProduct = useCallback((productId: string) => {
    if (disabled) return;

    const newSelection = new Set(selectedIds);
    if (selectedIds.has(productId)) {
      newSelection.delete(productId);
    } else {
      if (maxSelection && newSelection.size >= maxSelection) {
        return;
      }
      newSelection.add(productId);
    }
    onSelectionChange(newSelection);
  }, [disabled, selectedIds, maxSelection, onSelectionChange]);

  const selectAll = useCallback(() => {
    if (disabled) return;
    const limit = maxSelection || products.length;
    const newSelection = new Set(products.slice(0, limit).map(p => p.id));
    onSelectionChange(newSelection);
  }, [disabled, maxSelection, products, onSelectionChange]);

  const deselectAll = useCallback(() => {
    if (disabled) return;
    onSelectionChange(new Set());
  }, [disabled, onSelectionChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          {selectedIds.size} of {products.length} selected
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll} disabled={disabled}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={deselectAll} disabled={disabled || selectedIds.size === 0}>
            Clear
          </Button>
        </div>
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {products.map(product => (
          <div
            key={product.id}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50',
              { 'bg-blue-50 border-blue-200': selectedIds.has(product.id) }
            )}
            onClick={() => toggleProduct(product.id)}
          >
            <Checkbox
              checked={selectedIds.has(product.id)}
              onCheckedChange={() => toggleProduct(product.id)}
              disabled={disabled}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{product.name}</div>
              <div className="text-sm text-gray-500 truncate">{product.sku}</div>
            </div>
            <Badge variant={getWorkflowStateBadgeVariant(product.workflowState)}>
              {product.workflowState}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Helper function to get workflow state badge variant
 */
function getWorkflowStateBadgeVariant(state?: WorkflowState): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (state) {
    case WorkflowState.DRAFT:
      return 'secondary';
    case WorkflowState.REVIEW:
      return 'default';
    case WorkflowState.APPROVED:
      return 'outline';
    case WorkflowState.PUBLISHED:
      return 'outline';
    case WorkflowState.REJECTED:
      return 'destructive';
    default:
      return 'secondary';
  }
}

export default BulkSelectionInterface;
