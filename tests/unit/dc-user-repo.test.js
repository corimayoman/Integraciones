/**
 * Unit tests for proxy/dc-user-repo.js
 * Validates: Requirements 11.2, 3.1, 3.2, 3.7
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const Database = (await import('better-sqlite3')).default;
const { runMigrations } = await import('../../proxy/dc-database.js');
const {
  findAll,
  findById,
  findByUsername,
  create,
  update,
  resetPassword,
} = await import('../../proxy/dc-user-repo.js');

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

describe('dc-user-repo — findAll', () => {
  it('returns the default admin user without password_hash', () => {
    const users = findAll(db);
    expect(users.length).toBeGreaterThanOrEqual(1);

    const admin = users.find(u => u.username === 'admin');
    expect(admin).toBeDefined();
    expect(admin.name).toBe('Administrador');
    expect(admin).not.toHaveProperty('password_hash');
  });

  it('returns users ordered by name', () => {
    create(db, { name: 'Zara', username: 'zara', passwordHash: 'hash1' });
    create(db, { name: 'Abel', username: 'abel', passwordHash: 'hash2' });

    const users = findAll(db);
    const names = users.map(u => u.name);
    expect(names).toEqual([...names].sort());
  });

  it('never includes password_hash in results', () => {
    create(db, { name: 'Test', username: 'test1', passwordHash: 'secret' });

    const users = findAll(db);
    for (const user of users) {
      expect(user).not.toHaveProperty('password_hash');
    }
  });
});

describe('dc-user-repo — findById', () => {
  it('returns the full user record including password_hash', () => {
    const created = create(db, { name: 'Full', username: 'full', passwordHash: 'myhash' });
    const user = findById(db, created.id);

    expect(user).toBeDefined();
    expect(user.name).toBe('Full');
    expect(user.username).toBe('full');
    expect(user.password_hash).toBe('myhash');
  });

  it('returns undefined for non-existent id', () => {
    expect(findById(db, 99999)).toBeUndefined();
  });
});

describe('dc-user-repo — findByUsername', () => {
  it('returns the full user record including password_hash', () => {
    create(db, { name: 'ByName', username: 'byname', passwordHash: 'hash123' });
    const user = findByUsername(db, 'byname');

    expect(user).toBeDefined();
    expect(user.name).toBe('ByName');
    expect(user.password_hash).toBe('hash123');
  });

  it('returns the default admin user', () => {
    const admin = findByUsername(db, 'admin');
    expect(admin).toBeDefined();
    expect(admin.role).toBe('admin');
    expect(admin.password_hash).toBeDefined();
  });

  it('returns undefined for non-existent username', () => {
    expect(findByUsername(db, 'ghost')).toBeUndefined();
  });
});

describe('dc-user-repo — create', () => {
  it('creates a user and returns it with id and timestamps', () => {
    const user = create(db, { name: 'New User', username: 'newuser', passwordHash: 'h' });

    expect(user.id).toBeGreaterThan(0);
    expect(user.name).toBe('New User');
    expect(user.username).toBe('newuser');
    expect(user.active).toBe(1);
    expect(user.role).toBeNull();
    expect(user.created_at).toBeDefined();
    expect(user.updated_at).toBeDefined();
  });

  it('throws on duplicate username', () => {
    create(db, { name: 'First', username: 'dup', passwordHash: 'h1' });
    expect(() => create(db, { name: 'Second', username: 'dup', passwordHash: 'h2' })).toThrow();
  });
});

describe('dc-user-repo — update', () => {
  it('updates the user name and returns updated record', () => {
    const user = create(db, { name: 'Old', username: 'upd1', passwordHash: 'h' });
    const updated = update(db, user.id, { name: 'New' });

    expect(updated).toBeDefined();
    expect(updated.name).toBe('New');
    expect(updated.id).toBe(user.id);
  });

  it('deactivates a user', () => {
    const user = create(db, { name: 'Active', username: 'act1', passwordHash: 'h' });
    expect(user.active).toBe(1);

    const updated = update(db, user.id, { active: 0 });
    expect(updated.active).toBe(0);
  });

  it('updates both name and active at once', () => {
    const user = create(db, { name: 'Both', username: 'both1', passwordHash: 'h' });
    const updated = update(db, user.id, { name: 'Changed', active: 0 });

    expect(updated.name).toBe('Changed');
    expect(updated.active).toBe(0);
  });

  it('returns undefined when updating non-existent user', () => {
    expect(update(db, 99999, { name: 'Ghost' })).toBeUndefined();
  });

  it('returns current record when no fields provided', () => {
    const user = create(db, { name: 'NoOp', username: 'noop1', passwordHash: 'h' });
    const result = update(db, user.id, {});

    expect(result).toBeDefined();
    expect(result.name).toBe('NoOp');
  });
});

describe('dc-user-repo — resetPassword', () => {
  it('updates the password hash and returns true', () => {
    const user = create(db, { name: 'PwdUser', username: 'pwd1', passwordHash: 'oldhash' });
    const result = resetPassword(db, user.id, 'newhash');

    expect(result).toBe(true);

    const updated = findById(db, user.id);
    expect(updated.password_hash).toBe('newhash');
  });

  it('returns false for non-existent user', () => {
    expect(resetPassword(db, 99999, 'hash')).toBe(false);
  });
});
