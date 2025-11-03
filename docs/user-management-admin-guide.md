# User Management - Admin Guide

## Overview

This guide is for administrators managing users, permissions, and system configuration in Pimify.

## Accessing User Management

Navigate to **Users** in the main navigation menu. You must have ADMIN or EDITOR role to access user management features.

## User Management

### Viewing Users

1. Go to **Users** page
2. Use search and filters to find users:
   - Search by name or email
   - Filter by role (ADMIN, EDITOR, REVIEWER, VIEWER)
   - Filter by status (ACTIVE, INACTIVE, SUSPENDED, LOCKED)
   - Filter by department

### Creating Users

#### Option 1: Create User Directly

1. Click **New User** button
2. Fill in required fields:
   - Email (must be unique)
   - Password (must meet password policy)
   - Name
   - Role
   - Status
3. Optionally add:
   - Department
   - Job Title
   - Phone
   - Location
   - Timezone
4. Click **Create**

#### Option 2: Send Invitation

1. Go to **Invitations** page
2. Click **Send Invitation**
3. Enter email address
4. Select role
5. Set expiration (default: 7 days)
6. Click **Send**

The user will receive an email with an invitation link to create their account.

### Editing Users

1. Click on a user from the user list
2. Click **Edit** button
3. Update fields as needed
4. Click **Save**

**Note:** Users can edit their own profile (name, phone, etc.) but cannot change their role or status.

### User Actions

From the user detail page, you can:

- **Activate** - Activate an inactive user account
- **Deactivate** - Deactivate a user account (prevents login)
- **Suspend** - Temporarily suspend a user account
- **Unlock** - Unlock a locked account (after failed login attempts)
- **Reset Password** - Force password reset for a user
- **Change Role** - Change user's role (requires reason)
- **Delete** - Soft delete a user account

### Bulk Operations

1. Select multiple users using checkboxes
2. Use bulk actions toolbar:
   - **Change Role** - Change role for selected users
   - **Activate** - Activate selected users
   - **Deactivate** - Deactivate selected users
   - **Export** - Export selected users to CSV

### Importing Users

1. Go to **Users** page
2. Click **Import** button
3. Download CSV template (optional)
4. Fill template with user data:
   - Email (required)
   - Name (required)
   - Role (required)
   - Department (optional)
   - Job Title (optional)
5. Upload CSV file
6. Review import preview
7. Click **Import**

**Import Format:**
```csv
email,name,role,department,job_title
user1@example.com,User One,EDITOR,Engineering,Software Engineer
user2@example.com,User Two,VIEWER,Marketing,Marketing Manager
```

### Exporting Users

1. Go to **Users** page
2. Apply filters if needed
3. Click **Export** button
4. Select export format (CSV, Excel)
5. Download file

## Invitation Management

### Viewing Invitations

Go to **Invitations** page to see:
- Pending invitations
- Accepted invitations
- Expired invitations
- Cancelled invitations

### Resending Invitations

1. Find invitation in the list
2. Click **Resend**
3. User will receive a new invitation email

### Cancelling Invitations

1. Find pending invitation
2. Click **Cancel**
3. Invitation is cancelled and cannot be used

## Role Management

### Understanding Roles

- **ADMIN** - Full system access, can manage all users and settings
- **EDITOR** - Can create and edit products, manage users (limited)
- **REVIEWER** - Can review and approve/reject products
- **VIEWER** - Read-only access to products

### Changing User Roles

1. Go to user detail page
2. Click **Change Role**
3. Select new role
4. Enter reason (required)
5. Click **Change**

**Note:** Changing roles may affect user permissions immediately.

## Permission Management

### Viewing Permissions

1. Go to user detail page
2. Click **Permissions** tab
3. View:
   - Role-based permissions (from role)
   - Custom permissions (assigned individually)
   - Effective permissions (all permissions user has)

### Assigning Custom Permissions

1. Go to user detail page
2. Click **Permissions** tab
3. Click **Assign Permission**
4. Select permission
5. Optionally set:
   - Resource ID (specific resource)
   - Expiration date
   - Reason for permission
6. Click **Assign**

### Revoking Permissions

