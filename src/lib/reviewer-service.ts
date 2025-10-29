export type ReviewerAvailability = 'AVAILABLE' | 'BUSY' | 'AWAY' | 'VACATION';

export interface ReviewerState {
  userId: string;
  availability: ReviewerAvailability;
  maxAssignments: number; // capacity
  currentAssignments: number; // workload
  updatedAt: number;
  schedules?: ReviewerSchedule[];
  // 4.9 performance metrics
  reviewsCompleted?: number;
  totalReviewDurationMs?: number; // sum for avg computation
  approvalsCount?: number;
  rejectionsCount?: number;
  // 4.10 rating system
  ratings?: number[]; // store recent ratings (cap at 100)
}

export interface ReviewerSchedule {
  id: string;
  availability: Extract<ReviewerAvailability, 'AWAY' | 'VACATION' | 'BUSY'>;
  startAt: number; // epoch ms
  endAt: number;   // epoch ms (exclusive)
  note?: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

const DEFAULT_MAX_ASSIGNMENTS = 10;

class ReviewerService {
  private reviewerIdToState: Map<string, ReviewerState> = new Map();
  private reviewerIdToDepartment: Map<string, string> = new Map();
  private reviewerIdToSpecialties: Map<string, string[]> = new Map();

  private ensure(userId: string): ReviewerState {
    let state = this.reviewerIdToState.get(userId);
    if (!state) {
      state = {
        userId,
        availability: 'AVAILABLE',
        maxAssignments: DEFAULT_MAX_ASSIGNMENTS,
        currentAssignments: 0,
        updatedAt: Date.now(),
        schedules: [],
        reviewsCompleted: 0,
        totalReviewDurationMs: 0,
        approvalsCount: 0,
        rejectionsCount: 0,
        ratings: [],
      };
      this.reviewerIdToState.set(userId, state);
    }
    return state;
  }

  // 4.7 scheduled availability
  scheduleAvailability(userId: string, schedule: Omit<ReviewerSchedule, 'id'> & { id?: string }): ServiceResult<ReviewerSchedule> {
    const { availability, startAt, endAt, note } = schedule;
    const allowed: ReviewerAvailability[] = ['AWAY', 'VACATION', 'BUSY'];
    if (!allowed.includes(availability)) {
      return { success: false, error: 'INVALID_SCHEDULE_AVAILABILITY', code: 'INVALID_SCHEDULE_AVAILABILITY' };
    }
    if (!Number.isFinite(startAt) || !Number.isFinite(endAt) || endAt <= startAt) {
      return { success: false, error: 'INVALID_TIME_RANGE', code: 'INVALID_TIME_RANGE' };
    }
    const state = this.ensure(userId);
    const id = schedule.id || `${userId}:${startAt}:${endAt}:${availability}`;
    const newSch: ReviewerSchedule = { id, availability, startAt, endAt, note };
    state.schedules = state.schedules || [];
    state.schedules.push(newSch);
    state.updatedAt = Date.now();
    return { success: true, data: newSch };
  }

  listSchedules(userId: string): ServiceResult<ReviewerSchedule[]> {
    const state = this.ensure(userId);
    return { success: true, data: [...(state.schedules || [])].sort((a, b) => a.startAt - b.startAt) };
  }

  getEffectiveAvailability(userId: string, at: number = Date.now()): ServiceResult<ReviewerAvailability> {
    const state = this.ensure(userId);
    const active = (state.schedules || []).find(s => s.startAt <= at && at < s.endAt);
    return { success: true, data: active ? active.availability : state.availability };
  }

  // 4.8 expiration cleanup and reminders
  cleanupExpiredSchedules(userId?: string, now: number = Date.now()): ServiceResult<number> {
    let count = 0;
    const prune = (state: ReviewerState) => {
      const before = state.schedules?.length || 0;
      state.schedules = (state.schedules || []).filter(s => s.endAt > now);
      const removed = before - (state.schedules?.length || 0);
      if (removed > 0) {
        state.updatedAt = now;
        count += removed;
      }
    };
    if (userId) {
      prune(this.ensure(userId));
    } else {
      for (const state of this.reviewerIdToState.values()) prune(state);
    }
    return { success: true, data: count };
  }

  getSchedulesExpiringWithin(msFromNow: number, now: number = Date.now()): ServiceResult<Array<{ userId: string; schedule: ReviewerSchedule }>> {
    if (!Number.isFinite(msFromNow) || msFromNow <= 0) {
      return { success: false, error: 'INVALID_WINDOW', code: 'INVALID_WINDOW' };
    }
    const threshold = now + msFromNow;
    const results: Array<{ userId: string; schedule: ReviewerSchedule }> = [];
    for (const [uid, state] of this.reviewerIdToState.entries()) {
      for (const s of state.schedules || []) {
        if (s.endAt > now && s.endAt <= threshold) {
          results.push({ userId: uid, schedule: s });
        }
      }
    }
    results.sort((a, b) => a.schedule.endAt - b.schedule.endAt);
    return { success: true, data: results };
  }

