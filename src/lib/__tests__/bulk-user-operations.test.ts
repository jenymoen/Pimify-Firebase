import { bulkUserOperationsService } from '../bulk-user-operations';
import { userService } from '../user-service';
import { UserRole } from '@/types/workflow';
import { UserStatus } from '../database-schema';

describe('bulk-user-operations (5.15–5.19)', () => {
  let u1: string; let u2: string; let admin1: string;

  beforeEach(async () => {
    const a1 = await userService.create({ email: 'admin1@example.com', name: 'Admin 1', role: UserRole.ADMIN });
    admin1 = a1.data!.id;
    const r1 = await userService.create({ email: 'r1@example.com', name: 'R1', role: UserRole.REVIEWER });
    u1 = r1.data!.id;
    const r2 = await userService.create({ email: 'r2@example.com', name: 'R2', role: UserRole.EDITOR });
    u2 = r2.data!.id;
    // Activate them for status ops
    await userService.activate(admin1);
    await userService.activate(u1);
    await userService.activate(u2);
  });

  it('bulk role change', async () => {
    const res = await bulkUserOperationsService.changeRoles([u1, u2], UserRole.VIEWER, admin1, 'policy');
    expect(res.updatedCount).toBe(2);
  });

  it('bulk deactivate prevents removing last admin (5.18)', async () => {
    const res = await bulkUserOperationsService.setStatus([admin1], 'deactivate', admin1, 'cleanup');
    expect(res.success).toBe(false);
  });

  it('bulk suspend and unlock users', async () => {
    const sus = await bulkUserOperationsService.setStatus([u1, u2], 'suspend', admin1, 'maintenance');
    expect(sus.success).toBe(true);
    const u1Data = (await userService.getById(u1)).data!;
    expect(u1Data.status).toBe(UserStatus.SUSPENDED);
    const unl = await bulkUserOperationsService.setStatus([u1], 'unlock', admin1);
    expect(unl.success).toBe(true);
  });
});


