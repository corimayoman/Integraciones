/**
 * Rutas REST del Módulo de Recolección de Datos.
 * Exporta createDCRouter(db) que retorna un Express Router.
 *
 * Validates: Requirements 2.1, 2.3, 4.3, 4.5, 4.6, 9.2, 9.3, 9.4, 9.5, 9.6,
 *            11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

const express = require('express');
const { verifyPassword, generateToken, hashPassword, createAuthMiddleware, adminOnly } = require('./dc-auth');
const userRepo = require('./dc-user-repo');
const companyRepo = require('./dc-company-repo');
const assignmentRepo = require('./dc-assignment-repo');
const sheetRepo = require('./dc-sheet-repo');
const { seedCompanyQuestions } = require('./dc-seed-questions');

// --- Column-to-role mapping ---

const COLUMN_ROLES = {
  apps: {
    empresa: [
      'app_id', 'manufacturer', 'app_name', 'used_for', 'license_group',
      'license_level', 'num_users', 'cost_monthly', 'end_date',
      'subscription_path', 'renewal_path', 'cancellation_path',
      'information_type', 'sso', 'owner', 'project_or_corporate'
    ],
    globant: [
      'globant_studio', 'eligible', 'gist_approval', 'action', 'comments'
    ]
  },
  compliance: {
    empresa: [
      'norm_certification', 'scope', 'issued_by', 'issued_on',
      'due_date', 'impact_on', 'associated_cost', 'renewal_period'
    ],
    globant: []
  },
  infrastructure: {
    empresa: ['company_answer'],
    globant: ['globant_comments', 'globant_owner', 'due_date', 'additional_comments']
  },
  it_experience: {
    empresa: ['company_answer'],
    globant: ['globant_comments', 'globant_owner', 'due_date', 'additional_comments']
  },
  mst: {
    empresa: ['company_answer'],
    globant: ['globant_comments', 'globant_owner', 'due_date', 'additional_comments']
  },
  building_security: {
    empresa: ['company_answer'],
    globant: []
  },
  endpoints: {
    empresa: [
      'endpoint_id', 'user_login', 'full_name', 'gut_email', 'globant_email',
      'area', 'endpoint_type', 'manufacturer', 'model', 'serial_number',
      'rented_owned', 'processor', 'ram', 'disk_space', 'year_model',
      'operative_system', 'supports_windows_11', 'supports_ventura_above',
      'reimage_replace', 'comments_onboard', 'mac_big_sur_supported',
      'windows_10_supported', 'warranty_end_date', 'purchase_date', 'comments'
    ],
    globant: []
  }
};

/**
 * Returns the set of columns a user role can edit for a given sheet.
 * Admin can edit all columns.
 */
function getEditableColumns(sheetId, role) {
  const mapping = COLUMN_ROLES[sheetId];
  if (!mapping) return [];
  if (role === 'admin') return [...mapping.empresa, ...mapping.globant];
  if (role === 'empresa') return [...mapping.empresa];
  if (role === 'globant') return [...mapping.globant];
  return [];
}

/**
 * Checks if the user's role allows editing all the columns present in the data object.
 * Returns { allowed: true } or { allowed: false, forbidden: [...] }.
 */
function checkColumnPermissions(sheetId, role, data) {
  const editable = getEditableColumns(sheetId, role);
  // Ignore internal/auto-managed fields
  const ignored = ['id', 'company_id', 'sheet_id', 'created_at', 'updated_at'];
  const dataColumns = Object.keys(data).filter(c => !ignored.includes(c));
  const forbidden = dataColumns.filter(c => !editable.includes(c));
  if (forbidden.length > 0) return { allowed: false, forbidden };
  return { allowed: true };
}

/**
 * Gets the user's role for a specific company from their assignments.
 * Admin users get 'admin' role for all companies.
 * Returns the role string or null if no assignment.
 */
function getUserRoleForCompany(db, userId, userRole, companyId) {
  if (userRole === 'admin') return 'admin';
  const assignments = assignmentRepo.findByUser(db, userId);
  const match = assignments.find(a => a.company_id === companyId);
  return match ? match.role : null;
}

