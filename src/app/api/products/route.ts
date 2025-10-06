import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RolePermissions } from '@/lib/role-permissions';
import { WorkflowStateManager } from '@/lib/workflow-state-manager';
import { AuditTrailIntegration } from '@/lib/audit-trail-integration';
import { withRoleBasedAccess, withValidation } from '@/lib/api-middleware';
import { WorkflowState, WorkflowAction, UserRole } from '@/types/workflow';
import { Product } from '@/types/product';

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
 * GET /api/products
 * Get products with filtering and pagination
 */
async function getProducts(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // User context is already validated by middleware
    const userId = (request as any).user.userId;

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

    // Filter products
    let filteredProducts = [...products];

    // Apply workflow state filter
    if (validatedQuery.workflowState) {
      filteredProducts = filteredProducts.filter(p => p.workflowState === validatedQuery.workflowState);
    }

    // Apply reviewer filter
    if (validatedQuery.assignedReviewer) {
      filteredProducts = filteredProducts.filter(p => 
        p.assignedReviewer?.userId === validatedQuery.assignedReviewer
      );
    }

    // Apply search filter
    if (validatedQuery.search) {
      const searchTerm = validatedQuery.search.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.basicInfo.name.en.toLowerCase().includes(searchTerm) ||
        p.basicInfo.name.no.toLowerCase().includes(searchTerm) ||
        p.basicInfo.sku.toLowerCase().includes(searchTerm) ||
        p.basicInfo.brand.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const { page, limit } = validatedQuery.pagination;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    // Calculate pagination info
    const total = filteredProducts.length;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
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
    const userId = (request as any).user.userId;
    const userName = (request as any).user.userName;

    // Create new product
    const newProduct: Product = {
      id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

    // Add to storage
    products.push(newProduct);

    // Create audit trail entry
    await auditTrailIntegration.createProductCreatedAuditEntry(newProduct.id, {
      userId,
      userName,
      productData: newProduct,
    });

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