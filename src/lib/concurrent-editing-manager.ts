/**
 * Concurrent Editing Manager
 * 
 * This module manages concurrent editing prevention for products in the workflow system.
 * It prevents multiple users from editing the same product simultaneously and provides
 * locking mechanisms for products in Review state.
 */

import {
  WorkflowState,
  UserRole,
  ProductWorkflow,
} from '@/types/workflow';

export interface EditingSession {
  productId: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  sessionId: string;
  startedAt: string;
  lastActivity: string;
  isActive: boolean;
  lockType: 'edit' | 'review' | 'admin';
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    browserInfo?: string;
  };
}

export interface EditingLock {
  productId: string;
  lockedBy: string;
  lockedAt: string;
  lockType: 'edit' | 'review' | 'admin';
  expiresAt: string;
  reason?: string;
}

export interface ConcurrentEditingResult {
  success: boolean;
  sessionId?: string;
  error?: string;
  existingSession?: EditingSession;
  lockInfo?: EditingLock;
}

export interface SessionValidationResult {
  isValid: boolean;
  session?: EditingSession;
  error?: string;
  shouldExtend?: boolean;
}

export class ConcurrentEditingManager {
  private editingSessions: Map<string, EditingSession> = new Map();
  private editingLocks: Map<string, EditingLock> = new Map();
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // Configuration
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly LOCK_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
  private readonly ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CONCURRENT_SESSIONS_PER_USER = 5;

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * Start an editing session for a product
   */
  async startEditingSession(
    productId: string,
    userId: string,
    userEmail: string,
    userRole: UserRole,
    product: ProductWorkflow,
    metadata?: EditingSession['metadata']
  ): Promise<ConcurrentEditingResult> {
    try {
      // Check if product is locked
      const lockCheck = this.checkProductLock(productId, userId, userRole);
      if (!lockCheck.canEdit) {
        return {
          success: false,
          error: lockCheck.reason,
          existingSession: lockCheck.existingSession,
          lockInfo: lockCheck.lockInfo,
        };
      }

      // Check if user already has a session for this product
      const existingSession = this.getUserSessionForProduct(productId, userId);
      if (existingSession && existingSession.isActive) {
        // Extend existing session
        this.extendSession(existingSession.sessionId);
        return {
          success: true,
          sessionId: existingSession.sessionId,
        };
      }

      // Check user's concurrent session limit
      const userSessionCount = this.getUserActiveSessionCount(userId);
      if (userSessionCount >= this.MAX_CONCURRENT_SESSIONS_PER_USER) {
        return {
          success: false,
          error: `Maximum concurrent editing sessions (${this.MAX_CONCURRENT_SESSIONS_PER_USER}) reached`,
        };
      }

      // Create new session
      const sessionId = this.generateSessionId();
      const now = new Date().toISOString();

      const session: EditingSession = {
        productId,
        userId,
        userEmail,
        userRole,
        sessionId,
        startedAt: now,
        lastActivity: now,
        isActive: true,
        lockType: this.getLockTypeForState(product.workflowState, userRole),
        metadata,
      };

      this.editingSessions.set(sessionId, session);
      this.setupSessionTimeout(sessionId);

      // Create lock if product is in review state
      if (product.workflowState === WorkflowState.REVIEW) {
        this.createEditingLock(productId, userId, 'review', 'Product is under review');
      }

      return {
        success: true,
        sessionId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * End an editing session
   */
  async endEditingSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const session = this.editingSessions.get(sessionId);
      if (!session) {
        return false;
      }

      if (session.userId !== userId) {
        return false;
      }

      // Clean up session
      this.editingSessions.delete(sessionId);
      this.clearSessionTimeout(sessionId);

      // Remove lock if it exists
      this.removeEditingLock(session.productId, userId);

      return true;
    } catch (error) {
      console.error('Error ending editing session:', error);
      return false;
    }
  }

  /**
   * Extend an active session
   */
  async extendSession(sessionId: string): Promise<boolean> {
    try {
      const session = this.editingSessions.get(sessionId);
      if (!session || !session.isActive) {
        return false;
      }

      session.lastActivity = new Date().toISOString();
      this.setupSessionTimeout(sessionId);

      return true;
    } catch (error) {
      console.error('Error extending session:', error);
      return false;
    }
  }

  /**
   * Validate a session
   */
  async validateSession(sessionId: string, userId: string): Promise<SessionValidationResult> {
    try {
      const session = this.editingSessions.get(sessionId);
      if (!session) {
        return {
          isValid: false,
          error: 'Session not found',
        };
      }

      if (!session.isActive) {
        return {
          isValid: false,
          error: 'Session is not active',
        };
      }

      if (session.userId !== userId) {
        return {
          isValid: false,
          error: 'Session does not belong to user',
        };
      }

      // Check if session has expired
      const now = new Date();
      const lastActivity = new Date(session.lastActivity);
      const timeSinceActivity = now.getTime() - lastActivity.getTime();

      if (timeSinceActivity > this.SESSION_TIMEOUT) {
        this.endEditingSession(sessionId, userId);
        return {
          isValid: false,
          error: 'Session has expired',
        };
      }

      // Check if session should be extended
      const shouldExtend = timeSinceActivity > (this.SESSION_TIMEOUT * 0.8); // Extend when 80% of timeout has passed

      return {
        isValid: true,
        session,
        shouldExtend,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if a product can be edited by a user
   */
  canEditProduct(productId: string, userId: string, userRole: UserRole): boolean {
    const lockCheck = this.checkProductLock(productId, userId, userRole);
    return lockCheck.canEdit;
  }

  /**
   * Get active sessions for a product
   */
  getProductSessions(productId: string): EditingSession[] {
    return Array.from(this.editingSessions.values())
      .filter(session => session.productId === productId && session.isActive);
  }

  /**
   * Check if a product is currently being edited
   */
  async isProductBeingEdited(productId: string): Promise<{ userId: string; userName: string } | null> {
    const sessions = this.getProductSessions(productId);
    if (sessions.length > 0) {
      const session = sessions[0];
      return {
        userId: session.userId,
        userName: session.userEmail // Using email as name fall back
      };
    }
    return null;
  }

  /**
   * Get active sessions for a user
   */

  /**
   * Get active sessions for a user
   */
  getUserSessions(userId: string): EditingSession[] {
    return Array.from(this.editingSessions.values())
      .filter(session => session.userId === userId && session.isActive);
  }

  /**
   * Force end all sessions for a product (admin function)
   */
  async forceEndProductSessions(productId: string, adminUserId: string): Promise<number> {
    try {
      const sessions = this.getProductSessions(productId);
      let endedCount = 0;

      for (const session of sessions) {
        if (await this.endEditingSession(session.sessionId, session.userId)) {
          endedCount++;
        }
      }

      // Remove any locks
      this.removeEditingLock(productId, adminUserId);

      return endedCount;
    } catch (error) {
      console.error('Error force ending product sessions:', error);
      return 0;
    }
  }

  /**
   * Get editing statistics
   */
  getEditingStatistics(): {
    totalActiveSessions: number;
    totalActiveLocks: number;
    sessionsByUser: Record<string, number>;
    locksByType: Record<string, number>;
  } {
    const activeSessions = Array.from(this.editingSessions.values())
      .filter(session => session.isActive);

    const activeLocks = Array.from(this.editingLocks.values());

    const sessionsByUser: Record<string, number> = {};
    const locksByType: Record<string, number> = {};

    activeSessions.forEach(session => {
      sessionsByUser[session.userId] = (sessionsByUser[session.userId] || 0) + 1;
    });

    activeLocks.forEach(lock => {
      locksByType[lock.lockType] = (locksByType[lock.lockType] || 0) + 1;
    });

    return {
      totalActiveSessions: activeSessions.length,
      totalActiveLocks: activeLocks.length,
      sessionsByUser,
      locksByType,
    };
  }

  /**
   * Private helper methods
   */
  private checkProductLock(
    productId: string,
    userId: string,
    userRole: UserRole
  ): {
    canEdit: boolean;
    reason?: string;
    existingSession?: EditingSession;
    lockInfo?: EditingLock;
  } {
    // Check for existing lock
    const lock = this.editingLocks.get(productId);
    if (lock) {
      const now = new Date();
      const expiresAt = new Date(lock.expiresAt);

      if (now < expiresAt) {
        // Lock is still valid
        if (lock.lockedBy === userId) {
          return { canEdit: true };
        } else {
          // Check if user can override lock
          if (userRole === UserRole.ADMIN) {
            return { canEdit: true };
          }
          return {
            canEdit: false,
            reason: `Product is locked by another user (${lock.lockType})`,
            lockInfo: lock,
          };
        }
      } else {
        // Lock has expired, remove it
        this.editingLocks.delete(productId);
      }
    }

    // Check for existing active sessions
    const existingSessions = this.getProductSessions(productId);
    if (existingSessions.length > 0) {
      const otherUserSessions = existingSessions.filter(s => s.userId !== userId);
      if (otherUserSessions.length > 0) {
        return {
          canEdit: false,
          reason: 'Product is being edited by another user',
          existingSession: otherUserSessions[0],
        };
      }
    }

    return { canEdit: true };
  }

  private getUserSessionForProduct(productId: string, userId: string): EditingSession | undefined {
    return Array.from(this.editingSessions.values())
      .find(session =>
        session.productId === productId &&
        session.userId === userId &&
        session.isActive
      );
  }

  private getUserActiveSessionCount(userId: string): number {
    return Array.from(this.editingSessions.values())
      .filter(session => session.userId === userId && session.isActive).length;
  }

  private getLockTypeForState(workflowState: WorkflowState, userRole: UserRole): EditingSession['lockType'] {
    if (userRole === UserRole.ADMIN) {
      return 'admin';
    }
    if (workflowState === WorkflowState.REVIEW) {
      return 'review';
    }
    return 'edit';
  }

  private createEditingLock(
    productId: string,
    userId: string,
    lockType: EditingLock['lockType'],
    reason?: string
  ): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.LOCK_TIMEOUT);

    const lock: EditingLock = {
      productId,
      lockedBy: userId,
      lockedAt: now.toISOString(),
      lockType,
      expiresAt: expiresAt.toISOString(),
      reason,
    };

    this.editingLocks.set(productId, lock);
  }

  private removeEditingLock(productId: string, userId: string): void {
    const lock = this.editingLocks.get(productId);
    if (lock && lock.lockedBy === userId) {
      this.editingLocks.delete(productId);
    }
  }

  private setupSessionTimeout(sessionId: string): void {
    // Clear existing timeout
    this.clearSessionTimeout(sessionId);

    // Set new timeout
    const timeout = setTimeout(() => {
      const session = this.editingSessions.get(sessionId);
      if (session) {
        this.endEditingSession(sessionId, session.userId);
      }
    }, this.SESSION_TIMEOUT);

    this.sessionTimeouts.set(sessionId, timeout);
  }

  private clearSessionTimeout(sessionId: string): void {
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupExpiredLocks();
    }, this.ACTIVITY_CHECK_INTERVAL);
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessions: string[] = [];

    this.editingSessions.forEach((session, sessionId) => {
      if (session.isActive) {
        const lastActivity = new Date(session.lastActivity);
        const timeSinceActivity = now.getTime() - lastActivity.getTime();

        if (timeSinceActivity > this.SESSION_TIMEOUT) {
          expiredSessions.push(sessionId);
        }
      }
    });

    expiredSessions.forEach(sessionId => {
      const session = this.editingSessions.get(sessionId);
      if (session) {
        this.endEditingSession(sessionId, session.userId);
      }
    });
  }

