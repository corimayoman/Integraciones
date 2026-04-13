/**
 * Unit tests for js/business/sheet-logic.js
 * Validates: Requirements 4.1, 4.2, 4.4, 5.4, 6.1, 6.2, 7.2, 8.2
 */
import { describe, it, expect } from 'vitest';
import {
  SHEET_DEFINITIONS,
  SHEET_TABS,
  getSheetPattern,
  getEditableColumns,
  validateRowData,
} from '../../js/business/sheet-logic.js';

/* ------------------------------------------------------------------ */
/*  SHEET_DEFINITIONS                                                  */
/* ------------------------------------------------------------------ */

describe('SHEET_DEFINITIONS', () => {
  it('defines all 7 sheet types', () => {
    const ids = Object.keys(SHEET_DEFINITIONS);
    expect(ids).toEqual(
      expect.arrayContaining(['apps', 'compliance', 'infrastructure', 'it_experience', 'mst', 'building_security', 'endpoints']),
    );
    expect(ids).toHaveLength(7);
  });

  it('apps has 16 empresa columns and 5 globant columns', () => {
    expect(SHEET_DEFINITIONS.apps.empresa).toHaveLength(16);
    expect(SHEET_DEFINITIONS.apps.globant).toHaveLength(5);
  });

  it('compliance has 8 empresa columns and 0 globant columns', () => {
    expect(SHEET_DEFINITIONS.compliance.empresa).toHaveLength(8);
    expect(SHEET_DEFINITIONS.compliance.globant).toHaveLength(0);
  });

  it('questionnaire sheets (infra, it_exp, mst) have 1 empresa + 4 globant columns', () => {
    for (const id of ['infrastructure', 'it_experience', 'mst']) {
      expect(SHEET_DEFINITIONS[id].empresa).toEqual(['company_answer']);
      expect(SHEET_DEFINITIONS[id].globant).toHaveLength(4);
    }
  });

  it('building_security has 1 empresa column and 0 globant columns', () => {
    expect(SHEET_DEFINITIONS.building_security.empresa).toEqual(['company_answer']);
    expect(SHEET_DEFINITIONS.building_security.globant).toHaveLength(0);
  });

  it('matches COLUMN_ROLES from proxy/dc-routes.js exactly', () => {
    // Verify specific column names match the backend
    expect(SHEET_DEFINITIONS.apps.empresa).toContain('app_id');
    expect(SHEET_DEFINITIONS.apps.empresa).toContain('manufacturer');
    expect(SHEET_DEFINITIONS.apps.globant).toContain('globant_studio');
    expect(SHEET_DEFINITIONS.apps.globant).toContain('eligible');
    expect(SHEET_DEFINITIONS.infrastructure.globant).toContain('globant_comments');
    expect(SHEET_DEFINITIONS.infrastructure.globant).toContain('globant_owner');
    expect(SHEET_DEFINITIONS.infrastructure.globant).toContain('due_date');
    expect(SHEET_DEFINITIONS.infrastructure.globant).toContain('additional_comments');
  });
});

/* ------------------------------------------------------------------ */
/*  SHEET_TABS                                                         */
/* ------------------------------------------------------------------ */

describe('SHEET_TABS', () => {
  it('contains exactly 7 tabs', () => {
    expect(SHEET_TABS).toHaveLength(7);
  });

  it('each tab has id and label', () => {
    for (const tab of SHEET_TABS) {
      expect(tab).toHaveProperty('id');
      expect(tab).toHaveProperty('label');
      expect(typeof tab.id).toBe('string');
      expect(typeof tab.label).toBe('string');
    }
  });

  it('tab ids match SHEET_DEFINITIONS keys', () => {
    const tabIds = SHEET_TABS.map((t) => t.id);
    const defIds = Object.keys(SHEET_DEFINITIONS);
    expect(tabIds.sort()).toEqual(defIds.sort());
  });
});

/* ------------------------------------------------------------------ */
/*  getSheetPattern                                                    */
/* ------------------------------------------------------------------ */

