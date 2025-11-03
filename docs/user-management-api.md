# User Management API Documentation

## Overview

The User Management API provides endpoints for managing users, authentication, invitations, reviewers, and related functionality.

**Base URL**: `http://localhost:9002/api` (development)

## Authentication

Most endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Obtaining Tokens

Tokens are obtained through the `/api/auth/login` endpoint. Access tokens expire after 15 minutes. Refresh tokens expire after 7 days.

## Endpoints

### Authentication

#### POST /api/auth/login

Authenticate a user and receive access/refresh tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "rememberMe": false
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "ADMIN",
    "status": "ACTIVE"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (401 - Invalid Credentials):**
```json
{
  "success": false,
  "error": "INVALID_CREDENTIALS"
}
```

#### POST /api/auth/logout

Log out the current user and invalidate the session.

**Response (200):**
```json
{
  "success": true
}
```

#### POST /api/auth/refresh

Refresh an access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/forgot-password

Request a password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent if account exists"
}
```

#### POST /api/auth/reset-password

Reset password using a reset token.

**Request Body:**
```json
{
  "token": "reset-token-123",
  "password": "newPassword123",
  "confirmPassword": "newPassword123"
}
```

**Response (200):**
```json
{
  "success": true
}
```

### Users

#### GET /api/users

List users with optional filters and pagination.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `pageSize` (number, default: 10) - Items per page
- `q` (string) - Search query (name, email)
- `roles` (string, comma-separated) - Filter by roles
- `statuses` (string, comma-separated) - Filter by statuses
- `departments` (string, comma-separated) - Filter by departments

**Example Request:**
```
GET /api/users?page=1&pageSize=20&roles=ADMIN,EDITOR&q=john
```

**Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": "user-123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "ADMIN",
      "status": "ACTIVE",
      "avatarUrl": null,
      "department": "Engineering",
      "lastActiveAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

#### POST /api/users

Create a new user. Requires ADMIN role.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "role": "EDITOR",
  "status": "ACTIVE",
  "department": "Engineering",
  "jobTitle": "Software Engineer"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "user-456",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "EDITOR",
    "status": "ACTIVE",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Response (409 - Duplicate Email):**
```json
{
  "success": false,
  "error": "DUPLICATE_EMAIL"
}
```

#### GET /api/users/[id]

Get user details by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "ADMIN",
    "status": "ACTIVE",
    "department": "Engineering",
    "jobTitle": "Engineering Manager",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLoginAt": "2024-01-15T08:00:00Z"
  }
}
```

#### PUT /api/users/[id]

Update user. Users can update their own profile; admins can update any user.

**Request Body:**
```json
{
  "name": "Updated Name",
  "department": "Product",
  "jobTitle": "Product Manager"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "name": "Updated Name",
    "department": "Product",
    "jobTitle": "Product Manager"
  }
}
```

#### DELETE /api/users/[id]

Soft delete a user. Requires ADMIN role.

**Response (200):**
```json
{
  "success": true
}
```

#### POST /api/users/[id]/activate

Activate a user account.

**Response (200):**
```json
{
  "success": true
}
```

#### POST /api/users/[id]/deactivate

Deactivate a user account.

**Response (200):**
```json
{
  "success": true
}
```

#### POST /api/users/[id]/suspend

Suspend a user account.

**Response (200):**
```json
{
  "success": true
}
```

#### POST /api/users/[id]/unlock

Unlock a locked user account.

**Response (200):**
```json
{
  "success": true
}
```

#### POST /api/users/[id]/reset-password

Reset a user's password (admin action).

**Request Body:**
```json
{
  "newPassword": "newPassword123",
  "requireChangeOnNextLogin": true
}
```

**Response (200):**
```json
{
  "success": true
}
```

#### POST /api/users/[id]/change-role

Change a user's role. Requires ADMIN role.

**Request Body:**
```json
{
  "role": "EDITOR",
  "reason": "Promoted to editor role"
}
```

**Response (200):**
```json
{
  "success": true
}
```

#### GET /api/users/[id]/activity

Get user activity log.

**Query Parameters:**
- `type` (string) - Filter by activity type
- `dateFrom` (string) - Start date (ISO 8601)
- `dateTo` (string) - End date (ISO 8601)

**Response (200):**
```json
{
  "success": true,
  "activities": [
    {
      "id": "activity-123",
      "action": "LOGIN",
      "timestamp": "2024-01-15T10:30:00Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

#### GET /api/users/[id]/sessions

Get user's active sessions.

**Response (200):**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "session-123",
      "device": "Windows",
      "browser": "Chrome",
      "ipAddress": "192.168.1.1",
      "lastActiveAt": "2024-01-15T10:30:00Z",
      "isCurrent": true
    }
  ]
}
```

#### DELETE /api/users/[id]/sessions/[sessionId]

Terminate a specific session.

**Response (200):**
```json
{
  "success": true
}
```

#### DELETE /api/users/[id]/sessions

Terminate all sessions for a user.

**Response (200):**
```json
{
  "success": true
}
```

### Bulk Operations

#### POST /api/users/bulk/role

Change roles for multiple users.

**Request Body:**
```json
{
  "userIds": ["user-1", "user-2", "user-3"],
  "role": "REVIEWER",
  "reason": "Bulk role assignment"
}
```

**Response (200 or 207):**
```json
{
  "success": true,
  "affected": 3,
  "errors": []
}
```

#### POST /api/users/bulk/activate

Activate multiple users.

**Request Body:**
```json
{
  "userIds": ["user-1", "user-2"]
}
```

