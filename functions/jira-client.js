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
const COMPLIANCE_JQL = `key in (${ALL_COMPLIANCE_KEYS.join(', ')}) OR parent in (${ALL_COMPLIANCE_KEYS.join(', ')}) OR "Epic Link" in (${COMPLIANCE_EPIC_KEYS.join(', ')})`;

async function fetchComplianceIssues() {
  let allIssues = [];
  let nextPageToken = null;

  do {
    const body = { jql: COMPLIANCE_JQL, fields: FIELDS, maxResults: 200 };
    if (nextPageToken) body.nextPageToken = nextPageToken;

    const res = await jiraFetch('/search/jql', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Jira compliance fetch failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    allIssues = allIssues.concat(data.issues || []);
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);

  return allIssues;
}

module.exports = { fetchAllIssues, fetchComplianceIssues, I4G_JQL };
