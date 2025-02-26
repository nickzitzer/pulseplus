/**
 * Jest configuration for backend tests
 */
module.exports = {
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // An array of regexp pattern strings that are matched against all test paths
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/'
  ],
  
  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: [
    'json',
    'text',
    'lcov',
    'clover'
  ],
  
  // The maximum amount of workers used to run your tests
  maxWorkers: '50%',
  
  // A map from regular expressions to module names or to arrays of module names
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // A list of paths to directories that Jest should use to search for files in
  roots: [
    '<rootDir>'
  ],
  
  // The paths to modules that run some code to configure or set up the testing environment
  setupFiles: [
    '<rootDir>/tests/setup/mockDependencies.js'
  ],
  
  // A list of paths to modules that run some code to configure or set up the testing framework
  setupFilesAfterEnv: [],
  
  // The test runner to use
  testRunner: 'jest-circus/runner',
  
  // Mock all external modules by default
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/'
  ],
  
  // Only run tests for files that have been modified
  // Comment this out to run all tests
  // testPathIgnorePatterns: [
  //   '/node_modules/',
  //   '/tests/utils/(?!appError|responseHandler|validation).test.js/'
  // ]
}; 