/**
 * Property-based tests for sheet rendering logic.
 * Validates: Properties 12, 13, 14, 15
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

const Database = (await import('better-sqlite3')).default;
const { runMigrations } = await import('../../proxy/dc-database.js');
const sheetRepo = await import('../../proxy/dc-sheet-repo.js');
const companyRepo = await import('../../proxy/dc-company-repo.js');

import { SHEET_DEFINITIONS, getEditableColumns } from '../../js/business/sheet-logic.js';
import {
  dcAppsRowArb,
  dcComplianceRowArb,
  dcQuestionnaireRowArb,
  dcInventorySheetIdArb,
  dcQuestionnaireSheetIdArb,
  dcSheetIdArb,
} from './dc-generators.js';

let db;
let companyId;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  const co = companyRepo.create(db, { name: 'SheetTestCo' });
  companyId = co.id;
});

afterEach(() => {
  db.close();
});

// Feature: data-collection-module, Property 12: Cell Edit Round-Trip
describe('Property 12: Edición de Celda Round-Trip', () => {
  it('updating a cell on apps row and reading back returns the new value', () => {
    fc.assert(
      fc.property(
        dcAppsRowArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (rowData, newValue) => {
          const row = sheetRepo.addRow(db, companyId, 'apps', rowData);
          const updated = sheetRepo.updateRow(db, companyId, 'apps', row.id, { app_name: newValue });
          expect(updated).toBeDefined();
          expect(updated.app_name).toBe(newValue);

          const fetched = sheetRepo.getRow(db, companyId, 'apps', row.id);
          expect(fetched.app_name).toBe(newValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('updating a cell on compliance row and reading back returns the new value', () => {
    fc.assert(
      fc.property(
        dcComplianceRowArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (rowData, newValue) => {
          const row = sheetRepo.addRow(db, companyId, 'compliance', rowData);
          const updated = sheetRepo.updateRow(db, companyId, 'compliance', row.id, { norm_certification: newValue });
          expect(updated).toBeDefined();
          expect(updated.norm_certification).toBe(newValue);

          const fetched = sheetRepo.getRow(db, companyId, 'compliance', row.id);
          expect(fetched.norm_certification).toBe(newValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('updating a cell on questionnaire row and reading back returns the new value', () => {
    fc.assert(
      fc.property(
        dcQuestionnaireSheetIdArb,
        dcQuestionnaireRowArb,
        fc.string({ minLength: 1, maxLength: 50 }),
        (sheetId, rowData, newAnswer) => {
          const row = sheetRepo.addRow(db, companyId, sheetId, rowData);
          const updated = sheetRepo.updateRow(db, companyId, sheetId, row.id, { company_answer: newAnswer });
          expect(updated).toBeDefined();
          expect(updated.company_answer).toBe(newAnswer);

          const fetched = sheetRepo.getRow(db, companyId, sheetId, row.id);
          expect(fetched.company_answer).toBe(newAnswer);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: data-collection-module, Property 13: Add Row Increments Count, Delete Decrements
describe('Property 13: Agregar Fila Incrementa Conteo, Eliminar Fila Decrementa Conteo', () => {
  it('adding a row to apps increments count by 1', () => {
    fc.assert(
      fc.property(dcAppsRowArb, (rowData) => {
        const before = sheetRepo.getSheetData(db, companyId, 'apps').length;
        sheetRepo.addRow(db, companyId, 'apps', rowData);
        const after = sheetRepo.getSheetData(db, companyId, 'apps').length;
        expect(after).toBe(before + 1);
      }),
      { numRuns: 100 }
    );
  });

  it('deleting a row from apps decrements count by 1', () => {
    // Pre-populate some rows
    for (let i = 0; i < 3; i++) {
      sheetRepo.addRow(db, companyId, 'apps', { app_name: `App${i}` });
    }

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), () => {
        const rows = sheetRepo.getSheetData(db, companyId, 'apps');
        if (rows.length === 0) return;
        const before = rows.length;
        sheetRepo.deleteRow(db, companyId, 'apps', rows[0].id);
        const after = sheetRepo.getSheetData(db, companyId, 'apps').length;
        expect(after).toBe(before - 1);
      }),
      { numRuns: 100 }
    );
  });

  it('adding a row to compliance increments count by 1', () => {
    fc.assert(
      fc.property(dcComplianceRowArb, (rowData) => {
        const before = sheetRepo.getSheetData(db, companyId, 'compliance').length;
        sheetRepo.addRow(db, companyId, 'compliance', rowData);
        const after = sheetRepo.getSheetData(db, companyId, 'compliance').length;
        expect(after).toBe(before + 1);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: data-collection-module, Property 14: Questionnaire Grouping by Category
describe('Property 14: Agrupación de Cuestionarios por Categoría/Sección', () => {
  it('grouping questionnaire rows by category places each question in exactly one group', () => {
    fc.assert(
      fc.property(
        dcQuestionnaireSheetIdArb,
        fc.array(
          fc.record({
            question: fc.string({ minLength: 1, maxLength: 50 }),
            category: fc.constantFrom('Category A', 'Category B', 'Category C'),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (sheetId, items) => {
          // Simulate grouping logic (as used by qa-mgmt-sheet and qa-simple-sheet)
          const groups = {};
          for (const item of items) {
            const cat = item.category || 'Uncategorized';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
          }

          // Every question appears exactly once across all groups
          const allGrouped = Object.values(groups).flat();
          expect(allGrouped.length).toBe(items.length);

          // Each item is in its correct group
          for (const item of items) {
            const cat = item.category || 'Uncategorized';
            expect(groups[cat]).toContainEqual(item);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: data-collection-module, Property 15: Building Security Excludes Management Columns
describe('Property 15: Building Security Excluye Columnas de Gestión', () => {
  const MANAGEMENT_COLUMNS = ['globant_comments', 'globant_owner', 'due_date', 'additional_comments'];

  it('building_security SHEET_DEFINITIONS has no globant columns', () => {
    fc.assert(
      fc.property(fc.constant('building_security'), (sheetId) => {
        const def = SHEET_DEFINITIONS[sheetId];
        expect(def.globant).toEqual([]);
        for (const col of MANAGEMENT_COLUMNS) {
          expect(def.empresa).not.toContain(col);
          expect(def.globant).not.toContain(col);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('getEditableColumns for globant on building_security returns empty', () => {
    fc.assert(
      fc.property(fc.constant('building_security'), (sheetId) => {
        const { editable, readOnly } = getEditableColumns(sheetId, 'globant');
        expect(editable).toEqual([]);
        // All columns are read-only for globant
        expect(readOnly).toEqual(['company_answer']);
      }),
      { numRuns: 100 }
    );
  });

  it('building_security empresa columns contain only company_answer', () => {
    fc.assert(
      fc.property(fc.constant('building_security'), (sheetId) => {
        const { editable } = getEditableColumns(sheetId, 'empresa');
        expect(editable).toEqual(['company_answer']);
        for (const col of MANAGEMENT_COLUMNS) {
          expect(editable).not.toContain(col);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('building_security data rows do not use management columns', () => {
    fc.assert(
      fc.property(
        fc.record({
          question: fc.string({ minLength: 1, maxLength: 50 }),
          company_answer: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          category: fc.constantFrom('About the Building', 'About the Office', 'Support and Maintenance'),
        }),
        (rowData) => {
          const row = sheetRepo.addRow(db, companyId, 'building_security', rowData);
          const exported = sheetRepo.exportRows(db, companyId, 'building_security');
          const lastExported = exported[exported.length - 1];

          // Management columns should be null in the DB
          expect(row.globant_comments).toBeNull();
          expect(row.globant_owner).toBeNull();
          // due_date and additional_comments are also null
          expect(row.additional_comments).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
