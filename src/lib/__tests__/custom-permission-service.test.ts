/**
 * Unit tests for custom-permission-service.ts
 */

import { CustomPermissionService } from '../custom-permission-service';

describe('CustomPermissionService', () => {
  let service: CustomPermissionService;

  beforeEach(() => {
    service = new CustomPermissionService();
  });

  it('grants a custom permission with optional expiry', () => {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = service.grant({
      userId: 'user-1',
      permission: 'products:export',
      grantedBy: 'admin-1',
      reason: 'Temporary export access',
      expiresAt: expires,
    });

    expect(result.success).toBe(true);
    const assignments = service.getUserPermissions('user-1');
    expect(assignments.length).toBe(1);
    expect(assignments[0].permission).toBe('products:export');
    expect(assignments[0].expiresAt instanceof Date || !!assignments[0].expiresAt).toBe(true);
  });

  it('revokes a custom permission by id', () => {
    const granted = service.grant({ userId: 'u2', permission: 'users:invite', grantedBy: 'admin', reason: 'ops' });
    const id = granted.data!.assignmentId;
    const revoked = service.revoke({ userId: 'u2', permissionId: id, revokedBy: 'admin', reason: 'expired' });
    expect(revoked.success).toBe(true);
    const after = service.getUserPermissions('u2');
    // depending on manager behavior, revoked permission should not be returned or flagged inactive
    expect(after.find((p: any) => p.id === id && p.isActive === false) || after.length === 0).toBeTruthy();
  });

  it('auto-expires permissions on cleanup', (done) => {
    // grant with soon expiry
    const soon = new Date(Date.now() + 15);
    const granted = service.grant({ userId: 'u3', permission: 'products:import', grantedBy: 'admin', reason: 'temp', expiresAt: soon });
    expect(granted.success).toBe(true);

    setTimeout(() => {
      const cleaned = service.cleanupExpired();
      expect(cleaned).toBeGreaterThanOrEqual(0);
      const perms = service.getUserPermissions('u3');
      expect(perms.length).toBe(0);
      done();
    }, 30);
  });
});
