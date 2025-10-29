/**
 * Database Schema Definitions for User Management System
 * 
 * This file contains TypeScript type definitions that mirror the database schema.
 * Use these types for type-safe database operations.
 */

import { UserRole, WorkflowState } from '@/types/workflow';

/**
 * User Status Enum
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
  LOCKED = 'LOCKED',
}

/**
 * Reviewer Availability Enum
 */
export enum ReviewerAvailability {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  AWAY = 'AWAY',
  VACATION = 'VACATION',
}

/**
 * Users Table Schema
 * 
 * Main table for storing user accounts with comprehensive profile information,
 * authentication details, and reviewer-specific fields.
 */
export interface UsersTable {
  // Primary Key
  id: string; // UUID

  // Basic Information
  email: string; // UNIQUE, NOT NULL
  password_hash: string | null; // Nullable for SSO users
  name: string; // NOT NULL
  avatar_url: string | null;
  role: UserRole; // NOT NULL (ADMIN, EDITOR, REVIEWER, VIEWER)
  status: UserStatus; // NOT NULL (ACTIVE, INACTIVE, SUSPENDED, PENDING, LOCKED)

  // Extended Profile Information
  job_title: string | null;
  department: string | null;
  location: string | null;
  timezone: string | null;
  phone: string | null;
  manager_id: string | null; // Foreign key to users.id
  bio: string | null; // Max 500 characters
  specialties: string[] | null; // JSONB array of strings
  languages: string[] | null; // JSONB array of strings
  working_hours: Record<string, any> | null; // JSONB
  custom_fields: Record<string, any> | null; // JSONB for admin-defined fields

  // Reviewer-Specific Fields
  reviewer_max_workload: number; // Default: 10
  reviewer_availability: ReviewerAvailability | null;
  reviewer_availability_until: Date | null;
  reviewer_rating: number | null; // Decimal(3,2) - Rating from 0.00 to 5.00

  // Authentication Fields
  two_factor_enabled: boolean; // Default: false
  two_factor_secret: string | null; // Encrypted
  backup_codes: string[] | null; // JSONB encrypted array
  last_password_change: Date | null;
  password_history: string[] | null; // JSONB array of hashed passwords (last 5)

  // Security Fields
  failed_login_attempts: number; // Default: 0
  locked_until: Date | null;
  last_login_at: Date | null;
  last_login_ip: string | null;
  last_active_at: Date | null;

  // SSO Fields
  sso_provider: string | null; // e.g., 'google', 'microsoft', 'saml'
  sso_id: string | null; // External provider user ID
  sso_linked_at: Date | null;

  // Metadata
  created_at: Date; // NOT NULL
  created_by: string | null; // Foreign key to users.id
  updated_at: Date | null;
  updated_by: string | null; // Foreign key to users.id
  deleted_at: Date | null; // Soft delete timestamp
  deleted_by: string | null; // Foreign key to users.id
}

/**
 * SQL Schema Definition for Users Table
 * 
 * Use this SQL to create the users table in PostgreSQL/MySQL/SQLite
 */
export const USERS_TABLE_SQL = `
CREATE TABLE users (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Information
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- Nullable for SSO users
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'EDITOR', 'REVIEWER', 'VIEWER')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'LOCKED')),

  -- Extended Profile Information
  job_title VARCHAR(255),
  department VARCHAR(255),
  location VARCHAR(255),
  timezone VARCHAR(100),
  phone VARCHAR(50),
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bio TEXT,
  specialties JSONB, -- Array of strings
  languages JSONB, -- Array of strings
  working_hours JSONB,
  custom_fields JSONB,

  -- Reviewer-Specific Fields
  reviewer_max_workload INTEGER DEFAULT 10,
  reviewer_availability VARCHAR(50) CHECK (reviewer_availability IN ('AVAILABLE', 'BUSY', 'AWAY', 'VACATION')),
  reviewer_availability_until TIMESTAMP,
  reviewer_rating DECIMAL(3,2) CHECK (reviewer_rating >= 0 AND reviewer_rating <= 5),

  -- Authentication Fields
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT, -- Encrypted
  backup_codes JSONB, -- Encrypted array
  last_password_change TIMESTAMP,
  password_history JSONB, -- Array of hashed passwords

  -- Security Fields
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45), -- IPv6 compatible
  last_active_at TIMESTAMP,

  -- SSO Fields
  sso_provider VARCHAR(50),
  sso_id VARCHAR(255),
  sso_linked_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP, -- Soft delete
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for optimal query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE INDEX idx_users_deleted_at ON users(deleted_at); -- For filtering out deleted users
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_active_at ON users(last_active_at);
CREATE INDEX idx_users_sso_provider_sso_id ON users(sso_provider, sso_id);

-- Partial index for reviewer availability (only for reviewers)
CREATE INDEX idx_users_reviewer_availability ON users(reviewer_availability) WHERE role = 'REVIEWER';

-- Composite index for common queries
CREATE INDEX idx_users_status_role ON users(status, role);
`;

