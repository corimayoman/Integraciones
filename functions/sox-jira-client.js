/**
 * SOX Controls — Jira data fetcher
 * Fetches the three-level hierarchy: Epics → Monthly Tasks → Control Subtasks
 * Uses the shared jiraFetch from jira-auth (token refresh handled there).
 */

const { jiraFetch } = require('./jira-auth');

const SOX_FIELDS_TASKS    = ['summary', 'status', 'duedate', 'description'];
const SOX_FIELDS_SUBTASKS = ['summary', 'status', 'parent', 'assignee', 'description', 'issuelinks'];

async function jiraSearch(jql, fields) {
  let allIssues = [];
  let nextPageToken = null;
  do {
    const body = { jql, fields };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const res = await jiraFetch('/search/jql', { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Jira SOX search failed (${res.status}): ${err}`);
    }
    const data = await res.json();
    allIssues = allIssues.concat(data.issues || []);
    nextPageToken = data.nextPageToken || null;
  } while (nextPageToken);
  return allIssues;
}

async function fetchSOXData() {
  const project = process.env.JIRA_PROJECT_KEY;

  // Step 1: Find SOX calendar epics
  const epics = await jiraSearch(
    `project = ${project} AND summary ~ "Calendario Controles SOX" AND issuetype = Epic`,
    ['summary', 'status']
  );
  console.log(`SOX: found ${epics.length} epics`);
  if (!epics.length) return { subtasks: [], parentMap: new Map() };

  // Step 2: Fetch monthly tasks under each epic
  let allTasks = [];
  for (const epic of epics) {
    const tasks = await jiraSearch(
      `parent = ${epic.key} AND issuetype = Task`,
      SOX_FIELDS_TASKS
    );
    allTasks = allTasks.concat(tasks);
  }
  console.log(`SOX: found ${allTasks.length} monthly tasks`);

  // Step 3: Fetch control subtasks under each monthly task
  let allSubtasks = [];
  for (const task of allTasks) {
    const subtasks = await jiraSearch(`parent = ${task.key}`, SOX_FIELDS_SUBTASKS);
    allSubtasks = allSubtasks.concat(subtasks);
  }
  console.log(`SOX: found ${allSubtasks.length} control subtasks`);

  const parentMap = new Map(allTasks.map(t => [t.key, t]));
  return { subtasks: allSubtasks, parentMap };
}

module.exports = { fetchSOXData };
