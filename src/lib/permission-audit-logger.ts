import { UserRole, WorkflowAction } from '../types/workflow';
import { PermissionCheckContext } from './role-permissions';

/**
 * Audit log entry types
 */
export enum AuditLogType {
  PERMISSION_CHECK = 'permission_check',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_DENIED = 'permission_denied',
  DYNAMIC_PERMISSION_ASSIGNED = 'dynamic_permission_assigned',
  DYNAMIC_PERMISSION_REVOKED = 'dynamic_permission_revoked',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REVOKED = 'role_revoked',
  SECURITY_VIOLATION = 'security_violation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SYSTEM_ACCESS = 'system_access',
  DATA_ACCESS = 'data_access',
  CONFIGURATION_CHANGE = 'configuration_change',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
}

/**
 * Security risk levels
 */
export enum SecurityRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  /** Unique identifier for the audit entry */
  id: string;
  
  /** Type of audit event */
  type: AuditLogType;
  
  /** Timestamp when the event occurred */
  timestamp: Date;
  
  /** User who performed the action */
  userId: string;
  
  /** User role at the time of the event */
  userRole: UserRole;
  
  /** User email for identification */
  userEmail: string;
  
  /** IP address of the user */
  ipAddress?: string;
  
  /** User agent string */
  userAgent?: string;
  
  /** Action that was performed */
  action: string;
  
  /** Resource that was accessed */
  resource?: string;
  
  /** Resource ID if applicable */
  resourceId?: string;
  
  /** Whether the action was successful */
  success: boolean;
  
  /** Reason for the action or failure */
  reason?: string;
  
  /** Additional metadata about the event */
  metadata?: Record<string, any>;
  
  /** Security risk level */
  riskLevel: SecurityRiskLevel;
  
  /** Session ID for tracking user sessions */
  sessionId?: string;
  
  /** Request ID for tracing requests */
  requestId?: string;
  
  /** Geographic location if available */
  location?: {
    country?: string;
    region?: string;
    city?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  
  /** Device information */
  device?: {
    type?: string;
    os?: string;
    browser?: string;
    version?: string;
  };
}

/**
 * Audit log query filters
 */
export interface AuditLogFilters {
  /** Filter by user ID */
  userId?: string;
  
  /** Filter by user role */
  userRole?: UserRole;
  
  /** Filter by audit log type */
  type?: AuditLogType;
  
  /** Filter by action */
  action?: string;
  
  /** Filter by resource */
  resource?: string;
  
  /** Filter by success status */
  success?: boolean;
  
  /** Filter by risk level */
  riskLevel?: SecurityRiskLevel;
  
  /** Filter by date range */
  startDate?: Date;
  endDate?: Date;
  
  /** Filter by IP address */
  ipAddress?: string;
  
  /** Filter by session ID */
  sessionId?: string;
  
  /** Filter by request ID */
  requestId?: string;
}

/**
 * Audit log statistics
 */
export interface AuditLogStatistics {
  /** Total number of audit entries */
  totalEntries: number;
  
  /** Number of entries by type */
  byType: Record<AuditLogType, number>;
  
  /** Number of entries by risk level */
  byRiskLevel: Record<SecurityRiskLevel, number>;
  
  /** Number of entries by user */
  byUser: Record<string, number>;
  
  /** Number of entries by IP address */
  byIpAddress: Record<string, number>;
  
  /** Success/failure ratio */
  successRate: number;
  
  /** Recent activity (last 24 hours) */
  recentActivity: number;
  
  /** Top actions performed */
  topActions: Array<{ action: string; count: number }>;
  
  /** Security violations count */
  securityViolations: number;
  
  /** Suspicious activity count */
  suspiciousActivity: number;
}

/**
 * Audit log export options
 */
export interface AuditLogExportOptions {
  /** Format for export */
  format: 'json' | 'csv' | 'xml';
  
  /** Date range for export */
  startDate?: Date;
  endDate?: Date;
  
  /** Filters to apply */
  filters?: AuditLogFilters;
  
  /** Include metadata in export */
  includeMetadata?: boolean;
  
