# Product Requirements Document: User Management System

## Introduction/Overview

The User Management System is a comprehensive solution for managing users, roles, and permissions within the Pimify workflow and approval system. This system addresses the critical need for centralized user administration, role-based access control, and complete user lifecycle management to support the existing reviewer assignment and workflow approval functionalities.

**Problem Statement:** The current system has role-based permissions and reviewer assignment features, but lacks a proper user management interface to create, manage, and maintain user accounts. Without a user management system, administrators cannot effectively onboard new users, assign roles, manage reviewer workloads, or track user activities.

**Goal:** Implement a comprehensive user management system that provides administrators with complete control over user accounts, roles, permissions, and lifecycle management while ensuring security, audit compliance, and seamless integration with the existing workflow system.

## Goals

1. **User Lifecycle Management:** Enable complete user lifecycle from onboarding to offboarding
2. **Role & Permission Control:** Provide granular role assignment and custom permission management
3. **Reviewer Management:** Optimize reviewer assignment with workload tracking and availability management
4. **Security & Compliance:** Implement robust security measures and comprehensive audit trails
5. **Operational Efficiency:** Enable bulk operations and automated workflows for user management
6. **Integration:** Seamlessly integrate with existing workflow system and external authentication providers
7. **Scalability:** Support 10-1,000+ users efficiently with fast search and filtering capabilities

## User Stories

### Admin Users
- As an Admin, I want to create new user accounts so that I can onboard team members
- As an Admin, I want to send invitation emails to new users so they can set up their own accounts securely
- As an Admin, I want to assign and modify user roles so that I can control access levels
- As an Admin, I want to assign custom permissions to users so that I can grant specific capabilities beyond their role
- As an Admin, I want to view all users in a searchable list so that I can quickly find and manage specific users
- As an Admin, I want to filter users by role, status, and department so that I can manage user groups efficiently
- As an Admin, I want to deactivate or suspend user accounts so that I can revoke access when needed
- As an Admin, I want to perform bulk operations on multiple users so that I can manage users efficiently
- As an Admin, I want to view user activity logs so that I can monitor system usage and security
- As an Admin, I want to configure reviewer workloads so that I can balance review assignments
- As an Admin, I want to integrate with SSO providers so that users can authenticate with existing credentials
- As an Admin, I want to export user data so that I can generate reports and maintain compliance

### Reviewer Users
- As a Reviewer, I want to update my profile information so that my details are current
- As a Reviewer, I want to set my availability status so that I don't receive assignments when I'm unavailable
- As a Reviewer, I want to view my current workload so that I can manage my review assignments
- As a Reviewer, I want to set my specialties/expertise so that I receive relevant product assignments
- As a Reviewer, I want to delegate my assignments when I'm on vacation so that reviews continue without delays

### Editor Users
- As an Editor, I want to update my profile information so that my contact details are accurate
- As an Editor, I want to view available reviewers so that I can understand who will review my submissions
- As an Editor, I want to see my team members so that I can collaborate effectively

### All Users
- As a User, I want to log in securely with my email and password so that my account is protected
- As a User, I want to use SSO (Google, Microsoft) to log in so that I can use my existing corporate credentials
- As a User, I want to enable two-factor authentication so that my account has extra security
- As a User, I want to reset my password if I forget it so that I can regain access to my account
- As a User, I want to upload an avatar so that I can personalize my profile
- As a User, I want to view my activity history so that I can see my actions in the system
- As a User, I want to update my notification preferences so that I can control how I'm contacted

## Functional Requirements

### 1. User Creation & Onboarding

#### 1.1 Admin-Created Accounts
1.1.1. Admins must be able to create user accounts by providing: name, email, role, department (optional)
1.1.2. System must generate a secure temporary password or send an invitation link
1.1.3. System must validate email uniqueness before account creation
1.1.4. New users must receive a welcome email with account setup instructions
1.1.5. New users must be required to change their password on first login

#### 1.2 Invitation-Based Registration
1.2.1. Admins must be able to send email invitations to new users
1.2.2. Invitation emails must contain a unique, time-limited token (valid for 7 days)
1.2.3. Users must be able to set their own password when accepting an invitation
1.2.4. Expired invitation links must display an error message with re-invitation option
1.2.5. System must track invitation status (pending, accepted, expired, declined)

#### 1.3 Self-Registration with Approval
1.3.1. System must provide a registration page where users can request accounts
1.3.2. Registration requests must require: name, email, reason/justification
1.3.3. Admins must receive notifications of pending registration requests
1.3.4. Admins must be able to approve or reject registration requests
1.3.5. Approved users must receive account activation emails
1.3.6. Rejected users must receive notification emails with rejection reason

#### 1.4 SSO/OAuth Integration
1.4.1. System must support Google OAuth authentication
1.4.2. System must support Microsoft Azure AD/Office 365 authentication
1.4.3. System must support SAML 2.0 for enterprise SSO providers
1.4.4. SSO users must be automatically provisioned with default Viewer role
1.4.5. Admins must be able to map SSO attributes to user fields (email, name, department)
1.4.6. System must support Just-In-Time (JIT) user provisioning for SSO users
1.4.7. System must allow SSO and local authentication to coexist

### 2. User Profile Management

#### 2.1 Basic User Information
2.1.1. System must store and display: name, email, avatar, role, status
2.1.2. System must validate email format and uniqueness
2.1.3. System must support avatar uploads (max 2MB, JPG/PNG/GIF)
2.1.4. System must auto-generate avatar initials if no avatar is uploaded
2.1.5. Users must be able to update their own basic information (except role)

#### 2.2 Extended User Information
2.2.1. System must support the following optional fields:
    - Job title/position
    - Department/team
    - Location (city, country, timezone)
    - Phone number (with international format validation)
    - Manager/supervisor (link to another user)
    - Team/group membership (multiple groups)
    - Specialties/expertise areas (multi-select tags)
    - Languages spoken (multi-select)
    - Working hours/schedule
    - Bio/description (max 500 characters)

