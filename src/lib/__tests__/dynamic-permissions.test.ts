import { DynamicPermissionManager, dynamicPermissionManager } from '../dynamic-permissions';
import { UserRole, WorkflowAction } from '../../types/workflow';
import { PermissionCheckContext } from '../../types/workflow';

describe('DynamicPermissionManager', () => {
  let manager: DynamicPermissionManager;

  beforeEach(() => {
    manager = new DynamicPermissionManager();
  });

  afterEach(() => {
    manager.clear();
  });

  describe('assignPermission', () => {
    it('should assign a permission successfully', () => {
      const result = manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Temporary access for project work'
      );

      expect(result.success).toBe(true);
      expect(result.assignment).toBeDefined();
      expect(result.assignment?.userId).toBe('user-123');
      expect(result.assignment?.permission).toBe('products:create');
      expect(result.assignment?.grantedBy).toBe('admin-456');
      expect(result.assignment?.isActive).toBe(true);
      expect(result.assignment?.reason).toBe('Temporary access for project work');
    });

    it('should assign a permission with expiration', () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      
      const result = manager.assignPermission(
        'user-123',
        'workflow:approve',
        'admin-456',
        'Temporary approval access',
        { expiresAt }
      );

      expect(result.success).toBe(true);
      expect(result.assignment?.expiresAt).toEqual(expiresAt);
    });

    it('should assign a permission with resource ID', () => {
      const result = manager.assignPermission(
        'user-123',
        'products:edit',
        'admin-456',
        'Edit specific product',
        { resourceId: 'product-789' }
      );

      expect(result.success).toBe(true);
      expect(result.assignment?.resourceId).toBe('product-789');
    });

    it('should assign a permission with user role', () => {
      const result = manager.assignPermission(
        'user-123',
        'workflow:publish',
        'admin-456',
        'Temporary publishing access',
        { userRole: UserRole.EDITOR }
      );

      expect(result.success).toBe(true);
      expect(result.assignment?.userRole).toBe(UserRole.EDITOR);
    });

    it('should assign a permission with metadata', () => {
      const metadata = { project: 'special-project', department: 'marketing' };
      
      const result = manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Project-specific access',
        { metadata }
      );

      expect(result.success).toBe(true);
      expect(result.assignment?.metadata).toEqual(metadata);
    });

    it('should fail validation for missing user ID', () => {
      const result = manager.assignPermission(
        '',
        'products:create',
        'admin-456',
        'Test reason'
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain('User ID is required and must be a string');
    });

    it('should fail validation for missing permission', () => {
      const result = manager.assignPermission(
        'user-123',
        '',
        'admin-456',
        'Test reason'
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain('Permission is required and must be a string');
    });

    it('should fail validation for missing granted by', () => {
      const result = manager.assignPermission(
        'user-123',
        'products:create',
        '',
        'Test reason'
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain('Granted by is required and must be a string');
    });

    it('should fail validation for missing reason', () => {
      const result = manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        ''
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain('Reason is required and must be a string');
    });

    it('should fail validation for past expiration date', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const result = manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Test reason',
        { expiresAt: pastDate }
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain('Expires at must be in the future');
    });

    it('should fail validation for invalid user role', () => {
      const result = manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Test reason',
        { userRole: 'INVALID_ROLE' as UserRole }
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContain('Invalid user role');
    });

    it('should prevent duplicate active assignments', () => {
      // First assignment
      const result1 = manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'First assignment'
      );

      expect(result1.success).toBe(true);

      // Second assignment for same user and permission
      const result2 = manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Second assignment'
      );

      expect(result2.success).toBe(false);
      expect(result2.error).toBe('User already has an active assignment for this permission');
    });

    it('should allow duplicate assignments with different resource IDs', () => {
      // First assignment
      const result1 = manager.assignPermission(
        'user-123',
        'products:edit',
        'admin-456',
        'Edit product 1',
        { resourceId: 'product-1' }
      );

      expect(result1.success).toBe(true);

      // Second assignment for different resource
      const result2 = manager.assignPermission(
        'user-123',
        'products:edit',
        'admin-456',
        'Edit product 2',
        { resourceId: 'product-2' }
      );

      expect(result2.success).toBe(true);
    });
  });

  describe('revokePermission', () => {
    it('should revoke a permission successfully', () => {
      // First assign a permission
      const assignResult = manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Test assignment'
      );

      expect(assignResult.success).toBe(true);
      const assignmentId = assignResult.assignment!.id;

      // Then revoke it
      const revokeResult = manager.revokePermission(
        assignmentId,
        'admin-789',
        'No longer needed'
      );

      expect(revokeResult.success).toBe(true);
      expect(revokeResult.revocation).toBeDefined();
      expect(revokeResult.revocation?.assignmentId).toBe(assignmentId);
      expect(revokeResult.revocation?.userId).toBe('user-123');
      expect(revokeResult.revocation?.permission).toBe('products:create');
      expect(revokeResult.revocation?.revokedBy).toBe('admin-789');
      expect(revokeResult.revocation?.reason).toBe('No longer needed');

      // Check that assignment is now inactive
      const assignment = manager.getAssignments().find(a => a.id === assignmentId);
      expect(assignment?.isActive).toBe(false);
    });

    it('should fail to revoke non-existent assignment', () => {
      const result = manager.revokePermission(
        'non-existent-id',
        'admin-456',
        'Test revocation'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Assignment not found');
    });

    it('should fail to revoke already inactive assignment', () => {
      // First assign a permission
      const assignResult = manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Test assignment'
      );

      expect(assignResult.success).toBe(true);
      const assignmentId = assignResult.assignment!.id;

      // Revoke it once
      const revokeResult1 = manager.revokePermission(
        assignmentId,
        'admin-789',
        'First revocation'
      );

      expect(revokeResult1.success).toBe(true);

      // Try to revoke again
      const revokeResult2 = manager.revokePermission(
        assignmentId,
        'admin-789',
        'Second revocation'
      );

      expect(revokeResult2.success).toBe(false);
      expect(revokeResult2.error).toBe('Assignment is already inactive');
    });

    it('should revoke permission with metadata', () => {
      // First assign a permission
      const assignResult = manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Test assignment'
      );

      expect(assignResult.success).toBe(true);
      const assignmentId = assignResult.assignment!.id;

      const metadata = { reason: 'security-audit', department: 'it' };

      // Revoke with metadata
      const revokeResult = manager.revokePermission(
        assignmentId,
        'admin-789',
        'Security audit',
        metadata
      );

      expect(revokeResult.success).toBe(true);
      expect(revokeResult.revocation?.metadata).toEqual(metadata);
    });
  });

  describe('revokeAllUserPermissions', () => {
    it('should revoke all permissions for a user', () => {
      // Assign multiple permissions
      const result1 = manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Permission 1'
      );

      const result2 = manager.assignPermission(
        'user-123',
        'workflow:approve',
        'admin-456',
        'Permission 2'
      );

      const result3 = manager.assignPermission(
        'user-456', // Different user
        'products:create',
        'admin-456',
        'Permission 3'
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      // Revoke all permissions for user-123
      const revokeResults = manager.revokeAllUserPermissions(
        'user-123',
        'admin-789',
        'User leaving project'
      );

      expect(revokeResults).toHaveLength(2);
      expect(revokeResults.every(r => r.success)).toBe(true);

      // Check that user-123 has no active permissions
      const userPermissions = manager.getUserPermissions('user-123');
      expect(userPermissions).toHaveLength(0);

      // Check that user-456 still has active permissions
      const otherUserPermissions = manager.getUserPermissions('user-456');
      expect(otherUserPermissions).toHaveLength(1);
    });

    it('should handle user with no permissions', () => {
      const revokeResults = manager.revokeAllUserPermissions(
        'user-with-no-permissions',
        'admin-456',
        'Test revocation'
      );

      expect(revokeResults).toHaveLength(0);
    });
  });

  describe('getUserPermissions', () => {
    it('should return active permissions for a user', () => {
      // Assign permissions
      manager.assignPermission('user-123', 'products:create', 'admin-456', 'Permission 1');
      manager.assignPermission('user-123', 'workflow:approve', 'admin-456', 'Permission 2');
      manager.assignPermission('user-456', 'products:create', 'admin-456', 'Permission 3');

      const permissions = manager.getUserPermissions('user-123');

      expect(permissions).toHaveLength(2);
      expect(permissions.map(p => p.permission)).toContain('products:create');
      expect(permissions.map(p => p.permission)).toContain('workflow:approve');
    });

    it('should not return expired permissions', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Expired permission',
        { expiresAt: pastDate }
      );

      const permissions = manager.getUserPermissions('user-123');
      expect(permissions).toHaveLength(0);
    });

    it('should not return revoked permissions', () => {
      const assignResult = manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Permission to revoke'
      );

      expect(assignResult.success).toBe(true);

      // Revoke the permission
      manager.revokePermission(
        assignResult.assignment!.id,
        'admin-789',
        'Revocation reason'
      );

      const permissions = manager.getUserPermissions('user-123');
      expect(permissions).toHaveLength(0);
    });

    it('should filter permissions by context', () => {
      // Assign resource-specific permissions
      manager.assignPermission(
        'user-123',
        'products:edit',
        'admin-456',
        'Edit product 1',
        { resourceId: 'product-1' }
      );

      manager.assignPermission(
        'user-123',
        'products:edit',
        'admin-456',
        'Edit product 2',
        { resourceId: 'product-2' }
      );

      manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Create any product'
      );

      // Get permissions for specific product context
      const context: PermissionCheckContext = {
        userRole: UserRole.EDITOR,
        userId: 'user-123',
        productId: 'product-1'
      };

      const permissions = manager.getUserPermissions('user-123', context);

      // Should include product-1 specific permission and general create permission
      expect(permissions).toHaveLength(2);
      expect(permissions.some(p => p.resourceId === 'product-1')).toBe(true);
      expect(permissions.some(p => p.permission === 'products:create' && !p.resourceId)).toBe(true);
    });
  });

  describe('getRolePermissions', () => {
    it('should return active permissions for a role', () => {
      // Assign role-based permissions
      manager.assignPermission(
        'user-123',
        'workflow:publish',
        'admin-456',
        'Role permission',
        { userRole: UserRole.EDITOR }
      );

      manager.assignPermission(
        'user-456',
        'workflow:approve',
        'admin-456',
        'Another role permission',
        { userRole: UserRole.REVIEWER }
      );

      const editorPermissions = manager.getRolePermissions(UserRole.EDITOR);
      const reviewerPermissions = manager.getRolePermissions(UserRole.REVIEWER);

      expect(editorPermissions).toHaveLength(1);
      expect(editorPermissions[0].permission).toBe('workflow:publish');

      expect(reviewerPermissions).toHaveLength(1);
      expect(reviewerPermissions[0].permission).toBe('workflow:approve');
    });

    it('should not return permissions for other roles', () => {
      manager.assignPermission(
        'user-123',
        'workflow:publish',
        'admin-456',
        'Editor permission',
        { userRole: UserRole.EDITOR }
      );

      const viewerPermissions = manager.getRolePermissions(UserRole.VIEWER);
      expect(viewerPermissions).toHaveLength(0);
    });
  });

  describe('hasPermission', () => {
    it('should return true for exact permission match', () => {
      manager.assignPermission('user-123', 'products:create', 'admin-456', 'Test permission');

      const result = manager.hasPermission('user-123', 'products:create');
      expect(result.hasPermission).toBe(true);
      expect(result.assignment).toBeDefined();
    });

    it('should return true for wildcard permission match', () => {
      manager.assignPermission('user-123', 'products:*', 'admin-456', 'Wildcard permission');

      const result = manager.hasPermission('user-123', 'products:create');
      expect(result.hasPermission).toBe(true);
    });

    it('should return true for action-only permission match', () => {
      manager.assignPermission('user-123', 'create', 'admin-456', 'Action permission');

      const result = manager.hasPermission('user-123', 'products:create');
      expect(result.hasPermission).toBe(true);
    });

    it('should return false for no matching permission', () => {
      manager.assignPermission('user-123', 'products:create', 'admin-456', 'Test permission');

      const result = manager.hasPermission('user-123', 'workflow:approve');
      expect(result.hasPermission).toBe(false);
      expect(result.assignment).toBeUndefined();
    });

    it('should return false for expired permission', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Expired permission',
        { expiresAt: pastDate }
      );

      const result = manager.hasPermission('user-123', 'products:create');
      expect(result.hasPermission).toBe(false);
    });

    it('should return false for revoked permission', () => {
      const assignResult = manager.assignPermission(
        'user-123',
        'products:create',
        'admin-456',
        'Permission to revoke'
      );

      expect(assignResult.success).toBe(true);

      // Revoke the permission
      manager.revokePermission(
        assignResult.assignment!.id,
        'admin-789',
        'Revocation reason'
      );

      const result = manager.hasPermission('user-123', 'products:create');
      expect(result.hasPermission).toBe(false);
    });
  });

  describe('getAssignments', () => {
    beforeEach(() => {
      // Set up test data
      manager.assignPermission('user-1', 'products:create', 'admin-1', 'Permission 1');
      manager.assignPermission('user-2', 'workflow:approve', 'admin-1', 'Permission 2');
      manager.assignPermission('user-1', 'products:edit', 'admin-2', 'Permission 3', { 
        userRole: UserRole.EDITOR 
      });
      manager.assignPermission('user-3', 'products:create', 'admin-1', 'Permission 4', {
        resourceId: 'product-123'
      });
    });

    it('should return all assignments when no filters provided', () => {
      const assignments = manager.getAssignments();
      expect(assignments).toHaveLength(4);
    });

    it('should filter by user ID', () => {
      const assignments = manager.getAssignments({ userId: 'user-1' });
      expect(assignments).toHaveLength(2);
      expect(assignments.every(a => a.userId === 'user-1')).toBe(true);
    });

    it('should filter by user role', () => {
      const assignments = manager.getAssignments({ userRole: UserRole.EDITOR });
      expect(assignments).toHaveLength(1);
      expect(assignments[0].userRole).toBe(UserRole.EDITOR);
    });

    it('should filter by permission', () => {
      const assignments = manager.getAssignments({ permission: 'products:create' });
      expect(assignments).toHaveLength(2);
      expect(assignments.every(a => a.permission === 'products:create')).toBe(true);
    });

    it('should filter by resource ID', () => {
      const assignments = manager.getAssignments({ resourceId: 'product-123' });
      expect(assignments).toHaveLength(1);
      expect(assignments[0].resourceId).toBe('product-123');
    });

    it('should filter by granted by', () => {
      const assignments = manager.getAssignments({ grantedBy: 'admin-1' });
      expect(assignments).toHaveLength(3);
      expect(assignments.every(a => a.grantedBy === 'admin-1')).toBe(true);
    });

    it('should filter by active status', () => {
      // Revoke one permission
      const assignments = manager.getAssignments();
      const firstAssignment = assignments[0];
      manager.revokePermission(firstAssignment.id, 'admin-2', 'Test revocation');

      const activeAssignments = manager.getAssignments({ isActive: true });
      const inactiveAssignments = manager.getAssignments({ isActive: false });

      expect(activeAssignments).toHaveLength(3);
      expect(inactiveAssignments).toHaveLength(1);
    });

    it('should filter by expiration status', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Add expired permission by creating it first and then manually expiring it
      const expiredResult = manager.assignPermission(
        'user-4',
        'products:create',
        'admin-1',
        'Permission to expire',
        { expiresAt: futureDate }
      );
      
      expect(expiredResult.success).toBe(true);
      
      // Manually set expiration to past to simulate expired permission
      if (expiredResult.assignment) {
        expiredResult.assignment.expiresAt = pastDate;
      }

      // Add future permission
      manager.assignPermission(
        'user-5',
        'products:create',
        'admin-1',
        'Future permission',
        { expiresAt: futureDate }
      );

      const expiredAssignments = manager.getAssignments({ isExpired: true });
      const nonExpiredAssignments = manager.getAssignments({ isExpired: false });

      expect(expiredAssignments).toHaveLength(1);
      expect(nonExpiredAssignments).toHaveLength(5); // 4 from beforeEach + 1 future
    });

    it('should filter by date ranges', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const assignments = manager.getAssignments({
        grantedAfter: oneHourAgo,
        grantedBefore: oneHourFromNow
      });

      expect(assignments).toHaveLength(4);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      // Set up test data
      manager.assignPermission('user-1', 'products:create', 'admin-1', 'Permission 1');
      manager.assignPermission('user-2', 'workflow:approve', 'admin-1', 'Permission 2');
      manager.assignPermission('user-1', 'products:edit', 'admin-2', 'Permission 3', { 
        userRole: UserRole.EDITOR 
      });

      // Add expired permission by creating it first and then manually expiring it
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const expiredResult = manager.assignPermission(
        'user-3',
        'products:create',
        'admin-1',
        'Permission to expire',
        { expiresAt: futureDate }
      );
      
      expect(expiredResult.success).toBe(true);
      
      // Manually set expiration to past to simulate expired permission
      if (expiredResult.assignment) {
        expiredResult.assignment.expiresAt = pastDate;
      }

      // Revoke one permission
      const assignments = manager.getAssignments();
      manager.revokePermission(assignments[0].id, 'admin-3', 'Test revocation');

      const stats = manager.getStatistics();

      expect(stats.totalActive).toBe(2);
      expect(stats.totalExpired).toBe(1);
      expect(stats.byRole[UserRole.EDITOR]).toBe(1);
      expect(stats.byPermission['workflow:approve']).toBe(1);
      expect(stats.byPermission['products:edit']).toBe(1);
      // products:create should be 0 because the active one was revoked and the expired one doesn't count
      expect(stats.byGranter['admin-1']).toBe(1); // Only workflow:approve is active
      expect(stats.byGranter['admin-2']).toBe(1); // products:edit is active
      expect(stats.recentAssignments).toBe(4);
      expect(stats.recentRevocations).toBe(1);
    });
  });

  describe('cleanupExpiredPermissions', () => {
    it('should clean up expired permissions', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      // Add expired permission by creating it first and then manually expiring it
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const expiredResult = manager.assignPermission(
        'user-1',
        'products:create',
        'admin-1',
        'Permission to expire',
        { expiresAt: futureDate }
      );
      
      expect(expiredResult.success).toBe(true);
      
      // Manually set expiration to past to simulate expired permission
      if (expiredResult.assignment) {
        expiredResult.assignment.expiresAt = pastDate;
      }

      // Add non-expired permission
      manager.assignPermission(
        'user-2',
        'products:create',
        'admin-1',
        'Future permission',
        { expiresAt: futureDate }
      );

      const cleanedCount = manager.cleanupExpiredPermissions();

      expect(cleanedCount).toBe(1);

      const activeAssignments = manager.getAssignments({ isActive: true });
      expect(activeAssignments).toHaveLength(1);
    });

    it('should not clean up non-expired permissions', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      manager.assignPermission(
        'user-1',
        'products:create',
        'admin-1',
        'Future permission',
        { expiresAt: futureDate }
      );

      const cleanedCount = manager.cleanupExpiredPermissions();

      expect(cleanedCount).toBe(0);

      const activeAssignments = manager.getAssignments({ isActive: true });
      expect(activeAssignments).toHaveLength(1);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      // Add some data
      manager.assignPermission('user-1', 'products:create', 'admin-1', 'Permission 1');
      manager.assignPermission('user-2', 'workflow:approve', 'admin-1', 'Permission 2');

      // Clear everything
      manager.clear();

      const assignments = manager.getAssignments();
      const revocations = manager.getRevocations();

      expect(assignments).toHaveLength(0);
      expect(revocations).toHaveLength(0);
    });
  });
});

describe('dynamicPermissionManager singleton', () => {
  it('should be an instance of DynamicPermissionManager', () => {
    expect(dynamicPermissionManager).toBeInstanceOf(DynamicPermissionManager);
  });

  it('should maintain state across operations', () => {
    const result = dynamicPermissionManager.assignPermission(
      'user-123',
      'products:create',
      'admin-456',
      'Test permission'
    );

    expect(result.success).toBe(true);

    const permissions = dynamicPermissionManager.getUserPermissions('user-123');
    expect(permissions).toHaveLength(1);
  });
});
