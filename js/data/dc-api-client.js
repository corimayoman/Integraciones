/**
 * HTTP client for the Data Collection module.
 * Handles JWT auth, CRUD operations, and CSV import/export.
 *
 * Validates: Requirements 2.1, 2.5, 11.1, 11.2, 11.3, 11.4, 11.5
 *
 * @module dc-api-client
 */

import { PROXY_BASE_URL } from '../constants.js';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BASE_URL = `${PROXY_BASE_URL}/dc`;
const TOKEN_KEY = 'dc_token';

/* ------------------------------------------------------------------ */
/*  JWT helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * Decode a JWT payload without verifying the signature.
 * @param {string} token
 * @returns {object|null} Decoded payload or null if invalid.
 */
function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/* ------------------------------------------------------------------ */
/*  Internal fetch wrapper                                             */
/* ------------------------------------------------------------------ */

/**
 * Fetch wrapper that attaches the JWT and handles 401 responses.
 * @param {string} path - Relative path (appended to BASE_URL)
 * @param {RequestInit} [options={}]
 * @returns {Promise<any>} Parsed JSON body
 */
async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Don't fire auth-expired for login attempts — only for authenticated requests
    if (!path.startsWith('/auth/login')) {
      clearToken();
      window.dispatchEvent(new CustomEvent('dc:auth-expired'));
    }
    const body = await res.json().catch(() => ({ ok: false, error: 'Token inválido o expirado' }));
    return body;
  }

  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

/**
 * Login with credentials, stores JWT in localStorage on success.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ ok: boolean, user?: object, error?: string }>}
 */
export async function login(username, password) {
  const body = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (body.ok) {
    setToken(body.data.token);
    return { ok: true, user: body.data.user };
  }
  return { ok: false, error: body.error };
}

/** Remove JWT from localStorage. */
export function logout() {
  clearToken();
}

/**
 * Decode the stored JWT and return the user payload, or null.
 * @returns {{ id: number, username: string, role: string, exp: number }|null}
 */
export function getCurrentUser() {
  const token = getToken();
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload) return null;
  return payload;
}

/**
 * Check whether a valid (non-expired) JWT exists.
 * @returns {boolean}
 */
export function isAuthenticated() {
  const payload = getCurrentUser();
  if (!payload || !payload.exp) return false;
  return payload.exp * 1000 > Date.now();
}

/* ------------------------------------------------------------------ */
/*  Companies                                                          */
/* ------------------------------------------------------------------ */

export async function fetchCompanies() {
  return request('/companies');
}

export async function createCompany(data) {
  return request('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCompany(id, data) {
  return request(`/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCompany(id) {
  return request(`/companies/${id}`, {
    method: 'DELETE',
  });
}

/* ------------------------------------------------------------------ */
/*  Sheet data                                                         */
/* ------------------------------------------------------------------ */

export async function fetchSheetData(companyId, sheetId) {
  return request(`/companies/${companyId}/sheets/${sheetId}`);
}

export async function addRow(companyId, sheetId, data) {
  return request(`/companies/${companyId}/sheets/${sheetId}/rows`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateRow(companyId, sheetId, rowId, data) {
  return request(`/companies/${companyId}/sheets/${sheetId}/rows/${rowId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteRow(companyId, sheetId, rowId) {
  return request(`/companies/${companyId}/sheets/${sheetId}/rows/${rowId}`, {
    method: 'DELETE',
  });
}

/* ------------------------------------------------------------------ */
/*  CSV Import / Export                                                 */
/* ------------------------------------------------------------------ */

/**
 * Import parsed CSV rows into a sheet.
 * @param {number} companyId
 * @param {string} sheetId
 * @param {object[]} rows - Array of row objects (already parsed from CSV)
 * @returns {Promise<any>}
 */
export async function importCSV(companyId, sheetId, rows) {
  return request(`/import/${companyId}/${sheetId}`, {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}

/**
 * Export sheet data as JSON rows.
 * @param {number} companyId
 * @param {string} sheetId
 * @returns {Promise<any>}
 */
export async function exportCSV(companyId, sheetId) {
  return request(`/export/${companyId}/${sheetId}`);
}

/* ------------------------------------------------------------------ */
/*  Admin — Users                                                      */
/* ------------------------------------------------------------------ */

export async function fetchUsers() {
  return request('/users');
}

export async function createUser(data) {
  return request('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(id, data) {
  return request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/* ------------------------------------------------------------------ */
/*  Admin — Assignments                                                */
/* ------------------------------------------------------------------ */

export async function fetchAssignments(userId) {
  return request(`/users/${userId}/assignments`);
}

export async function createAssignment(data) {
  return request('/assignments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAssignment(id) {
  return request(`/assignments/${id}`, {
    method: 'DELETE',
  });
}

/* ------------------------------------------------------------------ */
/*  Exports for testing                                                */
/* ------------------------------------------------------------------ */

export const _internals = {
  BASE_URL,
  TOKEN_KEY,
  decodeToken,
  getToken,
  setToken,
  clearToken,
};
