/**
 * Unit tests for user soft delete retention
 */

import { UserService } from '../user-service';
import { UserRole } from '@/types/workflow';
import { UserStatus } from '../database-schema';

describe('UserService soft delete retention', () => {
  let svc: UserService;

  beforeEach(() => {
    svc = new UserService();
  });

  it('soft deletes a user and keeps within retention', async () => {
    const created = await svc.create({ email: 'sd@example.com', name: 'SD', role: UserRole.VIEWER, password: 'Password1!' });
    const del = await svc.delete(created.data!.id, 'admin');
    expect(del.success).toBe(true);
    const got = await svc.getById(created.data!.id, true);
    expect(got.success).toBe(true);
    expect(got.data!.deleted_at).toBeInstanceOf(Date);
    expect(got.data!.status).toBe(UserStatus.INACTIVE);
  });

  it('purges user beyond 90-day retention', async () => {
    const created = await svc.create({ email: 'old@example.com', name: 'Old', role: UserRole.VIEWER, password: 'Password1!' });
    await svc.delete(created.data!.id, 'admin');
    // force deleted_at to 91 days ago
    const user = (await svc.getById(created.data!.id, true)).data!;
    (user as any).deleted_at = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
    ;(svc as any).users.set(user.id, user);

    const purged = await svc.purgeSoftDeletedBeyondRetention();
    expect(purged).toBeGreaterThanOrEqual(1);

    const after = await svc.getById(created.data!.id, true);
    expect(after.success).toBe(false);
  });
});
