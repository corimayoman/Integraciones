/**
 * Compliance Transformer — raw Jira issues → Compliance Dashboard model.
 *
 * Hierarchy: Initiative → Epic → Task
 * Dimensions: SOX (5 epics), Compliance (1 epic), GIST (1 epic)
 * All epics share a single initiative: GLO220-13083 (G4G - Compliance)
 *
 * @module compliance-transformer
 */

import { STATUS_MAP } from '../constants.js';

// SOX tab: initiative epic + 4 parent tasks that define the sub-tabs
const INITIATIVE_KEY = 'GLO220-11373';

const SOX_TASK_KEYS = {
  sap:   'GLO220-11377',
  aws:   'GLO220-11383',
  glow:  'GLO220-11384',
  ssff:  'GLO220-11385',
};

// Project keys for the three offense/infrastructure sections
const PROJECT_INTERNAL  = 'GBN980';   // Internal Infrastructure
const PROJECT_EXTERNAL  = 'GL1404';   // External Infrastructure
const PROJECT_SOX_INFRA = 'GLO815X';  // SOX Infrastructure

function mapStatus(jiraStatus) {
  if (!jiraStatus) return 'No Iniciado';
  const mapped = STATUS_MAP[jiraStatus];
  if (!mapped) {
    console.warn(`[compliance] Unknown Jira status: "${jiraStatus}" (${[...jiraStatus].map(c => c.charCodeAt(0).toString(16)).join(' ')})`);
  }
  return mapped ?? 'No Iniciado';
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
    assigneeAccountId: issue.fields.assignee?.accountId ?? null,
    priority:        issue.fields.priority?.name ?? null,
    severity:        issue.fields.customfield_10124?.value ?? null,
    isVulnerability: issue.fields.issuetype?.name === 'Vulnerability',
  };
}

/**
 * Group High/Critical vulnerabilities into Open, Blocked, Closed buckets.
 * @param {Array} tasks
 * @returns {{ open, blocked, closed }} Each is { critical: number, high: number }
 */
export function groupTasksByStatus(tasks) {
  const bucket = () => ({ critical: 0, high: 0, medium: 0, low: 0, total: 0 });
  const open    = bucket();
  const blocked = bucket();
  const closed  = bucket();

  for (const task of tasks) {
    const b = task.status === 'Completado' ? closed
            : task.status === 'Bloqueado'  ? blocked
            : open;
    const level = task.severity ?? task.priority;
    if      (level === 'Critical') b.critical++;
    else if (level === 'High')     b.high++;
    else if (level === 'Medium')   b.medium++;
    else                           b.low++;
    b.total++;
  }

  return { open, blocked, closed, total: tasks.length };
}

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
/**
 * Build a section object from a flat list of tasks (no epic hierarchy needed).
 */
function buildOffenseSection(tasks) {
  return {
    tasks,
    stats:      computeStats(tasks),
    vulnGroups: groupTasksByStatus(tasks),
  };
}

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

  const sharedInitiative = buildInitiative(INITIATIVE_KEY);

  // SOX tab: group sub-tasks by their parent task key
  // Known task keys map to named dimensions; any other task/subtask under the initiative → OTHER
  const knownTaskValues = new Set(Object.values(SOX_TASK_KEYS));
  const otherItems = [];
  for (const issue of rawIssues) {
    const pk = issue.fields.parent?.key;
    if (!pk) continue;
    if (pk === INITIATIVE_KEY && !knownTaskValues.has(issue.key)) {
      // Direct child of initiative that isn't one of the 4 known tasks → OTHER item
      otherItems.push(toTask(issue));
    } else if (!knownTaskValues.has(pk)) {
      // Sub-task whose parent is a task under the initiative but not a known task → OTHER item
      const grandparent = byKey.get(pk)?.fields?.parent?.key;
      if (grandparent === INITIATIVE_KEY) otherItems.push(toTask(issue));
    }
  }

  const sox = {
    initiative: sharedInitiative,
    dimensions: {
      sap:   buildEpicEntry(SOX_TASK_KEYS.sap),
      aws:   buildEpicEntry(SOX_TASK_KEYS.aws),
      glow:  buildEpicEntry(SOX_TASK_KEYS.glow),
      ssff:  buildEpicEntry(SOX_TASK_KEYS.ssff),
      other: {
        epic:  { key: 'other', summary: 'Other', status: 'No Iniciado', duedate: null },
        tasks: otherItems,
        stats: computeStats(otherItems),
      },
    },
  };
  const allSoxTasks = Object.values(sox.dimensions).flatMap(d => d.tasks);
  sox.stats = computeStats(allSoxTasks);

  // Offense sections: flat list of issues filtered by project key and label rules.
  // GBN980 + GLO815X: Offense-Discovered-Vuln only
  // GL1404: Offense-Discovered-Vuln OR External-Pentest
  const byProject = { [PROJECT_INTERNAL]: [], [PROJECT_EXTERNAL]: [], [PROJECT_SOX_INFRA]: [] };
  for (const issue of rawIssues) {
    const pk     = issue.fields.project?.key;
    const labels = issue.fields.labels ?? [];
    if (!pk || !(pk in byProject)) continue;
    if (pk === PROJECT_EXTERNAL) {
      if (!labels.includes('Offense-Discovered-Vuln') && !labels.includes('External-Pentest')) continue;
    } else {
      if (!labels.includes('Offense-Discovered-Vuln')) continue;
    }
    byProject[pk].push(toTask(issue));
  }

  const internal  = buildOffenseSection(byProject[PROJECT_INTERNAL]);
  const external  = buildOffenseSection(byProject[PROJECT_EXTERNAL]);
  const soxInfra  = buildOffenseSection(byProject[PROJECT_SOX_INFRA]);

  return { sox, internal, external, soxInfra };
}
