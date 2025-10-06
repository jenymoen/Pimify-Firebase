import { NextRequest, NextResponse } from 'next/server';
import { RolePermissions } from '@/lib/role-permissions';
import { WorkflowAction, UserRole } from '@/types/workflow';

// Initialize services
const rolePermissions = new RolePermissions();

/**
 * Middleware for role-based access control
 */
export function withRoleBasedAccess(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  requiredAction: WorkflowAction,
  options: {
    allowOwnResource?: boolean;
    resourceIdParam?: string;
    customPermissionCheck?: (userRole: UserRole, userId: string, context: any) => Promise<boolean>;
  } = {}
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Extract user context from headers
      const userId = request.headers.get('x-user-id');
      const userRole = request.headers.get('x-user-role') as UserRole;
      const userName = request.headers.get('x-user-name') || 'Unknown User';

      if (!userId || !userRole) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'User authentication required' 
          },
          { status: 401 }
        );
      }

      // Extract resource ID if needed
      let resourceId: string | undefined;
      if (options.resourceIdParam && context?.params) {
        resourceId = context.params[options.resourceIdParam];
      }

      // Custom permission check
      if (options.customPermissionCheck) {
        const hasCustomPermission = await options.customPermissionCheck(userRole, userId, {
          request,
          context,
          resourceId,
        });

        if (!hasCustomPermission) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Insufficient permissions for this operation' 
            },
            { status: 403 }
          );
        }
      } else {
        // Standard permission check
        const permissionContext: any = { userId };
        if (resourceId) {
          permissionContext.productId = resourceId;
        }

        const hasPermission = await rolePermissions.hasPermission(
          userRole,
          requiredAction,
          permissionContext
        );

        if (!hasPermission.isValid) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Insufficient permissions: ${hasPermission.reason}` 
            },
            { status: 403 }
          );
        }
      }

      // Add user context to request for use in handler
      (request as any).user = {
        userId,
        userRole,
        userName,
        resourceId,
      };

      // Call the original handler
      return await handler(request, context);

    } catch (error) {
      console.error('Role-based access middleware error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Internal server error' 
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware for workflow state validation
 */
export function withWorkflowValidation(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    allowedStates?: string[];
    requiredStates?: string[];
    validateTransitions?: boolean;
  } = {}
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Extract user context
      const userId = request.headers.get('x-user-id');
      const userRole = request.headers.get('x-user-role') as UserRole;

      if (!userId || !userRole) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'User authentication required' 
          },
          { status: 401 }
        );
      }

      // Get product ID from context
      const productId = context?.params?.id;
      if (!productId) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Product ID is required' 
          },
          { status: 400 }
        );
      }

      // Get product current state (this would typically come from your database)
      const product = await getProductById(productId);
      if (!product) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Product not found' 
          },
          { status: 404 }
        );
      }

      // Validate current state
      if (options.allowedStates && !options.allowedStates.includes(product.workflowState || 'DRAFT')) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Product must be in one of these states: ${options.allowedStates.join(', ')}` 
          },
          { status: 400 }
        );
      }

      if (options.requiredStates && !options.requiredStates.includes(product.workflowState || 'DRAFT')) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Product must be in one of these states: ${options.requiredStates.join(', ')}` 
          },
          { status: 400 }
        );
      }

      // Add product context to request
      (request as any).product = product;

      // Call the original handler
      return await handler(request, context);

    } catch (error) {
      console.error('Workflow validation middleware error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Internal server error' 
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware for rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    maxRequests: number;
    windowMs: number;
    keyGenerator?: (request: NextRequest) => string;
  }
) {
  // In-memory rate limit store (in production, use Redis)
  const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Generate rate limit key
      const key = options.keyGenerator 
        ? options.keyGenerator(request)
        : request.headers.get('x-user-id') || request.ip || 'anonymous';

      const now = Date.now();
      const windowStart = now - options.windowMs;

      // Clean up expired entries
      for (const [k, v] of rateLimitStore.entries()) {
        if (v.resetTime < now) {
          rateLimitStore.delete(k);
        }
      }

      // Get current rate limit data
      const current = rateLimitStore.get(key);
      
      if (!current || current.resetTime < now) {
        // First request in window or window expired
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + options.windowMs,
        });
      } else if (current.count >= options.maxRequests) {
        // Rate limit exceeded
        const retryAfter = Math.ceil((current.resetTime - now) / 1000);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Rate limit exceeded',
            retryAfter,
          },
          { 
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': options.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(current.resetTime).toISOString(),
            }
          }
        );
      } else {
        // Increment counter
        current.count++;
        rateLimitStore.set(key, current);
      }

      // Add rate limit headers
      const currentData = rateLimitStore.get(key)!;
      const response = await handler(request, context);
      
      response.headers.set('X-RateLimit-Limit', options.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', (options.maxRequests - currentData.count).toString());
      response.headers.set('X-RateLimit-Reset', new Date(currentData.resetTime).toISOString());

      return response;

    } catch (error) {
      console.error('Rate limit middleware error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Internal server error' 
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware for request validation
 */
export function withValidation<T>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  schema: any,
  options: {
    validateBody?: boolean;
    validateQuery?: boolean;
    validateParams?: boolean;
  } = { validateBody: true }
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      let dataToValidate: any = {};

      // Validate request body
      if (options.validateBody && request.method !== 'GET') {
        const body = await request.json();
        dataToValidate = { ...dataToValidate, ...body };
      }

      // Validate query parameters
      if (options.validateQuery) {
        const { searchParams } = new URL(request.url);
        const queryParams: any = {};
        for (const [key, value] of searchParams.entries()) {
          queryParams[key] = value;
        }
        dataToValidate = { ...dataToValidate, ...queryParams };
      }

      // Validate route parameters
      if (options.validateParams && context?.params) {
        dataToValidate = { ...dataToValidate, ...context.params };
      }

      // Validate data
      const validatedData = schema.parse(dataToValidate);

      // Add validated data to request
      (request as any).validatedData = validatedData;

      // Call the original handler
      return await handler(request, context);

    } catch (error) {
      console.error('Validation middleware error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error instanceof Error ? error.message : 'Unknown validation error',
        },
        { status: 400 }
      );
    }
  };
}

// Helper function (this would typically interact with your database)
async function getProductById(productId: string) {
  // This is a placeholder - replace with your actual database query
  return {
    id: productId,
    workflowState: 'DRAFT',
    // ... other product fields
  };
}
