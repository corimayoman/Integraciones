/**
 * Unit tests for detail-view.js
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderDetailView } from '../../js/presentation/detail-view.js';

// Mock router navigate
vi.mock('../../js/presentation/router.js', () => ({
  navigate: vi.fn(),
}));

import { navigate } from '../../js/presentation/router.js';

function makeCompany(overrides = {}) {
  return {
    id: 'G4G-100',
    name: 'Acme Corp',
    year: 2024,
    region: 'Americas',
    tracks: [],
    others: [],
    ...overrides,
  };
}

function makeTrack(num, status, progress = 0, subtasks = [], assignee = null) {
  return {
    trackNumber: num,
    trackName: `Track ${num}`,
    severity: 'Medium',
    epicKey: `EPIC-${num}`,
    progress,
    status,
    subtasks,
    assignee,
    totalSubtasks: subtasks.length,
    closedSubtasks: subtasks.filter(s => s.status === 'Completado').length,
  };
}

function makeSubtask(key, summary, status, assignee = null) {
  return { key, summary, status, jiraStatus: status, assignee };
}

describe('detail-view', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  it('renders back button that navigates to #/', () => {
    renderDetailView(container, makeCompany());
    const backBtn = container.querySelector('.detail-back-btn');
    expect(backBtn).not.toBeNull();
    expect(backBtn.textContent).toContain('Volver');

    backBtn.click();
    expect(navigate).toHaveBeenCalledWith('#/');
  });

  it('renders company name and year', () => {
    renderDetailView(container, makeCompany({ name: 'TestCo', year: 2025 }));
    const title = container.querySelector('.detail-header__title');
    expect(title.textContent).toBe('TestCo');

    const yearEl = container.querySelector('.detail-header__year');
    expect(yearEl.textContent).toBe('2025');
  });

  it('renders 14 track cards', () => {
    renderDetailView(container, makeCompany());
    const cards = container.querySelectorAll('.detail-track-card');
    expect(cards.length).toBe(14);
  });

  it('shows progress bar per track with severity color', () => {
    const company = makeCompany({
      tracks: [makeTrack(1, 'En Progreso', 60)],
    });
    renderDetailView(container, company);

    const progressBars = container.querySelectorAll('.progress-bar');
    expect(progressBars.length).toBeGreaterThanOrEqual(1);
  });

  it('shows assignee when present', () => {
    const company = makeCompany({
      tracks: [makeTrack(1, 'En Progreso', 50, [], 'John Doe')],
    });
    renderDetailView(container, company);

    const assignee = container.querySelector('.detail-track-card__assignee');
    expect(assignee.textContent).toBe('John Doe');
  });

  it('expands track to show subtasks on click', () => {
    const subtasks = [
      makeSubtask('S1', 'Setup env', 'Completado'),
      makeSubtask('S2', 'Config DNS', 'Bloqueado'),
    ];
    const company = makeCompany({
      tracks: [makeTrack(1, 'En Progreso', 50, subtasks)],
    });
    renderDetailView(container, company);

    const header = container.querySelector('.detail-track-card__header');
    const subtaskContainer = container.querySelector('.detail-track-card__subtasks');

    expect(subtaskContainer.style.display).toBe('none');

    header.click();
    expect(subtaskContainer.style.display).toBe('');
    expect(header.getAttribute('aria-expanded')).toBe('true');

    // Collapse
    header.click();
    expect(subtaskContainer.style.display).toBe('none');
  });

  it('highlights blocked subtasks in red', () => {
    const subtasks = [
      makeSubtask('S1', 'Blocked task', 'Bloqueado'),
      makeSubtask('S2', 'Normal task', 'En Progreso'),
    ];
    const company = makeCompany({
      tracks: [makeTrack(1, 'Bloqueado', 30, subtasks)],
    });
    renderDetailView(container, company);

    // Expand the track
    container.querySelector('.detail-track-card__header').click();

    const blockedItems = container.querySelectorAll('.detail-subtask-item--blocked');
    expect(blockedItems.length).toBe(1);
    expect(blockedItems[0].textContent).toContain('Blocked task');
  });
});
