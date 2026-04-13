/**
 * Unit tests for js/business/auth-logic.js
 * Validates: Requirements 2.1, 2.5
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveToken,
  getToken,
  clearToken,
  decodeTokenPayload,
  isTokenExpired,
  isAuthenticated,
  getCurrentUser,
} from '../../js/business/auth-logic.js';

/* ------------------------------------------------------------------ */
/*  localStorage mock                                                  */
/* ------------------------------------------------------------------ */

const store = {};
const localStorageMock = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = String(val); }),
  removeItem: vi.fn((key) => { delete store[key]; }),
};
vi.stubGlobal('localStorage', localStorageMock);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fakeJWT(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('auth-logic', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  // ---- Storage ----

  describe('saveToken / getToken / clearToken', () => {
    it('saves and retrieves a token', () => {
      saveToken('my-token');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('dc_token', 'my-token');
      expect(getToken()).toBe('my-token');
    });

    it('clearToken removes the token', () => {
      store.dc_token = 'tok';
      clearToken();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('dc_token');
      expect(getToken()).toBeNull();
    });

    it('getToken returns null when no token stored', () => {
      expect(getToken()).toBeNull();
    });
  });

  // ---- Decoding ----

  describe('decodeTokenPayload', () => {
    it('decodes a valid JWT payload', () => {
      const payload = { id: 1, username: 'admin', role: 'admin', exp: 9999999999 };
      const token = fakeJWT(payload);
      const decoded = decodeTokenPayload(token);
      expect(decoded).toMatchObject(payload);
    });

    it('returns null for malformed token (wrong number of parts)', () => {
      expect(decodeTokenPayload('only.two')).toBeNull();
      expect(decodeTokenPayload('a.b.c.d')).toBeNull();
    });

    it('returns null for invalid base64 payload', () => {
      expect(decodeTokenPayload('a.!!!.c')).toBeNull();
    });

    it('returns null for null/undefined/empty', () => {
      expect(decodeTokenPayload(null)).toBeNull();
      expect(decodeTokenPayload(undefined)).toBeNull();
      expect(decodeTokenPayload('')).toBeNull();
    });

    it('returns null for non-string input', () => {
      expect(decodeTokenPayload(12345)).toBeNull();
    });

    it('handles URL-safe base64 characters', () => {
      // Create a payload that would produce + and / in standard base64
      const payload = { data: '>>>???<<<' };
      const token = fakeJWT(payload);
      // Replace standard base64 chars with URL-safe ones
      const parts = token.split('.');
      const urlSafe = parts[1].replace(/\+/g, '-').replace(/\//g, '_');
      const urlSafeToken = `${parts[0]}.${urlSafe}.${parts[2]}`;
      const decoded = decodeTokenPayload(urlSafeToken);
      expect(decoded).toMatchObject(payload);
    });
  });

  // ---- Expiration ----

  describe('isTokenExpired', () => {
    it('returns false for non-expired token', () => {
      const token = fakeJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
      expect(isTokenExpired(token)).toBe(false);
    });

    it('returns true for expired token', () => {
      const token = fakeJWT({ exp: Math.floor(Date.now() / 1000) - 60 });
      expect(isTokenExpired(token)).toBe(true);
    });

    it('returns true for token without exp claim', () => {
      const token = fakeJWT({ id: 1 });
      expect(isTokenExpired(token)).toBe(true);
    });

    it('returns true for invalid token', () => {
      expect(isTokenExpired('garbage')).toBe(true);
    });
  });

  // ---- isAuthenticated ----

  describe('isAuthenticated', () => {
    it('returns true when valid non-expired token exists', () => {
      store.dc_token = fakeJWT({ exp: Math.floor(Date.now() / 1000) + 3600 });
      expect(isAuthenticated()).toBe(true);
    });

    it('returns false when token is expired', () => {
      store.dc_token = fakeJWT({ exp: Math.floor(Date.now() / 1000) - 60 });
      expect(isAuthenticated()).toBe(false);
    });

    it('returns false when no token stored', () => {
      expect(isAuthenticated()).toBe(false);
    });
  });

  // ---- getCurrentUser ----

  describe('getCurrentUser', () => {
    it('returns decoded user for valid token', () => {
      const payload = { id: 5, username: 'user1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 };
      store.dc_token = fakeJWT(payload);
      const user = getCurrentUser();
      expect(user).toMatchObject({ id: 5, username: 'user1', role: 'admin' });
    });

    it('returns null when no token', () => {
      expect(getCurrentUser()).toBeNull();
    });

    it('returns null when token is expired', () => {
      store.dc_token = fakeJWT({ id: 1, exp: Math.floor(Date.now() / 1000) - 60 });
      expect(getCurrentUser()).toBeNull();
    });
  });
});
