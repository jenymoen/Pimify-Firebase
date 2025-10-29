import { reviewerService, ReviewerAvailability } from './reviewer-service';

export type AssignmentAlgorithm = 'WORKLOAD' | 'SPECIALTY' | 'DEPARTMENT' | 'PERFORMANCE' | 'ROUND_ROBIN';

export interface AssignmentRequest {
  reviewerIds?: string[]; // candidates to consider (if not provided, consider all)
  excludeReviewerIds?: string[]; // reviewers to exclude
  requireAvailability?: ReviewerAvailability[]; // filter by availability
  department?: string; // department/category match
  specialty?: string; // specialty match
  minRating?: number; // minimum quality score or rating
  algorithm?: AssignmentAlgorithm; // which algorithm to use
  // Reviewer attributes for matching
  reviewerIdToDepartment?: Record<string, string>;
  reviewerIdToSpecialties?: Record<string, string[]>;
  // Round-robin grouping key (e.g., product category)
  roundRobinKey?: string;
}

export interface AssignmentResult {
  reviewerId: string;
  score: number; // 0-100, higher is better
  reason?: string; // why this reviewer was selected
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

const DEFAULT_ALGORITHM: AssignmentAlgorithm = 'WORKLOAD';

/**
 * Service for automatically assigning products to reviewers using configurable algorithms.
 */
class ReviewerAutoAssignmentService {
  private roundRobinIndexByKey: Map<string, number> = new Map();
  /**
   * Assign a reviewer from available candidates based on the configured algorithm.
   */
  assignReviewer(request: AssignmentRequest = {}): ServiceResult<AssignmentResult> {
    const candidates = this.getCandidateReviewers(request);
    
    if (candidates.length === 0) {
      return { success: false, error: 'NO_REVIEWERS_AVAILABLE', code: 'NO_REVIEWERS_AVAILABLE' };
    }

    const algorithm = request.algorithm || DEFAULT_ALGORITHM;
    const ranked = this.rankReviewers(candidates, request, algorithm);

    if (ranked.length === 0) {
      return { success: false, error: 'NO_SUITABLE_REVIEWERS', code: 'NO_SUITABLE_REVIEWERS' };
    }

    // Return top candidate
    return { success: true, data: ranked[0] };
  }

  /**
   * Get multiple reviewer assignments (e.g., for load balancing).
   */
  assignMultipleReviewers(count: number, request: AssignmentRequest = {}): ServiceResult<AssignmentResult[]> {
    if (!Number.isFinite(count) || count < 1) {
      return { success: false, error: 'INVALID_COUNT', code: 'INVALID_COUNT' };
    }

    const candidates = this.getCandidateReviewers(request);
    
    if (candidates.length === 0) {
      return { success: false, error: 'NO_REVIEWERS_AVAILABLE', code: 'NO_REVIEWERS_AVAILABLE' };
    }

    const algorithm = request.algorithm || DEFAULT_ALGORITHM;
    const ranked = this.rankReviewers(candidates, request, algorithm);

    const result = ranked.slice(0, count);
    
    if (result.length === 0) {
      return { success: false, error: 'NO_SUITABLE_REVIEWERS', code: 'NO_SUITABLE_REVIEWERS' };
    }

    return { success: true, data: result };
  }

  /**
   * Filter and get candidate reviewers based on request criteria.
   */
  private getCandidateReviewers(request: AssignmentRequest): string[] {
    // In a real implementation, this would query the database
    // For now, we'll use a simple in-memory set for demonstration
    const allReviewerIds = request.reviewerIds || ['rev-1', 'rev-2', 'rev-3']; // placeholder
    
    let candidates = allReviewerIds.filter(id => !request.excludeReviewerIds?.includes(id));

    // Respect reviewer availability (4.18)
    // Default behavior: only consider reviewers whose effective availability is AVAILABLE.
    // If request.requireAvailability is provided, use it as the allowed set instead.
    candidates = candidates.filter(id => {
      const effective = reviewerService.getEffectiveAvailability(id).data;
      if (!effective) return false;
      if (request.requireAvailability && request.requireAvailability.length > 0) {
        return request.requireAvailability.includes(effective);
      }
      return effective === 'AVAILABLE';
    });

    // Filter by minimum rating/quality if specified
    if (request.minRating !== undefined) {
      candidates = candidates.filter(id => {
        const quality = reviewerService.getQualityScore(id).data || 0;
        return quality >= request.minRating!;
      });
    }

    return candidates;
  }

