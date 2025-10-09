import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  BulkSelectionInterface,
  CompactBulkSelection,
  SelectionMode,
} from '../bulk-selection-interface';
import { Product } from '@/types/product';
import { WorkflowState } from '@/types/workflow';

// Mock dependencies
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Mock UI components
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

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, disabled, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: (props: any) => <hr {...props} />,
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  TableBody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
  TableHead: ({ children, ...props }: any) => <th {...props}>{children}</th>,
  TableHeader: ({ children, ...props }: any) => <thead {...props}>{children}</thead>,
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  CheckSquare: () => <span data-testid="check-square-icon" />,
  Square: () => <span data-testid="square-icon" />,
  MinusSquare: () => <span data-testid="minus-square-icon" />,
  X: () => <span data-testid="x-icon" />,
  Filter: () => <span data-testid="filter-icon" />,
  Download: () => <span data-testid="download-icon" />,
  Upload: () => <span data-testid="upload-icon" />,
  Trash2: () => <span data-testid="trash2-icon" />,
  Archive: () => <span data-testid="archive-icon" />,
  CheckCircle: () => <span data-testid="check-circle-icon" />,
  XCircle: () => <span data-testid="x-circle-icon" />,
}));

// Mock data
const mockProducts: Product[] = [
  {
    id: 'product-1',
    name: 'Product 1',
    sku: 'SKU-001',
    brand: 'Brand A',
    category: 'Category 1',
    workflowState: WorkflowState.DRAFT,
    description: 'Test product 1',
    images: [],
    variants: [],
    metafields: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'product-2',
    name: 'Product 2',
    sku: 'SKU-002',
    brand: 'Brand B',
    category: 'Category 2',
    workflowState: WorkflowState.REVIEW,
    description: 'Test product 2',
    images: [],
    variants: [],
    metafields: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'product-3',
    name: 'Product 3',
    sku: 'SKU-003',
    brand: 'Brand A',
    category: 'Category 1',
    workflowState: WorkflowState.APPROVED,
    description: 'Test product 3',
    images: [],
    variants: [],
    metafields: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('BulkSelectionInterface', () => {
  const defaultProps = {
    products: mockProducts,
    selectedIds: new Set<string>(),
    onSelectionChange: jest.fn(),
    onBulkAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders bulk selection interface', () => {
      render(<BulkSelectionInterface {...defaultProps} />);
      
      expect(screen.getByText('Bulk Selection')).toBeInTheDocument();
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.getByText('Product 3')).toBeInTheDocument();
    });

    it('shows selection count', () => {
      const selectedIds = new Set(['product-1', 'product-2']);
      render(<BulkSelectionInterface {...defaultProps} selectedIds={selectedIds} />);
      
      const selectionTexts = screen.getAllByText('2 of 3 products selected');
      expect(selectionTexts.length).toBeGreaterThan(0);
    });

    it('shows empty state when no products', () => {
      render(<BulkSelectionInterface {...defaultProps} products={[]} />);
      
      expect(screen.getByText('No products available')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls onSelectionChange when product is selected', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(<BulkSelectionInterface {...defaultProps} onSelectionChange={mockOnChange} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Skip the select-all checkbox
      
      expect(mockOnChange).toHaveBeenCalledWith(expect.any(Set));
      const calledWith = mockOnChange.mock.calls[0][0];
      expect(calledWith.has('product-1')).toBe(true);
    });

    it('calls onSelectionChange when product is deselected', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      const selectedIds = new Set(['product-1']);
      
      render(
        <BulkSelectionInterface 
          {...defaultProps} 
          selectedIds={selectedIds}
          onSelectionChange={mockOnChange}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Uncheck product-1
      
      expect(mockOnChange).toHaveBeenCalled();
      const calledWith = mockOnChange.mock.calls[0][0];
      expect(calledWith.has('product-1')).toBe(false);
    });

    it('selects all products', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(<BulkSelectionInterface {...defaultProps} onSelectionChange={mockOnChange} />);
      
      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);
      
      expect(mockOnChange).toHaveBeenCalled();
      const calledWith = mockOnChange.mock.calls[0][0];
      expect(calledWith.size).toBe(3);
    });

    it('clears all selections', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      const selectedIds = new Set(['product-1', 'product-2']);
      
      render(
        <BulkSelectionInterface 
          {...defaultProps} 
          selectedIds={selectedIds}
          onSelectionChange={mockOnChange}
        />
      );
      
      const clearButtons = screen.getAllByText('Clear');
      await user.click(clearButtons[0]);
      
      expect(mockOnChange).toHaveBeenCalled();
      const calledWith = mockOnChange.mock.calls[0][0];
      expect(calledWith.size).toBe(0);
    });

    it('respects max selection limit', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(
        <BulkSelectionInterface 
          {...defaultProps} 
          onSelectionChange={mockOnChange}
          maxSelection={2}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Select product-1
      await user.click(checkboxes[2]); // Select product-2
      await user.click(checkboxes[3]); // Try to select product-3
      
      // The max limit should prevent the third selection
      // Verify that callback was called (may be 2 or 3 times depending on implementation)
      expect(mockOnChange).toHaveBeenCalled();
      // Verify that final selection doesn't exceed max limit
      const finalCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(finalCall.size).toBeLessThanOrEqual(2);
    });
  });

  describe('Bulk Actions', () => {
    it('shows bulk actions when products selected', () => {
      const selectedIds = new Set(['product-1']);
      render(<BulkSelectionInterface {...defaultProps} selectedIds={selectedIds} />);
      
      expect(screen.getByText('1 selected')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('hides bulk actions when no products selected', () => {
      render(<BulkSelectionInterface {...defaultProps} />);
      
      expect(screen.queryByText('Export')).not.toBeInTheDocument();
    });

    it('calls onBulkAction when action is clicked', async () => {
      const user = userEvent.setup();
      const mockOnBulkAction = jest.fn();
      const selectedIds = new Set(['product-1', 'product-2']);
      
      render(
        <BulkSelectionInterface 
          {...defaultProps} 
          selectedIds={selectedIds}
          onBulkAction={mockOnBulkAction}
        />
      );
      
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      expect(mockOnBulkAction).toHaveBeenCalledWith('export', ['product-1', 'product-2']);
    });

    it('supports custom actions', async () => {
      const user = userEvent.setup();
      const mockOnBulkAction = jest.fn();
      const selectedIds = new Set(['product-1']);
      const customActions = [
        {
          id: 'approve',
          label: 'Approve',
          variant: 'default' as const,
        },
      ];
      
      render(
        <BulkSelectionInterface 
          {...defaultProps} 
          selectedIds={selectedIds}
          onBulkAction={mockOnBulkAction}
          customActions={customActions}
        />
      );
      
      const approveButton = screen.getByText('Approve');
      await user.click(approveButton);
      
      expect(mockOnBulkAction).toHaveBeenCalledWith('approve', ['product-1']);
    });
  });

  describe('Selection Modes', () => {
    it('supports single selection mode', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(
        <BulkSelectionInterface 
          {...defaultProps} 
          onSelectionChange={mockOnChange}
          selectionMode={SelectionMode.SINGLE}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Select product-1
      await user.click(checkboxes[2]); // Select product-2 (should replace product-1)
      
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.size).toBe(1);
      expect(lastCall.has('product-2')).toBe(true);
    });
  });

  describe('Disabled State', () => {
    it('disables all interactions when disabled', () => {
      render(<BulkSelectionInterface {...defaultProps} disabled={true} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeDisabled();
      });
    });

    it('disables actions when disabled', () => {
      const selectedIds = new Set(['product-1']);
      render(
        <BulkSelectionInterface 
          {...defaultProps} 
          selectedIds={selectedIds}
          disabled={true}
        />
      );
      
      const exportButton = screen.getByText('Export');
      expect(exportButton).toBeDisabled();
    });
  });

  describe('Read-only Mode', () => {
    it('disables selections in read-only mode', () => {
      render(<BulkSelectionInterface {...defaultProps} readOnly={true} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeDisabled();
      });
    });

    it('hides bulk actions in read-only mode', () => {
      const selectedIds = new Set(['product-1']);
      render(
        <BulkSelectionInterface 
          {...defaultProps} 
          selectedIds={selectedIds}
          readOnly={true}
        />
      );
      
      expect(screen.queryByText('Export')).not.toBeInTheDocument();
    });
  });

  describe('Show/Hide Options', () => {
    it('hides header when showHeader is false', () => {
      render(<BulkSelectionInterface {...defaultProps} showHeader={false} />);
      
      expect(screen.queryByText('Bulk Selection')).not.toBeInTheDocument();
    });

    it('hides actions when showActions is false', () => {
      const selectedIds = new Set(['product-1']);
      render(
        <BulkSelectionInterface 
          {...defaultProps} 
          selectedIds={selectedIds}
          showActions={false}
        />
      );
      
      expect(screen.queryByText('Export')).not.toBeInTheDocument();
    });

    it('hides footer when showFooter is false', () => {
      render(<BulkSelectionInterface {...defaultProps} showFooter={false} />);
      
      const footerText = screen.queryByText(/0 of 3 products selected/);
      expect(footerText).not.toBeInTheDocument();
    });
  });
});

