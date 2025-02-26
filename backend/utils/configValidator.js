/**
 * @module configValidator
 * @description Validates configuration values based on environment-specific rules
 * @requires joi
 */

const Joi = require('joi');

/**
 * @constant {Object} ENVIRONMENTS
 * @description Enumeration of supported environments
 */
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test'
};

/**
 * @constant {Object} validationSchemas
 * @description Environment-specific validation schemas
 * @private
 */
const validationSchemas = {
  // Base schema with common validations for all environments
  base: {
    db: Joi.object({
      host: Joi.string().required(),
      port: Joi.number().port().required(),
      database: Joi.string().required(),
      user: Joi.string().required(),
      password: Joi.string().required(),
      ssl_enabled: Joi.boolean().default(false),
      ssl_reject_unauthorized: Joi.boolean().default(true),
      ssl_ca_path: Joi.string().when('ssl_enabled', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      ssl_key_path: Joi.string().optional(),
      ssl_cert_path: Joi.string().optional()
    }).required(),
    
    redis: Joi.object({
      url: Joi.string().required(),
      port: Joi.number().port().required(),
      password: Joi.string().optional()
    }).required(),
    
    jwt: Joi.object({
      secret: Joi.string().min(32).required(),
      expiresIn: Joi.string().required()
    }).required(),
    
    email: Joi.object({
      host: Joi.string().required(),
      port: Joi.number().port().required(),
      user: Joi.string().required(),
      pass: Joi.string().required()
    }).required(),
    
    encryption: Joi.object({
      enabled: Joi.boolean().default(false)
    }).optional()
  },
  
  // Development environment schema
  [ENVIRONMENTS.DEVELOPMENT]: {
    // Development allows more flexibility
    db: Joi.object({
      ssl_enabled: Joi.boolean().default(false)
    }),
    jwt: Joi.object({
      secret: Joi.string().min(8).required() // Less strict for development
    })
  },
  
  // Staging environment schema
  [ENVIRONMENTS.STAGING]: {
    db: Joi.object({
      ssl_enabled: Joi.boolean().valid(true).required(), // SSL required
      ssl_reject_unauthorized: Joi.boolean().valid(true).required()
    }),
    jwt: Joi.object({
      secret: Joi.string().min(32).required()
    }),
    encryption: Joi.object({
      enabled: Joi.boolean().valid(true).required() // Encryption required
    })
  },
  
  // Production environment schema
  [ENVIRONMENTS.PRODUCTION]: {
    db: Joi.object({
      ssl_enabled: Joi.boolean().valid(true).required(), // SSL required
      ssl_reject_unauthorized: Joi.boolean().valid(true).required(),
      password: Joi.string().min(12).required() // Stronger password requirements
    }),
    jwt: Joi.object({
      secret: Joi.string().min(64).required() // Stronger secret requirements
    }),
    encryption: Joi.object({
      enabled: Joi.boolean().valid(true).required() // Encryption required
    })
  },
  
  // Test environment schema
  [ENVIRONMENTS.TEST]: {
    // Test environment can be more flexible
    db: Joi.object({
      ssl_enabled: Joi.boolean().default(false)
    })
  }
};

/**
 * @class ConfigValidator
 * @description Validates configuration values based on environment-specific rules
 */
class ConfigValidator {
  /**
   * @method validate
   * @description Validates a configuration object against environment-specific rules
   * @param {Object} config - Configuration object to validate
   * @param {string} environment - Environment name (development, staging, production, test)
   * @returns {Object} Validated configuration object
   * @throws {Error} If validation fails
   */
  static validate(config, environment = process.env.NODE_ENV || 'development') {
    // Normalize environment name
    const normalizedEnv = environment.toLowerCase();
    
    // Get the appropriate schema for the environment
    const envSchema = validationSchemas[normalizedEnv] || validationSchemas[ENVIRONMENTS.DEVELOPMENT];
    
    // Create a merged schema (base + environment-specific)
    const mergedSchema = Joi.object().keys({
      ...validationSchemas.base
    });
    
    // Apply environment-specific overrides
    for (const [key, schema] of Object.entries(envSchema)) {
      if (mergedSchema.extract(key)) {
        mergedSchema.$_terms.keys = mergedSchema.$_terms.keys.map(k => {
          if (k.key === key) {
            return { key, schema };
          }
          return k;
        });
      }
    }
    
    // Validate the configuration
    const { error, value } = mergedSchema.validate(config, {
      abortEarly: false,
      allowUnknown: true
    });
    
    if (error) {
      const details = error.details.map(detail => detail.message).join(', ');
      throw new Error(`Configuration validation failed for environment '${environment}': ${details}`);
    }
    
    return value;
  }
  
  /**
   * @method validateEnvironment
   * @description Validates that the current environment is properly configured
   * @param {Object} config - Configuration object to validate
   * @returns {Object} Validated configuration object
   * @throws {Error} If validation fails
   */
  static validateEnvironment(config) {
    const environment = process.env.NODE_ENV || 'development';
    return ConfigValidator.validate(config, environment);
  }
}

module.exports = {
  ConfigValidator,
  ENVIRONMENTS
}; 