/**
 * Database Schema Constraints and Business Rules
 */
export const USER_SCHEMA_CONSTRAINTS = {
  // Email constraints
  EMAIL_MAX_LENGTH: 255,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Password constraints
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_HISTORY_COUNT: 5,
  BCRYPT_COST_FACTOR: 12,

  // Profile constraints
  NAME_MAX_LENGTH: 255,
  BIO_MAX_LENGTH: 500,
  JOB_TITLE_MAX_LENGTH: 255,
  DEPARTMENT_MAX_LENGTH: 255,
  LOCATION_MAX_LENGTH: 255,
  PHONE_MAX_LENGTH: 50,

  // Reviewer constraints
  REVIEWER_DEFAULT_MAX_WORKLOAD: 10,
  REVIEWER_MIN_RATING: 0,
  REVIEWER_MAX_RATING: 5,

  // Security constraints
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  FAILED_LOGIN_WINDOW_MINUTES: 15,
  AUTO_UNLOCK_MINUTES: 30,
  BACKUP_CODES_COUNT: 10,

  // Session constraints
  SESSION_TIMEOUT_HOURS: 8,
  MAX_CONCURRENT_SESSIONS: 3,
  REMEMBER_ME_DAYS: 30,

  // Data retention
  SOFT_DELETE_RETENTION_DAYS: 90,
  ACTIVITY_LOG_RETENTION_YEARS: 1,
  AUDIT_LOG_RETENTION_YEARS: 2,
} as const;

/**
 * Type guard to check if a user is deleted (soft delete)
 */
export function isUserDeleted(user: Pick<UsersTable, 'deleted_at'>): boolean {
  return user.deleted_at !== null;
}

/**
 * Type guard to check if a user is a reviewer
 */
export function isReviewer(user: Pick<UsersTable, 'role'>): boolean {
  return user.role === UserRole.REVIEWER;
}

/**
 * Type guard to check if a user is active
 */
export function isUserActive(user: Pick<UsersTable, 'status'>): boolean {
  return user.status === UserStatus.ACTIVE;
}

/**
 * Type guard to check if a user account is locked
 */
export function isUserLocked(user: Pick<UsersTable, 'status' | 'locked_until'>): boolean {
  if (user.status === UserStatus.LOCKED) {
    // Check if auto-unlock period has passed
    if (user.locked_until && new Date() > new Date(user.locked_until)) {
      return false; // Auto-unlock period passed
    }
    return true;
  }
  return false;
}

/**
 * Helper to check if user can log in
 */
export function canUserLogin(user: Pick<UsersTable, 'status' | 'locked_until' | 'deleted_at'>): boolean {
  return (
    !isUserDeleted(user) &&
    !isUserLocked(user as any) &&
    (user.status === UserStatus.ACTIVE || user.status === UserStatus.PENDING)
  );
}

/**
 * Helper to get user display name
 */
export function getUserDisplayName(user: Pick<UsersTable, 'name' | 'email' | 'deleted_at'>): string {
  if (isUserDeleted(user)) {
    return 'Deleted User';
  }
  return user.name || user.email;
}

/**
 * Helper to get user initials for avatar
 */
export function getUserInitials(user: Pick<UsersTable, 'name' | 'email'>): string {
  const name = user.name || user.email;
  const parts = name.split(/[\s@]+/).filter(Boolean);
  
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  
  return parts[0] ? parts[0].substring(0, 2).toUpperCase() : '??';
}

