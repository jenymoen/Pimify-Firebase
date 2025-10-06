/**
 * Workflow Configuration
 * 
 * This file contains the complete workflow configuration including state transition rules,
 * role permissions, and workflow settings for the Workflow & Approval System.
 */

import {
  WorkflowState,
  WorkflowAction,
  UserRole,
  StateTransitionRule,
  WorkflowConfig,
  NotificationPreferences,
  defaultNotificationPreferences,
} from '@/types/workflow';

/**
 * Complete set of state transition rules for the workflow system
 */
export const workflowStateTransitionRules: StateTransitionRule[] = [
  // Draft → Review (Editor submits for review)
  {
    from: WorkflowState.DRAFT,
    to: WorkflowState.REVIEW,
    requiredRole: UserRole.EDITOR,
    requiredPermissions: ['products:write', 'workflow:submit'],
    isAutomatic: false,
    conditions: {
      assignedReviewer: true, // Must assign a reviewer
      minFieldsCompleted: true, // Must have minimum required fields
    },
  },

  // Review → Approved (Reviewer approves the product)
  {
    from: WorkflowState.REVIEW,
    to: WorkflowState.APPROVED,
    requiredRole: UserRole.REVIEWER,
    requiredPermissions: ['workflow:approve'],
    isAutomatic: false,
    conditions: {
      qualityCheckPassed: true, // Must pass quality checks
      allRequiredFields: true, // All required fields must be completed
    },
  },

  // Review → Rejected (Reviewer rejects the product)
  {
    from: WorkflowState.REVIEW,
    to: WorkflowState.REJECTED,
    requiredRole: UserRole.REVIEWER,
    requiredPermissions: ['workflow:reject'],
    isAutomatic: false,
    conditions: {
      rejectionReason: true, // Must provide rejection reason
    },
  },

  // Approved → Published (Admin publishes the product)
  {
    from: WorkflowState.APPROVED,
    to: WorkflowState.PUBLISHED,
    requiredRole: UserRole.ADMIN,
    requiredPermissions: ['workflow:publish'],
    isAutomatic: false,
    conditions: {
      publishReady: true, // Product must be ready for publication
      allAssetsReady: true, // All media assets must be ready
    },
  },

  // Rejected → Draft (Automatic transition when editor starts editing)
  {
    from: WorkflowState.REJECTED,
    to: WorkflowState.DRAFT,
    requiredRole: UserRole.EDITOR,
    requiredPermissions: ['products:write'],
    isAutomatic: true,
    conditions: {
      editorAction: true, // Triggered by editor action
    },
  },

  // Draft → Draft (Editor continues editing - no state change but logs activity)
  {
    from: WorkflowState.DRAFT,
    to: WorkflowState.DRAFT,
    requiredRole: UserRole.EDITOR,
    requiredPermissions: ['products:write'],
    isAutomatic: false,
    conditions: {
      contentChanged: true, // Must have content changes
    },
  },

  // Published → Draft (Admin unpublishes for major changes)
  {
    from: WorkflowState.PUBLISHED,
    to: WorkflowState.DRAFT,
    requiredRole: UserRole.ADMIN,
    requiredPermissions: ['workflow:unpublish'],
    isAutomatic: false,
    conditions: {
      unpublishReason: true, // Must provide reason for unpublishing
      majorChanges: true, // Must be major changes requiring review
    },
  },

  // Approved → Review (Admin sends back for additional review)
  {
    from: WorkflowState.APPROVED,
    to: WorkflowState.REVIEW,
    requiredRole: UserRole.ADMIN,
    requiredPermissions: ['workflow:reopen'],
    isAutomatic: false,
    conditions: {
      additionalReviewNeeded: true, // Must specify why additional review is needed
      newReviewer: true, // Must assign new reviewer if needed
    },
  },
];

/**
 * Role-based permissions for workflow actions
 */
