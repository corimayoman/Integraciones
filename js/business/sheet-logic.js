/**
 * Sheet definitions, column-role mapping, and validation logic.
 * Mirrors the COLUMN_ROLES from proxy/dc-routes.js for frontend use.
 *
 * Validates: Requirements 4.1, 4.2, 4.4, 5.4, 6.1, 6.2, 7.2, 8.2
 *
 * @module sheet-logic
 */

/* ------------------------------------------------------------------ */
/*  Column definitions per sheet and role group                        */
/* ------------------------------------------------------------------ */

/**
 * Column definitions per sheet type and group (empresa/globant).
 * Must stay in sync with COLUMN_ROLES in proxy/dc-routes.js.
 */
export const SHEET_DEFINITIONS = {
  apps: {
    empresa: [
      'app_id', 'manufacturer', 'app_name', 'used_for', 'license_group',
      'license_level', 'num_users', 'cost_monthly', 'end_date',
      'subscription_path', 'renewal_path', 'cancellation_path',
      'information_type', 'sso', 'owner', 'project_or_corporate',
    ],
    globant: [
      'globant_studio', 'eligible', 'gist_approval', 'action', 'comments',
    ],
  },
  compliance: {
    empresa: [
      'norm_certification', 'scope', 'issued_by', 'issued_on',
      'due_date', 'impact_on', 'associated_cost', 'renewal_period',
    ],
    globant: [],
  },
  infrastructure: {
    empresa: ['company_answer'],
    globant: ['globant_comments', 'globant_owner', 'due_date', 'additional_comments'],
  },
  it_experience: {
    empresa: ['company_answer'],
    globant: ['globant_comments', 'globant_owner', 'due_date', 'additional_comments'],
  },
  mst: {
    empresa: ['company_answer'],
    globant: ['globant_comments', 'globant_owner', 'due_date', 'additional_comments'],
  },
  building_security: {
    empresa: ['company_answer'],
    globant: [],
  },
  endpoints: {
    empresa: [
      'endpoint_id', 'user_login', 'full_name', 'gut_email', 'globant_email',
      'area', 'endpoint_type', 'manufacturer', 'model', 'serial_number',
      'rented_owned', 'processor', 'ram', 'disk_space', 'year_model',
      'operative_system', 'supports_windows_11', 'supports_ventura_above',
      'reimage_replace', 'comments_onboard', 'mac_big_sur_supported',
      'windows_10_supported', 'warranty_end_date', 'purchase_date', 'comments',
    ],
    globant: [],
  },
};

/* ------------------------------------------------------------------ */
/*  Sheet tabs for the UI                                              */
/* ------------------------------------------------------------------ */

/** The 6 sheet tab definitions used by the tab bar UI. */
export const SHEET_TABS = [
  { id: 'apps', label: 'Apps' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'it_experience', label: 'IT Experience' },
  { id: 'mst', label: 'MST' },
  { id: 'building_security', label: 'Building Security' },
  { id: 'compliance', label: 'Compliance and Certifications' },
  { id: 'endpoints', label: 'Endpoints' },
];

/* ------------------------------------------------------------------ */
/*  Sheet pattern mapping                                              */
/* ------------------------------------------------------------------ */

const PATTERN_MAP = {
  apps: 'inventory',
  compliance: 'inventory',
  infrastructure: 'qa-management',
  it_experience: 'qa-management',
  mst: 'qa-management',
  building_security: 'qa-simple',
  endpoints: 'inventory',
};

/**
 * Returns the rendering pattern for a given sheet.
 * @param {string} sheetId
 * @returns {'inventory'|'qa-management'|'qa-simple'|null}
 */
export function getSheetPattern(sheetId) {
  return PATTERN_MAP[sheetId] ?? null;
}

/* ------------------------------------------------------------------ */
/*  Editable columns by role                                           */
/* ------------------------------------------------------------------ */

/**
 * Determines which columns are editable vs read-only for a user role.
 * @param {string} sheetId
 * @param {string} userRole - 'empresa' | 'globant' | 'admin'
 * @returns {{ editable: string[], readOnly: string[] }}
 */
export function getEditableColumns(sheetId, userRole) {
  const def = SHEET_DEFINITIONS[sheetId];
  if (!def) return { editable: [], readOnly: [] };

  const allColumns = [...def.empresa, ...def.globant];

  if (userRole === 'admin') {
    return { editable: allColumns, readOnly: [] };
  }
  if (userRole === 'empresa') {
    return { editable: [...def.empresa], readOnly: [...def.globant] };
  }
  if (userRole === 'globant') {
    return { editable: [...def.globant], readOnly: [...def.empresa] };
  }

  return { editable: [], readOnly: allColumns };
}

/* ------------------------------------------------------------------ */
/*  Row data validation                                                */
/* ------------------------------------------------------------------ */

/**
 * Validates that row data keys are valid columns for the given sheet.
 * @param {string} sheetId
 * @param {object} rowData
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRowData(sheetId, rowData) {
  const def = SHEET_DEFINITIONS[sheetId];
  if (!def) return { valid: false, errors: [`Unknown sheet: ${sheetId}`] };

  const allColumns = new Set([...def.empresa, ...def.globant]);
  const ignored = new Set(['id', 'company_id', 'sheet_id', 'created_at', 'updated_at', 'category', 'question_id', 'phase_stage', 'type', 'question']);
  const errors = [];

  for (const key of Object.keys(rowData)) {
    if (!ignored.has(key) && !allColumns.has(key)) {
      errors.push(`Unrecognized column: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
