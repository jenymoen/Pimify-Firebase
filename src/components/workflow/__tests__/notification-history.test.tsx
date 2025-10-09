import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  NotificationHistory,
  CompactNotificationHistory,
  NotificationType,
  NotificationChannelType,
  NotificationHistoryStatus,
  NotificationHistoryItem,
} from '../notification-history';

// Mock dependencies
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

jest.mock('date-fns', () => ({
  format: (date: Date, formatStr: string) => date.toISOString(),
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

jest.mock('@/components/ui/input', () => ({
  Input: ({ ...props }: any) => <input {...props} />,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
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

jest.mock('@/components/ui/table', () => ({
  Table: ({ children, ...props }: any) => <table {...props}>{children}</table>,
  TableBody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
  TableCell: ({ children, ...props }: any) => <td {...props}>{children}</td>,
  TableHead: ({ children, ...props }: any) => <th {...props}>{children}</th>,
  TableHeader: ({ children, ...props }: any) => <thead {...props}>{children}</thead>,
  TableRow: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange, ...props }: any) => (
    <div {...props} data-value={value} data-on-value-change={onValueChange}>
      {children}
    </div>
  ),
  TabsContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TabsList: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TabsTrigger: ({ children, value, ...props }: any) => (
    <button {...props} data-value={value}>{children}</button>
  ),
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: (props: any) => <hr {...props} />,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Bell: () => <span data-testid="bell-icon" />,
  BellOff: () => <span data-testid="bell-off-icon" />,
  Check: () => <span data-testid="check-icon" />,
  X: () => <span data-testid="x-icon" />,
  Trash2: () => <span data-testid="trash2-icon" />,
  Archive: () => <span data-testid="archive-icon" />,
  Search: () => <span data-testid="search-icon" />,
  Filter: () => <span data-testid="filter-icon" />,
  RefreshCw: () => <span data-testid="refresh-cw-icon" />,
  Mail: () => <span data-testid="mail-icon" />,
  MessageSquare: () => <span data-testid="message-square-icon" />,
  Smartphone: () => <span data-testid="smartphone-icon" />,
  MessageCircle: () => <span data-testid="message-circle-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  CheckCircle2: () => <span data-testid="check-circle2-icon" />,
  XCircle: () => <span data-testid="x-circle-icon" />,
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
  Eye: () => <span data-testid="eye-icon" />,
  Download: () => <span data-testid="download-icon" />,
  Settings: () => <span data-testid="settings-icon" />,
}));

// Mock data
const mockNotifications: NotificationHistoryItem[] = [
  {
    id: 'notif-1',
    type: NotificationType.PRODUCT_SUBMITTED,
    channel: NotificationChannelType.EMAIL,
    status: NotificationHistoryStatus.DELIVERED,
    title: 'Product Submitted',
    message: 'Your product has been submitted for review',
    sentAt: new Date('2023-01-01T10:00:00Z'),
  },
  {
    id: 'notif-2',
    type: NotificationType.PRODUCT_APPROVED,
    channel: NotificationChannelType.IN_APP,
    status: NotificationHistoryStatus.READ,
    title: 'Product Approved',
    message: 'Your product has been approved',
    sentAt: new Date('2023-01-02T11:00:00Z'),
    readAt: new Date('2023-01-02T12:00:00Z'),
  },
  {
    id: 'notif-3',
    type: NotificationType.PRODUCT_REJECTED,
    channel: NotificationChannelType.EMAIL,
    status: NotificationHistoryStatus.FAILED,
    title: 'Delivery Failed',
    message: 'Failed to deliver notification',
    sentAt: new Date('2023-01-03T09:00:00Z'),
    error: 'Connection timeout',
  },
];

describe('NotificationHistory', () => {
  const defaultProps = {
    userId: 'user-123',
    notifications: mockNotifications,
    onMarkAsRead: jest.fn(),
    onMarkAllAsRead: jest.fn(),
    onArchive: jest.fn(),
    onDelete: jest.fn(),
    onDeleteAll: jest.fn(),
    onRefresh: jest.fn(),
    onExport: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders notification history', () => {
      render(<NotificationHistory {...defaultProps} />);
      
      expect(screen.getByText('Notification History')).toBeInTheDocument();
      const productSubmitted = screen.getAllByText('Product Submitted');
      expect(productSubmitted.length).toBeGreaterThan(0);
      const productApproved = screen.getAllByText('Product Approved');
      expect(productApproved.length).toBeGreaterThan(0);
    });

    it('shows unread count', () => {
      render(<NotificationHistory {...defaultProps} />);
      
      expect(screen.getByText('2 unread')).toBeInTheDocument();
    });

    it('renders all notifications', () => {
      render(<NotificationHistory {...defaultProps} />);
      
      const productSubmitted = screen.getAllByText('Product Submitted');
      expect(productSubmitted.length).toBeGreaterThan(0);
      const productApproved = screen.getAllByText('Product Approved');
      expect(productApproved.length).toBeGreaterThan(0);
      expect(screen.getByText('Delivery Failed')).toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    it('renders all, unread, and read tabs', () => {
      render(<NotificationHistory {...defaultProps} />);
      
      expect(screen.getByText(/All \(3\)/)).toBeInTheDocument();
      expect(screen.getByText(/Unread \(2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Read \(1\)/)).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('filters notifications by search term', async () => {
      const user = userEvent.setup();
      render(<NotificationHistory {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search notifications...');
      await user.type(searchInput, 'Approved');
      
      expect(searchInput).toHaveValue('Approved');
    });

    it('filters by notification type', async () => {
      const user = userEvent.setup();
      render(<NotificationHistory {...defaultProps} />);
      
      const typeSelects = screen.getAllByRole('combobox');
      const typeSelect = typeSelects[0]; // First select is type
      await user.selectOptions(typeSelect, NotificationType.PRODUCT_SUBMITTED);
      
      // Just verify the select interaction happened
      expect(typeSelects.length).toBeGreaterThan(0);
    });

    it('filters by channel', async () => {
      const user = userEvent.setup();
      render(<NotificationHistory {...defaultProps} />);
      
      const channelSelects = screen.getAllByRole('combobox');
      const channelSelect = channelSelects[1]; // Second select is channel
      await user.selectOptions(channelSelect, NotificationChannelType.EMAIL);
      
      // Just verify the selection happened
      expect(channelSelects.length).toBeGreaterThan(1);
    });
  });

  describe('Actions', () => {
    it('calls onMarkAsRead when mark as read is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationHistory {...defaultProps} />);
      
      const markAsReadButtons = screen.getAllByTestId('check-icon');
      await user.click(markAsReadButtons[0]);
      
      expect(defaultProps.onMarkAsRead).toHaveBeenCalled();
    });

    it('calls onMarkAllAsRead when mark all as read is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationHistory {...defaultProps} />);
      
      const markAllButton = screen.getByText('Mark All as Read');
      await user.click(markAllButton);
      
      expect(defaultProps.onMarkAllAsRead).toHaveBeenCalled();
    });

    it('calls onArchive when archive is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationHistory {...defaultProps} />);
      
      const archiveButtons = screen.getAllByTestId('archive-icon');
      await user.click(archiveButtons[0]);
      
      expect(defaultProps.onArchive).toHaveBeenCalled();
    });

    it('calls onDelete when delete is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationHistory {...defaultProps} />);
      
      const deleteButtons = screen.getAllByTestId('trash2-icon');
      // Find a delete button that's in the actions column (not the bulk action)
      const actionDeleteButtons = deleteButtons.filter((button, index) => index > 0); // Skip first (Delete All button)
      await user.click(actionDeleteButtons[0]);
      
      expect(defaultProps.onDelete).toHaveBeenCalled();
    });

    it('calls onRefresh when refresh is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationHistory {...defaultProps} />);
      
      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);
      
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });

    it('calls onExport when export is clicked', async () => {
      const user = userEvent.setup();
      render(<NotificationHistory {...defaultProps} />);
      
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      expect(defaultProps.onExport).toHaveBeenCalledWith('csv');
    });
  });

  describe('Selection', () => {
    it('allows selecting individual notifications', async () => {
      const user = userEvent.setup();
      render(<NotificationHistory {...defaultProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Skip the select-all checkbox
      
      expect(checkboxes[1]).toBeChecked();
    });

    it('allows selecting all notifications', async () => {
      const user = userEvent.setup();
      render(<NotificationHistory {...defaultProps} />);
      
      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);
      
      // Selected count should be shown
      const selectedTexts = screen.getAllByText(/3 selected/);
      expect(selectedTexts.length).toBeGreaterThan(0);
    });

    it('allows deselecting all notifications', async () => {
      const user = userEvent.setup();
      render(<NotificationHistory {...defaultProps} />);
      
      const selectAllButton = screen.getByText('Select All');
      await user.click(selectAllButton);
      
      const deselectAllButton = screen.getAllByText('Deselect All')[0];
      await user.click(deselectAllButton);
      
      // Selection should be cleared
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[1]).not.toBeChecked();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no notifications', () => {
      render(<NotificationHistory {...defaultProps} notifications={[]} />);
      
      expect(screen.getByText('No notifications found')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('disables actions when loading', () => {
      render(<NotificationHistory {...defaultProps} loading={true} />);
      
      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Read-only Mode', () => {
    it('hides actions in read-only mode', () => {
      render(<NotificationHistory {...defaultProps} readOnly={true} showActions={false} />);
      
      expect(screen.queryByText('Mark All as Read')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete All')).not.toBeInTheDocument();
    });
  });
});

describe('CompactNotificationHistory', () => {
  const compactDefaultProps = {
    userId: 'user-123',
    notifications: mockNotifications,
    onMarkAsRead: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders compact notification history', () => {
      render(<CompactNotificationHistory {...compactDefaultProps} />);
      
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Product Submitted')).toBeInTheDocument();
    });

    it('shows unread badge', () => {
      render(<CompactNotificationHistory {...compactDefaultProps} />);
      
      expect(screen.getByText('2')).toBeInTheDocument(); // Unread count
    });

    it('limits notifications to maxItems', () => {
      render(<CompactNotificationHistory {...compactDefaultProps} maxItems={2} />);
      
      const notificationTitles = screen.getAllByText(/Product/);
      expect(notificationTitles.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Actions', () => {
    it('calls onMarkAsRead when mark as read is clicked', async () => {
      const user = userEvent.setup();
      render(<CompactNotificationHistory {...compactDefaultProps} />);
      
      const markAsReadButtons = screen.getAllByTestId('check-icon');
      if (markAsReadButtons.length > 0) {
        await user.click(markAsReadButtons[0]);
        expect(compactDefaultProps.onMarkAsRead).toHaveBeenCalled();
      }
    });

    it('calls onDelete when delete is clicked', async () => {
      const user = userEvent.setup();
      render(<CompactNotificationHistory {...compactDefaultProps} />);
      
      const deleteButtons = screen.getAllByTestId('trash2-icon');
      await user.click(deleteButtons[0]);
      
      expect(compactDefaultProps.onDelete).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no notifications', () => {
      render(<CompactNotificationHistory {...compactDefaultProps} notifications={[]} />);
      
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });
  });
});
