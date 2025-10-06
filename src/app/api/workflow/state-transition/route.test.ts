import { NextRequest } from 'next/server';
import { WorkflowState, WorkflowAction, UserRole } from '@/types/workflow';

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: jest.fn().mockResolvedValue(data),
      status: init?.status || 200,
    })),
  },
}));

// Mock the services
jest.mock('@/lib/workflow-state-manager');
jest.mock('@/lib/role-permissions');
jest.mock('@/lib/audit-trail-integration');
jest.mock('@/lib/concurrent-editing-manager');

// Import the route handlers after mocking
const { POST, GET } = require('./route');

describe('/api/workflow/state-transition', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock request with headers
    mockRequest = {
      headers: {
        get: jest.fn((key: string) => {
          const headers: Record<string, string> = {
            'x-user-id': 'user-123',
            'x-user-role': UserRole.REVIEWER,
            'x-user-name': 'John Doe',
          };
          return headers[key] || null;
        }),
      },
      json: jest.fn(),
    } as any;
  });

  describe('POST /api/workflow/state-transition', () => {
    it('should successfully transition product state', async () => {
      const requestBody = {
        productId: 'product-123',
        action: WorkflowAction.APPROVE,
        reason: 'Product meets quality standards',
        metadata: { qualityScore: 95 },
      };

      mockRequest.json.mockResolvedValue(requestBody);

      // Mock successful state transition
      const mockWorkflowStateManager = require('@/lib/workflow-state-manager').WorkflowStateManager;
      const mockInstance = {
        executeStateTransition: jest.fn().mockResolvedValue({
          success: true,
          newState: WorkflowState.APPROVED,
        }),
      };
      mockWorkflowStateManager.mockImplementation(() => mockInstance);

      // Mock permission check
      const mockRolePermissions = require('@/lib/role-permissions').RolePermissions;
      const mockPermissionInstance = {
        hasPermission: jest.fn().mockResolvedValue({
          isValid: true,
          reason: 'Permission granted',
        }),
      };
      mockRolePermissions.mockImplementation(() => mockPermissionInstance);
      
      // Mock the static instance
      require('@/lib/role-permissions').rolePermissions = mockPermissionInstance;

      // Mock audit trail integration
      const mockAuditTrailIntegration = require('@/lib/audit-trail-integration').AuditTrailIntegration;
      const mockAuditInstance = {
        createStateTransitionAuditEntry: jest.fn().mockResolvedValue({
          id: 'audit-123',
        }),
      };
      mockAuditTrailIntegration.mockImplementation(() => mockAuditInstance);

      // Mock concurrent editing manager
      const mockConcurrentEditingManager = require('@/lib/concurrent-editing-manager').ConcurrentEditingManager;
      const mockConcurrentInstance = {
        isProductBeingEdited: jest.fn().mockResolvedValue(false),
        startEditingSession: jest.fn(),
        endEditingSession: jest.fn(),
      };
      mockConcurrentEditingManager.mockImplementation(() => mockConcurrentInstance);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.productId).toBe('product-123');
      expect(responseData.data.previousState).toBe(WorkflowState.DRAFT);
      expect(responseData.data.newState).toBe(WorkflowState.APPROVED);
    });

    it('should return 401 when user is not authenticated', async () => {
      const requestBody = {
        productId: 'product-123',
        action: WorkflowAction.APPROVE,
      };

      mockRequest.json.mockResolvedValue(requestBody);
      mockRequest.headers = new Map(); // No auth headers

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('User authentication required');
    });

    it('should return 403 when user lacks permissions', async () => {
      const requestBody = {
        productId: 'product-123',
        action: WorkflowAction.APPROVE,
      };

      mockRequest.json.mockResolvedValue(requestBody);

      // Mock permission check failure
      const mockRolePermissions = require('@/lib/role-permissions').RolePermissions;
      const mockPermissionInstance = {
        hasPermission: jest.fn().mockResolvedValue({
          isValid: false,
          reason: 'Insufficient role permissions',
        }),
      };
      mockRolePermissions.mockImplementation(() => mockPermissionInstance);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('Insufficient permissions');
    });

    it('should return 409 when product is being edited by another user', async () => {
      const requestBody = {
        productId: 'product-123',
        action: WorkflowAction.APPROVE,
      };

      mockRequest.json.mockResolvedValue(requestBody);

      // Mock permission check success
      const mockRolePermissions = require('@/lib/role-permissions').RolePermissions;
      const mockPermissionInstance = {
        hasPermission: jest.fn().mockResolvedValue({
          isValid: true,
          reason: 'Permission granted',
        }),
      };
      mockRolePermissions.mockImplementation(() => mockPermissionInstance);

      // Mock concurrent editing conflict
      const mockConcurrentEditingManager = require('@/lib/concurrent-editing-manager').ConcurrentEditingManager;
      const mockConcurrentInstance = {
        isProductBeingEdited: jest.fn().mockResolvedValue({
          userId: 'other-user',
          userName: 'Jane Smith',
        }),
      };
      mockConcurrentEditingManager.mockImplementation(() => mockConcurrentInstance);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(409);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('currently being edited by Jane Smith');
    });

    it('should return 400 for invalid request data', async () => {
      const requestBody = {
        // Missing required fields
        action: WorkflowAction.APPROVE,
      };

      mockRequest.json.mockResolvedValue(requestBody);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid request data');
    });

    it('should return 400 when state transition fails', async () => {
      const requestBody = {
        productId: 'product-123',
        action: WorkflowAction.APPROVE,
      };

      mockRequest.json.mockResolvedValue(requestBody);

      // Mock permission check success
      const mockRolePermissions = require('@/lib/role-permissions').RolePermissions;
      const mockPermissionInstance = {
        hasPermission: jest.fn().mockResolvedValue({
          isValid: true,
          reason: 'Permission granted',
        }),
      };
      mockRolePermissions.mockImplementation(() => mockPermissionInstance);

      // Mock concurrent editing check
      const mockConcurrentEditingManager = require('@/lib/concurrent-editing-manager').ConcurrentEditingManager;
      const mockConcurrentInstance = {
        isProductBeingEdited: jest.fn().mockResolvedValue(false),
      };
      mockConcurrentEditingManager.mockImplementation(() => mockConcurrentInstance);

      // Mock failed state transition
      const mockWorkflowStateManager = require('@/lib/workflow-state-manager').WorkflowStateManager;
      const mockInstance = {
        executeStateTransition: jest.fn().mockResolvedValue({
          success: false,
          error: 'Invalid state transition',
        }),
      };
      mockWorkflowStateManager.mockImplementation(() => mockInstance);

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid state transition');
    });
  });

  describe('GET /api/workflow/state-transition', () => {
    it('should return available transitions for a product', async () => {
      const mockRequest = {
        url: 'https://example.com/api/workflow/state-transition?productId=product-123',
        headers: {
          get: jest.fn((key: string) => {
            const headers: Record<string, string> = {
              'x-user-id': 'user-123',
              'x-user-role': UserRole.REVIEWER,
            };
            return headers[key] || null;
          }),
        },
      } as any;

      // Mock workflow state manager
      const mockWorkflowStateManager = require('@/lib/workflow-state-manager').WorkflowStateManager;
      const mockInstance = {
        getValidNextStates: jest.fn().mockResolvedValue([
          {
            action: WorkflowAction.APPROVE,
            targetState: WorkflowState.APPROVED,
            requiresReason: false,
            requiresConfirmation: true,
          },
          {
            action: WorkflowAction.REJECT,
            targetState: WorkflowState.REJECTED,
            requiresReason: true,
            requiresConfirmation: true,
          },
        ]),
      };
      mockWorkflowStateManager.mockImplementation(() => mockInstance);

      // Mock role permissions
      const mockRolePermissions = require('@/lib/role-permissions').RolePermissions;
      const mockPermissionInstance = {
        hasPermission: jest.fn().mockResolvedValue({
          isValid: true,
          reason: 'Permission granted',
        }),
      };
      mockRolePermissions.mockImplementation(() => mockPermissionInstance);

      const response = await GET(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.currentState).toBe(WorkflowState.DRAFT);
      expect(responseData.data.availableTransitions).toHaveLength(2);
      expect(responseData.data.availableTransitions[0].action).toBe(WorkflowAction.APPROVE);
    });

    it('should return 400 when productId is missing', async () => {
      const mockRequest = {
        url: 'https://example.com/api/workflow/state-transition',
        headers: {
          get: jest.fn((key: string) => {
            const headers: Record<string, string> = {
              'x-user-id': 'user-123',
              'x-user-role': UserRole.REVIEWER,
            };
            return headers[key] || null;
          }),
        },
      } as any;

      const response = await GET(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Product ID is required');
    });

    it('should return 401 when user is not authenticated', async () => {
      const mockRequest = {
        url: 'https://example.com/api/workflow/state-transition?productId=product-123',
        headers: {
          get: jest.fn(() => null), // No auth headers
        },
      } as any;

      const response = await GET(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('User authentication required');
    });

    it('should filter transitions based on user permissions', async () => {
      const mockRequest = {
        url: 'https://example.com/api/workflow/state-transition?productId=product-123',
        headers: {
          get: jest.fn((key: string) => {
            const headers: Record<string, string> = {
              'x-user-id': 'user-123',
              'x-user-role': UserRole.VIEWER,
            };
            return headers[key] || null;
          }),
        },
      } as any;

      // Mock workflow state manager
      const mockWorkflowStateManager = require('@/lib/workflow-state-manager').WorkflowStateManager;
      const mockInstance = {
        getValidNextStates: jest.fn().mockResolvedValue([
          {
            action: WorkflowAction.APPROVE,
            targetState: WorkflowState.APPROVED,
            requiresReason: false,
            requiresConfirmation: true,
          },
          {
            action: WorkflowAction.REJECT,
            targetState: WorkflowState.REJECTED,
            requiresReason: true,
            requiresConfirmation: true,
          },
        ]),
      };
      mockWorkflowStateManager.mockImplementation(() => mockInstance);

      // Mock role permissions - viewer should not have approve/reject permissions
      const mockRolePermissions = require('@/lib/role-permissions').RolePermissions;
      const mockPermissionInstance = {
        hasPermission: jest.fn().mockResolvedValue({
          isValid: false,
          reason: 'Insufficient permissions',
        }),
      };
      mockRolePermissions.mockImplementation(() => mockPermissionInstance);

      const response = await GET(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.availableTransitions).toHaveLength(0);
    });
  });
});
