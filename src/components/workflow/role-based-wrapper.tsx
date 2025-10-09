'use client';

import React, { ReactNode, useMemo } from 'react';
import { UserRole, WorkflowAction, WorkflowState } from '@/types/workflow';
import { cn } from '@/lib/utils';

/**
 * Props for the RoleBasedWrapper component
 */
export interface RoleBasedWrapperProps {
  /** User's current role */
  userRole: UserRole;
  /** Required role(s) to show the content */
  allowedRoles?: UserRole | UserRole[];
  /** Required permission(s) to show the content */
  requiredPermissions?: WorkflowAction | WorkflowAction[];
  /** Current workflow state (for state-based permissions) */
  currentState?: WorkflowState;
  /** Whether the user owns the resource */
  isOwner?: boolean;
  /** Whether the user is assigned to the resource */
  isAssigned?: boolean;
  /** Whether the resource is locked */
  isLocked?: boolean;
  /** Whether to show content for higher roles (role hierarchy) */
  allowHigherRoles?: boolean;
  /** Whether to show content for lower roles (role hierarchy) */
  allowLowerRoles?: boolean;
  /** Custom permission check function */
  customPermissionCheck?: (context: PermissionContext) => boolean;
  /** Fallback content to show when permission is denied */
  fallback?: ReactNode;
  /** Whether to hide content instead of showing fallback */
  hideWhenDenied?: boolean;
  /** Custom className for the wrapper */
  className?: string;
  /** Children to render when permission is granted */
  children: ReactNode;
  /** Whether to show a tooltip explaining why content is hidden */
  showTooltip?: boolean;
  /** Custom tooltip message */
  tooltipMessage?: string;
  /** Whether to show a placeholder when content is hidden */
  showPlaceholder?: boolean;
  /** Custom placeholder content */
  placeholder?: ReactNode;
  /** Whether to log permission denials for debugging */
  debugMode?: boolean;
}

/**
 * Permission context for custom permission checks
 */
export interface PermissionContext {
  userRole: UserRole;
  allowedRoles: UserRole[];
  requiredPermissions: WorkflowAction[];
  currentState?: WorkflowState;
  isOwner: boolean;
  isAssigned: boolean;
  isLocked: boolean;
}

/**
 * Role hierarchy for permission checking
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 4,
  [UserRole.REVIEWER]: 3,
  [UserRole.EDITOR]: 2,
  [UserRole.VIEWER]: 1,
};

/**
 * Default permission mappings for common actions
 */
const DEFAULT_PERMISSIONS: Record<WorkflowAction, UserRole[]> = {
  [WorkflowAction.CREATE]: [UserRole.ADMIN, UserRole.EDITOR],
  [WorkflowAction.EDIT]: [UserRole.ADMIN, UserRole.EDITOR],
  [WorkflowAction.SUBMIT]: [UserRole.ADMIN, UserRole.EDITOR],
  [WorkflowAction.APPROVE]: [UserRole.ADMIN, UserRole.REVIEWER],
  [WorkflowAction.REJECT]: [UserRole.ADMIN, UserRole.REVIEWER],
  [WorkflowAction.PUBLISH]: [UserRole.ADMIN],
  [WorkflowAction.BULK_APPROVE]: [UserRole.ADMIN, UserRole.REVIEWER],
  [WorkflowAction.BULK_REJECT]: [UserRole.ADMIN, UserRole.REVIEWER],
  [WorkflowAction.BULK_PUBLISH]: [UserRole.ADMIN],
  [WorkflowAction.ASSIGN_REVIEWER]: [UserRole.ADMIN],
  [WorkflowAction.VIEW_AUDIT_TRAIL]: [UserRole.ADMIN, UserRole.REVIEWER, UserRole.EDITOR, UserRole.VIEWER],
  [WorkflowAction.MANAGE_USERS]: [UserRole.ADMIN],
  [WorkflowAction.CONFIGURE_WORKFLOW]: [UserRole.ADMIN],
  [WorkflowAction.VIEW_ALL_PRODUCTS]: [UserRole.ADMIN, UserRole.REVIEWER, UserRole.EDITOR, UserRole.VIEWER],
  [WorkflowAction.VIEW_PRODUCT_HISTORY]: [UserRole.ADMIN, UserRole.REVIEWER, UserRole.EDITOR, UserRole.VIEWER],
  [WorkflowAction.MANAGE_NOTIFICATIONS]: [UserRole.ADMIN],
  [WorkflowAction.PERFORM_BULK_OPERATIONS]: [UserRole.ADMIN, UserRole.REVIEWER],
  [WorkflowAction.EXPORT_PRODUCTS]: [UserRole.ADMIN, UserRole.REVIEWER, UserRole.EDITOR],
};

