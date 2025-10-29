/**
 * Unit tests for user profile update functionality via UserService.update
 */

import { UserService } from '../user-service';
import { UserRole, WorkflowState } from '@/types/workflow';
import { UserStatus, ReviewerAvailability } from '../database-schema';
import { userActivityLogger, queryActivityLogs } from '../user-activity-logger';

describe('UserService.update (profile updates)', () => {
  let svc: UserService;

  beforeEach(() => {
    svc = new UserService();
    userActivityLogger.clear();
  });

  it('updates basic fields: email, name, avatar', async () => {
    const created = await svc.create({ email: 'p@example.com', name: 'Person', role: UserRole.VIEWER, password: 'Password1!' });
    const updated = await svc.update(created.data!.id, {
      email: 'p2@example.com',
      name: 'Person Two',
      avatar_url: 'https://example.com/a.png',
    });

    expect(updated.success).toBe(true);
    expect(updated.data!.email).toBe('p2@example.com');
    expect(updated.data!.name).toBe('Person Two');
    expect(updated.data!.avatar_url).toBe('https://example.com/a.png');

    const logs = queryActivityLogs({ userId: created.data!.id, actions: ['PROFILE_UPDATED'] });
    expect(logs.items.length).toBeGreaterThanOrEqual(1);
    expect((logs.items[0].metadata as any).changedFields).toEqual(expect.arrayContaining(['email','name','avatar_url']));
  });

  it('updates extended profile fields', async () => {
    const created = await svc.create({ email: 'e@example.com', name: 'Ext', role: UserRole.EDITOR, password: 'Password1!' });
    const updated = await svc.update(created.data!.id, {
      job_title: 'Engineer',
      department: 'R&D',
      location: 'Oslo',
      timezone: 'Europe/Oslo',
      phone: '+47 12345678',
      manager_id: created.data!.id,
      bio: 'Hello',
      specialties: ['cats', 'dogs'],
      languages: ['en', 'no'],
      working_hours: { monday: { start: '09:00', end: '17:00' } },
      custom_fields: { twitter: '@ext' },
    });

    expect(updated.success).toBe(true);
    const u = updated.data!;
    expect(u.job_title).toBe('Engineer');
    expect(u.department).toBe('R&D');
    expect(u.location).toBe('Oslo');
    expect(u.timezone).toBe('Europe/Oslo');
    expect(u.phone).toContain('123');
    expect(u.manager_id).toBe(created.data!.id);
    expect(u.bio).toBe('Hello');
    expect(u.specialties).toEqual(['cats', 'dogs']);
    expect(u.languages).toEqual(['en', 'no']);
    expect(u.working_hours).toBeTruthy();
    expect(u.custom_fields).toBeTruthy();
  });

  it('updates reviewer fields', async () => {
    const created = await svc.create({ email: 'r@example.com', name: 'Rev', role: UserRole.REVIEWER, password: 'Password1!' });
    const updated = await svc.update(created.data!.id, {
      reviewer_max_workload: 20,
      reviewer_availability: ReviewerAvailability.BUSY,
      reviewer_availability_until: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    expect(updated.success).toBe(true);
    expect(updated.data!.reviewer_max_workload).toBe(20);
    expect(updated.data!.reviewer_availability).toBe(ReviewerAvailability.BUSY);
    expect(updated.data!.reviewer_availability_until).toBeInstanceOf(Date);
  });

  it('rejects update for deleted user', async () => {
    const created = await svc.create({ email: 'del@example.com', name: 'Del', role: UserRole.VIEWER, password: 'Password1!' });
    await svc.delete(created.data!.id);
    const result = await svc.update(created.data!.id, { name: 'Nope' });
    expect(result.success).toBe(false);
    expect(result.code).toBe('USER_DELETED');
  });
});
