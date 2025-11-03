/**
 * User Management Configuration
 * 
 * Centralized configuration for user management system including password policies,
 * session timeouts, rate limits, and file upload limits.
 */

/**
 * Password Policy Configuration
 */
export const passwordPolicy = {
	/**
	 * Minimum password length
	 */
	minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),

	/**
	 * Require uppercase letters
	 */
	requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',

	/**
	 * Require lowercase letters
	 */
	requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',

	/**
	 * Require numbers
	 */
	requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',

	/**
	 * Require special characters
	 */
	requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false',

	/**
	 * Maximum password age in days (0 = no expiration)
	 */
	maxAgeDays: parseInt(process.env.PASSWORD_MAX_AGE_DAYS || '90'),

	/**
	 * Prevent password reuse (number of previous passwords to check)
	 */
	preventReuse: parseInt(process.env.PASSWORD_PREVENT_REUSE || '5'),

	/**
	 * Common passwords to block
	 */
	blockedPasswords: [
		'password',
		'password123',
		'12345678',
		'qwerty',
		'abc123',
		'admin',
		'letmein',
	],
}

/**
 * Session Configuration
 */
export const sessionConfig = {
	/**
	 * Session timeout in minutes
	 */
	timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '60'),

	/**
	 * Maximum concurrent sessions per user
	 */
	maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5'),

	/**
	 * Inactivity timeout in minutes (0 = no inactivity timeout)
	 */
	inactivityTimeoutMinutes: parseInt(process.env.SESSION_INACTIVITY_TIMEOUT_MINUTES || '30'),

	/**
	 * Auto-refresh session on activity
	 */
	autoRefresh: process.env.SESSION_AUTO_REFRESH !== 'false',
}

/**
 * Account Security Configuration
 */
export const accountSecurity = {
	/**
	 * Maximum failed login attempts before lockout
	 */
	maxFailedAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5'),

	/**
	 * Account lockout duration in minutes
	 */
	lockoutDurationMinutes: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION_MINUTES || '15'),

	/**
	 * Auto-unlock account after duration (minutes)
	 */
	autoUnlockAfterMinutes: parseInt(process.env.ACCOUNT_AUTO_UNLOCK_MINUTES || '30'),

	/**
	 * Require email verification for new accounts
	 */
	requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION !== 'false',

	/**
	 * Require password change on first login
	 */
	requirePasswordChangeOnFirstLogin: process.env.REQUIRE_PASSWORD_CHANGE_ON_FIRST_LOGIN === 'true',
}

/**
 * Rate Limiting Configuration
 */
export const rateLimits = {
	/**
	 * Enable rate limiting
	 */
	enabled: process.env.RATE_LIMIT_ENABLED !== 'false',

	/**
	 * Rate limit window in milliseconds
	 */
	windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),

	/**
	 * Maximum requests per window (general API)
	 */
	maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),

	/**
	 * Login endpoint rate limit
	 */
	login: parseInt(process.env.API_RATE_LIMIT_LOGIN || '5'),

	/**
	 * Password reset endpoint rate limit
	 */
	passwordReset: parseInt(process.env.API_RATE_LIMIT_PASSWORD_RESET || '3'),

	/**
	 * Registration endpoint rate limit
	 */
	registration: parseInt(process.env.API_RATE_LIMIT_REGISTRATION || '2'),

	/**
	 * Invitation endpoint rate limit
	 */
	invitations: parseInt(process.env.API_RATE_LIMIT_INVITATIONS || '10'),

	/**
	 * User creation endpoint rate limit (admin only)
	 */
	userCreation: parseInt(process.env.API_RATE_LIMIT_USER_CREATION || '20'),
}

/**
 * File Upload Configuration
 */
export const fileUpload = {
	/**
	 * Maximum file size in MB
	 */
	maxSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10'),

	/**
	 * Maximum file size in bytes
	 */
	maxSizeBytes: parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024,

	/**
	 * Allowed file types (comma-separated)
	 */
	allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx,csv').split(','),

	/**
	 * Allowed MIME types
	 */
	allowedMimeTypes: [
		'image/jpeg',
		'image/png',
		'image/gif',
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'text/csv',
	],
}

