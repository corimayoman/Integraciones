/**
 * Detail View — I4G Integration Tracker
 *
 * Renders a detailed view for a single company showing all 14 tracks
 * with progress bars, subtask lists, and severity indicators.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 *
 * @module detail-view
 */

import { INTEGRATION_TRACKS } from '../constants.js';
import { getCellColor, getSeverityColor } from '../business/presentation-utils.js';
import { createBadge, createProgressBar } from './components.js';
import { navigate } from './router.js';

/** @type {Set<number>} Track numbers currently expanded */
const expandedTracks = new Set();

/**
 * Render the detail view for a single company.
 *
 * @param {HTMLElement} container - DOM container to render into
 * @param {object} company - Company object from the DashboardModel
 */
export function renderDetailView(container, company) {
  container.textContent = '';
  expandedTracks.clear();

  // Back button
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn--secondary detail-back-btn';
  backBtn.type = 'button';
  backBtn.textContent = '← Volver';
  backBtn.addEventListener('click', () => navigate('#/'));
  container.appendChild(backBtn);

  // Company header
  const header = document.createElement('div');
  header.className = 'detail-header';

  const title = document.createElement('h2');
  title.className = 'detail-header__title';
  title.textContent = company.name;
  header.appendChild(title);

  if (company.year !== null) {
    const yearBadge = document.createElement('span');
    yearBadge.className = 'detail-header__year';
    yearBadge.textContent = String(company.year);
    header.appendChild(yearBadge);
  }

  if (company.region) {
    const regionBadge = document.createElement('span');
    regionBadge.className = 'detail-header__region';
    regionBadge.textContent = company.region;
    header.appendChild(regionBadge);
  }

  container.appendChild(header);

  // Tracks list
  const trackMap = new Map();
  for (const t of company.tracks) {
    trackMap.set(t.trackNumber, t);
  }

  const tracksList = document.createElement('div');
  tracksList.className = 'detail-tracks';

  for (const trackDef of INTEGRATION_TRACKS) {
    const track = trackMap.get(trackDef.number);
    const trackCard = buildTrackCard(trackDef, track);
    tracksList.appendChild(trackCard);
  }

  container.appendChild(tracksList);
}

/**
 * Build a track card with header, progress bar, and expandable subtasks.
 *
 * @param {{ number: number, name: string, severity: string }} trackDef
 * @param {object|undefined} track - TrackStatus from the company, or undefined
 * @returns {HTMLElement}
 */
function buildTrackCard(trackDef, track) {
  const card = document.createElement('div');
  card.className = 'detail-track-card';

  // Header row (clickable to expand)
  const headerRow = document.createElement('div');
  headerRow.className = 'detail-track-card__header';
  headerRow.setAttribute('role', 'button');
  headerRow.setAttribute('tabindex', '0');
  headerRow.setAttribute('aria-expanded', 'false');

  // Track number + name
  const nameEl = document.createElement('span');
  nameEl.className = 'detail-track-card__name';
  nameEl.textContent = `${String(trackDef.number).padStart(2, '0')}. ${trackDef.name}`;
  headerRow.appendChild(nameEl);

  // Severity badge
  const sevClass = getSeverityColor(trackDef.severity);
  const sevBadge = createBadge(trackDef.severity, sevClass);
  headerRow.appendChild(sevBadge);

  // Completion %
  const progressValue = track ? track.progress : 0;
  const progressText = document.createElement('span');
  progressText.className = 'detail-track-card__completion';
  progressText.textContent = `${Math.round(progressValue)}%`;
  headerRow.appendChild(progressText);

  // Subtask counts by status
  if (track && track.subtasks.length > 0) {
    const counts = buildSubtaskCounts(track.subtasks);
    headerRow.appendChild(counts);
  }

  // Main assignee
  if (track && track.assignee) {
    const assigneeEl = document.createElement('span');
    assigneeEl.className = 'detail-track-card__assignee';
    assigneeEl.textContent = track.assignee;
    headerRow.appendChild(assigneeEl);
  }

  card.appendChild(headerRow);

  // Progress bar
  const progressBar = createProgressBar(progressValue, trackDef.severity);
  progressBar.classList.add('detail-track-card__progress');
  card.appendChild(progressBar);

  // Expandable subtask list
  const subtaskContainer = document.createElement('div');
  subtaskContainer.className = 'detail-track-card__subtasks';
  subtaskContainer.style.display = 'none';

  if (track && track.subtasks.length > 0) {
    const list = document.createElement('ul');
    list.className = 'detail-subtask-list';

    for (const subtask of track.subtasks) {
      const li = buildSubtaskItem(subtask);
      list.appendChild(li);
    }

    subtaskContainer.appendChild(list);
  } else {
    const noData = document.createElement('p');
    noData.className = 'detail-track-card__no-subtasks';
    noData.textContent = 'Sin subtareas';
    subtaskContainer.appendChild(noData);
  }

  card.appendChild(subtaskContainer);

  // Toggle expand/collapse
  function toggleExpand() {
    const isExpanded = expandedTracks.has(trackDef.number);
    if (isExpanded) {
      expandedTracks.delete(trackDef.number);
      subtaskContainer.style.display = 'none';
      headerRow.setAttribute('aria-expanded', 'false');
    } else {
      expandedTracks.add(trackDef.number);
      subtaskContainer.style.display = '';
      headerRow.setAttribute('aria-expanded', 'true');
    }
  }

  headerRow.addEventListener('click', toggleExpand);
  headerRow.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpand();
    }
  });

  return card;
}

/**
 * Build subtask count summary badges.
 *
 * @param {Array<{ status: string }>} subtasks
 * @returns {HTMLElement}
 */
function buildSubtaskCounts(subtasks) {
  const counts = {};
  for (const st of subtasks) {
    counts[st.status] = (counts[st.status] || 0) + 1;
  }

  const container = document.createElement('span');
  container.className = 'detail-track-card__counts';

  for (const [status, count] of Object.entries(counts)) {
    const statusClass = getCellColor(status);
    const badge = createBadge(`${count}`, `status-${statusClass.replace('status-', '')}`);
    badge.setAttribute('title', `${status}: ${count}`);
    container.appendChild(badge);
  }

  return container;
}

/**
 * Build a single subtask list item.
 *
 * @param {object} subtask
 * @returns {HTMLLIElement}
 */
function buildSubtaskItem(subtask) {
  const li = document.createElement('li');
  li.className = 'detail-subtask-item';

  if (subtask.status === 'Bloqueado') {
    li.classList.add('detail-subtask-item--blocked');
  }

  const summary = document.createElement('span');
  summary.className = 'detail-subtask-item__summary';
  summary.textContent = subtask.summary;
  li.appendChild(summary);

  const statusClass = getCellColor(subtask.status);
  const statusBadge = createBadge(subtask.status, `status-${statusClass.replace('status-', '')}`);
  li.appendChild(statusBadge);

  if (subtask.assignee) {
    const assignee = document.createElement('span');
    assignee.className = 'detail-subtask-item__assignee';
    assignee.textContent = subtask.assignee;
    li.appendChild(assignee);
  }

  return li;
}