2.2.2. Admins must be able to make certain fields required or optional
2.2.3. System must support custom fields defined by admins (text, number, date, dropdown)
2.2.4. All profile changes must be logged in the audit trail

#### 2.3 User Status Management
2.3.1. System must support the following user statuses:
    - **Active:** User can log in and perform actions based on their role
    - **Inactive:** User cannot log in, appears dimmed in user lists
    - **Suspended:** User cannot log in, temporary status with reason
    - **Pending:** User account created but not yet activated
    - **Locked:** User account locked due to failed login attempts

2.3.2. Status changes must be logged with timestamp, admin, and reason
2.3.3. Inactive users must not receive notifications or assignment
2.3.4. Suspended users must display suspension reason and expiration date
2.3.5. Locked accounts must auto-unlock after 30 minutes or manual admin unlock

### 3. Role Assignment & Permissions

#### 3.1 Role Management
3.1.1. System must support existing roles: Admin, Editor, Reviewer, Viewer
3.1.2. Each user must have exactly one primary role
3.1.3. Admins must be able to change user roles with reason/justification
3.1.4. Role changes must take effect immediately
3.1.5. Role changes must be logged in the audit trail
3.1.6. System must prevent admins from removing their own admin role
3.1.7. System must require at least one active admin user at all times

#### 3.2 Custom Permission Assignment
3.2.1. Admins must be able to grant additional permissions beyond base role permissions
3.2.2. Custom permissions must support:
    - Specific permission grants (e.g., "products:export")
    - Time-limited permissions with expiration dates
    - Resource-specific permissions (e.g., access to specific product categories)
    - Context-based permissions (e.g., approve products in specific departments)

3.2.3. System must display effective permissions (role + custom permissions)
3.2.4. Custom permissions must override role restrictions (additive only, not subtractive)
3.2.5. Expired permissions must be automatically revoked
3.2.6. Permission assignments must be logged with grantor, reason, and expiration
3.2.7. System must integrate with existing dynamic permissions system (from role-permissions.ts)

#### 3.3 Role-Based UI Adaptation
3.3.1. System must hide/show menu items based on user permissions
3.3.2. System must disable actions that users don't have permission to perform
3.3.3. System must display permission-appropriate content and features
3.3.4. System must cache user permissions for performance (5-minute TTL)

### 4. Reviewer-Specific Features

#### 4.1 Workload Management
4.1.1. System must track current assignment count for each reviewer
4.1.2. System must allow admins to set max workload capacity per reviewer (default: 10)
4.1.3. System must display workload percentage (current/max) in reviewer lists
4.1.4. System must prevent assignment to reviewers at 100% capacity (unless overridden)
4.1.5. System must provide workload dashboard showing all reviewer utilization
4.1.6. System must track average review time per reviewer
4.1.7. System must display reviewer efficiency metrics (reviews completed, avg time)

#### 4.2 Auto-Assignment Based on Workload/Specialty
4.2.1. System must support automatic reviewer assignment based on:
    - Current workload (prefer reviewers with lower workload)
    - Specialty match (prefer reviewers with matching expertise)
    - Department/category (prefer reviewers from relevant departments)
    - Historical performance (prefer reviewers with higher ratings)
    - Round-robin distribution (optional, for fairness)

4.2.2. Admins must be able to configure auto-assignment rules and priority
4.2.3. System must allow editors to request specific reviewers (subject to admin approval)
4.2.4. Auto-assignment must respect reviewer availability status

#### 4.3 Reviewer Availability/Vacation Mode
4.3.1. Reviewers must be able to set availability status:
    - Available (default)
    - Busy (still receives assignments but flagged)
    - Away (no new assignments, dates optional)
    - Vacation (no new assignments, requires date range)

4.3.2. System must not auto-assign to unavailable reviewers
4.3.3. Admins must be able to override availability for urgent assignments
4.3.4. System must display availability status in all reviewer lists
4.3.5. System must send reminder notifications before vacation end date
4.3.6. System must support scheduled availability (e.g., away next Friday)

#### 4.4 Reviewer Performance Metrics
4.4.1. System must track the following metrics per reviewer:
    - Total reviews completed
    - Average review time (in hours)
    - Approval rate (% of products approved vs. rejected)
    - Rating/feedback score (1-5 stars, from editors/admins)
    - Reviews per week/month
    - Overdue reviews count
    - Quality score (based on feedback and subsequent issues)

4.4.2. Metrics must be displayed on reviewer profile pages
4.4.3. Admins must be able to view comparative metrics across all reviewers
4.4.4. System must use metrics to inform auto-assignment decisions

#### 4.5 Reviewer Delegation
4.5.1. Reviewers must be able to designate backup/delegate reviewers
4.5.2. When a reviewer is unavailable, their assignments can be delegated to backups
4.5.3. Admins must be able to bulk reassign a reviewer's products to another reviewer
4.5.4. Delegation must be logged in the audit trail
4.5.5. Original reviewer must be notified of delegation
4.5.6. System must support temporary delegation (e.g., during vacation)

#### 4.6 Department/Category-Based Assignment
4.6.1. Reviewers must be able to specify expertise in product categories/departments
4.6.2. Admins must be able to assign reviewers to specific categories exclusively
4.6.3. Products from specific categories should prefer reviewers with matching expertise
4.6.4. System must allow multi-category expertise per reviewer
4.6.5. System must display category expertise on reviewer profiles

### 5. User Search & Filtering

#### 5.1 Search Capabilities
5.1.1. System must provide real-time search across:
    - Name (first, last, full name)
    - Email address
    - Department
    - Job title
    - Specialties/expertise

