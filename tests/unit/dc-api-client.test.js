/**
 * Unit tests for js/data/dc-api-client.js
 * Validates: Requirements 2.1, 2.5, 11.1, 11.2, 11.3, 11.4, 11.5
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  fetchCompanies,
  fetchSheetData,
  addRow,
  updateRow,
  deleteRow,
  importCSV,
  exportCSV,
  fetchUsers,
  createUser,
  updateUser,
  fetchAssignments,
  createAssignment,
  deleteAssignment,
  _internals,
} from '../../js/data/dc-api-client.js';

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Minimal localStorage mock
const store = {};
const localStorageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = String(val); }),
  removeItem: vi.fn((key) => { delete store[key]; }),
};
vi.stubGlobal('localStorage', localStorageMock);

// Track dispatched events
const dispatchedEvents = [];
const origDispatch = window.dispatchEvent?.bind(window) ?? (() => {});
vi.spyOn(window, 'dispatchEvent').mockImplementation((e) => {
  dispatchedEvents.push(e);
  return true;
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Build a fake JWT with the given payload. */
function fakeJWT(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

function jsonResponse(status, body) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  });
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('dc-api-client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    Object.keys(store).forEach((k) => delete store[k]);
    dispatchedEvents.length = 0;
  });

  // ---- Auth ----

  describe('login', () => {
    it('stores JWT and returns user on success', async () => {
      const token = fakeJWT({ id: 1, username: 'admin', role: 'admin', exp: 9999999999 });
      mockFetch.mockReturnValueOnce(
        jsonResponse(200, { ok: true, data: { token, user: { id: 1, username: 'admin' } } }),
      );

      const result = await login('admin', 'pass');
      expect(result).toEqual({ ok: true, user: { id: 1, username: 'admin' } });
      expect(localStorageMock.setItem).toHaveBeenCalledWith('dc_token', token);
    });

    it('returns error on invalid credentials', async () => {
      mockFetch.mockReturnValueOnce(
        jsonResponse(401, { ok: false, error: 'Credenciales inválidas' }),
      );

      const result = await login('bad', 'creds');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Credenciales inválidas');
    });
  });

  describe('logout', () => {
    it('removes JWT from localStorage', () => {
      store.dc_token = 'some-token';
      logout();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('dc_token');
    });
  });

  describe('getCurrentUser', () => {
    it('returns decoded payload when token exists', () => {
      const payload = { id: 5, username: 'user1', role: 'admin', exp: 9999999999 };
      store.dc_token = fakeJWT(payload);
      const user = getCurrentUser();
      expect(user).toMatchObject({ id: 5, username: 'user1', role: 'admin' });
    });

    it('returns null when no token', () => {
      expect(getCurrentUser()).toBeNull();
    });

    it('returns null for malformed token', () => {
      store.dc_token = 'not.a.valid.jwt.at.all';
      expect(getCurrentUser()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('returns true for non-expired token', () => {
      store.dc_token = fakeJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
      expect(isAuthenticated()).toBe(true);
    });

    it('returns false for expired token', () => {
      store.dc_token = fakeJWT({ exp: Math.floor(Date.now() / 1000) - 60 });
      expect(isAuthenticated()).toBe(false);
    });

    it('returns false when no token', () => {
      expect(isAuthenticated()).toBe(false);
    });
  });

  // ---- 401 handling ----

  describe('401 handling', () => {
    it('clears token and dispatches dc:auth-expired on 401', async () => {
      store.dc_token = fakeJWT({ id: 1, exp: 9999999999 });
      mockFetch.mockReturnValueOnce(
        jsonResponse(401, { ok: false, error: 'Token inválido o expirado' }),
      );

      await fetchCompanies();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('dc_token');
      expect(dispatchedEvents.some((e) => e.type === 'dc:auth-expired')).toBe(true);
    });
  });

  // ---- Companies ----

  describe('fetchCompanies', () => {
    it('sends GET with Authorization header', async () => {
      store.dc_token = 'mytoken';
      mockFetch.mockReturnValueOnce(
        jsonResponse(200, { ok: true, data: [{ id: 1, name: 'Acme' }] }),
      );

      const result = await fetchCompanies();
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/companies'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer mytoken' }),
        }),
      );
    });
  });

  // ---- Sheet data ----

  describe('sheet data CRUD', () => {
    beforeEach(() => {
      store.dc_token = 'tok';
    });

    it('fetchSheetData sends correct path', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(200, { ok: true, data: [] }));
      await fetchSheetData(1, 'apps');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/companies/1/sheets/apps'),
        expect.any(Object),
      );
    });

    it('addRow sends POST', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(201, { ok: true, data: { id: 10 } }));
      const result = await addRow(1, 'apps', { app_name: 'Test' });
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/companies/1/sheets/apps/rows'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('updateRow sends PUT', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(200, { ok: true, data: { id: 10 } }));
      await updateRow(1, 'apps', 10, { app_name: 'Updated' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/companies/1/sheets/apps/rows/10'),
        expect.objectContaining({ method: 'PUT' }),
      );
    });

    it('deleteRow sends DELETE', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(200, { ok: true, data: { deleted: true } }));
      await deleteRow(1, 'apps', 10);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/companies/1/sheets/apps/rows/10'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  // ---- CSV ----

  describe('CSV import/export', () => {
    beforeEach(() => { store.dc_token = 'tok'; });

    it('importCSV sends POST with rows', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(200, { ok: true, data: { imported: 3 } }));
      const result = await importCSV(1, 'apps', [{ app_name: 'A' }]);
      expect(result.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/import/1/apps'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('exportCSV sends GET', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(200, { ok: true, data: [] }));
      await exportCSV(1, 'apps');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/export/1/apps'),
        expect.any(Object),
      );
    });
  });

  // ---- Admin: Users ----

  describe('admin user functions', () => {
    beforeEach(() => { store.dc_token = 'tok'; });

    it('fetchUsers sends GET /users', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(200, { ok: true, data: [] }));
      await fetchUsers();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.any(Object),
      );
    });

    it('createUser sends POST /users', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(201, { ok: true, data: { id: 2 } }));
      await createUser({ name: 'New', username: 'new', password: 'pass' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('updateUser sends PUT /users/:id', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(200, { ok: true, data: { id: 2 } }));
      await updateUser(2, { name: 'Renamed' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/2'),
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  // ---- Admin: Assignments ----

  describe('admin assignment functions', () => {
    beforeEach(() => { store.dc_token = 'tok'; });

    it('fetchAssignments sends GET /users/:id/assignments', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(200, { ok: true, data: [] }));
      await fetchAssignments(3);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/3/assignments'),
        expect.any(Object),
      );
    });

    it('createAssignment sends POST /assignments', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(201, { ok: true, data: { id: 1 } }));
      await createAssignment({ userId: 2, companyId: 1, role: 'empresa' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/assignments'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('deleteAssignment sends DELETE /assignments/:id', async () => {
      mockFetch.mockReturnValueOnce(jsonResponse(200, { ok: true, data: { deleted: true } }));
      await deleteAssignment(5);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/assignments/5'),
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
