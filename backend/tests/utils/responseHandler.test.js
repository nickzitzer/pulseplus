const responseHandler = require('../../utils/responseHandler');
const AppError = require('../../utils/appError');

describe('responseHandler', () => {
  let mockRes;
  
  beforeEach(() => {
    // Create a mock Express response object
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('sendSuccess', () => {
    it('should send a success response with default parameters', () => {
      const data = { id: 1, name: 'Test' };
      
      responseHandler.sendSuccess(mockRes, data);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: '',
        data
      });
    });

    it('should send a success response with custom message and status code', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Custom success message';
      const statusCode = 202;
      
      responseHandler.sendSuccess(mockRes, data, message, statusCode);
      
      expect(mockRes.status).toHaveBeenCalledWith(statusCode);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        data
      });
    });
  });

  describe('sendCreated', () => {
    it('should send a created response with default message', () => {
      const data = { id: 1, name: 'Test' };
      
      responseHandler.sendCreated(mockRes, data);
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resource created successfully',
        data
      });
    });

    it('should send a created response with custom message', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'User created successfully';
      
      responseHandler.sendCreated(mockRes, data, message);
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        data
      });
    });
  });

  describe('sendUpdated', () => {
    it('should send an updated response with default message', () => {
      const data = { id: 1, name: 'Updated Test' };
      
      responseHandler.sendUpdated(mockRes, data);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resource updated successfully',
        data
      });
    });

    it('should send an updated response with custom message', () => {
      const data = { id: 1, name: 'Updated Test' };
      const message = 'User profile updated successfully';
      
      responseHandler.sendUpdated(mockRes, data, message);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        data
      });
    });
  });

  describe('sendDeleted', () => {
    it('should send a deleted response with default message', () => {
      responseHandler.sendDeleted(mockRes);
      
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resource deleted successfully',
        data: null
      });
    });

    it('should send a deleted response with custom message', () => {
      const message = 'User account deleted successfully';
      
      responseHandler.sendDeleted(mockRes, message);
      
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message,
        data: null
      });
    });
  });

  describe('sendError', () => {
    beforeEach(() => {
      // Save and mock process.env.NODE_ENV
      this.originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      // Restore process.env.NODE_ENV
      process.env.NODE_ENV = this.originalNodeEnv;
    });

    it('should send an error response with AppError', () => {
      const error = new AppError('Validation failed', 400, 'VALIDATION_ERROR', { field: 'email' });
      
      responseHandler.sendError(mockRes, error);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 400,
          type: 'Error',
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { field: 'email' },
          stack: undefined // Stack should be undefined in production
        }
      });
    });

    it('should send a generic error response for non-operational errors', () => {
      const error = new Error('Some unexpected error');
      
      responseHandler.sendError(mockRes, error);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 500,
          type: 'Error',
          errorCode: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          details: null,
          stack: undefined // Stack should be undefined in production
        }
      });
    });

    it('should include stack trace in development environment', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Development error');
      error.stack = 'Error stack trace';
      
      responseHandler.sendError(mockRes, error);
      
      expect(mockRes.json.mock.calls[0][0].error.stack).toBe('Error stack trace');
    });
  });
}); 