/**
 * RoleBasedWrapper component for conditional UI rendering based on user roles and permissions
 */
export const RoleBasedWrapper: React.FC<RoleBasedWrapperProps> = ({
  userRole,
  allowedRoles = [],
  requiredPermissions = [],
  currentState,
  isOwner = false,
  isAssigned = false,
  isLocked = false,
  allowHigherRoles = true,
  allowLowerRoles = false,
  customPermissionCheck,
  fallback = null,
  hideWhenDenied = false,
  className,
  children,
  showTooltip = false,
  tooltipMessage,
  showPlaceholder = false,
  placeholder,
  debugMode = false,
}) => {
  /**
   * Check if user has required role
   */
  const hasRequiredRole = useMemo((): boolean => {
    if (!allowedRoles || allowedRoles.length === 0) return true;

    const allowedRolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const userRoleLevel = ROLE_HIERARCHY[userRole];

    return allowedRolesArray.some(role => {
      const roleLevel = ROLE_HIERARCHY[role];
      
      if (allowHigherRoles && userRoleLevel >= roleLevel) return true;
      if (allowLowerRoles && userRoleLevel <= roleLevel) return true;
      if (userRoleLevel === roleLevel) return true;
      
      return false;
    });
  }, [userRole, allowedRoles, allowHigherRoles, allowLowerRoles]);

  /**
   * Check if user has required permissions
   */
  const hasRequiredPermission = useMemo((): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const requiredPermissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const userRoleLevel = ROLE_HIERARCHY[userRole];

    return requiredPermissionsArray.some(permission => {
      const allowedRolesForPermission = DEFAULT_PERMISSIONS[permission] || [];
      
      return allowedRolesForPermission.some(role => {
        const roleLevel = ROLE_HIERARCHY[role];
        
        if (allowHigherRoles && userRoleLevel >= roleLevel) return true;
        if (allowLowerRoles && userRoleLevel <= roleLevel) return true;
        if (userRoleLevel === roleLevel) return true;
        
        return false;
      });
    });
  }, [userRole, requiredPermissions, allowHigherRoles, allowLowerRoles]);

  /**
   * Check custom permission
   */
  const hasCustomPermission = useMemo((): boolean => {
    if (!customPermissionCheck) return true;

    const context: PermissionContext = {
      userRole,
      allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles],
      requiredPermissions: Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions],
      currentState,
      isOwner,
      isAssigned,
      isLocked,
    };

    return customPermissionCheck(context);
  }, [customPermissionCheck, userRole, allowedRoles, requiredPermissions, currentState, isOwner, isAssigned, isLocked]);

  /**
   * Check if content should be shown
   */
  const shouldShowContent = useMemo((): boolean => {
    const hasRole = hasRequiredRole;
    const hasPermission = hasRequiredPermission;
    const hasCustom = hasCustomPermission;

    const result = hasRole && hasPermission && hasCustom;

    if (debugMode && !result) {
      console.log('RoleBasedWrapper: Permission denied', {
        userRole,
        allowedRoles,
        requiredPermissions,
        hasRole,
        hasPermission,
        hasCustom,
        currentState,
        isOwner,
        isAssigned,
        isLocked,
      });
    }

    return result;
  }, [hasRequiredRole, hasRequiredPermission, hasCustomPermission, debugMode, userRole, allowedRoles, requiredPermissions, currentState, isOwner, isAssigned, isLocked]);

  /**
   * Get tooltip message
   */
  const getTooltipMessage = (): string => {
    if (tooltipMessage) return tooltipMessage;
    
    if (!hasRequiredRole) {
      return `This action requires one of the following roles: ${Array.isArray(allowedRoles) ? allowedRoles.join(', ') : allowedRoles}`;
    }
    
    if (!hasRequiredPermission) {
      return `This action requires one of the following permissions: ${Array.isArray(requiredPermissions) ? requiredPermissions.join(', ') : requiredPermissions}`;
    }
    
    return 'You do not have permission to view this content';
  };

  /**
   * Get placeholder content
   */
  const getPlaceholder = (): ReactNode => {
    if (placeholder) return placeholder;
    
    return (
      <div className="flex items-center justify-center p-4 text-gray-500 bg-gray-50 rounded-md border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-sm font-medium">Content Restricted</div>
          <div className="text-xs text-gray-400 mt-1">
            You don't have permission to view this content
          </div>
        </div>
      </div>
    );
  };

  // If content should be hidden and hideWhenDenied is true
  if (!shouldShowContent && hideWhenDenied) {
    return null;
  }

  // If content should be hidden and showPlaceholder is true
  if (!shouldShowContent && showPlaceholder) {
    return <div className={className}>{getPlaceholder()}</div>;
  }

  // If content should be hidden, show fallback
  if (!shouldShowContent) {
    return <div className={className}>{fallback}</div>;
  }

  // Show content with optional tooltip
  if (showTooltip) {
    return (
      <div className={cn('relative', className)} title={getTooltipMessage()}>
        {children}
      </div>
    );
  }

  // Show content normally
  return <div className={className}>{children}</div>;
};

