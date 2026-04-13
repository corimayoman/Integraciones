/**
 * Unit tests for proxy/dc-routes.js
 * Validates: Requirements 2.1, 2.3, 4.3, 4.5, 4.6, 9.2, 9.4, 9.6,
 *            11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const Database = (await import('better-sqlite3')).default;
const { initDatabase } = await import('../../proxy/dc-database.js');
const { generateToken, hashPassword } = await import('../../proxy/dc-auth.js');
const { createDCRouter, getEditableColumns, checkColumnPermissions, COLUMN_ROLES } = await import('../../proxy/dc-routes.js');

// --- Lightweight Express-like test harness ---

/**
 * Builds a minimal request-response cycle runner for the router.
 * Instead of spinning up a real HTTP server, we walk the router's
 * middleware stack manually.
 */
function createTestClient(router) {
  // Collect all registered routes
  const routes = [];
  for (const layer of router.stack) {
    if (layer.route) {
      const path = layer.route.path;
      for (const routeLayer of layer.route.stack) {
        routes.push({ method: routeLayer.method, path, handler: routeLayer.handle });
      }
    }
  }

  /**
   * Simulate a request through the Express router.
   * Runs all middleware in sequence (auth, adminOnly, handler).
   */
  async function request(method, url, { body, headers } = {}) {
    // Match route — simple param matching
    let matchedRoute = null;
    let params = {};

    for (const layer of router.stack) {
      if (!layer.route) continue;
      const routePath = layer.route.path;
      const routeMethods = layer.route.methods;
      if (!routeMethods[method.toLowerCase()]) continue;

      // Convert Express path to regex
      const paramNames = [];
      const regexStr = routePath.replace(/:([^/]+)/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
      });
      const regex = new RegExp(`^${regexStr}$`);
      const match = url.match(regex);
      if (match) {
        matchedRoute = layer.route;
        paramNames.forEach((name, i) => { params[name] = match[i + 1]; });
        break;
      }
    }

    if (!matchedRoute) return { status: 404, body: { error: 'Route not found' } };

    const req = {
      method: method.toUpperCase(),
      url,
      params,
      body: body || {},
      headers: headers || {},
    };

    const res = {
      statusCode: 200,
      body: null,
      status(code) { res.statusCode = code; return res; },
      json(data) { res.body = data; return res; },
    };

    // Run middleware stack in order
    const handlers = matchedRoute.stack.map(l => l.handle);
    let idx = 0;
    const next = (err) => {
      if (err) {
        res.statusCode = 500;
        res.body = { ok: false, error: err.message };
        return;
      }
      idx++;
      if (idx < handlers.length) {
        handlers[idx](req, res, next);
      }
    };
    handlers[0](req, res, next);

    return { status: res.statusCode, body: res.body };
  }

  return { request };
}

// --- Test helpers ---

let db;
let router;
let client;
let adminToken;
let regularUserToken;

function setupDB() {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  // Run migrations from dc-database
  const { runMigrations } = require('../../proxy/dc-database.js');
  runMigrations(db);

  // Create a regular (non-admin) user
  const regularHash = hashPassword('userpass');
  db.prepare('INSERT INTO users (name, username, password_hash, role, active) VALUES (?, ?, ?, ?, ?)').run('Regular User', 'regular', regularHash, null, 1);

  // Create a company
  db.prepare('INSERT INTO companies (name) VALUES (?)').run('TestCorp');

  // Assign regular user to TestCorp with role 'empresa'
  const regularUser = db.prepare('SELECT id FROM users WHERE username = ?').get('regular');
  const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
  db.prepare('INSERT INTO user_company_assignments (user_id, company_id, role) VALUES (?, ?, ?)').run(regularUser.id, company.id, 'empresa');

  // Generate tokens
  const admin = db.prepare('SELECT id, username, role FROM users WHERE username = ?').get('admin');
  adminToken = generateToken(admin);
  regularUserToken = generateToken({ id: regularUser.id, username: 'regular', role: null });
}

function authHeaders(token) {
  return { authorization: `Bearer ${token}` };
}

