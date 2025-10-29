-- ============================================================================
-- Migration: 001 - Create User Management Tables
-- Description: Initial schema for user management system including users,
--              invitations, sessions, activity logs, and extensions to
--              dynamic_permissions and audit_trail tables.
-- Created: 2025-10-10
-- ============================================================================

-- Begin transaction
BEGIN;

-- ============================================================================
-- 1. CREATE USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
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

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_active_at ON users(last_active_at);
CREATE INDEX idx_users_sso_provider_sso_id ON users(sso_provider, sso_id);
CREATE INDEX idx_users_reviewer_availability ON users(reviewer_availability) WHERE role = 'REVIEWER';
CREATE INDEX idx_users_status_role ON users(status, role);

-- ============================================================================
-- 2. CREATE USER INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_invitations (
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

-- Indexes for user_invitations table
CREATE INDEX idx_invitations_token ON user_invitations(token);
CREATE INDEX idx_invitations_email ON user_invitations(email);
CREATE INDEX idx_invitations_status ON user_invitations(status);
CREATE INDEX idx_invitations_invited_by ON user_invitations(invited_by);
CREATE INDEX idx_invitations_expires_at ON user_invitations(expires_at);
CREATE INDEX idx_invitations_invited_at ON user_invitations(invited_at);
CREATE INDEX idx_invitations_status_email ON user_invitations(status, email);

-- ============================================================================
-- 3. CREATE USER SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
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

-- Indexes for user_sessions table
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX idx_sessions_is_active ON user_sessions(is_active);
CREATE INDEX idx_sessions_user_active ON user_sessions(user_id, is_active);
CREATE INDEX idx_sessions_user_expires ON user_sessions(user_id, expires_at);

-- ============================================================================
-- 4. CREATE USER ACTIVITY LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity_log (
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

-- Indexes for user_activity_log table
CREATE INDEX idx_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_activity_created_at ON user_activity_log(created_at);
CREATE INDEX idx_activity_action ON user_activity_log(action);
CREATE INDEX idx_activity_resource_type ON user_activity_log(resource_type);
CREATE INDEX idx_activity_resource_id ON user_activity_log(resource_id);
CREATE INDEX idx_activity_user_created ON user_activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_user_action ON user_activity_log(user_id, action);
CREATE INDEX idx_activity_resource ON user_activity_log(resource_type, resource_id);

-- ============================================================================
-- 5. CREATE OR EXTEND DYNAMIC PERMISSIONS TABLE
-- ============================================================================

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

-- Indexes for dynamic_permissions table
CREATE INDEX idx_dynamic_perms_user_id ON dynamic_permissions(user_id);
CREATE INDEX idx_dynamic_perms_permission ON dynamic_permissions(permission);
CREATE INDEX idx_dynamic_perms_expires_at ON dynamic_permissions(expires_at);
CREATE INDEX idx_dynamic_perms_is_active ON dynamic_permissions(is_active);
CREATE INDEX idx_dynamic_perms_resource ON dynamic_permissions(resource_type, resource_id);
CREATE INDEX idx_dynamic_perms_user_active ON dynamic_permissions(user_id, is_active) WHERE revoked_at IS NULL;
CREATE INDEX idx_dynamic_perms_user_permission ON dynamic_permissions(user_id, permission, is_active);

-- ============================================================================
-- 6. EXTEND AUDIT TRAIL TABLE (if it exists)
-- ============================================================================

-- Note: This section assumes audit_trail table already exists.
-- If it doesn't exist, uncomment the CREATE TABLE statement at the end of this file.

-- Add target_user_id column for user management actions
ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Make product_id nullable since user management actions don't involve products
-- Note: This may fail if there are NOT NULL constraints. Handle manually if needed.
-- ALTER TABLE audit_trail ALTER COLUMN product_id DROP NOT NULL;

-- Add resource_type column to distinguish between different types of audit entries
ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS resource_type VARCHAR(50) DEFAULT 'product';

-- Add resource_id column for generic resource tracking
ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS resource_id VARCHAR(255);

-- Add indexes for user management queries (only if audit_trail exists)
CREATE INDEX IF NOT EXISTS idx_audit_trail_target_user_id ON audit_trail(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource_type ON audit_trail(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource ON audit_trail(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_action ON audit_trail(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_timestamp ON audit_trail(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_target_timestamp ON audit_trail(target_user_id, timestamp DESC);

-- ============================================================================
-- 7. CREATE AUDIT TRAIL TABLE (if it doesn't exist)
-- ============================================================================

-- Uncomment if audit_trail table doesn't exist yet
/*
CREATE TABLE IF NOT EXISTS audit_trail (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor (who performed the action)
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),

  -- Resource being acted upon
  resource_type VARCHAR(50) NOT NULL DEFAULT 'product',
  resource_id VARCHAR(255),

  -- Legacy product-specific fields
  product_id UUID, -- Add REFERENCES products(id) ON DELETE SET NULL if products table exists
  product_state VARCHAR(50),

  -- User management specific field
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Action Details
  action VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Change Details
  field_changes JSONB,
  reason TEXT,
  comment TEXT,

  -- Additional Context
  metadata JSONB
);

-- Indexes for audit_trail table
CREATE INDEX idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_target_user_id ON audit_trail(target_user_id);
CREATE INDEX idx_audit_trail_resource_type ON audit_trail(resource_type);
CREATE INDEX idx_audit_trail_resource_id ON audit_trail(resource_id);
CREATE INDEX idx_audit_trail_product_id ON audit_trail(product_id);
CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp DESC);
CREATE INDEX idx_audit_trail_action ON audit_trail(action);
CREATE INDEX idx_audit_trail_user_timestamp ON audit_trail(user_id, timestamp DESC);
CREATE INDEX idx_audit_trail_target_timestamp ON audit_trail(target_user_id, timestamp DESC);
CREATE INDEX idx_audit_trail_resource ON audit_trail(resource_type, resource_id);
CREATE INDEX idx_audit_trail_user_action ON audit_trail(user_id, action);
*/

-- ============================================================================
-- 8. ADD TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts with comprehensive profile, authentication, and reviewer information';
COMMENT ON TABLE user_invitations IS 'Email invitations for new user onboarding';
COMMENT ON TABLE user_sessions IS 'Active user sessions with device tracking';
COMMENT ON TABLE user_activity_log IS 'Comprehensive user activity logging for security and audit';
COMMENT ON TABLE dynamic_permissions IS 'User-specific permission grants beyond base role permissions';

-- Column comments for documentation
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (nullable for SSO-only users)';
COMMENT ON COLUMN users.deleted_at IS 'Soft delete timestamp (90-day retention period)';
COMMENT ON COLUMN users.reviewer_availability IS 'Current availability status for reviewers';
COMMENT ON COLUMN users.two_factor_secret IS 'TOTP secret for 2FA (encrypted at rest)';
COMMENT ON COLUMN users.backup_codes IS 'Array of backup codes for 2FA recovery (encrypted)';
COMMENT ON COLUMN user_invitations.token IS 'Unique secure token for invitation link (7-day expiration)';
COMMENT ON COLUMN user_sessions.token IS 'Session token (JWT refresh token or session ID)';
COMMENT ON COLUMN dynamic_permissions.expires_at IS 'Optional expiration date for time-limited permissions';

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================

-- After running this migration:
-- 1. Run the seed script (002_seed_initial_admin.sql) to create the first admin user
-- 2. Verify all foreign key relationships are correct
-- 3. Test database constraints and indexes
-- 4. Review and adjust any application code that interacts with audit_trail table
-- 5. Set up automatic cleanup jobs for expired sessions, invitations, and activity logs

