/**
 * Compliance View — G4G Compliance Dashboard
 *
 * Renders a dashboard with 3 dimensions: SOX (5 sub-dims), Compliance, GIST.
 * Shows task completion vs due-date tracking per initiative/epic.
 *
 * @module compliance-view
 */

import { computeStats } from '../business/compliance-transformer.js';
import { t } from '../i18n.js';
import { getGoogleUser } from '../firebase-auth.js';

async function sendReminder(btn, task) {
  const senderEmail = getGoogleUser()?.email;
  if (!senderEmail) return;

  btn.disabled = true;
  btn.textContent = t('compliance.remindSending');

  try {
    const res = await fetch('/api/jira/remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issueKey:          task.key,
        issueSummary:      task.summary,
        dueDate:           task.duedate,
        status:            task.status,
        assigneeAccountId: task.assigneeAccountId,
        senderEmail,
      }),
    });

    if (res.ok) {
      btn.textContent = t('compliance.remindSent');
      btn.classList.add('compliance-remind-btn--sent');
    } else {
      const { error } = await res.json().catch(() => ({}));
      btn.textContent = t('compliance.remindError');
      btn.classList.add('compliance-remind-btn--error');
      btn.title = error ?? 'Unknown error';
      btn.disabled = false;
    }
  } catch {
    btn.textContent = t('compliance.remindError');
    btn.classList.add('compliance-remind-btn--error');
    btn.disabled = false;
  }
}

let isJiraLive = false;

const PRIORITY_COLORS = {
  Critical: '#D32F2F',
  High:     '#F57C00',
};

const SOX_DIM_LABELS = {
  sap:  'SAP',
  ssff: 'SSFF',
  glow: 'Glow',
  aws:  'AWS',
  other: 'Other',
};

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * @param {HTMLElement} container
 * @param {object|null} complianceModel - output of transformComplianceData
 * @param {boolean} isRefreshing - true while a live fetch is in progress
 * @param {string|null} error
 */
const TABS = [
  { id: 'sox',        label: 'SOX' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'gist',       label: 'GIST Compliance' },
];

// Remember the last active tab across re-renders
let _activeTab = 'sox';

export function renderComplianceView(container, complianceModel, isRefreshing, error, jiraLive = false) {
  isJiraLive = jiraLive;
  container.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'compliance-view';

  const titleRow = document.createElement('div');
  titleRow.className = 'compliance-title-row';
  const title = document.createElement('h2');
  title.className = 'compliance-title';
  title.textContent = t('compliance.title');
  titleRow.appendChild(title);
  wrapper.appendChild(titleRow);

  if (error) {
    const errEl = document.createElement('p');
    errEl.className = 'compliance-error';
    errEl.textContent = `Error loading data: ${error}`;
    wrapper.appendChild(errEl);
    container.appendChild(wrapper);
    return;
  }

  if (!complianceModel) {
    const empty = document.createElement('div');
    empty.className = 'compliance-not-connected';
    empty.innerHTML = `
      <p class="compliance-not-connected__title">${t('compliance.noData')}</p>
      <p class="compliance-not-connected__hint">${t('compliance.connectPrompt')}</p>
    `;
    wrapper.appendChild(empty);
    container.appendChild(wrapper);
    return;
  }

  // --- Tab bar ---
  const tabBar = document.createElement('div');
  tabBar.className = 'compliance-tab-bar';
  tabBar.setAttribute('role', 'tablist');

  const panels = {
    sox:        buildSoxSection(complianceModel.sox),
    compliance: buildDimensionCard('Compliance', complianceModel.compliance.initiative, complianceModel.compliance.epic, complianceModel.compliance.tasks, complianceModel.compliance.stats, 'compliance'),
    gist:       buildGistSection(complianceModel.gist),
  };

  const tabEls = {};
  for (const tab of TABS) {
    const btn = document.createElement('button');
    btn.className = 'compliance-tab-btn';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', tab.id === _activeTab ? 'true' : 'false');
    btn.dataset.tab = tab.id;
    btn.textContent = tab.label;
    btn.addEventListener('click', () => switchTab(tab.id));
    tabBar.appendChild(btn);
    tabEls[tab.id] = btn;
  }

  // --- Panel container ---
  const panelWrap = document.createElement('div');
  panelWrap.className = 'compliance-tab-panel';

  function switchTab(id) {
    _activeTab = id;
    for (const [tid, btn] of Object.entries(tabEls)) {
      btn.setAttribute('aria-selected', tid === id ? 'true' : 'false');
      btn.classList.toggle('compliance-tab-btn--active', tid === id);
    }
    panelWrap.textContent = '';
    panelWrap.appendChild(panels[id]);
  }

  wrapper.appendChild(tabBar);
  wrapper.appendChild(panelWrap);
  container.appendChild(wrapper);

  switchTab(_activeTab);
}