// ============================================================================
// USER INVITATIONS TABLE SCHEMA
// ============================================================================

/**
 * Invitation Status Enum
 */
export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/**
 * User Invitations Table Schema
 * 
 * Tracks email invitations sent to new users. Invitations are time-limited
 * and contain a unique token for secure account activation.
 */
export interface UserInvitationsTable {
  // Primary Key
  id: string; // UUID

  // Invitation Details
  email: string; // NOT NULL - Email address of invitee
  token: string; // UNIQUE, NOT NULL - Secure token for invitation link
  role: UserRole; // NOT NULL - Role to be assigned when invitation is accepted

  // Audit Fields
  invited_by: string; // NOT NULL - Foreign key to users.id (who sent the invitation)
  invited_at: Date; // NOT NULL - When invitation was sent
  expires_at: Date; // NOT NULL - When invitation expires (default: 7 days from invited_at)
  accepted_at: Date | null; // When invitation was accepted (null if not accepted)

  // Status
  status: InvitationStatus; // NOT NULL (PENDING, ACCEPTED, EXPIRED, CANCELLED)

  // Additional Metadata
  metadata: Record<string, any> | null; // JSONB - Additional info (department, message, etc.)
}

/**
 * SQL Schema Definition for User Invitations Table
 */
export const USER_INVITATIONS_TABLE_SQL = `
CREATE TABLE user_invitations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Invitation Details
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'EDITOR', 'REVIEWER', 'VIEWER')),

  -- Audit Fields
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),

  -- Additional Metadata
  metadata JSONB
);

-- Indexes for optimal query performance
CREATE INDEX idx_invitations_token ON user_invitations(token);
CREATE INDEX idx_invitations_email ON user_invitations(email);
CREATE INDEX idx_invitations_status ON user_invitations(status);
CREATE INDEX idx_invitations_invited_by ON user_invitations(invited_by);
CREATE INDEX idx_invitations_expires_at ON user_invitations(expires_at);
CREATE INDEX idx_invitations_invited_at ON user_invitations(invited_at);

-- Composite index for common queries
CREATE INDEX idx_invitations_status_email ON user_invitations(status, email);
`;

/**
 * Invitation Schema Constraints
 */
export const INVITATION_SCHEMA_CONSTRAINTS = {
  // Token constraints
  TOKEN_LENGTH: 64, // Length of generated secure token
  TOKEN_EXPIRY_DAYS: 7, // Default expiration period

  // Email constraints
  EMAIL_MAX_LENGTH: 255,

  // Cleanup
  DELETE_EXPIRED_AFTER_DAYS: 30, // Delete expired invitations after 30 days
} as const;

/**
 * Type guard to check if an invitation is expired
 */
export function isInvitationExpired(invitation: Pick<UserInvitationsTable, 'expires_at' | 'status'>): boolean {
  if (invitation.status === InvitationStatus.EXPIRED) {
    return true;
  }
  return new Date() > new Date(invitation.expires_at);
}

/**
 * Type guard to check if an invitation is still valid
 */
export function isInvitationValid(invitation: Pick<UserInvitationsTable, 'status' | 'expires_at'>): boolean {
  return (
    invitation.status === InvitationStatus.PENDING &&
    !isInvitationExpired(invitation)
  );
}

/**
 * Type guard to check if an invitation can be resent
 */
export function canResendInvitation(invitation: Pick<UserInvitationsTable, 'status' | 'expires_at'>): boolean {
  return (
    invitation.status === InvitationStatus.PENDING ||
    invitation.status === InvitationStatus.EXPIRED
  );
}

// ============================================================================
// USER SESSIONS TABLE SCHEMA
// ============================================================================

/**
 * User Sessions Table Schema
 * 
 * Tracks active user sessions for authentication and security monitoring.
 * Supports multiple concurrent sessions per user with device information.
 */
export interface UserSessionsTable {
  // Primary Key
  id: string; // UUID

  // Session Details
  user_id: string; // NOT NULL - Foreign key to users.id
  token: string; // UNIQUE, NOT NULL - Session token (JWT refresh token or session ID)

  // Device Information
  device: string | null; // Device name/type (e.g., "iPhone 13", "Chrome on Windows")
  browser: string | null; // Browser name and version
  ip_address: string | null; // IP address of the session
  location: string | null; // Approximate location (city, country)

