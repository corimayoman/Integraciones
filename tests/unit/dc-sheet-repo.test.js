/**
 * Unit tests for proxy/dc-sheet-repo.js
 * Validates: Requirements 11.4, 1.3, 1.4, 9.4, 9.6
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const Database = (await import('better-sqlite3')).default;
const { runMigrations } = await import('../../proxy/dc-database.js');
const {
  getSheetData,
  getRow,
  addRow,
  updateRow,
  deleteRow,
  bulkInsert,
  exportRows,
  resolveTable,
} = await import('../../proxy/dc-sheet-repo.js');

let db;
let companyId;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  // Create a test company
  const info = db.prepare('INSERT INTO companies (name) VALUES (?)').run('Test Company');
  companyId = Number(info.lastInsertRowid);
});

afterEach(() => {
  db.close();
});

// --- resolveTable ---

describe('resolveTable', () => {
  it('maps "apps" to apps_data', () => {
    expect(resolveTable('apps')).toEqual({ table: 'apps_data', isQuestionnaire: false });
  });

  it('maps "compliance" to compliance_data', () => {
    expect(resolveTable('compliance')).toEqual({ table: 'compliance_data', isQuestionnaire: false });
  });

  it.each(['infrastructure', 'it_experience', 'mst', 'building_security'])(
    'maps "%s" to questionnaire_data',
    (sheetId) => {
      expect(resolveTable(sheetId)).toEqual({ table: 'questionnaire_data', isQuestionnaire: true });
    }
  );

  it('throws for invalid sheetId', () => {
    expect(() => resolveTable('invalid')).toThrow('Sheet ID no válido');
  });
});

// --- Apps (apps_data) ---

describe('dc-sheet-repo — apps_data', () => {
  it('getSheetData returns empty array when no rows', () => {
    expect(getSheetData(db, companyId, 'apps')).toEqual([]);
  });

  it('addRow creates a row and returns it with id', () => {
    const row = addRow(db, companyId, 'apps', { app_name: 'Slack', manufacturer: 'Salesforce' });
    expect(row.id).toBeGreaterThan(0);
    expect(row.app_name).toBe('Slack');
    expect(row.manufacturer).toBe('Salesforce');
    expect(row.company_id).toBe(companyId);
  });

  it('getRow retrieves a specific row', () => {
    const created = addRow(db, companyId, 'apps', { app_name: 'Zoom' });
    const fetched = getRow(db, companyId, 'apps', created.id);
    expect(fetched).toBeDefined();
    expect(fetched.app_name).toBe('Zoom');
  });

  it('getRow returns undefined for wrong company', () => {
    const created = addRow(db, companyId, 'apps', { app_name: 'Zoom' });
    expect(getRow(db, 9999, 'apps', created.id)).toBeUndefined();
  });

  it('updateRow partially updates fields', () => {
    const created = addRow(db, companyId, 'apps', { app_name: 'Old', manufacturer: 'OldMfg' });
    const updated = updateRow(db, companyId, 'apps', created.id, { app_name: 'New' });
    expect(updated.app_name).toBe('New');
    expect(updated.manufacturer).toBe('OldMfg'); // unchanged
  });

  it('updateRow returns undefined for non-existent row', () => {
    expect(updateRow(db, companyId, 'apps', 9999, { app_name: 'X' })).toBeUndefined();
  });

  it('deleteRow removes the row', () => {
    const created = addRow(db, companyId, 'apps', { app_name: 'ToDelete' });
    expect(deleteRow(db, companyId, 'apps', created.id)).toBe(true);
    expect(getRow(db, companyId, 'apps', created.id)).toBeUndefined();
  });

  it('deleteRow returns false for non-existent row', () => {
    expect(deleteRow(db, companyId, 'apps', 9999)).toBe(false);
  });

  it('getSheetData returns all rows for the company', () => {
    addRow(db, companyId, 'apps', { app_name: 'A' });
    addRow(db, companyId, 'apps', { app_name: 'B' });
    const rows = getSheetData(db, companyId, 'apps');
    expect(rows).toHaveLength(2);
  });

  it('getSheetData does not return rows from other companies', () => {
    const other = db.prepare('INSERT INTO companies (name) VALUES (?)').run('Other Co');
    addRow(db, companyId, 'apps', { app_name: 'Mine' });
    addRow(db, Number(other.lastInsertRowid), 'apps', { app_name: 'Theirs' });
    expect(getSheetData(db, companyId, 'apps')).toHaveLength(1);
  });
});

// --- Compliance (compliance_data) ---

describe('dc-sheet-repo — compliance_data', () => {
  it('addRow and getRow round-trip', () => {
    const row = addRow(db, companyId, 'compliance', {
      norm_certification: 'ISO 27001',
      scope: 'Global',
      issued_by: 'BSI',
    });
    expect(row.id).toBeGreaterThan(0);
    expect(row.norm_certification).toBe('ISO 27001');

    const fetched = getRow(db, companyId, 'compliance', row.id);
    expect(fetched.norm_certification).toBe('ISO 27001');
    expect(fetched.scope).toBe('Global');
  });

  it('updateRow partially updates compliance fields', () => {
    const row = addRow(db, companyId, 'compliance', { norm_certification: 'SOC2', scope: 'US' });
    const updated = updateRow(db, companyId, 'compliance', row.id, { scope: 'Global' });
    expect(updated.scope).toBe('Global');
    expect(updated.norm_certification).toBe('SOC2');
  });

  it('deleteRow removes compliance row', () => {
    const row = addRow(db, companyId, 'compliance', { norm_certification: 'PCI' });
    expect(deleteRow(db, companyId, 'compliance', row.id)).toBe(true);
    expect(getRow(db, companyId, 'compliance', row.id)).toBeUndefined();
  });
});

// --- Questionnaire (questionnaire_data) ---

describe('dc-sheet-repo — questionnaire_data', () => {
  it('addRow automatically sets sheet_id for questionnaire sheets', () => {
    const row = addRow(db, companyId, 'infrastructure', { question: 'What is your ISP?' });
    expect(row.sheet_id).toBe('infrastructure');
    expect(row.question).toBe('What is your ISP?');
  });

  it('getSheetData filters by sheet_id', () => {
    addRow(db, companyId, 'infrastructure', { question: 'Q1' });
    addRow(db, companyId, 'it_experience', { question: 'Q2' });
    addRow(db, companyId, 'mst', { question: 'Q3' });

    expect(getSheetData(db, companyId, 'infrastructure')).toHaveLength(1);
    expect(getSheetData(db, companyId, 'it_experience')).toHaveLength(1);
    expect(getSheetData(db, companyId, 'mst')).toHaveLength(1);
  });

  it('getRow validates sheet_id', () => {
    const row = addRow(db, companyId, 'infrastructure', { question: 'Q1' });
    // Same row ID but different sheet should return undefined
    expect(getRow(db, companyId, 'it_experience', row.id)).toBeUndefined();
    // Correct sheet returns the row
    expect(getRow(db, companyId, 'infrastructure', row.id)).toBeDefined();
  });

  it('updateRow works for questionnaire rows', () => {
    const row = addRow(db, companyId, 'mst', { question: 'Q1', company_answer: 'Old' });
    const updated = updateRow(db, companyId, 'mst', row.id, { company_answer: 'New' });
    expect(updated.company_answer).toBe('New');
    expect(updated.question).toBe('Q1');
  });

  it('deleteRow validates sheet_id', () => {
    const row = addRow(db, companyId, 'building_security', { question: 'BS Q1' });
    // Wrong sheet should not delete
    expect(deleteRow(db, companyId, 'infrastructure', row.id)).toBe(false);
    // Correct sheet deletes
    expect(deleteRow(db, companyId, 'building_security', row.id)).toBe(true);
  });

  it('building_security rows work correctly', () => {
    const row = addRow(db, companyId, 'building_security', {
      question: 'Is there a guard?',
      company_answer: 'Yes',
      category: 'About the Building',
    });
    expect(row.sheet_id).toBe('building_security');
    expect(row.company_answer).toBe('Yes');
  });
});

// --- bulkInsert ---

describe('dc-sheet-repo — bulkInsert', () => {
  it('inserts multiple rows atomically', () => {
    const count = bulkInsert(db, companyId, 'apps', [
      { app_name: 'App1' },
      { app_name: 'App2' },
      { app_name: 'App3' },
    ]);
    expect(count).toBe(3);
    expect(getSheetData(db, companyId, 'apps')).toHaveLength(3);
  });

  it('rolls back all rows if one fails', () => {
    // Insert a valid row first, then try bulk with a bad row
    addRow(db, companyId, 'compliance', { norm_certification: 'Existing' });

    // questionnaire_data requires question NOT NULL — omitting it should fail
    expect(() => {
      bulkInsert(db, companyId, 'infrastructure', [
        { question: 'Valid Q1' },
        { question: null }, // violates NOT NULL
      ]);
    }).toThrow();

    // No infrastructure rows should exist (transaction rolled back)
    expect(getSheetData(db, companyId, 'infrastructure')).toHaveLength(0);
    // Existing compliance row should be unaffected
    expect(getSheetData(db, companyId, 'compliance')).toHaveLength(1);
  });

  it('works for questionnaire sheets with auto sheet_id', () => {
    const count = bulkInsert(db, companyId, 'it_experience', [
      { question: 'Q1', category: 'Devices' },
      { question: 'Q2', category: 'Architecture' },
    ]);
    expect(count).toBe(2);
    const rows = getSheetData(db, companyId, 'it_experience');
    expect(rows).toHaveLength(2);
    expect(rows[0].sheet_id).toBe('it_experience');
    expect(rows[1].sheet_id).toBe('it_experience');
  });
});

// --- exportRows ---

describe('dc-sheet-repo — exportRows', () => {
  it('returns rows without internal fields for apps', () => {
    addRow(db, companyId, 'apps', { app_name: 'Exported', manufacturer: 'Mfg' });
    const exported = exportRows(db, companyId, 'apps');
    expect(exported).toHaveLength(1);
    expect(exported[0].app_name).toBe('Exported');
    expect(exported[0]).not.toHaveProperty('id');
    expect(exported[0]).not.toHaveProperty('company_id');
    expect(exported[0]).not.toHaveProperty('created_at');
    expect(exported[0]).not.toHaveProperty('updated_at');
  });

  it('returns rows without internal fields for questionnaire', () => {
    addRow(db, companyId, 'mst', { question: 'Q1', company_answer: 'A1' });
    const exported = exportRows(db, companyId, 'mst');
    expect(exported).toHaveLength(1);
    expect(exported[0].question).toBe('Q1');
    expect(exported[0]).not.toHaveProperty('id');
    expect(exported[0]).not.toHaveProperty('company_id');
    expect(exported[0]).not.toHaveProperty('sheet_id');
  });

  it('returns empty array when no data', () => {
    expect(exportRows(db, companyId, 'compliance')).toEqual([]);
  });
});

// --- updateRow edge cases ---

describe('dc-sheet-repo — updateRow edge cases', () => {
  it('returns the row unchanged when data is empty', () => {
    const row = addRow(db, companyId, 'apps', { app_name: 'NoChange' });
    const result = updateRow(db, companyId, 'apps', row.id, {});
    expect(result.app_name).toBe('NoChange');
  });

  it('ignores auto-managed fields in update data', () => {
    const row = addRow(db, companyId, 'apps', { app_name: 'Test' });
    const result = updateRow(db, companyId, 'apps', row.id, {
      id: 9999,
      company_id: 9999,
      created_at: 'fake',
      updated_at: 'fake',
      app_name: 'Updated',
    });
    expect(result.app_name).toBe('Updated');
    expect(result.id).toBe(row.id); // id unchanged
    expect(result.company_id).toBe(companyId); // company_id unchanged
  });
});
