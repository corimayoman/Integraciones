/**
 * Transformer — Jira raw issues → Dashboard hierarchical model.
 *
 * Converts flat JiraIssue[] from /api/raw into a DashboardModel
 * with Company → TrackStatus → Subtask hierarchy.
 *
 * Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 8.1, 8.2, 8.3, 8.4, 8.5
 *
 * @module transformer
 */

import {
  INTEGRATION_TRACKS,
  STATUS_MAP,
  REGION_MAP,
  DEFAULT_REGION,
} from '../constants.js';

/**
 * Extract company name and year from a Theme summary.
 * Expected pattern: "[Name] - [Year]"
 * If no match, returns full summary as name and year = null.
 *
 * @param {string} summary
 * @returns {{ name: string, year: number | null }}
 */
export function parseCompanySummary(summary) {
  const match = summary.match(/^(.+?)\s*-\s*(\d{4})$/);
  if (match) {
    return { name: match[1].trim(), year: Number(match[2]) };
  }
  return { name: summary, year: null };
}

/**
 * Extract track number from an Epic summary prefix "XX.".
 * Valid range: 01-14. Returns null if no match or out of range.
 *
 * @param {string} summary
 * @returns {number | null}
 */
export function parseTrackNumber(summary) {
  const match = summary.match(/^(\d{2})\.\s/);
  if (!match) return null;
  const num = Number(match[1]);
  if (num < 1 || num > 14) return null;
  return num;
}

/**
 * Map a Jira status string to a simplified Dashboard status.
 * Unknown statuses default to "No Iniciado".
 *
 * @param {string} jiraStatus
 * @returns {string}
 */
export function mapJiraStatus(jiraStatus) {
  return STATUS_MAP[jiraStatus] ?? 'No Iniciado';
}

/**
 * Calculate track progress as percentage of closed subtasks.
 * Empty list returns 0. Result is rounded to nearest integer.
 *
 * @param {Array<{ status: string }>} subtasks - Subtask objects with mapped Dashboard status
 * @returns {number} 0-100
 */
export function calculateTrackProgress(subtasks) {
  if (subtasks.length === 0) return 0;
  const closed = subtasks.filter((s) => s.status === 'Completado').length;
  return Math.round((closed / subtasks.length) * 100);
}

/**
 * Determine overall track status from its subtasks.
 * Priority: Bloqueado > Completado > En Progreso > No Iniciado.
 *
 * - If any subtask is "Bloqueado" → "Bloqueado"
 * - If all subtasks are "Completado" → "Completado"
 * - If any subtask is "En Progreso" → "En Progreso"
 * - Otherwise → "No Iniciado"
 *
 * Empty list → "No Iniciado"
 *
 * @param {Array<{ status: string }>} subtasks
 * @returns {string}
 */
export function determineTrackStatus(subtasks) {
  if (subtasks.length === 0) return 'No Iniciado';
  if (subtasks.some((s) => s.status === 'Bloqueado')) return 'Bloqueado';
  if (subtasks.every((s) => s.status === 'Completado')) return 'Completado';
  if (subtasks.some((s) => s.status === 'En Progreso')) return 'En Progreso';
  return 'No Iniciado';
}

/**
 * Build the hierarchical DashboardModel from raw Jira issues.
 *
 * Steps:
 * 1. Classify issues by type (Theme, Epic, Sub-task)
 * 2. For each Theme → create Company
 * 3. For each Epic under a Theme → parse track number, build TrackStatus
 * 4. For each Sub-task under an Epic → build Subtask
 * 5. Calculate progress and status per track
 * 6. Assign region from REGION_MAP
 *
 * @param {Array<object>} rawIssues - JiraIssue[] from /api/raw
 * @returns {object} DashboardModel
 */
export function transformJiraData(rawIssues) {
  // Classify issues by type
  const themes = [];
  const epics = [];
  const subtasks = [];

  for (const issue of rawIssues) {
    const type = issue.fields.issuetype.name;
    if (type === 'Theme') themes.push(issue);
    else if (type === 'Epic') epics.push(issue);
    else if (type === 'Sub-task') subtasks.push(issue);
  }

  // Index epics by parent key (Theme key)
  const epicsByParent = new Map();
  for (const epic of epics) {
    const parentKey = epic.fields.parent?.key;
    if (!parentKey) continue;
    if (!epicsByParent.has(parentKey)) epicsByParent.set(parentKey, []);
    epicsByParent.get(parentKey).push(epic);
  }

  // Index subtasks by parent key (Epic key)
  const subtasksByParent = new Map();
  for (const st of subtasks) {
    const parentKey = st.fields.parent?.key;
    if (!parentKey) continue;
    if (!subtasksByParent.has(parentKey)) subtasksByParent.set(parentKey, []);
    subtasksByParent.get(parentKey).push(st);
  }

  // Build companies from themes
  const companies = themes.map((theme) => {
    const { name, year } = parseCompanySummary(theme.fields.summary);
    const region = REGION_MAP[name] ?? DEFAULT_REGION;
    const companyEpics = epicsByParent.get(theme.key) ?? [];

    const tracks = [];
    const others = [];

    for (const epic of companyEpics) {
      const trackNum = parseTrackNumber(epic.fields.summary);

      if (trackNum === null) {
        // Epic doesn't match a valid track → goes to others
        others.push({
          key: epic.key,
          summary: epic.fields.summary,
          status: mapJiraStatus(epic.fields.status.name),
        });
        continue;
      }

      const trackDef = INTEGRATION_TRACKS.find((t) => t.number === trackNum);
      const epicSubtasks = (subtasksByParent.get(epic.key) ?? []).map((st) => ({
        key: st.key,
        summary: st.fields.summary,
        status: mapJiraStatus(st.fields.status.name),
        jiraStatus: st.fields.status.name,
        assignee: st.fields.assignee?.displayName ?? null,
      }));

      const closedCount = epicSubtasks.filter(
        (s) => s.status === 'Completado',
      ).length;

      tracks.push({
        trackNumber: trackNum,
        trackName: trackDef ? trackDef.name : `Track ${trackNum}`,
        severity: trackDef ? trackDef.severity : 'Medium',
        epicKey: epic.key,
        progress: calculateTrackProgress(epicSubtasks),
        status: determineTrackStatus(epicSubtasks),
        subtasks: epicSubtasks,
        assignee: epic.fields.assignee?.displayName ?? null,
        totalSubtasks: epicSubtasks.length,
        closedSubtasks: closedCount,
      });
    }

    return {
      id: theme.key,
      name,
      year,
      region,
      tracks,
      others,
    };
  });

  return {
    companies,
    metadata: {
      mode: 'offline',
      lastUpdated: new Date().toISOString(),
      totalIssues: rawIssues.length,
    },
  };
}
