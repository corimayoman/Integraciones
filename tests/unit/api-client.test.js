/**
 * Unit tests for js/data/api-client.js
 * Validates: Requirements 1.1, 7.1, 7.6, 18.2
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  login,
  logout,
  checkAuth,
  fetchRawIssues,
  onConnectionChange,
  _internals,
} from '../../js/data/api-client.js';
import { OFFLINE_ISSUES } from '../../js/data/offline-data.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock window.open
vi.stubGlobal('window', { open: vi.fn() });

function okJson(data) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function failResponse(status = 500) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) });
}

describe('ApiClient', () => {
  beforeEach(() => {
    _internals.resetState();
    mockFetch.mockReset();
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should open proxy login URL in a new window', () => {
      login();
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        '_blank',
        expect.any(String),
      );
    });
  });

  describe('logout', () => {
    it('should call proxy logout and reset state', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) });
      await logout();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.any(Object),
      );
    });

    it('should not throw if proxy is unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(logout()).resolves.not.toThrow();
    });
  });

  describe('checkAuth', () => {
    it('should return authenticated status from proxy', async () => {
      mockFetch.mockImplementationOnce(() => okJson({ authenticated: true }));
      const result = await checkAuth();
      expect(result).toEqual({ authenticated: true });
    });

    it('should return false when proxy is unreachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const result = await checkAuth();
      expect(result).toEqual({ authenticated: false });
    });
  });

  describe('fetchRawIssues', () => {
    it('should return issues from proxy on success', async () => {
      const issues = [{ key: 'TEST-1' }];
      mockFetch.mockImplementation(() => okJson({ issues }));
      const result = await fetchRawIssues();
      expect(result).toEqual(issues);
    });

    it('should return offline data when proxy fails all retries', async () => {
      vi.useFakeTimers();
      mockFetch.mockRejectedValue(new Error('Network error'));
      const p = fetchRawIssues();
      await vi.runAllTimersAsync();
      const result = await p;
      expect(result).toBe(OFFLINE_ISSUES);
      vi.useRealTimers();
    });

    it('should return cached data on second call within TTL', async () => {
      const issues = [{ key: 'TEST-1' }];
      mockFetch.mockImplementation(() => okJson({ issues }));

      await fetchRawIssues();
      mockFetch.mockClear();

      const result = await fetchRawIssues();
      expect(result).toEqual(issues);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should open circuit breaker after 5 consecutive failures', async () => {
      vi.useFakeTimers();
      mockFetch.mockRejectedValue(new Error('fail'));

      // 5 failures to open the circuit (advance timers for backoff delays)
      for (let i = 0; i < 5; i++) {
        const p = fetchRawIssues();
        // Flush all pending timers (retry backoff delays)
        await vi.runAllTimersAsync();
        await p;
      }

      expect(_internals.circuitBreaker.state).toBe('open');

      // Next call should return offline without calling fetch
      mockFetch.mockClear();
      const result = await fetchRawIssues();
      expect(result).toBe(OFFLINE_ISSUES);
      expect(mockFetch).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('onConnectionChange', () => {
    it('should notify listeners when connection state changes', async () => {
      const listener = vi.fn();
      onConnectionChange(listener);

      const issues = [{ key: 'TEST-1' }];
      mockFetch.mockImplementation(() => okJson({ issues }));
      await fetchRawIssues();

      expect(listener).toHaveBeenCalledWith(true);
    });
  });
});
