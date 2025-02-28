/**
 * @module swaggerConfig
 * @description Swagger/OpenAPI configuration for API documentation
 * @requires swagger-ui-express
 * @requires yamljs
 * @requires path
 */

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

/**
 * @constant {Object} swaggerDocument
 * @description Loaded Swagger/OpenAPI specification from YAML file
 * @private
 */
// Try to load from documentation/api directory first, then fallback to a simple definition if not found
let swaggerDocument;
try {
  swaggerDocument = YAML.load(path.join(__dirname, '../../documentation/api/swagger.yaml'));
} catch (error) {
  console.warn('Swagger YAML file not found, using default definition');
  swaggerDocument = {
    openapi: '3.0.0',
    info: {
      title: 'PulsePlus API',
      version: '1.0.0',
      description: 'API documentation for PulsePlus'
    },
    paths: {
      '/health': {
        get: {
          summary: 'Health check endpoint',
          responses: {
            '200': {
              description: 'API is healthy'
            }
          }
        }
      }
    }
  };
}

/**
 * @constant {Object} options
 * @description Swagger UI customization options
 * @property {string} customCss - Custom CSS to hide the default topbar
 * @property {string} customSiteTitle - Custom title for the documentation page
 * @property {string} customfavIcon - Custom favicon path
 * @private
 */
const options = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "PulsePlus API Documentation",
  customfavIcon: "/favicon.ico"
};

/**
 * @exports swaggerConfig
 * @type {Object}
 * @property {Function} serve - Swagger UI middleware
 * @property {Function} setup - Swagger UI setup with loaded documentation
 */
module.exports = {
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(swaggerDocument, options)
}; 