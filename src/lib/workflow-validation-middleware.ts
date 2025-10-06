/**
 * Workflow State Validation Middleware
 * 
 * This module provides middleware functions for validating workflow states,
 * user permissions, and product data integrity in the Workflow & Approval System.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  WorkflowState,
  WorkflowAction,
  UserRole,
  ProductWorkflow,
  AuditTrailEntry,
} from '@/types/workflow';
import { WorkflowStateManager } from './workflow-state-manager';
import { hasPermission, getValidationRules, getQualityCheckRequirements } from './workflow-config';

export interface WorkflowValidationContext {
  userId: string;
  userRole: UserRole;
  userEmail: string;
  productId?: string;
  action?: WorkflowAction;
  currentState?: WorkflowState;
  targetState?: WorkflowState;
  product?: ProductWorkflow;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  context?: WorkflowValidationContext;
}

export interface MiddlewareOptions {
  requireAuthentication?: boolean;
  requireProductOwnership?: boolean;
  allowBypass?: boolean; // For admin users
  logValidation?: boolean;
}

/**
 * Main workflow validation middleware
 */
export function createWorkflowValidationMiddleware(
  options: MiddlewareOptions = {}
) {
  return async function workflowValidationMiddleware(
    request: NextRequest,
    context: WorkflowValidationContext
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Authentication validation
      if (options.requireAuthentication) {
        const authResult = await validateAuthentication(context);
        if (!authResult.isValid) {
          errors.push(...authResult.errors);
          return { isValid: false, errors, warnings, context };
        }
      }

      // 2. User role validation
      const roleResult = await validateUserRole(context);
      if (!roleResult.isValid) {
        errors.push(...roleResult.errors);
        return { isValid: false, errors, warnings, context };
      }

      // 3. Permission validation
      if (context.action) {
        const permissionResult = await validatePermissions(context);
        if (!permissionResult.isValid) {
          errors.push(...permissionResult.errors);
          return { isValid: false, errors, warnings, context };
        }
      }

      // 4. Product ownership validation
      if (options.requireProductOwnership && context.product) {
        const ownershipResult = await validateProductOwnership(context);
        if (!ownershipResult.isValid) {
          errors.push(...ownershipResult.errors);
          return { isValid: false, errors, warnings, context };
        }
      }

      // 5. Workflow state validation
      if (context.currentState && context.targetState) {
        const stateResult = await validateWorkflowStateTransition(context);
        if (!stateResult.isValid) {
          errors.push(...stateResult.errors);
          warnings.push(...stateResult.warnings);
        }
      }

      // 6. Product data validation
      if (context.product) {
        const dataResult = await validateProductData(context);
        if (!dataResult.isValid) {
          errors.push(...dataResult.errors);
          warnings.push(...dataResult.warnings);
        }
      }

      // 7. Quality check validation
      if (context.product && context.targetState) {
        const qualityResult = await validateQualityRequirements(context);
        if (!qualityResult.isValid) {
          errors.push(...qualityResult.errors);
          warnings.push(...qualityResult.warnings);
        }
      }

      // Log validation if enabled
      if (options.logValidation) {
        await logValidationResult(context, { isValid: errors.length === 0, errors, warnings });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        context,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      errors.push(`Validation middleware error: ${errorMessage}`);
      
      if (options.logValidation) {
        await logValidationResult(context, { isValid: false, errors: [errorMessage], warnings: [] });
      }

      return { isValid: false, errors, warnings, context };
    }
  };
}

/**
 * Validate user authentication
 */
