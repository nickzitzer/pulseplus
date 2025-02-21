const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { pool } = require('../database/connection');
const { verifyToken, checkPermissions } = require('../middleware/auth');
const { withTransaction, auditLog } = require('../utils/routeHelpers');
const { departmentSchema } = require('../utils/schemas');
const AppError = require('../utils/appError');
const crudFactory = require('../utils/crudFactory');
const { schemas } = require('../utils/validation');
const permissionService = require('../utils/permissionService');

// Helper function to log audit events
async function logAuditEvent(client, userId, action, entityType, entityId, details) {
  const query = `
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
    VALUES ($1, $2, $3, $4, $5)
  `;
  await client.query(query, [userId, action, entityType, entityId, details]);
}

// Create a new department
router.post('/', verifyToken, async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const { error } = departmentSchema.validate(req.body);
      if (error) throw new AppError(error.details[0].message, 400);

      const { rows } = await client.query(
        `INSERT INTO department 
        (name, description, parent_department_id, manager_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [req.body.name, req.body.description, 
         req.body.parent_department_id, req.body.manager_id]
      );

      await auditLog(client, req.user, 'CREATE', {
        table: 'department',
        id: rows[0].sys_id,
        new: rows[0]
      });

      res.status(201).json(rows[0]);
    });
  } catch (err) {
    next(err);
  }
});

// Get all departments with filtering and pagination
router.get('/', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      parent_department_id,
      is_active,
      search,
      page = 1,
      limit = 20,
      sort_by = 'name',
      sort_order = 'ASC'
    } = req.query;

    let conditions = ['1=1'];
    const params = [];
    let paramCount = 1;

    if (parent_department_id) {
      conditions.push(`d.parent_department_id = $${paramCount++}`);
      params.push(parent_department_id);
    }

    if (is_active !== undefined) {
      conditions.push(`d.is_active = $${paramCount++}`);
      params.push(is_active === 'true');
    }

    if (search) {
      conditions.push(`(
        d.name ILIKE $${paramCount} OR 
        d.description ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
      paramCount++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*)
      FROM department d
      WHERE ${conditions.join(' AND ')}
    `;
    const totalCount = parseInt((await client.query(countQuery, params)).rows[0].count);

    // Get paginated results
    const query = `
      WITH RECURSIVE department_tree AS (
        SELECT 
          d.*,
          0 as level,
          ARRAY[d.sys_id] as path,
          json_build_object(
            'id', m.sys_id,
            'user_name', m.user_name,
            'first_name', m.first_name,
            'last_name', m.last_name,
            'email', m.email
          ) as manager,
          (SELECT COUNT(*) FROM sys_user u WHERE u.department_id = d.sys_id) as employee_count
        FROM department d
        JOIN sys_user m ON d.manager_id = m.sys_id
        WHERE ${conditions.join(' AND ')}
        
        UNION ALL
        
        SELECT 
          d.*,
          dt.level + 1,
          dt.path || d.sys_id,
          json_build_object(
            'id', m.sys_id,
            'user_name', m.user_name,
            'first_name', m.first_name,
            'last_name', m.last_name,
            'email', m.email
          ) as manager,
          (SELECT COUNT(*) FROM sys_user u WHERE u.department_id = d.sys_id) as employee_count
        FROM department d
        JOIN sys_user m ON d.manager_id = m.sys_id
        JOIN department_tree dt ON d.parent_department_id = dt.sys_id
        WHERE NOT d.sys_id = ANY(dt.path)
      )
      SELECT 
        dt.*,
        (
          SELECT json_agg(json_build_object(
            'id', c.sys_id,
            'name', c.name,
            'level', c.level
          ))
          FROM department_tree c
          WHERE c.path[1:array_length(dt.path, 1)] = dt.path
          AND c.sys_id != dt.sys_id
        ) as children
      FROM department_tree dt
      WHERE dt.level = 0
      ORDER BY dt.${sort_by} ${sort_order}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const offset = (page - 1) * limit;
    params.push(limit, offset);

    const result = await client.query(query, params);

    res.json({
      data: result.rows,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Get a specific department
router.get('/:id', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      WITH RECURSIVE department_tree AS (
        SELECT 
          d.*,
          0 as level,
          ARRAY[d.sys_id] as path,
          json_build_object(
            'id', m.sys_id,
            'user_name', m.user_name,
            'first_name', m.first_name,
            'last_name', m.last_name,
            'email', m.email
          ) as manager,
          (SELECT COUNT(*) FROM sys_user u WHERE u.department_id = d.sys_id) as employee_count
        FROM department d
        JOIN sys_user m ON d.manager_id = m.sys_id
        WHERE d.sys_id = $1
        
        UNION ALL
        
        SELECT 
          d.*,
          dt.level + 1,
          dt.path || d.sys_id,
          json_build_object(
            'id', m.sys_id,
            'user_name', m.user_name,
            'first_name', m.first_name,
            'last_name', m.last_name,
            'email', m.email
          ) as manager,
          (SELECT COUNT(*) FROM sys_user u WHERE u.department_id = d.sys_id) as employee_count
        FROM department d
        JOIN sys_user m ON d.manager_id = m.sys_id
        JOIN department_tree dt ON d.parent_department_id = dt.sys_id
        WHERE NOT d.sys_id = ANY(dt.path)
      )
      SELECT 
        dt.*,
        (
          SELECT json_agg(json_build_object(
            'id', c.sys_id,
            'name', c.name,
            'level', c.level,
            'employee_count', c.employee_count,
            'manager', c.manager
          ))
          FROM department_tree c
          WHERE c.path[1:array_length(dt.path, 1)] = dt.path
          AND c.sys_id != dt.sys_id
        ) as children,
        (
          SELECT json_agg(json_build_object(
            'id', u.sys_id,
            'user_name', u.user_name,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'email', u.email,
            'role', u.role
          ))
          FROM sys_user u
          WHERE u.department_id = dt.sys_id
        ) as employees
      FROM department_tree dt
      WHERE dt.level = 0
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Update a department
router.put('/:id', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current department state
    const { rows: currentDept } = await client.query(
      'SELECT * FROM department WHERE sys_id = $1',
      [req.params.id]
    );

    if (currentDept.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check permissions
    const hasPermission = await checkPermissions(
      client,
      req.user.sys_id,
      null,
      ['ADMIN', 'HR_MANAGER']
    );

    const isManager = currentDept[0].manager_id === req.user.sys_id;

    if (!hasPermission && !isManager) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Validate request body
    const { error, value } = departmentSchema.validate(req.body);
    if (error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: error.details[0].message });
    }

    // Check for circular reference in parent department
    if (value.parent_department_id) {
      const { rows: circularCheck } = await client.query(`
        WITH RECURSIVE department_tree AS (
          SELECT sys_id, parent_department_id
          FROM department
          WHERE sys_id = $1
          
          UNION ALL
          
          SELECT d.sys_id, d.parent_department_id
          FROM department d
          JOIN department_tree dt ON d.sys_id = dt.parent_department_id
        )
        SELECT 1 FROM department_tree WHERE sys_id = $2
      `, [value.parent_department_id, req.params.id]);

      if (circularCheck.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Circular department reference detected' });
      }
    }

    // Update department
    const { rows } = await client.query(`
      UPDATE department SET
        name = $1,
        description = $2,
        parent_department_id = $3,
        manager_id = $4,
        is_active = $5,
        settings = $6,
        sys_updated_at = CURRENT_TIMESTAMP
      WHERE sys_id = $7
      RETURNING *
    `, [
      value.name,
      value.description,
      value.parent_department_id,
      value.manager_id,
      value.is_active,
      value.settings,
      req.params.id
    ]);

    await logAuditEvent(
      client,
      req.user.sys_id,
      'UPDATE',
      'DEPARTMENT',
      req.params.id,
      {
        previous: currentDept[0],
        updated: rows[0]
      }
    );

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Delete a department
router.delete('/:id', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get current department state
    const { rows: currentDept } = await client.query(`
      SELECT d.*, 
      (SELECT COUNT(*) FROM department sub WHERE sub.parent_department_id = d.sys_id) as subdepartment_count,
      (SELECT COUNT(*) FROM sys_user u WHERE u.department_id = d.sys_id) as employee_count
      FROM department d
      WHERE d.sys_id = $1
    `, [req.params.id]);

    if (currentDept.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check permissions
    const hasPermission = await checkPermissions(
      client,
      req.user.sys_id,
      null,
      ['ADMIN', 'HR_MANAGER']
    );

    if (!hasPermission) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check if department can be deleted
    if (currentDept[0].subdepartment_count > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Cannot delete department with subdepartments',
        subdepartment_count: currentDept[0].subdepartment_count
      });
    }

    if (currentDept[0].employee_count > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Cannot delete department with active employees',
        employee_count: currentDept[0].employee_count
      });
    }

    // Delete the department
    await client.query('DELETE FROM department WHERE sys_id = $1', [req.params.id]);

    await logAuditEvent(
      client,
      req.user.sys_id,
      'DELETE',
      'DEPARTMENT',
      req.params.id,
      {
        deleted_department: currentDept[0]
      }
    );

    await client.query('COMMIT');
    res.status(204).send();
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Add department tree endpoint
router.get('/:id/hierarchy', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `WITH RECURSIVE dept_tree AS (
        SELECT sys_id, name, parent_department_id, 1 as depth
        FROM department
        WHERE sys_id = $1
        UNION ALL
        SELECT d.sys_id, d.name, d.parent_department_id, dt.depth + 1
        FROM department d
        INNER JOIN dept_tree dt ON d.parent_department_id = dt.sys_id
      )
      SELECT * FROM dept_tree ORDER BY depth`,
      [req.params.id]
    );
    
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = crudFactory({
  resourceName: 'department',
  schema: schemas.department,
  middleware: [verifyToken],
  auditConfig: {
    table: 'department',
    relations: {
      manager: 'sys_user',
      parent: 'department'
    }
  },
  validations: {
    create: {
      body: Joi.object({
        name: Joi.string().max(255).required(),
        description: Joi.string().max(1000),
        manager_id: schemas.commonSchemas.uuid.required(),
        parent_department_id: schemas.commonSchemas.uuid.allow(null),
        settings: Joi.object({
          can_have_subdepartments: Joi.boolean().default(true),
          requires_manager_approval: Joi.boolean().default(false),
          budget_limit: Joi.number().min(0),
          notification_preferences: Joi.object({
            email: Joi.boolean().default(true),
            slack: Joi.boolean().default(false),
            teams: Joi.boolean().default(false)
          }).default()
        }).default()
      })
    },
    update: {
      body: Joi.object({
        name: Joi.string().max(255),
        description: Joi.string().max(1000),
        manager_id: schemas.commonSchemas.uuid,
        parent_department_id: schemas.commonSchemas.uuid.allow(null),
        settings: Joi.object({
          can_have_subdepartments: Joi.boolean().default(true),
          requires_manager_approval: Joi.boolean().default(false),
          budget_limit: Joi.number().min(0),
          notification_preferences: Joi.object({
            email: Joi.boolean().default(true),
            slack: Joi.boolean().default(false),
            teams: Joi.boolean().default(false)
          })
        })
      }).min(1)
    }
  },
  customEndpoints: (router) => {
    // Get department hierarchy
    router.get('/:id/hierarchy',
      validateRequest(schemas.department.getHierarchy),
      async (req, res, next) => {
        try {
          const hierarchy = await withTransaction(async (client) => {
            const department = await client.query(
              'SELECT * FROM department WHERE sys_id = $1',
              [req.params.id]
            );

            if (!department.rows.length) {
              throw new AppError('Department not found', 404);
            }

            await permissionService.checkPermissions(
              client,
              req.user.sys_id,
              'DEPARTMENT',
              department.rows[0].sys_id,
              ['VIEW_HIERARCHY']
            );

            const { rows } = await client.query(
              `WITH RECURSIVE department_tree AS (
                SELECT * FROM department WHERE sys_id = $1
                UNION ALL
                SELECT d.* FROM department d
                JOIN department_tree dt ON d.parent_department_id = dt.sys_id
              )
              SELECT * FROM department_tree`,
              [req.params.id]
            );

            return rows;
          });

          sendSuccess(res, hierarchy);
        } catch (error) {
          next(error);
        }
      }
    );

    // Get department members
    router.get('/:id/members',
      validateRequest(schemas.department.getMembers),
      async (req, res, next) => {
        try {
          const members = await withTransaction(async (client) => {
            const department = await client.query(
              'SELECT * FROM department WHERE sys_id = $1',
              [req.params.id]
            );

            if (!department.rows.length) {
              throw new AppError('Department not found', 404);
            }

            await permissionService.checkPermissions(
              client,
              req.user.sys_id,
              'DEPARTMENT',
              department.rows[0].sys_id,
              ['VIEW_MEMBERS']
            );

            const { rows } = await client.query(
              `SELECT u.*, d.role 
              FROM department_member d
              JOIN sys_user u ON d.user_id = u.sys_id
              WHERE d.department_id = $1
              ORDER BY d.joined_at ASC`,
              [req.params.id]
            );

            return rows;
          });

          sendSuccess(res, members);
        } catch (error) {
          next(error);
        }
      }
    );

    // Update department manager
    router.patch('/:id/manager',
      validateRequest(schemas.department.updateManager),
      async (req, res, next) => {
        try {
          const result = await withTransaction(async (client) => {
            const department = await client.query(
              'SELECT * FROM department WHERE sys_id = $1',
              [req.params.id]
            );

            if (!department.rows.length) {
              throw new AppError('Department not found', 404);
            }

            await permissionService.checkPermissions(
              client,
              req.user.sys_id,
              'DEPARTMENT',
              department.rows[0].sys_id,
              ['MANAGE_MANAGER']
            );

            // Verify new manager exists
            const manager = await client.query(
              'SELECT 1 FROM sys_user WHERE sys_id = $1',
              [req.body.manager_id]
            );

            if (!manager.rows.length) {
              throw new AppError('Manager not found', 404);
            }

            const { rows } = await client.query(
              `UPDATE department 
              SET manager_id = $1
              WHERE sys_id = $2
              RETURNING *`,
              [req.body.manager_id, req.params.id]
            );

            return rows[0];
          });

          sendSuccess(res, result);
        } catch (error) {
          next(error);
        }
      }
    );

    return router;
  }
});