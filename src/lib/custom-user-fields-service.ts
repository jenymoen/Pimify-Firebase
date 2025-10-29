/**
 * Custom User Fields Service
 *
 * Manages admin-defined custom fields and validates user custom_fields objects.
 * In-memory registry; replace with persistence as needed.
 */

export type CustomFieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'json';

export interface CustomFieldDefinition {
  name: string;
  type: CustomFieldType;
  required?: boolean;
  maxLength?: number; // for string
  allowedValues?: any[]; // for enum
  description?: string;
}

export interface ValidationResult<T = Record<string, any>> {
  valid: boolean;
  errors: string[];
  sanitized?: T;
}

export class CustomUserFieldsService {
  private registry: Map<string, CustomFieldDefinition> = new Map();

  defineField(def: CustomFieldDefinition): ValidationResult<CustomFieldDefinition> {
    const errors: string[] = [];
    if (!def.name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(def.name)) errors.push('Invalid field name');
    if (!def.type) errors.push('Type is required');
    if (def.type === 'string' && def.maxLength !== undefined && def.maxLength <= 0) errors.push('maxLength must be > 0');
    if (def.type === 'enum' && (!def.allowedValues || def.allowedValues.length === 0)) errors.push('allowedValues required for enum');

    if (errors.length > 0) return { valid: false, errors };

    this.registry.set(def.name, { ...def });
    return { valid: true, errors: [], sanitized: def };
  }

  removeField(name: string): boolean {
    return this.registry.delete(name);
  }

  listFields(): CustomFieldDefinition[] {
    return Array.from(this.registry.values());
  }

  validate(customFields: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    const sanitized: Record<string, any> = {};

    // Check required fields
    for (const def of this.registry.values()) {
      if (def.required && !(def.name in customFields)) {
        errors.push(`Missing required field: ${def.name}`);
      }
    }

    for (const [key, value] of Object.entries(customFields || {})) {
      const def = this.registry.get(key);
      if (!def) {
        // Unknown field - keep as-is but note, or drop. We'll keep but you can change policy.
        sanitized[key] = value;
        continue;
      }

      if (!this.validateType(def, value)) {
        errors.push(`Field ${key} has invalid type (expected ${def.type})`);
        continue;
      }

      if (def.type === 'string' && def.maxLength && typeof value === 'string' && value.length > def.maxLength) {
        errors.push(`Field ${key} exceeds maxLength ${def.maxLength}`);
        continue;
      }

      if (def.type === 'enum' && def.allowedValues && !def.allowedValues.includes(value)) {
        errors.push(`Field ${key} must be one of: ${def.allowedValues.join(', ')}`);
        continue;
      }

      sanitized[key] = value;
    }

    return { valid: errors.length === 0, errors, sanitized };
  }

  private validateType(def: CustomFieldDefinition, value: any): boolean {
    switch (def.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && Number.isFinite(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'enum':
        return true; // enum checked separately
      case 'json':
        try {
          JSON.stringify(value);
          return true;
        } catch {
          return false;
        }
      default:
        return false;
    }
  }
}

export const customUserFieldsService = new CustomUserFieldsService();
