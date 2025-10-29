/**
 * Session Service
 * 
 * Handles user session management, tracking, expiration, and cleanup.
 * Manages concurrent sessions, inactivity timeout, and "Remember Me" functionality.
 */

import { UserSessionsTable, SESSION_SCHEMA_CONSTRAINTS, isSessionExpired, isSessionActive } from './database-schema';
import { UserService, userService } from './user-service';

/**
 * Session Creation Input
 */
export interface CreateSessionInput {
  userId: string;
  token: string; // JWT refresh token or session ID
  device?: string;
  browser?: string;
  ipAddress?: string;
  location?: string;
  rememberMe?: boolean; // If true, extends session to 30 days
}

/**
 * Session Query Filters
 */
export interface SessionQueryFilters {
  userId?: string;
  isActive?: boolean;
  expiresBefore?: Date;
}

/**
 * Session Result
 */
export interface SessionResult {
  success: boolean;
  session?: UserSessionsTable;
  sessions?: UserSessionsTable[];
  error?: string;
  code?: string;
}

/**
 * Session Statistics
 */
export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  sessionsByDevice: Map<string, number>;
}

/**
 * Session Service Class
 */
export class SessionService {
  private readonly userService: UserService;
  // In-memory store (replace with database in production)
  private sessions: Map<string, UserSessionsTable> = new Map();
  private sessionsByUser: Map<string, Set<string>> = new Map(); // userId -> sessionIds

  constructor(config?: {
    userService?: UserService;
  }) {
    this.userService = config?.userService || userService;

    // Start background cleanup task
    this.startBackgroundCleanup();
  }

