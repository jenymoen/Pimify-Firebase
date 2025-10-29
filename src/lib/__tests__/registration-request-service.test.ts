/**
 * Unit tests for registration-request-service.ts
 */

import {
  RegistrationRequestService,
  registrationRequestService,
  submitRegistration,
  approveRegistration,
  rejectRegistration,
  getRegistrationRequest,
  listRegistrationRequests,
} from '../registration-request-service';
import { UserRole } from '@/types/workflow';

describe('RegistrationRequestService', () => {
  let service: RegistrationRequestService;

  beforeEach(() => {
    service = new RegistrationRequestService();
  });

  describe('submit', () => {
    it('should submit a pending registration request', async () => {
      const res = await service.submit({ email: 'user@example.com', name: 'User A', desiredRole: UserRole.EDITOR, message: 'Hi' });
      expect(res.success).toBe(true);
      expect(res.data!.status).toBe('PENDING');
      expect(res.data!.email).toBe('user@example.com');
      expect(res.data!.desiredRole).toBe(UserRole.EDITOR);
    });

    it('validates email and name', async () => {
      const badEmail = await service.submit({ email: 'x', name: 'Ok' });
      expect(badEmail.success).toBe(false);

      const badName = await service.submit({ email: 'ok@example.com', name: '' });
      expect(badName.success).toBe(false);
    });
  });

  describe('approve/reject', () => {
    it('should approve pending request', async () => {
      const created = await service.submit({ email: 'a@example.com', name: 'User A' });
      const approved = await service.approve(created.data!.id, 'admin-1', 'Looks good');
      expect(approved.success).toBe(true);
      expect(approved.data!.status).toBe('APPROVED');
      expect(approved.data!.decidedBy).toBe('admin-1');
    });

    it('should reject pending request with reason', async () => {
      const created = await service.submit({ email: 'b@example.com', name: 'User B' });
      const rejected = await service.reject(created.data!.id, 'admin-2', 'Incomplete details');
      expect(rejected.success).toBe(true);
      expect(rejected.data!.status).toBe('REJECTED');
      expect(rejected.data!.decideReason).toBe('Incomplete details');
    });

    it('requires pending status and reason for reject', async () => {
      const created = await service.submit({ email: 'c@example.com', name: 'User C' });
      await service.approve(created.data!.id, 'admin');
      const rejectNonPending = await service.reject(created.data!.id, 'admin', '');
      expect(rejectNonPending.success).toBe(false);
    });
  });

  describe('get/list', () => {
    it('should fetch by id', async () => {
      const created = await service.submit({ email: 'd@example.com', name: 'User D' });
      const fetched = await service.getById(created.data!.id);
      expect(fetched.success).toBe(true);
      expect(fetched.data!.id).toBe(created.data!.id);
    });

    it('should list with filters', async () => {
      await service.submit({ email: 'e1@example.com', name: 'User E1' });
      const p = await service.submit({ email: 'e2@example.com', name: 'User E2' });
      await service.approve(p.data!.id, 'admin');

      const all = await service.list();
      expect(all.data.length).toBeGreaterThanOrEqual(2);

      const pending = await service.list({ status: 'PENDING' });
      expect(pending.data.every((r) => r.status === 'PENDING')).toBe(true);

      const byEmail = await service.list({ email: 'e1@example.com' });
      expect(byEmail.data.every((r) => r.email === 'e1@example.com')).toBe(true);
    });
  });
});

describe('Convenience functions', () => {
  it('should export submitRegistration', async () => {
    const res = await submitRegistration({ email: 'z@example.com', name: 'User Z' });
    expect(res.success).toBe(true);
  });

  it('should export approve/reject', async () => {
    const created = await registrationRequestService.submit({ email: 'y@example.com', name: 'User Y' });
    const appr = await approveRegistration(created.data!.id, 'admin');
    expect(appr.success).toBe(true);

    const created2 = await registrationRequestService.submit({ email: 'y2@example.com', name: 'User Y2' });
    const rej = await rejectRegistration(created2.data!.id, 'admin', 'Not valid');
    expect(rej.success).toBe(true);
  });

  it('should export get/list', async () => {
    const created = await registrationRequestService.submit({ email: 'x@example.com', name: 'User X' });
    const got = await getRegistrationRequest(created.data!.id);
    expect(got.success).toBe(true);

    const list = await listRegistrationRequests();
    expect(list.success).toBe(true);
    expect(Array.isArray(list.data)).toBe(true);
  });

  it('should export getRegistrationQueue (pending only)', async () => {
    const { getRegistrationQueue } = require('../registration-request-service');
    // ensure at least one pending
    await registrationRequestService.submit({ email: 'queue@example.com', name: 'Queue' });
    const q = await getRegistrationQueue();
    expect(q.success).toBe(true);
    expect(q.data.every((r: any) => r.status === 'PENDING')).toBe(true);
  });
});
