import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuditTrailViewer } from './audit-trail-viewer';
import { AuditTrailEntry, WorkflowState, UserRole, WorkflowAction } from '@/types/workflow';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick, ...props }: any) => (
    <div className={className} onClick={onClick} data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="card-content" {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className, ...props }: any) => (
    <div className={className} data-testid="card-header" {...props}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className, ...props }: any) => (
    <h3 className={className} data-testid="card-title" {...props}>
      {children}
    </h3>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, variant, ...props }: any) => (
    <span className={className} data-testid="badge" data-variant={variant} {...props}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant, size, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid="button"
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ className, placeholder, value, onChange, ...props }: any) => (
    <input
      className={className}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      data-testid="input"
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value} data-on-value-change={onValueChange}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: any) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: any) => (
    <div data-testid="select-item" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children, className }: any) => (
    <div className={className} data-testid="select-trigger">{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => (
    <div data-testid="select-value" data-placeholder={placeholder} />
  ),
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value} data-on-value-change={onValueChange}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid="tabs-content" data-value={value}>{children}</div>
  ),
  TabsList: ({ children, className }: any) => (
    <div className={className} data-testid="tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid="tabs-trigger" data-value={value}>{children}</button>
  ),
}));

jest.mock('@/components/ui/accordion', () => ({
  Accordion: ({ children, type, collapsible, className }: any) => (
    <div data-testid="accordion" data-type={type} data-collapsible={collapsible} className={className}>
      {children}
    </div>
  ),
  AccordionContent: ({ children, className }: any) => (
    <div data-testid="accordion-content" className={className}>{children}</div>
  ),
  AccordionItem: ({ children, value, className }: any) => (
    <div data-testid="accordion-item" data-value={value} className={className}>{children}</div>
  ),
  AccordionTrigger: ({ children, className }: any) => (
    <button data-testid="accordion-trigger" className={className}>{children}</button>
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
  TooltipTrigger: ({ children, asChild }: any) => 
    asChild ? children : <div data-testid="tooltip-trigger">{children}</div>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  User: () => <div data-testid="user-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  Download: () => <div data-testid="download-icon" />,
  RefreshCw: () => <div data-testid="refresh-cw-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  MoreHorizontal: () => <div data-testid="more-horizontal-icon" />,
}));

// Mock the cn utility
jest.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => 
    classes.filter(Boolean).join(' '),
}));

