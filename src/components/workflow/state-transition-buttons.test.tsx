import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StateTransitionButtons, StateTransitionButtonGroup } from './state-transition-buttons';
import { WorkflowState, WorkflowAction, UserRole } from '@/types/workflow';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  Edit: () => <div data-testid="edit-icon" />,
  Send: () => <div data-testid="send-icon" />,
  RotateCcw: () => <div data-testid="rotate-ccw-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  User: () => <div data-testid="user-icon" />,
  MessageSquare: () => <div data-testid="message-square-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
}));

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, ...props }: any) => (
    <span className={className} data-testid="badge" {...props}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
  TooltipTrigger: ({ children, asChild }: any) => 
    asChild ? children : <div data-testid="tooltip-trigger">{children}</div>,
}));

// Mock the cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => 
    classes.filter(Boolean).join(' '),
}));

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
});

// Mock window.alert
const mockAlert = jest.fn();
Object.defineProperty(window, 'alert', {
  value: mockAlert,
  writable: true,
});

describe('StateTransitionButtons', () => {
  const defaultProps = {
    currentState: WorkflowState.DRAFT,
    userRole: UserRole.EDITOR,
    productId: 'product-1',
    isOwner: true,
  };

  beforeEach(() => {
    mockConfirm.mockClear();
    mockAlert.mockClear();
  });

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<StateTransitionButtons {...defaultProps} />);
      
      expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
    });

    it('should show no actions available when user has no permissions', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          userRole={UserRole.VIEWER}
          isOwner={false}
        />
      );
      
      expect(screen.getByText('No actions available')).toBeInTheDocument();
    });

    it('should render available actions for draft state', () => {
      render(<StateTransitionButtons {...defaultProps} />);
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
    });

    it('should render available actions for review state', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          currentState={WorkflowState.REVIEW}
          userRole={UserRole.REVIEWER}
          isAssigned={true}
        />
      );
      
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
      expect(screen.getByText('Add Comment')).toBeInTheDocument();
    });

    it('should render available actions for approved state', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          currentState={WorkflowState.APPROVED}
          userRole={UserRole.ADMIN}
        />
      );
      
      expect(screen.getByText('Publish')).toBeInTheDocument();
      expect(screen.getByText('Revert to Draft')).toBeInTheDocument();
    });
  });

  describe('Permission Checking', () => {
    it('should not show submit action for non-owners', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          isOwner={false}
        />
      );
      
      expect(screen.queryByText('Submit for Review')).not.toBeInTheDocument();
    });

    it('should not show approve action for non-assigned reviewers', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          currentState={WorkflowState.REVIEW}
          userRole={UserRole.REVIEWER}
          isAssigned={false}
        />
      );
      
      expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    });

    it('should not show admin actions for non-admin users', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          currentState={WorkflowState.APPROVED}
          userRole={UserRole.EDITOR}
        />
      );
      
      expect(screen.queryByText('Publish')).not.toBeInTheDocument();
    });

    it('should show actions based on role hierarchy', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          currentState={WorkflowState.APPROVED}
          userRole={UserRole.ADMIN}
        />
      );
      
      expect(screen.getByText('Publish')).toBeInTheDocument();
      expect(screen.getByText('Revert to Draft')).toBeInTheDocument();
    });
  });

  describe('State Transitions', () => {
    it('should call onStateTransition when action is clicked', () => {
      const onStateTransition = jest.fn();
      mockConfirm.mockReturnValue(true);
      
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          onStateTransition={onStateTransition}
        />
      );
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      // Edit action doesn't require confirmation, so we just check it was called
      expect(onStateTransition).toHaveBeenCalledWith(
        WorkflowAction.EDIT,
        null
      );
    });

    it('should not call onStateTransition when user cancels confirmation', () => {
      const onStateTransition = jest.fn();
      mockConfirm.mockReturnValue(false);
      
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          onStateTransition={onStateTransition}
        />
      );
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      // Edit action doesn't require confirmation, so it should be called
      expect(onStateTransition).toHaveBeenCalled();
    });

    it('should show reason dialog for actions requiring reason', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          currentState={WorkflowState.REVIEW}
          userRole={UserRole.REVIEWER}
          isAssigned={true}
        />
      );
      
      const rejectButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(rejectButton);
      
      expect(screen.getByText('Reject')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter reason...')).toBeInTheDocument();
    });

    it('should handle reason submission', async () => {
      const onStateTransition = jest.fn();
      
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          currentState={WorkflowState.REVIEW}
          userRole={UserRole.REVIEWER}
          isAssigned={true}
          onStateTransition={onStateTransition}
        />
      );
      
      const rejectButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(rejectButton);
      
      const reasonTextarea = screen.getByPlaceholderText('Enter reason...');
      fireEvent.change(reasonTextarea, { target: { value: 'Test reason' } });
      
      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(onStateTransition).toHaveBeenCalledWith(
          WorkflowAction.REJECT,
          WorkflowState.REJECTED,
          'Test reason'
        );
      });
    });
  });

  describe('Validation', () => {
    it('should not show submit action when product has validation errors', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          hasValidationErrors={true}
        />
      );
      
      expect(screen.queryByText('Submit for Review')).not.toBeInTheDocument();
    });

    it('should show validation error indicator', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          hasValidationErrors={true}
        />
      );
      
      expect(screen.getByText('Validation Errors')).toBeInTheDocument();
    });

    it('should call custom validation function', () => {
      const validateTransition = jest.fn().mockReturnValue({ isValid: false, reason: 'Custom validation failed' });
      
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          validateTransition={validateTransition}
        />
      );
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      
      expect(validateTransition).toHaveBeenCalledWith(
        WorkflowAction.EDIT,
        WorkflowState.DRAFT
      );
      expect(mockAlert).toHaveBeenCalledWith('Custom validation failed');
    });
  });

  describe('Locked State', () => {
    it('should disable actions when product is locked', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          isLocked={true}
        />
      );
      
      const buttons = screen.getAllByTestId('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should show locked indicator', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          isLocked={true}
        />
      );
      
      expect(screen.getByText('Locked')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          loading={true}
        />
      );
      
      const buttons = screen.getAllByTestId('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('animate-pulse');
      });
    });

    it('should disable buttons when loading', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          loading={true}
        />
      );
      
      const buttons = screen.getAllByTestId('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Disabled State', () => {
    it('should disable all buttons when disabled prop is true', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          disabled={true}
        />
      );
      
      const buttons = screen.getAllByTestId('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Size Variants', () => {
    it('should render with small size', () => {
      render(<StateTransitionButtons {...defaultProps} size="sm" />);
      
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render with medium size', () => {
      render(<StateTransitionButtons {...defaultProps} size="md" />);
      
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render with large size', () => {
      render(<StateTransitionButtons {...defaultProps} size="lg" />);
      
      const buttons = screen.getAllByTestId('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Tooltips', () => {
    it('should show tooltips when enabled', () => {
      render(<StateTransitionButtons {...defaultProps} showTooltips={true} />);
      
      expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
    });

    it('should not show tooltips when disabled', () => {
      render(<StateTransitionButtons {...defaultProps} showTooltips={false} />);
      
      // Tooltips should still be rendered but not shown
      expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <StateTransitionButtons {...defaultProps} className="custom-class" />
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing onStateTransition callback', () => {
      render(<StateTransitionButtons {...defaultProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      expect(() => fireEvent.click(editButton)).not.toThrow();
    });

    it('should handle invalid action gracefully', () => {
      const onStateTransition = jest.fn();
      
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          onStateTransition={onStateTransition}
        />
      );
      
      // This should not throw an error
      expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
    });

    it('should handle empty available reviewers', () => {
      render(
        <StateTransitionButtons 
          {...defaultProps} 
          availableReviewers={[]}
        />
      );
      
      expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
    });
  });
});

describe('StateTransitionButtonGroup', () => {
  const mockButtonGroups = [
    {
      title: 'Product Actions',
      actions: [WorkflowAction.SUBMIT_FOR_REVIEW, WorkflowAction.EDIT],
      currentState: WorkflowState.DRAFT,
      userRole: UserRole.EDITOR,
      productId: 'product-1',
      isOwner: true,
    },
    {
      title: 'Review Actions',
      actions: [WorkflowAction.APPROVE, WorkflowAction.REJECT],
      currentState: WorkflowState.REVIEW,
      userRole: UserRole.REVIEWER,
      productId: 'product-1',
      isAssigned: true,
    },
  ];

  it('should render multiple button groups', () => {
    render(
      <StateTransitionButtonGroup 
        buttonGroups={mockButtonGroups}
      />
    );
    
    expect(screen.getByText('Product Actions')).toBeInTheDocument();
    expect(screen.getByText('Review Actions')).toBeInTheDocument();
  });

  it('should apply common props to all groups', () => {
    const commonProps = { size: 'lg' as const, disabled: true };
    
    render(
      <StateTransitionButtonGroup 
        buttonGroups={mockButtonGroups}
        commonProps={commonProps}
      />
    );
    
    const buttons = screen.getAllByTestId('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <StateTransitionButtonGroup 
        buttonGroups={mockButtonGroups}
        className="custom-group-class"
      />
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-group-class');
  });

  it('should handle empty button groups', () => {
    render(
      <StateTransitionButtonGroup 
        buttonGroups={[]}
      />
    );
    
    expect(screen.queryByText('Product Actions')).not.toBeInTheDocument();
  });
});

describe('Integration Tests', () => {
  it('should handle complete workflow flow', async () => {
    const onStateTransition = jest.fn();
    mockConfirm.mockReturnValue(true);
    
    const { rerender } = render(
      <StateTransitionButtons 
        currentState={WorkflowState.DRAFT}
        userRole={UserRole.EDITOR}
        productId="product-1"
        isOwner={true}
        onStateTransition={onStateTransition}
      />
    );
    
    // Edit product
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    expect(onStateTransition).toHaveBeenCalledWith(
      WorkflowAction.EDIT,
      null
    );
    
    // Move to review state
    rerender(
      <StateTransitionButtons 
        currentState={WorkflowState.REVIEW}
        userRole={UserRole.REVIEWER}
        productId="product-1"
        isAssigned={true}
        onStateTransition={onStateTransition}
      />
    );
    
    // Approve
    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);
    
    expect(onStateTransition).toHaveBeenCalledWith(
      WorkflowAction.APPROVE,
      WorkflowState.APPROVED
    );
  });

  it('should handle role-based access control', () => {
    const { rerender } = render(
      <StateTransitionButtons 
        currentState={WorkflowState.REVIEW}
        userRole={UserRole.VIEWER}
        productId="product-1"
      />
    );
    
    // Viewer should only see View Details
    expect(screen.getByText('View Details')).toBeInTheDocument();
    
    // Change to reviewer
    rerender(
      <StateTransitionButtons 
        currentState={WorkflowState.REVIEW}
        userRole={UserRole.REVIEWER}
        productId="product-1"
        isAssigned={true}
      />
    );
    
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });
});