/**
 * Higher-order component for role-based rendering
 */
export function withRoleBasedAccess<P extends object>(
  Component: React.ComponentType<P>,
  roleConfig: Omit<RoleBasedWrapperProps, 'children'>
) {
  return function RoleBasedComponent(props: P) {
    return (
      <RoleBasedWrapper {...roleConfig}>
        <Component {...props} />
      </RoleBasedWrapper>
    );
  };
}

/**
 * Hook for checking permissions
 */
export function useRoleBasedAccess(
  userRole: UserRole,
  allowedRoles?: UserRole | UserRole[],
  requiredPermissions?: WorkflowAction | WorkflowAction[],
  customPermissionCheck?: (context: PermissionContext) => boolean
) {
  return useMemo(() => {
    // Role hierarchy for permission checking
    const ROLE_HIERARCHY: Record<UserRole, number> = {
      [UserRole.ADMIN]: 4,
      [UserRole.REVIEWER]: 3,
      [UserRole.EDITOR]: 2,
      [UserRole.VIEWER]: 1,
    };

    // Default permission mappings for common actions
    const DEFAULT_PERMISSIONS: Record<WorkflowAction, UserRole[]> = {
      [WorkflowAction.CREATE]: [UserRole.ADMIN, UserRole.EDITOR],
      [WorkflowAction.EDIT]: [UserRole.ADMIN, UserRole.EDITOR],
      [WorkflowAction.SUBMIT]: [UserRole.ADMIN, UserRole.EDITOR],
      [WorkflowAction.APPROVE]: [UserRole.ADMIN, UserRole.REVIEWER],
      [WorkflowAction.REJECT]: [UserRole.ADMIN, UserRole.REVIEWER],
      [WorkflowAction.PUBLISH]: [UserRole.ADMIN],
      [WorkflowAction.BULK_APPROVE]: [UserRole.ADMIN, UserRole.REVIEWER],
      [WorkflowAction.BULK_REJECT]: [UserRole.ADMIN, UserRole.REVIEWER],
      [WorkflowAction.BULK_PUBLISH]: [UserRole.ADMIN],
      [WorkflowAction.ASSIGN_REVIEWER]: [UserRole.ADMIN],
      [WorkflowAction.VIEW_AUDIT_TRAIL]: [UserRole.ADMIN, UserRole.REVIEWER, UserRole.EDITOR, UserRole.VIEWER],
      [WorkflowAction.MANAGE_USERS]: [UserRole.ADMIN],
      [WorkflowAction.CONFIGURE_WORKFLOW]: [UserRole.ADMIN],
      [WorkflowAction.VIEW_ALL_PRODUCTS]: [UserRole.ADMIN, UserRole.REVIEWER, UserRole.EDITOR, UserRole.VIEWER],
      [WorkflowAction.VIEW_PRODUCT_HISTORY]: [UserRole.ADMIN, UserRole.REVIEWER, UserRole.EDITOR, UserRole.VIEWER],
      [WorkflowAction.MANAGE_NOTIFICATIONS]: [UserRole.ADMIN],
      [WorkflowAction.PERFORM_BULK_OPERATIONS]: [UserRole.ADMIN, UserRole.REVIEWER],
      [WorkflowAction.EXPORT_PRODUCTS]: [UserRole.ADMIN, UserRole.REVIEWER, UserRole.EDITOR],
    };

    // Check if user has required role
    const hasRequiredRole = (): boolean => {
      if (!allowedRoles || (Array.isArray(allowedRoles) && allowedRoles.length === 0)) return true;

      const allowedRolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      const userRoleLevel = ROLE_HIERARCHY[userRole];

      return allowedRolesArray.some(role => {
        const roleLevel = ROLE_HIERARCHY[role];
        return userRoleLevel >= roleLevel; // Allow higher roles by default
      });
    };

    // Check if user has required permissions
    const hasRequiredPermission = (): boolean => {
      if (!requiredPermissions || (Array.isArray(requiredPermissions) && requiredPermissions.length === 0)) return true;

      const requiredPermissionsArray = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      const userRoleLevel = ROLE_HIERARCHY[userRole];

      return requiredPermissionsArray.some(permission => {
        const allowedRolesForPermission = DEFAULT_PERMISSIONS[permission] || [];
        
        return allowedRolesForPermission.some(role => {
          const roleLevel = ROLE_HIERARCHY[role];
          return userRoleLevel >= roleLevel;
        });
      });
    };

    // Check custom permission
    const hasCustomPermission = (): boolean => {
      if (!customPermissionCheck) return true;

      const context: PermissionContext = {
        userRole,
        allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles],
        requiredPermissions: Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions],
        currentState: undefined,
        isOwner: false,
        isAssigned: false,
        isLocked: false,
      };

      return customPermissionCheck(context);
    };

    const hasRole = hasRequiredRole();
    const hasPermission = hasRequiredPermission();
    const hasCustom = hasCustomPermission();
    const hasAccess = hasRole && hasPermission && hasCustom;

    return {
      hasAccess,
      userRole,
      allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : (allowedRoles ? [allowedRoles] : []),
      requiredPermissions: Array.isArray(requiredPermissions) ? requiredPermissions : (requiredPermissions ? [requiredPermissions] : []),
      hasRole,
      hasPermission,
      hasCustom,
    };
  }, [userRole, allowedRoles, requiredPermissions, customPermissionCheck]);
}