export const workflowRolePermissions: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: [
    'workflow:*', // All workflow permissions
    'products:*', // All product permissions
    'users:*', // All user management permissions
    'audit:*', // All audit trail permissions
    'notifications:*', // All notification permissions
    'workflow:publish',
    'workflow:unpublish',
    'workflow:reopen',
    'workflow:configure',
    'products:create',
    'products:read',
    'products:write',
    'products:delete',
    'users:create',
    'users:read',
    'users:write',
    'users:delete',
    'audit:read',
    'notifications:manage',
  ],
  [UserRole.EDITOR]: [
    'products:create',
    'products:read',
    'products:write',
    'workflow:submit',
    'workflow:edit',
    'audit:read',
    'notifications:read',
  ],
  [UserRole.REVIEWER]: [
    'products:read',
    'workflow:approve',
    'workflow:reject',
    'workflow:review',
    'audit:read',
    'notifications:read',
  ],
  [UserRole.VIEWER]: [
    'products:read',
    'audit:read',
    'notifications:read',
  ],
};

/**
 * Workflow action to required permissions mapping
 */
export const workflowActionPermissions: Record<WorkflowAction, string[]> = {
  [WorkflowAction.CREATE]: ['products:create'],
  [WorkflowAction.EDIT]: ['products:write'],
  [WorkflowAction.SUBMIT]: ['workflow:submit'],
  [WorkflowAction.APPROVE]: ['workflow:approve'],
  [WorkflowAction.REJECT]: ['workflow:reject'],
  [WorkflowAction.PUBLISH]: ['workflow:publish'],
  [WorkflowAction.BULK_APPROVE]: ['workflow:approve', 'workflow:bulk'],
  [WorkflowAction.BULK_REJECT]: ['workflow:reject', 'workflow:bulk'],
  [WorkflowAction.BULK_PUBLISH]: ['workflow:publish', 'workflow:bulk'],
  [WorkflowAction.ASSIGN_REVIEWER]: ['workflow:assign'],
  [WorkflowAction.VIEW_AUDIT_TRAIL]: ['audit:read'],
  [WorkflowAction.MANAGE_USERS]: ['users:write'],
  [WorkflowAction.CONFIGURE_WORKFLOW]: ['workflow:configure'],
  [WorkflowAction.VIEW_ALL_PRODUCTS]: ['products:read'],
  [WorkflowAction.VIEW_PRODUCT_HISTORY]: ['audit:read'],
  [WorkflowAction.MANAGE_NOTIFICATIONS]: ['notifications:manage'],
  [WorkflowAction.PERFORM_BULK_OPERATIONS]: ['workflow:bulk'],
  [WorkflowAction.EXPORT_PRODUCTS]: ['products:read', 'products:export'],
};

/**
 * Workflow state display configuration
 */
export const workflowStateDisplayConfig = {
  [WorkflowState.DRAFT]: {
    displayName: 'Draft',
    description: 'Product is being created or edited',
    color: 'gray',
    icon: 'edit',
    badgeVariant: 'secondary' as const,
    canEdit: true,
    canDelete: true,
    requiresReview: false,
  },
  [WorkflowState.REVIEW]: {
    displayName: 'Under Review',
    description: 'Product is being reviewed by assigned reviewer',
    color: 'yellow',
    icon: 'eye',
    badgeVariant: 'warning' as const,
    canEdit: false,
    canDelete: false,
    requiresReview: true,
  },
  [WorkflowState.APPROVED]: {
    displayName: 'Approved',
    description: 'Product has been approved and is ready for publication',
    color: 'green',
    icon: 'check',
    badgeVariant: 'success' as const,
    canEdit: false,
    canDelete: false,
    requiresReview: false,
  },
  [WorkflowState.PUBLISHED]: {
    displayName: 'Published',
    description: 'Product is live and available to customers',
    color: 'blue',
    icon: 'globe',
    badgeVariant: 'default' as const,
    canEdit: false,
    canDelete: false,
    requiresReview: false,
  },
  [WorkflowState.REJECTED]: {
    displayName: 'Rejected',
    description: 'Product was rejected and needs to be revised',
    color: 'red',
    icon: 'x',
    badgeVariant: 'destructive' as const,
    canEdit: true,
    canDelete: false,
    requiresReview: false,
  },
};

