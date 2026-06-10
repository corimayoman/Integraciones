/**
 * Repository para asignaciones usuario-empresa (user_company_assignments).
 * Validates: Requirements 11.3, 3.4, 3.5, 3.6
 */

/**
 * Retorna todas las asignaciones de un usuario, incluyendo el nombre de la empresa.
 * @param {import('better-sqlite3').Database} db
 * @param {number} userId
 * @returns {Array<object>}
 */
function findByUser(db, userId) {
  return db.prepare(`
    SELECT uca.id, uca.user_id, uca.company_id, uca.role, uca.created_at,
           c.name AS company_name
    FROM user_company_assignments uca
    INNER JOIN companies c ON c.id = uca.company_id
    WHERE uca.user_id = ?
    ORDER BY c.name
  `).all(userId);
}

/**
 * Retorna todas las asignaciones de una empresa, incluyendo el nombre del usuario.
 * @param {import('better-sqlite3').Database} db
 * @param {number} companyId
 * @returns {Array<object>}
 */
function findByCompany(db, companyId) {
  return db.prepare(`
    SELECT uca.id, uca.user_id, uca.company_id, uca.role, uca.created_at,
           u.name AS user_name
    FROM user_company_assignments uca
    INNER JOIN users u ON u.id = uca.user_id
    WHERE uca.company_id = ?
    ORDER BY u.name
  `).all(companyId);
}

/**
 * Crea una nueva asignación usuario-empresa. Retorna la asignación creada.
 * El constraint UNIQUE(user_id, company_id, role) es manejado por la tabla.
 * @param {import('better-sqlite3').Database} db
 * @param {{ userId: number, companyId: number, role: string }} data
 * @returns {object}
 */
function create(db, { userId, companyId, role }) {
  const info = db.prepare(
    'INSERT INTO user_company_assignments (user_id, company_id, role) VALUES (?, ?, ?)'
  ).run(userId, companyId, role);
  return db.prepare('SELECT * FROM user_company_assignments WHERE id = ?').get(info.lastInsertRowid);
}

/**
 * Elimina una asignación por ID. Retorna true si se eliminó, false si no existía.
 * @param {import('better-sqlite3').Database} db
 * @param {number} id
 * @returns {boolean}
 */
function remove(db, id) {
  const info = db.prepare('DELETE FROM user_company_assignments WHERE id = ?').run(id);
  return info.changes > 0;
}

module.exports = { findByUser, findByCompany, create, remove };
