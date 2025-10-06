'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { ProductWorkflow, WorkflowAction, UserRole, BulkOperationRequest } from '@/types/workflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  CheckSquare, 
  Square, 
  Users, 
  Settings, 
  Play, 
  Pause, 
  Stop, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Filter,
  Search,
  Download,
  Upload,
  Eye,
  EyeOff,
  MoreHorizontal,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Target,
  Zap
} from 'lucide-react';

/**
 * Props for the BulkOperationPanel component
 */
export interface BulkOperationPanelProps {
  /** Array of products to operate on */
  products: ProductWorkflow[];
  /** Current user role */
  userRole: UserRole;
  /** Whether the panel is visible */
  visible?: boolean;
  /** Whether the panel is in read-only mode */
  readOnly?: boolean;
  /** Whether to show product details */
  showProductDetails?: boolean;
  /** Whether to enable filtering */
  enableFiltering?: boolean;
  /** Whether to enable searching */
  enableSearching?: boolean;
  /** Whether to show progress */
  showProgress?: boolean;
  /** Whether to show statistics */
  showStatistics?: boolean;
  /** Custom className */
  className?: string;
  /** Callback when bulk operation is requested */
  onBulkOperation?: (operation: BulkOperationRequest) => void;
  /** Optional API endpoint to call if onBulkOperation is not provided */
  apiEndpoint?: string;
  /** Optional auth/user headers for API calls */
  requestHeaders?: Record<string, string>;
  /** Callback when products are selected/deselected */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Callback when filter changes */
  onFilterChange?: (filters: BulkOperationFilters) => void;
  /** Callback when search changes */
  onSearchChange?: (searchTerm: string) => void;
  /** Callback when panel visibility changes */
  onVisibilityChange?: (visible: boolean) => void;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string;
  /** Operation progress */
  progress?: {
    current: number;
    total: number;
    percentage: number;
    status: 'idle' | 'running' | 'completed' | 'error';
    message?: string;
  };
}

/**
 * Filter options for bulk operations
 */
export interface BulkOperationFilters {
  /** Filter by workflow state */
  workflowState?: string;
  /** Filter by user role */
  userRole?: UserRole;
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Filter by product category */
  category?: string;
  /** Filter by priority */
  priority?: 'low' | 'medium' | 'high' | 'critical';
  /** Filter by assigned user */
  assignedTo?: string;
}

/**
 * Bulk operation configuration
 */
const BULK_OPERATIONS = {
  [WorkflowAction.APPROVE]: {
    label: 'Approve Products',
    description: 'Approve selected products for publication',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    requiresConfirmation: true,
    confirmationMessage: 'Are you sure you want to approve the selected products?',
  },
  [WorkflowAction.REJECT]: {
    label: 'Reject Products',
    description: 'Reject selected products and return to draft',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    requiresConfirmation: true,
    requiresReason: true,
    confirmationMessage: 'Are you sure you want to reject the selected products?',
  },
  [WorkflowAction.PUBLISH]: {
    label: 'Publish Products',
    description: 'Publish selected products to live environment',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    requiresConfirmation: true,
    confirmationMessage: 'Are you sure you want to publish the selected products?',
  },
  [WorkflowAction.ASSIGN_REVIEWER]: {
    label: 'Assign Reviewer',
    description: 'Assign a reviewer to selected products',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    requiresAssignment: true,
  },
  [WorkflowAction.REVERT_TO_DRAFT]: {
    label: 'Revert to Draft',
    description: 'Revert selected products to draft state',
    icon: ArrowLeft,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    requiresConfirmation: true,
    confirmationMessage: 'Are you sure you want to revert the selected products to draft?',
  },
} as const;

/**
 * BulkOperationPanel component for managing multiple products
 */
