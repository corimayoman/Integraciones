/**
 * Property-based tests for frontend business logic (sheet-logic, csv-parser).
 * Validates: Properties 11, 16, 17
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { getSheetPattern, SHEET_DEFINITIONS } from '../../js/business/sheet-logic.js';
import { parseCSV, toCSV, validateCSVHeaders } from '../../js/business/csv-parser.js';

import { dcSheetIdArb, dcCSVHeadersArb } from './dc-generators.js';

// Feature: data-collection-module, Property 11: Sheet-to-Pattern Mapping
describe('Property 11: Mapeo Hoja-a-Patrón de Renderizado', () => {
  const EXPECTED_PATTERNS = {
    apps: 'inventory',
    compliance: 'inventory',
    infrastructure: 'qa-management',
    it_experience: 'qa-management',
    mst: 'qa-management',
    building_security: 'qa-simple',
    endpoints: 'inventory',
  };

  it('every valid sheet ID maps to the correct rendering pattern', () => {
    fc.assert(
      fc.property(dcSheetIdArb, (sheetId) => {
        const pattern = getSheetPattern(sheetId);
        expect(pattern).toBe(EXPECTED_PATTERNS[sheetId]);
      }),
      { numRuns: 100 }
    );
  });

  it('invalid sheet IDs return null', () => {
    const validIds = new Set(['apps', 'compliance', 'infrastructure', 'it_experience', 'mst', 'building_security', 'endpoints']);
    // Also exclude Object.prototype property names that would resolve to truthy
    const protoKeys = new Set(Object.getOwnPropertyNames(Object.prototype));

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(
          (s) => !validIds.has(s) && !protoKeys.has(s)
        ),
        (invalidId) => {
          expect(getSheetPattern(invalidId)).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: data-collection-module, Property 16: CSV Header Validation
describe('Property 16: Validación de Headers CSV', () => {
  it('valid headers for a sheet produce valid=true and no unrecognized', () => {
    fc.assert(
      fc.property(dcSheetIdArb, (sheetId) => {
        const def = SHEET_DEFINITIONS[sheetId];
        const allColumns = [...def.empresa, ...def.globant];
        const result = validateCSVHeaders(allColumns, sheetId);
        expect(result.valid).toBe(true);
        expect(result.unrecognized).toEqual([]);
        expect(result.missing).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });

  it('subset of valid headers identifies missing columns', () => {
    fc.assert(
      fc.property(dcSheetIdArb, (sheetId) => {
        const def = SHEET_DEFINITIONS[sheetId];
        const allColumns = [...def.empresa, ...def.globant];
        if (allColumns.length === 0) return;

        // Pick a random non-empty subset
        const subsetSize = Math.max(1, Math.floor(Math.random() * allColumns.length));
        const subset = allColumns.slice(0, subsetSize);

        const result = validateCSVHeaders(subset, sheetId);

        // All provided headers should be recognized
        expect(result.unrecognized).toEqual([]);
        // Missing = allColumns - provided
        const provided = new Set(subset);
        const expectedMissing = allColumns.filter((c) => !provided.has(c));
        expect(result.missing.sort()).toEqual(expectedMissing.sort());
      }),
      { numRuns: 100 }
    );
  });

  it('unrecognized headers are correctly identified', () => {
    fc.assert(
      fc.property(
        dcSheetIdArb,
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (sheetId, fakeHeaders) => {
          const def = SHEET_DEFINITIONS[sheetId];
          const allColumns = new Set([...def.empresa, ...def.globant]);
          // Filter to only truly unrecognized headers
          const unrecognized = fakeHeaders.filter((h) => !allColumns.has(h));
          if (unrecognized.length === 0) return;

          const result = validateCSVHeaders(fakeHeaders, sheetId);
          expect(result.valid).toBe(false);
          for (const h of unrecognized) {
            expect(result.unrecognized).toContain(h);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: data-collection-module, Property 17: CSV Import/Export Round-Trip
describe('Property 17: Importación/Exportación CSV Round-Trip', () => {
  /** Generate clean header names (alphanumeric, no special chars). */
  const cleanHeaderArb = fc.stringMatching(/^[a-z][a-z0-9_]{0,14}$/).filter((s) => s.length >= 1);

  it('toCSV + parseCSV produces equivalent data', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(cleanHeaderArb, { minLength: 1, maxLength: 5, comparator: 'IsStrictlyEqual' }),
        fc.integer({ min: 1, max: 5 }),
        (headers, numRows) => {
          const rows = [];
          for (let i = 0; i < numRows; i++) {
            const row = {};
            for (const h of headers) {
              row[h] = `val_${i}_${h}`;
            }
            rows.push(row);
          }

          const csvText = toCSV(headers, rows);
          const parsed = parseCSV(csvText);

          expect(parsed.headers).toEqual(headers);
          expect(parsed.rows.length).toBe(rows.length);

          for (let i = 0; i < rows.length; i++) {
            for (const h of headers) {
              expect(parsed.rows[i][h]).toBe(rows[i][h]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('round-trip preserves values with special characters when properly escaped', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(cleanHeaderArb, { minLength: 1, maxLength: 3, comparator: 'IsStrictlyEqual' }),
        (headers) => {
          // Values with commas and quotes that need escaping
          const rows = [{}];
          for (const h of headers) {
            rows[0][h] = `value with "quotes" and, commas`;
          }

          const csvText = toCSV(headers, rows);
          const parsed = parseCSV(csvText);

          expect(parsed.headers).toEqual(headers);
          expect(parsed.rows.length).toBe(1);
          for (const h of headers) {
            expect(parsed.rows[0][h]).toBe(rows[0][h]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
