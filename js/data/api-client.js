/**
 * HTTP client with resilience — retry, circuit breaker, and offline fallback.
 *
 * Validates: Requirements 1.1, 1.7, 7.1, 7.2, 7.4, 7.6, 18.2
 *
 * @module api-client
 */

import {
  PROXY_BASE_URL,
  CIRCUIT_BREAKER_CONFIG,
  RETRY_CONFIG,
} from '../constants.js';
import * as Cache from './cache.js';

/* ------------------------------------------------------------------ */
/*  Snapshot (localStorage persistence)                               */
/* ------------------------------------------------------------------ */

const SNAPSHOT_KEY = 'jira_model_snapshot_v2';
const SNAPSHOT_DATE_KEY = 'jira_snapshot_date_v2';

/**
 * Save the transformed dashboard model to localStorage.
 * Much smaller than raw issues — only keeps what the UI needs.
 * @param {object} model - DashboardModel
 */
export function saveModelSnapshot(model) {
  try {
    const slim = {
      companies: model.companies,
      metadata: { ...model.metadata, mode: 'snapshot' },
    };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(slim));
    localStorage.setItem(SNAPSHOT_DATE_KEY, new Date().toISOString());
  } catch {
    // QuotaExceededError — skip silently
  }
}

/**
 * Load the saved dashboard model from localStorage.
 * @returns {object|null} Saved model or null if none
 */
export function loadModelSnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getSnapshotDate() {
  return localStorage.getItem(SNAPSHOT_DATE_KEY) || null;
}

/* ------------------------------------------------------------------ */
/*  Internal state                                                     */
/* ------------------------------------------------------------------ */

/** Circuit Breaker state */
const circuitBreaker = {
  failures: 0,
  state: 'closed',        // 'closed' | 'open' | 'half-open'
  lastFailureTime: 0,
};

/** Connection change listeners */
const connectionListeners = [];

/** Whether we are currently in live mode */
let isLive = false;

/* ------------------------------------------------------------------ */
/*  Circuit Breaker helpers                                            */
/* ------------------------------------------------------------------ */

function recordSuccess() {
  circuitBreaker.failures = 0;
  circuitBreaker.state = 'closed';
}

function recordFailure() {
  circuitBreaker.failures += 1;
  circuitBreaker.lastFailureTime = Date.now();
  if (circuitBreaker.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    circuitBreaker.state = 'open';
  }
}

function isCircuitOpen() {
  if (circuitBreaker.state === 'closed') return false;
  if (circuitBreaker.state === 'open') {
    const elapsed = Date.now() - circuitBreaker.lastFailureTime;
    if (elapsed >= CIRCUIT_BREAKER_CONFIG.resetTimeoutMs) {
      circuitBreaker.state = 'half-open';
      return false; // allow one probe
    }
    return true;
  }
  // half-open — allow the probe
  return false;
}

/* ------------------------------------------------------------------ */
/*  Notify helpers                                                     */
/* ------------------------------------------------------------------ */

function setLive(value) {
  if (isLive !== value) {
    isLive = value;
    for (const cb of connectionListeners) {
      try { cb(isLive); } catch { /* listener errors are swallowed */ }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Fetch with timeout                                                 */
/* ------------------------------------------------------------------ */

async function fetchWithTimeout(url, options = {}, timeoutMs = RETRY_CONFIG.requestTimeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/*  Retry with exponential backoff                                     */
/* ------------------------------------------------------------------ */

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
    try {
      const res = await fetchWithTimeout(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_CONFIG.maxAttempts) {
        const backoff = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1);
        await delay(backoff);
      }
    }
  }
  throw lastError;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

const CACHE_KEY = 'rawIssues';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Open the Proxy login page in a new window to start OAuth 2.0 flow.
 */
export function login() {
  window.open(`${PROXY_BASE_URL}/auth/login`, '_blank', 'width=600,height=700');
}

/**
 * Close the OAuth session and clear cached data.
 */
export async function logout() {
  try {
    await fetchWithTimeout(`${PROXY_BASE_URL}/auth/logout`);
  } catch {
    // best-effort — proxy may be unreachable
  }
  Cache.clear();
  circuitBreaker.failures = 0;
  circuitBreaker.state = 'closed';
  setLive(false);
}

/**
 * Full auth check — validates token against Jira /myself.
 * Use after the OAuth flow to confirm the token is live.
 * @returns {Promise<{ authenticated: boolean }>}
 */
export async function checkAuth() {
  try {
    const res = await fetchWithTimeout(`${PROXY_BASE_URL}/auth/status`);
    if (!res.ok) return { authenticated: false };
    return await res.json();
  } catch {
    return { authenticated: false };
  }
}

/**
 * Lightweight session check — only reads RTDB, no Jira call.
 * Use on page load to avoid cold-start timeouts blocking auto-connect.
 * @returns {Promise<{ authenticated: boolean }>}
 */
export async function checkSession() {
  try {
    const res = await fetchWithTimeout(`${PROXY_BASE_URL}/auth/session`);
    if (!res.ok) return { authenticated: false };
    return await res.json();
  } catch {
    return { authenticated: false };
  }
}

/**
 * Fetch raw Jira issues with retry + circuit breaker.
 * Falls back to offline data when the circuit is open.
 * @returns {Promise<any[]>} Array of JiraIssue objects
 */
export async function fetchRawIssues() {
  // Check cache first
  const cached = Cache.get(CACHE_KEY, CACHE_TTL);
  if (cached) return cached;

  // Circuit breaker open → return empty (model snapshot handled at app level)
  if (isCircuitOpen()) {
    setLive(false);
    return [];
  }

  try {
    const res = await fetchWithRetry(`${PROXY_BASE_URL}/api/raw`);
    const data = await res.json();
    const issues = data.issues ?? [];

    recordSuccess();
    Cache.set(CACHE_KEY, issues);
    setLive(true);
    return issues;
  } catch (err) {
    recordFailure();

    if (isCircuitOpen()) {
      setLive(false);
    }

    // Fallback to empty — model snapshot is loaded at app level
    return [];
  }
}

/**
 * Register a listener for connection state changes.
 * @param {(isLive: boolean) => void} callback
 */
export function onConnectionChange(callback) {
  connectionListeners.push(callback);
}

/* ------------------------------------------------------------------ */
/*  Exports for testing                                                */
/* ------------------------------------------------------------------ */

/**
 * Clear the in-memory cache so the next fetchRawIssues() hits Jira.
 */
export function clearCache() {
  Cache.clear();
  circuitBreaker.failures = 0;
  circuitBreaker.state = 'closed';
}

export const _internals = {
  circuitBreaker,
  resetState() {
    circuitBreaker.failures = 0;
    circuitBreaker.state = 'closed';
    circuitBreaker.lastFailureTime = 0;
    connectionListeners.length = 0;
    isLive = false;
    Cache.clear();
  },
};
