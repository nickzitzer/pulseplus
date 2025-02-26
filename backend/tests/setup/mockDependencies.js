/**
 * Mock dependencies for testing
 * This file contains mocks for external dependencies that are used in the application
 * It should be required in jest.config.js as a setupFile
 */

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockS3 = {
    getObject: jest.fn().mockReturnThis(),
    putObject: jest.fn().mockReturnThis(),
    deleteObject: jest.fn().mockReturnThis(),
    listObjects: jest.fn().mockReturnThis(),
    selectObjectContent: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({
      Body: Buffer.from(JSON.stringify({ secretKey: 'mock-secret-key' }))
    })
  };

  const mockSecretsManager = {
    getSecretValue: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({
      SecretString: JSON.stringify({
        dbHost: 'localhost',
        dbPort: 5432,
        dbUser: 'test',
        dbPassword: 'test',
        dbName: 'test',
        jwtSecret: 'test-jwt-secret',
        apiKeys: {
          service1: 'mock-api-key-1',
          service2: 'mock-api-key-2'
        }
      })
    })
  };

  const mockSES = {
    sendEmail: jest.fn().mockReturnThis(),
    promise: jest.fn().mockResolvedValue({ MessageId: 'mock-message-id' })
  };

  return {
    S3: jest.fn(() => mockS3),
    SecretsManager: jest.fn(() => mockSecretsManager),
    SES: jest.fn(() => mockSES)
  };
});

// Mock Redis
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    setex: jest.fn().mockResolvedValue('OK'),
    hget: jest.fn().mockResolvedValue(null),
    hset: jest.fn().mockResolvedValue(1),
    hdel: jest.fn().mockResolvedValue(1),
    hgetall: jest.fn().mockResolvedValue({}),
    keys: jest.fn().mockResolvedValue([]),
    flushall: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  };

  return jest.fn(() => mockRedis);
});

// Mock Sharp image processing - only if it's actually used in the tests
// If 'sharp' is not installed, we'll conditionally mock it
try {
  require.resolve('sharp');
  jest.mock('sharp', () => {
    return jest.fn().mockReturnValue({
      resize: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-image-data')),
      toFile: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
      metadata: jest.fn().mockResolvedValue({ width: 100, height: 100, format: 'jpeg' })
    });
  });
} catch (e) {
  // 'sharp' is not installed, so we don't need to mock it
  console.log('Sharp module not found, skipping mock');
}

// Mock Google Cloud Storage - only if it's actually used in the tests
// If '@google-cloud/storage' is not installed, we'll conditionally mock it
try {
  require.resolve('@google-cloud/storage');
  jest.mock('@google-cloud/storage', () => {
    const mockFile = {
      save: jest.fn().mockResolvedValue([{ name: 'mock-file.jpg' }]),
      delete: jest.fn().mockResolvedValue([{}]),
      getSignedUrl: jest.fn().mockResolvedValue(['https://storage.googleapis.com/mock-bucket/mock-file.jpg']),
      download: jest.fn().mockResolvedValue([Buffer.from('mock-file-data')])
    };

    const mockBucket = {
      file: jest.fn().mockReturnValue(mockFile),
      getFiles: jest.fn().mockResolvedValue([[{ name: 'mock-file.jpg' }]]),
      upload: jest.fn().mockResolvedValue([{ name: 'mock-file.jpg' }])
    };

    return {
      Storage: jest.fn().mockReturnValue({
        bucket: jest.fn().mockReturnValue(mockBucket)
      })
    };
  });
} catch (e) {
  // '@google-cloud/storage' is not installed, so we don't need to mock it
  console.log('Google Cloud Storage module not found, skipping mock');
}

// Mock database connection
jest.mock('../../database/connection', () => {
  const mockClient = {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn()
  };

  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    end: jest.fn().mockResolvedValue(undefined)
  };

  return {
    pool: mockPool,
    getClient: jest.fn().mockResolvedValue(mockClient)
  };
});

// Mock nodemailer
jest.mock('nodemailer', () => {
  const mockTransport = {
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
    verify: jest.fn().mockResolvedValue(true),
    close: jest.fn()
  };

  return {
    createTransport: jest.fn().mockReturnValue(mockTransport)
  };
});

// Mock config
jest.mock('../../config/index', () => {
  return {
    db: {
      host: 'localhost',
      port: 5432,
      user: 'test',
      password: 'test',
      database: 'test',
      ssl: false
    },
    jwt: {
      secret: 'test-jwt-secret',
      expiresIn: '1h'
    },
    redis: {
      host: 'localhost',
      port: 6379
    },
    email: {
      from: 'test@example.com',
      region: 'us-east-1'
    },
    storage: {
      bucket: 'mock-bucket'
    },
    security: {
      saltRounds: 10
    },
    environment: 'test'
  };
}); 