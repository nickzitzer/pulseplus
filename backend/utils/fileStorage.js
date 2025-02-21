/**
 * @module fileStorage
 * @description File storage service with support for local and Google Cloud Storage
 * @requires path
 * @requires fs.promises
 * @requires uuid
 * @requires @google-cloud/storage
 * @requires ./appError
 */

const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { Storage } = require('@google-cloud/storage');
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
 * @description Manages file storage operations with support for local and cloud storage
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

    /**
     * @private
     * @type {Storage}
     * @description Google Cloud Storage instance
     */
    this.storage = new Storage();

    /**
     * @private
     * @type {string}
     * @description Google Cloud Storage bucket name
     */
    this.bucketName = process.env.GCS_BUCKET;

    this.ensureDirectory();
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
   * @description Saves a file to local storage
   * @param {Object} file - File object to save
   * @param {Buffer} file.buffer - File contents
   * @param {string} file.originalname - Original filename
   * @param {string} [customFileName] - Optional custom filename
   * @returns {Promise<SavedFileInfo>} Information about the saved file
   * 
   * @example
   * const fileInfo = await storage.saveFile({
   *   buffer: fileBuffer,
   *   originalname: 'document.pdf'
   * });
   */
  async saveFile(file, customFileName = null) {
    const fileName = customFileName || `${uuidv4()}${path.extname(file.originalname)}`;
    const filePath = path.join(this.baseDir, fileName);
    
    await fs.writeFile(filePath, file.buffer);
    return {
      fileName,
      filePath,
      url: `/uploads/${fileName}`
    };
  }

  /**
   * @async
   * @function deleteFile
   * @description Deletes a file from local storage
   * @param {string} fileName - Name of the file to delete
   * @returns {Promise<boolean>} True if file was deleted, false if not found
   * @throws {Error} If deletion fails for reasons other than file not found
   * 
   * @example
   * const wasDeleted = await storage.deleteFile('document.pdf');
   */
  async deleteFile(fileName) {
    const filePath = path.join(this.baseDir, fileName);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * @async
   * @function getFileInfo
   * @description Gets information about a file in local storage
   * @param {string} fileName - Name of the file
   * @returns {Promise<FileInfo|null>} File information or null if not found
   * @throws {Error} If stat operation fails for reasons other than file not found
   * 
   * @example
   * const info = await storage.getFileInfo('document.pdf');
   * if (info) {
   *   console.log(`File size: ${info.size} bytes`);
   * }
   */
  async getFileInfo(fileName) {
    const filePath = path.join(this.baseDir, fileName);
    try {
      const stats = await fs.stat(filePath);
      return {
        fileName,
        filePath,
        url: `/uploads/${fileName}`,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * @function getFilePath
   * @description Gets the full path to a file in local storage
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
   * @description Saves a file to Google Cloud Storage
   * @param {string} filePath - Target path in the bucket
   * @param {Buffer} buffer - File contents
   * @returns {Promise<string>} Path to the saved file
   * @throws {AppError} If save operation fails
   * 
   * @example
   * const path = await storage.save('images/profile.jpg', imageBuffer);
   */
  async save(filePath, buffer) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(filePath);
      await file.save(buffer);
      return filePath;
    } catch (error) {
      throw new AppError(`File save failed: ${error.message}`, 500);
    }
  }

  /**
   * @async
   * @function delete
   * @description Deletes a file from Google Cloud Storage
   * @param {string} filePath - Path to the file in the bucket
   * @returns {Promise<boolean>} True if deletion was successful
   * @throws {AppError} If deletion fails
   * 
   * @example
   * await storage.delete('images/profile.jpg');
   */
  async delete(filePath) {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      await bucket.file(filePath).delete();
      return true;
    } catch (error) {
      throw new AppError(`File deletion failed: ${error.message}`, 500);
    }
  }
}

module.exports = {
  storage: new FileStorage()
}; 