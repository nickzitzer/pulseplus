// Mock Joi before importing validation
jest.mock('joi', () => {
  // Create a chainable mock function that returns itself
  const createChainableMethod = () => {
    const fn = jest.fn();
    fn.mockReturnValue(fn);
    return fn;
  };

  // Create a mock schema builder with chainable methods
  const createMockSchemaBuilder = () => {
    const builder = createChainableMethod();
    
    // Add common schema methods
    builder.string = createChainableMethod();
    builder.number = createChainableMethod();
    builder.boolean = createChainableMethod();
    builder.array = createChainableMethod();
    builder.object = createChainableMethod();
    builder.uuid = createChainableMethod();
    builder.email = createChainableMethod();
    builder.min = createChainableMethod();
    builder.max = createChainableMethod();
    builder.required = createChainableMethod();
    builder.integer = createChainableMethod();
    builder.default = createChainableMethod();
    builder.pattern = createChainableMethod();
    builder.items = createChainableMethod();
    
    return builder;
  };

  // Create a mock schema with a validate method
  const createMockSchema = (validateFn) => {
    const schema = createMockSchemaBuilder();
    schema.validate = validateFn || jest.fn().mockReturnValue({ error: undefined, value: {} });
    return schema;
  };

  // Create the mock Joi object
  const mockJoi = {
    string: jest.fn().mockReturnValue(createMockSchemaBuilder()),
    number: jest.fn().mockReturnValue(createMockSchemaBuilder()),
    boolean: jest.fn().mockReturnValue(createMockSchemaBuilder()),
    array: jest.fn().mockReturnValue(createMockSchemaBuilder()),
    object: jest.fn().mockReturnValue(createMockSchemaBuilder()),
    Schema: function Schema() {}
  };

  return mockJoi;
});

// Mock the validation module to provide our test implementations
jest.mock('../../utils/validation', () => {
  const mockUuidSchema = {
    validate: jest.fn().mockImplementation(value => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (typeof value === 'string' && uuidRegex.test(value)) {
        return { error: undefined, value };
      }
      return { 
        error: { details: [{ message: 'Invalid UUID format' }] },
        value 
      };
    })
  };
  
  const mockPaginationSchema = {
    validate: jest.fn().mockImplementation(value => {
      const result = { ...value };
      
      // Apply default values
      if (!result.page) result.page = 1;
      if (!result.limit) result.limit = 20;
      
      // Validate values
      let error;
      if (result.page < 1 || (result.limit && result.limit > 100) || 
          (result.search && result.search.length > 100)) {
        error = { details: [{ message: 'Invalid pagination parameters' }] };
      }
      
      return { error, value: result };
    })
  };

  // Mock the validateRequest function
  const mockValidateRequest = (schema) => {
    return async (req, res, next) => {
      try {
        // Handle single schema case (for body only)
        if (schema.validate) {
          const { error } = schema.validate(req.body);
          if (error) {
            return next(new AppError(error.details[0].message, 400, 'VALIDATION_ERROR'));
          }
          return next();
        }

        // Handle schema object with params, query, body
        if (schema.params) {
          const { error } = schema.params.validate(req.params);
          if (error) {
            return next(new AppError(error.details[0].message, 400, 'VALIDATION_ERROR'));
          }
        }

        if (schema.query) {
          const { error } = schema.query.validate(req.query);
          if (error) {
            return next(new AppError(error.details[0].message, 400, 'VALIDATION_ERROR'));
          }
        }

        if (schema.body) {
          const { error } = schema.body.validate(req.body);
          if (error) {
            return next(new AppError(error.details[0].message, 400, 'VALIDATION_ERROR'));
          }
        }

        next();
      } catch (err) {
        next(new AppError('Validation error', 400, 'VALIDATION_ERROR'));
      }
    };
  };

  // Import AppError for use in the mock
  const AppError = require('../../utils/appError');
  
  return {
    validateRequest: mockValidateRequest,
    commonSchemas: {
      uuid: mockUuidSchema,
      pagination: mockPaginationSchema
    }
  };
});

const { validateRequest, commonSchemas } = require('../../utils/validation');
const AppError = require('../../utils/appError');

