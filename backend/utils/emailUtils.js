/**
 * @module emailUtils
 * @description Email service utilities for sending system emails
 * @requires nodemailer
 * @requires ../utils/configFactory
 */

const nodemailer = require('nodemailer');
const ConfigFactory = require('./configFactory');
const { logger } = require('./logger');

/**
 * @constant {Object} transporter
 * @description Configured nodemailer transport instance
 * @private
 */
const transporter = nodemailer.createTransport(
  ConfigFactory.createEmailConfig({
    // Additional email options can be specified here
    secure: process.env.SMTP_SECURE === 'true'
  })
);

// Verify transporter configuration on startup
transporter.verify((error) => {
  if (error) {
    logger.error(`Email configuration error: ${error.message}`, { error });
  } else {
    logger.info('Email service is ready to send messages');
  }
});

/**
 * @async
 * @function sendVerificationEmail
 * @description Sends an email verification link to a user
 * @param {string} to - Recipient email address
 * @param {string} verificationUrl - URL for email verification
 * @returns {Promise<void>}
 * @throws {Error} If email sending fails
 * 
 * @example
 * await sendVerificationEmail(
 *   'user@example.com',
 *   'https://example.com/verify/token123'
 * );
 */
async function sendVerificationEmail(to, verificationUrl) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to,
    subject: 'Verify your email address',
    html: `
      <h1>Welcome to PulsePlus!</h1>
      <p>Thank you for registering. Please click the link below to verify your email address:</p>
      <p><a href="${verificationUrl}">Verify Email</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not create an account, please ignore this email.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${to}`);
  } catch (error) {
    logger.error(`Failed to send verification email to ${to}: ${error.message}`, { error });
    throw error;
  }
}

/**
 * @async
 * @function sendPasswordResetEmail
 * @description Sends a password reset link to a user
 * @param {string} to - Recipient email address
 * @param {string} resetUrl - URL for password reset
 * @returns {Promise<void>}
 * @throws {Error} If email sending fails
 * 
 * @example
 * await sendPasswordResetEmail(
 *   'user@example.com',
 *   'https://example.com/reset/token123'
 * );
 */
async function sendPasswordResetEmail(to, resetUrl) {
  const mailOptions = {
    from: process.env.SMTP_FROM,
    to,
    subject: 'Reset your password',
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the link below to create a new password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${to}`);
  } catch (error) {
    logger.error(`Failed to send password reset email to ${to}: ${error.message}`, { error });
    throw error;
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
}; 