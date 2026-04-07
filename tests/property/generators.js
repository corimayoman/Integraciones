/**
 * Custom fast-check arbitraries for the I4G Integration Tracker domain.
 *
 * Reusable generators that produce valid domain objects for property-based tests.
 * Uses constants from js/constants.js to stay in sync with the application.
 *
 * @module generators
 */

import fc from 'fast-check';
import {
  JIRA_STATUSES,
  DASHBOARD_STATUSES,
  SEVERITIES,
  REGIONS,
  INTEGRATION_TRACKS,
  STATUS_MAP,
} from '../../js/constants.js';

/* ---------- Primitives ---------- */

/**
 * Company name — non-empty, trimmed, must not contain " - " (the separator
 * used in Theme summaries).
 */
export const companyNameArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0 && !s.includes(' - '))
  .map((s) => s.trim());

/** Acquisition year — integer in [2015, 2030]. */
export const yearArb = fc.integer({ min: 2015, max: 2030 });

/** Theme summary — "[name] - [year]" combining companyNameArb + yearArb. */
export const themeSummaryArb = fc
  .tuple(companyNameArb, yearArb)
  .map(([name, year]) => `${name} - ${year}`);

/** Track number — integer in [1, 14]. */
export const trackNumberArb = fc.integer({ min: 1, max: 14 });

/** Epic summary — "XX. Track Name" with zero-padded track number. */
export const epicSummaryArb = trackNumberArb.map(
  (n) => `${String(n).padStart(2, '0')}. Track ${n}`,
);

/** One of the 9 known Jira statuses. */
export const jiraStatusArb = fc.constantFrom(...JIRA_STATUSES);

/** Severity level — Critical | High | Medium | Low. */
export const severityArb = fc.constantFrom(...SEVERITIES);

/** Region — Americas | EMEA & New Markets. */
export const regionArb = fc.constantFrom(...REGIONS);

/** Dashboard status — one of the 5 simplified statuses. */
export const dashboardStatusArb = fc.constantFrom(...DASHBOARD_STATUSES);


/* ---------- Composite domain objects ---------- */

/**
 * Subtask — mirrors the Subtask interface from the DashboardModel.
 * { key, summary, status (mapped dashboard status), jiraStatus, assignee }
 */
export const subtaskArb = fc.record({
  key: fc.stringMatching(/^GLO586-\d{3,5}$/),
  summary: fc.string({ minLength: 1, maxLength: 80 }),
  jiraStatus: jiraStatusArb,
  assignee: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
}).map((st) => ({
  ...st,
  status: STATUS_MAP[st.jiraStatus] ?? 'No Iniciado',
}));

/**
 * TrackStatus — full track object with subtasks.
 */
export const trackStatusArb = fc.record({
  trackNumber: trackNumberArb,
  subtasks: fc.array(subtaskArb, { minLength: 0, maxLength: 10 }),
  assignee: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
}).map((t) => {
  const trackDef = INTEGRATION_TRACKS.find((tr) => tr.number === t.trackNumber);
  const closed = t.subtasks.filter((s) => s.status === 'Completado').length;
  const total = t.subtasks.length;
  const progress = total === 0 ? 0 : Math.round((closed / total) * 100);

  // Determine status from subtasks
  let status = 'No Iniciado';
  if (t.subtasks.some((s) => s.status === 'Bloqueado')) status = 'Bloqueado';
  else if (total > 0 && t.subtasks.every((s) => s.status === 'Completado')) status = 'Completado';
  else if (t.subtasks.some((s) => s.status === 'En Progreso')) status = 'En Progreso';

  return {
    trackNumber: t.trackNumber,
    trackName: trackDef ? trackDef.name : `Track ${t.trackNumber}`,
    severity: trackDef ? trackDef.severity : 'Medium',
    epicKey: `GLO586-${100 + t.trackNumber}`,
    progress,
    status,
    subtasks: t.subtasks,
    assignee: t.assignee,
    totalSubtasks: total,
    closedSubtasks: closed,
  };
});

/**
 * Company — full Company object with tracks array.
 */
export const companyArb = fc.record({
  name: companyNameArb,
  year: yearArb,
  region: regionArb,
  tracks: fc.array(trackStatusArb, { minLength: 0, maxLength: 14 }),
}).map((c) => ({
  id: `G4G-${Math.floor(Math.random() * 9000) + 1000}`,
  ...c,
  others: [],
}));

/**
 * DashboardModel — full model with companies array and metadata.
 */
export const dashboardModelArb = fc
  .array(companyArb, { minLength: 0, maxLength: 15 })
  .map((companies) => ({
    companies,
    metadata: {
      mode: 'offline',
      lastUpdated: new Date().toISOString(),
      totalIssues: companies.reduce(
        (sum, c) =>
          1 + c.tracks.length + c.tracks.reduce((s, t) => s + t.subtasks.length, 0) + sum,
        0,
      ),
    },
  }));
