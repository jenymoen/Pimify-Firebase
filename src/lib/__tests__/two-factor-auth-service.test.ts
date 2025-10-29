/**
 * Unit tests for two-factor-auth-service.ts
 */

import { TwoFactorAuthService, twoFactorAuthService, enable2FA, verify2FACode, verify2FACodeForLogin, regenerateBackupCodes, getBackupCodesCount, shouldEnforce2FA, is2FARequired, get2FAStatus, generateTOTPCode } from '../two-factor-auth-service';
import { UserRole } from '@/types/workflow';
import { UserStatus } from '../database-schema';

// Mock dependencies
jest.mock('../user-service');
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,QR'),
}));

import { userService } from '../user-service';
import QRCode from 'qrcode';

const mockUserService = userService as jest.Mocked<typeof userService>;
const mockQRCode = QRCode as jest.Mocked<typeof QRCode>;

describe('TwoFactorAuthService', () => {
  let service: TwoFactorAuthService;
  let mockUser: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TwoFactorAuthService({
      userService: mockUserService as any,
    });

    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.EDITOR,
      status: UserStatus.ACTIVE,
      two_factor_enabled: false,
    };
  });

  describe('enable2FA', () => {
    it('should generate secret, QR code, and backup codes', async () => {
      mockUserService.getById.mockResolvedValue({ success: true, data: mockUser });

      const result = await service.enable2FA('user-123', 'test@example.com', 'Test User');

      expect(result.success).toBe(true);
      expect(result.secret).toBeDefined();
      expect(result.qrCode).toBe('data:image/png;base64,QR');
      expect(result.backupCodes).toBeDefined();
      expect(Array.isArray(result.backupCodes)).toBe(true);
      expect(result.backupCodes!.length).toBe(10);
      expect(mockQRCode.toDataURL).toHaveBeenCalled();
    });

    it('should return USER_NOT_FOUND if user does not exist', async () => {
      mockUserService.getById.mockResolvedValue({ success: false, error: 'not found' });

      const result = await service.enable2FA('missing', 'x@example.com', 'X');

      expect(result.success).toBe(false);
      expect(result.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('verifyCode', () => {
    it('should verify a valid TOTP code', async () => {
      mockUserService.getById.mockResolvedValue({ success: true, data: mockUser });
      const setup = await service.enable2FA('user-123', 'test@example.com', 'Test User');
      const code = service.generateTOTPCode(setup.secret!);

      const result = await service.verifyCode('user-123', code, setup.secret!);

      expect(result.success).toBe(true);
      expect(result.backupCodesUsed).toBe(false);
    });

    it('should reject an invalid TOTP code', async () => {
      mockUserService.getById.mockResolvedValue({ success: true, data: mockUser });
      const setup = await service.enable2FA('user-123', 'test@example.com', 'Test User');

      const result = await service.verifyCode('user-123', '000000', setup.secret!);

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_CODE');
    });

    it('should accept a valid backup code', async () => {
      mockUserService.getById.mockResolvedValue({ success: true, data: mockUser });
      const setup = await service.enable2FA('user-123', 'test@example.com', 'Test User');
      const backupCode = setup.backupCodes![0];

      const result = await service.verifyCode('user-123', backupCode, setup.secret!);

      expect(result.success).toBe(true);
      expect(result.backupCodesUsed).toBe(true);
    });
  });

  describe('verifyCodeForLogin', () => {
    it('should consume backup code on successful verification', async () => {
      mockUserService.getById.mockResolvedValue({ success: true, data: mockUser });
      const setup = await service.enable2FA('user-123', 'test@example.com', 'Test User');
      const backupCode = setup.backupCodes![0];

      const first = await service.verifyCodeForLogin('user-123', backupCode, setup.secret!);
      expect(first.success).toBe(true);
      expect(first.backupCodesUsed).toBe(true);

      // Using the same code again should fail now
      const second = await service.verifyCode('user-123', backupCode, setup.secret!);
      expect(second.success).toBe(false);
    });
  });

  describe('backup codes', () => {
    it('should regenerate backup codes and update count', async () => {
      mockUserService.getById.mockResolvedValue({ success: true, data: mockUser });
      await service.enable2FA('user-123', 'test@example.com', 'Test User');

      const before = await service.getBackupCodesCount('user-123');
      expect(before).toBe(10);

      const codes = await service.regenerateBackupCodes('user-123');
      expect(codes.length).toBe(10);

      const after = await service.getBackupCodesCount('user-123');
      expect(after).toBe(10);
    });
  });

  describe('enforcement and status', () => {
    it('should enforce 2FA for admin role', () => {
      expect(service.shouldEnforce2FA(UserRole.ADMIN)).toBe(true);
      expect(service.shouldEnforce2FA(UserRole.EDITOR)).toBe(false);
    });

    it('should indicate if 2FA is required but not enabled', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN, two_factor_enabled: false };
      mockUserService.getById.mockResolvedValue({ success: true, data: adminUser });

      const required = await service.is2FARequired('user-123');
      expect(required).toBe(true);
    });

    it('should return 2FA status with backup codes count', async () => {
      mockUserService.getById.mockResolvedValue({ success: true, data: { ...mockUser, two_factor_enabled: true } });
      await service.enable2FA('user-123', 'test@example.com', 'Test User');

      const status = await service.get2FAStatus('user-123');

      expect(status.enabled).toBe(true);
      expect(status.backupCodesRemaining).toBe(10);
    });
  });
});

describe('Convenience functions', () => {
  it('should expose enable2FA', () => {
    expect(typeof enable2FA).toBe('function');
  });

  it('should expose verify2FACode', () => {
    expect(typeof verify2FACode).toBe('function');
  });

  it('should expose verify2FACodeForLogin', () => {
    expect(typeof verify2FACodeForLogin).toBe('function');
  });

  it('should expose regenerateBackupCodes', () => {
    expect(typeof regenerateBackupCodes).toBe('function');
  });

  it('should expose getBackupCodesCount', () => {
    expect(typeof getBackupCodesCount).toBe('function');
  });

  it('should expose shouldEnforce2FA', () => {
    expect(typeof shouldEnforce2FA).toBe('function');
  });

  it('should expose is2FARequired', () => {
    expect(typeof is2FARequired).toBe('function');
  });

  it('should expose get2FAStatus', () => {
    expect(typeof get2FAStatus).toBe('function');
  });

  it('should expose generateTOTPCode', () => {
    expect(typeof generateTOTPCode).toBe('function');
  });
});