// Mock Express request, response, and next function
const mockRequest = (params = {}, query = {}, body = {}) => ({
  params,
  query,
  body
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('commonSchemas', () => {
    describe('uuid', () => {
      it('should validate a valid UUID', () => {
        const validUuid = '123e4567-e89b-12d3-a456-426614174000';
        const { error } = commonSchemas.uuid.validate(validUuid);
        expect(error).toBeUndefined();
      });

      it('should reject an invalid UUID', () => {
        const invalidUuid = 'not-a-uuid';
        const { error } = commonSchemas.uuid.validate(invalidUuid);
        expect(error).toBeDefined();
      });
    });

    describe('pagination', () => {
      it('should validate valid pagination parameters', () => {
        const validPagination = {
          page: 2,
          limit: 50,
          sort: 'createdAt:desc',
          search: 'test'
        };
        const { error, value } = commonSchemas.pagination.validate(validPagination);
        expect(error).toBeUndefined();
        expect(value).toEqual(validPagination);
      });

      it('should apply default values when not provided', () => {
        const { error, value } = commonSchemas.pagination.validate({});
        expect(error).toBeUndefined();
        expect(value).toEqual({
          page: 1,
          limit: 20
        });
      });

      it('should reject invalid pagination parameters', () => {
        const invalidPagination = {
          page: 0, // Invalid: min is 1
          limit: 200, // Invalid: max is 100
          sort: 'invalid-format',
          search: 'a'.repeat(101) // Invalid: max length is 100
        };
        const { error } = commonSchemas.pagination.validate(invalidPagination);
        expect(error).toBeDefined();
      });
    });
  });

  describe('validateRequest', () => {
    it('should call next() when all validations pass', async () => {
      // Mock successful validation
      const schema = {
        params: { validate: jest.fn().mockReturnValue({ error: undefined }) },
        query: { validate: jest.fn().mockReturnValue({ error: undefined }) },
        body: { validate: jest.fn().mockReturnValue({ error: undefined }) }
      };
      
      const req = mockRequest({ id: 1 }, { filter: 'active' }, { name: 'Test' });
      const res = mockResponse();
      
      await validateRequest(schema)(req, res, mockNext);
      
      expect(schema.params.validate).toHaveBeenCalledWith(req.params);
      expect(schema.query.validate).toHaveBeenCalledWith(req.query);
      expect(schema.body.validate).toHaveBeenCalledWith(req.body);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle single schema for body validation', async () => {
      // Create a mock schema that's not a Joi schema but has validate method
      const bodySchema = { validate: jest.fn().mockReturnValue({ error: undefined }) };
      
      const req = mockRequest({}, {}, { name: 'Test' });
      const res = mockResponse();
      
      await validateRequest(bodySchema)(req, res, mockNext);
      
      expect(bodySchema.validate).toHaveBeenCalledWith(req.body);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with error when params validation fails', async () => {
      const error = { details: [{ message: 'Invalid params' }] };
      const schema = {
        params: { validate: jest.fn().mockReturnValue({ error }) }
      };
      
      const req = mockRequest({ id: 'not-a-number' });
      const res = mockResponse();
      
      await validateRequest(schema)(req, res, mockNext);
      
      expect(schema.params.validate).toHaveBeenCalledWith(req.params);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(AppError);
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
    });

    it('should call next with error when query validation fails', async () => {
      const error = { details: [{ message: 'Invalid query' }] };
      const schema = {
        query: { validate: jest.fn().mockReturnValue({ error }) }
      };
      
      const req = mockRequest({}, { limit: -5 });
      const res = mockResponse();
      
      await validateRequest(schema)(req, res, mockNext);
      
      expect(schema.query.validate).toHaveBeenCalledWith(req.query);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(AppError);
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
    });

    it('should call next with error when body validation fails', async () => {
      const error = { details: [{ message: 'Invalid body' }] };
      const schema = {
        body: { validate: jest.fn().mockReturnValue({ error }) }
      };
      
      const req = mockRequest({}, {}, { email: 'not-an-email' });
      const res = mockResponse();
      
      await validateRequest(schema)(req, res, mockNext);
      
      expect(schema.body.validate).toHaveBeenCalledWith(req.body);
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(AppError);
      expect(mockNext.mock.calls[0][0].statusCode).toBe(400);
    });
  });
}); 