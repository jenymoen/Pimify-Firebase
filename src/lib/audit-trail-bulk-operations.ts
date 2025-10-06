import { auditTrailService, AuditTrailAction, AuditTrailPriority } from './audit-trail-service';
import { auditTrailPerformanceService } from './audit-trail-performance';
import { UserRole, WorkflowState, AuditTrailEntry, ProductWorkflow } from '../types/workflow';
import * as crypto from 'crypto';

/**
 * Bulk operation types
 */
export enum BulkOperationType {
  PRODUCT_APPROVAL = 'product_approval',
  PRODUCT_REJECTION = 'product_rejection',
  PRODUCT_PUBLICATION = 'product_publication',
  PRODUCT_ARCHIVAL = 'product_archival',
  PRODUCT_DELETION = 'product_deletion',
  PRODUCT_ASSIGNMENT = 'product_assignment',
  PRODUCT_STATE_CHANGE = 'product_state_change',
  USER_ROLE_CHANGE = 'user_role_change',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  CUSTOM = 'custom',
}

/**
 * Bulk operation status
 */
export enum BulkOperationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PARTIALLY_COMPLETED = 'partially_completed',
}

/**
 * Bulk operation result for individual items
 */
export interface BulkOperationItemResult {
  itemId: string;
  itemType: 'product' | 'user' | 'permission' | 'data' | 'system';
  success: boolean;
  error?: string;
  changes?: Record<string, any>;
  timestamp: Date;
  processingTime: number; // milliseconds
}

/**
 * Bulk operation configuration
 */
export interface BulkOperationConfig {
  id: string;
  name: string;
  description: string;
  type: BulkOperationType;
  status: BulkOperationStatus;
  createdBy: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  
  // Operation details
  operation: {
    action: string;
    parameters: Record<string, any>;
    filters: {
      dateRange?: {
        start: Date;
        end: Date;
      };
      users?: string[];
      products?: string[];
      states?: WorkflowState[];
      priorities?: AuditTrailPriority[];
      customFilters?: Record<string, any>;
    };
    options: {
      batchSize: number;
      maxConcurrency: number;
      retryAttempts: number;
      retryDelay: number; // milliseconds
      continueOnError: boolean;
      validateBeforeExecution: boolean;
      dryRun: boolean;
    };
  };
  
  // Progress tracking
  progress: {
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    skippedItems: number;
    currentBatch: number;
    totalBatches: number;
    percentage: number; // 0-100
    estimatedTimeRemaining: number; // milliseconds
  };
  
  // Results
  results: {
    items: BulkOperationItemResult[];
    summary: {
      totalProcessed: number;
      totalSuccessful: number;
      totalFailed: number;
      totalSkipped: number;
      averageProcessingTime: number;
      totalProcessingTime: number;
    };
    errors: Array<{
      itemId: string;
      error: string;
      timestamp: Date;
      retryCount: number;
    }>;
    warnings: Array<{
      itemId: string;
      warning: string;
      timestamp: Date;
    }>;
  };
  
  // Audit trail
  auditTrail: {
    operationId: string;
    entries: string[]; // Audit trail entry IDs
    summary: string;
    details: Record<string, any>;
  };
  
  // Performance metrics
  performance: {
    startTime: Date;
    endTime?: Date;
    totalDuration: number; // milliseconds
    averageItemTime: number; // milliseconds
    peakMemoryUsage: number; // bytes
    databaseQueries: number;
    cacheHits: number;
    cacheMisses: number;
  };
  
  // Notifications
  notifications: {
    enabled: boolean;
    recipients: string[];
    events: ('started' | 'progress' | 'completed' | 'failed' | 'cancelled')[];
    channels: ('email' | 'webhook' | 'slack' | 'teams')[];
    webhookUrl?: string;
  };
}

/**
 * Bulk operation template
 */