/**
 * Creates the DC module Express Router.
 * @param {import('better-sqlite3').Database} db
 * @returns {import('express').Router}
 */
function createDCRouter(db) {
  const router = express.Router();
  const auth = createAuthMiddleware(db);

  // =============================================
  // AUTH — Login (no auth required)
  // =============================================
  router.post('/auth/login', (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ ok: false, error: 'Campos requeridos faltantes', fields: ['username', 'password'].filter(f => !req.body[f]) });
      }
      const user = userRepo.findByUsername(db, username);
      if (!user || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
      }
      if (!user.active) {
        return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
      }
      const token = generateToken(user);
      return res.json({ ok: true, data: { token, user: { id: user.id, username: user.username, name: user.name, role: user.role } } });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  // =============================================
  // COMPANIES — CRUD
  // =============================================
  router.get('/companies', auth, (req, res) => {
    try {
      const companies = req.user.role === 'admin'
        ? companyRepo.findAll(db)
        : companyRepo.findByUserId(db, req.user.id);
      return res.json({ ok: true, data: companies });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  router.get('/companies/:id', auth, (req, res) => {
    try {
      const id = Number(req.params.id);
      const company = companyRepo.findById(db, id);
      if (!company) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });

      // Non-admin users must be assigned to the company
      if (req.user.role !== 'admin') {
        const role = getUserRoleForCompany(db, req.user.id, req.user.role, id);
        if (!role) return res.status(403).json({ ok: false, error: 'Sin acceso a esta empresa' });
      }
      return res.json({ ok: true, data: company });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  router.post('/companies', auth, adminOnly, (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ ok: false, error: 'Campos requeridos faltantes', fields: ['name'] });
      const company = companyRepo.create(db, { name });
      seedCompanyQuestions(db, company.id);
      return res.status(201).json({ ok: true, data: company });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ ok: false, error: 'El nombre de empresa ya existe' });
      }
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  router.put('/companies/:id', auth, adminOnly, (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name } = req.body;
      if (!name) return res.status(400).json({ ok: false, error: 'Campos requeridos faltantes', fields: ['name'] });
      const company = companyRepo.update(db, id, { name });
      if (!company) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });
      return res.json({ ok: true, data: company });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ ok: false, error: 'El nombre de empresa ya existe' });
      }
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  router.delete('/companies/:id', auth, adminOnly, (req, res) => {
    try {
      const id = Number(req.params.id);
      const removed = companyRepo.remove(db, id);
      if (!removed) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });
      return res.json({ ok: true, data: { deleted: true } });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  // =============================================
  // USERS — CRUD (Admin only)
  // =============================================
  router.get('/users', auth, adminOnly, (req, res) => {
    try {
      const users = userRepo.findAll(db);
      return res.json({ ok: true, data: users });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  router.get('/users/:id', auth, adminOnly, (req, res) => {
    try {
      const id = Number(req.params.id);
      const user = userRepo.findById(db, id);
      if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
      // Strip password_hash from response
      const { password_hash, ...safeUser } = user;
      return res.json({ ok: true, data: safeUser });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  router.post('/users', auth, adminOnly, (req, res) => {
    try {
      const { name, username, password } = req.body;
      const missing = [];
      if (!name) missing.push('name');
      if (!username) missing.push('username');
      if (!password) missing.push('password');
      if (missing.length > 0) return res.status(400).json({ ok: false, error: 'Campos requeridos faltantes', fields: missing });

      const passwordHash = hashPassword(password);
      const user = userRepo.create(db, { name, username, passwordHash });
      const { password_hash, ...safeUser } = user;
      return res.status(201).json({ ok: true, data: safeUser });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ ok: false, error: 'El nombre de usuario ya existe' });
      }
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  router.put('/users/:id', auth, adminOnly, (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, active, password } = req.body;

      // If password reset is requested
      if (password) {
        const passwordHash = hashPassword(password);
        userRepo.resetPassword(db, id, passwordHash);
      }

      // Update name/active if provided
      if (name !== undefined || active !== undefined) {
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (active !== undefined) updateData.active = active;
        const user = userRepo.update(db, id, updateData);
        if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
        const { password_hash, ...safeUser } = user;
        return res.json({ ok: true, data: safeUser });
      }

      // If only password was changed, fetch and return user
      const user = userRepo.findById(db, id);
      if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
      const { password_hash, ...safeUser } = user;
      return res.json({ ok: true, data: safeUser });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  // =============================================
  // ASSIGNMENTS (Admin only, except GET which needs auth)
  // =============================================
  router.get('/users/:userId/assignments', auth, adminOnly, (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const assignments = assignmentRepo.findByUser(db, userId);
      return res.json({ ok: true, data: assignments });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  router.get('/companies/:companyId/assignments', auth, adminOnly, (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const assignments = assignmentRepo.findByCompany(db, companyId);
      return res.json({ ok: true, data: assignments });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  router.post('/assignments', auth, adminOnly, (req, res) => {
    try {
      const { userId, companyId, role } = req.body;
      const missing = [];
      if (!userId) missing.push('userId');
      if (!companyId) missing.push('companyId');
      if (!role) missing.push('role');
      if (missing.length > 0) return res.status(400).json({ ok: false, error: 'Campos requeridos faltantes', fields: missing });

      if (!['empresa', 'globant'].includes(role)) {
        return res.status(400).json({ ok: false, error: 'Rol inválido. Debe ser "empresa" o "globant"' });
      }

      const assignment = assignmentRepo.create(db, { userId, companyId, role });
      return res.status(201).json({ ok: true, data: assignment });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ ok: false, error: 'La asignación ya existe' });
      }
      if (err.message && err.message.includes('FOREIGN KEY constraint')) {
        return res.status(400).json({ ok: false, error: 'Usuario o empresa no encontrados' });
      }
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  router.delete('/assignments/:id', auth, adminOnly, (req, res) => {
    try {
      const id = Number(req.params.id);
      const removed = assignmentRepo.remove(db, id);
      if (!removed) return res.status(404).json({ ok: false, error: 'Asignación no encontrada' });
      return res.json({ ok: true, data: { deleted: true } });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  // =============================================
  // SHEET DATA — CRUD with role-based column permissions
  // =============================================

  // GET sheet data for a company
  router.get('/companies/:companyId/sheets/:sheetId', auth, (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const { sheetId } = req.params;

      // Verify company exists
      const company = companyRepo.findById(db, companyId);
      if (!company) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });

      // Verify user has access to this company
      const role = getUserRoleForCompany(db, req.user.id, req.user.role, companyId);
      if (!role) return res.status(403).json({ ok: false, error: 'Sin acceso a esta empresa' });

      const data = sheetRepo.getSheetData(db, companyId, sheetId);
      return res.json({ ok: true, data });
    } catch (err) {
      if (err.message && err.message.includes('Sheet ID no válido')) {
        return res.status(400).json({ ok: false, error: err.message });
      }
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  // POST add row to sheet
  router.post('/companies/:companyId/sheets/:sheetId/rows', auth, (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const { sheetId } = req.params;

      const company = companyRepo.findById(db, companyId);
      if (!company) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });

      const role = getUserRoleForCompany(db, req.user.id, req.user.role, companyId);
      if (!role) return res.status(403).json({ ok: false, error: 'Sin acceso a esta empresa' });

      // Check column permissions on the data being sent
      const permCheck = checkColumnPermissions(sheetId, role, req.body);
      if (!permCheck.allowed) {
        return res.status(403).json({ ok: false, error: 'Sin permiso para modificar estas columnas', columns: permCheck.forbidden });
      }

      const row = sheetRepo.addRow(db, companyId, sheetId, req.body);
      return res.status(201).json({ ok: true, data: row });
    } catch (err) {
      if (err.message && err.message.includes('Sheet ID no válido')) {
        return res.status(400).json({ ok: false, error: err.message });
      }
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  // PUT update row in sheet
  router.put('/companies/:companyId/sheets/:sheetId/rows/:rowId', auth, (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const { sheetId } = req.params;
      const rowId = Number(req.params.rowId);

      const company = companyRepo.findById(db, companyId);
      if (!company) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });

      const role = getUserRoleForCompany(db, req.user.id, req.user.role, companyId);
      if (!role) return res.status(403).json({ ok: false, error: 'Sin acceso a esta empresa' });

      // Check column permissions
      const permCheck = checkColumnPermissions(sheetId, role, req.body);
      if (!permCheck.allowed) {
        return res.status(403).json({ ok: false, error: 'Sin permiso para modificar estas columnas', columns: permCheck.forbidden });
      }

      const row = sheetRepo.updateRow(db, companyId, sheetId, rowId, req.body);
      if (!row) return res.status(404).json({ ok: false, error: 'Fila no encontrada' });
      return res.json({ ok: true, data: row });
    } catch (err) {
      if (err.message && err.message.includes('Sheet ID no válido')) {
        return res.status(400).json({ ok: false, error: err.message });
      }
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  // DELETE row from sheet
  router.delete('/companies/:companyId/sheets/:sheetId/rows/:rowId', auth, (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const { sheetId } = req.params;
      const rowId = Number(req.params.rowId);

      const company = companyRepo.findById(db, companyId);
      if (!company) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });

      const role = getUserRoleForCompany(db, req.user.id, req.user.role, companyId);
      if (!role) return res.status(403).json({ ok: false, error: 'Sin acceso a esta empresa' });

      // Only admin and users with editable columns can delete
      const editable = getEditableColumns(sheetId, role);
      if (editable.length === 0) {
        return res.status(403).json({ ok: false, error: 'Sin permiso para modificar estas columnas' });
      }

      const deleted = sheetRepo.deleteRow(db, companyId, sheetId, rowId);
      if (!deleted) return res.status(404).json({ ok: false, error: 'Fila no encontrada' });
      return res.json({ ok: true, data: { deleted: true } });
    } catch (err) {
      if (err.message && err.message.includes('Sheet ID no válido')) {
        return res.status(400).json({ ok: false, error: err.message });
      }
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  // =============================================
  // IMPORT / EXPORT
  // =============================================

  // POST import — Admin only, accepts JSON body with rows array
  router.post('/import/:companyId/:sheetId', auth, adminOnly, (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const { sheetId } = req.params;

      const company = companyRepo.findById(db, companyId);
      if (!company) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });

      const { rows } = req.body;
      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ ok: false, error: 'Campos requeridos faltantes', fields: ['rows'] });
      }

      const count = sheetRepo.bulkInsert(db, companyId, sheetId, rows);
      return res.json({ ok: true, data: { imported: count, companyId, sheetId } });
    } catch (err) {
      if (err.message && err.message.includes('Sheet ID no válido')) {
        return res.status(400).json({ ok: false, error: err.message });
      }
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  // GET export — JWT auth, returns JSON array of rows
  router.get('/export/:companyId/:sheetId', auth, (req, res) => {
    try {
      const companyId = Number(req.params.companyId);
      const { sheetId } = req.params;

      const company = companyRepo.findById(db, companyId);
      if (!company) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });

      // Verify user has access to this company
      const role = getUserRoleForCompany(db, req.user.id, req.user.role, companyId);
      if (!role) return res.status(403).json({ ok: false, error: 'Sin acceso a esta empresa' });

      const rows = sheetRepo.exportRows(db, companyId, sheetId);
      return res.json({ ok: true, data: rows });
    } catch (err) {
      if (err.message && err.message.includes('Sheet ID no válido')) {
        return res.status(400).json({ ok: false, error: err.message });
      }
      return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
    }
  });

  return router;
}

module.exports = { createDCRouter, getEditableColumns, checkColumnPermissions, COLUMN_ROLES };
