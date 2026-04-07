/**
 * Alerts — Delayed track detector for the Dashboard model.
 *
 * Identifies tracks with severity Critical/High that have at least one
 * subtask with status "Bloqueado" or "Rechazado".
 *
 * Validates: Requirements 6.1, 6.2, 6.3
 *
 * @module alerts
 */

/**
 * Detect delayed tracks: Critical/High severity tracks with at least one
 * subtask that is "Bloqueado" or "Rechazado".
 *
 * Returns one alert per blocking/rejected subtask found in qualifying tracks.
 *
 * @param {object} model - DashboardModel
 * @returns {Array<{
 *   companyId: string,
 *   companyName: string,
 *   trackNumber: number,
 *   trackName: string,
 *   severity: string,
 *   blockingSubtask: { key: string, summary: string, status: string }
 * }>}
 */
export function detectDelayedTracks(model) {
  const alerts = [];
  const qualifyingSeverities = new Set(['Critical', 'High']);
  const blockingStatuses = new Set(['Bloqueado', 'Rechazado']);

  for (const company of model.companies) {
    for (const track of company.tracks) {
      if (!qualifyingSeverities.has(track.severity)) continue;

      for (const subtask of track.subtasks) {
        if (blockingStatuses.has(subtask.status)) {
          alerts.push({
            companyId: company.id,
            companyName: company.name,
            trackNumber: track.trackNumber,
            trackName: track.trackName,
            severity: track.severity,
            blockingSubtask: {
              key: subtask.key,
              summary: subtask.summary,
              status: subtask.status,
            },
          });
        }
      }
    }
  }

  return alerts;
}
