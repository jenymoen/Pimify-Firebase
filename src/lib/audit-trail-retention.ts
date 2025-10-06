import { auditTrailService, AuditTrailAction, AuditTrailPriority } from './audit-trail-service';
import { immutableAuditTrailService } from './immutable-audit-trail';
import { UserRole, WorkflowState, AuditTrailEntry } from '../types/workflow';
import * as crypto from 'crypto';

/**
 * Retention policy types
 */
export enum RetentionPolicyType {
  TIME_BASED = 'time_based',           // Based on creation date
  EVENT_BASED = 'event_based',         // Based on specific events
  SIZE_BASED = 'size_based',           // Based on data size
  COMPLIANCE_BASED = 'compliance_based', // Based on regulatory requirements
  CUSTOM = 'custom',                   // Custom business rules
}

/**
 * Retention action types
 */
export enum RetentionAction {
  ARCHIVE = 'archive',                 // Move to archive storage
  DELETE = 'delete',                   // Permanently delete
  COMPRESS = 'compress',               // Compress for storage efficiency
  ENCRYPT = 'encrypt',                 // Encrypt for security
  EXPORT = 'export',                   // Export before deletion
  NOTIFY = 'notify',                   // Send notification
  HOLD = 'hold',                       // Place legal hold
}

/**
 * Retention policy configuration
 */
export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  type: RetentionPolicyType;
  enabled: boolean;
  priority: number; // Higher number = higher priority
  
  // Time-based retention
  retentionPeriod: {
    years?: number;
    months?: number;
    days?: number;
    hours?: number;
  };
  
  // Event-based retention
  triggerEvents?: AuditTrailAction[];
  triggerConditions?: {
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  }[];
  
  // Size-based retention
  maxSize?: {
    entries?: number;
    bytes?: number;
    percentage?: number; // Percentage of total storage
  };
  
  // Compliance requirements
  complianceRequirements?: {
    regulation: string; // e.g., 'GDPR', 'SOX', 'HIPAA'
    minimumRetention: number; // in days
    maximumRetention?: number; // in days
    requiresEncryption: boolean;
    requiresAuditTrail: boolean;
  }[];
  
  // Custom rules
  customRules?: {
    condition: string; // JavaScript expression
    description: string;
  }[];
  
  // Actions to take
  actions: RetentionAction[];
  
  // Execution settings
  execution: {
    schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'continuous';
    timeOfDay?: string; // HH:MM format
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
    batchSize?: number; // Number of entries to process per batch
    maxExecutionTime?: number; // Maximum execution time in minutes
  };
  
  // Notification settings
  notifications?: {
    enabled: boolean;
    recipients: string[];
    events: ('policy_executed' | 'policy_failed' | 'retention_warning' | 'compliance_alert')[];
    channels: ('email' | 'webhook' | 'slack' | 'teams')[];
  };
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastExecuted?: Date;
  executionCount: number;
  successCount: number;
  failureCount: number;
}

/**
 * Retention execution result
 */
export interface RetentionExecutionResult {
  policyId: string;
  executionId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in milliseconds
  
  // Statistics
  totalEntries: number;
  processedEntries: number;
  archivedEntries: number;
  deletedEntries: number;
  compressedEntries: number;
  encryptedEntries: number;
  exportedEntries: number;
  heldEntries: number;
  skippedEntries: number;
  errorEntries: number;
  
  // Results
  success: boolean;
  errors: Array<{
    entryId: string;
    error: string;
    timestamp: Date;
  }>;
  warnings: Array<{
    message: string;
    timestamp: Date;
  }>;
  
  // Compliance
  complianceStatus: {
    regulation: string;
    status: 'compliant' | 'non_compliant' | 'warning';
    details: string;
  }[];
  
  // Storage impact
  storageImpact: {
    beforeSize: number; // bytes
    afterSize: number; // bytes
    spaceSaved: number; // bytes
    compressionRatio?: number;
  };
}

/**
 * Retention policy violation
 */
export interface RetentionViolation {
  id: string;
  policyId: string;
  entryId: string;
  violationType: 'retention_too_short' | 'retention_too_long' | 'unauthorized_deletion' | 'missing_encryption' | 'audit_trail_gap';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  complianceImpact: string[];
}

