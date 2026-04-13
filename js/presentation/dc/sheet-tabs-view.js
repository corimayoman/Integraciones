/**
 * Sheet Tabs View — Data Collection Module
 *
 * Renders a tab bar with 6 sheet tabs for a company.
 * Clicking a tab navigates to #/data-collection/:empresaId/:hojaId.
 * The active tab is visually highlighted.
 *
 * Validates: Requirements 5.3, 5.4
 *
 * @module dc/sheet-tabs-view
 */

import { SHEET_TABS } from '../../business/sheet-logic.js';
import { navigate } from '../router.js';

/**
 * Render the sheet tabs view into the given container.
 * @param {HTMLElement} container - DOM container to render into
 * @param {string|number} empresaId - Company ID
 * @param {string} [activeSheetId] - Currently active sheet ID
 */
export function renderSheetTabsView(container, empresaId, activeSheetId) {
  container.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'dc-sheet-tabs';

  const nav = document.createElement('nav');
  nav.className = 'dc-sheet-tabs__nav';
  nav.setAttribute('aria-label', 'Pestañas de hojas');

  const tabList = document.createElement('ul');
  tabList.className = 'dc-sheet-tabs__list';
  tabList.setAttribute('role', 'tablist');

  for (const tab of SHEET_TABS) {
    const li = document.createElement('li');
    li.className = 'dc-sheet-tabs__item';
    li.setAttribute('role', 'presentation');

    const button = document.createElement('button');
    button.className = 'dc-sheet-tabs__tab';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', tab.id === activeSheetId ? 'true' : 'false');
    button.setAttribute('data-sheet-id', tab.id);
    button.textContent = tab.label;

    if (tab.id === activeSheetId) {
      button.classList.add('dc-sheet-tabs__tab--active');
    }

    button.addEventListener('click', () => {
      navigate(`#/data-collection/${empresaId}/${tab.id}`);
    });

    li.appendChild(button);
    tabList.appendChild(li);
  }

  nav.appendChild(tabList);
  wrapper.appendChild(nav);

  // Content area where the sheet pattern view will be rendered
  const content = document.createElement('div');
  content.className = 'dc-sheet-tabs__content';
  content.id = 'dc-sheet-content';
  content.setAttribute('role', 'tabpanel');
  content.setAttribute('aria-label', 'Contenido de hoja');
  wrapper.appendChild(content);

  container.appendChild(wrapper);

  return content;
}
