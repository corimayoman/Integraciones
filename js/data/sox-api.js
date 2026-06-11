/**
 * SOX Controls — API client
 * Fetches control execution data from the /api/sox Firebase Function.
 * Persists the last successful response to localStorage for offline use.
 */

const BASE = '';
const CACHE_KEY      = 'sox_data_v1';
const CACHE_DATE_KEY = 'sox_data_date_v1';

/** In-memory cache to avoid redundant fetches within a session */
let memCache   = null;
let memCacheTs = 0;
const MEM_TTL_MS = 5 * 60 * 1000; // 5 min

/**
 * Fetch SOX controls data from the backend.
 * Uses in-memory cache for the first 5 minutes, then re-fetches.
 * Persists response to localStorage for offline use.
 * @returns {Promise<{controls, monthlyData, monthlyLinks, months, monthLabels}>}
 */
export async function fetchSOXControls() {
  const now = Date.now();
  if (memCache && (now - memCacheTs) < MEM_TTL_MS) return memCache;

  const res = await fetch(`${BASE}/api/sox`, { signal: AbortSignal.timeout(60000) });
  if (res.status === 401) throw new Error('NOT_AUTHENTICATED');
  if (!res.ok) throw new Error(`SOX fetch failed (${res.status})`);

  const data = await res.json();

  memCache   = data;
  memCacheTs = Date.now();

  try {
    localStorage.setItem(CACHE_KEY,      JSON.stringify(data));
    localStorage.setItem(CACHE_DATE_KEY, new Date().toISOString());
  } catch {
    // QuotaExceededError — skip
  }

  return data;
}

/**
 * Load the last persisted SOX data from localStorage.
 * Returns null if nothing has been cached yet.
 */
export function loadSOXCachedData() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * ISO date string of the last successful fetch, or null.
 */
export function getSOXCacheDate() {
  return localStorage.getItem(CACHE_DATE_KEY) || null;
}

/**
 * Clear in-memory cache (e.g. before a forced refresh).
 * localStorage snapshot is kept intentionally for offline use.
 */
export function clearSOXCache() {
  memCache   = null;
  memCacheTs = 0;
}
