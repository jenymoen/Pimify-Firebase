/**
 * Notification Unsubscribe Service
 * 
 * Handles user unsubscribe requests, preferences, and one-click unsubscribe links
 */

import { NotificationTemplate, NotificationChannel } from './notification-service';
import { UserRole } from '@/types/workflow';

/**
 * Unsubscribe scope
 */
export enum UnsubscribeScope {
  ALL = 'all', // Unsubscribe from all notifications
  CHANNEL = 'channel', // Unsubscribe from specific channel
  TEMPLATE = 'template', // Unsubscribe from specific event type
  CATEGORY = 'category', // Unsubscribe from category of events
}

/**
 * Notification category
 */
export enum NotificationCategory {
  WORKFLOW = 'workflow', // Product workflow events
  ASSIGNMENT = 'assignment', // Assignment notifications
  DEADLINE = 'deadline', // Deadline reminders
  SYSTEM = 'system', // System notifications
  MARKETING = 'marketing', // Marketing/promotional
}

/**
 * Unsubscribe request
 */
export interface UnsubscribeRequest {
  userId: string;
  scope: UnsubscribeScope;
  target?: NotificationChannel | NotificationTemplate | NotificationCategory;
  reason?: string;
  timestamp: Date;
  sourceEmail?: string;
  sourceTemplate?: NotificationTemplate;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Unsubscribe record
 */
export interface UnsubscribeRecord {
  id: string;
  userId: string;
  email: string;
  name: string;
  scope: UnsubscribeScope;
  target?: NotificationChannel | NotificationTemplate | NotificationCategory;
  reason?: string;
  unsubscribedAt: Date;
  resubscribedAt?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

/**
 * Unsubscribe token
 */
export interface UnsubscribeToken {
  token: string;
  userId: string;
  email: string;
  scope: UnsubscribeScope;
  target?: NotificationChannel | NotificationTemplate | NotificationCategory;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
}

/**
 * Resubscribe request
 */
export interface ResubscribeRequest {
  userId: string;
  scope: UnsubscribeScope;
  target?: NotificationChannel | NotificationTemplate | NotificationCategory;
  timestamp: Date;
}

/**
 * Unsubscribe statistics
 */
export interface UnsubscribeStatistics {
  totalUnsubscribes: number;
  activeUnsubscribes: number;
  resubscribes: number;
  unsubscribesByScope: Record<UnsubscribeScope, number>;
  unsubscribesByChannel: Record<NotificationChannel, number>;
  unsubscribesByTemplate: Record<NotificationTemplate, number>;
  unsubscribesByCategory: Record<NotificationCategory, number>;
  commonReasons: Array<{ reason: string; count: number }>;
}

/**
 * Notification Unsubscribe Service
 */
export class NotificationUnsubscribeService {
  private unsubscribeRecords: Map<string, UnsubscribeRecord[]> = new Map();
  private tokens: Map<string, UnsubscribeToken> = new Map();
  private stats: UnsubscribeStatistics;

  constructor() {
    this.stats = this.initializeStats();
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): UnsubscribeStatistics {
    return {
      totalUnsubscribes: 0,
      activeUnsubscribes: 0,
      resubscribes: 0,
      unsubscribesByScope: {} as Record<UnsubscribeScope, number>,
      unsubscribesByChannel: {} as Record<NotificationChannel, number>,
      unsubscribesByTemplate: {} as Record<NotificationTemplate, number>,
      unsubscribesByCategory: {} as Record<NotificationCategory, number>,
      commonReasons: [],
    };
  }

  /**
   * Generate unsubscribe token
   */
  generateUnsubscribeToken(
    userId: string,
    email: string,
    scope: UnsubscribeScope = UnsubscribeScope.ALL,
    target?: NotificationChannel | NotificationTemplate | NotificationCategory,
    expiresInDays: number = 90
  ): string {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const tokenData: UnsubscribeToken = {
      token,
      userId,
      email,
      scope,
      target,
      createdAt: new Date(),
      expiresAt,
      used: false,
    };

    this.tokens.set(token, tokenData);
    return token;
  }

  /**
   * Validate unsubscribe token
   */
  validateToken(token: string): UnsubscribeToken | null {
    const tokenData = this.tokens.get(token);
    
    if (!tokenData) {
      return null;
    }

    if (tokenData.used) {
      return null;
    }

    if (tokenData.expiresAt < new Date()) {
      return null;
    }

    return tokenData;
  }

  /**
   * Process unsubscribe request
   */
  async unsubscribe(request: UnsubscribeRequest): Promise<UnsubscribeRecord> {
    const record: UnsubscribeRecord = {
      id: this.generateRecordId(),
      userId: request.userId,
      email: request.sourceEmail || 'unknown@example.com',
      name: 'User', // Would be fetched from user service
      scope: request.scope,
      target: request.target,
      reason: request.reason,
      unsubscribedAt: request.timestamp,
      isActive: true,
      metadata: {
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        sourceTemplate: request.sourceTemplate,
      },
    };

    // Store record
    if (!this.unsubscribeRecords.has(request.userId)) {
      this.unsubscribeRecords.set(request.userId, []);
    }
    this.unsubscribeRecords.get(request.userId)!.push(record);

    // Update statistics
    this.updateStats(record, 'unsubscribe');

    return record;
  }

