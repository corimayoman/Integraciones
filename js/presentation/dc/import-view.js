/**
 * Import View — Data Collection Module
 *
 * CSV import interface: select company + sheet, upload CSV file,
 * validate headers, preview data, and confirm import.
 * Only accessible for users with Rol_Admin.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 *
 * @module dc/import-view
 */

import { fetchCompanies, importCSV } from '../../data/dc-api-client.js';
import { parseCSV, validateCSVHeaders } from '../../business/csv-parser.js';
import { SHEET_TABS } from '../../business/sheet-logic.js';
import { createSpinner, createErrorState, createEmptyState } from '../components.js';

/**
 * Render the import view into the given container.
 * @param {HTMLElement} container - DOM container to render into
 */
export function renderImportView(container) {
  container.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'dc-import';

  const title = document.createElement('h3');
  title.className = 'dc-import__title';
  title.textContent = 'Importar CSV';
  wrapper.appendChild(title);

  // Error / success message area
  const messageEl = document.createElement('div');
  messageEl.className = 'dc-import__message';
  messageEl.setAttribute('role', 'status');
  messageEl.setAttribute('aria-live', 'polite');
  messageEl.style.display = 'none';
  wrapper.appendChild(messageEl);

  // Form
  const form = document.createElement('form');
  form.className = 'dc-import__form';
  form.setAttribute('aria-label', 'Formulario de importación CSV');

  // Company select
  const companyGroup = document.createElement('div');
  companyGroup.className = 'dc-import__field';

  const companyLabel = document.createElement('label');
  companyLabel.className = 'dc-import__label';
  companyLabel.setAttribute('for', 'dc-import-company');
  companyLabel.textContent = 'Empresa destino';
  companyGroup.appendChild(companyLabel);

  const companySelect = document.createElement('select');
  companySelect.id = 'dc-import-company';
  companySelect.className = 'dc-import__select';
  companySelect.required = true;

  const defaultCompanyOpt = document.createElement('option');
  defaultCompanyOpt.value = '';
  defaultCompanyOpt.textContent = '— Seleccionar empresa —';
  companySelect.appendChild(defaultCompanyOpt);

  companyGroup.appendChild(companySelect);
  form.appendChild(companyGroup);

  // Sheet select
  const sheetGroup = document.createElement('div');
  sheetGroup.className = 'dc-import__field';

  const sheetLabel = document.createElement('label');
  sheetLabel.className = 'dc-import__label';
  sheetLabel.setAttribute('for', 'dc-import-sheet');
  sheetLabel.textContent = 'Hoja destino';
  sheetGroup.appendChild(sheetLabel);

  const sheetSelect = document.createElement('select');
  sheetSelect.id = 'dc-import-sheet';
  sheetSelect.className = 'dc-import__select';
  sheetSelect.required = true;

  const defaultSheetOpt = document.createElement('option');
  defaultSheetOpt.value = '';
  defaultSheetOpt.textContent = '— Seleccionar hoja —';
  sheetSelect.appendChild(defaultSheetOpt);

  for (const tab of SHEET_TABS) {
    const opt = document.createElement('option');
    opt.value = tab.id;
    opt.textContent = tab.label;
    sheetSelect.appendChild(opt);
  }

  sheetGroup.appendChild(sheetSelect);
  form.appendChild(sheetGroup);

  // File input
  const fileGroup = document.createElement('div');
  fileGroup.className = 'dc-import__field';

  const fileLabel = document.createElement('label');
  fileLabel.className = 'dc-import__label';
  fileLabel.setAttribute('for', 'dc-import-file');
  fileLabel.textContent = 'Archivo CSV';
  fileGroup.appendChild(fileLabel);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'dc-import-file';
  fileInput.className = 'dc-import__file';
  fileInput.accept = '.csv,text/csv';
  fileInput.required = true;
  fileGroup.appendChild(fileInput);

  form.appendChild(fileGroup);

  // Preview button
  const previewBtn = document.createElement('button');
  previewBtn.type = 'submit';
  previewBtn.className = 'btn btn--secondary btn--sm';
  previewBtn.textContent = 'Validar y previsualizar';
  form.appendChild(previewBtn);

  wrapper.appendChild(form);

  // Preview area
  const previewArea = document.createElement('div');
  previewArea.className = 'dc-import__preview';
  previewArea.id = 'dc-import-preview';
  wrapper.appendChild(previewArea);

  container.appendChild(wrapper);

  // Load companies into select
  loadCompaniesForImport(companySelect);

  // Handle form submit → validate + preview
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handlePreview(companySelect, sheetSelect, fileInput, previewArea, messageEl, wrapper);
  });
}


/* ------------------------------------------------------------------ */
/*  Load companies                                                     */
/* ------------------------------------------------------------------ */

async function loadCompaniesForImport(selectEl) {
  try {
    const result = await fetchCompanies();
    if (result.ok && result.data) {
      for (const company of result.data) {
        const opt = document.createElement('option');
        opt.value = company.id;
        opt.textContent = company.name;
        selectEl.appendChild(opt);
      }
    }
  } catch {
    // Silently fail — user can reload
  }
}

