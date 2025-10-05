/**
 * Migration Scripts for Workflow & Approval System
 * 
 * This file contains migration scripts to add workflow functionality to existing data.
 * Since the current implementation uses Zustand with localStorage, these scripts
 * handle the migration of existing product data to include workflow fields.
 */

import { WorkflowState } from '@/types/workflow';
import type { Product } from '@/types/product';
import type { ProductWorkflow } from '@/types/workflow';
import { useProductStore } from './product-store';

// Migration version tracking
export const MIGRATION_VERSION = '1.0.0';
export const MIGRATION_KEY = 'workflow_migration_completed';

/**
 * Migrates existing products to include workflow fields
 * Sets all existing products to "Published" state by default
 */
export function migrateProductsToWorkflow(): {
  success: boolean;
  migratedCount: number;
  errors: string[];
} {
  const errors: string[] = [];
  let migratedCount = 0;

  try {
    const store = useProductStore.getState();
    const products = store.products;

    if (!Array.isArray(products)) {
      errors.push('Products data is not an array');
      return { success: false, migratedCount: 0, errors };
    }

    const migratedProducts: ProductWorkflow[] = products.map((product: Product) => {
      try {
        // Check if product already has workflow fields
        if ('workflowState' in product) {
          return product as ProductWorkflow;
        }

        // Add workflow fields to existing product
        const migratedProduct: ProductWorkflow = {
          ...product,
          workflowState: WorkflowState.PUBLISHED, // Default to published for existing products
          assignedReviewer: undefined,
          submittedBy: undefined,
          submittedAt: undefined,
          reviewedBy: undefined,
          reviewedAt: undefined,
          publishedBy: undefined,
          publishedAt: product.updatedAt, // Use updatedAt as publishedAt for existing products
          rejectionReason: undefined,
          workflowHistory: [
            {
              state: WorkflowState.PUBLISHED,
              timestamp: product.updatedAt,
              userId: 'system', // System migration
              reason: 'Migrated from existing product data',
            },
          ],
        };

        migratedCount++;
        return migratedProduct;
      } catch (error) {
        errors.push(`Failed to migrate product ${product.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return product as ProductWorkflow;
      }
    });

    // Update the store with migrated products
    store.setProducts(migratedProducts);

    // Mark migration as completed
    if (typeof window !== 'undefined') {
      localStorage.setItem(MIGRATION_KEY, MIGRATION_VERSION);
    }

    return {
      success: errors.length === 0,
      migratedCount,
      errors,
    };
  } catch (error) {
    errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      migratedCount,
      errors,
    };
  }
}

/**
 * Checks if migration has been completed
 */
export function isMigrationCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  
  const completedVersion = localStorage.getItem(MIGRATION_KEY);
  return completedVersion === MIGRATION_VERSION;
}

/**
 * Runs migration if not already completed
 */
export function runMigrationIfNeeded(): {
  success: boolean;
  migratedCount: number;
  errors: string[];
  wasNeeded: boolean;
} {
  if (isMigrationCompleted()) {
    return {
      success: true,
      migratedCount: 0,
      errors: [],
      wasNeeded: false,
    };
  }

  const result = migrateProductsToWorkflow();
  return {
    ...result,
    wasNeeded: true,
  };
}

/**
 * Creates initial admin user with full permissions
 */
export function createInitialAdminUser(): {
  success: boolean;
  userId: string;
  errors: string[];
} {
  const errors: string[] = [];
  
  try {
    // Generate admin user ID
    const adminUserId = 'admin-user-' + Date.now();
    
    // Create admin user role data
    const adminUserRole = {
      id: 'admin-role-' + Date.now(),
      userId: adminUserId,
      role: 'admin' as const,
      permissions: [
        {
          resource: 'products',
          actions: ['read', 'write', 'delete', 'approve', 'reject', 'publish'],
        },
        {
          resource: 'users',
          actions: ['read', 'write', 'delete', 'manage_roles'],
        },
        {
          resource: 'workflow',
          actions: ['manage', 'view_audit_trail', 'bulk_operations'],
        },
        {
          resource: 'notifications',
          actions: ['read', 'write', 'manage_templates'],
        },
      ],
      notificationPreferences: {
        email: {
          productSubmitted: true,
          productApproved: true,
          productRejected: true,
          productPublished: true,
          bulkOperations: true,
        },
        inApp: {
          productSubmitted: true,
          productApproved: true,
          productRejected: true,
          productPublished: true,
          bulkOperations: true,
        },
      },
      assignedProducts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store admin user role in localStorage
    if (typeof window !== 'undefined') {
      const existingRoles = JSON.parse(localStorage.getItem('user_roles') || '[]');
      existingRoles.push(adminUserRole);
      localStorage.setItem('user_roles', JSON.stringify(existingRoles));
    }

    return {
      success: true,
      userId: adminUserId,
      errors: [],
    };
  } catch (error) {
    errors.push(`Failed to create admin user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      userId: '',
      errors,
    };
  }
}

/**
 * Sets up default notification preferences for existing users
 */
export function setupDefaultNotificationPreferences(): {
  success: boolean;
  usersUpdated: number;
  errors: string[];
} {
  const errors: string[] = [];
  let usersUpdated = 0;

  try {
    if (typeof window === 'undefined') {
      return { success: true, usersUpdated: 0, errors: [] };
    }

    const existingRoles = JSON.parse(localStorage.getItem('user_roles') || '[]');
    
    const updatedRoles = existingRoles.map((userRole: any) => {
      // Check if user already has notification preferences
      if (userRole.notificationPreferences) {
        return userRole;
      }

      // Add default notification preferences
      const updatedUserRole = {
        ...userRole,
        notificationPreferences: {
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
        },
        updatedAt: new Date().toISOString(),
      };

      usersUpdated++;
      return updatedUserRole;
    });

    localStorage.setItem('user_roles', JSON.stringify(updatedRoles));

    return {
      success: true,
      usersUpdated,
      errors: [],
    };
  } catch (error) {
    errors.push(`Failed to setup notification preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      usersUpdated,
      errors,
    };
  }
}

/**
 * Creates sample workflow data for testing
 */
export function createSampleWorkflowData(): {
  success: boolean;
  sampleDataCreated: {
    products: number;
    auditEntries: number;
    userRoles: number;
    notificationTemplates: number;
  };
  errors: string[];
} {
  const errors: string[] = [];
  const sampleDataCreated = {
    products: 0,
    auditEntries: 0,
    userRoles: 0,
    notificationTemplates: 0,
  };

  try {
    if (typeof window === 'undefined') {
      return { success: true, sampleDataCreated, errors: [] };
    }

    // Create sample products in different workflow states
    const sampleProducts: ProductWorkflow[] = [
      {
        id: 'sample-draft-001',
        basicInfo: {
          name: { en: 'Sample Draft Product', no: 'Eksempel Utkast Produkt' },
          sku: 'SAMPLE-DRAFT-001',
          descriptionShort: { en: 'A product in draft state', no: 'Et produkt i utkast tilstand' },
          descriptionLong: { en: 'This product is currently being edited and is in draft state.', no: 'Dette produktet redigeres for øyeblikket og er i utkast tilstand.' },
          brand: 'Sample Brand',
          status: 'development',
        },
        attributesAndSpecs: {
          categories: ['Sample Category'],
          properties: [],
          technicalSpecs: [],
        },
        media: {
          images: [],
        },
        marketingSEO: {
          seoTitle: { en: 'Sample Draft Product', no: 'Eksempel Utkast Produkt' },
          seoDescription: { en: 'Sample draft product description', no: 'Eksempel utkast produkt beskrivelse' },
          keywords: ['sample', 'draft'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workflowState: WorkflowState.DRAFT,
        workflowHistory: [
          {
            state: WorkflowState.DRAFT,
            timestamp: new Date().toISOString(),
            userId: 'sample-editor',
            reason: 'Initial creation',
          },
        ],
      },
      {
        id: 'sample-review-001',
        basicInfo: {
          name: { en: 'Sample Review Product', no: 'Eksempel Gjennomgang Produkt' },
          sku: 'SAMPLE-REVIEW-001',
          descriptionShort: { en: 'A product in review state', no: 'Et produkt i gjennomgang tilstand' },
          descriptionLong: { en: 'This product is currently under review.', no: 'Dette produktet er under gjennomgang.' },
          brand: 'Sample Brand',
          status: 'development',
        },
        attributesAndSpecs: {
          categories: ['Sample Category'],
          properties: [],
          technicalSpecs: [],
        },
        media: {
          images: [],
        },
        marketingSEO: {
          seoTitle: { en: 'Sample Review Product', no: 'Eksempel Gjennomgang Produkt' },
          seoDescription: { en: 'Sample review product description', no: 'Eksempel gjennomgang produkt beskrivelse' },
          keywords: ['sample', 'review'],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        workflowState: WorkflowState.REVIEW,
        assignedReviewer: 'sample-reviewer',
        submittedBy: 'sample-editor',
        submittedAt: new Date().toISOString(),
        workflowHistory: [
          {
            state: WorkflowState.DRAFT,
            timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
            userId: 'sample-editor',
            reason: 'Initial creation',
          },
          {
            state: WorkflowState.REVIEW,
            timestamp: new Date().toISOString(),
            userId: 'sample-editor',
            reason: 'Submitted for review',
          },
        ],
      },
    ];

    // Add sample products to store
    const store = useProductStore.getState();
    const existingProducts = store.products;
    const allProducts = [...existingProducts, ...sampleProducts];
    store.setProducts(allProducts);
    sampleDataCreated.products = sampleProducts.length;

    // Create sample audit trail entries
    const sampleAuditEntries = [
      {
        id: 'audit-sample-001',
        productId: 'sample-draft-001',
        userId: 'sample-editor',
        userEmail: 'editor@sample.com',
        action: 'create',
        timestamp: new Date().toISOString(),
        fieldChanges: [],
        reason: 'Product created',
        productState: WorkflowState.DRAFT,
        metadata: { source: 'sample_data' },
      },
      {
        id: 'audit-sample-002',
        productId: 'sample-review-001',
        userId: 'sample-editor',
        userEmail: 'editor@sample.com',
        action: 'submit',
        timestamp: new Date().toISOString(),
        fieldChanges: [
          {
            field: 'workflowState',
            previousValue: WorkflowState.DRAFT,
            newValue: WorkflowState.REVIEW,
            fieldType: 'string',
          },
        ],
        reason: 'Submitted for review',
        productState: WorkflowState.REVIEW,
        metadata: { source: 'sample_data' },
      },
    ];

    const existingAuditEntries = JSON.parse(localStorage.getItem('audit_trail') || '[]');
    const allAuditEntries = [...existingAuditEntries, ...sampleAuditEntries];
    localStorage.setItem('audit_trail', JSON.stringify(allAuditEntries));
    sampleDataCreated.auditEntries = sampleAuditEntries.length;

    // Create sample user roles
    const sampleUserRoles = [
      {
        id: 'role-sample-editor',
        userId: 'sample-editor',
        role: 'editor',
        permissions: [
          {
            resource: 'products',
            actions: ['read', 'write'],
          },
        ],
        notificationPreferences: {
          email: {
            productSubmitted: true,
            productApproved: true,
            productRejected: true,
            productPublished: false,
            bulkOperations: false,
          },
          inApp: {
            productSubmitted: true,
            productApproved: true,
            productRejected: true,
            productPublished: true,
            bulkOperations: true,
          },
        },
        assignedProducts: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'role-sample-reviewer',
        userId: 'sample-reviewer',
        role: 'reviewer',
        permissions: [
          {
            resource: 'products',
            actions: ['read', 'approve', 'reject'],
          },
          {
            resource: 'workflow',
            actions: ['view_audit_trail'],
          },
        ],
        notificationPreferences: {
          email: {
            productSubmitted: true,
            productApproved: false,
            productRejected: false,
            productPublished: false,
            bulkOperations: false,
          },
          inApp: {
            productSubmitted: true,
            productApproved: true,
            productRejected: true,
            productPublished: true,
            bulkOperations: true,
          },
        },
        assignedProducts: ['sample-review-001'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const existingUserRoles = JSON.parse(localStorage.getItem('user_roles') || '[]');
    const allUserRoles = [...existingUserRoles, ...sampleUserRoles];
    localStorage.setItem('user_roles', JSON.stringify(allUserRoles));
    sampleDataCreated.userRoles = sampleUserRoles.length;

    // Create sample notification templates
    const sampleNotificationTemplates = [
      {
        id: 'template-sample-approve',
        type: 'email',
        event: 'approve',
        subject: 'Product Approved - {{productName}}',
        template: 'Dear {{editorName}},\n\nProduct "{{productName}}" has been approved by {{reviewerName}} and is ready for publication.\n\nBest regards,\nThe Review Team',
        variables: ['productName', 'editorName', 'reviewerName'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'template-sample-reject',
        type: 'in_app',
        event: 'reject',
        template: 'Product "{{productName}}" was rejected by {{reviewerName}}. Reason: {{reason}}',
        variables: ['productName', 'reviewerName', 'reason'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const existingTemplates = JSON.parse(localStorage.getItem('notification_templates') || '[]');
    const allTemplates = [...existingTemplates, ...sampleNotificationTemplates];
    localStorage.setItem('notification_templates', JSON.stringify(allTemplates));
    sampleDataCreated.notificationTemplates = sampleNotificationTemplates.length;

    return {
      success: true,
      sampleDataCreated,
      errors: [],
    };
  } catch (error) {
    errors.push(`Failed to create sample data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      sampleDataCreated,
      errors,
    };
  }
}

/**
 * Validates migrated data integrity
 */
export function validateMigratedData(): {
  success: boolean;
  issues: string[];
  statistics: {
    totalProducts: number;
    productsWithWorkflow: number;
    totalAuditEntries: number;
    totalUserRoles: number;
    totalNotificationTemplates: number;
  };
} {
  const issues: string[] = [];
  const statistics = {
    totalProducts: 0,
    productsWithWorkflow: 0,
    totalAuditEntries: 0,
    totalUserRoles: 0,
    totalNotificationTemplates: 0,
  };

  try {
    // Validate products
    const store = useProductStore.getState();
    const products = store.products;
    statistics.totalProducts = products.length;

    products.forEach((product: any) => {
      if ('workflowState' in product) {
        statistics.productsWithWorkflow++;
        
        // Validate workflow state
        if (!Object.values(WorkflowState).includes(product.workflowState)) {
          issues.push(`Product ${product.id} has invalid workflow state: ${product.workflowState}`);
        }
      } else {
        issues.push(`Product ${product.id} is missing workflow fields`);
      }
    });

    // Validate audit trail
    if (typeof window !== 'undefined') {
      const auditEntries = JSON.parse(localStorage.getItem('audit_trail') || '[]');
      statistics.totalAuditEntries = auditEntries.length;

      auditEntries.forEach((entry: any) => {
        if (!entry.id || !entry.productId || !entry.userId || !entry.action || !entry.timestamp) {
          issues.push(`Audit entry ${entry.id || 'unknown'} is missing required fields`);
        }
      });

      // Validate user roles
      const userRoles = JSON.parse(localStorage.getItem('user_roles') || '[]');
      statistics.totalUserRoles = userRoles.length;

      userRoles.forEach((role: any) => {
        if (!role.id || !role.userId || !role.role || !role.permissions || !role.notificationPreferences) {
          issues.push(`User role ${role.id || 'unknown'} is missing required fields`);
        }
      });

      // Validate notification templates
      const templates = JSON.parse(localStorage.getItem('notification_templates') || '[]');
      statistics.totalNotificationTemplates = templates.length;

      templates.forEach((template: any) => {
        if (!template.id || !template.type || !template.event || !template.template) {
          issues.push(`Notification template ${template.id || 'unknown'} is missing required fields`);
        }
      });
    }

    return {
      success: issues.length === 0,
      issues,
      statistics,
    };
  } catch (error) {
    issues.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      issues,
      statistics,
    };
  }
}

/**
 * Complete migration process
 */
export function runCompleteMigration(): {
  success: boolean;
  results: {
    productsMigration: ReturnType<typeof migrateProductsToWorkflow>;
    adminUserCreation: ReturnType<typeof createInitialAdminUser>;
    notificationPreferences: ReturnType<typeof setupDefaultNotificationPreferences>;
    sampleDataCreation: ReturnType<typeof createSampleWorkflowData>;
    dataValidation: ReturnType<typeof validateMigratedData>;
  };
  errors: string[];
} {
  const errors: string[] = [];
  
  const results = {
    productsMigration: migrateProductsToWorkflow(),
    adminUserCreation: createInitialAdminUser(),
    notificationPreferences: setupDefaultNotificationPreferences(),
    sampleDataCreation: createSampleWorkflowData(),
    dataValidation: validateMigratedData(),
  };

  // Collect all errors
  errors.push(...results.productsMigration.errors);
  errors.push(...results.adminUserCreation.errors);
  errors.push(...results.notificationPreferences.errors);
  errors.push(...results.sampleDataCreation.errors);
  errors.push(...results.dataValidation.issues);

  const success = errors.length === 0 && 
    results.productsMigration.success &&
    results.adminUserCreation.success &&
    results.notificationPreferences.success &&
    results.sampleDataCreation.success &&
    results.dataValidation.success;

  return {
    success,
    results,
    errors,
  };
}