  /** Include device information */
  includeDeviceInfo?: boolean;
  
  /** Include location information */
  includeLocationInfo?: boolean;
}

/**
 * Permission Audit Logger
 * Comprehensive audit logging for security compliance
 */
export class PermissionAuditLogger {
  private auditLog: AuditLogEntry[] = [];
  private maxLogSize: number = 100000; // Maximum number of entries to keep
  private retentionDays: number = 90; // How long to keep audit logs
  private enableRealTimeAlerts: boolean = true;
  private alertThresholds: Record<SecurityRiskLevel, number> = {
    [SecurityRiskLevel.LOW]: 1000,
    [SecurityRiskLevel.MEDIUM]: 100,
    [SecurityRiskLevel.HIGH]: 10,
    [SecurityRiskLevel.CRITICAL]: 1,
  };

  constructor(options?: {
    maxLogSize?: number;
    retentionDays?: number;
    enableRealTimeAlerts?: boolean;
    alertThresholds?: Record<SecurityRiskLevel, number>;
  }) {
    if (options) {
      this.maxLogSize = options.maxLogSize || this.maxLogSize;
      this.retentionDays = options.retentionDays || this.retentionDays;
      this.enableRealTimeAlerts = options.enableRealTimeAlerts !== undefined ? options.enableRealTimeAlerts : this.enableRealTimeAlerts;
      this.alertThresholds = options.alertThresholds || this.alertThresholds;
    }

    // Start cleanup process
    this.startCleanupProcess();
  }

  /**
   * Log a permission check event
   */
  logPermissionCheck(
    context: PermissionCheckContext,
    action: string,
    resource: string,
    success: boolean,
    reason?: string,
    metadata?: Record<string, any>
  ): void {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      type: success ? AuditLogType.PERMISSION_GRANTED : AuditLogType.PERMISSION_DENIED,
      timestamp: new Date(),
      userId: context.userId,
      userRole: context.userRole,
      userEmail: context.userEmail,
      ipAddress: context.metadata?.ipAddress,
      userAgent: context.metadata?.userAgent,
      action,
      resource,
      resourceId: context.resourceId,
      success,
      reason,
      metadata: {
        ...metadata,
        ...context.metadata,
      },
      riskLevel: this.calculateRiskLevel(context, action, success),
      sessionId: context.metadata?.sessionId,
      requestId: context.metadata?.requestId,
      location: context.metadata?.location,
      device: context.metadata?.device,
    };

