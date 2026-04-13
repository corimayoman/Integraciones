/**
 * Unit tests for js/presentation/dc/import-view.js
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderImportView } from '../../js/presentation/dc/import-view.js';

// Mock dc-api-client
vi.mock('../../js/data/dc-api-client.js', () => ({
  fetchCompanies: vi.fn(),
  importCSV: vi.fn(),
  getCurrentUser: vi.fn(),
}));

// Mock csv-parser
vi.mock('../../js/business/csv-parser.js', () => ({
  parseCSV: vi.fn(),
  validateCSVHeaders: vi.fn(),
}));

// Mock sheet-logic
vi.mock('../../js/business/sheet-logic.js', () => ({
  SHEET_TABS: [
    { id: 'apps', label: 'Apps' },
    { id: 'infrastructure', label: 'Infrastructure' },
    { id: 'compliance', label: 'Compliance and Certifications' },
  ],
}));

import { fetchCompanies, importCSV } from '../../js/data/dc-api-client.js';
import { parseCSV, validateCSVHeaders } from '../../js/business/csv-parser.js';

describe('import-view', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    vi.clearAllMocks();
    fetchCompanies.mockResolvedValue({ ok: true, data: [{ id: 1, name: 'Corp A' }] });
  });

  it('renders title', () => {
    renderImportView(container);

    const title = container.querySelector('h3');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Importar CSV');
  });

  it('renders company select', () => {
    renderImportView(container);

    const select = container.querySelector('#dc-import-company');
    expect(select).not.toBeNull();
    expect(select.tagName).toBe('SELECT');
  });

  it('renders sheet select with tabs', () => {
    renderImportView(container);

    const select = container.querySelector('#dc-import-sheet');
    expect(select).not.toBeNull();

    const options = select.querySelectorAll('option');
    // default + 3 tabs
    expect(options.length).toBe(4);
    expect(options[1].value).toBe('apps');
    expect(options[1].textContent).toBe('Apps');
  });

  it('renders file input accepting CSV', () => {
    renderImportView(container);

    const fileInput = container.querySelector('#dc-import-file');
    expect(fileInput).not.toBeNull();
    expect(fileInput.type).toBe('file');
    expect(fileInput.accept).toBe('.csv,text/csv');
  });

  it('renders preview button', () => {
    renderImportView(container);

    const btn = container.querySelector('button[type="submit"]');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe('Validar y previsualizar');
  });

  it('has form with aria-label', () => {
    renderImportView(container);

    const form = container.querySelector('form');
    expect(form.getAttribute('aria-label')).toBe('Formulario de importación CSV');
  });

  it('shows error when no company selected on submit', async () => {
    renderImportView(container);

    const form = container.querySelector('form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    await new Promise((r) => setTimeout(r, 0));

    const msg = container.querySelector('.dc-import__message');
    expect(msg.style.display).toBe('');
    expect(msg.textContent).toContain('Seleccione empresa y hoja');
  });

  it('loads companies into select', async () => {
    fetchCompanies.mockResolvedValue({
      ok: true,
      data: [
        { id: 1, name: 'Corp A' },
        { id: 2, name: 'Corp B' },
      ],
    });

    renderImportView(container);
    await new Promise((r) => setTimeout(r, 0));

    const select = container.querySelector('#dc-import-company');
    const options = select.querySelectorAll('option');
    // default + 2 companies
    expect(options.length).toBe(3);
    expect(options[1].textContent).toBe('Corp A');
    expect(options[2].textContent).toBe('Corp B');
  });

  it('message area is hidden by default', () => {
    renderImportView(container);

    const msg = container.querySelector('.dc-import__message');
    expect(msg.style.display).toBe('none');
  });

  it('has preview area', () => {
    renderImportView(container);

    const preview = container.querySelector('#dc-import-preview');
    expect(preview).not.toBeNull();
  });
});
