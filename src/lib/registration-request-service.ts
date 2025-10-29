/**
 * Registration Request Service
 *
 * Handles self-registration requests with admin approval/rejection workflow.
 * In-memory implementation for now; replace with persistent storage later.
 */

import { UserRole } from '@/types/workflow';

export type RegistrationRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SubmitRegistrationInput {
  email: string;
  name: string;
  desiredRole?: UserRole; // optional: requested role, default VIEWER
  message?: string;
  metadata?: Record<string, any>;
}

export interface RegistrationRequest {
  id: string;
  email: string;
  name: string;
  desiredRole: UserRole;
  status: RegistrationRequestStatus;
  message?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  decidedBy?: string | null; // admin user id
  decideReason?: string | null;
}

export interface RegistrationResult<T = RegistrationRequest> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface RegistrationListFilters {
  status?: RegistrationRequestStatus;
  email?: string;
}

export class RegistrationRequestService {
  private requests: Map<string, RegistrationRequest> = new Map();
  private byEmail: Map<string, string[]> = new Map();

  async submit(input: SubmitRegistrationInput): Promise<RegistrationResult> {
    try {
      const validation = this.validateSubmit(input);
      if (!validation.valid) return { success: false, error: validation.error, code: 'VALIDATION_ERROR' };

      const id = this.generateId();
      const now = new Date();
      const req: RegistrationRequest = {
        id,
        email: input.email.toLowerCase(),
        name: input.name.trim(),
        desiredRole: input.desiredRole || (UserRole.VIEWER as UserRole),
        status: 'PENDING',
        message: input.message || null,
        metadata: input.metadata || null,
        createdAt: now,
        updatedAt: now,
        decidedBy: null,
        decideReason: null,
      };

      this.requests.set(id, req);
      const list = this.byEmail.get(req.email) || [];
      list.push(id);
      this.byEmail.set(req.email, list);

      return { success: true, data: req };
    } catch (e) {
      return { success: false, error: 'Failed to submit registration', code: 'INTERNAL_ERROR' };
    }
  }

  async approve(requestId: string, adminUserId: string, reason?: string): Promise<RegistrationResult> {
    const req = this.requests.get(requestId);
    if (!req) return { success: false, error: 'Request not found', code: 'REQUEST_NOT_FOUND' };
    if (req.status !== 'PENDING') return { success: false, error: 'Request not pending', code: 'REQUEST_NOT_PENDING' };
    const updated = { ...req, status: 'APPROVED' as RegistrationRequestStatus, updatedAt: new Date(), decidedBy: adminUserId, decideReason: reason || null };
    this.requests.set(requestId, updated);
    return { success: true, data: updated };
  }

  async reject(requestId: string, adminUserId: string, reason: string): Promise<RegistrationResult> {
    const req = this.requests.get(requestId);
    if (!req) return { success: false, error: 'Request not found', code: 'REQUEST_NOT_FOUND' };
    if (req.status !== 'PENDING') return { success: false, error: 'Request not pending', code: 'REQUEST_NOT_PENDING' };
    if (!reason || reason.trim().length === 0) return { success: false, error: 'Reason required', code: 'REASON_REQUIRED' };
    const updated = { ...req, status: 'REJECTED' as RegistrationRequestStatus, updatedAt: new Date(), decidedBy: adminUserId, decideReason: reason };
    this.requests.set(requestId, updated);
    return { success: true, data: updated };
  }

  async getById(requestId: string): Promise<RegistrationResult> {
    const req = this.requests.get(requestId);
    if (!req) return { success: false, error: 'Request not found', code: 'REQUEST_NOT_FOUND' };
    return { success: true, data: req };
  }

  async list(filters?: RegistrationListFilters): Promise<{ success: boolean; data: RegistrationRequest[] }> {
    let items = Array.from(this.requests.values());
    if (filters?.status) items = items.filter((r) => r.status === filters.status);
    if (filters?.email) items = items.filter((r) => r.email === filters.email.toLowerCase());
    // Sort by createdAt desc
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { success: true, data: items };
  }

  clear(): void {
    this.requests.clear();
    this.byEmail.clear();
  }

  private validateSubmit(input: SubmitRegistrationInput): { valid: boolean; error?: string } {
    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return { valid: false, error: 'Invalid email' };
    if (!input.name || input.name.trim().length < 2) return { valid: false, error: 'Name is required' };
    if (input.desiredRole && !Object.values(UserRole).includes(input.desiredRole)) return { valid: false, error: 'Invalid role' };
    return { valid: true };
  }

  private generateId(): string {
    return `reg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export const registrationRequestService = new RegistrationRequestService();

export async function submitRegistration(input: SubmitRegistrationInput): Promise<RegistrationResult> {
  return registrationRequestService.submit(input);
}

export async function approveRegistration(requestId: string, adminUserId: string, reason?: string): Promise<RegistrationResult> {
  return registrationRequestService.approve(requestId, adminUserId, reason);
}

export async function rejectRegistration(requestId: string, adminUserId: string, reason: string): Promise<RegistrationResult> {
  return registrationRequestService.reject(requestId, adminUserId, reason);
}

export async function getRegistrationRequest(requestId: string): Promise<RegistrationResult> {
  return registrationRequestService.getById(requestId);
}

export async function listRegistrationRequests(filters?: RegistrationListFilters): Promise<{ success: boolean; data: RegistrationRequest[] }> {
  return registrationRequestService.list(filters);
}

/**
 * Get the current approval queue (pending requests ordered by createdAt desc)
 */
export async function getRegistrationQueue(): Promise<{ success: boolean; data: RegistrationRequest[] }> {
  return registrationRequestService.list({ status: 'PENDING' });
}