  // Session Timing
  created_at: Date; // NOT NULL - When session was created
  last_activity: Date; // NOT NULL - Last activity timestamp
  expires_at: Date; // NOT NULL - When session expires
  is_active: boolean; // Default: true - Whether session is still active
}

/**
 * SQL Schema Definition for User Sessions Table
 */
export const USER_SESSIONS_TABLE_SQL = `
CREATE TABLE user_sessions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session Details
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) UNIQUE NOT NULL,

  -- Device Information
  device VARCHAR(255),
  browser VARCHAR(255),
  ip_address VARCHAR(45), -- IPv6 compatible
  location VARCHAR(255),

  -- Session Timing
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Indexes for optimal query performance
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX idx_sessions_is_active ON user_sessions(is_active);

-- Composite index for common queries
CREATE INDEX idx_sessions_user_active ON user_sessions(user_id, is_active);
CREATE INDEX idx_sessions_user_expires ON user_sessions(user_id, expires_at);
`;

/**
 * Session Schema Constraints
 */
export const SESSION_SCHEMA_CONSTRAINTS = {
  // Session timing
  SESSION_TIMEOUT_HOURS: 8, // Inactivity timeout
  MAX_CONCURRENT_SESSIONS: 3, // Maximum concurrent sessions per user
  REMEMBER_ME_DAYS: 30, // Extended session duration

  // Token constraints
  TOKEN_MAX_LENGTH: 512,

  // Device info constraints
  DEVICE_MAX_LENGTH: 255,
  BROWSER_MAX_LENGTH: 255,
  LOCATION_MAX_LENGTH: 255,

  // Cleanup
  DELETE_EXPIRED_AFTER_DAYS: 7, // Delete expired sessions after 7 days
} as const;

/**
 * Type guard to check if a session is expired
 */
export function isSessionExpired(session: Pick<UserSessionsTable, 'expires_at'>): boolean {
  return new Date() > new Date(session.expires_at);
}

/**
 * Type guard to check if a session is active
 */
export function isSessionActive(session: Pick<UserSessionsTable, 'is_active' | 'expires_at'>): boolean {
  return session.is_active && !isSessionExpired(session);
}

/**
 * Type guard to check if session should be refreshed based on inactivity
 */
export function shouldRefreshSession(session: Pick<UserSessionsTable, 'last_activity'>, inactivityHours: number = 8): boolean {
  const inactivityMs = inactivityHours * 60 * 60 * 1000;
  const timeSinceActivity = Date.now() - new Date(session.last_activity).getTime();
  return timeSinceActivity < inactivityMs;
}

/**
 * Helper to get session device display string
 */
export function getSessionDeviceDisplay(session: Pick<UserSessionsTable, 'device' | 'browser'>): string {
  if (session.device && session.browser) {
    return `${session.browser} on ${session.device}`;
  }
  return session.device || session.browser || 'Unknown Device';
}

// ============================================================================
// USER ACTIVITY LOG TABLE SCHEMA
// ============================================================================

/**
 * Activity Action Types
 */
export enum ActivityAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  TWO_FACTOR_VERIFIED = 'TWO_FACTOR_VERIFIED',
  TWO_FACTOR_FAILED = 'TWO_FACTOR_FAILED',
  
  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_UNLOCKED = 'USER_UNLOCKED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  AVATAR_UPDATED = 'AVATAR_UPDATED',
  
  // Role and Permission Changes
  ROLE_CHANGED = 'ROLE_CHANGED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
  
  // Session Management
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_TERMINATED = 'SESSION_TERMINATED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Account Security
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  SECURITY_ALERT = 'SECURITY_ALERT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  
  // SSO Actions
  SSO_LINKED = 'SSO_LINKED',
  SSO_UNLINKED = 'SSO_UNLINKED',
  SSO_LOGIN = 'SSO_LOGIN',
  
  // Invitation Actions
  INVITATION_SENT = 'INVITATION_SENT',
  INVITATION_ACCEPTED = 'INVITATION_ACCEPTED',
  INVITATION_CANCELLED = 'INVITATION_CANCELLED',
  
  // API Access
  API_ACCESS = 'API_ACCESS',
  API_ERROR = 'API_ERROR',
  API_RATE_LIMIT_EXCEEDED = 'API_RATE_LIMIT_EXCEEDED',
  
  // Data Operations
  DATA_EXPORTED = 'DATA_EXPORTED',
  DATA_IMPORTED = 'DATA_IMPORTED',
  BULK_OPERATION = 'BULK_OPERATION',
}

