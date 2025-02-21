/**
 * @module responseHandler
 * @description Standardized response handling utility for Express applications
 * @exports responseHandler
 */

/**
 * @typedef {Object} ResponseHandler
 * @property {Function} sendSuccess - Send a success response
 * @property {Function} sendCreated - Send a created response
 * @property {Function} sendUpdated - Send an updated response
 * @property {Function} sendDeleted - Send a deleted response
 * @property {Function} sendError - Send an error response
 */

const responseHandler = {
  /**
   * @function sendSuccess
   * @description Send a success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} [message=''] - Optional success message
   * @param {number} [statusCode=200] - HTTP status code
   * @returns {void}
   */
  sendSuccess: (res, data, message = '', statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      message,
      data
    });
  },

  /**
   * @function sendCreated
   * @description Send a created response with 201 status
   * @param {Object} res - Express response object
   * @param {*} data - Created resource data
   * @param {string} [message='Resource created successfully'] - Success message
   * @returns {void}
   */
  sendCreated: (res, data, message = 'Resource created successfully') => {
    res.status(201).json({
      success: true,
      message,
      data
    });
  },

  /**
   * @function sendUpdated
   * @description Send an updated response with 200 status
   * @param {Object} res - Express response object
   * @param {*} data - Updated resource data
   * @param {string} [message='Resource updated successfully'] - Success message
   * @returns {void}
   */
  sendUpdated: (res, data, message = 'Resource updated successfully') => {
    res.status(200).json({
      success: true,
      message,
      data
    });
  },

  /**
   * @function sendDeleted
   * @description Send a deleted response with 204 status
   * @param {Object} res - Express response object
   * @param {string} [message='Resource deleted successfully'] - Success message
   * @returns {void}
   */
  sendDeleted: (res, message = 'Resource deleted successfully') => {
    res.status(204).json({
      success: true,
      message,
      data: null
    });
  },

  /**
   * @function sendError
   * @description Send an error response with appropriate status code and details
   * @param {Object} res - Express response object
   * @param {Error} error - Error object
   * @param {number} [error.statusCode=500] - HTTP status code
   * @param {string} [error.name='Error'] - Error type
   * @param {string} [error.errorCode='INTERNAL_ERROR'] - Application error code
   * @param {*} [error.details=null] - Additional error details
   * @returns {void}
   */
  sendError: (res, error) => {
    const statusCode = error.statusCode || 500;
    const message = error.isOperational ? error.message : 'An unexpected error occurred';
    const errorType = error.name || 'Error';
    const errorCode = error.errorCode || 'INTERNAL_ERROR';
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: statusCode,
        type: errorType,
        errorCode,
        message,
        details: error.details || null,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
};

module.exports = responseHandler; 