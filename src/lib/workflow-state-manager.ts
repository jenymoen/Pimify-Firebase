/**
 * Workflow State Manager
 * 
 * This class handles workflow state transitions, validation, and management
 * for the Workflow & Approval System.
 */

import {
  WorkflowState,
  WorkflowAction,
  UserRole,
  StateTransitionRule,
  ProductWorkflow,
  WorkflowStateHistory,
  AuditTrailEntry,
  FieldChange,
} from '@/types/workflow';
import { defaultWorkflowConfig } from '@/types/workflow';

export interface StateTransitionRequest {
  productId: string;
  fromState: WorkflowState;
  toState: WorkflowState;
  userId: string;
  userRole: UserRole;
  reason?: string;
  comment?: string;
  assignedReviewer?: string;
}

export interface StateTransitionResult {
  success: boolean;
  newState?: WorkflowState;
  error?: string;
  auditEntry?: AuditTrailEntry;
  automaticTransitions?: StateTransitionResult[];
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class WorkflowStateManager {
  private stateTransitionRules: StateTransitionRule[];
  private auditTrailCallback?: (entry: AuditTrailEntry) => void;

  constructor(
    stateTransitionRules: StateTransitionRule[] = defaultWorkflowConfig.stateTransitionRules,
    auditTrailCallback?: (entry: AuditTrailEntry) => void
  ) {
    this.stateTransitionRules = stateTransitionRules;
    this.auditTrailCallback = auditTrailCallback;
  }

  /**
   * Set the audit trail callback function
   */
  setAuditTrailCallback(callback: (entry: AuditTrailEntry) => void): void {
    this.auditTrailCallback = callback;
  }

  /**
   * Validates if a state transition is allowed
   */
  validateStateTransition(request: StateTransitionRequest): WorkflowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Find applicable transition rule
    const rule = this.findTransitionRule(request.fromState, request.toState);

    if (!rule) {
      errors.push(`Transition from ${request.fromState} to ${request.toState} is not allowed`);
      return { isValid: false, errors, warnings };
    }

    // Check role permissions
    if (request.userRole !== UserRole.ADMIN && rule.requiredRole !== request.userRole) {
      errors.push(`User role ${request.userRole} is not authorized for this transition. Required role: ${rule.requiredRole}`);
    }

    // Check required permissions
    if (rule.requiredPermissions && rule.requiredPermissions.length > 0) {
      // This would typically check against user permissions
      // For now, we'll assume the role check is sufficient
      warnings.push('Permission validation should be implemented with user permission system');
    }

    // Check conditions
    if (rule.conditions) {
      try {
        const conditionErrors = this.validateConditions(rule.conditions, request);
        errors.push(...conditionErrors);
      } catch (error) {
        errors.push(`Condition validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Validate required fields for specific transitions
    const fieldValidationErrors = this.validateRequiredFields(request);
    errors.push(...fieldValidationErrors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Executes a state transition
   */
  async executeStateTransition(
    request: StateTransitionRequest,
    product: ProductWorkflow
  ): Promise<StateTransitionResult> {
    // Validate the transition
    const validation = this.validateStateTransition(request);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join('; '),
      };
    }

    try {
      // Find the transition rule
      const rule = this.findTransitionRule(request.fromState, request.toState);
      if (!rule) {
        return {
          success: false,
          error: 'No transition rule found',
        };
      }

      // Create audit trail entry
      const auditEntry = this.createAuditEntry(request, product, rule);

      // Execute the transition
      const newState = request.toState;
      const updatedProduct = this.updateProductState(product, request, newState);

      // Log to audit trail
      if (this.auditTrailCallback && auditEntry) {
        this.auditTrailCallback(auditEntry);
      }

      // Check for automatic transitions
      const automaticTransitions = await this.checkAutomaticTransitions(updatedProduct, request.userId);

      return {
        success: true,
        newState,
        auditEntry,
        automaticTransitions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Gets all valid next states for a given current state and user role
   */
  getValidNextStates(currentState: WorkflowState, userRole: UserRole): WorkflowState[] {
    return this.stateTransitionRules
      .filter(rule =>
        rule.from === currentState &&
        rule.requiredRole === userRole &&
        !rule.isAutomatic
      )
      .map(rule => rule.to);
  }

  /**
   * Gets all valid transition rules for a given current state and user role
   */
  getAvailableTransitions(currentState: WorkflowState, userRole: UserRole): StateTransitionRule[] {
    return this.stateTransitionRules.filter(rule =>
      rule.from === currentState &&
      rule.requiredRole === userRole &&
      !rule.isAutomatic
    );
  }

  /**
   * Gets all valid previous states for a given current state and user role
   */
  getValidPreviousStates(currentState: WorkflowState, userRole: UserRole): WorkflowState[] {
    return this.stateTransitionRules
      .filter(rule =>
        rule.to === currentState &&
        rule.requiredRole === userRole &&
        !rule.isAutomatic
      )
      .map(rule => rule.from);
  }

  /**
   * Checks if a user can perform a specific action on a product
   */
  canPerformAction(
    action: WorkflowAction,
    currentState: WorkflowState,
    userRole: UserRole
  ): boolean {
    const validStates = this.getValidNextStates(currentState, userRole);

    switch (action) {
      case WorkflowAction.SUBMIT:
        return validStates.includes(WorkflowState.REVIEW);
      case WorkflowAction.APPROVE:
        return validStates.includes(WorkflowState.APPROVED);
      case WorkflowAction.REJECT:
        return validStates.includes(WorkflowState.REJECTED);
      case WorkflowAction.PUBLISH:
        return validStates.includes(WorkflowState.PUBLISHED);
      case WorkflowAction.EDIT:
        return currentState === WorkflowState.DRAFT || currentState === WorkflowState.REJECTED;
      case WorkflowAction.CREATE:
        return userRole === UserRole.EDITOR || userRole === UserRole.ADMIN;
      default:
        return false;
    }
  }

  /**
   * Gets the workflow progress for a product
   */
  getWorkflowProgress(product: ProductWorkflow): {
    currentStep: number;
    totalSteps: number;
    steps: Array<{
      state: WorkflowState;
      completed: boolean;
      timestamp?: string;
      userId?: string;
    }>;
  } {
    const workflowSteps = [
      WorkflowState.DRAFT,
      WorkflowState.REVIEW,
      WorkflowState.APPROVED,
      WorkflowState.PUBLISHED,
    ];

    const steps = workflowSteps.map(state => {
      const historyEntry = product.workflowHistory.find(h => h.state === state);
      return {
        state,
        completed: historyEntry !== undefined,
        timestamp: historyEntry?.timestamp,
        userId: historyEntry?.userId,
      };
    });

    const currentStep = steps.findIndex(step => step.state === product.workflowState);
    const totalSteps = steps.length;

    return {
      currentStep: currentStep >= 0 ? currentStep + 1 : 0,
      totalSteps,
      steps,
    };
  }

  /**
   * Validates a product's current state
   */
  validateProductState(product: ProductWorkflow): WorkflowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if workflow history is consistent
    if (product.workflowHistory.length === 0) {
      errors.push('Product must have at least one workflow history entry');
    }

    // Check if current state is in history (only if it's not the initial state)
    const currentStateInHistory = product.workflowHistory.some(h => h.state === product.workflowState);
    if (!currentStateInHistory && product.workflowState !== WorkflowState.DRAFT) {
      errors.push('Current workflow state must be present in workflow history');
    }

    // Validate state-specific requirements
    switch (product.workflowState) {
      case WorkflowState.REVIEW:
        if (!product.assignedReviewer) {
          warnings.push('Product in review state should have an assigned reviewer');
        }
        if (!product.submittedBy) {
          errors.push('Product in review state must have a submitted by user');
        }
        if (!product.submittedAt) {
          errors.push('Product in review state must have a submission timestamp');
        }
        break;

      case WorkflowState.APPROVED:
        if (!product.reviewedBy) {
          errors.push('Product in approved state must have a reviewed by user');
        }
        if (!product.reviewedAt) {
          errors.push('Product in approved state must have a review timestamp');
        }
        break;

      case WorkflowState.PUBLISHED:
        if (!product.publishedBy) {
          errors.push('Product in published state must have a published by user');
        }
        if (!product.publishedAt) {
          errors.push('Product in published state must have a publication timestamp');
        }
        break;

      case WorkflowState.REJECTED:
        if (!product.rejectionReason) {
          warnings.push('Rejected products should have a rejection reason');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Private helper methods
   */
  private findTransitionRule(from: WorkflowState, to: WorkflowState): StateTransitionRule | undefined {
    return this.stateTransitionRules.find(rule => rule.from === from && rule.to === to);
  }

  private validateConditions(
    conditions: Record<string, any>,
    request: StateTransitionRequest
  ): string[] {
    const errors: string[] = [];

    // Example condition validations
    if (conditions.minFieldsCompleted) {
      // This would check if minimum required fields are completed
      // Implementation depends on product validation logic
    }

    if (conditions.assignedReviewer) {
      if (request.toState === WorkflowState.REVIEW && !request.assignedReviewer) {
        errors.push('Reviewer must be assigned when submitting for review');
      }
    }

    // Check for function conditions that might throw errors
    for (const [key, value] of Object.entries(conditions)) {
      if (typeof value === 'function') {
        try {
          value(request);
        } catch (error) {
          throw error; // Re-throw to be caught by the calling method
        }
      }
    }

    return errors;
  }

  private validateRequiredFields(request: StateTransitionRequest): string[] {
    const errors: string[] = [];

    // Validate required fields for specific transitions
    switch (request.toState) {
      case WorkflowState.REVIEW:
        if (!request.assignedReviewer) {
          errors.push('Reviewer must be assigned when submitting for review');
        }
        break;

      case WorkflowState.REJECTED:
        if (!request.reason) {
          errors.push('Rejection reason is required when rejecting a product');
        }
        break;
    }

    return errors;
  }

  private createAuditEntry(
    request: StateTransitionRequest,
    product: ProductWorkflow,
    rule: StateTransitionRule
  ): AuditTrailEntry {
    const fieldChanges: FieldChange[] = [
      {
        field: 'workflowState',
        previousValue: request.fromState,
        newValue: request.toState,
        fieldType: 'string',
      },
    ];

    // Add additional field changes based on the transition
    if (request.assignedReviewer && request.toState === WorkflowState.REVIEW) {
      fieldChanges.push({
        field: 'assignedReviewer',
        previousValue: product.assignedReviewer,
        newValue: request.assignedReviewer,
        fieldType: 'string',
      });
    }

    return {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: request.productId,
      userId: request.userId,
      userEmail: '', // This would be populated from user data
      action: this.getActionFromTransition(request.fromState, request.toState),
      timestamp: new Date().toISOString(),
      fieldChanges,
      reason: request.reason,
      comment: request.comment,
      productState: request.toState,
      metadata: {
        transitionRule: rule,
        userRole: request.userRole,
        isAutomatic: rule.isAutomatic,
      },
    };
  }

  private updateProductState(
    product: ProductWorkflow,
    request: StateTransitionRequest,
    newState: WorkflowState
  ): ProductWorkflow {
    const now = new Date().toISOString();
    const historyEntry: WorkflowStateHistory = {
      state: newState,
      timestamp: now,
      userId: request.userId,
      reason: request.reason,
      comment: request.comment,
    };

    const updatedProduct: ProductWorkflow = {
      ...product,
      workflowState: newState,
      workflowHistory: [...product.workflowHistory, historyEntry],
    };

    // Update state-specific fields
    switch (newState) {
      case WorkflowState.REVIEW:
        updatedProduct.assignedReviewer = request.assignedReviewer;
        updatedProduct.submittedBy = request.userId;
        updatedProduct.submittedAt = now;
        break;

      case WorkflowState.APPROVED:
        updatedProduct.reviewedBy = request.userId;
        updatedProduct.reviewedAt = now;
        break;

      case WorkflowState.PUBLISHED:
        updatedProduct.publishedBy = request.userId;
        updatedProduct.publishedAt = now;
        break;

      case WorkflowState.REJECTED:
        updatedProduct.rejectionReason = request.reason;
        updatedProduct.reviewedBy = request.userId;
        updatedProduct.reviewedAt = now;
        break;

      case WorkflowState.DRAFT:
        // Clear review-related fields when returning to draft
        if (request.fromState === WorkflowState.REJECTED) {
          updatedProduct.rejectionReason = undefined;
        }
        break;
    }

    return updatedProduct;
  }

  private async checkAutomaticTransitions(
    product: ProductWorkflow,
    userId: string
  ): Promise<StateTransitionResult[]> {
    const automaticTransitions: StateTransitionResult[] = [];

    // Check for automatic transitions
    const automaticRules = this.stateTransitionRules.filter(rule => rule.isAutomatic);

    for (const rule of automaticRules) {
      if (rule.from === product.workflowState) {
        const request: StateTransitionRequest = {
          productId: product.id,
          fromState: rule.from,
          toState: rule.to,
          userId,
          userRole: rule.requiredRole,
          reason: 'Automatic transition',
        };

        const result = await this.executeStateTransition(request, product);
        if (result.success) {
          automaticTransitions.push(result);
        }
      }
    }

    return automaticTransitions;
  }

  private getActionFromTransition(from: WorkflowState, to: WorkflowState): WorkflowAction {
    switch (to) {
      case WorkflowState.REVIEW:
        return WorkflowAction.SUBMIT;
      case WorkflowState.APPROVED:
        return WorkflowAction.APPROVE;
      case WorkflowState.REJECTED:
        return WorkflowAction.REJECT;
      case WorkflowState.PUBLISHED:
        return WorkflowAction.PUBLISH;
      case WorkflowState.DRAFT:
        return from === WorkflowState.REJECTED ? WorkflowAction.EDIT : WorkflowAction.CREATE;
      default:
        return WorkflowAction.EDIT;
    }
  }

  /**
   * Public utility methods
   */

  /**
   * Gets the display name for a workflow state
   */
  getStateDisplayName(state: WorkflowState): string {
    const displayNames: Record<WorkflowState, string> = {
      [WorkflowState.DRAFT]: 'Draft',
      [WorkflowState.REVIEW]: 'Under Review',
      [WorkflowState.APPROVED]: 'Approved',
      [WorkflowState.PUBLISHED]: 'Published',
      [WorkflowState.REJECTED]: 'Rejected',
    };
    return displayNames[state];
  }

  /**
   * Gets the color for a workflow state (for UI display)
   */
  getStateColor(state: WorkflowState): string {
    const colors: Record<WorkflowState, string> = {
      [WorkflowState.DRAFT]: 'gray',
      [WorkflowState.REVIEW]: 'yellow',
      [WorkflowState.APPROVED]: 'green',
      [WorkflowState.PUBLISHED]: 'blue',
      [WorkflowState.REJECTED]: 'red',
    };
    return colors[state];
  }

  /**
   * Gets the icon for a workflow state (for UI display)
   */
  getStateIcon(state: WorkflowState): string {
    const icons: Record<WorkflowState, string> = {
      [WorkflowState.DRAFT]: 'edit',
      [WorkflowState.REVIEW]: 'eye',
      [WorkflowState.APPROVED]: 'check',
      [WorkflowState.PUBLISHED]: 'globe',
      [WorkflowState.REJECTED]: 'x',
    };
    return icons[state];
  }
}
