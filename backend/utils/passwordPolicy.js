/**
 * @module passwordPolicy
 * @description Implements password policy and validation
 * @requires crypto
 */

const crypto = require('crypto');

/**
 * Password policy configuration
 * These settings can be adjusted based on security requirements
 */
const PASSWORD_POLICY = {
  // Minimum password length
  MIN_LENGTH: 12,
  
  // Maximum password length
  MAX_LENGTH: 128,
  
  // Require at least one uppercase letter
  REQUIRE_UPPERCASE: true,
  
  // Require at least one lowercase letter
  REQUIRE_LOWERCASE: true,
  
  // Require at least one number
  REQUIRE_NUMBER: true,
  
  // Require at least one special character
  REQUIRE_SPECIAL: true,
  
  // Special characters that are allowed
  SPECIAL_CHARS: '!@#$%^&*()_+\\-=[]{};\':"|,.<>/?',
  
  // Password expiration in days (90 days)
  EXPIRATION_DAYS: 90,
  
  // Number of previous passwords to check against for history
  HISTORY_COUNT: 5,
  
  // Minimum password age in days (prevent frequent changes)
  MIN_AGE_DAYS: 1,
  
  // Maximum failed login attempts before account lockout
  MAX_FAILED_ATTEMPTS: 5,
  
  // Account lockout duration in minutes
  LOCKOUT_DURATION_MINUTES: 30
};

/**
 * @function validatePasswordStrength
 * @description Validates password strength against policy requirements
 * @param {string} password - The password to validate
 * @returns {Object} Validation result with success flag and error message
 */
const validatePasswordStrength = (password) => {
  // Check password length
  if (!password || password.length < PASSWORD_POLICY.MIN_LENGTH) {
    return {
      isValid: false,
      message: `Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters long`
    };
  }
  
  if (password.length > PASSWORD_POLICY.MAX_LENGTH) {
    return {
      isValid: false,
      message: `Password cannot exceed ${PASSWORD_POLICY.MAX_LENGTH} characters`
    };
  }
  
  // Check for uppercase letters
  if (PASSWORD_POLICY.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter'
    };
  }
  
  // Check for lowercase letters
  if (PASSWORD_POLICY.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter'
    };
  }
  
  // Check for numbers
  if (PASSWORD_POLICY.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number'
    };
  }
  
  // Check for special characters
  const specialCharsRegex = new RegExp(`[${PASSWORD_POLICY.SPECIAL_CHARS.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`);
  if (PASSWORD_POLICY.REQUIRE_SPECIAL && !specialCharsRegex.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one special character'
    };
  }
  
  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    return {
      isValid: false,
      message: 'Password cannot contain repeating characters (3 or more)'
    };
  }
  
  // Check for sequential characters
  const sequences = ['abcdefghijklmnopqrstuvwxyz', '01234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  for (const seq of sequences) {
    for (let i = 0; i < seq.length - 2; i++) {
      const fragment = seq.substring(i, i + 3);
      if (password.toLowerCase().includes(fragment)) {
        return {
          isValid: false,
          message: 'Password cannot contain sequential characters'
        };
      }
    }
  }
  
  return {
    isValid: true,
    message: 'Password meets strength requirements'
  };
};

/**
 * @function generatePasswordHash
 * @description Generates a secure hash of a password
 * @param {string} password - The password to hash
 * @returns {Promise<string>} Hashed password
 */
const generatePasswordHash = async (password) => {
  // This is a placeholder - in the actual implementation, 
  // we would use bcryptjs which is already used in UserService
  return require('bcryptjs').hash(password, 10);
};

/**
 * @function checkPasswordHistory
 * @description Checks if a password has been used before
 * @param {string} userId - User ID
 * @param {string} newPassword - New password to check
 * @param {Object} client - Database client
 * @returns {Promise<boolean>} True if password is not in history
 */
const checkPasswordHistory = async (userId, newPassword, client) => {
  const { rows } = await client.query(
    `SELECT password_hash FROM password_history 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [userId, PASSWORD_POLICY.HISTORY_COUNT]
  );
  
  const bcrypt = require('bcryptjs');
  
  // Check each historical password
  for (const row of rows) {
    const isMatch = await bcrypt.compare(newPassword, row.password_hash);
    if (isMatch) {
      return false; // Password has been used before
    }
  }
  
  return true; // Password not found in history
};

/**
 * @function addToPasswordHistory
 * @description Adds a password to the user's password history
 * @param {string} userId - User ID
 * @param {string} passwordHash - Hashed password to add to history
 * @param {Object} client - Database client
 * @returns {Promise<void>}
 */
const addToPasswordHistory = async (userId, passwordHash, client) => {
  await client.query(
    `INSERT INTO password_history (user_id, password_hash) 
     VALUES ($1, $2)`,
    [userId, passwordHash]
  );
};

/**
 * @function isPasswordExpired
 * @description Checks if a user's password has expired
 * @param {string} userId - User ID
 * @param {Object} client - Database client
 * @returns {Promise<boolean>} True if password has expired
 */
const isPasswordExpired = async (userId, client) => {
  const { rows } = await client.query(
    `SELECT password_updated_at FROM users WHERE sys_id = $1`,
    [userId]
  );
  
  if (rows.length === 0) {
    return false;
  }
  
  const passwordUpdatedAt = rows[0].password_updated_at;
  
  if (!passwordUpdatedAt) {
    return true; // No update date means password should be updated
  }
  
  const expirationDate = new Date(passwordUpdatedAt);
  expirationDate.setDate(expirationDate.getDate() + PASSWORD_POLICY.EXPIRATION_DAYS);
  
  return new Date() > expirationDate;
};

/**
 * @function generateSecurePassword
 * @description Generates a secure random password that meets policy requirements
 * @returns {string} A secure random password
 */
const generateSecurePassword = () => {
  const length = PASSWORD_POLICY.MIN_LENGTH + 4; // Slightly longer than minimum
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const specialChars = PASSWORD_POLICY.SPECIAL_CHARS;
  
  // Ensure at least one of each required character type
  let password = '';
  
  if (PASSWORD_POLICY.REQUIRE_UPPERCASE) {
    password += uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
  }
  
  if (PASSWORD_POLICY.REQUIRE_LOWERCASE) {
    password += lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
  }
  
  if (PASSWORD_POLICY.REQUIRE_NUMBER) {
    password += numberChars.charAt(Math.floor(Math.random() * numberChars.length));
  }
  
  if (PASSWORD_POLICY.REQUIRE_SPECIAL) {
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));
  }
  
  // Fill the rest with random characters from all sets
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  const remainingLength = length - password.length;
  
  for (let i = 0; i < remainingLength; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password characters
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

module.exports = {
  PASSWORD_POLICY,
  validatePasswordStrength,
  generatePasswordHash,
  checkPasswordHistory,
  addToPasswordHistory,
  isPasswordExpired,
  generateSecurePassword
}; 