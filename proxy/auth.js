// OAuth 2.0 (3LO) authentication for Jira Cloud
// Same pattern as SOX Dashboard proxy

let tokens = null;
let cloudId = null;

function getAuthUrl() {
  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: process.env.ATLASSIAN_CLIENT_ID,
    scope: 'read:jira-work read:jira-user',
    redirect_uri: process.env.ATLASSIAN_CALLBACK_URL,
    response_type: 'code',
    prompt: 'consent'
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
      redirect_uri: process.env.ATLASSIAN_CALLBACK_URL
    })
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  tokens = await res.json();

  // Get cloudId
  const sitesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  const sites = await sitesRes.json();
  if (!sites.length) throw new Error('No accessible Jira sites');
  cloudId = sites[0].id;
  return { cloudId, site: sites[0].name };
}

async function refreshTokens() {
  if (!tokens?.refresh_token) throw new Error('No refresh token');
  const res = await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: process.env.ATLASSIAN_CLIENT_ID,
      client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
      refresh_token: tokens.refresh_token
    })
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  tokens = await res.json();
}

async function jiraFetch(path, options = {}) {
  if (!tokens || !cloudId) throw new Error('Not authenticated');
  
  let res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  // Auto-refresh on 401
  if (res.status === 401) {
    await refreshTokens();
    res = await fetch(`https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }
  return res;
}

function isAuthenticated() { return !!tokens && !!cloudId; }
function logout() { tokens = null; cloudId = null; }

module.exports = { getAuthUrl, exchangeCode, jiraFetch, isAuthenticated, logout };
