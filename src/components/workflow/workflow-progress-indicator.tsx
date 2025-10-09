'use client';

import React from 'react';
import { WorkflowState, UserRole } from '@/types/workflow';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Zap,
  FileText,
  Eye,
  User,
  Calendar,
  MessageSquare
} from 'lucide-react';

/**
 * Props for the WorkflowProgressIndicator component
 */
export interface WorkflowProgressIndicatorProps {
  /** Current workflow state */
  currentState: WorkflowState;
  /** Workflow history for showing completed steps */
  workflowHistory?: Array<{
    id: string;
    action: string;
    fromState: WorkflowState;
    toState: WorkflowState;
    userId: string;
    userName: string;
    timestamp: string;
    reason?: string;
  }>;
  /** Assigned reviewer information */
  assignedReviewer?: {
    userId: string;
    userName: string;
    userRole: UserRole;
  };
  /** Whether to show detailed information */
  showDetails?: boolean;
  /** Whether to show timestamps */
  showTimestamps?: boolean;
  /** Whether to show user information */
  showUserInfo?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color scheme */
  colorScheme?: 'default' | 'minimal' | 'vibrant' | 'monochrome';
  /** Custom className */
  className?: string;
  /** Whether to show step numbers */
  showStepNumbers?: boolean;
  /** Whether to show estimated time for each step */
  showEstimatedTime?: boolean;
  /** Click handler for steps */
  onStepClick?: (step: WorkflowStep, index: number) => void;
  /** Whether steps are clickable */
  clickable?: boolean;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  state: WorkflowState;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  estimatedTime?: string;
  requiredRole?: UserRole;
}

/**
 * Configuration for workflow steps
 */
const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    state: WorkflowState.DRAFT,
    label: 'Draft',
    description: 'Product is being created or edited',
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    textColor: 'text-gray-800',
    estimatedTime: '1-2 days',
    requiredRole: UserRole.EDITOR,
  },
  {
    state: WorkflowState.REVIEW,
    label: 'Review',
    description: 'Product is under review by assigned reviewer',
    icon: Eye,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-800',
    estimatedTime: '2-3 days',
    requiredRole: UserRole.REVIEWER,
  },
  {
    state: WorkflowState.APPROVED,
    label: 'Approved',
    description: 'Product has been approved for publication',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    textColor: 'text-green-800',
    estimatedTime: '1 day',
    requiredRole: UserRole.ADMIN,
  },
  {
    state: WorkflowState.PUBLISHED,
    label: 'Published',
    description: 'Product is live and published',
    icon: Zap,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-800',
    estimatedTime: 'Immediate',
    requiredRole: UserRole.ADMIN,
  },
];

/**
 * Alternative color schemes
 */
