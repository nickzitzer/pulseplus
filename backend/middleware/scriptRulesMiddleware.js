/**
 * @module scriptRulesMiddleware
 * @description Middleware for executing dynamic script rules and validations
 * @requires ../utils/scriptRulesUtils
 * @requires ../database/connection
 */

const { executeScriptRule } = require('../utils/scriptRulesUtils');
const { pool } = require('../database/connection');

/**
 * @typedef {Object} OperationMap
 * @property {string} POST - Insert operation
 * @property {string} PUT - Update operation
 * @property {string} PATCH - Update operation
 * @property {string} GET - Query operation
 * @property {string} DELETE - Delete operation
 */

/**
 * @constant {OperationMap}
 * @private
 */
const operationMap = {
  'POST': 'insert',
  'PUT': 'update',
  'PATCH': 'update',
  'GET': 'query',
  'DELETE': 'delete'
};

/**
 * @function applyScriptRules
 * @description Middleware that applies database-stored script rules based on HTTP method
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 * @returns {Promise<void>}
 * @throws {Error} If script execution fails
 * 
 * @example
 * // Use as middleware in route
 * router.post('/users',
 *   applyScriptRules,
 *   usersController.createUser
 * );
 */
async function applyScriptRules(req, res, next) {
  const originalJson = res.json;
  res.json = async function(data) {
    const tableName = req.baseUrl.split('/').pop();
    const operation = operationMap[req.method];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: rules } = await client.query(
        'SELECT rule_name FROM script_rule WHERE table_name = $1 AND active = true AND ' + operation + '_enabled = true',
        [tableName]
      );

      for (const rule of rules) {
        await executeScriptRule(tableName, rule.rule_name, data, req.body);
      }

      await client.query('COMMIT');
      originalJson.call(this, data);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error executing script rules:', error);
      res.status(500).json({ error: 'An error occurred while processing the request' });
    } finally {
      client.release();
    }
  };

  next();
}

/**
 * @typedef {Object} ScriptRule
 * @property {string} id - Unique identifier for the rule
 * @property {string} script - JavaScript code to execute
 * @property {Object} [context] - Additional context data for script execution
 */

/**
 * @typedef {Object} ScriptRuleOptions
 * @property {boolean} [stopOnFailure=true] - Whether to stop execution on first failure
 */

/**
 * @typedef {Object} ScriptRuleResult
 * @property {boolean} success - Whether the validation succeeded
 * @property {Object} [error] - Error details if validation failed
 * @property {string} error.code - Error code
 * @property {string} error.message - Error message
 * @property {string} error.ruleId - ID of the failed rule
 */

/**
 * @function createScriptRuleMiddleware
 * @description Creates middleware for executing script-based rules and validations
 * @param {ScriptRule|ScriptRule[]} rules - Single rule or array of rules to execute
 * @param {ScriptRuleOptions} [options] - Execution options
 * @returns {import('express').RequestHandler} Express middleware function
 * @throws {Error} If script execution fails
 * 
 * @example
 * // Single rule
 * router.post('/validate',
 *   createScriptRuleMiddleware({
 *     id: 'checkAge',
 *     script: 'return data.age >= 18;',
 *     context: { minAge: 18 }
 *   }),
 *   controller.handleValidation
 * );
 * 
 * // Multiple rules
 * router.post('/complex-validate',
 *   createScriptRuleMiddleware([
 *     {
 *       id: 'checkBalance',
 *       script: 'return data.balance >= context.minBalance;',
 *       context: { minBalance: 100 }
 *     },
 *     {
 *       id: 'checkStatus',
 *       script: 'return ["active", "pending"].includes(data.status);'
 *     }
 *   ], { stopOnFailure: true }),
 *   controller.handleValidation
 * );
 */
const createScriptRuleMiddleware = (rules, options = { stopOnFailure: true }) => {
  const ruleArray = Array.isArray(rules) ? rules : [rules];

  /**
   * @function scriptRuleMiddleware
   * @private
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next function
   * @returns {Promise<void>}
   */
  return async (req, res, next) => {
    try {
      for (const rule of ruleArray) {
        const result = await executeScriptRule(rule, {
          req,
          data: req.body,
          context: rule.context
        });

        if (!result && options.stopOnFailure) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'RULE_VALIDATION_FAILED',
              message: `Validation failed for rule: ${rule.id}`,
              ruleId: rule.id
            }
          });
        }
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  applyScriptRules,
  createScriptRuleMiddleware
};