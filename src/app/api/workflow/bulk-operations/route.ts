import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { WorkflowStateManager } from '@/lib/workflow-state-manager';
import { RolePermissions } from '@/lib/role-permissions';
import { AuditTrailBulkOperationsService } from '@/lib/audit-trail-bulk-operations';
import { WorkflowState, WorkflowAction, UserRole } from '@/types/workflow';

// Validation schemas
const BulkOperationRequestSchema = z.object({
  operation: z.object({
    action: z.nativeEnum(WorkflowAction),
    reason: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
  filters: z.object({
    productIds: z.array(z.string()).optional(),
    states: z.array(z.nativeEnum(WorkflowState)).optional(),
    assignedReviewer: z.string().optional(),
    dateRange: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
  }).optional(),
  options: z.object({
    batchSize: z.number().min(1).max(100).default(10),
    skipValidation: z.boolean().default(false),
    dryRun: z.boolean().default(false),
  }).optional(),
});

const BulkOperationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    operationId: z.string(),
    totalItems: z.number(),
    processedItems: z.number(),
    successfulItems: z.number(),
    failedItems: z.number(),
    progress: z.object({
      percentage: z.number(),
      currentBatch: z.number(),
      totalBatches: z.number(),
    }),
    results: z.array(z.object({
      productId: z.string(),
      success: z.boolean(),
      error: z.string().optional(),
      previousState: z.nativeEnum(WorkflowState).optional(),
      newState: z.nativeEnum(WorkflowState).optional(),
    })),
    auditTrailId: z.string().optional(),
  }).optional(),
  error: z.string().optional(),
});

// Initialize services
const workflowStateManager = new WorkflowStateManager();
const rolePermissions = new RolePermissions();
const bulkOperationsService = new AuditTrailBulkOperationsService();

// In-memory operation tracking (in production, use Redis or database)
const activeOperations = new Map<string, any>();

