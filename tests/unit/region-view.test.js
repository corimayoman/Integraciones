/**
 * Unit tests for region-view.js
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderRegionView } from '../../js/presentation/region-view.js';

function makeModel(companies = []) {
  return {
    companies,
    metadata: { mode: 'offline', lastUpdated: null, totalIssues: 0 },
  };
}

function makeCompany(id, name, year, region, tracks = []) {
  return { id, name, year, region, tracks, others: [] };
}

function makeTrack(num, status, progress = 0) {
  return {
    trackNumber: num,
    trackName: `Track ${num}`,
    severity: 'Medium',
    epicKey: `EPIC-${num}`,
    progress,
    status,
    subtasks: [],
    assignee: null,
    totalSubtasks: 0,
    closedSubtasks: 0,
  };
}

describe('region-view', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders empty message when no companies', () => {
    renderRegionView(container, makeModel([]));
    expect(container.textContent).toContain('No hay empresas');
  });

  it('groups companies by region with section headers', () => {
    const model = makeModel([
      makeCompany('C1', 'Acme', 2024, 'Americas'),
      makeCompany('C2', 'Euro Co', 2023, 'EMEA & New Markets'),
    ]);
    renderRegionView(container, model);

    const sections = container.querySelectorAll('.region-section');
    expect(sections.length).toBe(2);

    const titles = Array.from(container.querySelectorAll('.region-section__title'))
      .map(el => el.textContent);
    expect(titles).toContain('Americas');
    expect(titles).toContain('EMEA & New Markets');
  });

  it('shows ITX Manager names as group headers', () => {
    const model = makeModel([
      makeCompany('C1', 'Acme', 2024, 'Americas'),
    ]);
    renderRegionView(container, model);

    const manager = container.querySelector('.region-section__manager');
    expect(manager.textContent).toContain('Daniel Rico');
  });

  it('shows aggregated metrics per region', () => {
    const model = makeModel([
      makeCompany('C1', 'A', 2024, 'Americas', [
        makeTrack(1, 'En Progreso', 60),
        makeTrack(2, 'Bloqueado', 20),
      ]),
      makeCompany('C2', 'B', 2024, 'Americas', [
        makeTrack(1, 'Completado', 100),
      ]),
    ]);
    renderRegionView(container, model);

    const metrics = container.querySelectorAll('.region-metric');
    expect(metrics.length).toBeGreaterThanOrEqual(2);

    // Check avg completion is shown
    const avgText = metrics[0].textContent;
    expect(avgText).toContain('Completitud promedio');

    // Check blocked count is shown
    const blockedText = metrics[1].textContent;
    expect(blockedText).toContain('Tracks bloqueados');
  });

  it('shows company summary rows with name, year, and progress', () => {
    const model = makeModel([
      makeCompany('C1', 'TestCo', 2024, 'Americas', [makeTrack(1, 'En Progreso', 75)]),
    ]);
    renderRegionView(container, model);

    const rows = container.querySelectorAll('.region-company-row');
    expect(rows.length).toBe(1);

    const cells = rows[0].querySelectorAll('td');
    expect(cells[0].textContent).toBe('TestCo');
    expect(cells[1].textContent).toBe('2024');
    // Progress bar should be in the third cell
    expect(cells[2].querySelector('.progress-bar')).not.toBeNull();
  });
});
