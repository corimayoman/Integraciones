const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin (uses project default credentials in Cloud Functions)
if (!admin.apps.length) {
  admin.initializeApp({
    databaseURL: 'https://prj-istsecintegration-gp-5s-default-rtdb.firebaseio.com',
  });
}

// Import Jira modules
const jiraAuth = require('./jira-auth');
const { fetchAllIssues, fetchComplianceIssues } = require('./jira-client');
const { fetchSOXData } = require('./sox-jira-client');
const { transformSOXData } = require('./sox-mapper');

// Import proxy modules (reuse existing code)
const { initDatabase } = require('./dc-database');
const { createAuthMiddleware, adminOnly, hashPassword, verifyPassword, generateToken } = require('./dc-auth');
const userRepo = require('./dc-user-repo');
const companyRepo = require('./dc-company-repo');
const assignmentRepo = require('./dc-assignment-repo');
const sheetRepo = require('./dc-sheet-repo');
const { seedCompanyQuestions } = require('./dc-seed-questions');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Initialize SQLite database (in /tmp for Cloud Functions)
const path = require('path');
const dbPath = path.join('/tmp', 'data-collection.db');
const db = initDatabase(dbPath);

// Column-to-role mapping (copied from dc-routes.js)
const COLUMN_ROLES = {
  infrastructure: {
    empresa: ['answer', 'comments'],
    globant: ['status', 'globant_comments'],
  },
  it_experience: {
    empresa: ['answer', 'comments'],
    globant: ['status', 'globant_comments'],
  },
  mst: {
    empresa: ['answer', 'comments'],
    globant: ['status', 'globant_comments'],
  },
  building_security: {
    empresa: ['answer', 'comments'],
    globant: ['status', 'globant_comments'],
  },
  inventory: {
    empresa: ['hostname', 'ip_address', 'os', 'function_desc', 'location', 'owner', 'comments'],
    globant: ['status', 'globant_comments'],
  },
  qa_mgmt: {
    empresa: [],
    globant: ['finding', 'severity', 'status', 'remediation', 'due_date', 'comments'],
  },
  qa_simple: {
    empresa: [],
    globant: ['question', 'answer', 'status', 'comments'],
  },
};

function getEditableColumns(sheetId, role) {
  const mapping = COLUMN_ROLES[sheetId];
  if (!mapping) return [];
  if (role === 'admin') return [...(mapping.empresa || []), ...(mapping.globant || [])];
  if (role === 'empresa') return [...(mapping.empresa || [])];
  if (role === 'globant') return [...(mapping.globant || [])];
  return [];
}

function getUserRoleForCompany(db, userId, userRole, companyId) {
  if (userRole === 'admin') return 'admin';
  const assignments = assignmentRepo.findByUser(db, userId);
  const match = assignments.find(a => a.company_id === companyId);
  return match ? match.role : null;
}

const auth = createAuthMiddleware(db);

