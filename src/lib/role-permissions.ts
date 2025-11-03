import {
  UserRole,
  WorkflowAction,
  WorkflowState,
  UserRoleData,
  Permission,
  PermissionContext,
  PermissionResult,
  RolePermissionConfig,
  DynamicPermission,
} from '@/types/workflow';
import { 
  PermissionCacheManager, 
  CachePriority, 
  permissionCacheManager 
} from './permission-cache';
import { 
  DynamicPermissionManager, 
  dynamicPermissionManager 
} from './dynamic-permissions';
import { permissionAuditLogger, AuditLogType } from './permission-audit-logger';

/**
 * Interface for permission checking context
 */
export interface PermissionCheckContext {
  userId: string;
  userRole: UserRole;
  userEmail: string;
  targetUserId?: string; // For user-specific operations
  productId?: string;
  productOwnerId?: string;
  assignedReviewerId?: string;
  currentWorkflowState?: WorkflowState;
  targetWorkflowState?: WorkflowState;
  resourceType?: 'product' | 'user' | 'workflow' | 'audit' | 'notification';
  resourceId?: string;
  metadata?: Record<string, any>;
}

/**
 * Interface for permission cache entry
 */
export interface PermissionCacheEntry {
  permission: string;
  result: boolean;
  timestamp: number;
  expiresAt: number;
  context: Partial<PermissionCheckContext>;
}

/**
 * Interface for permission audit log entry
 */
export interface PermissionAuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userRole: UserRole;
  action: string;
  resource: string;
  resourceId?: string;
  permission: string;
  result: boolean;
  reason?: string;
  context: Partial<PermissionCheckContext>;
}

/**
 * Core RolePermissions class for managing role-based access control
 */
export class RolePermissions {
  private permissionCache: Map<string, PermissionCacheEntry> = new Map();
  private auditLog: PermissionAuditEntry[] = [];
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes
  private maxCacheSize: number = 1000;
  private auditLogMaxSize: number = 10000;
  private advancedCache: PermissionCacheManager;
  private dynamicPermissions: DynamicPermissionManager;

