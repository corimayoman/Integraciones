/**
 * Unit tests for proxy/dc-assignment-repo.js
 * Validates: Requirements 11.3, 3.4, 3.5, 3.6
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const Database = (await import('better-sqlite3')).default;
const { runMigrations } = await import('../../proxy/dc-database.js');
const {
  findByUser,
  findByCompany,
  create,
  remove,
} = await import('../../proxy/dc-assignment-repo.js');

let db;

/** Helper: create a non-admin user and return its id */
function createUser(name, username) {
  db.prepare(
    'INSERT INTO users (name, username, password_hash) VALUES (?, ?, ?)'
  ).run(name, username, 'hash');
  return db.prepare('SELECT id FROM users WHERE username = ?').get(username).id;
}

/** Helper: create a company and return its id */
function createCompany(name) {
  db.prepare('INSERT INTO companies (name) VALUES (?)').run(name);
  return db.prepare('SELECT id FROM companies WHERE name = ?').get(name).id;
}

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

describe('dc-assignment-repo — findByUser', () => {
  it('returns empty array when user has no assignments', () => {
    const userId = createUser('Solo', 'solo');
    expect(findByUser(db, userId)).toEqual([]);
  });

  it('returns assignments with company_name included', () => {
    const userId = createUser('Alice', 'alice');
    const companyId = createCompany('Acme Corp');
    create(db, { userId, companyId, role: 'empresa' });

    const result = findByUser(db, userId);
    expect(result).toHaveLength(1);
    expect(result[0].company_name).toBe('Acme Corp');
    expect(result[0].user_id).toBe(userId);
    expect(result[0].company_id).toBe(companyId);
    expect(result[0].role).toBe('empresa');
  });

  it('returns multiple assignments ordered by company name', () => {
    const userId = createUser('Bob', 'bob');
    const c1 = createCompany('Zebra Inc');
    const c2 = createCompany('Alpha Ltd');
    create(db, { userId, companyId: c1, role: 'empresa' });
    create(db, { userId, companyId: c2, role: 'globant' });

    const result = findByUser(db, userId);
    expect(result).toHaveLength(2);
    expect(result[0].company_name).toBe('Alpha Ltd');
    expect(result[1].company_name).toBe('Zebra Inc');
  });

  it('returns both roles when user has two roles for same company', () => {
    const userId = createUser('Carol', 'carol');
    const companyId = createCompany('Dual Co');
    create(db, { userId, companyId, role: 'empresa' });
    create(db, { userId, companyId, role: 'globant' });

    const result = findByUser(db, userId);
    expect(result).toHaveLength(2);
    const roles = result.map(r => r.role).sort();
    expect(roles).toEqual(['empresa', 'globant']);
  });
});

describe('dc-assignment-repo — findByCompany', () => {
  it('returns empty array when company has no assignments', () => {
    const companyId = createCompany('Empty Co');
    expect(findByCompany(db, companyId)).toEqual([]);
  });

  it('returns assignments with user_name included', () => {
    const userId = createUser('Dave', 'dave');
    const companyId = createCompany('Tech Corp');
    create(db, { userId, companyId, role: 'globant' });

    const result = findByCompany(db, companyId);
    expect(result).toHaveLength(1);
    expect(result[0].user_name).toBe('Dave');
    expect(result[0].user_id).toBe(userId);
    expect(result[0].company_id).toBe(companyId);
    expect(result[0].role).toBe('globant');
  });

  it('returns multiple users ordered by user name', () => {
    const u1 = createUser('Zoe', 'zoe');
    const u2 = createUser('Ana', 'ana');
    const companyId = createCompany('Shared Co');
    create(db, { userId: u1, companyId, role: 'empresa' });
    create(db, { userId: u2, companyId, role: 'globant' });

    const result = findByCompany(db, companyId);
    expect(result).toHaveLength(2);
    expect(result[0].user_name).toBe('Ana');
    expect(result[1].user_name).toBe('Zoe');
  });
});

describe('dc-assignment-repo — create', () => {
  it('creates an assignment and returns it with id and created_at', () => {
    const userId = createUser('Eve', 'eve');
    const companyId = createCompany('New Co');
    const assignment = create(db, { userId, companyId, role: 'empresa' });

    expect(assignment.id).toBeGreaterThan(0);
    expect(assignment.user_id).toBe(userId);
    expect(assignment.company_id).toBe(companyId);
    expect(assignment.role).toBe('empresa');
    expect(assignment.created_at).toBeDefined();
  });

  it('throws on duplicate user_id + company_id + role', () => {
    const userId = createUser('Frank', 'frank');
    const companyId = createCompany('Dup Co');
    create(db, { userId, companyId, role: 'empresa' });

    expect(() => create(db, { userId, companyId, role: 'empresa' })).toThrow();
  });

  it('allows same user and company with different roles', () => {
    const userId = createUser('Grace', 'grace');
    const companyId = createCompany('Multi Co');
    const a1 = create(db, { userId, companyId, role: 'empresa' });
    const a2 = create(db, { userId, companyId, role: 'globant' });

    expect(a1.id).not.toBe(a2.id);
    expect(a1.role).toBe('empresa');
    expect(a2.role).toBe('globant');
  });

  it('throws on invalid role value', () => {
    const userId = createUser('Hank', 'hank');
    const companyId = createCompany('Bad Role Co');

    expect(() => create(db, { userId, companyId, role: 'invalid' })).toThrow();
  });
});

describe('dc-assignment-repo — remove', () => {
  it('deletes an existing assignment and returns true', () => {
    const userId = createUser('Ivy', 'ivy');
    const companyId = createCompany('Gone Co');
    const assignment = create(db, { userId, companyId, role: 'empresa' });

    expect(remove(db, assignment.id)).toBe(true);
    expect(findByUser(db, userId)).toEqual([]);
  });

  it('returns false when deleting non-existent assignment', () => {
    expect(remove(db, 99999)).toBe(false);
  });
});