**Response (200):**
```json
{
  "success": true,
  "affected": 2
}
```

#### POST /api/users/bulk/deactivate

Deactivate multiple users.

**Request Body:**
```json
{
  "userIds": ["user-1", "user-2"]
}
```

**Response (200):**
```json
{
  "success": true,
  "affected": 2
}
```

### Invitations

#### GET /api/invitations

List invitations.

**Query Parameters:**
- `status` (string) - Filter by status (PENDING, ACCEPTED, EXPIRED, CANCELLED)
- `page` (number) - Page number
- `pageSize` (number) - Items per page

**Response (200):**
```json
{
  "success": true,
  "invitations": [
    {
      "id": "inv-123",
      "email": "newuser@example.com",
      "role": "EDITOR",
      "invitedAt": "2024-01-15T10:00:00Z",
      "expiresAt": "2024-01-22T10:00:00Z",
      "status": "PENDING"
    }
  ]
}
```

#### POST /api/invitations

Create an invitation.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "EDITOR",
  "expiresInDays": 7
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "inv-123",
    "email": "newuser@example.com",
    "role": "EDITOR",
    "token": "invitation-token-123",
    "expiresAt": "2024-01-22T10:00:00Z"
  }
}
```

#### GET /api/invitations/[token]

Validate an invitation token.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "inv-123",
    "email": "newuser@example.com",
    "role": "EDITOR",
    "expiresAt": "2024-01-22T10:00:00Z"
  }
}
```

#### POST /api/invitations/[token]

Accept an invitation and create user account.

**Request Body:**
```json
{
  "password": "password123",
  "confirmPassword": "password123",
  "name": "New User"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user-123",
    "email": "newuser@example.com",
    "role": "EDITOR"
  }
}
```

### Reviewers

#### GET /api/reviewers

List all reviewers.

**Response (200):**
```json
{
  "success": true,
  "reviewers": [
    {
      "id": "rev-123",
      "name": "Reviewer One",
      "email": "reviewer@example.com",
      "availability": "AVAILABLE",
      "currentAssignments": 5,
      "maxAssignments": 10,
      "capacityPercentage": 50
    }
  ]
}
```

#### GET /api/reviewers/dashboard

Get reviewer dashboard data.

**Response (200):**
```json
{
  "success": true,
  "reviewers": [
    {
      "id": "rev-123",
      "name": "Reviewer One",
      "email": "reviewer@example.com",
      "availability": "AVAILABLE",
      "currentAssignments": 5,
      "maxAssignments": 10,
      "capacityPercentage": 50,
      "reviewsCompleted": 100,
      "avgTime": 2.5,
      "approvalRate": 0.85,
      "rating": 4.5
    }
  ],
  "total": 1,
  "overCapacity": 0,
  "averageApprovalRate": 0.85
}
```

#### POST /api/reviewers/[id]/availability

Update reviewer availability.

**Request Body:**
```json
{
  "availability": "BUSY",
  "startAt": 1705320000000,
  "endAt": 1705924800000
}
```

**Response (200):**
```json
{
  "success": true
}
```

#### POST /api/reviewers/[id]/delegate

Delegate reviewer assignments.

**Request Body (Backup Reviewer):**
```json
{
  "backupReviewerId": "rev-456"
}
```

**Request Body (Temporary Delegation):**
```json
{
  "temporary": true,
  "delegateId": "rev-456",
  "startAt": 1705320000000,
  "endAt": 1705924800000,
  "note": "Vacation coverage"
}
```

**Response (200):**
```json
{
  "success": true
}
```

### Permissions

#### GET /api/users/[id]/permissions

Get user permissions.

**Response (200):**
```json
{
  "success": true,
  "permissions": {
    "rolePermissions": ["products.read", "products.write"],
    "customPermissions": [
      {
        "id": "perm-123",
        "permission": "products.delete",
        "expiresAt": "2024-12-31T23:59:59Z"
      }
    ],
    "effectivePermissions": ["products.read", "products.write", "products.delete"]
  }
}
```

#### POST /api/users/[id]/permissions

Assign custom permission to user.

**Request Body:**
```json
{
  "permission": "products.delete",
  "resourceId": "product-123",
  "expiresAt": "2024-12-31T23:59:59Z",
  "reason": "Temporary access for project"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "perm-123",
    "permission": "products.delete"
  }
}
```

#### DELETE /api/users/[id]/permissions/[permId]

Revoke custom permission.

**Response (200):**
```json
{
  "success": true
}
```

### Import/Export

#### POST /api/users/import

Import users from CSV file.

**Request:** Multipart form data with CSV file

**Response (200):**
```json
{
  "success": true,
  "imported": 50,
  "failed": 2,
  "errors": ["Row 10: Invalid email format"]
}
```

#### GET /api/users/export

Export users to CSV.

**Query Parameters:**
- `filters` (string, JSON) - Export filters

**Response:** CSV file download

## Error Responses

All endpoints may return error responses with the following structure:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `VALIDATION_ERROR` (400) - Invalid request data
- `DUPLICATE_EMAIL` (409) - Email already exists
- `INVALID_TOKEN` (401) - Invalid or expired token
- `ACCOUNT_LOCKED` (423) - Account is locked
- `RATE_LIMIT_EXCEEDED` (429) - Too many requests

## Rate Limiting

Some endpoints have rate limiting:

- Login: 5 requests per minute
- Password Reset: 3 requests per hour
- Registration: 2 requests per hour
- General API: 100 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit` - Request limit
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Reset time (Unix timestamp)

