import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RolePermissions } from '@/lib/role-permissions';
import { WorkflowStateManager } from '@/lib/workflow-state-manager';
import { AuditTrailIntegration } from '@/lib/audit-trail-integration';
import { withRoleBasedAccess } from '@/lib/api-middleware';
import { WorkflowState, WorkflowAction, UserRole } from '@/types/workflow';
import { Product } from '@/types/product';
import { productService } from '@/lib/product-service';
import { claimSku, SkuConflictError } from '@/lib/sku-series-service';
import '@/lib/audit-trail-store'; // persists audit entries to Firestore
import { addToTagLibrary, cleanTags } from '@/lib/tag-library';

// Validation schemas
const ProductUpdateSchema = z.object({
  id: z.string().nullable().optional(),
  name: z.any().nullable().optional(),
  sku: z.string().nullable().optional(),
  gtin: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  descriptionShort: z.any().nullable().optional(),
  descriptionLong: z.any().nullable().optional(),
  basicInfo: z.object({
    name: z.any().nullable().optional(),
    sku: z.string().nullable().optional(),
    gtin: z.string().nullable().optional(),
    internalId: z.string().nullable().optional(),
    manufacturer: z.string().nullable().optional(),
    supplierArticleNumber: z.string().nullable().optional(),
    descriptionShort: z.any().nullable().optional(),
    descriptionLong: z.any().nullable().optional(),
    brand: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    launchDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
  }).passthrough().nullable().optional(),
  attributesAndSpecs: z.object({
    categories: z.array(z.any()).nullable().optional(),
    properties: z.array(z.any()).nullable().optional(),
    technicalSpecs: z.array(z.any()).nullable().optional(),
    countryOfOrigin: z.string().nullable().optional(),
    maintenanceInstructions: z.any().nullable().optional(),
    warrantyInfo: z.any().nullable().optional(),
  }).passthrough().nullable().optional(),
  media: z.object({
    images: z.array(z.any()).nullable().optional(),
    videos: z.array(z.any()).nullable().optional(),
    models3d: z.array(z.any()).nullable().optional(),
    manuals: z.array(z.any()).nullable().optional(),
    certificates: z.array(z.any()).nullable().optional(),
  }).passthrough().nullable().optional(),
  marketingSEO: z.object({
    seoTitle: z.any().nullable().optional(),
    seoDescription: z.any().nullable().optional(),
    keywords: z.array(z.string()).nullable().optional(),
    marketingTexts: z.array(z.any()).nullable().optional(),
    campaignCodes: z.array(z.any()).nullable().optional(),
  }).passthrough().nullable().optional(),
  pricingAndStock: z.object({
    standardPrice: z.array(z.any()).nullable().optional(),
    salePrice: z.array(z.any()).nullable().optional(),
    costPrice: z.array(z.any()).nullable().optional(),
  }).passthrough().nullable().optional(),
  logistics: z.object({
    weightKg: z.number().nullable().optional(),
    lengthCm: z.number().nullable().optional(),
    widthCm: z.number().nullable().optional(),
    heightCm: z.number().nullable().optional(),
    packagingType: z.string().nullable().optional(),
  }).passthrough().nullable().optional(),
  compliance: z.object({
    isHazardousGoods: z.boolean().nullable().optional(),
    hazardousGoodsUnCode: z.string().nullable().optional(),
    certifications: z.array(z.string()).nullable().optional(),
    ageRestriction: z.number().nullable().optional(),
  }).passthrough().nullable().optional(),
  sustainability: z.object({
    recyclingInfo: z.any().nullable().optional(),
    carbonFootprintKg: z.number().nullable().optional(),
  }).passthrough().nullable().optional(),
  relations: z.any().nullable().optional(),
  localizationNorway: z.any().nullable().optional(),
  aiSummary: z.any().nullable().optional(),
  qualityMetrics: z.any().nullable().optional(),
  options: z.array(z.any()).nullable().optional(),
  variants: z.array(z.any()).nullable().optional(),
  workflowState: z.any().nullable().optional(),
  assignedReviewer: z.union([
    z.object({
      userId: z.string().optional(),
      userName: z.string().optional(),
      userRole: z.any().optional(),
    }).passthrough(),
    z.string(),
  ]).nullable().optional(),
  workflowHistory: z.array(z.any()).nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
}).passthrough();

// Initialize services
const rolePermissions = new RolePermissions();
const workflowStateManager = new WorkflowStateManager();
const auditTrailIntegration = new AuditTrailIntegration(workflowStateManager, rolePermissions);

/**
 * GET /api/products/[id]
 * Get a specific product by ID
 */
