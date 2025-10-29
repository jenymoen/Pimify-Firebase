/**
 * Unit tests for auth-service.ts
 */

import { AuthService, authService } from '../auth-service';
import { UserRole } from '@/types/workflow';
import { UserStatus, UsersTable } from '../database-schema';

// Mock dependencies
jest.mock('../user-service');
jest.mock('../password-service');
jest.mock('jsonwebtoken');

import * as jwt from 'jsonwebtoken';
const mockJwt = jwt as jest.Mocked<typeof jwt>;

// Import after mocking
import { userService } from '../user-service';
import { passwordService } from '../password-service';

const mockUserService = userService as jest.Mocked<typeof userService>;
const mockPasswordService = passwordService as jest.Mocked<typeof passwordService>;

describe('AuthService', () => {
  let service: AuthService;
  let mockUser: UsersTable;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService({
      jwtSecret: 'test-secret',
      jwtRefreshSecret: 'test-refresh-secret',
      userService: mockUserService as any,
    });

    // Create mock user
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      name: 'Test User',
      avatar_url: null,
      role: UserRole.EDITOR,
      status: UserStatus.ACTIVE,
      job_title: null,
      department: null,
      location: null,
      timezone: null,
      phone: null,
      manager_id: null,
      bio: null,
      specialties: null,
      languages: null,
      working_hours: null,
      custom_fields: null,
      reviewer_max_workload: 10,
      reviewer_availability: null,
      reviewer_availability_until: null,
      reviewer_rating: null,
      two_factor_enabled: false,
      two_factor_secret: null,
      backup_codes: null,
      last_password_change: new Date(),
      password_history: null,
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: null,
      last_login_ip: null,
      last_active_at: null,
      sso_provider: null,
      sso_id: null,
      sso_linked_at: null,
      created_at: new Date(),
      created_by: null,
      updated_at: null,
      updated_by: null,
      deleted_at: null,
      deleted_by: null,
    };
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      mockUserService.getByEmail.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      mockPasswordService.verifyPassword.mockResolvedValue({ valid: true });
      mockUserService.resetFailedLoginAttempts.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      mockUserService.updateLastLogin.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      mockJwt.sign.mockReturnValue('mock-access-token' as any);
      mockJwt.sign.mockReturnValueOnce('mock-access-token' as any);
      mockJwt.sign.mockReturnValueOnce('mock-refresh-token' as any);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
        ipAddress: '127.0.0.1',
      });

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockUserService.resetFailedLoginAttempts).toHaveBeenCalledWith('user-123');
      expect(mockUserService.updateLastLogin).toHaveBeenCalledWith('user-123', '127.0.0.1');
    });

    it('should fail login with invalid password', async () => {
      mockUserService.getByEmail.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      mockPasswordService.verifyPassword.mockResolvedValue({
        valid: false,
        error: 'Invalid password',
      });
      mockUserService.incrementFailedLoginAttempts.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.code).toBe('INVALID_CREDENTIALS');
      expect(mockUserService.incrementFailedLoginAttempts).toHaveBeenCalledWith('user-123');
    });

    it('should fail login for locked account', async () => {
      const lockedUser = { ...mockUser, status: UserStatus.LOCKED, locked_until: new Date(Date.now() + 60000) };
      mockUserService.getByEmail.mockResolvedValue({
        success: true,
        data: lockedUser,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('ACCOUNT_LOCKED');
      expect(result.error).toContain('locked');
    });

    it('should fail login for inactive account', async () => {
      const inactiveUser = { ...mockUser, status: UserStatus.INACTIVE };
      mockUserService.getByEmail.mockResolvedValue({
        success: true,
        data: inactiveUser,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('ACCOUNT_INACTIVE');
      expect(result.error).toContain('inactive');
    });

    it('should fail login for suspended account', async () => {
      const suspendedUser = { ...mockUser, status: UserStatus.SUSPENDED };
      mockUserService.getByEmail.mockResolvedValue({
        success: true,
        data: suspendedUser,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('ACCOUNT_SUSPENDED');
      expect(result.error).toContain('suspended');
    });

    it('should fail login for user without password (SSO only)', async () => {
      const ssoUser = { ...mockUser, password_hash: null };
      mockUserService.getByEmail.mockResolvedValue({
        success: true,
        data: ssoUser,
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('SSO_ONLY_ACCOUNT');
    });

    it('should fail login for non-existent user', async () => {
      mockUserService.getByEmail.mockResolvedValue({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });

      const result = await service.login({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_CREDENTIALS');
    });

    it('should auto-unlock account if lock expired', async () => {
      const expiredLockUser = { ...mockUser, status: UserStatus.LOCKED, locked_until: new Date(Date.now() - 1000) };
      mockUserService.getByEmail.mockResolvedValue({
        success: true,
        data: expiredLockUser,
      });
      mockUserService.unlock.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      mockPasswordService.verifyPassword.mockResolvedValue({ valid: true });
      mockUserService.resetFailedLoginAttempts.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      mockUserService.updateLastLogin.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      mockJwt.sign.mockReturnValue('mock-token' as any);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockUserService.unlock).toHaveBeenCalledWith('user-123');
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      mockUserService.updateLastActive.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await service.logout('user-123');

      expect(result.success).toBe(true);
      expect(mockUserService.updateLastActive).toHaveBeenCalledWith('user-123');
    });

    it('should handle logout error gracefully', async () => {
      mockUserService.updateLastActive.mockResolvedValue({
        success: false,
        error: 'Update failed',
        code: 'INTERNAL_ERROR',
      });

      const result = await service.logout('user-123');

      expect(result.success).toBe(true); // Logout succeeds even if update fails
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.EDITOR,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 1000,
      };

      mockJwt.verify.mockReturnValue(mockPayload);

      const result = service.verifyAccessToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.payload).toEqual(mockPayload);
    });

    it('should reject expired access token', () => {
      const error = new jwt.TokenExpiredError('Token expired', new Date());
      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      const result = service.verifyAccessToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject invalid access token', () => {
      const error = new jwt.JsonWebTokenError('Invalid token');
      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      const result = service.verifyAccessToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.code).toBe('INVALID_TOKEN');
    });

    it('should reject refresh token used as access token', () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.EDITOR,
        type: 'refresh',
        iat: Date.now(),
        exp: Date.now() + 1000,
      };

      mockJwt.verify.mockReturnValue(mockPayload);

      const result = service.verifyAccessToken('refresh-token');

      expect(result.valid).toBe(false);
      expect(result.code).toBe('INVALID_TOKEN_TYPE');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.EDITOR,
        type: 'refresh',
        iat: Date.now(),
        exp: Date.now() + 1000,
      };

      mockJwt.verify.mockReturnValue(mockPayload);

      const result = service.verifyRefreshToken('valid-refresh-token');

      expect(result.valid).toBe(true);
      expect(result.payload).toEqual(mockPayload);
    });

    it('should reject expired refresh token', () => {
      const error = new jwt.TokenExpiredError('Token expired', new Date());
      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      const result = service.verifyRefreshToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject invalid refresh token', () => {
      const error = new jwt.JsonWebTokenError('Invalid token');
      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      const result = service.verifyRefreshToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.code).toBe('INVALID_TOKEN');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.EDITOR,
        type: 'refresh',
        iat: Date.now(),
        exp: Date.now() + 1000,
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      mockJwt.sign
        .mockReturnValueOnce('new-access-token' as any)
        .mockReturnValueOnce('new-refresh-token' as any);

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should reject invalid refresh token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      const result = await service.refreshTokens('invalid-token');

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_TOKEN');
    });

    it('should reject refresh if user not found', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.EDITOR,
        type: 'refresh',
        iat: Date.now(),
        exp: Date.now() + 1000,
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.code).toBe('USER_NOT_FOUND');
    });

    it('should reject refresh if user is not active', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.EDITOR,
        type: 'refresh',
        iat: Date.now(),
        exp: Date.now() + 1000,
      };

      const inactiveUser = { ...mockUser, status: UserStatus.INACTIVE };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: inactiveUser,
      });

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.code).toBe('ACCOUNT_INACTIVE');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Authorization header', () => {
      const token = service.extractTokenFromHeader('Bearer valid-token');

      expect(token).toBe('valid-token');
    });

    it('should return null for invalid Authorization header', () => {
      const token = service.extractTokenFromHeader('Invalid format');

      expect(token).toBeNull();
    });

    it('should return null for null header', () => {
      const token = service.extractTokenFromHeader(null);

      expect(token).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should get user from valid token', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.EDITOR,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 1000,
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await service.getCurrentUser('valid-token');

      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeUndefined();
    });

    it('should return error for invalid token', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      const result = await service.getCurrentUser('invalid-token');

      expect(result.error).toBeDefined();
      expect(result.code).toBe('INVALID_TOKEN');
      expect(result.user).toBeUndefined();
    });

    it('should return error if user not found', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.EDITOR,
        type: 'access',
        iat: Date.now(),
        exp: Date.now() + 1000,
      };

      mockJwt.verify.mockReturnValue(mockPayload);
      mockUserService.getById.mockResolvedValue({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });

      const result = await service.getCurrentUser('valid-token');

      expect(result.error).toBeDefined();
      expect(result.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('isAccountLocked', () => {
    it('should return true for locked account', async () => {
      const lockedUser = { ...mockUser, status: UserStatus.LOCKED, locked_until: new Date(Date.now() + 60000) };
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: lockedUser,
      });

      const result = await service.isAccountLocked('user-123');

      expect(result).toBe(true);
    });

    it('should return false for unlocked account', async () => {
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await service.isAccountLocked('user-123');

      expect(result).toBe(false);
    });

    it('should return false if lock has expired', async () => {
      const expiredLockUser = { ...mockUser, status: UserStatus.LOCKED, locked_until: new Date(Date.now() - 1000) };
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: expiredLockUser,
      });

      const result = await service.isAccountLocked('user-123');

      expect(result).toBe(false);
    });
  });

  describe('getRemainingLoginAttempts', () => {
    it('should return correct remaining attempts', async () => {
      const userWithAttempts = { ...mockUser, failed_login_attempts: 2 };
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: userWithAttempts,
      });

      const result = await service.getRemainingLoginAttempts('user-123');

      expect(result).toBe(3); // MAX_FAILED_ATTEMPTS (5) - failed_attempts (2)
    });

    it('should return 0 if max attempts reached', async () => {
      const userWithMaxAttempts = { ...mockUser, failed_login_attempts: 5 };
      mockUserService.getById.mockResolvedValue({
        success: true,
        data: userWithMaxAttempts,
      });

      const result = await service.getRemainingLoginAttempts('user-123');

      expect(result).toBe(0);
    });
  });

  describe('login with remember me', () => {
    it('should generate tokens when remember me is true', async () => {
      mockUserService.getByEmail.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      mockPasswordService.verifyPassword.mockResolvedValue({ valid: true });
      mockUserService.resetFailedLoginAttempts.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      mockUserService.updateLastLogin.mockResolvedValue({
        success: true,
        data: mockUser,
      });
      mockJwt.sign.mockReturnValue('mock-token' as any);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      });

      expect(result.success).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors during login', async () => {
      mockUserService.getByEmail.mockRejectedValue(new Error('Database error'));

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.code).toBe('INTERNAL_ERROR');
    });

    it('should handle errors during token refresh', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await service.refreshTokens('token');

      expect(result.success).toBe(false);
      expect(result.code).toBeDefined(); // Will be 'VERIFICATION_ERROR' from the service
    });
  });
});

describe('Convenience functions', () => {
  it('should export login function', () => {
    const { login } = require('../auth-service');
    expect(typeof login).toBe('function');
  });

  it('should export logout function', () => {
    const { logout } = require('../auth-service');
    expect(typeof logout).toBe('function');
  });

  it('should export verifyAccessToken function', () => {
    const { verifyAccessToken } = require('../auth-service');
    expect(typeof verifyAccessToken).toBe('function');
  });

  it('should export verifyRefreshToken function', () => {
    const { verifyRefreshToken } = require('../auth-service');
    expect(typeof verifyRefreshToken).toBe('function');
  });

  it('should export refreshTokens function', () => {
    const { refreshTokens } = require('../auth-service');
    expect(typeof refreshTokens).toBe('function');
  });

  it('should export getCurrentUser function', () => {
    const { getCurrentUser } = require('../auth-service');
    expect(typeof getCurrentUser).toBe('function');
  });
});

describe('authService default instance', () => {
  it('should be exported', () => {
    expect(authService).toBeDefined();
    expect(authService).toBeInstanceOf(AuthService);
  });
});
