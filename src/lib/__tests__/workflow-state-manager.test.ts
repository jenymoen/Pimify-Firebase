/**
 * Unit tests for WorkflowStateManager
 */

import {
  WorkflowStateManager,
  StateTransitionRequest,
  StateTransitionResult,
  WorkflowValidationResult,
} from '../workflow-state-manager';
import {
  WorkflowState,
  WorkflowAction,
  UserRole,
  StateTransitionRule,
  ProductWorkflow,
  AuditTrailEntry,
} from '@/types/workflow';

// Mock audit trail callback
const mockAuditTrailCallback = jest.fn();

// Sample product for testing
const createSampleProduct = (workflowState: WorkflowState = WorkflowState.DRAFT): ProductWorkflow => ({
  id: 'test-product-1',
  basicInfo: {
    name: { en: 'Test Product', no: 'Test Produkt' },
    sku: 'TEST-001',
    descriptionShort: { en: 'Test description', no: 'Test beskrivelse' },
    descriptionLong: { en: 'Long test description', no: 'Lang test beskrivelse' },
    brand: 'Test Brand',
    status: 'active',
  },
  attributesAndSpecs: {
    categories: ['Electronics'],
    properties: [],
    technicalSpecs: [],
  },
  media: {
    images: [],
  },
  marketingSEO: {
    seoTitle: { en: 'Test Product', no: 'Test Produkt' },
    seoDescription: { en: 'Test description', no: 'Test beskrivelse' },
    keywords: ['test'],
  },
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  workflowState,
  workflowHistory: [
    {
      state: WorkflowState.DRAFT,
      timestamp: '2024-01-15T10:00:00Z',
      userId: 'test-user',
      reason: 'Initial creation',
    },
  ],
});

// Custom transition rules for testing
const customTransitionRules: StateTransitionRule[] = [
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
];

