/**
 * Hardcoded fallback data for offline mode.
 * Structure matches the /api/raw Proxy response (JiraIssue[]).
 * Includes ~5 companies with tracks in various states.
 *
 * Validates: Requirements 7.3, 7.5
 *
 * @module offline-data
 */

/* ---------- helpers ---------- */

const PROJECT = { key: 'GLO586' };

let seq = 1000;
const nextKey = () => `GLO586-${seq++}`;

function theme(key, summary) {
  return {
    key,
    fields: {
      summary,
      status: { name: 'Open' },
      issuetype: { name: 'Theme' },
      priority: { name: 'Medium' },
      labels: ['AcquiredCompanies'],
      components: [{ name: 'i4g_IST&SEC' }],
      assignee: null,
      created: '2025-01-10T10:00:00.000Z',
      updated: '2025-06-01T12:00:00.000Z',
      project: { key: 'G4G' },
    },
  };
}

function epic(key, summary, parentKey, parentSummary, status, assignee) {
  return {
    key,
    fields: {
      summary,
      status: { name: status },
      issuetype: { name: 'Epic' },
      priority: { name: 'Medium' },
      labels: [],
      components: [{ name: 'I4G - New Integration' }],
      parent: { key: parentKey, fields: { summary: parentSummary } },
      assignee: assignee ? { displayName: assignee } : null,
      created: '2025-01-15T10:00:00.000Z',
      updated: '2025-06-01T12:00:00.000Z',
      project: PROJECT,
    },
  };
}

function subtask(key, summary, parentKey, status, assignee) {
  return {
    key,
    fields: {
      summary,
      status: { name: status },
      issuetype: { name: 'Sub-task' },
      priority: { name: 'Medium' },
      labels: [],
      components: [{ name: 'I4G - New Integration' }],
      parent: { key: parentKey },
      assignee: assignee ? { displayName: assignee } : null,
      created: '2025-02-01T10:00:00.000Z',
      updated: '2025-06-01T12:00:00.000Z',
      project: PROJECT,
    },
  };
}

/* ---------- Company 1: Omni Pro — mostly completed ---------- */

const omniTheme = theme('G4G-100', 'Omni Pro - 2025');

const omniEpic01 = epic('GLO586-101', '01. Kick Off Integration', 'G4G-100', 'Omni Pro - 2025', 'Closed', 'Ana García');
const omniEpic02 = epic('GLO586-102', '02. Initial Package', 'G4G-100', 'Omni Pro - 2025', 'Closed', 'Ana García');
const omniEpic03 = epic('GLO586-103', '03. E-mail & Drives Migration', 'G4G-100', 'Omni Pro - 2025', 'In Progress', 'Carlos López');
const omniEpic08 = epic('GLO586-108', '08. Acquired Infra IT Offices', 'G4G-100', 'Omni Pro - 2025', 'Blocked', 'Carlos López');

const omniSubs = [
  subtask('GLO586-201', 'Schedule kick-off meeting', 'GLO586-101', 'Closed', 'Ana García'),
  subtask('GLO586-202', 'Define integration scope', 'GLO586-101', 'Closed', 'Ana García'),
  subtask('GLO586-203', 'Prepare initial package docs', 'GLO586-102', 'Closed', 'Ana García'),
  subtask('GLO586-204', 'Review initial package', 'GLO586-102', 'Closed', 'Pedro Ruiz'),
  subtask('GLO586-205', 'Migrate mailboxes', 'GLO586-103', 'Closed', 'Carlos López'),
  subtask('GLO586-206', 'Migrate shared drives', 'GLO586-103', 'In Progress', 'Carlos López'),
  subtask('GLO586-207', 'Validate email routing', 'GLO586-103', 'Open', null),
  subtask('GLO586-208', 'Inventory office infrastructure', 'GLO586-108', 'Blocked', 'Carlos López'),
  subtask('GLO586-209', 'Plan network migration', 'GLO586-108', 'Open', null),
];

/* ---------- Company 2: Adbid — in progress ---------- */

const adbidTheme = theme('G4G-200', 'Adbid - 2025');

const adbidEpic01 = epic('GLO586-301', '01. Kick Off Integration', 'G4G-200', 'Adbid - 2025', 'Closed', 'María Torres');
const adbidEpic05 = epic('GLO586-305', '05. Application Integration', 'G4G-200', 'Adbid - 2025', 'In Progress', 'María Torres');
const adbidEpic12 = epic('GLO586-312', '12. Compliance', 'G4G-200', 'Adbid - 2025', 'Open', null);

const adbidSubs = [
  subtask('GLO586-401', 'Schedule kick-off meeting', 'GLO586-301', 'Closed', 'María Torres'),
  subtask('GLO586-402', 'Define integration scope', 'GLO586-301', 'Closed', 'María Torres'),
  subtask('GLO586-403', 'Inventory applications', 'GLO586-305', 'Closed', 'María Torres'),
  subtask('GLO586-404', 'Plan application migration', 'GLO586-305', 'In Progress', 'María Torres'),
  subtask('GLO586-405', 'Execute application migration', 'GLO586-305', 'Open', null),
  subtask('GLO586-406', 'Review compliance requirements', 'GLO586-312', 'Open', null),
  subtask('GLO586-407', 'Prepare compliance documentation', 'GLO586-312', 'Open', null),
];