  /**
   * Process unsubscribe via token
   */
  async unsubscribeViaToken(token: string, reason?: string): Promise<UnsubscribeRecord | null> {
    const tokenData = this.validateToken(token);
    
    if (!tokenData) {
      return null;
    }

    // Mark token as used
    tokenData.used = true;
    tokenData.usedAt = new Date();

    // Create unsubscribe request
    const request: UnsubscribeRequest = {
      userId: tokenData.userId,
      scope: tokenData.scope,
      target: tokenData.target,
      reason,
      timestamp: new Date(),
      sourceEmail: tokenData.email,
    };

    return await this.unsubscribe(request);
  }

  /**
   * Resubscribe user
   */
  async resubscribe(request: ResubscribeRequest): Promise<boolean> {
    const userRecords = this.unsubscribeRecords.get(request.userId);
    if (!userRecords) return false;

    let found = false;

    userRecords.forEach(record => {
      // Find matching active unsubscribe
      if (
        record.isActive &&
        record.scope === request.scope &&
        (request.target === undefined || record.target === request.target)
      ) {
        record.isActive = false;
        record.resubscribedAt = request.timestamp;
        found = true;

        // Update statistics
        this.updateStats(record, 'resubscribe');
      }
    });

    return found;
  }

  /**
   * Check if user is unsubscribed
   */
  isUnsubscribed(
    userId: string,
    channel?: NotificationChannel,
    template?: NotificationTemplate
  ): boolean {
    const userRecords = this.unsubscribeRecords.get(userId);
    if (!userRecords) return false;

    return userRecords.some(record => {
      if (!record.isActive) return false;

      // Check all notifications unsubscribe
      if (record.scope === UnsubscribeScope.ALL) {
        return true;
      }

      // Check channel unsubscribe
      if (channel && record.scope === UnsubscribeScope.CHANNEL && record.target === channel) {
        return true;
      }

      // Check template unsubscribe
      if (template && record.scope === UnsubscribeScope.TEMPLATE && record.target === template) {
        return true;
      }

      // Check category unsubscribe
      if (template && record.scope === UnsubscribeScope.CATEGORY) {
        const category = this.getTemplateCategory(template);
        if (category === record.target) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Get unsubscribe records for user
   */
  getUnsubscribeRecords(userId: string, activeOnly: boolean = true): UnsubscribeRecord[] {
    const records = this.unsubscribeRecords.get(userId) || [];
    
    if (activeOnly) {
      return records.filter(r => r.isActive);
    }
    
    return records;
  }

  /**
   * Get all unsubscribe records (admin only)
   */
  getAllUnsubscribeRecords(
    filter: {
      scope?: UnsubscribeScope;
      activeOnly?: boolean;
      limit?: number;
    } = {}
  ): UnsubscribeRecord[] {
    let allRecords: UnsubscribeRecord[] = [];
    
    this.unsubscribeRecords.forEach(userRecords => {
      allRecords.push(...userRecords);
    });

    // Apply filters
    if (filter.scope) {
      allRecords = allRecords.filter(r => r.scope === filter.scope);
    }

    if (filter.activeOnly) {
      allRecords = allRecords.filter(r => r.isActive);
    }

    // Sort by date (newest first)
    allRecords.sort((a, b) => b.unsubscribedAt.getTime() - a.unsubscribedAt.getTime());

    // Apply limit
    if (filter.limit) {
      allRecords = allRecords.slice(0, filter.limit);
    }

    return allRecords;
  }

  /**
   * Get template category
   */
  private getTemplateCategory(template: NotificationTemplate): NotificationCategory {
    const workflowTemplates = [
      NotificationTemplate.PRODUCT_SUBMITTED,
      NotificationTemplate.PRODUCT_APPROVED,
      NotificationTemplate.PRODUCT_REJECTED,
      NotificationTemplate.PRODUCT_PUBLISHED,
    ];

    const assignmentTemplates = [
      NotificationTemplate.PRODUCT_ASSIGNED,
      NotificationTemplate.REVIEWER_ASSIGNED,
    ];

    const deadlineTemplates = [
      NotificationTemplate.DEADLINE_APPROACHING,
      NotificationTemplate.DEADLINE_EXCEEDED,
    ];

    const systemTemplates = [
      NotificationTemplate.SYSTEM_MAINTENANCE,
      NotificationTemplate.USER_ROLE_CHANGED,
      NotificationTemplate.PERMISSION_CHANGED,
    ];

    if (workflowTemplates.includes(template)) {
      return NotificationCategory.WORKFLOW;
    } else if (assignmentTemplates.includes(template)) {
      return NotificationCategory.ASSIGNMENT;
    } else if (deadlineTemplates.includes(template)) {
      return NotificationCategory.DEADLINE;
    } else if (systemTemplates.includes(template)) {
      return NotificationCategory.SYSTEM;
    }

    return NotificationCategory.SYSTEM; // Default
  }

  /**
   * Update statistics
   */
  private updateStats(record: UnsubscribeRecord, action: 'unsubscribe' | 'resubscribe'): void {
    if (action === 'unsubscribe') {
      this.stats.totalUnsubscribes++;
      this.stats.activeUnsubscribes++;

      // Update scope stats
      if (!this.stats.unsubscribesByScope[record.scope]) {
        this.stats.unsubscribesByScope[record.scope] = 0;
      }
      this.stats.unsubscribesByScope[record.scope]++;

      // Update target-specific stats
      if (record.scope === UnsubscribeScope.CHANNEL && record.target) {
        const channel = record.target as NotificationChannel;
        if (!this.stats.unsubscribesByChannel[channel]) {
          this.stats.unsubscribesByChannel[channel] = 0;
        }
        this.stats.unsubscribesByChannel[channel]++;
      } else if (record.scope === UnsubscribeScope.TEMPLATE && record.target) {
        const template = record.target as NotificationTemplate;
        if (!this.stats.unsubscribesByTemplate[template]) {
          this.stats.unsubscribesByTemplate[template] = 0;
        }
        this.stats.unsubscribesByTemplate[template]++;
      } else if (record.scope === UnsubscribeScope.CATEGORY && record.target) {
        const category = record.target as NotificationCategory;
        if (!this.stats.unsubscribesByCategory[category]) {
          this.stats.unsubscribesByCategory[category] = 0;
        }
        this.stats.unsubscribesByCategory[category]++;
      }

      // Track reasons
      if (record.reason) {
        const existingReason = this.stats.commonReasons.find(r => r.reason === record.reason);
        if (existingReason) {
          existingReason.count++;
        } else {
          this.stats.commonReasons.push({ reason: record.reason, count: 1 });
        }
        
        // Sort by count
        this.stats.commonReasons.sort((a, b) => b.count - a.count);
      }
    } else if (action === 'resubscribe') {
      this.stats.resubscribes++;
      this.stats.activeUnsubscribes = Math.max(0, this.stats.activeUnsubscribes - 1);
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): UnsubscribeStatistics {
    return { ...this.stats };
  }

  /**
   * Clear statistics
   */
  clearStatistics(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Generate unsubscribe link
   */
  generateUnsubscribeLink(
    userId: string,
    email: string,
    baseUrl: string,
    scope: UnsubscribeScope = UnsubscribeScope.ALL,
    target?: NotificationChannel | NotificationTemplate | NotificationCategory
  ): string {
    const token = this.generateUnsubscribeToken(userId, email, scope, target);
    return `${baseUrl}/unsubscribe?token=${token}`;
  }

  /**
   * Generate one-click unsubscribe header (RFC 8058)
   */
  generateListUnsubscribeHeader(
    userId: string,
    email: string,
    baseUrl: string
  ): string {
    const token = this.generateUnsubscribeToken(userId, email, UnsubscribeScope.ALL);
    const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${token}`;
    const mailtoUrl = `mailto:unsubscribe@pimify.com?subject=Unsubscribe&body=token:${token}`;
    
    return `<${unsubscribeUrl}>, <${mailtoUrl}>`;
  }

  /**
   * Generate List-Unsubscribe-Post header (RFC 8058)
   */
  generateListUnsubscribePostHeader(): string {
    return 'List-Unsubscribe=One-Click';
  }

  /**
   * Export unsubscribe list
   */
  exportUnsubscribeList(format: 'csv' | 'json' = 'csv'): string {
    const records = this.getAllUnsubscribeRecords({ activeOnly: true });

    if (format === 'json') {
      return JSON.stringify(records, null, 2);
    }

    // CSV format
    const headers = ['Email', 'Scope', 'Target', 'Reason', 'Unsubscribed At'];
    const rows = records.map(record => [
      record.email,
      record.scope,
      record.target || '',
      record.reason || '',
      record.unsubscribedAt.toISOString(),
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
  }

  /**
   * Generate random token
   */
  private generateToken(): string {
    return `unsub_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Generate record ID
   */
  private generateRecordId(): string {
    return `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens(): number {
    let count = 0;
    const now = new Date();

    this.tokens.forEach((tokenData, token) => {
      if (tokenData.expiresAt < now || tokenData.used) {
        this.tokens.delete(token);
        count++;
      }
    });

    return count;
  }

  /**
   * Get token count
   */
  getTokenCount(filter: { used?: boolean; expired?: boolean } = {}): number {
    let count = 0;
    const now = new Date();

    this.tokens.forEach(tokenData => {
      if (filter.used !== undefined && tokenData.used !== filter.used) {
        return;
      }

      if (filter.expired !== undefined) {
        const isExpired = tokenData.expiresAt < now;
        if (isExpired !== filter.expired) {
          return;
        }
      }

      count++;
    });

    return count;
  }
}

/**
 * Default unsubscribe service instance
 */
export const notificationUnsubscribeService = new NotificationUnsubscribeService();

export default NotificationUnsubscribeService;