1. Go to user detail page
2. Click **Permissions** tab
3. Find custom permission to revoke
4. Click **Revoke**
5. Enter reason
6. Click **Confirm**

### Permission Matrix

View permission matrix to compare permissions across roles:

1. Go to **Permissions** page (if available)
2. See side-by-side comparison of role permissions
3. Identify permission gaps

## Reviewer Management

### Reviewer Dashboard

Access **Reviewers** page to see:
- All reviewers and their current workload
- Reviewer capacity (current vs. max assignments)
- Reviewer performance metrics:
  - Reviews completed
  - Average review time
  - Approval rate
  - Rating
- Over-capacity reviewers (highlighted)

### Setting Reviewer Availability

1. Go to **Reviewers** page
2. Click on a reviewer
3. Click **Set Availability**
4. Select status:
   - Available
   - Busy
   - Away
   - Vacation
5. Optionally set date range for scheduled unavailability
6. Click **Save**

### Delegating Reviewer Assignments

1. Go to **Reviewers** page
2. Click on a reviewer
3. Click **Delegate**
4. Choose delegation type:
   - **Backup Reviewer** - Permanent backup
   - **Temporary Delegation** - Date range
5. Select delegate reviewer
6. Set dates (if temporary)
7. Add note (optional)
8. Click **Delegate**

### Reviewer Assignment History

1. Go to **Reviewers** page
2. Click **Assignment History** tab
3. View historical assignments for each reviewer
4. See delegation details

### Rebalancing Reviewer Assignments

1. Go to **Reviewers** page
2. Click **Rebalancing** tab
3. Drag and drop assignments between reviewers
4. See capacity indicators
5. Click **Save Rebalancing**

## Security Settings

### Account Security

Configure security settings at **Settings > Security**:

- **Password Policy**
  - Minimum length
  - Complexity requirements
  - Maximum age
  - Password history

- **Account Lockout**
  - Failed login attempts threshold
  - Lockout duration
  - Auto-unlock settings

- **Session Management**
  - Session timeout
  - Max concurrent sessions
  - Inactivity timeout

### IP Allowlist/Blocklist

1. Go to **Settings > Security**
2. Configure IP restrictions:
   - Allowlist - Only allow specific IPs
   - Blocklist - Block specific IPs
3. Add IP addresses or ranges
4. Save settings

### Security Event Log

View security events at **Settings > Security**:
- Failed login attempts
- Password reset requests
- Account lockouts
- Permission changes
- Role changes

## Registration Requests

If self-registration is enabled:

1. Go to **Registration Requests** page
2. Review pending requests
3. Approve or reject requests
4. Approved users can complete registration

## User Activity

### Viewing Activity Log

1. Go to user detail page
2. Click **Activity** tab
3. View activity timeline:
   - Login/logout events
   - Profile changes
   - Permission changes
   - Product actions
4. Filter by date range or activity type

## Best Practices

1. **Regular Audits**
   - Review user access quarterly
   - Remove inactive users
   - Verify role assignments

2. **Password Policies**
   - Enforce strong passwords
   - Require regular password changes
   - Monitor password reset requests

3. **Reviewer Management**
   - Monitor reviewer workload
   - Balance assignments
   - Set appropriate availability schedules

4. **Invitations**
   - Set reasonable expiration times
   - Follow up on pending invitations
   - Resend if necessary

5. **Security**
   - Monitor failed login attempts
   - Review security event log regularly
   - Keep audit trail enabled

6. **Documentation**
   - Document permission changes
   - Record reasons for role changes
   - Maintain user onboarding checklist

## Troubleshooting

### User Cannot Login

1. Check user status (should be ACTIVE)
2. Check if account is locked
3. Verify password hasn't expired
4. Check failed login attempts
5. Unlock account if necessary

### Permission Issues

1. Check user's role
2. Review custom permissions
3. Verify permission hasn't expired
4. Check resource-specific permissions

### Email Delivery Issues

1. Verify email service configuration
2. Check spam folders
3. Verify email address is correct
4. Test email service connectivity

## Support

For additional help:
- Review [API Documentation](./user-management-api.md)
- Check [Setup Guide](./user-management-setup.md)
- Contact system administrator

