/**
 * Repository para CRUD de empresas (companies).
 * Validates: Requirements 11.1, 5.2, 5.6
 */

/**
 * Retorna todas las empresas.
 * @param {import('better-sqlite3').Database} db
 * @returns {Array<object>}
 */
function findAll(db) {
  return db.prepare('SELECT * FROM companies ORDER BY name').all();
}

/**
 * Retorna una empresa por ID, o undefined si no existe.
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @returns {object|undefined}
 */
function findById(db, id) {
  return db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
}

/**
 * Retorna solo las empresas asignadas a un usuario vía user_company_assignments.
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 * @returns {Array<object>}
 */
function findByUserId(db, userId) {
  return db.prepare(`
    SELECT DISTINCT c.*
    FROM companies c
    INNER JOIN user_company_assignments uca ON uca.company_id = c.id
    WHERE uca.user_id = ?
    ORDER BY c.name
  `).all(userId);
}

/**
 * Crea una nueva empresa. Retorna la empresa creada.
 * @param {import('better-sqlite3').Database} db
 * @param {{ name: string }} data
 * @returns {object}
 */
function create(db, { name }) {
  const info = db.prepare('INSERT INTO companies (name) VALUES (?)').run(name);
  return findById(db, info.lastInsertRowid);
}

/**
 * Actualiza el nombre de una empresa. Retorna la empresa actualizada o undefined si no existe.
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @param {{ name: string }} data
 * @returns {object|undefined}
 */
function update(db, id, { name }) {
  const info = db.prepare('UPDATE companies SET name = ? WHERE id = ?').run(name, id);
  if (info.changes === 0) return undefined;
  return findById(db, id);
}

/**
 * Elimina una empresa por ID. Retorna true si se eliminó, false si no existía.
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @returns {boolean}
 */
function remove(db, id) {
  const info = db.prepare('DELETE FROM companies WHERE id = ?').run(id);
  return info.changes > 0;
}

module.exports = { findAll, findById, findByUserId, create, update, remove };
