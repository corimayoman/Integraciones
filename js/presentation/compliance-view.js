/**
 * Compliance View — G4G Compliance Dashboard
 *
 * Renders a dashboard with 3 dimensions: SOX (5 sub-dims), Compliance, GIST.
 * Shows task completion vs due-date tracking per initiative/epic.
 *
 * @module compliance-view
 */

import { computeStats } from '../business/compliance-transformer.js';

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
export function renderComplianceView(container, complianceModel, isRefreshing, error) {
  container.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'compliance-view';

  // Header row with title + status banner
  const titleRow = document.createElement('div');
  titleRow.className = 'compliance-title-row';

  const title = document.createElement('h2');
  title.className = 'compliance-title';
  title.textContent = 'G4G Compliance Dashboard';
  titleRow.appendChild(title);

  // (no per-route refresh badge needed — global loading overlay covers it)

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
    if (error) {
      empty.innerHTML = `
        <p class="compliance-not-connected__title">Error loading compliance data</p>
        <p class="compliance-not-connected__hint">${error}</p>
        <p class="compliance-not-connected__hint">Check the browser console for details, or try clicking Refresh.</p>
      `;
    } else {
      empty.innerHTML = `
        <p class="compliance-not-connected__title">No compliance data yet</p>
        <p class="compliance-not-connected__hint">Connect to Jira and click Refresh to load compliance data.</p>
      `;
    }
    wrapper.appendChild(empty);
    container.appendChild(wrapper);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'compliance-grid';

  // SOX section — special, with 5 sub-dimensions
  grid.appendChild(buildSoxSection(complianceModel.sox));

  // Compliance section
  grid.appendChild(buildDimensionCard('Compliance', complianceModel.compliance.initiative, complianceModel.compliance.epic, complianceModel.compliance.tasks, complianceModel.compliance.stats, 'compliance'));

  // GIST section — special, with vulnerability pie charts
  grid.appendChild(buildGistSection(complianceModel.gist));

  wrapper.appendChild(grid);
  container.appendChild(wrapper);
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
    note.textContent = `Critical and High vulnerabilities · ${vg.total} total`;
    section.appendChild(note);

    const chartsRow = document.createElement('div');
    chartsRow.className = 'compliance-vuln-charts';
    chartsRow.appendChild(buildPieCard('Open', vg.open, 'open'));
    chartsRow.appendChild(buildPieCard('Blocked', vg.blocked, 'blocked'));
    chartsRow.appendChild(buildPieCard('Closed', vg.closed, 'closed'));
    section.appendChild(chartsRow);
  }

  // Task table — sorted by status (Blocked first, then Open, then Closed)
  if (gist.tasks.length > 0) {
    const taskSection = document.createElement('details');
    taskSection.className = 'compliance-tasks-details';
    const summary = document.createElement('summary');
    summary.textContent = `Show tasks (${gist.tasks.length})`;
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
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
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
    summary.textContent = `Show tasks (${tasks.length})`;
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

  pills.appendChild(makePill(`${stats.completed}/${stats.total} completed`, 'neutral'));
  if (stats.overdue > 0) {
    pills.appendChild(makePill(`${stats.overdue} overdue`, 'danger'));
  } else {
    pills.appendChild(makePill('No overdue', 'ok'));
  }

  return pills;
}

function makePill(text, variant) {
  const pill = document.createElement('span');
  pill.className = `compliance-pill compliance-pill--${variant}`;
  pill.textContent = text;
  return pill;
}

function buildTaskList(tasks, showPriority = false) {
  const today = new Date().toISOString().slice(0, 10);

  const wrap = document.createElement('div');
  wrap.className = 'compliance-task-table-wrap';

  const table = document.createElement('table');
  table.className = 'compliance-task-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const cols = ['ID', 'Title', 'Assigned To', 'Created', 'Due Date', 'Status'];
  if (showPriority) cols.splice(5, 0, 'Priority');
  for (const col of cols) {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const task of tasks) {
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

    const tdDue = document.createElement('td');
    tdDue.className = `compliance-task-td compliance-task-td--date${overdue ? ' compliance-task-td--overdue' : ''}`;
    tdDue.textContent = task.duedate ?? '—';
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

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

const STATUS_EN = {
  'Completado':  'Closed',
  'En Progreso': 'Open',
  'No Iniciado': 'Open',
  'Bloqueado':   'Blocked',
  'Rechazado':   'Closed',
};

function statusLabel(status) {
  return STATUS_EN[status] ?? status;
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
