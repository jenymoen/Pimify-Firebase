/**
 * Unit tests for user anonymization
 */

import { UserService } from '../user-service';
import { UserRole } from '@/types/workflow';

describe('UserService.anonymize', () => {
  let svc: UserService;

  beforeEach(() => {
    svc = new UserService();
  });

  it('anonymizes PII fields and preserves record', async () => {
    const created = await svc.create({ email: 'anon@example.com', name: 'Anon User', role: UserRole.VIEWER, password: 'Password1!' });
    const anon = await svc.anonymize(created.data!.id, 'admin');
    expect(anon.success).toBe(true);
    const u = anon.data!;
    expect(u.name).toBe('Deleted User');
    expect(u.email).toMatch(/^deleted\+/);
    expect(u.avatar_url).toBeNull();
    expect(u.phone).toBeNull();
    expect(u.bio).toBeNull();
    expect(u.custom_fields && (u.custom_fields as any).anonymized).toBe(true);

    const fetched = await svc.getById(created.data!.id, true);
    expect(fetched.success).toBe(true);
    expect(fetched.data!.name).toBe('Deleted User');
  });
});
