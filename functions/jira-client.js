/**
 * Jira client — fetches I4G integration data using the filter JQL.
 * Adapted from proxy/jira-client.js to use functions/jira-auth.
 */

const { jiraFetch } = require('./jira-auth');

const I4G_JQL = `(issuetype = Theme AND labels IN (AcquiredCompanies) AND component = "i4g_IST&SEC") OR (issuetype = Story AND labels IN ("IST&SEC")) OR (issuetype = Initiative AND labels IN ("IST&SEC")) OR (project = GLO586 AND component = "I4G - New Integration" AND issuetype = Epic) OR (project = GLO586 AND component = "I4G - New Integration" AND issuetype = Sub-task)`;

const FIELDS = [
  'summary', 'status', 'issuetype', 'priority', 'labels',
  'components', 'parent', 'assignee', 'created', 'updated',
  'description', 'customfield_10014', 'project', 'duedate',
];

async function fetchAllIssues() {
  let allIssues = [];
  let nextPageToken = null;

  do {
    const body = { jql: I4G_JQL, fields: FIELDS, maxResults: 100 };
    if (nextPageToken) body.nextPageToken = nextPageToken;

    const res = await jiraFetch('/search/jql', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Jira search failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    allIssues = allIssues.concat(data.issues || []);
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);

  return allIssues;
}

const COMPLIANCE_INITIATIVE_KEYS = [
  'GLO220-13082', // Compliance
  'GLO220-13083', // GIST Compliance
  'GLO220-13076', // SOX Compliance
];

const COMPLIANCE_EPIC_KEYS = [
  'GLO220-13086', // Compliance epic
  'GLO220-13087', // GIST epic
  'GLO220-13077', // SOX - SAP
  'GLO220-13078', // SOX - Glow
  'GLO220-13079', // SOX - AWS
  'GLO220-13080', // SOX - SSFF
  'GLO220-13081', // SOX - Other
];

const ALL_COMPLIANCE_KEYS = [...COMPLIANCE_INITIATIVE_KEYS, ...COMPLIANCE_EPIC_KEYS];

// Query 1: the known anchors + their direct children via parent field
const JQL_PARENT = `key in (${ALL_COMPLIANCE_KEYS.join(', ')}) OR parent in (${ALL_COMPLIANCE_KEYS.join(', ')})`;

// Query 2: children linked via Epic Link custom field (cf[10014]) — used by
// some issue types (Vulnerability, Story) in company-managed Jira projects
const JQL_EPIC_LINK = `cf[10014] in (${COMPLIANCE_EPIC_KEYS.join(', ')})`;

async function runJql(jql) {
  let allIssues = [];
  let nextPageToken = null;
  do {
    const body = { jql, fields: FIELDS, maxResults: 200 };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const res = await jiraFetch('/search/jql', { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Jira JQL failed (${res.status}): ${err}`);
    }
    const data = await res.json();
    allIssues = allIssues.concat(data.issues || []);
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);
  return allIssues;
}

async function fetchComplianceIssues() {
  // Run both queries; Epic Link query is optional — ignore if the field doesn't exist
  const [parentResult, epicLinkResult] = await Promise.allSettled([
    runJql(JQL_PARENT),
    runJql(JQL_EPIC_LINK),
  ]);

  if (parentResult.status === 'rejected') {
    throw parentResult.reason; // main query must succeed
  }

  const parentIssues   = parentResult.value;
  const epicLinkIssues = epicLinkResult.status === 'fulfilled' ? epicLinkResult.value : [];

  // Deduplicate by key
  const seen = new Set(parentIssues.map(i => i.key));
  const extra = epicLinkIssues.filter(i => !seen.has(i.key));

  console.log(`Compliance fetch: ${parentIssues.length} via parent, ${extra.length} via epicLink`);
  return [...parentIssues, ...extra];
}

module.exports = { fetchAllIssues, fetchComplianceIssues, I4G_JQL };