/**
 * User Activity Log Table Schema
 * 
 * Comprehensive logging of all user activities for security monitoring,
 * audit compliance, and debugging purposes.
 */
export interface UserActivityLogTable {
  // Primary Key
  id: string; // UUID

  // Activity Details
  user_id: string; // NOT NULL - Foreign key to users.id
  action: ActivityAction | string; // NOT NULL - Action performed
  resource_type: string | null; // Type of resource affected (e.g., 'user', 'product', 'workflow')
  resource_id: string | null; // ID of the affected resource

  // Request Details
  ip_address: string | null; // IP address of the request
  user_agent: string | null; // Browser/client user agent string

  // Additional Context
  metadata: Record<string, any> | null; // JSONB - Additional context data

  // Timestamp
  created_at: Date; // NOT NULL - When the activity occurred
}

/**
 * SQL Schema Definition for User Activity Log Table
 */
export const USER_ACTIVITY_LOG_TABLE_SQL = `
CREATE TABLE user_activity_log (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Activity Details
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),

  -- Request Details
  ip_address VARCHAR(45), -- IPv6 compatible
  user_agent TEXT,

  -- Additional Context
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal query performance
CREATE INDEX idx_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_activity_created_at ON user_activity_log(created_at);
CREATE INDEX idx_activity_action ON user_activity_log(action);
CREATE INDEX idx_activity_resource_type ON user_activity_log(resource_type);
CREATE INDEX idx_activity_resource_id ON user_activity_log(resource_id);

-- Composite indexes for common queries
CREATE INDEX idx_activity_user_created ON user_activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_user_action ON user_activity_log(user_id, action);
CREATE INDEX idx_activity_resource ON user_activity_log(resource_type, resource_id);
`;

/**
 * Activity Log Schema Constraints
 */
export const ACTIVITY_LOG_SCHEMA_CONSTRAINTS = {
  // Action constraints
  ACTION_MAX_LENGTH: 100,
  RESOURCE_TYPE_MAX_LENGTH: 100,
  RESOURCE_ID_MAX_LENGTH: 255,

  // Data retention
  RETENTION_DAYS: 365, // 1 year retention
  ARCHIVE_AFTER_DAYS: 90, // Archive old logs after 90 days

  // Batch processing
  BATCH_INSERT_SIZE: 1000, // Insert logs in batches
} as const;

/**
 * Type guard to check if action is security-related
 */
export function isSecurityAction(action: ActivityAction | string): boolean {
  const securityActions: string[] = [
    ActivityAction.LOGIN_FAILED,
    ActivityAction.TWO_FACTOR_FAILED,
    ActivityAction.ACCOUNT_LOCKED,
    ActivityAction.SECURITY_ALERT,
    ActivityAction.SUSPICIOUS_ACTIVITY,
    ActivityAction.PASSWORD_CHANGED,
    ActivityAction.PERMISSION_GRANTED,
    ActivityAction.PERMISSION_REVOKED,
    ActivityAction.ROLE_CHANGED,
    ActivityAction.API_RATE_LIMIT_EXCEEDED,
  ];
  return securityActions.includes(action as string);
}

/**
 * Type guard to check if action is authentication-related
 */
export function isAuthenticationAction(action: ActivityAction | string): boolean {
  const authActions: string[] = [
    ActivityAction.LOGIN,
    ActivityAction.LOGOUT,
    ActivityAction.LOGIN_FAILED,
    ActivityAction.TWO_FACTOR_VERIFIED,
    ActivityAction.TWO_FACTOR_FAILED,
    ActivityAction.SSO_LOGIN,
  ];
  return authActions.includes(action as string);
}

/**
 * Helper to format activity log entry for display
 */
export function formatActivityLogEntry(log: Pick<UserActivityLogTable, 'action' | 'created_at' | 'metadata'>): string {
  const action = log.action.toLowerCase().replace(/_/g, ' ');
  const date = new Date(log.created_at).toLocaleString();
  return `${action} at ${date}`;
}

