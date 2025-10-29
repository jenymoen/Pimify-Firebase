/**
 * Unit tests for invitation-service.ts (initial scaffold)
 */

import { InvitationService, invitationService, createInvitation, getInvitationById, listInvitationsByEmail, getInvitationByToken } from '../invitation-service';
import { UserRole } from '@/types/workflow';

describe('InvitationService (initial)', () => {
  let service: InvitationService;

  beforeEach(() => {
    service = new InvitationService();
  });

  describe('create', () => {
    it('should create an invitation with pending status and token', async () => {
      const result = await service.create({
        email: 'newuser@example.com',
        role: UserRole.EDITOR,
        message: 'Welcome',
        metadata: { source: 'admin' },
        createdBy: 'admin-1',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.status).toBe('PENDING');
      expect(result.data!.token).toBeDefined();
      expect(result.data!.token.length).toBeGreaterThanOrEqual(32);
      expect(result.data!.expiresAt instanceof Date).toBe(true);
    });

    it('should validate email and role', async () => {
      const badEmail = await service.create({ email: 'not-an-email', role: UserRole.EDITOR });
      expect(badEmail.success).toBe(false);

      const badRole = await service.create({ email: 'ok@example.com', role: 'NOPE' as any });
      expect(badRole.success).toBe(false);
    });
  });

  describe('getById', () => {
    it('should return an invitation by id', async () => {
      const created = await service.create({ email: 'x@example.com', role: UserRole.VIEWER });
      const fetched = await service.getById(created.data!.id);

      expect(fetched.success).toBe(true);
      expect(fetched.data!.id).toBe(created.data!.id);
    });

    it('should return not found for missing id', async () => {
      const fetched = await service.getById('missing');
      expect(fetched.success).toBe(false);
      expect(fetched.code).toBe('INVITATION_NOT_FOUND');
    });
  });

  describe('listByEmail', () => {
    it('should list invitations by email', async () => {
      await service.create({ email: 'a@example.com', role: UserRole.REVIEWER });
      await service.create({ email: 'a@example.com', role: UserRole.VIEWER });

      const list = await service.listByEmail('a@example.com');
      expect(list.success).toBe(true);
      expect(list.data.length).toBe(2);
      expect(list.data.map((i) => i.email)).toEqual(['a@example.com', 'a@example.com']);
    });
  });

  describe('getByToken (expiry & status)', () => {
    it('should return invitation by valid token', async () => {
      const created = await service.create({ email: 't@example.com', role: UserRole.EDITOR });
      const res = await service.getByToken(created.data!.token);
      expect(res.success).toBe(true);
      expect(res.data!.email).toBe('t@example.com');
    });

    it('should return expired for past expiry', async () => {
      const created = await service.create({ email: 'e@example.com', role: UserRole.VIEWER });
      // force expiry
      const inv = created.data!;
      (inv as any).expiresAt = new Date(Date.now() - 1000);
      (service as any).invitations.set(inv.id, inv);

      const res = await service.getByToken(inv.token);
      expect(res.success).toBe(false);
      expect(res.code).toBe('INVITATION_EXPIRED');
    });
  });

  describe('tracking states', () => {
    it('should accept a pending invitation', async () => {
      const created = await service.create({ email: 'acc@example.com', role: UserRole.EDITOR });
      const accepted = await service.accept(created.data!.id);
      expect(accepted.success).toBe(true);
      expect(accepted.data!.status).toBe('ACCEPTED');
    });

    it('should not accept expired or non-pending', async () => {
      const created = await service.create({ email: 'exp@example.com', role: UserRole.EDITOR });
      const inv = created.data!;
      (inv as any).expiresAt = new Date(Date.now() - 1000);
      (service as any).invitations.set(inv.id, inv);
      const accepted = await service.accept(inv.id);
      expect(accepted.success).toBe(false);
      expect(accepted.code).toBe('INVITATION_EXPIRED');
    });

    it('should cancel a pending invitation', async () => {
      const created = await service.create({ email: 'can@example.com', role: UserRole.VIEWER });
      const cancelled = await service.cancel(created.data!.id, 'User requested');
      expect(cancelled.success).toBe(true);
      expect(cancelled.data!.status).toBe('CANCELLED');
      expect(cancelled.data!.metadata!.cancelReason).toBe('User requested');
    });

    it('expireIfNeeded should mark expired invitations', async () => {
      const created = await service.create({ email: 'autoexp@example.com', role: UserRole.REVIEWER });
      const inv = created.data!;
      (inv as any).expiresAt = new Date(Date.now() - 1000);
      (service as any).invitations.set(inv.id, inv);

      const updated = service.expireIfNeeded(inv.id)!;
      expect(updated.status).toBe('EXPIRED');
    });

    it('should resend pending invitation with new token and expiry', async () => {
      const created = await service.create({ email: 're@example.com', role: UserRole.EDITOR });
      const oldToken = created.data!.token;
      const oldExpiry = created.data!.expiresAt;

      const resent = await service.resend(created.data!.id);
      expect(resent.success).toBe(true);
      expect(resent.data!.status).toBe('PENDING');
      expect(resent.data!.token).not.toBe(oldToken);
      expect(new Date(resent.data!.expiresAt).getTime()).toBeGreaterThanOrEqual(new Date(oldExpiry).getTime());
      expect(resent.data!.metadata!.resendCount).toBe(1);
    });

    it('should allow resend for expired (re-activate to PENDING)', async () => {
      const created = await service.create({ email: 'reexp@example.com', role: UserRole.EDITOR });
      const inv = created.data!;
      (inv as any).expiresAt = new Date(Date.now() - 1000);
      (service as any).invitations.set(inv.id, inv);

      const resent = await service.resend(inv.id);
      expect(resent.success).toBe(true);
      expect(resent.data!.status).toBe('PENDING');
    });

    it('should reject resend for accepted/cancelled', async () => {
      const accepted = await service.create({ email: 'done@example.com', role: UserRole.VIEWER });
      await service.accept(accepted.data!.id);
      const r1 = await service.resend(accepted.data!.id);
      expect(r1.success).toBe(false);

      const cancelled = await service.create({ email: 'cancel@example.com', role: UserRole.VIEWER });
      await service.cancel(cancelled.data!.id);
      const r2 = await service.resend(cancelled.data!.id);
      expect(r2.success).toBe(false);
    });
  });
});

describe('Convenience functions', () => {
  it('should export createInvitation', async () => {
    const res = await createInvitation({ email: 'c@example.com', role: UserRole.EDITOR });
    expect(typeof res).toBe('object');
  });

  it('should export getInvitationById', async () => {
    const created = await invitationService.create({ email: 'd@example.com', role: UserRole.VIEWER });
    const res = await getInvitationById(created.data!.id);
    expect(res.success).toBe(true);
  });

  it('should export listInvitationsByEmail', async () => {
    const res = await listInvitationsByEmail('c@example.com');
    expect(res.success).toBe(true);
    expect(Array.isArray(res.data)).toBe(true);
  });

  it('should export getInvitationByToken', async () => {
    const created = await invitationService.create({ email: 'tok@example.com', role: UserRole.EDITOR });
    const res = await getInvitationByToken(created.data!.token);
    expect(res.success).toBe(true);
  });
});
