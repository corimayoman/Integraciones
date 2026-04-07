/**
 * Presentation utilities — I4G Integration Tracker
 *
 * Pure functions for sanitization, color mapping, tooltip generation,
 * sorting, grouping, and view state management.
 *
 * Validates: Requirements 18.4, 2.2, 2.3, 2.4, 9.1, 9.4, 17.6
 *
 * @module presentation-utils
 */

/**
 * Neutralize dangerous HTML characters.
 * Idempotent for strings that contain no dangerous characters.
 *
 * @param {string} str
 * @returns {string}
 */
export function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Return CSS class name for a track status.
 *
 * @param {string} trackStatus - Dashboard status
 * @returns {string} CSS class name
 */
export function getCellColor(trackStatus) {
  const map = {
    'No Iniciado': 'status-not-started',
    'En Progreso': 'status-in-progress',
    'Completado': 'status-completed',
    'Bloqueado': 'status-blocked',
    'Rechazado': 'status-rejected',
  };
  return map[trackStatus] ?? '';
}

/**
 * Return CSS class name for a severity level.
 *
 * @param {string} severity
 * @returns {string} CSS class name
 */
export function getSeverityColor(severity) {
  const map = {
    'Critical': 'severity-critical',
    'High': 'severity-high',
    'Medium': 'severity-medium',
    'Low': 'severity-low',
  };
  return map[severity] ?? '';
}

/**
 * Generate tooltip text for a matrix cell.
 * Format: "TrackName\nProgress% (closed/total)"
 *
 * @param {{ trackName: string, progress: number, closedSubtasks: number, totalSubtasks: number }} track
 * @returns {string}
 */
export function getTooltipContent(track) {
  const name = track.trackName ?? '';
  const progress = track.progress ?? 0;
  const closed = track.closedSubtasks ?? 0;
  const total = track.totalSubtasks ?? 0;
  return `${name}\n${progress}% (${closed}/${total})`;
}

/**
 * Sort companies by year descending (most recent first).
 * Stable sort: companies with the same year preserve original order.
 * Returns a new array — does not mutate input.
 *
 * @param {Array<{ year: number | null }>} companies
 * @returns {Array}
 */
export function sortCompaniesByYear(companies) {
  return [...companies].sort((a, b) => {
    const yearA = a.year ?? 0;
    const yearB = b.year ?? 0;
    return yearB - yearA;
  });
}

/**
 * Group companies by region with aggregated metrics.
 *
 * @param {Array<{ region: string, tracks: Array<{ progress: number, status: string }> }>} companies
 * @returns {Object} Map of region → { companies, avgCompletion, blockedTracks }
 */
export function groupByRegion(companies) {
  const groups = {};

  for (const company of companies) {
    const region = company.region ?? 'Americas';
    if (!groups[region]) {
      groups[region] = { companies: [], avgCompletion: 0, blockedTracks: 0 };
    }
    groups[region].companies.push(company);
  }

  for (const region of Object.keys(groups)) {
    const group = groups[region];
    let totalProgress = 0;
    let trackCount = 0;
    let blocked = 0;

    for (const company of group.companies) {
      for (const track of company.tracks ?? []) {
        totalProgress += track.progress ?? 0;
        trackCount++;
        if (track.status === 'Bloqueado') blocked++;
      }
    }

    group.avgCompletion = trackCount > 0 ? totalProgress / trackCount : 0;
    group.blockedTracks = blocked;
  }

  return groups;
}

/* ------------------------------------------------------------------ */
/*  ViewState — simple state machine                                   */
/* ------------------------------------------------------------------ */

/**
 * Create initial view state (loading).
 * @returns {{ state: string }}
 */
export function createViewState() {
  return { state: 'loading' };
}

/**
 * Transition view state to loading.
 * @param {object} vs - view state object (mutated in place)
 * @returns {object} the same vs reference
 */
export function setLoading(vs) {
  vs.state = 'loading';
  return vs;
}

/**
 * Transition view state to loaded or empty depending on data.
 * @param {object} vs - view state object
 * @param {any} data - the loaded data (array or object)
 * @returns {object}
 */
export function setLoaded(vs, data) {
  const isEmpty = data == null
    || (Array.isArray(data) && data.length === 0)
    || (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0);
  vs.state = isEmpty ? 'empty' : 'loaded';
  vs.data = data;
  return vs;
}

/**
 * Transition view state to error.
 * @param {object} vs - view state object
 * @param {string|Error} error
 * @returns {object}
 */
export function setError(vs, error) {
  vs.state = 'error';
  vs.error = typeof error === 'string' ? error : (error?.message ?? 'Unknown error');
  return vs;
}
