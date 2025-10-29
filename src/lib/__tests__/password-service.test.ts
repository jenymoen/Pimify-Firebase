/**
 * Unit tests for password-service.ts
 */

import { PasswordService, passwordService } from '../password-service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PasswordService();
  });

  describe('hashPassword', () => {
    it('should hash a password using bcrypt', async () => {
      const mockHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5LyYXVKqZR2XC';
      mockBcrypt.hash.mockResolvedValue(mockHash);

      const password = 'SecurePassword123!';
      const hash = await service.hashPassword(password);

      expect(hash).toBe(mockHash);
      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('should throw an error if hashing fails', async () => {
      const error = new Error('Hashing failed');
      mockBcrypt.hash.mockRejectedValue(error);

      await expect(service.hashPassword('password')).rejects.toThrow('Failed to hash password');
    });
  });

  describe('verifyPassword', () => {
    it('should return valid true for correct password', async () => {
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await service.verifyPassword('password', 'hash');

      expect(result).toEqual({ valid: true });
      expect(mockBcrypt.compare).toHaveBeenCalledWith('password', 'hash');
    });

    it('should return valid false for incorrect password', async () => {
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await service.verifyPassword('wrong', 'hash');

      expect(result).toEqual({
        valid: false,
        error: 'Invalid password',
      });
    });

    it('should handle verification errors gracefully', async () => {
      const error = new Error('Verification failed');
      mockBcrypt.compare.mockRejectedValue(error);

      const result = await service.verifyPassword('password', 'hash');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Password verification failed');
    });
  });

  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const password = 'SecurePassword123!@#';
      const result = service.validatePassword(password);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBeDefined();
      expect(result.strength!.score).toBeGreaterThan(0);
    });

    it('should reject a password that is too short', () => {
      const password = 'Short1!';
      const result = service.validatePassword(password);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('at least'))).toBe(true);
    });

    it('should reject a password without uppercase letter', () => {
      const password = 'password123!';
      const result = service.validatePassword(password);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
    });

    it('should reject a password without lowercase letter', () => {
      const password = 'PASSWORD123!';
      const result = service.validatePassword(password);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
    });

    it('should reject a password without number', () => {
      const password = 'Password!';
      const result = service.validatePassword(password);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('number'))).toBe(true);
    });

    it('should reject a password without special character', () => {
      const password = 'Password123';
      const result = service.validatePassword(password);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('special character'))).toBe(true);
    });

    it('should reject common passwords', () => {
      const result = service.validatePassword('password');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('too common'))).toBe(true);
    });

    it('should reject passwords with too many repeating characters', () => {
      const password = 'Password111!!!';
      const result = service.validatePassword(password);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('repeating characters'))).toBe(true);
    });
  });

  describe('isCommonPassword', () => {
    it('should identify common passwords (case-insensitive)', () => {
      expect(service.isCommonPassword('password')).toBe(true);
      expect(service.isCommonPassword('PASSWORD')).toBe(true);
      expect(service.isCommonPassword('admin')).toBe(true);
      expect(service.isCommonPassword('12345678')).toBe(true);
    });

    it('should not identify strong passwords as common', () => {
      expect(service.isCommonPassword('SecurePassword123!@#')).toBe(false);
      expect(service.isCommonPassword('MyUniqueP@ssw0rd')).toBe(false);
    });

    it('should handle passwords with spaces', () => {
      expect(service.isCommonPassword(' password ')).toBe(true);
      expect(service.isCommonPassword('secure password 123!')).toBe(false);
    });
  });

  describe('isPasswordInHistory', () => {
    it('should return false for empty history', async () => {
      const result = await service.isPasswordInHistory('newHash', null);
      expect(result).toBe(false);

      const result2 = await service.isPasswordInHistory('newHash', []);
      expect(result2).toBe(false);
    });

    it('should return true if password hash is in history', async () => {
      const history = ['hash1', 'hash2', 'hash3'];
      const result = await service.isPasswordInHistory('hash2', history);

      expect(result).toBe(true);
    });

    it('should return false if password hash is not in history', async () => {
      const history = ['hash1', 'hash2', 'hash3'];
      const result = await service.isPasswordInHistory('newHash', history);

      expect(result).toBe(false);
    });
  });

  describe('updatePasswordHistory', () => {
    it('should add current password to empty history', () => {
      const result = service.updatePasswordHistory('newHash', null);

      expect(result).toEqual(['newHash']);
      expect(result.length).toBe(1);
    });

    it('should maintain max history count', () => {
      const history = ['hash1', 'hash2', 'hash3', 'hash4', 'hash5'];
      const result = service.updatePasswordHistory('newHash', history);

      expect(result).toEqual(['newHash', 'hash1', 'hash2', 'hash3', 'hash4']);
      expect(result.length).toBe(5);
    });

    it('should add new hash to the beginning of history', () => {
      const history = ['oldHash1', 'oldHash2'];
      const result = service.updatePasswordHistory('newHash', history);

      expect(result[0]).toBe('newHash');
      expect(result).toContain('oldHash1');
      expect(result).toContain('oldHash2');
    });
  });

  describe('shouldChangePassword', () => {
    it('should return true if password has never been changed', () => {
      const result = service.shouldChangePassword(null);

      expect(result).toBe(true);
    });

    it('should return false if password is less than max age', () => {
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const result = service.shouldChangePassword(recentDate, 90);

      expect(result).toBe(false);
    });

    it('should return true if password exceeds max age', () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      const result = service.shouldChangePassword(oldDate, 90);

      expect(result).toBe(true);
    });

    it('should use custom max age', () => {
      const date = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      
      const result30 = service.shouldChangePassword(date, 30);
      expect(result30).toBe(true);

      const result90 = service.shouldChangePassword(date, 90);
      expect(result90).toBe(false);
    });
  });

  describe('getPasswordAge', () => {
    it('should return null if password has never been changed', () => {
      const result = service.getPasswordAge(null);

      expect(result).toBeNull();
    });

    it('should return correct age in days', () => {
      const date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const result = service.getPasswordAge(date);

      expect(result).toBe(5);
    });

    it('should handle edge case of same day', () => {
      const date = new Date();
      const result = service.getPasswordAge(date);

      expect(result).toBe(0);
    });
  });

  describe('generateRandomPassword', () => {
    it('should generate a password of default length', () => {
      const password = service.generateRandomPassword();

      expect(password.length).toBe(16);
    });

    it('should generate a password of specified length', () => {
      const password = service.generateRandomPassword(20);

      expect(password.length).toBe(20);
    });

    it('should generate passwords with required character types', () => {
      const password = service.generateRandomPassword(20);
      
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[!@#$%^&*]/.test(password)).toBe(true);
    });

    it('should generate different passwords each time', () => {
      const password1 = service.generateRandomPassword();
      const password2 = service.generateRandomPassword();

      expect(password1).not.toBe(password2);
    });
  });

  describe('validatePasswordChange', () => {
    it('should accept a valid password change', async () => {
      mockBcrypt.compare.mockResolvedValue(false);
      
      const result = await service.validatePasswordChange(
        'NewSecurePassword123!',
        'newHash',
        'currentHash',
        null
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject if new password is same as current password', async () => {
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await service.validatePasswordChange(
        'samePassword',
        'sameHash',
        'currentHash',
        null
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('must be different'))).toBe(true);
    });

    it('should reject weak passwords', async () => {
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await service.validatePasswordChange(
        'weak',
        'weakHash',
        'currentHash',
        null
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject common passwords', async () => {
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await service.validatePasswordChange(
        'password',
        'passwordHash',
        'currentHash',
        null
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('too common'))).toBe(true);
    });
  });

  describe('verifyPasswordWithHistory', () => {
    it('should return isCurrent true and isInHistory false for current password', async () => {
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await service.verifyPasswordWithHistory(
        'password',
        'currentHash',
        null
      );

      expect(result.isCurrent).toBe(true);
      expect(result.isInHistory).toBe(false);
    });

    it('should return isCurrent false and isInHistory false for new password', async () => {
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await service.verifyPasswordWithHistory(
        'differentPassword',
        'currentHash',
        null
      );

      expect(result.isCurrent).toBe(false);
      expect(result.isInHistory).toBe(false);
    });
  });

  describe('custom configuration', () => {
    it('should use custom hash rounds', async () => {
      const customService = new PasswordService({ hashRounds: 14 });
      mockBcrypt.hash.mockResolvedValue('hash');

      await customService.hashPassword('password');

      expect(mockBcrypt.hash).toHaveBeenCalledWith('password', 14);
    });

    it('should use custom max history count', () => {
      const customService = new PasswordService({ maxHistoryCount: 10 });
      const history = Array.from({ length: 10 }, (_, i) => `hash${i}`);
      
      const result = customService.updatePasswordHistory('newHash', history);

      expect(result.length).toBe(10);
    });

    it('should use custom common passwords list', () => {
      const customService = new PasswordService({
        commonPasswords: ['customPassword', 'test123']
      });

      expect(customService.isCommonPassword('customPassword')).toBe(true);
      expect(customService.isCommonPassword('test123')).toBe(true);
      expect(customService.isCommonPassword('password')).toBe(false);
    });
  });
});

describe('Convenience functions', () => {
  describe('hashPassword', () => {
    it('should export a function that uses default service', () => {
      const { hashPassword } = require('../password-service');
      expect(typeof hashPassword).toBe('function');
    });
  });

  describe('verifyPassword', () => {
    it('should export a function that uses default service', () => {
      const { verifyPassword } = require('../password-service');
      expect(typeof verifyPassword).toBe('function');
    });
  });

  describe('validatePasswordComplexity', () => {
    it('should export a function that uses default service', () => {
      const { validatePasswordComplexity } = require('../password-service');
      expect(typeof validatePasswordComplexity).toBe('function');
    });
  });

  describe('isCommonPassword', () => {
    it('should export a function that uses default service', () => {
      const { isCommonPassword } = require('../password-service');
      expect(typeof isCommonPassword).toBe('function');
    });
  });

  describe('generateRandomPassword', () => {
    it('should export a function that uses default service', () => {
      const { generateRandomPassword } = require('../password-service');
      expect(typeof generateRandomPassword).toBe('function');
    });
  });
});

describe('passwordService default instance', () => {
  it('should be exported', () => {
    expect(passwordService).toBeDefined();
    expect(passwordService).toBeInstanceOf(PasswordService);
  });
});
