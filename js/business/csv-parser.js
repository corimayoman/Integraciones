/**
 * CSV parsing, serialization, and header validation.
 *
 * Validates: Requirements 9.2, 9.3, 9.7
 *
 * @module csv-parser
 */

import { SHEET_DEFINITIONS } from './sheet-logic.js';

/* ------------------------------------------------------------------ */
/*  Parse CSV                                                          */
/* ------------------------------------------------------------------ */

/**
 * Parses a CSV string into headers and row objects.
 * Handles quoted fields containing commas and newlines.
 * @param {string} csvText
 * @returns {{ headers: string[], rows: object[] }}
 */
export function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    return { headers: [], rows: [] };
  }

  const lines = splitCSVLines(csvText.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = j < values.length ? values[j] : '';
    }
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Split CSV text into logical lines, respecting quoted fields that span
 * multiple physical lines.
 * @param {string} text
 * @returns {string[]}
 */
function splitCSVLines(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++; // skip \r\n
      if (current.length > 0) lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

/**
 * Parse a single CSV line into an array of field values.
 * @param {string} line
 * @returns {string[]}
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/* ------------------------------------------------------------------ */
/*  Serialize to CSV                                                   */
/* ------------------------------------------------------------------ */

/**
 * Serializes headers and row objects to a CSV string.
 * @param {string[]} headers
 * @param {object[]} rows
 * @returns {string}
 */
export function toCSV(headers, rows) {
  if (!headers || headers.length === 0) return '';

  const lines = [headers.map(escapeCSVField).join(',')];

  for (const row of rows) {
    const values = headers.map((h) => escapeCSVField(row[h] ?? ''));
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Escape a single CSV field value, quoting if necessary.
 * @param {*} value
 * @returns {string}
 */
function escapeCSVField(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/* ------------------------------------------------------------------ */
/*  Validate CSV headers against sheet definition                      */
/* ------------------------------------------------------------------ */

/**
 * Validates that CSV headers match the expected columns for a sheet.
 * @param {string[]} csvHeaders
 * @param {string} sheetId
 * @returns {{ valid: boolean, unrecognized: string[], missing: string[] }}
 */
export function validateCSVHeaders(csvHeaders, sheetId) {
  const def = SHEET_DEFINITIONS[sheetId];
  if (!def) {
    return { valid: false, unrecognized: [...csvHeaders], missing: [] };
  }

  const allColumns = new Set([...def.empresa, ...def.globant]);
  const headerSet = new Set(csvHeaders);

  const unrecognized = csvHeaders.filter((h) => !allColumns.has(h));
  const missing = [...allColumns].filter((c) => !headerSet.has(c));

  return {
    valid: unrecognized.length === 0,
    unrecognized,
    missing,
  };
}