describe('dc-routes — getEditableColumns', () => {
  it('returns empresa columns for empresa role on apps', () => {
    const cols = getEditableColumns('apps', 'empresa');
    expect(cols).toContain('app_name');
    expect(cols).not.toContain('globant_studio');
  });

  it('returns globant columns for globant role on apps', () => {
    const cols = getEditableColumns('apps', 'globant');
    expect(cols).toContain('globant_studio');
    expect(cols).not.toContain('app_name');
  });

  it('returns all columns for admin on apps', () => {
    const cols = getEditableColumns('apps', 'admin');
    expect(cols).toContain('app_name');
    expect(cols).toContain('globant_studio');
  });

  it('returns all compliance columns for empresa (no globant columns)', () => {
    const cols = getEditableColumns('compliance', 'empresa');
    expect(cols).toContain('norm_certification');
    expect(cols.length).toBe(COLUMN_ROLES.compliance.empresa.length);
  });

  it('returns empty for globant on compliance', () => {
    const cols = getEditableColumns('compliance', 'globant');
    expect(cols).toEqual([]);
  });

  it('returns company_answer for empresa on questionnaire sheets', () => {
    for (const sheet of ['infrastructure', 'it_experience', 'mst']) {
      const cols = getEditableColumns(sheet, 'empresa');
      expect(cols).toEqual(['company_answer']);
    }
  });

  it('returns globant management columns for globant on questionnaire sheets', () => {
    const cols = getEditableColumns('infrastructure', 'globant');
    expect(cols).toContain('globant_comments');
    expect(cols).toContain('globant_owner');
  });

  it('returns empty for globant on building_security', () => {
    const cols = getEditableColumns('building_security', 'globant');
    expect(cols).toEqual([]);
  });

  it('returns empty array for unknown sheet', () => {
    expect(getEditableColumns('unknown', 'admin')).toEqual([]);
  });
});

describe('dc-routes — checkColumnPermissions', () => {
  it('allows empresa to edit empresa columns on apps', () => {
    const result = checkColumnPermissions('apps', 'empresa', { app_name: 'Test' });
    expect(result.allowed).toBe(true);
  });

  it('forbids empresa from editing globant columns on apps', () => {
    const result = checkColumnPermissions('apps', 'empresa', { globant_studio: 'Studio1' });
    expect(result.allowed).toBe(false);
    expect(result.forbidden).toContain('globant_studio');
  });

  it('allows admin to edit any column', () => {
    const result = checkColumnPermissions('apps', 'admin', { app_name: 'X', globant_studio: 'Y' });
    expect(result.allowed).toBe(true);
  });

  it('ignores internal fields like id, company_id, timestamps', () => {
    const result = checkColumnPermissions('apps', 'empresa', { id: 1, company_id: 2, created_at: 'x', app_name: 'Test' });
    expect(result.allowed).toBe(true);
  });
});

