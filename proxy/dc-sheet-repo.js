/**
 * Repository para CRUD de datos de hojas (sheet data).
 * Mapea sheetId a la tabla correcta:
 *   - 'apps' → apps_data
 *   - 'compliance' → compliance_data
 *   - 'infrastructure', 'it_experience', 'mst', 'building_security' → questionnaire_data (filtrado por sheet_id)
 *
 * Validates: Requirements 11.4, 1.3, 1.4, 9.4, 9.6
 */

const QUESTIONNAIRE_SHEETS = ['infrastructure', 'it_experience', 'mst', 'building_security'];

/**
 * Resuelve el nombre de tabla y si es cuestionario para un sheetId dado.
 * @param {string} sheetId
 * @returns {{ table: string, isQuestionnaire: boolean }}
 */
function resolveTable(sheetId) {
  if (sheetId === 'apps') return { table: 'apps_data', isQuestionnaire: false };
  if (sheetId === 'compliance') return { table: 'compliance_data', isQuestionnaire: false };
  if (sheetId === 'endpoints') return { table: 'endpoints_data', isQuestionnaire: false };
  if (QUESTIONNAIRE_SHEETS.includes(sheetId)) return { table: 'questionnaire_data', isQuestionnaire: true };
  throw new Error(`Sheet ID no válido: ${sheetId}`);
}

/**
 * Obtiene todas las filas de una hoja para una empresa.
 * @param {import('better-sqlite3').Database} db
 * @param {number} companyId
 * @param {string} sheetId
 * @returns {Array<object>}
 */
function getSheetData(db, companyId, sheetId) {
  const { table, isQuestionnaire } = resolveTable(sheetId);
  if (isQuestionnaire) {
    return db.prepare(`SELECT * FROM ${table} WHERE company_id = ? AND sheet_id = ? ORDER BY id`).all(companyId, sheetId);
  }
  return db.prepare(`SELECT * FROM ${table} WHERE company_id = ? ORDER BY id`).all(companyId);
}

/**
 * Obtiene una fila específica por ID, validando empresa y hoja.
 * @param {import('better-sqlite3').Database} db
 * @param {number} companyId
 * @param {string} sheetId
 * @param {number} rowId
 * @returns {object|undefined}
 */
function getRow(db, companyId, sheetId, rowId) {
  const { table, isQuestionnaire } = resolveTable(sheetId);
  if (isQuestionnaire) {
    return db.prepare(`SELECT * FROM ${table} WHERE id = ? AND company_id = ? AND sheet_id = ?`).get(rowId, companyId, sheetId);
  }
  return db.prepare(`SELECT * FROM ${table} WHERE id = ? AND company_id = ?`).get(rowId, companyId);
}

/**
 * Agrega una fila a una hoja. Para cuestionarios, establece sheet_id automáticamente.
 * @param {import('better-sqlite3').Database} db
 * @param {number} companyId
 * @param {string} sheetId
 * @param {object} data - Campos de la fila (sin id, company_id, sheet_id, timestamps)
 * @returns {object} La fila creada
 */
function addRow(db, companyId, sheetId, data) {
  const { table, isQuestionnaire } = resolveTable(sheetId);
  const rowData = { ...data, company_id: companyId };
  if (isQuestionnaire) {
    rowData.sheet_id = sheetId;
  }
  // Remove auto-managed fields
  delete rowData.id;
  delete rowData.created_at;
  delete rowData.updated_at;

  const columns = Object.keys(rowData);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map(col => rowData[col]);

  const info = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`).run(...values);
  return getRow(db, companyId, sheetId, info.lastInsertRowid);
}

/**
 * Actualiza parcialmente una fila (solo los campos proporcionados en data).
 * @param {import('better-sqlite3').Database} db
 * @param {number} companyId
 * @param {string} sheetId
 * @param {number} rowId
 * @param {object} data - Campos a actualizar
 * @returns {object|undefined} La fila actualizada, o undefined si no existe
 */
function updateRow(db, companyId, sheetId, rowId, data) {
  const { table, isQuestionnaire } = resolveTable(sheetId);

  // Strip auto-managed fields from update data
  const updateData = { ...data };
  delete updateData.id;
  delete updateData.company_id;
  delete updateData.sheet_id;
  delete updateData.created_at;
  delete updateData.updated_at;

  const columns = Object.keys(updateData);
  if (columns.length === 0) return getRow(db, companyId, sheetId, rowId);

  const setClause = columns.map(col => `${col} = ?`).join(', ');
  const values = columns.map(col => updateData[col]);

  let sql;
  if (isQuestionnaire) {
    sql = `UPDATE ${table} SET ${setClause} WHERE id = ? AND company_id = ? AND sheet_id = ?`;
    values.push(rowId, companyId, sheetId);
  } else {
    sql = `UPDATE ${table} SET ${setClause} WHERE id = ? AND company_id = ?`;
    values.push(rowId, companyId);
  }

  const info = db.prepare(sql).run(...values);
  if (info.changes === 0) return undefined;
  return getRow(db, companyId, sheetId, rowId);
}

/**
 * Elimina una fila por ID, validando empresa y hoja.
 * @param {import('better-sqlite3').Database} db
 * @param {number} companyId
 * @param {string} sheetId
 * @param {number} rowId
 * @returns {boolean} true si se eliminó, false si no existía
 */
function deleteRow(db, companyId, sheetId, rowId) {
  const { table, isQuestionnaire } = resolveTable(sheetId);
  let sql;
  if (isQuestionnaire) {
    sql = `DELETE FROM ${table} WHERE id = ? AND company_id = ? AND sheet_id = ?`;
    const info = db.prepare(sql).run(rowId, companyId, sheetId);
    return info.changes > 0;
  }
  sql = `DELETE FROM ${table} WHERE id = ? AND company_id = ?`;
  const info = db.prepare(sql).run(rowId, companyId);
  return info.changes > 0;
}

/**
 * Inserta múltiples filas dentro de una transacción atómica (para importación CSV).
 * @param {import('better-sqlite3').Database} db
 * @param {number} companyId
 * @param {string} sheetId
 * @param {Array<object>} rows - Array de objetos con los datos de cada fila
 * @returns {number} Cantidad de filas insertadas
 */
function bulkInsert(db, companyId, sheetId, rows) {
  const insertAll = db.transaction((rowsToInsert) => {
    let count = 0;
    for (const row of rowsToInsert) {
      addRow(db, companyId, sheetId, row);
      count++;
    }
    return count;
  });
  return insertAll(rows);
}

/**
 * Exporta todas las filas de una hoja para una empresa (para exportación CSV).
 * Excluye campos internos (id, company_id, sheet_id, created_at, updated_at).
 * @param {import('better-sqlite3').Database} db
 * @param {number} companyId
 * @param {string} sheetId
 * @returns {Array<object>} Filas con solo los campos de datos
 */
function exportRows(db, companyId, sheetId) {
  const rows = getSheetData(db, companyId, sheetId);
  return rows.map(row => {
    const exported = { ...row };
    delete exported.id;
    delete exported.company_id;
    delete exported.sheet_id;
    delete exported.created_at;
    delete exported.updated_at;
    return exported;
  });
}

module.exports = {
  getSheetData,
  getRow,
  addRow,
  updateRow,
  deleteRow,
  bulkInsert,
  exportRows,
  resolveTable,
};
