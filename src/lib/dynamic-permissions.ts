import { UserRole, WorkflowAction } from '../types/workflow';
import { PermissionCheckContext } from '../types/workflow';

/**
 * Dynamic permission assignment types
 */
export interface DynamicPermissionAssignment {
  /** Unique identifier for the permission assignment */
  id: string;
  
  /** User ID this permission is assigned to */
  userId: string;
  
  /** The permission being granted (e.g., 'products:create', 'workflow:approve') */
  permission: string;
  
  /** Resource ID this permission applies to (optional, for resource-specific permissions) */
  resourceId?: string;
  
  /** User role this permission is assigned to (for role-based assignments) */
  userRole?: UserRole;
  
  /** Who granted this permission */
  grantedBy: string;
  
  /** When this permission was granted */
  grantedAt: Date;
  
  /** When this permission expires (optional) */
  expiresAt?: Date;
  
  /** Reason for granting this permission */
  reason: string;
  
  /** Whether this permission is currently active */
  isActive: boolean;
  
  /** Additional metadata for the permission */
  metadata?: Record<string, any>;
}

/**
 * Dynamic permission revocation record
 */
export interface DynamicPermissionRevocation {
  /** Unique identifier for the revocation */
  id: string;
  
  /** ID of the permission assignment being revoked */
  assignmentId: string;
  
  /** User ID whose permission is being revoked */
  userId: string;
  
  /** The permission being revoked */
  permission: string;
  
  /** Who revoked this permission */
  revokedBy: string;
  
  /** When this permission was revoked */
  revokedAt: Date;
  
  /** Reason for revoking this permission */
  reason: string;
  
  /** Additional metadata for the revocation */
  metadata?: Record<string, any>;
}

/**
 * Dynamic permission query filters
 */
export interface DynamicPermissionFilters {
  /** Filter by user ID */
  userId?: string;
  
  /** Filter by user role */
  userRole?: UserRole;
  
  /** Filter by permission */
  permission?: string;
  
  /** Filter by resource ID */
  resourceId?: string;
  
  /** Filter by granted by user */
  grantedBy?: string;
  
  /** Filter by active status */
  isActive?: boolean;
  
  /** Filter by expiration status */
  isExpired?: boolean;
  
  /** Filter by date range */
  grantedAfter?: Date;
  grantedBefore?: Date;
  expiresAfter?: Date;
  expiresBefore?: Date;
}

/**
 * Dynamic permission assignment result
 */
export interface DynamicPermissionResult {
  /** Whether the assignment was successful */
  success: boolean;
  
  /** The created assignment (if successful) */
  assignment?: DynamicPermissionAssignment;
  
  /** Error message (if failed) */
  error?: string;
  
  /** Validation errors */
  validationErrors?: string[];
}

/**
 * Dynamic permission revocation result
 */
export interface DynamicPermissionRevocationResult {
  /** Whether the revocation was successful */
  success: boolean;
  
  /** The revocation record (if successful) */
  revocation?: DynamicPermissionRevocation;
  
  /** Error message (if failed) */
  error?: string;
}

/**
 * Dynamic permission statistics
 */
export interface DynamicPermissionStats {
  /** Total number of active assignments */
  totalActive: number;
  
  /** Total number of expired assignments */
  totalExpired: number;
  
  /** Total number of assignments by role */
  byRole: Record<UserRole, number>;
  
  /** Total number of assignments by permission */
  byPermission: Record<string, number>;
  
  /** Total number of assignments by granter */
  byGranter: Record<string, number>;
  
  /** Recent assignments (last 30 days) */
  recentAssignments: number;
  
  /** Recent revocations (last 30 days) */
  recentRevocations: number;
}

/**
 * Dynamic Permission Manager
 * Handles temporary permission assignments and revocations
 */
export class DynamicPermissionManager {
  private assignments: Map<string, DynamicPermissionAssignment> = new Map();
  private revocations: Map<string, DynamicPermissionRevocation> = new Map();
  private userAssignments: Map<string, Set<string>> = new Map();
  private roleAssignments: Map<UserRole, Set<string>> = new Map();
  private permissionAssignments: Map<string, Set<string>> = new Map();

  constructor() {
    // Initialize with empty maps
  }

