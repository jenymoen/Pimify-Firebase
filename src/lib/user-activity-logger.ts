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
import { firestoreActivityStore } from './activity-repository';

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

  /**
   * Log a new activity entry
   */
  async log(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'> & { timestamp?: Date }): Promise<ActivityLogEntry> {
    const id = this.generateId();
    const item: ActivityLogEntry = {
      id,
      timestamp: entry.timestamp ?? new Date(),
      ...entry,
    };

    await firestoreActivityStore.save(item);

    return item;
  }

  /**
   * Query activity logs with filters, pagination, and sorting
   */
  async query(filters: ActivityLogQuery = {}): Promise<ActivityLogQueryResult> {
    try {
      const result = await firestoreActivityStore.query(filters);
      return {
        success: true,
        total: result.total,
        items: result.items
      };
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
  async clear(): Promise<void> {
    await firestoreActivityStore.clear();
  }

  private generateId(): string {
    return `act_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

// Default singleton instance
export const userActivityLogger = new UserActivityLogger();

// Convenience exports
export async function logActivity(entry: Omit<ActivityLogEntry, 'id' | 'timestamp'> & { timestamp?: Date }) {
  return userActivityLogger.log(entry);
}

export async function queryActivityLogs(filters?: ActivityLogQuery): Promise<ActivityLogQueryResult> {
  return userActivityLogger.query(filters);
}

export async function clearActivityLogs(): Promise<void> {
  await userActivityLogger.clear();
}
