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
  getTooltipContent,
  sortCompaniesByYear,
  getCompanyOverallStatus,
} from '../business/presentation-utils.js';
import { createTooltip } from './components.js';

/** @type {HTMLElement|null} */
let matrixContainer = null;


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
    tbody.appendChild(buildCompanyRow(company));
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

  // Company name cell
  const tdName = document.createElement('td');
  tdName.className = 'matrix-cell-company';

  // Overall company status indicator — placed before the name
  const overallStatus = getCompanyOverallStatus(company);
  const badgeConfig = {
    'Completado':  { mod: 'completed',   icon: '✓', label: 'Integración completada' },
    'En Progreso': { mod: 'in-progress', icon: '●', label: 'Integración en progreso' },
    'No Iniciado': { mod: 'not-started', icon: '○', label: 'Integración no iniciada' },
    'Estancado':   { mod: 'stalled',     icon: '⏸', label: 'Integración estancada — sin actividad reciente' },
  }[overallStatus] ?? { mod: 'not-started', icon: '○', label: '' };
  const statusBadge = document.createElement('span');
  statusBadge.className = `company-status-badge company-status-badge--${badgeConfig.mod}`;
  statusBadge.textContent = badgeConfig.icon;
  statusBadge.title = badgeConfig.label;
  statusBadge.setAttribute('aria-label', badgeConfig.label);
  tdName.appendChild(statusBadge);

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

