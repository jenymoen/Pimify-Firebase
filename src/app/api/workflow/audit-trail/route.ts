import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuditTrailSearchService } from '@/lib/audit-trail-search';
import { AuditTrailPaginationService } from '@/lib/audit-trail-pagination';
import { RolePermissions } from '@/lib/role-permissions';
import { WorkflowAction, UserRole } from '@/types/workflow';

// Validation schemas
const AuditTrailQuerySchema = z.object({
  search: z.string().optional(),
  filters: z.object({
    userId: z.string().optional(),
    action: z.string().optional(),
    productId: z.string().optional(),
    dateRange: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  }).optional(),
  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
    strategy: z.enum(['offset', 'cursor', 'time-based', 'id-based']).default('offset'),
    cursor: z.string().optional(),
  }).optional(),
  sorting: z.object({
    field: z.string().default('timestamp'),
    direction: z.enum(['asc', 'desc']).default('desc'),
  }).optional(),
  includeFieldChanges: z.boolean().default(false),
  includeMetadata: z.boolean().default(false),
});

const AuditTrailResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    entries: z.array(z.any()),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrevious: z.boolean(),
      nextCursor: z.string().optional(),
      previousCursor: z.string().optional(),
    }),
    aggregations: z.object({
      byAction: z.record(z.number()),
      byUser: z.record(z.number()),
      byPriority: z.record(z.number()),
      byDate: z.record(z.number()),
    }).optional(),
    statistics: z.object({
      totalEntries: z.number(),
      dateRange: z.object({
        earliest: z.string(),
        latest: z.string(),
      }),
      averageEntriesPerDay: z.number(),
    }).optional(),
  }),
  error: z.string().optional(),
});

// Initialize services
const auditTrailSearchService = new AuditTrailSearchService();
const auditTrailPaginationService = new AuditTrailPaginationService();
const rolePermissions = new RolePermissions();

/**
 * GET /api/workflow/audit-trail
 * Query audit trail entries with search, filtering, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
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

    // Check if user has permission to view audit trail
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.VIEW_AUDIT_TRAIL,
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

    // Parse query parameters
    const queryParams = {
      search: searchParams.get('search') || undefined,
      filters: {
        userId: searchParams.get('userId') || undefined,
        action: searchParams.get('action') || undefined,
        productId: searchParams.get('productId') || undefined,
        dateRange: {
          start: searchParams.get('dateStart') || undefined,
          end: searchParams.get('dateEnd') || undefined,
        },
        priority: searchParams.get('priority') as any || undefined,
      },
      pagination: {
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '20'),
        strategy: (searchParams.get('strategy') as any) || 'offset',
        cursor: searchParams.get('cursor') || undefined,
      },
      sorting: {
        field: searchParams.get('sortField') || 'timestamp',
        direction: (searchParams.get('sortDirection') as any) || 'desc',
      },
      includeFieldChanges: searchParams.get('includeFieldChanges') === 'true',
      includeMetadata: searchParams.get('includeMetadata') === 'true',
    };

    // Validate query parameters
    const validatedQuery = AuditTrailQuerySchema.parse(queryParams);

    // Build search query
    const searchQuery = {
      searchTerm: validatedQuery.search,
      filters: validatedQuery.filters,
      pagination: validatedQuery.pagination,
      sorting: validatedQuery.sorting,
      includeFieldChanges: validatedQuery.includeFieldChanges,
      includeMetadata: validatedQuery.includeMetadata,
    };

    // Execute search
    const searchResult = await auditTrailSearchService.search(searchQuery);

    // Apply pagination
    const paginationResult = await auditTrailPaginationService.paginateOffsetBased(
      searchResult.entries,
      {
        page: validatedQuery.pagination.page,
        limit: validatedQuery.pagination.limit,
      }
    );

    // Get aggregations if requested
    const aggregations = await auditTrailSearchService.getAggregations(searchQuery);

    // Get statistics
    const statistics = await auditTrailSearchService.getStatistics(searchQuery);

    // Prepare response
    const response = AuditTrailResponseSchema.parse({
      success: true,
      data: {
        entries: paginationResult.data,
        pagination: {
          page: paginationResult.pagination.page,
          limit: paginationResult.pagination.limit,
          total: paginationResult.pagination.total,
          totalPages: paginationResult.pagination.totalPages,
          hasNext: paginationResult.pagination.hasNext,
          hasPrevious: paginationResult.pagination.hasPrevious,
          nextCursor: paginationResult.pagination.nextCursor,
          previousCursor: paginationResult.pagination.previousCursor,
        },
        aggregations,
        statistics,
      },
    });

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Audit trail query error:', error);

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
 * POST /api/workflow/audit-trail
 * Create a new audit trail entry (typically used internally)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
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

    // Check if user has permission to create audit trail entries
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.CREATE_AUDIT_TRAIL,
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

    // Validate request body
    const AuditTrailEntrySchema = z.object({
      productId: z.string().min(1),
      action: z.string().min(1),
      reason: z.string().optional(),
      fieldChanges: z.array(z.any()).optional(),
      metadata: z.record(z.any()).optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    });

    const validatedData = AuditTrailEntrySchema.parse(body);

    // Create audit trail entry
    const auditEntry = await createAuditTrailEntry({
      ...validatedData,
      userId,
      userName: request.headers.get('x-user-name') || 'Unknown User',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Audit trail entry created successfully',
      data: {
        id: auditEntry.id,
        timestamp: auditEntry.timestamp,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Create audit trail entry error:', error);

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
 * GET /api/workflow/audit-trail/export
 * Export audit trail data in various formats
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    
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

    // Check if user has permission to export audit trail
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.EXPORT_AUDIT_TRAIL,
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

    // Parse request body for export options
    const body = await request.json();
    const exportOptions = {
      format: format as 'json' | 'csv' | 'xml',
      filters: body.filters || {},
      dateRange: body.dateRange || {},
      includeFieldChanges: body.includeFieldChanges || false,
      includeMetadata: body.includeMetadata || false,
    };

    // Build search query
    const searchQuery = {
      filters: exportOptions.filters,
      dateRange: exportOptions.dateRange,
      includeFieldChanges: exportOptions.includeFieldChanges,
      includeMetadata: exportOptions.includeMetadata,
    };

    // Get all matching entries (no pagination for export)
    const searchResult = await auditTrailSearchService.search(searchQuery);

    // Export data
    const exportResult = await auditTrailSearchService.exportSearchResults(
      searchResult.entries,
      exportOptions.format
    );

    // Set appropriate headers for download
    const headers = new Headers();
    headers.set('Content-Type', getContentType(exportOptions.format));
    headers.set('Content-Disposition', `attachment; filename="audit-trail-${Date.now()}.${exportOptions.format}"`);

    return new NextResponse(exportResult, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Export audit trail error:', error);
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
async function createAuditTrailEntry(data: any) {
  // This is a placeholder - replace with your actual database insert
  const entry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ...data,
    createdAt: new Date().toISOString(),
  };
  
  console.log('Creating audit trail entry:', entry);
  return entry;
}

function getContentType(format: string): string {
  const contentTypes = {
    json: 'application/json',
    csv: 'text/csv',
    xml: 'application/xml',
  };
  
  return contentTypes[format as keyof typeof contentTypes] || 'application/octet-stream';
}
