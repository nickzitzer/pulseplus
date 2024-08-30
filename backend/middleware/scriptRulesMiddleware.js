const { executeScriptRule } = require('../utils/scriptRulesUtils');
const { pool } = require('../db');

const operationMap = {
  'POST': 'insert',
  'PUT': 'update',
  'PATCH': 'update',
  'GET': 'query',
  'DELETE': 'delete'
};

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

module.exports = applyScriptRules;