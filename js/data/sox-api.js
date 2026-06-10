/**
 * SOX Controls — API client
 * Fetches control execution data from the /api/sox Firebase Function.
 */

const BASE = '';

/**
 * Fetch SOX controls data from the backend.
 * @returns {Promise<{controls, monthlyData, monthlyLinks, months, monthLabels}>}
 */
export async function fetchSOXControls() {
  const res = await fetch(`${BASE}/api/sox`, { signal: AbortSignal.timeout(60000) });
  if (res.status === 401) throw new Error('NOT_AUTHENTICATED');
  if (!res.ok) throw new Error(`SOX fetch failed (${res.status})`);
  return res.json();
}
