/**
 * Alerts View — I4G Integration Tracker
 *
 * Renders a panel listing delayed tracks (Critical/High with blocked subtasks).
 * Clicking an alert navigates to the company detail view.
 *
 * Validates: Requirements 6.1, 6.2, 6.4
 *
 * @module alerts-view
 */

import { detectDelayedTracks } from '../business/alerts.js';
import { createBadge, createEmptyState } from './components.js';
import { navigate } from './router.js';

/**
 * Render the alerts view into the given container.
 *
 * @param {HTMLElement} container - DOM container to render into
 * @param {object} model - DashboardModel
 */
export function renderAlertsView(container, model) {
  container.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'alerts-view__title';
  heading.textContent = 'Alertas — Tracks Demorados';
  container.appendChild(heading);

  const alerts = detectDelayedTracks(model);

  if (alerts.length === 0) {
    const emptyState = createEmptyState('No hay alertas activas. Todos los tracks críticos están en orden.');
    container.appendChild(emptyState);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'alerts-list';
  list.setAttribute('role', 'list');

  for (const alert of alerts) {
    const item = buildAlertItem(alert);
    list.appendChild(item);
  }

  container.appendChild(list);
}

/**
 * Build a single alert list item.
 *
 * @param {object} alert - Alert object from detectDelayedTracks
 * @returns {HTMLLIElement}
 */
function buildAlertItem(alert) {
  const li = document.createElement('li');
  li.className = 'alert-item';
  li.setAttribute('role', 'listitem');
  li.style.cursor = 'pointer';
  li.setAttribute('tabindex', '0');

  // Company name
  const companyEl = document.createElement('span');
  companyEl.className = 'alert-item__company';
  companyEl.textContent = alert.companyName;
  li.appendChild(companyEl);

  // Track name
  const trackEl = document.createElement('span');
  trackEl.className = 'alert-item__track';
  trackEl.textContent = `${String(alert.trackNumber).padStart(2, '0')}. ${alert.trackName}`;
  li.appendChild(trackEl);

  // Severity badge
  const sevClass = `severity-${alert.severity.toLowerCase()}`;
  const sevBadge = createBadge(alert.severity, sevClass);
  li.appendChild(sevBadge);

  // Blocking subtask info
  const blockingEl = document.createElement('span');
  blockingEl.className = 'alert-item__blocking';
  blockingEl.textContent = `${alert.blockingSubtask.key}: ${alert.blockingSubtask.summary}`;
  li.appendChild(blockingEl);

  // Blocking status badge
  const statusBadge = createBadge(alert.blockingSubtask.status, 'status-blocked');
  li.appendChild(statusBadge);

  // Navigate to company detail on click
  function goToDetail() {
    navigate(`#/company/${encodeURIComponent(alert.companyId)}`);
  }

  li.addEventListener('click', goToDetail);
  li.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      goToDetail();
    }
  });

  return li;
}
