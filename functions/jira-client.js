/**
 * Jira client — fetches I4G integration data using the filter JQL.
 * Adapted from proxy/jira-client.js to use functions/jira-auth.
 */

const { jiraFetch } = require('./jira-auth');

const I4G_JQL = `(issuetype = Theme AND labels IN (AcquiredCompanies) AND component = "i4g_IST&SEC") OR (issuetype = Story AND labels IN ("IST&SEC")) OR (issuetype = Initiative AND labels IN ("IST&SEC")) OR (project = GLO586 AND component = "I4G - New Integration" AND issuetype = Epic) OR (project = GLO586 AND component = "I4G - New Integration" AND issuetype = Sub-task)`;

const FIELDS = [
  'summary', 'status', 'issuetype', 'priority', 'labels',
  'components', 'parent', 'assignee', 'created', 'updated',
  'description', 'customfield_10014', 'project', 'duedate', 'customfield_10124',
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

// GL1404 (External Infrastructure) also accepts External-Pentest label.
// Filtering per-project label rules is done in the transformer.
const JQL_OFFENSE = `project in (GBN980, GL1404, GLO815X) AND type = Vulnerability AND (labels = "Offense-Discovered-Vuln" OR labels = "External-Pentest") ORDER BY created DESC`;

// SOX Compliance tab hierarchy
const SOX_INITIATIVE    = 'GLO220-11373';
const SOX_TASK_KEYS     = ['GLO220-11377', 'GLO220-11383', 'GLO220-11384', 'GLO220-11385'];

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
  const [offenseIssues, headerIssues, knownSubtasks, otherTasks] = await Promise.all([
    // Offense / infrastructure tabs
    runJql(JQL_OFFENSE),
    // SOX tab: initiative + 4 known parent tasks (for summary/status display)
    runJql(`issue in (${SOX_INITIATIVE}, ${SOX_TASK_KEYS.join(', ')})`),
    // SOX tab: sub-tasks under the 4 known parent tasks
    runJql(`parent in (${SOX_TASK_KEYS.join(', ')}) AND issuetype = Sub-task ORDER BY created DESC`),
    // SOX tab: any other tasks directly under the initiative (will appear in OTHER sub-tab)
    runJql(`parent = ${SOX_INITIATIVE} AND key not in (${SOX_TASK_KEYS.join(', ')}) ORDER BY created DESC`),
  ]);

  // Fetch sub-tasks of the "other" tasks discovered above
  let otherSubtasks = [];
  if (otherTasks.length > 0) {
    const otherKeys = otherTasks.map(i => i.key).join(', ');
    otherSubtasks = await runJql(`parent in (${otherKeys}) AND issuetype = Sub-task ORDER BY created DESC`);
  }

  console.log(`Compliance fetch: ${offenseIssues.length} offense, ${knownSubtasks.length} SOX subtasks, ${otherTasks.length} other tasks, ${otherSubtasks.length} other subtasks`);
  return [...offenseIssues, ...headerIssues, ...knownSubtasks, ...otherTasks, ...otherSubtasks];
}

module.exports = { fetchAllIssues, fetchComplianceIssues, I4G_JQL };
