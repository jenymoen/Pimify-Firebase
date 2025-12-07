'use client';

import React from 'react';
import { WorkflowState } from '@/types/workflow';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Props for the WorkflowStateBadge component
 */
export interface WorkflowStateBadgeProps {
  /** The current workflow state */
  state: WorkflowState;
  /** Optional size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Optional variant style */
  variant?: 'default' | 'outline' | 'secondary' | 'destructive';
  /** Optional custom className */
  className?: string;
  /** Whether to show an icon */
  showIcon?: boolean;
  /** Whether to show a tooltip */
  showTooltip?: boolean;
  /** Custom tooltip text */
  tooltipText?: string;
  /** Whether the badge is interactive (clickable) */
  interactive?: boolean;
  /** Click handler for interactive badges */
  onClick?: (state: WorkflowState) => void;
  /** Whether the badge should be animated */
  animated?: boolean;
  /** Custom color scheme */
  colorScheme?: 'default' | 'minimal' | 'vibrant' | 'monochrome';
}

/**
 * Configuration for workflow state styling
 */
import { FileText, Eye, CheckCircle, Rocket, XCircle } from 'lucide-react';

/**
 * Configuration for workflow state styling
 */
const WORKFLOW_STATE_CONFIG = {
  [WorkflowState.DRAFT]: {
    label: 'Draft',
    description: 'Product is being created or edited',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: FileText,
    iconColor: 'text-gray-600',
    pulseColor: 'bg-gray-400',
    priority: 1,
  },
  [WorkflowState.REVIEW]: {
    label: 'Review',
    description: 'Product is under review',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Eye,
    iconColor: 'text-yellow-600',
    pulseColor: 'bg-yellow-400',
    priority: 2,
  },
  [WorkflowState.APPROVED]: {
    label: 'Approved',
    description: 'Product has been approved',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    pulseColor: 'bg-green-400',
    priority: 3,
  },
  [WorkflowState.PUBLISHED]: {
    label: 'Published',
    description: 'Product is live and published',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Rocket,
    iconColor: 'text-blue-600',
    pulseColor: 'bg-blue-400',
    priority: 4,
  },
  [WorkflowState.REJECTED]: {
    label: 'Rejected',
    description: 'Product has been rejected',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    iconColor: 'text-red-600',
    pulseColor: 'bg-red-400',
    priority: 0,
  },
} as const;

/**
 * Alternative color schemes
 */
