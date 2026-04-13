/**
 * Q&A Management Sheet View — Data Collection Module
 *
 * Renders questions grouped by Category with management columns.
 * Used for Infrastructure, IT Experience, and MST sheets.
 * Columns: #, NAME, Phase/Stage, Type, Question (read-only),
 * XX Answers (empresa), Globant Team comments, Globant owner,
 * Due date, Comments (globant).
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 4.1, 4.2
 *
 * @module dc/qa-mgmt-sheet
 */

import { getEditableColumns } from '../../business/sheet-logic.js';
import { fetchSheetData, updateRow, getCurrentUser } from '../../data/dc-api-client.js';
import { createSpinner, createErrorState, createEmptyState } from '../components.js';

/** Column definitions for the Q&A management pattern. */
const QA_MGMT_COLUMNS = [
  { key: 'question_id', label: '#', editable: false },
  { key: 'category', label: 'NAME', editable: false },
  { key: 'phase_stage', label: 'Phase/Stage', editable: false },
  { key: 'type', label: 'Type', editable: false },
  { key: 'question', label: 'Question', editable: false },
  { key: 'company_answer', label: 'XX Answers', group: 'empresa' },
  { key: 'globant_comments', label: 'Globant Team comments', group: 'globant' },
  { key: 'globant_owner', label: 'Globant owner', group: 'globant' },
  { key: 'due_date', label: 'Due date', group: 'globant' },
  { key: 'additional_comments', label: 'Comments', group: 'globant' },
];

/**
 * Render the Q&A management sheet into the given container.
 * @param {HTMLElement} container - DOM container to render into
 * @param {string|number} empresaId - Company ID
 * @param {string} sheetId - Sheet ID ('infrastructure', 'it_experience', 'mst')
 */
export function renderQAMgmtSheet(container, empresaId, sheetId) {
  container.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'dc-qa-mgmt';

  const spinner = createSpinner('md');
  wrapper.appendChild(spinner);
  container.appendChild(wrapper);

  loadQAMgmtData(wrapper, spinner, empresaId, sheetId);
}

/**
 * Load sheet data and render grouped questions.
 */
async function loadQAMgmtData(wrapper, spinner, empresaId, sheetId) {
  try {
    const result = await fetchSheetData(empresaId, sheetId);
    spinner.remove();

    if (!result.ok) {
      wrapper.appendChild(createErrorState(
        result.error || 'Error al cargar datos.',
        () => renderQAMgmtSheet(wrapper.parentElement, empresaId, sheetId)
      ));
      return;
    }

    const rows = result.data || [];
    if (rows.length === 0) {
      wrapper.appendChild(createEmptyState('No hay preguntas en esta hoja.'));
      return;
    }

    renderGroupedQuestions(wrapper, rows, empresaId, sheetId);
  } catch {
    spinner.remove();
    wrapper.appendChild(createErrorState('Error de conexión al cargar datos.'));
  }
}

/**
 * Group rows by category and render each group.
 */
function renderGroupedQuestions(wrapper, rows, empresaId, sheetId) {
  const user = getCurrentUser();
  const userRole = user?.role === 'admin' ? 'admin' : 'empresa';
  const { editable } = getEditableColumns(sheetId, userRole);
  const editableSet = new Set(editable);

  // Group by category
  const groups = groupByCategory(rows);

  for (const [category, groupRows] of groups) {
    const section = document.createElement('section');
    section.className = 'dc-qa-mgmt__group';

    // Category header
    const header = document.createElement('h3');
    header.className = 'dc-qa-mgmt__category-header';
    header.textContent = category || 'Sin categoría';
    section.appendChild(header);

    // Table for this category
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'dc-qa-mgmt__table-wrapper';

    const table = document.createElement('table');
    table.className = 'table dc-qa-mgmt__table';
    table.setAttribute('aria-label', `Preguntas: ${category}`);

    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    for (const col of QA_MGMT_COLUMNS) {
      const th = document.createElement('th');
      th.className = 'dc-qa-mgmt__th';
      th.textContent = col.label;

      if (col.group === 'globant') {
        th.classList.add('dc-qa-mgmt__th--globant');
      }

      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body rows
    const tbody = document.createElement('tbody');

    for (const row of groupRows) {
      const tr = buildQARow(row, editableSet, empresaId, sheetId);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    section.appendChild(tableWrapper);
    wrapper.appendChild(section);
  }
}

/**
 * Build a single Q&A row.
 */
function buildQARow(row, editableSet, empresaId, sheetId) {
  const tr = document.createElement('tr');
  tr.className = 'dc-qa-mgmt__row';
  tr.setAttribute('data-row-id', row.id);

  for (const col of QA_MGMT_COLUMNS) {
    const td = document.createElement('td');
    td.className = 'dc-qa-mgmt__td';

    if (col.group === 'globant') {
      td.classList.add('dc-qa-mgmt__td--globant');
    }

    const isEditable = col.editable !== false && editableSet.has(col.key);

    if (isEditable) {
      const input = document.createElement('input');
      input.type = col.key === 'due_date' ? 'date' : 'text';
      input.className = 'dc-qa-mgmt__input';
      input.value = row[col.key] ?? '';
      input.setAttribute('aria-label', `${col.label} - pregunta ${row.question_id || row.id}`);
      input.setAttribute('data-col', col.key);
      input.setAttribute('data-row-id', String(row.id));

      let saveTimeout;
      input.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          handleCellSave(input, empresaId, sheetId, row.id, col.key, input.value);
        }, 600);
      });

      input.addEventListener('blur', () => {
        clearTimeout(saveTimeout);
        handleCellSave(input, empresaId, sheetId, row.id, col.key, input.value);
      });

      td.appendChild(input);
    } else {
      td.textContent = row[col.key] ?? '';
      td.classList.add('dc-qa-mgmt__td--readonly');
    }

    tr.appendChild(td);
  }

  return tr;
}

/**
 * Handle saving a cell value.
 */
async function handleCellSave(inputEl, empresaId, sheetId, rowId, col, value) {
  inputEl.classList.remove('dc-qa-mgmt__input--saved', 'dc-qa-mgmt__input--error');

  try {
    const result = await updateRow(empresaId, sheetId, rowId, { [col]: value });
    if (result.ok) {
      inputEl.classList.add('dc-qa-mgmt__input--saved');
      setTimeout(() => inputEl.classList.remove('dc-qa-mgmt__input--saved'), 1500);
    } else {
      inputEl.classList.add('dc-qa-mgmt__input--error');
    }
  } catch {
    inputEl.classList.add('dc-qa-mgmt__input--error');
  }
}

/**
 * Group rows by their category field.
 * @param {object[]} rows
 * @returns {Map<string, object[]>}
 */
function groupByCategory(rows) {
  const groups = new Map();
  for (const row of rows) {
    const cat = row.category || '';
    if (!groups.has(cat)) {
      groups.set(cat, []);
    }
    groups.get(cat).push(row);
  }
  return groups;
}
