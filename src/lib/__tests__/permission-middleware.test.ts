import { NextRequest, NextResponse } from 'next/server';
import { RolePermissions } from '../role-permissions';
import { UserRole, WorkflowAction } from '../../types/workflow';
import {
  createPermissionMiddleware,
  withPermissionValidation,
  createCommonPermissionMiddleware,
  createMultiPermissionMiddleware,
  createAnyPermissionMiddleware,
  extractUserContext,
  extractResourceId,
} from '../permission-middleware';

// Mock NextRequest and NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, options) => ({
    url,
    method: options?.method || 'GET',
    headers: new Map(),
  })),
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: data,
      status: options?.status || 200,
    })),
  },
}));

describe('Permission Middleware', () => {
  let rolePermissions: RolePermissions;
  let mockRequest: NextRequest;

  beforeEach(() => {
    rolePermissions = new RolePermissions();
    
    // Mock NextRequest with proper headers
    const headers = new Map([
      ['x-user-role', UserRole.ADMIN],
      ['x-user-id', 'user-123'],
      ['x-product-id', 'product-123'],
      ['x-product-owner-id', 'owner-456'],
      ['x-assigned-reviewer-id', 'reviewer-789'],
    ]);
    
    mockRequest = {
      url: 'https://example.com/api/products/123',
      method: 'GET',
      headers: {
        get: (key: string) => headers.get(key),
      },
    } as any;
  });

  describe('extractUserContext', () => {
    it('should extract user context from headers', () => {
      const context = extractUserContext(mockRequest);
      
      expect(context).toEqual({
        userRole: UserRole.ADMIN,
        userId: 'user-123',
        productId: 'product-123',
        productOwnerId: 'owner-456',
        assignedReviewerId: 'reviewer-789',
      });
    });

    it('should return null when user role is missing', () => {
      const headers = new Map([
        ['x-user-id', 'user-123'],
      ]);
      
      const requestWithoutRole = {
        ...mockRequest,
        headers: {
          get: (key: string) => headers.get(key),
        },
      } as any;

      const context = extractUserContext(requestWithoutRole);
      expect(context).toBeNull();
    });

    it('should return null when user ID is missing', () => {
      const headers = new Map([
        ['x-user-role', UserRole.ADMIN],
      ]);
      
      const requestWithoutUserId = {
        ...mockRequest,
        headers: {
          get: (key: string) => headers.get(key),
        },
      } as any;

      const context = extractUserContext(requestWithoutUserId);
      expect(context).toBeNull();
    });

    it('should handle optional context fields', () => {
      const headers = new Map([
        ['x-user-role', UserRole.VIEWER],
        ['x-user-id', 'user-123'],
      ]);
      
      const minimalRequest = {
        ...mockRequest,
        headers: {
          get: (key: string) => headers.get(key),
        },
      } as any;

      const context = extractUserContext(minimalRequest);
      expect(context).toEqual({
        userRole: UserRole.VIEWER,
        userId: 'user-123',
        productId: undefined,
        productOwnerId: undefined,
        assignedReviewerId: undefined,
      });
    });
  });

  describe('extractResourceId', () => {
    it('should extract resource ID from URL path', () => {
      const request = {
        url: 'https://example.com/api/products/123',
      } as any;

      const resourceId = extractResourceId(request, 'productId');
      expect(resourceId).toBe('123');
    });

    it('should extract resource ID from search parameters', () => {
      const request = {
        url: 'https://example.com/api/products?productId=456',
      } as any;

      const resourceId = extractResourceId(request, 'productId');
      expect(resourceId).toBe('456');
    });

    it('should return undefined when resource ID not found', () => {
      const request = {
        url: 'https://example.com/api/products',
      } as any;

      const resourceId = extractResourceId(request, 'productId');
      expect(resourceId).toBeUndefined();
    });

    it('should return undefined when no resource ID param specified', () => {
      const resourceId = extractResourceId(mockRequest);
      expect(resourceId).toBeUndefined();
    });
  });

  describe('createPermissionMiddleware', () => {
    it('should allow access when user has permission', async () => {
      const middleware = createPermissionMiddleware(rolePermissions, {
        action: WorkflowAction.CREATE,
        resource: 'products',
      });

      const response = await middleware(mockRequest);
      expect(response).toBeNull(); // Null means allow access
    });

    it('should deny access when user lacks permission', async () => {
      const headers = new Map([
        ['x-user-role', UserRole.VIEWER],
        ['x-user-id', 'viewer-123'],
      ]);
      
      const viewerRequest = {
        ...mockRequest,
        headers: {
          get: (key: string) => headers.get(key),
        },
      } as any;

      const middleware = createPermissionMiddleware(rolePermissions, {
        action: WorkflowAction.CREATE,
        resource: 'products',
      });

      const response = await middleware(viewerRequest);
      expect(response).not.toBeNull();
      expect(response.status).toBe(403);
    });

    it('should require authentication by default', async () => {
      const requestWithoutAuth = {
        ...mockRequest,
        headers: new Map(),
      } as any;

      const middleware = createPermissionMiddleware(rolePermissions, {
        action: WorkflowAction.VIEW_ALL_PRODUCTS,
        resource: 'products',
      });

      const response = await middleware(requestWithoutAuth);
      expect(response).not.toBeNull();
      expect(response.status).toBe(401);
    });

    it('should allow access without auth when requireAuth is false', async () => {
      const requestWithoutAuth = {
        ...mockRequest,
        headers: {
          get: (key: string) => null,
        },
      } as any;

      const middleware = createPermissionMiddleware(rolePermissions, {
        action: WorkflowAction.VIEW_ALL_PRODUCTS,
        resource: 'products',
        requireAuth: false,
      });

      const response = await middleware(requestWithoutAuth);
      expect(response).toBeNull(); // Allow access
    });

    it('should use custom permission check when provided', async () => {
      const customCheck = jest.fn().mockResolvedValue(true);

      const middleware = createPermissionMiddleware(rolePermissions, {
        action: WorkflowAction.CREATE,
        resource: 'products',
        customCheck,
      });

      const response = await middleware(mockRequest);
      expect(response).toBeNull(); // Allow access
      expect(customCheck).toHaveBeenCalledWith(
        expect.objectContaining({
          userRole: UserRole.ADMIN,
          userId: 'user-123',
        }),
        mockRequest
      );
    });

    it('should deny access when custom check returns false', async () => {
      const customCheck = jest.fn().mockResolvedValue(false);

      const middleware = createPermissionMiddleware(rolePermissions, {
        action: WorkflowAction.CREATE,
        resource: 'products',
        customCheck,
      });

      const response = await middleware(mockRequest);
      expect(response).not.toBeNull();
      expect(response.status).toBe(403);
    });

    it('should use custom error responses', async () => {
      const customPermissionDenied = jest.fn().mockReturnValue(
        NextResponse.json({ custom: 'denied' }, { status: 403 })
      );

      const viewerRequest = {
        ...mockRequest,
        headers: new Map([
          ['x-user-role', UserRole.VIEWER],
          ['x-user-id', 'viewer-123'],
        ]),
      } as any;

      const middleware = createPermissionMiddleware(rolePermissions, {
        action: WorkflowAction.CREATE,
        resource: 'products',
        onPermissionDenied: customPermissionDenied,
      });

      const response = await middleware(viewerRequest);
      expect(customPermissionDenied).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const middleware = createPermissionMiddleware(rolePermissions, {
        action: WorkflowAction.CREATE,
        resource: 'products',
        resourceIdParam: 'productId',
      });

      // Mock a request that will cause an error
      const invalidRequest = {
        url: 'invalid-url',
        method: 'GET',
        headers: new Map([
          ['x-user-role', UserRole.ADMIN],
          ['x-user-id', 'user-123'],
        ]),
      } as any;

      const response = await middleware(invalidRequest);
      expect(response).not.toBeNull();
      expect(response.status).toBe(500);
    });
  });

  describe('withPermissionValidation', () => {
    it('should wrap handler with permission validation', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      );

      const wrappedHandler = withPermissionValidation(rolePermissions, {
        action: WorkflowAction.VIEW_ALL_PRODUCTS,
        resource: 'products',
      })(mockHandler);

      const response = await wrappedHandler(mockRequest);
      expect(mockHandler).toHaveBeenCalledWith(mockRequest);
      expect(response.json).toEqual({ success: true });
    });

    it('should block handler when permission denied', async () => {
      const mockHandler = jest.fn();

      const viewerRequest = {
        ...mockRequest,
        headers: new Map([
          ['x-user-role', UserRole.VIEWER],
          ['x-user-id', 'viewer-123'],
        ]),
      } as any;

      const wrappedHandler = withPermissionValidation(rolePermissions, {
        action: WorkflowAction.CREATE,
        resource: 'products',
      })(mockHandler);

      const response = await wrappedHandler(viewerRequest);
      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe('createCommonPermissionMiddleware', () => {
    it('should create product middleware', async () => {
      const middleware = createCommonPermissionMiddleware.product(
        rolePermissions,
        WorkflowAction.CREATE
      );

      const response = await middleware(mockRequest);
      expect(response).toBeNull(); // Allow access
    });

    it('should create user middleware', async () => {
      const middleware = createCommonPermissionMiddleware.user(
        rolePermissions,
        WorkflowAction.MANAGE_USERS
      );

      const response = await middleware(mockRequest);
      expect(response).toBeNull(); // Allow access
    });

    it('should create workflow middleware', async () => {
      const middleware = createCommonPermissionMiddleware.workflow(
        rolePermissions,
        WorkflowAction.APPROVE
      );

      const response = await middleware(mockRequest);
      expect(response).toBeNull(); // Allow access
    });

    it('should create audit middleware', async () => {
      const middleware = createCommonPermissionMiddleware.audit(
        rolePermissions,
        WorkflowAction.VIEW_AUDIT_TRAIL
      );

      const response = await middleware(mockRequest);
      expect(response).toBeNull(); // Allow access
    });

    it('should create notification middleware', async () => {
      const middleware = createCommonPermissionMiddleware.notification(
        rolePermissions,
        WorkflowAction.MANAGE_NOTIFICATIONS
      );

      const response = await middleware(mockRequest);
      expect(response).toBeNull(); // Allow access
    });
  });

  describe('createMultiPermissionMiddleware', () => {
    it('should require all permissions (AND logic)', async () => {
      const middleware = createMultiPermissionMiddleware(rolePermissions, [
        { action: WorkflowAction.VIEW_ALL_PRODUCTS, resource: 'products' },
        { action: WorkflowAction.CREATE, resource: 'products' },
      ]);

      const response = await middleware(mockRequest);
      expect(response).toBeNull(); // Admin has both permissions
    });

    it('should deny access if any permission is missing', async () => {
      const viewerRequest = {
        ...mockRequest,
        headers: new Map([
          ['x-user-role', UserRole.VIEWER],
          ['x-user-id', 'viewer-123'],
        ]),
      } as any;

      const middleware = createMultiPermissionMiddleware(rolePermissions, [
        { action: WorkflowAction.VIEW_ALL_PRODUCTS, resource: 'products' },
        { action: WorkflowAction.CREATE, resource: 'products' }, // Viewer doesn't have this
      ]);

      const response = await middleware(viewerRequest);
      expect(response).not.toBeNull();
      expect(response.status).toBe(403);
    });
  });

  describe('createAnyPermissionMiddleware', () => {
    it('should allow access if any permission is granted (OR logic)', async () => {
      const viewerRequest = {
        ...mockRequest,
        headers: new Map([
          ['x-user-role', UserRole.VIEWER],
          ['x-user-id', 'viewer-123'],
        ]),
      } as any;

      const middleware = createAnyPermissionMiddleware(rolePermissions, [
        { action: 'products:read', resource: 'products' }, // Viewer has this
        { action: WorkflowAction.CREATE, resource: 'products' }, // Viewer doesn't have this
      ]);

      const response = await middleware(viewerRequest);
      expect(response).toBeNull(); // Allow access because viewer has READ permission
    });

    it('should deny access if no permissions are granted', async () => {
      const viewerRequest = {
        ...mockRequest,
        headers: new Map([
          ['x-user-role', UserRole.VIEWER],
          ['x-user-id', 'viewer-123'],
        ]),
      } as any;

      const middleware = createAnyPermissionMiddleware(rolePermissions, [
        { action: WorkflowAction.CREATE, resource: 'products' }, // Viewer doesn't have this
        { action: WorkflowAction.EXPORT_PRODUCTS, resource: 'products' }, // Viewer doesn't have this
      ]);

      const response = await middleware(viewerRequest);
      expect(response).not.toBeNull();
      expect(response.status).toBe(403);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed URLs gracefully', async () => {
      const malformedRequest = {
        url: 'not-a-valid-url',
        method: 'GET',
        headers: new Map([
          ['x-user-role', UserRole.ADMIN],
          ['x-user-id', 'user-123'],
        ]),
      } as any;

      const middleware = createPermissionMiddleware(rolePermissions, {
        action: WorkflowAction.VIEW_ALL_PRODUCTS,
        resource: 'products',
        resourceIdParam: 'productId',
      });

      const response = await middleware(malformedRequest);
      expect(response).not.toBeNull();
      expect(response.status).toBe(500);
    });

    it('should handle missing headers gracefully', async () => {
      const requestWithoutHeaders = {
        url: 'https://example.com/api/products',
        method: 'GET',
        headers: new Map(),
      } as any;

      const middleware = createPermissionMiddleware(rolePermissions, {
        action: WorkflowAction.VIEW_ALL_PRODUCTS,
        resource: 'products',
      });

      const response = await middleware(requestWithoutHeaders);
      expect(response).not.toBeNull();
      expect(response.status).toBe(401);
    });

    it('should handle invalid user roles gracefully', async () => {
      const requestWithInvalidRole = {
        ...mockRequest,
        headers: new Map([
          ['x-user-role', 'INVALID_ROLE'],
          ['x-user-id', 'user-123'],
        ]),
      } as any;

      const middleware = createPermissionMiddleware(rolePermissions, {
        action: WorkflowAction.VIEW_ALL_PRODUCTS,
        resource: 'products',
      });

      const response = await middleware(requestWithInvalidRole);
      expect(response).not.toBeNull();
      expect(response.status).toBe(500);
    });
  });

  describe('Logging', () => {
    it('should log permission checks when enabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const middleware = createPermissionMiddleware(rolePermissions, {
        action: WorkflowAction.VIEW_ALL_PRODUCTS,
        resource: 'products',
        logChecks: true,
      });

      await middleware(mockRequest);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permission check passed')
      );

      consoleSpy.mockRestore();
    });

    it('should not log when logging is disabled', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const middleware = createPermissionMiddleware(rolePermissions, {
        action: WorkflowAction.VIEW_ALL_PRODUCTS,
        resource: 'products',
        logChecks: false,
      });

      await middleware(mockRequest);
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});
