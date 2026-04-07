/**
 * Hash-based Router — I4G Integration Tracker
 *
 * SPA navigation using hash fragments.
 * Routes: #/ → Matrix, #/region → Region, #/alerts → Alerts, #/company/:id → Detail
 * Unrecognized routes redirect to #/.
 *
 * Validates: Requirements 10.4
 *
 * @module router
 */

/** @type {Array<(route: object) => void>} */
const routeListeners = [];

/**
 * Route definitions with path patterns.
 * Order matters — first match wins.
 */
const ROUTES = [
  { pattern: /^#\/company\/(.+)$/, name: 'company-detail', paramName: 'id' },
  { pattern: /^#\/region$/, name: 'region' },
  { pattern: /^#\/alerts$/, name: 'alerts' },
  { pattern: /^#\/$/, name: 'matrix' },
];

const DEFAULT_HASH = '#/';

/**
 * Parse the current hash into a route object.
 * @param {string} hash
 * @returns {{ name: string, params: object }}
 */
function parseHash(hash) {
  const normalized = hash || DEFAULT_HASH;

  for (const route of ROUTES) {
    const match = normalized.match(route.pattern);
    if (match) {
      const params = {};
      if (route.paramName && match[1]) {
        params[route.paramName] = decodeURIComponent(match[1]);
      }
      return { name: route.name, params };
    }
  }

  // Unrecognized route → redirect to default
  return null;
}

/**
 * Handle hash change: parse route and notify listeners, or redirect.
 */
function handleHashChange() {
  const hash = window.location.hash || DEFAULT_HASH;
  const route = parseHash(hash);

  if (route === null) {
    // Unrecognized route → redirect
    window.location.hash = DEFAULT_HASH;
    return;
  }

  for (const cb of routeListeners) {
    try {
      cb(route);
    } catch {
      // Listener errors are swallowed
    }
  }
}

/**
 * Navigate to a hash route programmatically.
 * @param {string} hash - Target hash (e.g. '#/region', '#/company/G4G-100')
 */
export function navigate(hash) {
  window.location.hash = hash;
}

/**
 * Get the current parsed route.
 * @returns {{ name: string, params: object }}
 */
export function getCurrentRoute() {
  const hash = window.location.hash || DEFAULT_HASH;
  const route = parseHash(hash);
  if (route === null) {
    return { name: 'matrix', params: {} };
  }
  return route;
}

/**
 * Register a callback for route changes.
 * @param {(route: { name: string, params: object }) => void} callback
 */
export function onRouteChange(callback) {
  routeListeners.push(callback);
}

/**
 * Initialize the router — attach hashchange listener and trigger initial route.
 */
export function initRouter() {
  window.addEventListener('hashchange', handleHashChange);
  // Trigger initial route
  handleHashChange();
}

/**
 * Destroy the router — remove listener and clear callbacks.
 * Useful for testing.
 */
export function destroyRouter() {
  window.removeEventListener('hashchange', handleHashChange);
  routeListeners.length = 0;
}