  setAvailability(userId: string, availability: ReviewerAvailability): ServiceResult<ReviewerState> {
    const allowed: ReviewerAvailability[] = ['AVAILABLE', 'BUSY', 'AWAY', 'VACATION'];
    if (!allowed.includes(availability)) {
      return { success: false, error: 'INVALID_AVAILABILITY', code: 'INVALID_AVAILABILITY' };
    }
    const state = this.ensure(userId);
    state.availability = availability;
    state.updatedAt = Date.now();
    return { success: true, data: { ...state } };
  }

  getAvailability(userId: string): ServiceResult<ReviewerAvailability> {
    const state = this.ensure(userId);
    return { success: true, data: state.availability };
  }

  setMaxAssignments(userId: string, maxAssignments: number): ServiceResult<ReviewerState> {
    if (!Number.isFinite(maxAssignments) || maxAssignments < 0) {
      return { success: false, error: 'INVALID_MAX_ASSIGNMENTS', code: 'INVALID_MAX_ASSIGNMENTS' };
    }
    const state = this.ensure(userId);
    state.maxAssignments = Math.floor(maxAssignments);
    // Clamp current to max if reduced below current
    if (state.currentAssignments > state.maxAssignments) {
      state.currentAssignments = state.maxAssignments;
    }
    state.updatedAt = Date.now();
    return { success: true, data: { ...state } };
  }

  getMaxAssignments(userId: string): ServiceResult<number> {
    const state = this.ensure(userId);
    return { success: true, data: state.maxAssignments };
  }

  getWorkload(userId: string): ServiceResult<number> {
    const state = this.ensure(userId);
    return { success: true, data: state.currentAssignments };
  }

