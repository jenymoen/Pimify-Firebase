import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  ReviewerAssignment, 
  CompactReviewerAssignment,
  UserInfo,
  AssignmentInfo,
  AssignmentStats
} from '../reviewer-assignment';
import { UserRole, WorkflowState } from '@/types/workflow';

// Mock the UI components
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock shadcn/ui components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AvatarFallback: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AvatarImage: ({ src, ...props }: any) => <img src={src} {...props} />,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, ...props }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)} {...props}>
      {children}
    </select>
  ),
  SelectContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectItem: ({ children, value, ...props }: any) => <option value={value} {...props}>{children}</option>,
  SelectTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  SelectValue: ({ placeholder, ...props }: any) => <span {...props}>{placeholder}</span>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange, ...props }: any) => (
    <div {...props} data-open={open} data-on-open-change={onOpenChange}>
      {children}
    </div>
  ),
  DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogTitle: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  DialogTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: (props: any) => <hr {...props} />,
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TooltipContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TooltipProvider: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TooltipTrigger: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  User: () => <span data-testid="user-icon" />,
  UserPlus: () => <span data-testid="user-plus-icon" />,
  UserMinus: () => <span data-testid="user-minus-icon" />,
  Users: () => <span data-testid="users-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  CheckCircle: () => <span data-testid="check-circle-icon" />,
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
  Search: () => <span data-testid="search-icon" />,
  Filter: () => <span data-testid="filter-icon" />,
  MoreHorizontal: () => <span data-testid="more-horizontal-icon" />,
  Calendar: () => <span data-testid="calendar-icon" />,
  Mail: () => <span data-testid="mail-icon" />,
  Phone: () => <span data-testid="phone-icon" />,
  MapPin: () => <span data-testid="map-pin-icon" />,
  Star: () => <span data-testid="star-icon" />,
  Award: () => <span data-testid="award-icon" />,
  Target: () => <span data-testid="target-icon" />,
  Loader2: () => <span data-testid="loader2-icon" />,
  RefreshCw: () => <span data-testid="refresh-cw-icon" />,
  Eye: () => <span data-testid="eye-icon" />,
  Edit: () => <span data-testid="edit-icon" />,
  Trash2: () => <span data-testid="trash2-icon" />,
  Plus: () => <span data-testid="plus-icon" />,
  X: () => <span data-testid="x-icon" />,
}));

// Sample test data
const mockReviewers: UserInfo[] = [
  {
    id: 'reviewer1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.REVIEWER,
    avatar: 'https://example.com/avatar1.jpg',
    department: 'Engineering',
    location: 'New York',
    phone: '+1-555-0123',
    isActive: true,
    lastActive: '2023-01-01T10:00:00Z',
    reviewCount: 25,
    averageReviewTime: 4.5,
    rating: 4.2,
    specialties: ['Frontend', 'React'],
    workload: { current: 3, max: 5 },
    timezone: 'America/New_York',
    languages: ['English', 'Spanish'],
  },
  {
    id: 'reviewer2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: UserRole.REVIEWER,
    avatar: 'https://example.com/avatar2.jpg',
    department: 'Design',
    location: 'San Francisco',
    phone: '+1-555-0124',
    isActive: true,
    lastActive: '2023-01-01T09:00:00Z',
    reviewCount: 18,
    averageReviewTime: 3.2,
    rating: 4.8,
    specialties: ['UI/UX', 'Design Systems'],
    workload: { current: 2, max: 4 },
    timezone: 'America/Los_Angeles',
    languages: ['English'],
  },
  {
    id: 'reviewer3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    role: UserRole.ADMIN,
    avatar: 'https://example.com/avatar3.jpg',
    department: 'Management',
    location: 'Chicago',
    phone: '+1-555-0125',
    isActive: false,
    lastActive: '2023-01-01T08:00:00Z',
    reviewCount: 45,
    averageReviewTime: 2.1,
    rating: 4.5,
    specialties: ['Backend', 'Architecture'],
    workload: { current: 5, max: 5 },
    timezone: 'America/Chicago',
    languages: ['English', 'French'],
  },
];

