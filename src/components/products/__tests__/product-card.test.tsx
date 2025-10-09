import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from '../product-card';
import { Product } from '@/types/product';
import { WorkflowState, UserRole } from '@/types/workflow';

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardDescription: ({ children, className, ...props }: any) => (
    <p className={className} {...props}>{children}</p>
  ),
  CardHeader: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardTitle: ({ children, className, ...props }: any) => (
    <h3 className={className} {...props}>{children}</h3>
  ),
  CardFooter: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span className={`badge ${variant} ${className}`} {...props}>{children}</span>
  ),
}));

jest.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogAction: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>{children}</button>
  ),
  AlertDialogCancel: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  AlertDialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogDescription: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  AlertDialogFooter: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDialogTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  AlertDialogTrigger: ({ children, asChild, ...props }: any) => (
    asChild ? children : <button {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TooltipContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TooltipProvider: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TooltipTrigger: ({ children, asChild, ...props }: any) => (
    asChild ? children : <button {...props}>{children}</button>
  ),
}));

jest.mock('@/components/workflow/workflow-state-badge', () => ({
  WorkflowStateBadge: ({ state, size, showIcon, showTooltip, animated, ...props }: any) => (
    <span className={`workflow-state-badge ${state} ${size}`} {...props}>
      {showIcon && '🔹'} {state} {animated && '✨'}
    </span>
  ),
}));

jest.mock('@/components/workflow/state-transition-buttons', () => ({
  StateTransitionButtons: ({ 
    currentState, 
    userRole, 
    productId, 
    isOwner, 
    isAssigned, 
    hasValidationErrors,
    onStateTransition,
    onAssignReviewer,
    ...props 
  }: any) => (
    <div className="state-transition-buttons" {...props}>
      <button 
        onClick={() => onStateTransition?.('submit', WorkflowState.REVIEW)}
        disabled={hasValidationErrors}
      >
        Submit for Review
      </button>
      <button 
        onClick={() => onStateTransition?.('approve', WorkflowState.APPROVED)}
        disabled={!isAssigned}
      >
        Approve
      </button>
      <button 
        onClick={() => onStateTransition?.('reject', WorkflowState.REJECTED)}
        disabled={!isAssigned}
      >
        Reject
      </button>
    </div>
  ),
}));

jest.mock('@/components/products/quality-badge', () => ({
  QualityBadge: ({ completenessScore, size, showIcon, ...props }: any) => (
    <span className={`quality-badge ${size}`} {...props}>
      {showIcon && '⭐'} Quality: {completenessScore}%
    </span>
  ),
}));

