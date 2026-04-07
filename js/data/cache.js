/**
 * In-memory cache with TTL support.
 * Validates: Requirement 18.3
 *
 * @module cache
 */

/** @type {Map<string, { data: any, timestamp: number }>} */
const store = new Map();

/**
 * Store data with the current timestamp.
 * @param {string} key
 * @param {any} data
 */
export function set(key, data) {
  store.set(key, { data, timestamp: Date.now() });
}

/**
 * Retrieve data if it hasn't expired.
 * @param {string} key
 * @param {number} maxAgeMs - Maximum age in milliseconds
 * @returns {any|null} The cached data, or null if missing/expired
 */
export function get(key, maxAgeMs) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp >= maxAgeMs) return null;
  return entry.data;
}

/**
 * Clear all cached entries.
 */
export function clear() {
  store.clear();
}
