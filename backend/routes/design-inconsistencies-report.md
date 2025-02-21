# Route Design Inconsistencies Report

## Overview
This report documents design inconsistencies found across the route files in the backend/routes directory. The analysis covers social-routes.js, economy-routes.js, game-routes.js, season-routes.js, and user-routes.js.

## Critical Inconsistencies

### 1. Security & Middleware Order
Current implementations:
```javascript
// Pattern 1: Rate limiting before auth
router.post('/friends/requests',
  socialRateLimiters.friendRequests,
  verifyToken,
  validateRequest(...)
)

// Pattern 2: Auth before rate limiting
router.get('/balance/:competitorId',
  verifyToken,
  rateLimitPresets.STANDARD,
  validateRequest(...)
)
```
**Impact**: Inconsistent security barrier ordering could lead to rate limit bypassing or unnecessary auth checks.
**Recommendation**: Standardize middleware order:
1. Rate limiting
2. Authentication
3. Validation
4. Business logic

### 2. Route Architecture
**Current State**:
- social-routes.js: Uses crudFactory with custom endpoints
- economy-routes.js: Manual route definitions
- game-routes.js: Mixed approach
- season-routes.js: Manual route definitions
- user-routes.js: Uses crudFactory with extensive custom routes

**Impact**: Inconsistent patterns make maintenance and debugging more difficult.
**Recommendation**: Standardize on crudFactory pattern with custom endpoints where needed.

### 3. Validation Approaches
**Current Patterns**:
```javascript
// Pattern 1: Object syntax
validateRequest({
  params: commonSchemas.uuid,
  body: schema
})

// Pattern 2: Direct schema
validateRequest(schema)
```
**Recommendation**: Standardize on object syntax for clarity and consistency.

## Functional Inconsistencies

### 4. Caching Implementation
**Current Patterns**:
```javascript
// Pattern 1: Direct cache manager
const cached = cacheManager.get(CACHE_NAMES.SOCIAL, cacheKey);

// Pattern 2: Manual timestamp checking
if (cached && (now - cached.timestamp) < CACHE_DURATION)
```
**Impact**: Different caching behaviors across routes.
**Recommendation**: Standardize on cacheManager with consistent TTL configuration.

### 5. Response Handling
**Current Patterns**:
```javascript
// Pattern 1: With message
responseHandler.sendSuccess(res, result, 'Operation successful');

// Pattern 2: Without message
responseHandler.sendSuccess(res, result);
```
**Recommendation**: Standardize response format and message inclusion.

### 6. Audit Logging
**Coverage**:
- social-routes.js: Complete coverage
- economy-routes.js: Complete coverage
- game-routes.js: Partial coverage
- season-routes.js: Inconsistent coverage
- user-routes.js: Complete coverage

**Recommendation**: Implement audit logging for all write operations.

## Naming & Convention Inconsistencies

### 7. Route Parameters
**Current Patterns**:
- :id
- :userId
- :friend_id
- :competitorId

**Impact**: Reduces code predictability and makes API documentation more complex.
**Recommendation**: Standardize on camelCase for all parameters.

### 8. Resource Naming
**Current Patterns**:
- /feeds (plural)
- /friend (singular)
- /shop vs /shops

**Recommendation**: Use plural nouns for all resource collections.

### 9. File Upload Handling
**Current Implementations**:
```javascript
uploadService.handle('attachments')
uploadService.handle('icons')
uploadService.handle('avatar')
```
**Recommendation**: Create enum for upload types and standardize usage.

## Performance Considerations

### 10. Pagination Implementation
**Current Patterns**:
```javascript
// Pattern 1
{
  limit: parseInt(req.query.limit) || 50,
  offset: parseInt(req.query.offset) || 0
}

// Pattern 2
{
  limit: parseInt(req.query.limit) || 100
}
```
**Recommendation**: Implement consistent pagination defaults across all routes.

## Recommended Action Items

### Immediate Actions
1. Create middleware configuration standard
2. Implement consistent route factory pattern
3. Standardize validation approach
4. Create central pagination config

### Short-term Improvements
1. Audit and standardize response messages
2. Implement consistent parameter naming
3. Create upload type enums
4. Standardize cache implementation

### Long-term Goals
1. Create automated linting rules for:
   - Middleware order
   - Audit logging presence
   - Response format consistency
2. Implement API documentation generator
3. Create route testing standards

## Implementation Guide

### Standard Middleware Order
```javascript
router.method('/path',
  rateLimitPresets.STANDARD,
  verifyToken,
  validateRequest({
    params: schema.params,
    body: schema.body,
    query: schema.query
  }),
  checkPermission(PERMISSIONS.TYPE),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        // Business logic
        await auditLog(client, req.user, 'ACTION', {
          table: 'table_name',
          id: result.sys_id,
          new: result
        });
        return result;
      });
      responseHandler.sendSuccess(res, result, 'Operation successful');
    } catch (error) {
      next(error);
    }
  }
);
```

### Standard CRUD Factory Usage
```javascript
module.exports = crudFactory({
  resourceName: 'resource',
  schema: validationSchemas.resource,
  middleware: [verifyToken],
  validations: {
    create: {
      body: schema,
      permissions: [PERMISSIONS.TYPE]
    }
  },
  customEndpoints: (router) => {
    // Custom route definitions
    return router;
  }
});
```

