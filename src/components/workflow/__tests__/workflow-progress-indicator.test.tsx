import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  WorkflowProgressIndicator, 
  CompactWorkflowProgressIndicator, 
  VerticalWorkflowProgressIndicator 
} from '../workflow-progress-indicator';
import { WorkflowState, UserRole } from '@/types/workflow';

// Mock the UI components
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  CheckCircle: () => <span data-testid="check-circle-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
  XCircle: () => <span data-testid="x-circle-icon" />,
  Zap: () => <span data-testid="zap-icon" />,
  FileText: () => <span data-testid="file-text-icon" />,
  Eye: () => <span data-testid="eye-icon" />,
  User: () => <span data-testid="user-icon" />,
  Calendar: () => <span data-testid="calendar-icon" />,
  MessageSquare: () => <span data-testid="message-square-icon" />,
}));

// Sample test data
const mockWorkflowHistory = [
  {
    id: '1',
    action: 'created',
    fromState: WorkflowState.DRAFT,
    toState: WorkflowState.DRAFT,
    userId: 'user1',
    userName: 'John Doe',
    timestamp: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    action: 'submitted',
    fromState: WorkflowState.DRAFT,
    toState: WorkflowState.REVIEW,
    userId: 'user1',
    userName: 'John Doe',
    timestamp: '2023-01-02T00:00:00Z',
  },
  {
    id: '3',
    action: 'approved',
    fromState: WorkflowState.REVIEW,
    toState: WorkflowState.APPROVED,
    userId: 'reviewer1',
    userName: 'Jane Reviewer',
    timestamp: '2023-01-03T00:00:00Z',
  },
];

const mockAssignedReviewer = {
  userId: 'reviewer1',
  userName: 'Jane Reviewer',
  userRole: UserRole.REVIEWER,
};

