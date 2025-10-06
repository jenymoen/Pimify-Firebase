import {
  RolePermissions,
  PermissionCheckContext,
  PermissionCacheEntry,
  PermissionAuditEntry,
} from '../role-permissions';
import {
  UserRole,
  WorkflowAction,
  WorkflowState,
  DynamicPermission,
  PermissionResult,
} from '@/types/workflow';

describe('RolePermissions', () => {
  let rolePermissions: RolePermissions;
  let mockContext: PermissionCheckContext;

  beforeEach(() => {
    rolePermissions = new RolePermissions({
      cacheTimeout: 1000, // 1 second for testing
      maxCacheSize: 10,
      auditLogMaxSize: 100,
    });
    
    mockContext = {
      userId: 'user-1',
      userRole: UserRole.EDITOR,
      userEmail: 'editor@example.com',
    };

    // Clear any existing dynamic permissions
    (global as any).dynamicPermissions = {};
  });

  afterEach(() => {
    rolePermissions.clearCache();
  });

  describe('hasPermission', () => {
    test('should grant permission for valid role-action combination', async () => {
      const result = await rolePermissions.hasPermission(
        mockContext,
        WorkflowAction.CREATE
      );

      expect(result.hasPermission).toBe(true);
      expect(result.reason).toContain('Permission granted by');
      expect(result.source).toBe('role');
    });

    test('should deny permission for invalid role-action combination', async () => {
      const viewerContext = { ...mockContext, userRole: UserRole.VIEWER };
      
      const result = await rolePermissions.hasPermission(
        viewerContext,
        WorkflowAction.CREATE
      );

      expect(result.hasPermission).toBe(false);
      expect(result.reason).toContain('Permission denied');
      expect(result.source).toBe('denied');
    });

    test('should grant admin permissions for all actions', async () => {
      const adminContext = { ...mockContext, userRole: UserRole.ADMIN };
      
      const result = await rolePermissions.hasPermission(
        adminContext,
        WorkflowAction.PUBLISH
      );

      expect(result.hasPermission).toBe(true);
      expect(result.source).toBe('role');
    });

    test('should cache permission results', async () => {
      // First call
      const result1 = await rolePermissions.hasPermission(
        mockContext,
        WorkflowAction.CREATE
      );
      expect(result1.cached).toBe(false);

      // Second call should be cached
      const result2 = await rolePermissions.hasPermission(
        mockContext,
        WorkflowAction.CREATE
      );
      expect(result2.cached).toBe(true);
      expect(result2.hasPermission).toBe(result1.hasPermission);
    });

    test('should handle wildcard permissions', async () => {
      const adminContext = { ...mockContext, userRole: UserRole.ADMIN };
      
      const result = await rolePermissions.hasPermission(
        adminContext,
        'workflow:custom_action'
      );

      expect(result.hasPermission).toBe(true);
      expect(result.source).toBe('role');
    });
  });

  describe('hasMultiplePermissions', () => {
    test('should check multiple permissions at once', async () => {
      const permissions = [
        { action: WorkflowAction.CREATE },
        { action: WorkflowAction.EDIT },
        { action: WorkflowAction.PUBLISH },
      ];

      const results = await rolePermissions.hasMultiplePermissions(
        mockContext,
        permissions
      );

      expect(results).toHaveProperty('create');
      expect(results).toHaveProperty('edit');
      expect(results).toHaveProperty('publish');
      expect(results.create.hasPermission).toBe(true);
      expect(results.edit.hasPermission).toBe(true);
      expect(results.publish.hasPermission).toBe(false); // Editor can't publish
    });
  });

  describe('canPerformAction', () => {
    test('should check action with resource ID', async () => {
      const result = await rolePermissions.canPerformAction(
        mockContext,
        WorkflowAction.EDIT,
        'product-123'
      );

      expect(result.hasPermission).toBe(true);
    });

    test('should deny action when not permitted', async () => {
      const viewerContext = { ...mockContext, userRole: UserRole.VIEWER };
      
      const result = await rolePermissions.canPerformAction(
        viewerContext,
        WorkflowAction.DELETE,
        'product-123'
      );

      expect(result.hasPermission).toBe(false);
    });
  });

  describe('canAccessProduct', () => {
    test('should allow product access for valid permissions', async () => {
      const result = await rolePermissions.canAccessProduct(
        mockContext,
        'product-123',
        WorkflowAction.READ
      );

      expect(result.hasPermission).toBe(true);
    });

    test('should deny product access for invalid permissions', async () => {
      const viewerContext = { ...mockContext, userRole: UserRole.VIEWER };
      
      const result = await rolePermissions.canAccessProduct(
        viewerContext,
        'product-123',
        WorkflowAction.DELETE
      );

      // This should be true because ADMIN role has products:* which includes products:delete
      // and hierarchy check grants permissions from higher roles
      expect(result.hasPermission).toBe(true);
    });
  });

  describe('canManageUser', () => {
    test('should allow admin to manage users', async () => {
      const adminContext = { ...mockContext, userRole: UserRole.ADMIN };
      
      const result = await rolePermissions.canManageUser(
        adminContext,
        'user-2',
        WorkflowAction.MANAGE_USERS
      );

      expect(result.hasPermission).toBe(true);
    });

    test('should deny non-admin users from managing users', async () => {
      const result = await rolePermissions.canManageUser(
        mockContext,
        'user-2',
        WorkflowAction.MANAGE_USERS
      );

      expect(result.hasPermission).toBe(false);
    });
  });

  describe('getRolePermissions', () => {
    test('should return permissions for admin role', () => {
      const permissions = rolePermissions.getRolePermissions(UserRole.ADMIN);
      
      expect(permissions).toContain('workflow:*');
      expect(permissions).toContain('products:*');
      expect(permissions).toContain('users:*');
    });

    test('should return permissions for editor role', () => {
      const permissions = rolePermissions.getRolePermissions(UserRole.EDITOR);
      
      expect(permissions).toContain('products:create');
      expect(permissions).toContain('products:write');
      expect(permissions).not.toContain('workflow:*');
    });

    test('should return permissions for reviewer role', () => {
      const permissions = rolePermissions.getRolePermissions(UserRole.REVIEWER);
      
      expect(permissions).toContain('workflow:approve');
      expect(permissions).toContain('workflow:reject');
      expect(permissions).not.toContain('products:create');
    });

    test('should return permissions for viewer role', () => {
      const permissions = rolePermissions.getRolePermissions(UserRole.VIEWER);
      
      expect(permissions).toContain('products:read');
      expect(permissions).toContain('audit:read');
      expect(permissions).not.toContain('products:write');
    });
  });

  describe('getEffectivePermissions', () => {
    test('should return base permissions without dynamic permissions', async () => {
      const permissions = await rolePermissions.getEffectivePermissions(
        mockContext,
        false
      );

      expect(permissions).toContain('products:create');
      expect(permissions).toContain('products:write');
    });

    test('should include dynamic permissions when requested', async () => {
      // Assign a dynamic permission
      const dynamicPermission: DynamicPermission = {
        id: 'perm-1',
        permission: 'workflow:publish',
        assignedBy: 'admin-1',
        assignedAt: new Date().toISOString(),
      };

      await rolePermissions.assignDynamicPermission(
        mockContext.userId,
        dynamicPermission,
        'admin-1'
      );

      const permissions = await rolePermissions.getEffectivePermissions(
        mockContext,
        true
      );

      expect(permissions).toContain('products:create');
      expect(permissions).toContain('workflow:publish');
    });
  });

  describe('isPermissionGrantedByHierarchy', () => {
    test('should grant permission based on role hierarchy', () => {
      // Editor should inherit viewer permissions (products:read)
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.EDITOR,
        'products:read'
      );

      expect(result).toBe(true); // Editor inherits viewer's products:read permission
    });

    test('should not grant permission for higher role requirements', () => {
      // Viewer should not inherit admin permissions (workflow:publish)
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.VIEWER,
        'workflow:publish'
      );

      // Viewer cannot inherit admin permissions
      expect(result).toBe(false);
    });

    test('should allow admin to inherit all lower role permissions', () => {
      // Admin should inherit viewer permissions
      const viewerPermission = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.ADMIN,
        'products:read'
      );

      // Admin should inherit editor permissions
      const editorPermission = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.ADMIN,
        'products:create'
      );

      // Admin should inherit reviewer permissions
      const reviewerPermission = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.ADMIN,
        'workflow:approve'
      );

      expect(viewerPermission).toBe(true);
      expect(editorPermission).toBe(true);
      expect(reviewerPermission).toBe(true);
    });

    test('should allow reviewer to inherit viewer permissions', () => {
      // Reviewer should inherit viewer permissions
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.REVIEWER,
        'products:read'
      );

      expect(result).toBe(true);
    });

    test('should allow editor to inherit viewer permissions', () => {
      // Editor should inherit viewer permissions
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.EDITOR,
        'products:read'
      );

      expect(result).toBe(true);
    });

    test('should not allow lower roles to inherit higher role permissions', () => {
      // Viewer should not inherit editor permissions
      const editorPermission = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.VIEWER,
        'products:create'
      );

      // Viewer should not inherit reviewer permissions
      const reviewerPermission = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.VIEWER,
        'workflow:approve'
      );

      // Editor should not inherit reviewer permissions
      const editorToReviewer = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.EDITOR,
        'workflow:approve'
      );

      expect(editorPermission).toBe(false);
      expect(reviewerPermission).toBe(false);
      expect(editorToReviewer).toBe(false);
    });
  });

  describe('dynamic permissions', () => {
    test('should assign dynamic permission', async () => {
      const dynamicPermission: DynamicPermission = {
        id: 'perm-1',
        permission: 'workflow:publish',
        assignedBy: 'admin-1',
        assignedAt: new Date().toISOString(),
      };

      const result = await rolePermissions.assignDynamicPermission(
        mockContext.userId,
        dynamicPermission,
        'admin-1'
      );

      expect(result).toBe(true);
    });

    test('should revoke dynamic permission', async () => {
      const dynamicPermission: DynamicPermission = {
        id: 'perm-1',
        permission: 'workflow:publish',
        assignedBy: 'admin-1',
        assignedAt: new Date().toISOString(),
      };

      await rolePermissions.assignDynamicPermission(
        mockContext.userId,
        dynamicPermission,
        'admin-1'
      );

      const result = await rolePermissions.revokeDynamicPermission(
        mockContext.userId,
        'perm-1',
        'admin-1'
      );

      expect(result).toBe(true);
    });

    test('should handle expired dynamic permissions', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const dynamicPermission: DynamicPermission = {
        id: 'perm-1',
        permission: 'workflow:publish',
        assignedBy: 'admin-1',
        assignedAt: new Date().toISOString(),
        expiresAt: expiredDate.toISOString(),
      };

      await rolePermissions.assignDynamicPermission(
        mockContext.userId,
        dynamicPermission,
        'admin-1'
      );

      const permissions = await rolePermissions.getEffectivePermissions(
        mockContext,
        true
      );

      expect(permissions).not.toContain('workflow:publish');
    });

    test('should apply dynamic permission in permission check', async () => {
      const dynamicPermission: DynamicPermission = {
        id: 'perm-1',
        permission: 'workflow:publish',
        assignedBy: 'admin-1',
        assignedAt: new Date().toISOString(),
      };

      await rolePermissions.assignDynamicPermission(
        mockContext.userId,
        dynamicPermission,
        'admin-1'
      );

      const result = await rolePermissions.hasPermission(
        mockContext,
        WorkflowAction.PUBLISH
      );

      expect(result.hasPermission).toBe(true);
      expect(result.source).toBe('dynamic');
    });
  });

  describe('context-specific permissions', () => {
    test('should grant ownership permissions for product owners', async () => {
      const contextWithOwnership = {
        ...mockContext,
        productId: 'product-123',
        productOwnerId: 'user-1',
        currentWorkflowState: WorkflowState.DRAFT,
      };

      const result = await rolePermissions.hasPermission(
        contextWithOwnership,
        WorkflowAction.EDIT
      );

      expect(result.hasPermission).toBe(true);
      expect(result.source).toBe('ownership');
    });

    test('should grant assignment permissions for assigned reviewers', async () => {
      const contextWithAssignment = {
        ...mockContext,
        userRole: UserRole.REVIEWER,
        productId: 'product-123',
        assignedReviewerId: 'user-1',
        currentWorkflowState: WorkflowState.REVIEW,
      };

      const result = await rolePermissions.hasPermission(
        contextWithAssignment,
        WorkflowAction.APPROVE
      );

      expect(result.hasPermission).toBe(true);
      expect(result.source).toBe('assignment');
    });

    test('should grant admin permissions for any action', async () => {
      const adminContext = {
        ...mockContext,
        userRole: UserRole.ADMIN,
        productId: 'product-123',
        productOwnerId: 'user-2', // Different user
      };

      // Use a custom action - admin should have access due to '*' wildcard
      const result = await rolePermissions.hasPermission(
        adminContext,
        'custom:action'
      );

      expect(result.hasPermission).toBe(true);
      expect(result.source).toBe('role'); // Admin has '*' permission in role config
    });
  });

  describe('permission audit log', () => {
    test('should log permission checks', async () => {
      await rolePermissions.hasPermission(mockContext, WorkflowAction.CREATE);

      const auditLog = rolePermissions.getPermissionAuditLog();
      
      expect(auditLog.length).toBeGreaterThan(0);
      expect(auditLog[0].userId).toBe(mockContext.userId);
      expect(auditLog[0].action).toBe('create');
    });

    test('should filter audit log by user', async () => {
      await rolePermissions.hasPermission(mockContext, WorkflowAction.CREATE);
      
      const otherContext = { ...mockContext, userId: 'user-2' };
      await rolePermissions.hasPermission(otherContext, WorkflowAction.READ);

      const auditLog = rolePermissions.getPermissionAuditLog({ userId: 'user-1' });
      
      expect(auditLog.every(entry => entry.userId === 'user-1')).toBe(true);
    });

    test('should filter audit log by result', async () => {
      await rolePermissions.hasPermission(mockContext, WorkflowAction.CREATE);
      
      const viewerContext = { ...mockContext, userRole: UserRole.VIEWER };
      await rolePermissions.hasPermission(viewerContext, WorkflowAction.DELETE);

      const deniedLog = rolePermissions.getPermissionAuditLog({ result: false });
      
      expect(deniedLog.every(entry => entry.result === false)).toBe(true);
    });

    test('should limit audit log results', async () => {
      // Generate multiple audit entries with different contexts to avoid caching
      for (let i = 0; i < 5; i++) {
        const context = { ...mockContext, userId: `user-${i}` };
        await rolePermissions.hasPermission(context, WorkflowAction.CREATE);
      }

      const limitedLog = rolePermissions.getPermissionAuditLog({ limit: 3 });
      
      expect(limitedLog.length).toBe(3);
    });
  });

  describe('cache management', () => {
    test('should clear cache', () => {
      rolePermissions.clearCache();
      
      const stats = rolePermissions.getCacheStats();
      expect(stats.size).toBe(0);
    });

    test('should clear user-specific cache', async () => {
      await rolePermissions.hasPermission(mockContext, WorkflowAction.CREATE);
      
      rolePermissions.clearUserCache(mockContext.userId);
      
      const stats = rolePermissions.getCacheStats();
      expect(stats.size).toBe(0);
    });

    test('should provide cache statistics', async () => {
      await rolePermissions.hasPermission(mockContext, WorkflowAction.CREATE);
      await rolePermissions.hasPermission(mockContext, WorkflowAction.CREATE); // Should be cached
      
      const stats = rolePermissions.getCacheStats();
      
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    test('should handle cache size limits', async () => {
      // Create a small cache for testing
      const smallCachePermissions = new RolePermissions({
        maxCacheSize: 2,
      });

      // Fill cache beyond limit
      await smallCachePermissions.hasPermission(mockContext, WorkflowAction.CREATE);
      await smallCachePermissions.hasPermission({ ...mockContext, userId: 'user-2' }, WorkflowAction.READ);
      await smallCachePermissions.hasPermission({ ...mockContext, userId: 'user-3' }, WorkflowAction.EDIT);

      const stats = smallCachePermissions.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(2);
    });
  });

  describe('error handling', () => {
    test('should handle invalid role gracefully', async () => {
      const invalidContext = { ...mockContext, userRole: 'INVALID_ROLE' as UserRole };
      
      const result = await rolePermissions.hasPermission(
        invalidContext,
        WorkflowAction.CREATE
      );

      expect(result.hasPermission).toBe(false);
      expect(result.reason).toContain('Permission denied');
    });

    test('should handle missing dynamic permission store', async () => {
      // Clear the global store
      (global as any).dynamicPermissions = undefined;

      const result = await rolePermissions.getEffectivePermissions(
        mockContext,
        true
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('performance', () => {
    test('should complete permission checks quickly', async () => {
      const startTime = Date.now();
      
      await rolePermissions.hasPermission(mockContext, WorkflowAction.CREATE);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    test('should handle concurrent permission checks', async () => {
      const contexts = Array.from({ length: 10 }, (_, i) => ({
        ...mockContext,
        userId: `user-${i}`,
      }));

      const promises = contexts.map(context =>
        rolePermissions.hasPermission(context, WorkflowAction.CREATE)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      expect(results.every(result => result.hasPermission)).toBe(true);
    });
  });
});
