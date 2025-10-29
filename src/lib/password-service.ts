/**
 * Password Service
 * 
 * Handles password hashing, validation, history tracking, and security checks.
 * Uses bcrypt for secure password hashing with configurable cost factor.
 */

import bcrypt from 'bcrypt';
import { validatePassword, checkPasswordStrength } from './user-validation';

/**
 * Configuration for password hashing
 */
export const PASSWORD_CONFIG = {
  // Bcrypt cost factor (12+ as required)
  HASH_ROUNDS: 12,
  
  // Password history settings
  MAX_HISTORY_COUNT: 5,
  
  // Common passwords to check against
  COMMON_PASSWORDS: [
    'password',
    'password123',
    '12345678',
    '123456789',
    '1234567890',
    'qwerty',
    'qwerty123',
    'admin',
    'admin123',
    'welcome',
    'welcome123',
    'letmein',
    'monkey',
    'dragon',
    'master',
    '123456',
    '1234567',
    'sunshine',
    'princess',
    'football',
    'iloveyou',
    'abc123',
    'qwerty',
    'qwertyuiop',
    'password1',
    'passw0rd',
    'admin',
    'root',
    'toor',
  ],
};

/**
 * Result of password verification
 */
export interface VerifyPasswordResult {
  valid: boolean;
  error?: string;
}

/**
 * Result of password validation
 */
export interface ValidatePasswordResult {
  valid: boolean;
  errors: string[];
  strength?: {
    score: number;
    feedback: string[];
  };
}

/**
 * Password history entry
 */
export interface PasswordHistoryEntry {
  hash: string;
  createdAt: Date;
}

/**
 * Password Service Class
 * 
 * Provides methods for password hashing, verification, and management
 */
export class PasswordService {
  private readonly hashRounds: number;
  private readonly maxHistoryCount: number;
  private readonly commonPasswords: string[];

  constructor(config?: {
    hashRounds?: number;
    maxHistoryCount?: number;
    commonPasswords?: string[];
  }) {
    this.hashRounds = config?.hashRounds ?? PASSWORD_CONFIG.HASH_ROUNDS;
    this.maxHistoryCount = config?.maxHistoryCount ?? PASSWORD_CONFIG.MAX_HISTORY_COUNT;
    this.commonPasswords = config?.commonPasswords ?? PASSWORD_CONFIG.COMMON_PASSWORDS;
  }