/* ------------------------------------------------------------------ */
/*  SOX section                                                        */
/* ------------------------------------------------------------------ */

function buildSoxSection(sox) {
  const section = document.createElement('div');
  section.className = 'compliance-sox-section';

  const header = document.createElement('div');
  header.className = 'compliance-sox-header';

  const titleEl = document.createElement('h3');
  titleEl.className = 'compliance-section-title';
  titleEl.textContent = 'SOX Compliance';
  header.appendChild(titleEl);

  const initiativeTag = buildInitiativeTag(sox.initiative);
  header.appendChild(initiativeTag);

  header.appendChild(buildStatsBar(sox.stats, 'sox-aggregate'));

  section.appendChild(header);

  const dimGrid = document.createElement('div');
  dimGrid.className = 'compliance-sox-dims';

  for (const [dimId, dimLabel] of Object.entries(SOX_DIM_LABELS)) {
    const dim = sox.dimensions[dimId];
    dimGrid.appendChild(buildSoxDimCard(dimLabel, dim));
  }

  section.appendChild(dimGrid);
  return section;
}

function buildSoxDimCard(label, dim) {
  const card = document.createElement('div');
  card.className = 'compliance-dim-card';

  const cardTitle = document.createElement('div');
  cardTitle.className = 'compliance-dim-title';
  cardTitle.textContent = label;
  card.appendChild(cardTitle);

  const epicName = document.createElement('div');
  epicName.className = 'compliance-dim-epic';
  epicName.textContent = dim.epic.summary;
  epicName.title = dim.epic.key;
  card.appendChild(epicName);

  card.appendChild(buildProgressBar(dim.stats.pctComplete, dim.stats));
  card.appendChild(buildStatsPills(dim.stats));

  if (dim.tasks.length > 0) {
    card.appendChild(buildTaskList(sortTasksByStatus(dim.tasks)));
  }

  return card;
}

/* ------------------------------------------------------------------ */
/*  GIST section — vulnerability pie charts                           */
/* ------------------------------------------------------------------ */

function buildGistSection(gist) {
  const section = document.createElement('div');
  section.className = 'compliance-section compliance-section--gist';

  // Header row
  const header = document.createElement('div');
  header.className = 'compliance-section-header';

  const titleEl = document.createElement('h3');
  titleEl.className = 'compliance-section-title';
  titleEl.textContent = 'GIST Compliance';
  header.appendChild(titleEl);

  header.appendChild(buildInitiativeTag(gist.initiative));
  section.appendChild(header);

  const epicEl = document.createElement('div');
  epicEl.className = 'compliance-epic-name';
  epicEl.textContent = gist.epic.summary;
  epicEl.title = gist.epic.key;
  section.appendChild(epicEl);

  section.appendChild(buildStatsBar(gist.stats, 'gist'));

  // Vulnerability charts row
  const vg = gist.vulnGroups;
  if (vg.total > 0) {
    const note = document.createElement('p');
    note.className = 'compliance-vuln-note';
    note.textContent = t('compliance.vulns', { total: vg.total });
    section.appendChild(note);

    const chartsRow = document.createElement('div');
    chartsRow.className = 'compliance-vuln-charts';
    chartsRow.appendChild(buildPieCard(t('compliance.open'), vg.open, 'open'));
    chartsRow.appendChild(buildPieCard(t('compliance.blocked'), vg.blocked, 'blocked'));
    chartsRow.appendChild(buildPieCard(t('compliance.closed'), vg.closed, 'closed'));
    section.appendChild(chartsRow);
  }

  // Task table — sorted by status (Blocked first, then Open, then Closed)
  if (gist.tasks.length > 0) {
    const taskSection = document.createElement('details');
    taskSection.className = 'compliance-tasks-details';
    const summary = document.createElement('summary');
    summary.textContent = t('compliance.showTasks', { n: gist.tasks.length });
    taskSection.appendChild(summary);
    taskSection.appendChild(buildTaskList(sortTasksByStatus(gist.tasks), true));
    section.appendChild(taskSection);
  }

  return section;
}

