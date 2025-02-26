/**
 * @module serviceFactory
 * @description Factory for creating standardized service methods with consistent error handling
 * @requires ./appError
 * @requires ./logger
 * @requires ../database/connection
 */

const AppError = require('./appError');
const { logger } = require('./logger');
const { pool } = require('../database/connection');

/**
 * @function withTransaction
 * @description Wraps a database operation in a transaction
 * @param {Function} operation - Async function to execute within the transaction
 * @param {Object} [providedClient=null] - Optional database client from parent transaction
 * @returns {Promise<*>} Result of the operation
 * @throws {Error} If the operation fails
 */
const withTransaction = async (operation, providedClient = null) => {
  // If client is provided, use it (we're in a nested transaction)
  if (providedClient) {
    return await operation(providedClient);
  }
  
  // Otherwise, create a new transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * @function createCrudService
 * @description Creates standardized CRUD service methods for a resource
 * @param {string} tableName - Database table name
 * @param {Object} options - Service options
 * @returns {Object} CRUD service methods
 * @example
 * const UserService = createCrudService('users', {
 *   idField: 'user_id',
 *   searchFields: ['username', 'email'],
 *   allowedFields: ['username', 'email', 'first_name', 'last_name'],
 *   relations: [
 *     { table: 'user_profiles', foreignKey: 'user_id', type: 'one' }
 *   ],
 *   validators: {
 *     create: createUserValidator,
 *     update: updateUserValidator
 *   }
 * });
 */
const createCrudService = (tableName, options = {}) => {
  const {
    idField = 'sys_id',
    searchFields = [],
    allowedFields = [],
    relations = [],
    validators = {},
    hooks = {}
  } = options;
  
  /**
   * @function create
   * @description Create a new resource
   * @param {Object} data - Resource data
   * @param {Object} [user] - Current user
   * @returns {Promise<Object>} Created resource
   * @throws {AppError} If validation fails or database error occurs
   */
  const create = async (data, user = null) => {
    // Validate data if validator exists
    if (validators.create) {
      const { error } = validators.create.validate(data);
      if (error) {
        throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
      }
    }
    
    // Filter allowed fields
    const filteredData = allowedFields.length > 0
      ? Object.keys(data)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = data[key];
            return obj;
          }, {})
      : data;
    
    // Add audit fields
    if (user) {
      filteredData.created_by = user.id;
      filteredData.updated_by = user.id;
    }
    
    // Execute before create hook if exists
    if (hooks.beforeCreate) {
      await hooks.beforeCreate(filteredData, user);
    }
    
    return withTransaction(async (client) => {
      // Build query
      const fields = Object.keys(filteredData);
      const values = Object.values(filteredData);
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${tableName} (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      // Execute query
      const { rows } = await client.query(query, values);
      
      if (rows.length === 0) {
        throw new AppError('Failed to create resource', 500, 'DATABASE_ERROR');
      }
      
      const result = rows[0];
      
      // Execute after create hook if exists
      if (hooks.afterCreate) {
        await hooks.afterCreate(result, user, client);
      }
      
      return result;
    });
  };
  
  /**
   * @function findAll
   * @description Find all resources matching query
   * @param {Object} query - Query parameters
   * @param {Object} [user] - Current user
   * @returns {Promise<Object[]>} Found resources
   * @throws {AppError} If database error occurs
   */
  const findAll = async (query = {}, user = null) => {
    // Build where clause
    const conditions = [];
    const values = [];
    let valueIndex = 1;
    
    // Add search conditions
    if (query.search && searchFields.length > 0) {
      const searchConditions = searchFields.map(field => {
        values.push(`%${query.search}%`);
        return `${field} ILIKE $${valueIndex++}`;
      });
      
      conditions.push(`(${searchConditions.join(' OR ')})`);
    }
    
    // Add filter conditions
    Object.keys(query).forEach(key => {
      if (key !== 'search' && key !== 'sort' && key !== 'limit' && key !== 'offset' && allowedFields.includes(key)) {
        conditions.push(`${key} = $${valueIndex++}`);
        values.push(query[key]);
      }
    });
    
    // Build query
    let sql = `SELECT * FROM ${tableName}`;
    
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Add sorting
    if (query.sort) {
      const [field, direction] = query.sort.split(':');
      if (allowedFields.includes(field)) {
        sql += ` ORDER BY ${field} ${direction === 'desc' ? 'DESC' : 'ASC'}`;
      }
    } else {
      sql += ` ORDER BY created_at DESC`;
    }
    
    // Add pagination
    const limit = query.limit ? parseInt(query.limit) : 100;
    const offset = query.offset ? parseInt(query.offset) : 0;
    
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    
    // Execute query
    const { rows } = await pool.query(sql, values);
    
    // Execute after find hook if exists
    if (hooks.afterFind) {
      await hooks.afterFind(rows, user);
    }
    
    return rows;
  };
  
  /**
   * @function findById
   * @description Find a resource by ID
   * @param {string} id - Resource ID
   * @param {Object} [user] - Current user
   * @returns {Promise<Object>} Found resource
   * @throws {AppError} If resource not found or database error occurs
   */
  const findById = async (id, user = null) => {
    // Build query
    const query = `SELECT * FROM ${tableName} WHERE ${idField} = $1`;
    
    // Execute query
    const { rows } = await pool.query(query, [id]);
    
    if (rows.length === 0) {
      throw new AppError('Resource not found', 404, 'NOT_FOUND');
    }
    
    const result = rows[0];
    
    // Execute after find hook if exists
    if (hooks.afterFind) {
      await hooks.afterFind([result], user);
    }
    
    return result;
  };
  
  /**
   * @function update
   * @description Update a resource by ID
   * @param {string} id - Resource ID
   * @param {Object} data - Update data
   * @param {Object} [user] - Current user
   * @returns {Promise<Object>} Updated resource
   * @throws {AppError} If validation fails, resource not found, or database error occurs
   */
  const update = async (id, data, user = null) => {
    // Validate data if validator exists
    if (validators.update) {
      const { error } = validators.update.validate(data);
      if (error) {
        throw new AppError(error.details[0].message, 400, 'VALIDATION_ERROR');
      }
    }
    
    // Filter allowed fields
    const filteredData = allowedFields.length > 0
      ? Object.keys(data)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = data[key];
            return obj;
          }, {})
      : data;
    
    // Add audit fields
    if (user) {
      filteredData.updated_by = user.id;
      filteredData.updated_at = new Date();
    }
    
    // Execute before update hook if exists
    if (hooks.beforeUpdate) {
      await hooks.beforeUpdate(id, filteredData, user);
    }
    
    return withTransaction(async (client) => {
      // Check if resource exists
      const checkQuery = `SELECT * FROM ${tableName} WHERE ${idField} = $1`;
      const { rows: checkRows } = await client.query(checkQuery, [id]);
      
      if (checkRows.length === 0) {
        throw new AppError('Resource not found', 404, 'NOT_FOUND');
      }
      
      const oldData = checkRows[0];
      
      // Build update query
      const fields = Object.keys(filteredData);
      const values = Object.values(filteredData);
      const placeholders = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
      
      const query = `
        UPDATE ${tableName}
        SET ${placeholders}
        WHERE ${idField} = $1
        RETURNING *
      `;
      
      // Execute query
      const { rows } = await client.query(query, [id, ...values]);
      
      if (rows.length === 0) {
        throw new AppError('Failed to update resource', 500, 'DATABASE_ERROR');
      }
      
      const result = rows[0];
      
      // Execute after update hook if exists
      if (hooks.afterUpdate) {
        await hooks.afterUpdate(result, oldData, user, client);
      }
      
      return result;
    });
  };
  
  /**
   * @function delete
   * @description Delete a resource by ID
   * @param {string} id - Resource ID
   * @param {Object} [user] - Current user
   * @returns {Promise<boolean>} True if deleted
   * @throws {AppError} If resource not found or database error occurs
   */
  const deleteResource = async (id, user = null) => {
    // Execute before delete hook if exists
    if (hooks.beforeDelete) {
      await hooks.beforeDelete(id, user);
    }
    
    return withTransaction(async (client) => {
      // Check if resource exists
      const checkQuery = `SELECT * FROM ${tableName} WHERE ${idField} = $1`;
      const { rows: checkRows } = await client.query(checkQuery, [id]);
      
      if (checkRows.length === 0) {
        throw new AppError('Resource not found', 404, 'NOT_FOUND');
      }
      
      const oldData = checkRows[0];
      
      // Build delete query
      const query = `DELETE FROM ${tableName} WHERE ${idField} = $1 RETURNING ${idField}`;
      
      // Execute query
      const { rows } = await client.query(query, [id]);
      
      if (rows.length === 0) {
        throw new AppError('Failed to delete resource', 500, 'DATABASE_ERROR');
      }
      
      // Execute after delete hook if exists
      if (hooks.afterDelete) {
        await hooks.afterDelete(oldData, user, client);
      }
      
      return true;
    });
  };
  
  return {
    create,
    findAll,
    findById,
    update,
    delete: deleteResource,
    withTransaction
  };
};

module.exports = {
  createCrudService,
  withTransaction
}; 