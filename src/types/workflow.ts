/**
 * Workflow & Approval System Type Definitions
 * 
 * This file contains all type definitions for the workflow and approval system,
 * including workflow states, user roles, audit trail, and related interfaces.
 */

// Import the existing Product type
import type { Product } from './product';

// Workflow State Enum
export enum WorkflowState {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  REJECTED = 'rejected'
}

// User Role Enum
export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  REVIEWER = 'reviewer',
  VIEWER = 'viewer'
}

// Workflow Action Types
export enum WorkflowAction {
  CREATE = 'create',
  EDIT = 'edit',
  SUBMIT = 'submit',
  APPROVE = 'approve',
  REJECT = 'reject',
  PUBLISH = 'publish',
  BULK_APPROVE = 'bulk_approve',
  BULK_REJECT = 'bulk_reject',
  BULK_PUBLISH = 'bulk_publish',
  ASSIGN_REVIEWER = 'assign_reviewer',
  VIEW_AUDIT_TRAIL = 'view_audit_trail',
  MANAGE_USERS = 'manage_users',
  CONFIGURE_WORKFLOW = 'configure_workflow',
  VIEW_ALL_PRODUCTS = 'view_all_products',
  VIEW_PRODUCT_HISTORY = 'view_product_history',
  MANAGE_NOTIFICATIONS = 'manage_notifications',
  PERFORM_BULK_OPERATIONS = 'perform_bulk_operations',
  EXPORT_PRODUCTS = 'export_products',
  SUBMIT_FOR_REVIEW = 'submit_for_review',
  REVERT_TO_DRAFT = 'revert_to_draft',
  ADD_COMMENT = 'add_comment',
  VIEW_BULK_OPERATIONS = 'view_bulk_operations',
  CANCEL_BULK_OPERATIONS = 'cancel_bulk_operations',
  BULK_OPERATIONS = 'bulk_operations',
  DELETE = 'delete',
}

// Field Change Tracking
export interface FieldChange {
  field: string;
  previousValue: any;
  newValue: any;
  fieldType: 'string' | 'number' | 'boolean' | 'object' | 'array';
}

// Audit Trail Entry
export interface AuditTrailEntry {
  id: string;
  productId: string;
  userId: string;
  userEmail: string;
  action: WorkflowAction;
  timestamp: string;
  fieldChanges: FieldChange[];
  reason?: string;
  comment?: string;
  productState: WorkflowState;
  metadata?: Record<string, any>;
}

// User Role with Permissions
export interface UserRoleData {
  id: string;
  userId: string;
  role: UserRole;
  permissions: Permission[];
  notificationPreferences: NotificationPreferences;
  assignedProducts?: string[]; // For reviewers
  createdAt: string;
  updatedAt: string;
}

// Permission System
export interface Permission {
  resource: string; // e.g., 'products', 'users', 'workflow'
  actions: string[]; // e.g., ['read', 'write', 'delete', 'approve']
  conditions?: Record<string, any>; // Additional conditions for the permission
}

// Notification Preferences
export interface NotificationPreferences {
  email: {
    productSubmitted: boolean;
    productApproved: boolean;
    productRejected: boolean;
    productPublished: boolean;
    bulkOperations: boolean;
  };
  inApp: {
    productSubmitted: boolean;
    productApproved: boolean;
    productRejected: boolean;
    productPublished: boolean;
    bulkOperations: boolean;
  };
}

// Product with Workflow Extension
export interface ProductWorkflow extends Omit<Product, 'assignedReviewer' | 'workflowHistory'> {
  workflowState: WorkflowState;
  assignedReviewer?: string;
  submittedBy?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  publishedBy?: string;
  publishedAt?: string;
  rejectionReason?: string;
  workflowHistory: WorkflowStateHistory[];
}

// Workflow State History
export interface WorkflowStateHistory {
  state: WorkflowState;
  timestamp: string;
  userId: string;
  reason?: string;
  comment?: string;
}

// Bulk Operation Request
export interface BulkOperationRequest {
  operation: WorkflowAction;
  productIds: string[];
  reason?: string;
  comment?: string;
  assignedReviewer?: string;
  filters?: BulkOperationFilters;
}

// Bulk Operation Filters
export interface BulkOperationFilters {
  categories?: string[];
  brands?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  workflowStates?: WorkflowState[];
  assignedReviewers?: string[];
}

// Bulk Operation Result
export interface BulkOperationResult {
  operationId: string;
  totalProducts: number;
  successfulProducts: number;
  failedProducts: number;
  errors: BulkOperationError[];
  completedAt: string;
}