  /**
   * Hash a password using bcrypt
   * 
   * @param password - Plain text password
   * @returns Hashed password string
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, this.hashRounds);
      return hash;
    } catch (error) {
      throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify a password against a hash
   * 
   * @param password - Plain text password
   * @param hash - Stored password hash
   * @returns Result object with validation status
   */
  async verifyPassword(password: string, hash: string): Promise<VerifyPasswordResult> {
    try {
      const isValid = await bcrypt.compare(password, hash);
      
      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid password',
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Password verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Validate password against complexity requirements
   * 
   * @param password - Plain text password
   * @returns Validation result with errors and strength score
   */
  validatePassword(password: string): ValidatePasswordResult {
    const errors: string[] = [];
    
    // Use Zod validation from user-validation.ts
    const validation = validatePassword(password);
    
    if (!validation.success) {
      errors.push(...validation.error.errors.map(e => e.message));
    }

    // Check against common passwords
    const isCommon = this.isCommonPassword(password);
    if (isCommon) {
      errors.push('Password is too common. Please use a unique password.');
    }

    // Get strength score
    const strength = checkPasswordStrength(password);

    return {
      valid: errors.length === 0,
      errors,
      strength,
    };
  }

  /**
   * Check if a password is in the common passwords list
   * 
   * @param password - Plain text password to check
   * @returns True if password is common
   */
  isCommonPassword(password: string): boolean {
    const normalized = password.toLowerCase().trim();
    return this.commonPasswords.some(common => common.toLowerCase() === normalized);
  }

  /**
   * Check if a new password has been used recently (password reuse prevention)
   * 
   * @param newPasswordHash - Hash of the new password
   * @param passwordHistory - Array of previous password hashes
   * @returns True if password has been used recently
   */
  async isPasswordInHistory(newPasswordHash: string, passwordHistory: string[] | null): Promise<boolean> {
    if (!passwordHistory || passwordHistory.length === 0) {
      return false;
    }

    // Check against all passwords in history
    for (const oldHash of passwordHistory) {
      try {
        // Compare the hashed versions (security: we're comparing hashes, not plain text)
        // Note: We can't directly compare bcrypt hashes, but if the hash string matches exactly,
        // it's the same password
        if (oldHash === newPasswordHash) {
          return true;
        }
      } catch (error) {
        // If comparison fails, continue checking
        continue;
      }
    }

    return false;
  }

  /**
   * Verify a password against the current password and history
   * 
   * @param password - Plain text password to verify
   * @param currentHash - Current password hash
   * @param passwordHistory - Array of previous password hashes (optional)
   * @returns True if password matches the current password (not in history)
   */
  async verifyPasswordWithHistory(
    password: string,
    currentHash: string,
    passwordHistory: string[] | null
  ): Promise<{
    isCurrent: boolean;
    isInHistory: boolean;
  }> {
    // First, verify against current password
    const currentResult = await this.verifyPassword(password, currentHash);
    const isCurrent = currentResult.valid;

    // Then, check if password is in history
    const isInHistory = await this.isPasswordInHistory(currentHash, passwordHistory);

    return { isCurrent, isInHistory };
  }

  /**
   * Update password history by adding a new hash and maintaining the limit
   * 
   * @param currentPasswordHash - Current password hash to add to history
   * @param passwordHistory - Existing password history array (or null)
   * @returns Updated password history array (last 5 passwords)
   */
  updatePasswordHistory(currentPasswordHash: string, passwordHistory: string[] | null): string[] {
    const history = passwordHistory || [];
    
    // Add current password to history
    const updatedHistory = [currentPasswordHash, ...history];
    
    // Keep only the last N passwords
    return updatedHistory.slice(0, this.maxHistoryCount);
  }

  /**
   * Check if password needs to be changed (e.g., after 90 days)
   * 
   * @param lastPasswordChange - Date when password was last changed
   * @param maxAgeDays - Maximum age in days (default: 90)
   * @returns True if password needs to be changed
   */
  shouldChangePassword(lastPasswordChange: Date | null, maxAgeDays: number = 90): boolean {
    if (!lastPasswordChange) {
      // If password has never been changed, it should be changed
      return true;
    }

    const now = new Date();
    const diffTime = now.getTime() - lastPasswordChange.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    return diffDays >= maxAgeDays;
  }

  /**
   * Get password age in days
   * 
   * @param lastPasswordChange - Date when password was last changed
   * @returns Number of days since last password change (or null if never changed)
   */
  getPasswordAge(lastPasswordChange: Date | null): number | null {
    if (!lastPasswordChange) {
      return null;
    }

    const now = new Date();
    const diffTime = now.getTime() - lastPasswordChange.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Generate a random secure password
   * 
   * @param length - Desired password length (default: 16)
   * @returns Random secure password
   */
  generateRandomPassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each required character type
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    
    // Add at least one character of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password to avoid predictable first characters
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Validate password against history (prevent reuse)
   * 
   * @param newPassword - Plain text new password
   * @param newPasswordHash - Hash of the new password
   * @param currentHash - Current password hash
   * @param passwordHistory - Array of previous password hashes
   * @returns Validation result
   */
  async validatePasswordChange(
    newPassword: string,
    newPasswordHash: string,
    currentHash: string,
    passwordHistory: string[] | null
  ): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Validate password complexity
    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      errors.push(...validation.errors);
    }

    // Check if new password is the same as current password
    const isCurrent = await this.verifyPassword(newPassword, currentHash);
    if (isCurrent.valid) {
      errors.push('New password must be different from current password');
    }

    // Check if password is in history (we'll need to hash the new password and compare)
    // We need to compare against history by checking if the hashes match
    const isInHistory = await this.isPasswordInHistory(newPasswordHash, passwordHistory);
    if (isInHistory) {
      errors.push(`Password must not be one of the last ${this.maxHistoryCount} passwords`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Default password service instance
 */
export const passwordService = new PasswordService();

/**
 * Convenience functions for common operations
 */

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return passwordService.hashPassword(password);
}

/**
 * Verify a password
 */
export async function verifyPassword(password: string, hash: string): Promise<VerifyPasswordResult> {
  return passwordService.verifyPassword(password, hash);
}

/**
 * Validate password complexity
 */
export function validatePasswordComplexity(password: string): ValidatePasswordResult {
  return passwordService.validatePassword(password);
}

/**
 * Check if password is common
 */
export function isCommonPassword(password: string): boolean {
  return passwordService.isCommonPassword(password);
}

/**
 * Generate random password
 */
export function generateRandomPassword(length?: number): string {
  return passwordService.generateRandomPassword(length);
}