/* ---------- Company 3: Grupo ASSA — blocked on critical track ---------- */

const assaTheme = theme('G4G-300', 'Grupo ASSA - 2024');

const assaEpic01 = epic('GLO586-501', '01. Kick Off Integration', 'G4G-300', 'Grupo ASSA - 2024', 'Closed', 'Luis Méndez');
const assaEpic04 = epic('GLO586-504', '04. IT Experience Integration (Endpoints)', 'G4G-300', 'Grupo ASSA - 2024', 'Blocked', 'Luis Méndez');
const assaEpic09 = epic('GLO586-509', '09. Acquired Infra IT DCs', 'G4G-300', 'Grupo ASSA - 2024', 'In Progress', 'Luis Méndez');

const assaSubs = [
  subtask('GLO586-601', 'Schedule kick-off meeting', 'GLO586-501', 'Closed', 'Luis Méndez'),
  subtask('GLO586-602', 'Define integration scope', 'GLO586-501', 'Closed', 'Luis Méndez'),
  subtask('GLO586-603', 'Inventory endpoints', 'GLO586-504', 'Closed', 'Luis Méndez'),
  subtask('GLO586-604', 'Deploy endpoint agents', 'GLO586-504', 'Blocked', 'Luis Méndez'),
  subtask('GLO586-605', 'Validate endpoint compliance', 'GLO586-504', 'Open', null),
  subtask('GLO586-606', 'Inventory data centers', 'GLO586-509', 'Closed', 'Luis Méndez'),
  subtask('GLO586-607', 'Plan DC migration', 'GLO586-509', 'In Progress', 'Luis Méndez'),
];

/* ---------- Company 4: MMS (EMEA) — early stage ---------- */

const mmsTheme = theme('G4G-400', 'MMS - 2025');

const mmsEpic01 = epic('GLO586-701', '01. Kick Off Integration', 'G4G-400', 'MMS - 2025', 'In Progress', 'Sophie Müller');
const mmsEpic03 = epic('GLO586-703', '03. E-mail & Drives Migration', 'G4G-400', 'MMS - 2025', 'Open', null);

const mmsSubs = [
  subtask('GLO586-801', 'Schedule kick-off meeting', 'GLO586-701', 'Closed', 'Sophie Müller'),
  subtask('GLO586-802', 'Define integration scope', 'GLO586-701', 'In Progress', 'Sophie Müller'),
  subtask('GLO586-803', 'Migrate mailboxes', 'GLO586-703', 'Open', null),
  subtask('GLO586-804', 'Migrate shared drives', 'GLO586-703', 'Open', null),
];

/* ---------- Company 5: Practia — fully completed ---------- */

const practiaTheme = theme('G4G-500', 'Practia - 2024');

const practiaEpic01 = epic('GLO586-901', '01. Kick Off Integration', 'G4G-500', 'Practia - 2024', 'Closed', 'Roberto Díaz');
const practiaEpic02 = epic('GLO586-902', '02. Initial Package', 'G4G-500', 'Practia - 2024', 'Closed', 'Roberto Díaz');
const practiaEpic14 = epic('GLO586-914', '14. Closure Assets Decommissioning', 'G4G-500', 'Practia - 2024', 'Closed', 'Roberto Díaz');

const practiaSubs = [
  subtask('GLO586-1001', 'Schedule kick-off meeting', 'GLO586-901', 'Closed', 'Roberto Díaz'),
  subtask('GLO586-1002', 'Define integration scope', 'GLO586-901', 'Closed', 'Roberto Díaz'),
  subtask('GLO586-1003', 'Prepare initial package docs', 'GLO586-902', 'Closed', 'Roberto Díaz'),
  subtask('GLO586-1004', 'Review initial package', 'GLO586-902', 'Closed', 'Roberto Díaz'),
  subtask('GLO586-1005', 'Decommission legacy assets', 'GLO586-914', 'Closed', 'Roberto Díaz'),
  subtask('GLO586-1006', 'Validate decommissioning', 'GLO586-914', 'Closed', 'Roberto Díaz'),
];

/* ---------- Export ---------- */

/**
 * Offline fallback issues — same structure as /api/raw response.
 * @type {import('../../js/constants.js').JiraIssue[]}
 */
export const OFFLINE_ISSUES = [
  // Themes
  omniTheme, adbidTheme, assaTheme, mmsTheme, practiaTheme,
  // Epics
  omniEpic01, omniEpic02, omniEpic03, omniEpic08,
  adbidEpic01, adbidEpic05, adbidEpic12,
  assaEpic01, assaEpic04, assaEpic09,
  mmsEpic01, mmsEpic03,
  practiaEpic01, practiaEpic02, practiaEpic14,
  // Sub-tasks
  ...omniSubs,
  ...adbidSubs,
  ...assaSubs,
  ...mmsSubs,
  ...practiaSubs,
];
