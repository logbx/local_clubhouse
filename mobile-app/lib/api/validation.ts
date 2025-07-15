import { logger } from '../monitoring/logger';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'uuid';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationSchema {
  name: string;
  rules: ValidationRule[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

class RequestValidator {
  private schemas: Map<string, ValidationSchema> = new Map();

  constructor() {
    this.registerDefaultSchemas();
  }

  private registerDefaultSchemas() {
    // Authentication schemas
    this.registerSchema({
      name: 'login',
      rules: [
        { field: 'email', type: 'email', required: true },
        { field: 'password', type: 'string', required: true, minLength: 6 },
        { field: 'rememberMe', type: 'boolean', required: false },
      ],
    });

    this.registerSchema({
      name: 'register',
      rules: [
        { field: 'email', type: 'email', required: true },
        { field: 'password', type: 'string', required: true, minLength: 8 },
        { field: 'username', type: 'string', required: true, minLength: 3, maxLength: 30 },
        { field: 'firstName', type: 'string', required: false, maxLength: 50 },
        { field: 'lastName', type: 'string', required: false, maxLength: 50 },
      ],
    });

    // Club schemas
    this.registerSchema({
      name: 'createClub',
      rules: [
        { field: 'name', type: 'string', required: true, minLength: 3, maxLength: 100 },
        { field: 'description', type: 'string', required: true, minLength: 10, maxLength: 1000 },
        { field: 'category', type: 'string', required: true },
        { field: 'isPrivate', type: 'boolean', required: false },
        { field: 'location', type: 'string', required: false, maxLength: 200 },
      ],
    });

    // Event schemas
    this.registerSchema({
      name: 'createEvent',
      rules: [
        { field: 'title', type: 'string', required: true, minLength: 3, maxLength: 200 },
        { field: 'description', type: 'string', required: true, minLength: 10, maxLength: 2000 },
        { field: 'startDate', type: 'string', required: true },
        { field: 'endDate', type: 'string', required: false },
        { field: 'location', type: 'string', required: true, maxLength: 200 },
        { field: 'maxAttendees', type: 'number', required: false, min: 1, max: 10000 },
        { field: 'isPrivate', type: 'boolean', required: false },
        { field: 'clubId', type: 'uuid', required: true },
      ],
    });

    // Response schemas
    this.registerSchema({
      name: 'apiResponse',
      rules: [
        { field: 'success', type: 'boolean', required: true },
        { field: 'data', type: 'object', required: false },
        { field: 'message', type: 'string', required: false },
        { field: 'error', type: 'string', required: false },
      ],
    });

    this.registerSchema({
      name: 'paginatedResponse',
      rules: [
        { field: 'data', type: 'array', required: true },
        { field: 'pagination', type: 'object', required: true },
        { field: 'pagination.page', type: 'number', required: true, min: 1 },
        { field: 'pagination.limit', type: 'number', required: true, min: 1, max: 100 },
        { field: 'pagination.total', type: 'number', required: true, min: 0 },
        { field: 'pagination.totalPages', type: 'number', required: true, min: 0 },
      ],
    });
  }

  registerSchema(schema: ValidationSchema) {
    this.schemas.set(schema.name, schema);
    logger.debug(`Validation schema registered: ${schema.name}`);
  }

  validateRequest(schemaName: string, data: any): ValidationResult {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      logger.warn(`Validation schema not found: ${schemaName}`);
      return { valid: true, errors: [] };
    }

    return this.validate(data, schema.rules);
  }

  validateResponse(data: any): ValidationResult {
    // Basic response structure validation
    const result = this.validateRequest('apiResponse', data);
    
    if (result.valid && data.data && Array.isArray(data.data) && data.pagination) {
      // Validate paginated response
      const paginationResult = this.validateRequest('paginatedResponse', data);
      if (!paginationResult.valid) {
        return paginationResult;
      }
    }

    return result;
  }

  private validate(data: any, rules: ValidationRule[]): ValidationResult {
    const errors: Array<{ field: string; message: string; value?: any }> = [];

    for (const rule of rules) {
      const value = this.getNestedValue(data, rule.field);
      const fieldError = this.validateField(rule.field, value, rule);
      
      if (fieldError) {
        errors.push({
          field: rule.field,
          message: fieldError,
          value,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private validateField(fieldName: string, value: any, rule: ValidationRule): string | null {
    // Check required
    if (rule.required && (value === undefined || value === null)) {
      return `${fieldName} is required`;
    }

    // Skip further validation if field is not required and empty
    if (!rule.required && (value === undefined || value === null)) {
      return null;
    }

    // Type validation
    const typeError = this.validateType(fieldName, value, rule.type);
    if (typeError) {
      return typeError;
    }

    // Length validation for strings
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return `${fieldName} must be at least ${rule.minLength} characters long`;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        return `${fieldName} must be no more than ${rule.maxLength} characters long`;
      }
    }

    // Numeric range validation
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return `${fieldName} must be at least ${rule.min}`;
      }
      if (rule.max !== undefined && value > rule.max) {
        return `${fieldName} must be no more than ${rule.max}`;
      }
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
      if (!rule.pattern.test(value)) {
        return `${fieldName} format is invalid`;
      }
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (typeof customResult === 'string') {
        return customResult;
      }
      if (customResult === false) {
        return `${fieldName} is invalid`;
      }
    }

    return null;
  }

  private validateType(fieldName: string, value: any, type: string): string | null {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          return `${fieldName} must be a string`;
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `${fieldName} must be a number`;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${fieldName} must be a boolean`;
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          return `${fieldName} must be an array`;
        }
        break;

      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          return `${fieldName} must be an object`;
        }
        break;

      case 'email':
        if (typeof value !== 'string' || !this.isValidEmail(value)) {
          return `${fieldName} must be a valid email address`;
        }
        break;

      case 'url':
        if (typeof value !== 'string' || !this.isValidUrl(value)) {
          return `${fieldName} must be a valid URL`;
        }
        break;

      case 'uuid':
        if (typeof value !== 'string' || !this.isValidUuid(value)) {
          return `${fieldName} must be a valid UUID`;
        }
        break;

      default:
        logger.warn(`Unknown validation type: ${type}`);
        break;
    }

    return null;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  // Sanitization methods
  sanitizeInput(data: any): any {
    if (typeof data === 'string') {
      return data.trim();
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return data;
  }

  removeExtraFields(data: any, allowedFields: string[]): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const filtered: any = {};
    for (const field of allowedFields) {
      if (data.hasOwnProperty(field)) {
        filtered[field] = data[field];
      }
    }

    return filtered;
  }
}

export const requestValidator = new RequestValidator();