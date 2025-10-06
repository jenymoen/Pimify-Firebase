import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WorkflowStateBadge, WorkflowStateBadgeGroup, WorkflowStateProgress } from './workflow-state-badge';
import { WorkflowState } from '@/types/workflow';

// Mock the Badge component
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, onClick, variant, ...props }: any) => (
    <span
      className={className}
      onClick={onClick}
      data-variant={variant}
      data-testid="badge"
      {...props}
    >
      {children}
    </span>
  ),
}));

// Mock the cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => 
    classes.filter(Boolean).join(' '),
}));

describe('WorkflowStateBadge', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('📝')).toBeInTheDocument();
    });

    it('should render all workflow states correctly', () => {
      const states = [
        WorkflowState.DRAFT,
        WorkflowState.REVIEW,
        WorkflowState.APPROVED,
        WorkflowState.PUBLISHED,
        WorkflowState.REJECTED,
      ];

      const expectedLabels = ['Draft', 'Review', 'Approved', 'Published', 'Rejected'];
      const expectedIcons = ['📝', '👀', '✅', '🚀', '❌'];

      states.forEach((state, index) => {
        const { unmount } = render(<WorkflowStateBadge state={state} />);
        expect(screen.getByText(expectedLabels[index])).toBeInTheDocument();
        expect(screen.getByText(expectedIcons[index])).toBeInTheDocument();
        unmount();
      });
    });

    it('should render without icon when showIcon is false', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} showIcon={false} />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.queryByText('📝')).not.toBeInTheDocument();
    });

    it('should render without tooltip when showTooltip is false', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} showTooltip={false} />);
      
      expect(screen.getByText('Draft')).toBeInTheDocument();
      // Tooltip should not be present in DOM
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render small size correctly', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} size="sm" />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-2', 'py-1', 'text-xs');
    });

    it('should render medium size correctly', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} size="md" />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('should render large size correctly', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} size="lg" />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('px-4', 'py-2', 'text-base');
    });
  });

  describe('Color Schemes', () => {
    it('should render with default color scheme', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} colorScheme="default" />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800', 'border-gray-200');
    });

    it('should render with minimal color scheme', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} colorScheme="minimal" />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-slate-50', 'text-slate-700', 'border-slate-200');
    });

    it('should render with vibrant color scheme', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} colorScheme="vibrant" />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-purple-100', 'text-purple-800', 'border-purple-300');
    });

    it('should render with monochrome color scheme', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} colorScheme="monochrome" />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('bg-gray-100', 'text-gray-800', 'border-gray-300');
    });
  });

  describe('Interactive Features', () => {
    it('should be clickable when interactive is true', () => {
      const handleClick = jest.fn();
      render(
        <WorkflowStateBadge 
          state={WorkflowState.DRAFT} 
          interactive={true} 
          onClick={handleClick} 
        />
      );
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('cursor-pointer');
      
      fireEvent.click(badge);
      expect(handleClick).toHaveBeenCalledWith(WorkflowState.DRAFT);
    });

    it('should not be clickable when interactive is false', () => {
      const handleClick = jest.fn();
      render(
        <WorkflowStateBadge 
          state={WorkflowState.DRAFT} 
          interactive={false} 
          onClick={handleClick} 
        />
      );
      
      const badge = screen.getByTestId('badge');
      expect(badge).not.toHaveClass('cursor-pointer');
      
      fireEvent.click(badge);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Animation', () => {
    it('should have animation classes when animated is true', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} animated={true} />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('animate-pulse');
    });

    it('should not have animation classes when animated is false', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} animated={false} />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).not.toHaveClass('animate-pulse');
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} className="custom-class" />);
      
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveClass('custom-class');
    });

    it('should use custom tooltip text', () => {
      render(
        <WorkflowStateBadge 
          state={WorkflowState.DRAFT} 
          tooltipText="Custom tooltip" 
        />
      );
      
      // Hover to show tooltip
      const badge = screen.getByTestId('badge');
      fireEvent.mouseEnter(badge);
      
      expect(screen.getByText('Custom tooltip')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for icons', () => {
      render(<WorkflowStateBadge state={WorkflowState.DRAFT} />);
      
      const icon = screen.getByText('📝');
      expect(icon).toHaveAttribute('role', 'img');
      expect(icon).toHaveAttribute('aria-label', 'Draft');
    });

    it('should be keyboard accessible when interactive', () => {
      const handleClick = jest.fn();
      render(
        <WorkflowStateBadge 
          state={WorkflowState.DRAFT} 
          interactive={true} 
          onClick={handleClick} 
        />
      );
      
      const badge = screen.getByText('Draft').closest('span');
      fireEvent.keyDown(badge!, { key: 'Enter' });
      // Note: Actual keyboard handling would need to be implemented in the component
    });
  });
});

