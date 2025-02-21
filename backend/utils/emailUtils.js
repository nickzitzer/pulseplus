/**
 * @module emailUtils
 * @description Email service utilities for sending system emails
 * @requires nodemailer
 */

const nodemailer = require('nodemailer');

/**
 * @constant {Object} transporter
 * @description Configured nodemailer transport instance
 * @private
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
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

  await transporter.sendMail(mailOptions);
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

  await transporter.sendMail(mailOptions);
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
}; 