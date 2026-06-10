/**
 * Repository para CRUD de usuarios.
 * Validates: Requirements 11.2, 3.1, 3.2, 3.7
 */

/**
 * Retorna todos los usuarios SIN password_hash (seguridad).
 * @param {import('better-sqlite3').Database} db
 * @returns {Array<object>}
 */
function findAll(db) {
  return db.prepare(
    'SELECT id, name, username, role, active, created_at, updated_at FROM users ORDER BY name'
  ).all();
}

/**
 * Retorna un usuario por ID, incluyendo password_hash (necesario para auth).
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @returns {object|undefined}
 */
function findById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

/**
 * Retorna un usuario por username, incluyendo password_hash (necesario para auth).
 * @param {import('better-sqlite3').Database} db
 * @param {string} username
 * @returns {object|undefined}
 */
function findByUsername(db, username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

/**
 * Crea un nuevo usuario. Retorna el usuario creado (sin password_hash).
 * @param {import('better-sqlite3').Database} db
 * @param {{ name: string, username: string, passwordHash: string }} data
 * @returns {object}
 */
function create(db, { name, username, passwordHash }) {
  const info = db.prepare(
    'INSERT INTO users (name, username, password_hash) VALUES (?, ?, ?)'
  ).run(name, username, passwordHash);
  return findById(db, info.lastInsertRowid);
}

/**
 * Actualiza nombre y/o estado activo de un usuario. Retorna el usuario actualizado o undefined.
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @param {{ name?: string, active?: number }} data
 * @returns {object|undefined}
 */
function update(db, id, { name, active }) {
  const fields = [];
  const values = [];

  if (name !== undefined) {
    fields.push('name = ?');
    values.push(name);
  }
  if (active !== undefined) {
    fields.push('active = ?');
    values.push(active);
  }

  if (fields.length === 0) return findById(db, id);

  values.push(id);
  const info = db.prepare(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`
  ).run(...values);

  if (info.changes === 0) return undefined;
  return findById(db, id);
}

/**
 * Restablece la contraseña de un usuario. Retorna true si se actualizó, false si no existe.
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @param {string} passwordHash
 * @returns {boolean}
 */
function resetPassword(db, id, passwordHash) {
  const info = db.prepare(
    'UPDATE users SET password_hash = ? WHERE id = ?'
  ).run(passwordHash, id);
  return info.changes > 0;
}

module.exports = { findAll, findById, findByUsername, create, update, resetPassword };
