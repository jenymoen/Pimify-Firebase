/**
 * Database Schema Definitions for Workflow & Approval System
 * 
 * This file contains database schema definitions for the workflow system.
 * Since the current implementation uses Zustand with localStorage, these schemas
 * serve as documentation and can be used when implementing a real database backend.
 */

import { WorkflowState, UserRole } from '@/types/workflow';

// Product table schema with workflow extensions
export interface ProductTableSchema {
  // Existing Product fields
  id: string;
  basicInfo: {
    name: Record<string, string>; // MultilingualString
    sku: string;
    gtin?: string;
    internalId?: string;
    descriptionShort: Record<string, string>;
    descriptionLong: Record<string, string>;
    brand: string;
    status: 'active' | 'inactive' | 'development' | 'discontinued';
    launchDate?: string;
    endDate?: string;
  };
  attributesAndSpecs: {
    categories: string[];
    properties: Array<{ id: string; key: string; value: string }>;
    technicalSpecs: Array<{ id: string; key: string; value: string }>;
    maintenanceInstructions?: Record<string, string>;
    warrantyInfo?: Record<string, string>;
    countryOfOrigin?: string;
  };
  media: {
    images: Array<{
      id: string;
      url: string;
      altText?: Record<string, string>;
      type: 'image' | 'video' | '3d_model' | 'manual' | 'certificate';
      language?: string;
      title?: string;
      dataAiHint?: string;
    }>;
    videos?: Array<{
      id: string;
      url: string;
      altText?: Record<string, string>;
      type: 'image' | 'video' | '3d_model' | 'manual' | 'certificate';
      language?: string;
      title?: string;
      dataAiHint?: string;
    }>;
    models3d?: Array<{
      id: string;
      url: string;
      altText?: Record<string, string>;
      type: 'image' | 'video' | '3d_model' | 'manual' | 'certificate';
      language?: string;
      title?: string;
      dataAiHint?: string;
    }>;
    manuals?: Array<{
      id: string;
      url: string;
      altText?: Record<string, string>;
      type: 'image' | 'video' | '3d_model' | 'manual' | 'certificate';
      language?: string;
      title?: string;
      dataAiHint?: string;
    }>;
    certificates?: Array<{
      id: string;
      url: string;
      altText?: Record<string, string>;
      type: 'image' | 'video' | '3d_model' | 'manual' | 'certificate';
      language?: string;
      title?: string;
      dataAiHint?: string;
    }>;
  };
  marketingSEO: {
    seoTitle: Record<string, string>;
    seoDescription: Record<string, string>;
    keywords: string[];
    marketingTexts?: Array<{ id: string; channel: string; text: Record<string, string> }>;
    campaignCodes?: Array<{
      id: string;
      code: string;
      validFrom: string;
      validTo: string;
      description?: Record<string, string>;
    }>;
  };
  pricingAndStock?: {
    standardPrice: Array<{
      id: string;
      currency: string;
      amount: number;
      validFrom?: string;
      validTo?: string;
    }>;
    salePrice?: Array<{
      id: string;
      currency: string;
      amount: number;
      validFrom?: string;
      validTo?: string;
    }>;
    costPrice?: Array<{
      id: string;
      currency: string;
      amount: number;
      validFrom?: string;
      validTo?: string;
    }>;
  };
  options?: Array<{
    id: string;
    name: string;
    values: string[];
  }>;
  variants?: Array<{
    id: string;
    sku: string;
    gtin?: string;
    optionValues: Record<string, string>;
    standardPrice?: Array<{
      id: string;
      currency: string;
      amount: number;
      validFrom?: string;
      validTo?: string;
    }>;
    salePrice?: Array<{
      id: string;
      currency: string;
      amount: number;
      validFrom?: string;
      validTo?: string;
    }>;
    costPrice?: Array<{
      id: string;
      currency: string;
      amount: number;
      validFrom?: string;
      validTo?: string;
    }>;
    imageIds?: string[];
  }>;
  relations?: {
    relatedProducts?: string[];
    accessories?: string[];
    replacementProducts?: string[];
  };
  localizationNorway?: {
    norwegianRegulations?: string;
  };
  aiSummary?: Record<string, string>;
  qualityMetrics?: {
    completeness: number;
    accuracy: number;
    consistency: number;
    overall: number;
    issues: Array<{
      type: 'missing' | 'incomplete' | 'inconsistent' | 'invalid';
      field: string;
      message: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  };
  createdAt: string;
  updatedAt: string;

  // Workflow-specific fields
  workflowState: WorkflowState;
  assignedReviewer?: string;
  submittedBy?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  publishedBy?: string;
  publishedAt?: string;
  rejectionReason?: string;
}

// Audit trail table schema
export interface AuditTrailTableSchema {
  id: string;
  productId: string;
  userId: string;
  userEmail: string;
  action: string; // WorkflowAction enum value
  timestamp: string;
  fieldChanges: Array<{
    field: string;
    previousValue: any;
    newValue: any;
    fieldType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  }>;
  reason?: string;
  comment?: string;
  productState: WorkflowState;
  metadata?: Record<string, any>;
  createdAt: string;
}

// User roles table schema
export interface UserRolesTableSchema {
  id: string;
  userId: string;
  role: UserRole;
  permissions: Array<{
    resource: string;
    actions: string[];
    conditions?: Record<string, any>;
  }>;
  notificationPreferences: {
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
  };
  assignedProducts?: string[];
  createdAt: string;
  updatedAt: string;
}

// Notification templates table schema
export interface NotificationTemplatesTableSchema {
  id: string;
  type: 'email' | 'in_app';
  event: string; // WorkflowAction enum value
  subject?: string;
  template: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Database indexes for performance optimization
export const DATABASE_INDEXES = {
  products: [
    { fields: ['workflowState'], name: 'idx_products_workflow_state' },
    { fields: ['assignedReviewer'], name: 'idx_products_assigned_reviewer' },
    { fields: ['submittedBy'], name: 'idx_products_submitted_by' },
    { fields: ['reviewedBy'], name: 'idx_products_reviewed_by' },
    { fields: ['publishedBy'], name: 'idx_products_published_by' },
    { fields: ['submittedAt'], name: 'idx_products_submitted_at' },
    { fields: ['reviewedAt'], name: 'idx_products_reviewed_at' },
    { fields: ['publishedAt'], name: 'idx_products_published_at' },
    { fields: ['basicInfo.brand'], name: 'idx_products_brand' },
    { fields: ['attributesAndSpecs.categories'], name: 'idx_products_categories' },
    { fields: ['createdAt'], name: 'idx_products_created_at' },
    { fields: ['updatedAt'], name: 'idx_products_updated_at' },
  ],
  auditTrail: [
    { fields: ['productId'], name: 'idx_audit_trail_product_id' },
    { fields: ['userId'], name: 'idx_audit_trail_user_id' },
    { fields: ['action'], name: 'idx_audit_trail_action' },
    { fields: ['timestamp'], name: 'idx_audit_trail_timestamp' },
    { fields: ['productState'], name: 'idx_audit_trail_product_state' },
    { fields: ['productId', 'timestamp'], name: 'idx_audit_trail_product_timestamp' },
    { fields: ['userId', 'timestamp'], name: 'idx_audit_trail_user_timestamp' },
    { fields: ['action', 'timestamp'], name: 'idx_audit_trail_action_timestamp' },
  ],
  userRoles: [
    { fields: ['userId'], name: 'idx_user_roles_user_id' },
    { fields: ['role'], name: 'idx_user_roles_role' },
    { fields: ['assignedProducts'], name: 'idx_user_roles_assigned_products' },
  ],
  notificationTemplates: [
    { fields: ['type'], name: 'idx_notification_templates_type' },
    { fields: ['event'], name: 'idx_notification_templates_event' },
    { fields: ['isActive'], name: 'idx_notification_templates_is_active' },
    { fields: ['type', 'event'], name: 'idx_notification_templates_type_event' },
  ],
};

// SQL DDL statements for creating tables (for reference when implementing real database)
export const SQL_DDL_STATEMENTS = {
  addWorkflowFieldsToProducts: `
    ALTER TABLE products 
    ADD COLUMN workflow_state VARCHAR(20) NOT NULL DEFAULT 'published',
    ADD COLUMN assigned_reviewer VARCHAR(255),
    ADD COLUMN submitted_by VARCHAR(255),
    ADD COLUMN submitted_at TIMESTAMP,
    ADD COLUMN reviewed_by VARCHAR(255),
    ADD COLUMN reviewed_at TIMESTAMP,
    ADD COLUMN published_by VARCHAR(255),
    ADD COLUMN published_at TIMESTAMP,
    ADD COLUMN rejection_reason TEXT;
    
    ALTER TABLE products 
    ADD CONSTRAINT chk_workflow_state 
    CHECK (workflow_state IN ('draft', 'review', 'approved', 'published', 'rejected'));
  `,

  createAuditTrailTable: `
    CREATE TABLE audit_trail (
      id VARCHAR(255) PRIMARY KEY,
      product_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      user_email VARCHAR(255) NOT NULL,
      action VARCHAR(50) NOT NULL,
      timestamp TIMESTAMP NOT NULL,
      field_changes JSON,
      reason TEXT,
      comment TEXT,
      product_state VARCHAR(20) NOT NULL,
      metadata JSON,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      CONSTRAINT chk_audit_action CHECK (action IN ('create', 'edit', 'submit', 'approve', 'reject', 'publish', 'bulk_approve', 'bulk_reject', 'bulk_publish', 'assign_reviewer')),
      CONSTRAINT chk_audit_product_state CHECK (product_state IN ('draft', 'review', 'approved', 'published', 'rejected'))
    );
  `,

  createUserRolesTable: `
    CREATE TABLE user_roles (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL UNIQUE,
      role VARCHAR(20) NOT NULL,
      permissions JSON NOT NULL,
      notification_preferences JSON NOT NULL,
      assigned_products JSON,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      CONSTRAINT chk_user_role CHECK (role IN ('admin', 'editor', 'reviewer', 'viewer'))
    );
  `,

  createNotificationTemplatesTable: `
    CREATE TABLE notification_templates (
      id VARCHAR(255) PRIMARY KEY,
      type VARCHAR(10) NOT NULL,
      event VARCHAR(50) NOT NULL,
      subject VARCHAR(255),
      template TEXT NOT NULL,
      variables JSON NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      CONSTRAINT chk_template_type CHECK (type IN ('email', 'in_app')),
      CONSTRAINT chk_template_event CHECK (event IN ('create', 'edit', 'submit', 'approve', 'reject', 'publish', 'bulk_approve', 'bulk_reject', 'bulk_publish', 'assign_reviewer'))
    );
  `,

  createIndexes: `
    -- Product indexes
    CREATE INDEX idx_products_workflow_state ON products(workflow_state);
    CREATE INDEX idx_products_assigned_reviewer ON products(assigned_reviewer);
    CREATE INDEX idx_products_submitted_by ON products(submitted_by);
    CREATE INDEX idx_products_reviewed_by ON products(reviewed_by);
    CREATE INDEX idx_products_published_by ON products(published_by);
    CREATE INDEX idx_products_submitted_at ON products(submitted_at);
    CREATE INDEX idx_products_reviewed_at ON products(reviewed_at);
    CREATE INDEX idx_products_published_at ON products(published_at);
    
    -- Audit trail indexes
    CREATE INDEX idx_audit_trail_product_id ON audit_trail(product_id);
    CREATE INDEX idx_audit_trail_user_id ON audit_trail(user_id);
    CREATE INDEX idx_audit_trail_action ON audit_trail(action);
    CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp);
    CREATE INDEX idx_audit_trail_product_state ON audit_trail(product_state);
    CREATE INDEX idx_audit_trail_product_timestamp ON audit_trail(product_id, timestamp);
    CREATE INDEX idx_audit_trail_user_timestamp ON audit_trail(user_id, timestamp);
    CREATE INDEX idx_audit_trail_action_timestamp ON audit_trail(action, timestamp);
    
    -- User roles indexes
    CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
    CREATE INDEX idx_user_roles_role ON user_roles(role);
    
    -- Notification templates indexes
    CREATE INDEX idx_notification_templates_type ON notification_templates(type);
    CREATE INDEX idx_notification_templates_event ON notification_templates(event);
    CREATE INDEX idx_notification_templates_is_active ON notification_templates(is_active);
    CREATE INDEX idx_notification_templates_type_event ON notification_templates(type, event);
  `,
};

// Default values for workflow fields
export const DEFAULT_WORKFLOW_VALUES = {
  workflowState: WorkflowState.PUBLISHED, // Existing products default to published
  assignedReviewer: null,
  submittedBy: null,
  submittedAt: null,
  reviewedBy: null,
  reviewedAt: null,
  publishedBy: null,
  publishedAt: null,
  rejectionReason: null,
};
