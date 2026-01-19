import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RolePermissions } from '@/lib/role-permissions';
import { WorkflowStateManager } from '@/lib/workflow-state-manager';
import { AuditTrailIntegration } from '@/lib/audit-trail-integration';
import { withRoleBasedAccess, withValidation } from '@/lib/api-middleware';
import { WorkflowState, WorkflowAction, UserRole } from '@/types/workflow';
import { Product } from '@/types/product';
import { productService } from '@/lib/product-service';

// Validation schemas
const ProductQuerySchema = z.object({
  workflowState: z.nativeEnum(WorkflowState).optional(),
  assignedReviewer: z.string().optional(),
  search: z.string().optional(),
  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
  }).optional(),
});

const ProductUpdateSchema = z.object({
  id: z.string().optional(),
  basicInfo: z.object({
    name: z.any().optional(),
    sku: z.string().optional(),
    gtin: z.string().optional(),
    descriptionShort: z.any().optional(),
    descriptionLong: z.any().optional(),
    brand: z.string().optional(),
    status: z.string().optional(),
    launchDate: z.string().optional(), // ISODate string
    endDate: z.string().optional(), // ISODate string
    internalId: z.string().optional(),
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
const workflowStateManager = new WorkflowStateManager();
const rolePermissions = new RolePermissions();
const auditTrailIntegration = new AuditTrailIntegration(workflowStateManager, rolePermissions);

/**
 * GET /api/products
 * Get products with filtering and pagination
 */
async function getProducts(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const queryParams = {
      workflowState: searchParams.get('workflowState') as WorkflowState || undefined,
      assignedReviewer: searchParams.get('assignedReviewer') || undefined,
      search: searchParams.get('search') || undefined,
      pagination: {
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '20'),
      },
    };

    // Validate query parameters
    const validatedQuery = ProductQuerySchema.parse(queryParams);

    // Fetch from service (with safe defaults)
    const page = validatedQuery.pagination?.page || 1;
    const limit = validatedQuery.pagination?.limit || 20;

    const { products, total } = await productService.getProducts({
      workflowState: validatedQuery.workflowState,
      assignedReviewerId: validatedQuery.assignedReviewer,
      search: validatedQuery.search,
      page,
      limit
    });

    // Calculate pagination info (approximate for Firestore)
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        products: products,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: products.length === limit, // Basic check
          hasPrevious: page > 1,
        },
        filters: {
          workflowState: validatedQuery.workflowState,
          assignedReviewer: validatedQuery.assignedReviewer,
          search: validatedQuery.search,
        },
      },
    });

  } catch (error) {
    console.error('Get products error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
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
 * POST /api/products
 * Create a new product
 */
async function createProduct(request: NextRequest) {
  try {
    // Request body is already validated by middleware
    const validatedData = (request as any).validatedData;

    // User context is already validated by middleware
    const user = (request as any).user;
    const userId = user.userId;
    const userName = user.userName;
    const userRole = user.userRole;
    const userEmail = user.email || '';

    // Create new product object
    // Allow ID to be explicitly set (e.g. for imports), otherwise generate one
    const newProduct: Product = {
      id: validatedData.id || `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      basicInfo: {
        name: { en: '', no: '' },
        sku: '',
        descriptionShort: { en: '', no: '' },
        descriptionLong: { en: '', no: '' },
        brand: '',
        status: 'development',
        ...validatedData.basicInfo,
      },
      attributesAndSpecs: {
        categories: [],
        properties: [],
        technicalSpecs: [],
        ...validatedData.attributesAndSpecs,
      },
      media: {
        images: [],
        ...validatedData.media,
      },
      marketingSEO: {
        seoTitle: { en: '', no: '' },
        seoDescription: { en: '', no: '' },
        keywords: [],
        ...validatedData.marketingSEO,
      },
      pricingAndStock: {
        standardPrice: [],
        salePrice: [],
        costPrice: [],
        ...validatedData.pricingAndStock,
      },
      options: validatedData.options || [],
      variants: validatedData.variants || [],
      workflowState: validatedData.workflowState || WorkflowState.DRAFT,
      assignedReviewer: validatedData.assignedReviewer,
      workflowHistory: [{
        id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        action: 'CREATE',
        fromState: 'DRAFT' as WorkflowState,
        toState: validatedData.workflowState || WorkflowState.DRAFT,
        userId,
        userName,
        timestamp: new Date().toISOString(),
        reason: 'Product created',
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to Firestore via service
    await productService.createProduct(newProduct);

    // Create audit trail entry
    auditTrailIntegration.createProductAuditEntry(
      userId,
      userRole,
      userEmail,
      newProduct.id,
      newProduct,
      { source: 'api' }
    );

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      data: newProduct,
    }, { status: 201 });

  } catch (error) {
    console.error('Create product error:', error);

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

// Export functions with middleware
export const GET = withRoleBasedAccess(
  withValidation(getProducts, ProductQuerySchema, { validateQuery: true }),
  WorkflowAction.VIEW_ALL_PRODUCTS
);

export const POST = withRoleBasedAccess(
  withValidation(createProduct, ProductUpdateSchema, { validateBody: true }),
  WorkflowAction.CREATE
);