/**
 * Retention analytics
 */
export interface RetentionAnalytics {
  totalPolicies: number;
  activePolicies: number;
  totalEntries: number;
  retainedEntries: number;
  archivedEntries: number;
  deletedEntries: number;
  
  // Storage metrics
  totalStorageUsed: number; // bytes
  archivedStorageUsed: number; // bytes
  compressionSavings: number; // bytes
  
  // Compliance metrics
  complianceStatus: {
    regulation: string;
    compliantEntries: number;
    nonCompliantEntries: number;
    warningEntries: number;
    lastAudit: Date;
  }[];
  
  // Performance metrics
  averageExecutionTime: number; // milliseconds
  successRate: number; // percentage
  errorRate: number; // percentage
  
  // Trends
  trends: {
    period: 'daily' | 'weekly' | 'monthly';
    data: Array<{
      date: Date;
      entriesProcessed: number;
      storageSaved: number;
      errors: number;
    }>;
  };
}

/**
 * Audit Trail Data Retention Service
 * Manages data retention policies and automated cleanup
 */
export class AuditTrailRetentionService {
  private policies: Map<string, RetentionPolicy> = new Map();
  private executionHistory: RetentionExecutionResult[] = [];
  private violations: RetentionViolation[] = [];
  private analytics: RetentionAnalytics;
  private isRunning: boolean = false;
  private executionQueue: string[] = [];

  constructor() {
    this.analytics = this.initializeAnalytics();
    this.initializeDefaultPolicies();
    this.startRetentionScheduler();
  }

  /**
   * Create a new retention policy
   */
  createRetentionPolicy(
    name: string,
    description: string,
    type: RetentionPolicyType,
    createdBy: string,
    config: Partial<RetentionPolicy>
  ): RetentionPolicy {
    const policy: RetentionPolicy = {
      id: `retention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      type,
      enabled: true,
      priority: 1,
      retentionPeriod: {
        years: 2, // Default minimum retention
        months: 0,
        days: 0,
        hours: 0,
      },
      actions: [RetentionAction.ARCHIVE],
      execution: {
        schedule: 'monthly',
        batchSize: 1000,
        maxExecutionTime: 60,
      },
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      ...config,
    };

    this.policies.set(policy.id, policy);
    this.updateAnalytics();
    return policy;
  }

  /**
   * Update an existing retention policy
   */
  updateRetentionPolicy(policyId: string, updates: Partial<RetentionPolicy>): RetentionPolicy {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Retention policy not found: ${policyId}`);
    }

    const updatedPolicy = {
      ...policy,
      ...updates,
      updatedAt: new Date(),
    };

