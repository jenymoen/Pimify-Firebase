# User Management System - Setup Guide

## Overview

This guide covers the setup and configuration of the User Management System for Pimify.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL/MySQL database (or SQLite for development)
- SMTP server or email service account (SendGrid, AWS SES, etc.)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Required Variables

```bash
# JWT Secrets (generate strong secrets for production)
JWT_SECRET=your-secret-key-change-in-production-minimum-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production-minimum-32-characters

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pimify

# Email Service
EMAIL_SERVICE_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
EMAIL_FROM_ADDRESS=noreply@pimify.com
EMAIL_FROM_NAME=Pimify Notifications
```

### Optional Variables

See `.env.example` for a complete list of configurable variables including:
- SSO provider credentials (Google, Microsoft, OIDC, SAML)
- LDAP configuration
- Rate limiting settings
- File upload limits
- Password policies
- Session timeouts

## Database Setup

### 1. Create Database

```sql
CREATE DATABASE pimify;
```

### 2. Run Migrations

The user management system includes SQL migrations located in `src/lib/migrations/`.

**PostgreSQL Example:**
```bash
psql -U postgres -d pimify -f src/lib/migrations/001_create_user_management_tables.sql
```

**Or use the migration script:**
```bash
npm run migrate
```

### 3. Verify Tables

Verify that the following tables exist:
- `users`
- `user_invitations`
- `user_sessions`
- `user_activity_logs`
- `dynamic_permissions` (if not already created)
- `audit_trail` (if not already created)

## Initial Admin User Creation

### Option 1: Via API

After starting the application, create the first admin user via API:

```bash
curl -X POST http://localhost:9002/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@pimify.com",
    "password": "SecurePassword123!",
    "name": "Admin User",
    "role": "ADMIN",
    "status": "ACTIVE"
  }'
```

**Note:** In production, you may want to disable registration and create the admin user directly in the database or via a setup script.

### Option 2: Via Database

```sql
-- Insert admin user (password: Admin123! - change this!)
INSERT INTO users (
  id,
  email,
  password_hash,
  name,
  role,
  status,
  created_at
) VALUES (
  gen_random_uuid(),
  'admin@pimify.com',
  '$2b$10$YourHashedPasswordHere', -- Use bcrypt to hash password
  'Admin User',
  'ADMIN',
  'ACTIVE',
  NOW()
);
```

**Generate password hash:**
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('YourPassword123!', 10);
console.log(hash);
```

### Option 3: Via Setup Script

Create a setup script `scripts/create-admin.js`:

```javascript
const { userService } = require('../src/lib/user-service');

async function createAdmin() {
  const result = await userService.create({
    email: 'admin@pimify.com',
    password: 'SecurePassword123!',
    name: 'Admin User',
    role: 'ADMIN',
    status: 'ACTIVE',
  });
  
  console.log('Admin user created:', result);
}

createAdmin();
```

Run: `node scripts/create-admin.js`

## Email Service Configuration

### SMTP Configuration

Configure SMTP settings in `.env.local`:

```bash
EMAIL_SERVICE_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM_ADDRESS=noreply@pimify.com
EMAIL_FROM_NAME=Pimify Notifications
```

### SendGrid Configuration

```bash
EMAIL_SERVICE_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM_ADDRESS=noreply@pimify.com
```

### AWS SES Configuration

```bash
EMAIL_SERVICE_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
EMAIL_FROM_ADDRESS=noreply@pimify.com
```

**Note:** Verify your sender email address in AWS SES before sending emails.

## SSO Configuration (Optional)

### Google OAuth

1. Create OAuth credentials in Google Cloud Console
2. Configure redirect URI: `http://localhost:9002/api/auth/sso/google/callback`
3. Add to `.env.local`:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:9002/api/auth/sso/google/callback
ENABLE_SSO=true
```

### Microsoft OAuth

1. Register application in Azure Active Directory
2. Configure redirect URI: `http://localhost:9002/api/auth/sso/microsoft/callback`
3. Add to `.env.local`:

```bash
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_REDIRECT_URI=http://localhost:9002/api/auth/sso/microsoft/callback
ENABLE_SSO=true
```

### Generic OIDC

```bash
OIDC_CLIENT_ID=your-oidc-client-id
OIDC_CLIENT_SECRET=your-oidc-client-secret
OIDC_ISSUER=https://your-oidc-provider.com
OIDC_REDIRECT_URI=http://localhost:9002/api/auth/sso/oidc/callback
ENABLE_SSO=true
```

### Generic SAML

```bash
SAML_ENTRY_POINT=https://your-saml-provider.com/sso
SAML_ISSUER=https://pimify.com
SAML_CERT=your-saml-certificate-pem
SAML_REDIRECT_URI=http://localhost:9002/api/auth/sso/saml/callback
ENABLE_SSO=true
```

## LDAP Configuration (Optional)

1. Configure LDAP settings in `.env.local`:

```bash
LDAP_ENABLED=true
LDAP_URL=ldap://ldap.example.com:389
LDAP_BASE_DN=dc=example,dc=com
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=your-ldap-password
LDAP_USER_SEARCH_BASE=ou=users,dc=example,dc=com
LDAP_USER_SEARCH_FILTER=(uid={{username}})
LDAP_GROUP_SEARCH_BASE=ou=groups,dc=example,dc=com
LDAP_GROUP_SEARCH_FILTER=(member={{dn}})
```

2. Test LDAP connection via API or admin panel

## Configuration File

User management settings are configured in `src/config/user-management.ts`. Key configurations:

### Password Policy

- Minimum length: 8 characters (configurable)
- Require uppercase, lowercase, numbers, special characters
- Maximum age: 90 days
- Prevent reuse of last 5 passwords

### Session Configuration

- Timeout: 60 minutes
- Max concurrent sessions: 5
- Inactivity timeout: 30 minutes

### Rate Limiting

- Login: 5 requests/minute
- Password reset: 3 requests/hour
- Registration: 2 requests/hour
- General API: 100 requests/minute

## Running the Application

### Development

```bash
npm install
npm run dev
```

The application will start on `http://localhost:9002`

### Production

```bash
npm run build
npm start
```

## Verification

### 1. Test Database Connection

```bash
# Check database tables
psql -U postgres -d pimify -c "\dt"
```

### 2. Test API Endpoints

```bash
# Health check
curl http://localhost:9002/api/health

# Test login (after creating admin user)
curl -X POST http://localhost:9002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@pimify.com", "password": "SecurePassword123!"}'
```

### 3. Test Email Service

Create a test invitation to verify email delivery:

```bash
curl -X POST http://localhost:9002/api/invitations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"email": "test@example.com", "role": "VIEWER"}'
```

## Security Checklist

Before deploying to production:

- [ ] Change default JWT secrets
- [ ] Use strong, unique passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS appropriately
- [ ] Set up rate limiting
- [ ] Enable audit trail logging
- [ ] Configure secure session storage
- [ ] Review and restrict file upload settings
- [ ] Set up backup and recovery procedures
- [ ] Configure error logging (Sentry, Loggly, etc.)
- [ ] Perform security audit
- [ ] Set up monitoring and alerting

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` format
- Check database server is running
- Verify user permissions
- Check firewall settings

### Email Not Sending

- Verify SMTP credentials
- Check SPF/DKIM records for sender domain
- Test with a simple email service first (Gmail, SendGrid)
- Check application logs for error messages

### SSO Not Working

- Verify redirect URIs match exactly
- Check client ID and secret
- Verify issuer URLs
- Check token expiration settings

### Permission Errors

- Verify admin user has correct role
- Check `role-permissions.ts` configuration
- Review audit logs for denied permissions

## Next Steps

1. Create initial admin user
2. Configure email service
3. Set up SSO (if needed)
4. Configure LDAP (if needed)
5. Review and adjust security settings
6. Set up monitoring and logging
7. Train administrators

For more information, see:
- [API Documentation](./user-management-api.md)
- [Admin User Guide](./user-management-admin-guide.md)
- [User Guide](./user-management-user-guide.md)

