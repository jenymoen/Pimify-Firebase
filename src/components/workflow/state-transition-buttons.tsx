'use client';

import React, { useState, useCallback } from 'react';
import { WorkflowState, WorkflowAction, UserRole } from '@/types/workflow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  ArrowRight, 
  Check, 
  X, 
  Eye, 
  Edit, 
  Send, 
  RotateCcw,
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  FileText,
  Zap
} from 'lucide-react';

/**
 * Props for the StateTransitionButtons component
 */
export interface StateTransitionButtonsProps {
  /** Current workflow state */
  currentState: WorkflowState;
  /** User's role */
  userRole: UserRole;
  /** Product ID for context */
  productId: string;
  /** Whether the user owns this product */
  isOwner?: boolean;
  /** Whether the product is assigned to the current user */
  isAssigned?: boolean;
  /** Current reviewer ID */
  reviewerId?: string;
  /** Whether the product has been rejected before */
  hasBeenRejected?: boolean;
  /** Whether the product has required fields missing */
  hasValidationErrors?: boolean;
  /** Whether the product is in a locked state */
  isLocked?: boolean;
  /** Custom className */
  className?: string;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Button variant */
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost';
  /** Whether to show tooltips */
  showTooltips?: boolean;
  /** Whether to show action descriptions */
  showDescriptions?: boolean;
  /** Whether buttons are disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Callback when a state transition is requested */
  onStateTransition?: (action: WorkflowAction, newState: WorkflowState, reason?: string) => void;
  /** Callback when reviewer assignment is requested */
  onAssignReviewer?: (reviewerId: string) => void;
  /** Callback when a comment is added */
  onAddComment?: (comment: string) => void;
  /** Available reviewers for assignment */
  availableReviewers?: Array<{ id: string; name: string; role: UserRole }>;
  /** Custom validation function */
  validateTransition?: (action: WorkflowAction, currentState: WorkflowState) => { isValid: boolean; reason?: string };
}

/**
 * Configuration for state transition actions
 */
const TRANSITION_CONFIG = {
  [WorkflowAction.SUBMIT_FOR_REVIEW]: {
    label: 'Submit for Review',
    description: 'Submit product for review by assigned reviewer',
    icon: Send,
    color: 'bg-blue-500 hover:bg-blue-600',
    textColor: 'text-white',
    nextState: WorkflowState.REVIEW,
    requiredRole: UserRole.EDITOR,
    requiresOwnership: true,
    requiresValidation: true,
    confirmationMessage: 'Are you sure you want to submit this product for review?',
  },
  [WorkflowAction.APPROVE]: {
    label: 'Approve',
    description: 'Approve product for publication',
    icon: Check,
    color: 'bg-green-500 hover:bg-green-600',
    textColor: 'text-white',
    nextState: WorkflowState.APPROVED,
    requiredRole: UserRole.REVIEWER,
    requiresAssignment: true,
    confirmationMessage: 'Are you sure you want to approve this product?',
  },
  [WorkflowAction.REJECT]: {
    label: 'Reject',
    description: 'Reject product and return to draft',
    icon: X,
    color: 'bg-red-500 hover:bg-red-600',
    textColor: 'text-white',
    nextState: WorkflowState.REJECTED,
    requiredRole: UserRole.REVIEWER,
    requiresAssignment: true,
    requiresReason: true,
    confirmationMessage: 'Are you sure you want to reject this product?',
  },
  [WorkflowAction.PUBLISH]: {
    label: 'Publish',
    description: 'Publish product to live environment',
    icon: Zap,
    color: 'bg-purple-500 hover:bg-purple-600',
    textColor: 'text-white',
    nextState: WorkflowState.PUBLISHED,
    requiredRole: UserRole.ADMIN,
    confirmationMessage: 'Are you sure you want to publish this product?',
  },
  [WorkflowAction.REVERT_TO_DRAFT]: {
    label: 'Revert to Draft',
    description: 'Revert product back to draft state',
    icon: RotateCcw,
    color: 'bg-gray-500 hover:bg-gray-600',
    textColor: 'text-white',
    nextState: WorkflowState.DRAFT,
    requiredRole: UserRole.ADMIN,
    confirmationMessage: 'Are you sure you want to revert this product to draft?',
  },
  [WorkflowAction.ASSIGN_REVIEWER]: {
    label: 'Assign Reviewer',
    description: 'Assign a reviewer to this product',
    icon: User,
    color: 'bg-indigo-500 hover:bg-indigo-600',
    textColor: 'text-white',
    nextState: null,
    requiredRole: UserRole.ADMIN,
    isAssignmentAction: true,
  },
  [WorkflowAction.ADD_COMMENT]: {
    label: 'Add Comment',
    description: 'Add a comment or feedback',
    icon: MessageSquare,
    color: 'bg-yellow-500 hover:bg-yellow-600',
    textColor: 'text-white',
    nextState: null,
    requiredRole: UserRole.REVIEWER,
    isCommentAction: true,
  },
  [WorkflowAction.EDIT]: {
    label: 'Edit',
    description: 'Edit product information',
    icon: Edit,
    color: 'bg-blue-500 hover:bg-blue-600',
    textColor: 'text-white',
    nextState: null,
    requiredRole: UserRole.EDITOR,
    requiresOwnership: true,
    isEditAction: true,
  },
} as const;