    this.policies.set(policyId, updatedPolicy);
    this.updateAnalytics();
    return updatedPolicy;
  }

  /**
   * Delete a retention policy
   */
  deleteRetentionPolicy(policyId: string): boolean {
    const deleted = this.policies.delete(policyId);
    if (deleted) {
      this.updateAnalytics();
    }
    return deleted;
  }

  /**
   * Get all retention policies
   */
  getRetentionPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get a specific retention policy
   */
  getRetentionPolicy(policyId: string): RetentionPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Execute a retention policy
   */
  async executeRetentionPolicy(policyId: string): Promise<RetentionExecutionResult> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Retention policy not found: ${policyId}`);
    }

    if (!policy.enabled) {
      throw new Error(`Retention policy is disabled: ${policyId}`);
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();

    const result: RetentionExecutionResult = {
      policyId,
      executionId,
      startTime,
      endTime: new Date(),
      duration: 0,
      totalEntries: 0,
      processedEntries: 0,
      archivedEntries: 0,
      deletedEntries: 0,
      compressedEntries: 0,
      encryptedEntries: 0,
      exportedEntries: 0,
      heldEntries: 0,
      skippedEntries: 0,
      errorEntries: 0,
      success: false,
      errors: [],
      warnings: [],
      complianceStatus: [],
      storageImpact: {
        beforeSize: 0,
        afterSize: 0,
        spaceSaved: 0,
      },
    };

    try {
      // Get entries to process
      const entries = this.getEntriesForPolicy(policy);
      result.totalEntries = entries.length;

      // Calculate storage before processing
      result.storageImpact.beforeSize = this.calculateStorageSize(entries);

      // Process entries in batches
      const batchSize = policy.execution.batchSize || 1000;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        await this.processBatch(batch, policy, result);
        
        // Check execution time limit
        if (policy.execution.maxExecutionTime) {
          const elapsed = Date.now() - startTime.getTime();
          if (elapsed > policy.execution.maxExecutionTime * 60 * 1000) {
            result.warnings.push({
              message: `Execution time limit reached. Processed ${result.processedEntries} of ${result.totalEntries} entries.`,
              timestamp: new Date(),
            });
            break;
          }
        }
      }

      // Calculate storage after processing
      result.storageImpact.afterSize = this.calculateStorageSize(entries);
      result.storageImpact.spaceSaved = result.storageImpact.beforeSize - result.storageImpact.afterSize;

      // Update policy statistics
      policy.executionCount++;
      policy.lastExecuted = new Date();
      if (result.errors.length === 0) {
        policy.successCount++;
        result.success = true;
      } else {
        policy.failureCount++;
        result.success = false;
      }

      // Check compliance
      result.complianceStatus = this.checkComplianceStatus(policy, result);

    } catch (error) {
      result.errors.push({
        entryId: 'system',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      result.success = false;
      policy.failureCount++;
    } finally {
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();
      this.executionHistory.push(result);
      this.updateAnalytics();
    }

    return result;
  }

  /**
   * Execute all enabled retention policies
   */
  async executeAllRetentionPolicies(): Promise<RetentionExecutionResult[]> {
    const enabledPolicies = this.getRetentionPolicies().filter(p => p.enabled);
    const results: RetentionExecutionResult[] = [];

    for (const policy of enabledPolicies) {
      try {
        const result = await this.executeRetentionPolicy(policy.id);
        results.push(result);
      } catch (error) {
        console.error(`Failed to execute retention policy ${policy.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Check for retention policy violations
   */
  async checkRetentionViolations(): Promise<RetentionViolation[]> {
    const violations: RetentionViolation[] = [];
    const entries = auditTrailService.getAuditEntries();

    for (const policy of this.getRetentionPolicies()) {
      if (!policy.enabled) continue;

      for (const entry of entries) {
        const violation = this.checkEntryForViolations(entry, policy);
        if (violation) {
          violations.push(violation);
        }
      }
    }

    this.violations = violations;
    return violations;
  }

  /**
   * Get retention analytics
   */
  getRetentionAnalytics(): RetentionAnalytics {
    return { ...this.analytics };
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit?: number): RetentionExecutionResult[] {
    const history = this.executionHistory.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get retention violations
   */
  getRetentionViolations(): RetentionViolation[] {
    return [...this.violations];
  }

  /**
   * Resolve a retention violation
   */
  resolveRetentionViolation(violationId: string, resolution: string): boolean {
    const violation = this.violations.find(v => v.id === violationId);
    if (violation) {
      violation.resolvedAt = new Date();
      violation.resolution = resolution;
      return true;
    }
    return false;
  }

  /**
   * Export retention data
   */
  exportRetentionData(format: 'json' | 'csv' | 'xml'): string {
    const data = {
      policies: this.getRetentionPolicies(),
      executionHistory: this.getExecutionHistory(),
      violations: this.getRetentionViolations(),
      analytics: this.getRetentionAnalytics(),
      exportedAt: new Date(),
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.exportToCSV(data);
      case 'xml':
        return this.exportToXML(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private helper methods

  private initializeAnalytics(): RetentionAnalytics {
    return {
      totalPolicies: 0,
      activePolicies: 0,
      totalEntries: 0,
      retainedEntries: 0,
      archivedEntries: 0,
      deletedEntries: 0,
      totalStorageUsed: 0,
      archivedStorageUsed: 0,
      compressionSavings: 0,
      complianceStatus: [],
      averageExecutionTime: 0,
      successRate: 0,
      errorRate: 0,
      trends: {
        period: 'monthly',
        data: [],
      },
    };
  }

  private initializeDefaultPolicies(): void {
    // Default 2-year retention policy
    this.createRetentionPolicy(
      'Default 2-Year Retention',
      'Default policy to retain audit trail entries for minimum 2 years as required by regulations',
      RetentionPolicyType.TIME_BASED,
      'system',
      {
        retentionPeriod: {
          years: 2,
        },
        actions: [RetentionAction.ARCHIVE],
        execution: {
          schedule: 'monthly',
          batchSize: 1000,
        },
        priority: 1,
      }
    );

    // GDPR compliance policy
    this.createRetentionPolicy(
      'GDPR Compliance',
      'GDPR compliance policy for personal data retention',
      RetentionPolicyType.COMPLIANCE_BASED,
      'system',
      {
        complianceRequirements: [
          {
            regulation: 'GDPR',
            minimumRetention: 365, // 1 year
            maximumRetention: 2555, // 7 years
            requiresEncryption: true,
            requiresAuditTrail: true,
          },
        ],
        actions: [RetentionAction.ENCRYPT, RetentionAction.ARCHIVE],
        execution: {
          schedule: 'quarterly',
        },
        priority: 10,
      }
    );

    // SOX compliance policy
    this.createRetentionPolicy(
      'SOX Compliance',
      'Sarbanes-Oxley compliance policy for financial audit trails',
      RetentionPolicyType.COMPLIANCE_BASED,
      'system',
      {
        complianceRequirements: [
          {
            regulation: 'SOX',
            minimumRetention: 2555, // 7 years
            requiresEncryption: true,
            requiresAuditTrail: true,
          },
        ],
        actions: [RetentionAction.ENCRYPT, RetentionAction.ARCHIVE],
        execution: {
          schedule: 'yearly',
        },
        priority: 10,
      }
    );
  }

  private startRetentionScheduler(): void {
    // Run retention checks every hour
    setInterval(async () => {
      if (!this.isRunning) {
        this.isRunning = true;
        try {
          await this.executeScheduledPolicies();
        } catch (error) {
          console.error('Retention scheduler error:', error);
        } finally {
          this.isRunning = false;
        }
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  private async executeScheduledPolicies(): Promise<void> {
    const now = new Date();
    const policies = this.getRetentionPolicies().filter(p => p.enabled);

    for (const policy of policies) {
      if (this.shouldExecutePolicy(policy, now)) {
        this.executionQueue.push(policy.id);
      }
    }

    // Process queue
    while (this.executionQueue.length > 0) {
      const policyId = this.executionQueue.shift();
      if (policyId) {
        try {
          await this.executeRetentionPolicy(policyId);
        } catch (error) {
          console.error(`Failed to execute scheduled policy ${policyId}:`, error);
        }
      }
    }
  }

  private shouldExecutePolicy(policy: RetentionPolicy, now: Date): boolean {
    const { schedule, timeOfDay, dayOfWeek, dayOfMonth } = policy.execution;
    const lastExecuted = policy.lastExecuted;

    if (!lastExecuted) return true;

    switch (schedule) {
      case 'daily':
        return now.getDate() !== lastExecuted.getDate();
      case 'weekly':
        return now.getDay() === dayOfWeek && now.getDate() !== lastExecuted.getDate();
      case 'monthly':
        return now.getDate() === dayOfMonth && now.getMonth() !== lastExecuted.getMonth();
      case 'quarterly':
        return now.getMonth() % 3 === 0 && now.getDate() === 1 && now.getMonth() !== lastExecuted.getMonth();
      case 'yearly':
        return now.getMonth() === 0 && now.getDate() === 1 && now.getFullYear() !== lastExecuted.getFullYear();
      case 'continuous':
        return true;
      default:
        return false;
    }
  }

  private getEntriesForPolicy(policy: RetentionPolicy): AuditTrailEntry[] {
    const allEntries = auditTrailService.getAuditEntries();
    const now = new Date();

    return allEntries.filter(entry => {
      switch (policy.type) {
        case RetentionPolicyType.TIME_BASED:
          return this.isEntryEligibleForTimeBasedRetention(entry, policy, now);
        case RetentionPolicyType.EVENT_BASED:
          return this.isEntryEligibleForEventBasedRetention(entry, policy);
        case RetentionPolicyType.SIZE_BASED:
          return this.isEntryEligibleForSizeBasedRetention(entry, policy);
        case RetentionPolicyType.COMPLIANCE_BASED:
          return this.isEntryEligibleForComplianceBasedRetention(entry, policy);
        case RetentionPolicyType.CUSTOM:
          return this.isEntryEligibleForCustomRetention(entry, policy);
        default:
          return false;
      }
    });
  }

  private isEntryEligibleForTimeBasedRetention(
    entry: AuditTrailEntry,
    policy: RetentionPolicy,
    now: Date
  ): boolean {
    const entryDate = new Date(entry.timestamp);
    const retentionDate = new Date(entryDate);
    
    if (policy.retentionPeriod.years) {
      retentionDate.setFullYear(retentionDate.getFullYear() + policy.retentionPeriod.years);
    }
    if (policy.retentionPeriod.months) {
      retentionDate.setMonth(retentionDate.getMonth() + policy.retentionPeriod.months);
    }
    if (policy.retentionPeriod.days) {
      retentionDate.setDate(retentionDate.getDate() + policy.retentionPeriod.days);
    }
    if (policy.retentionPeriod.hours) {
      retentionDate.setHours(retentionDate.getHours() + policy.retentionPeriod.hours);
    }

    return now > retentionDate;
  }

  private isEntryEligibleForEventBasedRetention(
    entry: AuditTrailEntry,
    policy: RetentionPolicy
  ): boolean {
    if (policy.triggerEvents && policy.triggerEvents.includes(entry.action)) {
      return true;
    }

    if (policy.triggerConditions) {
      return policy.triggerConditions.every(condition => {
        const fieldValue = this.getNestedFieldValue(entry, condition.field);
        return this.evaluateCondition(fieldValue, condition.operator, condition.value);
      });
    }

    return false;
  }

  private isEntryEligibleForSizeBasedRetention(
    entry: AuditTrailEntry,
    policy: RetentionPolicy
  ): boolean {
    const allEntries = auditTrailService.getAuditEntries();
    const totalEntries = allEntries.length;
    const totalSize = this.calculateStorageSize(allEntries);

    if (policy.maxSize?.entries && totalEntries > policy.maxSize.entries) {
      return true;
    }

    if (policy.maxSize?.bytes && totalSize > policy.maxSize.bytes) {
      return true;
    }

    if (policy.maxSize?.percentage) {
      const entrySize = this.calculateStorageSize([entry]);
      const percentage = (entrySize / totalSize) * 100;
      return percentage > policy.maxSize.percentage;
    }

    return false;
  }

  private isEntryEligibleForComplianceBasedRetention(
    entry: AuditTrailEntry,
    policy: RetentionPolicy
  ): boolean {
    if (!policy.complianceRequirements) return false;

    return policy.complianceRequirements.some(requirement => {
      const entryDate = new Date(entry.timestamp);
      const now = new Date();
      const ageInDays = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);

      // Check minimum retention
      if (ageInDays < requirement.minimumRetention) {
        return false;
      }

      // Check maximum retention
      if (requirement.maximumRetention && ageInDays > requirement.maximumRetention) {
        return true;
      }

      return false;
    });
  }

  private isEntryEligibleForCustomRetention(
    entry: AuditTrailEntry,
    policy: RetentionPolicy
  ): boolean {
    if (!policy.customRules) return false;

    return policy.customRules.some(rule => {
      try {
        // Create a safe evaluation context
        const context = {
          entry,
          now: new Date(),
          policy,
        };
        
        // Simple expression evaluation (in production, use a proper expression evaluator)
        return eval(rule.condition);
      } catch (error) {
        console.error(`Error evaluating custom rule: ${rule.condition}`, error);
        return false;
      }
    });
  }

  private async processBatch(
    batch: AuditTrailEntry[],
    policy: RetentionPolicy,
    result: RetentionExecutionResult
  ): Promise<void> {
    for (const entry of batch) {
      try {
        await this.processEntry(entry, policy, result);
        result.processedEntries++;
      } catch (error) {
        result.errors.push({
          entryId: entry.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        });
        result.errorEntries++;
      }
    }
  }

  private async processEntry(
    entry: AuditTrailEntry,
    policy: RetentionPolicy,
    result: RetentionExecutionResult
  ): Promise<void> {
    for (const action of policy.actions) {
      switch (action) {
        case RetentionAction.ARCHIVE:
          await this.archiveEntry(entry);
          result.archivedEntries++;
          break;
        case RetentionAction.DELETE:
          await this.deleteEntry(entry);
          result.deletedEntries++;
          break;
        case RetentionAction.COMPRESS:
          await this.compressEntry(entry);
          result.compressedEntries++;
          break;
        case RetentionAction.ENCRYPT:
          await this.encryptEntry(entry);
          result.encryptedEntries++;
          break;
        case RetentionAction.EXPORT:
          await this.exportEntry(entry);
          result.exportedEntries++;
          break;
        case RetentionAction.HOLD:
          await this.holdEntry(entry);
          result.heldEntries++;
          break;
        case RetentionAction.NOTIFY:
          await this.notifyEntry(entry);
          break;
      }
    }
  }

  private async archiveEntry(entry: AuditTrailEntry): Promise<void> {
    // In a real implementation, this would move the entry to archive storage
    (entry as any).archived = true;
    (entry as any).archivedAt = new Date().toISOString();
  }

  private async deleteEntry(entry: AuditTrailEntry): Promise<void> {
    // In a real implementation, this would securely delete the entry
    // For now, we'll mark it as deleted
    (entry as any).deleted = true;
    (entry as any).deletedAt = new Date().toISOString();
  }

  private async compressEntry(entry: AuditTrailEntry): Promise<void> {
    // In a real implementation, this would compress the entry data
    (entry as any).compressed = true;
    (entry as any).compressedAt = new Date().toISOString();
  }

  private async encryptEntry(entry: AuditTrailEntry): Promise<void> {
    // In a real implementation, this would encrypt the entry data
    (entry as any).encrypted = true;
    (entry as any).encryptedAt = new Date().toISOString();
  }

  private async exportEntry(entry: AuditTrailEntry): Promise<void> {
    // In a real implementation, this would export the entry to external storage
    (entry as any).exported = true;
    (entry as any).exportedAt = new Date().toISOString();
  }

  private async holdEntry(entry: AuditTrailEntry): Promise<void> {
    // In a real implementation, this would place a legal hold on the entry
    (entry as any).legalHold = true;
    (entry as any).holdPlacedAt = new Date().toISOString();
  }

  private async notifyEntry(entry: AuditTrailEntry): Promise<void> {
    // In a real implementation, this would send notifications
    console.log(`Notification sent for entry: ${entry.id}`);
  }

  private checkEntryForViolations(entry: AuditTrailEntry, policy: RetentionPolicy): RetentionViolation | null {
    const entryDate = new Date(entry.timestamp);
    const now = new Date();
    const ageInDays = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);

    // Check compliance requirements
    if (policy.complianceRequirements) {
      for (const requirement of policy.complianceRequirements) {
        if (ageInDays < requirement.minimumRetention) {
          return {
            id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            policyId: policy.id,
            entryId: entry.id,
            violationType: 'retention_too_short',
            severity: 'high',
            description: `Entry ${entry.id} is ${ageInDays.toFixed(0)} days old, but ${requirement.regulation} requires minimum ${requirement.minimumRetention} days retention`,
            detectedAt: new Date(),
            complianceImpact: [requirement.regulation],
          };
        }

        if (requirement.maximumRetention && ageInDays > requirement.maximumRetention) {
          return {
            id: `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            policyId: policy.id,
            entryId: entry.id,
            violationType: 'retention_too_long',
            severity: 'medium',
            description: `Entry ${entry.id} is ${ageInDays.toFixed(0)} days old, exceeding ${requirement.regulation} maximum ${requirement.maximumRetention} days retention`,
            detectedAt: new Date(),
            complianceImpact: [requirement.regulation],
          };
        }
      }
    }

    return null;
  }

  private checkComplianceStatus(policy: RetentionPolicy, result: RetentionExecutionResult): Array<{
    regulation: string;
    status: 'compliant' | 'non_compliant' | 'warning';
    details: string;
  }> {
    const status: Array<{
      regulation: string;
      status: 'compliant' | 'non_compliant' | 'warning';
      details: string;
    }> = [];

    if (policy.complianceRequirements) {
      for (const requirement of policy.complianceRequirements) {
        if (result.errorEntries > 0) {
          status.push({
            regulation: requirement.regulation,
            status: 'non_compliant',
            details: `${result.errorEntries} entries failed processing, potentially affecting compliance`,
          });
        } else if (result.warnings.length > 0) {
          status.push({
            regulation: requirement.regulation,
            status: 'warning',
            details: `${result.warnings.length} warnings during processing`,
          });
        } else {
          status.push({
            regulation: requirement.regulation,
            status: 'compliant',
            details: 'All entries processed successfully',
          });
        }
      }
    }

    return status;
  }

  private calculateStorageSize(entries: AuditTrailEntry[]): number {
    return entries.reduce((total, entry) => {
      return total + JSON.stringify(entry).length;
    }, 0);
  }

  private getNestedFieldValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private evaluateCondition(value: any, operator: string, expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === expectedValue;
      case 'contains':
        return value && value.toString().includes(expectedValue.toString());
      case 'greater_than':
        return parseFloat(value) > parseFloat(expectedValue);
      case 'less_than':
        return parseFloat(value) < parseFloat(expectedValue);
      default:
        return false;
    }
  }

  private updateAnalytics(): void {
    try {
      const policies = this.getRetentionPolicies();
      const entries = auditTrailService.getAuditEntries() || [];

      this.analytics.totalPolicies = policies.length;
      this.analytics.activePolicies = policies.filter(p => p.enabled).length;
      this.analytics.totalEntries = entries.length;
      this.analytics.retainedEntries = entries.filter(e => !(e as any).deleted).length;
      this.analytics.archivedEntries = entries.filter(e => (e as any).archived).length;
      this.analytics.deletedEntries = entries.filter(e => (e as any).deleted).length;
      this.analytics.totalStorageUsed = this.calculateStorageSize(entries);
      this.analytics.archivedStorageUsed = this.calculateStorageSize(entries.filter(e => (e as any).archived));

      // Calculate success rate
      const totalExecutions = this.executionHistory.length;
      const successfulExecutions = this.executionHistory.filter(e => e.success).length;
      this.analytics.successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
      this.analytics.errorRate = 100 - this.analytics.successRate;

      // Calculate average execution time
      if (this.executionHistory.length > 0) {
        const totalTime = this.executionHistory.reduce((sum, e) => sum + e.duration, 0);
        this.analytics.averageExecutionTime = totalTime / this.executionHistory.length;
      }
    } catch (error) {
      // Silently handle analytics update errors (e.g., during testing)
      console.warn('Failed to update analytics:', error);
    }
  }

  private exportToCSV(data: any): string {
    // Simple CSV export implementation
    const policies = data.policies;
    const headers = ['ID', 'Name', 'Type', 'Enabled', 'Priority', 'Created At'];
    const rows = policies.map((policy: RetentionPolicy) => [
      policy.id,
      policy.name,
      policy.type,
      policy.enabled,
      policy.priority,
      policy.createdAt,
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToXML(data: any): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<retentionData>\n';
    xml += `  <exportedAt>${data.exportedAt}</exportedAt>\n`;
    xml += `  <policies count="${data.policies.length}">\n`;
    
    data.policies.forEach((policy: RetentionPolicy) => {
      xml += `    <policy id="${policy.id}">\n`;
      xml += `      <name>${policy.name}</name>\n`;
      xml += `      <type>${policy.type}</type>\n`;
      xml += `      <enabled>${policy.enabled}</enabled>\n`;
      xml += `    </policy>\n`;
    });
    
    xml += '  </policies>\n';
    xml += '</retentionData>';
    return xml;
  }
}

// Export singleton instance
export const auditTrailRetentionService = new AuditTrailRetentionService();