export const BulkOperationPanel: React.FC<BulkOperationPanelProps> = ({
  products,
  userRole,
  visible = true,
  readOnly = false,
  showProductDetails = true,
  enableFiltering = true,
  enableSearching = true,
  showProgress = true,
  showStatistics = true,
  className,
  onBulkOperation,
  apiEndpoint = '/api/workflow/bulk-operations',
  requestHeaders,
  onSelectionChange,
  onFilterChange,
  onSearchChange,
  onVisibilityChange,
  loading = false,
  error,
  progress,
}) => {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<BulkOperationFilters>({});
  const [selectedOperation, setSelectedOperation] = useState<WorkflowAction | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [reason, setReason] = useState('');
  const [assignedReviewer, setAssignedReviewer] = useState('');
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  /**
   * Filter and search products
   */
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(term) ||
        product.id.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (filters.workflowState) {
      filtered = filtered.filter(product => product.workflowState === filters.workflowState);
    }
    if (filters.category) {
      filtered = filtered.filter(product => product.category === filters.category);
    }
    if (filters.priority) {
      filtered = filtered.filter(product => product.priority === filters.priority);
    }
    if (filters.assignedTo) {
      filtered = filtered.filter(product => product.assignedTo === filters.assignedTo);
    }

    return filtered;
  }, [products, searchTerm, filters]);

  /**
   * Get available operations based on user role and selected products
   */
  const availableOperations = useMemo(() => {
    const operations: WorkflowAction[] = [];
    
    // Check if user has permission for each operation
    if (userRole === UserRole.ADMIN) {
      operations.push(WorkflowAction.APPROVE, WorkflowAction.REJECT, WorkflowAction.PUBLISH, WorkflowAction.ASSIGN_REVIEWER, WorkflowAction.REVERT_TO_DRAFT);
    } else if (userRole === UserRole.REVIEWER) {
      operations.push(WorkflowAction.APPROVE, WorkflowAction.REJECT, WorkflowAction.ASSIGN_REVIEWER);
    } else if (userRole === UserRole.EDITOR) {
      operations.push(WorkflowAction.REVERT_TO_DRAFT);
    }

    return operations;
  }, [userRole]);

  /**
   * Handle product selection
   */
  const handleProductSelection = useCallback((productId: string, selected: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      onSelectionChange?.(Array.from(newSet));
      return newSet;
    });
  }, [onSelectionChange]);

  /**
   * Handle select all
   */
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      const allIds = new Set(filteredProducts.map(p => p.id));
      setSelectedProducts(allIds);
      onSelectionChange?.(Array.from(allIds));
    } else {
      setSelectedProducts(new Set());
      onSelectionChange?.([]);
    }
  }, [filteredProducts, onSelectionChange]);

  /**
   * Handle search change
   */
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    onSearchChange?.(value);
  }, [onSearchChange]);

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback((newFilters: Partial<BulkOperationFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  }, [filters, onFilterChange]);

  /**
   * Handle operation selection
   */
  const handleOperationSelect = useCallback((operation: WorkflowAction) => {
    setSelectedOperation(operation);
    
    const config = BULK_OPERATIONS[operation];
    if (config.requiresConfirmation) {
      setShowConfirmation(true);
    } else if (config.requiresAssignment) {
      // Handle assignment logic
    } else {
      executeOperation(operation);
    }
  }, []);

  /**
   * Execute bulk operation
   */
  const executeOperation = useCallback(async (operation: WorkflowAction) => {
    if (selectedProducts.size === 0) return;

    const operationRequest: BulkOperationRequest = {
      action: operation,
      productIds: Array.from(selectedProducts),
      reason: reason || undefined,
      assignedTo: assignedReviewer || undefined,
      options: {
        batchSize: 10,
        continueOnError: true,
        sendNotifications: true,
      },
    };

    if (onBulkOperation) {
      onBulkOperation(operationRequest);
    } else {
      try {
        await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(requestHeaders || {}),
          },
          body: JSON.stringify({
            operation: {
              action: operationRequest.action,
              reason: operationRequest.reason,
              metadata: {},
            },
            filters: {
              productIds: operationRequest.productIds,
            },
            options: {
              batchSize: operationRequest.options?.batchSize ?? 10,
              skipValidation: false,
              dryRun: false,
            },
          }),
        });
      } catch (e) {
        // non-blocking UI error; consumers can pass error prop to show message
      }
    }
    setShowConfirmation(false);
    setReason('');
    setAssignedReviewer('');
  }, [selectedProducts, reason, assignedReviewer, onBulkOperation, apiEndpoint, requestHeaders]);

  /**
   * Toggle product expansion
   */
  const toggleProductExpansion = useCallback((productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  }, []);

  /**
   * Get operation statistics
   */
  const getOperationStatistics = useCallback(() => {
    const total = filteredProducts.length;
    const selected = selectedProducts.size;
    const byState = filteredProducts.reduce((acc, product) => {
      acc[product.workflowState] = (acc[product.workflowState] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, selected, byState };
  }, [filteredProducts, selectedProducts]);

  if (!visible) {
    return null;
  }

  const statistics = getOperationStatistics();
  const allSelected = filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length;
  const someSelected = selectedProducts.size > 0 && selectedProducts.size < filteredProducts.length;

  return (
    <TooltipProvider>
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Bulk Operations
              <Badge variant="secondary">{statistics.selected} selected</Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {onVisibilityChange && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onVisibilityChange(false)}
                    >
                      <EyeOff className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Hide Panel</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Error State */}
          {error && (
            <Alert className="mb-4">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Progress */}
          {showProgress && progress && progress.status !== 'idle' && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {progress.status === 'running' ? 'Processing...' : 
                   progress.status === 'completed' ? 'Completed' : 'Error'}
                </span>
                <span className="text-sm text-gray-500">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <Progress value={progress.percentage} className="mb-2" />
              {progress.message && (
                <p className="text-sm text-gray-600">{progress.message}</p>
              )}
            </div>
          )}

          {/* Statistics */}
          {showStatistics && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Products:</span>
                  <span className="ml-2 font-medium">{statistics.total}</span>
                </div>
                <div>
                  <span className="text-gray-500">Selected:</span>
                  <span className="ml-2 font-medium">{statistics.selected}</span>
                </div>
              </div>
              {Object.keys(statistics.byState).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(statistics.byState).map(([state, count]) => (
                    <Badge key={state} variant="outline" className="text-xs">
                      {state}: {count}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search and Filters */}
          {(enableSearching || enableFiltering) && (
            <div className="mb-4 space-y-3">
              {enableSearching && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}
              
              {enableFiltering && (
                <div className="flex items-center gap-2">
                  <Select
                    value={filters.workflowState || ''}
                    onValueChange={(value) => handleFilterChange({ workflowState: value || undefined })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All States</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="REVIEW">Review</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select
                    value={filters.priority || ''}
                    onValueChange={(value) => handleFilterChange({ priority: value as any || undefined })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Bulk Operations */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">Available Operations</h4>
            <div className="flex flex-wrap gap-2">
              {availableOperations.map((operation) => {
                const config = BULK_OPERATIONS[operation];
                const Icon = config.icon;
                const isDisabled = selectedProducts.size === 0 || readOnly || loading;

                return (
                  <Tooltip key={operation}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isDisabled}
                        onClick={() => handleOperationSelect(operation)}
                        className={cn(
                          'flex items-center gap-2',
                          config.color,
                          config.bgColor
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {config.label}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{config.description}</p>
                      {isDisabled && selectedProducts.size === 0 && (
                        <p className="text-xs text-gray-500 mt-1">Select products first</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Product List */}
          {showProductDetails && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Products</h4>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onCheckedChange={handleSelectAll}
                    disabled={readOnly || loading}
                  />
                  <span className="text-xs text-gray-500">Select All</span>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-1">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProducts.has(product.id);
                  const isExpanded = expandedProducts.has(product.id);

                  return (
                    <div
                      key={product.id}
                      className={cn(
                        'flex items-center gap-3 p-2 border rounded-lg transition-colors',
                        isSelected && 'bg-blue-50 border-blue-200',
                        'hover:bg-gray-50'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleProductSelection(product.id, checked as boolean)}
                        disabled={readOnly || loading}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{product.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {product.workflowState}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {product.id} • {product.category}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleProductExpansion(product.id)}
                        className="h-6 w-6 p-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Confirmation Dialog */}
          {showConfirmation && selectedOperation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">
                  {BULK_OPERATIONS[selectedOperation]?.label}
                </h3>
                <p className="text-gray-600 mb-4">
                  {BULK_OPERATIONS[selectedOperation]?.confirmationMessage}
                </p>
                
                {BULK_OPERATIONS[selectedOperation]?.requiresReason && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Reason (required)</label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Enter reason for this action..."
                    />
                  </div>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowConfirmation(false);
                      setSelectedOperation(null);
                      setReason('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => executeOperation(selectedOperation)}
                    disabled={BULK_OPERATIONS[selectedOperation]?.requiresReason && !reason.trim()}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading...</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500">
                {searchTerm || Object.keys(filters).length > 0 
                  ? 'No products match your current filters.' 
                  : 'No products available for bulk operations.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default BulkOperationPanel;