/**
 * Role hierarchy for permission checking
 */
const ROLE_HIERARCHY = {
  [UserRole.ADMIN]: 4,
  [UserRole.REVIEWER]: 3,
  [UserRole.EDITOR]: 2,
  [UserRole.VIEWER]: 1,
} as const;

/**
 * StateTransitionButtons component for displaying contextual workflow action buttons
 */
export const StateTransitionButtons: React.FC<StateTransitionButtonsProps> = ({
  currentState,
  userRole,
  productId,
  isOwner = false,
  isAssigned = false,
  reviewerId,
  hasBeenRejected = false,
  hasValidationErrors = false,
  isLocked = false,
  className,
  size = 'md',
  variant = 'default',
  showTooltips = true,
  showDescriptions = false,
  disabled = false,
  loading = false,
  onStateTransition,
  onAssignReviewer,
  onAddComment,
  availableReviewers = [],
  validateTransition,
}) => {
  const [selectedReviewer, setSelectedReviewer] = useState<string>('');
  const [commentText, setCommentText] = useState<string>('');
  const [showReasonDialog, setShowReasonDialog] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<WorkflowAction | null>(null);
  const [reasonText, setReasonText] = useState<string>('');

  /**
   * Check if user has permission for an action
   */
  const hasPermission = useCallback((action: WorkflowAction): boolean => {
    const config = TRANSITION_CONFIG[action];
    if (!config) return false;

    // Check role requirement
    const userRoleLevel = ROLE_HIERARCHY[userRole];
    const requiredRoleLevel = ROLE_HIERARCHY[config.requiredRole];
    
    if (userRoleLevel < requiredRoleLevel) {
      return false;
    }

    // Check ownership requirement
    if (config.requiresOwnership && !isOwner) {
      return false;
    }

    // Check assignment requirement
    if (config.requiresAssignment && !isAssigned) {
      return false;
    }

    // Check if product is locked
    if (isLocked && !config.isViewAction) {
      return false;
    }

    return true;
  }, [userRole, isOwner, isAssigned, isLocked]);

  /**
   * Get available actions for current state and user role
   */
  const getAvailableActions = useCallback((): WorkflowAction[] => {
    const actions: WorkflowAction[] = [];

    // State-specific actions
    switch (currentState) {
      case WorkflowState.DRAFT:
        if (hasPermission(WorkflowAction.SUBMIT_FOR_REVIEW) && !hasValidationErrors) {
          actions.push(WorkflowAction.SUBMIT_FOR_REVIEW);
        }
        if (hasPermission(WorkflowAction.EDIT)) {
          actions.push(WorkflowAction.EDIT);
        }
        if (hasPermission(WorkflowAction.ASSIGN_REVIEWER)) {
          actions.push(WorkflowAction.ASSIGN_REVIEWER);
        }
        break;

      case WorkflowState.REVIEW:
        if (hasPermission(WorkflowAction.APPROVE)) {
          actions.push(WorkflowAction.APPROVE);
        }
        if (hasPermission(WorkflowAction.REJECT)) {
          actions.push(WorkflowAction.REJECT);
        }
        if (hasPermission(WorkflowAction.ADD_COMMENT)) {
          actions.push(WorkflowAction.ADD_COMMENT);
        }
        if (hasPermission(WorkflowAction.ASSIGN_REVIEWER)) {
          actions.push(WorkflowAction.ASSIGN_REVIEWER);
        }
        break;

      case WorkflowState.APPROVED:
        if (hasPermission(WorkflowAction.PUBLISH)) {
          actions.push(WorkflowAction.PUBLISH);
        }
        if (hasPermission(WorkflowAction.REVERT_TO_DRAFT)) {
          actions.push(WorkflowAction.REVERT_TO_DRAFT);
        }
        break;

      case WorkflowState.PUBLISHED:
        if (hasPermission(WorkflowAction.REVERT_TO_DRAFT)) {
          actions.push(WorkflowAction.REVERT_TO_DRAFT);
        }
        break;

      case WorkflowState.REJECTED:
        if (hasPermission(WorkflowAction.EDIT)) {
          actions.push(WorkflowAction.EDIT);
        }
        if (hasPermission(WorkflowAction.REVERT_TO_DRAFT)) {
          actions.push(WorkflowAction.REVERT_TO_DRAFT);
        }
        break;
    }

    // Note: VIEW_DETAILS is handled by the main ProductCard button, not here

    return actions;
  }, [currentState, hasPermission, hasValidationErrors]);

  /**
   * Handle action button click
   */
  const handleActionClick = useCallback((action: WorkflowAction) => {
    const config = TRANSITION_CONFIG[action];
    if (!config || !hasPermission(action)) return;

    // Check custom validation
    if (validateTransition) {
      const validation = validateTransition(action, currentState);
      if (!validation.isValid) {
        alert(validation.reason || 'This action is not valid at this time.');
        return;
      }
    }

    // Handle special actions
    if (config.isAssignmentAction) {
      // Show reviewer selection
      return;
    }

    if (config.isCommentAction) {
      // Show comment dialog
      return;
    }

    if (config.isViewAction) {
      // Handle view action
      return;
    }

    if (config.isEditAction) {
      // Handle edit action
      return;
    }

    // Handle state transitions
    if (config.requiresReason) {
      setPendingAction(action);
      setShowReasonDialog(true);
      return;
    }

    if (config.confirmationMessage) {
      if (window.confirm(config.confirmationMessage)) {
        onStateTransition?.(action, config.nextState!);
      }
      return;
    }

    onStateTransition?.(action, config.nextState!);
  }, [currentState, hasPermission, validateTransition, onStateTransition]);

  /**
   * Handle reason submission
   */
  const handleReasonSubmit = useCallback(() => {
    if (!pendingAction || !reasonText.trim()) return;

    const config = TRANSITION_CONFIG[pendingAction];
    if (config) {
      onStateTransition?.(pendingAction, config.nextState!, reasonText);
    }

    setShowReasonDialog(false);
    setPendingAction(null);
    setReasonText('');
  }, [pendingAction, reasonText, onStateTransition]);

  /**
   * Get button variant based on action type
   */
  const getButtonVariant = useCallback((action: WorkflowAction): 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' => {
    const config = TRANSITION_CONFIG[action];
    if (!config) return variant;

    if (config.color.includes('red')) return 'destructive';
    if (config.color.includes('green')) return 'default';
    if (config.color.includes('blue')) return 'default';
    if (config.color.includes('purple')) return 'default';
    if (config.color.includes('yellow')) return 'secondary';
    if (config.color.includes('gray')) return 'outline';

    return variant;
  }, [variant]);

  const availableActions = getAvailableActions();

  if (availableActions.length === 0) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge variant="outline" className="text-gray-500">
          No actions available
        </Badge>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        {availableActions
          .filter((action) => TRANSITION_CONFIG[action]) // Filter out invalid actions first
          .map((action) => {
            const config = TRANSITION_CONFIG[action];
            const Icon = config.icon;
            const isDisabled = disabled || loading || !hasPermission(action);

            const button = (
              <Button
                variant={getButtonVariant(action)}
                size={size}
                disabled={isDisabled}
                onClick={() => handleActionClick(action)}
                className={cn(
                  'transition-all duration-200',
                  config.color,
                  config.textColor,
                  isDisabled && 'opacity-50 cursor-not-allowed',
                  loading && 'animate-pulse'
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {config.label}
                {loading && <Clock className="w-4 h-4 ml-2 animate-spin" />}
              </Button>
            );

            if (showTooltips && !isDisabled) {
              return (
                <Tooltip key={action}>
                  <TooltipTrigger asChild>
                    {button}
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-xs">
                      <p className="font-medium">{config.label}</p>
                      <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                      {showDescriptions && config.requiredRole && (
                        <p className="text-xs text-gray-500 mt-1">
                          Requires: {config.requiredRole}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }
            
            return <React.Fragment key={action}>{button}</React.Fragment>;
          })}

        {/* Validation Error Indicator */}
        {hasValidationErrors && (
          <Tooltip key="validation-errors">
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="cursor-help">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Validation Errors
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>This product has validation errors that must be fixed before submission.</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Locked State Indicator */}
        {isLocked && (
          <Tooltip key="locked-indicator">
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="cursor-help">
                <FileText className="w-3 h-3 mr-1" />
                Locked
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>This product is currently locked and cannot be modified.</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Reason Dialog */}
      {showReasonDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {pendingAction && TRANSITION_CONFIG[pendingAction]?.label}
            </h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for this action:
            </p>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Enter reason..."
              className="w-full p-3 border border-gray-300 rounded-md resize-none h-24"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReasonDialog(false);
                  setPendingAction(null);
                  setReasonText('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReasonSubmit}
                disabled={!reasonText.trim()}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
};

/**
 * StateTransitionButtonGroup component for displaying grouped actions
 */
export interface StateTransitionButtonGroupProps {
  /** Array of state transition button configurations */
  buttonGroups: Array<{
    title: string;
    actions: WorkflowAction[];
    currentState: WorkflowState;
    userRole: UserRole;
    productId: string;
    isOwner?: boolean;
    isAssigned?: boolean;
  }>;
  /** Common props for all buttons */
  commonProps?: Partial<StateTransitionButtonsProps>;
  /** Custom className */
  className?: string;
}

export const StateTransitionButtonGroup: React.FC<StateTransitionButtonGroupProps> = ({
  buttonGroups,
  commonProps = {},
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {buttonGroups.map((group, index) => (
        <div key={`group-${index}-${group.title}`} className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">{group.title}</h4>
          <StateTransitionButtons
            currentState={group.currentState}
            userRole={group.userRole}
            productId={group.productId}
            isOwner={group.isOwner}
            isAssigned={group.isAssigned}
            {...commonProps}
          />
        </div>
      ))}
    </div>
  );
};

export default StateTransitionButtons;
