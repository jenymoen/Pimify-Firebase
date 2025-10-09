vimport React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  RoleBasedWrapper, 
  AdminOnly, 
  ReviewerOnly, 
  EditorOnly, 
  ViewerOnly,
  AdminAndReviewer,
  AdminAndEditor,
  AllRoles,
  CanEdit,
  CanApprove,
  CanPublish,
  CanManageUsers,
  CanViewAuditTrail,
  withRoleBasedAccess,
  useRoleBasedAccess
} from '../role-based-wrapper';
import { UserRole, WorkflowAction, WorkflowState } from '@/types/workflow';

// Mock the utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

// Sample test data
const TestComponent = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="test-content">{children}</div>
);

const TestButton = () => <button data-testid="test-button">Test Button</button>;

describe('RoleBasedWrapper', () => {
  const defaultProps = {
    userRole: UserRole.ADMIN,
    children: <TestComponent>Test Content</TestComponent>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Role-based Rendering', () => {
    it('renders content when user has required role', () => {
      render(
        <RoleBasedWrapper {...defaultProps} allowedRoles={UserRole.ADMIN}>
          <TestComponent>Admin Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('renders content when user has one of multiple allowed roles', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          userRole={UserRole.REVIEWER}
          allowedRoles={[UserRole.ADMIN, UserRole.REVIEWER]}
        >
          <TestComponent>Reviewer Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('Reviewer Content')).toBeInTheDocument();
    });

    it('hides content when user does not have required role', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          userRole={UserRole.VIEWER}
          allowedRoles={UserRole.ADMIN}
        >
          <TestComponent>Admin Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });

    it('shows fallback when user does not have required role', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          userRole={UserRole.VIEWER}
          allowedRoles={UserRole.ADMIN}
          fallback={<div data-testid="fallback">Access Denied</div>}
        >
          <TestComponent>Admin Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.getByTestId('fallback')).toBeInTheDocument();
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('Permission-based Rendering', () => {
    it('renders content when user has required permission', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          requiredPermissions={WorkflowAction.EDIT}
        >
          <TestComponent>Edit Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('Edit Content')).toBeInTheDocument();
    });

    it('renders content when user has one of multiple required permissions', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          requiredPermissions={[WorkflowAction.EDIT, WorkflowAction.APPROVE]}
        >
          <TestComponent>Edit or Approve Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('Edit or Approve Content')).toBeInTheDocument();
    });

    it('hides content when user does not have required permission', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          userRole={UserRole.VIEWER}
          requiredPermissions={WorkflowAction.MANAGE_USERS}
        >
          <TestComponent>Admin Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });
  });

  describe('Role Hierarchy', () => {
    it('allows higher roles when allowHigherRoles is true', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          userRole={UserRole.ADMIN}
          allowedRoles={UserRole.REVIEWER}
          allowHigherRoles={true}
        >
          <TestComponent>Higher Role Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('denies higher roles when allowHigherRoles is false', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          userRole={UserRole.ADMIN}
          allowedRoles={UserRole.REVIEWER}
          allowHigherRoles={false}
        >
          <TestComponent>Higher Role Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });

    it('allows lower roles when allowLowerRoles is true', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          userRole={UserRole.VIEWER}
          allowedRoles={UserRole.ADMIN}
          allowLowerRoles={true}
        >
          <TestComponent>Lower Role Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('Custom Permission Check', () => {
    it('renders content when custom permission check passes', () => {
      const customCheck = jest.fn().mockReturnValue(true);

      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          customPermissionCheck={customCheck}
        >
          <TestComponent>Custom Permission Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(customCheck).toHaveBeenCalledWith({
        userRole: UserRole.ADMIN,
        allowedRoles: [],
        requiredPermissions: [],
        currentState: undefined,
        isOwner: false,
        isAssigned: false,
        isLocked: false,
      });
    });

    it('hides content when custom permission check fails', () => {
      const customCheck = jest.fn().mockReturnValue(false);

      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          customPermissionCheck={customCheck}
        >
          <TestComponent>Custom Permission Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });
  });

  describe('Hide When Denied', () => {
    it('returns null when hideWhenDenied is true and access is denied', () => {
      const { container } = render(
        <RoleBasedWrapper 
          {...defaultProps} 
          userRole={UserRole.VIEWER}
          allowedRoles={UserRole.ADMIN}
          hideWhenDenied={true}
        >
          <TestComponent>Admin Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders content when hideWhenDenied is true and access is granted', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          hideWhenDenied={true}
        >
          <TestComponent>Admin Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('Placeholder', () => {
    it('shows placeholder when showPlaceholder is true and access is denied', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          userRole={UserRole.VIEWER}
          allowedRoles={UserRole.ADMIN}
          showPlaceholder={true}
        >
          <TestComponent>Admin Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.getByText('Content Restricted')).toBeInTheDocument();
      expect(screen.getByText("You don't have permission to view this content")).toBeInTheDocument();
    });

    it('shows custom placeholder when provided', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          userRole={UserRole.VIEWER}
          allowedRoles={UserRole.ADMIN}
          showPlaceholder={true}
          placeholder={<div data-testid="custom-placeholder">Custom Placeholder</div>}
        >
          <TestComponent>Admin Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(screen.getByTestId('custom-placeholder')).toBeInTheDocument();
      expect(screen.getByText('Custom Placeholder')).toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('shows tooltip when showTooltip is true', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          showTooltip={true}
        >
          <TestComponent>Admin Content</TestComponent>
        </RoleBasedWrapper>
      );

      const wrapper = screen.getByTestId('test-content').parentElement;
      expect(wrapper).toHaveAttribute('title');
    });

    it('shows custom tooltip message when provided', () => {
      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          showTooltip={true}
          tooltipMessage="Custom tooltip message"
        >
          <TestComponent>Admin Content</TestComponent>
        </RoleBasedWrapper>
      );

      const wrapper = screen.getByTestId('test-content').parentElement;
      expect(wrapper).toHaveAttribute('title', 'Custom tooltip message');
    });
  });

  describe('Debug Mode', () => {
    it('logs permission denials when debugMode is true', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(
        <RoleBasedWrapper 
          {...defaultProps} 
          userRole={UserRole.VIEWER}
          allowedRoles={UserRole.ADMIN}
          debugMode={true}
        >
          <TestComponent>Admin Content</TestComponent>
        </RoleBasedWrapper>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'RoleBasedWrapper: Permission denied',
        expect.objectContaining({
          userRole: UserRole.VIEWER,
          allowedRoles: UserRole.ADMIN,
        })
      );

      consoleSpy.mockRestore();
    });
  });
});

describe('Pre-configured Role Wrappers', () => {
  describe('AdminOnly', () => {
    it('renders content for admin users', () => {
      render(
        <AdminOnly userRole={UserRole.ADMIN}>
          <TestComponent>Admin Content</TestComponent>
        </AdminOnly>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('hides content for non-admin users', () => {
      render(
        <AdminOnly userRole={UserRole.VIEWER}>
          <TestComponent>Admin Content</TestComponent>
        </AdminOnly>
      );

      expect(screen.queryByTestId('test-content')).not.toBeInTheDocument();
    });
  });

  describe('ReviewerOnly', () => {
    it('renders content for reviewer users', () => {
      render(
        <ReviewerOnly userRole={UserRole.REVIEWER}>
          <TestComponent>Reviewer Content</TestComponent>
        </ReviewerOnly>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('EditorOnly', () => {
    it('renders content for editor users', () => {
      render(
        <EditorOnly userRole={UserRole.EDITOR}>
          <TestComponent>Editor Content</TestComponent>
        </EditorOnly>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('ViewerOnly', () => {
    it('renders content for viewer users', () => {
      render(
        <ViewerOnly userRole={UserRole.VIEWER}>
          <TestComponent>Viewer Content</TestComponent>
        </ViewerOnly>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('Combined Role Wrappers', () => {
    it('AdminAndReviewer renders for both admin and reviewer', () => {
      const { rerender } = render(
        <AdminAndReviewer userRole={UserRole.ADMIN}>
          <TestComponent>Admin Content</TestComponent>
        </AdminAndReviewer>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();

      rerender(
        <AdminAndReviewer userRole={UserRole.REVIEWER}>
          <TestComponent>Reviewer Content</TestComponent>
        </AdminAndReviewer>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('AllRoles renders for any role', () => {
      const roles = [UserRole.ADMIN, UserRole.REVIEWER, UserRole.EDITOR, UserRole.VIEWER];

      roles.forEach(role => {
        const { unmount } = render(
          <AllRoles userRole={role}>
            <TestComponent>{role} Content</TestComponent>
          </AllRoles>
        );

        expect(screen.getByTestId('test-content')).toBeInTheDocument();
        unmount();
      });
    });
  });
});

describe('Permission-based Wrappers', () => {
  describe('CanEdit', () => {
    it('renders for users with edit permission', () => {
      render(
        <CanEdit userRole={UserRole.EDITOR}>
          <TestComponent>Edit Content</TestComponent>
        </CanEdit>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('CanApprove', () => {
    it('renders for users with approve permission', () => {
      render(
        <CanApprove userRole={UserRole.REVIEWER}>
          <TestComponent>Approve Content</TestComponent>
        </CanApprove>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('CanPublish', () => {
    it('renders for users with publish permission', () => {
      render(
        <CanPublish userRole={UserRole.ADMIN}>
          <TestComponent>Publish Content</TestComponent>
        </CanPublish>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('CanManageUsers', () => {
    it('renders for users with manage users permission', () => {
      render(
        <CanManageUsers userRole={UserRole.ADMIN}>
          <TestComponent>Manage Users Content</TestComponent>
        </CanManageUsers>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });

  describe('CanViewAuditTrail', () => {
    it('renders for users with view audit trail permission', () => {
      render(
        <CanViewAuditTrail userRole={UserRole.VIEWER}>
          <TestComponent>Audit Trail Content</TestComponent>
        </CanViewAuditTrail>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });
  });
});

describe('Higher-Order Component', () => {
  it('withRoleBasedAccess wraps component with role-based access', () => {
    const WrappedComponent = withRoleBasedAccess(TestButton, {
      userRole: UserRole.ADMIN,
      allowedRoles: UserRole.ADMIN,
    });

    render(<WrappedComponent />);

    expect(screen.getByTestId('test-button')).toBeInTheDocument();
  });

  it('withRoleBasedAccess hides component when access is denied', () => {
    const WrappedComponent = withRoleBasedAccess(TestButton, {
      userRole: UserRole.VIEWER,
      allowedRoles: UserRole.ADMIN,
      hideWhenDenied: true,
    });

    const { container } = render(<WrappedComponent />);

    expect(container.firstChild).toBeNull();
  });
});

describe('Hook', () => {
  const TestHookComponent = ({ userRole, allowedRoles, requiredPermissions }: any) => {
    const result = useRoleBasedAccess(userRole, allowedRoles, requiredPermissions);
    return <div data-testid="hook-result">{JSON.stringify(result)}</div>;
  };

  it('useRoleBasedAccess returns permission information', () => {
    render(
      <TestHookComponent 
        userRole={UserRole.ADMIN} 
        allowedRoles={UserRole.ADMIN} 
        requiredPermissions={WorkflowAction.EDIT} 
      />
    );

    const resultElement = screen.getByTestId('hook-result');
    expect(resultElement).toBeInTheDocument();
    
    const result = JSON.parse(resultElement.textContent || '{}');
    expect(result).toHaveProperty('hasAccess');
    expect(result).toHaveProperty('userRole');
    expect(result).toHaveProperty('allowedRoles');
    expect(result).toHaveProperty('requiredPermissions');
  });
});