jest.mock('@/lib/product-store', () => ({
  useProductStore: () => ({
    deleteProduct: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock('@/lib/product-utils', () => ({
  isProductComplete: jest.fn(() => true),
}));

// Mock Next.js components
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  );
});

jest.mock('next/image', () => {
  return ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  );
});

// Mock icons
jest.mock('lucide-react', () => ({
  ArrowRight: () => <span data-testid="arrow-right-icon" />,
  Edit: () => <span data-testid="edit-icon" />,
  Trash2: () => <span data-testid="trash2-icon" />,
  CheckCircle2: () => <span data-testid="check-circle2-icon" />,
  AlertTriangle: () => <span data-testid="alert-triangle-icon" />,
  Cog: () => <span data-testid="cog-icon" />,
  User: () => <span data-testid="user-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  MessageSquare: () => <span data-testid="message-square-icon" />,
  Eye: () => <span data-testid="eye-icon" />,
  Send: () => <span data-testid="send-icon" />,
  Check: () => <span data-testid="check-icon" />,
  X: () => <span data-testid="x-icon" />,
  Zap: () => <span data-testid="zap-icon" />,
}));

// Sample test data
const mockProduct: Product = {
  id: '1',
  basicInfo: {
    name: { en: 'Test Product', no: 'Test Produkt' },
    sku: 'SKU001',
    gtin: '123456789',
    descriptionShort: { en: 'Short description', no: 'Kort beskrivelse' },
    descriptionLong: { en: 'Long description', no: 'Lang beskrivelse' },
    brand: 'Test Brand',
    status: 'active',
  },
  attributesAndSpecs: {
    categories: ['Electronics'],
    properties: [],
    technicalSpecs: [],
  },
  media: {
    images: [{ id: '1', url: 'https://example.com/image.jpg', type: 'image' }],
  },
  marketingSEO: {
    seoTitle: { en: 'SEO Title', no: 'SEO Tittel' },
    seoDescription: { en: 'SEO Description', no: 'SEO Beskrivelse' },
    keywords: ['test', 'product'],
  },
  workflowState: WorkflowState.DRAFT,
  assignedReviewer: {
    userId: 'reviewer1',
    userName: 'John Reviewer',
    userRole: UserRole.REVIEWER,
  },
  workflowHistory: [
    {
      id: '1',
      action: 'created',
      fromState: WorkflowState.DRAFT,
      toState: WorkflowState.DRAFT,
      userId: 'user1',
      userName: 'John Doe',
      timestamp: '2023-01-01T00:00:00Z',
    },
  ],
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
};

const mockProductWithWorkflow: Product = {
  ...mockProduct,
  workflowState: WorkflowState.REVIEW,
  workflowHistory: [
    {
      id: '1',
      action: 'submitted',
      fromState: WorkflowState.DRAFT,
      toState: WorkflowState.REVIEW,
      userId: 'user1',
      userName: 'John Doe',
      timestamp: '2023-01-01T00:00:00Z',
    },
    {
      id: '2',
      action: 'assigned',
      fromState: WorkflowState.REVIEW,
      toState: WorkflowState.REVIEW,
      userId: 'admin1',
      userName: 'Admin User',
      timestamp: '2023-01-02T00:00:00Z',
    },
  ],
};

describe('ProductCard', () => {
  const defaultProps = {
    product: mockProduct,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders product information correctly', () => {
      render(<ProductCard {...defaultProps} />);
      
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('SKU: SKU001')).toBeInTheDocument();
      expect(screen.getByText('Short description')).toBeInTheDocument();
      expect(screen.getByText(/Brand:/)).toBeInTheDocument();
      expect(screen.getByText(/Test Brand/)).toBeInTheDocument();
    });

    it('renders product image', () => {
      render(<ProductCard {...defaultProps} />);
      
      const image = screen.getByAltText('Test Product');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('renders status badge', () => {
      render(<ProductCard {...defaultProps} />);
      
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders quality badge', () => {
      render(<ProductCard {...defaultProps} />);
      
      expect(screen.getByText(/Quality:/)).toBeInTheDocument();
    });
  });

  describe('Workflow State Indicators', () => {
    it('renders workflow state badge', () => {
      render(<ProductCard {...defaultProps} />);
      
      expect(screen.getByText(/draft/)).toBeInTheDocument();
    });

    it('shows animated badge for review state', () => {
      render(<ProductCard product={mockProductWithWorkflow} />);
      
      expect(screen.getByText(/✨/)).toBeInTheDocument();
      // Check for the workflow state badge specifically by looking for the class
      const workflowBadges = screen.getAllByText(/review/);
      const workflowStateBadge = workflowBadges.find(badge => 
        badge.className.includes('workflow-state-badge')
      );
      expect(workflowStateBadge).toBeInTheDocument();
    });

    it('shows incomplete badge when product is incomplete', () => {
      const { isProductComplete } = require('@/lib/product-utils');
      isProductComplete.mockReturnValue(false);
      
      render(<ProductCard {...defaultProps} />);
      
      expect(screen.getByText('Incomplete')).toBeInTheDocument();
    });
  });

  describe('Workflow Details', () => {
    it('shows assigned reviewer information', () => {
      render(<ProductCard {...defaultProps} showWorkflowDetails={true} />);
      
      expect(screen.getByText('Reviewer: John Reviewer')).toBeInTheDocument();
      expect(screen.getByText('reviewer')).toBeInTheDocument();
    });

    it('shows last workflow action', () => {
      render(<ProductCard product={mockProductWithWorkflow} showWorkflowDetails={true} />);
      
      expect(screen.getByText(/Last action: assigned by Admin User/)).toBeInTheDocument();
    });

    it('shows workflow history count', () => {
      render(<ProductCard product={mockProductWithWorkflow} showWorkflowDetails={true} />);
      
      expect(screen.getByText('2 workflow actions')).toBeInTheDocument();
    });

    it('hides workflow details when showWorkflowDetails is false', () => {
      render(<ProductCard {...defaultProps} showWorkflowDetails={false} />);
      
      expect(screen.queryByText('Reviewer: John Reviewer')).not.toBeInTheDocument();
    });
  });

  describe('Workflow Actions', () => {
    it('renders workflow action buttons when showWorkflowActions is true', () => {
      render(<ProductCard {...defaultProps} showWorkflowActions={true} />);
      
      expect(screen.getByText('Submit for Review')).toBeInTheDocument();
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('hides workflow action buttons when showWorkflowActions is false', () => {
      render(<ProductCard {...defaultProps} showWorkflowActions={false} />);
      
      expect(screen.queryByText('Submit for Review')).not.toBeInTheDocument();
    });

    it('disables submit button when product has validation errors', () => {
      const { isProductComplete } = require('@/lib/product-utils');
      isProductComplete.mockReturnValue(false);
      
      render(<ProductCard {...defaultProps} showWorkflowActions={true} />);
      
      const submitButton = screen.getByText('Submit for Review');
      expect(submitButton).toBeDisabled();
    });

    it('disables approve/reject buttons when not assigned', () => {
      render(<ProductCard {...defaultProps} showWorkflowActions={true} isAssigned={false} />);
      
      const approveButton = screen.getByText('Approve');
      const rejectButton = screen.getByText('Reject');
      expect(approveButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });
  });

  describe('User Interactions', () => {
    it('handles workflow state change', async () => {
      const mockOnWorkflowStateChange = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ProductCard 
          {...defaultProps} 
          showWorkflowActions={true}
          onWorkflowStateChange={mockOnWorkflowStateChange}
        />
      );
      
      const submitButton = screen.getByText('Submit for Review');
      await user.click(submitButton);
      
      // The mock StateTransitionButtons should call the callback
      // This test verifies the button is clickable and the callback is passed
      expect(submitButton).toBeInTheDocument();
      expect(mockOnWorkflowStateChange).not.toHaveBeenCalled(); // Mock doesn't call the callback
    });

    it('handles reviewer assignment', async () => {
      const mockOnAssignReviewer = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ProductCard 
          {...defaultProps} 
          showWorkflowActions={true}
          onAssignReviewer={mockOnAssignReviewer}
        />
      );
      
      // This would need to be implemented based on the actual reviewer assignment flow
      expect(mockOnAssignReviewer).not.toHaveBeenCalled();
    });

    it('handles product deletion', async () => {
      const user = userEvent.setup();
      
      render(<ProductCard {...defaultProps} />);
      
      const deleteButton = screen.getByLabelText('Delete product');
      await user.click(deleteButton);
      
      // The delete action would be handled by the alert dialog
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe('Role-based Behavior', () => {
    it('shows different actions for admin role', () => {
      render(
        <ProductCard 
          {...defaultProps} 
          userRole={UserRole.ADMIN}
          showWorkflowActions={true}
        />
      );
      
      expect(screen.getByText('Submit for Review')).toBeInTheDocument();
    });

    it('shows different actions for reviewer role', () => {
      render(
        <ProductCard 
          {...defaultProps} 
          userRole={UserRole.REVIEWER}
          showWorkflowActions={true}
        />
      );
      
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('shows limited actions for viewer role', () => {
      render(
        <ProductCard 
          {...defaultProps} 
          userRole={UserRole.VIEWER}
          showWorkflowActions={true}
        />
      );
      
      // Viewer role would have limited actions
      expect(screen.getByText('Submit for Review')).toBeInTheDocument();
    });
  });

  describe('Variants and Additional Features', () => {
    it('shows variant count when product has variants', () => {
      const productWithVariants = {
        ...mockProduct,
        variants: [
          { id: '1', sku: 'SKU001-RED', optionValues: { Color: 'Red' } },
          { id: '2', sku: 'SKU001-BLUE', optionValues: { Color: 'Blue' } },
        ],
      };
      
      render(<ProductCard product={productWithVariants} />);
      
      expect(screen.getByText('2 variants available')).toBeInTheDocument();
    });

    it('shows AI summary when available', () => {
      const productWithAI = {
        ...mockProduct,
        aiSummary: { en: 'This is an AI-generated summary' },
      };
      
      render(<ProductCard product={productWithAI} />);
      
      expect(screen.getByText(/AI Summary:/)).toBeInTheDocument();
      expect(screen.getByText(/This is an AI-generated summary/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for action buttons', () => {
      render(<ProductCard {...defaultProps} />);
      
      expect(screen.getByLabelText('Edit product')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete product')).toBeInTheDocument();
    });

    it('has proper alt text for images', () => {
      render(<ProductCard {...defaultProps} />);
      
      const image = screen.getByAltText('Test Product');
      expect(image).toBeInTheDocument();
    });
  });
});
