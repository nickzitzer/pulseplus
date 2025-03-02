/**
 * Form validation utilities
 */

export type ValidationRule = (value: any, formValues?: Record<string, any>) => string | null;

export interface ValidationRules {
  [key: string]: ValidationRule[];
}

export interface ValidationErrors {
  [key: string]: string | null;
}

/**
 * Validate a single field with multiple rules
 * @param value - The field value to validate
 * @param rules - Array of validation rules to apply
 * @param formValues - Optional form values for cross-field validation
 * @returns Error message or null if valid
 */
export function validateField(
  value: any,
  rules: ValidationRule[],
  formValues?: Record<string, any>
): string | null {
  for (const rule of rules) {
    const error = rule(value, formValues);
    if (error) {
      return error;
    }
  }
  return null;
}

/**
 * Validate an entire form
 * @param values - Form values
 * @param validationRules - Validation rules for each field
 * @returns Object with validation errors
 */
export function validateForm(
  values: Record<string, any>,
  validationRules: ValidationRules
): ValidationErrors {
  const errors: ValidationErrors = {};
  
  Object.entries(validationRules).forEach(([field, rules]) => {
    const error = validateField(values[field], rules, values);
    errors[field] = error;
  });
  
  return errors;
}

/**
 * Check if a form has any validation errors
 * @param errors - Validation errors object
 * @returns True if form has errors
 */
export function hasErrors(errors: ValidationErrors): boolean {
  return Object.values(errors).some(error => error !== null);
}

// Common validation rules

/**
 * Required field validation
 * @param message - Custom error message
 * @returns Validation rule function
 */
export function required(message: string = 'This field is required'): ValidationRule {
  return (value) => {
    if (value === undefined || value === null || value === '') {
      return message;
    }
    if (Array.isArray(value) && value.length === 0) {
      return message;
    }
    return null;
  };
}

/**
 * Minimum length validation
 * @param length - Minimum required length
 * @param message - Custom error message
 * @returns Validation rule function
 */
export function minLength(length: number, message?: string): ValidationRule {
  return (value) => {
    if (!value || value.length < length) {
      return message || `Must be at least ${length} characters`;
    }
    return null;
  };
}

/**
 * Maximum length validation
 * @param length - Maximum allowed length
 * @param message - Custom error message
 * @returns Validation rule function
 */
export function maxLength(length: number, message?: string): ValidationRule {
  return (value) => {
    if (value && value.length > length) {
      return message || `Must be no more than ${length} characters`;
    }
    return null;
  };
}

/**
 * Email format validation
 * @param message - Custom error message
 * @returns Validation rule function
 */
export function email(message: string = 'Please enter a valid email address'): ValidationRule {
  return (value) => {
    if (!value) return null;
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) {
      return message;
    }
    return null;
  };
}

/**
 * Numeric value validation
 * @param message - Custom error message
 * @returns Validation rule function
 */
export function numeric(message: string = 'Please enter a valid number'): ValidationRule {
  return (value) => {
    if (!value) return null;
    
    if (isNaN(Number(value))) {
      return message;
    }
    return null;
  };
}

/**
 * Minimum value validation
 * @param min - Minimum allowed value
 * @param message - Custom error message
 * @returns Validation rule function
 */
export function min(min: number, message?: string): ValidationRule {
  return (value) => {
    if (!value) return null;
    
    const numValue = Number(value);
    if (isNaN(numValue) || numValue < min) {
      return message || `Must be at least ${min}`;
    }
    return null;
  };
}

/**
 * Maximum value validation
 * @param max - Maximum allowed value
 * @param message - Custom error message
 * @returns Validation rule function
 */
export function max(max: number, message?: string): ValidationRule {
  return (value) => {
    if (!value) return null;
    
    const numValue = Number(value);
    if (isNaN(numValue) || numValue > max) {
      return message || `Must be no more than ${max}`;
    }
    return null;
  };
}

/**
 * Pattern validation using regular expression
 * @param pattern - Regular expression pattern
 * @param message - Custom error message
 * @returns Validation rule function
 */
export function pattern(pattern: RegExp, message: string = 'Invalid format'): ValidationRule {
  return (value) => {
    if (!value) return null;
    
    if (!pattern.test(value)) {
      return message;
    }
    return null;
  };
}

/**
 * Match another field validation (e.g., password confirmation)
 * @param fieldName - Name of the field to match
 * @param message - Custom error message
 * @returns Validation rule function
 */
export function matches(fieldName: string, message?: string): ValidationRule {
  return (value, formValues) => {
    if (!formValues) return null;
    
    if (value !== formValues[fieldName]) {
      return message || `Must match ${fieldName}`;
    }
    return null;
  };
}

/**
 * Custom validation rule
 * @param validator - Custom validation function
 * @param message - Error message
 * @returns Validation rule function
 */
export function custom(
  validator: (value: any, formValues?: Record<string, any>) => boolean,
  message: string
): ValidationRule {
  return (value, formValues) => {
    if (!validator(value, formValues)) {
      return message;
    }
    return null;
  };
}

export default {
  validateField,
  validateForm,
  hasErrors,
  required,
  minLength,
  maxLength,
  email,
  numeric,
  min,
  max,
  pattern,
  matches,
  custom,
}; 