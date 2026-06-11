/**
 * Jira OAuth 2.0 (3LO) — token persistence via Firebase RTDB
 * Adapted from proxy/auth.js for stateless Cloud Functions environment.
 */

const admin = require('firebase-admin');

const SESSION_PATH = 'jiraSession';

function getDb() {
  return admin.database();
}

function getAuthUrl() {
  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: process.env.ATLASSIAN_CLIENT_ID,
    scope: 'read:jira-work read:jira-user write:jira-work offline_access',
    redirect_uri: process.env.ATLASSIAN_CALLBACK_URL,
    response_type: 'code',
    prompt: 'consent',
  });
  return `https://auth.atlassian.com/authorize?${params}`;
}

async function exchangeCode(code) {
  const res = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: process.env.ATLASSIAN_CLIENT_ID,
      client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
      code,
      redirect_uri: process.env.ATLASSIAN_CALLBACK_URL,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  const tokens = await res.json();

  const sitesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const sites = await sitesRes.json();
  if (!sites.length) throw new Error('No accessible Jira sites');
  const cloudId = sites[0].id;
  const siteUrl = sites[0].url;

  await getDb().ref(SESSION_PATH).set({ tokens, cloudId, siteUrl, updatedAt: Date.now() });
  return { cloudId, site: sites[0].name, siteUrl };
}

async function getSession() {
  const snap = await getDb().ref(SESSION_PATH).once('value');
  return snap.val();
}

async function refreshTokens(session) {
  if (!session?.tokens?.refresh_token) throw new Error('No refresh token available');
  const res = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: process.env.ATLASSIAN_CLIENT_ID,
      client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
      refresh_token: session.tokens.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const newTokens = await res.json();
  await getDb().ref(`${SESSION_PATH}/tokens`).set(newTokens);
  return newTokens;
}

async function jiraFetch(path, options = {}) {
  let session = await getSession();
  if (!session?.tokens || !session?.cloudId) throw new Error('Not authenticated');

  const doRequest = (token) =>
    fetch(`https://api.atlassian.com/ex/jira/${session.cloudId}/rest/api/3${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

  let res = await doRequest(session.tokens.access_token);

  if (res.status === 401) {
    const newTokens = await refreshTokens(session);
    res = await doRequest(newTokens.access_token);
  }
  return res;
}

async function getSiteUrl() {
  const session = await getSession();
  return session?.siteUrl || null;
}

async function isAuthenticated() {
  const session = await getSession();
  if (!session?.tokens || !session?.cloudId) return false;
  try {
    const res = await jiraFetch('/myself');
    return res.ok;
  } catch {
    return false;
  }
}

async function logout() {
  await getDb().ref(SESSION_PATH).remove();
}

module.exports = { getAuthUrl, exchangeCode, jiraFetch, isAuthenticated, getSiteUrl, logout };
