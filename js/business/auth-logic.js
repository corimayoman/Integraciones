/**
 * JWT token management for the Data Collection module frontend.
 * Handles storage, retrieval, decoding, and expiration checking.
 *
 * Validates: Requirements 2.1, 2.5
 *
 * @module auth-logic
 */

const TOKEN_KEY = 'dc_token';

/* ------------------------------------------------------------------ */
/*  Storage                                                            */
/* ------------------------------------------------------------------ */

/**
 * Store a JWT token in localStorage.
 * @param {string} token
 */
export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Retrieve the stored JWT token from localStorage.
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Remove the JWT token from localStorage.
 */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/* ------------------------------------------------------------------ */
/*  Decoding                                                           */
/* ------------------------------------------------------------------ */

/**
 * Decode a JWT payload without verifying the signature.
 * Uses base64 decoding of the middle segment.
 * @param {string} token
 * @returns {object|null} Decoded payload or null if invalid.
 */
export function decodeTokenPayload(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Handle URL-safe base64
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Expiration                                                         */
/* ------------------------------------------------------------------ */

/**
 * Check whether a JWT token is expired.
 * @param {string} token
 * @returns {boolean} true if expired or invalid, false if still valid.
 */
export function isTokenExpired(token) {
  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= Date.now();
}

/**
 * Check whether a valid (non-expired) JWT exists in localStorage.
 * @returns {boolean}
 */
export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  return !isTokenExpired(token);
}

/**
 * Get the current user from the stored JWT, or null if not authenticated.
 * @returns {{ id: number, username: string, role: string, exp: number }|null}
 */
export function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  if (isTokenExpired(token)) return null;
  return decodeTokenPayload(token);
}
