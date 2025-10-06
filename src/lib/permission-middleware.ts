import { NextRequest, NextResponse } from 'next/server';
import { RolePermissions } from './role-permissions';
import { UserRole, WorkflowAction, PermissionCheckContext } from '../types/workflow';

/**
 * Permission validation middleware for API routes
 * Validates user permissions before allowing access to API endpoints
 */

export interface PermissionMiddlewareOptions {
  /**
   * Required action for the endpoint
   */
  action: WorkflowAction | string;
  
  /**
   * Required resource type (e.g., 'products', 'users', 'workflow')
   */
  resource?: string;
  
  /**
   * Resource ID parameter name in the request
   */
  resourceIdParam?: string;
  
  /**
   * User ID parameter name in the request (default: 'userId')
   */
  userIdParam?: string;
  
  /**
   * Custom permission check function
   */
  customCheck?: (context: PermissionCheckContext, req: NextRequest) => Promise<boolean>;
  
  /**
   * Whether to require authentication
   */
  requireAuth?: boolean;
  
  /**
   * Custom error response for permission denied
   */
  onPermissionDenied?: (req: NextRequest, reason: string) => NextResponse;
  
  /**
   * Custom error response for authentication required
   */
  onAuthRequired?: (req: NextRequest) => NextResponse;
  
  /**
   * Whether to log permission checks
   */
  logChecks?: boolean;
}

export interface PermissionMiddlewareContext {
  userRole: UserRole;
  userId: string;
  productId?: string;
  productOwnerId?: string;
  assignedReviewerId?: string;
}

/**
 * Extract user context from request
 */
export function extractUserContext(req: NextRequest, userIdParam: string = 'userId'): PermissionMiddlewareContext | null {
  try {
    // Try to get user context from headers (common in API routes)
    const userRoleHeader = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id');
    
    if (!userRoleHeader || !userId) {
      return null;
    }
    
    // Validate that the role is a valid UserRole
    if (!Object.values(UserRole).includes(userRoleHeader as UserRole)) {
      throw new Error(`Invalid user role: ${userRoleHeader}`);
    }
    
    const userRole = userRoleHeader as UserRole;
    
    // Extract additional context from headers
    const productId = req.headers.get('x-product-id') || undefined;
    const productOwnerId = req.headers.get('x-product-owner-id') || undefined;
    const assignedReviewerId = req.headers.get('x-assigned-reviewer-id') || undefined;
    
    return {
      userRole,
      userId,
      productId,
      productOwnerId,
      assignedReviewerId,
    };
  } catch (error) {
    console.error('Error extracting user context:', error);
    // Re-throw validation errors to cause 500 responses
    if (error instanceof Error && error.message.includes('Invalid user role')) {
      throw error;
    }
    return null;
  }
}

/**
 * Extract resource ID from request
 */
export function extractResourceId(req: NextRequest, resourceIdParam?: string): string | undefined {
  if (!resourceIdParam) {
    return undefined;
  }
  
  try {
    // Try to get from URL parameters
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    
    // Look for the resource ID parameter in the path
    // For example: /api/products/123 where resourceIdParam is 'productId'
    // We need to find the segment that comes after the resource type
    const resourceTypeIndex = pathSegments.findIndex(segment => 
      segment === resourceIdParam.replace('Id', '').toLowerCase() ||
      segment === resourceIdParam.replace('Id', 's').toLowerCase()
    );
    
    if (resourceTypeIndex !== -1 && resourceTypeIndex + 1 < pathSegments.length) {
      return pathSegments[resourceTypeIndex + 1];
    }
    
    // Try to get from search parameters
    const searchParam = url.searchParams.get(resourceIdParam);
    if (searchParam) {
      return searchParam;
    }
    
    return undefined;
  } catch (error) {
    // Re-throw all errors from URL parsing to cause 500 responses
    // This includes TypeError for invalid URLs
    throw error;
  }
}

/**
 * Default permission denied response
 */
function defaultPermissionDeniedResponse(req: NextRequest, reason: string): NextResponse {
  return NextResponse.json(
    {
      error: 'Permission denied',
      message: reason,
      timestamp: new Date().toISOString(),
      path: req.url,
    },
    { status: 403 }
  );
}

/**
 * Default authentication required response
 */
function defaultAuthRequiredResponse(req: NextRequest): NextResponse {
  return NextResponse.json(
    {
      error: 'Authentication required',
      message: 'Valid user authentication is required to access this resource',
      timestamp: new Date().toISOString(),
      path: req.url,
    },
    { status: 401 }
  );
}

/**
 * Create permission validation middleware
 */