5.1.2. Search must be case-insensitive and support partial matches
5.1.3. Search must return results within 500ms for up to 1,000 users
5.1.4. Search must highlight matching terms in results
5.1.5. Search must support advanced query syntax (e.g., "role:reviewer department:IT")

#### 5.2 Filtering Options
5.2.1. System must support filtering by:
    - Role (Admin, Editor, Reviewer, Viewer)
    - Status (Active, Inactive, Suspended, Pending, Locked)
    - Department/team
    - Location
    - Reviewer availability (Available, Busy, Away, Vacation)
    - Workload range (e.g., 0-50%, 50-80%, 80-100%)
    - Date range (created, last login, last active)
    - Manager/supervisor
    - Group membership
    - Authentication method (local, SSO)

5.2.2. Multiple filters must be combinable (AND logic)
5.2.3. Active filters must be clearly displayed with remove option
5.2.4. System must persist filter state in URL for sharing and bookmarking

#### 5.3 Sorting Options
5.3.1. System must support sorting by:
    - Name (A-Z, Z-A)
    - Email (A-Z, Z-A)
    - Role (by hierarchy)
    - Status
    - Created date (newest/oldest)
    - Last login (most recent/least recent)
    - Last active (most recent/least recent)
    - Workload (highest/lowest) - for reviewers
    - Rating (highest/lowest) - for reviewers
    - Review count (most/least) - for reviewers

5.3.2. Default sort must be by name (A-Z)
5.3.3. Sort order must persist across page navigation

#### 5.4 Saved Searches
5.4.1. Users must be able to save frequently used search/filter combinations
5.4.2. Saved searches must have custom names
5.4.3. Saved searches must be private to the user who created them
5.4.4. Users must be able to edit and delete their saved searches
5.4.5. System must limit saved searches to 20 per user

### 6. Audit Trail & Security

#### 6.1 User Activity Tracking
6.1.1. System must log the following activities:
    - Login/logout (with IP address, device, browser)
    - Failed login attempts (with IP address)
    - Password changes
    - Profile updates (what changed, old/new values)
    - Role changes (by whom, reason)
    - Permission grants/revocations
    - Status changes (active, inactive, suspended)
    - API access (if applicable)

6.1.2. Activity logs must include: timestamp, user ID, action, IP address, user agent
6.1.3. Activity logs must be immutable
6.1.4. Users must be able to view their own activity history
6.1.5. Admins must be able to view all user activity logs
6.1.6. Activity logs must be searchable and filterable
6.1.7. System must retain activity logs for minimum 2 years

#### 6.2 Password Policies
6.2.1. System must enforce password requirements:
    - Minimum 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    - At least 1 special character
    - Cannot contain username or email

6.2.2. System must check passwords against common password lists (e.g., Have I Been Pwned)
6.2.3. System must prevent password reuse (last 5 passwords)
6.2.4. System must support optional password expiration (configurable, default: never)
6.2.5. System must send password expiration reminders 7 days before expiration
6.2.6. Passwords must be hashed using bcrypt (cost factor 12+)

#### 6.3 Two-Factor Authentication (2FA)
6.3.1. System must support TOTP-based 2FA (compatible with Google Authenticator, Authy)
6.3.2. Users must be able to enable/disable 2FA from their profile settings
6.3.3. System must provide QR code for 2FA setup
6.3.4. System must generate backup codes (10 single-use codes) for 2FA recovery
6.3.5. Admins must be able to require 2FA for specific roles (e.g., Admin role)
6.3.6. System must log 2FA events (enabled, disabled, successful/failed attempts)
6.3.7. System must support SMS-based 2FA as backup option (optional enhancement)

#### 6.4 Session Management
6.4.1. System must limit sessions to 8 hours of inactivity before auto-logout
6.4.2. Users must be able to view all active sessions (device, location, last active)
6.4.3. Users must be able to terminate individual sessions remotely
6.4.4. Admins must be able to force-logout users (e.g., for security incidents)
6.4.5. System must limit concurrent sessions to 3 per user (configurable)
6.4.6. Password changes must invalidate all existing sessions
6.4.7. System must support "Remember Me" option (30-day session extension)

#### 6.5 Account Lockout & Security
6.5.1. System must lock accounts after 5 failed login attempts within 15 minutes
6.5.2. Locked accounts must auto-unlock after 30 minutes
6.5.3. Admins must be able to manually unlock accounts immediately
6.5.4. System must send email notifications for:
    - Failed login attempts (after 3 failed attempts)
    - Account lockout
    - Password changes
    - New device login
    - 2FA changes

6.5.5. System must log all security events (failed logins, lockouts, suspicious activity)
6.5.6. System must support IP allowlisting/blocklisting for admin access (optional)

#### 6.6 Permission Audit Trail
6.6.1. System must integrate with existing permission audit logger (from role-permissions.ts)
6.6.2. All permission checks must be logged for admin-level actions
6.6.3. Permission grants/revocations must be logged with:
    - What permission was changed
    - Who granted/revoked it
    - To/from whom
    - Reason/justification
    - Expiration date (if applicable)
    - Timestamp

6.6.4. Permission audit logs must be searchable by user, permission, admin, date range
6.6.5. System must detect and alert on unusual permission changes (e.g., mass permission grants)

### 7. Bulk Operations

#### 7.1 Bulk User Selection
7.1.1. User list must provide checkboxes for individual selection
7.1.2. System must provide "Select All" option (with current filters applied)
7.1.3. System must display count of selected users
7.1.4. System must support selection across multiple pages
7.1.5. Selected users must persist when changing pages or filters
7.1.6. System must provide "Clear Selection" button

#### 7.2 Bulk Role Assignment
7.2.1. Admins must be able to change roles for multiple users simultaneously
7.2.2. System must show confirmation dialog with:
    - Number of users affected
    - Current roles → new role
    - Warning about permission changes
    - Reason field (required)