export interface BulkOperationTemplate {
  id: string;
  name: string;
  description: string;
  type: BulkOperationType;
  operation: {
    action: string;
    parameters: Record<string, any>;
    options: BulkOperationConfig['operation']['options'];
  };
  filters: BulkOperationConfig['operation']['filters'];
  notifications: BulkOperationConfig['notifications'];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  usageCount: number;
  enabled: boolean;
}

/**
 * Bulk operation statistics
 */
export interface BulkOperationStatistics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  cancelledOperations: number;
  totalItemsProcessed: number;
  totalItemsSuccessful: number;
  totalItemsFailed: number;
  averageOperationTime: number; // milliseconds
  averageItemsPerOperation: number;
  operationTypeDistribution: Record<BulkOperationType, number>;
  userDistribution: Array<{
    userId: string;
    operationCount: number;
    successRate: number;
  }>;
  performanceTrends: Array<{
    date: Date;
    operationCount: number;
    averageTime: number;
    successRate: number;
  }>;
  errorAnalysis: Array<{
    error: string;
    count: number;
    operationTypes: BulkOperationType[];
    lastOccurred: Date;
  }>;
}

/**
 * Audit Trail Bulk Operations Service
 * Comprehensive bulk operation management with audit trail logging
 */
export class AuditTrailBulkOperationsService {
  private operations: Map<string, BulkOperationConfig> = new Map();
  private templates: Map<string, BulkOperationTemplate> = new Map();
  private statistics: BulkOperationStatistics;
  private isProcessing: boolean = false;
  private processingQueue: string[] = [];

  constructor() {
    this.statistics = this.initializeStatistics();
    this.initializeDefaultTemplates();
    this.startBulkOperationProcessor();
  }

  /**
   * Create a new bulk operation
   */
  createBulkOperation(
    name: string,
    description: string,
    type: BulkOperationType,
    createdBy: string,
    config: Partial<BulkOperationConfig> = {}
  ): BulkOperationConfig {
    const operation: BulkOperationConfig = {
      id: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      type,
      status: BulkOperationStatus.PENDING,
      createdBy,
      createdAt: new Date(),
      operation: {
        action: '',
        parameters: {},
        filters: {},
        options: {
          batchSize: 100,
          maxConcurrency: 5,
          retryAttempts: 3,
          retryDelay: 1000,
          continueOnError: true,
          validateBeforeExecution: true,
          dryRun: false,
        },
      },
      progress: {
        totalItems: 0,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        skippedItems: 0,
        currentBatch: 0,
        totalBatches: 0,
        percentage: 0,
        estimatedTimeRemaining: 0,
      },
      results: {
        items: [],
        summary: {
          totalProcessed: 0,
          totalSuccessful: 0,
          totalFailed: 0,
          totalSkipped: 0,
          averageProcessingTime: 0,
          totalProcessingTime: 0,
        },
        errors: [],
        warnings: [],
      },
      auditTrail: {
        operationId: '',
        entries: [],
        summary: '',
        details: {},
      },
      performance: {
        startTime: new Date(),
        peakMemoryUsage: 0,
        databaseQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalDuration: 0,
        averageItemTime: 0,
      },
      notifications: {
        enabled: false,
        recipients: [],
        events: ['completed', 'failed'],
        channels: ['email'],
      },
      ...config,
    };

    this.operations.set(operation.id, operation);
    this.processingQueue.push(operation.id);
    this.updateStatistics();
    return operation;
  }

