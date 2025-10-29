/**
 * Authentication Service
 * 
 * Handles user authentication, JWT token generation and validation,
 * login/logout functionality, and session management.
 */

import jwt from 'jsonwebtoken';
import { UserService, userService } from './user-service';
import { userActivityLogger } from './user-activity-logger';
import { ActivityAction } from './database-schema';
import { passwordService } from './password-service';
import { UserStatus, UsersTable } from './database-schema';
import { UserRole } from '@/types/workflow';

/**
 * JWT Configuration
 */
export const JWT_CONFIG = {
  // Access token expires in 15 minutes
  ACCESS_TOKEN_EXPIRY: 15 * 60, // 15 minutes in seconds
  
  // Refresh token expires in 7 days
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60, // 7 days in seconds
  
  // Maximum failed login attempts before lockout
  MAX_FAILED_ATTEMPTS: 5,
  
  // Lockout duration in milliseconds (15 minutes)
  LOCKOUT_DURATION: 15 * 60 * 1000,
  
  // Auto-unlock after 30 minutes
  AUTO_UNLOCK_DURATION: 30 * 60 * 1000,
};

/**
 * JWT Token Payload
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Login Credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  ipAddress?: string;
}

/**
 * Authentication Result
 */
export interface AuthResult {
  success: boolean;
  user?: UsersTable;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  code?: string;
}

/**
 * Token Verification Result
 */
export interface TokenVerificationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
  code?: string;
}

/**
 * Refresh Token Result
 */
export interface RefreshTokenResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  code?: string;
}

/**
 * Authentication Service Class
 */
