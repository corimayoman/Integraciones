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
  const severityColors = {
    Critical: 'var(--color-severity-critical)',
    High: 'var(--color-severity-high)',
    Medium: 'var(--color-severity-medium)',
    Low: 'var(--color-severity-low)',
  };
  for (const [sev, color] of Object.entries(severityColors)) {
    const item = document.createElement('span');
    item.className = 'chart-legend__item';

    const swatch = document.createElement('span');
    swatch.className = 'chart-legend__swatch';
    swatch.style.backgroundColor = color;
    item.appendChild(swatch);

    const label = document.createElement('span');
    label.textContent = sev;
    item.appendChild(label);

    legend.appendChild(item);
  }
  section.appendChild(legend);

  // Chart area — one group per year
  const chartArea = document.createElement('div');
  chartArea.className = 'chart-area';

  for (let i = 0; i < chartData.years.length; i++) {
    const yearGroup = document.createElement('div');
    yearGroup.className = 'chart-year-group';

    const yearLabel = document.createElement('div');
    yearLabel.className = 'chart-year-label';
    yearLabel.textContent = String(chartData.years[i]);
    yearGroup.appendChild(yearLabel);

    const barsContainer = document.createElement('div');
    barsContainer.className = 'chart-bars';

    for (const serie of chartData.series) {
      const barWrapper = document.createElement('div');
      barWrapper.className = 'chart-bar-wrapper';

      const bar = document.createElement('div');
      bar.className = `chart-bar chart-bar--${serie.severity.toLowerCase()}`;
      bar.style.width = `${serie.values[i]}%`;
      bar.setAttribute('role', 'img');
      bar.setAttribute('aria-label', `${serie.severity}: ${serie.values[i]}%`);
      barWrapper.appendChild(bar);

      const valLabel = document.createElement('span');
      valLabel.className = 'chart-bar-value';
      valLabel.textContent = `${serie.values[i]}%`;
      barWrapper.appendChild(valLabel);

      barsContainer.appendChild(barWrapper);
    }

    yearGroup.appendChild(barsContainer);
    chartArea.appendChild(yearGroup);
  }

  section.appendChild(chartArea);
  return section;
}
