/**
 * Region View — I4G Integration Tracker
 *
 * Groups companies by region (Americas, EMEA & New Markets) with
 * visual separators, ITX Manager headers, and aggregated metrics.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 *
 * @module region-view
 */

import { groupByRegion } from '../business/presentation-utils.js';
import { createProgressBar } from './components.js';

/**
 * Static map of region → ITX Manager names.
 */
const ITX_MANAGERS = {
  'Americas': 'Daniel Rico, Alejandra Sierra, Guilherme Braun, Matias Olivera, Ana Figuls',
  'EMEA & New Markets': 'Leena Kurup, Ezequiel Pelletieri',
};

/**
 * Render the region view into the given container.
 *
 * @param {HTMLElement} container - DOM container to render into
 * @param {object} model - DashboardModel
 */
export function renderRegionView(container, model) {
  container.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'region-view__title';
  heading.textContent = 'Vista por Región';
  container.appendChild(heading);

  const groups = groupByRegion(model.companies);

  if (Object.keys(groups).length === 0) {
    const msg = document.createElement('p');
    msg.className = 'empty-state__message';
    msg.textContent = 'No hay empresas para mostrar.';
    container.appendChild(msg);
    return;
  }

  // Render each region group
  for (const [region, group] of Object.entries(groups)) {
    const section = buildRegionSection(region, group);
    container.appendChild(section);
  }
}

/**
 * Build a region section with header, metrics, and company rows.
 *
 * @param {string} region
 * @param {{ companies: Array, avgCompletion: number, blockedTracks: number }} group
 * @returns {HTMLElement}
 */
function buildRegionSection(region, group) {
  const section = document.createElement('section');
  section.className = 'region-section';

  // Region header with ITX Manager
  const header = document.createElement('div');
  header.className = 'region-section__header';

  const regionTitle = document.createElement('h3');
  regionTitle.className = 'region-section__title';
  regionTitle.textContent = region;
  header.appendChild(regionTitle);

  const managerName = ITX_MANAGERS[region] || '';
  if (managerName) {
    const managerEl = document.createElement('p');
    managerEl.className = 'region-section__manager';
    managerEl.textContent = `ITX Managers: ${managerName}`;
    header.appendChild(managerEl);
  }

  section.appendChild(header);

  // Aggregated metrics
  const metrics = document.createElement('div');
  metrics.className = 'region-section__metrics';

  const avgEl = document.createElement('span');
  avgEl.className = 'region-metric';
  avgEl.textContent = `Completitud promedio: ${Math.round(group.avgCompletion)}%`;
  metrics.appendChild(avgEl);

  const blockedEl = document.createElement('span');
  blockedEl.className = 'region-metric';
  blockedEl.textContent = `Tracks bloqueados: ${group.blockedTracks}`;
  metrics.appendChild(blockedEl);

  section.appendChild(metrics);

  // Company rows
  const table = document.createElement('table');
  table.className = 'table region-company-table';
  table.setAttribute('aria-label', `Empresas en ${region}`);

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const colName of ['Empresa', 'Año', 'Progreso']) {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = colName;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const company of group.companies) {
    const row = buildCompanyRow(company);
    tbody.appendChild(row);
  }
  table.appendChild(tbody);

  section.appendChild(table);

  return section;
}

/**
 * Build a summary row for a company within a region.
 *
 * @param {object} company
 * @returns {HTMLTableRowElement}
 */
function buildCompanyRow(company) {
  const row = document.createElement('tr');
  row.className = 'region-company-row';

  // Name
  const tdName = document.createElement('td');
  tdName.textContent = company.name;
  row.appendChild(tdName);

  // Year
  const tdYear = document.createElement('td');
  tdYear.textContent = company.year !== null ? String(company.year) : '—';
  row.appendChild(tdYear);

  // Overall progress (average of all tracks)
  const tracks = company.tracks || [];
  let totalProgress = 0;
  for (const t of tracks) {
    totalProgress += t.progress ?? 0;
  }
  const avgProgress = tracks.length > 0 ? totalProgress / tracks.length : 0;

  const tdProgress = document.createElement('td');
  const progressBar = createProgressBar(avgProgress, 'Medium');
  tdProgress.appendChild(progressBar);
  row.appendChild(tdProgress);

  return row;
}
