import { reviewerService } from './reviewer-service';
import { auditTrailService, AuditTrailAction } from './audit-trail-service';
import { workflowPersistenceService } from './workflow-persistence';
import { UserRole } from '@/types/workflow';

export interface DelegationWindow {
  delegateId: string;
  startAt: number; // epoch ms
  endAt: number;   // epoch ms (exclusive)
  note?: string;
}

export interface BulkReassignmentResult {
  success: boolean;
  reassignedCount: number;
  failures: Array<{ productId: string; error: string }>;
}

class ReviewerDelegationService {
  private backupReviewerByPrimary: Map<string, string> = new Map();
  private temporaryDelegationsByPrimary: Map<string, DelegationWindow[]> = new Map();

  setBackupReviewer(primaryReviewerId: string, backupReviewerId: string): { success: boolean; error?: string } {
    if (!primaryReviewerId || !backupReviewerId || primaryReviewerId === backupReviewerId) {
      return { success: false, error: 'INVALID_BACKUP_REVIEWER' };
    }
    this.backupReviewerByPrimary.set(primaryReviewerId, backupReviewerId);
    return { success: true };
  }

  getBackupReviewer(primaryReviewerId: string): string | undefined {
    return this.backupReviewerByPrimary.get(primaryReviewerId);
  }

  setTemporaryDelegation(primaryReviewerId: string, window: DelegationWindow): { success: boolean; error?: string } {
    if (!primaryReviewerId || !window?.delegateId || window.endAt <= window.startAt) {
      return { success: false, error: 'INVALID_DELEGATION_WINDOW' };
    }
    const arr = this.temporaryDelegationsByPrimary.get(primaryReviewerId) || [];
    arr.push(window);
    this.temporaryDelegationsByPrimary.set(primaryReviewerId, arr);
    return { success: true };
  }

  getActiveDelegate(primaryReviewerId: string, at: number = Date.now()): string | undefined {
    const windows = this.temporaryDelegationsByPrimary.get(primaryReviewerId) || [];
    const active = windows.find(w => w.startAt <= at && at < w.endAt);
    return active?.delegateId || this.getBackupReviewer(primaryReviewerId);
  }

  async bulkReassignFromTo(
    fromReviewerId: string,
    toReviewerId: string,
    actor: { userId: string; userEmail: string; userRole: UserRole },
    reason?: string
  ): Promise<BulkReassignmentResult> {
    const products = await workflowPersistenceService.getProductsByReviewer(fromReviewerId);
    const failures: Array<{ productId: string; error: string }> = [];
    let reassignedCount = 0;

    for (const product of products) {
      try {
        const oldReviewer = product.assignedReviewer;
        product.assignedReviewer = toReviewerId;
        const ok = await workflowPersistenceService.saveProductWorkflow(product);
        if (!ok) throw new Error('SAVE_FAILED');
        reassignedCount++;

        auditTrailService.createReviewerAssignmentEntry(
          actor.userId,
          actor.userRole,
          actor.userEmail,
          product.id,
          toReviewerId,
          true,
          reason || `Delegated from ${oldReviewer} to ${toReviewerId}`,
        );
      } catch (e: any) {
        failures.push({ productId: product.id, error: e?.message || 'UNKNOWN_ERROR' });
      }
    }

    // Bulk operation summary
    auditTrailService.createBulkOperationEntry(
      actor.userId,
      actor.userRole,
      actor.userEmail,
      'reviewer_bulk_reassignment',
      products.map(p => p.id),
      products.map(p => ({ productId: p.id, success: !failures.find(f => f.productId === p.id) })),
      reason
    );

    return { success: failures.length === 0, reassignedCount, failures };
  }

  async delegateDuringVacation(
    primaryReviewerId: string,
    actor: { userId: string; userEmail: string; userRole: UserRole },
    now: number = Date.now(),
    reason?: string
  ): Promise<BulkReassignmentResult> {
    // If there is an active temporary delegation, prefer it; otherwise fallback to backup
    const delegateId = this.getActiveDelegate(primaryReviewerId, now);
    if (!delegateId) {
      return { success: false, reassignedCount: 0, failures: [{ productId: '*', error: 'NO_DELEGATE_CONFIGURED' }] };
    }

    // Only proceed if the primary is effectively not AVAILABLE
    const effective = reviewerService.getEffectiveAvailability(primaryReviewerId, now).data;
    if (effective === 'AVAILABLE') {
      return { success: true, reassignedCount: 0, failures: [] };
    }

    return this.bulkReassignFromTo(primaryReviewerId, delegateId, actor, reason || 'Vacation delegation');
  }
}

export const reviewerDelegationService = new ReviewerDelegationService();


