/**
 * Unit tests for user role management (changeRole)
 */

import { userService, UserService } from '../user-service';
import { UserRole } from '@/types/workflow';
import { UserStatus } from '../database-schema';

describe('UserService.changeRole', () => {
  let svc: UserService;

  beforeEach(() => {
    svc = new UserService();
  });

  it('should change user role with reason and record history', async () => {
    const created = await svc.create({
      email: 'role@example.com',
      name: 'Role User',
      role: UserRole.VIEWER,
      password: 'Password1!'
    });
    expect(created.success).toBe(true);

    const changed = await svc.changeRole(created.data!.id, UserRole.EDITOR, 'admin-1', 'Needs editor access');
    expect(changed.success).toBe(true);
    expect(changed.data!.role).toBe(UserRole.EDITOR);
    const history = (changed.data!.custom_fields as any).role_change_history;
    expect(Array.isArray(history)).toBe(true);
    expect(history[0].from).toBe(UserRole.VIEWER);
    expect(history[0].to).toBe(UserRole.EDITOR);
    expect(history[0].reason).toBe('Needs editor access');
    expect(history[0].changed_by).toBe('admin-1');
  });

  it('requires a non-empty reason', async () => {
    const created = await svc.create({ email: 'r2@example.com', name: 'User2', role: UserRole.VIEWER, password: 'Password1!' });
    const changed = await svc.changeRole(created.data!.id, UserRole.EDITOR, 'admin-1', '');
    expect(changed.success).toBe(false);
    expect(changed.code).toBe('REASON_REQUIRED');
  });

  it('rejects invalid role', async () => {
    const created = await svc.create({ email: 'r3@example.com', name: 'User3', role: UserRole.VIEWER, password: 'Password1!' });
    const changed = await svc.changeRole(created.data!.id, 'NOPE' as any, 'admin-1', 'reason');
    expect(changed.success).toBe(false);
    expect(changed.code).toBe('INVALID_ROLE');
  });

  it('prevents self-demotion from admin to non-admin', async () => {
    const admin = await svc.create({ email: 'admin@example.com', name: 'Admin', role: UserRole.ADMIN, password: 'Password1!' });
    const demote = await svc.changeRole(admin.data!.id, UserRole.EDITOR, admin.data!.id, 'test');
    expect(demote.success).toBe(false);
    expect(demote.code).toBe('SELF_DEMOTION_NOT_ALLOWED');
  });

  it('requires at least one active admin (blocks demoting the last admin)', async () => {
    const admin = await svc.create({ email: 'admin2@example.com', name: 'Admin2', role: UserRole.ADMIN, password: 'Password1!' });
    const demote = await svc.changeRole(admin.data!.id, UserRole.EDITOR, 'another-admin', 'policy');
    expect(demote.success).toBe(false);
    expect(demote.code).toBe('LAST_ADMIN');
  });
});