  /**
   * Create a new session
   */
  async createSession(input: CreateSessionInput): Promise<SessionResult> {
    try {
      const { userId, token, device, browser, ipAddress, location, rememberMe } = input;

      // Check if user exists
      const userResult = await this.userService.getById(userId);
      if (!userResult.success || !userResult.data) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      // Check for concurrent session limit
      const activeSessions = await this.getActiveSessions(userId);
      if (activeSessions.length >= SESSION_SCHEMA_CONSTRAINTS.MAX_CONCURRENT_SESSIONS) {
        // Remove oldest session
        const oldestSession = activeSessions.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[0];
        await this.deleteSession(oldestSession.id);
      }

      // Calculate expiry time
      const now = new Date();
      const expiryHours = rememberMe 
        ? SESSION_SCHEMA_CONSTRAINTS.REMEMBER_ME_DAYS * 24 
        : SESSION_SCHEMA_CONSTRAINTS.SESSION_TIMEOUT_HOURS;
      
      const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

      // Create session
      const sessionId = this.generateSessionId();
      const session: UserSessionsTable = {
        id: sessionId,
        user_id: userId,
        token,
        device: device || null,
        browser: browser || null,
        ip_address: ipAddress || null,
        location: location || null,
        created_at: now,
        last_activity: now,
        expires_at: expiresAt,
        is_active: true,
      };

      // Store session
      this.sessions.set(sessionId, session);
      
      // Update user's session list
      if (!this.sessionsByUser.has(userId)) {
        this.sessionsByUser.set(userId, new Set());
      }
      this.sessionsByUser.get(userId)!.add(sessionId);

      return {
        success: true,
        session,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionResult> {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        };
      }

      // Check if expired
      if (isSessionExpired(session)) {
        return {
          success: false,
          error: 'Session has expired',
          code: 'SESSION_EXPIRED',
        };
      }

      return {
        success: true,
        session,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get session by token
   */
  async getSessionByToken(token: string): Promise<SessionResult> {
    try {
      for (const session of this.sessions.values()) {
        if (session.token === token) {
          // Check if expired
          if (isSessionExpired(session)) {
            return {
              success: false,
              error: 'Session has expired',
              code: 'SESSION_EXPIRED',
            };
          }

          return {
            success: true,
            session,
          };
        }
      }

      return {
        success: false,
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get session',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string, filters?: SessionQueryFilters): Promise<SessionResult> {
    try {
      const userSessionIds = this.sessionsByUser.get(userId);
      if (!userSessionIds) {
        return {
          success: true,
          sessions: [],
        };
      }

      const sessions = Array.from(userSessionIds)
        .map(id => this.sessions.get(id))
        .filter((s): s is UserSessionsTable => s !== undefined);

      // Apply filters
      let filteredSessions = sessions;
      
      if (filters?.isActive !== undefined) {
        filteredSessions = filteredSessions.filter(s => 
          isSessionActive(s) === filters.isActive
        );
      }

      if (filters?.expiresBefore) {
        filteredSessions = filteredSessions.filter(s => 
          new Date(s.expires_at) < filters.expiresBefore!
        );
      }

      return {
        success: true,
        sessions: filteredSessions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user sessions',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get active sessions for a user
   */
  async getActiveSessions(userId: string): Promise<UserSessionsTable[]> {
    const result = await this.getUserSessions(userId, { isActive: true });
    return result.sessions || [];
  }

  /**
   * Update session activity
   */
  async updateActivity(sessionId: string): Promise<SessionResult> {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        };
      }

      // Check if expired
      if (isSessionExpired(session)) {
        return {
          success: false,
          error: 'Session has expired',
          code: 'SESSION_EXPIRED',
        };
      }

      // Update last activity
      const updatedSession: UserSessionsTable = {
        ...session,
        last_activity: new Date(),
      };

      this.sessions.set(sessionId, updatedSession);

      return {
        success: true,
        session: updatedSession,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update activity',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Refresh session expiry
   */
  async refreshSession(sessionId: string, rememberMe?: boolean): Promise<SessionResult> {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        };
      }

      // Check if expired
      if (isSessionExpired(session)) {
        return {
          success: false,
          error: 'Session has expired',
          code: 'SESSION_EXPIRED',
        };
      }

      // Calculate new expiry
      const now = new Date();
      const expiryHours = rememberMe 
        ? SESSION_SCHEMA_CONSTRAINTS.REMEMBER_ME_DAYS * 24 
        : SESSION_SCHEMA_CONSTRAINTS.SESSION_TIMEOUT_HOURS;
      
      const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

      // Update session
      const updatedSession: UserSessionsTable = {
        ...session,
        last_activity: now,
        expires_at: expiresAt,
      };

      this.sessions.set(sessionId, updatedSession);

      return {
        success: true,
        session: updatedSession,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh session',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Delete/invalidate a session
   */
  async deleteSession(sessionId: string): Promise<SessionResult> {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        return {
          success: false,
          error: 'Session not found',
          code: 'SESSION_NOT_FOUND',
        };
      }

      // Mark as inactive and remove from user's session list
      const updatedSession: UserSessionsTable = {
        ...session,
        is_active: false,
      };

      this.sessions.set(sessionId, updatedSession);
      this.sessionsByUser.get(session.user_id)?.delete(sessionId);

      return {
        success: true,
        session: updatedSession,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete session',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Delete all sessions for a user (logout from all devices)
   */
  async deleteAllUserSessions(userId: string): Promise<SessionResult> {
    try {
      const result = await this.getUserSessions(userId);
      const sessions = result.sessions || [];

      const deletedSessions: UserSessionsTable[] = [];

      for (const session of sessions) {
        const deleteResult = await this.deleteSession(session.id);
        if (deleteResult.success && deleteResult.session) {
          deletedSessions.push(deleteResult.session);
        }
      }

      return {
        success: true,
        sessions: deletedSessions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete all sessions',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (isSessionExpired(session)) {
        await this.deleteSession(sessionId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(userId?: string): Promise<SessionStats> {
    let sessions: UserSessionsTable[];

    if (userId) {
      const result = await this.getUserSessions(userId);
      sessions = result.sessions || [];
    } else {
      sessions = Array.from(this.sessions.values());
    }

    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => isSessionActive(s)).length;
    const expiredSessions = sessions.filter(s => isSessionExpired(s)).length;

    // Count by device
    const sessionsByDevice = new Map<string, number>();
    for (const session of sessions) {
      const device = session.device || 'Unknown';
      sessionsByDevice.set(device, (sessionsByDevice.get(device) || 0) + 1);
    }

    return {
      totalSessions,
      activeSessions,
      expiredSessions,
      sessionsByDevice,
    };
  }

  /**
   * Check if session is valid and active
   */
  async isValidSession(sessionId: string): Promise<boolean> {
    const result = await this.getSession(sessionId);
    return result.success && result.session !== undefined;
  }

  /**
   * Check if user has reached concurrent session limit
   */
  async hasReachedSessionLimit(userId: string): Promise<boolean> {
    const activeSessions = await this.getActiveSessions(userId);
    return activeSessions.length >= SESSION_SCHEMA_CONSTRAINTS.MAX_CONCURRENT_SESSIONS;
  }

  /**
   * Get number of active sessions for a user
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    const activeSessions = await this.getActiveSessions(userId);
    return activeSessions.length;
  }

  /**
   * Start background cleanup task
   */
  private startBackgroundCleanup(): void {
    // Clean up expired sessions every 5 minutes
    setInterval(() => {
      this.cleanupExpiredSessions().catch(error => {
        console.error('Background session cleanup failed:', error);
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Default session service instance
 */
export const sessionService = new SessionService();

/**
 * Convenience functions
 */

/**
 * Create a session
 */
export async function createSession(input: CreateSessionInput): Promise<SessionResult> {
  return sessionService.createSession(input);
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<SessionResult> {
  return sessionService.getSession(sessionId);
}

/**
 * Get session by token
 */
export async function getSessionByToken(token: string): Promise<SessionResult> {
  return sessionService.getSessionByToken(token);
}

/**
 * Get user sessions
 */
export async function getUserSessions(userId: string, filters?: SessionQueryFilters): Promise<SessionResult> {
  return sessionService.getUserSessions(userId, filters);
}

/**
 * Update session activity
 */
export async function updateSessionActivity(sessionId: string): Promise<SessionResult> {
  return sessionService.updateActivity(sessionId);
}

/**
 * Refresh session
 */
export async function refreshSession(sessionId: string, rememberMe?: boolean): Promise<SessionResult> {
  return sessionService.refreshSession(sessionId, rememberMe);
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<SessionResult> {
  return sessionService.deleteSession(sessionId);
}

/**
 * Delete all user sessions
 */
export async function deleteAllUserSessions(userId: string): Promise<SessionResult> {
  return sessionService.deleteAllUserSessions(userId);
}

/**
 * Check if session is valid
 */
export async function isValidSession(sessionId: string): Promise<boolean> {
  return sessionService.isValidSession(sessionId);
}

/**
 * Check if user has reached session limit
 */
export async function hasReachedSessionLimit(userId: string): Promise<boolean> {
  return sessionService.hasReachedSessionLimit(userId);
}