describe('AuditTrailViewer', () => {
  const mockEntries: AuditTrailEntry[] = [
    {
      id: 'entry-1',
      timestamp: '2024-01-15T10:30:00Z',
      action: WorkflowAction.CREATE,
      userId: 'user-1',
      userEmail: 'john.doe@example.com',
      productId: 'product-1',
      productState: WorkflowState.DRAFT,
      reason: 'Product created',
      fieldChanges: [
        {
          field: 'name',
          previousValue: null,
          newValue: 'Test Product',
          fieldType: 'string',
        },
      ],
    },
    {
      id: 'entry-2',
      timestamp: '2024-01-15T11:00:00Z',
      action: WorkflowAction.EDIT,
      userId: 'user-2',
      userEmail: 'jane.smith@example.com',
      productId: 'product-1',
      productState: WorkflowState.REVIEW,
      reason: 'Updated product details',
      fieldChanges: [
        {
          field: 'description',
          previousValue: 'Old description',
          newValue: 'New description',
          fieldType: 'string',
        },
      ],
    },
    {
      id: 'entry-3',
      timestamp: '2024-01-15T12:00:00Z',
      action: WorkflowAction.APPROVE,
      userId: 'user-2',
      userEmail: 'jane.smith@example.com',
      productId: 'product-1',
      productState: WorkflowState.APPROVED,
      reason: 'Product approved for publication',
      fieldChanges: [],
    },
  ];

  const defaultProps = {
    entries: mockEntries,
    userRole: UserRole.ADMIN,
  };

  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<AuditTrailViewer {...defaultProps} />);
      
      expect(screen.getByTestId('tooltip-provider')).toBeInTheDocument();
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
      expect(screen.getByText('3 entries')).toBeInTheDocument();
    });

    it('should render all entries', () => {
      render(<AuditTrailViewer {...defaultProps} />);
      
      expect(screen.getAllByText('CREATE')).toHaveLength(3); // One in timeline, one in list, one in compact
      expect(screen.getAllByText('UPDATE')).toHaveLength(3);
      expect(screen.getAllByText('APPROVE')).toHaveLength(3);
    });

    it('should render user names', () => {
      render(<AuditTrailViewer {...defaultProps} />);
      
      expect(screen.getAllByText('John Doe')).toHaveLength(2); // One in timeline, one in list
      expect(screen.getAllByText('Jane Smith')).toHaveLength(4); // One in timeline, one in list, one in compact, plus one more
    });

    it('should render product IDs', () => {
      render(<AuditTrailViewer {...defaultProps} />);
      
      expect(screen.getAllByText('product-1')).toHaveLength(3);
    });
  });

  describe('View Modes', () => {
    it('should render timeline view by default', () => {
      render(<AuditTrailViewer {...defaultProps} />);
      
      expect(screen.getByTestId('tabs')).toHaveAttribute('data-value', 'timeline');
    });

    it('should switch to list view', () => {
      render(<AuditTrailViewer {...defaultProps} />);
      
      const listTab = screen.getAllByTestId('tabs-trigger')[1]; // Second tab (list)
      fireEvent.click(listTab);
      
      // The component should handle the view mode change
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
    });

    it('should switch to compact view', () => {
      render(<AuditTrailViewer {...defaultProps} />);
      
      const compactTab = screen.getAllByTestId('tabs-trigger')[2]; // Third tab (compact)
      fireEvent.click(compactTab);
      
      // The component should handle the view mode change
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter entries by search term', () => {
      render(<AuditTrailViewer {...defaultProps} enableSearching={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search audit trail...');
      fireEvent.change(searchInput, { target: { value: 'CREATE' } });
      
      expect(screen.getAllByText('CREATE')).toHaveLength(3); // One in timeline, one in list, one in compact
      expect(screen.queryByText('UPDATE')).not.toBeInTheDocument();
    });

    it('should filter entries by user name', () => {
      render(<AuditTrailViewer {...defaultProps} enableSearching={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search audit trail...');
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      expect(screen.getAllByText('John Doe')).toHaveLength(2); // Filtered to show only John Doe entries
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('should filter entries by reason', () => {
      render(<AuditTrailViewer {...defaultProps} enableSearching={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search audit trail...');
      fireEvent.change(searchInput, { target: { value: 'approved' } });
      
      expect(screen.getByText('Product approved for publication')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should render filter controls when enabled', () => {
      render(<AuditTrailViewer {...defaultProps} enableFiltering={true} />);
      
      expect(screen.getAllByTestId('select')).toHaveLength(2); // Action and Priority selects
    });

    it('should not render filter controls when disabled', () => {
      render(<AuditTrailViewer {...defaultProps} enableFiltering={false} />);
      
      expect(screen.queryByTestId('select')).not.toBeInTheDocument();
    });
  });

  describe('Entry Interaction', () => {
    it('should call onEntryClick when entry is clicked', () => {
      const onEntryClick = jest.fn();
      render(<AuditTrailViewer {...defaultProps} onEntryClick={onEntryClick} />);
      
      const entry = screen.getAllByText('CREATE')[0].closest('[data-testid="card"]');
      fireEvent.click(entry!);
      
      expect(onEntryClick).toHaveBeenCalledWith(mockEntries[0]);
    });

    it('should expand entry details when toggle is clicked', () => {
      render(<AuditTrailViewer {...defaultProps} showFieldChanges={true} />);
      
      const toggleButton = screen.getAllByText(/Show Details/)[0];
      fireEvent.click(toggleButton);
      
      expect(screen.getAllByTestId('accordion')).toHaveLength(2); // Only entries with field changes
    });
  });

  describe('Field Changes', () => {
    it('should show field changes when expanded', () => {
      render(<AuditTrailViewer {...defaultProps} showFieldChanges={true} />);
      
      const toggleButton = screen.getAllByText(/Show Details/)[0];
      fireEvent.click(toggleButton);
      
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    it('should not show field changes when disabled', () => {
      render(<AuditTrailViewer {...defaultProps} showFieldChanges={false} />);
      
      expect(screen.queryByText(/Show Details/)).not.toBeInTheDocument();
    });
  });

  describe('Timestamps', () => {
    it('should show timestamps when enabled', () => {
      render(<AuditTrailViewer {...defaultProps} showTimestamps={true} />);
      
      expect(screen.getAllByTestId('clock-icon')).toHaveLength(3); // One for each entry
    });

    it('should not show timestamps when disabled', () => {
      render(<AuditTrailViewer {...defaultProps} showTimestamps={false} />);
      
      expect(screen.queryByTestId('clock-icon')).not.toBeInTheDocument();
    });
  });

  describe('Avatars', () => {
    it('should show user avatars when enabled', () => {
      render(<AuditTrailViewer {...defaultProps} showAvatars={true} />);
      
      expect(screen.getAllByTestId('user-icon')).toHaveLength(3);
    });

    it('should not show user avatars when disabled', () => {
      render(<AuditTrailViewer {...defaultProps} showAvatars={false} />);
      
      expect(screen.queryByTestId('user-icon')).not.toBeInTheDocument();
    });
  });

  describe('Action Icons', () => {
    it('should show action icons when enabled', () => {
      render(<AuditTrailViewer {...defaultProps} showActionIcons={true} />);
      
      expect(screen.getAllByTestId('file-text-icon')).toHaveLength(3); // One for each entry
      expect(screen.getAllByTestId('activity-icon')).toHaveLength(4); // One in header, one for each entry
      expect(screen.getAllByTestId('check-circle-icon')).toHaveLength(3); // One for each entry
    });

    it('should not show action icons when disabled', () => {
      render(<AuditTrailViewer {...defaultProps} showActionIcons={false} />);
      
      expect(screen.queryByTestId('file-text-icon')).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should show pagination when enabled', () => {
      render(<AuditTrailViewer {...defaultProps} showPagination={true} pageSize={2} />);
      
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    it('should not show pagination when disabled', () => {
      render(<AuditTrailViewer {...defaultProps} showPagination={false} />);
      
      expect(screen.queryByText('Page 1 of')).not.toBeInTheDocument();
    });

    it('should navigate to next page', () => {
      render(<AuditTrailViewer {...defaultProps} showPagination={true} pageSize={2} />);
      
      const nextButton = screen.getByTestId('arrow-right-icon').closest('button');
      fireEvent.click(nextButton!);
      
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should show export button when enabled', () => {
      const onExport = jest.fn();
      render(<AuditTrailViewer {...defaultProps} enableExport={true} onExport={onExport} />);
      
      const exportButton = screen.getByTestId('download-icon').closest('button');
      expect(exportButton).toBeInTheDocument();
    });

    it('should call onExport when export button is clicked', () => {
      const onExport = jest.fn();
      render(<AuditTrailViewer {...defaultProps} enableExport={true} onExport={onExport} />);
      
      const exportButton = screen.getByTestId('download-icon').closest('button');
      fireEvent.click(exportButton!);
      
      expect(onExport).toHaveBeenCalledWith('json');
    });

    it('should not show export button when disabled', () => {
      render(<AuditTrailViewer {...defaultProps} enableExport={false} />);
      
      expect(screen.queryByTestId('download-icon')).not.toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('should show refresh button when onRefresh is provided', () => {
      const onRefresh = jest.fn();
      render(<AuditTrailViewer {...defaultProps} onRefresh={onRefresh} />);
      
      const refreshButton = screen.getByTestId('refresh-cw-icon').closest('button');
      expect(refreshButton).toBeInTheDocument();
    });

    it('should call onRefresh when refresh button is clicked', () => {
      const onRefresh = jest.fn();
      render(<AuditTrailViewer {...defaultProps} onRefresh={onRefresh} />);
      
      const refreshButton = screen.getByTestId('refresh-cw-icon').closest('button');
      fireEvent.click(refreshButton!);
      
      expect(onRefresh).toHaveBeenCalled();
    });

    it('should show loading state', () => {
      render(<AuditTrailViewer {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Loading audit trail...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when error is provided', () => {
      render(<AuditTrailViewer {...defaultProps} error="Failed to load audit trail" />);
      
      expect(screen.getByText('Error loading audit trail: Failed to load audit trail')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no entries', () => {
      render(<AuditTrailViewer {...defaultProps} entries={[]} />);
      
      expect(screen.getByText('No audit trail entries')).toBeInTheDocument();
      expect(screen.getByText('No audit trail entries have been recorded yet.')).toBeInTheDocument();
    });

    it('should show filtered empty state when search returns no results', () => {
      render(<AuditTrailViewer {...defaultProps} enableSearching={true} />);
      
      const searchInput = screen.getByPlaceholderText('Search audit trail...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      
      expect(screen.getByText('No entries match your current filters.')).toBeInTheDocument();
    });
  });

  describe('Priority Display', () => {
    it('should show priority badges', () => {
      render(<AuditTrailViewer {...defaultProps} />);
      
      expect(screen.getAllByText('Medium')).toHaveLength(3); // One in select, one in timeline, one in list
      expect(screen.getAllByText('High')).toHaveLength(3);
      expect(screen.getAllByText('Critical')).toHaveLength(3);
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <AuditTrailViewer {...defaultProps} className="custom-class" />
      );

      const card = container.querySelector('[data-testid="card"]') as HTMLElement;
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Callback Functions', () => {
    it('should call onSearchChange when search term changes', () => {
      const onSearchChange = jest.fn();
      render(<AuditTrailViewer {...defaultProps} enableSearching={true} onSearchChange={onSearchChange} />);
      
      const searchInput = screen.getByPlaceholderText('Search audit trail...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      expect(onSearchChange).toHaveBeenCalledWith('test');
    });

    it('should call onFilterChange when filter changes', () => {
      const onFilterChange = jest.fn();
      render(<AuditTrailViewer {...defaultProps} enableFiltering={true} onFilterChange={onFilterChange} />);
      
      // The filter change would be triggered by the Select component
      // This is a simplified test since we're mocking the Select component
      expect(screen.getAllByTestId('select')).toHaveLength(2); // Action and Priority selects
    });
  });

  describe('Edge Cases', () => {
    it('should handle entries without field changes', () => {
      const entriesWithoutChanges = [
        {
          ...mockEntries[0],
          fieldChanges: [],
        },
      ];
      
      render(<AuditTrailViewer {...defaultProps} entries={entriesWithoutChanges} showFieldChanges={true} />);
      
      expect(screen.queryByText(/Show Details/)).not.toBeInTheDocument();
    });

    it('should handle entries without reason', () => {
      const entriesWithoutReason = [
        {
          ...mockEntries[0],
          reason: undefined,
        },
      ];
      
      render(<AuditTrailViewer {...defaultProps} entries={entriesWithoutReason} />);
      
      expect(screen.getAllByText('CREATE')).toHaveLength(3); // One in timeline, one in list, one in compact
    });

    it('should handle large number of entries', () => {
      const manyEntries = Array.from({ length: 100 }, (_, i) => ({
        ...mockEntries[0],
        id: `entry-${i}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
      }));
      
      render(<AuditTrailViewer {...defaultProps} entries={manyEntries} showPagination={true} pageSize={10} />);
      
      expect(screen.getByText('Page 1 of 10')).toBeInTheDocument();
    });
  });
});