  /**
   * Create a bulk operation from a template
   */
  createBulkOperationFromTemplate(
    templateId: string,
    name: string,
    description: string,
    createdBy: string,
    overrides: Partial<BulkOperationConfig> = {}
  ): BulkOperationConfig {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Bulk operation template not found: ${templateId}`);
    }

    // Update template usage
    template.lastUsed = new Date();
    template.usageCount++;

    const operation: BulkOperationConfig = {
      id: `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      type: template.type,
      status: BulkOperationStatus.PENDING,
      createdBy,
      createdAt: new Date(),
      operation: {
        action: overrides.operation?.action || template.operation.action,
        parameters: { ...template.operation.parameters, ...overrides.operation?.parameters },
        filters: { ...template.filters, ...overrides.operation?.filters },
        options: { ...template.operation.options, ...overrides.operation?.options },
      },
      progress: {
        totalItems: 0,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        skippedItems: 0,
        currentBatch: 0,
        totalBatches: 0,
        percentage: 0,
        estimatedTimeRemaining: 0,
      },
      results: {
        items: [],
        summary: {
          totalProcessed: 0,
          totalSuccessful: 0,
          totalFailed: 0,
          totalSkipped: 0,
          averageProcessingTime: 0,
          totalProcessingTime: 0,
        },
        errors: [],
        warnings: [],
      },
      auditTrail: {
        operationId: '',
        entries: [],
        summary: '',
        details: {},
      },
      performance: {
        startTime: new Date(),
        peakMemoryUsage: 0,
        databaseQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalDuration: 0,
        averageItemTime: 0,
      },
      notifications: { ...template.notifications },
      ...overrides,
    };

