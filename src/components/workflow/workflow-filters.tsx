'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserRole, WorkflowState, WorkflowAction } from '@/types/workflow';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
// Note: These components would be imported from shadcn/ui in a real implementation
// For now, we'll define them inline to avoid import issues
const Collapsible = ({ children, open, onOpenChange, ...props }: any) => (
  <div {...props} data-open={open} data-on-open-change={onOpenChange}>
    {children}
  </div>
);

const CollapsibleContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;

const CollapsibleTrigger = ({ children, ...props }: any) => <div {...props}>{children}</div>;

const Popover = ({ children, open, onOpenChange, ...props }: any) => (
  <div {...props} data-open={open} data-on-open-change={onOpenChange}>
    {children}
  </div>
);

const PopoverContent = ({ children, ...props }: any) => <div {...props}>{children}</div>;

const PopoverTrigger = ({ children, ...props }: any) => <div {...props}>{children}</div>;

const Calendar = ({ selected, onSelect, ...props }: any) => (
  <div {...props} data-selected={selected} data-on-select={onSelect}>
    Calendar
  </div>
);
import { cn } from '@/lib/utils';
import { 
  Filter, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Calendar as CalendarIcon,
  Clock,
  User,
  Tag,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';

/**
 * Filter criteria for products
 */
export interface ProductFilters {
  // Text search
  searchQuery?: string;
  
  // Workflow state filters
  states?: WorkflowState[];
  
  // User filters
  assignedTo?: string[];
  createdBy?: string[];
  lastModifiedBy?: string[];
  
  // Date filters
  createdDateRange?: {
    from?: Date;
    to?: Date;
  };
  modifiedDateRange?: {
    from?: Date;
    to?: Date;
  };
  dueDateRange?: {
    from?: Date;
    to?: Date;
  };
  
  // Priority filters
  priorities?: string[];
  
  // Tag filters
  tags?: string[];
  
  // Status filters
  hasComments?: boolean;
  hasAttachments?: boolean;
  isOverdue?: boolean;
  isAssigned?: boolean;
  
  // Custom filters
  customFilters?: Record<string, any>;
}

/**
 * Filter option configuration
 */
export interface FilterOption {
  id: string;
  label: string;
  value: any;
  count?: number;
  disabled?: boolean;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
}

/**
 * Filter group configuration
 */
export interface FilterGroup {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'checkbox' | 'date' | 'text' | 'custom';
  options?: FilterOption[];
  placeholder?: string;
  multiple?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
}

/**
 * Props for the WorkflowFilters component
 */
export interface WorkflowFiltersProps {
  /** Current user role */
  userRole: UserRole;
  /** Current filter values */
  filters?: ProductFilters;
  /** Available filter groups */
  filterGroups?: FilterGroup[];
  /** Available workflow states */
  availableStates?: WorkflowState[];
  /** Available users for assignment filters */
  availableUsers?: Array<{ id: string; name: string; email: string; role: UserRole }>;
  /** Available tags */
  availableTags?: string[];
  /** Available priorities */
  availablePriorities?: string[];
  /** Whether the component is in loading state */
  loading?: boolean;
  /** Whether the component is read-only */
  readOnly?: boolean;
  /** Custom className */
  className?: string;
  /** Callback when filters change */
  onFiltersChange?: (filters: ProductFilters) => void;
  /** Callback when filters are reset */
  onFiltersReset?: () => void;
  /** Callback when filters are applied */
  onFiltersApply?: (filters: ProductFilters) => void;
  /** Callback when filters are cleared */
  onFiltersClear?: () => void;
  /** Whether to show filter counts */
  showCounts?: boolean;
  /** Whether to show advanced filters */
  showAdvanced?: boolean;
  /** Whether to show quick filters */
  showQuickFilters?: boolean;
  /** Whether to show filter presets */
  showPresets?: boolean;
  /** Available filter presets */
  presets?: Array<{ id: string; name: string; filters: ProductFilters; description?: string }>;
  /** Current active preset */
  activePreset?: string;
  /** Callback when preset is selected */
  onPresetSelect?: (presetId: string) => void;
  /** Whether to show filter summary */
  showSummary?: boolean;
  /** Maximum number of visible filters */
  maxVisibleFilters?: number;
}

/**
 * Quick filter options
 */
const QUICK_FILTERS: Array<{ id: string; label: string; filters: Partial<ProductFilters>; icon: React.ComponentType<{ className?: string }> }> = [
  {
    id: 'my-assignments',
    label: 'My Assignments',
    filters: { isAssigned: true },
    icon: User,
  },
  {
    id: 'overdue',
    label: 'Overdue',
    filters: { isOverdue: true },
    icon: AlertCircle,
  },
  {
    id: 'pending-review',
    label: 'Pending Review',
    filters: { states: [WorkflowState.REVIEW] },
    icon: Clock,
  },
  {
    id: 'recently-modified',
    label: 'Recently Modified',
    filters: { 
      modifiedDateRange: { 
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      } 
    },
    icon: RefreshCw,
  },
  {
    id: 'needs-attention',
    label: 'Needs Attention',
    filters: { 
      states: [WorkflowState.REVIEW, WorkflowState.DRAFT],
      hasComments: true 
    },
    icon: AlertCircle,
  },
];

/**
 * WorkflowFilters component for filtering products based on workflow criteria
 */
export const WorkflowFilters: React.FC<WorkflowFiltersProps> = ({
  userRole,
  filters = {},
  filterGroups = [],
  availableStates = Object.values(WorkflowState),
  availableUsers = [],
  availableTags = [],
  availablePriorities = ['low', 'medium', 'high', 'urgent'],
  loading = false,
  readOnly = false,
  className,
  onFiltersChange,
  onFiltersReset,
  onFiltersApply,
  onFiltersClear,
  showCounts = true,
  showAdvanced = false,
  showQuickFilters = true,
  showPresets = false,
  presets = [],
  activePreset,
  onPresetSelect,
  showSummary = true,
  maxVisibleFilters = 10,
}) => {
  const [localFilters, setLocalFilters] = useState<ProductFilters>(filters);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showAllFilters, setShowAllFilters] = useState<boolean>(false);
  const [datePickerOpen, setDatePickerOpen] = useState<Record<string, boolean>>({});

  /**
   * Update local filters and notify parent
   */
  const updateFilters = useCallback((updates: Partial<ProductFilters>) => {
    const newFilters = { ...localFilters, ...updates };
    setLocalFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  }, [localFilters, onFiltersChange]);

  /**
   * Reset all filters
   */
  const resetFilters = useCallback(() => {
    const emptyFilters: ProductFilters = {};
    setLocalFilters(emptyFilters);
    if (onFiltersReset) {
      onFiltersReset();
    }
    if (onFiltersChange) {
      onFiltersChange(emptyFilters);
    }
  }, [onFiltersReset, onFiltersChange]);

  /**
   * Apply current filters
   */
  const applyFilters = useCallback(() => {
    if (onFiltersApply) {
      onFiltersApply(localFilters);
    }
  }, [localFilters, onFiltersApply]);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    const emptyFilters: ProductFilters = {};
    setLocalFilters(emptyFilters);
    if (onFiltersClear) {
      onFiltersClear();
    }
    if (onFiltersChange) {
      onFiltersChange(emptyFilters);
    }
  }, [onFiltersClear, onFiltersChange]);

  /**
   * Toggle filter group expansion
   */
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle quick filter selection
   */
  const handleQuickFilter = useCallback((quickFilter: typeof QUICK_FILTERS[0]) => {
    const newFilters = { ...localFilters, ...quickFilter.filters };
    setLocalFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  }, [localFilters, onFiltersChange]);

  /**
   * Handle preset selection
   */
  const handlePresetSelect = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset && onPresetSelect) {
      onPresetSelect(presetId);
      setLocalFilters(preset.filters);
      if (onFiltersChange) {
        onFiltersChange(preset.filters);
      }
    }
  }, [presets, onPresetSelect, onFiltersChange]);

  /**
   * Get active filter count
   */
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (localFilters.searchQuery) count++;
    if (localFilters.states?.length) count++;
    if (localFilters.assignedTo?.length) count++;
    if (localFilters.createdBy?.length) count++;
    if (localFilters.lastModifiedBy?.length) count++;
    if (localFilters.createdDateRange?.from || localFilters.createdDateRange?.to) count++;
    if (localFilters.modifiedDateRange?.from || localFilters.modifiedDateRange?.to) count++;
    if (localFilters.dueDateRange?.from || localFilters.dueDateRange?.to) count++;
    if (localFilters.priorities?.length) count++;
    if (localFilters.tags?.length) count++;
    if (localFilters.hasComments !== undefined) count++;
    if (localFilters.hasAttachments !== undefined) count++;
    if (localFilters.isOverdue !== undefined) count++;
    if (localFilters.isAssigned !== undefined) count++;
    return count;
  }, [localFilters]);

  /**
   * Get visible filter groups
   */
  const visibleFilterGroups = useMemo(() => {
    if (!filterGroups) return [];
    if (showAllFilters) return filterGroups;
    return filterGroups.slice(0, maxVisibleFilters);
  }, [filterGroups, showAllFilters, maxVisibleFilters]);

  /**
   * Render filter group based on type
   */
  const renderFilterGroup = useCallback((group: FilterGroup) => {
    const isExpanded = expandedGroups.has(group.id);
    const Icon = group.icon;

    const renderContent = () => {
      switch (group.type) {
        case 'text':
          return (
            <Input
              placeholder={group.placeholder}
              value={localFilters.searchQuery || ''}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              disabled={readOnly || loading}
            />
          );

        case 'select':
          return (
            <Select
              value={localFilters[group.id as keyof ProductFilters] as string || ''}
              onValueChange={(value) => updateFilters({ [group.id]: value })}
              disabled={readOnly || loading}
            >
              <SelectTrigger>
                <SelectValue placeholder={group.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {group.options?.map(option => (
                  <SelectItem key={option.id} value={option.value} disabled={option.disabled}>
                    <div className="flex items-center gap-2">
                      {option.icon && <option.icon className="w-4 h-4" />}
                      {option.label}
                      {showCounts && option.count !== undefined && (
                        <Badge variant="secondary" className="ml-auto">
                          {option.count}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );

        case 'multiselect':
          const currentValues = localFilters[group.id as keyof ProductFilters] as string[] || [];
          return (
            <div className="space-y-2">
              {group.options?.map(option => (
                <div key={option.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${group.id}-${option.id}`}
                    checked={currentValues.includes(option.value)}
                    onCheckedChange={(checked) => {
                      const newValues = checked
                        ? [...currentValues, option.value]
                        : currentValues.filter(v => v !== option.value);
                      updateFilters({ [group.id]: newValues });
                    }}
                    disabled={readOnly || loading || option.disabled}
                  />
                  <Label htmlFor={`${group.id}-${option.id}`} className="flex items-center gap-2">
                    {option.icon && <option.icon className="w-4 h-4" />}
                    {option.label}
                    {showCounts && option.count !== undefined && (
                      <Badge variant="secondary" className="ml-auto">
                        {option.count}
                      </Badge>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          );

        case 'checkbox':
          const checkboxValue = localFilters[group.id as keyof ProductFilters] as boolean;
          return (
            <div className="flex items-center space-x-2">
              <Checkbox
                id={group.id}
                checked={checkboxValue || false}
                onCheckedChange={(checked) => updateFilters({ [group.id]: checked })}
                disabled={readOnly || loading}
              />
              <Label htmlFor={group.id}>{group.label}</Label>
            </div>
          );

        case 'date':
          const dateRange = localFilters[group.id as keyof ProductFilters] as { from?: Date; to?: Date };
          return (
            <div className="space-y-2">
              <Popover
                open={datePickerOpen[`${group.id}-from`]}
                onOpenChange={(open) => setDatePickerOpen(prev => ({ ...prev, [`${group.id}-from`]: open }))}
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? dateRange.from.toLocaleDateString() : 'From date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange?.from}
                    onSelect={(date) => updateFilters({ 
                      [group.id]: { ...dateRange, from: date } 
                    })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover
                open={datePickerOpen[`${group.id}-to`]}
                onOpenChange={(open) => setDatePickerOpen(prev => ({ ...prev, [`${group.id}-to`]: open }))}
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.to ? dateRange.to.toLocaleDateString() : 'To date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange?.to}
                    onSelect={(date) => updateFilters({ 
                      [group.id]: { ...dateRange, to: date } 
                    })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          );

        default:
          return null;
      }
    };

    return (
      <div key={group.id} className="space-y-2">
        {group.collapsible ? (
          <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.id)}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="w-4 h-4" />}
                  <span className="font-medium">{group.label}</span>
                  {group.description && (
                    <span className="text-sm text-gray-500">({group.description})</span>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
              {renderContent()}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-4 h-4" />}
              <Label className="font-medium">{group.label}</Label>
              {group.description && (
                <span className="text-sm text-gray-500">({group.description})</span>
              )}
            </div>
            {renderContent()}
          </div>
        )}
      </div>
    );
  }, [localFilters, expandedGroups, updateFilters, readOnly, loading, showCounts, toggleGroup, datePickerOpen]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Filters</h3>
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary">
              {getActiveFilterCount()} active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {getActiveFilterCount() > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              disabled={readOnly || loading}
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            disabled={readOnly || loading}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      {showQuickFilters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Filters</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map(quickFilter => {
                const Icon = quickFilter.icon;
                return (
                  <Button
                    key={quickFilter.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickFilter(quickFilter)}
                    disabled={readOnly || loading}
                    className="h-8"
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {quickFilter.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Presets */}
      {showPresets && presets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Filter Presets</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {presets.map(preset => (
                <Button
                  key={preset.id}
                  variant={activePreset === preset.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handlePresetSelect(preset.id)}
                  disabled={readOnly || loading}
                  className="w-full justify-start"
                >
                  {preset.name}
                  {preset.description && (
                    <span className="ml-2 text-xs text-gray-500">
                      {preset.description}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Groups */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filter Options</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {visibleFilterGroups.map(renderFilterGroup)}
          
          {filterGroups.length > maxVisibleFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllFilters(!showAllFilters)}
              className="w-full"
            >
              {showAllFilters ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Show Less
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Show All ({filterGroups.length - maxVisibleFilters} more)
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Filter Summary */}
      {showSummary && getActiveFilterCount() > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Filters</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {localFilters.searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {localFilters.searchQuery}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilters({ searchQuery: undefined })}
                  />
                </Badge>
              )}
              {localFilters.states?.map(state => (
                <Badge key={state} variant="secondary" className="flex items-center gap-1">
                  State: {state}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilters({ 
                      states: localFilters.states?.filter(s => s !== state) 
                    })}
                  />
                </Badge>
              ))}
              {localFilters.assignedTo?.map(userId => {
                const user = availableUsers.find(u => u.id === userId);
                return (
                  <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                    Assigned: {user?.name || userId}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => updateFilters({ 
                        assignedTo: localFilters.assignedTo?.filter(id => id !== userId) 
                      })}
                    />
                  </Badge>
                );
              })}
              {localFilters.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  Tag: {tag}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => updateFilters({ 
                      tags: localFilters.tags?.filter(t => t !== tag) 
                    })}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={applyFilters}
              disabled={loading}
            >
              Apply Filters
            </Button>
            {onFiltersApply && (
              <Button
                onClick={applyFilters}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Applying...
                  </>
                ) : (
                  'Apply'
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact workflow filters for smaller spaces
 */
export interface CompactWorkflowFiltersProps {
  userRole: UserRole;
  filters: ProductFilters;
  availableStates: WorkflowState[];
  onFiltersChange?: (filters: ProductFilters) => void;
  className?: string;
}

export const CompactWorkflowFilters: React.FC<CompactWorkflowFiltersProps> = ({
  userRole,
  filters,
  availableStates,
  onFiltersChange,
  className,
}) => {
  const [localFilters, setLocalFilters] = useState<ProductFilters>(filters);

  const updateFilters = useCallback((updates: Partial<ProductFilters>) => {
    const newFilters = { ...localFilters, ...updates };
    setLocalFilters(newFilters);
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  }, [localFilters, onFiltersChange]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search products..."
          value={localFilters.searchQuery || ''}
          onChange={(e) => updateFilters({ searchQuery: e.target.value })}
          className="pl-10"
        />
      </div>
      
      <Select
        value={localFilters.states?.[0] || ''}
        onValueChange={(value) => updateFilters({ 
          states: value ? [value as WorkflowState] : undefined 
        })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All States" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All States</SelectItem>
          {availableStates.map(state => (
            <SelectItem key={state} value={state}>
              {state}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default WorkflowFilters;
