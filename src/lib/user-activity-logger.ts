/**
 * User Activity Logger
 *
 * Provides comprehensive activity tracking with structured events and
 * query/filter capabilities. Intended to be wired into auth/session/2FA flows.
 *
 * NOTE: This implementation uses an in-memory store for demonstration.
 * Replace with a persistent datastore for production.
 */

import { ActivityAction } from './database-schema';

/**
 * Activity log entry shape
 */
export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: ActivityAction | string;
  timestamp: Date;
  ipAddress?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  description?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Filters for querying activity logs
 */
export interface ActivityLogQuery {
  userId?: string;
  actions?: (ActivityAction | string)[];
  dateFrom?: Date;
  dateTo?: Date;
  resourceType?: string;
  resourceId?: string;
  search?: string; // searches description and metadata JSON string
  limit?: number; // default 100
  offset?: number; // default 0
  sortOrder?: 'asc' | 'desc'; // by timestamp, default desc
}

/**
 * Result set for activity log queries
 */
export interface ActivityLogQueryResult {
  success: boolean;
  total: number;
  items: ActivityLogEntry[];
  error?: string;
  code?: string;
}

/**
 * Activity Logger Service
 */
export class UserActivityLogger {
  private entries: Map<string, ActivityLogEntry> = new Map();
  private byUser: Map<string, string[]> = new Map(); // userId -> entryIds (append-only order)

  /**
   * Log a new activity entry
   */
  log(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'> & { timestamp?: Date }): ActivityLogEntry {
    const id = this.generateId();
    const item: ActivityLogEntry = {
      id,
      timestamp: entry.timestamp ?? new Date(),
      ...entry,
    };

    this.entries.set(id, item);

    if (!this.byUser.has(item.userId)) {
      this.byUser.set(item.userId, []);
    }
    this.byUser.get(item.userId)!.push(id);

    return item;
  }

  /**
   * Query activity logs with filters, pagination, and sorting
   */
  query(filters: ActivityLogQuery = {}): ActivityLogQueryResult {
    try {
      const {
        userId,
        actions,
        dateFrom,
        dateTo,
        resourceType,
        resourceId,
        search,
        limit = 100,
        offset = 0,
        sortOrder = 'desc',
      } = filters;

      let items: ActivityLogEntry[];

      if (userId && this.byUser.has(userId)) {
        // Fast path: restrict to user's entries
        items = this.byUser
          .get(userId)!
          .map((id) => this.entries.get(id)!)
          .filter(Boolean);
      } else {
        // Full scan (acceptable for in-memory demo)
        items = Array.from(this.entries.values());
      }

      // Apply filters
      if (actions && actions.length > 0) {
        const set = new Set(actions.map(String));
        items = items.filter((e) => set.has(String(e.action)));
      }
      if (dateFrom) {
        items = items.filter((e) => e.timestamp >= dateFrom);
      }
      if (dateTo) {
        items = items.filter((e) => e.timestamp <= dateTo);
      }
      if (resourceType) {
        items = items.filter((e) => e.resourceType === resourceType);
      }
      if (resourceId) {
        items = items.filter((e) => e.resourceId === resourceId);
      }
      if (search && search.trim().length > 0) {
        const needle = search.toLowerCase();
        items = items.filter((e) => {
          const desc = (e.description || '').toLowerCase();
          const meta = e.metadata ? JSON.stringify(e.metadata).toLowerCase() : '';
          return desc.includes(needle) || meta.includes(needle);
        });
      }

      // Sort by timestamp
      items.sort((a, b) => {
        const aT = a.timestamp.getTime();
        const bT = b.timestamp.getTime();
        return sortOrder === 'asc' ? aT - bT : bT - aT;
      });

      const total = items.length;
      const slice = items.slice(offset, offset + limit);

      return { success: true, total, items: slice };
    } catch (error) {
      return {
        success: false,
        total: 0,
        items: [],
        error: error instanceof Error ? error.message : 'Failed to query activity logs',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Convenience handlers for common security events
   */
  logLogin(userId: string, ipAddress?: string, metadata?: Record<string, any>) {
    return this.log({ userId, action: ActivityAction.LOGIN, ipAddress, metadata: metadata || null });
  }

  logLogout(userId: string, ipAddress?: string, metadata?: Record<string, any>) {
    return this.log({ userId, action: ActivityAction.LOGOUT, ipAddress, metadata: metadata || null });
  }

  logLoginFailed(userId: string, ipAddress?: string, metadata?: Record<string, any>) {
    return this.log({ userId, action: ActivityAction.LOGIN_FAILED, ipAddress, metadata: metadata || null });
  }

  logPasswordChanged(userId: string, metadata?: Record<string, any>) {
    return this.log({ userId, action: ActivityAction.PASSWORD_CHANGED, metadata: metadata || null });
  }

  logPasswordResetRequested(userId: string, metadata?: Record<string, any>) {
    return this.log({ userId, action: ActivityAction.PASSWORD_RESET_REQUESTED, metadata: metadata || null });
  }

  logPasswordResetCompleted(userId: string, metadata?: Record<string, any>) {
    return this.log({ userId, action: ActivityAction.PASSWORD_RESET_COMPLETED, metadata: metadata || null });
  }

  logTwoFactorEnabled(userId: string, metadata?: Record<string, any>) {
    return this.log({ userId, action: ActivityAction.TWO_FACTOR_ENABLED, metadata: metadata || null });
  }

  logTwoFactorDisabled(userId: string, metadata?: Record<string, any>) {
    return this.log({ userId, action: ActivityAction.TWO_FACTOR_DISABLED, metadata: metadata || null });
  }

  logTwoFactorVerified(userId: string, metadata?: Record<string, any>) {
    return this.log({ userId, action: ActivityAction.TWO_FACTOR_VERIFIED, metadata: metadata || null });
  }

  logTwoFactorFailed(userId: string, metadata?: Record<string, any>) {
    return this.log({ userId, action: ActivityAction.TWO_FACTOR_FAILED, metadata: metadata || null });
  }

  /**
   * Clear all entries (useful for tests)
   */
  clear(): void {
    this.entries.clear();
    this.byUser.clear();
  }

  private generateId(): string {
    return `act_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

// Default singleton instance
export const userActivityLogger = new UserActivityLogger();

// Convenience exports
export function logActivity(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'> & { timestamp?: Date }) {
  return userActivityLogger.log(entry);
}

export function queryActivityLogs(filters?: ActivityLogQuery): ActivityLogQueryResult {
  return userActivityLogger.query(filters);
}

export function clearActivityLogs(): void {
  userActivityLogger.clear();
}
