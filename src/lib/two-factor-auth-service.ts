/**
 * Two-Factor Authentication Service
 * 
 * Handles TOTP-based 2FA with QR code generation and backup codes.
 * Supports enable/disable, verification, and backup code management.
 */

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { UserService, userService } from './user-service';
import { userActivityLogger } from './user-activity-logger';
import { ActivityAction } from './database-schema';
import { UserRole } from '@/types/workflow';

/**
 * 2FA Configuration
 */
export const TWO_FA_CONFIG = {
  // Backup codes count
  BACKUP_CODES_COUNT: 10,

  // TOTP settings
  TOTP_SECRET_LENGTH: 32,
  TOTP_WINDOW: 2, // Allow 2 time steps before and after

  // Issuer name for authenticator apps
  ISSUER: 'Pimify',
};

/**
 * Enable 2FA Result
 */
export interface Enable2FAResult {
  success: boolean;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
  error?: string;
  code?: string;
}

/**
 * Verify 2FA Result
 */
export interface Verify2FAResult {
  success: boolean;
  backupCodesUsed?: boolean;
  error?: string;
  code?: string;
}

/**
 * Disable 2FA Result
 */
export interface Disable2FAResult {
  success: boolean;
  error?: string;
  code?: string;
}

/**
 * 2FA Status Result
 */
export interface TwoFactorStatusResult {
  enabled: boolean;
  backupCodesRemaining: number;
}

/**
 * Two-Factor Authentication Service Class
 */
export class TwoFactorAuthService {
  private readonly userService: UserService;
  // In-memory store for backup codes (replace with database in production)
  private backupCodes: Map<string, Set<string>> = new Map(); // userId -> Set of codes

  constructor(config?: {
    userService?: UserService;
  }) {
    this.userService = config?.userService || userService;
  }