// Bulk Operation Error
export interface BulkOperationError {
  productId: string;
  error: string;
  details?: any;
}

// Notification Template
export interface NotificationTemplate {
  id: string;
  type: 'email' | 'in_app';
  event: WorkflowAction;
  subject?: string; // For email
  template: string;
  variables: string[]; // Available template variables
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// State Transition Rules
export interface StateTransitionRule {
  from: WorkflowState;
  to: WorkflowState;
  requiredRole: UserRole;
  requiredPermissions: string[];
  isAutomatic: boolean;
  conditions?: Record<string, any>;
}

// Workflow Configuration
export interface WorkflowConfig {
  stateTransitionRules: StateTransitionRule[];
  defaultNotificationPreferences: NotificationPreferences;
  autoAssignmentRules?: {
    reviewerAssignment: 'manual' | 'round_robin' | 'workload_based';
    defaultReviewer?: string;
  };
  notificationSettings: {
    enableEmailNotifications: boolean;
    enableInAppNotifications: boolean;
    batchNotificationDelay: number; // in minutes
  };
  auditTrailSettings: {
    retentionPeriod: number; // in days
    enableFieldLevelTracking: boolean;
    enableExport: boolean;
  };
}

// API Response Types
export interface WorkflowApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter and Search Types
export interface AuditTrailFilters {
  userId?: string;
  productId?: string;
  action?: WorkflowAction;
  dateRange?: {
    start: string;
    end: string;
  };
  workflowState?: WorkflowState;
}

export interface ProductFilters {
  workflowState?: WorkflowState[];
  assignedReviewer?: string[];
  submittedBy?: string[];
  categories?: string[];
  brands?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

// Default Values
export const defaultNotificationPreferences: NotificationPreferences = {
  email: {
    productSubmitted: true,
    productApproved: true,
    productRejected: true,
    productPublished: true,
    bulkOperations: false,
  },
  inApp: {
    productSubmitted: true,
    productApproved: true,
    productRejected: true,
    productPublished: true,
    bulkOperations: true,
  },
};

export const defaultWorkflowConfig: WorkflowConfig = {
  stateTransitionRules: [
    {
      from: WorkflowState.DRAFT,
      to: WorkflowState.REVIEW,
      requiredRole: UserRole.EDITOR,
      requiredPermissions: ['products:write'],
      isAutomatic: false,
    },
    {
      from: WorkflowState.REVIEW,
      to: WorkflowState.APPROVED,
      requiredRole: UserRole.REVIEWER,
      requiredPermissions: ['workflow:approve'],
      isAutomatic: false,
    },
    {
      from: WorkflowState.REVIEW,
      to: WorkflowState.REJECTED,
      requiredRole: UserRole.REVIEWER,
      requiredPermissions: ['workflow:reject'],
      isAutomatic: false,
    },
    {
      from: WorkflowState.APPROVED,
      to: WorkflowState.PUBLISHED,
      requiredRole: UserRole.ADMIN,
      requiredPermissions: ['workflow:publish'],
      isAutomatic: false,
    },
    {
      from: WorkflowState.REJECTED,
      to: WorkflowState.DRAFT,
      requiredRole: UserRole.EDITOR,
      requiredPermissions: ['products:write'],
      isAutomatic: true,
    },
  ],
  defaultNotificationPreferences: defaultNotificationPreferences,
  autoAssignmentRules: {
    reviewerAssignment: 'manual',
  },
  notificationSettings: {
    enableEmailNotifications: true,
    enableInAppNotifications: true,
    batchNotificationDelay: 5,
  },
  auditTrailSettings: {
    retentionPeriod: 730, // 2 years
    enableFieldLevelTracking: true,
    enableExport: true,
  },
};

// Permission System Types
export interface DynamicPermission {
  id: string;
  permission: string;
  context?: Record<string, any>;
  expiresAt?: string;
  assignedBy: string;
  assignedAt: string;
}

export interface PermissionDefinition {
  name: string;
  description: string;
  resource?: string;
  action: string;
}

export interface PermissionContext {
  userId: string;
  userRole: UserRole;
  resourceId?: string;
  resourceType?: string;
  metadata?: Record<string, any>;
}

export interface PermissionResult {
  hasPermission: boolean;
  reason: string;
  source: 'role' | 'dynamic' | 'hierarchy' | 'ownership' | 'assignment' | 'admin_override' | 'denied';
  cached?: boolean;
  checkTime?: number;
}

export interface RolePermissionConfig {
  role: UserRole;
  permissions: string[];
  inheritsFrom?: UserRole[];
  restrictions?: string[];
}
