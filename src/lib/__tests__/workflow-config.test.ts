/**
 * Unit tests for Workflow Configuration
 */

import {
  workflowStateTransitionRules,
  workflowRolePermissions,
  workflowActionPermissions,
  workflowStateDisplayConfig,
  workflowValidationRules,
  workflowTimingConfig,
  completeWorkflowConfig,
  getValidNextStates,
  getValidPreviousStates,
  hasPermission,
  getStateDisplayConfig,
  getValidationRules,
  getQualityCheckRequirements,
  getStateTimingConfig,
  isTransitionAllowed,
  getRequiredRoleForTransition,
  getAutomaticTransitions,
  getWorkflowProgress,
  getWorkflowStatusSummary,
} from '../workflow-config';
import {
  WorkflowState,
  WorkflowAction,
  UserRole,
  StateTransitionRule,
} from '@/types/workflow';

describe('Workflow Configuration', () => {
  describe('workflowStateTransitionRules', () => {
    test('should contain all required state transitions', () => {
      const transitions = workflowStateTransitionRules;
      
      // Check Draft → Review
      expect(transitions.some(t => t.from === WorkflowState.DRAFT && t.to === WorkflowState.REVIEW)).toBe(true);
      
      // Check Review → Approved
      expect(transitions.some(t => t.from === WorkflowState.REVIEW && t.to === WorkflowState.APPROVED)).toBe(true);
      
      // Check Review → Rejected
      expect(transitions.some(t => t.from === WorkflowState.REVIEW && t.to === WorkflowState.REJECTED)).toBe(true);
      
      // Check Approved → Published
      expect(transitions.some(t => t.from === WorkflowState.APPROVED && t.to === WorkflowState.PUBLISHED)).toBe(true);
      
      // Check Rejected → Draft (automatic)
      expect(transitions.some(t => t.from === WorkflowState.REJECTED && t.to === WorkflowState.DRAFT && t.isAutomatic)).toBe(true);
    });

    test('should have correct role assignments for transitions', () => {
      const draftToReview = workflowStateTransitionRules.find(t => 
        t.from === WorkflowState.DRAFT && t.to === WorkflowState.REVIEW
      );
      expect(draftToReview?.requiredRole).toBe(UserRole.EDITOR);

      const reviewToApproved = workflowStateTransitionRules.find(t => 
        t.from === WorkflowState.REVIEW && t.to === WorkflowState.APPROVED
      );
      expect(reviewToApproved?.requiredRole).toBe(UserRole.REVIEWER);

      const reviewToRejected = workflowStateTransitionRules.find(t => 
        t.from === WorkflowState.REVIEW && t.to === WorkflowState.REJECTED
      );
      expect(reviewToRejected?.requiredRole).toBe(UserRole.REVIEWER);

      const approvedToPublished = workflowStateTransitionRules.find(t => 
        t.from === WorkflowState.APPROVED && t.to === WorkflowState.PUBLISHED
      );
      expect(approvedToPublished?.requiredRole).toBe(UserRole.ADMIN);
    });

    test('should have required permissions for transitions', () => {
      const draftToReview = workflowStateTransitionRules.find(t => 
        t.from === WorkflowState.DRAFT && t.to === WorkflowState.REVIEW
      );
      expect(draftToReview?.requiredPermissions).toContain('products:write');
      expect(draftToReview?.requiredPermissions).toContain('workflow:submit');

      const reviewToApproved = workflowStateTransitionRules.find(t => 
        t.from === WorkflowState.REVIEW && t.to === WorkflowState.APPROVED
      );
      expect(reviewToApproved?.requiredPermissions).toContain('workflow:approve');
    });

    test('should have appropriate conditions for transitions', () => {
      const draftToReview = workflowStateTransitionRules.find(t => 
        t.from === WorkflowState.DRAFT && t.to === WorkflowState.REVIEW
      );
      expect(draftToReview?.conditions?.assignedReviewer).toBe(true);

      const reviewToRejected = workflowStateTransitionRules.find(t => 
        t.from === WorkflowState.REVIEW && t.to === WorkflowState.REJECTED
      );
      expect(reviewToRejected?.conditions?.rejectionReason).toBe(true);
    });
  });

  describe('workflowRolePermissions', () => {
    test('should have permissions for all roles', () => {
      expect(workflowRolePermissions[UserRole.ADMIN]).toBeDefined();
      expect(workflowRolePermissions[UserRole.EDITOR]).toBeDefined();
      expect(workflowRolePermissions[UserRole.REVIEWER]).toBeDefined();
      expect(workflowRolePermissions[UserRole.VIEWER]).toBeDefined();
    });

    test('should have appropriate permission levels for each role', () => {
      // Admin should have all permissions
      expect(workflowRolePermissions[UserRole.ADMIN]).toContain('workflow:*');
      expect(workflowRolePermissions[UserRole.ADMIN]).toContain('products:*');
      expect(workflowRolePermissions[UserRole.ADMIN]).toContain('users:*');

      // Editor should have product and workflow permissions
      expect(workflowRolePermissions[UserRole.EDITOR]).toContain('products:write');
      expect(workflowRolePermissions[UserRole.EDITOR]).toContain('workflow:submit');

      // Reviewer should have review permissions
      expect(workflowRolePermissions[UserRole.REVIEWER]).toContain('workflow:approve');
      expect(workflowRolePermissions[UserRole.REVIEWER]).toContain('workflow:reject');

      // Viewer should have read-only permissions
      expect(workflowRolePermissions[UserRole.VIEWER]).toContain('products:read');
      expect(workflowRolePermissions[UserRole.VIEWER]).not.toContain('products:write');
    });
  });

  describe('workflowActionPermissions', () => {
    test('should have permissions for all workflow actions', () => {
      Object.values(WorkflowAction).forEach(action => {
        expect(workflowActionPermissions[action]).toBeDefined();
        expect(workflowActionPermissions[action].length).toBeGreaterThan(0);
      });
    });

    test('should have appropriate permissions for specific actions', () => {
      expect(workflowActionPermissions[WorkflowAction.CREATE]).toContain('products:create');
      expect(workflowActionPermissions[WorkflowAction.APPROVE]).toContain('workflow:approve');
      expect(workflowActionPermissions[WorkflowAction.REJECT]).toContain('workflow:reject');
      expect(workflowActionPermissions[WorkflowAction.PUBLISH]).toContain('workflow:publish');
      expect(workflowActionPermissions[WorkflowAction.BULK_APPROVE]).toContain('workflow:bulk');
    });
  });

  describe('workflowStateDisplayConfig', () => {
    test('should have display config for all workflow states', () => {
      Object.values(WorkflowState).forEach(state => {
        expect(workflowStateDisplayConfig[state]).toBeDefined();
        expect(workflowStateDisplayConfig[state].displayName).toBeDefined();
        expect(workflowStateDisplayConfig[state].color).toBeDefined();
        expect(workflowStateDisplayConfig[state].icon).toBeDefined();
      });
    });

    test('should have appropriate display properties', () => {
      expect(workflowStateDisplayConfig[WorkflowState.DRAFT].canEdit).toBe(true);
      expect(workflowStateDisplayConfig[WorkflowState.REVIEW].canEdit).toBe(false);
      expect(workflowStateDisplayConfig[WorkflowState.REVIEW].requiresReview).toBe(true);
      expect(workflowStateDisplayConfig[WorkflowState.PUBLISHED].canDelete).toBe(false);
    });
  });

  describe('workflowValidationRules', () => {
    test('should have validation rules for different states', () => {
      expect(workflowValidationRules.minRequiredFields).toBeDefined();
      expect(workflowValidationRules.approvalRequiredFields).toBeDefined();
      expect(workflowValidationRules.publicationRequiredFields).toBeDefined();
    });

    test('should have progressive field requirements', () => {
      expect(workflowValidationRules.approvalRequiredFields.length).toBeGreaterThanOrEqual(
        workflowValidationRules.minRequiredFields.length
      );
      expect(workflowValidationRules.publicationRequiredFields.length).toBeGreaterThanOrEqual(
        workflowValidationRules.approvalRequiredFields.length
      );
    });

    test('should have quality check requirements', () => {
      expect(workflowValidationRules.qualityChecks.minImageCount).toBeDefined();
      expect(workflowValidationRules.qualityChecks.maxImageCount).toBeDefined();
      expect(workflowValidationRules.qualityChecks.minDescriptionLength).toBeDefined();
    });
  });

  describe('workflowTimingConfig', () => {
    test('should have timing config for all states', () => {
      Object.values(WorkflowState).forEach(state => {
        expect(workflowTimingConfig.maxStateDuration[state]).toBeDefined();
      });
    });

    test('should have appropriate timing limits', () => {
      expect(workflowTimingConfig.maxStateDuration[WorkflowState.REVIEW]).toBe(72);
      expect(workflowTimingConfig.maxStateDuration[WorkflowState.APPROVED]).toBe(24);
      expect(workflowTimingConfig.maxStateDuration[WorkflowState.PUBLISHED]).toBe(Infinity);
    });

    test('should have reminder intervals', () => {
      expect(workflowTimingConfig.reminderIntervals[WorkflowState.REVIEW]).toContain(24);
      expect(workflowTimingConfig.reminderIntervals[WorkflowState.REVIEW]).toContain(48);
    });
  });

  describe('completeWorkflowConfig', () => {
    test('should contain all required configuration', () => {
      expect(completeWorkflowConfig.stateTransitionRules).toBeDefined();
      expect(completeWorkflowConfig.defaultNotificationPreferences).toBeDefined();
    });

    test('should have correct number of transition rules', () => {
      expect(completeWorkflowConfig.stateTransitionRules.length).toBeGreaterThan(0);
    });
  });

  describe('Helper Functions', () => {
    describe('getValidNextStates', () => {
      test('should return valid next states for Editor with Draft', () => {
        const nextStates = getValidNextStates(WorkflowState.DRAFT, UserRole.EDITOR);
        expect(nextStates).toContain(WorkflowState.REVIEW);
      });

      test('should return valid next states for Reviewer with Review', () => {
        const nextStates = getValidNextStates(WorkflowState.REVIEW, UserRole.REVIEWER);
        expect(nextStates).toContain(WorkflowState.APPROVED);
        expect(nextStates).toContain(WorkflowState.REJECTED);
      });

      test('should return empty array for invalid role/state combination', () => {
        const nextStates = getValidNextStates(WorkflowState.DRAFT, UserRole.VIEWER);
        expect(nextStates).toHaveLength(0);
      });
    });

    describe('getValidPreviousStates', () => {
      test('should return valid previous states for Review', () => {
        const prevStates = getValidPreviousStates(WorkflowState.REVIEW, UserRole.EDITOR);
        expect(prevStates).toContain(WorkflowState.DRAFT);
      });

      test('should return valid previous states for Approved', () => {
        const prevStates = getValidPreviousStates(WorkflowState.APPROVED, UserRole.REVIEWER);
        expect(prevStates).toContain(WorkflowState.REVIEW);
      });
    });

    describe('hasPermission', () => {
      test('should return true for Admin with any action', () => {
        expect(hasPermission(UserRole.ADMIN, WorkflowAction.APPROVE)).toBe(true);
        expect(hasPermission(UserRole.ADMIN, WorkflowAction.PUBLISH)).toBe(true);
        expect(hasPermission(UserRole.ADMIN, WorkflowAction.MANAGE_USERS)).toBe(true);
      });

      test('should return true for Editor with appropriate actions', () => {
        expect(hasPermission(UserRole.EDITOR, WorkflowAction.CREATE)).toBe(true);
        expect(hasPermission(UserRole.EDITOR, WorkflowAction.EDIT)).toBe(true);
        expect(hasPermission(UserRole.EDITOR, WorkflowAction.SUBMIT)).toBe(true);
      });

      test('should return false for Editor with inappropriate actions', () => {
        expect(hasPermission(UserRole.EDITOR, WorkflowAction.APPROVE)).toBe(false);
        expect(hasPermission(UserRole.EDITOR, WorkflowAction.PUBLISH)).toBe(false);
      });

      test('should return true for Reviewer with review actions', () => {
        expect(hasPermission(UserRole.REVIEWER, WorkflowAction.APPROVE)).toBe(true);
        expect(hasPermission(UserRole.REVIEWER, WorkflowAction.REJECT)).toBe(true);
      });

      test('should return false for Reviewer with non-review actions', () => {
        expect(hasPermission(UserRole.REVIEWER, WorkflowAction.CREATE)).toBe(false);
        expect(hasPermission(UserRole.REVIEWER, WorkflowAction.PUBLISH)).toBe(false);
      });

      test('should return true for Viewer with read actions', () => {
        expect(hasPermission(UserRole.VIEWER, WorkflowAction.VIEW_AUDIT_TRAIL)).toBe(true);
        expect(hasPermission(UserRole.VIEWER, WorkflowAction.VIEW_ALL_PRODUCTS)).toBe(true);
      });

      test('should return false for Viewer with write actions', () => {
        expect(hasPermission(UserRole.VIEWER, WorkflowAction.CREATE)).toBe(false);
        expect(hasPermission(UserRole.VIEWER, WorkflowAction.EDIT)).toBe(false);
      });
    });

    describe('getStateDisplayConfig', () => {
      test('should return correct display config for each state', () => {
        const draftConfig = getStateDisplayConfig(WorkflowState.DRAFT);
        expect(draftConfig.displayName).toBe('Draft');
        expect(draftConfig.color).toBe('gray');
        expect(draftConfig.canEdit).toBe(true);

        const reviewConfig = getStateDisplayConfig(WorkflowState.REVIEW);
        expect(reviewConfig.displayName).toBe('Under Review');
        expect(reviewConfig.color).toBe('yellow');
        expect(reviewConfig.requiresReview).toBe(true);
      });
    });

    describe('getValidationRules', () => {
      test('should return appropriate validation rules for each state', () => {
        const reviewRules = getValidationRules(WorkflowState.REVIEW);
        expect(reviewRules).toEqual(workflowValidationRules.minRequiredFields);

        const approvedRules = getValidationRules(WorkflowState.APPROVED);
        expect(approvedRules).toEqual(workflowValidationRules.approvalRequiredFields);

        const publishedRules = getValidationRules(WorkflowState.PUBLISHED);
        expect(publishedRules).toEqual(workflowValidationRules.publicationRequiredFields);

        const draftRules = getValidationRules(WorkflowState.DRAFT);
        expect(draftRules).toEqual([]);
      });
    });

    describe('getQualityCheckRequirements', () => {
      test('should return quality check requirements', () => {
        const requirements = getQualityCheckRequirements();
        expect(requirements.minImageCount).toBe(1);
        expect(requirements.maxImageCount).toBe(10);
        expect(requirements.minDescriptionLength).toBe(50);
        expect(requirements.maxDescriptionLength).toBe(2000);
      });
    });

    describe('getStateTimingConfig', () => {
      test('should return timing config for each state', () => {
        const reviewTiming = getStateTimingConfig(WorkflowState.REVIEW);
        expect(reviewTiming.maxDuration).toBe(72);
        expect(reviewTiming.reminders).toContain(24);
        expect(reviewTiming.reminders).toContain(48);

        const approvedTiming = getStateTimingConfig(WorkflowState.APPROVED);
        expect(approvedTiming.maxDuration).toBe(24);
        expect(approvedTiming.reminders).toContain(12);
      });
    });

    describe('isTransitionAllowed', () => {
      test('should return true for allowed transitions', () => {
        expect(isTransitionAllowed(WorkflowState.DRAFT, WorkflowState.REVIEW, UserRole.EDITOR)).toBe(true);
        expect(isTransitionAllowed(WorkflowState.REVIEW, WorkflowState.APPROVED, UserRole.REVIEWER)).toBe(true);
        expect(isTransitionAllowed(WorkflowState.REVIEW, WorkflowState.REJECTED, UserRole.REVIEWER)).toBe(true);
        expect(isTransitionAllowed(WorkflowState.APPROVED, WorkflowState.PUBLISHED, UserRole.ADMIN)).toBe(true);
      });

      test('should return false for disallowed transitions', () => {
        expect(isTransitionAllowed(WorkflowState.DRAFT, WorkflowState.REVIEW, UserRole.VIEWER)).toBe(false);
        expect(isTransitionAllowed(WorkflowState.DRAFT, WorkflowState.PUBLISHED, UserRole.EDITOR)).toBe(false);
        expect(isTransitionAllowed(WorkflowState.REVIEW, WorkflowState.APPROVED, UserRole.EDITOR)).toBe(false);
      });
    });

    describe('getRequiredRoleForTransition', () => {
      test('should return correct role for transitions', () => {
        expect(getRequiredRoleForTransition(WorkflowState.DRAFT, WorkflowState.REVIEW)).toBe(UserRole.EDITOR);
        expect(getRequiredRoleForTransition(WorkflowState.REVIEW, WorkflowState.APPROVED)).toBe(UserRole.REVIEWER);
        expect(getRequiredRoleForTransition(WorkflowState.APPROVED, WorkflowState.PUBLISHED)).toBe(UserRole.ADMIN);
      });

      test('should return null for invalid transitions', () => {
        expect(getRequiredRoleForTransition(WorkflowState.DRAFT, WorkflowState.PUBLISHED)).toBe(null);
        expect(getRequiredRoleForTransition(WorkflowState.REVIEW, WorkflowState.DRAFT)).toBe(null);
      });
    });

    describe('getAutomaticTransitions', () => {
      test('should return automatic transitions', () => {
        const automaticTransitions = getAutomaticTransitions(WorkflowState.REJECTED);
        expect(automaticTransitions.length).toBeGreaterThan(0);
        expect(automaticTransitions[0].isAutomatic).toBe(true);
        expect(automaticTransitions[0].to).toBe(WorkflowState.DRAFT);
      });

      test('should return empty array for states without automatic transitions', () => {
        const automaticTransitions = getAutomaticTransitions(WorkflowState.DRAFT);
        expect(automaticTransitions).toHaveLength(0);
      });
    });

    describe('getWorkflowProgress', () => {
      test('should return correct progress percentages', () => {
        expect(getWorkflowProgress(WorkflowState.DRAFT)).toBe(0);
        expect(getWorkflowProgress(WorkflowState.REVIEW)).toBe(33);
        expect(getWorkflowProgress(WorkflowState.APPROVED)).toBe(67);
        expect(getWorkflowProgress(WorkflowState.PUBLISHED)).toBe(100);
        expect(getWorkflowProgress(WorkflowState.REJECTED)).toBe(0);
      });
    });

    describe('getWorkflowStatusSummary', () => {
      test('should return correct status summary', () => {
        const mockProducts = [
          { workflowState: WorkflowState.DRAFT },
          { workflowState: WorkflowState.DRAFT },
          { workflowState: WorkflowState.REVIEW },
          { workflowState: WorkflowState.APPROVED },
          { workflowState: WorkflowState.PUBLISHED },
          { workflowState: WorkflowState.REJECTED },
        ];

        const summary = getWorkflowStatusSummary(mockProducts);
        expect(summary[WorkflowState.DRAFT]).toBe(2);
        expect(summary[WorkflowState.REVIEW]).toBe(1);
        expect(summary[WorkflowState.APPROVED]).toBe(1);
        expect(summary[WorkflowState.PUBLISHED]).toBe(1);
        expect(summary[WorkflowState.REJECTED]).toBe(1);
      });

      test('should handle empty products array', () => {
        const summary = getWorkflowStatusSummary([]);
        Object.values(WorkflowState).forEach(state => {
          expect(summary[state]).toBe(0);
        });
      });

      test('should handle products without workflow state', () => {
        const mockProducts = [
          { id: '1' }, // No workflowState
          { workflowState: WorkflowState.DRAFT },
        ];

        const summary = getWorkflowStatusSummary(mockProducts);
        expect(summary[WorkflowState.DRAFT]).toBe(1);
        expect(summary[WorkflowState.REVIEW]).toBe(0);
      });
    });
  });
});
