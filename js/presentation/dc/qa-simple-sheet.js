/**
 * Q&A Simple Sheet View — Data Collection Module
 *
 * Renders questions grouped by Section for Building Security.
 * Sections: "About the Building", "About the Office", "Support and Maintenance"
 * Columns: Section (read-only), Question (read-only), Answer (editable).
 * No Globant management columns.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
 *
 * @module dc/qa-simple-sheet
 */

import { fetchSheetData, updateRow, getCurrentUser } from '../../data/dc-api-client.js';
import { createSpinner, createErrorState, createEmptyState } from '../components.js';

/**
 * Render the Q&A simple sheet into the given container.
 * @param {HTMLElement} container - DOM container to render into
 * @param {string|number} empresaId - Company ID
 * @param {string} sheetId - Sheet ID ('building_security')
 */
export function renderQASimpleSheet(container, empresaId, sheetId) {
  container.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'dc-qa-simple';

  const spinner = createSpinner('md');
  wrapper.appendChild(spinner);
  container.appendChild(wrapper);

  loadQASimpleData(wrapper, spinner, empresaId, sheetId);
}

/**
 * Load sheet data and render grouped questions.
 */
async function loadQASimpleData(wrapper, spinner, empresaId, sheetId) {
  try {
    const result = await fetchSheetData(empresaId, sheetId);
    spinner.remove();

    if (!result.ok) {
      wrapper.appendChild(createErrorState(
        result.error || 'Error al cargar datos.',
        () => renderQASimpleSheet(wrapper.parentElement, empresaId, sheetId)
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
 * Group rows by section and render each group.
 */
function renderGroupedQuestions(wrapper, rows, empresaId, sheetId) {
  // Group by category (which represents the section for building_security)
  const groups = groupBySection(rows);

  for (const [section, groupRows] of groups) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'dc-qa-simple__group';

    // Section header
    const header = document.createElement('h3');
    header.className = 'dc-qa-simple__section-header';
    header.textContent = section || 'Sin sección';
    sectionEl.appendChild(header);

    // Table for this section
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'dc-qa-simple__table-wrapper';

    const table = document.createElement('table');
    table.className = 'table dc-qa-simple__table';
    table.setAttribute('aria-label', `Preguntas: ${section}`);

    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const headers = ['Sección', 'Question', 'Answer'];
    for (const label of headers) {
      const th = document.createElement('th');
      th.className = 'dc-qa-simple__th';
      th.textContent = label;
      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body rows
    const tbody = document.createElement('tbody');

    for (const row of groupRows) {
      const tr = buildSimpleRow(row, section, empresaId, sheetId);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    sectionEl.appendChild(tableWrapper);
    wrapper.appendChild(sectionEl);
  }
}

/**
 * Build a single simple Q&A row.
 */
function buildSimpleRow(row, section, empresaId, sheetId) {
  const tr = document.createElement('tr');
  tr.className = 'dc-qa-simple__row';
  tr.setAttribute('data-row-id', row.id);

  // Section cell (read-only)
  const sectionTd = document.createElement('td');
  sectionTd.className = 'dc-qa-simple__td dc-qa-simple__td--readonly';
  sectionTd.textContent = section;
  tr.appendChild(sectionTd);

  // Question cell (read-only)
  const questionTd = document.createElement('td');
  questionTd.className = 'dc-qa-simple__td dc-qa-simple__td--readonly';
  questionTd.textContent = row.question ?? '';
  tr.appendChild(questionTd);

  // Answer cell (editable)
  const answerTd = document.createElement('td');
  answerTd.className = 'dc-qa-simple__td';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'dc-qa-simple__input';
  input.value = row.company_answer ?? '';
  input.setAttribute('aria-label', `Respuesta - ${row.question || 'pregunta'}`);
  input.setAttribute('data-col', 'company_answer');
  input.setAttribute('data-row-id', String(row.id));

  let saveTimeout;
  input.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      handleCellSave(input, empresaId, sheetId, row.id, input.value);
    }, 600);
  });

  input.addEventListener('blur', () => {
    clearTimeout(saveTimeout);
    handleCellSave(input, empresaId, sheetId, row.id, input.value);
  });

  answerTd.appendChild(input);
  tr.appendChild(answerTd);

  return tr;
}

/**
 * Handle saving a cell value.
 */
async function handleCellSave(inputEl, empresaId, sheetId, rowId, value) {
  inputEl.classList.remove('dc-qa-simple__input--saved', 'dc-qa-simple__input--error');

  try {
    const result = await updateRow(empresaId, sheetId, rowId, { company_answer: value });
    if (result.ok) {
      inputEl.classList.add('dc-qa-simple__input--saved');
      setTimeout(() => inputEl.classList.remove('dc-qa-simple__input--saved'), 1500);
    } else {
      inputEl.classList.add('dc-qa-simple__input--error');
    }
  } catch {
    inputEl.classList.add('dc-qa-simple__input--error');
  }
}

/**
 * Group rows by their category field (used as section for building_security).
 * @param {object[]} rows
 * @returns {Map<string, object[]>}
 */
function groupBySection(rows) {
  const groups = new Map();
  for (const row of rows) {
    const section = row.category || '';
    if (!groups.has(section)) {
      groups.set(section, []);
    }
    groups.get(section).push(row);
  }
  return groups;
}
