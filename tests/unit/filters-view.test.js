/**
 * Unit tests for filters-view.js
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderFilters } from '../../js/presentation/filters-view.js';

function makeModel(companies = []) {
  return {
    companies,
    metadata: { mode: 'offline', lastUpdated: null, totalIssues: 0 },
  };
}

/**
 * Helper: get all selects from the filter bar by order.
 * Order: [severity, year, region, status]
 */
function getSelects(container) {
  return Array.from(container.querySelectorAll('.filter-group__select'));
}

describe('filters-view', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renders a filter bar with 4 filter groups', () => {
    renderFilters(container, makeModel(), () => {});
    const groups = container.querySelectorAll('.filter-group');
    expect(groups.length).toBe(4);
  });

  it('renders severity filter with correct options', () => {
    renderFilters(container, makeModel(), () => {});
    const selects = getSelects(container);
    const options = Array.from(selects[0].querySelectorAll('option'));
    expect(options[0].textContent).toBe('Todas');
    expect(options.length).toBe(5); // Todas + 4 severities
  });

  it('renders year filter with dynamic options from model', () => {
    const model = makeModel([
      { id: 'C1', name: 'A', year: 2024, region: 'Americas', tracks: [], others: [] },
      { id: 'C2', name: 'B', year: 2023, region: 'Americas', tracks: [], others: [] },
    ]);
    renderFilters(container, model, () => {});
    const selects = getSelects(container);
    const options = Array.from(selects[1].querySelectorAll('option'));
    expect(options.length).toBe(3); // Todos + 2023 + 2024
    expect(options[1].textContent).toBe('2023');
    expect(options[2].textContent).toBe('2024');
  });

  it('renders region filter with correct options', () => {
    renderFilters(container, makeModel(), () => {});
    const selects = getSelects(container);
    const options = Array.from(selects[2].querySelectorAll('option'));
    expect(options[0].textContent).toBe('Todas');
    expect(options.length).toBe(3); // Todas + 2 regions
  });

  it('renders status filter with correct options', () => {
    renderFilters(container, makeModel(), () => {});
    const selects = getSelects(container);
    const options = Array.from(selects[3].querySelectorAll('option'));
    expect(options[0].textContent).toBe('Todos');
    expect(options.length).toBe(6); // Todos + 5 statuses
  });

  it('calls onFilterChange with severity when changed', () => {
    const onChange = vi.fn();
    renderFilters(container, makeModel(), onChange);
    const selects = getSelects(container);
    selects[0].value = 'Critical';
    selects[0].dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith({
      severity: 'Critical',
      year: null,
      region: null,
      status: null,
    });
  });

  it('calls onFilterChange with year as number', () => {
    const model = makeModel([
      { id: 'C1', name: 'A', year: 2024, region: 'Americas', tracks: [], others: [] },
    ]);
    const onChange = vi.fn();
    renderFilters(container, model, onChange);
    const selects = getSelects(container);
    selects[1].value = '2024';
    selects[1].dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith({
      severity: null,
      year: 2024,
      region: null,
      status: null,
    });
  });

  it('calls onFilterChange with null when "all" option selected', () => {
    const onChange = vi.fn();
    renderFilters(container, makeModel(), onChange);
    const selects = getSelects(container);

    selects[0].value = 'Critical';
    selects[0].dispatchEvent(new Event('change'));

    // Now select "Todas"
    selects[0].value = '';
    selects[0].dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenLastCalledWith({
      severity: null,
      year: null,
      region: null,
      status: null,
    });
  });
});