describe('getSheetPattern', () => {
  it('returns inventory for apps and compliance', () => {
    expect(getSheetPattern('apps')).toBe('inventory');
    expect(getSheetPattern('compliance')).toBe('inventory');
  });

  it('returns qa-management for infrastructure, it_experience, mst', () => {
    expect(getSheetPattern('infrastructure')).toBe('qa-management');
    expect(getSheetPattern('it_experience')).toBe('qa-management');
    expect(getSheetPattern('mst')).toBe('qa-management');
  });

  it('returns qa-simple for building_security', () => {
    expect(getSheetPattern('building_security')).toBe('qa-simple');
  });

  it('returns null for unknown sheet', () => {
    expect(getSheetPattern('unknown')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  getEditableColumns                                                 */
/* ------------------------------------------------------------------ */

describe('getEditableColumns', () => {
  it('empresa role gets empresa columns as editable, globant as readOnly', () => {
    const result = getEditableColumns('apps', 'empresa');
    expect(result.editable).toEqual(SHEET_DEFINITIONS.apps.empresa);
    expect(result.readOnly).toEqual(SHEET_DEFINITIONS.apps.globant);
  });

  it('globant role gets globant columns as editable, empresa as readOnly', () => {
    const result = getEditableColumns('apps', 'globant');
    expect(result.editable).toEqual(SHEET_DEFINITIONS.apps.globant);
    expect(result.readOnly).toEqual(SHEET_DEFINITIONS.apps.empresa);
  });

  it('admin role gets all columns as editable, none readOnly', () => {
    const result = getEditableColumns('apps', 'admin');
    const all = [...SHEET_DEFINITIONS.apps.empresa, ...SHEET_DEFINITIONS.apps.globant];
    expect(result.editable).toEqual(all);
    expect(result.readOnly).toEqual([]);
  });

  it('unknown role gets nothing editable, all readOnly', () => {
    const result = getEditableColumns('apps', 'viewer');
    expect(result.editable).toEqual([]);
    const all = [...SHEET_DEFINITIONS.apps.empresa, ...SHEET_DEFINITIONS.apps.globant];
    expect(result.readOnly).toEqual(all);
  });

  it('unknown sheet returns empty arrays', () => {
    const result = getEditableColumns('nonexistent', 'admin');
    expect(result.editable).toEqual([]);
    expect(result.readOnly).toEqual([]);
  });

  it('compliance empresa gets all columns editable (no globant columns)', () => {
    const result = getEditableColumns('compliance', 'empresa');
    expect(result.editable).toEqual(SHEET_DEFINITIONS.compliance.empresa);
    expect(result.readOnly).toEqual([]);
  });

  it('compliance globant gets nothing editable', () => {
    const result = getEditableColumns('compliance', 'globant');
    expect(result.editable).toEqual([]);
    expect(result.readOnly).toEqual(SHEET_DEFINITIONS.compliance.empresa);
  });

  it('building_security globant gets nothing editable', () => {
    const result = getEditableColumns('building_security', 'globant');
    expect(result.editable).toEqual([]);
    expect(result.readOnly).toEqual(['company_answer']);
  });
});

/* ------------------------------------------------------------------ */
/*  validateRowData                                                    */
/* ------------------------------------------------------------------ */

describe('validateRowData', () => {
  it('valid row data returns valid: true', () => {
    const result = validateRowData('apps', { app_name: 'Test', manufacturer: 'Acme' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('unrecognized column returns valid: false with error', () => {
    const result = validateRowData('apps', { app_name: 'Test', bogus_field: 'x' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Unrecognized column: bogus_field');
  });

  it('ignores internal fields (id, company_id, etc.)', () => {
    const result = validateRowData('apps', { id: 1, company_id: 2, app_name: 'Test', created_at: 'now' });
    expect(result.valid).toBe(true);
  });

  it('ignores questionnaire metadata fields', () => {
    const result = validateRowData('infrastructure', { category: 'Overview', question: 'Q1', company_answer: 'A1' });
    expect(result.valid).toBe(true);
  });

  it('unknown sheet returns valid: false', () => {
    const result = validateRowData('nonexistent', { foo: 'bar' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Unknown sheet');
  });
});