async function validateAuthentication(context: WorkflowValidationContext): Promise<ValidationResult> {
  const errors: string[] = [];

  if (!context.userId) {
    errors.push('User ID is required for authentication');
  }

  if (!context.userEmail) {
    errors.push('User email is required for authentication');
  }

  // Additional authentication checks could be added here
  // e.g., JWT token validation, session validation, etc.

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validate user role
 */
async function validateUserRole(context: WorkflowValidationContext): Promise<ValidationResult> {
  const errors: string[] = [];

  if (!context.userRole) {
    errors.push('User role is required');
    return { isValid: false, errors, warnings: [] };
  }

  if (!Object.values(UserRole).includes(context.userRole)) {
    errors.push(`Invalid user role: ${context.userRole}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validate user permissions for the requested action
 */
async function validatePermissions(context: WorkflowValidationContext): Promise<ValidationResult> {
  const errors: string[] = [];

  if (!context.action) {
    errors.push('Action is required for permission validation');
    return { isValid: false, errors, warnings: [] };
  }

  const hasRequiredPermission = hasPermission(context.userRole, context.action);
  if (!hasRequiredPermission) {
    errors.push(`User role ${context.userRole} does not have permission for action ${context.action}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validate product ownership
 */
async function validateProductOwnership(context: WorkflowValidationContext): Promise<ValidationResult> {
  const errors: string[] = [];

  if (!context.product) {
    errors.push('Product is required for ownership validation');
    return { isValid: false, errors, warnings: [] };
  }

  // Check if user is the owner of the product
  const isOwner = context.product.submittedBy === context.userId;
  const isAdmin = context.userRole === UserRole.ADMIN;

  if (!isOwner && !isAdmin) {
    errors.push('User does not have ownership rights to this product');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validate workflow state transition
 */
async function validateWorkflowStateTransition(context: WorkflowValidationContext): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!context.currentState || !context.targetState) {
    errors.push('Current state and target state are required for transition validation');
    return { isValid: false, errors, warnings };
  }

  // Create a temporary WorkflowStateManager for validation
  const stateManager = new WorkflowStateManager();

  // Check if transition is allowed
  const canTransition = stateManager.canPerformAction(
    getActionFromStateTransition(context.currentState, context.targetState),
    context.currentState,
    context.userRole
  );

  if (!canTransition) {
    errors.push(`Transition from ${context.currentState} to ${context.targetState} is not allowed for role ${context.userRole}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate product data integrity
 */
async function validateProductData(context: WorkflowValidationContext): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!context.product) {
    errors.push('Product is required for data validation');
    return { isValid: false, errors, warnings };
  }

  // Create a temporary WorkflowStateManager for validation
  const stateManager = new WorkflowStateManager();

  // Validate product state
  const validationResult = stateManager.validateProductState(context.product);
  if (!validationResult.isValid) {
    errors.push(...validationResult.errors);
    warnings.push(...validationResult.warnings);
  }

  // Additional data validation
  if (!context.product.basicInfo.name || Object.keys(context.product.basicInfo.name).length === 0) {
    errors.push('Product name is required');
  }

  if (!context.product.basicInfo.sku) {
    errors.push('Product SKU is required');
  }

  if (!context.product.basicInfo.brand) {
    errors.push('Product brand is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate quality requirements for state transition
 */
async function validateQualityRequirements(context: WorkflowValidationContext): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!context.product || !context.targetState) {
    return { isValid: true, errors, warnings };
  }

  const qualityRequirements = getQualityCheckRequirements();
  const validationRules = getValidationRules(context.targetState);

  // Check required fields
  for (const rule of validationRules) {
    const fieldValue = getNestedFieldValue(context.product, rule);
    if (!fieldValue || (Array.isArray(fieldValue) && fieldValue.length === 0)) {
      errors.push(`Required field ${rule} is missing or empty`);
    }
  }

  // Check image requirements
  if (context.product.media.images.length < qualityRequirements.minImageCount) {
    errors.push(`Minimum ${qualityRequirements.minImageCount} images required`);
  }

  if (context.product.media.images.length > qualityRequirements.maxImageCount) {
    warnings.push(`Maximum ${qualityRequirements.maxImageCount} images recommended`);
  }

  // Check description length
  const descriptionLength = context.product.basicInfo.descriptionLong?.en?.length || 0;
  if (descriptionLength < qualityRequirements.minDescriptionLength) {
    errors.push(`Description must be at least ${qualityRequirements.minDescriptionLength} characters`);
  }

  if (descriptionLength > qualityRequirements.maxDescriptionLength) {
    warnings.push(`Description should not exceed ${qualityRequirements.maxDescriptionLength} characters`);
  }

  // Check categories
  if (context.product.attributesAndSpecs.categories.length < qualityRequirements.requiredCategories) {
    errors.push(`At least ${qualityRequirements.requiredCategories} category is required`);
  }

  if (context.product.attributesAndSpecs.categories.length > qualityRequirements.maxCategories) {
    warnings.push(`Maximum ${qualityRequirements.maxCategories} categories recommended`);
  }

  // Check keywords
  const keywordCount = context.product.marketingSEO.keywords.length;
  if (keywordCount < qualityRequirements.minKeywords) {
    errors.push(`At least ${qualityRequirements.minKeywords} keywords required`);
  }

  if (keywordCount > qualityRequirements.maxKeywords) {
    warnings.push(`Maximum ${qualityRequirements.maxKeywords} keywords recommended`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log validation result
 */
async function logValidationResult(
  context: WorkflowValidationContext,
  result: ValidationResult
): Promise<void> {
  // This would typically log to a database or logging service
  console.log('Workflow Validation Result:', {
    userId: context.userId,
    userRole: context.userRole,
    productId: context.productId,
    action: context.action,
    isValid: result.isValid,
    errors: result.errors,
    warnings: result.warnings,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Helper function to get nested field value from object
 */
function getNestedFieldValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Helper function to get action from state transition
 */
function getActionFromStateTransition(from: WorkflowState, to: WorkflowState): WorkflowAction {
  switch (to) {
    case WorkflowState.REVIEW:
      return WorkflowAction.SUBMIT;
    case WorkflowState.APPROVED:
      return WorkflowAction.APPROVE;
    case WorkflowState.REJECTED:
      return WorkflowAction.REJECT;
    case WorkflowState.PUBLISHED:
      return WorkflowAction.PUBLISH;
    case WorkflowState.DRAFT:
      return from === WorkflowState.REJECTED ? WorkflowAction.EDIT : WorkflowAction.CREATE;
    default:
      return WorkflowAction.EDIT;
  }
}

/**
 * Express-style middleware for Next.js API routes
 */
export function withWorkflowValidation(
  handler: (req: NextRequest, context: WorkflowValidationContext) => Promise<NextResponse>,
  options: MiddlewareOptions = {}
) {
  return async function validatedHandler(
    req: NextRequest,
    context: WorkflowValidationContext
  ): Promise<NextResponse> {
    const validationMiddleware = createWorkflowValidationMiddleware(options);
    const validationResult = await validationMiddleware(req, context);

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.errors,
          warnings: validationResult.warnings,
        },
        { status: 400 }
      );
    }

    // Add validation context to request
    (req as any).workflowContext = validationResult.context;

    return handler(req, context);
  };
}

/**
 * Utility function to extract workflow context from request
 */
export function extractWorkflowContext(req: NextRequest): Partial<WorkflowValidationContext> {
  const context: Partial<WorkflowValidationContext> = {};

  // Extract from headers
  const userId = req.headers.get('x-user-id');
  const userRole = req.headers.get('x-user-role') as UserRole;
  const userEmail = req.headers.get('x-user-email');

  if (userId) context.userId = userId;
  if (userRole) context.userRole = userRole;
  if (userEmail) context.userEmail = userEmail;

  // Extract from URL parameters
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId');
  if (productId) context.productId = productId;

  return context;
}

/**
 * Utility function to create validation context from request body
 */
export function createValidationContext(
  req: NextRequest,
  body?: any
): WorkflowValidationContext {
  const context = extractWorkflowContext(req);

  if (body) {
    if (body.action) context.action = body.action;
    if (body.currentState) context.currentState = body.currentState;
    if (body.targetState) context.targetState = body.targetState;
    if (body.product) context.product = body.product;
  }

  return context as WorkflowValidationContext;
}
