import { AuditTrailEntry, FieldChange, WorkflowState, UserRole } from '../types/workflow';

/**
 * Audit trail entry types for different operations
 */
export enum AuditTrailAction {
  PRODUCT_CREATED = 'product_created',
  PRODUCT_UPDATED = 'product_updated',
  PRODUCT_DELETED = 'product_deleted',
  STATE_TRANSITION = 'state_transition',
  REVIEWER_ASSIGNED = 'reviewer_assigned',
  REVIEWER_UNASSIGNED = 'reviewer_unassigned',
  BULK_OPERATION = 'bulk_operation',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_REVOKED = 'permission_revoked',
  USER_ROLE_CHANGED = 'user_role_changed',
  SYSTEM_CONFIG_CHANGED = 'system_config_changed',
  EXPORT_PERFORMED = 'export_performed',
  IMPORT_PERFORMED = 'import_performed',
}

/**
 * Audit trail entry priority levels
 */
export enum AuditTrailPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Enhanced audit trail entry with additional metadata
 */
export interface EnhancedAuditTrailEntry extends AuditTrailEntry {
  /** Unique identifier for the audit entry */
  id: string;
  
  /** Priority level of the audit entry */
  priority: AuditTrailPriority;
  
  /** IP address of the user who performed the action */
  ipAddress?: string;
  
  /** User agent string */
  userAgent?: string;
  
  /** Session ID for tracking user sessions */
  sessionId?: string;
  
  /** Request ID for tracing requests */
  requestId?: string;
  
  /** Additional metadata about the action */
  metadata?: Record<string, any>;
  
  /** Whether this entry is immutable (cannot be modified) */
  immutable: boolean;
  
  /** Hash of the entry for integrity verification */
  integrityHash?: string;
  
  /** Whether this entry has been archived */
  archived: boolean;
  
  /** Archive date if archived */
  archivedAt?: Date;
  
  /** Retention period in days */
  retentionDays: number;
  
  /** Expiration date for this entry */
  expiresAt?: Date;
}

/**
 * Audit trail query filters
 */
export interface AuditTrailFilters {
  /** Filter by user ID */
  userId?: string;
  
  /** Filter by user role */
  userRole?: UserRole;
  
  /** Filter by action type */
  action?: AuditTrailAction | string;
  
  /** Filter by product ID */
  productId?: string;
  
  /** Filter by workflow state */
  workflowState?: WorkflowState;
  
  /** Filter by date range */
  startDate?: Date;
  endDate?: Date;
  
  /** Filter by priority level */
  priority?: AuditTrailPriority;
  
  /** Filter by IP address */
  ipAddress?: string;
  
  /** Filter by session ID */
  sessionId?: string;
  
  /** Filter by request ID */
  requestId?: string;
  
  /** Filter by field changes */
  fieldChanges?: string[];
  
  /** Filter by reason */
  reason?: string;
  
  /** Include archived entries */
  includeArchived?: boolean;
  
  /** Include expired entries */
  includeExpired?: boolean;
}

/**
 * Audit trail query options
 */
export interface AuditTrailQueryOptions {
  /** Maximum number of entries to return */
  limit?: number;
  
  /** Number of entries to skip (for pagination) */
  offset?: number;
  
  /** Sort field */
  sortBy?: 'timestamp' | 'userId' | 'action' | 'priority';
  
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  
  /** Include field changes in response */
  includeFieldChanges?: boolean;
  
  /** Include metadata in response */
  includeMetadata?: boolean;
}

/**
 * Audit trail statistics
 */
export interface AuditTrailStatistics {
  /** Total number of audit entries */
  totalEntries: number;
  
  /** Number of entries by action type */
  byAction: Record<string, number>;
  
  /** Number of entries by user */
  byUser: Record<string, number>;
  
  /** Number of entries by priority */
  byPriority: Record<AuditTrailPriority, number>;
  
  /** Number of entries by date (last 30 days) */
  byDate: Record<string, number>;
  
  /** Most active users */
  topUsers: Array<{ userId: string; count: number }>;
  
  /** Most common actions */
  topActions: Array<{ action: string; count: number }>;
  
  /** Recent activity count (last 24 hours) */
  recentActivity: number;
  
  /** Archive statistics */
  archiveStats: {
    totalArchived: number;
    totalExpired: number;
    totalActive: number;
  };
}

/**
 * Audit trail export options
 */
export interface AuditTrailExportOptions {
  /** Export format */
  format: 'json' | 'csv' | 'xml' | 'pdf';
  
