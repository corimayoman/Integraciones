/**
 * Compliance Transformer — raw Jira issues → Compliance Dashboard model.
 *
 * Hierarchy: Initiative → Epic → Task
 * Dimensions: SOX (5 epics), Compliance (1 epic), GIST (1 epic)
 *
 * @module compliance-transformer
 */

import { STATUS_MAP } from '../constants.js';

// Known keys — used to anchor the hierarchy
const INITIATIVE_KEYS = {
  sox:        'GLO220-13076',
  compliance: 'GLO220-13082',
  gist:       'GLO220-13083',
};

const SOX_EPIC_KEYS = {
  sap:  'GLO220-13077',
  ssff: 'GLO220-13080',
  glow: 'GLO220-13078',
  aws:  'GLO220-13079',
  other: 'GLO220-13081',
};

const COMPLIANCE_EPIC_KEY = 'GLO220-13086';
const GIST_EPIC_KEY       = 'GLO220-13087';

function mapStatus(jiraStatus) {
  return STATUS_MAP[jiraStatus] ?? 'No Iniciado';
}

function toTask(issue) {
  return {
    key:             issue.key,
    summary:         issue.fields.summary,
    status:          mapStatus(issue.fields.status?.name ?? ''),
    jiraStatus:      issue.fields.status?.name ?? '',
    duedate:         issue.fields.duedate ?? null,
    created:         issue.fields.created ? issue.fields.created.slice(0, 10) : null,
    assignee:        issue.fields.assignee?.displayName ?? null,
    priority:        issue.fields.priority?.name ?? null,
    isVulnerability: issue.fields.issuetype?.name === 'Vulnerability',
  };
}

/**
 * Group High/Critical vulnerabilities into Open, Blocked, Closed buckets.
 * @param {Array} tasks
 * @returns {{ open, blocked, closed }} Each is { critical: number, high: number }
 */
export function groupVulnerabilities(tasks) {
  const vulns = tasks.filter(
    t => t.isVulnerability && (t.priority === 'Critical' || t.priority === 'High')
  );

  const bucket = () => ({ critical: 0, high: 0, total: 0 });
  const open    = bucket();
  const blocked = bucket();
  const closed  = bucket();

  for (const v of vulns) {
    const b = v.status === 'Completado' ? closed
            : v.status === 'Bloqueado'  ? blocked
            : open;
    if (v.priority === 'Critical') b.critical++;
    else b.high++;
    b.total++;
  }

  return { open, blocked, closed, total: vulns.length };
}

function toEpicOrInit(issue) {
  return {
    key:     issue.key,
    summary: issue.fields.summary,
    status:  mapStatus(issue.fields.status?.name ?? ''),
    duedate: issue.fields.duedate ?? null,
  };
}

/**
 * Compute summary stats for a set of tasks.
 * @param {Array} tasks
 * @returns {{ total, completed, overdue, pctComplete, pctOnTime }}
 */
export function computeStats(tasks) {
  const today = new Date().toISOString().slice(0, 10);
  const total     = tasks.length;
  const completed = tasks.filter(t => t.status === 'Completado').length;
  const overdue   = tasks.filter(t => t.status !== 'Completado' && t.duedate && t.duedate < today).length;
  const pctComplete = total > 0 ? Math.round((completed / total) * 100) : 0;
  const notOverdue  = total - overdue;
  const pctOnTime   = total > 0 ? Math.round((notOverdue / total) * 100) : 0;

  return { total, completed, overdue, pctComplete, pctOnTime };
}

/**
 * Transform raw Jira issues into a ComplianceModel.
 *
 * @param {Array} rawIssues
 * @returns {object} ComplianceModel
 */
export function transformComplianceData(rawIssues) {
  const byKey = new Map(rawIssues.map(i => [i.key, i]));

  // Index tasks by parent key or Epic Link (customfield_10014)
  const tasksByParent = new Map();
  for (const issue of rawIssues) {
    const parentKey = issue.fields.parent?.key ?? issue.fields.customfield_10014 ?? null;
    if (!parentKey) continue;
    if (!tasksByParent.has(parentKey)) tasksByParent.set(parentKey, []);
    tasksByParent.get(parentKey).push(issue);
  }

  function buildEpicEntry(epicKey) {
    const epicIssue = byKey.get(epicKey);
    const epic      = epicIssue ? toEpicOrInit(epicIssue) : { key: epicKey, summary: epicKey, status: 'No Iniciado', duedate: null };
    const children  = tasksByParent.get(epicKey) ?? [];
    const tasks     = children.map(toTask);
    return { epic, tasks, stats: computeStats(tasks) };
  }

  function buildInitiative(key) {
    const issue = byKey.get(key);
    return issue ? toEpicOrInit(issue) : { key, summary: key, status: 'No Iniciado', duedate: null };
  }

  const sox = {
    initiative: buildInitiative(INITIATIVE_KEYS.sox),
    dimensions: {
      sap:  buildEpicEntry(SOX_EPIC_KEYS.sap),
      ssff: buildEpicEntry(SOX_EPIC_KEYS.ssff),
      glow: buildEpicEntry(SOX_EPIC_KEYS.glow),
      aws:  buildEpicEntry(SOX_EPIC_KEYS.aws),
      other: buildEpicEntry(SOX_EPIC_KEYS.other),
    },
  };

  // SOX aggregate stats (all tasks across all 5 dimensions)
  const allSoxTasks = Object.values(sox.dimensions).flatMap(d => d.tasks);
  sox.stats = computeStats(allSoxTasks);

  const compliance = {
    initiative: buildInitiative(INITIATIVE_KEYS.compliance),
    ...buildEpicEntry(COMPLIANCE_EPIC_KEY),
  };

  // GIST: merge tasks from epic children + direct children of initiative
  // (Vulnerability issues may link directly to the initiative instead of the epic)
  const gistEpicEntry = buildEpicEntry(GIST_EPIC_KEY);
  const gistInitChildren = (tasksByParent.get(INITIATIVE_KEYS.gist) ?? [])
    .filter(i => i.key !== GIST_EPIC_KEY)
    .map(toTask);
  const gistAllTasks = [...gistEpicEntry.tasks, ...gistInitChildren];

  const gist = {
    initiative: buildInitiative(INITIATIVE_KEYS.gist),
    epic: gistEpicEntry.epic,
    tasks: gistAllTasks,
    stats: computeStats(gistAllTasks),
    vulnGroups: groupVulnerabilities(gistAllTasks),
  };

  return { sox, compliance, gist };
}