  /**
   * Rank reviewers using the specified algorithm.
   */
  private rankReviewers(
    candidateIds: string[],
    request: AssignmentRequest,
    algorithm: AssignmentAlgorithm
  ): AssignmentResult[] {
    const scores: AssignmentResult[] = [];

    for (const reviewerId of candidateIds) {
      let score = 0;
      let reason = '';

      switch (algorithm) {
        case 'WORKLOAD':
          score = this.scoreByWorkload(reviewerId, request);
          reason = 'Lower workload';
          break;
        case 'SPECIALTY':
          score = this.scoreBySpecialty(reviewerId, request);
          reason = 'Specialty match';
          break;
        case 'DEPARTMENT':
          score = this.scoreByDepartment(reviewerId, request);
          reason = 'Department match';
          break;
        case 'PERFORMANCE':
          score = this.scoreByPerformance(reviewerId, request);
          reason = 'Performance';
          break;
        case 'ROUND_ROBIN':
          score = this.scoreByRoundRobin(reviewerId, request);
          reason = 'Round-robin';
          break;
      }

      scores.push({ reviewerId, score, reason });
    }

    // Sort by score descending (higher is better)
    scores.sort((a, b) => b.score - a.score);

    // Filter out reviewers with 0 score (not suitable)
    return scores.filter(s => s.score > 0);
  }

  /**
   * Score by workload (prefer lower workload). 4.13
   */
  private scoreByWorkload(reviewerId: string, request: AssignmentRequest): number {
    const summary = reviewerService.getSummary(reviewerId);
    if (!summary.success || !summary.data) return 0;

    const { capacityPercentage, overCapacity } = summary.data;

    // If over capacity, score is 0
    if (overCapacity) return 0;

    // Lower capacity percentage = higher score (more available)
    // Score ranges from 100 (0% capacity) to 0 (99%+ capacity)
    const score = Math.max(0, 100 - capacityPercentage);
    return score;
  }

  /**
   * Score by specialty match. 4.14
   */
  private scoreBySpecialty(reviewerId: string, request: AssignmentRequest): number {
    if (!request.specialty) return 50; // neutral score if no requirement
    const map = request.reviewerIdToSpecialties || {};
    const specs = map[reviewerId] || [];
    const has = specs.includes(request.specialty);
    return has ? 100 : 0;
  }

  /**
   * Score by department/category match. 4.15
   */
  private scoreByDepartment(reviewerId: string, request: AssignmentRequest): number {
    if (!request.department) return 50; // neutral if no requirement
    const map = request.reviewerIdToDepartment || {};
    const dep = map[reviewerId];
    return dep === request.department ? 100 : 0;
  }

  /**
   * Score by historical performance. 4.16
   */
  private scoreByPerformance(reviewerId: string, request: AssignmentRequest): number {
    const qualityScore = reviewerService.getQualityScore(reviewerId).data || 0;
    return qualityScore; // Use quality score directly (0-100)
  }

  /**
   * Score by round-robin (even distribution). 4.17
   */
  private scoreByRoundRobin(reviewerId: string, request: AssignmentRequest): number {
    const key = request.roundRobinKey || 'default';
    const idx = this.roundRobinIndexByKey.get(key) || 0;
    const candidates = (request.reviewerIds || []).filter(id => !request.excludeReviewerIds?.includes(id));
    if (candidates.length === 0) return 0;
    // Build an order where the next index gets the highest score
    const pos = candidates.indexOf(reviewerId);
    if (pos === -1) return 0;
    const distance = (pos - idx + candidates.length) % candidates.length;
    // Map distance to score: 0 -> 100, 1 -> 90, 2 -> 80, ...
    const score = Math.max(0, 100 - distance * 10);
    // After ranking, advance pointer once per assignment (handled externally),
    // but ranking needs a deterministic snapshot; advancement is done via helper:
    return score;
  }

  // Advance round-robin index for a key after selecting a reviewer
  advanceRoundRobin(key: string, total: number): void {
    if (total <= 0) return;
    const idx = this.roundRobinIndexByKey.get(key) || 0;
    this.roundRobinIndexByKey.set(key, (idx + 1) % total);
  }
}

export const reviewerAutoAssignmentService = new ReviewerAutoAssignmentService();