export function createPermissionMiddleware(
  rolePermissions: RolePermissions,
  options: PermissionMiddlewareOptions
) {
  return async function permissionMiddleware(req: NextRequest): Promise<NextResponse | null> {
    const {
      action,
      resource,
      resourceIdParam,
      userIdParam = 'userId',
      customCheck,
      requireAuth = true,
      onPermissionDenied = defaultPermissionDeniedResponse,
      onAuthRequired = defaultAuthRequiredResponse,
      logChecks = true,
    } = options;

    try {
      // Extract user context
      const userContext = extractUserContext(req, userIdParam);
      
      if (!userContext) {
        if (requireAuth) {
          if (logChecks) {
            console.log(`Permission check failed: No user context found for ${req.method} ${req.url}`);
          }
          return onAuthRequired(req);
        }
        // If auth is not required, allow access
        return null;
      }

      // Extract resource ID if needed
      const resourceId = extractResourceId(req, resourceIdParam);

      // Create permission check context
      const permissionContext: PermissionCheckContext = {
        userRole: userContext.userRole,
        userId: userContext.userId,
        productId: userContext.productId,
        productOwnerId: userContext.productOwnerId,
        assignedReviewerId: userContext.assignedReviewerId,
      };

      // Perform custom check if provided
      if (customCheck) {
        const customResult = await customCheck(permissionContext, req);
        if (!customResult) {
          if (logChecks) {
            console.log(`Permission check failed: Custom check failed for user ${userContext.userId} on ${req.method} ${req.url}`);
          }
          return onPermissionDenied(req, 'Custom permission check failed');
        }
        return null; // Allow access
      }

      // Perform standard permission check
      const permissionResult = await rolePermissions.hasPermission(
        permissionContext,
        action,
        resourceId
      );

      if (!permissionResult.hasPermission) {
        if (logChecks) {
          console.log(`Permission check failed: User ${userContext.userId} (${userContext.userRole}) denied access to ${action} on ${resource || 'resource'} via ${req.method} ${req.url}. Reason: ${permissionResult.reason}`);
        }
        return onPermissionDenied(req, permissionResult.reason || 'Insufficient permissions');
      }

      if (logChecks) {
        console.log(`Permission check passed: User ${userContext.userId} (${userContext.userRole}) granted access to ${action} on ${resource || 'resource'} via ${req.method} ${req.url}`);
      }

      // Permission granted, allow request to continue
      return null;

    } catch (error) {
      console.error('Permission middleware error:', error);
      return NextResponse.json(
        {
          error: 'Internal server error',
          message: 'An error occurred while checking permissions',
          timestamp: new Date().toISOString(),
          path: req.url,
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Higher-order function to wrap API route handlers with permission validation
 */
export function withPermissionValidation(
  rolePermissions: RolePermissions,
  options: PermissionMiddlewareOptions
) {
  return function <T extends any[]>(
    handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async function (req: NextRequest, ...args: T): Promise<NextResponse> {
      const middleware = createPermissionMiddleware(rolePermissions, options);
      const middlewareResponse = await middleware(req);
      
      if (middlewareResponse) {
        // Middleware returned a response (permission denied or error)
        return middlewareResponse;
      }
      
      // Permission granted, call the original handler
      return handler(req, ...args);
    };
  };
}

/**
 * Utility function to create permission middleware for common actions
 */
export const createCommonPermissionMiddleware = {
  /**
   * Create middleware for product operations
   */
  product: (rolePermissions: RolePermissions, action: WorkflowAction | string) =>
    createPermissionMiddleware(rolePermissions, {
      action,
      resource: 'products',
      resourceIdParam: 'productId',
    }),

  /**
   * Create middleware for user management operations
   */
  user: (rolePermissions: RolePermissions, action: WorkflowAction | string) =>
    createPermissionMiddleware(rolePermissions, {
      action,
      resource: 'users',
      resourceIdParam: 'userId',
    }),

  /**
   * Create middleware for workflow operations
   */
  workflow: (rolePermissions: RolePermissions, action: WorkflowAction | string) =>
    createPermissionMiddleware(rolePermissions, {
      action,
      resource: 'workflow',
      resourceIdParam: 'productId',
    }),

  /**
   * Create middleware for audit operations
   */
  audit: (rolePermissions: RolePermissions, action: WorkflowAction | string) =>
    createPermissionMiddleware(rolePermissions, {
      action,
      resource: 'audit',
      resourceIdParam: 'auditId',
    }),

  /**
   * Create middleware for notification operations
   */
  notification: (rolePermissions: RolePermissions, action: WorkflowAction | string) =>
    createPermissionMiddleware(rolePermissions, {
      action,
      resource: 'notifications',
      resourceIdParam: 'notificationId',
    }),
};

/**
 * Middleware for validating multiple permissions (AND logic)
 */
export function createMultiPermissionMiddleware(
  rolePermissions: RolePermissions,
  permissions: Array<{
    action: WorkflowAction | string;
    resource?: string;
    resourceIdParam?: string;
  }>,
  options: Omit<PermissionMiddlewareOptions, 'action' | 'resource' | 'resourceIdParam'> = {}
) {
  return createPermissionMiddleware(rolePermissions, {
    ...options,
    action: '', // Will be handled by custom check
    customCheck: async (context, req) => {
      // Check all permissions
      for (const permission of permissions) {
        const resourceId = extractResourceId(req, permission.resourceIdParam);
        const result = await rolePermissions.hasPermission(
          context,
          permission.action,
          resourceId
        );
        
        if (!result.hasPermission) {
          return false;
        }
      }
      
      return true;
    },
  });
}

/**
 * Middleware for validating any of multiple permissions (OR logic)
 */
export function createAnyPermissionMiddleware(
  rolePermissions: RolePermissions,
  permissions: Array<{
    action: WorkflowAction | string;
    resource?: string;
    resourceIdParam?: string;
  }>,
  options: Omit<PermissionMiddlewareOptions, 'action' | 'resource' | 'resourceIdParam'> = {}
) {
  return createPermissionMiddleware(rolePermissions, {
    ...options,
    action: '', // Will be handled by custom check
    customCheck: async (context, req) => {
      // Check if any permission is granted
      for (const permission of permissions) {
        const resourceId = extractResourceId(req, permission.resourceIdParam);
        const result = await rolePermissions.hasPermission(
          context,
          permission.action,
          resourceId
        );
        
        if (result.hasPermission) {
          return true;
        }
      }
      
      return false;
    },
  });
}

/**
 * Export singleton instance for easy use
 */
export const permissionMiddleware = {
  create: createPermissionMiddleware,
  withValidation: withPermissionValidation,
  common: createCommonPermissionMiddleware,
  multi: createMultiPermissionMiddleware,
  any: createAnyPermissionMiddleware,
};
