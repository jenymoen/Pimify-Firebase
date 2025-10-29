/**
 * Unit tests for gdpr-export-service.ts
 */

import { exportUserData } from '../gdpr-export-service';
import { userService } from '../user-service';
import { userActivityLogger } from '../user-activity-logger';
import { UserRole } from '@/types/workflow';

describe('GDPR Export Service', () => {
  it('exports JSON containing profile, activity, and audit', async () => {
    const created = await userService.create({ email: 'gdpr@example.com', name: 'GDPR', role: UserRole.VIEWER, password: 'Password1!' });
    userActivityLogger.log({ userId: created.data!.id, action: 'PROFILE_UPDATED', description: 'test' });

    const res = await exportUserData(created.data!.id, 'json');
    expect(res.success).toBe(true);
    expect(res.content).toContain('profile');
    expect(res.content).toContain('activity');
    expect(res.content).toContain('audit');
  });

  it('exports CSV with sections', async () => {
    const created = await userService.create({ email: 'gdpr2@example.com', name: 'GDPR2', role: UserRole.VIEWER, password: 'Password1!' });
    const res = await exportUserData(created.data!.id, 'csv');
    expect(res.success).toBe(true);
    expect(res!.content!.split('\n')[0]).toBe('SECTION,FIELD,VALUE');
    expect(res!.content).toContain('PROFILE');
  });
});
