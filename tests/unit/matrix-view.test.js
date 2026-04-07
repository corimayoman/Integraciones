/**
 * Unit tests for matrix-view.js
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderMatrixView, updateMatrixView } from '../../js/presentation/matrix-view.js';

function makeModel(companies = []) {
  return {
    companies,
    metadata: { mode: 'offline', lastUpdated: null, totalIssues: 0 },
  };
}

function makeCompany(id, name, year, tracks = []) {
  return { id, name, year, region: 'Americas', tracks, others: [] };
}

function makeTrack(num, status, progress = 0, subtasks = []) {
  return {
    trackNumber: num,
    trackName: `Track ${num}`,
    severity: 'Medium',
    epicKey: `EPIC-${num}`,
    progress,
    status,
    subtasks,
    assignee: null,
    totalSubtasks: subtasks.length,
    closedSubtasks: subtasks.filter(s => s.status === 'Completado').length,
  };
}

describe('matrix-view', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders empty message when no companies', () => {
    renderMatrixView(container, makeModel([]));
    expect(container.textContent).toContain('No hay empresas');
  });

  it('renders a table with company rows', () => {
    const model = makeModel([
      makeCompany('C1', 'Acme', 2024, [makeTrack(1, 'En Progreso', 50)]),
      makeCompany('C2', 'Beta', 2023, [makeTrack(1, 'Completado', 100)]),
    ]);
    renderMatrixView(container, model);

    const table = container.querySelector('table');
    expect(table).not.toBeNull();

    // Should have header row + 2 company rows + 2 detail rows
    const rows = container.querySelectorAll('tr');
    expect(rows.length).toBe(5); // 1 header + 2 main + 2 detail
  });

  it('sorts companies by year descending', () => {
    const model = makeModel([
      makeCompany('C1', 'OldCo', 2020),
      makeCompany('C2', 'NewCo', 2025),
      makeCompany('C3', 'MidCo', 2023),
    ]);
    renderMatrixView(container, model);

    const companyNames = Array.from(container.querySelectorAll('.matrix-cell-company'))
      .map(el => el.textContent.trim());

    expect(companyNames[0]).toContain('NewCo');
    expect(companyNames[1]).toContain('MidCo');
    expect(companyNames[2]).toContain('OldCo');
  });

  it('renders 14 track column headers', () => {
    renderMatrixView(container, makeModel([makeCompany('C1', 'Test', 2024)]));
    const headerCells = container.querySelectorAll('.matrix-header-track');
    expect(headerCells.length).toBe(14);
  });

  it('applies status color class to cells', () => {
    const model = makeModel([
      makeCompany('C1', 'Test', 2024, [
        makeTrack(1, 'Completado', 100),
        makeTrack(2, 'Bloqueado', 30),
      ]),
    ]);
    renderMatrixView(container, model);

    const cells = container.querySelectorAll('.matrix-cell');
    const classNames = Array.from(cells).map(c => c.className);

    // Track 1 should have completed class
    expect(classNames[0]).toContain('status-completed');
    // Track 2 should have blocked class
    expect(classNames[1]).toContain('status-blocked');
  });

  it('expands detail row on click', () => {
    const subtasks = [
      { key: 'S1', summary: 'Sub 1', status: 'Completado', jiraStatus: 'Closed', assignee: null },
    ];
    const model = makeModel([
      makeCompany('C1', 'Test', 2024, [makeTrack(1, 'En Progreso', 50, subtasks)]),
    ]);
    renderMatrixView(container, model);

    const mainRow = container.querySelector('.matrix-row');
    const detailRow = container.querySelector('.matrix-detail-row');

    expect(detailRow.style.display).toBe('none');

    // Click to expand
    mainRow.click();
    expect(detailRow.style.display).toBe('');

    // Click again to collapse
    mainRow.click();
    expect(detailRow.style.display).toBe('none');
  });

  it('updateMatrixView re-renders with new data', () => {
    renderMatrixView(container, makeModel([]));
    expect(container.textContent).toContain('No hay empresas');

    updateMatrixView(makeModel([makeCompany('C1', 'New', 2024)]));
    expect(container.querySelector('table')).not.toBeNull();
  });
});
