/**
 * @module passportConfig
 * @description Passport.js authentication strategies configuration
 * @requires passport-jwt
 * @requires ../utils/appError
 * @requires ../services/UserService
 */

const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const AppError = require('../utils/appError');
const UserService = require('../services/UserService');

/**
 * @typedef {Object} JwtPayload
 * @property {string} id - User's unique identifier
 * @property {string} [role] - User's role
 * @property {string[]} [permissions] - User's permissions
 */

/**
 * @typedef {Object} JwtStrategyOptions
 * @property {Function} jwtFromRequest - Function to extract JWT from request
 * @property {string} secretOrKey - Secret key for JWT verification
 * @property {boolean} ignoreExpiration - Whether to ignore JWT expiration
 */

/**
 * @function configurePassport
 * @description Configures Passport authentication strategies
 * @param {import('passport')} passport - Passport instance
 * @returns {void}
 * @throws {AppError} If JWT secret is not configured
 * 
 * @example
 * const passport = require('passport');
 * require('./config/passport')(passport);
 */
module.exports = (passport) => {
  /**
   * @constant {JwtStrategyOptions} options
   * @description JWT authentication strategy configuration
   * @private
   */
  const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
    ignoreExpiration: false
  };

  if (!options.secretOrKey) {
    throw new AppError('JWT secret is not configured', 500);
  }

  /**
   * @function verifyCallback
   * @description Verifies JWT payload and finds associated user
   * @param {JwtPayload} jwtPayload - Decoded JWT payload
   * @param {Function} done - Passport verification callback
   * @returns {Promise<void>}
   * @private
   */
  const verifyCallback = async (jwtPayload, done) => {
    try {
      const user = await UserService.findById(jwtPayload.id);
      return user ? done(null, user) : done(null, false);
    } catch (error) {
      return done(error, false);
    }
  };

  passport.use(new JwtStrategy(options, verifyCallback));
};