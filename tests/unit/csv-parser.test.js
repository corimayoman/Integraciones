/**
 * Unit tests for js/business/csv-parser.js
 * Validates: Requirements 9.2, 9.3, 9.7
 */
import { describe, it, expect } from 'vitest';
import { parseCSV, toCSV, validateCSVHeaders } from '../../js/business/csv-parser.js';

/* ------------------------------------------------------------------ */
/*  parseCSV                                                           */
/* ------------------------------------------------------------------ */

describe('parseCSV', () => {
  it('parses simple CSV with headers and rows', () => {
    const csv = 'name,age\nAlice,30\nBob,25';
    const result = parseCSV(csv);
    expect(result.headers).toEqual(['name', 'age']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ name: 'Alice', age: '30' });
    expect(result.rows[1]).toEqual({ name: 'Bob', age: '25' });
  });

  it('handles quoted fields with commas', () => {
    const csv = 'name,desc\n"Smith, John","Has a, comma"';
    const result = parseCSV(csv);
    expect(result.rows[0].name).toBe('Smith, John');
    expect(result.rows[0].desc).toBe('Has a, comma');
  });

  it('handles escaped quotes inside quoted fields', () => {
    const csv = 'name,note\n"She said ""hello""",ok';
    const result = parseCSV(csv);
    expect(result.rows[0].name).toBe('She said "hello"');
  });

  it('handles CRLF line endings', () => {
    const csv = 'a,b\r\n1,2\r\n3,4';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ a: '1', b: '2' });
  });

  it('returns empty for null/undefined/empty input', () => {
    expect(parseCSV(null)).toEqual({ headers: [], rows: [] });
    expect(parseCSV(undefined)).toEqual({ headers: [], rows: [] });
    expect(parseCSV('')).toEqual({ headers: [], rows: [] });
  });

  it('returns headers only when no data rows', () => {
    const result = parseCSV('col1,col2');
    expect(result.headers).toEqual(['col1', 'col2']);
    expect(result.rows).toHaveLength(0);
  });

  it('fills missing values with empty string', () => {
    const csv = 'a,b,c\n1';
    const result = parseCSV(csv);
    expect(result.rows[0]).toEqual({ a: '1', b: '', c: '' });
  });

  it('skips blank lines', () => {
    const csv = 'a,b\n1,2\n\n3,4';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ */
/*  toCSV                                                              */
/* ------------------------------------------------------------------ */

describe('toCSV', () => {
  it('serializes headers and rows to CSV string', () => {
    const headers = ['name', 'age'];
    const rows = [{ name: 'Alice', age: '30' }, { name: 'Bob', age: '25' }];
    const csv = toCSV(headers, rows);
    expect(csv).toBe('name,age\nAlice,30\nBob,25');
  });

  it('quotes fields containing commas', () => {
    const csv = toCSV(['name'], [{ name: 'A, B' }]);
    expect(csv).toBe('name\n"A, B"');
  });

  it('escapes quotes inside fields', () => {
    const csv = toCSV(['note'], [{ note: 'She said "hi"' }]);
    expect(csv).toBe('note\n"She said ""hi"""');
  });

  it('handles missing values as empty string', () => {
    const csv = toCSV(['a', 'b'], [{ a: '1' }]);
    expect(csv).toBe('a,b\n1,');
  });

  it('returns empty string for empty/null headers', () => {
    expect(toCSV([], [])).toBe('');
    expect(toCSV(null, [])).toBe('');
  });

  it('round-trips with parseCSV', () => {
    const headers = ['x', 'y'];
    const rows = [{ x: 'hello', y: 'world' }, { x: 'foo', y: 'bar' }];
    const csv = toCSV(headers, rows);
    const parsed = parseCSV(csv);
    expect(parsed.headers).toEqual(headers);
    expect(parsed.rows).toEqual(rows);
  });
});

/* ------------------------------------------------------------------ */
/*  validateCSVHeaders                                                 */
/* ------------------------------------------------------------------ */

describe('validateCSVHeaders', () => {
  it('valid headers for apps sheet', () => {
    const headers = ['app_id', 'manufacturer', 'app_name', 'globant_studio'];
    const result = validateCSVHeaders(headers, 'apps');
    expect(result.valid).toBe(true);
    expect(result.unrecognized).toHaveLength(0);
  });

  it('detects unrecognized headers', () => {
    const headers = ['app_name', 'bogus_column'];
    const result = validateCSVHeaders(headers, 'apps');
    expect(result.valid).toBe(false);
    expect(result.unrecognized).toContain('bogus_column');
  });

  it('detects missing columns', () => {
    const headers = ['app_name'];
    const result = validateCSVHeaders(headers, 'apps');
    expect(result.missing).toContain('manufacturer');
    expect(result.missing).toContain('globant_studio');
  });

  it('returns all unrecognized for unknown sheet', () => {
    const headers = ['a', 'b'];
    const result = validateCSVHeaders(headers, 'nonexistent');
    expect(result.valid).toBe(false);
    expect(result.unrecognized).toEqual(['a', 'b']);
  });

  it('compliance sheet with all columns is valid', () => {
    const headers = [
      'norm_certification', 'scope', 'issued_by', 'issued_on',
      'due_date', 'impact_on', 'associated_cost', 'renewal_period',
    ];
    const result = validateCSVHeaders(headers, 'compliance');
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('building_security with company_answer is valid', () => {
    const result = validateCSVHeaders(['company_answer'], 'building_security');
    expect(result.valid).toBe(true);
  });
});
