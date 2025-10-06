import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { WorkflowStateManager } from '@/lib/workflow-state-manager';
import { RolePermissions } from '@/lib/role-permissions';
import { AuditTrailIntegration } from '@/lib/audit-trail-integration';
import { ConcurrentEditingManager } from '@/lib/concurrent-editing-manager';
import { WorkflowState, WorkflowAction, UserRole } from '@/types/workflow';

// Validation schemas
const StateTransitionRequestSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  action: z.nativeEnum(WorkflowAction),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const StateTransitionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    productId: z.string(),
    previousState: z.nativeEnum(WorkflowState),
    newState: z.nativeEnum(WorkflowAction),
    timestamp: z.string(),
    auditTrailId: z.string().optional(),
  }).optional(),
  error: z.string().optional(),
});

// Initialize services
const workflowStateManager = new WorkflowStateManager();
const rolePermissions = new RolePermissions();
const auditTrailIntegration = new AuditTrailIntegration();
const concurrentEditingManager = new ConcurrentEditingManager();

/**
 * POST /api/workflow/state-transition
 * Handle product state transitions with validation and audit logging
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = StateTransitionRequestSchema.parse(body);
    
    const { productId, action, reason, metadata } = validatedData;

    // Extract user context from headers
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;
    const userName = request.headers.get('x-user-name') || 'Unknown User';

    if (!userId || !userRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User authentication required' 
        },
        { status: 401 }
      );
    }

    // Check if user has permission for this action
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      action,
      { productId, userId }
    );

    if (!hasPermission.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient permissions: ${hasPermission.reason}` 
        },
        { status: 403 }
      );
    }

    // Check for concurrent editing conflicts
    const isEditing = await concurrentEditingManager.isProductBeingEdited(productId);
    if (isEditing && isEditing.userId !== userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Product is currently being edited by ${isEditing.userName}` 
        },
        { status: 409 }
      );
    }

    // Get current product state (this would typically come from your database)
    // For now, we'll simulate getting the product
    const currentProduct = await getProductById(productId);
    if (!currentProduct) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Product not found' 
        },
        { status: 404 }
      );
    }

    // Validate state transition
    const transitionResult = await workflowStateManager.executeStateTransition(
      currentProduct,
      action,
      {
        userId,
        userName,
        reason,
        metadata,
      }
    );

    if (!transitionResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: transitionResult.error || 'State transition failed' 
        },
        { status: 400 }
      );
    }

    // Update product in database (this would be your actual database update)
    const updatedProduct = await updateProductState(productId, transitionResult.newState);

    // Create audit trail entry
    const auditResult = await auditTrailIntegration.createStateTransitionAuditEntry(
      productId,
      currentProduct.workflowState,
      transitionResult.newState,
      {
        userId,
        userName,
        action,
        reason,
        metadata,
      }
    );

    // Handle concurrent editing session
    if (action === WorkflowAction.EDIT) {
      await concurrentEditingManager.startEditingSession(productId, userId, userName);
    } else {
      await concurrentEditingManager.endEditingSession(productId, userId);
    }

    // Prepare response
    const response = StateTransitionResponseSchema.parse({
      success: true,
      message: `Product state successfully changed from ${currentProduct.workflowState} to ${transitionResult.newState}`,
      data: {
        productId,
        previousState: currentProduct.workflowState,
        newState: transitionResult.newState,
        timestamp: new Date().toISOString(),
        auditTrailId: auditResult?.id,
      },
    });

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('State transition error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflow/state-transition
 * Get available state transitions for a product
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (!productId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Product ID is required' 
        },
        { status: 400 }
      );
    }

    if (!userRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User authentication required' 
        },
        { status: 401 }
      );
    }

    // Get product current state
    const product = await getProductById(productId);
    if (!product) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Product not found' 
        },
        { status: 404 }
      );
    }

    // Get available transitions
    const availableTransitions = await workflowStateManager.getValidNextStates(
      product.workflowState,
      userRole
    );

    // Filter based on user permissions
    const allowedTransitions = [];
    for (const transition of availableTransitions) {
      const hasPermission = await rolePermissions.hasPermission(
        userRole,
        transition.action,
        { productId, userId: request.headers.get('x-user-id') || '' }
      );
      
      if (hasPermission.isValid) {
        allowedTransitions.push({
          action: transition.action,
          targetState: transition.targetState,
          requiresReason: transition.requiresReason,
          requiresConfirmation: transition.requiresConfirmation,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        currentState: product.workflowState,
        availableTransitions: allowedTransitions,
      },
    });

  } catch (error) {
    console.error('Get transitions error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Helper functions (these would typically interact with your database)
async function getProductById(productId: string) {
  // This is a placeholder - replace with your actual database query
  // For now, return a mock product
  return {
    id: productId,
    workflowState: WorkflowState.DRAFT,
    assignedReviewer: null,
    // ... other product fields
  };
}

async function updateProductState(productId: string, newState: WorkflowState) {
  // This is a placeholder - replace with your actual database update
  console.log(`Updating product ${productId} to state ${newState}`);
  return {
    id: productId,
    workflowState: newState,
    updatedAt: new Date().toISOString(),
  };
}
