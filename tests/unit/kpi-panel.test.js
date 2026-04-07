/**
 * Unit tests for kpi-panel.js
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderKPIPanel, updateKPIPanel } from '../../js/presentation/kpi-panel.js';

function makeModel(companies = []) {
  return {
    companies,
    metadata: { mode: 'offline', lastUpdated: null, totalIssues: 0 },
  };
}

function makeCompany(id, name, year, tracks = []) {
  return { id, name, year, region: 'Americas', tracks, others: [] };
}

function makeTrack(num, status, progress, severity = 'Medium', subtasks = []) {
  return {
    trackNumber: num,
    trackName: `Track ${num}`,
    severity,
    epicKey: `EPIC-${num}`,
    progress,
    status,
    subtasks,
    assignee: null,
    totalSubtasks: subtasks.length,
    closedSubtasks: subtasks.filter(s => s.status === 'Completado').length,
  };
}

describe('kpi-panel', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders 4 KPI cards', () => {
    const model = makeModel([
      makeCompany('C1', 'Acme', 2024, [
        makeTrack(1, 'En Progreso', 50, 'Critical'),
      ]),
    ]);
    renderKPIPanel(container, model);

    const cards = container.querySelectorAll('.kpi-card');
    expect(cards.length).toBe(4);
  });

  it('displays correct total active companies', () => {
    const model = makeModel([
      makeCompany('C1', 'A', 2024),
      makeCompany('C2', 'B', 2023),
    ]);
    renderKPIPanel(container, model);

    const values = container.querySelectorAll('.kpi-card__value');
    expect(values[0].textContent).toBe('2');
  });

  it('renders year summary table when data exists', () => {
    const model = makeModel([
      makeCompany('C1', 'A', 2024, [makeTrack(1, 'En Progreso', 50, 'Critical')]),
    ]);
    renderKPIPanel(container, model);

    const yearTable = container.querySelector('.kpi-year-table');
    expect(yearTable).not.toBeNull();
  });

  it('renders severity dot chart when data exists', () => {
    const model = makeModel([
      makeCompany('C1', 'A', 2024, [makeTrack(1, 'En Progreso', 50, 'Critical')]),
    ]);
    renderKPIPanel(container, model);

    const chart = container.querySelector('.kpi-severity-chart');
    expect(chart).not.toBeNull();
  });

  it('renders chart dots with severity colors', () => {
    const model = makeModel([
      makeCompany('C1', 'A', 2024, [
        makeTrack(1, 'En Progreso', 50, 'Critical'),
        makeTrack(2, 'Completado', 100, 'Low'),
      ]),
    ]);
    renderKPIPanel(container, model);

    const dots = container.querySelectorAll('.chart-dot');
    expect(dots.length).toBeGreaterThan(0);

    const classNames = Array.from(dots).map(d => d.className);
    expect(classNames.some(c => c.includes('chart-dot--critical'))).toBe(true);
  });

  it('updateKPIPanel re-renders with new data', () => {
    renderKPIPanel(container, makeModel([]));
    const initialCards = container.querySelectorAll('.kpi-card');
    expect(initialCards.length).toBe(4);

    updateKPIPanel(makeModel([makeCompany('C1', 'X', 2024)]));
    const values = container.querySelectorAll('.kpi-card__value');
    expect(values[0].textContent).toBe('1');
  });
});
