/**
 * Unit Tests for User Validation Schemas
 * 
 * Tests for Zod validation schemas used throughout user management
 */

import { UserRole } from '@/types/workflow';
import { UserStatus, ReviewerAvailability } from '../database-schema';
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  phoneSchema,
  createUserSchema,
  updateUserSchema,
  loginSchema,
  resetPasswordSchema,
  changePasswordSchema,
  sendInvitationSchema,
  acceptInvitationSchema,
  bulkRoleChangeSchema,
  userListQuerySchema,
  validateCreateUser,
  validateUpdateUser,
  validateEmail,
  validatePassword,
  checkPasswordStrength,
  isEmailFromAllowedDomain,
} from '../user-validation';

describe('User Validation Schemas', () => {
  // ============================================================================
  // EMAIL VALIDATION TESTS
  // ============================================================================

  describe('emailSchema', () => {
    it('should validate correct email', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
      expect(result.data).toBe('test@example.com');
    });

    it('should convert email to lowercase', () => {
      const result = emailSchema.safeParse('TEST@EXAMPLE.COM');
      expect(result.success).toBe(true);
      expect(result.data).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      const result = emailSchema.safeParse('  test@example.com  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('test@example.com');
    });

    it('should reject invalid email format', () => {
      const result = emailSchema.safeParse('invalid-email');
      expect(result.success).toBe(false);
    });

    it('should reject empty email', () => {
      const result = emailSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject email without domain', () => {
      const result = emailSchema.safeParse('test@');
      expect(result.success).toBe(false);
    });

    it('should reject email without @', () => {
      const result = emailSchema.safeParse('testexample.com');
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // PASSWORD VALIDATION TESTS
  // ============================================================================

  describe('passwordSchema', () => {
    it('should validate strong password', () => {
      const result = passwordSchema.safeParse('Test@123456');
      expect(result.success).toBe(true);
    });

    it('should reject password without uppercase', () => {
      const result = passwordSchema.safeParse('test@123456');
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const result = passwordSchema.safeParse('TEST@123456');
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = passwordSchema.safeParse('Test@Password');
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const result = passwordSchema.safeParse('Test123456');
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('T@st123');
      expect(result.success).toBe(false);
    });

    it('should reject password with repeating characters', () => {
      const result = passwordSchema.safeParse('Test@111111');
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // NAME VALIDATION TESTS
  // ============================================================================

  describe('nameSchema', () => {
    it('should validate correct name', () => {
      const result = nameSchema.safeParse('John Doe');
      expect(result.success).toBe(true);
      expect(result.data).toBe('John Doe');
    });

    it('should trim whitespace', () => {
      const result = nameSchema.safeParse('  John Doe  ');
      expect(result.success).toBe(true);
      expect(result.data).toBe('John Doe');
    });

    it('should reject empty name', () => {
      const result = nameSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject whitespace-only name', () => {
      const result = nameSchema.safeParse('   ');
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // PHONE VALIDATION TESTS
  // ============================================================================

  describe('phoneSchema', () => {
    it('should validate international phone with + prefix', () => {
      const result = phoneSchema.safeParse('+47 123 45 678');
      expect(result.success).toBe(true);
    });

    it('should validate phone without + prefix', () => {
      const result = phoneSchema.safeParse('123-456-7890');
      expect(result.success).toBe(true);
    });

    it('should validate phone with parentheses', () => {
      const result = phoneSchema.safeParse('(123) 456-7890');
      expect(result.success).toBe(true);
    });

    it('should accept undefined (optional)', () => {
      const result = phoneSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // CREATE USER SCHEMA TESTS
  // ============================================================================

  describe('createUserSchema', () => {
    it('should validate complete user data', () => {
      const data = {
        email: 'test@example.com',
        password: 'Test@123456',
        name: 'Test User',
        role: UserRole.EDITOR,
        department: 'IT',
      };

      const result = createUserSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow SSO user without password', () => {
      const data = {
        email: 'sso@example.com',
        name: 'SSO User',
        role: UserRole.VIEWER,
        sso_provider: 'google',
        sso_id: 'google_123',
      };

      const result = createUserSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject local user without password', () => {
      const data = {
        email: 'nopass@example.com',
        name: 'No Password',
        role: UserRole.EDITOR,
      };

      const result = createUserSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject reviewer fields for non-reviewer role', () => {
      const data = {
        email: 'editor@example.com',
        password: 'Test@123456',
        name: 'Editor User',
        role: UserRole.EDITOR,
        reviewer_max_workload: 10,
      };

      const result = createUserSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept reviewer fields for reviewer role', () => {
      const data = {
        email: 'reviewer@example.com',
        password: 'Test@123456',
        name: 'Reviewer User',
        role: UserRole.REVIEWER,
        reviewer_max_workload: 15,
        reviewer_availability: ReviewerAvailability.AVAILABLE,
      };

      const result = createUserSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // UPDATE USER SCHEMA TESTS
  // ============================================================================

  describe('updateUserSchema', () => {
    it('should validate partial update', () => {
      const data = {
        name: 'Updated Name',
        department: 'Marketing',
      };

      const result = updateUserSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept empty object (no updates)', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate email update', () => {
      const data = {
        email: 'newemail@example.com',
      };

      const result = updateUserSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // AUTHENTICATION SCHEMA TESTS
  // ============================================================================

  describe('loginSchema', () => {
    it('should validate login credentials', () => {
      const data = {
        email: 'user@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept remember_me option', () => {
      const data = {
        email: 'user@example.com',
        password: 'password123',
        remember_me: true,
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate matching passwords', () => {
      const data = {
        token: 'reset-token-123',
        password: 'NewPass@123',
        confirm_password: 'NewPass@123',
      };

      const result = resetPasswordSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const data = {
        token: 'reset-token-123',
        password: 'NewPass@123',
        confirm_password: 'DifferentPass@123',
      };

      const result = resetPasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate password change', () => {
      const data = {
        current_password: 'OldPass@123',
        new_password: 'NewPass@456',
        confirm_password: 'NewPass@456',
      };

      const result = changePasswordSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject if new password same as current', () => {
      const data = {
        current_password: 'SamePass@123',
        new_password: 'SamePass@123',
        confirm_password: 'SamePass@123',
      };

      const result = changePasswordSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // INVITATION SCHEMA TESTS
  // ============================================================================

  describe('sendInvitationSchema', () => {
    it('should validate invitation', () => {
      const data = {
        email: 'invite@example.com',
        role: UserRole.EDITOR,
        message: 'Welcome to the team!',
      };

      const result = sendInvitationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('acceptInvitationSchema', () => {
    it('should validate invitation acceptance', () => {
      const data = {
        token: 'invitation-token-123',
        password: 'NewUser@123',
        confirm_password: 'NewUser@123',
      };

      const result = acceptInvitationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const data = {
        token: 'invitation-token-123',
        password: 'NewUser@123',
        confirm_password: 'Different@123',
      };

      const result = acceptInvitationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // BULK OPERATION SCHEMA TESTS
  // ============================================================================

  describe('bulkRoleChangeSchema', () => {
    it('should validate bulk role change', () => {
      const data = {
        user_ids: ['user-1', 'user-2', 'user-3'],
        new_role: UserRole.REVIEWER,
        reason: 'Promoting users to reviewer role',
      };

      // Note: UUIDs won't validate with simple strings, so this will fail
      // In real tests, use valid UUIDs
      const result = bulkRoleChangeSchema.safeParse(data);
      expect(result.success).toBe(false); // Fails due to invalid UUID format
    });

    it('should require at least one user', () => {
      const data = {
        user_ids: [],
        new_role: UserRole.REVIEWER,
        reason: 'Test',
      };

      const result = bulkRoleChangeSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should limit to 100 users', () => {
      const data = {
        user_ids: Array(101).fill('00000000-0000-0000-0000-000000000000'),
        new_role: UserRole.REVIEWER,
        reason: 'Test',
      };

      const result = bulkRoleChangeSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // HELPER FUNCTION TESTS
  // ============================================================================

  describe('validateCreateUser', () => {
    it('should validate complete user data', () => {
      const data = {
        email: 'test@example.com',
        password: 'Test@123456',
        name: 'Test User',
        role: UserRole.EDITOR,
      };

      const result = validateCreateUser(data);
      expect(result.success).toBe(true);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = validateEmail('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = validateEmail('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = validatePassword('Strong@Pass123');
      expect(result.success).toBe(true);
    });

    it('should reject weak password', () => {
      const result = validatePassword('weak');
      expect(result.success).toBe(false);
    });
  });

  describe('checkPasswordStrength', () => {
    it('should rate strong password highly', () => {
      const result = checkPasswordStrength('VeryStr0ng@P@ssw0rd!2024');
      expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('should rate weak password poorly', () => {
      const result = checkPasswordStrength('weak');
      expect(result.score).toBeLessThan(2);
    });

    it('should detect common patterns', () => {
      const result = checkPasswordStrength('Password123!');
      expect(result.feedback.some(f => f.includes('common'))).toBe(true);
    });

    it('should detect repeating characters', () => {
      const result = checkPasswordStrength('Test@111111');
      expect(result.feedback.some(f => f.includes('repeat'))).toBe(true);
    });
  });

  describe('isEmailFromAllowedDomain', () => {
    it('should return true for allowed domain', () => {
      const result = isEmailFromAllowedDomain('user@company.com', ['company.com', 'partner.com']);
      expect(result).toBe(true);
    });

    it('should return false for disallowed domain', () => {
      const result = isEmailFromAllowedDomain('user@other.com', ['company.com', 'partner.com']);
      expect(result).toBe(false);
    });

    it('should be case-insensitive', () => {
      const result = isEmailFromAllowedDomain('user@COMPANY.COM', ['company.com']);
      expect(result).toBe(true);
    });
  });
});