  private cleanupExpiredLocks(): void {
    const now = new Date();
    const expiredLocks: string[] = [];

    this.editingLocks.forEach((lock, productId) => {
      const expiresAt = new Date(lock.expiresAt);
      if (now >= expiresAt) {
        expiredLocks.push(productId);
      }
    });

    expiredLocks.forEach(productId => {
      this.editingLocks.delete(productId);
    });
  }
}

// Singleton instance
let concurrentEditingManager: ConcurrentEditingManager | null = null;

export function getConcurrentEditingManager(): ConcurrentEditingManager {
  if (!concurrentEditingManager) {
    concurrentEditingManager = new ConcurrentEditingManager();
  }
  return concurrentEditingManager;
}

/**
 * Utility functions for common operations
 */
export async function startProductEditingSession(
  productId: string,
  userId: string,
  userEmail: string,
  userRole: UserRole,
  product: ProductWorkflow,
  metadata?: EditingSession['metadata']
): Promise<ConcurrentEditingResult> {
  const manager = getConcurrentEditingManager();
  return manager.startEditingSession(productId, userId, userEmail, userRole, product, metadata);
}

export async function endProductEditingSession(
  sessionId: string,
  userId: string
): Promise<boolean> {
  const manager = getConcurrentEditingManager();
  return manager.endEditingSession(sessionId, userId);
}

export async function validateEditingSession(
  sessionId: string,
  userId: string
): Promise<SessionValidationResult> {
  const manager = getConcurrentEditingManager();
  return manager.validateSession(sessionId, userId);
}

export function canUserEditProduct(
  productId: string,
  userId: string,
  userRole: UserRole
): boolean {
  const manager = getConcurrentEditingManager();
  return manager.canEditProduct(productId, userId, userRole);
}