// ============================================================================
// DYNAMIC PERMISSIONS TABLE SCHEMA (EXTENSION)
// ============================================================================

/**
 * Dynamic Permissions Table Schema
 * 
 * Stores user-specific permission grants beyond their base role permissions.
 * Integrates with existing dynamic-permissions.ts implementation.
 * 
 * This extends the existing dynamic permissions system to support database persistence.
 */
export interface DynamicPermissionsTable {
  // Primary Key
  id: string; // UUID

  // Permission Assignment
  user_id: string; // NOT NULL - Foreign key to users.id
  permission: string; // NOT NULL - Permission being granted (e.g., 'products:export')
  
  // Grant Details
  granted_by: string; // NOT NULL - Foreign key to users.id (who granted this permission)
  granted_at: Date; // NOT NULL - When permission was granted
  expires_at: Date | null; // Optional expiration date
  reason: string; // NOT NULL - Reason for granting permission
  
  // Context (for resource-specific or contextual permissions)
  resource_type: string | null; // Type of resource (e.g., 'product', 'category')
  resource_id: string | null; // Specific resource ID
  user_role: UserRole | null; // Optional: Role context for this permission
  context: Record<string, any> | null; // JSONB - Additional context

  // Revocation Tracking
  revoked_at: Date | null; // When permission was revoked (null if active)
  revoked_by: string | null; // Foreign key to users.id (who revoked this permission)
  revocation_reason: string | null; // Reason for revocation

  // Status
  is_active: boolean; // Default: true - Whether permission is currently active
}

/**
 * SQL Schema Definition for Dynamic Permissions Table
 * 
 * Note: This may already exist in your database. If so, use ALTER TABLE statements
 * to add any missing columns needed for user management integration.
 */
export const DYNAMIC_PERMISSIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS dynamic_permissions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Permission Assignment
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(255) NOT NULL,

  -- Grant Details
  granted_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  reason TEXT NOT NULL,

  -- Context
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  user_role VARCHAR(50) CHECK (user_role IN ('ADMIN', 'EDITOR', 'REVIEWER', 'VIEWER')),
  context JSONB,

  -- Revocation Tracking
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  revocation_reason TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true
);

-- Indexes for optimal query performance
CREATE INDEX idx_dynamic_perms_user_id ON dynamic_permissions(user_id);
CREATE INDEX idx_dynamic_perms_permission ON dynamic_permissions(permission);
CREATE INDEX idx_dynamic_perms_expires_at ON dynamic_permissions(expires_at);
CREATE INDEX idx_dynamic_perms_is_active ON dynamic_permissions(is_active);
CREATE INDEX idx_dynamic_perms_resource ON dynamic_permissions(resource_type, resource_id);

-- Composite indexes for common queries
CREATE INDEX idx_dynamic_perms_user_active ON dynamic_permissions(user_id, is_active) WHERE revoked_at IS NULL;
CREATE INDEX idx_dynamic_perms_user_permission ON dynamic_permissions(user_id, permission, is_active);
`;

/**
 * SQL for extending existing dynamic_permissions table (if it already exists)
 * Use these ALTER statements if you already have a dynamic_permissions table.
 */
export const EXTEND_DYNAMIC_PERMISSIONS_TABLE_SQL = `
-- Add user_id column if not exists (link permissions to users)
ALTER TABLE dynamic_permissions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add user_role column for role-based permissions
ALTER TABLE dynamic_permissions ADD COLUMN IF NOT EXISTS user_role VARCHAR(50) CHECK (user_role IN ('ADMIN', 'EDITOR', 'REVIEWER', 'VIEWER'));

-- Add revocation tracking columns
ALTER TABLE dynamic_permissions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;
ALTER TABLE dynamic_permissions ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE dynamic_permissions ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

