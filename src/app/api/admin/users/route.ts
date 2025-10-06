import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RolePermissions } from '@/lib/role-permissions';
import { DynamicPermissionManager } from '@/lib/dynamic-permissions';
import { WorkflowAction, UserRole } from '@/types/workflow';

// Validation schemas
const UserRequestSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const UserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

const UserQuerySchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
  }).optional(),
});

const UserResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.nativeEnum(UserRole),
    isActive: z.boolean(),
    permissions: z.array(z.string()),
    metadata: z.record(z.any()).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    lastLoginAt: z.string().optional(),
  }).optional(),
  error: z.string().optional(),
});

const UsersListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    users: z.array(z.any()),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrevious: z.boolean(),
    }),
  }),
  error: z.string().optional(),
});

// Initialize services
const rolePermissions = new RolePermissions();
const dynamicPermissionManager = new DynamicPermissionManager();

// In-memory user storage (in production, use database)
const users = new Map<string, any>();

// Initialize with some default users
users.set('admin-1', {
  id: 'admin-1',
  email: 'admin@example.com',
  name: 'System Administrator',
  role: UserRole.ADMIN,
  isActive: true,
  permissions: ['*'],
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
});

users.set('editor-1', {
  id: 'editor-1',
  email: 'editor@example.com',
  name: 'Content Editor',
  role: UserRole.EDITOR,
  isActive: true,
  permissions: ['products:create', 'products:edit', 'products:view'],
  metadata: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString(),
});

/**
 * POST /api/admin/users
 * Create a new user
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = UserRequestSchema.parse(body);
    
    const { email, name, role, isActive, permissions, metadata } = validatedData;

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

    // Check if user has permission to create users
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.MANAGE_USERS,
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

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(u => u.email === email);
    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User with this email already exists' 
        },
        { status: 409 }
      );
    }

    // Generate user ID
    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create user
    const newUser = {
      id: newUserId,
      email,
      name,
      role,
      isActive,
      permissions: permissions || [],
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: {
        userId,
        userName: request.headers.get('x-user-name') || 'Unknown User',
        userRole,
      },
    };

    users.set(newUserId, newUser);

    // Prepare response
    const response = UserResponseSchema.parse({
      success: true,
      message: 'User created successfully',
      data: newUser,
    });

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Create user error:', error);

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
 * GET /api/admin/users
 * Get users with filtering and pagination
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

    // Check if user has permission to view users
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.VIEW_USERS,
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
      role: searchParams.get('role') as UserRole || undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : 
                searchParams.get('isActive') === 'false' ? false : undefined,
      search: searchParams.get('search') || undefined,
      pagination: {
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '20'),
      },
    };

    // Validate query parameters
    const validatedQuery = UserQuerySchema.parse(queryParams);

    // Filter users
    let filteredUsers = Array.from(users.values());

    // Apply filters
    if (validatedQuery.role) {
      filteredUsers = filteredUsers.filter(u => u.role === validatedQuery.role);
    }

    if (validatedQuery.isActive !== undefined) {
      filteredUsers = filteredUsers.filter(u => u.isActive === validatedQuery.isActive);
    }

    if (validatedQuery.search) {
      const searchTerm = validatedQuery.search.toLowerCase();
      filteredUsers = filteredUsers.filter(u => 
        u.name.toLowerCase().includes(searchTerm) ||
        u.email.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const { page, limit } = validatedQuery.pagination;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Calculate pagination info
    const total = filteredUsers.length;
    const totalPages = Math.ceil(total / limit);

    // Prepare response
    const response = UsersListResponseSchema.parse({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    });

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Get users error:', error);

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
 * PUT /api/admin/users
 * Update user information
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('id');

    if (!targetUserId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User ID is required' 
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = UserUpdateSchema.parse(body);

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

    // Check if user has permission to update users
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.UPDATE_USERS,
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

    // Check if target user exists
    const targetUser = users.get(targetUserId);
    if (!targetUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not found' 
        },
        { status: 404 }
      );
    }

    // Prevent users from modifying their own role (unless they're admin)
    if (targetUserId === userId && validatedData.role && userRole !== UserRole.ADMIN) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You cannot modify your own role' 
        },
        { status: 403 }
      );
    }

    // Update user
    const updatedUser = {
      ...targetUser,
      ...validatedData,
      updatedAt: new Date().toISOString(),
      updatedBy: {
        userId,
        userName: request.headers.get('x-user-name') || 'Unknown User',
        userRole,
      },
    };

    users.set(targetUserId, updatedUser);

    // Prepare response
    const response = UserResponseSchema.parse({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Update user error:', error);

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
 * DELETE /api/admin/users
 * Delete user (soft delete by setting isActive to false)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('id');

    if (!targetUserId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User ID is required' 
        },
        { status: 400 }
      );
    }

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

    // Check if user has permission to delete users
    const hasPermission = await rolePermissions.hasPermission(
      userRole,
      WorkflowAction.DELETE_USERS,
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

    // Check if target user exists
    const targetUser = users.get(targetUserId);
    if (!targetUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not found' 
        },
        { status: 404 }
      );
    }

    // Prevent users from deleting themselves
    if (targetUserId === userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You cannot delete your own account' 
        },
        { status: 403 }
      );
    }

    // Soft delete user (set isActive to false)
    const deletedUser = {
      ...targetUser,
      isActive: false,
      deletedAt: new Date().toISOString(),
      deletedBy: {
        userId,
        userName: request.headers.get('x-user-name') || 'Unknown User',
        userRole,
      },
    };

    users.set(targetUserId, deletedUser);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
