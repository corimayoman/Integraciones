/**
 * Unit tests for alerts-view.js
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderAlertsView } from '../../js/presentation/alerts-view.js';

// Mock router navigate
vi.mock('../../js/presentation/router.js', () => ({
  navigate: vi.fn(),
}));

import { navigate } from '../../js/presentation/router.js';

function makeModel(companies = []) {
  return {
    companies,
    metadata: { mode: 'offline', lastUpdated: null, totalIssues: 0 },
  };
}

function makeCompany(id, name, year, tracks = []) {
  return { id, name, year, region: 'Americas', tracks, others: [] };
}

function makeTrack(num, severity, subtasks = []) {
  return {
    trackNumber: num,
    trackName: `Track ${num}`,
    severity,
    epicKey: `EPIC-${num}`,
    progress: 50,
    status: 'En Progreso',
    subtasks,
    assignee: null,
    totalSubtasks: subtasks.length,
    closedSubtasks: 0,
  };
}

function makeSubtask(key, summary, status) {
  return { key, summary, status, jiraStatus: status, assignee: null };
}

describe('alerts-view', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  it('shows empty state when no alerts', () => {
    const model = makeModel([
      makeCompany('C1', 'Safe Co', 2024, [
        makeTrack(1, 'Low', [makeSubtask('S1', 'Task', 'Completado')]),
      ]),
    ]);
    renderAlertsView(container, model);

    const emptyState = container.querySelector('.empty-state');
    expect(emptyState).not.toBeNull();
    expect(container.textContent).toContain('No hay alertas');
  });

  it('lists delayed tracks with company, track, severity, and blocking subtask', () => {
    const model = makeModel([
      makeCompany('C1', 'Problem Co', 2024, [
        makeTrack(3, 'Critical', [
          makeSubtask('S1', 'Blocked migration', 'Bloqueado'),
        ]),
      ]),
    ]);
    renderAlertsView(container, model);

    const items = container.querySelectorAll('.alert-item');
    expect(items.length).toBe(1);

    const item = items[0];
    expect(item.textContent).toContain('Problem Co');
    expect(item.textContent).toContain('Track 3');
    expect(item.textContent).toContain('Critical');
    expect(item.textContent).toContain('Blocked migration');
  });

  it('navigates to company detail on alert click', () => {
    const model = makeModel([
      makeCompany('G4G-100', 'ClickCo', 2024, [
        makeTrack(2, 'High', [
          makeSubtask('S1', 'Issue', 'Bloqueado'),
        ]),
      ]),
    ]);
    renderAlertsView(container, model);

    const item = container.querySelector('.alert-item');
    item.click();

    expect(navigate).toHaveBeenCalledWith('#/company/G4G-100');
  });

  it('navigates on Enter key press', () => {
    const model = makeModel([
      makeCompany('G4G-200', 'KeyCo', 2024, [
        makeTrack(4, 'Critical', [
          makeSubtask('S1', 'Stuck', 'Bloqueado'),
        ]),
      ]),
    ]);
    renderAlertsView(container, model);

    const item = container.querySelector('.alert-item');
    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(navigate).toHaveBeenCalledWith('#/company/G4G-200');
  });

  it('shows severity badge for each alert', () => {
    const model = makeModel([
      makeCompany('C1', 'Co', 2024, [
        makeTrack(3, 'Critical', [makeSubtask('S1', 'X', 'Bloqueado')]),
        makeTrack(5, 'High', [makeSubtask('S2', 'Y', 'Rechazado')]),
      ]),
    ]);
    renderAlertsView(container, model);

    const badges = container.querySelectorAll('.badge');
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });
});