7.2.3. Bulk role changes must be logged individually in audit trail
7.2.4. System must send notification emails to affected users

#### 7.3 Bulk Status Changes
7.3.1. Admins must be able to bulk activate/deactivate users
7.3.2. Admins must be able to bulk suspend users with reason
7.3.3. System must prevent bulk deactivation of admin users
7.3.4. Status changes must be logged in audit trail
7.3.5. Affected users must receive notification emails

#### 7.4 Bulk User Import
7.4.1. System must support CSV import for bulk user creation
7.4.2. CSV format must include: name, email, role, department, location, phone (optional fields)
7.4.3. System must validate all data before import
7.4.4. System must provide import preview with validation errors
7.4.5. System must support "dry run" mode to test imports
7.4.6. Import must be transactional (all or nothing, or skip invalid rows)
7.4.7. System must generate import report with success/failure details
7.4.8. Imported users must receive invitation emails
7.4.9. System must support update mode (update existing users by email)
7.4.10. System must provide CSV template download

#### 7.5 Bulk User Export
7.5.1. Admins must be able to export user lists to CSV
7.5.2. Export must respect current filters and search
7.5.3. Export must include all user fields (configurable)
7.5.4. Export must exclude sensitive data (passwords, 2FA secrets)
7.5.5. Export actions must be logged in audit trail
7.5.6. System must support scheduled exports (daily, weekly, monthly)

#### 7.6 Bulk Email Notifications
7.6.1. Admins must be able to send bulk emails to selected users
7.6.2. Email editor must support rich text formatting
7.6.3. System must support email templates for common messages
7.6.4. Bulk emails must be sent asynchronously with progress indicator
7.6.5. System must track email delivery status (sent, failed, bounced)
7.6.6. Bulk email actions must be logged in audit trail

### 8. Integration Requirements

#### 8.1 Email Service Integration
8.1.1. System must integrate with email delivery service (e.g., SendGrid, AWS SES, Mailgun)
8.1.2. System must send transactional emails for:
    - User invitations
    - Password resets
    - Account activation
    - Security alerts
    - Notification preferences

8.1.3. Email templates must be customizable by admins
8.1.4. System must track email delivery status
8.1.5. Failed emails must be retried (max 3 attempts)
8.1.6. System must support email preview before sending

#### 8.2 SSO Provider Integration
8.2.1. System must support OAuth 2.0 / OpenID Connect
8.2.2. Supported providers:
    - Google Workspace / Gmail
    - Microsoft Azure AD / Office 365
    - Generic SAML 2.0 providers

8.2.3. Admins must be able to configure SSO settings:
    - Client ID / Client Secret
    - Authorization endpoint
    - Token endpoint
    - User info endpoint
    - Attribute mapping

8.2.4. System must support multiple SSO providers simultaneously
8.2.5. Users must be able to link/unlink SSO accounts from their profile
8.2.6. SSO login must create local user account on first login (JIT provisioning)

#### 8.3 LDAP/Active Directory Integration
8.3.1. System must support LDAP/AD authentication
8.3.2. Admins must be able to configure LDAP settings:
    - Server URL
    - Bind DN / password
    - User search base
    - User filter
    - Attribute mapping

8.3.3. System must support LDAP sync (import users from AD)
8.3.4. LDAP sync must be schedulable (hourly, daily, weekly)
8.3.5. System must handle user updates and deletions from LDAP
8.3.6. Local user accounts must take precedence over LDAP (for local admins)

#### 8.4 Slack/Teams Integration (Optional)
8.4.1. System must support Slack webhook integration for notifications
8.4.2. System must support Microsoft Teams webhook integration
8.4.3. Admins must be able to configure which events trigger Slack/Teams notifications
8.4.4. Users must be able to link their Slack/Teams accounts for personal notifications
8.4.5. Notifications must include deep links to relevant pages

#### 8.5 Workflow System Integration
8.5.1. User management must integrate seamlessly with existing reviewer assignment component
8.5.2. Reviewer assignment must pull from user management system
8.5.3. User status changes must update reviewer availability automatically
8.5.4. User permissions must be checked via existing role-permissions.ts system
8.5.5. Audit trail must integrate with existing audit-trail-service.ts
8.5.6. Notifications must integrate with existing notification-service.ts

### 9. User Interface Requirements

#### 9.1 User List/Table View
9.1.1. Display users in a responsive table/card layout
9.1.2. Show: avatar, name, email, role badge, status badge, department, last active
9.1.3. Provide inline quick actions: edit, activate/deactivate, impersonate
9.1.4. Support bulk selection with checkboxes
9.1.5. Display workload indicator for reviewers
9.1.6. Support pagination (25, 50, 100 users per page)
9.1.7. Provide quick filters in header (Active, Inactive, Reviewers only, etc.)
9.1.8. Highlight search matches in table rows

#### 9.2 User Detail/Profile Page
9.2.1. Display comprehensive user information in organized sections:
    - Basic Info (avatar, name, email, role, status)
    - Contact Info (phone, location, timezone)
    - Organization (department, manager, teams)
    - Reviewer Info (workload, availability, specialties, metrics)
    - Security (2FA status, last login, active sessions)
    - Custom Fields (if defined)

9.2.2. Provide action buttons: Edit Profile, Change Role, Reset Password, Deactivate
9.2.3. Display activity timeline with recent actions
9.2.4. Show permission matrix (role permissions + custom permissions)
9.2.5. Display audit trail tab with all user-related changes
9.2.6. Show related data (products created, reviews completed)

#### 9.3 User Creation/Edit Forms
9.3.1. Provide tabbed interface for:
    - Basic Information
    - Contact & Organization
    - Role & Permissions
    - Reviewer Settings (if applicable)
    - Notification Preferences

