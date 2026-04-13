/**
 * Unit tests for proxy/dc-auth.js
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.3
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';

// dc-auth.js is CommonJS — vitest handles interop
const {
  hashPassword,
  verifyPassword,
  generateToken,
  createAuthMiddleware,
  adminOnly,
  JWT_SECRET,
} = await import('../../proxy/dc-auth.js');

// Minimal in-memory SQLite for auth middleware tests
const Database = (await import('better-sqlite3')).default;

/** Helper: create a mock Express response */
function mockRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
  };
  return res;
}

describe('dc-auth — hashPassword / verifyPassword', () => {
  it('verifyPassword returns true for the original password', () => {
    const hash = hashPassword('secret123');
    expect(verifyPassword('secret123', hash)).toBe(true);
  });

  it('verifyPassword returns false for a different password', () => {
    const hash = hashPassword('secret123');
    expect(verifyPassword('wrong', hash)).toBe(false);
  });

  it('produces different hashes for the same password (unique salt)', () => {
    const h1 = hashPassword('same');
    const h2 = hashPassword('same');
    expect(h1).not.toBe(h2);
  });
});

describe('dc-auth — generateToken', () => {
  it('generates a JWT with correct claims', () => {
    const user = { id: 7, username: 'alice', role: 'admin' };
    const token = generateToken(user);
    const decoded = jwt.verify(token, JWT_SECRET);

    expect(decoded.id).toBe(7);
    expect(decoded.username).toBe('alice');
    expect(decoded.role).toBe('admin');
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('generates a JWT for a non-admin user with role null', () => {
    const user = { id: 2, username: 'bob', role: null };
    const token = generateToken(user);
    const decoded = jwt.verify(token, JWT_SECRET);

    expect(decoded.id).toBe(2);
    expect(decoded.role).toBeNull();
  });
});

describe('dc-auth — createAuthMiddleware', () => {
  let db;
  let authMiddleware;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    // Minimal users table
    db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT NULL,
        active INTEGER DEFAULT 1
      );
    `);
    db.prepare(
      'INSERT INTO users (name, username, password_hash, role, active) VALUES (?, ?, ?, ?, ?)'
    ).run('Admin', 'admin', hashPassword('pass'), 'admin', 1);
    db.prepare(
      'INSERT INTO users (name, username, password_hash, role, active) VALUES (?, ?, ?, ?, ?)'
    ).run('Inactive', 'inactive', hashPassword('pass'), null, 0);

    authMiddleware = createAuthMiddleware(db);
  });

  afterEach(() => {
    db.close();
  });

  it('returns 401 when no Authorization header', () => {
    const req = { headers: {} };
    const res = mockRes();
    let nextCalled = false;

    authMiddleware(req, res, () => { nextCalled = true; });

    expect(res.statusCode).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(nextCalled).toBe(false);
  });

  it('returns 401 for malformed Authorization header', () => {
    const req = { headers: { authorization: 'Basic abc' } };
    const res = mockRes();
    let nextCalled = false;

    authMiddleware(req, res, () => { nextCalled = true; });

    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });

  it('returns 401 for invalid JWT', () => {
    const req = { headers: { authorization: 'Bearer not.a.jwt' } };
    const res = mockRes();
    let nextCalled = false;

    authMiddleware(req, res, () => { nextCalled = true; });

    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });

  it('returns 401 for expired JWT', () => {
    const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '-1s' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nextCalled = false;

    authMiddleware(req, res, () => { nextCalled = true; });

    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });

  it('returns 401 for JWT signed with wrong secret', () => {
    const token = jwt.sign({ id: 1, username: 'admin', role: 'admin' }, 'wrong-secret');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nextCalled = false;

    authMiddleware(req, res, () => { nextCalled = true; });

    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });

  it('returns 403 for inactive user', () => {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get('inactive');
    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nextCalled = false;

    authMiddleware(req, res, () => { nextCalled = true; });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain('desactivado');
    expect(nextCalled).toBe(false);
  });

  it('returns 401 for JWT referencing a deleted user', () => {
    const token = generateToken({ id: 999, username: 'ghost', role: null });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nextCalled = false;

    authMiddleware(req, res, () => { nextCalled = true; });

    expect(res.statusCode).toBe(401);
    expect(nextCalled).toBe(false);
  });

  it('attaches req.user and calls next for valid active user', () => {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    let nextCalled = false;

    authMiddleware(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(req.user).toEqual({ id: user.id, username: 'admin', role: 'admin' });
  });
});

describe('dc-auth — adminOnly', () => {
  it('calls next when user has admin role', () => {
    const req = { user: { id: 1, username: 'admin', role: 'admin' } };
    const res = mockRes();
    let nextCalled = false;

    adminOnly(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
  });

  it('returns 403 when user has no role', () => {
    const req = { user: { id: 2, username: 'bob', role: null } };
    const res = mockRes();
    let nextCalled = false;

    adminOnly(req, res, () => { nextCalled = true; });

    expect(res.statusCode).toBe(403);
    expect(nextCalled).toBe(false);
  });

  it('returns 403 when req.user is missing', () => {
    const req = {};
    const res = mockRes();
    let nextCalled = false;

    adminOnly(req, res, () => { nextCalled = true; });

    expect(res.statusCode).toBe(403);
    expect(nextCalled).toBe(false);
  });
});
