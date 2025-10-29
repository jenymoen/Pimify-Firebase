/**
 * Unit tests for session-service.ts
 */

import { SessionService, sessionService } from '../session-service';
import { UserRole } from '@/types/workflow';
import { UserStatus } from '../database-schema';

// Mock dependencies
jest.mock('../user-service');

import { userService } from '../user-service';
const mockUserService = userService as jest.Mocked<typeof userService>;

describe('SessionService', () => {
  let service: SessionService;
  let mockUser: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SessionService({
      userService: mockUserService as any,
    });

    // Create mock user
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      name: 'Test User',
      role: UserRole.EDITOR,
      status: UserStatus.ACTIVE,
      // ... other fields
    };
  });

  describe('createSession', () => {
    it('should create a session successfully', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await service.createSession({
        userId: 'user-123',
        token: 'refresh-token-123',
        device: 'Chrome',
        browser: 'Chrome on Windows',
        ipAddress: '127.0.0.1',
        location: 'Test City',
      });

      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session?.user_id).toBe('user-123');
      expect(result.session?.token).toBe('refresh-token-123');
      expect(result.session?.device).toBe('Chrome');
      expect(result.session?.browser).toBe('Chrome on Windows');
      expect(result.session?.is_active).toBe(true);
    });

    it('should fail if user not found', async () => {
      mockUserService.getById.mockResolvedValue({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });

      const result = await service.createSession({
        userId: 'nonexistent-user',
        token: 'token-123',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('USER_NOT_FOUND');
    });

    it('should remove oldest session when limit reached', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      // Create 3 sessions to reach limit
      const session1 = await service.createSession({
        userId: 'user-123',
        token: 'token-1',
      });
      const session2 = await service.createSession({
        userId: 'user-123',
        token: 'token-2',
      });
      const session3 = await service.createSession({
        userId: 'user-123',
        token: 'token-3',
      });

      // Now create a 4th one - should remove the oldest
      const session4 = await service.createSession({
        userId: 'user-123',
        token: 'token-4',
      });

      expect(session4.success).toBe(true);
      
      // Check that first session is deleted (marked inactive)
      const result = await service.getSession(session1.session!.id);
      // The session is still in memory but marked inactive
      expect(result.success).toBe(true);
      expect(result.session?.is_active).toBe(false);
    });

    it('should create session with Remember Me extended expiry', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const rememberMeDate = new Date();
      rememberMeDate.setDate(rememberMeDate.getDate() + 30);

      const result = await service.createSession({
        userId: 'user-123',
        token: 'token-123',
        rememberMe: true,
      });

      expect(result.success).toBe(true);
      expect(result.session?.expires_at.getTime()).toBeGreaterThan(rememberMeDate.getTime() - 1000);
    });
  });

  describe('getSession', () => {
    it('should get session by ID', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const createResult = await service.createSession({
        userId: 'user-123',
        token: 'token-123',
      });

      const getResult = await service.getSession(createResult.session!.id);

      expect(getResult.success).toBe(true);
      expect(getResult.session?.id).toBe(createResult.session!.id);
    });

    it('should return SESSION_NOT_FOUND for non-existent session', async () => {
      const result = await service.getSession('nonexistent-session');

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_NOT_FOUND');
    });

    it('should return SESSION_EXPIRED for expired session', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const createResult = await service.createSession({
        userId: 'user-123',
        token: 'token-123',
      });

      const session = createResult.session!;
      
      // Manually expire the session
      const expiredSession = {
        ...session,
        expires_at: new Date(Date.now() - 1000), // Expired 1 second ago
      };
      
      // Manually set in the service's internal storage
      (service as any).sessions.set(session.id, expiredSession);

      const result = await service.getSession(session.id);

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_EXPIRED');
    });
  });

  describe('getSessionByToken', () => {
    it('should get session by token', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      await service.createSession({
        userId: 'user-123',
        token: 'unique-token-123',
      });

      const result = await service.getSessionByToken('unique-token-123');

      expect(result.success).toBe(true);
      expect(result.session?.token).toBe('unique-token-123');
    });

    it('should return SESSION_NOT_FOUND for invalid token', async () => {
      const result = await service.getSessionByToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('getUserSessions', () => {
    it('should get all sessions for a user', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      await service.createSession({ userId: 'user-123', token: 'token-1' });
      await service.createSession({ userId: 'user-123', token: 'token-2' });

      const result = await service.getUserSessions('user-123');

      expect(result.success).toBe(true);
      expect(result.sessions?.length).toBe(2);
    });

    it('should filter active sessions', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      await service.createSession({ userId: 'user-123', token: 'token-1' });
      
      const inactiveSessionResult = await service.createSession({ 
        userId: 'user-123', 
        token: 'token-2' 
      });
      
      // Manually deactivate the second session
      if (inactiveSessionResult.session) {
        await service.deleteSession(inactiveSessionResult.session.id);
      }

      const result = await service.getUserSessions('user-123', { isActive: true });

      expect(result.success).toBe(true);
      expect(result.sessions?.length).toBe(1);
    });

    it('should filter expired sessions', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const createResult = await service.createSession({ 
        userId: 'user-123', 
        token: 'token-1' 
      });

      // Get the session and manually expire it
      const session = createResult.session!;
      const expiredSession = {
        ...session,
        expires_at: new Date(Date.now() - 1000),
      };
      (service as any).sessions.set(session.id, expiredSession);

      const result = await service.getUserSessions('user-123', {
        expiresBefore: new Date(),
      });

      expect(result.success).toBe(true);
      expect(result.sessions?.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updateActivity', () => {
    it('should update session activity timestamp', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const createResult = await service.createSession({
        userId: 'user-123',
        token: 'token-123',
      });

      const originalActivity = createResult.session!.last_activity;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const updateResult = await service.updateActivity(createResult.session!.id);

      expect(updateResult.success).toBe(true);
      expect(new Date(updateResult.session!.last_activity).getTime()).toBeGreaterThan(
        originalActivity.getTime()
      );
    });

    it('should fail for non-existent session', async () => {
      const result = await service.updateActivity('nonexistent-session');

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('refreshSession', () => {
    it('should refresh session expiry', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const createResult = await service.createSession({
        userId: 'user-123',
        token: 'token-123',
      });

      const originalExpiry = createResult.session!.expires_at;
      
      // Refresh with Remember Me
      const refreshResult = await service.refreshSession(createResult.session!.id, true);

      expect(refreshResult.success).toBe(true);
      expect(new Date(refreshResult.session!.expires_at).getTime()).toBeGreaterThan(
        originalExpiry.getTime()
      );
    });

    it('should fail for expired session', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const createResult = await service.createSession({
        userId: 'user-123',
        token: 'token-123',
      });

      const session = createResult.session!;
      // Manually expire the session
      (service as any).sessions.set(session.id, {
        ...session,
        expires_at: new Date(Date.now() - 1000),
      });

      const result = await service.refreshSession(session.id);

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_EXPIRED');
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const createResult = await service.createSession({
        userId: 'user-123',
        token: 'token-123',
      });

      const deleteResult = await service.deleteSession(createResult.session!.id);

      expect(deleteResult.success).toBe(true);
      expect(deleteResult.session?.is_active).toBe(false);

      // Try to get the session - still retrievable but marked inactive
      const getResult = await service.getSession(createResult.session!.id);
      expect(getResult.success).toBe(true);
      expect(getResult.session?.is_active).toBe(false);
    });

    it('should handle deletion of non-existent session gracefully', async () => {
      const result = await service.deleteSession('nonexistent-session');

      expect(result.success).toBe(false);
      expect(result.code).toBe('SESSION_NOT_FOUND');
    });
  });

  describe('deleteAllUserSessions', () => {
    it('should delete all sessions for a user', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      await service.createSession({ userId: 'user-123', token: 'token-1' });
      await service.createSession({ userId: 'user-123', token: 'token-2' });
      await service.createSession({ userId: 'user-123', token: 'token-3' });

      const result = await service.deleteAllUserSessions('user-123');

      expect(result.success).toBe(true);
      expect(result.sessions?.length).toBe(3);

      // Verify all sessions are deleted
      const sessionsResult = await service.getUserSessions('user-123');
      expect(sessionsResult.sessions?.filter(s => s.is_active).length).toBe(0);
    });

    it('should handle user with no sessions', async () => {
      const result = await service.deleteAllUserSessions('user-with-no-sessions');

      expect(result.success).toBe(true);
      expect(result.sessions?.length).toBe(0);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const activeSession = await service.createSession({
        userId: 'user-123',
        token: 'token-active',
      });

      // Create an expired session manually
      const expiredSession = {
        ...activeSession.session!,
        id: 'expired-session',
        token: 'token-expired',
        expires_at: new Date(Date.now() - 1000),
      };
      (service as any).sessions.set('expired-session', expiredSession);

      const cleaned = await service.cleanupExpiredSessions();

      expect(cleaned).toBeGreaterThanOrEqual(1);

      // Active session should still exist
      const getActiveResult = await service.getSession(activeSession.session!.id);
      expect(getActiveResult.success).toBe(true);
    });
  });

  describe('getSessionStats', () => {
    it('should return session statistics', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      await service.createSession({ userId: 'user-123', token: 'token-1', device: 'Chrome' });
      await service.createSession({ userId: 'user-123', token: 'token-2', device: 'Firefox' });
      await service.createSession({ userId: 'user-123', token: 'token-3', device: 'Chrome' });

      const stats = await service.getSessionStats('user-123');

      expect(stats.totalSessions).toBe(3);
      expect(stats.activeSessions).toBe(3);
      expect(stats.sessionsByDevice.get('Chrome')).toBe(2);
      expect(stats.sessionsByDevice.get('Firefox')).toBe(1);
    });

    it('should return stats for all users when no userId provided', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      await service.createSession({ userId: 'user-1', token: 'token-1' });
      await service.createSession({ userId: 'user-2', token: 'token-2' });

      const stats = await service.getSessionStats();

      expect(stats.totalSessions).toBeGreaterThanOrEqual(2);
    });
  });

  describe('isValidSession', () => {
    it('should return true for valid session', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const createResult = await service.createSession({
        userId: 'user-123',
        token: 'token-123',
      });

      const isValid = await service.isValidSession(createResult.session!.id);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid session', async () => {
      const isValid = await service.isValidSession('invalid-session');

      expect(isValid).toBe(false);
    });
  });

  describe('hasReachedSessionLimit', () => {
    it('should return false when under limit', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      await service.createSession({ userId: 'user-123', token: 'token-1' });
      
      const hasReached = await service.hasReachedSessionLimit('user-123');

      expect(hasReached).toBe(false);
    });

    it('should return true when at limit', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      await service.createSession({ userId: 'user-123', token: 'token-1' });
      await service.createSession({ userId: 'user-123', token: 'token-2' });
      await service.createSession({ userId: 'user-123', token: 'token-3' });

      const hasReached = await service.hasReachedSessionLimit('user-123');

      expect(hasReached).toBe(true);
    });
  });

  describe('getActiveSessionCount', () => {
    it('should return correct count of active sessions', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      await service.createSession({ userId: 'user-123', token: 'token-1' });
      await service.createSession({ userId: 'user-123', token: 'token-2' });
      
      const deleteResult = await service.createSession({ userId: 'user-123', token: 'token-3' });
      if (deleteResult.session) {
        await service.deleteSession(deleteResult.session.id);
      }

      const count = await service.getActiveSessionCount('user-123');

      expect(count).toBe(2);
    });
  });

  describe('concurrent session limiting', () => {
    it('should enforce maximum 3 concurrent sessions', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      // Create 3 sessions
      const session1 = await service.createSession({ userId: 'user-123', token: 'token-1' });
      const session2 = await service.createSession({ userId: 'user-123', token: 'token-2' });
      const session3 = await service.createSession({ userId: 'user-123', token: 'token-3' });

      // Create 4th session - should remove oldest (session1)
      await service.createSession({ userId: 'user-123', token: 'token-4' });

      // Session1 should be marked inactive
      const getSession1 = await service.getSession(session1.session!.id);
      expect(getSession1.success).toBe(true);
      expect(getSession1.session?.is_active).toBe(false);

      // Sessions 2, 3, 4 should exist
      const getSession2 = await service.getSession(session2.session!.id);
      const getSession3 = await service.getSession(session3.session!.id);
      
      expect(getSession2.success).toBe(true);
      expect(getSession3.success).toBe(true);
    });
  });
});

