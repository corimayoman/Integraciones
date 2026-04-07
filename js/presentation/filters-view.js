/**
 * Filters View — I4G Integration Tracker
 *
 * Renders filter controls for Severity, Year, Region, and Status.
 * Applies filters with AND logic and notifies via callback.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 *
 * @module filters-view
 */

import { getAvailableYears } from '../business/filters.js';
import { SEVERITIES, REGIONS, DASHBOARD_STATUSES } from '../constants.js';

/** @type {HTMLElement|null} */
let filtersContainer = null;

/** Current filter state */
let currentFilters = {
  severity: null,
  year: null,
  region: null,
  status: null,
};

/**
 * Render filter controls into the given container.
 *
 * @param {HTMLElement} container
 * @param {object} model - DashboardModel (used to extract available years)
 * @param {(filters: { severity: string|null, year: number|null, region: string|null, status: string|null }) => void} onFilterChange
 */
export function renderFilters(container, model, onFilterChange) {
  filtersContainer = container;
  container.textContent = '';

  // Reset filters
  currentFilters = { severity: null, year: null, region: null, status: null };

  const bar = document.createElement('div');
  bar.className = 'filter-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Filtros de la matriz');

  // Severity filter
  const severityGroup = buildFilterGroup(
    'Severidad',
    'filter-severity',
    [{ value: '', label: 'Todas' }, ...SEVERITIES.map(s => ({ value: s, label: s }))],
    (val) => {
      currentFilters.severity = val || null;
      onFilterChange({ ...currentFilters });
    },
  );
  bar.appendChild(severityGroup);

  // Year filter
  const years = getAvailableYears(model);
  const yearGroup = buildFilterGroup(
    'Año',
    'filter-year',
    [{ value: '', label: 'Todos' }, ...years.map(y => ({ value: String(y), label: String(y) }))],
    (val) => {
      currentFilters.year = val ? Number(val) : null;
      onFilterChange({ ...currentFilters });
    },
  );
  bar.appendChild(yearGroup);

  // Region filter
  const regionGroup = buildFilterGroup(
    'Región',
    'filter-region',
    [{ value: '', label: 'Todas' }, ...REGIONS.map(r => ({ value: r, label: r }))],
    (val) => {
      currentFilters.region = val || null;
      onFilterChange({ ...currentFilters });
    },
  );
  bar.appendChild(regionGroup);

  // Status filter
  const statusGroup = buildFilterGroup(
    'Estado',
    'filter-status',
    [{ value: '', label: 'Todos' }, ...DASHBOARD_STATUSES.map(s => ({ value: s, label: s }))],
    (val) => {
      currentFilters.status = val || null;
      onFilterChange({ ...currentFilters });
    },
  );
  bar.appendChild(statusGroup);

  container.appendChild(bar);
}

/**
 * Build a single filter group (label + select).
 *
 * @param {string} labelText
 * @param {string} id
 * @param {Array<{ value: string, label: string }>} options
 * @param {(value: string) => void} onChange
 * @returns {HTMLElement}
 */
function buildFilterGroup(labelText, id, options, onChange) {
  const group = document.createElement('div');
  group.className = 'filter-group';

  const label = document.createElement('label');
  label.className = 'filter-group__label';
  label.setAttribute('for', id);
  label.textContent = labelText;
  group.appendChild(label);

  const select = document.createElement('select');
  select.className = 'filter-group__select';
  select.id = id;
  select.name = id;

  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  }

  select.addEventListener('change', () => {
    onChange(select.value);
  });

  group.appendChild(select);
  return group;
}
