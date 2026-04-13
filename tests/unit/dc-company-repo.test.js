/**
 * Unit tests for proxy/dc-company-repo.js
 * Validates: Requirements 11.1, 5.2, 5.6
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const Database = (await import('better-sqlite3')).default;
const { runMigrations } = await import('../../proxy/dc-database.js');
const {
  findAll,
  findById,
  findByUserId,
  create,
  update,
  remove,
} = await import('../../proxy/dc-company-repo.js');

let db;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

describe('dc-company-repo — findAll', () => {
  it('returns empty array when no companies exist', () => {
    expect(findAll(db)).toEqual([]);
  });

  it('returns all companies ordered by name', () => {
    db.prepare('INSERT INTO companies (name) VALUES (?)').run('Zebra Corp');
    db.prepare('INSERT INTO companies (name) VALUES (?)').run('Alpha Inc');

    const result = findAll(db);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alpha Inc');
    expect(result[1].name).toBe('Zebra Corp');
  });
});

describe('dc-company-repo — findById', () => {
  it('returns the company when it exists', () => {
    const info = db.prepare('INSERT INTO companies (name) VALUES (?)').run('Test Co');
    const company = findById(db, info.lastInsertRowid);

    expect(company).toBeDefined();
    expect(company.name).toBe('Test Co');
    expect(company.id).toBe(Number(info.lastInsertRowid));
  });

  it('returns undefined for non-existent id', () => {
    expect(findById(db, 999)).toBeUndefined();
  });
});

describe('dc-company-repo — findByUserId', () => {
  it('returns only companies assigned to the user', () => {
    // Create companies
    db.prepare('INSERT INTO companies (name) VALUES (?)').run('Assigned Co');
    db.prepare('INSERT INTO companies (name) VALUES (?)').run('Other Co');
    const assignedId = db.prepare('SELECT id FROM companies WHERE name = ?').get('Assigned Co').id;

    // Create a non-admin user
    db.prepare(
      'INSERT INTO users (name, username, password_hash) VALUES (?, ?, ?)'
    ).run('User1', 'user1', 'hash');
    const userId = db.prepare('SELECT id FROM users WHERE username = ?').get('user1').id;

    // Assign user to only one company
    db.prepare(
      'INSERT INTO user_company_assignments (user_id, company_id, role) VALUES (?, ?, ?)'
    ).run(userId, assignedId, 'empresa');

    const result = findByUserId(db, userId);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Assigned Co');
  });

  it('returns empty array when user has no assignments', () => {
    db.prepare('INSERT INTO companies (name) VALUES (?)').run('Some Co');
    db.prepare(
      'INSERT INTO users (name, username, password_hash) VALUES (?, ?, ?)'
    ).run('Lonely', 'lonely', 'hash');
    const userId = db.prepare('SELECT id FROM users WHERE username = ?').get('lonely').id;

    expect(findByUserId(db, userId)).toEqual([]);
  });

  it('returns distinct companies when user has multiple roles for same company', () => {
    db.prepare('INSERT INTO companies (name) VALUES (?)').run('Multi Role Co');
    const companyId = db.prepare('SELECT id FROM companies WHERE name = ?').get('Multi Role Co').id;

    db.prepare(
      'INSERT INTO users (name, username, password_hash) VALUES (?, ?, ?)'
    ).run('Multi', 'multi', 'hash');
    const userId = db.prepare('SELECT id FROM users WHERE username = ?').get('multi').id;

    // Assign both roles
    db.prepare(
      'INSERT INTO user_company_assignments (user_id, company_id, role) VALUES (?, ?, ?)'
    ).run(userId, companyId, 'empresa');
    db.prepare(
      'INSERT INTO user_company_assignments (user_id, company_id, role) VALUES (?, ?, ?)'
    ).run(userId, companyId, 'globant');

    const result = findByUserId(db, userId);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Multi Role Co');
  });
});

describe('dc-company-repo — create', () => {
  it('creates a company and returns it with id and timestamps', () => {
    const company = create(db, { name: 'New Corp' });

    expect(company.id).toBeGreaterThan(0);
    expect(company.name).toBe('New Corp');
    expect(company.created_at).toBeDefined();
    expect(company.updated_at).toBeDefined();
  });

  it('throws on duplicate name', () => {
    create(db, { name: 'Unique' });
    expect(() => create(db, { name: 'Unique' })).toThrow();
  });
});

describe('dc-company-repo — update', () => {
  it('updates the company name and returns updated record', () => {
    const company = create(db, { name: 'Old Name' });
    const updated = update(db, company.id, { name: 'New Name' });

    expect(updated).toBeDefined();
    expect(updated.name).toBe('New Name');
    expect(updated.id).toBe(company.id);
  });

  it('returns undefined when updating non-existent company', () => {
    expect(update(db, 999, { name: 'Ghost' })).toBeUndefined();
  });
});

describe('dc-company-repo — remove', () => {
  it('deletes an existing company and returns true', () => {
    const company = create(db, { name: 'Doomed' });
    expect(remove(db, company.id)).toBe(true);
    expect(findById(db, company.id)).toBeUndefined();
  });

  it('returns false when deleting non-existent company', () => {
    expect(remove(db, 999)).toBe(false);
  });
});
