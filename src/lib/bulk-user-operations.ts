import { userService } from './user-service';
import { UserRole } from '@/types/workflow';
import { UserStatus } from './database-schema';

export interface BulkActionResult {
  success: boolean;
  updatedCount: number;
  failures: Array<{ userId: string; error: string }>;
}

export class BulkUserOperationsService {
  async changeRoles(
    userIds: string[],
    newRole: UserRole,
    actorUserId: string,
    reason: string
  ): Promise<BulkActionResult> {
    const failures: BulkActionResult['failures'] = [];
    let updatedCount = 0;
    for (const userId of userIds) {
      try {
        const res = await userService.changeRole(userId, newRole, actorUserId, reason);
        if (!res.success) throw new Error(res.error || 'ROLE_CHANGE_FAILED');
        updatedCount++;
      } catch (e: any) {
        failures.push({ userId, error: e?.message || 'UNKNOWN' });
      }
    }
    return { success: failures.length === 0, updatedCount, failures };
  }

  async setStatus(
    userIds: string[],
    status: 'activate' | 'deactivate' | 'suspend' | 'unlock',
    actorUserId?: string,
    reason?: string
  ): Promise<BulkActionResult> {
    const failures: BulkActionResult['failures'] = [];
    let updatedCount = 0;

    // Safeguard: prevent bulk deactivation of admins (5.18)
    if (status === 'deactivate') {
      const toDeactivateAdmins = await this.countAdmins(userIds);
      if (toDeactivateAdmins > 0) {
        // Allow only if there will remain at least one active admin
        const activeAdmins = await userService.count({ status: UserStatus.ACTIVE });
        if (activeAdmins - toDeactivateAdmins <= 0) {
          // Hard stop
          return { success: false, updatedCount: 0, failures: userIds.map(id => ({ userId: id, error: 'LAST_ADMIN' })) };
        }
      }
    }

    for (const userId of userIds) {
      try {
        let res;
        switch (status) {
          case 'activate':
            res = await userService.activate(userId, actorUserId, reason);
            break;
          case 'deactivate':
            res = await userService.deactivate(userId, actorUserId, reason);
            break;
          case 'suspend':
            res = await userService.suspend(userId, actorUserId, reason);
            break;
          case 'unlock':
            res = await userService.unlock(userId, actorUserId);
            break;
        }
        if (!res?.success) throw new Error(res?.error || 'STATUS_CHANGE_FAILED');
        updatedCount++;
      } catch (e: any) {
        failures.push({ userId, error: e?.message || 'UNKNOWN' });
      }
    }
    return { success: failures.length === 0, updatedCount, failures };
  }

  private async countAdmins(userIds: string[]): Promise<number> {
    let count = 0;
    for (const id of userIds) {
      const res = await userService.getById(id, true);
      if (res.success && res.data?.role === UserRole.ADMIN) count++;
    }
    return count;
  }
}

export const bulkUserOperationsService = new BulkUserOperationsService();