9.3.2. Use inline validation with clear error messages
9.3.3. Show required fields clearly
9.3.4. Provide tooltips for complex fields
9.3.5. Save draft changes (auto-save every 30 seconds)
9.3.6. Show unsaved changes warning when navigating away
9.3.7. Provide "Save" and "Save & Close" buttons

#### 9.4 Role Assignment Interface
9.4.1. Display current role with badge and description
9.4.2. Show role comparison table (what each role can do)
9.4.3. Provide role selection dropdown with permission preview
9.4.4. Require reason/justification for role changes
9.4.5. Show warning if role change will revoke current permissions
9.4.6. Display custom permissions separately with add/remove interface
9.4.7. Show permission expiration dates clearly

#### 9.5 Bulk Operations Panel
9.5.1. Display floating action bar when users are selected
9.5.2. Show selected user count prominently
9.5.3. Provide bulk action buttons: Change Role, Activate, Deactivate, Suspend, Export, Email
9.5.4. Show confirmation dialog before bulk actions execute
9.5.5. Display progress bar for long-running bulk operations
9.5.6. Show summary report after bulk operation completes
9.5.7. Provide "Undo" option for certain bulk actions (within 5 minutes)

#### 9.6 User Activity/Audit Log Viewer
9.6.1. Display activity in timeline format with icons
9.6.2. Group activities by day/week/month
9.6.3. Support filtering by activity type, date range, user
9.6.4. Show expandable details for each activity
9.6.5. Support export to CSV/PDF
9.6.6. Highlight security-relevant events (failed logins, permission changes)
9.6.7. Provide comparison view for before/after values

#### 9.7 Reviewer Dashboard
9.7.1. Display all reviewers with workload visualization (progress bars/pie charts)
9.7.2. Show availability status with color coding
9.7.3. Display performance metrics in sortable table
9.7.4. Provide workload distribution chart
9.7.5. Show assignment history timeline
9.7.6. Highlight overworked reviewers (> 80% capacity)
9.7.7. Enable drag-and-drop assignment rebalancing

#### 9.8 Invitation Management Interface
9.8.1. Display pending invitations list
9.8.2. Show invitation status (sent, accepted, expired)
9.8.3. Provide resend and cancel options
9.8.4. Display invitation expiration countdown
9.8.5. Show registration request queue for self-registration
9.8.6. Enable bulk invitation sending

#### 9.9 SSO Configuration Interface
9.9.1. Provide setup wizard for SSO configuration
9.9.2. Display connection status indicators
9.9.3. Show SSO test/validation interface
9.9.4. Display SSO usage statistics
9.9.5. Provide attribute mapping interface
9.9.6. Show sync logs and errors

#### 9.10 Security Settings Interface
9.10.1. Display password policy configuration
9.10.2. Show 2FA enforcement settings per role
9.10.3. Display session management settings
9.10.4. Show IP allowlist/blocklist management
9.10.5. Display security event log
9.10.6. Provide security report generation

### 10. Performance Requirements

10.1. User list must load within 1 second for up to 1,000 users
10.2. Search must return results within 500ms
10.3. User profile page must load within 500ms
10.4. Bulk operations on 100 users must complete within 30 seconds
10.5. User login must complete within 2 seconds (excluding network latency)
10.6. SSO authentication must complete within 3 seconds
10.7. Audit log queries must return within 2 seconds
10.8. Real-time search suggestions must appear within 200ms
10.9. Permission checks must complete within 100ms (cached)
10.10. System must support 100 concurrent users without performance degradation
10.11. Database queries must use proper indexing for optimal performance
10.12. API endpoints must implement rate limiting (100 requests/minute per user)

### 11. Data Management & Privacy

#### 11.1 Data Retention
11.1.1. Active user data must be retained indefinitely
11.1.2. Deleted user data must be soft-deleted and retained for 90 days
11.1.3. Audit logs must be retained for minimum 2 years
11.1.4. Activity logs must be retained for 1 year
11.1.5. Invitation data must be deleted 30 days after expiration
11.1.6. Session data must be deleted after expiration

#### 11.2 Data Export & Portability
11.2.1. Users must be able to export their own data (GDPR compliance)
11.2.2. Export must include: profile, activity history, audit trail
11.2.3. Export format must be JSON or CSV
11.2.4. Users must be able to request data deletion (right to be forgotten)
11.2.5. Admins must be notified of data deletion requests
11.2.6. System must anonymize user data upon deletion (replace with "Deleted User")

#### 11.3 Data Privacy
11.3.1. Passwords must never be stored in plain text or logged
11.3.2. Sensitive data must be encrypted at rest (2FA secrets, tokens)
11.3.3. API responses must not include sensitive fields
11.3.4. Personal data must not be exposed in URLs or logs
11.3.5. System must comply with GDPR, CCPA privacy regulations

## Non-Goals (Out of Scope)

1. **Advanced Organizational Structure:** No hierarchical org charts, complex reporting structures
2. **Time Tracking:** No built-in time tracking or timesheet functionality
3. **Payroll Integration:** No salary, compensation, or payroll-related features
4. **Mobile Apps:** Web-responsive interface only, no native mobile apps
5. **Advanced Analytics:** No complex user behavior analytics or BI dashboards
6. **Gamification:** No points, badges, leaderboards for user engagement
7. **Social Features:** No user-to-user messaging, forums, or social feeds
8. **Document Management:** No file storage or document versioning for users
9. **Calendar Integration:** No calendar sync or scheduling features
10. **Advanced Compliance:** No SOC2, ISO 27001 specific compliance features (may be added later)
11. **Multi-Tenancy:** Single organization only, no multi-tenant architecture
12. **Custom Roles:** No admin-created custom roles (only 4 predefined roles)

## Design Considerations

### UI/UX Requirements

