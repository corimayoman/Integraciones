/**
 * Custom fast-check arbitraries for the Data Collection module.
 *
 * Reusable generators that produce valid domain objects for property-based tests.
 * Mirrors the schema and constraints from proxy/dc-database.js and js/business/sheet-logic.js.
 *
 * @module dc-generators
 */

import fc from 'fast-check';

/* ---------- Primitives ---------- */

/** Company name — non-empty string 1-100 chars. */
export const dcCompanyNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim().slice(0, 100));

/** Username — alphanumeric 3-30 chars starting with a letter. */
export const dcUsernameArb = fc
  .tuple(
    fc.stringMatching(/^[a-zA-Z]$/),
    fc.stringMatching(/^[a-zA-Z0-9]{2,29}$/)
  )
  .map(([first, rest]) => first + rest);

/** Password — string 8-72 chars. */
export const dcPasswordArb = fc.string({ minLength: 8, maxLength: 72 }).filter((s) => s.length >= 8);

/** Assignment role — 'empresa' or 'globant'. */
export const dcRoleArb = fc.constantFrom('empresa', 'globant');

/** Sheet ID — one of the 7 valid sheet identifiers. */
export const dcSheetIdArb = fc.constantFrom('apps', 'compliance', 'infrastructure', 'it_experience', 'mst', 'building_security', 'endpoints');

/** Inventory sheet IDs. */
export const dcInventorySheetIdArb = fc.constantFrom('apps', 'compliance', 'endpoints');

/** Questionnaire sheet IDs. */
export const dcQuestionnaireSheetIdArb = fc.constantFrom('infrastructure', 'it_experience', 'mst', 'building_security');

/* ---------- Row generators ---------- */

/** Optional text field helper. */
const optText = () => fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: undefined });

/** Apps row — record with apps columns (all optional text fields). */
export const dcAppsRowArb = fc.record({
  app_id: optText(),
  manufacturer: optText(),
  app_name: optText(),
  used_for: optText(),
  license_group: optText(),
  license_level: optText(),
  owner: optText(),
  project_or_corporate: optText(),
  globant_studio: optText(),
  gist_approval: optText(),
  action: optText(),
  comments: optText(),
}).map((r) => {
  // Remove undefined keys
  const clean = {};
  for (const [k, v] of Object.entries(r)) {
    if (v !== undefined) clean[k] = v;
  }
  return clean;
});

/** Compliance row — record with compliance columns. */
export const dcComplianceRowArb = fc.record({
  norm_certification: optText(),
  scope: optText(),
  issued_by: optText(),
  issued_on: optText(),
  due_date: optText(),
  impact_on: optText(),
  associated_cost: optText(),
  renewal_period: optText(),
}).map((r) => {
  const clean = {};
  for (const [k, v] of Object.entries(r)) {
    if (v !== undefined) clean[k] = v;
  }
  return clean;
});

/** Questionnaire row — record with questionnaire columns (question required). */
export const dcQuestionnaireRowArb = fc.record({
  question: fc.string({ minLength: 1, maxLength: 100 }),
  category: optText(),
  question_id: optText(),
  phase_stage: optText(),
  type: optText(),
  company_answer: optText(),
  globant_comments: optText(),
  globant_owner: optText(),
  due_date: optText(),
  additional_comments: optText(),
}).map((r) => {
  const clean = { question: r.question };
  for (const [k, v] of Object.entries(r)) {
    if (v !== undefined) clean[k] = v;
  }
  return clean;
});

/** Endpoints row — record with endpoints columns (all optional text fields). */
export const dcEndpointsRowArb = fc.record({
  endpoint_id: optText(),
  user_login: optText(),
  full_name: optText(),
  gut_email: optText(),
  globant_email: optText(),
  area: optText(),
  endpoint_type: optText(),
  manufacturer: optText(),
  model: optText(),
  serial_number: optText(),
  rented_owned: optText(),
  processor: optText(),
  ram: optText(),
  disk_space: optText(),
  year_model: optText(),
  operative_system: optText(),
  supports_windows_11: optText(),
  supports_ventura_above: optText(),
  reimage_replace: optText(),
  comments_onboard: optText(),
  mac_big_sur_supported: optText(),
  windows_10_supported: optText(),
  warranty_end_date: optText(),
  purchase_date: optText(),
  comments: optText(),
}).map((r) => {
  const clean = {};
  for (const [k, v] of Object.entries(r)) {
    if (v !== undefined) clean[k] = v;
  }
  return clean;
});

/* ---------- CSV generators ---------- */

/** Column definitions per sheet (mirrors SHEET_DEFINITIONS). */
const SHEET_COLUMNS = {
  apps: [
    'app_id', 'manufacturer', 'app_name', 'used_for', 'license_group',
    'license_level', 'num_users', 'cost_monthly', 'end_date',
    'subscription_path', 'renewal_path', 'cancellation_path',
    'information_type', 'sso', 'owner', 'project_or_corporate',
    'globant_studio', 'eligible', 'gist_approval', 'action', 'comments',
  ],
  compliance: [
    'norm_certification', 'scope', 'issued_by', 'issued_on',
    'due_date', 'impact_on', 'associated_cost', 'renewal_period',
  ],
  infrastructure: ['company_answer', 'globant_comments', 'globant_owner', 'due_date', 'additional_comments'],
  it_experience: ['company_answer', 'globant_comments', 'globant_owner', 'due_date', 'additional_comments'],
  mst: ['company_answer', 'globant_comments', 'globant_owner', 'due_date', 'additional_comments'],
  building_security: ['company_answer'],
  endpoints: [
    'endpoint_id', 'user_login', 'full_name', 'gut_email', 'globant_email',
    'area', 'endpoint_type', 'manufacturer', 'model', 'serial_number',
    'rented_owned', 'processor', 'ram', 'disk_space', 'year_model',
    'operative_system', 'supports_windows_11', 'supports_ventura_above',
    'reimage_replace', 'comments_onboard', 'mac_big_sur_supported',
    'windows_10_supported', 'warranty_end_date', 'purchase_date', 'comments',
  ],
};

/**
 * Generates a valid header array for a given sheet — a non-empty subset of the sheet's columns.
 * @param {string} sheetId
 * @returns {fc.Arbitrary<string[]>}
 */
export function dcCSVHeadersArb(sheetId) {
  const cols = SHEET_COLUMNS[sheetId];
  if (!cols) return fc.constant([]);
  return fc.subarray(cols, { minLength: 1 }).filter((arr) => arr.length > 0);
}
