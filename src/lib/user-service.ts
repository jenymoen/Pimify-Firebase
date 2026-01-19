/**
 * User Service
 * 
 * Core user management service providing CRUD operations for users.
 * Handles user creation, reading, updating, and soft deletion with
 * comprehensive validation and audit logging.
 */

import { UserRole, WorkflowState } from '@/types/workflow';
import { userActivityLogger } from './user-activity-logger';
import {
  UsersTable,
  UserStatus,
  ReviewerAvailability,
  USER_SCHEMA_CONSTRAINTS,
  isUserDeleted,
  isUserActive,
  getUserDisplayName,
  getUserInitials,
} from './database-schema';
import { firestoreUserStore } from './firestore-user-repository';
import { auth } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

/**
 * User Create Input
 * Data required to create a new user
 */
export interface CreateUserInput {
  email: string;
  password?: string; // Optional for SSO users
  name: string;
  role: UserRole;
  status?: UserStatus; // Defaults to PENDING

  // Optional profile fields
  job_title?: string;
  department?: string;
  location?: string;
  timezone?: string;
  phone?: string;
  manager_id?: string;
  bio?: string;
  specialties?: string[];
  languages?: string[];
  working_hours?: Record<string, any>;
  custom_fields?: Record<string, any>;

  // Reviewer-specific fields (only for reviewers)
  reviewer_max_workload?: number;
  reviewer_availability?: ReviewerAvailability;

  // SSO fields
  sso_provider?: string;
  sso_id?: string;

  // Metadata
  created_by?: string; // User ID of creator
}

/**
 * User Update Input
 * Data that can be updated for an existing user
 */
export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: UserRole;
  avatar_url?: string;

  // Profile fields
  job_title?: string;
  department?: string;
  location?: string;
  timezone?: string;
  phone?: string;
  manager_id?: string;
  bio?: string;
  specialties?: string[];
  languages?: string[];
  working_hours?: Record<string, any>;
  custom_fields?: Record<string, any>;

  // Reviewer fields (only for reviewers)
  reviewer_max_workload?: number;
  reviewer_availability?: ReviewerAvailability;
  reviewer_availability_until?: Date;

  // Metadata
  updated_by?: string; // User ID of updater
}

/**
 * User Query Filters
 * Filters for searching and filtering users
 */
export interface UserQueryFilters {
  role?: UserRole;
  status?: UserStatus;
  department?: string;
  manager_id?: string;
  reviewer_availability?: ReviewerAvailability;
  search?: string; // Search across name, email
  include_deleted?: boolean; // Include soft-deleted users
  sso_provider?: string;
}

/**
 * User Query Options
 * Options for pagination and sorting
 */
export interface UserQueryOptions {
  limit?: number;
  offset?: number;
  sort_by?: 'name' | 'email' | 'created_at' | 'last_active_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * User Service Result
 * Standard result wrapper for user operations
 */
export interface UserServiceResult<T = UsersTable> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * User List Result
 * Result for list operations with pagination
 */
export interface UserListResult {
  success: boolean;
  data?: UsersTable[];
  total?: number;
  error?: string;
  code?: string;
}

/**
 * User Service Class
 * 
 * Provides CRUD operations for user management.
 * This is a service layer that should be used with a database adapter.
 * 
 * NOTE: This implementation uses a simple in-memory store for demonstration.
 * In production, replace with actual database queries.
 */
export class UserService {
  private static readonly SOFT_DELETE_RETENTION_DAYS = 90;

  constructor() {
    // Attempt to ensure default admin exists on initialization
    this.ensureDefaultAdmin().catch(err => console.error('Error ensuring default admin:', err));
  }

  /**
   * Create a new user
   */
  async create(input: CreateUserInput): Promise<UserServiceResult> {
    try {
      // Validate input
      const validation = this.validateCreateInput(input);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          code: 'VALIDATION_ERROR',
        };
      }

