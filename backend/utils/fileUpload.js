/**
 * @module fileUpload
 * @description File upload service with support for multiple upload strategies, image processing, and virus scanning
 * @requires multer
 * @requires path
 * @requires uuid
 * @requires sharp
 * @requires ./appError
 * @requires ./fileStorage
 * @requires ./virusScanner
 */

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Sharp = require('sharp');
const { AppError } = require('./appError');
const { storage } = require('./fileStorage');
const virusScanner = require('./virusScanner');

/**
 * @typedef {Object} UploadStrategy
 * @property {string} fieldName - Form field name for the file(s)
 * @property {string[]} [allowedTypes] - Array of allowed MIME types
 * @property {number} maxSize - Maximum file size in bytes
 * @property {number} [maxCount] - Maximum number of files for array uploads
 * @property {boolean} isArray - Whether the upload accepts multiple files
 * @property {boolean} [processImage] - Whether to process uploaded images
 * @property {Object} [resizeOptions] - Sharp resize options for image processing
 */

/**
 * @constant {Object.<string, UploadStrategy>} uploadStrategies
 * @description Predefined upload strategies for different use cases
 */
const uploadStrategies = {
  avatar: {
    fieldName: 'avatar',
    allowedTypes: ['image/jpeg', 'image/png'],
    maxSize: 5 * 1024 * 1024, // 5MB
    isArray: false,
    processImage: true,
    resizeOptions: { width: 256, height: 256, fit: 'cover' }
  },
  attachments: {
    fieldName: 'attachments',
    allowedTypes: ['image/*', 'application/pdf'],
    maxSize: 10 * 1024 * 1024, // 10MB
    maxCount: 5,
    isArray: true
  },
  icons: {
    fieldName: 'icon',
    allowedTypes: ['image/svg+xml', 'image/png'],
    maxSize: 2 * 1024 * 1024, // 2MB
    isArray: false
  },
  general: {
    fieldName: 'files',
    allowedTypes: null,
    maxSize: 20 * 1024 * 1024,
    isArray: true
  },
  rewards: {
    fieldName: 'rewardImage',
    allowedTypes: ['image/jpeg', 'image/png', 'image/svg+xml'],
    maxSize: 5 * 1024 * 1024, // 5MB
    isArray: false,
    processImage: true,
    resizeOptions: { width: 512, height: 512, fit: 'contain' }
  }
};

/**
 * @function fileFilter
 * @description Creates a multer file filter based on the upload strategy
 * @param {UploadStrategy} strategy - Upload strategy configuration
 * @returns {Function} Multer file filter function
 * @throws {AppError} 400 - If file type is not allowed
 */
const fileFilter = (strategy) => (req, file, cb) => {
  if (strategy.allowedTypes && !strategy.allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.mimetype.startsWith(type.split('/')[0]);
    }
    return file.mimetype === type;
  })) {
    return cb(new AppError(`Invalid file type. Allowed types: ${strategy.allowedTypes.join(', ')}`, 400));
  }
  cb(null, true);
};

/**
 * @function generateFilename
 * @description Generates a unique filename with original extension
 * @param {Object} file - Multer file object
 * @param {string} file.originalname - Original filename
 * @returns {string} Generated unique filename
 */
const generateFilename = (file) => {
  const ext = path.extname(file.originalname);
  return `${uuidv4()}${ext}`;
};

/**
 * @function processImageIfNeeded
 * @description Processes image files according to strategy settings
 * @param {Object} file - Multer file object
 * @param {Buffer} file.buffer - File contents
 * @param {UploadStrategy} strategy - Upload strategy configuration
 * @returns {Promise<Buffer>} Processed file buffer
 */
const processImageIfNeeded = async (file, strategy) => {
  if (!strategy.processImage) return file.buffer;
  
  return Sharp(file.buffer)
    .resize(strategy.resizeOptions)
    .toFormat('jpeg', { quality: 90 })
    .toBuffer();
};

/**
 * @typedef {Object} UploadService
 * @property {Function} handle - Creates multer middleware for file upload
 * @property {Function} processAndSave - Processes and saves uploaded files
 * @property {Function} deleteFile - Deletes a file from storage
 * @property {Function} getStrategy - Retrieves a copy of an upload strategy
 */

/**
 * @constant {UploadService} uploadService
 * @description Service for handling file uploads with various strategies
 */
const uploadService = {
  /**
   * @function handle
   * @description Creates multer middleware for the specified strategy
   * @param {string} strategyName - Name of the upload strategy to use
   * @returns {Function} Multer middleware
   * @throws {Error} If strategy name is invalid
   */
  handle: (strategyName) => {
    const strategy = uploadStrategies[strategyName];
    if (!strategy) throw new Error(`Invalid upload strategy: ${strategyName}`);

    const upload = multer({
      storage: multer.memoryStorage(),
      fileFilter: fileFilter(strategy),
      limits: {
        fileSize: strategy.maxSize,
        files: strategy.isArray ? strategy.maxCount || 10 : 1
      }
    });

    return strategy.isArray ? 
      upload.array(strategy.fieldName, strategy.maxCount) :
      upload.single(strategy.fieldName);
  },

  /**
   * @function processAndSave
   * @description Processes an uploaded file and saves it to storage
   * @param {Object} file - Multer file object
   * @param {string} strategyName - Name of the upload strategy to use
   * @param {string} directory - Target directory for the file
   * @returns {Promise<string>} Public URL path to the saved file
   * @throws {AppError} If file processing or saving fails
   */
  processAndSave: async (file, strategyName, directory) => {
    try {
      const strategy = uploadStrategies[strategyName];
      const processedBuffer = await processImageIfNeeded(file, strategy);

      // Virus scan before saving
      await virusScanner.scanBuffer(processedBuffer, file.originalname);

      const filename = generateFilename(file);
      const filePath = path.join(directory, filename);
      
      await storage.save(filePath, processedBuffer);
      return path.join('/uploads', directory, filename);
    } catch (error) {
      throw new AppError(`File processing failed: ${error.message}`, 500);
    }
  },

  /**
   * @function deleteFile
   * @description Deletes a file from storage
   * @param {string} filePath - Path to the file relative to public directory
   * @returns {Promise<void>}
   * @throws {AppError} If file deletion fails
   */
  deleteFile: async (filePath) => {
    try {
      const fullPath = path.join(process.cwd(), 'public', filePath);
      await storage.delete(fullPath);
    } catch (error) {
      throw new AppError(`File deletion failed: ${error.message}`, 500);
    }
  },

  /**
   * @function getStrategy
   * @description Retrieves a copy of an upload strategy configuration
   * @param {string} name - Name of the strategy to retrieve
   * @returns {UploadStrategy} Copy of the requested strategy
   */
  getStrategy: (name) => ({ ...uploadStrategies[name] })
};

module.exports = { uploadService }; 