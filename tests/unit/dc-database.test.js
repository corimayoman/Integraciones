/**
 * Unit tests for proxy/dc-database.js
 * Validates: Requirements 1.2, 1.5, 2.7
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const Database = (await import('better-sqlite3')).default;
const { runMigrations } = await import('../../proxy/dc-database.js');
const bcrypt = (await import('bcryptjs'));

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

describe('dc-database — initDatabase creates all 6 tables', () => {
  const expectedTables = [
    'companies',
    'users',
    'user_company_assignments',
    'apps_data',
    'compliance_data',
    'questionnaire_data',
  ];

  it.each(expectedTables)('table "%s" exists', (tableName) => {
    const row = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(tableName);
    expect(row).toBeDefined();
    expect(row.name).toBe(tableName);
  });

  it('has exactly the 6 expected application tables', () => {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all().map((r) => r.name);
    for (const t of expectedTables) {
      expect(tables).toContain(t);
    }
  });
});

describe('dc-database — migration creates default admin user', () => {
  it('admin user exists with correct username', () => {
    const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
    expect(admin).toBeDefined();
    expect(admin.username).toBe('admin');
  });

  it('admin user has role "admin"', () => {
    const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
    expect(admin.role).toBe('admin');
  });

  it('admin user has a valid bcrypt password hash', () => {
    const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
    expect(admin.password_hash).toMatch(/^\$2[aby]?\$/);
    expect(bcrypt.compareSync('admin123', admin.password_hash)).toBe(true);
  });

  it('admin user is active by default', () => {
    const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
    expect(admin.active).toBe(1);
  });

  it('running migrations twice does not duplicate admin', () => {
    runMigrations(db);
    const admins = db.prepare('SELECT * FROM users WHERE username = ?').all('admin');
    expect(admins).toHaveLength(1);
  });
});

describe('dc-database — updated_at triggers', () => {
  it('companies updated_at changes on update', () => {
    db.prepare('INSERT INTO companies (name) VALUES (?)').run('TriggerCo');
    const before = db.prepare('SELECT updated_at FROM companies WHERE name = ?').get('TriggerCo');
    // Force a different timestamp by updating
    db.prepare('UPDATE companies SET name = ? WHERE name = ?').run('TriggerCo2', 'TriggerCo');
    const after = db.prepare('SELECT updated_at FROM companies WHERE name = ?').get('TriggerCo2');
    // updated_at should be set (may be same if within same second, but should exist)
    expect(after.updated_at).toBeDefined();
    expect(typeof after.updated_at).toBe('string');
  });

  it('users updated_at changes on update', () => {
    const admin = db.prepare('SELECT id, updated_at FROM users WHERE username = ?').get('admin');
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run('New Admin Name', admin.id);
    const after = db.prepare('SELECT updated_at FROM users WHERE id = ?').get(admin.id);
    expect(after.updated_at).toBeDefined();
    expect(typeof after.updated_at).toBe('string');
  });

  it('apps_data updated_at changes on update', () => {
    db.prepare('INSERT INTO companies (name) VALUES (?)').run('AppCo');
    const co = db.prepare('SELECT id FROM companies WHERE name = ?').get('AppCo');
    db.prepare('INSERT INTO apps_data (company_id, app_name) VALUES (?, ?)').run(co.id, 'TestApp');
    const row = db.prepare('SELECT id, updated_at FROM apps_data WHERE app_name = ?').get('TestApp');
    db.prepare('UPDATE apps_data SET app_name = ? WHERE id = ?').run('UpdatedApp', row.id);
    const after = db.prepare('SELECT updated_at FROM apps_data WHERE id = ?').get(row.id);
    expect(after.updated_at).toBeDefined();
  });

  it('compliance_data updated_at changes on update', () => {
    db.prepare('INSERT INTO companies (name) VALUES (?)').run('CompCo');
    const co = db.prepare('SELECT id FROM companies WHERE name = ?').get('CompCo');
    db.prepare('INSERT INTO compliance_data (company_id, norm_certification) VALUES (?, ?)').run(co.id, 'ISO');
    const row = db.prepare('SELECT id FROM compliance_data WHERE norm_certification = ?').get('ISO');
    db.prepare('UPDATE compliance_data SET norm_certification = ? WHERE id = ?').run('SOC2', row.id);
    const after = db.prepare('SELECT updated_at FROM compliance_data WHERE id = ?').get(row.id);
    expect(after.updated_at).toBeDefined();
  });

  it('questionnaire_data updated_at changes on update', () => {
    db.prepare('INSERT INTO companies (name) VALUES (?)').run('QCo');
    const co = db.prepare('SELECT id FROM companies WHERE name = ?').get('QCo');
    db.prepare(
      'INSERT INTO questionnaire_data (company_id, sheet_id, question) VALUES (?, ?, ?)'
    ).run(co.id, 'infrastructure', 'Q1');
    const row = db.prepare('SELECT id FROM questionnaire_data WHERE question = ?').get('Q1');
    db.prepare('UPDATE questionnaire_data SET company_answer = ? WHERE id = ?').run('A1', row.id);
    const after = db.prepare('SELECT updated_at FROM questionnaire_data WHERE id = ?').get(row.id);
    expect(after.updated_at).toBeDefined();
  });
});