/**
 * Invitation Configuration
 */
export const invitationConfig = {
	/**
	 * Default invitation expiration in days
	 */
	defaultExpirationDays: parseInt(process.env.INVITATION_EXPIRATION_DAYS || '7'),

	/**
	 * Maximum invitation expiration in days
	 */
	maxExpirationDays: parseInt(process.env.INVITATION_MAX_EXPIRATION_DAYS || '30'),

	/**
	 * Require admin approval for invitations
	 */
	requireApproval: process.env.INVITATION_REQUIRE_APPROVAL === 'true',
}

/**
 * Reviewer Configuration
 */
export const reviewerConfig = {
	/**
	 * Default maximum workload per reviewer
	 */
	defaultMaxWorkload: parseInt(process.env.REVIEWER_DEFAULT_MAX_WORKLOAD || '10'),

	/**
	 * Maximum workload cap
	 */
	maxWorkloadCap: parseInt(process.env.REVIEWER_MAX_WORKLOAD_CAP || '50'),

	/**
	 * Workload threshold for "over capacity" warning (percentage)
	 */
	overCapacityThreshold: parseInt(process.env.REVIEWER_OVER_CAPACITY_THRESHOLD || '80'),

	/**
	 * Auto-assignment algorithm (WORKLOAD, PERFORMANCE, SPECIALTY, DEPARTMENT, ROUND_ROBIN)
	 */
	autoAssignmentAlgorithm: (process.env.REVIEWER_AUTO_ASSIGNMENT_ALGORITHM || 'WORKLOAD') as
		| 'WORKLOAD'
		| 'PERFORMANCE'
		| 'SPECIALTY'
		| 'DEPARTMENT'
		| 'ROUND_ROBIN',
}

/**
 * User Import/Export Configuration
 */
export const importExportConfig = {
	/**
	 * Maximum batch size for bulk imports
	 */
	maxBatchSize: parseInt(process.env.USER_IMPORT_MAX_BATCH_SIZE || '100'),

	/**
	 * Maximum file size for CSV imports (MB)
	 */
	maxImportFileSizeMB: parseInt(process.env.USER_IMPORT_MAX_FILE_SIZE_MB || '5'),

	/**
	 * Enable async processing for large imports
	 */
	asyncProcessing: process.env.USER_IMPORT_ASYNC_PROCESSING !== 'false',
}

/**
 * Feature Flags
 */
export const featureFlags = {
	/**
	 * Enable user registration
	 */
	enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',

	/**
	 * Enable invitations
	 */
	enableInvitations: process.env.ENABLE_INVITATIONS !== 'false',

	/**
	 * Enable two-factor authentication
	 */
	enable2FA: process.env.ENABLE_2FA !== 'false',

	/**
	 * Enable SSO
	 */
	enableSSO: process.env.ENABLE_SSO === 'true',

	/**
	 * Enable LDAP
	 */
	enableLDAP: process.env.ENABLE_LDAP === 'true',

	/**
	 * Enable avatar uploads
	 */
	enableAvatars: process.env.ENABLE_AVATARS !== 'false',
}

/**
 * Audit Trail Configuration
 */
export const auditTrailConfig = {
	/**
	 * Enable audit trail
	 */
	enabled: process.env.AUDIT_TRAIL_ENABLED !== 'false',

	/**
	 * Retention period in days
	 */
	retentionDays: parseInt(process.env.AUDIT_TRAIL_RETENTION_DAYS || '365'),

	/**
	 * Log user login events
	 */
	logLoginEvents: process.env.AUDIT_TRAIL_LOG_LOGINS !== 'false',

	/**
	 * Log permission changes
	 */
	logPermissionChanges: process.env.AUDIT_TRAIL_LOG_PERMISSIONS !== 'false',
}

/**
 * Export all configuration
 */
export const userManagementConfig = {
	passwordPolicy,
	sessionConfig,
	accountSecurity,
	rateLimits,
	fileUpload,
	invitationConfig,
	reviewerConfig,
	importExportConfig,
	featureFlags,
	auditTrailConfig,
}

export default userManagementConfig

