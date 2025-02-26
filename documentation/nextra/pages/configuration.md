# Configuration Standards

This document outlines the standardized configuration patterns and practices for the PulsePlus backend system.

## Configuration Factory Pattern

The `ConfigFactory` class provides a centralized way to create standardized configurations for various components of the backend system. This ensures consistency across the application and makes it easier to manage configuration changes.

### Available Factory Methods

| Method | Description |
|--------|-------------|
| `createDatabaseConfig` | Creates standardized database configuration |
| `createRedisConfig` | Creates standardized Redis configuration |
| `createEmailConfig` | Creates standardized email configuration |
| `createCacheConfig` | Creates standardized cache configuration |
| `createLoggerConfig` | Creates standardized logger configuration |
| `createSecurityConfig` | Creates standardized security configuration |

### Example Usage

```javascript
// Database configuration
const dbConfig = ConfigFactory.createDatabaseConfig({
  maxConnections: 20,
  minConnections: 2,
  idleTimeout: 30000
});

// Redis configuration
const redisConfig = ConfigFactory.createRedisConfig({
  maxRetriesPerRequest: 3,
  enableReadyCheck: true
});

// Email configuration
const emailConfig = ConfigFactory.createEmailConfig({
  secure: true
});

// Cache configuration
const cacheConfig = ConfigFactory.createCacheConfig('memory', {
  ttl: 300000,
  max: 1000
});

// Logger configuration
const loggerConfig = ConfigFactory.createLoggerConfig('api', {
  level: 'info'
});

// Security configuration
const securityConfig = ConfigFactory.createSecurityConfig({
  corsOrigin: ['https://example.com']
});
```

## Configuration Security

### Encryption

Sensitive configuration values (passwords, secrets, keys) should be encrypted using the `ConfigEncryption` utility.

```javascript
const configEncryption = new ConfigEncryption(masterKeyPath);

// Encrypt a sensitive value
const encryptedValue = configEncryption.encrypt('sensitive-password');

// Decrypt an encrypted value
const decryptedValue = configEncryption.decrypt(encryptedValue);

// Check if a value is encrypted
const isEncrypted = configEncryption.isEncrypted(value);
```

### Versioning

Configuration changes should be tracked using the `ConfigVersioning` utility.

```javascript
const configVersioning = new ConfigVersioning({
  storageDir: 'config-versions',
  enabled: true
});

// Save a new configuration version
configVersioning.saveVersion(config);

// Get version history
const history = configVersioning.getVersionHistory();

// Get a specific version
const version = configVersioning.getVersion(versionId);

// Compare two versions
const diff = configVersioning.compareVersions(versionId1, versionId2);
```

### Validation

All configurations should be validated against environment-specific schemas using the `ConfigValidator`.

```javascript
// Validate configuration for a specific environment
const validatedConfig = ConfigValidator.validate(config, 'production');

// Validate configuration for the current environment
const validatedConfig = ConfigValidator.validateEnvironment(config);
```

## Centralized Security Configuration

The `security.js` module provides centralized security configuration for the application.

```javascript
// Import security middleware
const { securityMiddleware } = require('../config/security');

// Apply security middleware
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.cors);
app.use(securityMiddleware.rateLimit);

// Or configure individual middleware
const helmetMiddleware = configureHelmet({
  contentSecurityPolicy: true,
  xssFilter: true
});

const corsMiddleware = configureCors({
  origin: ['https://example.com'],
  credentials: true
});

const rateLimitMiddleware = configureRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

## Environment Variables

All configuration values should be loaded from environment variables using the `.env` file. The `.env.example` file provides a template for required environment variables.

```
# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pulseplus
DB_USER=postgres
DB_PASSWORD=password
DB_SSL_ENABLED=false

# Redis configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Security configuration
# For development only - in production use JWT_SECRET_ID instead
JWT_SECRET=your-secret-key
SESSION_SECRET=your-session-secret

# AWS Secrets Manager (for production/staging)
# JWT_SECRET_ID=arn:aws:secretsmanager:us-east-1:123456789012:secret:pulseplus/jwt-secret
# DB_SECRET_ID=arn:aws:secretsmanager:us-east-1:123456789012:secret:pulseplus/db-secret

# Email configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=noreply@example.com

# Configuration security
CONFIG_ENCRYPTION_ENABLED=true
CONFIG_MASTER_KEY_PATH=./keys/master.key
CONFIG_VERSIONING_ENABLED=true
CONFIG_VERSIONS_DIR=./config-versions
```

## Secrets Management

In production and staging environments, sensitive configuration values like JWT secrets and database credentials are stored in AWS Secrets Manager. The application will automatically retrieve these secrets at startup.

### AWS Secrets Manager Integration

```javascript
// Retrieve a secret from AWS Secrets Manager
const getSecretFromSecretsManager = async (secretId, secretKey) => {
  const secretsManager = new AWS.SecretsManager({
    region: process.env.AWS_REGION || 'us-east-1'
  });
  
  const data = await secretsManager.getSecretValue({ SecretId: secretId }).promise();
  let secretValue = data.SecretString;
  
  if (secretKey) {
    const secretObject = JSON.parse(secretValue);
    return secretObject[secretKey];
  }
  
  return secretValue;
};

// Get JWT secret based on environment
const getJwtSecret = async () => {
  if (['production', 'staging'].includes(process.env.NODE_ENV)) {
    const secretId = process.env.JWT_SECRET_ID || process.env.DB_SECRET_ID;
    return await getSecretFromSecretsManager(secretId, 'jwt_secret');
  }
  
  // In development, use environment variable
  return process.env.JWT_SECRET;
};
```

### Secret Structure

AWS Secrets Manager secrets should be structured as JSON objects with the following keys:

```json
{
  "username": "db-username",
  "password": "db-password",
  "jwt_secret": "jwt-signing-secret",
  "session_secret": "session-secret"
}
```

## Best Practices

1. **Use the ConfigFactory**: Always use the ConfigFactory to create component configurations.
2. **Encrypt Sensitive Values**: Use ConfigEncryption for passwords, secrets, and keys.
3. **Version Configuration Changes**: Track configuration changes with ConfigVersioning.
4. **Validate Configurations**: Validate configurations against environment-specific schemas.
5. **Centralize Security Configuration**: Use the security module for all security-related configurations.
6. **Environment-Specific Configuration**: Use environment-specific configuration values.
7. **Use Secrets Manager in Production**: Store sensitive values in AWS Secrets Manager for production environments.
8. **Documentation**: Document all configuration options and their default values.
9. **Testing**: Test configurations in different environments.

## Compliance Checklist

- [x] ConfigFactory used for all component configurations
- [x] Sensitive configuration values encrypted
- [x] Configuration versioning enabled
- [x] Environment-specific validation implemented
- [x] Centralized security configuration used
- [x] Standardized logging configuration applied
- [x] Environment variables documented in `.env.example`
- [x] AWS Secrets Manager integration for production
- [x] Configuration tested in all environments 