      // Check if email already exists
      const existingUser = await firestoreUserStore.getByEmail(input.email);
      if (existingUser) {
        return {
          success: false,
          error: 'A user with this email already exists',
          code: 'EMAIL_EXISTS',
        };
      }

      // Generate user ID
      const userId = this.generateId();

      // Create user object
      const now = new Date();
      const user: UsersTable = {
        id: userId,
        email: input.email.toLowerCase(),
        password_hash: input.password ? await this.hashPassword(input.password) : null,
        name: input.name,
        avatar_url: null,
        role: input.role,
        status: input.status || UserStatus.PENDING,

        // Profile fields
        job_title: input.job_title || null,
        department: input.department || null,
        location: input.location || null,
        timezone: input.timezone || null,
        phone: input.phone || null,
        manager_id: input.manager_id || null,
        bio: input.bio || null,
        specialties: input.specialties || null,
        languages: input.languages || null,
        working_hours: input.working_hours || null,
        custom_fields: input.custom_fields || null,

        // Reviewer fields
        reviewer_max_workload: input.reviewer_max_workload || USER_SCHEMA_CONSTRAINTS.REVIEWER_DEFAULT_MAX_WORKLOAD,
        reviewer_availability: input.reviewer_availability || (input.role === UserRole.REVIEWER ? ReviewerAvailability.AVAILABLE : null),
        reviewer_availability_until: null,
        reviewer_rating: null,

        // Authentication fields
        two_factor_enabled: false,
        two_factor_secret: null,
        backup_codes: null,
        last_password_change: input.password ? now : null,
        password_history: input.password ? [await this.hashPassword(input.password)] : null,

        // Security fields
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: null,
        last_login_ip: null,
        last_active_at: null,

        // SSO fields
        sso_provider: input.sso_provider || null,
        sso_id: input.sso_id || null,
        sso_linked_at: input.sso_provider ? now : null,

        // Metadata
        created_at: now,
        created_by: input.created_by || null,
        updated_at: null,
        updated_by: null,
        deleted_at: null,
        deleted_by: null,
      };

      // Create user in Firebase Auth if password is provided
      if (input.password) {
        try {
          await createUserWithEmailAndPassword(auth, input.email, input.password);
        } catch (error: any) {
          // If user already exists in Auth but not Firestore, we might have a sync issue,
          // but for now we'll fail to be safe.
          if (error.code !== 'auth/email-already-in-use') {
            return {
              success: false,
              error: `Firebase Auth error: ${error.message}`,
              code: 'AUTH_ERROR',
            };
          }
        }
      }

      // Store user in Firestore
      await firestoreUserStore.save(user);

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create user',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get user by ID
   */
  async getById(userId: string, includeDeleted: boolean = false): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      // Check if user is deleted
      if (isUserDeleted(user) && !includeDeleted) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get user by email
   */
  async getByEmail(email: string, includeDeleted: boolean = false): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getByEmail(email);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      return this.getById(user.id, includeDeleted);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Ensure default admin user exists
   */
  private async ensureDefaultAdmin(): Promise<void> {
    const adminEmail = 'admin@example.com';
    const adminPassword = 'password123';

    // Check if admin exits in Firestore
    const existing = await firestoreUserStore.getByEmail(adminEmail);

    // Always ensure the user exists in Firebase Auth (for development convenience)
    try {
      await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log(`[Firebase Auth] Default admin created in Auth: ${adminEmail}`);
    } catch (error: any) {
      // Ignore if already exists in Auth
      if (error.code !== 'auth/email-already-in-use') {
        console.error('[Firebase Auth] Failed to ensure admin in Auth:', error.code, error.message);
      }
    }

    if (existing) return;

    try {
      // Create default admin in Firestore
      const user: UsersTable = {
        id: (auth.currentUser?.uid) || crypto.randomUUID(), // Use Auth UID if available, else random
        email: adminEmail,
        password_hash: null, // Managed by Firebase Auth
        name: 'System Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        job_title: 'Administrator',
        department: 'IT',
        bio: 'Default system administrator',
        created_at: new Date(),
        updated_at: new Date(),
        failed_login_attempts: 0,
        two_factor_enabled: false,
        avatar_url: null,
        location: null,
        timezone: null,
        phone: null,
        manager_id: null,
        specialties: null,
        languages: null,
        working_hours: null,
        custom_fields: null,
        reviewer_max_workload: 10,
        reviewer_availability: null,
        reviewer_availability_until: null,
        reviewer_rating: null,
        two_factor_secret: null,
        backup_codes: null,
        last_password_change: null,
        password_history: null,
        locked_until: null,
        last_login_at: null,
        last_login_ip: null,
        last_active_at: null,
        sso_provider: null,
        sso_id: null,
        sso_linked_at: null,
        created_by: null,
        updated_by: null,
        deleted_at: null,
        deleted_by: null,
      };

      await firestoreUserStore.save(user);
      console.log(`[Firestore] Default admin user created successfully: ${adminEmail}`);

    } catch (error) {
      console.error('Failed to create default admin user:', error);
    }
  }

