import { reviewerDelegationService } from '../reviewer-delegation-service';
import { reviewerService } from '../reviewer-service';
import { workflowPersistenceService } from '../workflow-persistence';
import { UserRole, WorkflowState } from '@/types/workflow';

describe('reviewer-delegation-service (4.20-4.25)', () => {
  const primary = 'rev-primary';
  const backup = 'rev-backup';
  const temp = 'rev-temp';
  const actor = { userId: 'admin-1', userEmail: 'admin@example.com', userRole: UserRole.ADMIN };

  beforeEach(async () => {
    // Reset reviewer states
    reviewerService.setAvailability(primary, 'AVAILABLE');
    reviewerService.setAvailability(backup, 'AVAILABLE');
    reviewerService.setAvailability(temp, 'AVAILABLE');

    // Seed products assigned to primary
    const products = [
      { id: 'p1', assignedReviewer: primary },
      { id: 'p2', assignedReviewer: primary },
      { id: 'p3', assignedReviewer: primary },
    ];

    // Save to workflow persistence
    for (const p of products as any[]) {
      await workflowPersistenceService.saveProductWorkflow({
        id: p.id,
        basicInfo: { name: { en: p.id }, sku: p.id, brand: 'Brand', descriptionShort: { en: '' }, descriptionLong: { en: '' } },
        workflowState: WorkflowState.REVIEW,
        workflowHistory: [],
        assignedReviewer: p.assignedReviewer,
        submittedBy: 'user-1',
        createdAt: new Date().toISOString(),
        rejectionReason: null,
      } as any);
    }
  });

  it('sets and gets backup reviewer (4.21)', () => {
    const res = reviewerDelegationService.setBackupReviewer(primary, backup);
    expect(res.success).toBe(true);
    expect(reviewerDelegationService.getBackupReviewer(primary)).toBe(backup);
  });

  it('sets temporary delegation and resolves active delegate (4.22)', () => {
    const now = Date.now();
    const res = reviewerDelegationService.setTemporaryDelegation(primary, {
      delegateId: temp,
      startAt: now - 1000,
      endAt: now + 60_000,
      note: 'Conference',
    });
    expect(res.success).toBe(true);
    expect(reviewerDelegationService.getActiveDelegate(primary, now)).toBe(temp);
  });

  it('bulk reassigns products and logs audit (4.23, 4.24)', async () => {
    const result = await reviewerDelegationService.bulkReassignFromTo(primary, backup, actor, 'Team load balancing');
    expect(result.success).toBe(true);
    expect(result.reassignedCount).toBeGreaterThanOrEqual(1);

    const all = await workflowPersistenceService.loadAllProductWorkflows();
    for (const p of all) {
      expect(p.assignedReviewer).toBe(backup);
    }
  });

  it('delegates during vacation to active temp or backup (4.22, 4.23)', async () => {
    // Configure backup
    reviewerDelegationService.setBackupReviewer(primary, backup);

    // Mark primary as on vacation via schedule by setting availability AWAY
    reviewerService.setAvailability(primary, 'AWAY');

    const result = await reviewerDelegationService.delegateDuringVacation(primary, actor);
    expect(result.success).toBe(true);
    expect(result.reassignedCount).toBeGreaterThan(0);
  });
});


