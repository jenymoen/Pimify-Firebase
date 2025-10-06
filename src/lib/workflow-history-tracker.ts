import {
  ProductWorkflow,
  WorkflowState,
  AuditTrailEntry,
  UserRole,
  WorkflowHistoryEntry,
} from '@/types/workflow';
import { workflowPersistenceService } from './workflow-persistence';

/**
 * Interface for workflow history analytics
 */
export interface WorkflowHistoryAnalytics {
  totalProducts: number;
  productsByState: Record<WorkflowState, number>;
  averageTimeInState: Record<WorkflowState, number>; // in hours
  stateTransitionCounts: Record<string, number>; // "DRAFT->REVIEW": 5
  userActivity: Record<string, UserActivityStats>;
  reviewerPerformance: Record<string, ReviewerStats>;
  rejectionReasons: Record<string, number>;
  timeToApproval: number; // average hours from draft to approved
  timeToPublish: number; // average hours from approved to published
  bottleneckStates: WorkflowState[]; // states where products spend most time
  trends: WorkflowTrends;
}

export interface UserActivityStats {
  userId: string;
  userEmail: string;
  userRole: UserRole;
  productsSubmitted: number;
  productsReviewed: number;
  productsApproved: number;
  productsRejected: number;
  averageReviewTime: number; // in hours
  totalActions: number;
  lastActivity: string;
}

export interface ReviewerStats {
  reviewerId: string;
  reviewerEmail: string;
  totalReviews: number;
  approvedCount: number;
  rejectedCount: number;
  averageReviewTime: number; // in hours
  onTimeReviews: number; // reviews completed within SLA
  overdueReviews: number;
  rejectionRate: number; // percentage
  lastReviewDate: string;
}

export interface WorkflowTrends {
  dailySubmissions: Array<{ date: string; count: number }>;
  dailyApprovals: Array<{ date: string; count: number }>;
  dailyRejections: Array<{ date: string; count: number }>;
  stateDistributionOverTime: Array<{
    date: string;
    states: Record<WorkflowState, number>;
  }>;
  averageProcessingTime: Array<{
    date: string;
    hours: number;
  }>;
}

export interface WorkflowHistoryReport {
  period: {
    start: Date;
    end: Date;
  };
  analytics: WorkflowHistoryAnalytics;
  insights: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface WorkflowHistoryFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  userIds?: string[];
  reviewerIds?: string[];
  states?: WorkflowState[];
  includeDeleted?: boolean;
}

/**
 * Service for tracking and analyzing workflow history
 */
export class WorkflowHistoryTracker {
  /**
   * Generate comprehensive workflow analytics
   */
  async generateAnalytics(filters?: WorkflowHistoryFilters): Promise<WorkflowHistoryAnalytics> {
    const products = await this.getFilteredProducts(filters);
    const auditTrails = await this.getAllAuditTrails(products);

    return {
      totalProducts: products.length,
      productsByState: this.calculateProductsByState(products),
      averageTimeInState: await this.calculateAverageTimeInState(products),
      stateTransitionCounts: this.calculateStateTransitionCounts(auditTrails),
      userActivity: await this.calculateUserActivity(products, auditTrails),
      reviewerPerformance: await this.calculateReviewerPerformance(products, auditTrails),
      rejectionReasons: this.calculateRejectionReasons(auditTrails),
      timeToApproval: this.calculateTimeToApproval(products),
      timeToPublish: this.calculateTimeToPublish(products),
      bottleneckStates: this.identifyBottleneckStates(products),
      trends: await this.calculateTrends(products, auditTrails, filters),
    };
  }