describe('WorkflowProgressIndicator', () => {
  const defaultProps = {
    currentState: WorkflowState.DRAFT,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders all workflow steps', () => {
      render(<WorkflowProgressIndicator {...defaultProps} />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
      expect(screen.getByText('Published')).toBeInTheDocument();
    });

    it('renders step descriptions when showDetails is true', () => {
      render(<WorkflowProgressIndicator {...defaultProps} showDetails={true} />);
      
      expect(screen.getByText('Product is being created or edited')).toBeInTheDocument();
      expect(screen.getByText('Product is under review by assigned reviewer')).toBeInTheDocument();
    });

    it('hides step descriptions when showDetails is false', () => {
      render(<WorkflowProgressIndicator {...defaultProps} showDetails={false} />);
      
      expect(screen.queryByText('Product is being created or edited')).not.toBeInTheDocument();
    });

    it('renders step numbers when showStepNumbers is true', () => {
      render(<WorkflowProgressIndicator {...defaultProps} showStepNumbers={true} />);
      
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('hides step numbers when showStepNumbers is false', () => {
      render(<WorkflowProgressIndicator {...defaultProps} showStepNumbers={false} />);
      
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  describe('Current State Highlighting', () => {
    it('renders current step for draft state', () => {
      render(<WorkflowProgressIndicator currentState={WorkflowState.DRAFT} />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('renders current step for review state', () => {
      render(<WorkflowProgressIndicator currentState={WorkflowState.REVIEW} />);
      
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('renders current step for approved state', () => {
      render(<WorkflowProgressIndicator currentState={WorkflowState.APPROVED} />);
      
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('renders current step for published state', () => {
      render(<WorkflowProgressIndicator currentState={WorkflowState.PUBLISHED} />);
      
      expect(screen.getByText('Published')).toBeInTheDocument();
    });
  });

  describe('Workflow History Integration', () => {
    it('shows user information when showUserInfo is true', () => {
      render(
        <WorkflowProgressIndicator 
          {...defaultProps} 
          currentState={WorkflowState.APPROVED}
          workflowHistory={mockWorkflowHistory}
          showUserInfo={true}
        />
      );
      
      expect(screen.getByText('Jane Reviewer')).toBeInTheDocument();
    });

    it('shows timestamps when showTimestamps is true', () => {
      render(
        <WorkflowProgressIndicator 
          {...defaultProps} 
          currentState={WorkflowState.APPROVED}
          workflowHistory={mockWorkflowHistory}
          showTimestamps={true}
        />
      );
      
      expect(screen.getByText('3.1.2023')).toBeInTheDocument();
    });

    it('hides user information when showUserInfo is false', () => {
      render(
        <WorkflowProgressIndicator 
          {...defaultProps} 
          currentState={WorkflowState.APPROVED}
          workflowHistory={mockWorkflowHistory}
          showUserInfo={false}
        />
      );
      
      expect(screen.queryByText('Jane Reviewer')).not.toBeInTheDocument();
    });

    it('hides timestamps when showTimestamps is false', () => {
      render(
        <WorkflowProgressIndicator 
          {...defaultProps} 
          currentState={WorkflowState.APPROVED}
          workflowHistory={mockWorkflowHistory}
          showTimestamps={false}
        />
      );
      
      expect(screen.queryByText('3.1.2023')).not.toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('renders small size correctly', () => {
      render(<WorkflowProgressIndicator {...defaultProps} size="sm" />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('renders medium size correctly', () => {
      render(<WorkflowProgressIndicator {...defaultProps} size="md" />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('renders large size correctly', () => {
      render(<WorkflowProgressIndicator {...defaultProps} size="lg" />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  describe('Color Schemes', () => {
    it('renders default color scheme', () => {
      render(<WorkflowProgressIndicator {...defaultProps} colorScheme="default" />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('renders minimal color scheme', () => {
      render(<WorkflowProgressIndicator {...defaultProps} colorScheme="minimal" />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('renders vibrant color scheme', () => {
      render(<WorkflowProgressIndicator {...defaultProps} colorScheme="vibrant" />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('renders monochrome color scheme', () => {
      render(<WorkflowProgressIndicator {...defaultProps} colorScheme="monochrome" />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('handles step clicks when clickable is true', async () => {
      const mockOnStepClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <WorkflowProgressIndicator 
          {...defaultProps} 
          clickable={true}
          onStepClick={mockOnStepClick}
        />
      );
      
      const draftStep = screen.getByText('Draft').closest('div');
      await user.click(draftStep!);
      
      expect(mockOnStepClick).toHaveBeenCalled();
    });

    it('does not handle step clicks when clickable is false', async () => {
      const mockOnStepClick = jest.fn();
      const user = userEvent.setup();
      
      render(
        <WorkflowProgressIndicator 
          {...defaultProps} 
          clickable={false}
          onStepClick={mockOnStepClick}
        />
      );
      
      const draftStep = screen.getByText('Draft').closest('div');
      await user.click(draftStep!);
      
      expect(mockOnStepClick).not.toHaveBeenCalled();
    });

    it('has proper ARIA attributes when clickable', () => {
      render(
        <WorkflowProgressIndicator 
          {...defaultProps} 
          clickable={true}
        />
      );
      
      const draftStep = screen.getByLabelText('Draft step');
      expect(draftStep).toBeInTheDocument();
      expect(draftStep).toHaveAttribute('role', 'button');
    });
  });

  describe('Estimated Time Display', () => {
    it('shows estimated time when showEstimatedTime is true', () => {
      render(
        <WorkflowProgressIndicator 
          {...defaultProps} 
          showEstimatedTime={true}
        />
      );
      
      expect(screen.getByText('1-2 days')).toBeInTheDocument();
      expect(screen.getByText('2-3 days')).toBeInTheDocument();
    });

    it('hides estimated time when showEstimatedTime is false', () => {
      render(
        <WorkflowProgressIndicator 
          {...defaultProps} 
          showEstimatedTime={false}
        />
      );
      
      expect(screen.queryByText('1-2 days')).not.toBeInTheDocument();
    });
  });
});

describe('CompactWorkflowProgressIndicator', () => {
  const defaultProps = {
    currentState: WorkflowState.DRAFT,
  };

  it('renders progress bar', () => {
    render(<CompactWorkflowProgressIndicator {...defaultProps} />);
    
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('1 of 4')).toBeInTheDocument();
  });

  it('shows correct progress percentage for draft state', () => {
    render(<CompactWorkflowProgressIndicator currentState={WorkflowState.DRAFT} />);
    
    const progressBar = screen.getByRole('progressbar');
    const progressFill = progressBar.querySelector('div');
    expect(progressFill).toHaveStyle('width: 25%');
  });

  it('shows correct progress percentage for review state', () => {
    render(<CompactWorkflowProgressIndicator currentState={WorkflowState.REVIEW} />);
    
    const progressBar = screen.getByRole('progressbar');
    const progressFill = progressBar.querySelector('div');
    expect(progressFill).toHaveStyle('width: 50%');
  });

  it('shows correct progress percentage for approved state', () => {
    render(<CompactWorkflowProgressIndicator currentState={WorkflowState.APPROVED} />);
    
    const progressBar = screen.getByRole('progressbar');
    const progressFill = progressBar.querySelector('div');
    expect(progressFill).toHaveStyle('width: 75%');
  });

  it('shows correct progress percentage for published state', () => {
    render(<CompactWorkflowProgressIndicator currentState={WorkflowState.PUBLISHED} />);
    
    const progressBar = screen.getByRole('progressbar');
    const progressFill = progressBar.querySelector('div');
    expect(progressFill).toHaveStyle('width: 100%');
  });

  it('shows last updated timestamp when workflow history is provided', () => {
    render(
      <CompactWorkflowProgressIndicator 
        {...defaultProps} 
        workflowHistory={mockWorkflowHistory}
      />
    );
    
    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });
});

describe('VerticalWorkflowProgressIndicator', () => {
  const defaultProps = {
    currentState: WorkflowState.DRAFT,
  };

  it('renders vertical layout', () => {
    render(<VerticalWorkflowProgressIndicator {...defaultProps} />);
    
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('shows step descriptions when showDetails is true', () => {
    render(<VerticalWorkflowProgressIndicator {...defaultProps} showDetails={true} />);
    
    expect(screen.getByText('Product is being created or edited')).toBeInTheDocument();
  });

  it('hides step descriptions when showDetails is false', () => {
    render(<VerticalWorkflowProgressIndicator {...defaultProps} showDetails={false} />);
    
    expect(screen.queryByText('Product is being created or edited')).not.toBeInTheDocument();
  });

  it('shows user information for completed steps', () => {
    render(
      <VerticalWorkflowProgressIndicator 
        currentState={WorkflowState.APPROVED}
        workflowHistory={mockWorkflowHistory}
      />
    );
    
    expect(screen.getByText('by Jane Reviewer on 3.1.2023')).toBeInTheDocument();
  });

  it('shows current step indicator', () => {
    render(<VerticalWorkflowProgressIndicator currentState={WorkflowState.REVIEW} />);
    
    expect(screen.getByText('Review')).toBeInTheDocument();
  });
});