/**
 * Workflow validation rules
 */
export const workflowValidationRules = {
  // Minimum required fields for submission
  minRequiredFields: [
    'basicInfo.name',
    'basicInfo.sku',
    'basicInfo.descriptionShort',
    'basicInfo.brand',
    'attributesAndSpecs.categories',
  ],
  
  // Fields that must be completed before approval
  approvalRequiredFields: [
    'basicInfo.name',
    'basicInfo.sku',
    'basicInfo.descriptionShort',
    'basicInfo.descriptionLong',
    'basicInfo.brand',
    'attributesAndSpecs.categories',
    'media.images',
    'marketingSEO.seoTitle',
    'marketingSEO.seoDescription',
  ],
  
  // Fields that must be completed before publication
  publicationRequiredFields: [
    'basicInfo.name',
    'basicInfo.sku',
    'basicInfo.descriptionShort',
    'basicInfo.descriptionLong',
    'basicInfo.brand',
    'attributesAndSpecs.categories',
    'attributesAndSpecs.properties',
    'media.images',
    'marketingSEO.seoTitle',
    'marketingSEO.seoDescription',
    'marketingSEO.keywords',
  ],
  
  // Quality check requirements
  qualityChecks: {
    minImageCount: 1,
    maxImageCount: 10,
    minDescriptionLength: 50,
    maxDescriptionLength: 2000,
    requiredCategories: 1,
    maxCategories: 5,
    minKeywords: 3,
    maxKeywords: 20,
  },
};

/**
 * Workflow timing and limits
 */
export const workflowTimingConfig = {
  // Maximum time in each state (in hours)
  maxStateDuration: {
    [WorkflowState.DRAFT]: 168, // 1 week
    [WorkflowState.REVIEW]: 72, // 3 days
    [WorkflowState.APPROVED]: 24, // 1 day
    [WorkflowState.PUBLISHED]: Infinity, // No limit
    [WorkflowState.REJECTED]: 168, // 1 week
  },
  
  // Reminder intervals (in hours)
  reminderIntervals: {
    [WorkflowState.REVIEW]: [24, 48], // Remind after 1 day and 2 days
    [WorkflowState.APPROVED]: [12], // Remind after 12 hours
    [WorkflowState.REJECTED]: [24, 72], // Remind after 1 day and 3 days
  },
  
  // Auto-escalation settings
  autoEscalation: {
    [WorkflowState.REVIEW]: {
      enabled: true,
      escalateAfterHours: 72, // Escalate after 3 days
      escalateToRole: UserRole.ADMIN,
    },
    [WorkflowState.APPROVED]: {
      enabled: true,
      escalateAfterHours: 24, // Escalate after 1 day
      escalateToRole: UserRole.ADMIN,
    },
  },
};

/**
 * Complete workflow configuration
 */
export const completeWorkflowConfig: WorkflowConfig = {
  stateTransitionRules: workflowStateTransitionRules,
  defaultNotificationPreferences: defaultNotificationPreferences,
};

/**
 * Helper functions for workflow configuration
 */

/**
 * Get all valid next states for a given current state and user role
 */
export function getValidNextStates(currentState: WorkflowState, userRole: UserRole): WorkflowState[] {
  return workflowStateTransitionRules
    .filter(rule => 
      rule.from === currentState && 
      rule.requiredRole === userRole &&
      !rule.isAutomatic
    )
    .map(rule => rule.to);
}

/**
 * Get all valid previous states for a given current state and user role
 */
