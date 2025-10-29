-- ============================================================================
-- Migration: 002 - Seed Initial Admin User
-- Description: Creates the first admin user account with default credentials
--              and sets up initial system data.
-- Created: 2025-10-10
-- ============================================================================

-- IMPORTANT SECURITY NOTES:
-- 1. Change the password immediately after first login!
-- 2. Enable 2FA for the admin account
-- 3. Consider using environment variables instead of hardcoded values
-- 4. This script should only be run once during initial setup

-- Begin transaction
BEGIN;

-- ============================================================================
-- 1. CREATE INITIAL ADMIN USER
-- ============================================================================

-- Note: The password 'Admin@123456' is hashed using bcrypt (cost factor 12)
-- You should generate your own hash using your application's password service
-- This is just a placeholder hash - REPLACE IT!

INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  role,
  status,
  created_at,
  two_factor_enabled
) VALUES (
  gen_random_uuid(),
  'admin@pimify.local', -- Change this to your actual admin email
  '$2b$12$LQ/8Z7kYHE3h.KRjZG5j6O4TJJzWXCt/AjQ8TJKj7nT9xJ0KqYn5K', -- Placeholder hash for 'Admin@123456'
  'System Administrator',
  'ADMIN',
  'ACTIVE',
  CURRENT_TIMESTAMP,
  false -- Recommend enabling 2FA after first login
)
ON CONFLICT (email) DO NOTHING; -- Skip if admin already exists

-- ============================================================================
-- 2. LOG ADMIN USER CREATION IN ACTIVITY LOG
-- ============================================================================

INSERT INTO user_activity_log (
  user_id,
  action,
  resource_type,
  resource_id,
  metadata,
  created_at
)
SELECT 
  id,
  'USER_CREATED',
  'user',
  id::text,
  jsonb_build_object(
    'created_by', 'system',
    'is_initial_admin', true,
    'notes', 'Initial system administrator created during database seeding'
  ),
  CURRENT_TIMESTAMP
FROM users 
WHERE email = 'admin@pimify.local'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. CREATE DEFAULT USERS FOR TESTING (OPTIONAL - Remove in production)
-- ============================================================================

-- Uncomment the following section if you want test users for development

/*
-- Editor User
INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  role,
  status,
  department,
  created_at
) VALUES (
  gen_random_uuid(),
  'editor@pimify.local',
  '$2b$12$LQ/8Z7kYHE3h.KRjZG5j6O4TJJzWXCt/AjQ8TJKj7nT9xJ0KqYn5K', -- Same placeholder password
  'Test Editor',
  'EDITOR',
  'ACTIVE',
  'Content',
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- Reviewer User
INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  role,
  status,
  department,
  reviewer_max_workload,
  reviewer_availability,
  created_at
) VALUES (
  gen_random_uuid(),
  'reviewer@pimify.local',
  '$2b$12$LQ/8Z7kYHE3h.KRjZG5j6O4TJJzWXCt/AjQ8TJKj7nT9xJ0KqYn5K', -- Same placeholder password
  'Test Reviewer',
  'REVIEWER',
  'ACTIVE',
  'Quality Assurance',
  10,
  'AVAILABLE',
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- Viewer User
INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  role,
  status,
  department,
  created_at
) VALUES (
  gen_random_uuid(),
  'viewer@pimify.local',
  '$2b$12$LQ/8Z7kYHE3h.KRjZG5j6O4TJJzWXCt/AjQ8TJKj7nT9xJ0KqYn5K', -- Same placeholder password
  'Test Viewer',
  'VIEWER',
  'ACTIVE',
  'Operations',
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;
*/

-- ============================================================================
-- 4. SET UP DEFAULT SYSTEM CONFIGURATION (if needed)
-- ============================================================================

-- This section can be extended to include:
-- - Default notification templates
-- - Default quality rules
-- - System settings
-- - Default workflows

-- ============================================================================
-- 5. VERIFY SETUP
-- ============================================================================

-- Display created admin user (for verification)
DO $$
DECLARE
  admin_count INTEGER;
  admin_email TEXT;
BEGIN
  SELECT COUNT(*), MAX(email) INTO admin_count, admin_email
  FROM users 
  WHERE role = 'ADMIN' AND status = 'ACTIVE';
  
  IF admin_count > 0 THEN
    RAISE NOTICE 'Successfully created admin user: %', admin_email;
    RAISE NOTICE 'Total active admin users: %', admin_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'IMPORTANT: Change the default password immediately!';
    RAISE NOTICE 'Email: admin@pimify.local';
    RAISE NOTICE 'Temp Password: Admin@123456';
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING 'No admin users found! Please check the insert statement.';
  END IF;
END $$;

-- ============================================================================
-- COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- POST-SEED INSTRUCTIONS
-- ============================================================================

-- After running this seed script:
-- 
-- 1. IMMEDIATELY LOGIN AND CHANGE PASSWORD
--    - Login with: admin@pimify.local / Admin@123456
--    - Go to Profile Settings
--    - Change password to a strong, unique password
-- 
-- 2. ENABLE TWO-FACTOR AUTHENTICATION
--    - Go to Security Settings
--    - Enable 2FA using Google Authenticator or similar app
-- 
-- 3. UPDATE ADMIN EMAIL
--    - Change admin@pimify.local to your actual email address
-- 
-- 4. CREATE ADDITIONAL USERS
--    - Use the user management interface to create real users
--    - Assign appropriate roles and permissions
-- 
-- 5. CONFIGURE EMAIL SERVICE
--    - Set up email service for invitations and notifications
--    - Test email delivery
-- 
-- 6. REVIEW SECURITY SETTINGS
--    - Configure password policies
--    - Set up session timeouts
--    - Configure failed login lockout settings
-- 
-- 7. SET UP BACKUPS
--    - Configure regular database backups
--    - Test backup restoration process
-- 
-- 8. REMOVE TEST USERS IN PRODUCTION
--    - If you created test users, delete them before going live

