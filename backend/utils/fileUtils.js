/**
 * @module fileUtils
 * @description File handling utilities for upload, storage, and retrieval
 * @requires fs
 * @requires path
 * @requires multer
 */

const fs = require('fs');
const path = require('path');
const multer = require('multer');

/**
 * @constant {Object} storage
 * @description Multer disk storage configuration
 * @private
 */
const storage = multer.diskStorage({
  /**
   * @function destination
   * @description Determines the upload directory for files
   * @param {Object} req - Express request object
   * @param {Object} file - File object
   * @param {Function} cb - Callback function
   */
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  /**
   * @function filename
   * @description Generates a unique filename for uploaded files
   * @param {Object} req - Express request object
   * @param {Object} file - File object
   * @param {Function} cb - Callback function
   */
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

/**
 * @function fileFilter
 * @description Filters uploaded files based on allowed types
 * @param {Object} req - Express request object
 * @param {Object} file - File object
 * @param {Function} cb - Callback function
 * @throws {Error} If file type is not allowed
 */
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF and PDF files are allowed.'), false);
  }
};

/**
 * @constant {Object} upload
 * @description Configured multer instance for file uploads
 * @property {Object} storage - Storage configuration
 * @property {Function} fileFilter - File type filter
 * @property {Object} limits - Upload limits configuration
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * @async
 * @function deleteFile
 * @description Deletes a file from the filesystem
 * @param {string} filePath - Path to the file to delete
 * @returns {Promise<boolean>} True if file was deleted successfully
 * @throws {Error} If file deletion fails
 */
const deleteFile = async (filePath) => {
  try {
    await fs.promises.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * @function getFileUrl
 * @description Generates a public URL for accessing a file
 * @param {string} filename - Name of the file
 * @returns {string} Public URL path to the file
 */
const getFileUrl = (filename) => {
  return `/uploads/${filename}`;
};

module.exports = {
  upload,
  deleteFile,
  getFileUrl
}; 