function buildPieCard(label, bucket, variant) {
  const card = document.createElement('div');
  card.className = `compliance-pie-card compliance-pie-card--${variant}`;

  const cardTitle = document.createElement('div');
  cardTitle.className = 'compliance-pie-title';
  cardTitle.textContent = label;
  card.appendChild(cardTitle);

  card.appendChild(buildDonutSVG(bucket));
  card.appendChild(buildPieLegend(bucket));

  return card;
}

/* ------------------------------------------------------------------ */
/*  SVG donut chart                                                    */
/* ------------------------------------------------------------------ */

function buildDonutSVG(bucket) {
  const size   = 100;
  const cx = size / 2, cy = size / 2;
  const R  = 38;   // outer radius
  const r  = 22;   // inner radius (hole)

  const segments = [
    { label: 'Critical', value: bucket.critical, color: PRIORITY_COLORS.Critical },
    { label: 'High',     value: bucket.high,     color: PRIORITY_COLORS.High },
  ].filter(s => s.value > 0);

  const total = bucket.critical + bucket.high;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('class', 'compliance-donut');

  if (total === 0) {
    // Empty state circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', R);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'var(--color-border)');
    circle.setAttribute('stroke-width', R - r);
    svg.appendChild(circle);
  } else if (segments.length === 1) {
    // Single color — full ring
    const seg = segments[0];
    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', cx);
    ring.setAttribute('cy', cy);
    ring.setAttribute('r', (R + r) / 2);
    ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', seg.color);
    ring.setAttribute('stroke-width', R - r);
    svg.appendChild(ring);
  } else {
    // Multi-segment donut
    let startAngle = -Math.PI / 2;
    for (const seg of segments) {
      const sweep = (seg.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sweep;

      const x1 = cx + R * Math.cos(startAngle);
      const y1 = cy + R * Math.sin(startAngle);
      const x2 = cx + R * Math.cos(endAngle);
      const y2 = cy + R * Math.sin(endAngle);
      const ix1 = cx + r * Math.cos(endAngle);
      const iy1 = cy + r * Math.sin(endAngle);
      const ix2 = cx + r * Math.cos(startAngle);
      const iy2 = cy + r * Math.sin(startAngle);
      const largeArc = sweep > Math.PI ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${r} ${r} 0 ${largeArc} 0 ${ix2} ${iy2}`,
        'Z',
      ].join(' ');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', seg.color);
      svg.appendChild(path);

      startAngle = endAngle;
    }
  }

  // Center total label
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', cx);
  text.setAttribute('y', cy + 5);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('font-size', '16');
  text.setAttribute('font-weight', 'bold');
  text.setAttribute('fill', 'var(--color-text-primary)');
  text.textContent = total;
  svg.appendChild(text);

  return svg;
}

function buildPieLegend(bucket) {
  const legend = document.createElement('div');
  legend.className = 'compliance-pie-legend';

  for (const [label, value, color] of [
    ['Critical', bucket.critical, PRIORITY_COLORS.Critical],
    ['High',     bucket.high,     PRIORITY_COLORS.High],
  ]) {
    const item = document.createElement('div');
    item.className = 'compliance-pie-legend-item';

    const dot = document.createElement('span');
    dot.className = 'compliance-pie-legend-dot';
    dot.style.background = color;
    item.appendChild(dot);

    const lbl = document.createElement('span');
    lbl.textContent = `${label}: ${value}`;
    item.appendChild(lbl);

    legend.appendChild(item);
  }

  return legend;
}

/* ------------------------------------------------------------------ */
/*  Generic dimension card (Compliance, GIST)                         */
/* ------------------------------------------------------------------ */

function buildDimensionCard(sectionLabel, initiative, epic, tasks, stats, colorClass) {
  const section = document.createElement('div');
  section.className = `compliance-section compliance-section--${colorClass}`;

  const header = document.createElement('div');
  header.className = 'compliance-section-header';

  const titleEl = document.createElement('h3');
  titleEl.className = 'compliance-section-title';
  titleEl.textContent = sectionLabel;
  header.appendChild(titleEl);

  header.appendChild(buildInitiativeTag(initiative));
  section.appendChild(header);

  const epicEl = document.createElement('div');
  epicEl.className = 'compliance-epic-name';
  epicEl.textContent = epic.summary;
  epicEl.title = epic.key;
  section.appendChild(epicEl);

  section.appendChild(buildStatsBar(stats, colorClass));

  if (tasks.length > 0) {
    const taskSection = document.createElement('details');
    taskSection.className = 'compliance-tasks-details';
    const summary = document.createElement('summary');
    summary.textContent = t('compliance.showTasks', { n: tasks.length });
    taskSection.appendChild(summary);
    taskSection.appendChild(buildTaskList(sortTasksByStatus(tasks)));
    section.appendChild(taskSection);
  }

  return section;
}

/* ------------------------------------------------------------------ */
/*  Reusable sub-components                                            */
/* ------------------------------------------------------------------ */

function buildInitiativeTag(initiative) {
  const tag = document.createElement('span');
  tag.className = `compliance-status-badge compliance-status-badge--${statusClass(initiative.status)}`;
  tag.textContent = `${initiative.key} · ${statusLabel(initiative.status)}`;
  tag.title = initiative.summary;
  return tag;
}

function buildStatsBar(stats, _colorClass) {
  const bar = document.createElement('div');
  bar.className = 'compliance-stats-bar';

  bar.appendChild(buildProgressBar(stats.pctComplete, stats));
  bar.appendChild(buildStatsPills(stats));

  return bar;
}

function buildProgressBar(pct, stats) {
  const wrap = document.createElement('div');
  wrap.className = 'compliance-progress-wrap';

  const track = document.createElement('div');
  track.className = 'compliance-progress-track';

  const fill = document.createElement('div');
  fill.className = 'compliance-progress-fill';
  fill.style.width = `${pct}%`;
  fill.style.backgroundColor = pct === 100 ? 'var(--color-success)' : stats.overdue > 0 ? 'var(--color-error)' : 'var(--color-primary)';
  track.appendChild(fill);

  const label = document.createElement('span');
  label.className = 'compliance-progress-label';
  label.textContent = `${pct}%`;

  wrap.appendChild(track);
  wrap.appendChild(label);
  return wrap;
}

function buildStatsPills(stats) {
  const pills = document.createElement('div');
  pills.className = 'compliance-pills';

  pills.appendChild(makePill(t('compliance.completed', { done: stats.completed, total: stats.total }), 'neutral'));
  if (stats.overdue > 0) {
    pills.appendChild(makePill(t('compliance.overdue', { n: stats.overdue }), 'danger'));
  } else {
    pills.appendChild(makePill(t('compliance.noOverdue'), 'ok'));
  }

  return pills;
}

function makePill(text, variant) {
  const pill = document.createElement('span');
  pill.className = `compliance-pill compliance-pill--${variant}`;
  pill.textContent = text;
  return pill;
}

const PAGE_SIZE = 10;

function buildTaskList(tasks, showPriority = false) {
  const today = new Date().toISOString().slice(0, 10);

  const wrap = document.createElement('div');
  wrap.className = 'compliance-task-table-wrap';

  const cols = [t('compliance.colId'), t('compliance.colTitle'), t('compliance.colAssignedTo'), t('compliance.colCreated'), t('compliance.colAging'), t('compliance.colDueDate'), t('compliance.colStatus'), ''];
  if (showPriority) cols.splice(6, 0, t('compliance.colPriority'));

  // --- build table (just thead + empty tbody to be filled per page) ---
  const table = document.createElement('table');
  table.className = 'compliance-task-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const col of cols) {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  wrap.appendChild(table);

  // --- pagination controls ---
  const totalPages = Math.ceil(tasks.length / PAGE_SIZE);
  let currentPage = 0;

  const pager = document.createElement('div');
  pager.className = 'compliance-pager';

  const btnPrev = document.createElement('button');
  btnPrev.className = 'compliance-pager-btn';
  btnPrev.textContent = t('compliance.prev');

  const pageLabel = document.createElement('span');
  pageLabel.className = 'compliance-pager-label';

  const btnNext = document.createElement('button');
  btnNext.className = 'compliance-pager-btn';
  btnNext.textContent = t('compliance.next');

  pager.appendChild(btnPrev);
  pager.appendChild(pageLabel);
  pager.appendChild(btnNext);
  wrap.appendChild(pager);

  function renderPage(page) {
    currentPage = page;
    tbody.textContent = '';

    const start = page * PAGE_SIZE;
    const slice = tasks.slice(start, start + PAGE_SIZE);

    for (const task of slice) {
      const overdue = task.status !== 'Completado' && task.duedate && task.duedate < today;
      const tr = document.createElement('tr');
      if (overdue) tr.classList.add('compliance-task-row--overdue');

      const tdKey = document.createElement('td');
      tdKey.className = 'compliance-task-td compliance-task-td--key';
      const keyLink = document.createElement('a');
      keyLink.href = `https://globant.atlassian.net/browse/${task.key}`;
      keyLink.target = '_blank';
      keyLink.rel = 'noopener noreferrer';
      keyLink.textContent = task.key;
      keyLink.className = 'compliance-jira-link';
      tdKey.appendChild(keyLink);
      tr.appendChild(tdKey);

      const tdSummary = document.createElement('td');
      tdSummary.className = 'compliance-task-td compliance-task-td--summary';
      tdSummary.textContent = task.summary;
      tr.appendChild(tdSummary);

      const tdAssignee = document.createElement('td');
      tdAssignee.className = 'compliance-task-td';
      tdAssignee.textContent = task.assignee ?? '—';
      tr.appendChild(tdAssignee);

      const tdCreated = document.createElement('td');
      tdCreated.className = 'compliance-task-td compliance-task-td--date';
      tdCreated.textContent = task.created ?? '—';
      tr.appendChild(tdCreated);

      // Aging: days from created to today
      const tdAging = document.createElement('td');
      tdAging.className = 'compliance-task-td compliance-task-td--num';
      if (task.created) {
        const msPerDay = 86_400_000;
        const agingDays = Math.floor((Date.parse(today) - Date.parse(task.created)) / msPerDay);
        tdAging.textContent = agingDays >= 0 ? agingDays : '—';
      } else {
        tdAging.textContent = '—';
      }
      tr.appendChild(tdAging);

      // Due Date + semaphore
      const tdDue = document.createElement('td');
      tdDue.className = `compliance-task-td compliance-task-td--date compliance-task-td--due${overdue ? ' compliance-task-td--overdue' : ''}`;

      if (task.duedate) {
        const isClosed   = task.status === 'Completado' || task.status === 'Rechazado';
        // Green: closed (we assume on-time since no actual close-date field),
        //        OR not closed but still within due date.
        // Red:   not closed and past due date.
        const semClass = (!isClosed && overdue) ? 'semaphore--red' : 'semaphore--green';
        const semTitle = (!isClosed && overdue)
          ? t('compliance.overdueDate', { date: task.duedate })
          : isClosed ? t('compliance.closedDate', { date: task.duedate }) : t('compliance.onTrackDate', { date: task.duedate });

        const dot = document.createElement('span');
        dot.className = `compliance-semaphore ${semClass}`;
        dot.title = semTitle;
        dot.setAttribute('aria-label', semTitle);
        tdDue.appendChild(dot);

        const dateSpan = document.createElement('span');
        dateSpan.textContent = task.duedate;
        tdDue.appendChild(dateSpan);
      } else {
        tdDue.textContent = '—';
      }
      tr.appendChild(tdDue);

      if (showPriority) {
        const tdPriority = document.createElement('td');
        tdPriority.className = 'compliance-task-td';
        if (task.priority) {
          const pb = document.createElement('span');
          pb.className = 'compliance-priority-badge';
          pb.style.color = PRIORITY_COLORS[task.priority] ?? 'inherit';
          pb.textContent = task.priority;
          tdPriority.appendChild(pb);
        } else {
          tdPriority.textContent = '—';
        }
        tr.appendChild(tdPriority);
      }

      const tdStatus = document.createElement('td');
      tdStatus.className = 'compliance-task-td';
      const badge = document.createElement('span');
      badge.className = `compliance-status-badge compliance-status-badge--${statusClass(task.status)}`;
      badge.textContent = statusLabel(task.status);
      tdStatus.appendChild(badge);
      tr.appendChild(tdStatus);

      // Remind button — only for tasks with a due date that are not closed
      const tdAction = document.createElement('td');
      tdAction.className = 'compliance-task-td compliance-task-td--action';
      const isClosed = task.status === 'Completado' || task.status === 'Rechazado';
      if (task.duedate && !isClosed && task.assigneeAccountId) {
        const remindBtn = document.createElement('button');
        remindBtn.className = 'compliance-remind-btn';
        remindBtn.textContent = t('compliance.remind');
        if (isJiraLive) {
          remindBtn.title = t('compliance.remindTitle');
          remindBtn.addEventListener('click', () => sendReminder(remindBtn, task));
        } else {
          remindBtn.disabled = true;
          remindBtn.title = t('compliance.remindDisabled');
        }
        tdAction.appendChild(remindBtn);
      }
      tr.appendChild(tdAction);

      tbody.appendChild(tr);
    }

    const from = start + 1;
    const to   = Math.min(start + PAGE_SIZE, tasks.length);
    pageLabel.textContent = t('compliance.pager', { from, to, total: tasks.length });
    btnPrev.disabled = currentPage === 0;
    btnNext.disabled = currentPage >= totalPages - 1;
  }

  btnPrev.addEventListener('click', () => renderPage(currentPage - 1));
  btnNext.addEventListener('click', () => renderPage(currentPage + 1));

  // hide pager when results fit on one page
  if (totalPages <= 1) pager.style.display = 'none';

  renderPage(0);
  return wrap;
}

function statusLabel(status) {
  const map = {
    'Completado':  t('compliance.closed'),
    'En Progreso': t('compliance.open'),
    'No Iniciado': t('compliance.open'),
    'Bloqueado':   t('compliance.blocked'),
    'Rechazado':   t('compliance.closed'),
  };
  return map[status] ?? status;
}

const STATUS_SORT_ORDER = { 'Bloqueado': 0, 'En Progreso': 1, 'No Iniciado': 2, 'Completado': 3, 'Rechazado': 4 };

function sortTasksByStatus(tasks) {
  return [...tasks].sort((a, b) => {
    const oa = STATUS_SORT_ORDER[a.status] ?? 99;
    const ob = STATUS_SORT_ORDER[b.status] ?? 99;
    return oa - ob;
  });
}

function statusClass(status) {
  switch (status) {
    case 'Completado':  return 'completed';
    case 'En Progreso': return 'in-progress';
    case 'Bloqueado':   return 'blocked';
    case 'Rechazado':   return 'rejected';
    default:            return 'not-started';
  }
}
