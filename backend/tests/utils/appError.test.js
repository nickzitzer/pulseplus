const AppError = require('../../utils/appError');

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an error with the provided message and statusCode', () => {
      const message = 'Test error message';
      const statusCode = 400;
      const error = new AppError(message, statusCode);
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(statusCode);
    });

    it('should use the default errorCode when not provided', () => {
      const error = new AppError('Test message', 500);
      expect(error.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should use the provided errorCode when specified', () => {
      const errorCode = 'VALIDATION_ERROR';
      const error = new AppError('Test message', 400, errorCode);
      expect(error.errorCode).toBe(errorCode);
    });

    it('should store additional details when provided', () => {
      const details = { field: 'username', issue: 'already exists' };
      const error = new AppError('Test message', 400, 'VALIDATION_ERROR', details);
      expect(error.details).toEqual(details);
    });

    it('should set isOperational flag to true', () => {
      const error = new AppError('Test message', 500);
      expect(error.isOperational).toBe(true);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test message', 500);
      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
    });
  });
}); 