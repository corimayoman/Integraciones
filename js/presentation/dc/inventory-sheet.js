/**
 * Inventory Sheet View — Data Collection Module
 *
 * Renders an editable table for Apps and Compliance sheets.
 * Columns are defined by SHEET_DEFINITIONS, with visual differentiation
 * between Columnas_Empresa and Columnas_Globant.
 * Supports inline editing, add row, delete row with confirmation.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 4.1, 4.2
 *
 * @module dc/inventory-sheet
 */

import { SHEET_DEFINITIONS, getEditableColumns } from '../../business/sheet-logic.js';
import { fetchSheetData, addRow, updateRow, deleteRow, getCurrentUser } from '../../data/dc-api-client.js';
import { createSpinner, createErrorState, createEmptyState } from '../components.js';

/**
 * Render the inventory sheet into the given container.
 * @param {HTMLElement} container - DOM container to render into
 * @param {string|number} empresaId - Company ID
 * @param {string} sheetId - Sheet ID ('apps' or 'compliance')
 */
export function renderInventorySheet(container, empresaId, sheetId) {
  container.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'dc-inventory';

  const spinner = createSpinner('md');
  wrapper.appendChild(spinner);
  container.appendChild(wrapper);

  loadInventoryData(wrapper, spinner, empresaId, sheetId);
}

/**
 * Load sheet data and render the table.
 */
async function loadInventoryData(wrapper, spinner, empresaId, sheetId) {
  try {
    const result = await fetchSheetData(empresaId, sheetId);
    spinner.remove();

    if (!result.ok) {
      wrapper.appendChild(createErrorState(
        result.error || 'Error al cargar datos.',
        () => renderInventorySheet(wrapper.parentElement, empresaId, sheetId)
      ));
      return;
    }

    const rows = result.data || [];
    renderInventoryTable(wrapper, rows, empresaId, sheetId);
  } catch {
    spinner.remove();
    wrapper.appendChild(createErrorState('Error de conexión al cargar datos.'));
  }
}

/**
 * Render the full inventory table with toolbar.
 */
