'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { AuditTrailEntry, WorkflowState, UserRole } from '@/types/workflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Activity, 
  Eye, 
  EyeOff,
  Download,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  FileText,
  ArrowRight,
  ArrowLeft,
  MoreHorizontal
} from 'lucide-react';

/**
 * Props for the AuditTrailViewer component
 */
export interface AuditTrailViewerProps {
  /** Array of audit trail entries */
  entries?: AuditTrailEntry[];
  /** Current user role */
  userRole?: UserRole;
  /** Product ID to fetch audit trail for */
  productId?: string;
  /** Whether the viewer is in read-only mode */
  readOnly?: boolean;
  /** Whether to show detailed field changes */
  showFieldChanges?: boolean;
  /** Whether to show user avatars */
  showAvatars?: boolean;
  /** Whether to show timestamps */
  showTimestamps?: boolean;
  /** Whether to show action icons */
  showActionIcons?: boolean;
  /** Whether to enable filtering */
  enableFiltering?: boolean;
  /** Whether to enable searching */
  enableSearching?: boolean;
  /** Whether to enable export */
  enableExport?: boolean;
  /** Whether to show pagination */
  showPagination?: boolean;
  /** Number of entries per page */
  pageSize?: number;
  /** Custom className */
  className?: string;
  /** Callback when entry is clicked */
  onEntryClick?: (entry: AuditTrailEntry) => void;
  /** Callback when filter changes */
  onFilterChange?: (filters: AuditTrailFilters) => void;
  /** Callback when search changes */
  onSearchChange?: (searchTerm: string) => void;
  /** Callback when export is requested */
  onExport?: (format: 'json' | 'csv' | 'xml') => void;
  /** Callback when refresh is requested */
  onRefresh?: () => void;
  /** Loading state */
  loading?: boolean;
  /** Error state */
  error?: string;
}

/**
 * Filter options for audit trail
 */
export interface AuditTrailFilters {
  /** Filter by user ID */
  userId?: string;
  /** Filter by action type */
  action?: string;
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Filter by workflow state */
  workflowState?: WorkflowState;
  /** Filter by product ID */
  productId?: string;
  /** Filter by priority level */
  priority?: 'low' | 'medium' | 'high' | 'critical';
  /** Filter by change type */
  changeType?: 'create' | 'update' | 'delete' | 'state_change' | 'assignment';
}

/**
 * Configuration for action icons and colors
 */