  /**
   * Generate a comprehensive workflow history report
   */
  async generateReport(filters?: WorkflowHistoryFilters): Promise<WorkflowHistoryReport> {
    const analytics = await this.generateAnalytics(filters);
    const insights = this.generateInsights(analytics);
    const recommendations = this.generateRecommendations(analytics);

    return {
      period: {
        start: filters?.dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: filters?.dateRange?.end || new Date(),
      },
      analytics,
      insights,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get workflow history for a specific product
   */
  async getProductWorkflowHistory(productId: string): Promise<{
    product: ProductWorkflow | null;
    history: WorkflowHistoryEntry[];
    auditTrail: AuditTrailEntry[];
    timeline: WorkflowTimelineEntry[];
  }> {
    const product = await workflowPersistenceService.loadProductWorkflow(productId);
    const auditTrail = await workflowPersistenceService.getAuditTrail(productId);

    if (!product) {
      return {
        product: null,
        history: [],
        auditTrail: [],
        timeline: [],
      };
    }

    const timeline = this.createWorkflowTimeline(product.workflowHistory || [], auditTrail);

    return {
      product,
      history: product.workflowHistory || [],
      auditTrail,
      timeline,
    };
  }

  /**
   * Get workflow statistics for dashboard
   */
  async getDashboardStats(): Promise<{
    totalProducts: number;
    productsInReview: number;
    overdueReviews: number;
    averageReviewTime: number;
    approvalRate: number;
    rejectionRate: number;
    topReviewers: Array<{ id: string; name: string; count: number }>;
    recentActivity: Array<{
      productId: string;
      productName: string;
      action: string;
      user: string;
      timestamp: string;
    }>;
  }> {
    const products = await workflowPersistenceService.loadAllProductWorkflows();
    const auditTrails = await this.getAllAuditTrails(products);

    const productsInReview = products.filter(p => p.workflowState === WorkflowState.REVIEW).length;
    
    const overdueReviews = products.filter(p => {
      if (p.workflowState !== WorkflowState.REVIEW) return false;
      const reviewStart = p.workflowHistory?.find(h => h.state === WorkflowState.REVIEW);
      if (!reviewStart) return false;
      const daysInReview = (Date.now() - new Date(reviewStart.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return daysInReview > 3;
    }).length;

    const averageReviewTime = this.calculateAverageReviewTime(products);
    const approvalRate = this.calculateApprovalRate(products);
    const rejectionRate = this.calculateRejectionRate(products);

    const topReviewers = this.getTopReviewers(auditTrails);
    const recentActivity = this.getRecentActivity(auditTrails, products);

    return {
      totalProducts: products.length,
      productsInReview,
      overdueReviews,
      averageReviewTime,
      approvalRate,
      rejectionRate,
      topReviewers,
      recentActivity,
    };
  }

  /**
   * Export workflow history data
   */
  async exportHistoryData(format: 'json' | 'csv', filters?: WorkflowHistoryFilters): Promise<string> {
    const products = await this.getFilteredProducts(filters);
    const auditTrails = await this.getAllAuditTrails(products);

    if (format === 'json') {
      return JSON.stringify({
        products,
        auditTrails,
        exportedAt: new Date().toISOString(),
        filters: filters || null,
      }, null, 2);
    } else {
      return this.exportToCSV(products, auditTrails);
    }
  }

  // Private helper methods

  private async getFilteredProducts(filters?: WorkflowHistoryFilters): Promise<ProductWorkflow[]> {
    let products = await workflowPersistenceService.loadAllProductWorkflows();

    if (filters) {
      if (filters.dateRange) {
        products = products.filter(p => {
          const productDate = new Date(p.createdAt);
          return productDate >= filters.dateRange!.start && productDate <= filters.dateRange!.end;
        });
      }

      if (filters.userIds && filters.userIds.length > 0) {
        products = products.filter(p => filters.userIds!.includes(p.submittedBy));
      }

      if (filters.reviewerIds && filters.reviewerIds.length > 0) {
        products = products.filter(p => p.assignedReviewer && filters.reviewerIds!.includes(p.assignedReviewer));
      }

      if (filters.states && filters.states.length > 0) {
        products = products.filter(p => filters.states!.includes(p.workflowState));
      }
    }

    return products;
  }

  private async getAllAuditTrails(products: ProductWorkflow[]): Promise<Record<string, AuditTrailEntry[]>> {
    const auditTrails: Record<string, AuditTrailEntry[]> = {};
    
    for (const product of products) {
      auditTrails[product.id] = await workflowPersistenceService.getAuditTrail(product.id);
    }

    return auditTrails;
  }

  private calculateProductsByState(products: ProductWorkflow[]): Record<WorkflowState, number> {
    const counts: Record<WorkflowState, number> = {
      [WorkflowState.DRAFT]: 0,
      [WorkflowState.REVIEW]: 0,
      [WorkflowState.APPROVED]: 0,
      [WorkflowState.PUBLISHED]: 0,
      [WorkflowState.REJECTED]: 0,
    };

    products.forEach(product => {
      counts[product.workflowState]++;
    });

    return counts;
  }

  private async calculateAverageTimeInState(products: ProductWorkflow[]): Promise<Record<WorkflowState, number>> {
    const times: Record<WorkflowState, number[]> = {
      [WorkflowState.DRAFT]: [],
      [WorkflowState.REVIEW]: [],
      [WorkflowState.APPROVED]: [],
      [WorkflowState.PUBLISHED]: [],
      [WorkflowState.REJECTED]: [],
    };

    products.forEach(product => {
      const history = product.workflowHistory || [];
      
      for (let i = 0; i < history.length - 1; i++) {
        const current = history[i];
        const next = history[i + 1];
        
        const timeInState = (new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime()) / (1000 * 60 * 60); // hours
        times[current.state].push(timeInState);
      }
    });

    const averages: Record<WorkflowState, number> = {
      [WorkflowState.DRAFT]: 0,
      [WorkflowState.REVIEW]: 0,
      [WorkflowState.APPROVED]: 0,
      [WorkflowState.PUBLISHED]: 0,
      [WorkflowState.REJECTED]: 0,
    };

    Object.keys(times).forEach(state => {
      const stateTimes = times[state as WorkflowState];
      if (stateTimes.length > 0) {
        averages[state as WorkflowState] = stateTimes.reduce((sum, time) => sum + time, 0) / stateTimes.length;
      }
    });

    return averages;
  }

  private calculateStateTransitionCounts(auditTrails: Record<string, AuditTrailEntry[]>): Record<string, number> {
    const counts: Record<string, number> = {};

    Object.values(auditTrails).forEach(trail => {
      trail.forEach(entry => {
        if (entry.action === 'STATE_CHANGE' && entry.fieldChanges.length > 0) {
          const change = entry.fieldChanges[0];
          if (change.field === 'workflowState') {
            const transition = `${change.oldValue.toUpperCase()}->${change.newValue.toUpperCase()}`;
            counts[transition] = (counts[transition] || 0) + 1;
          }
        }
      });
    });

    return counts;
  }

  private async calculateUserActivity(
    products: ProductWorkflow[], 
    auditTrails: Record<string, AuditTrailEntry[]>
  ): Promise<Record<string, UserActivityStats>> {
    const userStats: Record<string, UserActivityStats> = {};

    // Initialize user stats
    products.forEach(product => {
      if (!userStats[product.submittedBy]) {
        userStats[product.submittedBy] = {
          userId: product.submittedBy,
          userEmail: product.submittedBy, // In real app, would fetch from user service
          userRole: UserRole.EDITOR, // In real app, would fetch from user service
          productsSubmitted: 0,
          productsReviewed: 0,
          productsApproved: 0,
          productsRejected: 0,
          averageReviewTime: 0,
          totalActions: 0,
          lastActivity: '',
        };
      }
      userStats[product.submittedBy].productsSubmitted++;
    });

    // Calculate review activity
    Object.values(auditTrails).forEach(trail => {
      trail.forEach(entry => {
        if (!userStats[entry.userId]) {
          userStats[entry.userId] = {
            userId: entry.userId,
            userEmail: entry.userId,
            userRole: UserRole.REVIEWER,
            productsSubmitted: 0,
            productsReviewed: 0,
            productsApproved: 0,
            productsRejected: 0,
            averageReviewTime: 0,
            totalActions: 0,
            lastActivity: '',
          };
        }

        userStats[entry.userId].totalActions++;
        userStats[entry.userId].lastActivity = entry.timestamp;

        if (entry.action === 'APPROVE') {
          userStats[entry.userId].productsApproved++;
        } else if (entry.action === 'REJECT') {
          userStats[entry.userId].productsRejected++;
        }
      });
    });

    return userStats;
  }

  private async calculateReviewerPerformance(
    products: ProductWorkflow[], 
    auditTrails: Record<string, AuditTrailEntry[]>
  ): Promise<Record<string, ReviewerStats>> {
    const reviewerStats: Record<string, ReviewerStats> = {};

    Object.entries(auditTrails).forEach(([productId, trail]) => {
      const product = products.find(p => p.id === productId);
      if (!product || !product.assignedReviewer) return;

      const reviewerId = product.assignedReviewer;
      if (!reviewerStats[reviewerId]) {
        reviewerStats[reviewerId] = {
          reviewerId,
          reviewerEmail: reviewerId,
          totalReviews: 0,
          approvedCount: 0,
          rejectedCount: 0,
          averageReviewTime: 0,
          onTimeReviews: 0,
          overdueReviews: 0,
          rejectionRate: 0,
          lastReviewDate: '',
        };
      }

      reviewerStats[reviewerId].totalReviews++;
      reviewerStats[reviewerId].lastReviewDate = trail[trail.length - 1]?.timestamp || '';

      const reviewEntry = trail.find(entry => entry.action === 'APPROVE' || entry.action === 'REJECT');
      if (reviewEntry) {
        if (reviewEntry.action === 'APPROVE') {
          reviewerStats[reviewerId].approvedCount++;
        } else {
          reviewerStats[reviewerId].rejectedCount++;
        }

        // Check if review was on time (within 3 days)
        const reviewStart = product.workflowHistory?.find(h => h.state === WorkflowState.REVIEW);
        if (reviewStart) {
          const reviewTime = (new Date(reviewEntry.timestamp).getTime() - new Date(reviewStart.timestamp).getTime()) / (1000 * 60 * 60 * 24);
          if (reviewTime <= 3) {
            reviewerStats[reviewerId].onTimeReviews++;
          } else {
            reviewerStats[reviewerId].overdueReviews++;
          }
        }
      }
    });

    // Calculate rejection rates
    Object.values(reviewerStats).forEach(stats => {
      if (stats.totalReviews > 0) {
        stats.rejectionRate = (stats.rejectedCount / stats.totalReviews) * 100;
      }
    });

    return reviewerStats;
  }

  private calculateRejectionReasons(auditTrails: Record<string, AuditTrailEntry[]>): Record<string, number> {
    const reasons: Record<string, number> = {};

    Object.values(auditTrails).forEach(trail => {
      trail.forEach(entry => {
        if (entry.action === 'REJECT' && entry.reason) {
          // Extract key phrases from rejection reasons
          const reason = entry.reason.toLowerCase();
          if (reason.includes('quality')) {
            reasons['Quality Issues'] = (reasons['Quality Issues'] || 0) + 1;
          } else if (reason.includes('incomplete')) {
            reasons['Incomplete Information'] = (reasons['Incomplete Information'] || 0) + 1;
          } else if (reason.includes('image')) {
            reasons['Image Issues'] = (reasons['Image Issues'] || 0) + 1;
          } else if (reason.includes('description')) {
            reasons['Description Issues'] = (reasons['Description Issues'] || 0) + 1;
          } else {
            reasons['Other'] = (reasons['Other'] || 0) + 1;
          }
        }
      });
    });

    return reasons;
  }

  private calculateTimeToApproval(products: ProductWorkflow[]): number {
    const times: number[] = [];

    products.forEach(product => {
      const draftEntry = product.workflowHistory?.find(h => h.state === WorkflowState.DRAFT);
      const approvedEntry = product.workflowHistory?.find(h => h.state === WorkflowState.APPROVED);

      if (draftEntry && approvedEntry) {
        const timeToApproval = (new Date(approvedEntry.timestamp).getTime() - new Date(draftEntry.timestamp).getTime()) / (1000 * 60 * 60);
        times.push(timeToApproval);
      }
    });

    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
  }

  private calculateTimeToPublish(products: ProductWorkflow[]): number {
    const times: number[] = [];

    products.forEach(product => {
      const approvedEntry = product.workflowHistory?.find(h => h.state === WorkflowState.APPROVED);
      const publishedEntry = product.workflowHistory?.find(h => h.state === WorkflowState.PUBLISHED);

      if (approvedEntry && publishedEntry) {
        const timeToPublish = (new Date(publishedEntry.timestamp).getTime() - new Date(approvedEntry.timestamp).getTime()) / (1000 * 60 * 60);
        times.push(timeToPublish);
      }
    });

    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
  }

  private identifyBottleneckStates(products: ProductWorkflow[]): WorkflowState[] {
    const stateTimes = this.calculateProductsByState(products);
    const sortedStates = Object.entries(stateTimes)
      .sort(([, a], [, b]) => b - a)
      .map(([state]) => state as WorkflowState);

    return sortedStates.slice(0, 2); // Top 2 bottleneck states
  }

  private async calculateTrends(
    products: ProductWorkflow[], 
    auditTrails: Record<string, AuditTrailEntry[]>,
    filters?: WorkflowHistoryFilters
  ): Promise<WorkflowTrends> {
    const startDate = filters?.dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters?.dateRange?.end || new Date();

    return {
      dailySubmissions: this.calculateDailySubmissions(products, startDate, endDate),
      dailyApprovals: this.calculateDailyApprovals(auditTrails, startDate, endDate),
      dailyRejections: this.calculateDailyRejections(auditTrails, startDate, endDate),
      stateDistributionOverTime: this.calculateStateDistributionOverTime(products, startDate, endDate),
      averageProcessingTime: this.calculateAverageProcessingTime(products, startDate, endDate),
    };
  }

  private calculateDailySubmissions(products: ProductWorkflow[], startDate: Date, endDate: Date): Array<{ date: string; count: number }> {
    const dailyCounts: Record<string, number> = {};

    products.forEach(product => {
      const productDate = new Date(product.createdAt);
      if (productDate >= startDate && productDate <= endDate) {
        const dateKey = productDate.toISOString().split('T')[0];
        dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
      }
    });

    return Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateDailyApprovals(auditTrails: Record<string, AuditTrailEntry[]>, startDate: Date, endDate: Date): Array<{ date: string; count: number }> {
    const dailyCounts: Record<string, number> = {};

    Object.values(auditTrails).forEach(trail => {
      trail.forEach(entry => {
        if (entry.action === 'APPROVE') {
          const entryDate = new Date(entry.timestamp);
          if (entryDate >= startDate && entryDate <= endDate) {
            const dateKey = entryDate.toISOString().split('T')[0];
            dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
          }
        }
      });
    });

    return Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateDailyRejections(auditTrails: Record<string, AuditTrailEntry[]>, startDate: Date, endDate: Date): Array<{ date: string; count: number }> {
    const dailyCounts: Record<string, number> = {};

    Object.values(auditTrails).forEach(trail => {
      trail.forEach(entry => {
        if (entry.action === 'REJECT') {
          const entryDate = new Date(entry.timestamp);
          if (entryDate >= startDate && entryDate <= endDate) {
            const dateKey = entryDate.toISOString().split('T')[0];
            dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
          }
        }
      });
    });

    return Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateStateDistributionOverTime(products: ProductWorkflow[], startDate: Date, endDate: Date): Array<{ date: string; states: Record<WorkflowState, number> }> {
    // This is a simplified implementation
    // In a real system, you'd track state changes over time
    const dailyStates: Record<string, Record<WorkflowState, number>> = {};

    products.forEach(product => {
      const productDate = new Date(product.createdAt);
      if (productDate >= startDate && productDate <= endDate) {
        const dateKey = productDate.toISOString().split('T')[0];
        if (!dailyStates[dateKey]) {
          dailyStates[dateKey] = {
            [WorkflowState.DRAFT]: 0,
            [WorkflowState.REVIEW]: 0,
            [WorkflowState.APPROVED]: 0,
            [WorkflowState.PUBLISHED]: 0,
            [WorkflowState.REJECTED]: 0,
          };
        }
        dailyStates[dateKey][product.workflowState]++;
      }
    });

    return Object.entries(dailyStates)
      .map(([date, states]) => ({ date, states }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateAverageProcessingTime(products: ProductWorkflow[], startDate: Date, endDate: Date): Array<{ date: string; hours: number }> {
    // Simplified implementation - in reality, you'd calculate this more accurately
    const dailyTimes: Record<string, number[]> = {};

    products.forEach(product => {
      const productDate = new Date(product.createdAt);
      if (productDate >= startDate && productDate <= endDate) {
        const dateKey = productDate.toISOString().split('T')[0];
        if (!dailyTimes[dateKey]) {
          dailyTimes[dateKey] = [];
        }
        
        // Calculate processing time from creation to current state
        const currentTime = product.workflowState === WorkflowState.PUBLISHED ? 
          new Date(product.workflowHistory?.[product.workflowHistory.length - 1]?.timestamp || product.createdAt).getTime() :
          Date.now();
        
        const processingTime = (currentTime - new Date(product.createdAt).getTime()) / (1000 * 60 * 60);
        dailyTimes[dateKey].push(processingTime);
      }
    });

    return Object.entries(dailyTimes)
      .map(([date, times]) => ({
        date,
        hours: times.reduce((sum, time) => sum + time, 0) / times.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateAverageReviewTime(products: ProductWorkflow[]): number {
    const reviewTimes: number[] = [];

    products.forEach(product => {
      const reviewStart = product.workflowHistory?.find(h => h.state === WorkflowState.REVIEW);
      const reviewEnd = product.workflowHistory?.find(h => 
        h.state === WorkflowState.APPROVED || h.state === WorkflowState.REJECTED
      );

      if (reviewStart && reviewEnd) {
        const reviewTime = (new Date(reviewEnd.timestamp).getTime() - new Date(reviewStart.timestamp).getTime()) / (1000 * 60 * 60);
        reviewTimes.push(reviewTime);
      }
    });

    return reviewTimes.length > 0 ? reviewTimes.reduce((sum, time) => sum + time, 0) / reviewTimes.length : 0;
  }

  private calculateApprovalRate(products: ProductWorkflow[]): number {
    const totalProcessed = products.filter(p => 
      p.workflowState === WorkflowState.APPROVED || 
      p.workflowState === WorkflowState.PUBLISHED ||
      p.workflowState === WorkflowState.REJECTED
    ).length;

    if (totalProcessed === 0) return 0;

    const approved = products.filter(p => 
      p.workflowState === WorkflowState.APPROVED || 
      p.workflowState === WorkflowState.PUBLISHED
    ).length;

    return (approved / totalProcessed) * 100;
  }

  private calculateRejectionRate(products: ProductWorkflow[]): number {
    const totalProcessed = products.filter(p => 
      p.workflowState === WorkflowState.APPROVED || 
      p.workflowState === WorkflowState.PUBLISHED ||
      p.workflowState === WorkflowState.REJECTED
    ).length;

    if (totalProcessed === 0) return 0;

    const rejected = products.filter(p => p.workflowState === WorkflowState.REJECTED).length;

    return (rejected / totalProcessed) * 100;
  }

  private getTopReviewers(auditTrails: Record<string, AuditTrailEntry[]>): Array<{ id: string; name: string; count: number }> {
    const reviewerCounts: Record<string, number> = {};

    Object.values(auditTrails).forEach(trail => {
      trail.forEach(entry => {
        if (entry.action === 'APPROVE' || entry.action === 'REJECT') {
          reviewerCounts[entry.userId] = (reviewerCounts[entry.userId] || 0) + 1;
        }
      });
    });

    return Object.entries(reviewerCounts)
      .map(([id, count]) => ({ id, name: id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getRecentActivity(auditTrails: Record<string, AuditTrailEntry[]>, products: ProductWorkflow[]): Array<{
    productId: string;
    productName: string;
    action: string;
    user: string;
    timestamp: string;
  }> {
    const allEntries: Array<AuditTrailEntry & { productId: string }> = [];

    Object.entries(auditTrails).forEach(([productId, trail]) => {
      trail.forEach(entry => {
        allEntries.push({ ...entry, productId });
      });
    });

    return allEntries
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
      .map(entry => {
        const product = products.find(p => p.id === entry.productId);
        return {
          productId: entry.productId,
          productName: product?.basicInfo.name.en || 'Unknown Product',
          action: entry.action,
          user: entry.userId,
          timestamp: entry.timestamp,
        };
      });
  }

  private createWorkflowTimeline(
    history: WorkflowHistoryEntry[], 
    auditTrail: AuditTrailEntry[]
  ): WorkflowTimelineEntry[] {
    const timeline: WorkflowTimelineEntry[] = [];

    // Add workflow history entries
    history.forEach(entry => {
      timeline.push({
        type: 'state_change',
        timestamp: entry.timestamp,
        userId: entry.userId,
        state: entry.state,
        comment: entry.comment,
      });
    });

    // Add audit trail entries
    auditTrail.forEach(entry => {
      timeline.push({
        type: 'audit_entry',
        timestamp: entry.timestamp,
        userId: entry.userId,
        action: entry.action,
        fieldChanges: entry.fieldChanges,
        reason: entry.reason,
      });
    });

    // Sort by timestamp
    return timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private generateInsights(analytics: WorkflowHistoryAnalytics): string[] {
    const insights: string[] = [];

    // Bottleneck analysis
    if (analytics.bottleneckStates.length > 0) {
      insights.push(`Products spend most time in ${analytics.bottleneckStates.join(' and ')} states`);
    }

    // Review time analysis
    if (analytics.averageTimeInState[WorkflowState.REVIEW] > 24) {
      insights.push(`Average review time is ${analytics.averageTimeInState[WorkflowState.REVIEW].toFixed(1)} hours - consider optimizing review process`);
    }

    // Rejection rate analysis
    const totalRejections = Object.values(analytics.rejectionReasons).reduce((sum, count) => sum + count, 0);
    if (totalRejections > 0) {
      const topRejectionReason = Object.entries(analytics.rejectionReasons)
        .sort(([, a], [, b]) => b - a)[0];
      insights.push(`Most common rejection reason: ${topRejectionReason[0]} (${topRejectionReason[1]} cases)`);
    }

    // Performance insights
    if (analytics.timeToApproval > 48) {
      insights.push(`Average time to approval is ${analytics.timeToApproval.toFixed(1)} hours - consider streamlining the approval process`);
    }

    return insights;
  }

  private generateRecommendations(analytics: WorkflowHistoryAnalytics): string[] {
    const recommendations: string[] = [];

    // Review process recommendations
    if (analytics.averageTimeInState[WorkflowState.REVIEW] > 24) {
      recommendations.push('Consider implementing review SLAs and automated reminders');
      recommendations.push('Review reviewer workload distribution and capacity');
    }

    // Quality recommendations
    const totalRejections = Object.values(analytics.rejectionReasons).reduce((sum, count) => sum + count, 0);
    if (totalRejections > 0) {
      recommendations.push('Implement pre-submission quality checks to reduce rejection rates');
      recommendations.push('Provide better guidance to editors on common rejection reasons');
    }

    // Process optimization recommendations
    if (analytics.bottleneckStates.includes(WorkflowState.REVIEW)) {
      recommendations.push('Consider parallel review processes for faster turnaround');
      recommendations.push('Implement automated quality checks before review');
    }

    // Training recommendations
    const reviewers = Object.values(analytics.reviewerPerformance);
    if (reviewers.length > 0) {
      const avgRejectionRate = reviewers.reduce((sum, r) => sum + r.rejectionRate, 0) / reviewers.length;
      if (avgRejectionRate > 30) {
        recommendations.push('Provide additional training for reviewers on quality standards');
      }
    }

    return recommendations;
  }

  private exportToCSV(products: ProductWorkflow[], auditTrails: Record<string, AuditTrailEntry[]>): string {
    const headers = [
      'Product ID', 'Product Name', 'Current State', 'Submitted By', 'Assigned Reviewer',
      'Created At', 'Last Modified', 'Time in Draft (hours)', 'Time in Review (hours)',
      'Total Processing Time (hours)', 'Rejection Count', 'Approval Date'
    ];

    const rows = products.map(product => {
      const auditTrail = auditTrails[product.id] || [];
      const rejectionCount = auditTrail.filter(entry => entry.action === 'REJECT').length;
      const approvalEntry = auditTrail.find(entry => entry.action === 'APPROVE');
      
      // Calculate time in each state
      const draftTime = this.calculateTimeInState(product, WorkflowState.DRAFT);
      const reviewTime = this.calculateTimeInState(product, WorkflowState.REVIEW);
      const totalTime = this.calculateTotalProcessingTime(product);

      return [
        product.id,
        product.basicInfo.name.en,
        product.workflowState.toUpperCase(),
        product.submittedBy,
        product.assignedReviewer || '',
        product.createdAt,
        product.workflowHistory?.[product.workflowHistory.length - 1]?.timestamp || product.createdAt,
        draftTime.toFixed(2),
        reviewTime.toFixed(2),
        totalTime.toFixed(2),
        rejectionCount.toString(),
        approvalEntry?.timestamp || '',
      ];
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private calculateTimeInState(product: ProductWorkflow, state: WorkflowState): number {
    const history = product.workflowHistory || [];
    let totalTime = 0;

    for (let i = 0; i < history.length; i++) {
      if (history[i].state === state) {
        const startTime = new Date(history[i].timestamp).getTime();
        const endTime = i < history.length - 1 ? 
          new Date(history[i + 1].timestamp).getTime() : 
          Date.now();
        totalTime += (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
      }
    }

    return totalTime;
  }

  private calculateTotalProcessingTime(product: ProductWorkflow): number {
    const startTime = new Date(product.createdAt).getTime();
    const endTime = product.workflowState === WorkflowState.PUBLISHED ?
      new Date(product.workflowHistory?.[product.workflowHistory.length - 1]?.timestamp || product.createdAt).getTime() :
      Date.now();
    
    return (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
  }
}

// Additional interfaces for timeline
export interface WorkflowTimelineEntry {
  type: 'state_change' | 'audit_entry';
  timestamp: string;
  userId: string;
  state?: WorkflowState;
  comment?: string;
  action?: string;
  fieldChanges?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  reason?: string;
}

// Export singleton instance
export const workflowHistoryTracker = new WorkflowHistoryTracker();

// Helper functions for direct use
export async function generateWorkflowAnalytics(filters?: WorkflowHistoryFilters): Promise<WorkflowHistoryAnalytics> {
  return workflowHistoryTracker.generateAnalytics(filters);
}

export async function generateWorkflowReport(filters?: WorkflowHistoryFilters): Promise<WorkflowHistoryReport> {
  return workflowHistoryTracker.generateReport(filters);
}

export async function getProductWorkflowHistory(productId: string) {
  return workflowHistoryTracker.getProductWorkflowHistory(productId);
}

export async function getDashboardStats() {
  return workflowHistoryTracker.getDashboardStats();
}

export async function exportWorkflowHistory(format: 'json' | 'csv', filters?: WorkflowHistoryFilters): Promise<string> {
  return workflowHistoryTracker.exportHistoryData(format, filters);
}
