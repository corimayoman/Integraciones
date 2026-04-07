/**
 * Integration tests for the I4G Proxy endpoints.
 *
 * These tests are SKIPPED by default because they require the proxy
 * server to be running on localhost:3002.
 *
 * To run these tests:
 *   1. Start the proxy:  cd proxy && npm start
 *   2. Run with:         npx vitest --run tests/integration/proxy-integration.test.js
 *
 * Or enable them by setting the PROXY_INTEGRATION env var:
 *   PROXY_INTEGRATION=1 npx vitest --run tests/integration/proxy-integration.test.js
 *
 * Validates: Requirements 1.1, 8.1
 *
 * @module proxy-integration
 */

import { describe, it, expect } from 'vitest';
import { PROXY_BASE_URL } from '../../js/constants.js';

describe.skip('Proxy Integration Tests (requires proxy running on :3002)', () => {
  it('GET /health returns { status: "ok" }', async () => {
    const res = await fetch(`${PROXY_BASE_URL}/health`);
    expect(res.ok).toBe(true);

    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
  });

  it('GET /auth/status returns { authenticated: boolean }', async () => {
    const res = await fetch(`${PROXY_BASE_URL}/auth/status`);
    expect(res.ok).toBe(true);

    const body = await res.json();
    expect(body).toHaveProperty('authenticated');
    expect(typeof body.authenticated).toBe('boolean');
  });

  it('GET /api/raw returns 401 when not authenticated', async () => {
    const res = await fetch(`${PROXY_BASE_URL}/api/raw`);
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});
