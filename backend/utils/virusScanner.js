/**
 * @module virusScanner
 * @description ClamAV-based virus scanning service with support for buffer and S3 file scanning
 * @requires clamdjs
 * @requires uuid
 * @requires ./appError
 * @requires ./fileStorage
 * @requires ./auditLog
 */

const clamd = require('clamdjs');
const { AppError } = require('./appError');
const { storage } = require('./fileStorage');
const { auditLog } = require('./auditLog');
const { v4: uuidv4 } = require('uuid');

/**
 * @class VirusScanner
 * @description Virus scanning service with ClamAV integration and metrics tracking
 */
class VirusScanner {
  /**
   * @constructor
   * @description Initializes the virus scanner with configuration and metrics
   */
  constructor() {
    /**
     * @private
     * @type {Object}
     * @description ClamAV scanner instance
     */
    this.scanner = clamd.createScanner(
      process.env.CLAMAV_HOST || 'localhost',
      parseInt(process.env.CLAMAV_PORT) || 3310
    );
    
    /**
     * @private
     * @type {Object}
     * @description Scanner configuration
     * @property {boolean} enabled - Whether virus scanning is enabled
     * @property {number} maxFileSize - Maximum file size to scan (50MB)
     * @property {number} timeout - Scan timeout in milliseconds (30s)
     */
    this.scanConfig = {
      enabled: process.env.ENABLE_VIRUS_SCAN === 'true',
      maxFileSize: 50 * 1024 * 1024, // 50MB
      timeout: 30000 // 30 seconds
    };

    /**
     * @private
     * @type {Object}
     * @description Scanner metrics
     * @property {number} filesScanned - Total number of files scanned
     * @property {number} infectedFiles - Number of infected files detected
     * @property {number} scanErrors - Number of scan errors
     * @property {number} scanTimeouts - Number of scan timeouts
     */
    this.metrics = {
      filesScanned: 0,
      infectedFiles: 0,
      scanErrors: 0,
      scanTimeouts: 0
    };
    
    /**
     * @private
     * @type {string}
     * @description Current virus definitions version
     */
    this.definitionsVersion = 'unknown';

    /**
     * @private
     * @type {Date|null}
     * @description Last definitions update timestamp
     */
    this.lastUpdate = null;
    
    this._updateDefinitions();
    setInterval(() => this._updateDefinitions(), 3600000); // Hourly updates
  }

  /**
   * @private
   * @async
   * @function _updateDefinitions
   * @description Updates virus definitions version information
   * @returns {Promise<void>}
   */
  async _updateDefinitions() {
    try {
      const version = await this.scanner.version();
      this.definitionsVersion = version.split('/')[1];
      this.lastUpdate = new Date();
    } catch (error) {
      console.error('Failed to update virus definitions:', error);
    }
  }

  /**
   * @async
   * @function scanBuffer
   * @description Scans a file buffer for viruses
   * @param {Buffer} buffer - File buffer to scan
   * @param {string} filename - Name of the file being scanned
   * @param {Object} [user] - User performing the scan
   * @param {string} [user.sys_id] - User's system ID
   * @returns {Promise<boolean>} True if file is clean
   * @throws {AppError} If file is infected or scan fails
   * 
   * @example
   * try {
   *   await virusScanner.scanBuffer(fileBuffer, 'document.pdf', currentUser);
   *   // File is clean, proceed with processing
   * } catch (error) {
   *   // Handle infected file or scan error
   * }
   */
  async scanBuffer(buffer, filename, user) {
    const scanId = uuidv4();
    const logData = {
      scanId,
      filename,
      user: user?.sys_id || 'system',
      size: buffer.length
    };

    if (!this.scanConfig.enabled) return true;

    try {
      const result = await Promise.race([
        this.scanner.scanBuffer(buffer, this.scanConfig.timeout),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Virus scan timeout')), this.scanConfig.timeout)
        )
      ]);
      
      await auditLog(client, user, 'FILE_SCAN_SUCCESS', {
        table: 'virus_scan',
        id: scanId,
        new: {
          ...logData,
          result: 'clean'
        }
      });

      if (result.includes('OK')) return true;
      throw new AppError(`Infected file detected: ${result}`, 422);
    } catch (error) {
      await auditLog(client, user, error.message.includes('Infected') ? 
        'FILE_SCAN_INFECTED' : 'FILE_SCAN_FAILED', {
          table: 'virus_scan',
          id: scanId,
          new: {
            ...logData,
            error: error.message,
            result: error.message.includes('Infected') ? 'infected' : 'failed'
          }
        });

      throw new AppError(`Virus scan failed: ${error.message}`, 500);
    }
  }

  /**
   * @async
   * @function scanS3File
   * @description Scans a file in an S3 bucket using AWS bucket policies
   * @param {string} filePath - Path to the file in S3 bucket
   * @returns {Promise<boolean>} True if file is clean
   * @throws {AppError} If scan fails
   * 
   * @example
   * try {
   *   await virusScanner.scanS3File('uploads/document.pdf');
   *   // File is clean, proceed with processing
   * } catch (error) {
   *   // Handle scan error
   * }
   */
  async scanS3File(filePath) {
    const s3 = new AWS.S3();
    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: filePath
    };

    try {
      await s3.waitFor('objectExists', params).promise();
      const result = await s3.selectObjectContent({
        ...params,
        Expression: 'SELECT * FROM S3Object WHERE scan_status = 'CLEAN'',
        ExpressionType: 'SQL'
      }).promise();
      
      return result.Payload.includes('CLEAN');
    } catch (error) {
      throw new AppError(`S3 virus scan failed: ${error.message}`, 500);
    }
  }
}

module.exports = new VirusScanner(); 