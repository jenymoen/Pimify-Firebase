import { RolePermissions, rolePermissions } from '../role-permissions';
import { UserRole, WorkflowAction } from '../../types/workflow';
import { PermissionCheckContext } from '../role-permissions';

describe('Dynamic Permissions Integration', () => {
  let rolePermissionsInstance: RolePermissions;

  beforeEach(() => {
    rolePermissionsInstance = new RolePermissions();
    // Clear all dynamic permissions and caches for clean test state
    rolePermissionsInstance.clearAllDynamicPermissions();
    rolePermissionsInstance.clearAllCaches();
  });

  afterEach(() => {
    // Clean up after each test
    rolePermissionsInstance.clearAllDynamicPermissions();
    rolePermissionsInstance.clearAllCaches();
  });

  describe('Dynamic Permission Assignment and Checking', () => {
    it('should grant permission through dynamic assignment', async () => {
      const context: PermissionCheckContext = {
        userId: 'user-123',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
      };

      // Viewer should not have create permission by default
      const initialResult = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );
      expect(initialResult.hasPermission).toBe(false);

      // Assign dynamic permission
      const assignResult = rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Temporary access for project work'
      );

      expect(assignResult.success).toBe(true);
      expect(assignResult.assignment).toBeDefined();

      // Now user should have permission
      const dynamicResult = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );

      expect(dynamicResult.hasPermission).toBe(true);
      expect(dynamicResult.source).toBe('dynamic');
      expect(dynamicResult.reason).toContain('Permission granted by dynamic assignment');
      expect(dynamicResult.metadata?.assignmentId).toBe(assignResult.assignment?.id);
      expect(dynamicResult.metadata?.grantedBy).toBe('admin-456');
    });

    it('should grant permission with expiration', async () => {
      const context: PermissionCheckContext = {
        userId: 'user-123',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
      };

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      // Assign dynamic permission with expiration
      const assignResult = rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Temporary access with expiration',
        { expiresAt }
      );

      expect(assignResult.success).toBe(true);

      // User should have permission
      const result = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );

      expect(result.hasPermission).toBe(true);
      expect(result.metadata?.expiresAt).toEqual(expiresAt);
    });

    it('should grant resource-specific permission', async () => {
      const context: PermissionCheckContext = {
        userId: 'user-123',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
        productId: 'product-789',
      };

      // Assign resource-specific permission
      const assignResult = rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'products:edit',
        'admin-456',
        'Edit specific product',
        { resourceId: 'product-789' }
      );

      expect(assignResult.success).toBe(true);

      // User should have permission for the specific product
      const result = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.EDIT,
        'products'
      );

      expect(result.hasPermission).toBe(true);
      expect(result.source).toBe('dynamic');
    });

    it('should not grant permission for different resource', async () => {
      const context: PermissionCheckContext = {
        userId: 'user-123',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
        productId: 'product-999', // Different product
      };

      // Assign resource-specific permission
      rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'products:edit',
        'admin-456',
        'Edit specific product',
        { resourceId: 'product-789' }
      );

      // User should not have permission for different product
      const result = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.EDIT,
        'products'
      );

      expect(result.hasPermission).toBe(false);
    });

    it('should grant role-based dynamic permission', async () => {
      const context: PermissionCheckContext = {
        userId: 'user-123',
        userRole: UserRole.EDITOR,
        userEmail: 'editor@example.com',
      };

      // Assign role-based permission
      const assignResult = rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'workflow:publish',
        'admin-456',
        'Temporary publishing access',
        { userRole: UserRole.EDITOR }
      );

      expect(assignResult.success).toBe(true);

      // User should have permission
      const result = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.PUBLISH,
        'workflow'
      );

      expect(result.hasPermission).toBe(true);
      expect(result.source).toBe('dynamic');
    });
  });

  describe('Dynamic Permission Revocation', () => {
    it('should revoke dynamic permission', async () => {
      const context: PermissionCheckContext = {
        userId: 'user-123',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
      };

      // Assign dynamic permission
      const assignResult = rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Temporary access'
      );

      expect(assignResult.success).toBe(true);

      // User should have permission
      let result = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );
      expect(result.hasPermission).toBe(true);

      // Revoke the permission
      const revokeResult = rolePermissionsInstance.revokeDynamicPermission(
        assignResult.assignment!.id,
        'admin-789',
        'No longer needed'
      );

      expect(revokeResult.success).toBe(true);

      // User should no longer have permission
      result = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );
      expect(result.hasPermission).toBe(false);
    });

    it('should revoke all user dynamic permissions', async () => {
      const context: PermissionCheckContext = {
        userId: 'user-123',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
      };

      // Assign multiple dynamic permissions
      const assignResult1 = rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Permission 1'
      );

      const assignResult2 = rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'workflow:approve',
        'admin-456',
        'Permission 2'
      );

      expect(assignResult1.success).toBe(true);
      expect(assignResult2.success).toBe(true);

      // User should have both permissions
      let result1 = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );
      let result2 = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.APPROVE,
        'workflow'
      );
      expect(result1.hasPermission).toBe(true);
      expect(result2.hasPermission).toBe(true);

      // Revoke all permissions for user
      const revokeResults = rolePermissionsInstance.revokeAllUserDynamicPermissions(
        'user-123',
        'admin-789',
        'User leaving project'
      );

      expect(revokeResults).toHaveLength(2);
      expect(revokeResults.every(r => r.success)).toBe(true);

      // User should no longer have any dynamic permissions
      result1 = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );
      result2 = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.APPROVE,
        'workflow'
      );
      expect(result1.hasPermission).toBe(false);
      expect(result2.hasPermission).toBe(false);
    });
  });

  describe('Permission Priority', () => {
    it('should prioritize dynamic permissions over role permissions', async () => {
      const context: PermissionCheckContext = {
        userId: 'user-123',
        userRole: UserRole.ADMIN,
        userEmail: 'admin@example.com',
      };

      // Admin already has create permission by role
      const roleResult = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );
      expect(roleResult.hasPermission).toBe(true);
      expect(roleResult.source).toBe('role');

      // Assign dynamic permission
      const assignResult = rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Dynamic override'
      );

      expect(assignResult.success).toBe(true);

      // Should still have permission, but now from dynamic source
      const dynamicResult = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );

      expect(dynamicResult.hasPermission).toBe(true);
      expect(dynamicResult.source).toBe('dynamic');
    });

    it('should prioritize context-specific permissions over dynamic permissions', async () => {
      const context: PermissionCheckContext = {
        userId: 'user-123',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
        productOwnerId: 'user-123', // User owns the product
      };

      // Assign dynamic permission
      rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'products:edit',
        'admin-456',
        'Dynamic permission'
      );

      // User should have permission due to ownership (context-specific)
      const result = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.EDIT,
        'products'
      );

      expect(result.hasPermission).toBe(true);
      expect(result.source).toBe('ownership');
    });
  });

  describe('Permission Queries', () => {
    beforeEach(() => {
      // Set up test data
      rolePermissionsInstance.assignDynamicPermission(
        'user-1',
        'products:create',
        'admin-1',
        'Permission 1'
      );

      rolePermissionsInstance.assignDynamicPermission(
        'user-2',
        'workflow:approve',
        'admin-1',
        'Permission 2'
      );

      rolePermissionsInstance.assignDynamicPermission(
        'user-1',
        'products:edit',
        'admin-2',
        'Permission 3',
        { userRole: UserRole.EDITOR }
      );
    });

    it('should get user dynamic permissions', () => {
      const permissions = rolePermissionsInstance.getUserDynamicPermissions('user-1');
      expect(permissions).toHaveLength(2);
      expect(permissions.map(p => p.permission)).toContain('products:create');
      expect(permissions.map(p => p.permission)).toContain('products:edit');
    });

    it('should get role dynamic permissions', () => {
      const permissions = rolePermissionsInstance.getRoleDynamicPermissions(UserRole.EDITOR);
      expect(permissions).toHaveLength(1);
      expect(permissions[0].permission).toBe('products:edit');
    });

    it('should check specific dynamic permission', () => {
      const result = rolePermissionsInstance.hasDynamicPermission(
        'user-1',
        'products:create'
      );

      expect(result.hasPermission).toBe(true);
      expect(result.assignment?.permission).toBe('products:create');
    });

    it('should get dynamic permission assignments with filters', () => {
      const assignments = rolePermissionsInstance.getDynamicPermissionAssignments({
        userId: 'user-1'
      });

      expect(assignments).toHaveLength(2);
      expect(assignments.every(a => a.userId === 'user-1')).toBe(true);
    });

    it('should get dynamic permission statistics', () => {
      const stats = rolePermissionsInstance.getDynamicPermissionStatistics();

      expect(stats.totalActive).toBe(3);
      expect(stats.byRole[UserRole.EDITOR]).toBe(1);
      expect(stats.byPermission['products:create']).toBe(1);
      expect(stats.byPermission['workflow:approve']).toBe(1);
      expect(stats.byPermission['products:edit']).toBe(1);
      expect(stats.byGranter['admin-1']).toBe(2);
      expect(stats.byGranter['admin-2']).toBe(1);
    });
  });

  describe('Expiration and Cleanup', () => {
    it('should not grant expired permissions', async () => {
      const context: PermissionCheckContext = {
        userId: 'user-123',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
      };

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // Assign expired permission
      const assignResult = rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Expired permission',
        { expiresAt: pastDate }
      );

      expect(assignResult.success).toBe(true);

      // User should not have permission due to expiration
      const result = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );

      expect(result.hasPermission).toBe(false);
    });

    it('should clean up expired permissions', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Add expired permission
      rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Expired permission',
        { expiresAt: pastDate }
      );

      // Add non-expired permission
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      rolePermissionsInstance.assignDynamicPermission(
        'user-456',
        'products:create',
        'admin-456',
        'Future permission',
        { expiresAt: futureDate }
      );

      const cleanedCount = rolePermissionsInstance.cleanupExpiredDynamicPermissions();

      expect(cleanedCount).toBe(1);

      const activeAssignments = rolePermissionsInstance.getDynamicPermissionAssignments({
        isActive: true
      });
      expect(activeAssignments).toHaveLength(1);
    });
  });

  describe('Wildcard and Action-Only Permissions', () => {
    it('should support wildcard permissions', async () => {
      const context: PermissionCheckContext = {
        userId: 'user-123',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
      };

      // Assign wildcard permission
      rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'products:*',
        'admin-456',
        'Wildcard permission'
      );

      // User should have permission for any products action
      const createResult = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );
      const editResult = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.EDIT,
        'products'
      );

      expect(createResult.hasPermission).toBe(true);
      expect(editResult.hasPermission).toBe(true);
    });

    it('should support action-only permissions', async () => {
      const context: PermissionCheckContext = {
        userId: 'user-123',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
      };

      // Assign action-only permission
      rolePermissionsInstance.assignDynamicPermission(
        'user-123',
        'create',
        'admin-456',
        'Action-only permission'
      );

      // User should have permission for any create action
      const productCreateResult = await rolePermissionsInstance.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );
      const userCreateResult = await rolePermissionsInstance.hasPermission(
        context,
        'create',
        'users'
      );

      expect(productCreateResult.hasPermission).toBe(true);
      expect(userCreateResult.hasPermission).toBe(true);
    });
  });

  describe('Singleton Integration', () => {
    it('should work with singleton instance', async () => {
      const context: PermissionCheckContext = {
        userId: 'user-123',
        userRole: UserRole.VIEWER,
        userEmail: 'viewer@example.com',
      };

      // Use singleton instance
      const assignResult = rolePermissions.assignDynamicPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Singleton test'
      );

      expect(assignResult.success).toBe(true);

      const result = await rolePermissions.hasPermission(
        context,
        WorkflowAction.CREATE,
        'products'
      );

      expect(result.hasPermission).toBe(true);
      expect(result.source).toBe('dynamic');
    });
  });
});