/* ------------------------------------------------------------------ */
/*  Preview handler                                                    */
/* ------------------------------------------------------------------ */

async function handlePreview(companySelect, sheetSelect, fileInput, previewArea, messageEl, wrapper) {
  hideMessage(messageEl);
  previewArea.textContent = '';

  const companyId = Number(companySelect.value);
  const sheetId = sheetSelect.value;
  const file = fileInput.files?.[0];

  if (!companyId || !sheetId) {
    showMessage(messageEl, 'Seleccione empresa y hoja destino.', 'error');
    return;
  }

  if (!file) {
    showMessage(messageEl, 'Seleccione un archivo CSV.', 'error');
    return;
  }

  // Validate file type
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    showMessage(messageEl, 'El archivo debe ser de tipo CSV.', 'error');
    return;
  }

  // Read file
  let csvText;
  try {
    csvText = await readFileAsText(file);
  } catch {
    showMessage(messageEl, 'Error al leer el archivo.', 'error');
    return;
  }

  // Parse CSV
  const { headers, rows } = parseCSV(csvText);

  if (headers.length === 0) {
    showMessage(messageEl, 'El archivo CSV está vacío o no tiene headers.', 'error');
    return;
  }

  // Validate headers
  const validation = validateCSVHeaders(headers, sheetId);

  if (!validation.valid) {
    let msg = 'Columnas no reconocidas: ' + validation.unrecognized.join(', ');
    if (validation.missing.length > 0) {
      msg += '\nColumnas faltantes: ' + validation.missing.join(', ');
    }
    showMessage(messageEl, msg, 'error');
    return;
  }

  if (rows.length === 0) {
    showMessage(messageEl, 'El archivo CSV no contiene filas de datos.', 'error');
    return;
  }

  // Show preview
  renderPreview(previewArea, headers, rows, companyId, sheetId, messageEl);
}

/* ------------------------------------------------------------------ */
/*  Preview rendering                                                  */
/* ------------------------------------------------------------------ */

function renderPreview(previewArea, headers, rows, companyId, sheetId, messageEl) {
  previewArea.textContent = '';

  const summary = document.createElement('p');
  summary.className = 'dc-import__summary';
  summary.textContent = `${rows.length} filas detectadas. Revise los datos antes de importar.`;
  previewArea.appendChild(summary);

  // Preview table (show max 10 rows)
  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'dc-import__table-wrapper';

  const table = document.createElement('table');
  table.className = 'table dc-import__table';
  table.setAttribute('aria-label', 'Vista previa de datos CSV');

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const h of headers) {
    const th = document.createElement('th');
    th.className = 'dc-import__th';
    th.textContent = h;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const previewRows = rows.slice(0, 10);
  for (const row of previewRows) {
    const tr = document.createElement('tr');
    for (const h of headers) {
      const td = document.createElement('td');
      td.className = 'dc-import__td';
      td.textContent = row[h] ?? '';
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  tableWrapper.appendChild(table);
  previewArea.appendChild(tableWrapper);

  if (rows.length > 10) {
    const moreMsg = document.createElement('p');
    moreMsg.className = 'dc-import__more';
    moreMsg.textContent = `... y ${rows.length - 10} filas más.`;
    previewArea.appendChild(moreMsg);
  }

  // Confirm import button
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn btn--primary';
  confirmBtn.textContent = `Importar ${rows.length} filas`;
  confirmBtn.setAttribute('aria-label', `Confirmar importación de ${rows.length} filas`);
  confirmBtn.addEventListener('click', () => {
    handleImport(confirmBtn, rows, companyId, sheetId, messageEl, previewArea);
  });
  previewArea.appendChild(confirmBtn);
}

/* ------------------------------------------------------------------ */
/*  Import handler                                                     */
/* ------------------------------------------------------------------ */

async function handleImport(btn, rows, companyId, sheetId, messageEl, previewArea) {
  hideMessage(messageEl);
  btn.disabled = true;
  btn.textContent = 'Importando...';

  try {
    const result = await importCSV(companyId, sheetId, rows);
    if (result.ok) {
      previewArea.textContent = '';
      const count = result.data?.count ?? rows.length;
      showMessage(messageEl, `Importación exitosa: ${count} filas importadas.`, 'success');
    } else {
      showMessage(messageEl, result.error || 'Error al importar datos.', 'error');
      btn.disabled = false;
      btn.textContent = `Importar ${rows.length} filas`;
    }
  } catch {
    showMessage(messageEl, 'Error de conexión al importar.', 'error');
    btn.disabled = false;
    btn.textContent = `Importar ${rows.length} filas`;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `dc-import__message dc-import__message--${type}`;
  el.style.display = '';
}

function hideMessage(el) {
  el.style.display = 'none';
  el.textContent = '';
}
