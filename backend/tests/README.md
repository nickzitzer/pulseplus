# Backend Testing Guide

This directory contains tests for the backend application. The tests are organized by module type, with subdirectories for different components of the system.

## Test Structure

- `tests/utils/` - Tests for utility functions
- `tests/middleware/` - Tests for middleware components
- `tests/routes/` - Tests for API routes
- `tests/services/` - Tests for service layer
- `tests/models/` - Tests for data models
- `tests/integration/` - Integration tests across multiple components

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Writing Tests

### Unit Tests

Unit tests should focus on testing a single function or component in isolation. Dependencies should be mocked.

Example:

```javascript
const { functionToTest } = require('../../path/to/module');

describe('functionToTest', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test input';
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Integration Tests

Integration tests should test the interaction between multiple components.

Example:

```javascript
const request = require('supertest');
const app = require('../../app');

describe('GET /api/resource', () => {
  it('should return a list of resources', async () => {
    const response = await request(app)
      .get('/api/resource')
      .expect(200);
    
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});
```

### Mocking

Use Jest's mocking capabilities to mock dependencies:

```javascript
// Mock a module
jest.mock('../../path/to/dependency', () => ({
  someFunction: jest.fn().mockReturnValue('mocked value')
}));

// Mock a specific function
const dependency = require('../../path/to/dependency');
dependency.someFunction = jest.fn().mockReturnValue('mocked value');
```

## Best Practices

1. **Test behavior, not implementation** - Focus on what the code does, not how it does it.
2. **Keep tests independent** - Each test should be able to run independently of others.
3. **Use descriptive test names** - Test names should describe the expected behavior.
4. **Follow AAA pattern** - Arrange, Act, Assert.
5. **Mock external dependencies** - Don't rely on external services in unit tests.
6. **Test edge cases** - Test boundary conditions and error cases.
7. **Keep tests fast** - Tests should run quickly to encourage frequent testing.
8. **Maintain test coverage** - Aim for high test coverage, especially for critical code paths.

## Code Coverage

The test coverage report can be found in the `coverage` directory after running `npm run test:coverage`. Aim for at least 80% coverage for critical modules. 