    this.operations.set(operation.id, operation);
    this.processingQueue.push(operation.id);
    this.updateStatistics();
    return operation;
  }

  /**
   * Create a bulk operation template
   */
  createBulkOperationTemplate(
    name: string,
    description: string,
    type: BulkOperationType,
    createdBy: string,
    config: Partial<BulkOperationTemplate> = {}
  ): BulkOperationTemplate {
    const template: BulkOperationTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      type,
      operation: {
        action: '',
        parameters: {},
        options: {
          batchSize: 100,
          maxConcurrency: 5,
          retryAttempts: 3,
          retryDelay: 1000,
          continueOnError: true,
          validateBeforeExecution: true,
          dryRun: false,
        },
      },
      filters: {},
      notifications: {
        enabled: false,
        recipients: [],
        events: ['completed', 'failed'],
        channels: ['email'],
      },
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      enabled: true,
      ...config,
    };

    this.templates.set(template.id, template);
    return template;
  }

  /**
   * Update an existing bulk operation template
   */
  updateBulkOperationTemplate(templateId: string, updates: Partial<BulkOperationTemplate>): BulkOperationTemplate {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Bulk operation template not found: ${templateId}`);
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date(),
    };

    this.templates.set(templateId, updatedTemplate);
    return updatedTemplate;
  }

  /**
   * Delete a bulk operation template
   */
  deleteBulkOperationTemplate(templateId: string): boolean {
    return this.templates.delete(templateId);
  }

  /**
   * Get all bulk operation templates
   */
  getBulkOperationTemplates(): BulkOperationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get a specific bulk operation template
   */
  getBulkOperationTemplate(templateId: string): BulkOperationTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get a bulk operation
   */
  getBulkOperation(operationId: string): BulkOperationConfig | undefined {
    return this.operations.get(operationId);
  }

  /**
   * Get all bulk operations
   */
  getBulkOperations(limit?: number): BulkOperationConfig[] {
    const operations = Array.from(this.operations.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return limit ? operations.slice(0, limit) : operations;
  }

  /**
   * Cancel a bulk operation
   */
  cancelBulkOperation(operationId: string): boolean {
    const operation = this.operations.get(operationId);
    if (!operation) {
      return false;
    }

    if (operation.status === BulkOperationStatus.PENDING || operation.status === BulkOperationStatus.PROCESSING) {
      operation.status = BulkOperationStatus.CANCELLED;
      operation.cancelledAt = new Date();
      operation.performance.endTime = new Date();
      operation.performance.totalDuration = operation.performance.endTime.getTime() - operation.performance.startTime.getTime();

      // Remove from processing queue
      const index = this.processingQueue.indexOf(operationId);
      if (index > -1) {
        this.processingQueue.splice(index, 1);
      }

      // Create audit trail entry
      this.createBulkOperationAuditEntry(operation, 'cancelled');

      this.updateStatistics();
      return true;
    }

    return false;
  }

  /**
   * Get bulk operation statistics
   */
  getBulkOperationStatistics(): BulkOperationStatistics {
    return { ...this.statistics };
  }

  /**
   * Execute a bulk operation
   */
  async executeBulkOperation(operationId: string): Promise<BulkOperationConfig> {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Bulk operation not found: ${operationId}`);
    }

    if (operation.status !== BulkOperationStatus.PENDING) {
      throw new Error(`Bulk operation is not in pending status: ${operation.status}`);
    }

    try {
      operation.status = BulkOperationStatus.PROCESSING;
      operation.startedAt = new Date();
      operation.performance.startTime = new Date();

      // Create initial audit trail entry
      this.createBulkOperationAuditEntry(operation, 'started');

      // Get items to process
      const items = await this.getItemsForBulkOperation(operation);
      operation.progress.totalItems = items.length;
      operation.progress.totalBatches = Math.ceil(items.length / operation.operation.options.batchSize);

      // Process items in batches
      await this.processBulkOperationBatches(operation, items);

      // Finalize operation
      operation.status = operation.results.summary.totalFailed > 0 && operation.results.summary.totalSuccessful > 0
        ? BulkOperationStatus.PARTIALLY_COMPLETED
        : operation.results.summary.totalFailed > 0
        ? BulkOperationStatus.FAILED
        : BulkOperationStatus.COMPLETED;

      operation.completedAt = new Date();
      operation.performance.endTime = new Date();
      operation.performance.totalDuration = operation.performance.endTime.getTime() - operation.performance.startTime.getTime();
      operation.performance.averageItemTime = operation.results.summary.totalProcessed > 0
        ? operation.performance.totalDuration / operation.results.summary.totalProcessed
        : 0;

      // Create final audit trail entry
      this.createBulkOperationAuditEntry(operation, 'completed');

      // Send notifications
      await this.sendBulkOperationNotifications(operation);

    } catch (error) {
      operation.status = BulkOperationStatus.FAILED;
      operation.completedAt = new Date();
      operation.performance.endTime = new Date();
      operation.performance.totalDuration = operation.performance.endTime.getTime() - operation.performance.startTime.getTime();

      // Create error audit trail entry
      this.createBulkOperationAuditEntry(operation, 'failed', error instanceof Error ? error.message : 'Unknown error');

      // Send failure notifications
      await this.sendBulkOperationNotifications(operation);
    } finally {
      this.updateStatistics();
    }

    return operation;
  }

  // Private helper methods

  private initializeStatistics(): BulkOperationStatistics {
    return {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      cancelledOperations: 0,
      totalItemsProcessed: 0,
      totalItemsSuccessful: 0,
      totalItemsFailed: 0,
      averageOperationTime: 0,
      averageItemsPerOperation: 0,
      operationTypeDistribution: {} as Record<BulkOperationType, number>,
      userDistribution: [],
      performanceTrends: [],
      errorAnalysis: [],
    };
  }

  private initializeDefaultTemplates(): void {
    // Product approval template
    this.createBulkOperationTemplate(
      'Product Approval Template',
      'Template for bulk product approval operations',
      BulkOperationType.PRODUCT_APPROVAL,
      'system',
      {
        operation: {
          action: 'approve_products',
          parameters: {
            reason: 'Bulk approval operation',
            notifyUsers: true,
          },
          options: {
            batchSize: 50,
            maxConcurrency: 3,
            retryAttempts: 2,
            retryDelay: 2000,
            continueOnError: true,
            validateBeforeExecution: true,
            dryRun: false,
          },
        },
        filters: {
          states: [WorkflowState.REVIEW],
          priorities: [AuditTrailPriority.HIGH, AuditTrailPriority.CRITICAL],
        },
        notifications: {
          enabled: true,
          recipients: ['admin@example.com'],
          events: ['completed', 'failed'],
          channels: ['email'],
        },
      }
    );

    // Product rejection template
    this.createBulkOperationTemplate(
      'Product Rejection Template',
      'Template for bulk product rejection operations',
      BulkOperationType.PRODUCT_REJECTION,
      'system',
      {
        operation: {
          action: 'reject_products',
          parameters: {
            reason: 'Bulk rejection operation',
            notifyUsers: true,
          },
          options: {
            batchSize: 50,
            maxConcurrency: 3,
            retryAttempts: 2,
            retryDelay: 2000,
            continueOnError: true,
            validateBeforeExecution: true,
            dryRun: false,
          },
        },
        filters: {
          states: [WorkflowState.REVIEW],
        },
        notifications: {
          enabled: true,
          recipients: ['admin@example.com'],
          events: ['completed', 'failed'],
          channels: ['email'],
        },
      }
    );

    // Data export template
    this.createBulkOperationTemplate(
      'Data Export Template',
      'Template for bulk data export operations',
      BulkOperationType.DATA_EXPORT,
      'system',
      {
        operation: {
          action: 'export_data',
          parameters: {
            format: 'json',
            includeMetadata: true,
            compression: true,
          },
          options: {
            batchSize: 1000,
            maxConcurrency: 2,
            retryAttempts: 3,
            retryDelay: 5000,
            continueOnError: false,
            validateBeforeExecution: true,
            dryRun: false,
          },
        },
        filters: {},
        notifications: {
          enabled: true,
          recipients: ['admin@example.com'],
          events: ['completed', 'failed'],
          channels: ['email'],
        },
      }
    );
  }

  private startBulkOperationProcessor(): void {
    // Process bulk operations every 10 seconds
    setInterval(async () => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        this.isProcessing = true;
        try {
          await this.processBulkOperationQueue();
        } catch (error) {
          console.error('Bulk operation processor error:', error);
        } finally {
          this.isProcessing = false;
        }
      }
    }, 10000);
  }

  private async processBulkOperationQueue(): Promise<void> {
    while (this.processingQueue.length > 0) {
      const operationId = this.processingQueue.shift();
      if (operationId) {
        try {
          await this.executeBulkOperation(operationId);
        } catch (error) {
          console.error(`Failed to execute bulk operation ${operationId}:`, error);
        }
      }
    }
  }

  private async getItemsForBulkOperation(operation: BulkOperationConfig): Promise<any[]> {
    // In a real implementation, this would query the database based on filters
    const mockItems = [
      { id: 'item-1', type: 'product', data: {} },
      { id: 'item-2', type: 'product', data: {} },
      { id: 'item-3', type: 'product', data: {} },
    ];

    return mockItems.filter(item => {
      // Apply filters
      if (operation.operation.filters.products && operation.operation.filters.products.length > 0 && !operation.operation.filters.products.includes(item.id)) {
        return false;
      }

      return true;
    });
  }

  private async processBulkOperationBatches(operation: BulkOperationConfig, items: any[]): Promise<void> {
    const { batchSize, maxConcurrency } = operation.operation.options;
    const batches = this.createBatches(items, batchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      operation.progress.currentBatch = i + 1;

      // Process batch with concurrency control
      await this.processBatch(operation, batch);

      // Update progress
      operation.progress.percentage = Math.round((operation.progress.processedItems / operation.progress.totalItems) * 100);
      operation.progress.estimatedTimeRemaining = this.calculateEstimatedTimeRemaining(operation);

      // Create progress audit trail entry
      this.createBulkOperationAuditEntry(operation, 'progress');
    }
  }

  private createBatches(items: any[], batchSize: number): any[][] {
    const batches: any[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async processBatch(operation: BulkOperationConfig, batch: any[]): Promise<void> {
    const { maxConcurrency, retryAttempts, retryDelay, continueOnError } = operation.operation.options;

    // Process items in parallel with concurrency control
    const promises = batch.map(async (item) => {
      let attempts = 0;
      let lastError: Error | null = null;

      while (attempts <= retryAttempts) {
        try {
          const startTime = Date.now();
          const result = await this.processBulkOperationItem(operation, item);
          const processingTime = Date.now() - startTime;

          const itemResult: BulkOperationItemResult = {
            itemId: item.id,
            itemType: item.type,
            success: true,
            changes: result,
            timestamp: new Date(),
            processingTime,
          };

          operation.results.items.push(itemResult);
          operation.progress.processedItems++;
          operation.progress.successfulItems++;
          operation.results.summary.totalProcessed++;
          operation.results.summary.totalSuccessful++;

          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          attempts++;

          if (attempts <= retryAttempts) {
            await this.delay(retryDelay);
          }
        }
      }

      // All retry attempts failed
      const itemResult: BulkOperationItemResult = {
        itemId: item.id,
        itemType: item.type,
        success: false,
        error: lastError?.message || 'Unknown error',
        timestamp: new Date(),
        processingTime: 0,
      };

      operation.results.items.push(itemResult);
      operation.progress.processedItems++;
      operation.progress.failedItems++;
      operation.results.summary.totalProcessed++;
      operation.results.summary.totalFailed++;

      operation.results.errors.push({
        itemId: item.id,
        error: lastError?.message || 'Unknown error',
        timestamp: new Date(),
        retryCount: retryAttempts,
      });

      if (!continueOnError) {
        throw lastError;
      }
    });

    await Promise.all(promises);
  }

  private async processBulkOperationItem(operation: BulkOperationConfig, item: any): Promise<any> {
    // In a real implementation, this would perform the actual operation
    switch (operation.type) {
      case BulkOperationType.PRODUCT_APPROVAL:
        return this.approveProduct(item);
      case BulkOperationType.PRODUCT_REJECTION:
        return this.rejectProduct(item);
      case BulkOperationType.PRODUCT_PUBLICATION:
        return this.publishProduct(item);
      case BulkOperationType.DATA_EXPORT:
        return this.exportData(item);
      default:
        throw new Error(`Unsupported bulk operation type: ${operation.type}`);
    }
  }

  private async approveProduct(item: any): Promise<any> {
    // Simulate product approval
    await this.delay(100);
    return { status: 'approved', approvedAt: new Date() };
  }

  private async rejectProduct(item: any): Promise<any> {
    // Simulate product rejection
    await this.delay(100);
    return { status: 'rejected', rejectedAt: new Date() };
  }

  private async publishProduct(item: any): Promise<any> {
    // Simulate product publication
    await this.delay(100);
    return { status: 'published', publishedAt: new Date() };
  }

  private async exportData(item: any): Promise<any> {
    // Simulate data export
    await this.delay(200);
    return { exported: true, exportedAt: new Date() };
  }

  private calculateEstimatedTimeRemaining(operation: BulkOperationConfig): number {
    if (operation.progress.processedItems === 0) {
      return 0;
    }

    const averageTimePerItem = operation.performance.totalDuration / operation.progress.processedItems;
    const remainingItems = operation.progress.totalItems - operation.progress.processedItems;
    return averageTimePerItem * remainingItems;
  }

  private createBulkOperationAuditEntry(
    operation: BulkOperationConfig,
    event: 'started' | 'progress' | 'completed' | 'failed' | 'cancelled',
    error?: string
  ): void {
    const auditEntry = auditTrailService.createBulkOperationEntry(
      operation.id,
      operation.type,
      operation.createdBy,
      UserRole.ADMIN, // Assuming admin for bulk operations
      `Bulk operation ${event}: ${operation.name}`,
      {
        operationId: operation.id,
        operationType: operation.type,
        event,
        progress: operation.progress,
        results: operation.results,
        performance: operation.performance,
        error,
      },
      AuditTrailPriority.HIGH
    );

    operation.auditTrail.entries.push(auditEntry.id);
  }

  private async sendBulkOperationNotifications(operation: BulkOperationConfig): Promise<void> {
    if (!operation.notifications.enabled) {
      return;
    }

    const event = operation.status === BulkOperationStatus.COMPLETED ? 'completed' :
                 operation.status === BulkOperationStatus.FAILED ? 'failed' :
                 operation.status === BulkOperationStatus.CANCELLED ? 'cancelled' : 'progress';

    if (!operation.notifications.events.includes(event)) {
      return;
    }

    // In a real implementation, this would send actual notifications
    console.log(`Sending ${event} notification for bulk operation ${operation.id}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateStatistics(): void {
    const operations = Array.from(this.operations.values());

    this.statistics.totalOperations = operations.length;
    this.statistics.successfulOperations = operations.filter(o => o.status === BulkOperationStatus.COMPLETED).length;
    this.statistics.failedOperations = operations.filter(o => o.status === BulkOperationStatus.FAILED).length;
    this.statistics.cancelledOperations = operations.filter(o => o.status === BulkOperationStatus.CANCELLED).length;

    this.statistics.totalItemsProcessed = operations.reduce((sum, o) => sum + o.results.summary.totalProcessed, 0);
    this.statistics.totalItemsSuccessful = operations.reduce((sum, o) => sum + o.results.summary.totalSuccessful, 0);
    this.statistics.totalItemsFailed = operations.reduce((sum, o) => sum + o.results.summary.totalFailed, 0);

    const completedOperations = operations.filter(o => o.status === BulkOperationStatus.COMPLETED);
    this.statistics.averageOperationTime = completedOperations.length > 0
      ? completedOperations.reduce((sum, o) => sum + o.performance.totalDuration, 0) / completedOperations.length
      : 0;

    this.statistics.averageItemsPerOperation = operations.length > 0
      ? this.statistics.totalItemsProcessed / operations.length
      : 0;

    // Update operation type distribution
    this.statistics.operationTypeDistribution = operations.reduce((dist, op) => {
      dist[op.type] = (dist[op.type] || 0) + 1;
      return dist;
    }, {} as Record<BulkOperationType, number>);

    // Update user distribution
    const userStats = operations.reduce((stats, op) => {
      if (!stats[op.createdBy]) {
        stats[op.createdBy] = { count: 0, successful: 0 };
      }
      stats[op.createdBy].count++;
      if (op.status === BulkOperationStatus.COMPLETED) {
        stats[op.createdBy].successful++;
      }
      return stats;
    }, {} as Record<string, { count: number; successful: number }>);

    this.statistics.userDistribution = Object.entries(userStats).map(([userId, stats]) => ({
      userId,
      operationCount: stats.count,
      successRate: (stats.successful / stats.count) * 100,
    }));

    // Update error analysis
    const errorStats = operations.reduce((stats, op) => {
      op.results.errors.forEach(error => {
        if (!stats[error.error]) {
          stats[error.error] = { count: 0, operationTypes: new Set(), lastOccurred: error.timestamp };
        }
        stats[error.error].count++;
        stats[error.error].operationTypes.add(op.type);
        if (error.timestamp > stats[error.error].lastOccurred) {
          stats[error.error].lastOccurred = error.timestamp;
        }
      });
      return stats;
    }, {} as Record<string, { count: number; operationTypes: Set<BulkOperationType>; lastOccurred: Date }>);

    this.statistics.errorAnalysis = Object.entries(errorStats).map(([error, stats]) => ({
      error,
      count: stats.count,
      operationTypes: Array.from(stats.operationTypes),
      lastOccurred: stats.lastOccurred,
    }));
  }
}

// Export singleton instance
export const auditTrailBulkOperationsService = new AuditTrailBulkOperationsService();