describe('dc-routes — REST endpoints', () => {
  beforeEach(() => {
    setupDB();
    router = createDCRouter(db);
    client = createTestClient(router);
  });

  afterEach(() => {
    db.close();
  });

  // --- AUTH / LOGIN ---
  describe('POST /auth/login', () => {
    it('returns JWT for valid credentials', async () => {
      const res = await client.request('POST', '/auth/login', {
        body: { username: 'admin', password: 'admin123' },
      });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.username).toBe('admin');
    });

    it('returns 401 for wrong password', async () => {
      const res = await client.request('POST', '/auth/login', {
        body: { username: 'admin', password: 'wrong' },
      });
      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBe('Credenciales inválidas');
    });

    it('returns 401 for non-existent user (same message)', async () => {
      const res = await client.request('POST', '/auth/login', {
        body: { username: 'ghost', password: 'pass' },
      });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Credenciales inválidas');
    });

    it('returns 400 when fields are missing', async () => {
      const res = await client.request('POST', '/auth/login', { body: {} });
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.fields).toContain('username');
      expect(res.body.fields).toContain('password');
    });
  });

  // --- COMPANIES ---
  describe('GET /companies', () => {
    it('admin sees all companies', async () => {
      const res = await client.request('GET', '/companies', { headers: authHeaders(adminToken) });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('regular user sees only assigned companies', async () => {
      // Add another company not assigned to regular user
      db.prepare('INSERT INTO companies (name) VALUES (?)').run('OtherCorp');
      const res = await client.request('GET', '/companies', { headers: authHeaders(regularUserToken) });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].name).toBe('TestCorp');
    });

    it('returns 401 without auth', async () => {
      const res = await client.request('GET', '/companies');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /companies', () => {
    it('admin can create a company', async () => {
      const res = await client.request('POST', '/companies', {
        headers: authHeaders(adminToken),
        body: { name: 'NewCorp' },
      });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.name).toBe('NewCorp');
    });

    it('returns 400 when name is missing', async () => {
      const res = await client.request('POST', '/companies', {
        headers: authHeaders(adminToken),
        body: {},
      });
      expect(res.status).toBe(400);
      expect(res.body.fields).toContain('name');
    });

    it('non-admin cannot create company', async () => {
      const res = await client.request('POST', '/companies', {
        headers: authHeaders(regularUserToken),
        body: { name: 'Nope' },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /companies/:id', () => {
    it('admin can update a company', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      const res = await client.request('PUT', `/companies/${company.id}`, {
        headers: authHeaders(adminToken),
        body: { name: 'UpdatedCorp' },
      });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('UpdatedCorp');
    });

    it('returns 404 for non-existent company', async () => {
      const res = await client.request('PUT', '/companies/9999', {
        headers: authHeaders(adminToken),
        body: { name: 'X' },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /companies/:id', () => {
    it('admin can delete a company', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      const res = await client.request('DELETE', `/companies/${company.id}`, {
        headers: authHeaders(adminToken),
      });
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });

    it('returns 404 for non-existent company', async () => {
      const res = await client.request('DELETE', '/companies/9999', {
        headers: authHeaders(adminToken),
      });
      expect(res.status).toBe(404);
    });
  });

  // --- USERS ---
  describe('POST /users', () => {
    it('admin can create a user', async () => {
      const res = await client.request('POST', '/users', {
        headers: authHeaders(adminToken),
        body: { name: 'New User', username: 'newuser', password: 'pass123' },
      });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.username).toBe('newuser');
      // password_hash should not be in response
      expect(res.body.data.password_hash).toBeUndefined();
    });

    it('returns 400 when required fields missing', async () => {
      const res = await client.request('POST', '/users', {
        headers: authHeaders(adminToken),
        body: { name: 'Only Name' },
      });
      expect(res.status).toBe(400);
      expect(res.body.fields).toContain('username');
      expect(res.body.fields).toContain('password');
    });

    it('returns 409 for duplicate username', async () => {
      const res = await client.request('POST', '/users', {
        headers: authHeaders(adminToken),
        body: { name: 'Dup', username: 'admin', password: 'pass' },
      });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /users', () => {
    it('admin can list users', async () => {
      const res = await client.request('GET', '/users', { headers: authHeaders(adminToken) });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('non-admin cannot list users', async () => {
      const res = await client.request('GET', '/users', { headers: authHeaders(regularUserToken) });
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /users/:id', () => {
    it('admin can update user name', async () => {
      const user = db.prepare('SELECT id FROM users WHERE username = ?').get('regular');
      const res = await client.request('PUT', `/users/${user.id}`, {
        headers: authHeaders(adminToken),
        body: { name: 'Updated Name' },
      });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('admin can deactivate a user', async () => {
      const user = db.prepare('SELECT id FROM users WHERE username = ?').get('regular');
      const res = await client.request('PUT', `/users/${user.id}`, {
        headers: authHeaders(adminToken),
        body: { active: 0 },
      });
      expect(res.status).toBe(200);
      expect(res.body.data.active).toBe(0);
    });

    it('admin can reset password', async () => {
      const user = db.prepare('SELECT id FROM users WHERE username = ?').get('regular');
      const res = await client.request('PUT', `/users/${user.id}`, {
        headers: authHeaders(adminToken),
        body: { password: 'newpass123' },
      });
      expect(res.status).toBe(200);
    });
  });

  // --- ASSIGNMENTS ---
  describe('POST /assignments', () => {
    it('admin can create an assignment', async () => {
      // Create another company
      db.prepare('INSERT INTO companies (name) VALUES (?)').run('AnotherCorp');
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('AnotherCorp');
      const user = db.prepare('SELECT id FROM users WHERE username = ?').get('regular');

      const res = await client.request('POST', '/assignments', {
        headers: authHeaders(adminToken),
        body: { userId: user.id, companyId: company.id, role: 'globant' },
      });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.role).toBe('globant');
    });

    it('returns 400 for missing fields', async () => {
      const res = await client.request('POST', '/assignments', {
        headers: authHeaders(adminToken),
        body: { userId: 1 },
      });
      expect(res.status).toBe(400);
      expect(res.body.fields).toContain('companyId');
      expect(res.body.fields).toContain('role');
    });

    it('returns 400 for invalid role', async () => {
      const res = await client.request('POST', '/assignments', {
        headers: authHeaders(adminToken),
        body: { userId: 1, companyId: 1, role: 'invalid' },
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /users/:userId/assignments', () => {
    it('admin can list user assignments', async () => {
      const user = db.prepare('SELECT id FROM users WHERE username = ?').get('regular');
      const res = await client.request('GET', `/users/${user.id}/assignments`, {
        headers: authHeaders(adminToken),
      });
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('DELETE /assignments/:id', () => {
    it('admin can delete an assignment', async () => {
      const assignment = db.prepare('SELECT id FROM user_company_assignments LIMIT 1').get();
      const res = await client.request('DELETE', `/assignments/${assignment.id}`, {
        headers: authHeaders(adminToken),
      });
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });

    it('returns 404 for non-existent assignment', async () => {
      const res = await client.request('DELETE', '/assignments/9999', {
        headers: authHeaders(adminToken),
      });
      expect(res.status).toBe(404);
    });
  });

  // --- SHEET DATA ---
  describe('GET /companies/:companyId/sheets/:sheetId', () => {
    it('returns sheet data for assigned user', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      const res = await client.request('GET', `/companies/${company.id}/sheets/apps`, {
        headers: authHeaders(regularUserToken),
      });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns 403 for unassigned user', async () => {
      // Create a new company not assigned to regular user
      db.prepare('INSERT INTO companies (name) VALUES (?)').run('SecretCorp');
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('SecretCorp');
      const res = await client.request('GET', `/companies/${company.id}/sheets/apps`, {
        headers: authHeaders(regularUserToken),
      });
      expect(res.status).toBe(403);
    });

    it('returns 400 for invalid sheetId', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      const res = await client.request('GET', `/companies/${company.id}/sheets/invalid`, {
        headers: authHeaders(adminToken),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /companies/:companyId/sheets/:sheetId/rows', () => {
    it('empresa user can add row with empresa columns', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      const res = await client.request('POST', `/companies/${company.id}/sheets/apps/rows`, {
        headers: authHeaders(regularUserToken),
        body: { app_name: 'TestApp', manufacturer: 'TestMfg' },
      });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.app_name).toBe('TestApp');
    });

    it('empresa user cannot add row with globant columns', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      const res = await client.request('POST', `/companies/${company.id}/sheets/apps/rows`, {
        headers: authHeaders(regularUserToken),
        body: { globant_studio: 'Studio1' },
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Sin permiso');
    });

    it('admin can add row with any columns', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      const res = await client.request('POST', `/companies/${company.id}/sheets/apps/rows`, {
        headers: authHeaders(adminToken),
        body: { app_name: 'AdminApp', globant_studio: 'Studio1' },
      });
      expect(res.status).toBe(201);
    });
  });

  describe('PUT /companies/:companyId/sheets/:sheetId/rows/:rowId', () => {
    it('updates a row with permitted columns', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      // First add a row as admin
      db.prepare('INSERT INTO apps_data (company_id, app_name) VALUES (?, ?)').run(company.id, 'OldApp');
      const row = db.prepare('SELECT id FROM apps_data WHERE company_id = ? ORDER BY id DESC LIMIT 1').get(company.id);

      const res = await client.request('PUT', `/companies/${company.id}/sheets/apps/rows/${row.id}`, {
        headers: authHeaders(regularUserToken),
        body: { app_name: 'NewApp' },
      });
      expect(res.status).toBe(200);
      expect(res.body.data.app_name).toBe('NewApp');
    });

    it('returns 403 when editing forbidden columns', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      db.prepare('INSERT INTO apps_data (company_id, app_name) VALUES (?, ?)').run(company.id, 'App1');
      const row = db.prepare('SELECT id FROM apps_data WHERE company_id = ? ORDER BY id DESC LIMIT 1').get(company.id);

      const res = await client.request('PUT', `/companies/${company.id}/sheets/apps/rows/${row.id}`, {
        headers: authHeaders(regularUserToken),
        body: { globant_studio: 'Forbidden' },
      });
      expect(res.status).toBe(403);
    });

    it('returns 404 for non-existent row', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      const res = await client.request('PUT', `/companies/${company.id}/sheets/apps/rows/9999`, {
        headers: authHeaders(adminToken),
        body: { app_name: 'X' },
      });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /companies/:companyId/sheets/:sheetId/rows/:rowId', () => {
    it('deletes a row for user with edit permissions', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      db.prepare('INSERT INTO apps_data (company_id, app_name) VALUES (?, ?)').run(company.id, 'ToDelete');
      const row = db.prepare('SELECT id FROM apps_data WHERE company_id = ? ORDER BY id DESC LIMIT 1').get(company.id);

      const res = await client.request('DELETE', `/companies/${company.id}/sheets/apps/rows/${row.id}`, {
        headers: authHeaders(regularUserToken),
      });
      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });

    it('returns 404 for non-existent row', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      const res = await client.request('DELETE', `/companies/${company.id}/sheets/apps/rows/9999`, {
        headers: authHeaders(adminToken),
      });
      expect(res.status).toBe(404);
    });
  });

  // --- IMPORT / EXPORT ---
  describe('POST /import/:companyId/:sheetId', () => {
    it('admin can import rows', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      const res = await client.request('POST', `/import/${company.id}/apps`, {
        headers: authHeaders(adminToken),
        body: { rows: [{ app_name: 'Imported1' }, { app_name: 'Imported2' }] },
      });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.imported).toBe(2);
    });

    it('returns 400 when rows is missing', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      const res = await client.request('POST', `/import/${company.id}/apps`, {
        headers: authHeaders(adminToken),
        body: {},
      });
      expect(res.status).toBe(400);
      expect(res.body.fields).toContain('rows');
    });

    it('non-admin cannot import', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      const res = await client.request('POST', `/import/${company.id}/apps`, {
        headers: authHeaders(regularUserToken),
        body: { rows: [] },
      });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /export/:companyId/:sheetId', () => {
    it('returns exported rows for assigned user', async () => {
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('TestCorp');
      // Add some data
      db.prepare('INSERT INTO apps_data (company_id, app_name) VALUES (?, ?)').run(company.id, 'ExportApp');

      const res = await client.request('GET', `/export/${company.id}/apps`, {
        headers: authHeaders(regularUserToken),
      });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      // Exported rows should not have internal fields
      expect(res.body.data[0].id).toBeUndefined();
      expect(res.body.data[0].company_id).toBeUndefined();
    });

    it('returns 403 for unassigned user', async () => {
      db.prepare('INSERT INTO companies (name) VALUES (?)').run('PrivateCorp');
      const company = db.prepare('SELECT id FROM companies WHERE name = ?').get('PrivateCorp');
      const res = await client.request('GET', `/export/${company.id}/apps`, {
        headers: authHeaders(regularUserToken),
      });
      expect(res.status).toBe(403);
    });
  });

  // --- RESPONSE FORMAT ---
  describe('Response format consistency', () => {
    it('success responses have ok:true and data', async () => {
      const res = await client.request('GET', '/companies', { headers: authHeaders(adminToken) });
      expect(res.body).toHaveProperty('ok', true);
      expect(res.body).toHaveProperty('data');
    });

    it('error responses have ok:false and error', async () => {
      const res = await client.request('POST', '/auth/login', {
        body: { username: 'ghost', password: 'wrong' },
      });
      expect(res.body).toHaveProperty('ok', false);
      expect(res.body).toHaveProperty('error');
      expect(typeof res.body.error).toBe('string');
    });
  });
});