// --- Auth: Google SSO ---
app.post('/dc/auth/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ ok: false, error: 'idToken requerido' });

    // Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(idToken);
    const email = decoded.email;
    const name = decoded.name || email;

    if (!email) return res.status(401).json({ ok: false, error: 'Token sin email' });

    // Find DC user by email (email = username)
    let user = userRepo.findByUsername(db, email);

    if (!user) {
      // Check if email is an authorized admin
      const adminEmails = (process.env.DC_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      if (!adminEmails.includes(email)) {
        return res.status(403).json({ ok: false, error: 'Tu cuenta no tiene acceso al módulo DC. Contactá a tu administrador.' });
      }
      // Auto-create admin user with email as username
      const randomHash = hashPassword(Math.random().toString(36) + Date.now());
      user = userRepo.create(db, { name, username: email, passwordHash: randomHash });
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', user.id);
      user = userRepo.findById(db, user.id);
    }

    if (!user.active) {
      return res.status(403).json({ ok: false, error: 'Usuario desactivado' });
    }

    const token = generateToken(user);
    return res.json({ ok: true, data: { token, user: { id: user.id, name: user.name, username: user.username, role: user.role } } });
  } catch (err) {
    if (err.code?.startsWith('auth/')) {
      return res.status(401).json({ ok: false, error: 'Sesión de Google inválida o expirada' });
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Auth: username/password (legacy) ---
app.post('/dc/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: 'Campos requeridos faltantes' });
    }
    const user = userRepo.findByUsername(db, username);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
    }
    if (!user.active) {
      return res.status(403).json({ ok: false, error: 'Usuario desactivado' });
    }
    const token = generateToken(user);
    return res.json({ ok: true, data: { token, user: { id: user.id, name: user.name, username: user.username, role: user.role } } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Companies ---
app.get('/dc/companies', auth, (req, res) => {
  try {
    const companies = req.user.role === 'admin'
      ? companyRepo.findAll(db)
      : companyRepo.findByUserId(db, req.user.id);
    return res.json({ ok: true, data: companies });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/dc/companies/:id', auth, (req, res) => {
  try {
    const id = Number(req.params.id);
    const company = companyRepo.findById(db, id);
    if (!company) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });
    if (req.user.role !== 'admin') {
      const role = getUserRoleForCompany(db, req.user.id, req.user.role, id);
      if (!role) return res.status(403).json({ ok: false, error: 'Sin acceso a esta empresa' });
    }
    return res.json({ ok: true, data: company });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/dc/companies', auth, adminOnly, (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ ok: false, error: 'Campos requeridos faltantes' });
    const company = companyRepo.create(db, { name });
    seedCompanyQuestions(db, company.id);
    return res.status(201).json({ ok: true, data: company });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.put('/dc/companies/:id', auth, adminOnly, (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name } = req.body;
    const updated = companyRepo.update(db, id, { name });
    if (!updated) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });
    return res.json({ ok: true, data: updated });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/dc/companies/:id', auth, adminOnly, (req, res) => {
  try {
    const id = Number(req.params.id);
    const ok = companyRepo.remove(db, id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Empresa no encontrada' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Users ---
app.get('/dc/users', auth, adminOnly, (req, res) => {
  try {
    const users = userRepo.findAll(db);
    return res.json({ ok: true, data: users });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/dc/users', auth, adminOnly, (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ ok: false, error: 'Campos requeridos faltantes' });
    }
    const passwordHash = hashPassword(password);
    const user = userRepo.create(db, { name, username, passwordHash });
    return res.status(201).json({ ok: true, data: user });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ ok: false, error: 'El usuario ya existe' });
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.put('/dc/users/:id', auth, adminOnly, (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, active, password } = req.body;
    if (password) {
      const passwordHash = hashPassword(password);
      userRepo.resetPassword(db, id, passwordHash);
    }
    if (name !== undefined || active !== undefined) {
      const updated = userRepo.update(db, id, { name, active });
      if (!updated) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });
      return res.json({ ok: true, data: updated });
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Assignments ---
app.get('/dc/users/:userId/assignments', auth, adminOnly, (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const assignments = assignmentRepo.findByUser(db, userId);
    return res.json({ ok: true, data: assignments });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/dc/assignments', auth, adminOnly, (req, res) => {
  try {
    const { userId, companyId, role } = req.body;
    if (!userId || !companyId || !role) {
      return res.status(400).json({ ok: false, error: 'Campos requeridos faltantes' });
    }
    const assignment = assignmentRepo.create(db, { userId, companyId, role });
    return res.status(201).json({ ok: true, data: assignment });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ ok: false, error: 'Asignación ya existe' });
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/dc/assignments/:id', auth, adminOnly, (req, res) => {
  try {
    const id = Number(req.params.id);
    const ok = assignmentRepo.remove(db, id);
    if (!ok) return res.status(404).json({ ok: false, error: 'Asignación no encontrada' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Sheets ---
app.get('/dc/companies/:companyId/sheets/:sheetId', auth, (req, res) => {
  try {
    const companyId = Number(req.params.companyId);
    const { sheetId } = req.params;
    const role = getUserRoleForCompany(db, req.user.id, req.user.role, companyId);
    if (!role) return res.status(403).json({ ok: false, error: 'Sin acceso' });
    const rows = sheetRepo.findByCompanyAndSheet(db, companyId, sheetId);
    const editableColumns = getEditableColumns(sheetId, role);
    return res.json({ ok: true, data: { rows, editableColumns, role } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/dc/companies/:companyId/sheets/:sheetId/rows', auth, (req, res) => {
  try {
    const companyId = Number(req.params.companyId);
    const { sheetId } = req.params;
    const role = getUserRoleForCompany(db, req.user.id, req.user.role, companyId);
    if (!role) return res.status(403).json({ ok: false, error: 'Sin acceso' });
    const row = sheetRepo.createRow(db, companyId, sheetId, req.body);
    return res.status(201).json({ ok: true, data: row });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.put('/dc/companies/:companyId/sheets/:sheetId/rows/:rowId', auth, (req, res) => {
  try {
    const companyId = Number(req.params.companyId);
    const { sheetId } = req.params;
    const rowId = Number(req.params.rowId);
    const role = getUserRoleForCompany(db, req.user.id, req.user.role, companyId);
    if (!role) return res.status(403).json({ ok: false, error: 'Sin acceso' });
    const editableColumns = getEditableColumns(sheetId, role);
    const filtered = {};
    for (const [key, val] of Object.entries(req.body)) {
      if (editableColumns.includes(key)) filtered[key] = val;
    }
    const updated = sheetRepo.updateRow(db, rowId, filtered);
    if (!updated) return res.status(404).json({ ok: false, error: 'Fila no encontrada' });
    return res.json({ ok: true, data: updated });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete('/dc/companies/:companyId/sheets/:sheetId/rows/:rowId', auth, (req, res) => {
  try {
    const rowId = Number(req.params.rowId);
    const ok = sheetRepo.removeRow(db, rowId);
    if (!ok) return res.status(404).json({ ok: false, error: 'Fila no encontrada' });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// --- Import/Export ---
app.post('/dc/import/:companyId/:sheetId', auth, adminOnly, (req, res) => {
  try {
    const companyId = Number(req.params.companyId);
    const { sheetId } = req.params;
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows)) {
      return res.status(400).json({ ok: false, error: 'Rows array requerido' });
    }
    let imported = 0;
    for (const row of rows) {
      sheetRepo.createRow(db, companyId, sheetId, row);
      imported++;
    }
    return res.json({ ok: true, data: { imported } });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/dc/export/:companyId/:sheetId', auth, (req, res) => {
  try {
    const companyId = Number(req.params.companyId);
    const { sheetId } = req.params;
    const rows = sheetRepo.findByCompanyAndSheet(db, companyId, sheetId);
    return res.json({ ok: true, data: rows });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Health check
app.get('/dc/health', (req, res) => {
  res.json({ status: 'ok' });
});

/* ------------------------------------------------------------------ */
/*  Jira routes                                                        */
/* ------------------------------------------------------------------ */

// In-memory Jira cache (per-instance, best-effort)
let jiraCache = { data: null, ts: 0 };
let complianceCache = { data: null, ts: 0 };
let soxCache = { data: null, ts: 0 };
const JIRA_TTL = (parseInt(process.env.CACHE_TTL) || 300) * 1000;

app.get('/auth/login', (req, res) => {
  res.redirect(jiraAuth.getAuthUrl());
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing code');
    const result = await jiraAuth.exchangeCode(code);
    res.send(`<html><body><h2>Conectado a ${result.site}</h2><p>Podés cerrar esta ventana.</p><script>window.close();</script></body></html>`);
  } catch (err) {
    console.error('Auth callback error:', err);
    res.status(500).send(`Auth failed: ${err.message}`);
  }
});

app.get('/auth/status', async (req, res) => {
  const authenticated = await jiraAuth.isAuthenticated();
  res.json({ authenticated });
});

app.get('/auth/logout', async (req, res) => {
  await jiraAuth.logout();
  jiraCache      = { data: null, ts: 0 };
  complianceCache = { data: null, ts: 0 };
  soxCache       = { data: null, ts: 0 };
  res.json({ ok: true });
});

app.get('/api/raw', async (req, res) => {
  try {
    const authenticated = await jiraAuth.isAuthenticated();
    if (!authenticated) return res.status(401).json({ error: 'Not authenticated' });

    const now = Date.now();
    if (jiraCache.data && (now - jiraCache.ts) < JIRA_TTL) {
      return res.json({ issues: jiraCache.data, count: jiraCache.data.length, cached: true });
    }

    const issues = await fetchAllIssues();
    jiraCache = { data: issues, ts: Date.now() };
    res.json({ issues, count: issues.length, cached: false });
  } catch (err) {
    console.error('Jira fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/compliance', async (req, res) => {
  try {
    const authenticated = await jiraAuth.isAuthenticated();
    if (!authenticated) return res.status(401).json({ error: 'Not authenticated' });

    const now = Date.now();
    if (complianceCache.data && (now - complianceCache.ts) < JIRA_TTL) {
      return res.json({ issues: complianceCache.data, count: complianceCache.data.length, cached: true });
    }

    const issues = await fetchComplianceIssues();
    complianceCache = { data: issues, ts: Date.now() };
    res.json({ issues, count: issues.length, cached: false });
  } catch (err) {
    console.error('Compliance fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sox', async (req, res) => {
  try {
    const authenticated = await jiraAuth.isAuthenticated();
    if (!authenticated) return res.status(401).json({ error: 'Not authenticated' });

    const now = Date.now();
    if (soxCache.data && (now - soxCache.ts) < JIRA_TTL) {
      return res.json({ ...soxCache.data, cached: true });
    }

    const { subtasks, parentMap } = await fetchSOXData();
    const siteUrl = await jiraAuth.getSiteUrl();
    const result  = transformSOXData(subtasks, parentMap, siteUrl);
    soxCache = { data: result, ts: Date.now() };
    console.log(`SOX: mapped ${result.controls.length} controls, ${result.months.length} months`);
    res.json({ ...result, cached: false });
  } catch (err) {
    console.error('SOX fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Export as Firebase Function
exports.api = onRequest({ region: 'us-central1' }, app);
