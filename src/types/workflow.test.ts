/**
 * Unit tests for workflow type definitions
 */

import {
  WorkflowState,
  UserRole,
  WorkflowAction,
  FieldChange,
  AuditTrailEntry,
  UserRoleData,
  Permission,
  NotificationPreferences,
  ProductWorkflow,
  WorkflowStateHistory,
  BulkOperationRequest,
  BulkOperationFilters,
  BulkOperationResult,
  BulkOperationError,
  NotificationTemplate,
  StateTransitionRule,
  WorkflowConfig,
  WorkflowApiResponse,
  PaginatedResponse,
  AuditTrailFilters,
  ProductFilters,
  defaultNotificationPreferences,
  defaultWorkflowConfig,
} from './workflow';

describe('Workflow Types', () => {
  describe('Enums', () => {
    test('WorkflowState enum should have correct values', () => {
      expect(WorkflowState.DRAFT).toBe('draft');
      expect(WorkflowState.REVIEW).toBe('review');
      expect(WorkflowState.APPROVED).toBe('approved');
      expect(WorkflowState.PUBLISHED).toBe('published');
      expect(WorkflowState.REJECTED).toBe('rejected');
    });

    test('UserRole enum should have correct values', () => {
      expect(UserRole.ADMIN).toBe('admin');
      expect(UserRole.EDITOR).toBe('editor');
      expect(UserRole.REVIEWER).toBe('reviewer');
      expect(UserRole.VIEWER).toBe('viewer');
    });

    test('WorkflowAction enum should have correct values', () => {
      expect(WorkflowAction.CREATE).toBe('create');
      expect(WorkflowAction.EDIT).toBe('edit');
      expect(WorkflowAction.SUBMIT).toBe('submit');
      expect(WorkflowAction.APPROVE).toBe('approve');
      expect(WorkflowAction.REJECT).toBe('reject');
      expect(WorkflowAction.PUBLISH).toBe('publish');
      expect(WorkflowAction.BULK_APPROVE).toBe('bulk_approve');
      expect(WorkflowAction.BULK_REJECT).toBe('bulk_reject');
      expect(WorkflowAction.BULK_PUBLISH).toBe('bulk_publish');
      expect(WorkflowAction.ASSIGN_REVIEWER).toBe('assign_reviewer');
    });
  });

  describe('FieldChange interface', () => {
    test('should create valid FieldChange object', () => {
      const fieldChange: FieldChange = {
        field: 'basicInfo.name.en',
        previousValue: 'Old Product Name',
        newValue: 'New Product Name',
        fieldType: 'string',
      };

      expect(fieldChange.field).toBe('basicInfo.name.en');
      expect(fieldChange.previousValue).toBe('Old Product Name');
      expect(fieldChange.newValue).toBe('New Product Name');
      expect(fieldChange.fieldType).toBe('string');
    });
  });

  describe('AuditTrailEntry interface', () => {
    test('should create valid AuditTrailEntry object', () => {
      const auditEntry: AuditTrailEntry = {
        id: 'audit-123',
        productId: 'product-456',
        userId: 'user-789',
        userEmail: 'user@example.com',
        action: WorkflowAction.EDIT,
        timestamp: '2024-01-15T10:30:00Z',
        fieldChanges: [
          {
            field: 'basicInfo.name.en',
            previousValue: 'Old Product Name',
            newValue: 'New Product Name',
            fieldType: 'string',
          },
          {
            field: 'basicInfo.status',
            previousValue: 'development',
            newValue: 'active',
            fieldType: 'string',
          },
        ],
        reason: 'Product information updated',
        comment: 'Updated product name and status',
        productState: WorkflowState.DRAFT,
        metadata: { editDuration: 300 },
      };

      expect(auditEntry.id).toBe('audit-123');
      expect(auditEntry.userId).toBe('user-789');
      expect(auditEntry.userEmail).toBe('user@example.com');
      expect(auditEntry.action).toBe(WorkflowAction.EDIT);
      expect(auditEntry.timestamp).toBe('2024-01-15T10:30:00Z');
      expect(auditEntry.fieldChanges).toHaveLength(2);
      expect(auditEntry.fieldChanges[0].field).toBe('basicInfo.name.en');
      expect(auditEntry.fieldChanges[0].previousValue).toBe('Old Product Name');
      expect(auditEntry.fieldChanges[0].newValue).toBe('New Product Name');
      expect(auditEntry.fieldChanges[0].fieldType).toBe('string');
      expect(auditEntry.reason).toBe('Product information updated');
      expect(auditEntry.comment).toBe('Updated product name and status');
      expect(auditEntry.productState).toBe(WorkflowState.DRAFT);
      expect(auditEntry.metadata?.editDuration).toBe(300);
    });
  });

  describe('UserRoleData interface', () => {
    test('should create valid UserRoleData object', () => {
      const userRole: UserRoleData = {
        id: 'role-123',
        userId: 'user-456',
        role: UserRole.REVIEWER,
        permissions: [
          {
            resource: 'products',
            actions: ['read', 'approve', 'reject'],
            conditions: { workflowState: 'review' },
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
        assignedProducts: ['product-1', 'product-2'],
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      expect(userRole.id).toBe('role-123');
      expect(userRole.userId).toBe('user-456');
      expect(userRole.role).toBe(UserRole.REVIEWER);
      expect(userRole.permissions).toHaveLength(2);
      expect(userRole.permissions[0].resource).toBe('products');
      expect(userRole.permissions[0].actions).toEqual(['read', 'approve', 'reject']);
      expect(userRole.permissions[0].conditions?.workflowState).toBe('review');
      expect(userRole.permissions[1].resource).toBe('workflow');
      expect(userRole.permissions[1].actions).toEqual(['view_audit_trail']);
      expect(userRole.notificationPreferences.email.productSubmitted).toBe(true);
      expect(userRole.notificationPreferences.email.productApproved).toBe(false);
      expect(userRole.notificationPreferences.inApp.productSubmitted).toBe(true);
      expect(userRole.notificationPreferences.inApp.bulkOperations).toBe(true);
      expect(userRole.assignedProducts).toHaveLength(2);
      expect(userRole.assignedProducts).toContain('product-1');
      expect(userRole.assignedProducts).toContain('product-2');
      expect(userRole.createdAt).toBe('2024-01-15T10:30:00Z');
      expect(userRole.updatedAt).toBe('2024-01-15T10:30:00Z');
    });
  });

  describe('ProductWorkflow interface', () => {
    test('should create valid ProductWorkflow object', () => {
      const productWorkflow: ProductWorkflow = {
        // Product fields (required by Product interface)
        id: 'product-123',
        basicInfo: {
          name: { en: 'Test Product', no: 'Test Produkt' },
          sku: 'TEST-001',
          descriptionShort: { en: 'Short description', no: 'Kort beskrivelse' },
          descriptionLong: { en: 'Long description', no: 'Lang beskrivelse' },
          brand: 'Test Brand',
          status: 'development',
        },
        attributesAndSpecs: {
          categories: ['electronics'],
          properties: [],
          technicalSpecs: [],
        },
        media: {
          images: [],
        },
        marketingSEO: {
          seoTitle: { en: 'SEO Title', no: 'SEO Tittel' },
          seoDescription: { en: 'SEO Description', no: 'SEO Beskrivelse' },
          keywords: ['test', 'product'],
        },
        createdAt: '2024-01-15T09:00:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        
        // Workflow-specific fields
        workflowState: WorkflowState.REVIEW,
        assignedReviewer: 'reviewer-456',
        submittedBy: 'editor-789',
        submittedAt: '2024-01-15T10:30:00Z',
        workflowHistory: [
          {
            state: WorkflowState.DRAFT,
            timestamp: '2024-01-15T09:00:00Z',
            userId: 'editor-789',
          },
          {
            state: WorkflowState.REVIEW,
            timestamp: '2024-01-15T10:30:00Z',
            userId: 'editor-789',
            reason: 'Ready for review',
          },
        ],
      };

      expect(productWorkflow.id).toBe('product-123');
      expect(productWorkflow.workflowState).toBe(WorkflowState.REVIEW);
      expect(productWorkflow.assignedReviewer).toBe('reviewer-456');
      expect(productWorkflow.workflowHistory).toHaveLength(2);
      expect(productWorkflow.basicInfo.name.en).toBe('Test Product');
    });
  });

  describe('BulkOperationRequest interface', () => {
    test('should create valid BulkOperationRequest object', () => {
      const bulkRequest: BulkOperationRequest = {
        operation: WorkflowAction.BULK_APPROVE,
        productIds: ['product-1', 'product-2', 'product-3'],
        reason: 'All products meet quality standards',
        comment: 'Bulk approval for Q1 release',
        assignedReviewer: 'reviewer-123',
        filters: {
          categories: ['electronics', 'accessories'],
          brands: ['brand-a', 'brand-b'],
          dateRange: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-31T23:59:59Z',
          },
          workflowStates: [WorkflowState.REVIEW, WorkflowState.APPROVED],
          assignedReviewers: ['reviewer-1', 'reviewer-2'],
        },
      };

      expect(bulkRequest.operation).toBe(WorkflowAction.BULK_APPROVE);
      expect(bulkRequest.productIds).toHaveLength(3);
      expect(bulkRequest.productIds).toContain('product-1');
      expect(bulkRequest.productIds).toContain('product-2');
      expect(bulkRequest.productIds).toContain('product-3');
      expect(bulkRequest.reason).toBe('All products meet quality standards');
      expect(bulkRequest.comment).toBe('Bulk approval for Q1 release');
      expect(bulkRequest.assignedReviewer).toBe('reviewer-123');
      expect(bulkRequest.filters?.categories).toHaveLength(2);
      expect(bulkRequest.filters?.categories).toContain('electronics');
      expect(bulkRequest.filters?.categories).toContain('accessories');
      expect(bulkRequest.filters?.brands).toHaveLength(2);
      expect(bulkRequest.filters?.brands).toContain('brand-a');
      expect(bulkRequest.filters?.brands).toContain('brand-b');
      expect(bulkRequest.filters?.dateRange?.start).toBe('2024-01-01T00:00:00Z');
      expect(bulkRequest.filters?.dateRange?.end).toBe('2024-01-31T23:59:59Z');
      expect(bulkRequest.filters?.workflowStates).toHaveLength(2);
      expect(bulkRequest.filters?.workflowStates).toContain(WorkflowState.REVIEW);
      expect(bulkRequest.filters?.workflowStates).toContain(WorkflowState.APPROVED);
      expect(bulkRequest.filters?.assignedReviewers).toHaveLength(2);
      expect(bulkRequest.filters?.assignedReviewers).toContain('reviewer-1');
      expect(bulkRequest.filters?.assignedReviewers).toContain('reviewer-2');
    });

    test('should create valid BulkOperationRequest for reviewer assignment', () => {
      const assignmentRequest: BulkOperationRequest = {
        operation: WorkflowAction.ASSIGN_REVIEWER,
        productIds: ['product-4', 'product-5'],
        reason: 'Assign products to new reviewer',
        assignedReviewer: 'reviewer-456',
        filters: {
          workflowStates: [WorkflowState.REVIEW],
        },
      };

      expect(assignmentRequest.operation).toBe(WorkflowAction.ASSIGN_REVIEWER);
      expect(assignmentRequest.assignedReviewer).toBe('reviewer-456');
      expect(assignmentRequest.filters?.workflowStates).toContain(WorkflowState.REVIEW);
    });
  });

  describe('BulkOperationResult interface', () => {
    test('should create valid BulkOperationResult object', () => {
      const bulkResult: BulkOperationResult = {
        operationId: 'bulk-op-123',
        totalProducts: 10,
        successfulProducts: 8,
        failedProducts: 2,
        errors: [
          {
            productId: 'product-1',
            error: 'Product not in review state',
          },
          {
            productId: 'product-2',
            error: 'Insufficient permissions',
            details: { requiredRole: 'reviewer' },
          },
        ],
        completedAt: '2024-01-15T10:35:00Z',
      };

      expect(bulkResult.totalProducts).toBe(10);
      expect(bulkResult.successfulProducts).toBe(8);
      expect(bulkResult.failedProducts).toBe(2);
      expect(bulkResult.errors).toHaveLength(2);
    });
  });

  describe('NotificationTemplate interface', () => {
    test('should create valid email NotificationTemplate object', () => {
      const emailTemplate: NotificationTemplate = {
        id: 'template-123',
        type: 'email',
        event: WorkflowAction.APPROVE,
        subject: 'Product Approved - {{productName}}',
        template: 'Dear {{editorName}},\n\nProduct "{{productName}}" has been approved by {{reviewerName}} and is ready for publication.\n\nReviewer comment: {{comment}}\n\nBest regards,\nThe Review Team',
        variables: ['productName', 'editorName', 'reviewerName', 'comment'],
        isActive: true,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      };

      expect(emailTemplate.id).toBe('template-123');
      expect(emailTemplate.type).toBe('email');
      expect(emailTemplate.event).toBe(WorkflowAction.APPROVE);
      expect(emailTemplate.subject).toBe('Product Approved - {{productName}}');
      expect(emailTemplate.template).toContain('{{productName}}');
      expect(emailTemplate.template).toContain('{{editorName}}');
      expect(emailTemplate.template).toContain('{{reviewerName}}');
      expect(emailTemplate.template).toContain('{{comment}}');
      expect(emailTemplate.variables).toHaveLength(4);
      expect(emailTemplate.variables).toContain('productName');
      expect(emailTemplate.variables).toContain('editorName');
      expect(emailTemplate.variables).toContain('reviewerName');
      expect(emailTemplate.variables).toContain('comment');
      expect(emailTemplate.isActive).toBe(true);
      expect(emailTemplate.createdAt).toBe('2024-01-15T10:30:00Z');
      expect(emailTemplate.updatedAt).toBe('2024-01-15T10:30:00Z');
    });

    test('should create valid in-app NotificationTemplate object', () => {
      const inAppTemplate: NotificationTemplate = {
        id: 'template-456',
        type: 'in_app',
        event: WorkflowAction.REJECT,
        template: 'Product "{{productName}}" was rejected by {{reviewerName}}. Reason: {{reason}}',
        variables: ['productName', 'reviewerName', 'reason'],
        isActive: true,
        createdAt: '2024-01-15T11:00:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
      };

      expect(inAppTemplate.id).toBe('template-456');
      expect(inAppTemplate.type).toBe('in_app');
      expect(inAppTemplate.event).toBe(WorkflowAction.REJECT);
      expect(inAppTemplate.subject).toBeUndefined(); // In-app notifications don't have subjects
      expect(inAppTemplate.template).toContain('{{productName}}');
      expect(inAppTemplate.template).toContain('{{reviewerName}}');
      expect(inAppTemplate.template).toContain('{{reason}}');
      expect(inAppTemplate.variables).toHaveLength(3);
      expect(inAppTemplate.variables).toContain('productName');
      expect(inAppTemplate.variables).toContain('reviewerName');
      expect(inAppTemplate.variables).toContain('reason');
      expect(inAppTemplate.isActive).toBe(true);
    });

    test('should create valid bulk operation NotificationTemplate', () => {
      const bulkTemplate: NotificationTemplate = {
        id: 'template-789',
        type: 'email',
        event: WorkflowAction.BULK_APPROVE,
        subject: 'Bulk Operation Completed - {{operationCount}} products approved',
        template: 'Bulk approval operation completed successfully.\n\n{{operationCount}} products have been approved.\n\nOperation performed by: {{userName}}\nReason: {{reason}}',
        variables: ['operationCount', 'userName', 'reason'],
        isActive: true,
        createdAt: '2024-01-15T12:00:00Z',
        updatedAt: '2024-01-15T12:00:00Z',
      };

      expect(bulkTemplate.event).toBe(WorkflowAction.BULK_APPROVE);
      expect(bulkTemplate.variables).toContain('operationCount');
      expect(bulkTemplate.variables).toContain('userName');
      expect(bulkTemplate.variables).toContain('reason');
    });
  });

  describe('StateTransitionRule interface', () => {
    test('should create valid StateTransitionRule object', () => {
      const rule: StateTransitionRule = {
        from: WorkflowState.DRAFT,
        to: WorkflowState.REVIEW,
        requiredRole: UserRole.EDITOR,
        requiredPermissions: ['products:write'],
        isAutomatic: false,
        conditions: {
          minFieldsCompleted: 5,
        },
      };

      expect(rule.from).toBe(WorkflowState.DRAFT);
      expect(rule.to).toBe(WorkflowState.REVIEW);
      expect(rule.requiredRole).toBe(UserRole.EDITOR);
      expect(rule.isAutomatic).toBe(false);
    });
  });

  describe('WorkflowApiResponse interface', () => {
    test('should create valid success response', () => {
      const successResponse: WorkflowApiResponse<{ productId: string }> = {
        success: true,
        data: { productId: 'product-123' },
        message: 'Product approved successfully',
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.data?.productId).toBe('product-123');
    });

    test('should create valid error response', () => {
      const errorResponse: WorkflowApiResponse = {
        success: false,
        error: 'Insufficient permissions',
        message: 'User does not have permission to approve products',
      };

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBe('Insufficient permissions');
    });
  });

  describe('PaginatedResponse interface', () => {
    test('should create valid PaginatedResponse object', () => {
      const paginatedResponse: PaginatedResponse<AuditTrailEntry> = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5,
        },
      };

      expect(paginatedResponse.pagination.page).toBe(1);
      expect(paginatedResponse.pagination.total).toBe(100);
      expect(paginatedResponse.pagination.totalPages).toBe(5);
    });
  });

  describe('Default values', () => {
    test('defaultNotificationPreferences should have correct structure', () => {
      expect(defaultNotificationPreferences.email.productSubmitted).toBe(true);
      expect(defaultNotificationPreferences.email.bulkOperations).toBe(false);
      expect(defaultNotificationPreferences.inApp.productSubmitted).toBe(true);
      expect(defaultNotificationPreferences.inApp.bulkOperations).toBe(true);
    });

    test('defaultWorkflowConfig should have correct structure', () => {
      expect(defaultWorkflowConfig.stateTransitionRules).toHaveLength(5);
      expect(defaultWorkflowConfig.autoAssignmentRules?.reviewerAssignment).toBe('manual');
      expect(defaultWorkflowConfig.notificationSettings.enableEmailNotifications).toBe(true);
      expect(defaultWorkflowConfig.auditTrailSettings.retentionPeriod).toBe(730);
    });

    test('defaultWorkflowConfig should have valid state transition rules', () => {
      const rules = defaultWorkflowConfig.stateTransitionRules;
      
      // Check Draft -> Review rule
      const draftToReview = rules.find(r => r.from === WorkflowState.DRAFT && r.to === WorkflowState.REVIEW);
      expect(draftToReview?.requiredRole).toBe(UserRole.EDITOR);
      expect(draftToReview?.isAutomatic).toBe(false);

      // Check Rejected -> Draft rule (automatic)
      const rejectedToDraft = rules.find(r => r.from === WorkflowState.REJECTED && r.to === WorkflowState.DRAFT);
      expect(rejectedToDraft?.isAutomatic).toBe(true);
    });
  });

  describe('Filter interfaces', () => {
    test('AuditTrailFilters should create valid filter object', () => {
      const filters: AuditTrailFilters = {
        userId: 'user-123',
        productId: 'product-456',
        action: WorkflowAction.APPROVE,
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
        workflowState: WorkflowState.APPROVED,
      };

      expect(filters.userId).toBe('user-123');
      expect(filters.action).toBe(WorkflowAction.APPROVE);
      expect(filters.dateRange?.start).toBe('2024-01-01T00:00:00Z');
    });

    test('ProductFilters should create valid filter object', () => {
      const filters: ProductFilters = {
        workflowState: [WorkflowState.REVIEW, WorkflowState.APPROVED],
        assignedReviewer: ['reviewer-1', 'reviewer-2'],
        categories: ['electronics', 'accessories'],
        brands: ['brand-a'],
        dateRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
        },
      };

      expect(filters.workflowState).toHaveLength(2);
      expect(filters.assignedReviewer).toHaveLength(2);
      expect(filters.categories).toContain('electronics');
    });
  });
});
