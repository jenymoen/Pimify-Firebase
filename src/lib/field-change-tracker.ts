import { FieldChange } from '../types/workflow';

/**
 * Field change types for different kinds of modifications
 */
export enum FieldChangeType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  RESTORED = 'restored',
  MOVED = 'moved',
  COPIED = 'copied',
  MERGED = 'merged',
  SPLIT = 'split',
  TRANSFORMED = 'transformed',
}

/**
 * Field change severity levels
 */
export enum FieldChangeSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Field change categories for grouping related changes
 */
export enum FieldChangeCategory {
  BASIC_INFO = 'basic_info',
  PRICING = 'pricing',
  INVENTORY = 'inventory',
  MEDIA = 'media',
  SEO = 'seo',
  WORKFLOW = 'workflow',
  METADATA = 'metadata',
  RELATIONSHIPS = 'relationships',
  CUSTOM_FIELDS = 'custom_fields',
}

/**
 * Enhanced field change with additional metadata
 */
export interface EnhancedFieldChange extends FieldChange {
  /** Type of change */
  changeType: FieldChangeType;
  
  /** Severity of the change */
  severity: FieldChangeSeverity;
  
  /** Category of the field */
  category: FieldChangeCategory;
  
  /** Whether this change affects external systems */
  affectsExternalSystems: boolean;
  
  /** Whether this change requires approval */
  requiresApproval: boolean;
  
  /** Whether this change is reversible */
  reversible: boolean;
  
  /** Additional metadata about the change */
  metadata?: {
    /** Data type of the field */
    dataType?: string;
    
    /** Validation rules that were applied */
    validationRules?: string[];
    
    /** Whether the change was automatic or manual */
    automatic?: boolean;
    
    /** Source of the change */
    source?: string;
    
    /** Related field changes */
    relatedChanges?: string[];
    
    /** Impact analysis */
    impact?: {
      /** Fields that might be affected by this change */
      affectedFields?: string[];
      
      /** Systems that might be affected */
      affectedSystems?: string[];
      
      /** Business impact level */
      businessImpact?: 'low' | 'medium' | 'high' | 'critical';
    };
  };
}

/**
 * Field change analysis result
 */
export interface FieldChangeAnalysis {
  /** Total number of changes */
  totalChanges: number;
  
  /** Changes by type */
  changesByType: Record<FieldChangeType, number>;
  
  /** Changes by severity */
  changesBySeverity: Record<FieldChangeSeverity, number>;
  
  /** Changes by category */
  changesByCategory: Record<FieldChangeCategory, number>;
  
  /** Critical changes that require attention */
  criticalChanges: EnhancedFieldChange[];
  
  /** Changes that affect external systems */
  externalSystemChanges: EnhancedFieldChange[];
  
  /** Changes that require approval */
  approvalRequiredChanges: EnhancedFieldChange[];
  
  /** Irreversible changes */
  irreversibleChanges: EnhancedFieldChange[];
  
  /** Summary of business impact */
  businessImpact: {
    level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedSystems: string[];
  };
}

/**
 * Field change validation result
 */
export interface FieldChangeValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Field Change Tracker
 * Advanced field-level change tracking and analysis system
 */
export class FieldChangeTracker {
  private fieldConfigurations: Map<string, FieldConfiguration> = new Map();
  private changeHistory: Map<string, EnhancedFieldChange[]> = new Map();
  private validationRules: Map<string, ValidationRule[]> = new Map();

  constructor() {
    this.initializeDefaultConfigurations();
    this.initializeDefaultValidationRules();
  }

  /**
   * Track field changes with enhanced analysis
   */
  trackFieldChanges(
    entityId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    context?: {
      userId?: string;
      userRole?: string;
      action?: string;
      source?: string;
      automatic?: boolean;
    }
  ): EnhancedFieldChange[] {
    const changes: EnhancedFieldChange[] = [];
    const allFields = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const field of allFields) {
      const oldValue = oldData[field];
      const newValue = newData[field];
      
      if (this.hasChanged(oldValue, newValue)) {
        const change = this.createEnhancedFieldChange(
          field,
          oldValue,
          newValue,
          context
        );
        changes.push(change);
      }
    }