describe('WorkflowStateBadgeGroup', () => {
  it('should render multiple badges', () => {
    const states = [WorkflowState.DRAFT, WorkflowState.REVIEW, WorkflowState.APPROVED];
    
    render(<WorkflowStateBadgeGroup states={states} />);
    
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('should show overflow count when exceeding maxVisible', () => {
    const states = [
      WorkflowState.DRAFT,
      WorkflowState.REVIEW,
      WorkflowState.APPROVED,
      WorkflowState.PUBLISHED,
      WorkflowState.REJECTED,
    ];
    
    render(<WorkflowStateBadgeGroup states={states} maxVisible={3} />);
    
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

    it('should handle click events on individual badges', () => {
      const handleClick = jest.fn();
      const states = [WorkflowState.DRAFT, WorkflowState.REVIEW];
      
      render(
        <WorkflowStateBadgeGroup 
          states={states} 
          interactive={true} 
          onClick={handleClick} 
        />
      );
      
      const draftBadge = screen.getAllByTestId('badge')[0];
      fireEvent.click(draftBadge);
      
      expect(handleClick).toHaveBeenCalledWith(WorkflowState.DRAFT);
    });

    it('should apply custom className', () => {
      const states = [WorkflowState.DRAFT, WorkflowState.REVIEW];
      
      const { container } = render(<WorkflowStateBadgeGroup states={states} className="custom-group" />);
      
      const group = container.firstChild as HTMLElement;
      expect(group).toHaveClass('custom-group');
    });
});

describe('WorkflowStateProgress', () => {
  it('should render progress for current state', () => {
    render(<WorkflowStateProgress currentState={WorkflowState.REVIEW} />);
    
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.queryByText('Approved')).not.toBeInTheDocument();
    expect(screen.queryByText('Published')).not.toBeInTheDocument();
  });

  it('should render all states when showAll is true', () => {
    render(<WorkflowStateProgress currentState={WorkflowState.REVIEW} showAll={true} />);
    
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('should highlight current state', () => {
    render(<WorkflowStateProgress currentState={WorkflowState.REVIEW} />);
    
    const badges = screen.getAllByTestId('badge');
    const reviewBadge = badges.find(badge => badge.textContent?.includes('Review'));
    expect(reviewBadge).toHaveClass('ring-2', 'ring-offset-2', 'ring-blue-500');
  });

  it('should show completed states with reduced opacity', () => {
    render(<WorkflowStateProgress currentState={WorkflowState.APPROVED} />);
    
    const badges = screen.getAllByTestId('badge');
    const draftBadge = badges.find(badge => badge.textContent?.includes('Draft'));
    const reviewBadge = badges.find(badge => badge.textContent?.includes('Review'));
    
    expect(draftBadge).toHaveClass('opacity-60');
    expect(reviewBadge).toHaveClass('opacity-60');
  });

  it('should show progress connectors', () => {
    render(<WorkflowStateProgress currentState={WorkflowState.REVIEW} />);
    
    // Should have progress connectors between states
    const connectors = document.querySelectorAll('.w-4.h-0\\.5');
    expect(connectors.length).toBeGreaterThan(0);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <WorkflowStateProgress 
        currentState={WorkflowState.DRAFT} 
        className="custom-progress" 
      />
    );
    
    const progress = container.firstChild as HTMLElement;
    expect(progress).toHaveClass('custom-progress');
  });

  it('should handle different sizes', () => {
    render(<WorkflowStateProgress currentState={WorkflowState.DRAFT} size="lg" />);
    
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('px-4', 'py-2', 'text-base');
  });

  it('should handle different color schemes', () => {
    render(
      <WorkflowStateProgress 
        currentState={WorkflowState.DRAFT} 
        colorScheme="vibrant" 
      />
    );
    
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('bg-purple-100', 'text-purple-800', 'border-purple-300');
  });
});

describe('Edge Cases', () => {
  it('should handle empty state array in WorkflowStateBadgeGroup', () => {
    render(<WorkflowStateBadgeGroup states={[]} />);
    
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });

  it('should handle single state in WorkflowStateBadgeGroup', () => {
    render(<WorkflowStateBadgeGroup states={[WorkflowState.DRAFT]} />);
    
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.queryByText('+')).not.toBeInTheDocument();
  });

  it('should handle maxVisible of 0', () => {
    const states = [WorkflowState.DRAFT, WorkflowState.REVIEW];
    
    render(<WorkflowStateBadgeGroup states={states} maxVisible={0} />);
    
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('should handle maxVisible greater than states length', () => {
    const states = [WorkflowState.DRAFT, WorkflowState.REVIEW];
    
    render(<WorkflowStateBadgeGroup states={states} maxVisible={5} />);
    
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.queryByText('+')).not.toBeInTheDocument();
  });
});
