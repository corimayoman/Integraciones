/**
 * Compliance View — G4G Compliance Dashboard
 *
 * Renders a dashboard with 3 dimensions: SOX (5 sub-dims), Compliance, GIST.
 * Shows task completion vs due-date tracking per initiative/epic.
 *
 * @module compliance-view
 */

import { computeStats } from '../business/compliance-transformer.js';

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
 * @param {boolean} loading
 * @param {string|null} error
 */
export function renderComplianceView(container, complianceModel, loading, error) {
  container.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'compliance-view';

  const title = document.createElement('h2');
  title.className = 'compliance-title';
  title.textContent = 'G4G Compliance Dashboard';
  wrapper.appendChild(title);

  if (loading) {
    const spinner = document.createElement('p');
    spinner.className = 'compliance-loading';
    spinner.textContent = 'Cargando datos de Jira…';
    wrapper.appendChild(spinner);
    container.appendChild(wrapper);
    return;
  }

  if (error) {
    const errEl = document.createElement('p');
    errEl.className = 'compliance-error';
    errEl.textContent = `Error al cargar datos: ${error}`;
    wrapper.appendChild(errEl);
    container.appendChild(wrapper);
    return;
  }

  if (!complianceModel) {
    const empty = document.createElement('p');
    empty.className = 'empty-state__message';
    empty.textContent = 'No hay datos de compliance disponibles.';
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

  // GIST section
  grid.appendChild(buildDimensionCard('GIST Compliance', complianceModel.gist.initiative, complianceModel.gist.epic, complianceModel.gist.tasks, complianceModel.gist.stats, 'gist'));

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
    card.appendChild(buildTaskList(dim.tasks));
  }

  return card;
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
    summary.textContent = `Ver tareas (${tasks.length})`;
    taskSection.appendChild(summary);
    taskSection.appendChild(buildTaskList(tasks));
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
  tag.textContent = `${initiative.key} · ${initiative.status}`;
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

  pills.appendChild(makePill(`${stats.completed}/${stats.total} completadas`, 'neutral'));
  if (stats.overdue > 0) {
    pills.appendChild(makePill(`${stats.overdue} vencida${stats.overdue !== 1 ? 's' : ''}`, 'danger'));
  } else {
    pills.appendChild(makePill('Sin vencimientos', 'ok'));
  }

  return pills;
}

function makePill(text, variant) {
  const pill = document.createElement('span');
  pill.className = `compliance-pill compliance-pill--${variant}`;
  pill.textContent = text;
  return pill;
}

function buildTaskList(tasks) {
  const today = new Date().toISOString().slice(0, 10);

  const wrap = document.createElement('div');
  wrap.className = 'compliance-task-table-wrap';

  const table = document.createElement('table');
  table.className = 'compliance-task-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const col of ['ID', 'Título', 'Asignado a', 'Creado', 'Vence', 'Estado']) {
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
    tdKey.textContent = task.key;
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

    const tdStatus = document.createElement('td');
    tdStatus.className = 'compliance-task-td';
    const badge = document.createElement('span');
    badge.className = `compliance-status-badge compliance-status-badge--${statusClass(task.status)}`;
    badge.textContent = task.status;
    tdStatus.appendChild(badge);
    tr.appendChild(tdStatus);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
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
