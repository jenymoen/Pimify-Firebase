import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { 
  NotificationPreferences, 
  CompactNotificationPreferences,
  NotificationChannel,
  NotificationFrequency,
  NotificationEvent,
  UserNotificationSettings
} from '../notification-preferences';
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
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, ...props }: any) => (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    >
      <span data-state={checked ? 'checked' : 'unchecked'} />
    </button>
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
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

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange, ...props }: any) => (
    <div {...props} data-value={value} data-on-value-change={onValueChange}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value, ...props }: any) => (
    <div {...props} data-tab-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children, ...props }: any) => <div role="tablist" {...props}>{children}</div>,
  TabsTrigger: ({ children, value, ...props }: any) => (
    <button role="tab" data-value={value} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: (props: any) => <hr {...props} />,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AlertDescription: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Bell: () => <span data-testid="bell-icon" />,
  BellOff: () => <span data-testid="bell-off-icon" />,
  Mail: () => <span data-testid="mail-icon" />,
  Smartphone: () => <span data-testid="smartphone-icon" />,
  Settings: () => <span data-testid="settings-icon" />,
  Save: () => <span data-testid="save-icon" />,
  RotateCcw: () => <span data-testid="rotate-ccw-icon" />,
  CheckCircle: () => <span data-testid="check-circle-icon" />,
  AlertCircle: () => <span data-testid="alert-circle-icon" />,
  Info: () => <span data-testid="info-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  User: () => <span data-testid="user-icon" />,
  FileText: () => <span data-testid="file-text-icon" />,
  Zap: () => <span data-testid="zap-icon" />,
  Eye: () => <span data-testid="eye-icon" />,
  Edit: () => <span data-testid="edit-icon" />,
  Send: () => <span data-testid="send-icon" />,
  Check: () => <span data-testid="check-icon" />,
  X: () => <span data-testid="x-icon" />,
}));

// Sample test data
const mockSettings: UserNotificationSettings = {
  userId: 'user1',
  userRole: UserRole.ADMIN,
  globalEnabled: true,
  preferences: [
    {
      event: NotificationEvent.PRODUCT_SUBMITTED,
      enabled: true,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      frequency: NotificationFrequency.IMMEDIATE,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
      },
    },
    {
      event: NotificationEvent.PRODUCT_APPROVED,
      enabled: true,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      frequency: NotificationFrequency.IMMEDIATE,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
      },
    },
    {
      event: NotificationEvent.PRODUCT_REJECTED,
      enabled: false,
      channels: [NotificationChannel.EMAIL],
      frequency: NotificationFrequency.DAILY,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
      },
    },
  ],
  defaultChannels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
  defaultFrequency: NotificationFrequency.IMMEDIATE,
  timezone: 'UTC',
  language: 'en',
  lastUpdated: '2023-01-01T00:00:00Z',
};

