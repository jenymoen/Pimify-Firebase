/**
 * Role Hierarchy Tests
 * 
 * Tests for role hierarchy and permission inheritance functionality:
 * - Role hierarchy levels and ordering
 * - Permission inheritance from lower roles
 * - Prevention of upward permission inheritance
 * - Hierarchy-based permission checking
 */

import { RolePermissions, PermissionCheckContext } from '../role-permissions';
import { UserRole, WorkflowAction, WorkflowState } from '@/types/workflow';

describe('Role Hierarchy', () => {
  let rolePermissions: RolePermissions;

  beforeEach(() => {
    rolePermissions = new RolePermissions();
  });

  describe('Role Hierarchy Levels', () => {
    it('should have correct role hierarchy levels', () => {
      // Admin should be level 1 (highest)
      // Reviewer should be level 2
      // Editor should be level 3
      // Viewer should be level 4 (lowest)
      
      const hierarchy = rolePermissions.getRoleHierarchy();
      
      expect(hierarchy[UserRole.ADMIN]).toBe(1);
      expect(hierarchy[UserRole.REVIEWER]).toBe(2);
      expect(hierarchy[UserRole.EDITOR]).toBe(3);
      expect(hierarchy[UserRole.VIEWER]).toBe(4);
    });

    it('should have admin as the highest role', () => {
      const hierarchy = rolePermissions.getRoleHierarchy();
      const adminLevel = hierarchy[UserRole.ADMIN];
      
      Object.values(hierarchy).forEach(level => {
        expect(adminLevel).toBeLessThanOrEqual(level);
      });
    });

    it('should have viewer as the lowest role', () => {
      const hierarchy = rolePermissions.getRoleHierarchy();
      const viewerLevel = hierarchy[UserRole.VIEWER];
      
      Object.values(hierarchy).forEach(level => {
        expect(viewerLevel).toBeGreaterThanOrEqual(level);
      });
    });
  });

  describe('Permission Inheritance', () => {
    it('should allow admin to inherit all lower role permissions', () => {
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

    it('should allow reviewer to inherit viewer permissions', () => {
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.REVIEWER,
        'products:read'
      );

      expect(result).toBe(true);
    });

    it('should allow editor to inherit viewer permissions', () => {
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.EDITOR,
        'products:read'
      );

      expect(result).toBe(true);
    });

    it('should allow reviewer to inherit editor permissions', () => {
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.REVIEWER,
        'products:create'
      );

      expect(result).toBe(true);
    });
  });

  describe('Permission Inheritance Prevention', () => {
    it('should not allow viewer to inherit editor permissions', () => {
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.VIEWER,
        'products:create'
      );

      expect(result).toBe(false);
    });

    it('should not allow viewer to inherit reviewer permissions', () => {
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.VIEWER,
        'workflow:approve'
      );

      expect(result).toBe(false);
    });

    it('should not allow viewer to inherit admin permissions', () => {
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.VIEWER,
        'workflow:publish'
      );

      expect(result).toBe(false);
    });

    it('should not allow editor to inherit reviewer permissions', () => {
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.EDITOR,
        'workflow:approve'
      );

      expect(result).toBe(false);
    });

    it('should not allow editor to inherit admin permissions', () => {
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.EDITOR,
        'workflow:publish'
      );

      expect(result).toBe(false);
    });

    it('should not allow reviewer to inherit admin permissions', () => {
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.REVIEWER,
        'workflow:publish'
      );

      expect(result).toBe(false);
    });
  });

  describe('Hierarchy-Based Permission Checking', () => {
    it('should grant permissions through hierarchy in hasPermission', async () => {
      const editorContext: PermissionCheckContext = {
        userId: 'editor-1',
        userRole: UserRole.EDITOR,
        userEmail: 'editor@example.com',
      };

      // Editor should be able to view published products through hierarchy inheritance from viewer
      const result = await rolePermissions.hasPermission(
        editorContext,
        'products:view_published',
        'products'
      );

      expect(result.hasPermission).toBe(true);
      expect(result.source).toBe('hierarchy');
    });

    it('should grant permissions through hierarchy for reviewer', async () => {
      const reviewerContext: PermissionCheckContext = {
        userId: 'reviewer-1',
        userRole: UserRole.REVIEWER,
        userEmail: 'reviewer@example.com',
      };

      // Reviewer should be able to view published products through hierarchy inheritance from viewer
      const result = await rolePermissions.hasPermission(
        reviewerContext,
        'products:view_published',
        'products'
      );

      expect(result.hasPermission).toBe(true);
      expect(result.source).toBe('hierarchy');
    });

    it('should grant permissions through hierarchy for admin', async () => {
      const adminContext: PermissionCheckContext = {
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        userEmail: 'admin@example.com',
      };

      // Admin should be able to read products through hierarchy inheritance
      const result = await rolePermissions.hasPermission(
        adminContext,
        'products:read',
        'products'
      );

      expect(result.hasPermission).toBe(true);
      // Admin has direct permission, so it should be 'role' not 'hierarchy'
      expect(result.source).toBe('role');
    });
  });

  describe('Effective Permissions with Hierarchy', () => {
    it('should include inherited permissions in effective permissions', async () => {
      const editorContext: PermissionCheckContext = {
        userId: 'editor-1',
        userRole: UserRole.EDITOR,
        userEmail: 'editor@example.com',
      };

      const effectivePermissions = await rolePermissions.getEffectivePermissions(
        editorContext,
        true // Include dynamic permissions
      );

      // Editor should have their own permissions plus inherited viewer permissions
      expect(effectivePermissions).toContain('products:create'); // Editor's own permission
      expect(effectivePermissions).toContain('products:read'); // Inherited from viewer
    });

    it('should include inherited permissions for reviewer', async () => {
      const reviewerContext: PermissionCheckContext = {
        userId: 'reviewer-1',
        userRole: UserRole.REVIEWER,
        userEmail: 'reviewer@example.com',
      };

      const effectivePermissions = await rolePermissions.getEffectivePermissions(
        reviewerContext,
        true
      );

      // Reviewer should have their own permissions plus inherited permissions
      expect(effectivePermissions).toContain('workflow:approve'); // Reviewer's own permission
      expect(effectivePermissions).toContain('products:read'); // Inherited from viewer
      expect(effectivePermissions).toContain('products:create'); // Inherited from editor
    });

    it('should include all inherited permissions for admin', async () => {
      const adminContext: PermissionCheckContext = {
        userId: 'admin-1',
        userRole: UserRole.ADMIN,
        userEmail: 'admin@example.com',
      };

      const effectivePermissions = await rolePermissions.getEffectivePermissions(
        adminContext,
        true
      );

      // Admin should have all permissions from all roles
      expect(effectivePermissions).toContain('products:read'); // Inherited from viewer
      expect(effectivePermissions).toContain('products:create'); // Inherited from editor
      expect(effectivePermissions).toContain('workflow:approve'); // Inherited from reviewer
      expect(effectivePermissions).toContain('workflow:publish'); // Admin's own permission
    });
  });

  describe('Hierarchy Edge Cases', () => {
    it('should handle non-existent permissions gracefully', () => {
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.EDITOR,
        'nonexistent:permission'
      );

      expect(result).toBe(false);
    });

    it('should handle invalid role gracefully', () => {
      // This should not throw an error
      expect(() => {
        rolePermissions.isPermissionGrantedByHierarchy(
          'INVALID_ROLE' as UserRole,
          'products:read'
        );
      }).not.toThrow();
    });

    it('should handle empty permission string', () => {
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.EDITOR,
        ''
      );

      expect(result).toBe(false);
    });

    it('should handle null permission string', () => {
      const result = rolePermissions.isPermissionGrantedByHierarchy(
        UserRole.EDITOR,
        null as any
      );

      expect(result).toBe(false);
    });
  });

  describe('Hierarchy Performance', () => {
    it('should complete hierarchy checks quickly', () => {
      const startTime = Date.now();
      
      // Perform multiple hierarchy checks
      for (let i = 0; i < 100; i++) {
        rolePermissions.isPermissionGrantedByHierarchy(
          UserRole.EDITOR,
          'products:read'
        );
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 100 checks in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should cache hierarchy results for performance', async () => {
      const editorContext: PermissionCheckContext = {
        userId: 'editor-1',
        userRole: UserRole.EDITOR,
        userEmail: 'editor@example.com',
      };

      // First check
      const result1 = await rolePermissions.hasPermission(
        editorContext,
        'products:read',
        'products'
      );
      
      // Second check should be cached
      const result2 = await rolePermissions.hasPermission(
        editorContext,
        'products:read',
        'products'
      );
      
      expect(result1.hasPermission).toBe(true);
      expect(result2.hasPermission).toBe(true);
      expect(result2.cached).toBe(true);
    });
  });

  describe('Hierarchy with Dynamic Permissions', () => {
    it('should combine hierarchy inheritance with dynamic permissions', async () => {
      const editorContext: PermissionCheckContext = {
        userId: 'editor-1',
        userRole: UserRole.EDITOR,
        userEmail: 'editor@example.com',
      };

      // Assign a dynamic permission
      await rolePermissions.assignDynamicPermission(
        'editor-1',
        {
          id: 'dynamic-1',
          permission: 'custom:action',
          grantedBy: 'admin-1',
          grantedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        },
        'admin-1'
      );

      const effectivePermissions = await rolePermissions.getEffectivePermissions(
        editorContext,
        true
      );

      // Should have hierarchy permissions plus dynamic permission
      expect(effectivePermissions).toContain('products:read'); // Inherited from viewer
      expect(effectivePermissions).toContain('products:create'); // Editor's own permission
      expect(effectivePermissions).toContain('custom:action'); // Dynamic permission
    });
  });

  describe('Hierarchy Documentation', () => {
    it('should have clear hierarchy documentation', () => {
      // This test serves as documentation for the hierarchy system
      const hierarchy = rolePermissions.getRoleHierarchy();
      
      // Role hierarchy (lower number = higher privilege):
      // 1. ADMIN - Full system access, inherits all permissions
      // 2. REVIEWER - Can approve/reject, inherits editor and viewer permissions
      // 3. EDITOR - Can create/edit products, inherits viewer permissions
      // 4. VIEWER - Read-only access, no inheritance
      
      expect(hierarchy[UserRole.ADMIN]).toBe(1);
      expect(hierarchy[UserRole.REVIEWER]).toBe(2);
      expect(hierarchy[UserRole.EDITOR]).toBe(3);
      expect(hierarchy[UserRole.VIEWER]).toBe(4);
    });
  });
});
