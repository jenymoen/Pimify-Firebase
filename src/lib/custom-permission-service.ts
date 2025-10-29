/**
 * Custom Permission Service
 *
 * Thin wrapper around DynamicPermissionManager to grant/revoke user-level
 * permissions (optionally time-limited) with simple audit hooks.
 */

import { DynamicPermissionManager } from './dynamic-permissions';
import { PermissionCheckContext } from './role-permissions';
import { userActivityLogger } from './user-activity-logger';
import { permissionAuditLogger } from './permission-audit-logger';

export interface GrantPermissionInput {
  userId: string;
  permission: string;
  grantedBy: string;
  reason: string;
  expiresAt?: Date;
  resourceType?: string;
  resourceId?: string;
  context?: Record<string, any>;
}

export interface RevokePermissionInput {
  userId: string;
  permissionId: string;
  revokedBy: string;
  reason: string;
}

export interface PermissionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export class CustomPermissionService {
  constructor(private readonly manager: DynamicPermissionManager = new DynamicPermissionManager()) {}

  grant(input: GrantPermissionInput): PermissionResult<{ assignmentId: string }> {
    try {
      const result = this.manager.assignPermission(
        input.userId,
        input.permission,
        input.grantedBy,
        input.reason,
        {
          expiresAt: input.expiresAt,
          resourceId: input.resourceId,
          metadata: input.context,
        }
      );

      if (!result.success || !result.assignment) {
        return { success: false, error: result.error || 'Failed to grant permission', code: 'ASSIGN_FAILED' };
      }

      try {
        userActivityLogger.log({
          userId: input.userId,
          action: 'PERMISSION_GRANTED',
          description: `Granted ${input.permission}`,
          metadata: { grantedBy: input.grantedBy, reason: input.reason, permissionId: result.assignment.id },
        });
        permissionAuditLogger.logDynamicPermissionAssigned(
          input.userId,
          (undefined as any), // userRole unknown here
          '', // userEmail unknown here
          input.permission,
          input.grantedBy,
          input.reason,
          { permissionId: result.assignment.id }
        );
      } catch {}

      return { success: true, data: { assignmentId: result.assignment.id } };
    } catch (e) {
      return { success: false, error: 'Failed to grant permission', code: 'INTERNAL_ERROR' };
    }
  }

  revoke(input: RevokePermissionInput): PermissionResult<{ revoked: boolean }> {
    try {
      const result = this.manager.revokePermission(input.permissionId, input.revokedBy, input.reason);

      try {
        userActivityLogger.log({
          userId: input.userId,
          action: 'PERMISSION_REVOKED',
          description: `Revoked permission ${input.permissionId}`,
          metadata: { revokedBy: input.revokedBy, reason: input.reason },
        });
        permissionAuditLogger.logDynamicPermissionRevoked(
          input.userId,
          (undefined as any),
          '',
          '',
          input.revokedBy,
          input.reason
        );
      } catch {}

      return { success: true, data: { revoked: !!result } };
    } catch (e) {
      return { success: false, error: 'Failed to revoke permission', code: 'INTERNAL_ERROR' };
    }
  }

  getUserPermissions(userId: string, context?: PermissionCheckContext) {
    return this.manager.getUserPermissions(userId, context);
  }

  /**
   * Cleanup expired permissions (auto-expiration)
   * Returns number of assignments deactivated due to expiry.
   */
  cleanupExpired(): number {
    return this.manager.cleanupExpiredPermissions();
  }
}

export const customPermissionService = new CustomPermissionService();
