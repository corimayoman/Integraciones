/**
 * Compliance data client — fetches G4G compliance issues from /api/compliance.
 * @module compliance-api
 */

import { PROXY_BASE_URL } from '../constants.js';

const CACHE_KEY = 'compliance_issues_v5';
const CACHE_DATE_KEY = 'compliance_issues_date_v2';
const CACHE_TTL_MS = 5 * 60 * 1000;

let memCache = null;
let memCacheTs = 0;

export async function fetchComplianceIssues() {
  const now = Date.now();
  if (memCache && (now - memCacheTs) < CACHE_TTL_MS) return memCache;

  const res = await fetch(`${PROXY_BASE_URL}/api/compliance`);
  if (!res.ok) throw new Error(`Compliance fetch failed (${res.status})`);

  const data = await res.json();
  const issues = data.issues ?? [];

  memCache = issues;
  memCacheTs = Date.now();

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(issues));
    localStorage.setItem(CACHE_DATE_KEY, new Date().toISOString());
  } catch {
    // QuotaExceededError — skip
  }

  return issues;
}

export function loadComplianceCachedIssues() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getComplianceCacheDate() {
  return localStorage.getItem(CACHE_DATE_KEY) || null;
}

export function clearComplianceCache() {
  memCache = null;
  memCacheTs = 0;
}