  /**
   * List users with optional filters and pagination
   */
  async list(filters?: UserQueryFilters, options?: UserQueryOptions): Promise<UserListResult> {
    try {
      const result = await firestoreUserStore.list(filters || {}, options || {});

      return {
        success: true,
        data: result.data,
        total: result.total,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list users',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Update user
   */
  async update(userId: string, input: UpdateUserInput): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      // Check if user is deleted
      if (isUserDeleted(user)) {
        return {
          success: false,
          error: 'Cannot update deleted user',
          code: 'USER_DELETED',
        };
      }

      // Validate email uniqueness if changing email
      if (input.email && input.email.toLowerCase() !== user.email) {
        const existingUser = await firestoreUserStore.getByEmail(input.email);
        if (existingUser && existingUser.id !== userId) {
          return {
            success: false,
            error: 'A user with this email already exists',
            code: 'EMAIL_EXISTS',
          };
        }
      }

      // Handle role change safely
      if (input.role && input.role !== user.role) {
        const newRole = input.role;
        const changedBy = input.updated_by || 'system'; // Default if not provided

        // Validate role
        if (!Object.values(UserRole).includes(newRole)) {
          return { success: false, error: 'Invalid role', code: 'INVALID_ROLE' };
        }

        // Safeguard 1: Prevent admin from removing own role
        if (user.role === UserRole.ADMIN && newRole !== UserRole.ADMIN && userId === changedBy) {
          return { success: false, error: 'Admins cannot remove their own admin role', code: 'SELF_DEMOTION_NOT_ALLOWED' };
        }

        // Safeguard 2: Require at least 1 active admin
        if (user.role === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
          const activeAdminCount = await this.count({ role: UserRole.ADMIN, status: UserStatus.ACTIVE });
          if (activeAdminCount <= 1) {
            return { success: false, error: 'Cannot demote the last active admin', code: 'LAST_ADMIN' };
          }
        }
      }

      // Update user fields
      const updateData: Partial<UsersTable> = {
        email: input.email?.toLowerCase() || user.email,
        name: input.name || user.name,
        role: input.role || user.role,
        avatar_url: input.avatar_url !== undefined ? input.avatar_url : user.avatar_url,
        job_title: input.job_title !== undefined ? input.job_title : user.job_title,
        department: input.department !== undefined ? input.department : user.department,
        location: input.location !== undefined ? input.location : user.location,
        timezone: input.timezone !== undefined ? input.timezone : user.timezone,
        phone: input.phone !== undefined ? input.phone : user.phone,
        manager_id: input.manager_id !== undefined ? input.manager_id : user.manager_id,
        bio: input.bio !== undefined ? input.bio : user.bio,
        specialties: input.specialties !== undefined ? input.specialties : user.specialties,
        languages: input.languages !== undefined ? input.languages : user.languages,
        working_hours: input.working_hours !== undefined ? input.working_hours : user.working_hours,
        custom_fields: input.custom_fields !== undefined ? input.custom_fields : user.custom_fields,
        reviewer_max_workload: input.reviewer_max_workload !== undefined ? input.reviewer_max_workload : user.reviewer_max_workload,
        reviewer_availability: input.reviewer_availability !== undefined ? input.reviewer_availability : user.reviewer_availability,
        reviewer_availability_until: input.reviewer_availability_until !== undefined ? input.reviewer_availability_until : user.reviewer_availability_until,
        updated_at: new Date(),
        updated_by: input.updated_by || null,
      };

      // Store updated user
      await firestoreUserStore.update(userId, updateData);

      const updatedUser = { ...user, ...updateData };

      // Log profile changes to activity trail (summarized diff)
      try {
        const changedFields: string[] = [];
        const compareKeys: Array<keyof UsersTable> = [
          'email', 'name', 'role', 'avatar_url', 'job_title', 'department', 'location', 'timezone', 'phone', 'manager_id', 'bio', 'specialties', 'languages', 'working_hours', 'custom_fields', 'reviewer_max_workload', 'reviewer_availability', 'reviewer_availability_until'
        ];
        for (const key of compareKeys) {
          const beforeVal = (user as any)[key];
          const afterVal = (updateData as any)[key];
          if (afterVal !== undefined && JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
            changedFields.push(String(key));
          }
        }
        if (changedFields.length > 0) {
          userActivityLogger.log({
            userId: userId,
            action: 'PROFILE_UPDATED',
            description: 'User profile updated',
            metadata: { changedFields },
          });
        }
      } catch { }

      return {
        success: true,
        data: updatedUser,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update user',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Change user role with reason/justification
   * Note: Safeguards (e.g., last admin) will be implemented in 3.9.
   */
  async changeRole(
    userId: string,
    newRole: UserRole,
    changedBy: string,
    reason: string
  ): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);
      if (!user) {
        return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' };
      }
      if (isUserDeleted(user)) {
        return { success: false, error: 'Cannot change role for deleted user', code: 'USER_DELETED' };
      }
      if (!Object.values(UserRole).includes(newRole)) {
        return { success: false, error: 'Invalid role', code: 'INVALID_ROLE' };
      }
      if (!reason || reason.trim().length === 0) {
        return { success: false, error: 'Reason is required for role change', code: 'REASON_REQUIRED' };
      }

      // Safeguard 1: Prevent admin from removing own role
      if (user.role === UserRole.ADMIN && newRole !== UserRole.ADMIN && userId === changedBy) {
        return { success: false, error: 'Admins cannot remove their own admin role', code: 'SELF_DEMOTION_NOT_ALLOWED' };
      }

      // Safeguard 2: Require at least 1 active admin
      if (user.role === UserRole.ADMIN && newRole !== UserRole.ADMIN) {
        const activeAdminCount = await this.count({ role: UserRole.ADMIN, status: UserStatus.ACTIVE });
        if (activeAdminCount <= 1) {
          return { success: false, error: 'Cannot demote the last active admin', code: 'LAST_ADMIN' };
        }
      }

      const updateData: Partial<UsersTable> = {
        role: newRole,
        updated_at: new Date(),
        updated_by: changedBy,
        custom_fields: {
          ...(user.custom_fields || {}),
          role_change_history: [
            {
              from: user.role,
              to: newRole,
              reason,
              changed_by: changedBy,
              changed_at: new Date().toISOString(),
            },
            ...(((user.custom_fields || {}).role_change_history as any[]) || []),
          ],
        },
      };

      await firestoreUserStore.update(userId, updateData);
      return { success: true, data: { ...user, ...updateData } };
    } catch (error) {
      return { success: false, error: 'Failed to change role', code: 'INTERNAL_ERROR' };
    }
  }

  /**
   * Soft delete user
   */
  async delete(userId: string, deletedBy?: string): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      // Check if already deleted
      if (isUserDeleted(user)) {
        return {
          success: false,
          error: 'User is already deleted',
          code: 'USER_ALREADY_DELETED',
        };
      }

      // Soft delete user
      const updateData: Partial<UsersTable> = {
        deleted_at: new Date(),
        deleted_by: deletedBy || null,
        status: UserStatus.INACTIVE,
      };

      // Store updated user
      await firestoreUserStore.update(userId, updateData);

      return {
        success: true,
        data: { ...user, ...updateData },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Anonymize user data (GDPR-style). Keeps the user record for referential integrity
   * but removes personally identifiable information.
   */
  async anonymize(userId: string, anonymizedBy?: string): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);
      if (!user) {
        return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' };
      }

      const anonymizedEmail = `deleted+${user.id}@example.com`;
      const updateData: Partial<UsersTable> = {
        email: anonymizedEmail,
        name: 'Deleted User',
        avatar_url: null,
        phone: null,
        bio: null,
        languages: null,
        specialties: null,
        working_hours: null,
        custom_fields: { ...(user.custom_fields || {}), anonymized: true },
        updated_at: new Date(),
        updated_by: anonymizedBy || null,
      };

      await firestoreUserStore.update(userId, updateData);
      return { success: true, data: { ...user, ...updateData } };
    } catch (error) {
      return { success: false, error: 'Failed to anonymize user', code: 'INTERNAL_ERROR' };
    }
  }

