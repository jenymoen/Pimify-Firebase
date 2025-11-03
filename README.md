# Pimify - Product Information Management System

A comprehensive Product Information Management (PIM) system built with Next.js, featuring user management, workflow approval, quality dashboard, and more.

## Features

### User Management System
- **User CRUD Operations** - Create, read, update, and delete users
- **Role-Based Access Control** - ADMIN, EDITOR, REVIEWER, VIEWER roles with granular permissions
- **Authentication** - JWT-based auth with refresh tokens, password reset, 2FA support
- **Invitations** - Send user invitations with customizable expiration
- **Self-Registration** - Optional user registration with admin approval
- **Reviewer Management** - Workload tracking, availability scheduling, delegation
- **Bulk Operations** - Bulk role changes, status updates, import/export
- **Activity Logging** - Comprehensive audit trail and user activity tracking
- **SSO Integration** - Support for Google, Microsoft, OIDC, and SAML
- **LDAP Integration** - Active Directory and LDAP support
- **Session Management** - Active session tracking and termination
- **Password Policies** - Configurable password requirements and expiration
- **Rate Limiting** - API rate limiting for security

### Product Management
- Product CRUD operations
- Product quality scoring
- Product import/export (CSV, JSON)
- Shopify integration

### Workflow System
- State-based approval workflows
- Reviewer assignments
- Bulk approval/rejection
- Workflow history tracking

### Quality Dashboard
- Product quality metrics
- Quality score tracking
- Quality rules configuration

## Tech Stack

- **Framework:** Next.js 15.2.3
- **Language:** TypeScript
- **UI:** React 18, Tailwind CSS, Shadcn/ui
- **State Management:** Zustand, React Query
- **Authentication:** JWT, bcrypt
- **Database:** PostgreSQL/MySQL/SQLite
- **Testing:** Jest, React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL/MySQL database (or SQLite for development)
- Email service (SMTP, SendGrid, or AWS SES)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd Pimify
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Copy .env.example to .env.local
# Fill in required values (see docs/user-management-setup.md)
```

Required environment variables:
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_REFRESH_SECRET` - Secret key for refresh tokens
- `DATABASE_URL` - Database connection string
- `EMAIL_SERVICE_PROVIDER` - Email provider (smtp, sendgrid, ses)
- `SMTP_*` or `SENDGRID_API_KEY` or AWS SES credentials
- `EMAIL_FROM_ADDRESS` - Sender email address

4. Set up database
```bash
# Run migrations
psql -U postgres -d pimify -f src/lib/migrations/001_create_user_management_tables.sql
```

5. Create initial admin user
```bash
# See docs/user-management-setup.md for options
```

6. Run development server
```bash
npm run dev
```

The application will be available at `http://localhost:9002`

## Documentation

### User Management

- **[Setup Guide](./docs/user-management-setup.md)** - Installation, configuration, and initial setup
- **[API Documentation](./docs/user-management-api.md)** - Complete API reference with examples
- **[Admin Guide](./docs/user-management-admin-guide.md)** - Guide for administrators
- **[User Guide](./docs/user-management-user-guide.md)** - Guide for regular users

### Testing

- **[Testing Summary](./docs/testing-summary.md)** - Test coverage and testing information

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── (app)/             # Authenticated routes
│   │   ├── dashboard/     # Dashboard page
│   │   ├── products/      # Product management
│   │   ├── users/         # User management pages
│   │   ├── reviewers/     # Reviewer dashboard
│   │   └── settings/      # Settings pages
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── users/         # User management endpoints
│   │   ├── invitations/   # Invitation endpoints
│   │   └── reviewers/     # Reviewer endpoints
│   └── auth/              # Authentication pages
├── components/             # React components
│   ├── users/             # User management components
│   ├── auth/              # Authentication components
│   ├── products/          # Product components
│   └── ui/                # UI primitives (Shadcn)
├── lib/                    # Services and utilities
│   ├── user-service.ts    # User management service
│   ├── auth-service.ts    # Authentication service
│   ├── reviewer-service.ts # Reviewer management
│   └── __tests__/         # Service unit tests
├── types/                  # TypeScript type definitions
├── hooks/                  # React hooks
├── context/                # React context providers
└── config/                 # Configuration files

docs/                       # Documentation
tasks/                      # Project task lists and PRDs
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm test             # Run tests
npm test:watch       # Run tests in watch mode
npm test:coverage    # Run tests with coverage
npm lint             # Run linter
npm typecheck        # TypeScript type checking
```

## User Roles

- **ADMIN** - Full system access
  - Manage all users
  - Configure system settings
  - Access all features

- **EDITOR** - Content management
  - Create and edit products
  - Manage users (limited)
  - Submit for review

- **REVIEWER** - Content review
  - Review and approve/reject products
  - Manage workload and availability
  - View reviewer dashboard

- **VIEWER** - Read-only access
  - View products and dashboards
  - View user list (limited)

## Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Account lockout after failed attempts
- Two-factor authentication (2FA)
- Session management and tracking
- Rate limiting on API endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Audit trail logging

## Configuration

User management settings are configured in:
- `src/config/user-management.ts` - Centralized configuration
- Environment variables in `.env.local`
- Database schema in `src/lib/database-schema.ts`

Key configuration areas:
- Password policies
- Session timeouts
- Rate limiting
- File upload limits
- Email service settings
- SSO/LDAP configuration

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/[id]` - Get user
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Delete user

See [API Documentation](./docs/user-management-api.md) for complete reference.

## Testing

The project includes comprehensive test coverage:

- **Unit Tests** - Service and utility tests (80%+ coverage target)
- **Integration Tests** - API route integration tests
- **Component Tests** - React component tests

Run tests:
```bash
npm test
npm test:coverage
```

## Deployment

### Production Checklist

- [ ] Update environment variables
- [ ] Set strong JWT secrets
- [ ] Configure database connection
- [ ] Set up email service
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS
- [ ] Set up monitoring and logging
- [ ] Perform security audit
- [ ] Run database migrations
- [ ] Create initial admin user
- [ ] Test production deployment

See [Setup Guide](./docs/user-management-setup.md) for detailed deployment instructions.

## Contributing

1. Follow code style guidelines
2. Write tests for new features
3. Update documentation
4. Submit pull request

## License

[Your License Here]

## Support

For help and support:
- Review documentation in `docs/`
- Check [Setup Guide](./docs/user-management-setup.md)
- Contact system administrator

## Changelog

### User Management System v1.0
- Initial release with comprehensive user management
- Authentication and authorization
- Reviewer management
- Invitation system
- Bulk operations
- SSO and LDAP support