  incrementWorkload(userId: string, amount = 1): ServiceResult<ReviewerState> {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'INVALID_AMOUNT', code: 'INVALID_AMOUNT' };
    }
    const state = this.ensure(userId);
    state.currentAssignments = Math.min(state.currentAssignments + Math.floor(amount), state.maxAssignments);
    state.updatedAt = Date.now();
    return { success: true, data: { ...state } };
  }

  decrementWorkload(userId: string, amount = 1): ServiceResult<ReviewerState> {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'INVALID_AMOUNT', code: 'INVALID_AMOUNT' };
    }
    const state = this.ensure(userId);
    state.currentAssignments = Math.max(0, state.currentAssignments - Math.floor(amount));
    state.updatedAt = Date.now();
    return { success: true, data: { ...state } };
  }

  getCapacityPercentage(userId: string): ServiceResult<number> {
    const state = this.ensure(userId);
    const max = state.maxAssignments || 1; // avoid division by zero
    const pct = Math.round((state.currentAssignments / max) * 100);
    return { success: true, data: pct };
  }

  isOverCapacity(userId: string): ServiceResult<boolean> {
    const state = this.ensure(userId);
    return { success: true, data: state.currentAssignments >= state.maxAssignments };
  }

  getSummary(userId: string): ServiceResult<{
    userId: string;
    availability: ReviewerAvailability;
    currentAssignments: number;
    maxAssignments: number;
    capacityPercentage: number;
    overCapacity: boolean;
    updatedAt: number;
    reviewsCompleted: number;
    averageReviewTimeMs: number;
    approvalRate: number; // 0-100
    rating: number; // 1-5 average (0 if none)
  }> {
    const state = this.ensure(userId);
    const capacityPercentage = this.getCapacityPercentage(userId).data || 0;
    const overCapacity = this.isOverCapacity(userId).data || false;
    const reviewsCompleted = state.reviewsCompleted || 0;
    const averageReviewTimeMs = reviewsCompleted > 0 ? Math.round((state.totalReviewDurationMs || 0) / reviewsCompleted) : 0;
    const approvals = state.approvalsCount || 0;
    const rejections = state.rejectionsCount || 0;
    const total = approvals + rejections;
    const approvalRate = total > 0 ? Math.round((approvals / total) * 100) : 0;
    const rating = this.getRating(userId).data || 0;
    return {
      success: true,
      data: {
        userId: state.userId,
        availability: state.availability,
        currentAssignments: state.currentAssignments,
        maxAssignments: state.maxAssignments,
        capacityPercentage,
        overCapacity,
        updatedAt: state.updatedAt,
        reviewsCompleted,
        averageReviewTimeMs,
        approvalRate,
        rating,
      },
    };
  }

  // 4.9 metrics
  recordReview(userId: string, durationMs: number, approved: boolean): ServiceResult<ReviewerState> {
    if (!Number.isFinite(durationMs) || durationMs < 0) {
      return { success: false, error: 'INVALID_DURATION', code: 'INVALID_DURATION' };
    }
    const state = this.ensure(userId);
    state.reviewsCompleted = (state.reviewsCompleted || 0) + 1;
    state.totalReviewDurationMs = (state.totalReviewDurationMs || 0) + Math.floor(durationMs);
    if (approved) state.approvalsCount = (state.approvalsCount || 0) + 1;
    else state.rejectionsCount = (state.rejectionsCount || 0) + 1;
    state.updatedAt = Date.now();
    return { success: true, data: { ...state } };
  }

  getMetrics(userId: string): ServiceResult<{ reviewsCompleted: number; averageReviewTimeMs: number; approvalRate: number; approvals: number; rejections: number; }> {
    const state = this.ensure(userId);
    const reviewsCompleted = state.reviewsCompleted || 0;
    const averageReviewTimeMs = reviewsCompleted > 0 ? Math.round((state.totalReviewDurationMs || 0) / reviewsCompleted) : 0;
    const approvals = state.approvalsCount || 0;
    const rejections = state.rejectionsCount || 0;
    const total = approvals + rejections;
    const approvalRate = total > 0 ? Math.round((approvals / total) * 100) : 0;
    return { success: true, data: { reviewsCompleted, averageReviewTimeMs, approvalRate, approvals, rejections } };
  }

  // 4.10 rating system (1-5)
  addRating(userId: string, rating: number): ServiceResult<number> {
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return { success: false, error: 'INVALID_RATING', code: 'INVALID_RATING' };
    }
    const state = this.ensure(userId);
    state.ratings = state.ratings || [];
    state.ratings.push(Math.round(rating));
    // cap stored ratings to last 100
    if (state.ratings.length > 100) {
      state.ratings = state.ratings.slice(state.ratings.length - 100);
    }
    state.updatedAt = Date.now();
    return { success: true, data: this.getRating(userId).data || 0 };
  }

  getRating(userId: string): ServiceResult<number> {
    const state = this.ensure(userId);
    const arr = state.ratings || [];
    if (arr.length === 0) return { success: true, data: 0 };
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    return { success: true, data: Math.round(avg * 10) / 10 }; // one decimal
  }

  // 4.11 quality score calculation (0-100)
  getQualityScore(userId: string): ServiceResult<number> {
    const state = this.ensure(userId);
    const metrics = this.getMetrics(userId).data!;
    const rating = this.getRating(userId).data || 0;

    // Weighted components:
    // - Approval rate: 40% weight (0-100 scale)
    // - Rating: 40% weight (1-5 scaled to 0-100)
    // - Volume bonus: 20% weight (0-100, based on review count, caps at 50+ reviews)

    const approvalScore = metrics.approvalRate;
    const ratingScore = rating > 0 ? (rating / 5) * 100 : 0;
    const volumeBonus = Math.min((metrics.reviewsCompleted / 50) * 100, 100);

    // If no reviews, quality score is 0
    if (metrics.reviewsCompleted === 0) {
      return { success: true, data: 0 };
    }

    const qualityScore = Math.round(
      approvalScore * 0.4 + ratingScore * 0.4 + volumeBonus * 0.2
    );

    return { success: true, data: Math.min(100, Math.max(0, qualityScore)) };
  }

  // 4.26 expertise assignment helpers
  setDepartment(userId: string, department: string): ServiceResult<string> {
    if (!userId || !department) {
      return { success: false, error: 'INVALID_DEPARTMENT', code: 'INVALID_DEPARTMENT' };
    }
    this.reviewerIdToDepartment.set(userId, department);
    return { success: true, data: department };
  }

  addSpecialty(userId: string, specialty: string): ServiceResult<string[]> {
    if (!userId || !specialty) {
      return { success: false, error: 'INVALID_SPECIALTY', code: 'INVALID_SPECIALTY' };
    }
    const existing = this.reviewerIdToSpecialties.get(userId) || [];
    if (!existing.includes(specialty)) existing.push(specialty);
    this.reviewerIdToSpecialties.set(userId, existing);
    return { success: true, data: [...existing] };
  }

  removeSpecialty(userId: string, specialty: string): ServiceResult<string[]> {
    const existing = this.reviewerIdToSpecialties.get(userId) || [];
    const next = existing.filter(s => s !== specialty);
    this.reviewerIdToSpecialties.set(userId, next);
    return { success: true, data: [...next] };
  }

  getDepartmentMap(): ServiceResult<Record<string, string>> {
    const obj: Record<string, string> = {};
    for (const [id, dep] of this.reviewerIdToDepartment.entries()) obj[id] = dep;
    return { success: true, data: obj };
  }

  getSpecialtiesMap(): ServiceResult<Record<string, string[]>> {
    const obj: Record<string, string[]> = {};
    for (const [id, specs] of this.reviewerIdToSpecialties.entries()) obj[id] = [...specs];
    return { success: true, data: obj };
  }
}

export const reviewerService = new ReviewerService();