-- Add is_active column for quick filtering
ALTER TABLE dynamic_permissions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add additional indexes
CREATE INDEX IF NOT EXISTS idx_dynamic_perms_user_active ON dynamic_permissions(user_id, is_active) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dynamic_perms_user_permission ON dynamic_permissions(user_id, permission, is_active);
`;

/**
 * Dynamic Permissions Schema Constraints
 */
export const DYNAMIC_PERMISSIONS_SCHEMA_CONSTRAINTS = {
  // Permission constraints
  PERMISSION_MAX_LENGTH: 255,
  REASON_MAX_LENGTH: 1000,
  RESOURCE_TYPE_MAX_LENGTH: 100,
  RESOURCE_ID_MAX_LENGTH: 255,

  // Auto-cleanup
  DELETE_EXPIRED_AFTER_DAYS: 90, // Delete expired permissions after 90 days
  DELETE_REVOKED_AFTER_DAYS: 365, // Delete revoked permissions after 1 year
} as const;

/**
 * Type guard to check if a dynamic permission is expired
 */
export function isDynamicPermissionExpired(permission: Pick<DynamicPermissionsTable, 'expires_at'>): boolean {
  if (!permission.expires_at) return false;
  return new Date() > new Date(permission.expires_at);
}

/**
 * Type guard to check if a dynamic permission is active
 */
export function isDynamicPermissionActive(permission: Pick<DynamicPermissionsTable, 'is_active' | 'expires_at' | 'revoked_at'>): boolean {
  return (
    permission.is_active &&
    !permission.revoked_at &&
    !isDynamicPermissionExpired(permission)
  );
}

/**
 * Helper to check if permission applies to specific context
 */
export function permissionMatchesContext(
  permission: Pick<DynamicPermissionsTable, 'resource_type' | 'resource_id' | 'user_role'>,
  context: { resourceType?: string; resourceId?: string; userRole?: UserRole }
): boolean {
  // If permission has resource restrictions, check if they match
  if (permission.resource_type && permission.resource_type !== context.resourceType) {
    return false;
  }
  
  if (permission.resource_id && permission.resource_id !== context.resourceId) {
    return false;
  }
  
  if (permission.user_role && permission.user_role !== context.userRole) {
    return false;
  }
  
  return true;
}

// ============================================================================
// AUDIT TRAIL TABLE SCHEMA (EXTENSION FOR USER MANAGEMENT)
// ============================================================================

/**
 * Extended Audit Trail Table Schema
 * 
 * Extends the existing audit_trail table to support user management actions
 * in addition to product/workflow actions.
 * 
 * The existing audit_trail tracks product changes. This extension adds support
 * for tracking user-related actions (user creation, role changes, etc.)
 */

/**
 * User-Related Action Types for Audit Trail
 * These are added to the existing WorkflowAction enum
 */
export enum UserAuditAction {
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_UNLOCKED = 'USER_UNLOCKED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_PERMISSION_GRANTED = 'USER_PERMISSION_GRANTED',
  USER_PERMISSION_REVOKED = 'USER_PERMISSION_REVOKED',
  USER_PASSWORD_CHANGED = 'USER_PASSWORD_CHANGED',
  USER_2FA_ENABLED = 'USER_2FA_ENABLED',
  USER_2FA_DISABLED = 'USER_2FA_DISABLED',
  USER_INVITATION_SENT = 'USER_INVITATION_SENT',
  USER_INVITATION_ACCEPTED = 'USER_INVITATION_ACCEPTED',
  USER_SSO_LINKED = 'USER_SSO_LINKED',
  USER_SSO_UNLINKED = 'USER_SSO_UNLINKED',
}

/**
 * SQL for extending existing audit_trail table with user-related columns
 * 
 * Note: Assumes existing audit_trail table has these columns:
 * - id (UUID PRIMARY KEY)
 * - product_id (UUID) - For product-related actions
 * - user_id (UUID) - User who performed the action
 * - action (VARCHAR) - Action performed
 * - timestamp (TIMESTAMP)
 * - field_changes (JSONB)
 * - reason (TEXT)
 * - comment (TEXT)
 * - product_state (VARCHAR)
 * - metadata (JSONB)
 */
export const EXTEND_AUDIT_TRAIL_TABLE_SQL = `
-- Add target_user_id column for user management actions
-- This tracks the user being acted upon (e.g., user being created, updated, deleted)
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Make product_id nullable since user management actions don't involve products
ALTER TABLE audit_trail ALTER COLUMN product_id DROP NOT NULL;

-- Add resource_type column to distinguish between different types of audit entries
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50) DEFAULT 'product';

