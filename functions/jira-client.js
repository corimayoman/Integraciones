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

// Projects and label that define the three offense/infrastructure sections
const OFFENSE_PROJECTS = ['GBN980', 'GL1404', 'GLO815X'];
const OFFENSE_LABEL    = 'Offense-Discovered-Vuln';

// JQL: vulnerabilities in the three projects with the required label
const JQL_OFFENSE = `project in (${OFFENSE_PROJECTS.join(', ')}) AND issuetype = Vulnerability AND labels = "${OFFENSE_LABEL}" ORDER BY created DESC`;

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
  const issues = await runJql(JQL_OFFENSE);
  console.log(`Compliance fetch: ${issues.length} offense issues across projects ${OFFENSE_PROJECTS.join(', ')}`);
  return issues;
}

module.exports = { fetchAllIssues, fetchComplianceIssues, I4G_JQL };