describe('WorkflowStateManager', () => {
  let manager: WorkflowStateManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new WorkflowStateManager(customTransitionRules, mockAuditTrailCallback);
  });

  describe('validateStateTransition', () => {
    test('should validate successful transition from Draft to Review', () => {
      const request: StateTransitionRequest = {
        productId: 'test-product-1',
        fromState: WorkflowState.DRAFT,
        toState: WorkflowState.REVIEW,
        userId: 'test-editor',
        userRole: UserRole.EDITOR,
        assignedReviewer: 'test-reviewer',
      };

      const result = manager.validateStateTransition(request);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1); // Permission validation warning
    });

    test('should reject transition with wrong user role', () => {
      const request: StateTransitionRequest = {
        productId: 'test-product-1',
        fromState: WorkflowState.DRAFT,
        toState: WorkflowState.REVIEW,
        userId: 'test-viewer',
        userRole: UserRole.VIEWER,
        assignedReviewer: 'test-reviewer',
      };

      const result = manager.validateStateTransition(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('User role viewer is not authorized for this transition. Required role: editor');
    });

    test('should reject invalid transition', () => {
      const request: StateTransitionRequest = {
        productId: 'test-product-1',
        fromState: WorkflowState.DRAFT,
        toState: WorkflowState.PUBLISHED,
        userId: 'test-editor',
        userRole: UserRole.EDITOR,
      };

      const result = manager.validateStateTransition(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transition from draft to published is not allowed');
    });

    test('should require reviewer assignment for review transition', () => {
      const request: StateTransitionRequest = {
        productId: 'test-product-1',
        fromState: WorkflowState.DRAFT,
        toState: WorkflowState.REVIEW,
        userId: 'test-editor',
        userRole: UserRole.EDITOR,
        // Missing assignedReviewer
      };

      const result = manager.validateStateTransition(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Reviewer must be assigned when submitting for review');
    });

    test('should require rejection reason for rejection', () => {
      const request: StateTransitionRequest = {
        productId: 'test-product-1',
        fromState: WorkflowState.REVIEW,
        toState: WorkflowState.REJECTED,
        userId: 'test-reviewer',
        userRole: UserRole.REVIEWER,
        // Missing reason
      };

      const result = manager.validateStateTransition(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rejection reason is required when rejecting a product');
    });
  });

  describe('executeStateTransition', () => {
    test('should execute successful transition from Draft to Review', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      const request: StateTransitionRequest = {
        productId: 'test-product-1',
        fromState: WorkflowState.DRAFT,
        toState: WorkflowState.REVIEW,
        userId: 'test-editor',
        userRole: UserRole.EDITOR,
        assignedReviewer: 'test-reviewer',
        reason: 'Ready for review',
      };

      const result = await manager.executeStateTransition(request, product);

      expect(result.success).toBe(true);
      expect(result.newState).toBe(WorkflowState.REVIEW);
      expect(result.auditEntry).toBeDefined();
      expect(mockAuditTrailCallback).toHaveBeenCalledWith(result.auditEntry);
    });

    test('should handle failed transition', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      const request: StateTransitionRequest = {
        productId: 'test-product-1',
        fromState: WorkflowState.DRAFT,
        toState: WorkflowState.REVIEW,
        userId: 'test-viewer',
        userRole: UserRole.VIEWER, // Wrong role
        assignedReviewer: 'test-reviewer',
      };

      const result = await manager.executeStateTransition(request, product);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User role viewer is not authorized');
      expect(mockAuditTrailCallback).not.toHaveBeenCalled();
    });

    test('should update product state correctly', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      const request: StateTransitionRequest = {
        productId: 'test-product-1',
        fromState: WorkflowState.DRAFT,
        toState: WorkflowState.REVIEW,
        userId: 'test-editor',
        userRole: UserRole.EDITOR,
        assignedReviewer: 'test-reviewer',
        reason: 'Ready for review',
      };

      const result = await manager.executeStateTransition(request, product);

      expect(result.success).toBe(true);
      expect(result.auditEntry?.fieldChanges).toHaveLength(2);
      expect(result.auditEntry?.fieldChanges[0].field).toBe('workflowState');
      expect(result.auditEntry?.fieldChanges[0].previousValue).toBe(WorkflowState.DRAFT);
      expect(result.auditEntry?.fieldChanges[0].newValue).toBe(WorkflowState.REVIEW);
      expect(result.auditEntry?.fieldChanges[1].field).toBe('assignedReviewer');
    });
  });

  describe('getValidNextStates', () => {
    test('should return valid next states for Editor with Draft product', () => {
      const validStates = manager.getValidNextStates(WorkflowState.DRAFT, UserRole.EDITOR);
      expect(validStates).toContain(WorkflowState.REVIEW);
      expect(validStates).not.toContain(WorkflowState.APPROVED);
    });

    test('should return valid next states for Reviewer with Review product', () => {
      const validStates = manager.getValidNextStates(WorkflowState.REVIEW, UserRole.REVIEWER);
      expect(validStates).toContain(WorkflowState.APPROVED);
      expect(validStates).toContain(WorkflowState.REJECTED);
      expect(validStates).not.toContain(WorkflowState.DRAFT);
    });

    test('should return empty array for invalid role/state combination', () => {
      const validStates = manager.getValidNextStates(WorkflowState.DRAFT, UserRole.VIEWER);
      expect(validStates).toHaveLength(0);
    });
  });

  describe('getValidPreviousStates', () => {
    test('should return valid previous states for Review state', () => {
      const validStates = manager.getValidPreviousStates(WorkflowState.REVIEW, UserRole.EDITOR);
      expect(validStates).toContain(WorkflowState.DRAFT);
    });

    test('should return valid previous states for Approved state', () => {
      const validStates = manager.getValidPreviousStates(WorkflowState.APPROVED, UserRole.REVIEWER);
      expect(validStates).toContain(WorkflowState.REVIEW);
    });
  });

  describe('canPerformAction', () => {
    test('should allow Editor to submit Draft product', () => {
      const canSubmit = manager.canPerformAction(
        WorkflowAction.SUBMIT,
        WorkflowState.DRAFT,
        UserRole.EDITOR
      );
      expect(canSubmit).toBe(true);
    });

    test('should allow Reviewer to approve Review product', () => {
      const canApprove = manager.canPerformAction(
        WorkflowAction.APPROVE,
        WorkflowState.REVIEW,
        UserRole.REVIEWER
      );
      expect(canApprove).toBe(true);
    });

    test('should not allow Viewer to perform any actions', () => {
      const canSubmit = manager.canPerformAction(
        WorkflowAction.SUBMIT,
        WorkflowState.DRAFT,
        UserRole.VIEWER
      );
      expect(canSubmit).toBe(false);
    });

    test('should allow Editor to edit Draft product', () => {
      const canEdit = manager.canPerformAction(
        WorkflowAction.EDIT,
        WorkflowState.DRAFT,
        UserRole.EDITOR
      );
      expect(canEdit).toBe(true);
    });

    test('should allow Editor to edit Rejected product', () => {
      const canEdit = manager.canPerformAction(
        WorkflowAction.EDIT,
        WorkflowState.REJECTED,
        UserRole.EDITOR
      );
      expect(canEdit).toBe(true);
    });
  });

  describe('getWorkflowProgress', () => {
    test('should return correct progress for Draft product', () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      const progress = manager.getWorkflowProgress(product);

      expect(progress.currentStep).toBe(1);
      expect(progress.totalSteps).toBe(4);
      expect(progress.steps[0].completed).toBe(true);
      expect(progress.steps[1].completed).toBe(false);
    });

    test('should return correct progress for Review product', () => {
      const product = createSampleProduct(WorkflowState.REVIEW);
      product.workflowHistory.push({
        state: WorkflowState.REVIEW,
        timestamp: '2024-01-15T11:00:00Z',
        userId: 'test-editor',
        reason: 'Submitted for review',
      });

      const progress = manager.getWorkflowProgress(product);

      expect(progress.currentStep).toBe(2);
      expect(progress.totalSteps).toBe(4);
      expect(progress.steps[0].completed).toBe(true);
      expect(progress.steps[1].completed).toBe(true);
      expect(progress.steps[2].completed).toBe(false);
    });
  });

  describe('validateProductState', () => {
    test('should validate correct Draft product', () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      const result = manager.validateProductState(product);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing workflow history', () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      product.workflowHistory = [];

      const result = manager.validateProductState(product);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product must have at least one workflow history entry');
    });

    test('should validate Review product requirements', () => {
      const product = createSampleProduct(WorkflowState.REVIEW);
      product.assignedReviewer = 'test-reviewer';
      product.submittedBy = 'test-editor';
      product.submittedAt = '2024-01-15T11:00:00Z';
      product.workflowHistory.push({
        state: WorkflowState.REVIEW,
        timestamp: '2024-01-15T11:00:00Z',
        userId: 'test-editor',
        reason: 'Submitted for review',
      });

      const result = manager.validateProductState(product);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect missing Review product requirements', () => {
      const product = createSampleProduct(WorkflowState.REVIEW);
      // Missing assignedReviewer, submittedBy, submittedAt

      const result = manager.validateProductState(product);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product in review state must have a submitted by user');
      expect(result.errors).toContain('Product in review state must have a submission timestamp');
      expect(result.warnings).toContain('Product in review state should have an assigned reviewer');
    });

    test('should validate Approved product requirements', () => {
      const product = createSampleProduct(WorkflowState.APPROVED);
      product.reviewedBy = 'test-reviewer';
      product.reviewedAt = '2024-01-15T12:00:00Z';
      product.workflowHistory.push({
        state: WorkflowState.APPROVED,
        timestamp: '2024-01-15T12:00:00Z',
        userId: 'test-reviewer',
        reason: 'Approved for publication',
      });

      const result = manager.validateProductState(product);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate Published product requirements', () => {
      const product = createSampleProduct(WorkflowState.PUBLISHED);
      product.publishedBy = 'test-admin';
      product.publishedAt = '2024-01-15T13:00:00Z';
      product.workflowHistory.push({
        state: WorkflowState.PUBLISHED,
        timestamp: '2024-01-15T13:00:00Z',
        userId: 'test-admin',
        reason: 'Published to live environment',
      });

      const result = manager.validateProductState(product);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate Rejected product requirements', () => {
      const product = createSampleProduct(WorkflowState.REJECTED);
      product.rejectionReason = 'Quality issues found';
      product.workflowHistory.push({
        state: WorkflowState.REJECTED,
        timestamp: '2024-01-15T12:00:00Z',
        userId: 'test-reviewer',
        reason: 'Quality issues found',
      });

      const result = manager.validateProductState(product);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    test('should warn about missing rejection reason', () => {
      const product = createSampleProduct(WorkflowState.REJECTED);
      // Missing rejectionReason
      product.workflowHistory.push({
        state: WorkflowState.REJECTED,
        timestamp: '2024-01-15T12:00:00Z',
        userId: 'test-reviewer',
        reason: 'Rejected without specific reason',
      });

      const result = manager.validateProductState(product);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Rejected products should have a rejection reason');
    });
  });

  describe('utility methods', () => {
    test('getStateDisplayName should return correct display names', () => {
      expect(manager.getStateDisplayName(WorkflowState.DRAFT)).toBe('Draft');
      expect(manager.getStateDisplayName(WorkflowState.REVIEW)).toBe('Under Review');
      expect(manager.getStateDisplayName(WorkflowState.APPROVED)).toBe('Approved');
      expect(manager.getStateDisplayName(WorkflowState.PUBLISHED)).toBe('Published');
      expect(manager.getStateDisplayName(WorkflowState.REJECTED)).toBe('Rejected');
    });

    test('getStateColor should return correct colors', () => {
      expect(manager.getStateColor(WorkflowState.DRAFT)).toBe('gray');
      expect(manager.getStateColor(WorkflowState.REVIEW)).toBe('yellow');
      expect(manager.getStateColor(WorkflowState.APPROVED)).toBe('green');
      expect(manager.getStateColor(WorkflowState.PUBLISHED)).toBe('blue');
      expect(manager.getStateColor(WorkflowState.REJECTED)).toBe('red');
    });

    test('getStateIcon should return correct icons', () => {
      expect(manager.getStateIcon(WorkflowState.DRAFT)).toBe('edit');
      expect(manager.getStateIcon(WorkflowState.REVIEW)).toBe('eye');
      expect(manager.getStateIcon(WorkflowState.APPROVED)).toBe('check');
      expect(manager.getStateIcon(WorkflowState.PUBLISHED)).toBe('globe');
      expect(manager.getStateIcon(WorkflowState.REJECTED)).toBe('x');
    });
  });

  describe('automatic transitions', () => {
    test('should handle automatic Rejected to Draft transition', async () => {
      const product = createSampleProduct(WorkflowState.REJECTED);
      product.workflowHistory.push({
        state: WorkflowState.REJECTED,
        timestamp: '2024-01-15T12:00:00Z',
        userId: 'test-reviewer',
        reason: 'Quality issues',
      });

      const request: StateTransitionRequest = {
        productId: 'test-product-1',
        fromState: WorkflowState.REJECTED,
        toState: WorkflowState.DRAFT,
        userId: 'test-editor',
        userRole: UserRole.EDITOR,
        reason: 'Automatic transition',
      };

      const result = await manager.executeStateTransition(request, product);

      expect(result.success).toBe(true);
      expect(result.newState).toBe(WorkflowState.DRAFT);
      expect(result.automaticTransitions).toBeDefined();
    });
  });

  describe('error handling', () => {
    test('should handle missing transition rule gracefully', async () => {
      const product = createSampleProduct(WorkflowState.DRAFT);
      const request: StateTransitionRequest = {
        productId: 'test-product-1',
        fromState: WorkflowState.DRAFT,
        toState: WorkflowState.PUBLISHED, // Invalid transition
        userId: 'test-editor',
        userRole: UserRole.EDITOR,
      };

      const result = await manager.executeStateTransition(request, product);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Transition from draft to published is not allowed');
    });

    test('should handle exceptions during transition', async () => {
      // Create a manager with invalid rules to trigger an exception
      const invalidRules: StateTransitionRule[] = [
        {
          from: WorkflowState.DRAFT,
          to: WorkflowState.REVIEW,
          requiredRole: UserRole.EDITOR,
          requiredPermissions: [],
          isAutomatic: false,
          conditions: {
            invalidCondition: () => {
              throw new Error('Test error');
            },
          },
        },
      ];

      const errorManager = new WorkflowStateManager(invalidRules);
      const product = createSampleProduct(WorkflowState.DRAFT);
      const request: StateTransitionRequest = {
        productId: 'test-product-1',
        fromState: WorkflowState.DRAFT,
        toState: WorkflowState.REVIEW,
        userId: 'test-editor',
        userRole: UserRole.EDITOR,
        assignedReviewer: 'test-reviewer',
      };

      const result = await errorManager.executeStateTransition(request, product);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Condition validation failed: Test error');
    });
  });
});
