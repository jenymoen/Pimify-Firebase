# Task List: Workflow & Approval System Implementation

## Relevant Files

- `src/types/workflow.ts` - Type definitions for workflow states, roles, and audit trail data structures.
- `src/types/workflow.test.ts` - Unit tests for workflow type definitions.
- `src/lib/workflow-state-manager.ts` - Core workflow state management logic and validation.
- `src/lib/workflow-state-manager.test.ts` - Unit tests for workflow state management.
- `src/lib/role-permissions.ts` - Role-based permission system and access control logic.
- `src/lib/role-permissions.test.ts` - Unit tests for role permissions.
- `src/lib/audit-trail.ts` - Audit trail creation, storage, and retrieval functionality.
- `src/lib/audit-trail.test.ts` - Unit tests for audit trail functionality.
- `src/lib/notification-service.ts` - Email and in-app notification service.
- `src/lib/notification-service.test.ts` - Unit tests for notification service.
- `src/components/workflow/workflow-state-badge.tsx` - Visual workflow state indicator component.
- `src/components/workflow/workflow-state-badge.test.tsx` - Unit tests for workflow state badge.
- `src/components/workflow/state-transition-buttons.tsx` - Contextual action buttons for state transitions.
- `src/components/workflow/state-transition-buttons.test.tsx` - Unit tests for state transition buttons.
- `src/components/workflow/audit-trail-viewer.tsx` - Audit trail display component with filtering.
- `src/components/workflow/audit-trail-viewer.test.tsx` - Unit tests for audit trail viewer.
- `src/components/workflow/bulk-operations-panel.tsx` - Bulk operations interface with selection and filtering.
- `src/components/workflow/bulk-operations-panel.test.tsx` - Unit tests for bulk operations panel.
- `src/components/products/product-card.tsx` - Updated product card with workflow state indicators.
- `src/components/products/product-card.test.tsx` - Unit tests for updated product card.
- `src/app/api/workflow/state-transition/route.ts` - API endpoint for product state transitions.
- `src/app/api/workflow/bulk-operations/route.ts` - API endpoint for bulk workflow operations.
- `src/app/api/workflow/audit-trail/route.ts` - API endpoint for audit trail queries.
- `src/app/api/notifications/route.ts` - API endpoint for notification management.
- `src/middleware.ts` - Updated middleware for role-based access control.
- `src/app/(app)/products/page.tsx` - Updated products page with workflow filtering and bulk operations.
- `src/app/(app)/products/[id]/page.tsx` - Updated product detail page with workflow controls and audit trail.
- `src/app/(app)/admin/users/page.tsx` - User management page for admin role.
- `src/app/(app)/admin/users/page.test.tsx` - Unit tests for user management page.
- `src/lib/database-schema.ts` - Database schema definitions and SQL DDL statements for workflow system.
- `src/lib/migration-scripts.ts` - Migration scripts for adding workflow functionality to existing data.
- `src/lib/__tests__/migration-scripts.test.ts` - Unit tests for migration scripts.
- `src/lib/workflow-state-manager.ts` - Core workflow state management with transition validation.
- `src/lib/__tests__/workflow-state-manager.test.ts` - Unit tests for workflow state manager.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Database Schema and Type Definitions
  - [x] 1.1 Create workflow state enum with values: Draft, Review, Approved, Published, Rejected
  - [x] 1.2 Create user role enum with values: Admin, Editor, Reviewer, Viewer
  - [x] 1.3 Define ProductWorkflow interface extending existing Product type with workflow state and assigned reviewer fields
  - [x] 1.4 Define AuditTrailEntry interface with user, action, timestamp, field changes, reason, and product state
  - [x] 1.5 Define UserRole interface with role, permissions, and notification preferences
  - [x] 1.6 Define BulkOperationRequest interface for bulk action parameters
  - [x] 1.7 Define NotificationTemplate interface for email and in-app notifications
  - [x] 1.8 Add workflow state field to existing product database schema
  - [x] 1.9 Create audit_trail table with comprehensive change tracking fields
  - [x] 1.10 Create user_roles table for role-based permissions
  - [x] 1.11 Add database indexes for efficient workflow state and audit trail queries

- [ ] 2.0 Core Workflow State Management System
  - [x] 2.1 Implement WorkflowStateManager class with state transition validation
  - [ ] 2.2 Create state transition rules: Draft→Review, Review→Approved/Rejected, Approved→Published, Rejected→Draft
  - [ ] 2.3 Implement automatic state transitions (e.g., Rejected→Draft)
  - [ ] 2.4 Add state transition logging to audit trail
  - [ ] 2.5 Create workflow state validation middleware
  - [ ] 2.6 Implement concurrent editing prevention for products in Review state
  - [ ] 2.7 Add workflow state persistence and retrieval methods
  - [ ] 2.8 Create workflow state history tracking

- [ ] 3.0 Role-Based Permission System
  - [ ] 3.1 Implement RolePermissions class with permission checking logic
  - [ ] 3.2 Define Admin role permissions: full access, user management, workflow management, bulk operations
  - [ ] 3.3 Define Editor role permissions: create/edit Draft products, submit for review, view own products
  - [ ] 3.4 Define Reviewer role permissions: approve/reject Review products, view all products, add comments
  - [ ] 3.5 Define Viewer role permissions: read-only access, view audit trails
  - [ ] 3.6 Create permission middleware for API endpoints
  - [ ] 3.7 Implement role-based UI element visibility controls
  - [ ] 3.8 Add role assignment and management functionality
  - [ ] 3.9 Create permission caching system for performance
  - [ ] 3.10 Implement session-based role management

