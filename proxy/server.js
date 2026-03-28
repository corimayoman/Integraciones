require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getAuthUrl, exchangeCode, isAuthenticated, logout } = require('./auth');
const { fetchAllIssues } = require('./jira-client');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// --- Cache ---
let cache = { data: null, ts: 0 };
const TTL = (parseInt(process.env.CACHE_TTL) || 300) * 1000;

// --- Auth routes ---
app.get('/auth/login', (req, res) => {
  res.redirect(getAuthUrl());
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing code');
    const result = await exchangeCode(code);
    res.send(`<html><body><h2>Connected to ${result.site}</h2><p>You can close this window.</p><script>window.close();</script></body></html>`);
  } catch (err) {
    console.error('Auth callback error:', err);
    res.status(500).send(`Auth failed: ${err.message}`);
  }
});

app.get('/auth/status', (req, res) => {
  res.json({ authenticated: isAuthenticated() });
});

app.get('/auth/logout', (req, res) => {
  logout();
  cache = { data: null, ts: 0 };
  res.json({ ok: true });
});

// --- Data routes ---

// Raw issues endpoint — returns raw Jira data for exploration
app.get('/api/raw', async (req, res) => {
  try {
    if (!isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    
    const now = Date.now();
    if (cache.data && (now - cache.ts) < TTL) {
      return res.json({ issues: cache.data, count: cache.data.length, cached: true });
    }

    const issues = await fetchAllIssues();
    cache = { data: issues, ts: now };
    res.json({ issues, count: issues.length, cached: false });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Summary endpoint — grouped by issue type for understanding hierarchy
app.get('/api/summary', async (req, res) => {
  try {
    if (!isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    
    const now = Date.now();
    let issues;
    if (cache.data && (now - cache.ts) < TTL) {
      issues = cache.data;
    } else {
      issues = await fetchAllIssues();
      cache = { data: issues, ts: now };
    }

    const grouped = {};
    for (const issue of issues) {
      const type = issue.fields?.issuetype?.name || 'Unknown';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push({
        key: issue.key,
        summary: issue.fields?.summary,
        status: issue.fields?.status?.name,
        parent: issue.fields?.parent?.key || null,
        parentSummary: issue.fields?.parent?.fields?.summary || null,
        labels: issue.fields?.labels,
        components: issue.fields?.components?.map(c => c.name),
        priority: issue.fields?.priority?.name,
        assignee: issue.fields?.assignee?.displayName || null
      });
    }

    const summary = {};
    for (const [type, items] of Object.entries(grouped)) {
      summary[type] = { count: items.length, issues: items };
    }

    res.json(summary);
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', authenticated: isAuthenticated() });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`I4G proxy running on http://localhost:${PORT}`);
  console.log(`Login: http://localhost:${PORT}/auth/login`);
});
