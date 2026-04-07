/**
 * Matrix View — I4G Integration Tracker
 *
 * Renders the integration matrix: Companies (rows) × 14 Tracks (columns).
 * Cells colored by status, tooltips on hover, expandable rows on click.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 *
 * @module matrix-view
 */

import { INTEGRATION_TRACKS } from '../constants.js';
import {
  getCellColor,
  getSeverityColor,
  getTooltipContent,
  sortCompaniesByYear,
} from '../business/presentation-utils.js';
import { createBadge, createTooltip, createProgressBar } from './components.js';

/** @type {HTMLElement|null} */
let matrixContainer = null;

/** @type {Set<string>} Track expanded company IDs */
const expandedRows = new Set();

/**
 * Render the full matrix view into the given container.
 *
 * @param {HTMLElement} container
 * @param {object} model - DashboardModel
 */
export function renderMatrixView(container, model) {
  matrixContainer = container;
  container.textContent = '';

  const sorted = sortCompaniesByYear(model.companies);

  if (sorted.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'empty-state__message';
    msg.textContent = 'No hay empresas para mostrar con los filtros actuales.';
    container.appendChild(msg);
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'matrix-wrapper';

  const table = document.createElement('table');
  table.className = 'table matrix-table';
  table.setAttribute('role', 'grid');
  table.setAttribute('aria-label', 'Matriz de Integración');

  table.appendChild(buildTableHead());
  table.appendChild(buildTableBody(sorted));

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}

/**
 * Update the matrix view with new model data.
 *
 * @param {object} model - DashboardModel
 */
export function updateMatrixView(model) {
  if (!matrixContainer) return;
  renderMatrixView(matrixContainer, model);
}

/**
 * Build the table header row with track columns.
 * @returns {HTMLTableSectionElement}
 */
function buildTableHead() {
  const thead = document.createElement('thead');
  const row = document.createElement('tr');

  // Company name column header
  const thCompany = document.createElement('th');
  thCompany.className = 'matrix-header-company';
  thCompany.setAttribute('scope', 'col');
  thCompany.textContent = 'Empresa';
  row.appendChild(thCompany);

  // One column per track
  for (const track of INTEGRATION_TRACKS) {
    const th = document.createElement('th');
    th.className = 'matrix-header-track';
    th.setAttribute('scope', 'col');

    const numSpan = document.createElement('span');
    numSpan.className = 'matrix-header-track__number';
    numSpan.textContent = String(track.number).padStart(2, '0');
    th.appendChild(numSpan);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'matrix-header-track__name';
    nameSpan.textContent = abbreviateTrackName(track.name);
    th.appendChild(nameSpan);

    // Severity badge icon
    const sevClass = `severity-${track.severity.toLowerCase()}`;
    const badge = createBadge(track.severity, sevClass);
    badge.classList.add('matrix-header-track__severity');
    th.appendChild(badge);

    row.appendChild(th);
  }

  thead.appendChild(row);
  return thead;
}


/**
 * Build the table body with company rows.
 * @param {Array<object>} companies - sorted companies
 * @returns {HTMLTableSectionElement}
 */
function buildTableBody(companies) {
  const tbody = document.createElement('tbody');

  for (const company of companies) {
    const mainRow = buildCompanyRow(company);
    tbody.appendChild(mainRow);

    // Expandable detail row
    const detailRow = buildDetailRow(company);
    if (!expandedRows.has(company.id)) {
      detailRow.style.display = 'none';
    }
    tbody.appendChild(detailRow);
  }

  return tbody;
}

/**
 * Build a single company row.
 * @param {object} company
 * @returns {HTMLTableRowElement}
 */
function buildCompanyRow(company) {
  const row = document.createElement('tr');
  row.className = 'matrix-row';
  row.setAttribute('role', 'row');
  row.setAttribute('aria-expanded', String(expandedRows.has(company.id)));
  row.style.cursor = 'pointer';

  // Company name cell
  const tdName = document.createElement('td');
  tdName.className = 'matrix-cell-company';

  const nameText = document.createElement('span');
  nameText.textContent = company.name;
  tdName.appendChild(nameText);

  if (company.year !== null) {
    const yearSpan = document.createElement('span');
    yearSpan.className = 'matrix-cell-company__year';
    yearSpan.textContent = ` (${company.year})`;
    tdName.appendChild(yearSpan);
  }

  row.appendChild(tdName);

  // Track cells — build a map for quick lookup
  const trackMap = new Map();
  for (const t of company.tracks) {
    trackMap.set(t.trackNumber, t);
  }

  for (const trackDef of INTEGRATION_TRACKS) {
    const td = document.createElement('td');
    td.className = 'matrix-cell';
    td.setAttribute('role', 'gridcell');

    const track = trackMap.get(trackDef.number);

    if (track) {
      const colorClass = getCellColor(track.status);
      td.setAttribute('tabindex', '0');

      // Status dot instead of colored background
      const dot = document.createElement('span');
      dot.className = `matrix-dot matrix-dot--${colorClass}`;
      dot.setAttribute('aria-label', track.status);
      td.appendChild(dot);

      // Tooltip
      const tooltipContent = getTooltipContent(track);
      const tooltip = createTooltip(tooltipContent, td);
      td.appendChild(tooltip);
    } else {
      // Empty cell — no track data
      const dot = document.createElement('span');
      dot.className = 'matrix-dot matrix-dot--empty';
      td.appendChild(dot);
    }

    row.appendChild(td);
  }

  // Click to expand/collapse
  row.addEventListener('click', () => {
    const isExpanded = expandedRows.has(company.id);
    if (isExpanded) {
      expandedRows.delete(company.id);
    } else {
      expandedRows.add(company.id);
    }
    row.setAttribute('aria-expanded', String(!isExpanded));

    // Toggle detail row visibility
    const detailRow = row.nextElementSibling;
    if (detailRow && detailRow.classList.contains('matrix-detail-row')) {
      detailRow.style.display = isExpanded ? 'none' : '';
    }
  });

  return row;
}

/**
 * Build the expandable detail row for a company.
 * @param {object} company
 * @returns {HTMLTableRowElement}
 */
function buildDetailRow(company) {
  const row = document.createElement('tr');
  row.className = 'matrix-detail-row';

  const td = document.createElement('td');
  td.className = 'matrix-detail-cell';
  td.setAttribute('colspan', String(INTEGRATION_TRACKS.length + 1));

  const detailContainer = document.createElement('div');
  detailContainer.className = 'matrix-detail';

  // Build a map for quick lookup
  const trackMap = new Map();
  for (const t of company.tracks) {
    trackMap.set(t.trackNumber, t);
  }

  for (const trackDef of INTEGRATION_TRACKS) {
    const track = trackMap.get(trackDef.number);
    const trackSection = document.createElement('div');
    trackSection.className = 'matrix-detail__track';

    // Track header
    const header = document.createElement('div');
    header.className = 'matrix-detail__track-header';

    const trackTitle = document.createElement('span');
    trackTitle.className = 'matrix-detail__track-title';
    trackTitle.textContent = `${String(trackDef.number).padStart(2, '0')}. ${trackDef.name}`;
    header.appendChild(trackTitle);

    const sevClass = `severity-${trackDef.severity.toLowerCase()}`;
    const sevBadge = createBadge(trackDef.severity, sevClass);
    header.appendChild(sevBadge);

    if (track) {
      const statusClass = getCellColor(track.status);
      const statusBadge = createBadge(track.status, `status-${statusClass.replace('status-', '')}`);
      header.appendChild(statusBadge);

      const progressBar = createProgressBar(track.progress, trackDef.severity);
      header.appendChild(progressBar);
    } else {
      const naBadge = createBadge('Sin datos', 'status-not-started');
      header.appendChild(naBadge);
    }

    trackSection.appendChild(header);

    // Subtask list
    if (track && track.subtasks.length > 0) {
      const subtaskList = document.createElement('ul');
      subtaskList.className = 'matrix-detail__subtasks';

      for (const subtask of track.subtasks) {
        const li = document.createElement('li');
        li.className = 'matrix-detail__subtask';

        if (subtask.status === 'Bloqueado') {
          li.classList.add('matrix-detail__subtask--blocked');
        }

        const statusIcon = document.createElement('span');
        statusIcon.className = `matrix-detail__subtask-status matrix-detail__subtask-status--${getCellColor(subtask.status)}`;
        statusIcon.setAttribute('aria-hidden', 'true');
        statusIcon.textContent = getStatusIcon(subtask.status);
        li.appendChild(statusIcon);

        const summary = document.createElement('span');
        summary.className = 'matrix-detail__subtask-summary';
        summary.textContent = subtask.summary;
        li.appendChild(summary);

        const stLabel = document.createElement('span');
        stLabel.className = 'matrix-detail__subtask-label';
        stLabel.textContent = subtask.status;
        li.appendChild(stLabel);

        subtaskList.appendChild(li);
      }

      trackSection.appendChild(subtaskList);
    }

    detailContainer.appendChild(trackSection);
  }

  td.appendChild(detailContainer);
  row.appendChild(td);
  return row;
}

/**
 * Abbreviate a track name for column headers.
 * @param {string} name
 * @returns {string}
 */
function abbreviateTrackName(name) {
  if (name.length <= 12) return name;
  return name.slice(0, 10) + '…';
}

/**
 * Get a status icon character.
 * @param {string} status
 * @returns {string}
 */
function getStatusIcon(status) {
  const icons = {
    'Completado': '✓',
    'En Progreso': '◐',
    'No Iniciado': '○',
    'Bloqueado': '✕',
    'Rechazado': '⊘',
  };
  return icons[status] ?? '○';
}