#### Visual Design
- **Consistent Styling:** Use existing component library (shadcn/ui) for all UI elements
- **Color Coding:** Status and role badges with distinct colors (green=active, red=inactive, blue=reviewer, etc.)
- **Iconography:** Clear icons for all actions (edit, delete, activate, etc.)
- **Spacing:** Generous whitespace for readability and reduced cognitive load
- **Typography:** Clear hierarchy with readable font sizes (min 14px for body text)

#### User Experience
- **Progressive Disclosure:** Show basic info by default, advanced options in expandable sections
- **Inline Editing:** Allow quick edits without full page navigation
- **Clear Feedback:** Toast notifications for all actions (success, error, warning)
- **Loading States:** Skeleton screens and spinners for async operations
- **Empty States:** Helpful messages and CTAs when no data exists
- **Keyboard Shortcuts:** Support common shortcuts (Ctrl+S to save, Esc to cancel, etc.)
- **Confirmation Dialogs:** Always confirm destructive actions
- **Help & Documentation:** Contextual help tooltips and links to documentation

#### Accessibility
- **WCAG 2.1 AA Compliance:** Minimum standard for accessibility
- **Keyboard Navigation:** Full keyboard support for all interactions
- **Screen Reader Support:** Proper ARIA labels and semantic HTML
- **Color Contrast:** Minimum 4.5:1 contrast ratio for text
- **Focus Indicators:** Clear visual focus indicators for keyboard navigation
- **Alt Text:** Descriptive alt text for all images and icons

### Component Reuse
- **Leverage Existing Components:** Use components from src/components/ui/
- **Extend Product Components:** Adapt product-card.tsx pattern for user cards
- **Reuse Workflow Components:** Integrate with reviewer-assignment.tsx
- **Shared Modals:** Use existing dialog, alert-dialog components
- **Form Components:** Use existing input, select, textarea with validation
- **Data Tables:** Extend table.tsx for user list display

## Technical Considerations

### Technology Stack
- **Frontend:** React 18+, TypeScript, Next.js 14+
- **UI Library:** shadcn/ui (already in use), Radix UI primitives
- **Styling:** Tailwind CSS (already in use)
- **State Management:** React Context API, React Query for API state
- **Forms:** React Hook Form with Zod validation
- **Authentication:** NextAuth.js or custom JWT implementation
- **API:** Next.js API routes (already in use)
- **Database:** Existing database (extend schema)

### Database Schema

#### Users Table (extend existing or create new)
```sql
users {
  id: uuid PRIMARY KEY
  email: string UNIQUE NOT NULL
  password_hash: string (nullable for SSO users)
  name: string NOT NULL
  avatar_url: string
  role: enum(ADMIN, EDITOR, REVIEWER, VIEWER) NOT NULL
  status: enum(ACTIVE, INACTIVE, SUSPENDED, PENDING, LOCKED) NOT NULL
  job_title: string
  department: string
  location: string
  timezone: string
  phone: string
  manager_id: uuid REFERENCES users(id)
  bio: text
  specialties: jsonb (array of strings)
  languages: jsonb (array of strings)
  working_hours: jsonb
  custom_fields: jsonb
  
  -- Reviewer-specific fields
  reviewer_max_workload: integer DEFAULT 10
  reviewer_availability: enum(AVAILABLE, BUSY, AWAY, VACATION)
  reviewer_availability_until: timestamp
  reviewer_rating: decimal(3,2)
  
  -- Authentication fields
  two_factor_enabled: boolean DEFAULT false
  two_factor_secret: string (encrypted)
  backup_codes: jsonb (encrypted array)
  last_password_change: timestamp
  password_history: jsonb (hashed passwords)
  
  -- Security fields
  failed_login_attempts: integer DEFAULT 0
  locked_until: timestamp
  last_login_at: timestamp
  last_login_ip: string
  last_active_at: timestamp
  
  -- SSO fields
  sso_provider: string
  sso_id: string
  sso_linked_at: timestamp
  
  -- Metadata
  created_at: timestamp NOT NULL
  created_by: uuid REFERENCES users(id)
  updated_at: timestamp
  updated_by: uuid REFERENCES users(id)
  deleted_at: timestamp (soft delete)
  deleted_by: uuid REFERENCES users(id)
}

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_department ON users(department);
CREATE INDEX idx_users_reviewer_availability ON users(reviewer_availability) WHERE role = 'REVIEWER';
```

#### User Invitations Table
```sql
user_invitations {
  id: uuid PRIMARY KEY
  email: string NOT NULL
  token: string UNIQUE NOT NULL
  role: enum NOT NULL
  invited_by: uuid REFERENCES users(id) NOT NULL
  invited_at: timestamp NOT NULL
  expires_at: timestamp NOT NULL
  accepted_at: timestamp
  status: enum(PENDING, ACCEPTED, EXPIRED, CANCELLED)
  metadata: jsonb (department, etc.)
}

CREATE INDEX idx_invitations_token ON user_invitations(token);
CREATE INDEX idx_invitations_email ON user_invitations(email);
CREATE INDEX idx_invitations_status ON user_invitations(status);
```

#### User Sessions Table
```sql
user_sessions {
  id: uuid PRIMARY KEY
  user_id: uuid REFERENCES users(id) NOT NULL
  token: string UNIQUE NOT NULL
  device: string
  browser: string
  ip_address: string
  location: string
  created_at: timestamp NOT NULL
  last_activity: timestamp NOT NULL
  expires_at: timestamp NOT NULL
  is_active: boolean DEFAULT true
}

CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
```