const COLOR_SCHEMES = {
  default: {
    [WorkflowState.DRAFT]: 'text-gray-600 bg-gray-100 border-gray-300',
    [WorkflowState.REVIEW]: 'text-yellow-600 bg-yellow-100 border-yellow-300',
    [WorkflowState.APPROVED]: 'text-green-600 bg-green-100 border-green-300',
    [WorkflowState.PUBLISHED]: 'text-blue-600 bg-blue-100 border-blue-300',
    [WorkflowState.REJECTED]: 'text-red-600 bg-red-100 border-red-300',
  },
  minimal: {
    [WorkflowState.DRAFT]: 'text-slate-600 bg-slate-50 border-slate-200',
    [WorkflowState.REVIEW]: 'text-amber-600 bg-amber-50 border-amber-200',
    [WorkflowState.APPROVED]: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    [WorkflowState.PUBLISHED]: 'text-sky-600 bg-sky-50 border-sky-200',
    [WorkflowState.REJECTED]: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  vibrant: {
    [WorkflowState.DRAFT]: 'text-purple-600 bg-purple-100 border-purple-300',
    [WorkflowState.REVIEW]: 'text-orange-600 bg-orange-100 border-orange-300',
    [WorkflowState.APPROVED]: 'text-lime-600 bg-lime-100 border-lime-300',
    [WorkflowState.PUBLISHED]: 'text-cyan-600 bg-cyan-100 border-cyan-300',
    [WorkflowState.REJECTED]: 'text-pink-600 bg-pink-100 border-pink-300',
  },
  monochrome: {
    [WorkflowState.DRAFT]: 'text-gray-600 bg-gray-100 border-gray-300',
    [WorkflowState.REVIEW]: 'text-gray-700 bg-gray-200 border-gray-400',
    [WorkflowState.APPROVED]: 'text-gray-800 bg-gray-300 border-gray-500',
    [WorkflowState.PUBLISHED]: 'text-white bg-gray-600 border-gray-700',
    [WorkflowState.REJECTED]: 'text-white bg-gray-500 border-gray-600',
  },
} as const;

/**
 * Size configurations
 */
const SIZE_CONFIG = {
  sm: {
    container: 'gap-2',
    step: 'px-2 py-1 text-xs',
    icon: 'w-3 h-3',
    connector: 'h-0.5',
    spacing: 'gap-1',
  },
  md: {
    container: 'gap-3',
    step: 'px-3 py-2 text-sm',
    icon: 'w-4 h-4',
    connector: 'h-1',
    spacing: 'gap-2',
  },
  lg: {
    container: 'gap-4',
    step: 'px-4 py-3 text-base',
    icon: 'w-5 h-5',
    connector: 'h-1.5',
    spacing: 'gap-3',
  },
} as const;

/**
 * WorkflowProgressIndicator component for displaying workflow progress
 */
export const WorkflowProgressIndicator: React.FC<WorkflowProgressIndicatorProps> = ({
  currentState,
  workflowHistory = [],
  assignedReviewer,
  showDetails = true,
  showTimestamps = true,
  showUserInfo = true,
  size = 'md',
  colorScheme = 'default',
  className,
  showStepNumbers = true,
  showEstimatedTime = false,
  onStepClick,
  clickable = false,
}) => {
  const sizeConfig = SIZE_CONFIG[size];
  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.default;

  /**
   * Get the current step index
   */
  const getCurrentStepIndex = (): number => {
    return WORKFLOW_STEPS.findIndex(step => step.state === currentState);
  };

  /**
   * Check if a step is completed
   */
  const isStepCompleted = (stepIndex: number): boolean => {
    const currentIndex = getCurrentStepIndex();
    return stepIndex < currentIndex;
  };

  /**
   * Check if a step is current
   */
  const isStepCurrent = (stepIndex: number): boolean => {
    const currentIndex = getCurrentStepIndex();
    return stepIndex === currentIndex;
  };

  /**
   * Check if a step is pending
   */
  const isStepPending = (stepIndex: number): boolean => {
    const currentIndex = getCurrentStepIndex();
    return stepIndex > currentIndex;
  };

  /**
   * Get step status
   */
  const getStepStatus = (stepIndex: number): 'completed' | 'current' | 'pending' => {
    if (isStepCompleted(stepIndex)) return 'completed';
    if (isStepCurrent(stepIndex)) return 'current';
    return 'pending';
  };

  /**
   * Get step history entry
   */
  const getStepHistory = (state: WorkflowState) => {
    return workflowHistory?.find(entry => entry.toState === state);
  };

  /**
   * Handle step click
   */
  const handleStepClick = (step: WorkflowStep, index: number) => {
    if (clickable && onStepClick) {
      onStepClick(step, index);
    }
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className={cn('flex items-center', sizeConfig.container, className)}>
      {WORKFLOW_STEPS.map((step, index) => {
        const status = getStepStatus(index);
        const stepHistory = getStepHistory(step.state);
        const isCompleted = status === 'completed';
        const isCurrent = status === 'current';
        const isPending = status === 'pending';

        const stepClasses = cn(
          'flex items-center rounded-lg border transition-all duration-200',
          sizeConfig.step,
          sizeConfig.spacing,
          colors[step.state],
          isCompleted && 'opacity-75',
          isCurrent && 'ring-2 ring-offset-2 ring-blue-500 shadow-md',
          isPending && 'opacity-50',
          clickable && 'cursor-pointer hover:shadow-sm',
          !clickable && 'cursor-default'
        );

        const Icon = step.icon;

        return (
          <React.Fragment key={step.state}>
            <div
              className={stepClasses}
              onClick={() => handleStepClick(step, index)}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={`${step.label} step`}
            >
              <div className="flex items-center gap-2">
                {showStepNumbers && (
                  <div className={cn(
                    'flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium',
                    isCompleted && 'bg-green-500 text-white',
                    isCurrent && 'bg-blue-500 text-white',
                    isPending && 'bg-gray-300 text-gray-600'
                  )}>
                    {isCompleted ? <CheckCircle className="w-3 h-3" /> : index + 1}
                  </div>
                )}
                
                <Icon className={cn(sizeConfig.icon, step.color)} />
                
                <div className="flex flex-col">
                  <span className={cn('font-medium', step.textColor)}>
                    {step.label}
                  </span>
                  
                  {showDetails && (
                    <div className="text-xs opacity-75">
                      {step.description}
                    </div>
                  )}
                  
                  {showEstimatedTime && step.estimatedTime && (
                    <div className="text-xs opacity-60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {step.estimatedTime}
                    </div>
                  )}
                  
                  {showUserInfo && stepHistory && (
                    <div className="text-xs opacity-60 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {stepHistory.userName}
                    </div>
                  )}
                  
                  {showTimestamps && stepHistory && (
                    <div className="text-xs opacity-60 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(stepHistory.timestamp).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Connector line */}
            {index < WORKFLOW_STEPS.length - 1 && (
              <div className={cn(
                'flex-1 bg-gray-300 rounded-full',
                sizeConfig.connector,
                isCompleted && 'bg-green-400',
                isCurrent && 'bg-blue-400'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * Compact WorkflowProgressIndicator for smaller spaces
 */
export interface CompactWorkflowProgressIndicatorProps {
  currentState: WorkflowState;
  workflowHistory?: WorkflowProgressIndicatorProps['workflowHistory'];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CompactWorkflowProgressIndicator: React.FC<CompactWorkflowProgressIndicatorProps> = ({
  currentState,
  workflowHistory = [],
  size = 'sm',
  className,
}) => {
  const currentStepIndex = WORKFLOW_STEPS.findIndex(step => step.state === currentState);
  const totalSteps = WORKFLOW_STEPS.length;
  const progressPercentage = ((currentStepIndex + 1) / totalSteps) * 100;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">
          {WORKFLOW_STEPS[currentStepIndex]?.label || 'Unknown'}
        </span>
        <span className="text-xs text-gray-500">
          {currentStepIndex + 1} of {totalSteps}
        </span>
      </div>
      
      <div 
        className="w-full bg-gray-200 rounded-full h-2"
        role="progressbar"
        aria-valuenow={currentStepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Workflow progress: ${currentStepIndex + 1} of ${totalSteps} steps completed`}
      >
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      {workflowHistory.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Last updated: {new Date(workflowHistory[workflowHistory.length - 1].timestamp).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

/**
 * Vertical WorkflowProgressIndicator for sidebar or narrow spaces
 */
export interface VerticalWorkflowProgressIndicatorProps {
  currentState: WorkflowState;
  workflowHistory?: WorkflowProgressIndicatorProps['workflowHistory'];
  assignedReviewer?: WorkflowProgressIndicatorProps['assignedReviewer'];
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VerticalWorkflowProgressIndicator: React.FC<VerticalWorkflowProgressIndicatorProps> = ({
  currentState,
  workflowHistory = [],
  assignedReviewer,
  showDetails = true,
  size = 'md',
  className,
}) => {
  const sizeConfig = SIZE_CONFIG[size];
  const colors = COLOR_SCHEMES.default;

  const getCurrentStepIndex = (): number => {
    return WORKFLOW_STEPS.findIndex(step => step.state === currentState);
  };

  /**
   * Get step history entry
   */
  const getStepHistory = (state: WorkflowState) => {
    return workflowHistory?.find(entry => entry.toState === state);
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className={cn('flex flex-col', sizeConfig.container, className)}>
      {WORKFLOW_STEPS.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isPending = index > currentStepIndex;
        const stepHistory = getStepHistory(step.state);

        const Icon = step.icon;

        return (
          <div key={step.state} className="flex items-start">
            <div className="flex flex-col items-center">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full border-2',
                sizeConfig.icon,
                isCompleted && 'bg-green-500 border-green-500 text-white',
                isCurrent && 'bg-blue-500 border-blue-500 text-white',
                isPending && 'bg-gray-100 border-gray-300 text-gray-400'
              )}>
                {isCompleted ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              
              {index < WORKFLOW_STEPS.length - 1 && (
                <div className={cn(
                  'w-0.5 h-8 mt-2',
                  isCompleted ? 'bg-green-400' : 'bg-gray-300'
                )} />
              )}
            </div>
            
            <div className="ml-4 flex-1 pb-4">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'font-medium',
                  isCompleted && 'text-green-700',
                  isCurrent && 'text-blue-700',
                  isPending && 'text-gray-500'
                )}>
                  {step.label}
                </span>
                
                {isCurrent && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                )}
              </div>
              
              {showDetails && (
                <div className="text-sm text-gray-600 mt-1">
                  {step.description}
                </div>
              )}
              
              {stepHistory && (
                <div className="text-xs text-gray-500 mt-1">
                  by {stepHistory.userName} on {new Date(stepHistory.timestamp).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default WorkflowProgressIndicator;
