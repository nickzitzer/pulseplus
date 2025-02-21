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
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/swagger.yaml'));

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