#### User Activity Log Table
```sql
user_activity_log {
  id: uuid PRIMARY KEY
  user_id: uuid REFERENCES users(id) NOT NULL
  action: string NOT NULL
  resource_type: string
  resource_id: string
  ip_address: string
  user_agent: string
  metadata: jsonb
  created_at: timestamp NOT NULL
}

CREATE INDEX idx_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_activity_created_at ON user_activity_log(created_at);
CREATE INDEX idx_activity_action ON user_activity_log(action);
```

#### Dynamic Permissions Table (integrate with existing)
```sql
dynamic_permissions {
  id: uuid PRIMARY KEY
  user_id: uuid REFERENCES users(id) NOT NULL
  permission: string NOT NULL
  granted_by: uuid REFERENCES users(id) NOT NULL
  granted_at: timestamp NOT NULL
  expires_at: timestamp
  reason: text
  resource_type: string
  resource_id: string
  context: jsonb
  revoked_at: timestamp
  revoked_by: uuid REFERENCES users(id)
  revocation_reason: text
}

CREATE INDEX idx_dynamic_perms_user_id ON dynamic_permissions(user_id);
CREATE INDEX idx_dynamic_perms_permission ON dynamic_permissions(permission);
CREATE INDEX idx_dynamic_perms_expires_at ON dynamic_permissions(expires_at);
```

#### User Audit Trail (extend existing audit_trail table)
```sql
-- Add to existing audit_trail table
ALTER TABLE audit_trail ADD COLUMN target_user_id uuid REFERENCES users(id);
ALTER TABLE audit_trail ADD COLUMN action_type enum(..., 'USER_CREATED', 'USER_UPDATED', 'ROLE_CHANGED', etc.);
```

### Authentication & Authorization

#### Password Hashing
- Use bcrypt with cost factor 12 minimum
- Implement password complexity validation on client and server
- Store password history (last 5 hashed passwords)

#### JWT Tokens
- Use short-lived access tokens (15 minutes)
- Use long-lived refresh tokens (7 days)
- Store refresh tokens in httpOnly cookies
- Implement token rotation on refresh

#### SSO Implementation
- Use OAuth 2.0 Authorization Code Flow
- Validate ID tokens from SSO providers
- Implement PKCE for extra security
- Cache SSO user info for session duration

#### Permission Caching
- Cache user permissions in Redis (5-minute TTL)
- Invalidate cache on role/permission changes
- Use existing PermissionCacheManager from permission-cache.ts

### API Design

#### RESTful Endpoints
```
POST   /api/users                    - Create user
GET    /api/users                    - List users (with filters, search, pagination)
GET    /api/users/:id                - Get user details
PUT    /api/users/:id                - Update user
DELETE /api/users/:id                - Soft delete user
POST   /api/users/:id/activate       - Activate user
POST   /api/users/:id/deactivate     - Deactivate user
POST   /api/users/:id/suspend        - Suspend user
POST   /api/users/:id/unlock         - Unlock user account
POST   /api/users/:id/reset-password - Reset user password
POST   /api/users/:id/change-role    - Change user role
POST   /api/users/:id/permissions    - Grant custom permission
DELETE /api/users/:id/permissions/:permId - Revoke permission
GET    /api/users/:id/activity       - Get user activity log
GET    /api/users/:id/sessions       - Get active sessions
DELETE /api/users/:id/sessions/:sessionId - Terminate session

POST   /api/users/invite             - Send invitation
POST   /api/users/invite/resend      - Resend invitation
DELETE /api/users/invite/:id         - Cancel invitation
GET    /api/invitations              - List invitations
POST   /api/invitations/:token/accept - Accept invitation

POST   /api/users/bulk/role          - Bulk role change
POST   /api/users/bulk/activate      - Bulk activate
POST   /api/users/bulk/deactivate    - Bulk deactivate
POST   /api/users/import             - Import users (CSV)
GET    /api/users/export             - Export users (CSV)

GET    /api/reviewers                - List reviewers with workload
GET    /api/reviewers/dashboard      - Reviewer dashboard data
POST   /api/reviewers/:id/availability - Update availability
POST   /api/reviewers/:id/delegate   - Delegate assignments

POST   /api/auth/login               - Login
POST   /api/auth/logout              - Logout
POST   /api/auth/refresh             - Refresh token
POST   /api/auth/forgot-password     - Request password reset
POST   /api/auth/reset-password      - Reset password with token
POST   /api/auth/verify-2fa          - Verify 2FA code
POST   /api/auth/enable-2fa          - Enable 2FA
POST   /api/auth/disable-2fa         - Disable 2FA

GET    /api/auth/sso/providers       - List SSO providers
GET    /api/auth/sso/:provider       - Initiate SSO login
GET    /api/auth/sso/:provider/callback - SSO callback
POST   /api/auth/sso/:provider/link  - Link SSO account
DELETE /api/auth/sso/:provider/unlink - Unlink SSO account
```

#### Response Format
```typescript
// Success response
{
  success: true,
  data: { ... },
  message: "User created successfully"
}

// Error response
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid email format",
    field: "email"
  }
}

// Paginated response
{
  success: true,
  data: [ ... ],
  pagination: {
    page: 1,
    pageSize: 50,
    totalItems: 245,
    totalPages: 5
  }
}
```

### Performance Optimization

#### Database Optimization
- Create indexes on frequently queried columns
- Use database connection pooling
- Implement query result caching with Redis
- Use pagination for all list queries
- Optimize N+1 queries with proper joins

#### Frontend Optimization
- Implement virtual scrolling for large user lists
- Use React Query for API state management and caching
- Lazy load components with React.lazy()
- Debounce search input (300ms delay)
- Implement optimistic UI updates

#### Caching Strategy
- Cache user permissions (5 minutes)
- Cache user profile data (1 minute)
- Cache reviewer availability (30 seconds)
- Cache SSO configuration (1 hour)
- Invalidate cache on relevant mutations

### Data Migration