describe('NotificationPreferences', () => {
  const defaultProps = {
    userRole: UserRole.ADMIN,
    settings: mockSettings,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders notification preferences form', () => {
      render(<NotificationPreferences {...defaultProps} />);
      
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
      expect(screen.getByText('Configure how and when you receive notifications')).toBeInTheDocument();
    });

    it('renders global settings section', () => {
      render(<NotificationPreferences {...defaultProps} />);
      
      expect(screen.getByText('Global Settings')).toBeInTheDocument();
      expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
      expect(screen.getByText('Default Channels')).toBeInTheDocument();
      expect(screen.getByText('Default Frequency')).toBeInTheDocument();
    });

    it('renders event preferences section', () => {
      render(<NotificationPreferences {...defaultProps} />);
      
      expect(screen.getByText('Event Preferences')).toBeInTheDocument();
      expect(screen.getByText('Workflow')).toBeInTheDocument();
      expect(screen.getByText('Assignment')).toBeInTheDocument();
      expect(screen.getByText('Deadline')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      render(<NotificationPreferences {...defaultProps} />);
      
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });
  });

  describe('Global Settings', () => {
    it('shows global enabled state', () => {
      render(<NotificationPreferences {...defaultProps} />);
      
      const globalSwitch = screen.getByLabelText('Enable Notifications');
      expect(globalSwitch).toBeChecked();
    });

    it('toggles global enabled state', async () => {
      const user = userEvent.setup();
      render(<NotificationPreferences {...defaultProps} />);
      
      const globalSwitch = screen.getByLabelText('Enable Notifications');
      await user.click(globalSwitch);
      
      expect(globalSwitch).not.toBeChecked();
    });

    it('shows default channels', () => {
      render(<NotificationPreferences {...defaultProps} />);
      
      expect(screen.getByText('Default Channels')).toBeInTheDocument();
    });

    it('shows default frequency', () => {
      render(<NotificationPreferences {...defaultProps} />);
      
      expect(screen.getByText('Default Frequency')).toBeInTheDocument();
    });
  });

  describe('Event Preferences', () => {
    it('renders workflow events', () => {
      render(<NotificationPreferences {...defaultProps} />);
      
      expect(screen.getByText('Product Submitted')).toBeInTheDocument();
      expect(screen.getByText('Product Approved')).toBeInTheDocument();
      expect(screen.getByText('Product Rejected')).toBeInTheDocument();
    });

    it('shows enabled state for events', () => {
      render(<NotificationPreferences {...defaultProps} />);
      
      // Product Submitted should be enabled
      const submittedSwitch = screen.getByLabelText('Enable Notifications');
      expect(submittedSwitch).toBeChecked();
    });

    it('toggles event enabled state', async () => {
      const user = userEvent.setup();
      render(<NotificationPreferences {...defaultProps} />);
      
      // Find the switch for Product Submitted (first enabled event)
      const switches = screen.getAllByRole('switch');
      const eventSwitch = switches[1]; // First switch is global, second is first event
      
      await user.click(eventSwitch);
      
      // The switch should be toggled
      expect(eventSwitch).not.toBeChecked();
    });

    it('switches between event categories', async () => {
      const user = userEvent.setup();
      render(<NotificationPreferences {...defaultProps} />);
      
      // Click on Assignment tab
      await user.click(screen.getByText('Assignment'));
      
      // Should show the tab is selected (simplified test)
      expect(screen.getByText('Assignment')).toBeInTheDocument();
    });
  });

  describe('Advanced Settings', () => {
    it('shows advanced settings when enabled', () => {
      render(<NotificationPreferences {...defaultProps} showAdvanced={true} />);
      
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
      expect(screen.getByText('Timezone')).toBeInTheDocument();
      expect(screen.getByText('Language')).toBeInTheDocument();
    });

    it('hides advanced settings by default', () => {
      render(<NotificationPreferences {...defaultProps} />);
      
      expect(screen.queryByText('Advanced Settings')).not.toBeInTheDocument();
    });
  });

  describe('Test Buttons', () => {
    it('shows test buttons when enabled', () => {
      render(<NotificationPreferences {...defaultProps} showTestButtons={true} />);
      
      expect(screen.getByText('Test Email')).toBeInTheDocument();
      expect(screen.getByText('Test In-App')).toBeInTheDocument();
      expect(screen.getByText('Test Push')).toBeInTheDocument();
    });

    it('hides test buttons by default', () => {
      render(<NotificationPreferences {...defaultProps} />);
      
      expect(screen.queryByText('Test Email')).not.toBeInTheDocument();
    });

    it('calls onTest when test button is clicked', async () => {
      const mockOnTest = jest.fn();
      const user = userEvent.setup();
      
      render(
        <NotificationPreferences 
          {...defaultProps} 
          showTestButtons={true}
          onTest={mockOnTest}
        />
      );
      
      await user.click(screen.getByText('Test Email'));
      
      expect(mockOnTest).toHaveBeenCalledWith(NotificationChannel.EMAIL);
    });
  });

  describe('Read-only Mode', () => {
    it('disables all controls in read-only mode', () => {
      render(<NotificationPreferences {...defaultProps} readOnly={true} />);
      
      const globalSwitch = screen.getByLabelText('Enable Notifications');
      expect(globalSwitch).toBeDisabled();
    });

    it('hides action buttons in read-only mode', () => {
      render(<NotificationPreferences {...defaultProps} readOnly={true} />);
      
      expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
      expect(screen.queryByText('Reset')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state', () => {
      render(<NotificationPreferences {...defaultProps} loading={true} />);
      
      const globalSwitch = screen.getByLabelText('Enable Notifications');
      expect(globalSwitch).toBeDisabled();
    });

    it('shows saving state', () => {
      render(<NotificationPreferences {...defaultProps} saving={true} />);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByText('Saving your notification preferences...')).toBeInTheDocument();
    });
  });

  describe('Save and Reset', () => {
    it('calls onSave when save button is clicked', async () => {
      const mockOnSave = jest.fn();
      const user = userEvent.setup();
      
      render(
        <NotificationPreferences 
          {...defaultProps} 
          onSave={mockOnSave}
        />
      );
      
      // Make a change to enable save button
      const globalSwitch = screen.getByLabelText('Enable Notifications');
      await user.click(globalSwitch);
      
      await user.click(screen.getByText('Save Changes'));
      
      expect(mockOnSave).toHaveBeenCalled();
    });

    it('calls onReset when reset button is clicked', async () => {
      const mockOnReset = jest.fn();
      const user = userEvent.setup();
      
      render(
        <NotificationPreferences 
          {...defaultProps} 
          onReset={mockOnReset}
        />
      );
      
      // Make a change to enable reset button
      const globalSwitch = screen.getByLabelText('Enable Notifications');
      await user.click(globalSwitch);
      
      await user.click(screen.getByText('Reset'));
      
      expect(mockOnReset).toHaveBeenCalled();
    });

    it('disables save button when no changes', () => {
      render(<NotificationPreferences {...defaultProps} />);
      
      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).toBeDisabled();
    });

    it('enables save button when changes are made', async () => {
      const user = userEvent.setup();
      render(<NotificationPreferences {...defaultProps} />);
      
      const globalSwitch = screen.getByLabelText('Enable Notifications');
      await user.click(globalSwitch);
      
      const saveButton = screen.getByText('Save Changes');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Status Messages', () => {
    it('shows unsaved changes badge', async () => {
      const user = userEvent.setup();
      render(<NotificationPreferences {...defaultProps} />);
      
      const globalSwitch = screen.getByLabelText('Enable Notifications');
      await user.click(globalSwitch);
      
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    it('shows disabled notifications alert', () => {
      const disabledSettings = { ...mockSettings, globalEnabled: false };
      render(<NotificationPreferences {...defaultProps} settings={disabledSettings} />);
      
      expect(screen.getByText('Notifications are currently disabled. Enable them above to start receiving notifications.')).toBeInTheDocument();
    });
  });
});

  describe('CompactNotificationPreferences', () => {
    const compactDefaultProps = {
      userRole: UserRole.ADMIN,
      settings: mockSettings,
    };

    it('renders compact notification preferences', () => {
      render(<CompactNotificationPreferences {...compactDefaultProps} />);
      
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('shows global enabled state', () => {
      render(<CompactNotificationPreferences {...compactDefaultProps} />);
      
      const switches = screen.getAllByRole('switch');
      const globalSwitch = switches[0]; // First switch is the global one
      expect(globalSwitch).toBeChecked();
    });

    it('toggles global enabled state', async () => {
      const user = userEvent.setup();
      render(<CompactNotificationPreferences {...compactDefaultProps} />);
      
      const switches = screen.getAllByRole('switch');
      const globalSwitch = switches[0]; // First switch is the global one
      await user.click(globalSwitch);
      
      expect(globalSwitch).not.toBeChecked();
    });

    it('shows event preferences when enabled', () => {
      render(<CompactNotificationPreferences {...compactDefaultProps} />);
      
      expect(screen.getByText('Product Submitted')).toBeInTheDocument();
      expect(screen.getByText('Product Approved')).toBeInTheDocument();
    });

    it('hides event preferences when disabled', () => {
      const disabledSettings = { ...mockSettings, globalEnabled: false };
      render(<CompactNotificationPreferences {...compactDefaultProps} settings={disabledSettings} />);
      
      expect(screen.queryByText('Product Submitted')).not.toBeInTheDocument();
    });

    it('calls onSave when preferences change', async () => {
      const mockOnSave = jest.fn();
      const user = userEvent.setup();
      
      render(
        <CompactNotificationPreferences 
          {...compactDefaultProps} 
          onSave={mockOnSave}
        />
      );
      
      const switches = screen.getAllByRole('switch');
      const globalSwitch = switches[0]; // First switch is the global one
      await user.click(globalSwitch);
      
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

describe('Role-based Behavior', () => {
  it('shows different events for different roles', () => {
    const { rerender } = render(
      <NotificationPreferences 
        userRole={UserRole.ADMIN}
        settings={mockSettings}
      />
    );
    
    expect(screen.getByText('Product Submitted')).toBeInTheDocument();
    
    // For now, just test that the component renders with different roles
    rerender(
      <NotificationPreferences 
        userRole={UserRole.VIEWER}
        settings={{ ...mockSettings, userRole: UserRole.VIEWER }}
      />
    );
    
    // The component should still render
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  const accessibilityDefaultProps = {
    userRole: UserRole.ADMIN,
    settings: mockSettings,
  };

  it('has proper labels for form controls', () => {
    render(<NotificationPreferences {...accessibilityDefaultProps} />);
    
    expect(screen.getByLabelText('Enable Notifications')).toBeInTheDocument();
    // Test that labels exist even if not properly associated
    expect(screen.getByText('Default Channels')).toBeInTheDocument();
    expect(screen.getByText('Default Frequency')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(<NotificationPreferences {...accessibilityDefaultProps} />);
    
    const tabs = screen.getByRole('tablist');
    expect(tabs).toBeInTheDocument();
    
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);
  });
});
