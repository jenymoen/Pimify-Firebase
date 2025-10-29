/**
 * Unit tests for user-activity-logger.ts
 */

import { UserActivityLogger, userActivityLogger, logActivity, queryActivityLogs, clearActivityLogs } from '../user-activity-logger';
import { ActivityAction } from '../database-schema';

describe('UserActivityLogger', () => {
  let service: UserActivityLogger;

  beforeEach(() => {
    service = new UserActivityLogger();
  });

  afterEach(() => {
    service.clear();
    clearActivityLogs();
  });

  describe('log', () => {
    it('should create a log entry with an id and timestamp', () => {
      const entry = service.log({
        userId: 'user-1',
        action: ActivityAction.LOGIN,
      });

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.userId).toBe('user-1');
      expect(entry.action).toBe(ActivityAction.LOGIN);
    });

    it('should store entries per user', () => {
      service.log({ userId: 'user-1', action: ActivityAction.LOGIN });
      service.log({ userId: 'user-1', action: ActivityAction.LOGOUT });

      const result = service.query({ userId: 'user-1' });

      expect(result.success).toBe(true);
      expect(result.total).toBe(2);
      expect(result.items.length).toBe(2);
    });
  });

  describe('query', () => {
    beforeEach(() => {
      const now = Date.now();

      service.log({ userId: 'user-1', action: ActivityAction.LOGIN, description: 'login ok' });
      service.log({ userId: 'user-1', action: ActivityAction.LOGOUT, description: 'logout ok' });
      service.log({ userId: 'user-2', action: ActivityAction.LOGIN_FAILED, description: 'bad pw', metadata: { reason: 'invalid_password' } });
      service.log({ userId: 'user-2', action: ActivityAction.TWO_FACTOR_ENABLED, description: '2fa on' });
      
      // backdate one entry
      service.log({ userId: 'user-1', action: ActivityAction.PASSWORD_CHANGED, timestamp: new Date(now - 24 * 60 * 60 * 1000) });
    });

    it('should filter by userId', () => {
      const result = service.query({ userId: 'user-1' });

      expect(result.total).toBe(3);
      expect(result.items.every((e) => e.userId === 'user-1')).toBe(true);
    });

    it('should filter by actions', () => {
      const result = service.query({ actions: [ActivityAction.LOGIN_FAILED] });

      expect(result.total).toBe(1);
      expect(result.items[0].action).toBe(ActivityAction.LOGIN_FAILED);
    });

    it('should filter by date range', () => {
      const dateFrom = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
      const result = service.query({ dateFrom });

      expect(result.items.every((e) => e.timestamp >= dateFrom)).toBe(true);
    });

    it('should search in description and metadata', () => {
      const descResult = service.query({ search: 'logout' });
      expect(descResult.total).toBe(1);
      expect(descResult.items[0].action).toBe(ActivityAction.LOGOUT);

      const metaResult = service.query({ search: 'invalid_password' });
      expect(metaResult.total).toBe(1);
      expect(metaResult.items[0].action).toBe(ActivityAction.LOGIN_FAILED);
    });

    it('should paginate and sort by timestamp desc by default', () => {
      const result = service.query({ limit: 2, offset: 0 });

      expect(result.items.length).toBe(2);
      // Ensure sorted desc
      const t0 = result.items[0].timestamp.getTime();
      const t1 = result.items[1].timestamp.getTime();
      expect(t0 >= t1).toBe(true);
    });

    it('should support asc sorting', () => {
      const result = service.query({ sortOrder: 'asc' });

      const times = result.items.map((e) => e.timestamp.getTime());
      const sorted = [...times].sort((a, b) => a - b);
      expect(times).toEqual(sorted);
    });
  });
});

describe('Convenience functions (singleton)', () => {
  beforeEach(() => {
    clearActivityLogs();
  });

  it('should log and query via convenience functions', () => {
    const e1 = logActivity({ userId: 'u1', action: ActivityAction.LOGIN, description: 'ok' });
    const e2 = logActivity({ userId: 'u1', action: ActivityAction.LOGOUT, description: 'bye' });

    expect(e1.id).toBeDefined();
    expect(e2.id).toBeDefined();

    const result = queryActivityLogs({ userId: 'u1' });
    expect(result.total).toBe(2);
    const actions = result.items.map((i) => i.action);
    expect(actions).toEqual(expect.arrayContaining([ActivityAction.LOGIN, ActivityAction.LOGOUT]));
  });
});
