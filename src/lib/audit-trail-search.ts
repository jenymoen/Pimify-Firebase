import { auditTrailService, AuditTrailAction, AuditTrailPriority } from './audit-trail-service';
import { fieldChangeTracker, FieldChangeType, FieldChangeSeverity, FieldChangeCategory } from './field-change-tracker';
import { UserRole, WorkflowState } from '../types/workflow';

/**
 * Search operators for advanced filtering
 */
export enum SearchOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  IN = 'in',
  NOT_IN = 'not_in',
  BETWEEN = 'between',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
  REGEX = 'regex',
}

/**
 * Search field types for different data types
 */
export enum SearchFieldType {
  STRING = 'string',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  OBJECT = 'object',
  ENUM = 'enum',
}

/**
 * Search criteria for individual fields
 */
export interface SearchCriteria {
  field: string;
  operator: SearchOperator;
  value: any;
  fieldType?: SearchFieldType;
  caseSensitive?: boolean;
}

/**
 * Advanced search query
 */
export interface AuditTrailSearchQuery {
  /** Basic filters */
  userId?: string;
  userRole?: UserRole;
  userEmail?: string;
  action?: AuditTrailAction | string;
  productId?: string;
  workflowState?: WorkflowState;
  priority?: AuditTrailPriority;
  
  /** Date range filters */
  startDate?: Date;
  endDate?: Date;
  dateField?: 'timestamp' | 'archivedAt' | 'expiresAt';
  
  /** Advanced search criteria */
  criteria?: SearchCriteria[];
  
  /** Field-specific searches */
  fieldChanges?: {
    field?: string;
    oldValue?: any;
    newValue?: any;
    changeType?: FieldChangeType;
    severity?: FieldChangeSeverity;
    category?: FieldChangeCategory;
  };
  
  /** Text search */
  textSearch?: {
    query: string;
    fields?: string[];
    caseSensitive?: boolean;
    wholeWords?: boolean;
  };
  
  /** Metadata search */
  metadataSearch?: {
    key: string;
    value: any;
    operator?: SearchOperator;
  }[];
  
  /** Session and request tracking */
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  
  /** Archive and retention filters */
  includeArchived?: boolean;
  includeExpired?: boolean;
  retentionDays?: {
    min?: number;
    max?: number;
  };
  
  /** Pagination and sorting */
  pagination?: {
    page?: number;
    pageSize?: number;
    offset?: number;
    limit?: number;
  };
  
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
  
  /** Grouping and aggregation */
  groupBy?: string[];
  aggregations?: {
    field: string;
    function: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
    alias?: string;
  }[];
  
  /** Result formatting */
  includeFieldChanges?: boolean;
  includeMetadata?: boolean;
  includeStatistics?: boolean;
  format?: 'json' | 'csv' | 'xml';
}

/**
 * Search result with metadata
 */
export interface AuditTrailSearchResult {
  /** Search results */
  entries: any[];
  
  /** Pagination metadata */
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalEntries: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  
  /** Search metadata */
  searchMetadata: {
    query: AuditTrailSearchQuery;
    executionTime: number;
    resultCount: number;
    filters: string[];
    suggestions?: string[];
  };
  
  /** Aggregations */
  aggregations?: Record<string, any>;
  
  /** Statistics */
  statistics?: {
    byAction: Record<string, number>;
    byUser: Record<string, number>;
    byPriority: Record<string, number>;
    byDate: Record<string, number>;
    byProduct: Record<string, number>;
  };
}

/**
 * Saved search configuration
 */
export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: AuditTrailSearchQuery;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  tags?: string[];
}

/**
 * Search suggestions and autocomplete
 */
export interface SearchSuggestion {
  type: 'field' | 'value' | 'operator';
  value: string;
  label: string;
  description?: string;
  count?: number;
}

/**
 * Audit Trail Search Service
 * Advanced search and filtering capabilities for audit trail data
 */
