// Jira client — fetches I4G integration data using the filter JQL
const { jiraFetch } = require('./auth');

// The JQL from filter 17832
const I4G_JQL = `(issuetype = Theme AND labels IN (AcquiredCompanies) AND component = "i4g_IST&SEC") OR (issuetype = Story AND labels IN ("IST&SEC")) OR (issuetype = Initiative AND labels IN ("IST&SEC")) OR (project = GLO586 AND component = "I4G - New Integration" AND issuetype = Epic) OR (project = GLO586 AND component = "I4G - New Integration" AND issuetype = Sub-task)`;

const FIELDS = [
  'summary', 'status', 'issuetype', 'priority', 'labels',
  'components', 'parent', 'assignee', 'created', 'updated',
  'description', 'customfield_10014', 'project', 'duedate'
];

async function fetchAllIssues() {
  let allIssues = [];
  let nextPageToken = null;

  do {
    const body = {
      jql: I4G_JQL,
      fields: FIELDS,
      maxResults: 100
    };
    if (nextPageToken) body.nextPageToken = nextPageToken;

    const res = await jiraFetch('/search/jql', {
      method: 'POST',
      body: JSON.stringify(body)
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

module.exports = { fetchAllIssues, I4G_JQL };
