/**
 * Example API route implementations using permission middleware
 * These examples demonstrate how to integrate permission validation with Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { RolePermissions } from './role-permissions';
import { WorkflowAction } from '../types/workflow';
import {
  withPermissionValidation,
  createCommonPermissionMiddleware,
  createMultiPermissionMiddleware,
  createAnyPermissionMiddleware,
} from './permission-middleware';

// Initialize role permissions (in a real app, this would be a singleton)
const rolePermissions = new RolePermissions();

/**
 * Example: Product API routes with permission validation
 */

// GET /api/products - List products
export const getProducts = withPermissionValidation(rolePermissions, {
  action: WorkflowAction.READ,
  resource: 'products',
})(async (req: NextRequest) => {
  // Permission validation is handled by middleware
  // This handler only runs if user has READ permission for products
  
  try {
    // Your business logic here
    const products = await fetchProducts();
    
    return NextResponse.json({
      success: true,
      data: products,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

// POST /api/products - Create product
export const createProduct = withPermissionValidation(rolePermissions, {
  action: WorkflowAction.CREATE,
  resource: 'products',
})(async (req: NextRequest) => {
  try {
    const productData = await req.json();
    
    // Validate product data
    if (!productData.name || !productData.description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product name and description are required',
        },
        { status: 400 }
      );
    }
    
    // Create product
    const newProduct = await createProductInDatabase(productData);
    
    return NextResponse.json({
      success: true,
      data: newProduct,
      timestamp: new Date().toISOString(),
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create product',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

// GET /api/products/[id] - Get specific product
export const getProduct = withPermissionValidation(rolePermissions, {
  action: WorkflowAction.READ,
  resource: 'products',
  resourceIdParam: 'id',
})(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const product = await fetchProductById(params.id);
    
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: product,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch product',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

// PUT /api/products/[id] - Update product
export const updateProduct = withPermissionValidation(rolePermissions, {
  action: WorkflowAction.UPDATE,
  resource: 'products',
  resourceIdParam: 'id',
})(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const updateData = await req.json();
    
    // Check if product exists
    const existingProduct = await fetchProductById(params.id);
    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }
    
    // Update product
    const updatedProduct = await updateProductInDatabase(params.id, updateData);
    
    return NextResponse.json({
      success: true,
      data: updatedProduct,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update product',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

// DELETE /api/products/[id] - Delete product
export const deleteProduct = withPermissionValidation(rolePermissions, {
  action: WorkflowAction.DELETE,
  resource: 'products',
  resourceIdParam: 'id',
})(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    // Check if product exists
    const existingProduct = await fetchProductById(params.id);
    if (!existingProduct) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }
    
    // Delete product
    await deleteProductFromDatabase(params.id);
    
    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete product',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

/**
 * Example: Workflow API routes with permission validation
 */

// POST /api/products/[id]/submit - Submit product for review
export const submitProductForReview = withPermissionValidation(rolePermissions, {
  action: WorkflowAction.SUBMIT_FOR_REVIEW,
  resource: 'workflow',
  resourceIdParam: 'id',
})(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const product = await fetchProductById(params.id);
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }
    
    // Submit for review
    const updatedProduct = await submitProductForReviewInDatabase(params.id);
    
    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Product submitted for review',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit product for review',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

// POST /api/products/[id]/approve - Approve product
export const approveProduct = withPermissionValidation(rolePermissions, {
  action: WorkflowAction.APPROVE,
  resource: 'workflow',
  resourceIdParam: 'id',
})(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const product = await fetchProductById(params.id);
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }
    
    // Approve product
    const updatedProduct = await approveProductInDatabase(params.id);
    
    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Product approved',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to approve product',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

// POST /api/products/[id]/reject - Reject product
export const rejectProduct = withPermissionValidation(rolePermissions, {
  action: WorkflowAction.REJECT,
  resource: 'workflow',
  resourceIdParam: 'id',
})(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { reason } = await req.json();
    
    if (!reason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rejection reason is required',
        },
        { status: 400 }
      );
    }
    
    const product = await fetchProductById(params.id);
    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Product not found',
        },
        { status: 404 }
      );
    }
    
    // Reject product
    const updatedProduct = await rejectProductInDatabase(params.id, reason);
    
    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: 'Product rejected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reject product',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

/**
 * Example: User management API routes
 */

// GET /api/users - List users (Admin only)
export const getUsers = withPermissionValidation(rolePermissions, {
  action: WorkflowAction.MANAGE_USERS,
  resource: 'users',
})(async (req: NextRequest) => {
  try {
    const users = await fetchUsers();
    
    return NextResponse.json({
      success: true,
      data: users,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch users',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

// POST /api/users - Create user (Admin only)
export const createUser = withPermissionValidation(rolePermissions, {
  action: WorkflowAction.MANAGE_USERS,
  resource: 'users',
})(async (req: NextRequest) => {
  try {
    const userData = await req.json();
    
    // Validate user data
    if (!userData.email || !userData.role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email and role are required',
        },
        { status: 400 }
      );
    }
    
    // Create user
    const newUser = await createUserInDatabase(userData);
    
    return NextResponse.json({
      success: true,
      data: newUser,
      timestamp: new Date().toISOString(),
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create user',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

/**
 * Example: Audit trail API routes
 */

// GET /api/audit/products/[id] - Get product audit trail
export const getProductAuditTrail = withPermissionValidation(rolePermissions, {
  action: WorkflowAction.VIEW_AUDIT_TRAIL,
  resource: 'audit',
  resourceIdParam: 'id',
})(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const auditTrail = await fetchProductAuditTrail(params.id);
    
    return NextResponse.json({
      success: true,
      data: auditTrail,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch audit trail',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

/**
 * Example: Complex permission scenarios
 */

// POST /api/products/[id]/bulk-actions - Bulk operations (requires multiple permissions)
export const bulkProductActions = withPermissionValidation(rolePermissions, {
  action: '', // Will be handled by custom check
  customCheck: async (context, req) => {
    const { actions } = await req.json();
    
    // Check if user has permission for all requested actions
    for (const action of actions) {
      const result = await rolePermissions.hasPermission(
        context,
        action,
        context.productId
      );
      if (!result.hasPermission) {
        return false;
      }
    }
    
    return true;
  },
})(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const { actions } = await req.json();
    
    // Perform bulk actions
    const results = await performBulkProductActions(params.id, actions);
    
    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform bulk actions',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

// GET /api/dashboard - Dashboard access (any of multiple permissions)
export const getDashboard = withPermissionValidation(rolePermissions, {
  action: '', // Will be handled by custom check
  customCheck: async (context, req) => {
    // User needs at least one of these permissions to access dashboard
    const permissions = [
      WorkflowAction.READ,
      WorkflowAction.VIEW_AUDIT_TRAIL,
      WorkflowAction.MANAGE_USERS,
    ];
    
    for (const permission of permissions) {
      const result = await rolePermissions.hasPermission(context, permission);
      if (result.hasPermission) {
        return true;
      }
    }
    
    return false;
  },
})(async (req: NextRequest) => {
  try {
    const dashboardData = await fetchDashboardData();
    
    return NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

/**
 * Example: Public API routes (no authentication required)
 */

// GET /api/public/products - Public product listing
export const getPublicProducts = withPermissionValidation(rolePermissions, {
  action: WorkflowAction.READ,
  resource: 'products',
  requireAuth: false,
})(async (req: NextRequest) => {
  try {
    // Only return published products for public access
    const publicProducts = await fetchPublishedProducts();
    
    return NextResponse.json({
      success: true,
      data: publicProducts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch public products',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
});

// Mock database functions (replace with actual implementations)
async function fetchProducts() {
  return [{ id: '1', name: 'Product 1', status: 'published' }];
}

async function createProductInDatabase(data: any) {
  return { id: '2', ...data, createdAt: new Date().toISOString() };
}

async function fetchProductById(id: string) {
  return { id, name: `Product ${id}`, status: 'draft' };
}

async function updateProductInDatabase(id: string, data: any) {
  return { id, ...data, updatedAt: new Date().toISOString() };
}

async function deleteProductFromDatabase(id: string) {
  return true;
}

async function submitProductForReviewInDatabase(id: string) {
  return { id, status: 'review', submittedAt: new Date().toISOString() };
}

async function approveProductInDatabase(id: string) {
  return { id, status: 'approved', approvedAt: new Date().toISOString() };
}

async function rejectProductInDatabase(id: string, reason: string) {
  return { id, status: 'rejected', rejectedAt: new Date().toISOString(), rejectionReason: reason };
}

async function fetchUsers() {
  return [{ id: '1', email: 'admin@example.com', role: 'admin' }];
}

async function createUserInDatabase(data: any) {
  return { id: '2', ...data, createdAt: new Date().toISOString() };
}

async function fetchProductAuditTrail(id: string) {
  return [{ id: '1', productId: id, action: 'created', timestamp: new Date().toISOString() }];
}

async function performBulkProductActions(id: string, actions: string[]) {
  return { productId: id, actions, results: actions.map(action => ({ action, success: true })) };
}

async function fetchDashboardData() {
  return { stats: { totalProducts: 100, pendingReviews: 5 } };
}

async function fetchPublishedProducts() {
  return [{ id: '1', name: 'Published Product 1', status: 'published' }];
}
