/**
 * User Validation Schemas
 * 
 * Comprehensive Zod schemas for validating user data.
 * Used in forms, API endpoints, and service layer.
 */

import { z } from 'zod';
import { UserRole } from '@/types/workflow';
import { UserStatus, ReviewerAvailability, USER_SCHEMA_CONSTRAINTS } from './database-schema';

// ============================================================================
// BASIC FIELD VALIDATORS
// ============================================================================

/**
 * Email validator
 * RFC 5322 compliant email validation
 */
export const emailSchema = z
  .string()
  .trim() // Trim first
  .min(1, 'Email is required')
  .max(USER_SCHEMA_CONSTRAINTS.EMAIL_MAX_LENGTH, `Email must be at most ${USER_SCHEMA_CONSTRAINTS.EMAIL_MAX_LENGTH} characters`)
  .email('Invalid email format')
  .transform(val => val.toLowerCase());

/**
 * Password validator
 * Enforces strong password requirements
 */
export const passwordSchema = z
  .string()
  .min(USER_SCHEMA_CONSTRAINTS.PASSWORD_MIN_LENGTH, `Password must be at least ${USER_SCHEMA_CONSTRAINTS.PASSWORD_MIN_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  .refine(
    (password) => !/(.)\1{2,}/.test(password),
    'Password cannot contain more than 2 repeating characters'
  );

/**
 * Optional password validator (for updates)
 */
export const optionalPasswordSchema = passwordSchema.optional();

/**
 * Name validator
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(USER_SCHEMA_CONSTRAINTS.NAME_MAX_LENGTH, `Name must be at most ${USER_SCHEMA_CONSTRAINTS.NAME_MAX_LENGTH} characters`)
  .trim()
  .refine(
    (name) => name.length > 0,
    'Name cannot be empty or only whitespace'
  );

/**
 * Phone number validator
 * Supports international formats (very lenient)
 */
export const phoneSchema = z
  .string()
  .max(USER_SCHEMA_CONSTRAINTS.PHONE_MAX_LENGTH, `Phone must be at most ${USER_SCHEMA_CONSTRAINTS.PHONE_MAX_LENGTH} characters`)
  .regex(
    /^[\+\d\s\-\(\)\.]+$/,
    'Invalid phone number format'
  )
  .refine(
    (phone) => {
      // Must contain at least 7 digits
      const digitsOnly = phone.replace(/\D/g, '');
      return digitsOnly.length >= 7;
    },
    'Phone number must contain at least 7 digits'
  )
  .optional();

/**
 * Job title validator
 */
export const jobTitleSchema = z
  .string()
  .max(USER_SCHEMA_CONSTRAINTS.JOB_TITLE_MAX_LENGTH, `Job title must be at most ${USER_SCHEMA_CONSTRAINTS.JOB_TITLE_MAX_LENGTH} characters`)
  .optional();

/**
 * Department validator
 */
export const departmentSchema = z
  .string()
  .max(USER_SCHEMA_CONSTRAINTS.DEPARTMENT_MAX_LENGTH, `Department must be at most ${USER_SCHEMA_CONSTRAINTS.DEPARTMENT_MAX_LENGTH} characters`)
  .optional();

/**
 * Location validator
 */
export const locationSchema = z
  .string()
  .max(USER_SCHEMA_CONSTRAINTS.LOCATION_MAX_LENGTH, `Location must be at most ${USER_SCHEMA_CONSTRAINTS.LOCATION_MAX_LENGTH} characters`)
  .optional();

/**
 * Bio validator
 */
export const bioSchema = z
  .string()
  .max(USER_SCHEMA_CONSTRAINTS.BIO_MAX_LENGTH, `Bio must be at most ${USER_SCHEMA_CONSTRAINTS.BIO_MAX_LENGTH} characters`)
  .optional();

/**
 * Timezone validator
 * Validates IANA timezone strings
 */
export const timezoneSchema = z
  .string()
  .refine(
    (tz) => {
      try {
        // Test if timezone is valid by creating a date with it
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    'Invalid timezone'
  )
  .optional();

/**
 * UUID validator
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

/**
 * User role validator
 */
export const userRoleSchema = z.nativeEnum(UserRole, {
  errorMap: () => ({ message: 'Invalid user role' }),
});

/**
 * User status validator
 */
export const userStatusSchema = z.nativeEnum(UserStatus, {
  errorMap: () => ({ message: 'Invalid user status' }),
});

/**
 * Reviewer availability validator
 */
export const reviewerAvailabilitySchema = z.nativeEnum(ReviewerAvailability, {
  errorMap: () => ({ message: 'Invalid reviewer availability status' }),
});

/**
 * Specialties validator
 * Array of specialty strings
 */
export const specialtiesSchema = z
  .array(z.string().min(1).max(100))
  .max(20, 'Maximum 20 specialties allowed')
  .optional();

/**
 * Languages validator
 * Array of language strings (ISO 639-1 codes or names)
 */
export const languagesSchema = z
  .array(z.string().min(2).max(50))
  .max(10, 'Maximum 10 languages allowed')
  .optional();

/**
 * Avatar URL validator
 */
export const avatarUrlSchema = z
  .string()
  .url('Invalid avatar URL')
  .optional();

// ============================================================================
// COMPLEX VALIDATORS
// ============================================================================

/**
 * Working hours validator
 * Format: { monday: { start: '09:00', end: '17:00' }, ... }
 */
export const workingHoursSchema = z
  .object({
    monday: z.object({ start: z.string(), end: z.string() }).optional(),
    tuesday: z.object({ start: z.string(), end: z.string() }).optional(),
    wednesday: z.object({ start: z.string(), end: z.string() }).optional(),
    thursday: z.object({ start: z.string(), end: z.string() }).optional(),
    friday: z.object({ start: z.string(), end: z.string() }).optional(),
    saturday: z.object({ start: z.string(), end: z.string() }).optional(),
    sunday: z.object({ start: z.string(), end: z.string() }).optional(),
  })
  .optional();

/**
 * Custom fields validator
 * Allows arbitrary key-value pairs
 */
export const customFieldsSchema = z
  .record(z.string(), z.any())
  .optional();

// ============================================================================
// USER CRUD SCHEMAS
// ============================================================================

/**
 * Create User Schema
 * Validates data for creating a new user
 */
export const createUserSchema = z.object({
  // Required fields
  email: emailSchema,
  name: nameSchema,
  role: userRoleSchema,

  // Optional authentication
  password: passwordSchema.optional(),

  // Optional status
  status: userStatusSchema.optional(),

  // Optional profile fields
  job_title: jobTitleSchema,
  department: departmentSchema,
  location: locationSchema,
  timezone: timezoneSchema,
  phone: phoneSchema,
  manager_id: uuidSchema.optional(),
  bio: bioSchema,
  specialties: specialtiesSchema,
  languages: languagesSchema,
  working_hours: workingHoursSchema,
  custom_fields: customFieldsSchema,

  // Optional reviewer fields
  reviewer_max_workload: z.number().int().min(1).max(100).optional(),
  reviewer_availability: reviewerAvailabilitySchema.optional(),

  // Optional SSO fields
  sso_provider: z.string().max(50).optional(),
  sso_id: z.string().max(255).optional(),

  // Metadata
  created_by: uuidSchema.optional(),
})
  .refine(
    (data) => {
      // If SSO user, password is optional
      // If local user, password is required
      if (!data.sso_provider && !data.password) {
        return false;
      }
      return true;
    },
    {
      message: 'Password is required for non-SSO users',
      path: ['password'],
    }
  )
  .refine(
    (data) => {
      // Reviewer fields only make sense for reviewers
      if (data.role !== UserRole.REVIEWER) {
        if (data.reviewer_max_workload !== undefined || data.reviewer_availability !== undefined) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Reviewer fields can only be set for users with REVIEWER role',
      path: ['role'],
    }
  );

/**
 * Update User Schema
 * Validates data for updating an existing user
 * All fields are optional
 */
export const updateUserSchema = z.object({
  // Basic fields
  email: emailSchema.optional(),
  name: nameSchema.optional(),
  avatar_url: avatarUrlSchema,

  // Profile fields
  job_title: jobTitleSchema,
  department: departmentSchema,
  location: locationSchema,
  timezone: timezoneSchema,
  phone: phoneSchema,
  manager_id: uuidSchema.nullable().optional(),
  bio: bioSchema,
  specialties: specialtiesSchema,
  languages: languagesSchema,
  working_hours: workingHoursSchema,
  custom_fields: customFieldsSchema,

  // Reviewer fields
  reviewer_max_workload: z.number().int().min(1).max(100).optional(),
  reviewer_availability: reviewerAvailabilitySchema.optional(),
  reviewer_availability_until: z.coerce.date().optional(),

  // Metadata
  updated_by: uuidSchema.optional(),
});

/**
 * User ID parameter schema
 */
export const userIdParamSchema = z.object({
  id: uuidSchema,
});

// ============================================================================
// STATUS MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Activate User Schema
 */
export const activateUserSchema = z.object({
  activated_by: uuidSchema.optional(),
  reason: z.string().max(1000).optional(),
});

/**
 * Deactivate User Schema
 */
export const deactivateUserSchema = z.object({
  deactivated_by: uuidSchema.optional(),
  reason: z.string().max(1000).optional(),
});

/**
 * Suspend User Schema
 */
export const suspendUserSchema = z.object({
  suspended_by: uuidSchema.optional(),
  reason: z.string().min(1, 'Reason is required for suspension').max(1000),
  suspend_until: z.coerce.date().optional(),
});

/**
 * Unlock User Schema
 */
export const unlockUserSchema = z.object({
  unlocked_by: uuidSchema.optional(),
});

// ============================================================================
// ROLE MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Change Role Schema
 */
export const changeRoleSchema = z.object({
  new_role: userRoleSchema,
  reason: z.string().min(1, 'Reason is required for role changes').max(1000),
  changed_by: uuidSchema.optional(),
});

/**
 * Grant Permission Schema
 */
export const grantPermissionSchema = z.object({
  permission: z.string().min(1).max(255),
  granted_by: uuidSchema.optional(),
  reason: z.string().min(1, 'Reason is required for permission grants').max(1000),
  expires_at: z.coerce.date().optional(),
  resource_type: z.string().max(100).optional(),
  resource_id: z.string().max(255).optional(),
  context: z.record(z.string(), z.any()).optional(),
});

/**
 * Revoke Permission Schema
 */
export const revokePermissionSchema = z.object({
  revoked_by: uuidSchema.optional(),
  reason: z.string().min(1, 'Reason is required for permission revocations').max(1000),
});

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * User List Query Schema
 */
export const userListQuerySchema = z.object({
  // Filters
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
  department: z.string().optional(),
  manager_id: uuidSchema.optional(),
  reviewer_availability: reviewerAvailabilitySchema.optional(),
  search: z.string().max(255).optional(),
  include_deleted: z.coerce.boolean().optional(),
  sso_provider: z.string().max(50).optional(),

  // Pagination
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),

  // Sorting
  sort_by: z.enum(['name', 'email', 'created_at', 'last_active_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

/**
 * User Activity Log Query Schema
 */
export const userActivityQuerySchema = z.object({
  // Filters
  action: z.string().optional(),
  resource_type: z.string().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),

  // Pagination
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

/**
 * Login Schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional(),
});

/**
 * Password Reset Request Schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Password Reset Schema
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirm_password: z.string().min(1, 'Password confirmation is required'),
}).refine(
  (data) => data.password === data.confirm_password,
  {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  }
);

/**
 * Change Password Schema (for authenticated users)
 */
export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
  confirm_password: z.string().min(1, 'Password confirmation is required'),
}).refine(
  (data) => data.new_password === data.confirm_password,
  {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  }
).refine(
  (data) => data.current_password !== data.new_password,
  {
    message: 'New password must be different from current password',
    path: ['new_password'],
  }
);

// ============================================================================
// INVITATION SCHEMAS
// ============================================================================

/**
 * Send Invitation Schema
 */
export const sendInvitationSchema = z.object({
  email: emailSchema,
  role: userRoleSchema,
  message: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Accept Invitation Schema
 */
export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  password: passwordSchema,
  confirm_password: z.string().min(1, 'Password confirmation is required'),
  name: nameSchema.optional(), // Optional if name is pre-filled from invitation
}).refine(
  (data) => data.password === data.confirm_password,
  {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  }
);

// ============================================================================
// BULK OPERATION SCHEMAS
// ============================================================================

/**
 * Bulk Role Change Schema
 */
export const bulkRoleChangeSchema = z.object({
  user_ids: z.array(uuidSchema).min(1, 'At least one user must be selected').max(100, 'Maximum 100 users per bulk operation'),
  new_role: userRoleSchema,
  reason: z.string().min(1, 'Reason is required for bulk role changes').max(1000),
  changed_by: uuidSchema.optional(),
});

/**
 * Bulk Status Change Schema
 */
export const bulkStatusChangeSchema = z.object({
  user_ids: z.array(uuidSchema).min(1, 'At least one user must be selected').max(100, 'Maximum 100 users per bulk operation'),
  new_status: userStatusSchema,
  reason: z.string().min(1, 'Reason is required for bulk status changes').max(1000),
  changed_by: uuidSchema.optional(),
});

/**
 * Bulk Email Schema
 */
export const bulkEmailSchema = z.object({
  user_ids: z.array(uuidSchema).min(1, 'At least one user must be selected').max(1000, 'Maximum 1000 users per bulk email'),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Email body is required').max(10000),
  sent_by: uuidSchema.optional(),
});

// ============================================================================
// REVIEWER SCHEMAS
// ============================================================================

/**
 * Update Reviewer Availability Schema
 */
export const updateReviewerAvailabilitySchema = z.object({
  availability: reviewerAvailabilitySchema,
  availability_until: z.coerce.date().optional(),
});

/**
 * Delegate Reviewer Schema
 */
export const delegateReviewerSchema = z.object({
  from_reviewer_id: uuidSchema,
  to_reviewer_id: uuidSchema,
  reason: z.string().min(1, 'Reason is required for delegation').max(1000),
  delegated_by: uuidSchema.optional(),
  temporary: z.boolean().optional(),
  delegation_until: z.coerce.date().optional(),
});

/**
 * Update Reviewer Workload Schema
 */
export const updateReviewerWorkloadSchema = z.object({
  max_workload: z.number().int().min(1, 'Workload must be at least 1').max(100, 'Workload cannot exceed 100'),
  updated_by: uuidSchema.optional(),
});

// ============================================================================
// 2FA SCHEMAS
// ============================================================================

/**
 * Enable 2FA Schema
 */
export const enable2FASchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

/**
 * Verify 2FA Schema
 */
export const verify2FASchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

/**
 * Disable 2FA Schema
 */
export const disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required to disable 2FA'),
  code: z.string().length(6, 'Verification code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

// ============================================================================
// IMPORT/EXPORT SCHEMAS
// ============================================================================

/**
 * CSV Import Row Schema
 */
export const csvImportRowSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  role: z.string().transform(val => val.toUpperCase()).pipe(userRoleSchema),
  department: departmentSchema,
  job_title: jobTitleSchema,
  location: locationSchema,
  phone: phoneSchema,
});

/**
 * Import Options Schema
 */
export const importOptionsSchema = z.object({
  dry_run: z.boolean().optional(),
  update_existing: z.boolean().optional(),
  send_invitations: z.boolean().optional(),
  default_status: userStatusSchema.optional(),
});

/**
 * Export Options Schema
 */
export const exportOptionsSchema = z.object({
  fields: z.array(z.string()).optional(),
  format: z.enum(['csv', 'json']).optional(),
  include_deleted: z.boolean().optional(),
});

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validate create user input
 */
export function validateCreateUser(data: unknown) {
  return createUserSchema.safeParse(data);
}

/**
 * Validate update user input
 */
export function validateUpdateUser(data: unknown) {
  return updateUserSchema.safeParse(data);
}

/**
 * Validate email
 */
export function validateEmail(email: string) {
  return emailSchema.safeParse(email);
}

/**
 * Validate password
 */
export function validatePassword(password: string) {
  return passwordSchema.safeParse(password);
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string) {
  return phoneSchema.safeParse(phone);
}

/**
 * Validate UUID
 */
export function validateUUID(id: string) {
  return uuidSchema.safeParse(id);
}

/**
 * Custom validator: Check password strength
 * Returns strength score: 0 (weak) to 4 (very strong)
 */
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 0.5;
  if (/[A-Z]/.test(password)) score += 0.5;
  if (/[0-9]/.test(password)) score += 0.5;
  if (/[^A-Za-z0-9]/.test(password)) score += 0.5;

  // Common patterns to avoid
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Avoid repeating characters');
    score -= 1;
  }

  if (/12345|password|qwerty/i.test(password)) {
    feedback.push('Avoid common patterns');
    score -= 2;
  }

  // Normalize score
  const normalizedScore = Math.max(0, Math.min(4, Math.round(score)));

  // Generate feedback
  if (normalizedScore < 2) {
    feedback.unshift('Password is weak');
  } else if (normalizedScore === 2) {
    feedback.unshift('Password is fair');
  } else if (normalizedScore === 3) {
    feedback.unshift('Password is strong');
  } else {
    feedback.unshift('Password is very strong');
  }

  return {
    score: normalizedScore,
    feedback,
  };
}

/**
 * Custom validator: Check if email is from allowed domain
 */
export function isEmailFromAllowedDomain(email: string, allowedDomains: string[]): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return allowedDomains.map(d => d.toLowerCase()).includes(domain);
}

/**
 * Custom validator: Validate international phone number
 */
export function validateInternationalPhone(phone: string): {
  valid: boolean;
  country?: string;
  formatted?: string;
} {
  // Basic validation - in production, use a library like libphonenumber-js
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  
  if (cleaned.length < 7 || cleaned.length > 15) {
    return { valid: false };
  }

  if (!/^\+?[0-9]+$/.test(cleaned)) {
    return { valid: false };
  }

  return {
    valid: true,
    formatted: cleaned,
  };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type BulkRoleChangeInput = z.infer<typeof bulkRoleChangeSchema>;
export type BulkStatusChangeInput = z.infer<typeof bulkStatusChangeSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;