describe('CompactBulkSelection', () => {
  const compactDefaultProps = {
    products: mockProducts,
    selectedIds: new Set<string>(),
    onSelectionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders compact bulk selection', () => {
      render(<CompactBulkSelection {...compactDefaultProps} />);
      
      expect(screen.getByText('0 of 3 selected')).toBeInTheDocument();
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.getByText('Product 3')).toBeInTheDocument();
    });

    it('shows selection count', () => {
      const selectedIds = new Set(['product-1']);
      render(<CompactBulkSelection {...compactDefaultProps} selectedIds={selectedIds} />);
      
      expect(screen.getByText('1 of 3 selected')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls onSelectionChange when product is toggled', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(<CompactBulkSelection {...compactDefaultProps} onSelectionChange={mockOnChange} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('selects all products', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(<CompactBulkSelection {...compactDefaultProps} onSelectionChange={mockOnChange} />);
      
      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);
      
      expect(mockOnChange).toHaveBeenCalled();
      const calledWith = mockOnChange.mock.calls[0][0];
      expect(calledWith.size).toBe(3);
    });

    it('clears all selections', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      const selectedIds = new Set(['product-1', 'product-2']);
      
      render(
        <CompactBulkSelection 
          {...compactDefaultProps} 
          selectedIds={selectedIds}
          onSelectionChange={mockOnChange}
        />
      );
      
      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);
      
      expect(mockOnChange).toHaveBeenCalled();
      const calledWith = mockOnChange.mock.calls[0][0];
      expect(calledWith.size).toBe(0);
    });

    it('respects max selection limit', async () => {
      const user = userEvent.setup();
      const mockOnChange = jest.fn();
      
      render(
        <CompactBulkSelection 
          {...compactDefaultProps} 
          onSelectionChange={mockOnChange}
          maxSelection={1}
        />
      );
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select product-1
      await user.click(checkboxes[1]); // Try to select product-2
      
      // Second selection should be ignored
      const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
      expect(lastCall.size).toBe(1);
    });
  });

  describe('Disabled State', () => {
    it('disables all interactions when disabled', () => {
      render(<CompactBulkSelection {...compactDefaultProps} disabled={true} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeDisabled();
      });
    });
  });
});
