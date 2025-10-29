import { reviewerService } from '../reviewer-service';

describe('reviewer-service', () => {
  const uid = 'reviewer-1';

  it('initializes with defaults and sets availability (4.1)', () => {
    const a0 = reviewerService.getAvailability(uid);
    expect(a0.success).toBe(true);
    expect(a0.data).toBe('AVAILABLE');

    const set = reviewerService.setAvailability(uid, 'BUSY');
    expect(set.success).toBe(true);
    const a1 = reviewerService.getAvailability(uid);
    expect(a1.data).toBe('BUSY');
  });

  it('supports all availability states and validates input (4.6)', () => {
    expect(reviewerService.setAvailability(uid, 'AVAILABLE').success).toBe(true);
    expect(reviewerService.getAvailability(uid).data).toBe('AVAILABLE');
    expect(reviewerService.setAvailability(uid, 'BUSY').success).toBe(true);
    expect(reviewerService.getAvailability(uid).data).toBe('BUSY');
    expect(reviewerService.setAvailability(uid, 'AWAY').success).toBe(true);
    expect(reviewerService.getAvailability(uid).data).toBe('AWAY');
    expect(reviewerService.setAvailability(uid, 'VACATION').success).toBe(true);
    expect(reviewerService.getAvailability(uid).data).toBe('VACATION');
    // @ts-expect-error invalid state test at runtime
    const bad: any = reviewerService.setAvailability(uid, 'OFFLINE');
    expect(bad.success).toBe(false);
    expect(bad.code).toBe('INVALID_AVAILABILITY');
  });

  it('tracks workload increments/decrements (4.2)', () => {
    const w0 = reviewerService.getWorkload(uid);
    expect(w0.data).toBeGreaterThanOrEqual(0);
    reviewerService.decrementWorkload(uid, 999); // clamp to 0
    expect(reviewerService.getWorkload(uid).data).toBe(0);

    const inc = reviewerService.incrementWorkload(uid, 3);
    expect(inc.success).toBe(true);
    expect(reviewerService.getWorkload(uid).data).toBe(3);

    const dec = reviewerService.decrementWorkload(uid, 2);
    expect(dec.success).toBe(true);
    expect(reviewerService.getWorkload(uid).data).toBe(1);
  });

  it('manages max assignments capacity (4.3)', () => {
    const max0 = reviewerService.getMaxAssignments(uid);
    expect(max0.data).toBe(10);

    const set = reviewerService.setMaxAssignments(uid, 5);
    expect(set.success).toBe(true);
    expect(reviewerService.getMaxAssignments(uid).data).toBe(5);
  });

  it('computes capacity percentage and over-capacity (4.4)', () => {
    // current 1 of 5
    expect(reviewerService.getCapacityPercentage(uid).data).toBe(20);
    expect(reviewerService.isOverCapacity(uid).data).toBe(false);

    reviewerService.incrementWorkload(uid, 10); // clamp at max 5
    expect(reviewerService.getWorkload(uid).data).toBe(5);
    expect(reviewerService.getCapacityPercentage(uid).data).toBe(100);
    expect(reviewerService.isOverCapacity(uid).data).toBe(true);
  });

  it('provides a summary view (4.1/4.4)', () => {
    const summary = reviewerService.getSummary(uid);
    expect(summary.success).toBe(true);
    expect(summary.data?.userId).toBe(uid);
    expect(summary.data?.capacityPercentage).toBe(100);
    expect(summary.data?.overCapacity).toBe(true);
  });

  it('schedules availability and computes effective availability (4.7)', () => {
    const now = Date.now();
    const start = now + 1_000;
    const end = start + 60_000;
    const sch = reviewerService.scheduleAvailability(uid, { availability: 'AWAY', startAt: start, endAt: end, note: 'Lunch' });
    expect(sch.success).toBe(true);

    const before = reviewerService.getEffectiveAvailability(uid, start - 1);
    expect(before.data).toBe(reviewerService.getAvailability(uid).data);

    const during = reviewerService.getEffectiveAvailability(uid, start + 1);
    expect(during.data).toBe('AWAY');

    const after = reviewerService.getEffectiveAvailability(uid, end + 1);
    expect(after.data).toBe(reviewerService.getAvailability(uid).data);
  });

  it('cleans up expired schedules and reports expiring ones (4.8)', () => {
    const base = Date.now();
    const soonEnd = base + 5_000;
    const laterEnd = base + 60_000;
    reviewerService.scheduleAvailability(uid, { availability: 'VACATION', startAt: base - 1_000, endAt: soonEnd });
    reviewerService.scheduleAvailability(uid, { availability: 'BUSY', startAt: base + 1_000, endAt: laterEnd });

    const expiring = reviewerService.getSchedulesExpiringWithin(10_000, base);
    expect(expiring.success).toBe(true);
    expect(expiring.data?.length).toBeGreaterThanOrEqual(1);
    expect(expiring.data?.some(e => e.schedule.endAt === soonEnd)).toBe(true);

    // Move time forward beyond laterEnd to cleanup
    const removed = reviewerService.cleanupExpiredSchedules(uid, laterEnd + 1_000);
    expect(removed.success).toBe(true);
    // All schedules should be removed for the user
    const remaining = reviewerService.listSchedules(uid);
    expect(remaining.data?.length).toBe(0);
  });

  it('records reviews and computes metrics (4.9)', () => {
    // reset via ensure; metrics accumulate, so compute differences
    const m0 = reviewerService.getMetrics(uid).data!;
    reviewerService.recordReview(uid, 1200, true);
    reviewerService.recordReview(uid, 800, false);
    reviewerService.recordReview(uid, 1000, true);
    const m1 = reviewerService.getMetrics(uid).data!;
    expect(m1.reviewsCompleted - m0.reviewsCompleted).toBe(3);
    expect(m1.averageReviewTimeMs).toBeGreaterThanOrEqual(900);
    expect(m1.averageReviewTimeMs).toBeLessThanOrEqual(1100);
    expect(m1.approvals - m0.approvals).toBe(2);
    expect(m1.rejections - m0.rejections).toBe(1);
    expect(m1.approvalRate).toBeGreaterThanOrEqual(60);
  });

  it('adds ratings and computes average (4.10)', () => {
    const r0 = reviewerService.getRating(uid).data!;
    expect(r0).toBeGreaterThanOrEqual(0);
    reviewerService.addRating(uid, 5);
    reviewerService.addRating(uid, 4);
    reviewerService.addRating(uid, 3);
    const r1 = reviewerService.getRating(uid).data!;
    expect(r1).toBeGreaterThanOrEqual(3.5 - 0.5); // around 4.0
    expect(r1).toBeLessThanOrEqual(4.5);
  });

  it('computes quality score from metrics and rating (4.11)', () => {
    const freshUid = 'reviewer-quality-test';
    const q0 = reviewerService.getQualityScore(freshUid).data!;
    expect(q0).toBe(0); // no reviews yet

    // Add reviews and ratings
    reviewerService.recordReview(freshUid, 1000, true);
    reviewerService.recordReview(freshUid, 1200, true);
    reviewerService.addRating(freshUid, 5);
    reviewerService.addRating(freshUid, 4);

    const q1 = reviewerService.getQualityScore(freshUid).data!;
    expect(q1).toBeGreaterThan(0);
    expect(q1).toBeLessThanOrEqual(100);

    // More reviews should increase volume bonus
    for (let i = 0; i < 48; i++) {
      reviewerService.recordReview(freshUid, 1000, true);
    }
    const q2 = reviewerService.getQualityScore(freshUid).data!;
    expect(q2).toBeGreaterThan(q1); // should be higher with more volume
    expect(q2).toBeLessThanOrEqual(100);
  });
});


