/**
 * Filters View — I4G Integration Tracker
 *
 * Multi-select filter controls for Severity, Year, Region, Status, and Company Status.
 * Each filter is a dropdown with checkboxes; empty selection = "all".
 *
 * @module filters-view
 */

import { getAvailableYears } from '../business/filters.js';
import { SEVERITIES, REGIONS, DASHBOARD_STATUSES, COMPANY_OVERALL_STATUSES } from '../constants.js';

/** @type {HTMLElement|null} */
let filtersContainer = null;

const EMPTY_FILTERS = () => ({
  severity: [],
  year: [],
  region: [],
  status: [],
  companyStatus: [],
});

/** Current filter state */
let currentFilters = EMPTY_FILTERS();

/**
 * Render filter controls into the given container.
 */
export function renderFilters(container, model, onFilterChange) {
  filtersContainer = container;
  container.textContent = '';
  currentFilters = EMPTY_FILTERS();

  const bar = document.createElement('div');
  bar.className = 'filter-bar';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Filtros de la matriz');

  const years = getAvailableYears(model);

  const groups = [
    {
      label: 'Severidad',
      id: 'filter-severity',
      allLabel: 'Todas',
      options: SEVERITIES.map(s => ({ value: s, label: s })),
      key: 'severity',
    },
    {
      label: 'Año',
      id: 'filter-year',
      allLabel: 'Todos',
      options: years.map(y => ({ value: String(y), label: String(y) })),
      key: 'year',
      numeric: true,
    },
    {
      label: 'Región',
      id: 'filter-region',
      allLabel: 'Todas',
      options: REGIONS.map(r => ({ value: r, label: r })),
      key: 'region',
    },
    {
      label: 'Estado track',
      id: 'filter-status',
      allLabel: 'Todos',
      options: DASHBOARD_STATUSES.map(s => ({ value: s, label: s })),
      key: 'status',
    },
    {
      label: 'Estado empresa',
      id: 'filter-company-status',
      allLabel: 'Todas',
      options: COMPANY_OVERALL_STATUSES.map(s => ({ value: s.value, label: `${s.icon} ${s.label}` })),
      key: 'companyStatus',
    },
  ];

  for (const def of groups) {
    const group = buildMultiSelect(def, (selected) => {
      if (def.numeric) {
        currentFilters[def.key] = selected.map(Number);
      } else {
        currentFilters[def.key] = selected;
      }
      onFilterChange({ ...currentFilters });
    });
    bar.appendChild(group);
  }

  container.appendChild(bar);

  // Close all dropdowns when clicking outside the filter bar
  document.addEventListener('click', onOutsideClick, { capture: true });
}

function onOutsideClick(e) {
  if (!filtersContainer) return;
  if (!filtersContainer.contains(e.target)) {
    filtersContainer.querySelectorAll('.ms-dropdown--open').forEach(el => {
      el.classList.remove('ms-dropdown--open');
    });
  }
}

/**
 * Build a multi-select filter group.
 */
function buildMultiSelect({ label, id, allLabel, options }, onChange) {
  const group = document.createElement('div');
  group.className = 'filter-group';

  const labelEl = document.createElement('span');
  labelEl.className = 'filter-group__label';
  labelEl.textContent = label;
  group.appendChild(labelEl);

  const dropdown = document.createElement('div');
  dropdown.className = 'ms-dropdown';
  dropdown.id = id;

  // Button
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ms-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');

  const btnLabel = document.createElement('span');
  btnLabel.className = 'ms-btn__label';
  btnLabel.textContent = allLabel;
  btn.appendChild(btnLabel);

  const arrow = document.createElement('span');
  arrow.className = 'ms-btn__arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '▾';
  btn.appendChild(arrow);

  dropdown.appendChild(btn);

  // Panel
  const panel = document.createElement('div');
  panel.className = 'ms-panel';
  panel.setAttribute('role', 'listbox');
  panel.setAttribute('aria-multiselectable', 'true');

  let selected = new Set();

  const updateButton = () => {
    if (selected.size === 0) {
      btnLabel.textContent = allLabel;
    } else if (selected.size === 1) {
      btnLabel.textContent = [...selected][0];
    } else {
      btnLabel.textContent = `${selected.size} seleccionados`;
    }
  };

  // "Seleccionar todo / limpiar" row
  const allRow = document.createElement('label');
  allRow.className = 'ms-option ms-option--all';
  const allCheck = document.createElement('input');
  allCheck.type = 'checkbox';
  allCheck.className = 'ms-option__check';
  allRow.appendChild(allCheck);
  const allText = document.createElement('span');
  allText.textContent = allLabel;
  allRow.appendChild(allText);
  panel.appendChild(allRow);

  const checkboxes = [];

  for (const opt of options) {
    const row = document.createElement('label');
    row.className = 'ms-option';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'ms-option__check';
    check.value = opt.value;
    check.addEventListener('change', () => {
      if (check.checked) {
        selected.add(opt.value);
      } else {
        selected.delete(opt.value);
      }
      allCheck.checked = selected.size === options.length;
      allCheck.indeterminate = selected.size > 0 && selected.size < options.length;
      updateButton();
      onChange([...selected]);
    });
    checkboxes.push(check);
    row.appendChild(check);
    const text = document.createElement('span');
    text.textContent = opt.label;
    row.appendChild(text);
    panel.appendChild(row);
  }

  allCheck.addEventListener('change', () => {
    if (allCheck.checked) {
      checkboxes.forEach(c => { c.checked = true; selected.add(c.value); });
    } else {
      checkboxes.forEach(c => { c.checked = false; });
      selected.clear();
    }
    allCheck.indeterminate = false;
    updateButton();
    onChange([...selected]);
  });

  dropdown.appendChild(panel);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('ms-dropdown--open');
    // Close all other dropdowns
    document.querySelectorAll('.ms-dropdown--open').forEach(el => {
      if (el !== dropdown) el.classList.remove('ms-dropdown--open');
    });
    dropdown.classList.toggle('ms-dropdown--open', !isOpen);
    btn.setAttribute('aria-expanded', String(!isOpen));
  });

  group.appendChild(dropdown);
  return group;
}