export function getValidPreviousStates(currentState: WorkflowState, userRole: UserRole): WorkflowState[] {
  return workflowStateTransitionRules
    .filter(rule => 
      rule.to === currentState && 
      rule.requiredRole === userRole &&
      !rule.isAutomatic
    )
    .map(rule => rule.from);
}

/**
 * Check if a user role has permission for a specific action
 */
export function hasPermission(userRole: UserRole, action: WorkflowAction): boolean {
  const rolePermissions = workflowRolePermissions[userRole];
  const requiredPermissions = workflowActionPermissions[action];
  
  return requiredPermissions.every(permission => 
    rolePermissions.includes(permission) || 
    rolePermissions.includes(permission.split(':')[0] + ':*') ||
    rolePermissions.includes('*')
  );
}

/**
 * Get the display configuration for a workflow state
 */
export function getStateDisplayConfig(state: WorkflowState) {
  return workflowStateDisplayConfig[state];
}

/**
 * Get validation rules for a specific workflow state
 */
export function getValidationRules(state: WorkflowState): string[] {
  switch (state) {
    case WorkflowState.REVIEW:
      return workflowValidationRules.minRequiredFields;
    case WorkflowState.APPROVED:
      return workflowValidationRules.approvalRequiredFields;
    case WorkflowState.PUBLISHED:
      return workflowValidationRules.publicationRequiredFields;
    default:
      return [];
  }
}

/**
 * Get quality check requirements
 */
export function getQualityCheckRequirements() {
  return workflowValidationRules.qualityChecks;
}

/**
 * Get timing configuration for a workflow state
 */
export function getStateTimingConfig(state: WorkflowState) {
  return {
    maxDuration: workflowTimingConfig.maxStateDuration[state],
    reminders: workflowTimingConfig.reminderIntervals[state] || [],
    autoEscalation: workflowTimingConfig.autoEscalation[state] || null,
  };
}

/**
 * Check if a state transition is allowed
 */
export function isTransitionAllowed(
  from: WorkflowState,
  to: WorkflowState,
  userRole: UserRole
): boolean {
  const rule = workflowStateTransitionRules.find(r => 
    r.from === from && r.to === to && r.requiredRole === userRole
  );
  return rule !== undefined;
}

/**
 * Get the required role for a state transition
 */
export function getRequiredRoleForTransition(
  from: WorkflowState,
  to: WorkflowState
): UserRole | null {
  const rule = workflowStateTransitionRules.find(r => 
    r.from === from && r.to === to
  );
  return rule ? rule.requiredRole : null;
}

/**
 * Get all automatic transitions for a given state
 */
export function getAutomaticTransitions(state: WorkflowState): StateTransitionRule[] {
  return workflowStateTransitionRules.filter(rule => 
    rule.from === state && rule.isAutomatic
  );
}

/**
 * Get workflow progress percentage
 */
export function getWorkflowProgress(currentState: WorkflowState): number {
  const stateOrder = [
    WorkflowState.DRAFT,
    WorkflowState.REVIEW,
    WorkflowState.APPROVED,
    WorkflowState.PUBLISHED,
  ];
  
  const currentIndex = stateOrder.indexOf(currentState);
  if (currentIndex === -1) return 0;
  
  return Math.round((currentIndex / (stateOrder.length - 1)) * 100);
}

/**
 * Get workflow status summary
 */
export function getWorkflowStatusSummary(products: any[]): Record<WorkflowState, number> {
  const summary: Record<WorkflowState, number> = {
    [WorkflowState.DRAFT]: 0,
    [WorkflowState.REVIEW]: 0,
    [WorkflowState.APPROVED]: 0,
    [WorkflowState.PUBLISHED]: 0,
    [WorkflowState.REJECTED]: 0,
  };
  
  products.forEach(product => {
    if (product.workflowState && summary.hasOwnProperty(product.workflowState)) {
      summary[product.workflowState]++;
    }
  });
  
  return summary;
}