    // Store changes in history
    this.storeChangeHistory(entityId, changes);

    return changes;
  }

  /**
   * Analyze field changes for patterns and impact
   */
  analyzeFieldChanges(changes: EnhancedFieldChange[]): FieldChangeAnalysis {
    const analysis: FieldChangeAnalysis = {
      totalChanges: changes.length,
      changesByType: {} as Record<FieldChangeType, number>,
      changesBySeverity: {} as Record<FieldChangeSeverity, number>,
      changesByCategory: {} as Record<FieldChangeCategory, number>,
      criticalChanges: [],
      externalSystemChanges: [],
      approvalRequiredChanges: [],
      irreversibleChanges: [],
      businessImpact: {
        level: 'low',
        description: '',
        affectedSystems: [],
      },
    };

    // Initialize counters
    Object.values(FieldChangeType).forEach(type => {
      analysis.changesByType[type] = 0;
    });
    Object.values(FieldChangeSeverity).forEach(severity => {
      analysis.changesBySeverity[severity] = 0;
    });
    Object.values(FieldChangeCategory).forEach(category => {
      analysis.changesByCategory[category] = 0;
    });

    // Analyze each change
    for (const change of changes) {
      analysis.changesByType[change.changeType]++;
      analysis.changesBySeverity[change.severity]++;
      analysis.changesByCategory[change.category]++;

      if (change.severity === FieldChangeSeverity.CRITICAL) {
        analysis.criticalChanges.push(change);
      }

      if (change.affectsExternalSystems) {
        analysis.externalSystemChanges.push(change);
      }

      if (change.requiresApproval) {
        analysis.approvalRequiredChanges.push(change);
      }

      if (!change.reversible) {
        analysis.irreversibleChanges.push(change);
      }
    }

    // Calculate business impact
    analysis.businessImpact = this.calculateBusinessImpact(changes);

    return analysis;
  }

  /**
   * Validate field changes against business rules
   */
  validateFieldChanges(changes: EnhancedFieldChange[]): FieldChangeValidation {
    const validation: FieldChangeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    for (const change of changes) {
      const fieldValidation = this.validateFieldChange(change);
      
      if (!fieldValidation.isValid) {
        validation.isValid = false;
        validation.errors.push(...fieldValidation.errors);
      }
      
      validation.warnings.push(...fieldValidation.warnings);
      validation.suggestions.push(...fieldValidation.suggestions);
    }

    // Cross-field validation
    const crossFieldValidation = this.validateCrossFieldChanges(changes);
    if (!crossFieldValidation.isValid) {
      validation.isValid = false;
      validation.errors.push(...crossFieldValidation.errors);
    }

    return validation;
  }

  /**
   * Get change history for an entity
   */
  getChangeHistory(entityId: string, options?: {
    limit?: number;
    offset?: number;
    field?: string;
    changeType?: FieldChangeType;
    severity?: FieldChangeSeverity;
    category?: FieldChangeCategory;
  }): EnhancedFieldChange[] {
    const history = this.changeHistory.get(entityId) || [];
    let filteredHistory = [...history];

    // Apply filters
    if (options?.field) {
      filteredHistory = filteredHistory.filter(change => change.field === options.field);
    }
    if (options?.changeType) {
      filteredHistory = filteredHistory.filter(change => change.changeType === options.changeType);
    }
    if (options?.severity) {
      filteredHistory = filteredHistory.filter(change => change.severity === options.severity);
    }
    if (options?.category) {
      filteredHistory = filteredHistory.filter(change => change.category === options.category);
    }

    // Apply pagination
    if (options?.offset || options?.limit) {
      const offset = options.offset || 0;
      const limit = options.limit || 100;
      filteredHistory = filteredHistory.slice(offset, offset + limit);
    }

    return filteredHistory;
  }

  /**
   * Get field change statistics
   */
  getFieldChangeStatistics(entityId?: string): {
    totalChanges: number;
    changesByField: Record<string, number>;
    changesByType: Record<FieldChangeType, number>;
    changesBySeverity: Record<FieldChangeSeverity, number>;
    changesByCategory: Record<FieldChangeCategory, number>;
    mostChangedFields: Array<{ field: string; count: number }>;
    recentChanges: EnhancedFieldChange[];
  } {
    const allChanges = entityId 
      ? this.changeHistory.get(entityId) || []
      : Array.from(this.changeHistory.values()).flat();

    const stats = {
      totalChanges: allChanges.length,
      changesByField: {} as Record<string, number>,
      changesByType: {} as Record<FieldChangeType, number>,
      changesBySeverity: {} as Record<FieldChangeSeverity, number>,
      changesByCategory: {} as Record<FieldChangeCategory, number>,
      mostChangedFields: [] as Array<{ field: string; count: number }>,
      recentChanges: allChanges.slice(-10), // Last 10 changes
    };

    // Initialize counters
    Object.values(FieldChangeType).forEach(type => {
      stats.changesByType[type] = 0;
    });
    Object.values(FieldChangeSeverity).forEach(severity => {
      stats.changesBySeverity[severity] = 0;
    });
    Object.values(FieldChangeCategory).forEach(category => {
      stats.changesByCategory[category] = 0;
    });

    // Count changes
    for (const change of allChanges) {
      stats.changesByField[change.field] = (stats.changesByField[change.field] || 0) + 1;
      stats.changesByType[change.changeType]++;
      stats.changesBySeverity[change.severity]++;
      stats.changesByCategory[change.category]++;
    }

    // Get most changed fields
    stats.mostChangedFields = Object.entries(stats.changesByField)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Compare two field change sets
   */
  compareFieldChanges(
    changes1: EnhancedFieldChange[],
    changes2: EnhancedFieldChange[]
  ): {
    commonChanges: EnhancedFieldChange[];
    uniqueToFirst: EnhancedFieldChange[];
    uniqueToSecond: EnhancedFieldChange[];
    conflictingChanges: Array<{
      field: string;
      change1: EnhancedFieldChange;
      change2: EnhancedFieldChange;
    }>;
  } {
    const commonChanges: EnhancedFieldChange[] = [];
    const uniqueToFirst: EnhancedFieldChange[] = [];
    const uniqueToSecond: EnhancedFieldChange[] = [];
    const conflictingChanges: Array<{
      field: string;
      change1: EnhancedFieldChange;
      change2: EnhancedFieldChange;
    }> = [];

    const changes1Map = new Map(changes1.map(change => [change.field, change]));
    const changes2Map = new Map(changes2.map(change => [change.field, change]));

    // Find common and unique changes
    for (const [field, change1] of changes1Map) {
      const change2 = changes2Map.get(field);
      if (change2) {
        if (this.areChangesEquivalent(change1, change2)) {
          commonChanges.push(change1);
        } else {
          conflictingChanges.push({ field, change1, change2 });
        }
      } else {
        uniqueToFirst.push(change1);
      }
    }

    for (const [field, change2] of changes2Map) {
      if (!changes1Map.has(field)) {
        uniqueToSecond.push(change2);
      }
    }

    return {
      commonChanges,
      uniqueToFirst,
      uniqueToSecond,
      conflictingChanges,
    };
  }

  /**
   * Export field changes in various formats
   */
  exportFieldChanges(
    changes: EnhancedFieldChange[],
    format: 'json' | 'csv' | 'xml' = 'json'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(changes, null, 2);
      case 'csv':
        return this.exportToCSV(changes);
      case 'xml':
        return this.exportToXML(changes);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private helper methods

  private hasChanged(oldValue: any, newValue: any): boolean {
    // Handle null/undefined cases
    if (oldValue === null && newValue === null) return false;
    if (oldValue === undefined && newValue === undefined) return false;
    if (oldValue === null || oldValue === undefined) return true;
    if (newValue === null || newValue === undefined) return true;

    // Handle different data types
    if (typeof oldValue !== typeof newValue) return true;

    // Handle arrays
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (oldValue.length !== newValue.length) return true;
      return !oldValue.every((item, index) => this.hasChanged(item, newValue[index]));
    }

    // Handle objects
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      const oldKeys = Object.keys(oldValue);
      const newKeys = Object.keys(newValue);
      if (oldKeys.length !== newKeys.length) return true;
      return !oldKeys.every(key => !this.hasChanged(oldValue[key], newValue[key]));
    }

    // Handle primitives
    return oldValue !== newValue;
  }

  private createEnhancedFieldChange(
    field: string,
    oldValue: any,
    newValue: any,
    context?: any
  ): EnhancedFieldChange {
    const configuration = this.fieldConfigurations.get(field) || this.getDefaultFieldConfiguration(field);
    
    const changeType = this.determineChangeType(oldValue, newValue);
    const severity = this.calculateSeverity(field, oldValue, newValue, configuration);
    const category = configuration.category;
    
    return {
      field,
      oldValue,
      newValue,
      changeType,
      severity,
      category,
      affectsExternalSystems: configuration.affectsExternalSystems,
      requiresApproval: configuration.requiresApproval,
      reversible: configuration.reversible,
      metadata: {
        dataType: configuration.dataType,
        validationRules: configuration.validationRules,
        automatic: context?.automatic || false,
        source: context?.source,
        impact: {
          affectedFields: configuration.affectedFields,
          affectedSystems: configuration.affectedSystems,
          businessImpact: configuration.businessImpact,
        },
      },
    };
  }

  private determineChangeType(oldValue: any, newValue: any): FieldChangeType {
    if (oldValue === null || oldValue === undefined) {
      return FieldChangeType.CREATED;
    }
    if (newValue === null || newValue === undefined) {
      return FieldChangeType.DELETED;
    }
    return FieldChangeType.UPDATED;
  }

  private calculateSeverity(
    field: string,
    oldValue: any,
    newValue: any,
    configuration: FieldConfiguration
  ): FieldChangeSeverity {
    // Critical fields
    if (configuration.critical) {
      return FieldChangeSeverity.CRITICAL;
    }

    // High impact fields
    if (configuration.highImpact) {
      return FieldChangeSeverity.HIGH;
    }

    // Check for significant changes
    if (this.isSignificantChange(field, oldValue, newValue)) {
      return FieldChangeSeverity.HIGH;
    }

    // Default to medium for most changes
    return FieldChangeSeverity.MEDIUM;
  }

  private isSignificantChange(field: string, oldValue: any, newValue: any): boolean {
    // Price changes
    if (field.includes('price') || field.includes('cost')) {
      const oldPrice = parseFloat(oldValue);
      const newPrice = parseFloat(newValue);
      if (!isNaN(oldPrice) && !isNaN(newPrice)) {
        const percentChange = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
        return percentChange > 10; // More than 10% change
      }
    }

    // Status changes
    if (field.includes('status') || field.includes('state')) {
      return true;
    }

    // Inventory changes
    if (field.includes('inventory') || field.includes('stock')) {
      const oldStock = parseInt(oldValue);
      const newStock = parseInt(newValue);
      if (!isNaN(oldStock) && !isNaN(newStock)) {
        return Math.abs(newStock - oldStock) > 100; // More than 100 units change
      }
    }

    return false;
  }

  private calculateBusinessImpact(changes: EnhancedFieldChange[]): {
    level: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedSystems: string[];
  } {
    const criticalCount = changes.filter(c => c.severity === FieldChangeSeverity.CRITICAL).length;
    const highCount = changes.filter(c => c.severity === FieldChangeSeverity.HIGH).length;
    const externalSystemCount = changes.filter(c => c.affectsExternalSystems).length;

    let level: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let description = '';

    if (criticalCount > 0) {
      level = 'critical';
      description = `${criticalCount} critical changes detected`;
    } else if (highCount > 2 || externalSystemCount > 0) {
      level = 'high';
      description = `${highCount} high-impact changes, ${externalSystemCount} external system changes`;
    } else if (highCount > 0 || changes.length > 5) {
      level = 'medium';
      description = `${highCount} high-impact changes, ${changes.length} total changes`;
    } else {
      level = 'low';
      description = `${changes.length} low-impact changes`;
    }

    const affectedSystems = new Set<string>();
    changes.forEach(change => {
      if (change.metadata?.impact?.affectedSystems) {
        change.metadata.impact.affectedSystems.forEach(system => affectedSystems.add(system));
      }
    });

    return {
      level,
      description,
      affectedSystems: Array.from(affectedSystems),
    };
  }

  private validateFieldChange(change: EnhancedFieldChange): FieldChangeValidation {
    const validation: FieldChangeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    const rules = this.validationRules.get(change.field) || [];
    
    for (const rule of rules) {
      const result = rule.validate(change);
      if (!result.isValid) {
        validation.isValid = false;
        validation.errors.push(...result.errors);
      }
      validation.warnings.push(...result.warnings);
      validation.suggestions.push(...result.suggestions);
    }

    return validation;
  }

  private validateCrossFieldChanges(changes: EnhancedFieldChange[]): FieldChangeValidation {
    const validation: FieldChangeValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Example: Validate that price and cost are consistent
    const priceChange = changes.find(c => c.field === 'price');
    const costChange = changes.find(c => c.field === 'cost');
    
    if (priceChange && costChange) {
      const newPrice = parseFloat(priceChange.newValue);
      const newCost = parseFloat(costChange.newValue);
      
      if (!isNaN(newPrice) && !isNaN(newCost) && newCost > newPrice) {
        validation.warnings.push('Cost is higher than price - this may result in negative margins');
      }
    }

    return validation;
  }

  private areChangesEquivalent(change1: EnhancedFieldChange, change2: EnhancedFieldChange): boolean {
    return change1.field === change2.field &&
           change1.oldValue === change2.oldValue &&
           change1.newValue === change2.newValue &&
           change1.changeType === change2.changeType;
  }

  private storeChangeHistory(entityId: string, changes: EnhancedFieldChange[]): void {
    const existingHistory = this.changeHistory.get(entityId) || [];
    this.changeHistory.set(entityId, [...existingHistory, ...changes]);
  }

  private exportToCSV(changes: EnhancedFieldChange[]): string {
    const headers = [
      'Field',
      'Old Value',
      'New Value',
      'Change Type',
      'Severity',
      'Category',
      'Affects External Systems',
      'Requires Approval',
      'Reversible',
    ];

    const rows = changes.map(change => [
      change.field,
      JSON.stringify(change.oldValue),
      JSON.stringify(change.newValue),
      change.changeType,
      change.severity,
      change.category,
      change.affectsExternalSystems.toString(),
      change.requiresApproval.toString(),
      change.reversible.toString(),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToXML(changes: EnhancedFieldChange[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<fieldChanges>\n';

    for (const change of changes) {
      xml += '  <change>\n';
      xml += `    <field>${change.field}</field>\n`;
      xml += `    <oldValue>${JSON.stringify(change.oldValue)}</oldValue>\n`;
      xml += `    <newValue>${JSON.stringify(change.newValue)}</newValue>\n`;
      xml += `    <changeType>${change.changeType}</changeType>\n`;
      xml += `    <severity>${change.severity}</severity>\n`;
      xml += `    <category>${change.category}</category>\n`;
      xml += `    <affectsExternalSystems>${change.affectsExternalSystems}</affectsExternalSystems>\n`;
      xml += `    <requiresApproval>${change.requiresApproval}</requiresApproval>\n`;
      xml += `    <reversible>${change.reversible}</reversible>\n`;
      xml += '  </change>\n';
    }

    xml += '</fieldChanges>';
    return xml;
  }

  private initializeDefaultConfigurations(): void {
    // Basic product information
    this.fieldConfigurations.set('name', {
      category: FieldChangeCategory.BASIC_INFO,
      dataType: 'string',
      critical: false,
      highImpact: true,
      affectsExternalSystems: true,
      requiresApproval: false,
      reversible: true,
      affectedFields: ['slug', 'seoTitle'],
      affectedSystems: ['search', 'seo'],
      businessImpact: 'medium',
    });

    this.fieldConfigurations.set('description', {
      category: FieldChangeCategory.BASIC_INFO,
      dataType: 'string',
      critical: false,
      highImpact: false,
      affectsExternalSystems: true,
      requiresApproval: false,
      reversible: true,
      affectedFields: ['seoDescription'],
      affectedSystems: ['search', 'seo'],
      businessImpact: 'low',
    });

    // Pricing
    this.fieldConfigurations.set('price', {
      category: FieldChangeCategory.PRICING,
      dataType: 'number',
      critical: true,
      highImpact: true,
      affectsExternalSystems: true,
      requiresApproval: true,
      reversible: true,
      affectedFields: ['margin', 'profit'],
      affectedSystems: ['pricing', 'inventory', 'sales'],
      businessImpact: 'high',
    });

    this.fieldConfigurations.set('cost', {
      category: FieldChangeCategory.PRICING,
      dataType: 'number',
      critical: true,
      highImpact: true,
      affectsExternalSystems: true,
      requiresApproval: true,
      reversible: true,
      affectedFields: ['margin', 'profit'],
      affectedSystems: ['pricing', 'inventory', 'sales'],
      businessImpact: 'high',
    });

    // Inventory
    this.fieldConfigurations.set('inventory', {
      category: FieldChangeCategory.INVENTORY,
      dataType: 'number',
      critical: true,
      highImpact: true,
      affectsExternalSystems: true,
      requiresApproval: false,
      reversible: true,
      affectedFields: ['availability'],
      affectedSystems: ['inventory', 'sales', 'fulfillment'],
      businessImpact: 'high',
    });

    // Workflow
    this.fieldConfigurations.set('workflowState', {
      category: FieldChangeCategory.WORKFLOW,
      dataType: 'string',
      critical: true,
      highImpact: true,
      affectsExternalSystems: true,
      requiresApproval: true,
      reversible: true,
      affectedFields: ['status', 'visibility'],
      affectedSystems: ['workflow', 'publishing', 'sales'],
      businessImpact: 'critical',
    });

    this.fieldConfigurations.set('assignedReviewerId', {
      category: FieldChangeCategory.WORKFLOW,
      dataType: 'string',
      critical: false,
      highImpact: false,
      affectsExternalSystems: false,
      requiresApproval: false,
      reversible: true,
      affectedFields: [],
      affectedSystems: ['workflow'],
      businessImpact: 'low',
    });
  }

  private initializeDefaultValidationRules(): void {
    // Price validation
    this.validationRules.set('price', [
      {
        name: 'positive_price',
        validate: (change) => {
          const price = parseFloat(change.newValue);
          if (isNaN(price) || price < 0) {
            return {
              isValid: false,
              errors: ['Price must be a positive number'],
              warnings: [],
              suggestions: [],
            };
          }
          return { isValid: true, errors: [], warnings: [], suggestions: [] };
        },
      },
    ]);

    // Inventory validation
    this.validationRules.set('inventory', [
      {
        name: 'non_negative_inventory',
        validate: (change) => {
          const inventory = parseInt(change.newValue);
          if (isNaN(inventory) || inventory < 0) {
            return {
              isValid: false,
              errors: ['Inventory cannot be negative'],
              warnings: [],
              suggestions: [],
            };
          }
          return { isValid: true, errors: [], warnings: [], suggestions: [] };
        },
      },
    ]);
  }

  private getDefaultFieldConfiguration(field: string): FieldConfiguration {
    return {
      category: FieldChangeCategory.METADATA,
      dataType: 'string',
      critical: false,
      highImpact: false,
      affectsExternalSystems: false,
      requiresApproval: false,
      reversible: true,
      affectedFields: [],
      affectedSystems: [],
      businessImpact: 'low',
    };
  }
}

// Supporting interfaces and types

interface FieldConfiguration {
  category: FieldChangeCategory;
  dataType: string;
  critical: boolean;
  highImpact: boolean;
  affectsExternalSystems: boolean;
  requiresApproval: boolean;
  reversible: boolean;
  affectedFields: string[];
  affectedSystems: string[];
  businessImpact: 'low' | 'medium' | 'high' | 'critical';
  validationRules?: string[];
}

interface ValidationRule {
  name: string;
  validate: (change: EnhancedFieldChange) => FieldChangeValidation;
}

// Export singleton instance
export const fieldChangeTracker = new FieldChangeTracker();