  constructor(options?: {
    cacheTimeout?: number;
    maxCacheSize?: number;
    auditLogMaxSize?: number;
    enableAdvancedCache?: boolean;
  }) {
    if (options) {
      this.cacheTimeout = options.cacheTimeout || this.cacheTimeout;
      this.maxCacheSize = options.maxCacheSize || this.maxCacheSize;
      this.auditLogMaxSize = options.auditLogMaxSize || this.auditLogMaxSize;
    }

    // Initialize advanced cache
    this.advancedCache = new PermissionCacheManager({
      l1MaxSize: this.maxCacheSize,
      l2MaxSize: this.maxCacheSize * 10,
      defaultTTL: this.cacheTimeout,
      warmingConfig: {
        enabled: !process.env.NODE_ENV || process.env.NODE_ENV !== 'test',
        preloadCommonPermissions: true,
        preloadRolePermissions: true,
        preloadHierarchyPermissions: true,
        warmingInterval: this.cacheTimeout,
        maxWarmingOperations: 100,
      },
    });

    // Initialize dynamic permission manager
    this.dynamicPermissions = dynamicPermissionManager;

    // Clean up expired cache entries periodically
    setInterval(() => this.cleanupExpiredCache(), this.cacheTimeout);
    
    // Warm cache with common permissions only if not in test environment
    if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'test') {
      this.warmCommonPermissions();
    }
  }

  /**
   * Check if a user has permission to perform a specific action
   */
  async hasPermission(
    context: PermissionCheckContext,
    action: WorkflowAction | string,
    resource?: string
  ): Promise<PermissionResult> {
    const startTime = Date.now();
    const permissionKey = this.generatePermissionKey(context, action, resource);
    
    // Check advanced cache first
    const cachedResult = this.advancedCache.get(permissionKey);
    if (cachedResult) {
      // Log cached permission check
      permissionAuditLogger.logPermissionCheck(
        context,
        action as string,
        resource || 'general',
        cachedResult.hasPermission,
        `Cached result: ${cachedResult.reason}`,
        {
          cached: true,
          responseTime: Date.now() - startTime,
          source: cachedResult.source,
          productId: context.productId,
          targetUserId: context.targetUserId,
          resourceId: context.resourceId,
          workflowState: context.currentWorkflowState,
          targetWorkflowState: context.targetWorkflowState,
          resourceType: context.resourceType,
        }
      );
      
      return {
        ...cachedResult,
        cached: true,
        checkTime: Date.now() - startTime,
      };
    }

    // Fallback to legacy cache
    const legacyCachedResult = this.getCachedPermission(permissionKey);
    if (legacyCachedResult !== null) {
      // Log cached permission check
      permissionAuditLogger.logPermissionCheck(
        context,
        action as string,
        resource || 'general',
        legacyCachedResult,
        'Cached result (legacy)',
        {
          cached: true,
          responseTime: Date.now() - startTime,
          source: 'legacy_cache',
          productId: context.productId,
          targetUserId: context.targetUserId,
          resourceId: context.resourceId,
          workflowState: context.currentWorkflowState,
          targetWorkflowState: context.targetWorkflowState,
          resourceType: context.resourceType,
        }
      );
      
      return {
        hasPermission: legacyCachedResult,
        reason: 'Cached result (legacy)',
        cached: true,
        checkTime: Date.now() - startTime,
      };
    }

    // Perform permission check
    const result = await this.performPermissionCheck(context, action, resource);
    
    // Determine cache priority based on permission type and context
    const priority = this.determineCachePriority(context, action, resource, result);
    const tags = this.generateCacheTags(context, action, resource);
    
    // Cache in advanced cache
    this.advancedCache.set(
      permissionKey,
      result,
      {
        priority,
        tags
      }
    );
    
    // Also cache in legacy cache for backward compatibility
    this.cachePermission(permissionKey, result.hasPermission, context);
    
    // Log the permission check
    this.logPermissionCheck(context, action, resource, result.hasPermission, result.reason);

    return {
      ...result,
      cached: false,
      checkTime: Date.now() - startTime,
    };
  }

  /**
   * Check multiple permissions at once
   */
  async hasMultiplePermissions(
    context: PermissionCheckContext,
    permissions: Array<{ action: WorkflowAction | string; resource?: string }>
  ): Promise<Record<string, PermissionResult>> {
    const results: Record<string, PermissionResult> = {};
    
    const promises = permissions.map(async (permission) => {
      const key = `${permission.action}${permission.resource ? `:${permission.resource}` : ''}`;
      results[key] = await this.hasPermission(context, permission.action, permission.resource);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Check if user can perform action on specific resource
   */
  async canPerformAction(
    context: PermissionCheckContext,
    action: WorkflowAction | string,
    resourceId?: string
  ): Promise<PermissionResult> {
    const enhancedContext = {
      ...context,
      resourceId,
    };

    return this.hasPermission(enhancedContext, action);
  }

  /**
   * Check if user can access a specific product
   */
  async canAccessProduct(
    context: PermissionCheckContext,
    productId: string,
    action: WorkflowAction | string = 'READ'
  ): Promise<PermissionResult> {
    const enhancedContext = {
      ...context,
      productId,
      resourceType: 'product' as const,
    };

    return this.hasPermission(enhancedContext, action);
  }

  /**
   * Check if user can manage another user
   */
  async canManageUser(
    context: PermissionCheckContext,
    targetUserId: string,
    action: WorkflowAction | string = 'MANAGE_USERS'
  ): Promise<PermissionResult> {
    const enhancedContext = {
      ...context,
      targetUserId,
      resourceType: 'user' as const,
    };

    return this.hasPermission(enhancedContext, action);
  }

  /**
   * Get all permissions for a user role
   */
  getRolePermissions(userRole: UserRole): string[] {
    return this.getBaseRolePermissions(userRole);
  }

  /**
   * Get effective permissions for a user (including dynamic permissions and hierarchy inheritance)
   */
  async getEffectivePermissions(
    context: PermissionCheckContext,
    includeDynamic: boolean = true,
    includeHierarchy: boolean = true
  ): Promise<string[]> {
    const basePermissions = this.getBaseRolePermissions(context.userRole);
    let allPermissions = [...basePermissions];
    
    // Include hierarchy permissions
    if (includeHierarchy) {
      const hierarchyPermissions = this.getHierarchyPermissions(context.userRole);
      allPermissions = [...allPermissions, ...hierarchyPermissions];
    }
    
    // Include dynamic permissions
    if (includeDynamic) {
      const dynamicPermissions = await this.getDynamicPermissions(context);
      allPermissions = [...allPermissions, ...dynamicPermissions];
    }
    
    // Remove duplicates
    return [...new Set(allPermissions)];
  }

  /**
   * Get all permissions inherited through role hierarchy
   */
  getHierarchyPermissions(userRole: UserRole): string[] {
    const roleHierarchy = this.getRoleHierarchy();
    const userRoleLevel = roleHierarchy[userRole];
    const inheritedPermissions: string[] = [];
    
    // Get permissions from all lower roles (higher level numbers)
    for (const [role, level] of Object.entries(roleHierarchy)) {
      if (level > userRoleLevel) { // Check lower roles (higher level numbers)
        const rolePermissions = this.getBaseRolePermissions(role as UserRole);
        inheritedPermissions.push(...rolePermissions);
      }
    }
    
    // Remove duplicates
    return [...new Set(inheritedPermissions)];
  }

  /**
   * Check if permission is granted by role hierarchy
   * Higher roles inherit permissions from lower roles in a controlled manner
   */
  isPermissionGrantedByHierarchy(
    userRole: UserRole,
    permission: string
  ): boolean {
    const hierarchyPermissions = this.getHierarchyPermissions(userRole);
    return hierarchyPermissions.includes(permission) || this.hasWildcardPermission(hierarchyPermissions, permission);
  }


  /**
   * Get permission audit log
   */
  getPermissionAuditLog(
    filters?: {
      userId?: string;
      userRole?: UserRole;
      action?: string;
      result?: boolean;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): PermissionAuditEntry[] {
    let filteredLog = [...this.auditLog];

    if (filters) {
      if (filters.userId) {
        filteredLog = filteredLog.filter(entry => entry.userId === filters.userId);
      }
      if (filters.userRole) {
        filteredLog = filteredLog.filter(entry => entry.userRole === filters.userRole);
      }
      if (filters.action) {
        filteredLog = filteredLog.filter(entry => entry.action === filters.action);
      }
      if (filters.result !== undefined) {
        filteredLog = filteredLog.filter(entry => entry.result === filters.result);
      }
      if (filters.startDate) {
        filteredLog = filteredLog.filter(entry => new Date(entry.timestamp) >= filters.startDate!);
      }
      if (filters.endDate) {
        filteredLog = filteredLog.filter(entry => new Date(entry.timestamp) <= filters.endDate!);
      }
    }

    // Sort by timestamp (newest first)
    filteredLog.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filters?.limit) {
      filteredLog = filteredLog.slice(0, filters.limit);
    }

    return filteredLog;
  }

  /**
   * Clear permission cache
   */
  clearCache(): void {
    this.permissionCache.clear();
    this.advancedCache.clear();
  }

  /**
   * Clear cache for specific user
   */
  clearUserCache(userId: string): void {
    // Clear legacy cache
    for (const [key, entry] of this.permissionCache.entries()) {
      if (entry.context.userId === userId) {
        this.permissionCache.delete(key);
      }
    }
    
    // Clear advanced cache by user pattern - cache key format is userId:userRole:action:resource:productId:targetUserId
    this.advancedCache.invalidateByPattern(`${userId}:*`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    expiredEntries: number;
    advancedCacheStats?: any;
  } {
    const now = Date.now();
    let expiredEntries = 0;
    let totalChecks = 0;
    let cacheHits = 0;

    for (const entry of this.permissionCache.values()) {
      totalChecks++;
      if (entry.expiresAt < now) {
        expiredEntries++;
      } else {
        cacheHits++;
      }
    }

    return {
      size: this.permissionCache.size,
      hitRate: totalChecks > 0 ? cacheHits / totalChecks : 0,
      expiredEntries,
      advancedCacheStats: this.advancedCache.getStatistics(),
    };
  }

  // Private methods

  private async performPermissionCheck(
    context: PermissionCheckContext,
    action: WorkflowAction | string,
    resource?: string
  ): Promise<PermissionResult> {
    // Check context-specific permissions first for ownership and assignment
    if (context.productOwnerId || context.assignedReviewerId) {
      const hasContextPermission = this.checkContextSpecificPermissions(context, action, resource);
      if (hasContextPermission.hasPermission && 
          (hasContextPermission.source === 'ownership' || hasContextPermission.source === 'assignment')) {
        return hasContextPermission;
      }
    }

    // Check base role permissions
    const basePermissions = this.getBaseRolePermissions(context.userRole);
    const hasBasePermission = this.checkPermission(basePermissions, action, resource);

    if (hasBasePermission) {
      return {
        hasPermission: true,
        reason: `Permission granted by ${context.userRole} role`,
        source: 'role',
      };
    }

    // Check dynamic permissions
    const dynamicPermissionResult = this.dynamicPermissions.hasPermission(
      context.userId,
      action as string,
      context
    );

    if (dynamicPermissionResult.hasPermission) {
      return {
        hasPermission: true,
        reason: `Permission granted by dynamic assignment: ${dynamicPermissionResult.assignment?.reason}`,
        source: 'dynamic',
        metadata: {
          assignmentId: dynamicPermissionResult.assignment?.id,
          grantedBy: dynamicPermissionResult.assignment?.grantedBy,
          grantedAt: dynamicPermissionResult.assignment?.grantedAt,
          expiresAt: dynamicPermissionResult.assignment?.expiresAt,
        },
      };
    }

    // Check hierarchy permissions
    const hasHierarchyPermission = this.isPermissionGrantedByHierarchy(context.userRole, action as string);

    if (hasHierarchyPermission) {
      return {
        hasPermission: true,
        reason: `Permission granted by role hierarchy`,
        source: 'hierarchy',
      };
    }

    // Check context-specific permissions for admin override
    const hasContextPermission = this.checkContextSpecificPermissions(context, action, resource);
    if (hasContextPermission.hasPermission) {
      return hasContextPermission;
    }

    // Log security violation for denied permissions
    const isHighRiskAction = this.isHighRiskAction(action as string);
    if (isHighRiskAction) {
      permissionAuditLogger.logSecurityViolation(
        context,
        action as string,
        resource || 'unknown',
        `Unauthorized access attempt to ${action} by ${context.userRole}`,
        {
          deniedReason: `Permission denied: ${action} not allowed for ${context.userRole} role`,
          riskLevel: 'high',
        }
      );
    }

    return {
      hasPermission: false,
      reason: `Permission denied: ${action} not allowed for ${context.userRole} role`,
      source: 'denied',
    };
  }

  private getBaseRolePermissions(userRole: UserRole): string[] {
    const rolePermissions: Record<UserRole, string[]> = {
      [UserRole.ADMIN]: [
        // Full system access - wildcard permissions
        '*',
        'workflow:*',
        'products:*',
        'users:*',
        'audit:*',
        'notifications:*',
        'system:*',
        'reports:*',
        'settings:*',
        
        // Workflow management permissions
        'workflow:publish',
        'workflow:unpublish',
        'workflow:reopen',
        'workflow:configure',
        'workflow:manage_states',
        'workflow:manage_transitions',
        'workflow:manage_rules',
        'workflow:override_restrictions',
        'workflow:bulk_operations',
        'workflow:force_transitions',
        'workflow:manage_escalations',
        'workflow:view_all_products',
        'workflow:manage_assignments',
        
        // Product management permissions
        'products:create',
        'products:read',
        'products:write',
        'products:delete',
        'products:bulk_create',
        'products:bulk_update',
        'products:bulk_delete',
        'products:bulk_approve',
        'products:bulk_reject',
        'products:bulk_publish',
        'products:export',
        'products:import',
        'products:manage_categories',
        'products:manage_brands',
        'products:manage_attributes',
        'products:view_all',
        'products:edit_any',
        'products:delete_any',
        
        // User management permissions
        'users:create',
        'users:read',
        'users:write',
        'users:delete',
        'users:manage_roles',
        'users:assign_roles',
        'users:revoke_roles',
        'users:manage_permissions',
        'users:view_all',
        'users:impersonate',
        'users:reset_passwords',
        'users:manage_sessions',
        'users:bulk_operations',
        'users:export_data',
        'users:manage_groups',
        'users:manage_departments',
        
        // Audit and compliance permissions
        'audit:read',
        'audit:write',
        'audit:export',
        'audit:view_all',
        'audit:manage_retention',
        'audit:generate_reports',
        'audit:compliance_checks',
        
        // Notification management permissions
        'notifications:manage',
        'notifications:create',
        'notifications:send',
        'notifications:configure',
        'notifications:view_all',
        'notifications:manage_templates',
        'notifications:bulk_send',
        
        // System administration permissions
        'system:configure',
        'system:maintenance',
        'system:backup',
        'system:restore',
        'system:monitor',
        'system:logs',
        'system:performance',
        'system:security',
        'system:updates',
        
        // Reports and analytics permissions
        'reports:generate',
        'reports:view_all',
        'reports:export',
        'reports:schedule',
        'reports:manage_dashboards',
        'reports:analytics',
        'reports:workflow_metrics',
        'reports:user_activity',
        'reports:product_metrics',
        
        // Settings and configuration permissions
        'settings:general',
        'settings:workflow',
        'settings:notifications',
        'settings:security',
        'settings:integrations',
        'settings:backup',
        'settings:maintenance',
        'settings:api_keys',
        'settings:webhooks',
      ],
      [UserRole.EDITOR]: [
        // Product creation and editing permissions
        'products:create',
        'products:read',
        'products:write',
        'products:edit_own',
        'products:view_own',
        'products:delete_own',
        'products:duplicate',
        'products:clone',
        'products:save_draft',
        'products:auto_save',
        'products:manage_media',
        'products:upload_images',
        'products:manage_categories_own',
        'products:manage_attributes_own',
        'products:manage_seo_own',
        'products:manage_pricing_own',
        'products:manage_inventory_own',
        'products:manage_variants_own',
        'products:manage_relationships_own',
        'products:export_own',
        'products:import_own',
        
        // Workflow permissions for draft products
        'workflow:submit',
        'workflow:edit',
        'workflow:view_history',
        'workflow:view_own_history',
        'workflow:resubmit',
        'workflow:withdraw_submission',
        'workflow:request_review',
        'workflow:assign_reviewer',
        'workflow:view_assignments',
        'workflow:manage_own_products',
        'workflow:transition_draft_to_review',
        'workflow:transition_rejected_to_draft',
        'workflow:view_workflow_status',
        'workflow:view_workflow_progress',
        'workflow:view_workflow_timeline',
        'workflow:view_workflow_comments',
        'workflow:add_workflow_comments',
        'workflow:respond_to_feedback',
        'workflow:view_rejection_reasons',
        'workflow:view_approval_notes',
        
        // Draft-specific permissions
        'draft:create',
        'draft:edit',
        'draft:save',
        'draft:delete',
        'draft:view',
        'draft:list_own',
        'draft:manage_own',
        'draft:submit_for_review',
        'draft:validate_before_submission',
        'draft:check_completeness',
        'draft:preview',
        'draft:version_control',
        'draft:restore_version',
        'draft:compare_versions',
        
        // Content management permissions
        'content:create',
        'content:edit',
        'content:manage_own',
        'content:upload_assets',
        'content:manage_assets_own',
        'content:organize_media',
        'content:optimize_images',
        'content:manage_metadata',
        'content:manage_tags',
        'content:manage_descriptions',
        'content:manage_specifications',
        'content:manage_features',
        'content:manage_benefits',
        
        // Collaboration permissions
        'collaboration:view_own_products',
        'collaboration:share_own_products',
        'collaboration:comment_on_own',
        'collaboration:respond_to_comments',
        'collaboration:view_team_products',
        'collaboration:request_help',
        'collaboration:provide_feedback',
        
        // Notification and communication permissions
        'notifications:read',
        'notifications:manage_own',
        'notifications:view_workflow_notifications',
        'notifications:view_submission_notifications',
        'notifications:view_approval_notifications',
        'notifications:view_rejection_notifications',
        'notifications:view_reminder_notifications',
        
        // Audit and history permissions
        'audit:read_own',
        'audit:view_own_history',
        'audit:view_own_changes',
        'audit:view_own_activity',
        'audit:export_own_history',
        
        // Limited bulk operations for own products
        'bulk:edit_own_products',
        'bulk:submit_own_products',
        'bulk:export_own_products',
        'bulk:duplicate_own_products',
        'bulk:manage_own_products',
        
        // Quality and validation permissions
        'quality:check_own_products',
        'quality:validate_own_products',
        'quality:view_quality_scores',
        'quality:improve_quality_scores',
        'quality:view_quality_recommendations',
        'quality:apply_quality_fixes',
        
        // Search and filtering permissions
        'search:search_own_products',
        'search:filter_own_products',
        'search:sort_own_products',
        'search:save_search_queries',
        'search:manage_search_favorites',
      ],
      [UserRole.REVIEWER]: [
        // Product viewing permissions - can view all products
        'products:read',
        'products:view_all',
        'products:view_details',
        'products:view_media',
        'products:view_specifications',
        'products:view_pricing',
        'products:view_inventory',
        'products:view_variants',
        'products:view_relationships',
        'products:view_seo',
        'products:view_metadata',
        'products:view_categories',
        'products:view_attributes',
        'products:view_brands',
        'products:view_suppliers',
        'products:view_history',
        'products:view_versions',
        'products:view_comments',
        'products:view_feedback',
        'products:view_quality_scores',
        'products:view_analytics',
        'products:view_performance',
        'products:view_metrics',
        'products:export_review_data',
        'products:export_approved_products',
        'products:export_rejected_products',
        
        // Workflow approval and rejection permissions
        'workflow:approve',
        'workflow:reject',
        'workflow:conditional_approve',
        'workflow:conditional_reject',
        'workflow:request_changes',
        'workflow:request_additional_info',
        'workflow:escalate_to_admin',
        'workflow:delegate_review',
        'workflow:assign_reviewer',
        'workflow:reassign_reviewer',
        'workflow:view_assignments',
        'workflow:manage_assignments',
        'workflow:view_review_queue',
        'workflow:prioritize_reviews',
        'workflow:batch_approve',
        'workflow:batch_reject',
        'workflow:bulk_review_actions',
        
        // Review-specific permissions
        'review:create',
        'review:edit',
        'review:submit',
        'review:approve',
        'review:reject',
        'review:request_changes',
        'review:add_comments',
        'review:edit_comments',
        'review:delete_comments',
        'review:view_comments',
        'review:respond_to_comments',
        'review:add_feedback',
        'review:edit_feedback',
        'review:view_feedback',
        'review:rate_quality',
        'review:rate_completeness',
        'review:rate_accuracy',
        'review:rate_compliance',
        'review:add_recommendations',
        'review:view_recommendations',
        'review:track_review_progress',
        'review:view_review_history',
        'review:export_review_reports',
        'review:generate_review_summary',
        'review:create_review_templates',
        'review:use_review_templates',
        'review:manage_review_checklists',
        'review:create_review_checklists',
        'review:assign_review_checklists',
        'review:track_checklist_completion',
        
        // Workflow history and tracking permissions
        'workflow:view_history',
        'workflow:view_all_history',
        'workflow:view_review_history',
        'workflow:view_approval_history',
        'workflow:view_rejection_history',
        'workflow:view_transition_history',
        'workflow:view_comment_history',
        'workflow:view_feedback_history',
        'workflow:view_escalation_history',
        'workflow:view_delegation_history',
        'workflow:view_assignment_history',
        'workflow:track_review_metrics',
        'workflow:track_approval_metrics',
        'workflow:track_rejection_metrics',
        'workflow:track_review_times',
        'workflow:track_workload',
        'workflow:view_review_statistics',
        'workflow:view_performance_metrics',
        'workflow:view_efficiency_metrics',
        'workflow:view_quality_metrics',
        'workflow:export_workflow_data',
        'workflow:export_review_data',
        'workflow:export_approval_data',
        'workflow:export_rejection_data',
        
        // Comment and feedback permissions
        'comments:create',
        'comments:edit',
        'comments:delete',
        'comments:view',
        'comments:respond',
        'comments:resolve',
        'comments:reopen',
        'comments:assign',
        'comments:escalate',
        'comments:view_all',
        'comments:view_own',
        'comments:view_assigned',
        'comments:view_resolved',
        'comments:view_pending',
        'comments:view_escalated',
        'comments:export_comments',
        'comments:export_feedback',
        'comments:generate_comment_reports',
        'comments:track_comment_metrics',
        'comments:manage_comment_templates',
        'comments:create_comment_templates',
        'comments:use_comment_templates',
        
        // Quality assessment permissions
        'quality:assess',
        'quality:rate',
        'quality:score',
        'quality:evaluate',
        'quality:validate',
        'quality:check_compliance',
        'quality:check_standards',
        'quality:check_guidelines',
        'quality:check_requirements',
        'quality:check_completeness',
        'quality:check_accuracy',
        'quality:check_consistency',
        'quality:check_formatting',
        'quality:check_grammar',
        'quality:check_spelling',
        'quality:check_style',
        'quality:check_branding',
        'quality:check_legal',
        'quality:check_regulatory',
        'quality:check_accessibility',
        'quality:check_seo',
        'quality:check_performance',
        'quality:check_security',
        'quality:check_privacy',
        'quality:view_quality_standards',
        'quality:view_quality_guidelines',
        'quality:view_quality_checklists',
        'quality:view_quality_metrics',
        'quality:view_quality_reports',
        'quality:export_quality_data',
        'quality:generate_quality_reports',
        'quality:track_quality_metrics',
        'quality:manage_quality_standards',
        'quality:create_quality_checklists',
        'quality:update_quality_checklists',
        'quality:assign_quality_checklists',
        
        // Notification and communication permissions
        'notifications:read',
        'notifications:view_all',
        'notifications:view_review_notifications',
        'notifications:view_approval_notifications',
        'notifications:view_rejection_notifications',
        'notifications:view_assignment_notifications',
        'notifications:view_escalation_notifications',
        'notifications:view_reminder_notifications',
        'notifications:view_workflow_notifications',
        'notifications:manage_own_notifications',
        'notifications:mark_as_read',
        'notifications:mark_as_unread',
        'notifications:archive_notifications',
        'notifications:delete_notifications',
        'notifications:export_notifications',
        'notifications:create_notification_templates',
        'notifications:use_notification_templates',
        'notifications:send_notifications',
        'notifications:schedule_notifications',
        'notifications:track_notification_metrics',
        
        // Audit and compliance permissions
        'audit:read',
        'audit:read_all',
        'audit:view_review_audit',
        'audit:view_approval_audit',
        'audit:view_rejection_audit',
        'audit:view_comment_audit',
        'audit:view_feedback_audit',
        'audit:view_assignment_audit',
        'audit:view_escalation_audit',
        'audit:view_workflow_audit',
        'audit:view_quality_audit',
        'audit:view_compliance_audit',
        'audit:view_performance_audit',
        'audit:view_metrics_audit',
        'audit:export_audit_data',
        'audit:export_review_audit',
        'audit:export_approval_audit',
        'audit:export_rejection_audit',
        'audit:generate_audit_reports',
        'audit:generate_compliance_reports',
        'audit:track_audit_metrics',
        'audit:manage_audit_retention',
        'audit:view_audit_history',
        'audit:view_audit_timeline',
        'audit:view_audit_statistics',
        
        // Search and filtering permissions
        'search:search_all_products',
        'search:search_review_queue',
        'search:search_approved_products',
        'search:search_rejected_products',
        'search:search_pending_products',
        'search:search_assigned_products',
        'search:search_escalated_products',
        'search:filter_by_reviewer',
        'search:filter_by_status',
        'search:filter_by_priority',
        'search:filter_by_category',
        'search:filter_by_brand',
        'search:filter_by_quality_score',
        'search:filter_by_date_range',
        'search:filter_by_assignment_date',
        'search:filter_by_review_date',
        'search:filter_by_approval_date',
        'search:filter_by_rejection_date',
        'search:sort_by_priority',
        'search:sort_by_assignment_date',
        'search:sort_by_review_date',
        'search:sort_by_quality_score',
        'search:sort_by_status',
        'search:save_search_queries',
        'search:manage_search_favorites',
        'search:export_search_results',
        'search:create_search_alerts',
        'search:manage_search_alerts',
        
        // Reporting and analytics permissions
        'reports:view_review_reports',
        'reports:view_approval_reports',
        'reports:view_rejection_reports',
        'reports:view_quality_reports',
        'reports:view_performance_reports',
        'reports:view_workload_reports',
        'reports:view_efficiency_reports',
        'reports:view_metrics_reports',
        'reports:view_statistics_reports',
        'reports:view_trend_reports',
        'reports:view_comparison_reports',
        'reports:view_summary_reports',
        'reports:view_detailed_reports',
        'reports:view_dashboard_reports',
        'reports:view_scheduled_reports',
        'reports:view_custom_reports',
        'reports:export_reports',
        'reports:export_review_reports',
        'reports:export_approval_reports',
        'reports:export_rejection_reports',
        'reports:export_quality_reports',
        'reports:export_performance_reports',
        'reports:generate_reports',
        'reports:schedule_reports',
        'reports:create_custom_reports',
        'reports:manage_report_templates',
        'reports:create_report_templates',
        'reports:use_report_templates',
        'reports:track_report_metrics',
        'reports:view_report_history',
        'reports:view_report_statistics',
        
        // Limited bulk operations for review actions
        'bulk:approve_products',
        'bulk:reject_products',
        'bulk:request_changes',
        'bulk:assign_reviewers',
        'bulk:reassign_reviewers',
        'bulk:escalate_products',
        'bulk:add_comments',
        'bulk:add_feedback',
        'bulk:rate_quality',
        'bulk:export_review_data',
        'bulk:export_approval_data',
        'bulk:export_rejection_data',
        'bulk:generate_review_reports',
        'bulk:generate_approval_reports',
        'bulk:generate_rejection_reports',
        'bulk:track_review_metrics',
        'bulk:track_approval_metrics',
        'bulk:track_rejection_metrics',
      ],
      [UserRole.VIEWER]: [
        // Read-only product access
        'products:read',
        'products:view_published',
        'products:view_approved',
        'products:view_details',
        'products:view_media',
        'products:view_specifications',
        'products:view_pricing',
        'products:view_categories',
        'products:view_attributes',
        'products:view_brands',
        'products:view_seo',
        'products:view_metadata',
        'products:view_history',
        'products:view_versions',
        'products:view_comments',
        'products:view_feedback',
        'products:view_quality_scores',
        'products:view_analytics',
        'products:view_performance',
        'products:view_metrics',
        'products:export_published',
        'products:export_approved',
        
        // Read-only audit access
        'audit:read',
        'audit:view_published_audit',
        'audit:view_approved_audit',
        'audit:view_public_history',
        'audit:view_public_changes',
        'audit:view_public_activity',
        'audit:export_public_audit',
        'audit:view_audit_timeline',
        'audit:view_audit_statistics',
        
        // Read-only notification access
        'notifications:read',
        'notifications:view_public',
        'notifications:view_published',
        'notifications:view_approved',
        'notifications:view_announcements',
        'notifications:view_updates',
        'notifications:view_changes',
        
        // Read-only search and filtering
        'search:search_published',
        'search:search_approved',
        'search:filter_published',
        'search:filter_approved',
        'search:sort_published',
        'search:sort_approved',
        'search:save_public_queries',
        'search:export_public_results',
        
        // Read-only reporting
        'reports:view_public_reports',
        'reports:view_published_reports',
        'reports:view_approved_reports',
        'reports:view_summary_reports',
        'reports:view_statistics_reports',
        'reports:view_trend_reports',
        'reports:export_public_reports',
        'reports:export_published_reports',
        'reports:export_approved_reports',
        
        // Read-only quality viewing
        'quality:view_scores',
        'quality:view_standards',
        'quality:view_guidelines',
        'quality:view_metrics',
        'quality:view_reports',
        'quality:export_public_data',
        
        // Read-only workflow viewing
        'workflow:view_public_status',
        'workflow:view_public_progress',
        'workflow:view_public_timeline',
        'workflow:view_public_history',
        'workflow:view_public_metrics',
        'workflow:export_public_data',
      ],
    };

    return rolePermissions[userRole] || [];
  }

  private async getDynamicPermissions(context: PermissionCheckContext): Promise<string[]> {
    const dynamicPermissions = this.getDynamicPermissionsStore();
    const userPermissions = dynamicPermissions[context.userId] || [];
    const now = new Date();

    const validPermissions = userPermissions.filter(permission => {
      // Check if permission is not expired
      if (permission.expiresAt && new Date(permission.expiresAt) < now) {
        return false;
      }

      // Check if permission applies to current context
      if (permission.context && !this.matchesContext(permission.context, context)) {
        return false;
      }

      return true;
    });

    return validPermissions.map(permission => permission.permission);
  }

  private checkPermission(
    permissions: string[],
    action: WorkflowAction | string,
    resource?: string
  ): boolean {
    if (!action) return false;
    
    const actionStr = action.toString().toLowerCase();
    const fullPermission = resource ? `${actionStr}:${resource}` : actionStr;

    return permissions.some(permission => {
      const lowerPermission = permission.toLowerCase();
      
      // Exact match
      if (lowerPermission === fullPermission) {
        return true;
      }

      // Wildcard match
      if (this.hasWildcardPermission([lowerPermission], fullPermission)) {
        return true;
      }

      // Action-only match (without resource)
      if (lowerPermission === actionStr) {
        return true;
      }

      // Check if permission contains the action (e.g., "products:create" contains "create")
      if (lowerPermission.includes(`:${actionStr}`) || lowerPermission.endsWith(`:${actionStr}`)) {
        return true;
      }

      return false;
    });
  }

  private hasWildcardPermission(permissions: string[], permission: string): boolean {
    if (!permission) return false;
    
    return permissions.some(p => {
      const lowerP = p.toLowerCase();
      const lowerPermission = permission.toLowerCase();
      
      if (lowerP === '*') return true;
      if (lowerP.endsWith(':*')) {
        const prefix = lowerP.slice(0, -2);
        return lowerPermission.startsWith(prefix + ':');
      }
      return false;
    });
  }

  private checkContextSpecificPermissions(
    context: PermissionCheckContext,
    action: WorkflowAction | string,
    resource?: string
  ): PermissionResult {
    if (!action) {
      return {
        hasPermission: false,
        reason: 'No action specified',
        source: 'denied',
      };
    }
    
    const actionStr = action.toString().toLowerCase();
    
    // Product ownership checks
    if (context.productId && context.productOwnerId) {
      if (context.userId === context.productOwnerId) {
        // Owner can edit their own products in draft state
        if (context.currentWorkflowState === WorkflowState.DRAFT && 
            ['products:write', 'workflow:edit', 'edit'].includes(actionStr)) {
          return {
            hasPermission: true,
            reason: 'Product owner can edit draft products',
            source: 'ownership',
          };
        }
      }
    }

    // Reviewer assignment checks
    if (context.assignedReviewerId && context.userId === context.assignedReviewerId) {
      if (['workflow:approve', 'workflow:reject', 'approve', 'reject'].includes(actionStr) &&
          context.currentWorkflowState === WorkflowState.REVIEW) {
        return {
          hasPermission: true,
          reason: 'Assigned reviewer can approve/reject products in review',
          source: 'assignment',
        };
      }
    }

    // Admin override for all actions
    if (context.userRole === UserRole.ADMIN) {
      return {
        hasPermission: true,
        reason: 'Admin has override permissions',
        source: 'admin_override',
      };
    }

    return {
      hasPermission: false,
      reason: 'No context-specific permissions found',
      source: 'denied',
    };
  }

  private getRoleHierarchy(): Record<UserRole, number> {
    return {
      [UserRole.ADMIN]: 1,
      [UserRole.REVIEWER]: 2,
      [UserRole.EDITOR]: 3,
      [UserRole.VIEWER]: 4,
    };
  }

  private generatePermissionKey(
    context: PermissionCheckContext,
    action: WorkflowAction | string,
    resource?: string
  ): string {
    const actionStr = action ? action.toString() : '';
    const parts = [
      context.userId,
      context.userRole,
      actionStr,
      resource || '',
      context.productId || '',
      context.targetUserId || '',
    ];
    return parts.join(':');
  }

  private getCachedPermission(key: string): boolean | null {
    const entry = this.permissionCache.get(key);
    if (!entry) return null;

    if (entry.expiresAt < Date.now()) {
      this.permissionCache.delete(key);
      return null;
    }

    return entry.result;
  }

  private cachePermission(
    key: string,
    result: boolean,
    context: PermissionCheckContext
  ): void {
    // Don't cache if cache is full
    if (this.permissionCache.size >= this.maxCacheSize) {
      this.cleanupExpiredCache();
      
      // If still full, remove oldest entries
      if (this.permissionCache.size >= this.maxCacheSize) {
        const oldestKey = this.permissionCache.keys().next().value;
        this.permissionCache.delete(oldestKey);
      }
    }

    const now = Date.now();
    this.permissionCache.set(key, {
      permission: key,
      result,
      timestamp: now,
      expiresAt: now + this.cacheTimeout,
      context,
    });
  }

  private logPermissionCheck(
    context: PermissionCheckContext,
    action: WorkflowAction | string,
    resource: string | undefined,
    result: boolean,
    reason: string
  ): void {
    const actionStr = action ? action.toString() : '';
    
    // Log to comprehensive audit logger
    permissionAuditLogger.logPermissionCheck(
      context,
      actionStr,
      resource || 'general',
      result,
      reason,
      {
        productId: context.productId,
        targetUserId: context.targetUserId,
        resourceId: context.resourceId,
        workflowState: context.currentWorkflowState,
        targetWorkflowState: context.targetWorkflowState,
        resourceType: context.resourceType,
      }
    );

    // Also maintain legacy audit log for backward compatibility
    const auditEntry: PermissionAuditEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      userId: context.userId,
      userRole: context.userRole,
      action: actionStr,
      resource: resource || 'general',
      resourceId: context.productId || context.targetUserId || context.resourceId,
      permission: `${actionStr}${resource ? `:${resource}` : ''}`,
      result,
      reason,
      context,
    };

    this.auditLog.unshift(auditEntry);

    // Maintain audit log size
    if (this.auditLog.length > this.auditLogMaxSize) {
      this.auditLog = this.auditLog.slice(0, this.auditLogMaxSize);
    }
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.permissionCache.entries()) {
      if (entry.expiresAt < now) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * Determine cache priority based on permission type and context
   */
  private determineCachePriority(
    context: PermissionCheckContext,
    action: WorkflowAction | string,
    resource: string | undefined,
    result: PermissionResult
  ): CachePriority {
    // Admin permissions are critical
    if (context.userRole === UserRole.ADMIN) {
      return CachePriority.CRITICAL;
    }

    // Handle null/undefined actions
    if (!action) {
      return CachePriority.NORMAL;
    }

    // Frequently used permissions are high priority
    const actionStr = action.toString().toLowerCase();
    if (['read', 'view', 'list'].some(common => actionStr.includes(common))) {
      return CachePriority.HIGH;
    }

    // Write operations are normal priority
    if (['create', 'update', 'edit', 'delete'].some(common => actionStr.includes(common))) {
      return CachePriority.NORMAL;
    }

    // Denied permissions are low priority (less likely to be checked again)
    if (!result.hasPermission) {
      return CachePriority.LOW;
    }

    return CachePriority.NORMAL;
  }

  /**
   * Generate cache tags for better invalidation
   */
  private generateCacheTags(
    context: PermissionCheckContext,
    action: WorkflowAction | string,
    resource: string | undefined
  ): string[] {
    const tags: string[] = [];

    // Role-based tags
    tags.push(`role:${context.userRole}`);
    
    // User-based tags
    if (context.userId) {
      tags.push(`user:${context.userId}`);
    }

    // Action-based tags
    if (action) {
      const actionStr = action.toString().toLowerCase();
      tags.push(`action:${actionStr}`);
    }

    // Resource-based tags
    if (resource) {
      tags.push(`resource:${resource}`);
    }

    // Context-based tags
    if (context.productId) {
      tags.push(`product:${context.productId}`);
    }

    if (context.productOwnerId) {
      tags.push(`owner:${context.productOwnerId}`);
    }

    if (context.assignedReviewerId) {
      tags.push(`reviewer:${context.assignedReviewerId}`);
    }

    return tags;
  }

  /**
   * Warm cache with common permissions
   */
  private async warmCommonPermissions(): Promise<void> {
    const commonPermissions = [
      // Admin permissions
      {
        key: 'admin:products:read',
        result: true,
        context: { userRole: UserRole.ADMIN } as Partial<PermissionCheckContext>,
        source: 'role' as const,
        priority: CachePriority.CRITICAL,
        tags: ['role:admin', 'action:read', 'resource:products'],
      },
      {
        key: 'admin:workflow:approve',
        result: true,
        context: { userRole: UserRole.ADMIN } as Partial<PermissionCheckContext>,
        source: 'role' as const,
        priority: CachePriority.CRITICAL,
        tags: ['role:admin', 'action:approve', 'resource:workflow'],
      },
      
      // Editor permissions
      {
        key: 'editor:products:create',
        result: true,
        context: { userRole: UserRole.EDITOR } as Partial<PermissionCheckContext>,
        source: 'role' as const,
        priority: CachePriority.HIGH,
        tags: ['role:editor', 'action:create', 'resource:products'],
      },
      {
        key: 'editor:products:read',
        result: true,
        context: { userRole: UserRole.EDITOR } as Partial<PermissionCheckContext>,
        source: 'hierarchy' as const,
        priority: CachePriority.HIGH,
        tags: ['role:editor', 'action:read', 'resource:products'],
      },
      
      // Reviewer permissions
      {
        key: 'reviewer:workflow:approve',
        result: true,
        context: { userRole: UserRole.REVIEWER } as Partial<PermissionCheckContext>,
        source: 'role' as const,
        priority: CachePriority.HIGH,
        tags: ['role:reviewer', 'action:approve', 'resource:workflow'],
      },
      {
        key: 'reviewer:products:read',
        result: true,
        context: { userRole: UserRole.REVIEWER } as Partial<PermissionCheckContext>,
        source: 'hierarchy' as const,
        priority: CachePriority.HIGH,
        tags: ['role:reviewer', 'action:read', 'resource:products'],
      },
      
      // Viewer permissions
      {
        key: 'viewer:products:read',
        result: true,
        context: { userRole: UserRole.VIEWER } as Partial<PermissionCheckContext>,
        source: 'role' as const,
        priority: CachePriority.HIGH,
        tags: ['role:viewer', 'action:read', 'resource:products'],
      },
      
      // Common denied permissions
      {
        key: 'viewer:products:create',
        result: false,
        context: { userRole: UserRole.VIEWER } as Partial<PermissionCheckContext>,
        source: 'denied' as const,
        priority: CachePriority.LOW,
        tags: ['role:viewer', 'action:create', 'resource:products'],
      },
    ];

    await this.advancedCache.warmCache(commonPermissions);
  }

  private matchesContext(permissionContext: any, userContext: PermissionCheckContext): boolean {
    // Simple context matching - in a real implementation, this would be more sophisticated
    if (permissionContext.userRole && permissionContext.userRole !== userContext.userRole) {
      return false;
    }
    if (permissionContext.resourceType && permissionContext.resourceType !== userContext.resourceType) {
      return false;
    }
    return true;
  }

  private getDynamicPermissionsStore(): Record<string, DynamicPermission[]> {
    // In a real implementation, this would be stored in a database
    // For now, we'll use a simple in-memory store
    if (!(global as any).dynamicPermissions) {
      (global as any).dynamicPermissions = {};
    }
    return (global as any).dynamicPermissions;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Check if an action is considered high-risk for security monitoring
   */
  private isHighRiskAction(action: string): boolean {
    const highRiskActions = [
      'delete',
      'admin',
      'manage_users',
      'system_config',
      'export_data',
      'bulk_operations',
      'approve',
      'reject',
      'publish',
      'assign_permission',
      'revoke_permission',
    ];

    const actionLower = action.toLowerCase();
    return highRiskActions.some(riskAction => actionLower.includes(riskAction));
  }

  // Dynamic Permission Management Methods

  /**
   * Assign a dynamic permission to a user
   */
  assignDynamicPermission(
    userId: string,
    permission: string,
    grantedBy: string,
    reason: string,
    options: {
      resourceId?: string;
      userRole?: UserRole;
      expiresAt?: Date;
      metadata?: Record<string, any>;
    } = {}
  ) {
    const result = this.dynamicPermissions.assignPermission(
      userId,
      permission,
      grantedBy,
      reason,
      options
    );
    
    // Log dynamic permission assignment
    if (result.success) {
      permissionAuditLogger.logDynamicPermissionAssigned(
        userId,
        options.userRole || UserRole.VIEWER, // Default role if not specified
        options.metadata?.userEmail || 'unknown@example.com', // Default email if not specified
        permission,
        grantedBy,
        reason,
        options.metadata
      );
      
      // Clear cache for this user to ensure fresh permission checks
      this.clearUserCache(userId);
    }
    
    return result;
  }

  /**
   * Revoke a dynamic permission assignment
   */
  revokeDynamicPermission(
    assignmentId: string,
    revokedBy: string,
    reason: string,
    metadata?: Record<string, any>
  ) {
    const result = this.dynamicPermissions.revokePermission(
      assignmentId,
      revokedBy,
      reason,
      metadata
    );
    
    // Log dynamic permission revocation
    if (result.success && result.revocation) {
      permissionAuditLogger.logDynamicPermissionRevoked(
        result.revocation.userId,
        result.revocation.userRole || UserRole.VIEWER,
        metadata?.userEmail || 'unknown@example.com',
        result.revocation.permission,
        revokedBy,
        reason,
        metadata
      );
      
      // Clear cache for the affected user to ensure fresh permission checks
      this.clearUserCache(result.revocation.userId);
    }
    
    return result;
  }

  /**
   * Revoke all dynamic permissions for a user
   */
  revokeAllUserDynamicPermissions(
    userId: string,
    revokedBy: string,
    reason: string,
    metadata?: Record<string, any>
  ) {
    const results = this.dynamicPermissions.revokeAllUserPermissions(
      userId,
      revokedBy,
      reason,
      metadata
    );
    
    // Clear cache for the affected user to ensure fresh permission checks
    if (results.length > 0) {
      this.clearUserCache(userId);
    }
    
    return results;
  }

  /**
   * Get dynamic permissions for a user
   */
  getUserDynamicPermissions(userId: string, context?: PermissionCheckContext) {
    return this.dynamicPermissions.getUserPermissions(userId, context);
  }

  /**
   * Get dynamic permissions for a role
   */
  getRoleDynamicPermissions(userRole: UserRole, context?: PermissionCheckContext) {
    return this.dynamicPermissions.getRolePermissions(userRole, context);
  }

  /**
   * Check if a user has a specific dynamic permission
   */
  hasDynamicPermission(
    userId: string,
    permission: string,
    context?: PermissionCheckContext
  ) {
    return this.dynamicPermissions.hasPermission(userId, permission, context);
  }

  /**
   * Get all dynamic permission assignments with optional filtering
   */
  getDynamicPermissionAssignments(filters?: any) {
    return this.dynamicPermissions.getAssignments(filters);
  }

  /**
   * Get all dynamic permission revocations
   */
  getDynamicPermissionRevocations() {
    return this.dynamicPermissions.getRevocations();
  }

  /**
   * Get dynamic permission statistics
   */
  getDynamicPermissionStatistics() {
    return this.dynamicPermissions.getStatistics();
  }

  /**
   * Clean up expired dynamic permissions
   */
  cleanupExpiredDynamicPermissions() {
    return this.dynamicPermissions.cleanupExpiredPermissions();
  }

  /**
   * Clear all dynamic permissions (for testing)
   */
  clearAllDynamicPermissions() {
    this.dynamicPermissions.clear();
  }

  /**
   * Clear all caches (for testing)
   */
  clearAllCaches() {
    this.permissionCache.clear();
    this.advancedCache.clearAll();
  }
}

// Export singleton instance
export const rolePermissions = new RolePermissions();

// Helper functions for direct use
export async function hasPermission(
  context: PermissionCheckContext,
  action: WorkflowAction | string,
  resource?: string
): Promise<PermissionResult> {
  return rolePermissions.hasPermission(context, action, resource);
}

export async function canPerformAction(
  context: PermissionCheckContext,
  action: WorkflowAction | string,
  resourceId?: string
): Promise<PermissionResult> {
  return rolePermissions.canPerformAction(context, action, resourceId);
}

export async function canAccessProduct(
  context: PermissionCheckContext,
  productId: string,
  action: WorkflowAction | string = 'READ'
): Promise<PermissionResult> {
  return rolePermissions.canAccessProduct(context, productId, action);
}

export async function canManageUser(
  context: PermissionCheckContext,
  targetUserId: string,
  action: WorkflowAction | string = 'MANAGE_USERS'
): Promise<PermissionResult> {
  return rolePermissions.canManageUser(context, targetUserId, action);
}

export function getRolePermissions(userRole: UserRole): string[] {
  return rolePermissions.getRolePermissions(userRole);
}

export async function getEffectivePermissions(
  context: PermissionCheckContext,
  includeDynamic: boolean = true
): Promise<string[]> {
return rolePermissions.getEffectivePermissions(context, includeDynamic);
}

export function getPermissionAuditLog(filters?: {
  userId?: string;
  userRole?: UserRole;
  action?: string;
  result?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): PermissionAuditEntry[] {
  return rolePermissions.getPermissionAuditLog(filters);
}

// Dynamic Permission Management Helper Functions

export function assignDynamicPermission(
  userId: string,
  permission: string,
  grantedBy: string,
  reason: string,
  options: {
    resourceId?: string;
    userRole?: UserRole;
    expiresAt?: Date;
    metadata?: Record<string, any>;
  } = {}
) {
  return rolePermissions.assignDynamicPermission(userId, permission, grantedBy, reason, options);
}

export function revokeDynamicPermission(
  assignmentId: string,
  revokedBy: string,
  reason: string,
  metadata?: Record<string, any>
) {
  return rolePermissions.revokeDynamicPermission(assignmentId, revokedBy, reason, metadata);
}

export function revokeAllUserDynamicPermissions(
  userId: string,
  revokedBy: string,
  reason: string,
  metadata?: Record<string, any>
) {
  return rolePermissions.revokeAllUserDynamicPermissions(userId, revokedBy, reason, metadata);
}

export function getUserDynamicPermissions(userId: string, context?: PermissionCheckContext) {
  return rolePermissions.getUserDynamicPermissions(userId, context);
}

export function getRoleDynamicPermissions(userRole: UserRole, context?: PermissionCheckContext) {
  return rolePermissions.getRoleDynamicPermissions(userRole, context);
}

export function hasDynamicPermission(
  userId: string,
  permission: string,
  context?: PermissionCheckContext
) {
  return rolePermissions.hasDynamicPermission(userId, permission, context);
}

export function getDynamicPermissionAssignments(filters?: any) {
  return rolePermissions.getDynamicPermissionAssignments(filters);
}

export function getDynamicPermissionRevocations() {
  return rolePermissions.getDynamicPermissionRevocations();
}

export function getDynamicPermissionStatistics() {
  return rolePermissions.getDynamicPermissionStatistics();
}

export function cleanupExpiredDynamicPermissions() {
  return rolePermissions.cleanupExpiredDynamicPermissions();
}