    this.addAuditEntry(entry);
  }

  /**
   * Log a dynamic permission assignment
   */
  logDynamicPermissionAssigned(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    permission: string,
    grantedBy: string,
    reason: string,
    metadata?: Record<string, any>
  ): void {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      type: AuditLogType.DYNAMIC_PERMISSION_ASSIGNED,
      timestamp: new Date(),
      userId,
      userRole,
      userEmail,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      action: 'assign_dynamic_permission',
      resource: 'permissions',
      resourceId: permission,
      success: true,
      reason,
      metadata: {
        ...metadata,
        grantedBy,
        permission,
      },
      riskLevel: SecurityRiskLevel.MEDIUM,
      sessionId: metadata?.sessionId,
      requestId: metadata?.requestId,
      location: metadata?.location,
      device: metadata?.device,
    };

    this.addAuditEntry(entry);
  }

  /**
   * Log a dynamic permission revocation
   */
  logDynamicPermissionRevoked(
    userId: string,
    userRole: UserRole,
    userEmail: string,
    permission: string,
    revokedBy: string,
    reason: string,
    metadata?: Record<string, any>
  ): void {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      type: AuditLogType.DYNAMIC_PERMISSION_REVOKED,
      timestamp: new Date(),
      userId,
      userRole,
      userEmail,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      action: 'revoke_dynamic_permission',
      resource: 'permissions',
      resourceId: permission,
      success: true,
      reason,
      metadata: {
        ...metadata,
        revokedBy,
        permission,
      },
      riskLevel: SecurityRiskLevel.MEDIUM,
      sessionId: metadata?.sessionId,
      requestId: metadata?.requestId,
      location: metadata?.location,
      device: metadata?.device,
    };

    this.addAuditEntry(entry);
  }

  /**
   * Log a security violation
   */
  logSecurityViolation(
    context: PermissionCheckContext,
    action: string,
    resource: string,
    violation: string,
    metadata?: Record<string, any>
  ): void {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      type: AuditLogType.SECURITY_VIOLATION,
      timestamp: new Date(),
      userId: context.userId,
      userRole: context.userRole,
      userEmail: context.userEmail,
      ipAddress: context.metadata?.ipAddress,
      userAgent: context.metadata?.userAgent,
      action,
      resource,
      resourceId: context.resourceId,
      success: false,
      reason: `Security violation: ${violation}`,
      metadata: {
        ...metadata,
        ...context.metadata,
        violation,
      },
      riskLevel: SecurityRiskLevel.CRITICAL,
      sessionId: context.metadata?.sessionId,
      requestId: context.metadata?.requestId,
      location: context.metadata?.location,
      device: context.metadata?.device,
    };

    this.addAuditEntry(entry);
  }

  /**
   * Log suspicious activity
   */
  logSuspiciousActivity(
    context: PermissionCheckContext,
    activity: string,
    reason: string,
    metadata?: Record<string, any>
  ): void {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      type: AuditLogType.SUSPICIOUS_ACTIVITY,
      timestamp: new Date(),
      userId: context.userId,
      userRole: context.userRole,
      userEmail: context.userEmail,
      ipAddress: context.metadata?.ipAddress,
      userAgent: context.metadata?.userAgent,
      action: 'suspicious_activity',
      resource: 'system',
      success: false,
      reason,
      metadata: {
        ...metadata,
        ...context.metadata,
        activity,
      },
      riskLevel: SecurityRiskLevel.HIGH,
      sessionId: context.metadata?.sessionId,
      requestId: context.metadata?.requestId,
      location: context.metadata?.location,
      device: context.metadata?.device,
    };

    this.addAuditEntry(entry);
  }

  /**
   * Log system access
   */
  logSystemAccess(
    context: PermissionCheckContext,
    system: string,
    action: string,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      type: AuditLogType.SYSTEM_ACCESS,
      timestamp: new Date(),
      userId: context.userId,
      userRole: context.userRole,
      userEmail: context.userEmail,
      ipAddress: context.metadata?.ipAddress,
      userAgent: context.metadata?.userAgent,
      action,
      resource: system,
      success,
      metadata: {
        ...metadata,
        ...context.metadata,
      },
      riskLevel: this.calculateRiskLevel(context, action, success),
      sessionId: context.metadata?.sessionId,
      requestId: context.metadata?.requestId,
      location: context.metadata?.location,
      device: context.metadata?.device,
    };

    this.addAuditEntry(entry);
  }

  /**
   * Log data access
   */
  logDataAccess(
    context: PermissionCheckContext,
    dataType: string,
    action: string,
    recordCount: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const entry: AuditLogEntry = {
      id: this.generateId(),
      type: AuditLogType.DATA_ACCESS,
      timestamp: new Date(),
      userId: context.userId,
      userRole: context.userRole,
      userEmail: context.userEmail,
      ipAddress: context.metadata?.ipAddress,
      userAgent: context.metadata?.userAgent,
      action,
      resource: dataType,
      success,
      metadata: {
        ...metadata,
        ...context.metadata,
        recordCount,
      },
      riskLevel: this.calculateRiskLevel(context, action, success),
      sessionId: context.metadata?.sessionId,
      requestId: context.metadata?.requestId,
      location: context.metadata?.location,
      device: context.metadata?.device,
    };

    this.addAuditEntry(entry);
  }

  /**
   * Get audit log entries with optional filtering
   */
  getAuditLogs(filters?: AuditLogFilters): AuditLogEntry[] {
    let entries = [...this.auditLog];

    if (!filters) {
      return entries;
    }

    // Apply filters
    if (filters.userId) {
      entries = entries.filter(e => e.userId === filters.userId);
    }

    if (filters.userRole) {
      entries = entries.filter(e => e.userRole === filters.userRole);
    }

    if (filters.type) {
      entries = entries.filter(e => e.type === filters.type);
    }

    if (filters.action) {
      entries = entries.filter(e => e.action === filters.action);
    }

    if (filters.resource) {
      entries = entries.filter(e => e.resource === filters.resource);
    }

    if (filters.success !== undefined) {
      entries = entries.filter(e => e.success === filters.success);
    }

    if (filters.riskLevel) {
      entries = entries.filter(e => e.riskLevel === filters.riskLevel);
    }

    if (filters.startDate) {
      entries = entries.filter(e => e.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      entries = entries.filter(e => e.timestamp <= filters.endDate!);
    }

    if (filters.ipAddress) {
      entries = entries.filter(e => e.ipAddress === filters.ipAddress);
    }

    if (filters.sessionId) {
      entries = entries.filter(e => e.sessionId === filters.sessionId);
    }

    if (filters.requestId) {
      entries = entries.filter(e => e.requestId === filters.requestId);
    }

    return entries;
  }

  /**
   * Get audit log statistics
   */
  getStatistics(): AuditLogStatistics {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const byType: Record<AuditLogType, number> = {
      [AuditLogType.PERMISSION_CHECK]: 0,
      [AuditLogType.PERMISSION_GRANTED]: 0,
      [AuditLogType.PERMISSION_DENIED]: 0,
      [AuditLogType.DYNAMIC_PERMISSION_ASSIGNED]: 0,
      [AuditLogType.DYNAMIC_PERMISSION_REVOKED]: 0,
      [AuditLogType.ROLE_ASSIGNED]: 0,
      [AuditLogType.ROLE_REVOKED]: 0,
      [AuditLogType.SECURITY_VIOLATION]: 0,
      [AuditLogType.SUSPICIOUS_ACTIVITY]: 0,
      [AuditLogType.SYSTEM_ACCESS]: 0,
      [AuditLogType.DATA_ACCESS]: 0,
      [AuditLogType.CONFIGURATION_CHANGE]: 0,
      [AuditLogType.AUTHENTICATION]: 0,
      [AuditLogType.AUTHORIZATION]: 0,
    };

    const byRiskLevel: Record<SecurityRiskLevel, number> = {
      [SecurityRiskLevel.LOW]: 0,
      [SecurityRiskLevel.MEDIUM]: 0,
      [SecurityRiskLevel.HIGH]: 0,
      [SecurityRiskLevel.CRITICAL]: 0,
    };

    const byUser: Record<string, number> = {};
    const byIpAddress: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};

    let totalSuccesses = 0;
    let recentActivity = 0;
    let securityViolations = 0;
    let suspiciousActivity = 0;

    for (const entry of this.auditLog) {
      byType[entry.type]++;
      byRiskLevel[entry.riskLevel]++;

      byUser[entry.userId] = (byUser[entry.userId] || 0) + 1;

      if (entry.ipAddress) {
        byIpAddress[entry.ipAddress] = (byIpAddress[entry.ipAddress] || 0) + 1;
      }

      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;

      if (entry.success) {
        totalSuccesses++;
      }

      if (entry.timestamp >= twentyFourHoursAgo) {
        recentActivity++;
      }

      if (entry.type === AuditLogType.SECURITY_VIOLATION) {
        securityViolations++;
      }

      if (entry.type === AuditLogType.SUSPICIOUS_ACTIVITY) {
        suspiciousActivity++;
      }
    }

    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEntries: this.auditLog.length,
      byType,
      byRiskLevel,
      byUser,
      byIpAddress,
      successRate: this.auditLog.length > 0 ? totalSuccesses / this.auditLog.length : 0,
      recentActivity,
      topActions,
      securityViolations,
      suspiciousActivity,
    };
  }

  /**
   * Export audit logs
   */
  exportAuditLogs(options: AuditLogExportOptions): string {
    let entries = this.getAuditLogs(options.filters);

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
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Clear audit logs
   */
  clearAuditLogs(): void {
    this.auditLog = [];
  }

  /**
   * Get audit logs for a specific user
   */
  getUserAuditLogs(userId: string, limit?: number): AuditLogEntry[] {
    const userLogs = this.auditLog
      .filter(entry => entry.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? userLogs.slice(0, limit) : userLogs;
  }

  /**
   * Get security violations
   */
  getSecurityViolations(limit?: number): AuditLogEntry[] {
    const violations = this.auditLog
      .filter(entry => entry.type === AuditLogType.SECURITY_VIOLATION)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? violations.slice(0, limit) : violations;
  }

  /**
   * Get suspicious activity
   */
  getSuspiciousActivity(limit?: number): AuditLogEntry[] {
    const suspicious = this.auditLog
      .filter(entry => entry.type === AuditLogType.SUSPICIOUS_ACTIVITY)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? suspicious.slice(0, limit) : suspicious;
  }

  // Private helper methods

  private addAuditEntry(entry: AuditLogEntry): void {
    this.auditLog.push(entry);

    // Check if we need to trim the log
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxLogSize);
    }

    // Check for real-time alerts
    if (this.enableRealTimeAlerts) {
      this.checkForAlerts(entry);
    }
  }

  private calculateRiskLevel(
    context: PermissionCheckContext,
    action: string,
    success: boolean
  ): SecurityRiskLevel {
    // High-risk actions
    const highRiskActions = [
      'delete',
      'admin',
      'manage_users',
      'system_config',
      'export_data',
      'bulk_operations',
    ];

    // Medium-risk actions
    const mediumRiskActions = [
      'create',
      'edit',
      'approve',
      'reject',
      'publish',
      'assign_permission',
      'revoke_permission',
    ];

    if (!success) {
      return SecurityRiskLevel.HIGH;
    }

    if (highRiskActions.some(riskAction => action.toLowerCase().includes(riskAction))) {
      return SecurityRiskLevel.HIGH;
    }

    if (mediumRiskActions.some(riskAction => action.toLowerCase().includes(riskAction))) {
      return SecurityRiskLevel.MEDIUM;
    }

    // Check for unusual access patterns
    if (this.isUnusualAccess(context, action)) {
      return SecurityRiskLevel.MEDIUM;
    }

    return SecurityRiskLevel.LOW;
  }

  private isUnusualAccess(context: PermissionCheckContext, action: string): boolean {
    // Check for unusual time access (outside business hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      return true;
    }

    // Check for rapid successive access
    const recentEntries = this.auditLog
      .filter(entry => 
        entry.userId === context.userId && 
        entry.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      );

    if (recentEntries.length > 20) {
      return true;
    }

    // Check for access from unusual IP
    if (context.metadata?.ipAddress) {
      const ipEntries = this.auditLog
        .filter(entry => entry.ipAddress === context.metadata?.ipAddress)
        .slice(-10); // Last 10 entries from this IP

      if (ipEntries.length > 0) {
        const uniqueUsers = new Set(ipEntries.map(e => e.userId));
        if (uniqueUsers.size > 3) {
          return true; // Multiple users from same IP
        }
      }
    }

    return false;
  }

  private checkForAlerts(entry: AuditLogEntry): void {
    const threshold = this.alertThresholds[entry.riskLevel];
    if (!threshold) return;

    // Count recent entries of this risk level
    const recentEntries = this.auditLog
      .filter(e => 
        e.riskLevel === entry.riskLevel && 
        e.timestamp > new Date(Date.now() - 60 * 60 * 1000) // Last hour
      );

    if (recentEntries.length >= threshold) {
      this.triggerAlert(entry, recentEntries.length);
    }
  }

  private triggerAlert(entry: AuditLogEntry, count: number): void {
    // In a real implementation, this would send alerts to security team
    console.warn(`SECURITY ALERT: ${count} ${entry.riskLevel} risk events detected`, {
      type: entry.type,
      userId: entry.userId,
      action: entry.action,
      timestamp: entry.timestamp,
    });
  }

  private startCleanupProcess(): void {
    // Clean up old entries every hour
    setInterval(() => {
      this.cleanupOldEntries();
    }, 60 * 60 * 1000);
  }

  private cleanupOldEntries(): void {
    const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);
    this.auditLog = this.auditLog.filter(entry => entry.timestamp > cutoffDate);
  }

  private exportToJSON(entries: AuditLogEntry[], options: AuditLogExportOptions): string {
    const exportData = entries.map(entry => {
      const exportEntry: any = {
        id: entry.id,
        type: entry.type,
        timestamp: entry.timestamp.toISOString(),
        userId: entry.userId,
        userRole: entry.userRole,
        userEmail: entry.userEmail,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        success: entry.success,
        reason: entry.reason,
        riskLevel: entry.riskLevel,
      };

      if (options.includeMetadata && entry.metadata) {
        exportEntry.metadata = entry.metadata;
      }

      if (options.includeDeviceInfo && entry.device) {
        exportEntry.device = entry.device;
      }

      if (options.includeLocationInfo && entry.location) {
        exportEntry.location = entry.location;
      }

      return exportEntry;
    });

    return JSON.stringify(exportData, null, 2);
  }

  private exportToCSV(entries: AuditLogEntry[], options: AuditLogExportOptions): string {
    const headers = [
      'ID',
      'Type',
      'Timestamp',
      'User ID',
      'User Role',
      'User Email',
      'Action',
      'Resource',
      'Resource ID',
      'Success',
      'Reason',
      'Risk Level',
    ];

    if (options.includeMetadata) {
      headers.push('Metadata');
    }

    if (options.includeDeviceInfo) {
      headers.push('Device Info');
    }

    if (options.includeLocationInfo) {
      headers.push('Location Info');
    }

    const rows = entries.map(entry => {
      const row = [
        entry.id,
        entry.type,
        entry.timestamp.toISOString(),
        entry.userId,
        entry.userRole,
        entry.userEmail,
        entry.action,
        entry.resource || '',
        entry.resourceId || '',
        entry.success.toString(),
        entry.reason || '',
        entry.riskLevel,
      ];

      if (options.includeMetadata) {
        row.push(entry.metadata ? JSON.stringify(entry.metadata) : '');
      }

      if (options.includeDeviceInfo) {
        row.push(entry.device ? JSON.stringify(entry.device) : '');
      }

      if (options.includeLocationInfo) {
        row.push(entry.location ? JSON.stringify(entry.location) : '');
      }

      return row;
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToXML(entries: AuditLogEntry[], options: AuditLogExportOptions): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<auditLogs>\n';

    for (const entry of entries) {
      xml += '  <entry>\n';
      xml += `    <id>${entry.id}</id>\n`;
      xml += `    <type>${entry.type}</type>\n`;
      xml += `    <timestamp>${entry.timestamp.toISOString()}</timestamp>\n`;
      xml += `    <userId>${entry.userId}</userId>\n`;
      xml += `    <userRole>${entry.userRole}</userRole>\n`;
      xml += `    <userEmail>${entry.userEmail}</userEmail>\n`;
      xml += `    <action>${entry.action}</action>\n`;
      xml += `    <resource>${entry.resource || ''}</resource>\n`;
      xml += `    <resourceId>${entry.resourceId || ''}</resourceId>\n`;
      xml += `    <success>${entry.success}</success>\n`;
      xml += `    <reason>${entry.reason || ''}</reason>\n`;
      xml += `    <riskLevel>${entry.riskLevel}</riskLevel>\n`;

      if (options.includeMetadata && entry.metadata) {
        xml += `    <metadata>${JSON.stringify(entry.metadata)}</metadata>\n`;
      }

      if (options.includeDeviceInfo && entry.device) {
        xml += `    <device>${JSON.stringify(entry.device)}</device>\n`;
      }

      if (options.includeLocationInfo && entry.location) {
        xml += `    <location>${JSON.stringify(entry.location)}</location>\n`;
      }

      xml += '  </entry>\n';
    }

    xml += '</auditLogs>';
    return xml;
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const permissionAuditLogger = new PermissionAuditLogger();
