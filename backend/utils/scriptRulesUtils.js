const { pool } = require('../db');

async function loadScriptRules() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT * FROM script_rule WHERE active = true');
    return rows.reduce((acc, rule) => {
      if (!acc[rule.table_name]) acc[rule.table_name] = {};
      acc[rule.table_name][rule.rule_name] = {
        condition: rule.condition,
        insert: rule.insert_enabled,
        update: rule.update_enabled,
        query: rule.query_enabled,
        delete: rule.delete_enabled,
        action: new Function('current', 'previous', 'client', rule.script)
      };
      return acc;
    }, {});
  } finally {
    client.release();
  }
}

function evaluateCondition(condition, current, previous) {
  if (!condition) return true;

  // Helper function to safely get nested properties
  const getNestedProperty = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  // Helper function to compare values
  const compare = (left, operator, right) => {
    switch (operator) {
      case '==': return left == right; // loose equality
      case '===': return left === right;
      case '!=': return left != right;
      case '!==': return left !== right;
      case '>': return left > right;
      case '>=': return left >= right;
      case '<': return left < right;
      case '<=': return left <= right;
      default: return false;
    }
  };

  // Parse the condition
  const regex = /(\w+(?:\.\w+)*)\s*(==|===|!=|!==|>|>=|<|<=)\s*(['"]\w+['"]|\d+)/g;
  let match;
  let result = true;

  while ((match = regex.exec(condition)) !== null) {
    const [, path, operator, rawValue] = match;
    const leftValue = getNestedProperty(current, path) || getNestedProperty(previous, path);
    let rightValue = rawValue.replace(/['"]/g, ''); // Remove quotes if present

    // Convert to number if possible
    if (!isNaN(rightValue)) {
      rightValue = parseFloat(rightValue);
    }

    result = result && compare(leftValue, operator, rightValue);

    if (!result) break; // Short-circuit if any part of the condition is false
  }

  return result;
}

async function executeScriptRule(tableName, ruleName, current, previous) {
  const scriptRules = await loadScriptRules();
  if (scriptRules[tableName] && scriptRules[tableName][ruleName]) {
    const rule = scriptRules[tableName][ruleName];
    if (evaluateCondition(rule.condition, current, previous)) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await rule.action(current, previous, client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error executing script rule ${tableName}.${ruleName}:`, error);
        throw error;
      } finally {
        client.release();
      }
    } else {
      console.log(`Condition not met for script rule ${tableName}.${ruleName}`);
    }
  } else {
    console.warn(`Script rule not found: ${tableName}.${ruleName}`);
  }
}

module.exports = { executeScriptRule };