// src/types/quality.ts

/**
 * Represents a validation error found during product quality checks
 */
export interface ValidationError {
  type: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

/**
 * Quality metrics calculated for a product
 */
export interface QualityMetrics {
  completenessScore: number; // 0-100 percentage
  missingFields: string[]; // Array of field names that are missing
  validationErrors: ValidationError[];
  lastChecked: string; // ISO date string
}

/**
 * Configuration rule for quality checks
 */
export interface QualityRule {
  field: string;
  weight: number; // Numeric weight for scoring (e.g., 40 for critical, 20 for optional)
  requiredForStatus: string[]; // Array of ProductStatus values
}

/**
 * Quality issue for UI display purposes
 */
export interface QualityIssue {
  issueType: string; // e.g., 'missing-images', 'incomplete', 'validation-errors'
  count: number;
  affectedProducts: string[]; // Array of product IDs
}

