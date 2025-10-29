/**
 * Invitation Service (Initial Scaffold)
 *
 * Provides basic creation and retrieval of user invitations.
 * Uses in-memory storage. Secure tokens, status lifecycle, resend and cancel
 * will be implemented in subsequent subtasks (3.2–3.4).
 */

import { UserRole } from '@/types/workflow';
import crypto from 'crypto';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

export interface CreateInvitationInput {
  email: string;
  role: UserRole;
  message?: string;
  metadata?: Record<string, any>;
  createdBy?: string; // admin user id
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  token: string; // secure token
  expiresAt: Date; // 7-day expiry
  message?: string | null;
  metadata?: Record<string, any> | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvitationResult<T = Invitation> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface InvitationListResult {
  success: boolean;
  data: Invitation[];
}

export class InvitationService {
  private invitations: Map<string, Invitation> = new Map();
  private byEmail: Map<string, string[]> = new Map(); // email -> invitationIds
  private static readonly INVITE_TTL_DAYS = 7;

  async create(input: CreateInvitationInput): Promise<InvitationResult> {
    try {
      const validation = this.validateCreate(input);
      if (!validation.valid) {
        return { success: false, error: validation.error, code: 'VALIDATION_ERROR' };
      }

      const now = new Date();
      const id = this.generateId();

      const invitation: Invitation = {
        id,
        email: input.email.toLowerCase(),
        role: input.role,
        status: 'PENDING',
        token: this.generateSecureToken(),
        expiresAt: this.calculateExpiry(),
        message: input.message || null,
        metadata: input.metadata || null,
        createdBy: input.createdBy || null,
        createdAt: now,
        updatedAt: now,
      };

      this.invitations.set(id, invitation);
      const list = this.byEmail.get(invitation.email) || [];
      list.push(id);
      this.byEmail.set(invitation.email, list);

      return { success: true, data: invitation };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create invitation',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  async getById(invitationId: string): Promise<InvitationResult> {
    try {
      const inv = this.invitations.get(invitationId);
      if (!inv) return { success: false, error: 'Invitation not found', code: 'INVITATION_NOT_FOUND' };
      return { success: true, data: inv };
    } catch (error) {
      return { success: false, error: 'Failed to get invitation', code: 'INTERNAL_ERROR' };
    }
  }

  async listByEmail(email: string): Promise<InvitationListResult> {
    const ids = this.byEmail.get(email.toLowerCase()) || [];
    const data = ids.map((id) => this.invitations.get(id)!).filter(Boolean);
    return { success: true, data };
  }

  /**
   * Get invitation by token (validates expiry and status)
   */
  async getByToken(token: string): Promise<InvitationResult> {
    try {
      for (const inv of this.invitations.values()) {
        if (inv.token === token) {
          if (this.isExpired(inv)) {
            return { success: false, error: 'Invitation token expired', code: 'INVITATION_EXPIRED' };
          }
          if (inv.status !== 'PENDING') {
            return { success: false, error: 'Invitation not pending', code: 'INVITATION_NOT_PENDING' };
          }
          return { success: true, data: inv };
        }
      }
      return { success: false, error: 'Invitation not found', code: 'INVITATION_NOT_FOUND' };
    } catch (error) {
      return { success: false, error: 'Failed to get invitation by token', code: 'INTERNAL_ERROR' };
    }
  }

  /**
   * Mark invitation as accepted
   */
  async accept(invitationId: string): Promise<InvitationResult> {
    const inv = this.invitations.get(invitationId);
    if (!inv) return { success: false, error: 'Invitation not found', code: 'INVITATION_NOT_FOUND' };
    if (this.isExpired(inv)) return { success: false, error: 'Invitation expired', code: 'INVITATION_EXPIRED' };
    if (inv.status !== 'PENDING') return { success: false, error: 'Invitation not pending', code: 'INVITATION_NOT_PENDING' };
    const updated = { ...inv, status: 'ACCEPTED' as InvitationStatus, updatedAt: new Date() };
    this.invitations.set(invitationId, updated);
    return { success: true, data: updated };
  }

  /**
   * Cancel invitation
   */
  async cancel(invitationId: string, reason?: string): Promise<InvitationResult> {
    const inv = this.invitations.get(invitationId);
    if (!inv) return { success: false, error: 'Invitation not found', code: 'INVITATION_NOT_FOUND' };
    if (inv.status !== 'PENDING') return { success: false, error: 'Invitation not pending', code: 'INVITATION_NOT_PENDING' };
    const updated = { ...inv, status: 'CANCELLED' as InvitationStatus, updatedAt: new Date(), metadata: { ...(inv.metadata || {}), cancelReason: reason } };
    this.invitations.set(invitationId, updated);
    return { success: true, data: updated };
  }

  /**
   * Resend invitation: regenerate token and expiry, keep status as PENDING
   * Allowed if status is PENDING or EXPIRED. If EXPIRED, set back to PENDING.
   */
  async resend(invitationId: string): Promise<InvitationResult> {
    const inv = this.invitations.get(invitationId);
    if (!inv) return { success: false, error: 'Invitation not found', code: 'INVITATION_NOT_FOUND' };

    if (inv.status === 'CANCELLED' || inv.status === 'ACCEPTED') {
      return { success: false, error: 'Cannot resend non-pending invitation', code: 'INVITATION_NOT_RESENDABLE' };
    }

    const updated: Invitation = {
      ...inv,
      status: 'PENDING',
      token: this.generateSecureToken(),
      expiresAt: this.calculateExpiry(),
      updatedAt: new Date(),
      metadata: { ...(inv.metadata || {}), resendCount: ((inv.metadata?.resendCount as number) || 0) + 1 },
    };
    this.invitations.set(invitationId, updated);
    return { success: true, data: updated };
  }

  /**
   * Compute and update expired invitations (for maintenance/testing)
   */
  expireIfNeeded(invitationId: string): Invitation | null {
    const inv = this.invitations.get(invitationId);
    if (!inv) return null;
    if (this.isExpired(inv) && inv.status === 'PENDING') {
      const updated = { ...inv, status: 'EXPIRED' as InvitationStatus, updatedAt: new Date() };
      this.invitations.set(invitationId, updated);
      return updated;
    }
    return inv;
  }

  private validateCreate(input: CreateInvitationInput): { valid: boolean; error?: string } {
    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      return { valid: false, error: 'Invalid email' };
    }
    if (!Object.values(UserRole).includes(input.role)) {
      return { valid: false, error: 'Invalid role' };
    }
    return { valid: true };
  }

  private generateId(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private generateSecureToken(): string {
    // 32 bytes -> 64 hex chars; URL-safe enough for typical usage
    return crypto.randomBytes(32).toString('hex');
  }

  private calculateExpiry(): Date {
    const d = new Date();
    d.setDate(d.getDate() + InvitationService.INVITE_TTL_DAYS);
    return d;
  }

  private isExpired(inv: Invitation): boolean {
    return new Date() > new Date(inv.expiresAt);
  }
}

export const invitationService = new InvitationService();

export async function createInvitation(input: CreateInvitationInput): Promise<InvitationResult> {
  return invitationService.create(input);
}

export async function getInvitationById(invitationId: string): Promise<InvitationResult> {
  return invitationService.getById(invitationId);
}

export async function listInvitationsByEmail(email: string): Promise<InvitationListResult> {
  return invitationService.listByEmail(email);
}

export async function getInvitationByToken(token: string): Promise<InvitationResult> {
  return invitationService.getByToken(token);
}