-- Add resource_id column for generic resource tracking
ALTER TABLE audit_trail ADD COLUMN IF NOT EXISTS resource_id VARCHAR(255);

-- Update action column to support user-related actions (if it's an enum, you may need to add values)
-- For VARCHAR columns, this is handled by the application layer

-- Add indexes for user management queries
CREATE INDEX IF NOT EXISTS idx_audit_trail_target_user_id ON audit_trail(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource_type ON audit_trail(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource ON audit_trail(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_action ON audit_trail(user_id, action);

-- Composite index for user-specific audit queries
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_timestamp ON audit_trail(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_target_timestamp ON audit_trail(target_user_id, timestamp DESC);

-- Comments for documentation
COMMENT ON COLUMN audit_trail.target_user_id IS 'User ID of the user being acted upon (for user management actions)';
COMMENT ON COLUMN audit_trail.resource_type IS 'Type of resource: product, user, workflow, notification, etc.';
COMMENT ON COLUMN audit_trail.resource_id IS 'Generic resource identifier (can be product_id, user_id, etc.)';
`;

/**
 * Complete Audit Trail Table Schema (if creating from scratch)
 * This includes both product and user management tracking
 */
export const AUDIT_TRAIL_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS audit_trail (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor (who performed the action)
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255), -- Cached for display, in case user is deleted

  -- Resource being acted upon
  resource_type VARCHAR(50) NOT NULL DEFAULT 'product', -- 'product', 'user', 'workflow', 'permission', etc.
  resource_id VARCHAR(255), -- Generic resource ID

  -- Legacy product-specific fields (kept for backward compatibility)
  product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- NULL for non-product actions
  product_state VARCHAR(50), -- Workflow state after the action

  -- User management specific field
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- For actions on users

  -- Action Details
  action VARCHAR(100) NOT NULL, -- Action performed (from WorkflowAction or UserAuditAction)
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Change Details
  field_changes JSONB, -- Array of field changes with old/new values
  reason TEXT, -- Reason for the action
  comment TEXT, -- Additional comments

  -- Additional Context
  metadata JSONB -- Additional context data
);

-- Indexes for optimal query performance
CREATE INDEX idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_target_user_id ON audit_trail(target_user_id);
CREATE INDEX idx_audit_trail_resource_type ON audit_trail(resource_type);
CREATE INDEX idx_audit_trail_resource_id ON audit_trail(resource_id);
CREATE INDEX idx_audit_trail_product_id ON audit_trail(product_id);
CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX idx_audit_trail_action ON audit_trail(action);

-- Composite indexes for common queries
CREATE INDEX idx_audit_trail_user_timestamp ON audit_trail(user_id, timestamp DESC);
CREATE INDEX idx_audit_trail_target_timestamp ON audit_trail(target_user_id, timestamp DESC);
CREATE INDEX idx_audit_trail_resource ON audit_trail(resource_type, resource_id);
CREATE INDEX idx_audit_trail_user_action ON audit_trail(user_id, action);
`;

/**
 * Audit Trail Schema Constraints
 */
export const AUDIT_TRAIL_SCHEMA_CONSTRAINTS = {
  // Action constraints
  ACTION_MAX_LENGTH: 100,
  RESOURCE_TYPE_MAX_LENGTH: 50,
  RESOURCE_ID_MAX_LENGTH: 255,

  // Data retention
  RETENTION_YEARS: 2, // Minimum 2 years as per PRD
  ARCHIVE_AFTER_YEARS: 1, // Archive after 1 year to separate storage

  // Query limits
  MAX_RESULTS_PER_QUERY: 1000,
} as const;

/**
 * Helper to determine resource type from context
 */
export function getAuditResourceType(action: string): 'product' | 'user' | 'workflow' | 'permission' | 'system' {
  if (action.startsWith('USER_') || Object.values(UserAuditAction).includes(action as UserAuditAction)) {
    return 'user';
  }
  if (action.includes('PERMISSION')) {
    return 'permission';
  }
  if (action.includes('WORKFLOW') || action.includes('STATE')) {
    return 'workflow';
  }
  return 'product';
}

/**
 * Type guard to check if audit entry is user-related
 */
export function isUserAuditAction(action: string): boolean {
  return Object.values(UserAuditAction).includes(action as UserAuditAction);
}