async function getProduct(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Extract user context from middleware
    const user = (request as any).user;
    const userId = user?.userId;
    const userRole = user?.userRole as UserRole;

    if (!userId || !userRole) {
      return NextResponse.json(
        {
          success: false,
          error: 'User authentication required'
        },
        { status: 401 }
      );
    }

    // Find product via service
    const product = await productService.getProductById(id);
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
    const context = {
      userId,
      userRole,
      userEmail: '', // Mock email as it's not available in headers
      productId: id,
      resourceType: 'product' as const
    };

    const hasPermission = await rolePermissions.hasPermission(
      context,
      WorkflowAction.VIEW_ALL_PRODUCTS
    );

    if (!hasPermission.hasPermission) {
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
async function updateProduct(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ProductUpdateSchema.parse(body);
    console.log('Product Update Request:', {
      id,
      workflowState: validatedData.workflowState,
      assignedReviewer: validatedData.assignedReviewer
    });

    // Extract user context from middleware
    const user = (request as any).user;
    const userId = user?.userId;
    const userRole = user?.userRole as UserRole;

    if (!userId || !userRole) {
      return NextResponse.json(
        {
          success: false,
          error: 'User authentication required'
        },
        { status: 401 }
      );
    }

    // Find existing product via service
    const existingProduct = await productService.getProductById(id);
    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found'
        },
        { status: 404 }
      );
    }

    // Check if user has permission to edit this product
    const context = {
      userId,
      userRole,
      userEmail: '',
      productId: id,
      resourceType: 'product' as const
    };

    const hasPermission = await rolePermissions.hasPermission(
      context,
      WorkflowAction.EDIT
    );

    if (!hasPermission.hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient permissions: ${hasPermission.reason}`
        },
        { status: 403 }
      );
    }

    // Review decisions: only the assigned reviewer (or an admin) may approve/reject,
    // and rejecting (back to draft) requires a comment that ends up in the audit trail.
    const fromState = existingProduct.workflowState || WorkflowState.DRAFT;
    const isStateChange = !!validatedData.workflowState && validatedData.workflowState !== fromState;
    const transitionComment = typeof (validatedData as any).reason === 'string' ? (validatedData as any).reason.trim() : '';
    const isApproval = isStateChange && fromState === WorkflowState.REVIEW && validatedData.workflowState === WorkflowState.APPROVED;
    const isRejection = isStateChange && fromState === WorkflowState.REVIEW && validatedData.workflowState === WorkflowState.DRAFT;
    const userName = (request as any).user?.userName || 'Unknown User';

    if ((isApproval || isRejection) && userRole !== UserRole.ADMIN && existingProduct.assignedReviewer?.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only the assigned reviewer or an admin can approve or reject this product' },
        { status: 403 }
      );
    }
    if (isRejection && !transitionComment) {
      return NextResponse.json(
        { success: false, error: 'A comment is required when rejecting a product' },
        { status: 400 }
      );
    }
    const historyAction = isApproval ? 'APPROVE' : isRejection ? 'REJECT' : 'UPDATE';
    const historyReason = transitionComment || (isApproval ? 'Product approved' : 'Product updated');

    // Check if workflow state change is valid
    if (validatedData.workflowState && validatedData.workflowState !== existingProduct.workflowState) {
      const transitionRequest = {
        productId: existingProduct.id,
        fromState: existingProduct.workflowState || WorkflowState.DRAFT,
        toState: validatedData.workflowState,
        userId,
        userRole,
        reason: historyReason,
        assignedReviewer: validatedData.assignedReviewer?.userId,
      };

      const transitionResult = await workflowStateManager.executeStateTransition(
        transitionRequest,
        existingProduct as any
      );

      console.log('Transition Result:', transitionResult);

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

    // Server-owned fields must never come from the client: `id` would redirect the
    // write to another product, and history/timestamps are part of the audit trail.
    const {
      id: _ignoredId,
      workflowHistory: _ignoredHistory,
      createdAt: _ignoredCreatedAt,
      updatedAt: _ignoredUpdatedAt,
      ...clientData
    } = validatedData as typeof validatedData & Record<string, unknown>;

    // Update product object (merging logic)
    const updatedProduct: Product = {
      ...existingProduct,
      ...clientData,
      id,
      createdAt: existingProduct.createdAt,
      workflowHistory: existingProduct.workflowHistory || [],
      tags: Array.isArray((clientData as any).tags) ? cleanTags((clientData as any).tags) : existingProduct.tags,
      basicInfo: {
        ...existingProduct.basicInfo,
        ...validatedData.basicInfo,
        status: validatedData.basicInfo?.status as any || existingProduct.basicInfo.status,
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
        standardPrice: (validatedData.pricingAndStock?.standardPrice as any) || existingProduct.pricingAndStock?.standardPrice || [],
        salePrice: (validatedData.pricingAndStock?.salePrice as any) || existingProduct.pricingAndStock?.salePrice || [],
        costPrice: (validatedData.pricingAndStock?.costPrice as any) || existingProduct.pricingAndStock?.costPrice || [],
      },
      logistics: validatedData.logistics !== undefined
        ? { ...existingProduct.logistics, ...validatedData.logistics }
        : existingProduct.logistics,
      compliance: validatedData.compliance !== undefined
        ? { ...existingProduct.compliance, ...validatedData.compliance }
        : existingProduct.compliance,
      sustainability: validatedData.sustainability !== undefined
        ? { ...existingProduct.sustainability, ...validatedData.sustainability }
        : existingProduct.sustainability,
      aiSummary: validatedData.aiSummary !== undefined
        ? validatedData.aiSummary
        : existingProduct.aiSummary,
      assignedReviewer: validatedData.assignedReviewer ? {
        userId: validatedData.assignedReviewer.userId,
        userName: validatedData.assignedReviewer.userName,
        userRole: validatedData.assignedReviewer.userRole as UserRole
      } : existingProduct.assignedReviewer,
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
          action: historyAction,
          fromState: existingProduct.workflowState || WorkflowState.DRAFT,
          toState: validatedData.workflowState,
          userId,
          userName: (request as any).user?.userName || 'Unknown User',
          timestamp: new Date().toISOString(),
          reason: historyReason,
        }
      ];
    }

    // Update in storage via service
    // Note: We are passing the fully merged object as `updateProduct` currently overwrites/merges.
    // Ideally we'd use `updateProduct(id, validatedData)` but our service takes `Partial<Product>`.
    // Passing `updatedProduct` ensures all nested merges we did above are preserved.
    if (updatedProduct.basicInfo.sku !== existingProduct.basicInfo.sku) {
      await claimSku(updatedProduct.basicInfo.sku, id);
    }
    await productService.updateProduct(id, updatedProduct);
    await addToTagLibrary(updatedProduct.tags);

    // Approve/reject decisions get their own audit entry, including the reviewer's comment
    if (isStateChange) {
      auditTrailIntegration.createStateTransitionAuditEntry(
        userId,
        userRole,
        (request as any).user?.email || '',
        id,
        fromState,
        validatedData.workflowState as WorkflowState,
        isRejection ? `Rejected: ${transitionComment}` : historyReason,
        { userName, decision: historyAction }
      );
    }

    // Create audit trail entry
    await auditTrailIntegration.createProductUpdateAuditEntry(
      userId,
      userRole,
      '', // Email not available in headers
      id,
      existingProduct,
      updatedProduct,
      'Product updated',
      {
        userName: (request as any).user?.userName || 'Unknown User',
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });

  } catch (error) {
    console.error('Update product error:', error);

    if (error instanceof SkuConflictError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }

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
async function deleteProduct(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Extract user context from middleware
    const user = (request as any).user;
    const userId = user?.userId;
    const userRole = user?.userRole as UserRole;

    if (!userId || !userRole) {
      return NextResponse.json(
        {
          success: false,
          error: 'User authentication required'
        },
        { status: 401 }
      );
    }

    // Find product via service (to check permission and for audit log)
    const product = await productService.getProductById(id);
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found'
        },
        { status: 404 }
      );
    }

    // Check if user has permission to delete this product
    const context = {
      userId,
      userRole,
      userEmail: '',
      productId: id,
      resourceType: 'product' as const
    };

    const hasPermission = await rolePermissions.hasPermission(
      context,
      WorkflowAction.DELETE
    );

    if (!hasPermission.hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient permissions: ${hasPermission.reason}`
        },
        { status: 403 }
      );
    }

    // Remove from storage via service
    await productService.deleteProduct(id);

    // Create audit trail entry
    await auditTrailIntegration.createProductDeleteAuditEntry(
      userId,
      userRole,
      '', // Email not available in headers
      id,
      product,
      'Product deleted',
      {
        userName: (request as any).user?.userName || 'Unknown User',
      }
    );

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

// Export functions with middleware
export const GET = withRoleBasedAccess(getProduct, WorkflowAction.VIEW_ALL_PRODUCTS);
export const PUT = withRoleBasedAccess(updateProduct, WorkflowAction.EDIT);
export const DELETE = withRoleBasedAccess(deleteProduct, WorkflowAction.DELETE);