  /**
   * Generate TOTP secret and QR code for 2FA setup
   */
  async enable2FA(
    userId: string,
    userEmail: string,
    userLabel: string
  ): Promise<Enable2FAResult> {
    try {
      // Check if user exists
      const userResult = await this.userService.getById(userId);
      if (!userResult.success || !userResult.data) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${TWO_FA_CONFIG.ISSUER} (${userEmail})`,
        length: TWO_FA_CONFIG.TOTP_SECRET_LENGTH,
        issuer: TWO_FA_CONFIG.ISSUER,
      });

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store backup codes
      this.backupCodes.set(userId, new Set(backupCodes));

      // Log activity: 2FA enabled (pending verification)
      try {
        userActivityLogger.logTwoFactorEnabled(userId, { method: 'TOTP' });
      } catch {}

      return {
        success: true,
        secret: secret.base32!,
        qrCode,
        backupCodes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable 2FA',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Verify TOTP code
   */
  async verifyCode(
    userId: string,
    code: string,
    secret: string
  ): Promise<Verify2FAResult> {
    try {
      // First, try to verify as a backup code
      const backupCodeResult = await this.verifyBackupCode(userId, code);
      if (backupCodeResult.success) {
        return {
          success: true,
          backupCodesUsed: true,
        };
      }

      // Verify TOTP code
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: TWO_FA_CONFIG.TOTP_WINDOW,
      });

      if (!verified) {
        try {
          userActivityLogger.logTwoFactorFailed(userId, { reason: 'invalid_totp' });
        } catch {}
        return {
          success: false,
          error: 'Invalid verification code',
          code: 'INVALID_CODE',
        };
      }

      try {
        userActivityLogger.logTwoFactorVerified(userId, { method: 'TOTP' });
      } catch {}

      return {
        success: true,
        backupCodesUsed: false,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Code verification failed',
        code: 'VERIFICATION_ERROR',
      };
    }
  }

  /**
   * Verify code during login
   */
  async verifyCodeForLogin(
    userId: string,
    code: string,
    secret: string
  ): Promise<Verify2FAResult> {
    const result = await this.verifyCode(userId, code, secret);
    
    // If backup code was used, consume it
    if (result.success && result.backupCodesUsed) {
      await this.consumeBackupCode(userId, code);
    }

    return result;
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const codes = this.generateBackupCodes();
    this.backupCodes.set(userId, new Set(codes));
    return codes;
  }

  /**
   * Get remaining backup codes count
   */
  async getBackupCodesCount(userId: string): Promise<number> {
    const codes = this.backupCodes.get(userId);
    return codes ? codes.size : 0;
  }

  /**
   * Verify if 2FA should be enforced for a role
   */
  shouldEnforce2FA(role: UserRole): boolean {
    // Enforce 2FA for admins by default
    // This can be customized per role
    const enforcedRoles = [UserRole.ADMIN];
    return enforcedRoles.includes(role);
  }

  /**
   * Check if 2FA is required but not enabled
   */
  async is2FARequired(userId: string): Promise<boolean> {
    try {
      const userResult = await this.userService.getById(userId);
      if (!userResult.success || !userResult.data) {
        return false;
      }

      const user = userResult.data;
      
      // Check if 2FA is required for the role
      const required = this.shouldEnforce2FA(user.role);
      
      // Check if it's enabled
      const enabled = user.two_factor_enabled;

      return required && !enabled;
    } catch {
      return false;
    }
  }

  /**
   * Get 2FA status
   */
  async get2FAStatus(userId: string): Promise<TwoFactorStatusResult> {
    try {
      const userResult = await this.userService.getById(userId);
      if (!userResult.success || !userResult.data) {
        return {
          enabled: false,
          backupCodesRemaining: 0,
        };
      }

      const user = userResult.data;
      const backupCodesRemaining = await this.getBackupCodesCount(userId);

      return {
        enabled: user.two_factor_enabled || false,
        backupCodesRemaining,
      };
    } catch {
      return {
        enabled: false,
        backupCodesRemaining: 0,
      };
    }
  }

  /**
   * Generate TOTP code (for testing)
   */
  generateTOTPCode(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32',
    });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number = TWO_FA_CONFIG.BACKUP_CODES_COUNT): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  /**
   * Verify a backup code
   */
  private async verifyBackupCode(userId: string, code: string): Promise<{ success: boolean }> {
    const codes = this.backupCodes.get(userId);
    
    if (!codes || !codes.has(code)) {
      return { success: false };
    }

    return { success: true };
  }

  /**
   * Consume a backup code (remove it after use)
   */
  private async consumeBackupCode(userId: string, code: string): Promise<void> {
    const codes = this.backupCodes.get(userId);
    
    if (codes) {
      codes.delete(code);
      
      // If no codes left, remove the entry
      if (codes.size === 0) {
        this.backupCodes.delete(userId);
      }
    }
  }
}

/**
 * Default 2FA service instance
 */
export const twoFactorAuthService = new TwoFactorAuthService();

/**
 * Convenience functions
 */

/**
 * Enable 2FA for a user
 */
export async function enable2FA(
  userId: string,
  userEmail: string,
  userLabel: string
): Promise<Enable2FAResult> {
  return twoFactorAuthService.enable2FA(userId, userEmail, userLabel);
}

/**
 * Verify 2FA code
 */
export async function verify2FACode(
  userId: string,
  code: string,
  secret: string
): Promise<Verify2FAResult> {
  return twoFactorAuthService.verifyCode(userId, code, secret);
}

/**
 * Verify 2FA code for login
 */
export async function verify2FACodeForLogin(
  userId: string,
  code: string,
  secret: string
): Promise<Verify2FAResult> {
  return twoFactorAuthService.verifyCodeForLogin(userId, code, secret);
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(userId: string): Promise<string[]> {
  return twoFactorAuthService.regenerateBackupCodes(userId);
}

/**
 * Get backup codes count
 */
export async function getBackupCodesCount(userId: string): Promise<number> {
  return twoFactorAuthService.getBackupCodesCount(userId);
}

/**
 * Check if 2FA should be enforced
 */
export function shouldEnforce2FA(role: UserRole): boolean {
  return twoFactorAuthService.shouldEnforce2FA(role);
}

/**
 * Check if 2FA is required but not enabled
 */
export async function is2FARequired(userId: string): Promise<boolean> {
  return twoFactorAuthService.is2FARequired(userId);
}

/**
 * Get 2FA status
 */
export async function get2FAStatus(userId: string): Promise<TwoFactorStatusResult> {
  return twoFactorAuthService.get2FAStatus(userId);
}

/**
 * Generate TOTP code (for testing)
 */
export function generateTOTPCode(secret: string): string {
  return twoFactorAuthService.generateTOTPCode(secret);
}