/**
 * POST /api/workflow/bulk-operations
 * Execute bulk operations on multiple products
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = BulkOperationRequestSchema.parse(body);
    
    const { operation, filters, options = {} } = validatedData;

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

    // Check if user has permission for bulk operations
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.BULK_OPERATIONS,
      { userId }
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

    // Generate operation ID
    const operationId = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get products to process
    const products = await getProductsForBulkOperation(filters);
    
    if (products.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No products found matching the specified filters' 
        },
        { status: 400 }
      );
    }

    // Check if operation would exceed limits
    if (products.length > 1000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Bulk operation exceeds maximum limit of 1000 products' 
        },
        { status: 400 }
      );
    }

    // Create bulk operation template
    const bulkOperation = await bulkOperationsService.createBulkOperation({
      operation: {
        action: operation.action,
        reason: operation.reason,
        metadata: operation.metadata,
      },
      filters: filters || {},
      options: {
        batchSize: options.batchSize || 10,
        skipValidation: options.skipValidation || false,
        dryRun: options.dryRun || false,
      },
      createdBy: {
        userId,
        userName,
        userRole,
      },
    });

    // If dry run, return preview without executing
    if (options.dryRun) {
      return NextResponse.json({
        success: true,
        message: 'Dry run completed',
        data: {
          operationId,
          totalItems: products.length,
          processedItems: 0,
          successfulItems: 0,
          failedItems: 0,
          progress: {
            percentage: 0,
            currentBatch: 0,
            totalBatches: Math.ceil(products.length / (options.batchSize || 10)),
          },
          results: products.map(product => ({
            productId: product.id,
            success: true,
            previousState: product.workflowState,
            newState: getTargetState(operation.action, product.workflowState),
          })),
        },
      });
    }

    // Start bulk operation asynchronously
    executeBulkOperationAsync(operationId, bulkOperation.id, products, operation, {
      userId,
      userName,
      userRole,
    });

    // Return immediate response
    const response = BulkOperationResponseSchema.parse({
      success: true,
      message: `Bulk operation started for ${products.length} products`,
      data: {
        operationId,
        totalItems: products.length,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        progress: {
          percentage: 0,
          currentBatch: 0,
          totalBatches: Math.ceil(products.length / (options.batchSize || 10)),
        },
        results: [],
      },
    });

    return NextResponse.json(response, { status: 202 }); // 202 Accepted

  } catch (error) {
    console.error('Bulk operation error:', error);

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
 * GET /api/workflow/bulk-operations
 * Get status of bulk operations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get('operationId');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (!userRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User authentication required' 
        },
        { status: 401 }
      );
    }

    // Check if user has permission to view bulk operations
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.VIEW_BULK_OPERATIONS,
      {}
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

    if (operationId) {
      // Get specific operation status
      const operation = activeOperations.get(operationId);
      if (!operation) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Operation not found' 
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: operation,
      });
    } else {
      // Get all active operations
      const operations = Array.from(activeOperations.values());
      return NextResponse.json({
        success: true,
        data: {
          operations,
          total: operations.length,
        },
      });
    }

  } catch (error) {
    console.error('Get bulk operations error:', error);
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
 * DELETE /api/workflow/bulk-operations
 * Cancel a bulk operation
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationId = searchParams.get('operationId');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (!operationId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Operation ID is required' 
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

    // Check if user has permission to cancel bulk operations
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.CANCEL_BULK_OPERATIONS,
      {}
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

    const operation = activeOperations.get(operationId);
    if (!operation) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Operation not found' 
        },
        { status: 404 }
      );
    }

    // Cancel the operation
    operation.cancelled = true;
    operation.cancelledAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: 'Bulk operation cancelled successfully',
    });

  } catch (error) {
    console.error('Cancel bulk operation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Helper functions
async function getProductsForBulkOperation(filters: any) {
  // This is a placeholder - replace with your actual database query
  // For now, return mock products
  return [
    { id: 'product-1', workflowState: WorkflowState.DRAFT },
    { id: 'product-2', workflowState: WorkflowState.REVIEW },
    { id: 'product-3', workflowState: WorkflowState.APPROVED },
  ];
}

function getTargetState(action: WorkflowAction, currentState: WorkflowState): WorkflowState {
  // Map actions to target states
  const stateMap: Record<WorkflowAction, Record<WorkflowState, WorkflowState>> = {
    [WorkflowAction.SUBMIT_FOR_REVIEW]: {
      [WorkflowState.DRAFT]: WorkflowState.REVIEW,
    },
    [WorkflowAction.APPROVE]: {
      [WorkflowState.REVIEW]: WorkflowState.APPROVED,
    },
    [WorkflowAction.REJECT]: {
      [WorkflowState.REVIEW]: WorkflowState.REJECTED,
    },
    [WorkflowAction.PUBLISH]: {
      [WorkflowState.APPROVED]: WorkflowState.PUBLISHED,
    },
    [WorkflowAction.REVERT_TO_DRAFT]: {
      [WorkflowState.REJECTED]: WorkflowState.DRAFT,
    },
    // Add other actions as needed
  } as any;

  return stateMap[action]?.[currentState] || currentState;
}

async function executeBulkOperationAsync(
  operationId: string,
  bulkOperationId: string,
  products: any[],
  operation: any,
  user: { userId: string; userName: string; userRole: UserRole }
) {
  const batchSize = 10;
  const totalBatches = Math.ceil(products.length / batchSize);
  let processedItems = 0;
  let successfulItems = 0;
  let failedItems = 0;
  const results: any[] = [];

  // Initialize operation tracking
  activeOperations.set(operationId, {
    operationId,
    bulkOperationId,
    status: 'running',
    totalItems: products.length,
    processedItems: 0,
    successfulItems: 0,
    failedItems: 0,
    progress: {
      percentage: 0,
      currentBatch: 0,
      totalBatches,
    },
    results: [],
    startedAt: new Date().toISOString(),
  });

  try {
    // Process products in batches
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * batchSize;
      const endIndex = Math.min(startIndex + batchSize, products.length);
      const batch = products.slice(startIndex, endIndex);

      // Process batch
      for (const product of batch) {
        try {
          // Execute state transition
          const transitionResult = await workflowStateManager.executeStateTransition(
            product,
            operation.action,
            {
              userId: user.userId,
              userName: user.userName,
              reason: operation.reason,
              metadata: operation.metadata,
            }
          );

          if (transitionResult.success) {
            // Update product in database
            await updateProductState(product.id, transitionResult.newState);
            
            // Create audit trail entry
            await bulkOperationsService.logBulkOperationItem(
              bulkOperationId,
              product.id,
              product.workflowState,
              transitionResult.newState,
              {
                userId: user.userId,
                userName: user.userName,
                action: operation.action,
                reason: operation.reason,
              }
            );

            successfulItems++;
            results.push({
              productId: product.id,
              success: true,
              previousState: product.workflowState,
              newState: transitionResult.newState,
            });
          } else {
            failedItems++;
            results.push({
              productId: product.id,
              success: false,
              error: transitionResult.error || 'Transition failed',
            });
          }
        } catch (error) {
          failedItems++;
          results.push({
            productId: product.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        processedItems++;
      }

      // Update operation progress
      const operation = activeOperations.get(operationId);
      if (operation) {
        operation.processedItems = processedItems;
        operation.successfulItems = successfulItems;
        operation.failedItems = failedItems;
        operation.progress = {
          percentage: Math.round((processedItems / products.length) * 100),
          currentBatch: batchIndex + 1,
          totalBatches,
        };
        operation.results = results;
      }

      // Small delay between batches to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Mark operation as completed
    const operation = activeOperations.get(operationId);
    if (operation) {
      operation.status = 'completed';
      operation.completedAt = new Date().toISOString();
    }

  } catch (error) {
    // Mark operation as failed
    const operation = activeOperations.get(operationId);
    if (operation) {
      operation.status = 'failed';
      operation.error = error instanceof Error ? error.message : 'Unknown error';
      operation.failedAt = new Date().toISOString();
    }
  }
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
