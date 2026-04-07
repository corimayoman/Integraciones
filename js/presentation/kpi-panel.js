/**
 * KPI Panel — I4G Integration Tracker
 *
 * Renders KPI cards, year summary table, and severity bar chart.
 * Pure CSS bars (no chart library).
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 17.2, 17.3
 *
 * @module kpi-panel
 */

import { calculateKPIs, calculateYearSummary, calculateSeverityChart } from '../business/kpis.js';

/** @type {HTMLElement|null} */
let kpiContainer = null;

/**
 * Render the KPI panel into the given container.
 *
 * @param {HTMLElement} container
 * @param {object} model - DashboardModel
 */
export function renderKPIPanel(container, model) {
  kpiContainer = container;
  container.textContent = '';

  const kpis = calculateKPIs(model);
  const yearSummary = calculateYearSummary(model);
  const chartData = calculateSeverityChart(model);

  // KPI Cards
  const cardsSection = buildKPICards(kpis);
  container.appendChild(cardsSection);

  // Year Summary Table
  if (yearSummary.length > 0) {
    const tableSection = buildYearSummaryTable(yearSummary);
    container.appendChild(tableSection);
  }

  // Severity Bar Chart
  if (chartData.years.length > 0) {
    const chartSection = buildSeverityChart(chartData);
    container.appendChild(chartSection);
  }
}

/**
 * Update the KPI panel with new model data.
 *
 * @param {object} model - DashboardModel
 */
export function updateKPIPanel(model) {
  if (!kpiContainer) return;
  renderKPIPanel(kpiContainer, model);
}


/**
 * Build the KPI cards grid.
 * @param {object} kpis
 * @returns {HTMLElement}
 */
function buildKPICards(kpis) {
  const section = document.createElement('section');
  section.className = 'kpi-cards';
  section.setAttribute('aria-label', 'Indicadores clave de rendimiento');

  const cards = [
    { label: 'Empresas Activas', value: String(kpis.totalActiveCompanies), icon: '🏢' },
    { label: 'Completitud Global', value: `${kpis.globalCompletionPercent}%`, icon: '📊' },
    { label: 'Tracks Bloqueados', value: String(kpis.blockedTracksCount), icon: '🚫' },
    { label: 'Críticos en Progreso', value: String(kpis.criticalInProgressCount), icon: '⚠' },
  ];

  for (const cardData of cards) {
    const card = document.createElement('div');
    card.className = 'kpi-card card';

    const iconEl = document.createElement('div');
    iconEl.className = 'kpi-card__icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = cardData.icon;
    card.appendChild(iconEl);

    const valueEl = document.createElement('div');
    valueEl.className = 'kpi-card__value';
    valueEl.textContent = cardData.value;
    card.appendChild(valueEl);

    const labelEl = document.createElement('div');
    labelEl.className = 'kpi-card__label';
    labelEl.textContent = cardData.label;
    card.appendChild(labelEl);

    section.appendChild(card);
  }

  return section;
}

/**
 * Build the year summary table.
 * @param {Array<object>} yearSummary
 * @returns {HTMLElement}
 */
function buildYearSummaryTable(yearSummary) {
  const section = document.createElement('section');
  section.className = 'kpi-year-summary';

  const heading = document.createElement('h3');
  heading.className = 'kpi-section-title';
  heading.textContent = 'Resumen por Año';
  section.appendChild(heading);

  const table = document.createElement('table');
  table.className = 'table kpi-year-table';

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const headers = ['Año', 'Empresas', 'Critical', 'High', 'Medium', 'Low'];
  for (const h of headers) {
    const th = document.createElement('th');
    th.setAttribute('scope', 'col');
    th.textContent = h;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  for (const row of yearSummary) {
    const tr = document.createElement('tr');

    const tdYear = document.createElement('td');
    tdYear.textContent = String(row.year);
    tr.appendChild(tdYear);

    const tdCount = document.createElement('td');
    tdCount.textContent = String(row.companyCount);
    tr.appendChild(tdCount);

    const severities = ['Critical', 'High', 'Medium', 'Low'];
    for (const sev of severities) {
      const td = document.createElement('td');
      td.textContent = `${row.avgCompletionBySeverity[sev]}%`;
      td.className = `kpi-year-table__cell--${sev.toLowerCase()}`;
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  section.appendChild(table);

  return section;
}

/**
 * Build the severity bar chart using pure CSS bars.
 * @param {{ years: number[], series: Array<{ severity: string, values: number[] }> }} chartData
 * @returns {HTMLElement}
 */
function buildSeverityChart(chartData) {
  const section = document.createElement('section');
  section.className = 'kpi-severity-chart';

  const heading = document.createElement('h3');
  heading.className = 'kpi-section-title';
  heading.textContent = 'Actividades Completadas por Severidad';
  section.appendChild(heading);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  const severityMeta = [
    { name: 'Critical', cssVar: 'var(--color-severity-critical)' },
    { name: 'High', cssVar: 'var(--color-severity-high)' },
    { name: 'Medium', cssVar: 'var(--color-severity-medium)' },
    { name: 'Low', cssVar: 'var(--color-severity-low)' },
  ];
  for (const sev of severityMeta) {
    const item = document.createElement('span');
    item.className = 'chart-legend__item';

    const swatch = document.createElement('span');
    swatch.className = 'chart-legend__dot';
    swatch.style.backgroundColor = sev.cssVar;
    item.appendChild(swatch);

    const label = document.createElement('span');
    label.textContent = sev.name;
    item.appendChild(label);

    legend.appendChild(item);
  }
  section.appendChild(legend);

  // Dot grid — one row per year, one dot per severity
  const grid = document.createElement('div');
  grid.className = 'chart-dot-grid';

  for (let i = 0; i < chartData.years.length; i++) {
    const row = document.createElement('div');
    row.className = 'chart-dot-row';

    const yearLabel = document.createElement('span');
    yearLabel.className = 'chart-dot-year';
    yearLabel.textContent = String(chartData.years[i]);
    row.appendChild(yearLabel);

    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'chart-dots';

    for (const serie of chartData.series) {
      const val = serie.values[i];
      const dotWrapper = document.createElement('div');
      dotWrapper.className = 'chart-dot-item';

      const dot = document.createElement('span');
      dot.className = `chart-dot chart-dot--${serie.severity.toLowerCase()}`;
      // Size the dot based on completion (min 8px, max 24px)
      const size = Math.max(8, Math.round((val / 100) * 24));
      dot.style.width = `${size}px`;
      dot.style.height = `${size}px`;
      // Full opacity when 100%, partial when less
      dot.style.opacity = val === 0 ? '0.2' : String(Math.max(0.4, val / 100));
      dot.setAttribute('title', `${serie.severity}: ${val}%`);
      dotWrapper.appendChild(dot);

      const valLabel = document.createElement('span');
      valLabel.className = 'chart-dot-value';
      valLabel.textContent = `${val}%`;
      dotWrapper.appendChild(valLabel);

      dotsContainer.appendChild(dotWrapper);
    }

    row.appendChild(dotsContainer);
    grid.appendChild(row);
  }

  section.appendChild(grid);
  return section;
}