## Next Steps
1. Review and approve standardization approach
2. Create implementation timeline
3. Develop automated testing for standards
4. Update API documentation

## Appendix
- Analyzed Files:
  - social-routes.js
  - economy-routes.js
  - game-routes.js
  - season-routes.js
  - user-routes.js
- Related Utils:
  - schemas.js
  - routeHelpers.js
  - validation.js
  - responseHandler.js

## Additional Inconsistencies

### 11. Error Handling Patterns
**Current Patterns**:
```javascript
// Pattern 1: Using AppError
throw new AppError(error.details[0].message, 400);

// Pattern 2: Direct error passing
next(error);
```
**Recommendation**: Standardize error handling using AppError with consistent status codes.

### 12. Transaction Handling
**Current Patterns**:
```javascript
// Pattern 1: Direct withTransaction usage
const result = await withTransaction(async (client) => {
  // Logic
});

// Pattern 2: Nested transaction with auditLog
await withTransaction(async (client) => {
  const result = await operation(client);
  await auditLog(client, user, 'ACTION', {...});
  responseHandler.sendSuccess(res, result);
});
```
**Recommendation**: Standardize on returning results from transactions and handling responses outside.

### 13. Permission Validation Timing
**Current Patterns**:
```javascript
// Pattern 1: Route-level middleware
checkPermission(PERMISSIONS.TYPE)

// Pattern 2: Service-level validation
await validatePermissions(client, req.user.sys_id, gameId, ['MANAGE_GAME'])
```
**Recommendation**: Move all permission checks to route level using middleware.

### 14. Cache Key Construction
**Current Patterns**:
```javascript
// Pattern 1: Simple concatenation
const cacheKey = `profile-${userId}`;

// Pattern 2: Complex key with multiple parameters
const cacheKey = `${req.params.id}-${req.query.type}-${req.query.timeframe}`;
```
**Recommendation**: Create a standardized cache key generation utility.

### 15. Service Layer Integration
**Current Patterns**:
```javascript
// Pattern 1: Direct service calls
const result = await SocialService.sendFriendRequest(client, {...});

// Pattern 2: Service calls with additional processing
const data = await GameService.getGameStats(client, gameId);
cacheManager.set(CACHE_NAMES.GAME, cacheKey, {
  data: data,
  timestamp: now
});
```
**Recommendation**: Standardize service layer interaction patterns and separate concerns.

### 16. Query Parameter Handling
**Current Patterns**:
```javascript
// Pattern 1: Direct parsing
limit: parseInt(req.query.limit) || 50

// Pattern 2: Validation schema
query: gameValidationSchemas.leaderboardQuery

// Pattern 3: Mixed approach
timeframe: req.query.timeframe,
limit: parseInt(req.query.limit) || 100
```
**Recommendation**: Use validation schemas consistently for all query parameters.

### 17. WebSocket Integration Points
**Current Patterns**:
- Inconsistent handling of real-time updates across routes
- Mixed patterns for notification dispatch
**Recommendation**: Standardize WebSocket event emission patterns.

## Best Practices Guide

### Standard Route Structure
```javascript
// 1. Imports
const express = require('express');
const router = express.Router();
const {
  validateRequest,
  withTransaction,
  auditLog
} = require('../utils/routeHelpers');

// 2. Constants
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// 3. Route Definitions
router.method('/path',
  // Middleware (ordered)
  rateLimitPresets.TYPE,
  verifyToken,
  validateRequest({...}),
  checkPermission(PERMISSIONS.TYPE),
  async (req, res, next) => {
    try {
      const result = await withTransaction(async (client) => {
        // Business logic
        const data = await Service.operation(client, params);
        
        // Audit logging
        await auditLog(client, req.user, 'ACTION', {
          table: 'table_name',
          id: data.sys_id,
          new: data
        });
        
        return data;
      });

      // Cache if needed
      if (shouldCache) {
        cacheManager.set(CACHE_NAMES.TYPE, cacheKey, result);
      }

      // Response
      responseHandler.sendSuccess(res, result, 'Operation successful');
    } catch (error) {
      next(error);
    }
  }
);
```

### Standard Error Status Codes
- 400: Bad Request (validation errors)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (business rule violations)
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error

## Testing Requirements

### Route Test Coverage
Each route should have tests for:
1. Success cases
2. Validation failures
3. Permission checks
4. Rate limiting
5. Cache behavior
6. Error handling

### Performance Testing
- Response time benchmarks
- Cache hit ratios
- Rate limit effectiveness

## Monitoring Recommendations

### Key Metrics
1. Route response times
2. Error rates by type
3. Cache hit/miss ratios
4. Rate limit triggers
5. Authentication failures

### Logging Standards
All routes should log:
1. Request completion
2. Error occurrences
3. Cache operations
4. Permission checks
5. Rate limit hits

## Implementation Checklist

### For Each Route File
- [x] Standardize middleware order
- [x] Implement consistent validation
- [x] Add proper error handling
- [x] Standardize response format
- [x] Add appropriate caching
- [x] Include audit logging
- [x] Add rate limiting
- [ ] Document with JSDoc

### For the System
- [ ] Create middleware configuration
- [ ] Set up linting rules
- [ ] Implement testing framework
- [ ] Create monitoring setup
- [ ] Document standards