/**
 * Pre-configured role-based wrappers for common use cases
 */
export const AdminOnly: React.FC<Omit<RoleBasedWrapperProps, 'allowedRoles'>> = (props) => (
  <RoleBasedWrapper {...props} allowedRoles={UserRole.ADMIN} />
);

export const ReviewerOnly: React.FC<Omit<RoleBasedWrapperProps, 'allowedRoles'>> = (props) => (
  <RoleBasedWrapper {...props} allowedRoles={UserRole.REVIEWER} />
);

export const EditorOnly: React.FC<Omit<RoleBasedWrapperProps, 'allowedRoles'>> = (props) => (
  <RoleBasedWrapper {...props} allowedRoles={UserRole.EDITOR} />
);

export const ViewerOnly: React.FC<Omit<RoleBasedWrapperProps, 'allowedRoles'>> = (props) => (
  <RoleBasedWrapper {...props} allowedRoles={UserRole.VIEWER} />
);

export const AdminAndReviewer: React.FC<Omit<RoleBasedWrapperProps, 'allowedRoles'>> = (props) => (
  <RoleBasedWrapper {...props} allowedRoles={[UserRole.ADMIN, UserRole.REVIEWER]} />
);

export const AdminAndEditor: React.FC<Omit<RoleBasedWrapperProps, 'allowedRoles'>> = (props) => (
  <RoleBasedWrapper {...props} allowedRoles={[UserRole.ADMIN, UserRole.EDITOR]} />
);

export const AllRoles: React.FC<Omit<RoleBasedWrapperProps, 'allowedRoles'>> = (props) => (
  <RoleBasedWrapper {...props} allowedRoles={[UserRole.ADMIN, UserRole.REVIEWER, UserRole.EDITOR, UserRole.VIEWER]} />
);

/**
 * Permission-based wrappers
 */
export const CanEdit: React.FC<Omit<RoleBasedWrapperProps, 'requiredPermissions'>> = (props) => (
  <RoleBasedWrapper {...props} requiredPermissions={WorkflowAction.EDIT} />
);

export const CanApprove: React.FC<Omit<RoleBasedWrapperProps, 'requiredPermissions'>> = (props) => (
  <RoleBasedWrapper {...props} requiredPermissions={WorkflowAction.APPROVE} />
);

export const CanPublish: React.FC<Omit<RoleBasedWrapperProps, 'requiredPermissions'>> = (props) => (
  <RoleBasedWrapper {...props} requiredPermissions={WorkflowAction.PUBLISH} />
);

export const CanManageUsers: React.FC<Omit<RoleBasedWrapperProps, 'requiredPermissions'>> = (props) => (
  <RoleBasedWrapper {...props} requiredPermissions={WorkflowAction.MANAGE_USERS} />
);

export const CanViewAuditTrail: React.FC<Omit<RoleBasedWrapperProps, 'requiredPermissions'>> = (props) => (
  <RoleBasedWrapper {...props} requiredPermissions={WorkflowAction.VIEW_AUDIT_TRAIL} />
);

export default RoleBasedWrapper;
