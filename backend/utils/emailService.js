/**
 * @module emailService
 * @description Email service for sending system emails (re-exports from emailUtils)
 * @requires ./emailUtils
 */

// Re-export the email functions from emailUtils
const emailUtils = require('./emailUtils');

module.exports = {
  sendEmail: emailUtils.sendVerificationEmail,
  sendVerificationEmail: emailUtils.sendVerificationEmail,
  sendPasswordResetEmail: emailUtils.sendPasswordResetEmail
}; 