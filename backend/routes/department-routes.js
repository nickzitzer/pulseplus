const express = require('express');
const Joi = require('joi');
const { pool } = require('../database/connection');
const { verifyToken, checkPermissions } = require('../middleware/auth');
const { withTransaction } = require('../utils/routeHelpers');
const { departmentSchema } = require('../utils/schemas');
const AppError = require('../utils/appError');
const crudFactory = require('../utils/crudFactory');
const { commonSchemas } = require('../utils/validation');
const permissionService = require('../utils/permissionService');
const { validateRequest } = require('../utils/validation');
const { asyncHandler } = require('../utils/errorHandler');
const { sendSuccess } = require('../utils/responseHandler');

// Helper function to log audit events
async function logAuditEvent(client, userId, action, entityType, entityId, details) {
  const query = `
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
    VALUES ($1, $2, $3, $4, $5)
  `;
  await client.query(query, [userId, action, entityType, entityId, details]);
}

// Create the base router using crudFactory
const router = crudFactory({
  resourceName: 'department',
  schema: departmentSchema,
  middleware: [verifyToken],
  permissions: {
    create: ['ADMIN', 'HR_MANAGER'],
    read: ['ADMIN', 'HR_MANAGER', 'DEPARTMENT_VIEWER'],
    update: ['ADMIN', 'HR_MANAGER'],
    delete: ['ADMIN', 'HR_MANAGER']
  },
  auditEnabled: true,
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
        manager_id: commonSchemas.uuid.required(),
        parent_department_id: commonSchemas.uuid.allow(null),
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
        manager_id: commonSchemas.uuid,
        parent_department_id: commonSchemas.uuid.allow(null),
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
    },
    list: {
      query: Joi.object({
        parent_department_id: commonSchemas.uuid,
        is_active: Joi.boolean(),
        search: Joi.string(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sort_by: Joi.string().valid('name', 'created_at', 'updated_at').default('name'),
        sort_order: Joi.string().valid('ASC', 'DESC').default('ASC')
      })
    }
  }
});

// Get all departments with filtering and pagination
router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const {
    parent_department_id,
    is_active,
    search,
    page = 1,
    limit = 20,
    sort_by = 'name',
    sort_order = 'ASC'
  } = req.query;

  const client = await pool.connect();
  try {
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
  } finally {
    client.release();
  }
}));

// Get a specific department
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
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
  } finally {
    client.release();
  }
}));

// Add department hierarchy endpoint
router.get('/:id/hierarchy', verifyToken, asyncHandler(async (req, res) => {
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
}));

// Get department members
router.get('/:id/members', verifyToken, asyncHandler(async (req, res) => {
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

  sendSuccess(res, result);
}));

// Update department manager
router.patch('/:id/manager', verifyToken, asyncHandler(async (req, res) => {
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
}));

module.exports = router;