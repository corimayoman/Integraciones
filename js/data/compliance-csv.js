/**
 * Compliance CSV parser — converts a Jira CSV export into the Jira issue
 * format expected by transformComplianceData / compliance-transformer.
 *
 * @module compliance-csv
 */

/**
 * Parse a date string like "16/Apr/26 12:00 AM" or "16/Apr/2026 12:00 AM"
 * into an ISO date string "YYYY-MM-DD".
 * Returns null when the value is empty or unparseable.
 *
 * @param {string} raw
 * @returns {string|null}
 */
export function parseJiraDate(raw) {
  if (!raw || !raw.trim()) return null;

  // Try "dd/Mon/yy" or "dd/Mon/yyyy" format (Jira CSV default)
  const match = raw.trim().match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})/);
  if (match) {
    const day   = match[1].padStart(2, '0');
    const month = match[2];
    let   year  = parseInt(match[3], 10);
    if (year < 100) year += 2000;  // two-digit year

    const MONTHS = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
    };
    const mon = MONTHS[month] ?? MONTHS[month.charAt(0).toUpperCase() + month.slice(1).toLowerCase()];
    if (mon) return `${year}-${mon}-${day}`;
  }

  // Fallback: let the browser parse it and extract the date portion
  const d = new Date(raw.trim());
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Minimal RFC 4180-compatible CSV parser.
 * Returns an array of objects keyed by the header row.
 *
 * @param {string} text  Raw CSV text content
 * @returns {Array<Record<string, string>>}
 */
export function parseCSV(text) {
  // Normalise line endings
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const headers = splitCSVRow(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCSVRow(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? '';
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Split a single CSV row, honouring double-quoted fields.
 *
 * @param {string} line
 * @returns {string[]}
 */
function splitCSVRow(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * Convert parsed CSV rows (from parseCSV) into the Jira issue format
 * that compliance-transformer.js expects.
 *
 * @param {Array<Record<string, string>>} rows
 * @returns {Array<object>}
 */
export function csvRowsToJiraIssues(rows) {
  return rows
    .filter(row => row['Issue key'])
    .map(row => ({
      key: row['Issue key'],
      fields: {
        summary:   row['Summary'] ?? '',
        status:    { name: row['Status'] ?? '' },
        issuetype: { name: row['Issue Type'] ?? '' },
        assignee:  row['Assignee']
          ? { displayName: row['Assignee'], accountId: row['Assignee Id'] ?? '' }
          : null,
        created:  parseJiraDate(row['Created']),
        duedate:  parseJiraDate(row['Due date']),
        priority: { name: row['Priority'] ?? '' },
        parent:   row['Parent key'] ? { key: row['Parent key'] } : null,
        customfield_10014: row['Custom field (Epic Link)'] || null,
      },
    }));
}

/**
 * High-level helper: parse a CSV text string and return Jira-format issues.
 *
 * @param {string} csvText
 * @returns {Array<object>}
 */
export function parseComplianceCSV(csvText) {
  const rows = parseCSV(csvText);
  return csvRowsToJiraIssues(rows);
}