  /**
   * Admin reset password (sets new password hash, updates history and last_password_change)
   */
  async adminResetPassword(userId: string, newPlainPassword: string, resetBy?: string): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);
      if (!user) {
        return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' };
      }
      // Hash new password
      const newHash = await this.hashPassword(newPlainPassword);
      const now = new Date();
      const updateData: Partial<UsersTable> = {
        password_hash: newHash,
        last_password_change: now,
        // Prepend previous hash to history
        password_history: user.password_hash ? [user.password_hash, ...(user.password_history || [])].slice(0, 5) : (user.password_history || []),
        updated_at: now,
        updated_by: resetBy || null,
      };
      await firestoreUserStore.update(userId, updateData);
      return { success: true, data: { ...user, ...updateData } };
    } catch (error) {
      return { success: false, error: 'Failed to reset password', code: 'INTERNAL_ERROR' };
    }
  }

  /**
   * Purge users that have been soft-deleted beyond the retention period
   * Returns number of purged users
   */
  async purgeSoftDeletedBeyondRetention(): Promise<number> {
    let purged = 0;
    const now = Date.now();
    const retentionMs = UserService.SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    // Potentially expensive in Firestore, but sticking to logic
    const { data } = await firestoreUserStore.list({ include_deleted: true }, {});

    for (const user of data) {
      if (user.deleted_at) {
        const age = now - user.deleted_at.getTime();
        if (age > retentionMs) {
          await firestoreUserStore.delete(user.id);
          purged++;
        }
      }
    }
    return purged;
  }

  /**
   * Count users matching filters
   */
  async count(filters?: UserQueryFilters): Promise<number> {
    const result = await this.list(filters, { limit: undefined });
    return result.total || 0;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    const user = await firestoreUserStore.getByEmail(email);
    if (!user) return false;
    if (excludeUserId && user.id === excludeUserId) return false;

    return !isUserDeleted(user);
  }

  // ============================================================================
  // USER STATUS MANAGEMENT
  // ============================================================================

  /**
   * Activate user
   * Changes user status to ACTIVE
   */
  async activate(userId: string, activatedBy?: string, reason?: string): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      // Check if user is deleted
      if (isUserDeleted(user)) {
        return {
          success: false,
          error: 'Cannot activate deleted user',
          code: 'USER_DELETED',
        };
      }

      // Check if already active
      if (user.status === UserStatus.ACTIVE) {
        return {
          success: true,
          data: user,
        };
      }

      const updateData: Partial<UsersTable> = {
        status: UserStatus.ACTIVE,
        locked_until: null,
        failed_login_attempts: 0,
        updated_at: new Date(),
        updated_by: activatedBy || null,
      };

      await firestoreUserStore.update(userId, updateData);

      return {
        success: true,
        data: { ...user, ...updateData },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to activate user',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Deactivate user
   * Changes user status to INACTIVE
   */
  async deactivate(userId: string, deactivatedBy?: string, reason?: string): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      // Check if user is deleted
      if (isUserDeleted(user)) {
        return {
          success: false,
          error: 'Cannot deactivate deleted user',
          code: 'USER_DELETED',
        };
      }

      // Check if already inactive
      if (user.status === UserStatus.INACTIVE) {
        return {
          success: true,
          data: user,
        };
      }

      // Prevent self-deactivation for admins (optional safeguard)
      if (user.role === UserRole.ADMIN && user.id === deactivatedBy) {
        const activeAdminCount = await this.count({
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        });

        if (activeAdminCount <= 1) {
          return {
            success: false,
            error: 'Cannot deactivate the last active admin',
            code: 'LAST_ADMIN',
          };
        }
      }

      const updateData: Partial<UsersTable> = {
        status: UserStatus.INACTIVE,
        updated_at: new Date(),
        updated_by: deactivatedBy || null,
      };

      await firestoreUserStore.update(userId, updateData);

      return {
        success: true,
        data: { ...user, ...updateData },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to deactivate user',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Suspend user
   * Changes user status to SUSPENDED with optional expiration
   */
  async suspend(
    userId: string,
    suspendedBy?: string,
    reason?: string,
    suspendUntil?: Date
  ): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      // Check if user is deleted
      if (isUserDeleted(user)) {
        return {
          success: false,
          error: 'Cannot suspend deleted user',
          code: 'USER_DELETED',
        };
      }

      // Prevent self-suspension for admins
      if (user.role === UserRole.ADMIN && user.id === suspendedBy) {
        return {
          success: false,
          error: 'Admins cannot suspend themselves',
          code: 'SELF_SUSPENSION_NOT_ALLOWED',
        };
      }

      const updateData: Partial<UsersTable> = {
        status: UserStatus.SUSPENDED,
        locked_until: suspendUntil || null,
        updated_at: new Date(),
        updated_by: suspendedBy || null,
      };

      await firestoreUserStore.update(userId, updateData);

      return {
        success: true,
        data: { ...user, ...updateData },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to suspend user',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Unlock user account
   * Unlocks a LOCKED user account and resets failed login attempts
   */
  async unlock(userId: string, unlockedBy?: string): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      // Check if user is deleted
      if (isUserDeleted(user)) {
        return {
          success: false,
          error: 'Cannot unlock deleted user',
          code: 'USER_DELETED',
        };
      }

      // Check if user is locked
      if (user.status !== UserStatus.LOCKED && user.failed_login_attempts === 0) {
        return {
          success: true,
          data: user,
        };
      }

      const updateData: Partial<UsersTable> = {
        status: user.status === UserStatus.LOCKED ? UserStatus.ACTIVE : user.status,
        locked_until: null,
        failed_login_attempts: 0,
        updated_at: new Date(),
        updated_by: unlockedBy || null,
      };

      await firestoreUserStore.update(userId, updateData);

      return {
        success: true,
        data: { ...user, ...updateData },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlock user',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Lock user account
   * Locks a user account due to failed login attempts or security reasons
   */
  async lock(userId: string, lockedBy?: string, reason?: string, lockUntil?: Date): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      // Check if user is deleted
      if (isUserDeleted(user)) {
        return {
          success: false,
          error: 'Cannot lock deleted user',
          code: 'USER_DELETED',
        };
      }

      // Check if already locked
      if (user.status === UserStatus.LOCKED) {
        return {
          success: true,
          data: user,
        };
      }

      // Calculate lock expiration (default 30 minutes)
      const lockExpiration = lockUntil || new Date(Date.now() + USER_SCHEMA_CONSTRAINTS.AUTO_UNLOCK_MINUTES * 60 * 1000);

      const updateData: Partial<UsersTable> = {
        status: UserStatus.LOCKED,
        locked_until: lockExpiration,
        updated_at: new Date(),
        updated_by: lockedBy || null,
      };

      await firestoreUserStore.update(userId, updateData);

      return {
        success: true,
        data: { ...user, ...updateData },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to lock user',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Increment failed login attempts and lock if threshold exceeded
   */
  async incrementFailedLoginAttempts(userId: string): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      const newAttempts = user.failed_login_attempts + 1;
      const shouldLock = newAttempts >= USER_SCHEMA_CONSTRAINTS.MAX_FAILED_LOGIN_ATTEMPTS;

      const updateData: Partial<UsersTable> = {
        failed_login_attempts: newAttempts,
        status: shouldLock ? UserStatus.LOCKED : user.status,
        locked_until: shouldLock
          ? new Date(Date.now() + USER_SCHEMA_CONSTRAINTS.AUTO_UNLOCK_MINUTES * 60 * 1000)
          : user.locked_until,
        updated_at: new Date(),
      };

      await firestoreUserStore.update(userId, updateData);

      return {
        success: true,
        data: { ...user, ...updateData },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to increment failed login attempts',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Reset failed login attempts
   * Called after successful login
   */
  async resetFailedLoginAttempts(userId: string): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      if (user.failed_login_attempts === 0) {
        return {
          success: true,
          data: user,
        };
      }

      const updateData: Partial<UsersTable> = {
        failed_login_attempts: 0,
        updated_at: new Date(),
      };

      await firestoreUserStore.update(userId, updateData);

      return {
        success: true,
        data: { ...user, ...updateData },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset failed login attempts',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Update last login information
   */
  async updateLastLogin(userId: string, ipAddress: string): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      const now = new Date();
      const updateData: Partial<UsersTable> = {
        last_login_at: now,
        last_login_ip: ipAddress,
        last_active_at: now,
        failed_login_attempts: 0,
      };

      await firestoreUserStore.update(userId, updateData);

      return {
        success: true,
        data: { ...user, ...updateData },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update last login',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(userId: string): Promise<UserServiceResult> {
    try {
      const user = await firestoreUserStore.getById(userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        };
      }

      const updateData: Partial<UsersTable> = {
        last_active_at: new Date(),
      };

      await firestoreUserStore.update(userId, updateData);

      return {
        success: true,
        data: { ...user, ...updateData },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update last active',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Validate create input
   */
  private validateCreateInput(input: CreateUserInput): { valid: boolean; error?: string } {
    // Email validation
    if (!input.email || !USER_SCHEMA_CONSTRAINTS.EMAIL_REGEX.test(input.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    if (input.email.length > USER_SCHEMA_CONSTRAINTS.EMAIL_MAX_LENGTH) {
      return { valid: false, error: 'Email is too long' };
    }

    // Name validation
    if (!input.name || input.name.trim().length === 0) {
      return { valid: false, error: 'Name is required' };
    }

    if (input.name.length > USER_SCHEMA_CONSTRAINTS.NAME_MAX_LENGTH) {
      return { valid: false, error: 'Name is too long' };
    }

    // Role validation
    if (!Object.values(UserRole).includes(input.role)) {
      return { valid: false, error: 'Invalid role' };
    }

    // Bio validation
    if (input.bio && input.bio.length > USER_SCHEMA_CONSTRAINTS.BIO_MAX_LENGTH) {
      return { valid: false, error: 'Bio is too long (max 500 characters)' };
    }

    return { valid: true };
  }

  /**
   * Hash password using password service
   */
  private async hashPassword(password: string): Promise<string> {
    const { passwordService } = await import('./password-service');
    return passwordService.hashPassword(password);
  }

  /**
   * Generate unique ID (placeholder - use UUID in production)
   */
  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
// Export singleton instance with global persistence for development
const globalForService = global as unknown as { userService: UserService };

export const userService = globalForService.userService || new UserService();

if (process.env.NODE_ENV !== 'production') {
  globalForService.userService = userService;
}

