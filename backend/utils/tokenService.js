/**
 * @module tokenService
 * @description JWT token management service with Redis-based token storage
 * @requires jsonwebtoken
 * @requires ../config/redis
 */

const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');

// Import config as a promise
const configPromise = require('../config');

// Cache for JWT secret to avoid repeated async lookups
let jwtSecretCache = null;

/**
 * @constant {string} ACCESS_TOKEN_EXPIRY
 * @description Access token expiration time (default: 30 minutes)
 */
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '30m';

/**
 * @constant {string} REFRESH_TOKEN_EXPIRY
 * @description Refresh token expiration time (default: 7 days)
 */
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

/**
 * @function getJwtSecret
 * @description Get the JWT secret from config
 * @returns {Promise<string>} The JWT secret
 */
const getJwtSecret = async () => {
  // Return cached value if available
  if (jwtSecretCache) {
    return jwtSecretCache;
  }
  
  // Wait for config to be initialized
  const config = await configPromise;
  jwtSecretCache = config.jwt.secret;
  return jwtSecretCache;
};

/**
 * @class TokenService
 * @description Manages JWT token generation, verification, and revocation
 */
class TokenService {
  /**
   * @static
   * @async
   * @function generateTokens
   * @description Generates access and refresh tokens for a user
   * @param {Object} user - User object
   * @param {string} user.sys_id - User's unique identifier
   * @param {string} user.role - User's role
   * @returns {Promise<Object>} Object containing access and refresh tokens
   * @throws {Error} If token generation fails
   */
  static async generateTokens(user) {
    const jwtSecret = await getJwtSecret();
    
    const accessToken = jwt.sign(
      {
        id: user.sys_id,
        role: user.role,
        type: 'access'
      },
      jwtSecret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      {
        id: user.sys_id,
        type: 'refresh'
      },
      jwtSecret,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Store refresh token in Redis with user data
    await redisClient.set(
      `refresh_token:${refreshToken}`,
      JSON.stringify({
        userId: user.sys_id,
        role: user.role,
        tokenFamily: Date.now().toString()
      }),
      'EX',
      7 * 24 * 60 * 60 // 7 days in seconds
    );

    return { accessToken, refreshToken };
  }

  /**
   * @static
   * @async
   * @function verifyAccessToken
   * @description Verifies an access token
   * @param {string} token - Access token to verify
   * @returns {Promise<Object>} Decoded token payload
   * @throws {Error} If token is invalid or expired
   */
  static async verifyAccessToken(token) {
    try {
      const jwtSecret = await getJwtSecret();
      const decoded = jwt.verify(token, jwtSecret);
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @static
   * @async
   * @function verifyRefreshToken
   * @description Verifies a refresh token and retrieves associated data
   * @param {string} token - Refresh token to verify
   * @returns {Promise<Object>} Decoded token payload with Redis data
   * @throws {Error} If token is invalid, expired, or not found in Redis
   */
  static async verifyRefreshToken(token) {
    try {
      const jwtSecret = await getJwtSecret();
      const decoded = jwt.verify(token, jwtSecret);
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in Redis
      const tokenData = await redisClient.get(`refresh_token:${token}`);
      if (!tokenData) {
        throw new Error('Invalid refresh token');
      }

      return { ...decoded, ...JSON.parse(tokenData) };
    } catch (error) {
      throw error;
    }
  }

  /**
   * @static
   * @async
   * @function revokeRefreshToken
   * @description Revokes a refresh token by removing it from Redis
   * @param {string} token - Refresh token to revoke
   * @returns {Promise<void>}
   */
  static async revokeRefreshToken(token) {
    await redisClient.del(`refresh_token:${token}`);
  }

  /**
   * @static
   * @async
   * @function revokeAllUserTokens
   * @description Revokes all refresh tokens for a specific user
   * @param {string} userId - User's unique identifier
   * @returns {Promise<void>}
   */
  static async revokeAllUserTokens(userId) {
    const pattern = `refresh_token:*`;
    const keys = await redisClient.keys(pattern);
    
    for (const key of keys) {
      const tokenData = await redisClient.get(key);
      const data = JSON.parse(tokenData);
      
      if (data.userId === userId) {
        await redisClient.del(key);
      }
    }
  }

  /**
   * @static
   * @async
   * @function blacklistToken
   * @description Adds a token to the blacklist in Redis
   * @param {string} token - Token to blacklist
   * @param {number} expiry - Token expiry time in seconds
   * @returns {Promise<void>}
   */
  static async blacklistToken(token, expiry) {
    const decoded = jwt.decode(token);
    if (!decoded) return;

    const exp = decoded.exp || (Date.now() / 1000 + expiry);
    await redisClient.set(
      `blacklist:${token}`,
      '1',
      'EX',
      Math.ceil(exp - Date.now() / 1000)
    );
  }

  /**
   * @static
   * @async
   * @function isTokenBlacklisted
   * @description Checks if a token is blacklisted
   * @param {string} token - Token to check
   * @returns {Promise<boolean>} True if token is blacklisted
   */
  static async isTokenBlacklisted(token) {
    return await redisClient.exists(`blacklist:${token}`);
  }
}

module.exports = TokenService; 