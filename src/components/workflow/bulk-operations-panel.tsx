'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  WorkflowState, 
  WorkflowAction, 
  UserRole, 
  BulkOperationRequest, 
  BulkOperationFilters,
  ProductWorkflow 
} from '@/types/workflow';
import { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { 
  CheckSquare, 
  Square, 
  Filter, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Users,
  Calendar,
  Tag,
  Search,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Eye,
  Edit,
  Send,
  Check,
  X as XIcon,
  Zap
} from 'lucide-react';

/**
 * Props for the BulkOperationsPanel component
 */
export interface BulkOperationsPanelProps {
  /** Array of products to display */
  products: ProductWorkflow[];
  /** Current user's role */
  userRole: UserRole;
  /** Whether the panel is visible */
  isVisible: boolean;
  /** Callback when panel visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
  /** Callback when bulk operation is requested */
  onBulkOperation?: (operation: BulkOperationRequest) => void;
  /** Available reviewers for assignment */
  availableReviewers?: Array<{ id: string; name: string; role: UserRole }>;
  /** Available categories for filtering */
  availableCategories?: string[];
  /** Available brands for filtering */
  availableBrands?: string[];
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string;
  /** Custom className */
  className?: string;
  /** Whether to show advanced filters */
  showAdvancedFilters?: boolean;
  /** Whether to show operation history */
  showOperationHistory?: boolean;
  /** Maximum number of products that can be selected */
  maxSelection?: number;
  /** Whether to enable real-time filtering */
  enableRealTimeFiltering?: boolean;
}

/**
 * Bulk operation configuration
 */
const BULK_OPERATION_CONFIG = {
  [WorkflowAction.BULK_APPROVE]: {
    label: 'Approve Selected',
    description: 'Approve all selected products for publication',
    icon: CheckCircle,
    color: 'bg-green-500 hover:bg-green-600',
    textColor: 'text-white',
    requiredRole: UserRole.REVIEWER,
    confirmationMessage: 'Are you sure you want to approve all selected products?',
    requiresReason: false,
  },
  [WorkflowAction.BULK_REJECT]: {
    label: 'Reject Selected',
    description: 'Reject all selected products and return to draft',
    icon: XCircle,
    color: 'bg-red-500 hover:bg-red-600',
    textColor: 'text-white',
    requiredRole: UserRole.REVIEWER,
    confirmationMessage: 'Are you sure you want to reject all selected products?',
    requiresReason: true,
  },
  [WorkflowAction.BULK_PUBLISH]: {
    label: 'Publish Selected',
    description: 'Publish all selected products to live environment',
    icon: Zap,
    color: 'bg-purple-500 hover:bg-purple-600',
    textColor: 'text-white',
    requiredRole: UserRole.ADMIN,
    confirmationMessage: 'Are you sure you want to publish all selected products?',
    requiresReason: false,
  },
  [WorkflowAction.ASSIGN_REVIEWER]: {
    label: 'Assign Reviewer',
    description: 'Assign a reviewer to all selected products',
    icon: Users,
    color: 'bg-indigo-500 hover:bg-indigo-600',
    textColor: 'text-white',
    requiredRole: UserRole.ADMIN,
    confirmationMessage: 'Are you sure you want to assign a reviewer to all selected products?',
    requiresReason: false,
  },
  [WorkflowAction.VIEW_AUDIT_TRAIL]: {
    label: 'View Audit Trail',
    description: 'View audit trail for all selected products',
    icon: Eye,
    color: 'bg-gray-500 hover:bg-gray-600',
    textColor: 'text-white',
    requiredRole: UserRole.VIEWER,
    confirmationMessage: null,
    requiresReason: false,
  },
} as const;

/**
 * Filter options for bulk operations
 */
interface FilterOptions {
  workflowStates: WorkflowState[];
  categories: string[];
  brands: string[];
  assignedReviewers: string[];
  dateRange: {
    start: string;
    end: string;
  };
  searchQuery: string;
}

/**
 * BulkOperationsPanel component for managing bulk operations on products
 */
export const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
  products,
  userRole,
  isVisible,
  onVisibilityChange,
  onBulkOperation,
  availableReviewers = [],
  availableCategories = [],
  availableBrands = [],
  loading = false,
  error,
  className,
  showAdvancedFilters = true,
  showOperationHistory = false,
  maxSelection = 1000,
  enableRealTimeFiltering = true,
}) => {
  // Selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [indeterminate, setIndeterminate] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    workflowStates: [],
    categories: [],
    brands: [],
    assignedReviewers: [],
    dateRange: { start: '', end: '' },
    searchQuery: '',
  });

  // Operation state
  const [selectedOperation, setSelectedOperation] = useState<WorkflowAction | null>(null);
  const [operationReason, setOperationReason] = useState('');
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [operationProgress, setOperationProgress] = useState(0);
  const [isOperationRunning, setIsOperationRunning] = useState(false);

  // Filtered products based on current filters
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.basicInfo.name.en.toLowerCase().includes(query) ||
        product.basicInfo.name.no.toLowerCase().includes(query) ||
        product.basicInfo.sku.toLowerCase().includes(query) ||
        product.basicInfo.brand.toLowerCase().includes(query)
      );
    }

    // Workflow state filter
    if (filters.workflowStates.length > 0) {
      filtered = filtered.filter(product => 
        product.workflowState && filters.workflowStates.includes(product.workflowState)
      );
    }

    // Category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(product => 
        product.attributesAndSpecs.categories.some(category => 
          filters.categories.includes(category)
        )
      );
    }

    // Brand filter
    if (filters.brands.length > 0) {
      filtered = filtered.filter(product => 
        filters.brands.includes(product.basicInfo.brand)
      );
    }

    // Reviewer filter
    if (filters.assignedReviewers.length > 0) {
      filtered = filtered.filter(product => 
        product.assignedReviewer && 
        filters.assignedReviewers.includes(product.assignedReviewer.userId)
      );
    }

    // Date range filter
    if (filters.dateRange.start && filters.dateRange.end) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(product => {
        const productDate = new Date(product.updatedAt);
        return productDate >= startDate && productDate <= endDate;
      });
    }

    return filtered;
  }, [products, filters]);

  // Update select all state when filtered products change
  useEffect(() => {
    const filteredIds = new Set(filteredProducts.map(p => p.id));
    const selectedInFiltered = Array.from(selectedProducts).filter(id => filteredIds.has(id));
    
    setSelectAll(selectedInFiltered.length === filteredProducts.length && filteredProducts.length > 0);
    setIndeterminate(selectedInFiltered.length > 0 && selectedInFiltered.length < filteredProducts.length);
  }, [filteredProducts, selectedProducts]);

  /**
   * Handle select all checkbox
   */
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const newSelection = new Set(selectedProducts);
      filteredProducts.forEach(product => {
        if (newSelection.size < maxSelection) {
          newSelection.add(product.id);
        }
      });
      setSelectedProducts(newSelection);
    } else {
      const filteredIds = new Set(filteredProducts.map(p => p.id));
      const newSelection = new Set(Array.from(selectedProducts).filter(id => !filteredIds.has(id)));
      setSelectedProducts(newSelection);
    }
  }, [selectedProducts, filteredProducts, maxSelection]);

  /**
   * Handle individual product selection
   */
  const handleProductSelect = useCallback((productId: string, checked: boolean) => {
    if (checked) {
      if (selectedProducts.size >= maxSelection) {
        return; // Don't allow selection if max reached
      }
      setSelectedProducts(prev => new Set([...prev, productId]));
    } else {
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  }, [selectedProducts, maxSelection]);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  /**
   * Get available bulk operations based on user role and selected products
   */
  const getAvailableOperations = useCallback((): WorkflowAction[] => {
    const operations: WorkflowAction[] = [];
    const selectedProductsData = products.filter(p => selectedProducts.has(p.id));
    
    if (selectedProductsData.length === 0) return operations;

    // Check if user has permission for each operation
    Object.entries(BULK_OPERATION_CONFIG).forEach(([action, config]) => {
      const roleLevel = { [UserRole.ADMIN]: 4, [UserRole.REVIEWER]: 3, [UserRole.EDITOR]: 2, [UserRole.VIEWER]: 1 }[userRole];
      const requiredLevel = { [UserRole.ADMIN]: 4, [UserRole.REVIEWER]: 3, [UserRole.EDITOR]: 2, [UserRole.VIEWER]: 1 }[config.requiredRole];
      
      if (roleLevel >= requiredLevel) {
        operations.push(action as WorkflowAction);
      }
    });

    return operations;
  }, [userRole, selectedProducts, products]);

  /**
   * Handle bulk operation execution
   */
  const handleBulkOperation = useCallback((operation: WorkflowAction) => {
    const config = BULK_OPERATION_CONFIG[operation];
    if (!config) return;

    setSelectedOperation(operation);
    
    if (config.confirmationMessage) {
      setShowConfirmation(true);
    } else {
      executeBulkOperation(operation);
    }
  }, []);

  /**
   * Execute the bulk operation
   */
  const executeBulkOperation = useCallback(async (operation: WorkflowAction) => {
    if (selectedProducts.size === 0) return;

    setIsOperationRunning(true);
    setOperationProgress(0);

    try {
      const bulkRequest: BulkOperationRequest = {
        operation,
        productIds: Array.from(selectedProducts),
        reason: operationReason || undefined,
        assignedReviewer: selectedReviewer || undefined,
        filters: {
          workflowStates: filters.workflowStates,
          categories: filters.categories,
          brands: filters.brands,
          assignedReviewers: filters.assignedReviewers,
          dateRange: filters.dateRange.start && filters.dateRange.end ? filters.dateRange : undefined,
        },
      };

      // Simulate progress
      const progressInterval = setInterval(() => {
        setOperationProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      await onBulkOperation?.(bulkRequest);

      clearInterval(progressInterval);
      setOperationProgress(100);

      // Reset state after successful operation
      setTimeout(() => {
        setSelectedProducts(new Set());
        setOperationReason('');
        setSelectedReviewer('');
        setIsOperationRunning(false);
        setOperationProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Bulk operation failed:', error);
      setIsOperationRunning(false);
      setOperationProgress(0);
    }
  }, [selectedProducts, operationReason, selectedReviewer, filters, onBulkOperation]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback((key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters({
      workflowStates: [],
      categories: [],
      brands: [],
      assignedReviewers: [],
      dateRange: { start: '', end: '' },
      searchQuery: '',
    });
  }, []);

  if (!isVisible) {
    return null;
  }

  const availableOperations = getAvailableOperations();
  const selectedCount = selectedProducts.size;
  const filteredCount = filteredProducts.length;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Bulk Operations
            </CardTitle>
            <CardDescription>
              Select products and perform bulk operations
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onVisibilityChange?.(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Selection Summary */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectAll}
                ref={(el) => {
                  if (el) el.indeterminate = indeterminate;
                }}
                onCheckedChange={handleSelectAll}
                disabled={filteredProducts.length === 0}
              />
              <Label className="text-sm font-medium">
                Select All ({filteredCount} products)
              </Label>
            </div>
            {selectedCount > 0 && (
              <Badge variant="secondary">
                {selectedCount} selected
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
              >
                Clear Selection
              </Button>
            )}
            {selectedCount >= maxSelection && (
              <Badge variant="destructive">
                Max selection reached ({maxSelection})
              </Badge>
            )}
          </div>
        </div>

        {/* Filters */}
        {showAdvancedFilters && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search products..."
                    value={filters.searchQuery}
                    onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Workflow States */}
              <div className="space-y-2">
                <Label>Workflow States</Label>
                <Select
                  value={filters.workflowStates.join(',')}
                  onValueChange={(value) => 
                    handleFilterChange('workflowStates', value ? value.split(',') : [])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select states" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(WorkflowState).map(state => (
                      <SelectItem key={state} value={state}>
                        {state.charAt(0).toUpperCase() + state.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <Label>Categories</Label>
                <Select
                  value={filters.categories.join(',')}
                  onValueChange={(value) => 
                    handleFilterChange('categories', value ? value.split(',') : [])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Brands */}
              <div className="space-y-2">
                <Label>Brands</Label>
                <Select
                  value={filters.brands.join(',')}
                  onValueChange={(value) => 
                    handleFilterChange('brands', value ? value.split(',') : [])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brands" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBrands.map(brand => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="Start date"
                    value={filters.dateRange.start}
                    onChange={(e) => handleFilterChange('dateRange', {
                      ...filters.dateRange,
                      start: e.target.value
                    })}
                  />
                  <Input
                    type="date"
                    placeholder="End date"
                    value={filters.dateRange.end}
                    onChange={(e) => handleFilterChange('dateRange', {
                      ...filters.dateRange,
                      end: e.target.value
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Bulk Operations */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Bulk Operations</h3>
          
          {availableOperations.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No bulk operations available for the selected products or your role.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableOperations.map(operation => {
                const config = BULK_OPERATION_CONFIG[operation];
                if (!config) return null;

                const Icon = config.icon;
                const isDisabled = selectedCount === 0 || isOperationRunning;

                return (
                  <Button
                    key={operation}
                    variant="outline"
                    className={cn(
                      'h-auto p-4 flex flex-col items-start gap-2',
                      config.color,
                      config.textColor,
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                    disabled={isDisabled}
                    onClick={() => handleBulkOperation(operation)}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <p className="text-xs opacity-80 text-left">
                      {config.description}
                    </p>
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Operation Progress */}
        {isOperationRunning && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processing bulk operation...</span>
              <span>{operationProgress}%</span>
            </div>
            <Progress value={operationProgress} className="w-full" />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Confirmation Dialog */}
        {showConfirmation && selectedOperation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <CardHeader>
                <CardTitle>
                  {BULK_OPERATION_CONFIG[selectedOperation]?.label}
                </CardTitle>
                <CardDescription>
                  {BULK_OPERATION_CONFIG[selectedOperation]?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  This will affect {selectedCount} selected products.
                </p>

                {BULK_OPERATION_CONFIG[selectedOperation]?.requiresReason && (
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (required)</Label>
                    <Input
                      id="reason"
                      placeholder="Enter reason for this action..."
                      value={operationReason}
                      onChange={(e) => setOperationReason(e.target.value)}
                    />
                  </div>
                )}

                {selectedOperation === WorkflowAction.ASSIGN_REVIEWER && (
                  <div className="space-y-2">
                    <Label htmlFor="reviewer">Select Reviewer</Label>
                    <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a reviewer" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableReviewers.map(reviewer => (
                          <SelectItem key={reviewer.id} value={reviewer.id}>
                            {reviewer.name} ({reviewer.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowConfirmation(false);
                      setSelectedOperation(null);
                      setOperationReason('');
                      setSelectedReviewer('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setShowConfirmation(false);
                      executeBulkOperation(selectedOperation);
                    }}
                    disabled={
                      BULK_OPERATION_CONFIG[selectedOperation]?.requiresReason && !operationReason.trim() ||
                      selectedOperation === WorkflowAction.ASSIGN_REVIEWER && !selectedReviewer
                    }
                  >
                    Confirm
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Product selection row component
 */
export interface ProductSelectionRowProps {
  product: ProductWorkflow;
  isSelected: boolean;
  onSelect: (productId: string, selected: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const ProductSelectionRow: React.FC<ProductSelectionRowProps> = ({
  product,
  isSelected,
  onSelect,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors',
      isSelected && 'bg-blue-50 border-blue-200',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}>
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelect(product.id, !!checked)}
        disabled={disabled}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">
            {product.basicInfo.name.en || product.basicInfo.name.no}
          </h4>
          <Badge variant="outline" className="text-xs">
            {product.basicInfo.sku}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{product.basicInfo.brand}</span>
          <span>•</span>
          <span>{product.workflowState}</span>
          {product.assignedReviewer && (
            <>
              <span>•</span>
              <span>Reviewer: {product.assignedReviewer.userName}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkOperationsPanel;
