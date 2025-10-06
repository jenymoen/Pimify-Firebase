import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RolePermissions } from '@/lib/role-permissions';
import { WorkflowStateManager } from '@/lib/workflow-state-manager';
import { AuditTrailIntegration } from '@/lib/audit-trail-integration';
import { WorkflowState, WorkflowAction, UserRole } from '@/types/workflow';
import { Product } from '@/types/product';

// Validation schemas
const ProductUpdateSchema = z.object({
  basicInfo: z.object({
    name: z.any().optional(),
    descriptionShort: z.any().optional(),
    descriptionLong: z.any().optional(),
    brand: z.string().optional(),
    status: z.string().optional(),
  }).optional(),
  attributesAndSpecs: z.object({
    categories: z.array(z.string()).optional(),
    properties: z.array(z.any()).optional(),
    technicalSpecs: z.array(z.any()).optional(),
  }).optional(),
  media: z.object({
    images: z.array(z.any()).optional(),
  }).optional(),
  marketingSEO: z.object({
    seoTitle: z.any().optional(),
    seoDescription: z.any().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
  pricingAndStock: z.object({
    standardPrice: z.array(z.any()).optional(),
    salePrice: z.array(z.any()).optional(),
    costPrice: z.array(z.any()).optional(),
  }).optional(),
  options: z.array(z.any()).optional(),
  variants: z.array(z.any()).optional(),
  workflowState: z.nativeEnum(WorkflowState).optional(),
  assignedReviewer: z.object({
    userId: z.string(),
    userName: z.string(),
    userRole: z.nativeEnum(UserRole),
  }).optional(),
});

// Initialize services
const rolePermissions = new RolePermissions();
const workflowStateManager = new WorkflowStateManager();
const auditTrailIntegration = new AuditTrailIntegration();

// Mock product storage (in production, use database)
const products: Product[] = [];

/**
 * GET /api/products/[id]
 * Get a specific product by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Extract user context from headers
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (!userId || !userRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User authentication required' 
        },
        { status: 401 }
      );
    }

    // Find product
    const product = products.find(p => p.id === id);
    if (!product) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Product not found' 
        },
        { status: 404 }
      );
    }

    // Check if user has permission to view this product
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.VIEW_ALL_PRODUCTS,
      { userId, productId: id }
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

    return NextResponse.json({
      success: true,
      data: product,
    });

  } catch (error) {
    console.error('Get product error:', error);
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
 * PUT /api/products/[id]
 * Update a specific product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ProductUpdateSchema.parse(body);
    
    // Extract user context from headers
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (!userId || !userRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User authentication required' 
        },
        { status: 401 }
      );
    }

    // Find product
    const productIndex = products.findIndex(p => p.id === id);
    if (productIndex === -1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Product not found' 
        },
        { status: 404 }
      );
    }

    const existingProduct = products[productIndex];

    // Check if user has permission to edit this product
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.EDIT,
      { userId, productId: id }
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

    // Check if workflow state change is valid
    if (validatedData.workflowState && validatedData.workflowState !== existingProduct.workflowState) {
      const transitionResult = await workflowStateManager.executeStateTransition(
        existingProduct,
        WorkflowAction.EDIT,
        {
          userId,
          userName: request.headers.get('x-user-name') || 'Unknown User',
          reason: 'Product updated',
        }
      );

      if (!transitionResult.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid workflow state transition: ${transitionResult.error}` 
          },
          { status: 400 }
        );
      }
    }

    // Update product
    const updatedProduct: Product = {
      ...existingProduct,
      ...validatedData,
      basicInfo: {
        ...existingProduct.basicInfo,
        ...validatedData.basicInfo,
      },
      attributesAndSpecs: {
        ...existingProduct.attributesAndSpecs,
        ...validatedData.attributesAndSpecs,
      },
      media: {
        ...existingProduct.media,
        ...validatedData.media,
      },
      marketingSEO: {
        ...existingProduct.marketingSEO,
        ...validatedData.marketingSEO,
      },
      pricingAndStock: {
        ...existingProduct.pricingAndStock,
        ...validatedData.pricingAndStock,
      },
      options: validatedData.options !== undefined ? validatedData.options : existingProduct.options,
      variants: validatedData.variants !== undefined ? validatedData.variants : existingProduct.variants,
      updatedAt: new Date().toISOString(),
    };

    // Add workflow history entry if state changed
    if (validatedData.workflowState && validatedData.workflowState !== existingProduct.workflowState) {
      updatedProduct.workflowHistory = [
        ...(existingProduct.workflowHistory || []),
        {
          id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          action: 'UPDATE',
          fromState: existingProduct.workflowState || WorkflowState.DRAFT,
          toState: validatedData.workflowState,
          userId,
          userName: request.headers.get('x-user-name') || 'Unknown User',
          timestamp: new Date().toISOString(),
          reason: 'Product updated',
        }
      ];
    }

    // Update in storage
    products[productIndex] = updatedProduct;

    // Create audit trail entry
    await auditTrailIntegration.createProductUpdateAuditEntry(
      id,
      existingProduct,
      updatedProduct,
      {
        userId,
        userName: request.headers.get('x-user-name') || 'Unknown User',
        reason: 'Product updated',
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });

  } catch (error) {
    console.error('Update product error:', error);

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
 * DELETE /api/products/[id]
 * Delete a specific product
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Extract user context from headers
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') as UserRole;

    if (!userId || !userRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User authentication required' 
        },
        { status: 401 }
      );
    }

    // Find product
    const productIndex = products.findIndex(p => p.id === id);
    if (productIndex === -1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Product not found' 
        },
        { status: 404 }
      );
    }

    const product = products[productIndex];

    // Check if user has permission to delete this product
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.DELETE,
      { userId, productId: id }
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

    // Remove from storage
    products.splice(productIndex, 1);

    // Create audit trail entry
    await auditTrailIntegration.createProductDeletedAuditEntry(id, {
      userId,
      userName: request.headers.get('x-user-name') || 'Unknown User',
      productData: product,
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    });

  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