const mockAssignments: AssignmentInfo[] = [
  {
    id: 'assignment1',
    productId: 'product1',
    productName: 'Test Product',
    productState: WorkflowState.REVIEW,
    reviewerId: 'reviewer1',
    reviewerName: 'John Doe',
    assignedBy: 'admin1',
    assignedAt: '2023-01-01T10:00:00Z',
    dueDate: '2023-01-05T18:00:00Z',
    priority: 'high',
    status: 'pending',
    notes: 'Please review the new features',
    estimatedHours: 4,
    actualHours: 0,
    tags: ['urgent', 'new-feature'],
  },
  {
    id: 'assignment2',
    productId: 'product2',
    productName: 'Another Product',
    productState: WorkflowState.REVIEW,
    reviewerId: 'reviewer2',
    reviewerName: 'Jane Smith',
    assignedBy: 'admin1',
    assignedAt: '2023-01-01T11:00:00Z',
    dueDate: '2023-01-03T18:00:00Z',
    priority: 'medium',
    status: 'in_progress',
    notes: 'Design review needed',
    estimatedHours: 2,
    actualHours: 1,
    tags: ['design'],
  },
];

const mockStats: AssignmentStats = {
  totalAssignments: 2,
  pendingAssignments: 1,
  completedAssignments: 0,
  overdueAssignments: 0,
  averageCompletionTime: 3.5,
  reviewerUtilization: 75,
};