- [ ] 4.0 Audit Trail System
  - [ ] 4.1 Implement AuditTrailService for creating and storing audit entries
  - [ ] 4.2 Create audit entry for all product modifications (create, edit, approve, reject, publish)
  - [ ] 4.3 Implement field-level change tracking with before/after values
  - [ ] 4.4 Add audit trail search and filtering by user, date range, action type, product
  - [ ] 4.5 Create audit trail pagination for large datasets
  - [ ] 4.6 Implement immutable audit trail (no modification allowed)
  - [ ] 4.7 Add audit trail data retention policy (minimum 2 years)
  - [ ] 4.8 Create audit trail export functionality
  - [ ] 4.9 Implement audit trail performance optimization with indexing
  - [ ] 4.10 Add bulk operation audit trail logging

- [ ] 5.0 User Interface Components
  - [ ] 5.1 Create WorkflowStateBadge component with color-coded state indicators
  - [ ] 5.2 Create StateTransitionButtons component with role-based action availability
  - [ ] 5.3 Create AuditTrailViewer component with timeline layout and expandable details
  - [ ] 5.4 Create BulkOperationsPanel component with multi-select interface
  - [ ] 5.5 Update ProductCard component to include workflow state indicators
  - [ ] 5.6 Create WorkflowProgressIndicator component showing workflow steps
  - [ ] 5.7 Create RoleBasedWrapper component for conditional UI rendering
  - [ ] 5.8 Create NotificationPreferences component for user settings
  - [ ] 5.9 Create ReviewerAssignment component for product assignment
  - [ ] 5.10 Create WorkflowFilters component for product list filtering

- [ ] 6.0 API Endpoints and Integration
  - [ ] 6.1 Create /api/workflow/state-transition endpoint for product state changes
  - [ ] 6.2 Create /api/workflow/bulk-operations endpoint for bulk actions
  - [ ] 6.3 Create /api/workflow/audit-trail endpoint for audit trail queries
  - [ ] 6.4 Create /api/notifications endpoint for notification management
  - [ ] 6.5 Create /api/admin/users endpoint for user role management
  - [ ] 6.6 Update existing product API endpoints to include workflow state
  - [ ] 6.7 Integrate workflow states with existing Shopify export functionality
  - [ ] 6.8 Add role-based middleware to all product-related endpoints
  - [ ] 6.9 Implement API rate limiting for bulk operations
  - [ ] 6.10 Add API response caching for frequently accessed data

- [ ] 7.0 Notification System
  - [ ] 7.1 Implement NotificationService for email and in-app notifications
  - [ ] 7.2 Create notification templates for product submitted, approved, rejected, published
  - [ ] 7.3 Implement asynchronous email notification delivery
  - [ ] 7.4 Create in-app notification system with real-time updates
  - [ ] 7.5 Add notification preferences management for users
  - [ ] 7.6 Implement notification delivery tracking and retry logic
  - [ ] 7.7 Create notification history and management interface
  - [ ] 7.8 Add notification batching for bulk operations
  - [ ] 7.9 Implement notification unsubscribe functionality
  - [ ] 7.10 Add notification performance monitoring

- [ ] 8.0 Bulk Operations Interface
  - [ ] 8.1 Create bulk product selection interface with checkboxes
  - [ ] 8.2 Implement bulk filtering by category, brand, date range, reviewer, workflow state
  - [ ] 8.3 Create bulk approval action (Review → Approved)
  - [ ] 8.4 Create bulk rejection action (Review → Rejected)
  - [ ] 8.5 Create bulk state change actions (where permitted by role)
  - [ ] 8.6 Create bulk reviewer assignment functionality
  - [ ] 8.7 Implement bulk operation confirmation dialogs
  - [ ] 8.8 Add progress indicators for large bulk operations
  - [ ] 8.9 Create bulk operation result reporting
  - [ ] 8.10 Implement bulk operation error handling and rollback

- [ ] 9.0 Data Migration and Setup
  - [ ] 9.1 Create migration script to add workflow state to existing products
  - [ ] 9.2 Set all existing products to "Published" state by default
  - [ ] 9.3 Create initial admin user with full permissions
  - [ ] 9.4 Set up default notification preferences for existing users
  - [ ] 9.5 Create sample workflow data for testing
  - [ ] 9.6 Implement data validation for migrated products
  - [ ] 9.7 Create rollback procedures for migration
  - [ ] 9.8 Add migration progress tracking and logging
  - [ ] 9.9 Create post-migration data integrity checks
  - [ ] 9.10 Document migration procedures and requirements

- [ ] 10.0 Testing and Quality Assurance
  - [ ] 10.1 Write unit tests for all workflow state management functions
  - [ ] 10.2 Write unit tests for role-based permission system
  - [ ] 10.3 Write unit tests for audit trail functionality
  - [ ] 10.4 Write unit tests for notification service
  - [ ] 10.5 Write integration tests for API endpoints
  - [ ] 10.6 Write component tests for all workflow UI components
  - [ ] 10.7 Write end-to-end tests for complete workflow scenarios
  - [ ] 10.8 Perform performance testing for bulk operations (100+ products)
  - [ ] 10.9 Test workflow integration with existing Shopify export
  - [ ] 10.10 Conduct security testing for role-based access control
  - [ ] 10.11 Test notification delivery and email service integration
  - [ ] 10.12 Perform load testing for 1,000-10,000+ products
  - [ ] 10.13 Test audit trail performance with large datasets
  - [ ] 10.14 Validate data migration scripts and procedures