export class AuditTrailSearchService {
  private savedSearches: Map<string, SavedSearch> = new Map();
  private searchHistory: Array<{ query: AuditTrailSearchQuery; timestamp: Date; userId: string }> = [];
  private maxSearchHistory: number = 1000;

  constructor() {
    this.initializeDefaultSearches();
  }

  /**
   * Perform advanced search on audit trail
   */
  async search(query: AuditTrailSearchQuery): Promise<AuditTrailSearchResult> {
    const startTime = Date.now();
    
    // Get all audit entries
    let entries = auditTrailService.getAuditEntries();
    
    // Apply filters
    entries = this.applyFilters(entries, query);
    
    // Apply advanced criteria
    if (query.criteria && query.criteria.length > 0) {
      entries = this.applyAdvancedCriteria(entries, query.criteria);
    }
    
    // Apply field change filters
    if (query.fieldChanges) {
      entries = this.applyFieldChangeFilters(entries, query.fieldChanges);
    }
    
    // Apply text search
    if (query.textSearch) {
      entries = this.applyTextSearch(entries, query.textSearch);
    }
    
    // Apply metadata search
    if (query.metadataSearch && query.metadataSearch.length > 0) {
      entries = this.applyMetadataSearch(entries, query.metadataSearch);
    }
    
    // Apply sorting
    if (query.sorting && query.sorting.length > 0) {
      entries = this.applySorting(entries, query.sorting);
    }
    
    // Calculate total count before pagination
    const totalEntries = entries.length;
    
    // Apply pagination
    const pagination = this.calculatePagination(query.pagination, totalEntries);
    const paginatedEntries = this.applyPagination(entries, pagination);
    
    // Calculate aggregations
    const aggregations = query.aggregations 
      ? this.calculateAggregations(entries, query.aggregations)
      : undefined;
    
    // Calculate statistics
    const statistics = query.includeStatistics 
      ? this.calculateStatistics(entries)
      : undefined;
    
    // Format results
    const formattedEntries = this.formatResults(paginatedEntries, query);
    
    const executionTime = Date.now() - startTime;
    
    // Store search in history
    this.addToSearchHistory(query);
    
    return {
      entries: formattedEntries,
      pagination,
      searchMetadata: {
        query,
        executionTime,
        resultCount: totalEntries,
        filters: this.getAppliedFilters(query),
        suggestions: this.generateSuggestions(query, entries),
      },
      aggregations,
      statistics,
    };
  }

  /**
   * Get search suggestions for autocomplete
   */
  getSearchSuggestions(partialQuery: string, field?: string): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    
    // Field suggestions
    if (!field) {
      const availableFields = [
        'userId', 'userRole', 'userEmail', 'action', 'productId', 
        'workflowState', 'priority', 'timestamp', 'reason', 'ipAddress',
        'sessionId', 'requestId', 'userAgent'
      ];
      
      availableFields.forEach(fieldName => {
        if (fieldName.toLowerCase().includes(partialQuery.toLowerCase())) {
          suggestions.push({
            type: 'field',
            value: fieldName,
            label: fieldName,
            description: this.getFieldDescription(fieldName),
          });
        }
      });
    }
    
    // Value suggestions based on field
    if (field) {
      const values = this.getFieldValues(field);
      values.forEach(value => {
        if (value.toLowerCase().includes(partialQuery.toLowerCase())) {
          suggestions.push({
            type: 'value',
            value: value,
            label: value,
            count: this.getFieldValueCount(field, value),
          });
        }
      });
    }
    
    // Operator suggestions
    if (field && partialQuery.includes(':')) {
      const operators = this.getOperatorsForField(field);
      operators.forEach(operator => {
        suggestions.push({
          type: 'operator',
          value: operator,
          label: operator,
          description: this.getOperatorDescription(operator),
        });
      });
    }
    