const COLOR_SCHEMES = {
  default: {
    [WorkflowState.DRAFT]: 'bg-gray-100 text-gray-800 border-gray-200',
    [WorkflowState.REVIEW]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [WorkflowState.APPROVED]: 'bg-green-100 text-green-800 border-green-200',
    [WorkflowState.PUBLISHED]: 'bg-blue-100 text-blue-800 border-blue-200',
    [WorkflowState.REJECTED]: 'bg-red-100 text-red-800 border-red-200',
  },
  minimal: {
    [WorkflowState.DRAFT]: 'bg-slate-50 text-slate-700 border-slate-200',
    [WorkflowState.REVIEW]: 'bg-amber-50 text-amber-700 border-amber-200',
    [WorkflowState.APPROVED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    [WorkflowState.PUBLISHED]: 'bg-sky-50 text-sky-700 border-sky-200',
    [WorkflowState.REJECTED]: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  vibrant: {
    [WorkflowState.DRAFT]: 'bg-purple-100 text-purple-800 border-purple-300',
    [WorkflowState.REVIEW]: 'bg-orange-100 text-orange-800 border-orange-300',
    [WorkflowState.APPROVED]: 'bg-lime-100 text-lime-800 border-lime-300',
    [WorkflowState.PUBLISHED]: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    [WorkflowState.REJECTED]: 'bg-pink-100 text-pink-800 border-pink-300',
  },
  monochrome: {
    [WorkflowState.DRAFT]: 'bg-gray-100 text-gray-800 border-gray-300',
    [WorkflowState.REVIEW]: 'bg-gray-200 text-gray-800 border-gray-400',
    [WorkflowState.APPROVED]: 'bg-gray-300 text-gray-800 border-gray-500',
    [WorkflowState.PUBLISHED]: 'bg-gray-400 text-white border-gray-600',
    [WorkflowState.REJECTED]: 'bg-gray-500 text-white border-gray-700',
  },
} as const;

/**
 * Size configurations
 */
const SIZE_CONFIG = {
  sm: {
    badge: 'px-2 py-1 text-xs',
    icon: 'w-3 h-3',
    spacing: 'gap-1',
  },
  md: {
    badge: 'px-3 py-1.5 text-sm',
    icon: 'w-4 h-4',
    spacing: 'gap-1.5',
  },
  lg: {
    badge: 'px-4 py-2 text-base',
    icon: 'w-5 h-5',
    spacing: 'gap-2',
  },
} as const;

/**
 * WorkflowStateBadge component for displaying workflow states with color-coded indicators
 */
export const WorkflowStateBadge: React.FC<WorkflowStateBadgeProps> = ({
  state,
  size = 'md',
  variant = 'default',
  className,
  showIcon = true,
  showTooltip = true,
  tooltipText,
  interactive = false,
  onClick,
  animated = false,
  colorScheme = 'default',
}) => {
  const config = WORKFLOW_STATE_CONFIG[state] || WORKFLOW_STATE_CONFIG[WorkflowState.DRAFT];
  const sizeConfig = SIZE_CONFIG[size];
  const colors = COLOR_SCHEMES[colorScheme];

  const badgeClasses = cn(
    // Base badge styles
    'inline-flex items-center font-medium rounded-full border transition-all duration-200',
    // Size styles
    sizeConfig.badge,
    sizeConfig.spacing,
    // Color styles
    colors[state],
    // Interactive styles
    interactive && 'cursor-pointer hover:shadow-md hover:scale-105',
    // Animation styles
    animated && 'animate-pulse',
    // Custom className
    className
  );

  const iconClasses = cn(
    'flex-shrink-0',
    sizeConfig.icon,
    config.iconColor
  );

  const pulseClasses = cn(
    'absolute inset-0 rounded-full animate-ping opacity-75',
    config.pulseColor
  );

  const handleClick = () => {
    if (interactive && onClick) {
      onClick(state);
    }
  };

  const badgeContent = (
    <div className="relative">
      {animated && (
        <div className={pulseClasses} />
      )}
      <div className="relative flex items-center">
        {showIcon && (
          <config.icon className={iconClasses} aria-label={config.label} />
        )}
        <span className="font-medium">{config.label}</span>
      </div>
    </div>
  );

  if (showTooltip) {
    return (
      <div className="group relative">
        <Badge
          variant={variant}
          className={badgeClasses}
          onClick={handleClick}
        >
          {badgeContent}
        </Badge>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
          {tooltipText || config.description}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    );
  }

  return (
    <Badge
      variant={variant}
      className={badgeClasses}
      onClick={handleClick}
    >
      {badgeContent}
    </Badge>
  );
};

/**
 * WorkflowStateBadgeGroup component for displaying multiple states
 */
export interface WorkflowStateBadgeGroupProps {
  /** Array of states to display */
  states: WorkflowState[];
  /** Maximum number of badges to show before collapsing */
  maxVisible?: number;
  /** Size for all badges */
  size?: WorkflowStateBadgeProps['size'];
  /** Color scheme for all badges */
  colorScheme?: WorkflowStateBadgeProps['colorScheme'];
  /** Whether badges are interactive */
  interactive?: boolean;
  /** Click handler for badges */
  onClick?: (state: WorkflowState) => void;
  /** Custom className */
  className?: string;
}

export const WorkflowStateBadgeGroup: React.FC<WorkflowStateBadgeGroupProps> = ({
  states,
  maxVisible = 3,
  size = 'sm',
  colorScheme = 'default',
  interactive = false,
  onClick,
  className,
}) => {
  const visibleStates = states.slice(0, maxVisible);
  const hiddenCount = states.length - maxVisible;

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {visibleStates.map((state, index) => (
        <WorkflowStateBadge
          key={`${state}-${index}`}
          state={state}
          size={size}
          colorScheme={colorScheme}
          interactive={interactive}
          onClick={onClick}
          showTooltip={true}
        />
      ))}
      {hiddenCount > 0 && (
        <Badge
          variant="outline"
          className={cn(
            SIZE_CONFIG[size].badge,
            'text-gray-500 border-gray-300'
          )}
        >
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
};

/**
 * WorkflowStateProgress component for showing workflow progress
 */
export interface WorkflowStateProgressProps {
  /** Current state */
  currentState: WorkflowState;
  /** Whether to show all states or only up to current */
  showAll?: boolean;
  /** Size of the progress indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Color scheme */
  colorScheme?: WorkflowStateBadgeProps['colorScheme'];
  /** Custom className */
  className?: string;
}

export const WorkflowStateProgress: React.FC<WorkflowStateProgressProps> = ({
  currentState,
  showAll = false,
  size = 'md',
  colorScheme = 'default',
  className,
}) => {
  const workflowOrder = [
    WorkflowState.DRAFT,
    WorkflowState.REVIEW,
    WorkflowState.APPROVED,
    WorkflowState.PUBLISHED,
  ];

  const currentIndex = workflowOrder.indexOf(currentState);
  const statesToShow = showAll ? workflowOrder : workflowOrder.slice(0, currentIndex + 1);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {statesToShow.map((state, index) => {
        const isActive = state === currentState;
        const isCompleted = index < currentIndex;
        const isPending = index > currentIndex;

        return (
          <React.Fragment key={state}>
            <WorkflowStateBadge
              state={state}
              size={size}
              colorScheme={colorScheme}
              className={cn(
                isCompleted && 'opacity-60',
                isPending && 'opacity-40',
                isActive && 'ring-2 ring-offset-2 ring-blue-500'
              )}
              animated={isActive}
            />
            {index < statesToShow.length - 1 && (
              <div className={cn(
                'w-4 h-0.5',
                isCompleted ? 'bg-green-400' : 'bg-gray-300'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default WorkflowStateBadge;
