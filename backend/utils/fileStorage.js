/**
 * @module fileStorage
 * @description Mock file storage service for development
 * @requires path
 * @requires fs.promises
 * @requires uuid
 * @requires ./appError
 */

const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { AppError } = require('./appError');

/**
 * @typedef {Object} FileInfo
 * @property {string} fileName - Name of the file
 * @property {string} filePath - Full path to the file
 * @property {string} url - Public URL to access the file
 * @property {number} size - File size in bytes
 * @property {Date} createdAt - File creation timestamp
 * @property {Date} modifiedAt - Last modification timestamp
 */

/**
 * @typedef {Object} SavedFileInfo
 * @property {string} fileName - Generated or custom filename
 * @property {string} filePath - Full path to the saved file
 * @property {string} url - Public URL to access the file
 */

/**
 * @class FileStorage
 * @description Mock implementation of file storage operations
 */
class FileStorage {
  /**
   * @constructor
   * @param {string} [baseDir='uploads'] - Base directory for local file storage
   */
  constructor(baseDir = 'uploads') {
    /**
     * @private
     * @type {string}
     * @description Absolute path to the base directory
     */
    this.baseDir = path.join(process.cwd(), baseDir);
    
    // Create directory if it doesn't exist
    this.ensureDirectory();
    
    console.log('Using mock file storage implementation');
  }

  /**
   * @private
   * @async
   * @function ensureDirectory
   * @description Ensures the base directory exists, creates it if necessary
   * @returns {Promise<void>}
   */
  async ensureDirectory() {
    try {
      await fs.access(this.baseDir);
    } catch (error) {
      await fs.mkdir(this.baseDir, { recursive: true });
    }
  }

  /**
   * @async
   * @function saveFile
   * @description Mock implementation that pretends to save a file
   * @param {Object} file - File object to save
   * @param {Buffer} file.buffer - File contents
   * @param {string} file.originalname - Original filename
   * @param {string} [customFileName] - Optional custom filename
   * @returns {Promise<SavedFileInfo>} Information about the saved file
   */
  async saveFile(file, customFileName = null) {
    const fileName = customFileName || `${uuidv4()}${path.extname(file?.originalname || '.txt')}`;
    const filePath = path.join(this.baseDir, fileName);
    
    // In mock mode, we don't actually write the file
    return {
      fileName,
      filePath,
      url: `/uploads/${fileName}`
    };
  }

  /**
   * @async
   * @function deleteFile
   * @description Mock implementation that pretends to delete a file
   * @param {string} fileName - Name of the file to delete
   * @returns {Promise<boolean>} Always returns true in mock mode
   */
  async deleteFile(fileName) {
    return true;
  }

  /**
   * @async
   * @function getFileInfo
   * @description Mock implementation that returns fake file info
   * @param {string} fileName - Name of the file
   * @returns {Promise<FileInfo>} Mock file information
   */
  async getFileInfo(fileName) {
    return {
      fileName,
      filePath: path.join(this.baseDir, fileName),
      url: `/uploads/${fileName}`,
      size: 1024,
      createdAt: new Date(),
      modifiedAt: new Date()
    };
  }

  /**
   * @function getFilePath
   * @description Gets the full path to a file
   * @param {string} fileName - Name of the file
   * @returns {string} Full path to the file
   */
  getFilePath(fileName) {
    return path.join(this.baseDir, fileName);
  }

  /**
   * @function getFileUrl
   * @description Gets the public URL for a file
   * @param {string} fileName - Name of the file
   * @returns {string} Public URL to access the file
   */
  getFileUrl(fileName) {
    return `/uploads/${fileName}`;
  }

  /**
   * @async
   * @function save
   * @description Mock implementation that pretends to save to cloud storage
   * @param {string} filePath - Target path in the bucket
   * @param {Buffer} buffer - File contents
   * @returns {Promise<string>} Path to the saved file
   */
  async save(filePath, buffer) {
    return filePath;
  }

  /**
   * @async
   * @function delete
   * @description Mock implementation that pretends to delete from cloud storage
   * @param {string} filePath - Path to the file in the bucket
   * @returns {Promise<boolean>} Always returns true in mock mode
   */
  async delete(filePath) {
    return true;
  }
}

module.exports = {
  storage: new FileStorage()
}; 