  /**
   * Assign a dynamic permission to a user
   */
  assignPermission(
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
  ): DynamicPermissionResult {
    try {
      // Validate inputs
      const validationErrors = this.validateAssignment(userId, permission, grantedBy, reason, options);
      if (validationErrors.length > 0) {
        return {
          success: false,
          validationErrors,
          error: 'Validation failed'
        };
      }

      // Check for existing active assignment
      const existingAssignment = this.findActiveAssignment(userId, permission, options.resourceId);
      if (existingAssignment) {
        return {
          success: false,
          error: 'User already has an active assignment for this permission'
        };
      }

      // Create new assignment
      const assignment: DynamicPermissionAssignment = {
        id: this.generateId(),
        userId,
        permission,
        resourceId: options.resourceId,
        userRole: options.userRole,
        grantedBy,
        grantedAt: new Date(),
        expiresAt: options.expiresAt,
        reason,
        isActive: true,
        metadata: options.metadata
      };

      // Store assignment
      this.assignments.set(assignment.id, assignment);
      this.addToIndexes(assignment);

      return {
        success: true,
        assignment
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Revoke a dynamic permission assignment
   */
  revokePermission(
    assignmentId: string,
    revokedBy: string,
    reason: string,
    metadata?: Record<string, any>
  ): DynamicPermissionRevocationResult {
    try {
      // Find the assignment
      const assignment = this.assignments.get(assignmentId);
      if (!assignment) {
        return {
          success: false,
          error: 'Assignment not found'
        };
      }

      if (!assignment.isActive) {
        return {
          success: false,
          error: 'Assignment is already inactive'
        };
      }

      // Create revocation record
      const revocation: DynamicPermissionRevocation = {
        id: this.generateId(),
        assignmentId,
        userId: assignment.userId,
        permission: assignment.permission,
        revokedBy,
        revokedAt: new Date(),
        reason,
        metadata
      };

      // Deactivate assignment
      assignment.isActive = false;

      // Store revocation
      this.revocations.set(revocation.id, revocation);
      this.removeFromIndexes(assignment);

      return {
        success: true,
        revocation
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Revoke all permissions for a user
   */
  revokeAllUserPermissions(
    userId: string,
    revokedBy: string,
    reason: string,
    metadata?: Record<string, any>
  ): DynamicPermissionRevocationResult[] {
    const results: DynamicPermissionRevocationResult[] = [];
    const userAssignmentIds = this.userAssignments.get(userId) || new Set();

    for (const assignmentId of userAssignmentIds) {
      const result = this.revokePermission(assignmentId, revokedBy, reason, metadata);
      results.push(result);
    }

    return results;
  }

  /**
   * Get active dynamic permissions for a user
   */
  getUserPermissions(userId: string, context?: PermissionCheckContext): DynamicPermissionAssignment[] {
    const userAssignmentIds = this.userAssignments.get(userId) || new Set();
    const permissions: DynamicPermissionAssignment[] = [];

    for (const assignmentId of userAssignmentIds) {
      const assignment = this.assignments.get(assignmentId);
      if (assignment && assignment.isActive && !this.isExpired(assignment)) {
        // Check if permission applies to the context
        if (this.permissionAppliesToContext(assignment, context)) {
          permissions.push(assignment);
        }
      }
    }

    return permissions;
  }

  /**
   * Get active dynamic permissions for a role
   */
  getRolePermissions(userRole: UserRole, context?: PermissionCheckContext): DynamicPermissionAssignment[] {
    const roleAssignmentIds = this.roleAssignments.get(userRole) || new Set();
    const permissions: DynamicPermissionAssignment[] = [];

    for (const assignmentId of roleAssignmentIds) {
      const assignment = this.assignments.get(assignmentId);
      if (assignment && assignment.isActive && !this.isExpired(assignment)) {
        // Check if permission applies to the context
        if (this.permissionAppliesToContext(assignment, context)) {
          permissions.push(assignment);
        }
      }
    }

    return permissions;
  }

  /**
   * Check if a user has a specific dynamic permission
   */
  hasPermission(
    userId: string,
    permission: string,
    context?: PermissionCheckContext
  ): { hasPermission: boolean; assignment?: DynamicPermissionAssignment } {
    const userPermissions = this.getUserPermissions(userId, context);
    
    for (const assignment of userPermissions) {
      if (this.permissionMatches(assignment.permission, permission)) {
        return {
          hasPermission: true,
          assignment
        };
      }
    }

    return { hasPermission: false };
  }

  /**
   * Get all assignments with optional filtering
   */
  getAssignments(filters?: DynamicPermissionFilters): DynamicPermissionAssignment[] {
    let assignments = Array.from(this.assignments.values());

    if (!filters) {
      return assignments;
    }

    // Apply filters
    if (filters.userId) {
      assignments = assignments.filter(a => a.userId === filters.userId);
    }

    if (filters.userRole) {
      assignments = assignments.filter(a => a.userRole === filters.userRole);
    }

    if (filters.permission) {
      assignments = assignments.filter(a => a.permission === filters.permission);
    }

    if (filters.resourceId) {
      assignments = assignments.filter(a => a.resourceId === filters.resourceId);
    }

    if (filters.grantedBy) {
      assignments = assignments.filter(a => a.grantedBy === filters.grantedBy);
    }

    if (filters.isExpired !== undefined) {
      assignments = assignments.filter(a => {
        const expired = this.isExpired(a);
        return expired === filters.isExpired;
      });
    }

    if (filters.isActive !== undefined) {
      assignments = assignments.filter(a => a.isActive === filters.isActive);
    }

    if (filters.grantedAfter) {
      assignments = assignments.filter(a => a.grantedAt >= filters.grantedAfter!);
    }

    if (filters.grantedBefore) {
      assignments = assignments.filter(a => a.grantedAt <= filters.grantedBefore!);
    }

    if (filters.expiresAfter) {
      assignments = assignments.filter(a => a.expiresAt && a.expiresAt >= filters.expiresAfter!);
    }

    if (filters.expiresBefore) {
      assignments = assignments.filter(a => a.expiresAt && a.expiresAt <= filters.expiresBefore!);
    }

    return assignments;
  }

  /**
   * Get all revocations
   */
  getRevocations(): DynamicPermissionRevocation[] {
    return Array.from(this.revocations.values());
  }

  /**
   * Get statistics about dynamic permissions
   */
  getStatistics(): DynamicPermissionStats {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allAssignments = Array.from(this.assignments.values());
    const activeAssignments = allAssignments.filter(a => a.isActive && !this.isExpired(a));
    const expiredAssignments = allAssignments.filter(a => this.isExpired(a));

    const byRole: Record<UserRole, number> = {
      [UserRole.ADMIN]: 0,
      [UserRole.REVIEWER]: 0,
      [UserRole.EDITOR]: 0,
      [UserRole.VIEWER]: 0
    };

    const byPermission: Record<string, number> = {};
    const byGranter: Record<string, number> = {};

    for (const assignment of activeAssignments) {
      if (assignment.userRole) {
        byRole[assignment.userRole]++;
      }
      
      byPermission[assignment.permission] = (byPermission[assignment.permission] || 0) + 1;
      byGranter[assignment.grantedBy] = (byGranter[assignment.grantedBy] || 0) + 1;
    }

    const recentAssignments = allAssignments.filter(a => a.grantedAt >= thirtyDaysAgo).length;
    const recentRevocations = Array.from(this.revocations.values())
      .filter(r => r.revokedAt >= thirtyDaysAgo).length;

    return {
      totalActive: activeAssignments.length,
      totalExpired: expiredAssignments.length,
      byRole,
      byPermission,
      byGranter,
      recentAssignments,
      recentRevocations
    };
  }

  /**
   * Clean up expired permissions
   */
  cleanupExpiredPermissions(): number {
    let cleanedCount = 0;
    const now = new Date();

    for (const [id, assignment] of this.assignments) {
      if (assignment.isActive && this.isExpired(assignment)) {
        assignment.isActive = false;
        this.removeFromIndexes(assignment);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Clear all dynamic permissions (for testing)
   */
  clear(): void {
    this.assignments.clear();
    this.revocations.clear();
    this.userAssignments.clear();
    this.roleAssignments.clear();
    this.permissionAssignments.clear();
  }

  // Private helper methods

  private validateAssignment(
    userId: string,
    permission: string,
    grantedBy: string,
    reason: string,
    options: any
  ): string[] {
    const errors: string[] = [];

    if (!userId || typeof userId !== 'string') {
      errors.push('User ID is required and must be a string');
    }

    if (!permission || typeof permission !== 'string') {
      errors.push('Permission is required and must be a string');
    }

    if (!grantedBy || typeof grantedBy !== 'string') {
      errors.push('Granted by is required and must be a string');
    }

    if (!reason || typeof reason !== 'string') {
      errors.push('Reason is required and must be a string');
    }

    if (options.expiresAt && !(options.expiresAt instanceof Date)) {
      errors.push('Expires at must be a Date object');
    }

    if (options.expiresAt && options.expiresAt <= new Date()) {
      errors.push('Expires at must be in the future');
    }

    if (options.userRole && !Object.values(UserRole).includes(options.userRole)) {
      errors.push('Invalid user role');
    }

    return errors;
  }

  private findActiveAssignment(
    userId: string,
    permission: string,
    resourceId?: string
  ): DynamicPermissionAssignment | undefined {
    const userAssignmentIds = this.userAssignments.get(userId) || new Set();

    for (const assignmentId of userAssignmentIds) {
      const assignment = this.assignments.get(assignmentId);
      if (assignment && 
          assignment.isActive && 
          !this.isExpired(assignment) &&
          assignment.permission === permission &&
          assignment.resourceId === resourceId) {
        return assignment;
      }
    }

    return undefined;
  }

  private isExpired(assignment: DynamicPermissionAssignment): boolean {
    return assignment.expiresAt ? assignment.expiresAt <= new Date() : false;
  }

  private permissionAppliesToContext(
    assignment: DynamicPermissionAssignment,
    context?: PermissionCheckContext
  ): boolean {
    // If no resource ID specified, permission applies to all resources
    if (!assignment.resourceId) {
      return true;
    }

    // If context has a product ID, check if it matches
    if (context?.productId && assignment.resourceId === context.productId) {
      return true;
    }

    // If context has a user ID, check if it matches
    if (context?.userId && assignment.resourceId === context.userId) {
      return true;
    }

    return false;
  }

  private permissionMatches(assignedPermission: string, requestedPermission: string): boolean {
    // Exact match
    if (assignedPermission === requestedPermission) {
      return true;
    }

    // Wildcard match
    if (assignedPermission.endsWith(':*')) {
      const prefix = assignedPermission.slice(0, -2);
      return requestedPermission.startsWith(prefix + ':');
    }

    // Action-only match (e.g., 'create' matches 'products:create')
    if (assignedPermission === requestedPermission.split(':')[1]) {
      return true;
    }

    // Reverse action-only match (e.g., 'products:create' matches 'create')
    if (requestedPermission === assignedPermission.split(':')[1]) {
      return true;
    }

    return false;
  }

  private addToIndexes(assignment: DynamicPermissionAssignment): void {
    // Add to user index
    if (!this.userAssignments.has(assignment.userId)) {
      this.userAssignments.set(assignment.userId, new Set());
    }
    this.userAssignments.get(assignment.userId)!.add(assignment.id);

    // Add to role index
    if (assignment.userRole) {
      if (!this.roleAssignments.has(assignment.userRole)) {
        this.roleAssignments.set(assignment.userRole, new Set());
      }
      this.roleAssignments.get(assignment.userRole)!.add(assignment.id);
    }

    // Add to permission index
    if (!this.permissionAssignments.has(assignment.permission)) {
      this.permissionAssignments.set(assignment.permission, new Set());
    }
    this.permissionAssignments.get(assignment.permission)!.add(assignment.id);
  }

  private removeFromIndexes(assignment: DynamicPermissionAssignment): void {
    // Remove from user index
    const userAssignments = this.userAssignments.get(assignment.userId);
    if (userAssignments) {
      userAssignments.delete(assignment.id);
      if (userAssignments.size === 0) {
        this.userAssignments.delete(assignment.userId);
      }
    }

    // Remove from role index
    if (assignment.userRole) {
      const roleAssignments = this.roleAssignments.get(assignment.userRole);
      if (roleAssignments) {
        roleAssignments.delete(assignment.id);
        if (roleAssignments.size === 0) {
          this.roleAssignments.delete(assignment.userRole);
        }
      }
    }

    // Remove from permission index
    const permissionAssignments = this.permissionAssignments.get(assignment.permission);
    if (permissionAssignments) {
      permissionAssignments.delete(assignment.id);
      if (permissionAssignments.size === 0) {
        this.permissionAssignments.delete(assignment.permission);
      }
    }
  }

  private generateId(): string {
    return `dyn_perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const dynamicPermissionManager = new DynamicPermissionManager();