describe('ReviewerAssignment', () => {
  const defaultProps = {
    userRole: UserRole.ADMIN,
    productId: 'product1',
    productName: 'Test Product',
    productState: WorkflowState.REVIEW,
    reviewers: mockReviewers,
    assignments: mockAssignments,
    stats: mockStats,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders reviewer assignment form', () => {
      render(<ReviewerAssignment {...defaultProps} />);
      
      expect(screen.getByText('Reviewer Assignment')).toBeInTheDocument();
      expect(screen.getByText('Assign reviewers for Test Product')).toBeInTheDocument();
    });

    it('renders statistics when provided', () => {
      render(<ReviewerAssignment {...defaultProps} />);
      
      expect(screen.getByText('Total Assignments')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    it('renders reviewers list', () => {
      render(<ReviewerAssignment {...defaultProps} />);
      
      expect(screen.getByText('Available Reviewers')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('renders current assignments', () => {
      render(<ReviewerAssignment {...defaultProps} showHistory={true} />);
      
      expect(screen.getByText('Current Assignments')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  describe('Reviewer Selection', () => {
    it('shows reviewer details', () => {
      render(<ReviewerAssignment {...defaultProps} showReviewerDetails={true} />);
      
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('Design')).toBeInTheDocument();
    });

    it('shows workload information when enabled', () => {
      render(<ReviewerAssignment {...defaultProps} showWorkload={true} />);
      
      expect(screen.getByText('3/5 assignments')).toBeInTheDocument();
      expect(screen.getByText('2/4 assignments')).toBeInTheDocument();
    });

    it('shows reviewer ratings', () => {
      render(<ReviewerAssignment {...defaultProps} />);
      
      expect(screen.getByText('4.2/5.0')).toBeInTheDocument();
      expect(screen.getByText('4.8/5.0')).toBeInTheDocument();
    });

    it('filters reviewers by search query', async () => {
      const user = userEvent.setup();
      render(<ReviewerAssignment {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search reviewers...');
      await user.type(searchInput, 'John');
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('filters reviewers by role', async () => {
      const user = userEvent.setup();
      render(<ReviewerAssignment {...defaultProps} />);
      
      const roleSelect = screen.getByDisplayValue('All Roles');
      await user.selectOptions(roleSelect, UserRole.REVIEWER);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });
  });

  describe('Assignment Dialog', () => {
    it('opens assignment dialog when assign button is clicked', async () => {
      const user = userEvent.setup();
      render(<ReviewerAssignment {...defaultProps} />);
      
      const assignButtons = screen.getAllByText('Assign Reviewer');
      const assignButton = assignButtons[0]; // First button is the trigger
      await user.click(assignButton);
      
      expect(screen.getByText('Select a reviewer')).toBeInTheDocument();
    });

    it('shows reviewer selection in dialog', async () => {
      const user = userEvent.setup();
      render(<ReviewerAssignment {...defaultProps} />);
      
      const assignButtons = screen.getAllByText('Assign Reviewer');
      const assignButton = assignButtons[0]; // First button is the trigger
      await user.click(assignButton);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('allows setting assignment priority', async () => {
      const user = userEvent.setup();
      render(<ReviewerAssignment {...defaultProps} />);
      
      const assignButtons = screen.getAllByText('Assign Reviewer');
      const assignButton = assignButtons[0]; // First button is the trigger
      await user.click(assignButton);
      
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('allows setting estimated hours', async () => {
      const user = userEvent.setup();
      render(<ReviewerAssignment {...defaultProps} />);
      
      const assignButtons = screen.getAllByText('Assign Reviewer');
      const assignButton = assignButtons[0]; // First button is the trigger
      await user.click(assignButton);
      
      expect(screen.getByText('Estimated Hours')).toBeInTheDocument();
      expect(screen.getByText('1 hours')).toBeInTheDocument();
      expect(screen.getByText('2 hours')).toBeInTheDocument();
      expect(screen.getByText('4 hours')).toBeInTheDocument();
    });

    it('allows setting due date', async () => {
      const user = userEvent.setup();
      render(<ReviewerAssignment {...defaultProps} />);
      
      const assignButtons = screen.getAllByText('Assign Reviewer');
      const assignButton = assignButtons[0]; // First button is the trigger
      await user.click(assignButton);
      
      expect(screen.getByText('Due Date')).toBeInTheDocument();
      expect(screen.getByDisplayValue('')).toBeInTheDocument();
    });

    it('allows adding assignment notes', async () => {
      const user = userEvent.setup();
      render(<ReviewerAssignment {...defaultProps} />);
      
      const assignButtons = screen.getAllByText('Assign Reviewer');
      const assignButton = assignButtons[0]; // First button is the trigger
      await user.click(assignButton);
      
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Add assignment notes...')).toBeInTheDocument();
    });
  });

  describe('Assignment Management', () => {
    it('calls onAssign when assignment is created', async () => {
      const mockOnAssign = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ReviewerAssignment 
          {...defaultProps} 
          onAssign={mockOnAssign}
        />
      );
      
      const assignButtons = screen.getAllByText('Assign Reviewer');
      const assignButton = assignButtons[0]; // First button is the trigger
      await user.click(assignButton);
      
      // Select reviewer
      const reviewerSelects = screen.getAllByRole('combobox');
      const reviewerSelect = reviewerSelects[0]; // First combobox is the reviewer select
      await user.selectOptions(reviewerSelect, 'reviewer1');
      
      // Click assign
      const confirmButtons = screen.getAllByText('Assign Reviewer');
      const confirmButton = confirmButtons[1]; // Second button is the confirm button
      await user.click(confirmButton);
      
      expect(mockOnAssign).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'product1',
          reviewerId: 'reviewer1',
          reviewerName: 'John Doe',
          priority: 'medium',
          status: 'pending',
        })
      );
    });

    it('calls onRemove when assignment is removed', async () => {
      const mockOnRemove = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ReviewerAssignment 
          {...defaultProps} 
          onRemove={mockOnRemove}
        />
      );
      
      const removeButtons = screen.getAllByTestId('trash2-icon');
      await user.click(removeButtons[0]);
      
      expect(mockOnRemove).toHaveBeenCalledWith('assignment1');
    });

    it('calls onRefresh when refresh button is clicked', async () => {
      const mockOnRefresh = jest.fn();
      const user = userEvent.setup();
      
      render(
        <ReviewerAssignment 
          {...defaultProps} 
          onRefresh={mockOnRefresh}
        />
      );
      
      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);
      
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe('Assignment Filtering', () => {
    it('filters assignments by status', async () => {
      const user = userEvent.setup();
      render(<ReviewerAssignment {...defaultProps} showHistory={true} />);
      
      const statusSelects = screen.getAllByRole('combobox');
      const statusSelect = statusSelects[statusSelects.length - 1]; // Last combobox is the status select
      await user.selectOptions(statusSelect, 'pending');
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  describe('Read-only Mode', () => {
    it('hides assign button in read-only mode', () => {
      render(<ReviewerAssignment {...defaultProps} readOnly={true} />);
      
      expect(screen.queryByText('Assign Reviewer')).not.toBeInTheDocument();
    });

    it('hides remove buttons in read-only mode', () => {
      render(<ReviewerAssignment {...defaultProps} readOnly={true} showHistory={true} />);
      
      expect(screen.queryByTestId('trash2-icon')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state', () => {
      render(<ReviewerAssignment {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Loading assignments...')).toBeInTheDocument();
    });

    it('disables controls during loading', () => {
      render(<ReviewerAssignment {...defaultProps} loading={true} onRefresh={jest.fn()} />);
      
      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no assignments', () => {
      render(<ReviewerAssignment {...defaultProps} assignments={[]} />);
      
      expect(screen.getByText('No Assignments')).toBeInTheDocument();
      expect(screen.getByText('No reviewers have been assigned to this product yet.')).toBeInTheDocument();
    });

    it('shows assign button in empty state for admins', () => {
      render(<ReviewerAssignment {...defaultProps} assignments={[]} />);
      
      expect(screen.getByText('Assign First Reviewer')).toBeInTheDocument();
    });
  });

  describe('Role-based Access', () => {
    it('hides assign functionality for non-admin users', () => {
      render(
        <ReviewerAssignment 
          {...defaultProps} 
          userRole={UserRole.VIEWER}
        />
      );
      
      expect(screen.queryByText('Assign Reviewer')).not.toBeInTheDocument();
    });

    it('shows assign functionality for admin users', () => {
      render(
        <ReviewerAssignment 
          {...defaultProps} 
          userRole={UserRole.ADMIN}
        />
      );
      
      const assignButtons = screen.getAllByText('Assign Reviewer');
      expect(assignButtons.length).toBeGreaterThan(0);
    });
  });
});

describe('CompactReviewerAssignment', () => {
  const compactDefaultProps = {
    userRole: UserRole.ADMIN,
    productId: 'product1',
    reviewers: mockReviewers,
    assignments: mockAssignments,
  };

  it('renders compact reviewer assignment', () => {
    render(<CompactReviewerAssignment {...compactDefaultProps} />);
    
    expect(screen.getByText('Reviewers')).toBeInTheDocument();
  });

  it('shows reviewer selection', () => {
    render(<CompactReviewerAssignment {...compactDefaultProps} />);
    
    expect(screen.getByText('Select reviewer')).toBeInTheDocument();
    const johnDoeElements = screen.getAllByText('John Doe');
    expect(johnDoeElements.length).toBeGreaterThan(0);
    const janeSmithElements = screen.getAllByText('Jane Smith');
    expect(janeSmithElements.length).toBeGreaterThan(0);
  });

  it('shows current assignments', () => {
    render(<CompactReviewerAssignment {...compactDefaultProps} />);
    
    const johnDoeElements = screen.getAllByText('John Doe');
    expect(johnDoeElements.length).toBeGreaterThan(0);
    const janeSmithElements = screen.getAllByText('Jane Smith');
    expect(janeSmithElements.length).toBeGreaterThan(0);
  });

  it('calls onAssign when assignment is created', async () => {
    const mockOnAssign = jest.fn();
    const user = userEvent.setup();
    
    render(
      <CompactReviewerAssignment 
        {...compactDefaultProps} 
        onAssign={mockOnAssign}
      />
    );
    
    const reviewerSelect = screen.getByRole('combobox');
    await user.selectOptions(reviewerSelect, 'reviewer1');
    
    const assignButton = screen.getByTestId('user-plus-icon');
    await user.click(assignButton);
    
    expect(mockOnAssign).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product1',
        reviewerId: 'reviewer1',
        reviewerName: 'John Doe',
      })
    );
  });

  it('calls onRemove when assignment is removed', async () => {
    const mockOnRemove = jest.fn();
    const user = userEvent.setup();
    
    render(
      <CompactReviewerAssignment 
        {...compactDefaultProps} 
        onRemove={mockOnRemove}
      />
    );
    
    const removeButtons = screen.getAllByTestId('x-icon');
    await user.click(removeButtons[0]);
    
    expect(mockOnRemove).toHaveBeenCalledWith('assignment1');
  });

  it('hides assign functionality for non-admin users', () => {
    render(
      <CompactReviewerAssignment 
        {...compactDefaultProps} 
        userRole={UserRole.VIEWER}
      />
    );
    
    expect(screen.queryByText('Select reviewer')).not.toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  const accessibilityDefaultProps = {
    userRole: UserRole.ADMIN,
    productId: 'product1',
    reviewers: mockReviewers,
    assignments: mockAssignments,
  };

  it('has proper labels for form controls', () => {
    render(<ReviewerAssignment {...accessibilityDefaultProps} />);
    
    expect(screen.getByPlaceholderText('Search reviewers...')).toBeInTheDocument();
    expect(screen.getByText('Filter by role')).toBeInTheDocument();
    expect(screen.getByText('Filter by status')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(<ReviewerAssignment {...accessibilityDefaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search reviewers...');
    expect(searchInput).toHaveAttribute('type', 'text');
  });
});