export class AuthService {
  private readonly userService: UserService;
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  
  constructor(config?: {
    jwtSecret?: string;
    jwtRefreshSecret?: string;
    userService?: UserService;
  }) {
    this.jwtSecret = config?.jwtSecret || process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    this.jwtRefreshSecret = config?.jwtRefreshSecret || process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
    this.userService = config?.userService || userService;
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { email, password, rememberMe, ipAddress } = credentials;

      // Get user by email
      const userResult = await this.userService.getByEmail(email, false);
      if (!userResult.success || !userResult.data) {
        // Don't reveal that the user doesn't exist (security best practice)
        return {
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        };
      }

      const user = userResult.data;

      // Check if account is locked
      if (user.status === UserStatus.LOCKED) {
        if (user.locked_until && user.locked_until > new Date()) {
          return {
            success: false,
            error: 'Account is locked. Please try again later or contact support.',
            code: 'ACCOUNT_LOCKED',
          };
        } else {
          // Lock expired, auto-unlock
          await this.userService.unlock(user.id);
        }
      }

      // Check if account is active
      if (user.status === UserStatus.INACTIVE) {
        return {
          success: false,
          error: 'Account is inactive. Please contact support to activate your account.',
          code: 'ACCOUNT_INACTIVE',
        };
      }

      // Check if account is suspended
      if (user.status === UserStatus.SUSPENDED) {
        return {
          success: false,
          error: 'Account is suspended. Please contact support.',
          code: 'ACCOUNT_SUSPENDED',
        };
      }

      // Check if user has a password (not SSO-only user)
      if (!user.password_hash) {
        return {
          success: false,
          error: 'Password authentication not available for this account',
          code: 'SSO_ONLY_ACCOUNT',
        };
      }

      // Verify password
      const passwordResult = await passwordService.verifyPassword(password, user.password_hash);
      if (!passwordResult.valid) {
        // Log activity: failed login
        try {
          userActivityLogger.logLoginFailed(user.id, ipAddress || 'unknown');
        } catch {}
        // Increment failed login attempts
        await this.userService.incrementFailedLoginAttempts(user.id);
        
        return {
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        };
      }

      // Login successful - reset failed attempts and update last login
      await this.userService.resetFailedLoginAttempts(user.id);
      await this.userService.updateLastLogin(user.id, ipAddress || 'unknown');

      // Log activity: successful login
      try {
        userActivityLogger.logLogin(user.id, ipAddress || 'unknown');
      } catch {}

      // Generate JWT tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      // If remember me, extend expiry
      const tokenExpiry = rememberMe ? JWT_CONFIG.ACCESS_TOKEN_EXPIRY * 30 : JWT_CONFIG.ACCESS_TOKEN_EXPIRY;

      return {
        success: true,
        user,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Logout user (invalidate tokens)
   * Note: Token revocation will be handled by session-service.ts
   */
  async logout(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Update last active timestamp
      await this.userService.updateLastActive(userId);

      // Log activity: logout
      try {
        userActivityLogger.logLogout(userId);
      } catch {}

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      };
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenVerificationResult {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;

      // Verify token type
      if (decoded.type !== 'access') {
        return {
          valid: false,
          error: 'Invalid token type',
          code: 'INVALID_TOKEN_TYPE',
        };
      }

      return {
        valid: true,
        payload: decoded,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED',
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN',
        };
      }

      return {
        valid: false,
        error: 'Token verification failed',
        code: 'VERIFICATION_ERROR',
      };
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): TokenVerificationResult {
    try {
      const decoded = jwt.verify(token, this.jwtRefreshSecret) as JWTPayload;

      // Verify token type
      if (decoded.type !== 'refresh') {
        return {
          valid: false,
          error: 'Invalid token type',
          code: 'INVALID_TOKEN_TYPE',
        };
      }

      return {
        valid: true,
        payload: decoded,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'Refresh token has expired',
          code: 'TOKEN_EXPIRED',
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'Invalid refresh token',
          code: 'INVALID_TOKEN',
        };
      }

      return {
        valid: false,
        error: 'Refresh token verification failed',
        code: 'VERIFICATION_ERROR',
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(refreshToken: string): Promise<RefreshTokenResult> {
    try {
      // Verify refresh token
      const verification = this.verifyRefreshToken(refreshToken);
      if (!verification.valid || !verification.payload) {
        return {
          success: false,
          error: verification.error || 'Invalid refresh token',
          code: verification.code,
        };
      }

      const payload = verification.payload;

      // Get user to ensure they still exist and are active
      const userResult = await this.userService.getById(payload.userId);
      if (!userResult.success || !userResult.data) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      const user = userResult.data;

      // Check if user is still active
      if (user.status !== UserStatus.ACTIVE) {
        return {
          success: false,
          error: 'User account is not active',
          code: 'ACCOUNT_INACTIVE',
        };
      }

      // Generate new tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      const result = {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      } as const;

      // Optionally log token refresh as a security event (generic action)
      try {
        userActivityLogger.log({
          userId: user.id,
          action: ActivityAction.LOGIN, // treat as session continuation
          description: 'Access token refreshed',
          metadata: { reason: 'refresh' },
        });
      } catch {}

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token refresh failed',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }
    
    return parts[1];
  }

  /**
   * Get current user from request token
   */
  async getCurrentUser(token: string): Promise<{ user?: UsersTable; error?: string; code?: string }> {
    try {
      const verification = this.verifyAccessToken(token);
      if (!verification.valid || !verification.payload) {
        return {
          error: verification.error || 'Invalid token',
          code: verification.code,
        };
      }

      const payload = verification.payload;

      // Get user
      const userResult = await this.userService.getById(payload.userId);
      if (!userResult.success || !userResult.data) {
        return {
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      return { user: userResult.data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to get current user',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Check if user account is locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    const userResult = await this.userService.getById(userId);
    if (!userResult.success || !userResult.data) {
      return false;
    }

    const user = userResult.data;
    return user.status === UserStatus.LOCKED && 
           user.locked_until !== null && 
           user.locked_until > new Date();
  }

  /**
   * Check remaining failed login attempts before lockout
   */
  async getRemainingLoginAttempts(userId: string): Promise<number> {
    const userResult = await this.userService.getById(userId);
    if (!userResult.success || !userResult.data) {
      return 0;
    }

    const user = userResult.data;
    return Math.max(0, JWT_CONFIG.MAX_FAILED_ATTEMPTS - user.failed_login_attempts);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Generate access token
   */
  private generateAccessToken(user: UsersTable): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(user: UsersTable): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
    };

    return jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
    });
  }

  /**
   * Decode JWT token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
}

/**
 * Default authentication service instance
 */
export const authService = new AuthService();

/**
 * Convenience functions
 */

/**
 * Login with credentials
 */
export async function login(credentials: LoginCredentials): Promise<AuthResult> {
  return authService.login(credentials);
}

/**
 * Logout user
 */
export async function logout(userId: string): Promise<{ success: boolean; error?: string }> {
  return authService.logout(userId);
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenVerificationResult {
  return authService.verifyAccessToken(token);
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenVerificationResult {
  return authService.verifyRefreshToken(token);
}

/**
 * Refresh tokens
 */
export async function refreshTokens(refreshToken: string): Promise<RefreshTokenResult> {
  return authService.refreshTokens(refreshToken);
}

/**
 * Get current user from token
 */
export async function getCurrentUser(token: string): Promise<{ user?: UsersTable; error?: string; code?: string }> {
  return authService.getCurrentUser(token);
}

/**
 * Extract minimal user context from an access token for permission checks
 * Returns null if token is invalid.
 */
export function getUserContextFromToken(token: string): {
  userId: string;
  userRole: UserRole;
  userEmail: string;
} | null {
  const result = authService.verifyAccessToken(token);
  if (!result.valid || !result.payload) return null;
  const { userId, role, email } = result.payload;
  return { userId, userRole: role, userEmail: email };
}

/**
 * Build standard headers for permission middleware from an access token.
 * These headers are consumed by extractUserContext in permission-middleware.ts
 */
export function buildPermissionHeadersFromToken(token: string): Record<string, string> | null {
  const ctx = getUserContextFromToken(token);
  if (!ctx) return null;
  return {
    'x-user-id': ctx.userId,
    'x-user-role': ctx.userRole,
    'x-user-email': ctx.userEmail,
  };
}