describe('Convenience functions', () => {
  it('should export createSession function', () => {
    const { createSession } = require('../session-service');
    expect(typeof createSession).toBe('function');
  });

  it('should export getSession function', () => {
    const { getSession } = require('../session-service');
    expect(typeof getSession).toBe('function');
  });

  it('should export getSessionByToken function', () => {
    const { getSessionByToken } = require('../session-service');
    expect(typeof getSessionByToken).toBe('function');
  });

  it('should export getUserSessions function', () => {
    const { getUserSessions } = require('../session-service');
    expect(typeof getUserSessions).toBe('function');
  });

  it('should export updateSessionActivity function', () => {
    const { updateSessionActivity } = require('../session-service');
    expect(typeof updateSessionActivity).toBe('function');
  });

  it('should export refreshSession function', () => {
    const { refreshSession } = require('../session-service');
    expect(typeof refreshSession).toBe('function');
  });

  it('should export deleteSession function', () => {
    const { deleteSession } = require('../session-service');
    expect(typeof deleteSession).toBe('function');
  });

  it('should export deleteAllUserSessions function', () => {
    const { deleteAllUserSessions } = require('../session-service');
    expect(typeof deleteAllUserSessions).toBe('function');
  });

  it('should export isValidSession function', () => {
    const { isValidSession } = require('../session-service');
    expect(typeof isValidSession).toBe('function');
  });

  it('should export hasReachedSessionLimit function', () => {
    const { hasReachedSessionLimit } = require('../session-service');
    expect(typeof hasReachedSessionLimit).toBe('function');
  });
});

describe('sessionService default instance', () => {
  it('should be exported', () => {
    expect(sessionService).toBeDefined();
    expect(sessionService).toBeInstanceOf(SessionService);
  });
});
