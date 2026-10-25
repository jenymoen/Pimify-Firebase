import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RolePermissions } from '@/lib/role-permissions';
import { WorkflowStateManager } from '@/lib/workflow-state-manager';
import { AuditTrailIntegration } from '@/lib/audit-trail-integration';
import { withRoleBasedAccess, withValidation } from '@/lib/api-middleware';
import { WorkflowState, WorkflowAction, UserRole } from '@/types/workflow';
import { Product } from '@/types/product';
import { productService } from '@/lib/product-service';
import { claimSku, SkuConflictError } from '@/lib/sku-series-service';
import '@/lib/audit-trail-store'; // persists audit entries to Firestore
import { addToTagLibrary, cleanTags } from '@/lib/tag-library';

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
    descriptionShort: z.any().nullable().optional(),
    descriptionLong: z.any().nullable().optional(),
    brand: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    launchDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    internalId: z.string().nullable().optional(),
    manufacturer: z.string().nullable().optional(),
    supplierArticleNumber: z.string().nullable().optional(),
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
  aiSummary: z.any().nullable().optional(),
  qualityMetrics: z.any().nullable().optional(),
  workflowHistory: z.array(z.any()).nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
}).passthrough();

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

    // ?all=true returns the whole catalog; the catalog page filters client-side and
    // must see every product, not just the first page
    if (searchParams.get('all') === 'true') {
      const products = await productService.getAllProducts();
      return NextResponse.json({
        success: true,
        data: {
          products,
          pagination: { page: 1, limit: products.length, total: products.length, totalPages: 1, hasNext: false, hasPrevious: false },
        },
      });
    }

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
    const validatedData = (request as any).validatedData || {};

    // User context is already validated by middleware
    const user = (request as any).user || {};
    const userId = user.userId || 'system';
    const userName = user.userName || 'System';
    const userRole = user.userRole || UserRole.ADMIN;
    const userEmail = user.email || '';

    // Handle basicInfo, including fallback if root-level fields were supplied
    const rawBasic = validatedData.basicInfo || {};
    const nameVal = rawBasic.name || validatedData.name;
    const name = typeof nameVal === 'string'
      ? { en: nameVal, no: nameVal }
      : (nameVal || { en: '', no: '' });

    const descShortVal = rawBasic.descriptionShort || validatedData.descriptionShort;
    const descriptionShort = typeof descShortVal === 'string'
      ? { en: descShortVal, no: descShortVal }
      : (descShortVal || { en: '', no: '' });

    const descLongVal = rawBasic.descriptionLong || validatedData.descriptionLong;
    const descriptionLong = typeof descLongVal === 'string'
      ? { en: descLongVal, no: descLongVal }
      : (descLongVal || { en: '', no: '' });

    // Normalize workflowState
    let workflowState: WorkflowState = WorkflowState.DRAFT;
    if (validatedData.workflowState) {
      const wsLower = String(validatedData.workflowState).toLowerCase();
      if (Object.values(WorkflowState).includes(wsLower as WorkflowState)) {
        workflowState = wsLower as WorkflowState;
      }
    }

    // Normalize assignedReviewer
    let assignedReviewer: Product['assignedReviewer'] = undefined;
    if (validatedData.assignedReviewer) {
      if (typeof validatedData.assignedReviewer === 'string') {
        assignedReviewer = {
          userId: validatedData.assignedReviewer,
          userName: 'Reviewer',
          userRole: UserRole.REVIEWER,
        };
      } else if (typeof validatedData.assignedReviewer === 'object' && validatedData.assignedReviewer.userId) {
        assignedReviewer = {
          userId: validatedData.assignedReviewer.userId,
          userName: validatedData.assignedReviewer.userName || 'Reviewer',
          userRole: (validatedData.assignedReviewer.userRole as UserRole) || UserRole.REVIEWER,
        };
      }
    }

    // An explicit id that already exists (e.g. re-import) overwrites that product.
    // Keep its server-owned history and creation date instead of trusting the client.
    const existingProduct = validatedData.id ? await productService.getProductById(validatedData.id) : null;
    const now = new Date().toISOString();

    // Create new product object
    // Allow ID to be explicitly set (e.g. for imports), otherwise generate one
    const newProduct: Product = {
      id: validatedData.id || `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      basicInfo: {
        name,
        sku: rawBasic.sku ?? validatedData.sku ?? '',
        gtin: rawBasic.gtin ?? validatedData.gtin ?? undefined,
        internalId: rawBasic.internalId ?? validatedData.internalId ?? undefined,
        manufacturer: rawBasic.manufacturer ?? validatedData.manufacturer ?? undefined,
        supplierArticleNumber: rawBasic.supplierArticleNumber ?? validatedData.supplierArticleNumber ?? undefined,
        descriptionShort,
        descriptionLong,
        brand: rawBasic.brand ?? validatedData.brand ?? '',
        status: rawBasic.status ?? validatedData.status ?? 'development',
        launchDate: rawBasic.launchDate ?? validatedData.launchDate ?? undefined,
        endDate: rawBasic.endDate ?? validatedData.endDate ?? undefined,
      },
      attributesAndSpecs: {
        categories: Array.isArray(validatedData.attributesAndSpecs?.categories)
          ? validatedData.attributesAndSpecs.categories
          : [],
        properties: Array.isArray(validatedData.attributesAndSpecs?.properties)
          ? validatedData.attributesAndSpecs.properties
          : [],
        technicalSpecs: Array.isArray(validatedData.attributesAndSpecs?.technicalSpecs)
          ? validatedData.attributesAndSpecs.technicalSpecs
          : [],
        countryOfOrigin: validatedData.attributesAndSpecs?.countryOfOrigin || undefined,
        maintenanceInstructions: validatedData.attributesAndSpecs?.maintenanceInstructions || undefined,
        warrantyInfo: validatedData.attributesAndSpecs?.warrantyInfo || undefined,
      },
      media: {
        images: Array.isArray(validatedData.media?.images) ? validatedData.media.images : [],
        videos: Array.isArray(validatedData.media?.videos) ? validatedData.media.videos : undefined,
        models3d: Array.isArray(validatedData.media?.models3d) ? validatedData.media.models3d : undefined,
        manuals: Array.isArray(validatedData.media?.manuals) ? validatedData.media.manuals : undefined,
        certificates: Array.isArray(validatedData.media?.certificates) ? validatedData.media.certificates : undefined,
      },
      marketingSEO: {
        seoTitle: typeof validatedData.marketingSEO?.seoTitle === 'string'
          ? { en: validatedData.marketingSEO.seoTitle, no: validatedData.marketingSEO.seoTitle }
          : (validatedData.marketingSEO?.seoTitle || { en: '', no: '' }),
        seoDescription: typeof validatedData.marketingSEO?.seoDescription === 'string'
          ? { en: validatedData.marketingSEO.seoDescription, no: validatedData.marketingSEO.seoDescription }
          : (validatedData.marketingSEO?.seoDescription || { en: '', no: '' }),
        keywords: Array.isArray(validatedData.marketingSEO?.keywords) ? validatedData.marketingSEO.keywords : [],
        marketingTexts: Array.isArray(validatedData.marketingSEO?.marketingTexts) ? validatedData.marketingSEO.marketingTexts : undefined,
        campaignCodes: Array.isArray(validatedData.marketingSEO?.campaignCodes) ? validatedData.marketingSEO.campaignCodes : undefined,
      },
      pricingAndStock: {
        standardPrice: Array.isArray(validatedData.pricingAndStock?.standardPrice) ? validatedData.pricingAndStock.standardPrice : [],
        salePrice: Array.isArray(validatedData.pricingAndStock?.salePrice) ? validatedData.pricingAndStock.salePrice : undefined,
        costPrice: Array.isArray(validatedData.pricingAndStock?.costPrice) ? validatedData.pricingAndStock.costPrice : undefined,
      },
      options: Array.isArray(validatedData.options) ? validatedData.options : [],
      variants: Array.isArray(validatedData.variants) ? validatedData.variants : [],
      workflowState,
      assignedReviewer,
      // History and timestamps are server-owned; client-supplied values are ignored
      workflowHistory: existingProduct
        ? existingProduct.workflowHistory || []
        : [{
            id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            action: 'CREATE',
            fromState: WorkflowState.DRAFT,
            toState: workflowState,
            userId,
            userName,
            timestamp: now,
            reason: 'Product created',
          }],
      createdAt: existingProduct?.createdAt || now,
      updatedAt: now,
    };

    if (validatedData.logistics) newProduct.logistics = validatedData.logistics;
    if (validatedData.compliance) newProduct.compliance = validatedData.compliance;
    if (validatedData.sustainability) newProduct.sustainability = validatedData.sustainability;
    if (validatedData.relations) newProduct.relations = validatedData.relations;
    if (Array.isArray(validatedData.tags)) newProduct.tags = cleanTags(validatedData.tags);
    if (validatedData.googleCategory?.id) newProduct.googleCategory = validatedData.googleCategory;
    if (validatedData.shopifyCategory?.id) newProduct.shopifyCategory = validatedData.shopifyCategory;
    if (validatedData.shopifyMetafields && typeof validatedData.shopifyMetafields === 'object') {
      newProduct.shopifyMetafields = validatedData.shopifyMetafields;
    }
    if (validatedData.externalIds) newProduct.externalIds = validatedData.externalIds;
    else if (existingProduct?.externalIds) newProduct.externalIds = existingProduct.externalIds;
    if (validatedData.localizationNorway) newProduct.localizationNorway = validatedData.localizationNorway;
    if (validatedData.aiSummary) newProduct.aiSummary = validatedData.aiSummary;
    if (validatedData.qualityMetrics) newProduct.qualityMetrics = validatedData.qualityMetrics;

    // Guarantee SKU uniqueness across users before saving
    await claimSku(newProduct.basicInfo.sku, newProduct.id);

    // Save to Firestore via service
    await productService.createProduct(newProduct);
    await addToTagLibrary(newProduct.tags);

    // Create audit trail entry
    auditTrailIntegration.createProductAuditEntry(
      userId,
      userRole,
      userEmail,
      newProduct.id,
      newProduct,
      { source: 'api', userName }
    );

    return NextResponse.json({
      success: true,
      message: 'Product created successfully',
      data: newProduct,
    }, { status: 201 });

  } catch (error) {
    console.error('Create product error:', error);

    if (error instanceof SkuConflictError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }

    if (error instanceof z.ZodError) {
      const details = error.errors
        .map((e) => `${e.path.length > 0 ? e.path.join('.') : 'root'}: ${e.message}`)
        .join(', ');
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details,
          issues: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
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