#### Initial Setup
1. Create database schema and tables
2. Create default admin user (credentials in env)
3. Migrate existing user references (if any)
4. Set up default roles and permissions
5. Configure default email templates
6. Set up default system settings

#### Existing Data Migration
1. If users exist in another system, provide import script
2. Map existing roles to new role system
3. Preserve user creation dates
4. Generate initial audit trail entries
5. Send notification emails to migrated users

### Error Handling

#### Error Types
- Validation errors (400 Bad Request)
- Authentication errors (401 Unauthorized)
- Permission errors (403 Forbidden)
- Not found errors (404 Not Found)
- Conflict errors (409 Conflict - duplicate email)
- Rate limit errors (429 Too Many Requests)
- Server errors (500 Internal Server Error)

#### Error Logging
- Log all errors to centralized logging service
- Include request context (user, IP, endpoint)
- Mask sensitive data in logs
- Set up error alerting for critical errors

### Testing Requirements

#### Unit Tests
- Test all utility functions
- Test permission checks
- Test validation logic
- Test data transformations
- Target: 80% code coverage

#### Integration Tests
- Test API endpoints
- Test database operations
- Test authentication flows
- Test SSO integration
- Test email delivery

#### End-to-End Tests
- Test user creation flow
- Test invitation flow
- Test login/logout
- Test role changes
- Test bulk operations
- Test password reset

#### Security Tests
- Test authentication bypass attempts
- Test authorization bypass attempts
- Test SQL injection
- Test XSS vulnerabilities
- Test CSRF protection
- Test rate limiting

### Monitoring & Observability

#### Metrics to Track
- User registration rate
- Login success/failure rate
- Average login time
- API response times
- Error rates by endpoint
- SSO usage vs. local auth
- Permission check performance
- Email delivery success rate

#### Alerting
- Failed login spike (possible attack)
- High error rate
- Slow API responses
- Email delivery failures
- Database connection issues
- SSO provider outages

## Success Metrics

### Primary Metrics
1. **User Onboarding Time:** Average time to create and activate a user < 5 minutes
2. **System Adoption:** 100% of team members using the system within 30 days of launch
3. **Authentication Success Rate:** > 99.5% successful login attempts
4. **Reviewer Utilization:** Balanced workload with no reviewer exceeding 90% capacity
5. **Security Compliance:** Zero security incidents related to user management

### Secondary Metrics
1. **Search Performance:** < 500ms average search response time
2. **Bulk Operation Usage:** 40% of admin actions performed via bulk operations
3. **SSO Adoption:** 70% of users using SSO within 60 days (if implemented)
4. **2FA Adoption:** 50% of users enabling 2FA voluntarily
5. **User Satisfaction:** 4.0+ out of 5.0 rating for user management UX
6. **Support Tickets:** < 5 user management-related support tickets per month
7. **API Performance:** 95% of API requests < 1 second response time
8. **Permission Check Performance:** 100% of permission checks < 100ms

### Key Performance Indicators (KPIs)
1. **Time to First Login:** Average time from invitation to first successful login
2. **Active User Ratio:** % of active users vs. total users
3. **Reviewer Efficiency:** Average products reviewed per reviewer per week
4. **Permission Audit Compliance:** 100% of permission changes logged and auditable
5. **Data Export Requests:** Track GDPR data export request fulfillment time

## Open Questions

1. **Initial Admin Account:** How should the first admin account be created during system setup? Hardcoded credentials, setup wizard, or environment variables?

2. **Reviewer Auto-Assignment Algorithm:** What should be the priority order for auto-assignment? (Workload > Specialty > Department > Round-robin?)

3. **User Deactivation Policy:** When a user is deactivated, should their products be reassigned to another user or remain as-is?

4. **SSO Provider Priority:** Which SSO provider should be implemented first? Google (easier) or Microsoft (enterprise focus)?

5. **Password Reset Expiration:** How long should password reset tokens remain valid? (24 hours, 1 hour, 15 minutes?)

6. **Concurrent Role Changes:** If multiple admins try to change the same user's role simultaneously, how should conflicts be resolved?

7. **Reviewer Vacation Reassignment:** Should products be automatically reassigned when a reviewer goes on vacation, or should they remain queued?

8. **Audit Log Storage:** Should audit logs be stored in the same database or a separate audit database for compliance?

9. **Custom Field Limits:** What should be the maximum number of custom fields admins can create? (10, 20, unlimited?)

10. **Bulk Operation Limits:** What should be the maximum number of users that can be selected for bulk operations? (100, 500, 1000?)

11. **Session Management:** Should there be a different session timeout for admins vs. regular users? (More secure = shorter timeout)

12. **Email Template Customization:** Should email templates be customizable via UI or only via code/configuration files?

13. **LDAP Sync Conflicts:** If an LDAP user is updated locally and then LDAP sync runs, which takes precedence?

14. **Soft Delete Duration:** How long should soft-deleted users be retained before permanent deletion? (90 days, 1 year, indefinite?)

15. **Profile Picture Storage:** Should avatars be stored in the database, local file system, or cloud storage (S3, Cloudinary)?

16. **Notification Preferences:** Should notification preferences be per-user or per-role with user overrides?

17. **API Rate Limiting:** Should rate limits be per-user, per-IP, or both? Different limits for different roles?

18. **Mobile Responsiveness Priority:** Which mobile screen sizes should be prioritized for testing? (Phone, tablet, both?)

19. **Internationalization:** Should the system be built with i18n support from the start, even if only English is initially supported?

20. **Admin Accountability:** Should there be a "super admin" role that can perform actions without approval, or should all admin actions be logged and auditable?

---

**Document Version:** 1.0  
**Created:** October 9, 2025  
**Last Updated:** October 9, 2025  
**Status:** Draft - Ready for Review  
**Author:** AI Assistant  
**Stakeholders:** Development Team, Product Management, Security Team, Compliance Team

