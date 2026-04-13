/**
 * Unit tests for js/presentation/dc/sheet-tabs-view.js
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderSheetTabsView } from '../../js/presentation/dc/sheet-tabs-view.js';

// Mock router
vi.mock('../../js/presentation/router.js', () => ({
  navigate: vi.fn(),
}));

import { navigate } from '../../js/presentation/router.js';

describe('sheet-tabs-view', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    vi.clearAllMocks();
  });

  it('renders exactly 7 tabs', () => {
    renderSheetTabsView(container, '1');

    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(7);
  });

  it('renders tabs with correct labels', () => {
    renderSheetTabsView(container, '1');

    const tabs = container.querySelectorAll('[role="tab"]');
    const labels = Array.from(tabs).map((t) => t.textContent);

    expect(labels).toEqual([
      'Apps',
      'Infrastructure',
      'IT Experience',
      'MST',
      'Building Security',
      'Compliance and Certifications',
      'Endpoints',
    ]);
  });

  it('renders a tablist role', () => {
    renderSheetTabsView(container, '1');

    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).not.toBeNull();
  });

  it('renders navigation with aria-label', () => {
    renderSheetTabsView(container, '1');

    const nav = container.querySelector('nav');
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBe('Pestañas de hojas');
  });

  it('highlights the active tab', () => {
    renderSheetTabsView(container, '1', 'infrastructure');

    const tabs = container.querySelectorAll('[role="tab"]');
    const activeTab = container.querySelector('.dc-sheet-tabs__tab--active');

    expect(activeTab).not.toBeNull();
    expect(activeTab.textContent).toBe('Infrastructure');
    expect(activeTab.getAttribute('aria-selected')).toBe('true');

    // Other tabs should not be active
    const inactiveTabs = Array.from(tabs).filter(
      (t) => t.getAttribute('aria-selected') === 'false'
    );
    expect(inactiveTabs.length).toBe(6);
  });

  it('no tab is active when no activeSheetId is provided', () => {
    renderSheetTabsView(container, '1');

    const activeTab = container.querySelector('.dc-sheet-tabs__tab--active');
    expect(activeTab).toBeNull();

    const tabs = container.querySelectorAll('[role="tab"]');
    for (const tab of tabs) {
      expect(tab.getAttribute('aria-selected')).toBe('false');
    }
  });

  it('navigates to correct route on tab click', () => {
    renderSheetTabsView(container, '42');

    const tabs = container.querySelectorAll('[role="tab"]');

    // Click the "MST" tab (index 3)
    tabs[3].click();
    expect(navigate).toHaveBeenCalledWith('#/data-collection/42/mst');

    // Click the "Apps" tab (index 0)
    tabs[0].click();
    expect(navigate).toHaveBeenCalledWith('#/data-collection/42/apps');
  });

  it('tabs have data-sheet-id attributes', () => {
    renderSheetTabsView(container, '1');

    const tabs = container.querySelectorAll('[role="tab"]');
    const ids = Array.from(tabs).map((t) => t.getAttribute('data-sheet-id'));

    expect(ids).toEqual([
      'apps',
      'infrastructure',
      'it_experience',
      'mst',
      'building_security',
      'compliance',
      'endpoints',
    ]);
  });

  it('returns the content container element', () => {
    const content = renderSheetTabsView(container, '1', 'apps');

    expect(content).not.toBeNull();
    expect(content.id).toBe('dc-sheet-content');
    expect(content.getAttribute('role')).toBe('tabpanel');
  });

  it('clears previous content on re-render', () => {
    container.innerHTML = '<p>Old content</p>';

    renderSheetTabsView(container, '1');

    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelectorAll('[role="tab"]').length).toBe(7);
  });
});
