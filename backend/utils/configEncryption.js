/**
 * @module configEncryption
 * @description Utility for encrypting and decrypting sensitive configuration values
 * @requires crypto
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Constants for encryption
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 16 bytes
const AUTH_TAG_LENGTH = 16; // 16 bytes

/**
 * @class ConfigEncryption
 * @description Handles encryption and decryption of sensitive configuration values
 */
class ConfigEncryption {
  /**
   * @constructor
   * @description Initialize the encryption utility with a master key
   * @param {string} masterKeyPath - Path to the master key file or environment variable name
   */
  constructor(masterKeyPath) {
    this.masterKey = this._loadMasterKey(masterKeyPath);
  }

  /**
   * @private
   * @method _loadMasterKey
   * @description Load the master encryption key from file or environment
   * @param {string} masterKeyPath - Path to the master key file or environment variable name
   * @returns {Buffer} The master key as a buffer
   */
  _loadMasterKey(masterKeyPath) {
    // If masterKeyPath starts with ENV:, load from environment variable
    if (masterKeyPath.startsWith('ENV:')) {
      const envVar = masterKeyPath.substring(4);
      const key = process.env[envVar];
      if (!key) {
        throw new Error(`Master key environment variable ${envVar} not found`);
      }
      return Buffer.from(key, 'hex');
    }

    // Otherwise, load from file
    try {
      const keyPath = path.resolve(masterKeyPath);
      if (!fs.existsSync(keyPath)) {
        throw new Error(`Master key file not found: ${keyPath}`);
      }
      return fs.readFileSync(keyPath);
    } catch (error) {
      throw new Error(`Failed to load master key: ${error.message}`);
    }
  }

  /**
   * @method generateMasterKey
   * @description Generate a new master encryption key
   * @param {string} outputPath - Path to save the generated key
   * @returns {string} Hex representation of the generated key
   */
  static generateMasterKey(outputPath) {
    const key = crypto.randomBytes(KEY_LENGTH);
    const keyHex = key.toString('hex');
    
    if (outputPath) {
      fs.writeFileSync(outputPath, key);
      console.log(`Master key saved to ${outputPath}`);
    }
    
    return keyHex;
  }

  /**
   * @method encrypt
   * @description Encrypt a sensitive value
   * @param {string} value - Value to encrypt
   * @returns {string} Encrypted value in format: iv:authTag:encryptedData (hex encoded)
   */
  encrypt(value) {
    if (!value) return value;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * @method decrypt
   * @description Decrypt a sensitive value
   * @param {string} encryptedValue - Encrypted value in format: iv:authTag:encryptedData
   * @returns {string} Decrypted value
   */
  decrypt(encryptedValue) {
    if (!encryptedValue || !encryptedValue.includes(':')) return encryptedValue;
    
    const [ivHex, authTagHex, encryptedData] = encryptedValue.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * @method isEncrypted
   * @description Check if a value is encrypted
   * @param {string} value - Value to check
   * @returns {boolean} True if the value is encrypted
   */
  isEncrypted(value) {
    if (!value || typeof value !== 'string') return false;
    
    // Check if the value matches the format: iv:authTag:encryptedData
    // where iv is 32 chars (16 bytes in hex), authTag is 32 chars, and encryptedData is variable length
    const parts = value.split(':');
    return parts.length === 3 && 
           parts[0].length === IV_LENGTH * 2 && 
           parts[1].length === AUTH_TAG_LENGTH * 2;
  }
}

module.exports = ConfigEncryption; 