function renderInventoryTable(wrapper, rows, empresaId, sheetId) {
  const def = SHEET_DEFINITIONS[sheetId];
  if (!def) return;

  const user = getCurrentUser();
  const userRole = user?.role === 'admin' ? 'admin' : getUserRoleForDisplay(user);
  const { editable } = getEditableColumns(sheetId, userRole);
  const editableSet = new Set(editable);

  const empresaCols = def.empresa;
  const globantCols = def.globant;
  const allCols = [...empresaCols, ...globantCols];

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'dc-inventory__toolbar';

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn--primary btn--sm';
  addBtn.textContent = '+ Agregar fila';
  addBtn.setAttribute('aria-label', 'Agregar nueva fila');
  addBtn.addEventListener('click', () => handleAddRow(wrapper, empresaId, sheetId));
  toolbar.appendChild(addBtn);

  wrapper.appendChild(toolbar);

  if (rows.length === 0) {
    wrapper.appendChild(createEmptyState('No hay datos. Agregue una fila para comenzar.'));
    return;
  }

  // Table wrapper for horizontal scroll
  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'dc-inventory__table-wrapper';

  const table = document.createElement('table');
  table.className = 'table dc-inventory__table';
  table.setAttribute('aria-label', `Datos de ${sheetId}`);

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  // Row actions header
  const actionsHeader = document.createElement('th');
  actionsHeader.className = 'dc-inventory__th dc-inventory__th--actions';
  actionsHeader.textContent = '';
  actionsHeader.setAttribute('aria-label', 'Acciones');
  headerRow.appendChild(actionsHeader);

  for (const col of allCols) {
    const th = document.createElement('th');
    th.className = 'dc-inventory__th';
    th.textContent = formatColumnLabel(col);

    if (globantCols.includes(col)) {
      th.classList.add('dc-inventory__th--globant');
    }

    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');

  for (const row of rows) {
    const tr = buildDataRow(row, allCols, empresaCols, globantCols, editableSet, empresaId, sheetId, wrapper);
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  wrapper.appendChild(tableWrapper);
}

/**
 * Build a single data row.
 */
function buildDataRow(row, allCols, empresaCols, globantCols, editableSet, empresaId, sheetId, wrapper) {
  const tr = document.createElement('tr');
  tr.className = 'dc-inventory__row';
  tr.setAttribute('data-row-id', row.id);

  // Delete button cell
  const actionsTd = document.createElement('td');
  actionsTd.className = 'dc-inventory__td dc-inventory__td--actions';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn--danger btn--sm';
  deleteBtn.textContent = '✕';
  deleteBtn.setAttribute('aria-label', `Eliminar fila ${row.id}`);
  deleteBtn.addEventListener('click', () => handleDeleteRow(wrapper, empresaId, sheetId, row.id));
  actionsTd.appendChild(deleteBtn);
  tr.appendChild(actionsTd);

  for (const col of allCols) {
    const td = document.createElement('td');
    td.className = 'dc-inventory__td';

    if (globantCols.includes(col)) {
      td.classList.add('dc-inventory__td--globant');
    }

    const isEditable = editableSet.has(col);

    if (isEditable) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'dc-inventory__input';
      input.value = row[col] ?? '';
      input.setAttribute('aria-label', `${formatColumnLabel(col)} fila ${row.id}`);
      input.setAttribute('data-col', col);
      input.setAttribute('data-row-id', String(row.id));

      let saveTimeout;
      input.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          handleCellSave(input, empresaId, sheetId, row.id, col, input.value);
        }, 600);
      });

      input.addEventListener('blur', () => {
        clearTimeout(saveTimeout);
        handleCellSave(input, empresaId, sheetId, row.id, col, input.value);
      });

      td.appendChild(input);
    } else {
      td.textContent = row[col] ?? '';
      td.classList.add('dc-inventory__td--readonly');
    }

    tr.appendChild(td);
  }

  return tr;
}

/**
 * Handle saving a cell value.
 */
async function handleCellSave(inputEl, empresaId, sheetId, rowId, col, value) {
  inputEl.classList.remove('dc-inventory__input--saved', 'dc-inventory__input--error');

  try {
    const result = await updateRow(empresaId, sheetId, rowId, { [col]: value });
    if (result.ok) {
      inputEl.classList.add('dc-inventory__input--saved');
      setTimeout(() => inputEl.classList.remove('dc-inventory__input--saved'), 1500);
    } else {
      inputEl.classList.add('dc-inventory__input--error');
    }
  } catch {
    inputEl.classList.add('dc-inventory__input--error');
  }
}

/**
 * Handle adding a new row.
 */
async function handleAddRow(wrapper, empresaId, sheetId) {
  try {
    const result = await addRow(empresaId, sheetId, {});
    if (result.ok) {
      renderInventorySheet(wrapper.parentElement, empresaId, sheetId);
    }
  } catch {
    // Silently fail — user can retry
  }
}

/**
 * Handle deleting a row with confirmation.
 */
async function handleDeleteRow(wrapper, empresaId, sheetId, rowId) {
  const confirmed = window.confirm('¿Está seguro de que desea eliminar esta fila?');
  if (!confirmed) return;

  try {
    const result = await deleteRow(empresaId, sheetId, rowId);
    if (result.ok) {
      renderInventorySheet(wrapper.parentElement, empresaId, sheetId);
    }
  } catch {
    // Silently fail — user can retry
  }
}

/**
 * Format a column key into a human-readable label.
 */
function formatColumnLabel(col) {
  return col
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get user role for display purposes.
 * In a real scenario, the role comes from the assignment for the specific company.
 * For now, we use a simple heuristic.
 */
function getUserRoleForDisplay(user) {
  if (!user) return 'empresa';
  if (user.role === 'admin') return 'admin';
  // Default to empresa — the actual role per company would come from assignments
  return 'empresa';
}
