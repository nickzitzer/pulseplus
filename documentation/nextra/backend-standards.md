# Backend Development Standards

## Table of Contents
1. [Security Standards](#security-standards)
2. [API Design Standards](#api-design-standards)
3. [Infrastructure Standards](#infrastructure-standards)
4. [Observability Standards](#observability-standards)
5. [Code Quality Standards](#code-quality-standards)
6. [Compliance Checklist](#compliance-checklist)

## Security Standards

### 1. Middleware Order (Critical)
**Requirement**: All routes must implement middleware in this exact order:
```javascript
router.method('/path',
  rateLimiter,      // Rate limiting first
  verifyToken,      // Authentication second
  validateRequest,  // Validation third
  checkPermissions, // Authorization fourth
  businessLogic     // Core functionality last
);
```

### 2. Headers Configuration
**Requirements**:
- All responses must include security headers via Helmet
- CORS must be explicitly configured
- Content Security Policy (CSP) must be enabled

```javascript
const helmet = require('helmet');

// Minimum security headers configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "trusted.cdn.com"],
      objectSrc: ["'none'"]
    }
  },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true }
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
}));
```

## API Design Standards

### 1. Route Architecture
**Requirements**:
- Use CRUD factory pattern for consistency
- Group related routes in dedicated files
- Version all API endpoints

```javascript
// routes/v1/user-routes.js
module.exports = crudFactory({
  resourceName: 'users',
  schema: userSchema,
  middleware: [verifyToken],
  validations: {
    create: {
      body: userCreateSchema,
      permissions: [PERMISSIONS.USER_MGMT]
    }
  }
});
```

### 2. Response Format
**Standard Response Structure**:
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": 1620000000,
    "traceId": "abc123"
  }
}
```

**Error Response Structure**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  }
}
```

## Infrastructure Standards

### 1. Docker Configuration
**Requirements**:
```yaml:docker-compose.yml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "20m"
        max-file: "5"
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
    secrets:
      - source: db_password
        target: DB_PASSWORD
```

### 2. CI/CD Pipeline
**Required Stages**:
```typescript
const pipeline = new Pipeline({
  stages: [
    {
      name: 'SecurityScan',
      actions: [SASTScan, DASTScan]
    },
    {
      name: 'Build',
      actions: [DockerBuild]
    },
    {
      name: 'Test',
      actions: [UnitTests, IntegrationTests]
    },
    {
      name: 'Deploy',
      actions: [StagingDeploy]
    }
  ]
});
```

## Observability Standards

### 1. Logging Requirements
**All logs must include**:
- Timestamp in ISO format
- Trace ID
- Service version
- Environment

```javascript
// Standard log format
{
  "timestamp": "2023-01-01T00:00:00Z",
  "level": "info",
  "message": "Request completed",
  "service": "backend",
  "version": "1.2.3",
  "traceId": "abc123",
  "duration": 150
}
```

### 2. Metrics Collection
**Required Metrics**:
```javascript
const httpMetrics = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 1.5, 5, 10]
});

const dbMetrics = new prometheus.Counter({
  name: 'db_operations_total',
  help: 'Total database operations',
  labelNames: ['table', 'operation']
});
```

## Code Quality Standards

### 1. Validation Rules
**Requirements**:
- Use Joi for schema validation
- Validate all input sources (body, params, query)
- Use shared validation schemas

```javascript
// schemas/user.js
exports.createUser = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

// In route definition
validateRequest({
  body: schemas.createUser,
  params: schemas.uuid
});
```

### 2. Error Handling
**Standard Pattern**:
```javascript
try {
  await businessLogic();
} catch (error) {
  if (error instanceof AppError) {
    next(error);
  } else {
    next(new AppError(
      'Internal Server Error',
      500,
      'SERVER_ERROR',
      { originalError: error.message }
    ));
  }
}
```

## Compliance Checklist

### Security Compliance
- [ ] All routes implement standard middleware order
- [ ] No credentials in version control
- [ ] CSP headers properly configured

### API Compliance
- [ ] All endpoints versioned (v1/, v2/)
- [ ] Response formats validated
- [ ] Error codes standardized

### Infrastructure Compliance
- [ ] Resource limits configured
- [ ] Health checks implemented
- [ ] Secret management in place

### Observability Compliance
- [ ] Metrics endpoint exposed
- [ ] Distributed tracing enabled
- [ ] Log aggregation configured

## Appendix

### Related Documents
- [API Documentation Standards](swagger.yaml)
- [Database Migration Guide](db-migrations.md)
- [Deployment Playbook](deployment.md)

### Version History
| Version | Date       | Author    | Changes            |
|---------|------------|-----------|--------------------|
| 1.0     | 2023-07-20 | AI Architect | Initial version    | 