    return suggestions.slice(0, 10); // Limit to 10 suggestions
  }

  /**
   * Save a search query for reuse
   */
  saveSearch(
    name: string,
    query: AuditTrailSearchQuery,
    userId: string,
    options?: {
      description?: string;
      isPublic?: boolean;
      tags?: string[];
    }
  ): SavedSearch {
    const savedSearch: SavedSearch = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: options?.description,
      query,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: options?.isPublic || false,
      tags: options?.tags || [],
    };
    
    this.savedSearches.set(savedSearch.id, savedSearch);
    return savedSearch;
  }

  /**
   * Get saved searches
   */
  getSavedSearches(userId?: string, isPublic?: boolean): SavedSearch[] {
    let searches = Array.from(this.savedSearches.values());
    
    if (userId) {
      searches = searches.filter(search => 
        search.createdBy === userId || search.isPublic
      );
    }
    
    if (isPublic !== undefined) {
      searches = searches.filter(search => search.isPublic === isPublic);
    }
    
    return searches.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Execute a saved search
   */
  async executeSavedSearch(searchId: string): Promise<AuditTrailSearchResult> {
    const savedSearch = this.savedSearches.get(searchId);
    if (!savedSearch) {
      throw new Error(`Saved search not found: ${searchId}`);
    }
    
    return this.search(savedSearch.query);
  }

  /**
   * Get search history
   */
  getSearchHistory(userId?: string, limit?: number): Array<{ query: AuditTrailSearchQuery; timestamp: Date; userId: string }> {
    let history = this.searchHistory;
    
    if (userId) {
      history = history.filter(entry => entry.userId === userId);
    }
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return history;
  }

  /**
   * Export search results
   */
  async exportSearchResults(
    query: AuditTrailSearchQuery,
    format: 'json' | 'csv' | 'xml' = 'json'
  ): Promise<string> {
    const result = await this.search(query);
    
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'csv':
        return this.exportToCSV(result.entries);
      case 'xml':
        return this.exportToXML(result.entries);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics(): {
    totalSearches: number;
    popularQueries: Array<{ query: string; count: number }>;
    searchPerformance: {
      averageExecutionTime: number;
      slowestQueries: Array<{ query: string; executionTime: number }>;
    };
    userActivity: Record<string, number>;
  } {
    const totalSearches = this.searchHistory.length;
    
    // Popular queries
    const queryCounts = new Map<string, number>();
    this.searchHistory.forEach(entry => {
      const queryKey = JSON.stringify(entry.query);
      queryCounts.set(queryKey, (queryCounts.get(queryKey) || 0) + 1);
    });
    
    const popularQueries = Array.from(queryCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Search performance (simplified - would need actual execution times)
    const averageExecutionTime = 100; // Placeholder
    const slowestQueries = popularQueries.slice(0, 5).map(q => ({
      query: q.query,
      executionTime: Math.random() * 1000, // Placeholder
    }));
    
    // User activity
    const userActivity: Record<string, number> = {};
    this.searchHistory.forEach(entry => {
      userActivity[entry.userId] = (userActivity[entry.userId] || 0) + 1;
    });
    
    return {
      totalSearches,
      popularQueries,
      searchPerformance: {
        averageExecutionTime,
        slowestQueries,
      },
      userActivity,
    };
  }

  // Private helper methods

  private applyFilters(entries: any[], query: AuditTrailSearchQuery): any[] {
    return entries.filter(entry => {
      if (query.userId && entry.userId !== query.userId) return false;
      if (query.userRole && entry.userRole !== query.userRole) return false;
      if (query.userEmail && entry.userEmail !== query.userEmail) return false;
      if (query.action && entry.action !== query.action) return false;
      if (query.productId && entry.productId !== query.productId) return false;
      if (query.workflowState && entry.metadata?.workflowState !== query.workflowState) return false;
      if (query.priority && entry.priority !== query.priority) return false;
      if (query.sessionId && entry.sessionId !== query.sessionId) return false;
      if (query.requestId && entry.requestId !== query.requestId) return false;
      if (query.ipAddress && entry.ipAddress !== query.ipAddress) return false;
      if (query.userAgent && entry.userAgent !== query.userAgent) return false;
      if (query.includeArchived === false && entry.archived) return false;
      if (query.includeExpired === false && entry.expiresAt && entry.expiresAt < new Date()) return false;
      
      // Date range filtering
      if (query.startDate || query.endDate) {
        const dateField = query.dateField || 'timestamp';
        const entryDate = entry[dateField];
        if (entryDate) {
          if (query.startDate && entryDate < query.startDate) return false;
          if (query.endDate && entryDate > query.endDate) return false;
        }
      }
      
      // Retention days filtering
      if (query.retentionDays) {
        const retentionDays = entry.retentionDays || 0;
        if (query.retentionDays.min && retentionDays < query.retentionDays.min) return false;
        if (query.retentionDays.max && retentionDays > query.retentionDays.max) return false;
      }
      
      return true;
    });
  }

  private applyAdvancedCriteria(entries: any[], criteria: SearchCriteria[]): any[] {
    return entries.filter(entry => {
      return criteria.every(criterion => {
        const fieldValue = this.getNestedFieldValue(entry, criterion.field);
        return this.evaluateCriteria(fieldValue, criterion);
      });
    });
  }

  private applyFieldChangeFilters(entries: any[], fieldChanges: any): any[] {
    return entries.filter(entry => {
      if (!entry.fieldChanges || entry.fieldChanges.length === 0) return false;
      
      return entry.fieldChanges.some((change: any) => {
        if (fieldChanges.field && change.field !== fieldChanges.field) return false;
        if (fieldChanges.oldValue !== undefined && change.oldValue !== fieldChanges.oldValue) return false;
        if (fieldChanges.newValue !== undefined && change.newValue !== fieldChanges.newValue) return false;
        if (fieldChanges.changeType && change.changeType !== fieldChanges.changeType) return false;
        if (fieldChanges.severity && change.severity !== fieldChanges.severity) return false;
        if (fieldChanges.category && change.category !== fieldChanges.category) return false;
        
        return true;
      });
    });
  }

  private applyTextSearch(entries: any[], textSearch: any): any[] {
    const { query, fields, caseSensitive, wholeWords } = textSearch;
    const searchFields = fields || ['reason', 'userEmail', 'action'];
    const searchQuery = caseSensitive ? query : query.toLowerCase();
    
    return entries.filter(entry => {
      return searchFields.some(field => {
        const fieldValue = this.getNestedFieldValue(entry, field);
        if (fieldValue === null || fieldValue === undefined) return false;
        
        const searchText = caseSensitive ? fieldValue.toString() : fieldValue.toString().toLowerCase();
        
        if (wholeWords) {
          const words = searchText.split(/\s+/);
          return words.some(word => word === searchQuery);
        } else {
          return searchText.includes(searchQuery);
        }
      });
    });
  }

  private applyMetadataSearch(entries: any[], metadataSearch: any[]): any[] {
    return entries.filter(entry => {
      if (!entry.metadata) return false;
      
      return metadataSearch.every(search => {
        const metadataValue = entry.metadata[search.key];
        return this.evaluateCriteria(metadataValue, {
          field: search.key,
          operator: search.operator || SearchOperator.EQUALS,
          value: search.value,
        });
      });
    });
  }

  private applySorting(entries: any[], sorting: any[]): any[] {
    return entries.sort((a, b) => {
      for (const sort of sorting) {
        const aValue = this.getNestedFieldValue(a, sort.field);
        const bValue = this.getNestedFieldValue(b, sort.field);
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;
        
        if (comparison !== 0) {
          return sort.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  private applyPagination(entries: any[], pagination: any): any[] {
    const { offset, limit } = pagination;
    return entries.slice(offset, offset + limit);
  }

  private calculatePagination(pagination: any, totalEntries: number): any {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = pagination?.offset || (page - 1) * pageSize;
    const limit = pagination?.limit || pageSize;
    
    const totalPages = Math.ceil(totalEntries / pageSize);
    
    return {
      page,
      pageSize,
      totalPages,
      totalEntries,
      offset,
      limit,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  private calculateAggregations(entries: any[], aggregations: any[]): Record<string, any> {
    const results: Record<string, any> = {};
    
    aggregations.forEach(agg => {
      const alias = agg.alias || `${agg.function}_${agg.field}`;
      const values = entries.map(entry => this.getNestedFieldValue(entry, agg.field));
      
      switch (agg.function) {
        case 'count':
          results[alias] = values.length;
          break;
        case 'sum':
          results[alias] = values.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
          break;
        case 'avg':
          const sum = values.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
          results[alias] = values.length > 0 ? sum / values.length : 0;
          break;
        case 'min':
          results[alias] = Math.min(...values.map(val => parseFloat(val) || 0));
          break;
        case 'max':
          results[alias] = Math.max(...values.map(val => parseFloat(val) || 0));
          break;
        case 'distinct':
          results[alias] = [...new Set(values)].length;
          break;
      }
    });
    
    return results;
  }

  private calculateStatistics(entries: any[]): any {
    const stats = {
      byAction: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byDate: {} as Record<string, number>,
      byProduct: {} as Record<string, number>,
    };
    
    entries.forEach(entry => {
      stats.byAction[entry.action] = (stats.byAction[entry.action] || 0) + 1;
      stats.byUser[entry.userId] = (stats.byUser[entry.userId] || 0) + 1;
      stats.byPriority[entry.priority] = (stats.byPriority[entry.priority] || 0) + 1;
      
      const dateKey = entry.timestamp.toISOString().split('T')[0];
      stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;
      
      if (entry.productId) {
        stats.byProduct[entry.productId] = (stats.byProduct[entry.productId] || 0) + 1;
      }
    });
    
    return stats;
  }

  private formatResults(entries: any[], query: AuditTrailSearchQuery): any[] {
    return entries.map(entry => {
      const formatted: any = {
        id: entry.id,
        timestamp: entry.timestamp,
        userId: entry.userId,
        userRole: entry.userRole,
        userEmail: entry.userEmail,
        action: entry.action,
        productId: entry.productId,
        reason: entry.reason,
        priority: entry.priority,
      };
      
      if (query.includeFieldChanges) {
        formatted.fieldChanges = entry.fieldChanges;
      }
      
      if (query.includeMetadata) {
        formatted.metadata = entry.metadata;
      }
      
      return formatted;
    });
  }

  private evaluateCriteria(fieldValue: any, criterion: SearchCriteria): boolean {
    const { operator, value, caseSensitive } = criterion;
    
    if (operator === SearchOperator.IS_NULL) return fieldValue === null || fieldValue === undefined;
    if (operator === SearchOperator.IS_NOT_NULL) return fieldValue !== null && fieldValue !== undefined;
    
    if (fieldValue === null || fieldValue === undefined) return false;
    
    const fieldStr = caseSensitive ? fieldValue.toString() : fieldValue.toString().toLowerCase();
    const valueStr = caseSensitive ? value.toString() : value.toString().toLowerCase();
    
    switch (operator) {
      case SearchOperator.EQUALS:
        return fieldValue === value;
      case SearchOperator.NOT_EQUALS:
        return fieldValue !== value;
      case SearchOperator.CONTAINS:
        return fieldStr.includes(valueStr);
      case SearchOperator.NOT_CONTAINS:
        return !fieldStr.includes(valueStr);
      case SearchOperator.STARTS_WITH:
        return fieldStr.startsWith(valueStr);
      case SearchOperator.ENDS_WITH:
        return fieldStr.endsWith(valueStr);
      case SearchOperator.GREATER_THAN:
        return parseFloat(fieldValue) > parseFloat(value);
      case SearchOperator.LESS_THAN:
        return parseFloat(fieldValue) < parseFloat(value);
      case SearchOperator.GREATER_THAN_OR_EQUAL:
        return parseFloat(fieldValue) >= parseFloat(value);
      case SearchOperator.LESS_THAN_OR_EQUAL:
        return parseFloat(fieldValue) <= parseFloat(value);
      case SearchOperator.IN:
        return Array.isArray(value) && value.includes(fieldValue);
      case SearchOperator.NOT_IN:
        return Array.isArray(value) && !value.includes(fieldValue);
      case SearchOperator.BETWEEN:
        return Array.isArray(value) && value.length === 2 && 
               parseFloat(fieldValue) >= parseFloat(value[0]) && 
               parseFloat(fieldValue) <= parseFloat(value[1]);
      case SearchOperator.REGEX:
        try {
          const regex = new RegExp(value, caseSensitive ? '' : 'i');
          return regex.test(fieldValue.toString());
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private getNestedFieldValue(obj: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private getAppliedFilters(query: AuditTrailSearchQuery): string[] {
    const filters: string[] = [];
    
    if (query.userId) filters.push(`User: ${query.userId}`);
    if (query.userRole) filters.push(`Role: ${query.userRole}`);
    if (query.action) filters.push(`Action: ${query.action}`);
    if (query.productId) filters.push(`Product: ${query.productId}`);
    if (query.startDate) filters.push(`From: ${query.startDate.toISOString().split('T')[0]}`);
    if (query.endDate) filters.push(`To: ${query.endDate.toISOString().split('T')[0]}`);
    if (query.priority) filters.push(`Priority: ${query.priority}`);
    
    return filters;
  }

  private generateSuggestions(query: AuditTrailSearchQuery, entries: any[]): string[] {
    const suggestions: string[] = [];
    
    if (entries.length === 0) {
      suggestions.push('No results found. Try broadening your search criteria.');
    } else if (entries.length > 1000) {
      suggestions.push('Large result set. Consider adding more specific filters.');
    }
    
    return suggestions;
  }

  private addToSearchHistory(query: AuditTrailSearchQuery): void {
    this.searchHistory.push({
      query,
      timestamp: new Date(),
      userId: 'system', // Would be actual user ID in real implementation
    });
    
    if (this.searchHistory.length > this.maxSearchHistory) {
      this.searchHistory = this.searchHistory.slice(-this.maxSearchHistory);
    }
  }

  private getFieldDescription(field: string): string {
    const descriptions: Record<string, string> = {
      userId: 'User who performed the action',
      userRole: 'Role of the user',
      userEmail: 'Email of the user',
      action: 'Type of action performed',
      productId: 'ID of the affected product',
      workflowState: 'Current workflow state',
      priority: 'Priority level of the action',
      timestamp: 'When the action occurred',
      reason: 'Reason for the action',
      ipAddress: 'IP address of the user',
      sessionId: 'Session identifier',
      requestId: 'Request identifier',
      userAgent: 'User agent string',
    };
    
    return descriptions[field] || 'Field description not available';
  }

  private getFieldValues(field: string): string[] {
    // This would typically query the actual data
    // For now, return some common values
    const commonValues: Record<string, string[]> = {
      action: Object.values(AuditTrailAction),
      userRole: Object.values(UserRole),
      priority: Object.values(AuditTrailPriority),
      workflowState: Object.values(WorkflowState),
    };
    
    return commonValues[field] || [];
  }

  private getFieldValueCount(field: string, value: string): number {
    // This would typically query the actual data
    // For now, return a random count
    return Math.floor(Math.random() * 100);
  }

  private getOperatorsForField(field: string): string[] {
    const fieldType = this.getFieldType(field);
    
    switch (fieldType) {
      case SearchFieldType.STRING:
        return ['equals', 'contains', 'starts_with', 'ends_with', 'regex'];
      case SearchFieldType.NUMBER:
        return ['equals', 'greater_than', 'less_than', 'between'];
      case SearchFieldType.DATE:
        return ['equals', 'greater_than', 'less_than', 'between'];
      case SearchFieldType.BOOLEAN:
        return ['equals'];
      case SearchFieldType.ENUM:
        return ['equals', 'in', 'not_in'];
      default:
        return ['equals', 'contains'];
    }
  }

  private getFieldType(field: string): SearchFieldType {
    const fieldTypes: Record<string, SearchFieldType> = {
      userId: SearchFieldType.STRING,
      userRole: SearchFieldType.ENUM,
      userEmail: SearchFieldType.STRING,
      action: SearchFieldType.ENUM,
      productId: SearchFieldType.STRING,
      workflowState: SearchFieldType.ENUM,
      priority: SearchFieldType.ENUM,
      timestamp: SearchFieldType.DATE,
      reason: SearchFieldType.STRING,
      ipAddress: SearchFieldType.STRING,
      sessionId: SearchFieldType.STRING,
      requestId: SearchFieldType.STRING,
      userAgent: SearchFieldType.STRING,
    };
    
    return fieldTypes[field] || SearchFieldType.STRING;
  }

  private getOperatorDescription(operator: string): string {
    const descriptions: Record<string, string> = {
      equals: 'Exact match',
      not_equals: 'Not equal to',
      contains: 'Contains text',
      not_contains: 'Does not contain text',
      starts_with: 'Starts with text',
      ends_with: 'Ends with text',
      greater_than: 'Greater than value',
      less_than: 'Less than value',
      between: 'Between two values',
      in: 'In list of values',
      not_in: 'Not in list of values',
      is_null: 'Is null or empty',
      is_not_null: 'Is not null or empty',
      regex: 'Matches regular expression',
    };
    
    return descriptions[operator] || 'Unknown operator';
  }

  private exportToCSV(entries: any[]): string {
    if (entries.length === 0) return '';
    
    const headers = Object.keys(entries[0]);
    const rows = entries.map(entry => 
      headers.map(header => JSON.stringify(entry[header] || ''))
    );
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToXML(entries: any[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<auditTrail>\n';
    
    entries.forEach(entry => {
      xml += '  <entry>\n';
      Object.entries(entry).forEach(([key, value]) => {
        xml += `    <${key}>${JSON.stringify(value)}</${key}>\n`;
      });
      xml += '  </entry>\n';
    });
    
    xml += '</auditTrail>';
    return xml;
  }

  private initializeDefaultSearches(): void {
    // Initialize with some default saved searches
    const defaultSearches: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Recent Critical Actions',
        description: 'All critical priority actions from the last 7 days',
        query: {
          priority: AuditTrailPriority.CRITICAL,
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          includeStatistics: true,
        },
        createdBy: 'system',
        isPublic: true,
        tags: ['critical', 'recent', 'default'],
      },
      {
        name: 'Product Modifications',
        description: 'All product-related actions',
        query: {
          action: AuditTrailAction.PRODUCT_UPDATED,
          includeFieldChanges: true,
          includeStatistics: true,
        },
        createdBy: 'system',
        isPublic: true,
        tags: ['products', 'modifications', 'default'],
      },
      {
        name: 'User Activity',
        description: 'All actions by a specific user',
        query: {
          includeStatistics: true,
        },
        createdBy: 'system',
        isPublic: true,
        tags: ['users', 'activity', 'default'],
      },
    ];
    
    defaultSearches.forEach(search => {
      const savedSearch: SavedSearch = {
        ...search,
        id: `default_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.savedSearches.set(savedSearch.id, savedSearch);
    });
  }
}

// Export singleton instance
export const auditTrailSearchService = new AuditTrailSearchService();