const ACTION_CONFIG = {
  CREATE: { icon: FileText, color: 'text-green-600', bgColor: 'bg-green-100' },
  UPDATE: { icon: Activity, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  DELETE: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  STATE_CHANGE: { icon: ArrowRight, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  ASSIGNMENT: { icon: User, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  APPROVE: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  REJECT: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  PUBLISH: { icon: ArrowRight, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  COMMENT: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100' },
} as const;

/**
 * Priority configuration
 */
const PRIORITY_CONFIG = {
  low: { color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Low' },
  medium: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Medium' },
  high: { color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'High' },
  critical: { color: 'text-red-600', bgColor: 'bg-red-100', label: 'Critical' },
} as const;

/**
 * AuditTrailViewer component for displaying audit trail entries with filtering and search
 */
export const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({
  entries = [],
  userRole = UserRole.VIEWER,
  productId,
  readOnly = false,
  showFieldChanges = true,
  showAvatars = true,
  showTimestamps = true,
  showActionIcons = true,
  enableFiltering = true,
  enableSearching = true,
  enableExport = true,
  showPagination = true,
  pageSize = 20,
  className,
  onEntryClick,
  onFilterChange,
  onSearchChange,
  onExport,
  onRefresh,
  loading = false,
  error,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<AuditTrailFilters>({});
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'timeline' | 'list' | 'compact'>('timeline');

  /**
   * Filter and search entries
   */
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.action.toLowerCase().includes(term) ||
        entry.user.name.toLowerCase().includes(term) ||
        entry.reason?.toLowerCase().includes(term) ||
        entry.productId.toLowerCase().includes(term)
      );
    }

    // Apply filters
    if (filters.userId) {
      filtered = filtered.filter(entry => entry.user.id === filters.userId);
    }
    if (filters.action) {
      filtered = filtered.filter(entry => entry.action === filters.action);
    }
    if (filters.workflowState) {
      filtered = filtered.filter(entry => entry.productState === filters.workflowState);
    }
    if (filters.productId) {
      filtered = filtered.filter(entry => entry.productId === filters.productId);
    }
    if (filters.priority) {
      filtered = filtered.filter(entry => entry.priority === filters.priority);
    }
    if (filters.dateRange) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= filters.dateRange!.start && entryDate <= filters.dateRange!.end;
      });
    }

    return filtered;
  }, [entries, searchTerm, filters]);

  /**
   * Paginate entries
   */
  const paginatedEntries = useMemo(() => {
    if (!filteredEntries) return [];
    if (!showPagination) return filteredEntries;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredEntries.slice(startIndex, endIndex);
  }, [filteredEntries, currentPage, pageSize, showPagination]);

  /**
   * Get total pages
   */
  const totalPages = useMemo(() => {
    return Math.ceil(filteredEntries.length / pageSize);
  }, [filteredEntries.length, pageSize]);

  /**
   * Handle search change
   */
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    onSearchChange?.(value);
  }, [onSearchChange]);

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback((newFilters: Partial<AuditTrailFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setCurrentPage(1);
    onFilterChange?.(updatedFilters);
  }, [filters, onFilterChange]);

  /**
   * Toggle entry expansion
   */
  const toggleEntryExpansion = useCallback((entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle entry click
   */
  const handleEntryClick = useCallback((entry: AuditTrailEntry) => {
    onEntryClick?.(entry);
  }, [onEntryClick]);

  /**
   * Format timestamp
   */
  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      relative: getRelativeTime(date),
    };
  }, []);

  /**
   * Get relative time
   */
  const getRelativeTime = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }, []);

  /**
   * Get action configuration
   */
  const getActionConfig = useCallback((action: string) => {
    const upperAction = action.toUpperCase();
    return ACTION_CONFIG[upperAction as keyof typeof ACTION_CONFIG] || 
           { icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }, []);

  /**
   * Get priority configuration
   */
  const getPriorityConfig = useCallback((priority: string) => {
    return PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || 
           PRIORITY_CONFIG.medium;
  }, []);

  /**
   * Render timeline view
   */
  const renderTimelineView = () => (
    <div className="space-y-4">
      {paginatedEntries.map((entry, index) => {
        const isExpanded = expandedEntries.has(entry.id);
        const actionConfig = getActionConfig(entry.action);
        const priorityConfig = getPriorityConfig(entry.priority);
        const timestamp = formatTimestamp(entry.timestamp);
        const ActionIcon = actionConfig.icon;

        return (
          <div key={entry.id} className="relative">
            {/* Timeline line */}
            {index < paginatedEntries.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
            )}
            
            <Card 
              className={cn(
                'transition-all duration-200 hover:shadow-md cursor-pointer',
                isExpanded && 'ring-2 ring-blue-500'
              )}
              onClick={() => handleEntryClick(entry)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Action icon */}
                  {showActionIcons && (
                    <div className={cn(
                      'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
                      actionConfig.bgColor
                    )}>
                      <ActionIcon className={cn('w-6 h-6', actionConfig.color)} />
                    </div>
                  )}

                  {/* Entry content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{entry.action}</h4>
                        <Badge 
                          variant="outline" 
                          className={cn('text-xs', priorityConfig.color, priorityConfig.bgColor)}
                        >
                          {priorityConfig.label}
                        </Badge>
                      </div>
                      
                      {showTimestamps && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          <span>{timestamp.relative}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      {showAvatars && (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <span>{entry.user.name}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <span>Product:</span>
                        <span className="font-medium">{entry.productId}</span>
                      </div>
                    </div>

                    {entry.reason && (
                      <p className="text-sm text-gray-700 mb-2">{entry.reason}</p>
                    )}

                    {/* Expandable details */}
                    {showFieldChanges && entry.fieldChanges && entry.fieldChanges.length > 0 && (
                      <Accordion type="single" collapsible className="mt-3">
                        <AccordionItem value={entry.id} className="border-none">
                          <AccordionTrigger className="py-2 px-0 hover:no-underline">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                Show Details ({entry.fieldChanges.length} changes)
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2">
                            <div className="space-y-2">
                              {entry.fieldChanges.map((change, changeIndex) => (
                                <div key={changeIndex} className="p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">{change.field}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {change.type}
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-500">Before:</span>
                                      <p className="font-mono text-xs bg-red-50 p-2 rounded">
                                        {change.beforeValue || 'null'}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">After:</span>
                                      <p className="font-mono text-xs bg-green-50 p-2 rounded">
                                        {change.afterValue || 'null'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );

  /**
   * Render list view
   */
  const renderListView = () => (
    <div className="space-y-2">
      {paginatedEntries.map((entry) => {
        const actionConfig = getActionConfig(entry.action);
        const priorityConfig = getPriorityConfig(entry.priority);
        const timestamp = formatTimestamp(entry.timestamp);
        const ActionIcon = actionConfig.icon;

        return (
          <div
            key={entry.id}
            className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
            onClick={() => handleEntryClick(entry)}
          >
            {showActionIcons && (
              <ActionIcon className={cn('w-5 h-5', actionConfig.color)} />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{entry.action}</span>
                <Badge 
                  variant="outline" 
                  className={cn('text-xs', priorityConfig.color, priorityConfig.bgColor)}
                >
                  {priorityConfig.label}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                {entry.user.name} • {entry.productId}
              </div>
            </div>
            
            {showTimestamps && (
              <div className="text-sm text-gray-500">
                {timestamp.relative}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  /**
   * Render compact view
   */
  const renderCompactView = () => (
    <div className="space-y-1">
      {paginatedEntries.map((entry) => {
        const actionConfig = getActionConfig(entry.action);
        const timestamp = formatTimestamp(entry.timestamp);
        const ActionIcon = actionConfig.icon;

        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 p-2 text-sm hover:bg-gray-50 cursor-pointer rounded"
            onClick={() => handleEntryClick(entry)}
          >
            {showActionIcons && (
              <ActionIcon className={cn('w-4 h-4', actionConfig.color)} />
            )}
            <span className="font-medium">{entry.action}</span>
            <span className="text-gray-500">{entry.user.name}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">{timestamp.relative}</span>
          </div>
        );
      })}
    </div>
  );

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <span>Error loading audit trail: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Audit Trail
              <Badge variant="secondary">{filteredEntries.length} entries</Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRefresh}
                      disabled={loading}
                    >
                      <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh</TooltipContent>
                </Tooltip>
              )}
              
              {enableExport && onExport && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onExport('json')}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters and Search */}
          {(enableFiltering || enableSearching) && (
            <div className="mb-6 space-y-4">
              <div className="flex items-center gap-4">
                {enableSearching && (
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search audit trail..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}
                
                {enableFiltering && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={filters.action || ''}
                      onValueChange={(value) => handleFilterChange({ action: value === 'all' ? undefined : value })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="CREATE">Create</SelectItem>
                        <SelectItem value="UPDATE">Update</SelectItem>
                        <SelectItem value="DELETE">Delete</SelectItem>
                        <SelectItem value="STATE_CHANGE">State Change</SelectItem>
                        <SelectItem value="APPROVE">Approve</SelectItem>
                        <SelectItem value="REJECT">Reject</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={filters.priority || ''}
                      onValueChange={(value) => handleFilterChange({ priority: value === 'all' ? undefined : value as any })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="compact">Compact</TabsTrigger>
            </TabsList>
            
            <TabsContent value="timeline">
              {renderTimelineView()}
            </TabsContent>
            
            <TabsContent value="list">
              {renderListView()}
            </TabsContent>
            
            <TabsContent value="compact">
              {renderCompactView()}
            </TabsContent>
          </Tabs>

          {/* Pagination */}
          {showPagination && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredEntries.length)} of {filteredEntries.length} entries
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading audit trail...</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredEntries.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No audit trail entries</h3>
              <p className="text-gray-500">
                {searchTerm || Object.keys(filters).length > 0 
                  ? 'No entries match your current filters.' 
                  : 'No audit trail entries have been recorded yet.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default AuditTrailViewer;