  /** Date range for export */
  startDate?: Date;
  endDate?: Date;
  
  /** Filters to apply */
  filters?: AuditTrailFilters;
  
  /** Include field changes in export */
  includeFieldChanges?: boolean;
  
  /** Include metadata in export */
  includeMetadata?: boolean;
  
  /** Group by field */
  groupBy?: 'user' | 'action' | 'date' | 'product';
  
  /** Compress export file */
  compress?: boolean;
}

/**
 * Audit Trail Service
 * Comprehensive service for managing audit trail entries
 */
export class AuditTrailService {
  private auditEntries: EnhancedAuditTrailEntry[] = [];
  private maxEntries: number = 1000000; // Maximum number of entries to keep in memory
  private defaultRetentionDays: number = 730; // 2 years default retention
  private enableIntegrityChecking: boolean = true;
  private enableArchiving: boolean = true;
  private archiveThreshold: number = 100000; // Archive when entries exceed this number

  constructor(options?: {
    maxEntries?: number;
    defaultRetentionDays?: number;
    enableIntegrityChecking?: boolean;
    enableArchiving?: boolean;
    archiveThreshold?: number;
  }) {
    if (options) {
      this.maxEntries = options.maxEntries || this.maxEntries;
      this.defaultRetentionDays = options.defaultRetentionDays || this.defaultRetentionDays;
      this.enableIntegrityChecking = options.enableIntegrityChecking !== undefined ? options.enableIntegrityChecking : this.enableIntegrityChecking;
      this.enableArchiving = options.enableArchiving !== undefined ? options.enableArchiving : this.enableArchiving;
      this.archiveThreshold = options.archiveThreshold || this.archiveThreshold;
    }

    // Start cleanup process
    this.startCleanupProcess();
  }

  /**
   * Create a new audit trail entry
   */
  createAuditEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    action: AuditTrailAction | string,
    productId?: string,
    fieldChanges?: FieldChange[],
    reason?: string,
    metadata?: Record<string, any>
  ): EnhancedAuditTrailEntry {
    const entry: EnhancedAuditTrailEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      userId,
      userRole,
      userEmail,
      action: action.toString(),
      productId,
      fieldChanges: fieldChanges || [],
      reason,
      priority: this.calculatePriority(action, fieldChanges, metadata),
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      sessionId: metadata?.sessionId,
      requestId: metadata?.requestId,
      metadata,
      immutable: true,
      integrityHash: this.enableIntegrityChecking ? this.calculateIntegrityHash(userId, action, productId, fieldChanges) : undefined,
      archived: false,
      retentionDays: this.defaultRetentionDays,
      expiresAt: new Date(Date.now() + this.defaultRetentionDays * 24 * 60 * 60 * 1000),
    };

    this.addAuditEntry(entry);
    return entry;
  }

  /**
   * Create audit entry for product creation
   */
  createProductCreatedEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    productId: string,
    productData: Record<string, any>,
    metadata?: Record<string, any>
  ): EnhancedAuditTrailEntry {
    const fieldChanges: FieldChange[] = Object.entries(productData).map(([field, value]) => ({
      field,
      oldValue: null,
      newValue: value,
    }));

    return this.createAuditEntry(
      userId,
      userRole,
      userEmail,
      AuditTrailAction.PRODUCT_CREATED,
      productId,
      fieldChanges,
      'Product created',
      metadata
    );
  }

  /**
   * Create audit entry for product update
   */
  createProductUpdatedEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    productId: string,
    fieldChanges: FieldChange[],
    reason?: string,
    metadata?: Record<string, any>
  ): EnhancedAuditTrailEntry {
    return this.createAuditEntry(
      userId,
      userRole,
      userEmail,
      AuditTrailAction.PRODUCT_UPDATED,
      productId,
      fieldChanges,
      reason || 'Product updated',
      metadata
    );
  }

  /**
   * Create audit entry for state transition
   */
  createStateTransitionEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    productId: string,
    fromState: WorkflowState,
    toState: WorkflowState,
    reason?: string,
    metadata?: Record<string, any>
  ): EnhancedAuditTrailEntry {
    const fieldChanges: FieldChange[] = [
      {
        field: 'workflowState',
        oldValue: fromState,
        newValue: toState,
      },
    ];

    return this.createAuditEntry(
      userId,
      userRole,
      userEmail,
      AuditTrailAction.STATE_TRANSITION,
      productId,
      fieldChanges,
      reason || `State transition from ${fromState} to ${toState}`,
      metadata
    );
  }

  /**
   * Create audit entry for reviewer assignment
   */
  createReviewerAssignmentEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    productId: string,
    reviewerId: string,
    assigned: boolean,
    reason?: string,
    metadata?: Record<string, any>
  ): EnhancedAuditTrailEntry {
    const fieldChanges: FieldChange[] = [
      {
        field: 'assignedReviewerId',
        oldValue: assigned ? null : reviewerId,
        newValue: assigned ? reviewerId : null,
      },
    ];

    return this.createAuditEntry(
      userId,
      userRole,
      userEmail,
      assigned ? AuditTrailAction.REVIEWER_ASSIGNED : AuditTrailAction.REVIEWER_UNASSIGNED,
      productId,
      fieldChanges,
      reason || (assigned ? `Reviewer assigned: ${reviewerId}` : `Reviewer unassigned: ${reviewerId}`),
      metadata
    );
  }

  /**
   * Create audit entry for bulk operation
   */
  createBulkOperationEntry(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    action: string,
    productIds: string[],
    results: Array<{ productId: string; success: boolean; error?: string }>,
    reason?: string,
    metadata?: Record<string, any>
  ): EnhancedAuditTrailEntry {
    const fieldChanges: FieldChange[] = [
      {
        field: 'bulkOperation',
        oldValue: null,
        newValue: {
          action,
          productCount: productIds.length,
          successCount: results.filter(r => r.success).length,
          failureCount: results.filter(r => !r.success).length,
        },
      },
    ];

    return this.createAuditEntry(
      userId,
      userRole,
      userEmail,
      AuditTrailAction.BULK_OPERATION,
      undefined, // No single product ID for bulk operations
      fieldChanges,
      reason || `Bulk operation: ${action} on ${productIds.length} products`,
      {
        ...metadata,
        productIds,
        results,
      }
    );
  }

  /**
   * Get audit trail entries with optional filtering and pagination
   */
  getAuditEntries(
    filters?: AuditTrailFilters,
    options?: AuditTrailQueryOptions
  ): EnhancedAuditTrailEntry[] {
    let entries = [...this.auditEntries];

    // Apply filters
    if (filters) {
      entries = this.applyFilters(entries, filters);
    }

    // Sort entries
    if (options?.sortBy) {
      entries = this.sortEntries(entries, options.sortBy, options.sortOrder || 'desc');
    }

    // Apply pagination
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || 100;
      entries = entries.slice(offset, offset + limit);
    }

    // Remove sensitive data if not requested
    if (!options?.includeFieldChanges) {
      entries = entries.map(entry => ({ ...entry, fieldChanges: [] }));
    }

    if (!options?.includeMetadata) {
      entries = entries.map(entry => ({ ...entry, metadata: undefined }));
    }

    return entries;
  }

  /**
   * Get audit trail entries for a specific product
   */
  getProductAuditTrail(
    productId: string,
    options?: AuditTrailQueryOptions
  ): EnhancedAuditTrailEntry[] {
    return this.getAuditEntries(
      { productId },
      options
    );
  }

  /**
   * Get audit trail entries for a specific user
   */
  getUserAuditTrail(
    userId: string,
    options?: AuditTrailQueryOptions
  ): EnhancedAuditTrailEntry[] {
    return this.getAuditEntries(
      { userId },
      options
    );
  }

  /**
   * Get audit trail statistics
   */
  getStatistics(): AuditTrailStatistics {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const byAction: Record<string, number> = {};
    const byUser: Record<string, number> = {};
    const byPriority: Record<AuditTrailPriority, number> = {
      [AuditTrailPriority.LOW]: 0,
      [AuditTrailPriority.MEDIUM]: 0,
      [AuditTrailPriority.HIGH]: 0,
      [AuditTrailPriority.CRITICAL]: 0,
    };
    const byDate: Record<string, number> = {};

    let recentActivity = 0;
    let totalArchived = 0;
    let totalExpired = 0;
    let totalActive = 0;

    for (const entry of this.auditEntries) {
      // Count by action
      byAction[entry.action] = (byAction[entry.action] || 0) + 1;

      // Count by user
      byUser[entry.userId] = (byUser[entry.userId] || 0) + 1;

      // Count by priority
      byPriority[entry.priority]++;

      // Count by date (last 30 days)
      if (entry.timestamp >= thirtyDaysAgo) {
        const dateKey = entry.timestamp.toISOString().split('T')[0];
        byDate[dateKey] = (byDate[dateKey] || 0) + 1;
      }

      // Count recent activity
      if (entry.timestamp >= twentyFourHoursAgo) {
        recentActivity++;
      }

      // Count archive status
      if (entry.archived) {
        totalArchived++;
      } else if (entry.expiresAt && entry.expiresAt < now) {
        totalExpired++;
      } else {
        totalActive++;
      }
    }

    // Get top users and actions
    const topUsers = Object.entries(byUser)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topActions = Object.entries(byAction)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEntries: this.auditEntries.length,
      byAction,
      byUser,
      byPriority,
      byDate,
      topUsers,
      topActions,
      recentActivity,
      archiveStats: {
        totalArchived,
        totalExpired,
        totalActive,
      },
    };
  }

  /**
   * Export audit trail entries
   */
  exportAuditTrail(options: AuditTrailExportOptions): string {
    let entries = this.getAuditEntries(options.filters, {
      includeFieldChanges: options.includeFieldChanges,
      includeMetadata: options.includeMetadata,
    });

    // Apply date range if specified
    if (options.startDate) {
      entries = entries.filter(e => e.timestamp >= options.startDate!);
    }
    if (options.endDate) {
      entries = entries.filter(e => e.timestamp <= options.endDate!);
    }

    switch (options.format) {
      case 'json':
        return this.exportToJSON(entries, options);
      case 'csv':
        return this.exportToCSV(entries, options);
      case 'xml':
        return this.exportToXML(entries, options);
      case 'pdf':
        return this.exportToPDF(entries, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Archive old audit entries
   */
  archiveOldEntries(olderThanDays: number = 365): number {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let archivedCount = 0;

    for (const entry of this.auditEntries) {
      if (!entry.archived && entry.timestamp < cutoffDate) {
        entry.archived = true;
        entry.archivedAt = new Date();
        archivedCount++;
      }
    }

    return archivedCount;
  }

  /**
   * Clean up expired entries
   */
  cleanupExpiredEntries(): number {
    const now = new Date();
    let removedCount = 0;

    this.auditEntries = this.auditEntries.filter(entry => {
      if (entry.expiresAt && entry.expiresAt < now) {
        removedCount++;
        return false;
      }
      return true;
    });

    return removedCount;
  }

  /**
   * Verify integrity of audit entries
   */
  verifyIntegrity(): Array<{ entryId: string; valid: boolean; error?: string }> {
    const results: Array<{ entryId: string; valid: boolean; error?: string }> = [];

    for (const entry of this.auditEntries) {
      if (entry.integrityHash) {
        const calculatedHash = this.calculateIntegrityHash(
          entry.userId,
          entry.action,
          entry.productId,
          entry.fieldChanges
        );
        
        const valid = calculatedHash === entry.integrityHash;
        results.push({
          entryId: entry.id,
          valid,
          error: valid ? undefined : 'Integrity hash mismatch',
        });
      }
    }

    return results;
  }

  /**
   * Clear all audit entries (for testing)
   */
  clearAllEntries(): void {
    this.auditEntries = [];
  }

  // Private helper methods

  private addAuditEntry(entry: EnhancedAuditTrailEntry): void {
    this.auditEntries.push(entry);

    // Check if we need to archive entries
    if (this.enableArchiving && this.auditEntries.length > this.archiveThreshold) {
      this.archiveOldEntries(180); // Archive entries older than 6 months
    }

    // Check if we need to trim the log
    if (this.auditEntries.length > this.maxEntries) {
      this.auditEntries = this.auditEntries.slice(-this.maxEntries);
    }
  }

  private applyFilters(entries: EnhancedAuditTrailEntry[], filters: AuditTrailFilters): EnhancedAuditTrailEntry[] {
    return entries.filter(entry => {
      if (filters.userId && entry.userId !== filters.userId) return false;
      if (filters.userRole && entry.userRole !== filters.userRole) return false;
      if (filters.action && entry.action !== filters.action) return false;
      if (filters.productId && entry.productId !== filters.productId) return false;
      if (filters.workflowState && entry.metadata?.workflowState !== filters.workflowState) return false;
      if (filters.startDate && entry.timestamp < filters.startDate) return false;
      if (filters.endDate && entry.timestamp > filters.endDate) return false;
      if (filters.priority && entry.priority !== filters.priority) return false;
      if (filters.ipAddress && entry.ipAddress !== filters.ipAddress) return false;
      if (filters.sessionId && entry.sessionId !== filters.sessionId) return false;
      if (filters.requestId && entry.requestId !== filters.requestId) return false;
      if (filters.fieldChanges && !this.hasFieldChanges(entry, filters.fieldChanges)) return false;
      if (filters.reason && !entry.reason?.toLowerCase().includes(filters.reason.toLowerCase())) return false;
      if (filters.includeArchived === false && entry.archived) return false;
      if (filters.includeExpired === false && entry.expiresAt && entry.expiresAt < new Date()) return false;

      return true;
    });
  }

  private hasFieldChanges(entry: EnhancedAuditTrailEntry, fieldNames: string[]): boolean {
    return entry.fieldChanges.some(change => fieldNames.includes(change.field));
  }

  private sortEntries(
    entries: EnhancedAuditTrailEntry[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): EnhancedAuditTrailEntry[] {
    return entries.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'timestamp':
          aValue = a.timestamp.getTime();
          bValue = b.timestamp.getTime();
          break;
        case 'userId':
          aValue = a.userId;
          bValue = b.userId;
          break;
        case 'action':
          aValue = a.action;
          bValue = b.action;
          break;
        case 'priority':
          const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }

  private calculatePriority(
    action: string,
    fieldChanges?: FieldChange[],
    metadata?: Record<string, any>
  ): AuditTrailPriority {
    // Critical actions
    const criticalActions = [
      'product_deleted',
      'user_role_changed',
      'system_config_changed',
      'permission_revoked',
    ];

    // High priority actions
    const highPriorityActions = [
      'state_transition',
      'bulk_operation',
      'permission_granted',
      'reviewer_assigned',
      'reviewer_unassigned',
    ];

    if (criticalActions.includes(action)) {
      return AuditTrailPriority.CRITICAL;
    }

    if (highPriorityActions.includes(action)) {
      return AuditTrailPriority.HIGH;
    }

    // Check for sensitive field changes
    if (fieldChanges) {
      const sensitiveFields = ['price', 'cost', 'inventory', 'status', 'workflowState'];
      const hasSensitiveChanges = fieldChanges.some(change => 
        sensitiveFields.includes(change.field)
      );
      
      if (hasSensitiveChanges) {
        return AuditTrailPriority.HIGH;
      }
    }

    // Check metadata for risk indicators
    if (metadata?.riskLevel === 'high' || metadata?.securityViolation) {
      return AuditTrailPriority.HIGH;
    }

    return AuditTrailPriority.MEDIUM;
  }

  private calculateIntegrityHash(
    userId: string,
    action: string,
    productId?: string,
    fieldChanges?: FieldChange[]
  ): string {
    const data = {
      userId,
      action,
      productId,
      fieldChanges: fieldChanges?.map(fc => ({ field: fc.field, oldValue: fc.oldValue, newValue: fc.newValue })),
    };
    
    // Simple hash function (in production, use a proper cryptographic hash)
    return btoa(JSON.stringify(data)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  private startCleanupProcess(): void {
    // Clean up expired entries every hour
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 60 * 1000);
  }

  private exportToJSON(entries: EnhancedAuditTrailEntry[], options: AuditTrailExportOptions): string {
    const exportData = entries.map(entry => ({
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      userId: entry.userId,
      userRole: entry.userRole,
      userEmail: entry.userEmail,
      action: entry.action,
      productId: entry.productId,
      fieldChanges: options.includeFieldChanges ? entry.fieldChanges : undefined,
      reason: entry.reason,
      priority: entry.priority,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      sessionId: entry.sessionId,
      requestId: entry.requestId,
      metadata: options.includeMetadata ? entry.metadata : undefined,
      immutable: entry.immutable,
      integrityHash: entry.integrityHash,
      archived: entry.archived,
      archivedAt: entry.archivedAt?.toISOString(),
      retentionDays: entry.retentionDays,
      expiresAt: entry.expiresAt?.toISOString(),
    }));

    return JSON.stringify(exportData, null, 2);
  }

  private exportToCSV(entries: EnhancedAuditTrailEntry[], options: AuditTrailExportOptions): string {
    const headers = [
      'ID',
      'Timestamp',
      'User ID',
      'User Role',
      'User Email',
      'Action',
      'Product ID',
      'Reason',
      'Priority',
      'IP Address',
      'User Agent',
      'Session ID',
      'Request ID',
      'Immutable',
      'Integrity Hash',
      'Archived',
      'Archived At',
      'Retention Days',
      'Expires At',
    ];

    if (options.includeFieldChanges) {
      headers.push('Field Changes');
    }

    if (options.includeMetadata) {
      headers.push('Metadata');
    }

    const rows = entries.map(entry => {
      const row = [
        entry.id,
        entry.timestamp.toISOString(),
        entry.userId,
        entry.userRole,
        entry.userEmail,
        entry.action,
        entry.productId || '',
        entry.reason || '',
        entry.priority,
        entry.ipAddress || '',
        entry.userAgent || '',
        entry.sessionId || '',
        entry.requestId || '',
        entry.immutable.toString(),
        entry.integrityHash || '',
        entry.archived.toString(),
        entry.archivedAt?.toISOString() || '',
        entry.retentionDays.toString(),
        entry.expiresAt?.toISOString() || '',
      ];

      if (options.includeFieldChanges) {
        row.push(JSON.stringify(entry.fieldChanges));
      }

      if (options.includeMetadata) {
        row.push(JSON.stringify(entry.metadata));
      }

      return row;
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToXML(entries: EnhancedAuditTrailEntry[], options: AuditTrailExportOptions): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<auditTrail>\n';

    for (const entry of entries) {
      xml += '  <entry>\n';
      xml += `    <id>${entry.id}</id>\n`;
      xml += `    <timestamp>${entry.timestamp.toISOString()}</timestamp>\n`;
      xml += `    <userId>${entry.userId}</userId>\n`;
      xml += `    <userRole>${entry.userRole}</userRole>\n`;
      xml += `    <userEmail>${entry.userEmail}</userEmail>\n`;
      xml += `    <action>${entry.action}</action>\n`;
      xml += `    <productId>${entry.productId || ''}</productId>\n`;
      xml += `    <reason>${entry.reason || ''}</reason>\n`;
      xml += `    <priority>${entry.priority}</priority>\n`;
      xml += `    <ipAddress>${entry.ipAddress || ''}</ipAddress>\n`;
      xml += `    <userAgent>${entry.userAgent || ''}</userAgent>\n`;
      xml += `    <sessionId>${entry.sessionId || ''}</sessionId>\n`;
      xml += `    <requestId>${entry.requestId || ''}</requestId>\n`;
      xml += `    <immutable>${entry.immutable}</immutable>\n`;
      xml += `    <integrityHash>${entry.integrityHash || ''}</integrityHash>\n`;
      xml += `    <archived>${entry.archived}</archived>\n`;
      xml += `    <archivedAt>${entry.archivedAt?.toISOString() || ''}</archivedAt>\n`;
      xml += `    <retentionDays>${entry.retentionDays}</retentionDays>\n`;
      xml += `    <expiresAt>${entry.expiresAt?.toISOString() || ''}</expiresAt>\n`;

      if (options.includeFieldChanges && entry.fieldChanges.length > 0) {
        xml += '    <fieldChanges>\n';
        for (const change of entry.fieldChanges) {
          xml += '      <change>\n';
          xml += `        <field>${change.field}</field>\n`;
          xml += `        <oldValue>${change.oldValue || ''}</oldValue>\n`;
          xml += `        <newValue>${change.newValue || ''}</newValue>\n`;
          xml += '      </change>\n';
        }
        xml += '    </fieldChanges>\n';
      }

      if (options.includeMetadata && entry.metadata) {
        xml += `    <metadata>${JSON.stringify(entry.metadata)}</metadata>\n`;
      }

      xml += '  </entry>\n';
    }

    xml += '</auditTrail>';
    return xml;
  }

  private exportToPDF(entries: EnhancedAuditTrailEntry[], options: AuditTrailExportOptions): string {
    // In a real implementation, this would generate a PDF
    // For now, return a simple text representation
    let pdfContent = 'AUDIT TRAIL REPORT\n';
    pdfContent += '==================\n\n';
    pdfContent += `Generated: ${new Date().toISOString()}\n`;
    pdfContent += `Total Entries: ${entries.length}\n\n`;

    for (const entry of entries) {
      pdfContent += `Entry ID: ${entry.id}\n`;
      pdfContent += `Timestamp: ${entry.timestamp.toISOString()}\n`;
      pdfContent += `User: ${entry.userEmail} (${entry.userRole})\n`;
      pdfContent += `Action: ${entry.action}\n`;
      pdfContent += `Product ID: ${entry.productId || 'N/A'}\n`;
      pdfContent += `Reason: ${entry.reason || 'N/A'}\n`;
      pdfContent += `Priority: ${entry.priority}\n`;
      pdfContent += '---\n';
    }

    return pdfContent;
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const auditTrailService = new AuditTrailService();
