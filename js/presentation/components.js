/**
 * Reusable UI Components — I4G Integration Tracker
 *
 * Factory functions that return DOM elements (not strings).
 * Uses semantic HTML and ARIA attributes.
 * Uses CSS classes from tokens.css (var(--color-*), var(--space-*), etc.)
 *
 * Validates: Requirements 17.1, 17.6, 17.7, 10.5, 10.6
 *
 * @module components
 */

/**
 * Create a positional tooltip that shows on hover/focus of a target element.
 * @param {string} content - Text content for the tooltip
 * @param {HTMLElement} targetEl - Element to attach the tooltip to
 * @returns {HTMLElement} The tooltip element (also attaches events to targetEl)
 */
export function createTooltip(content, targetEl) {
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.setAttribute('role', 'tooltip');
  tooltip.textContent = content;
  tooltip.style.display = 'none';

  const id = `tooltip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  tooltip.id = id;
  targetEl.setAttribute('aria-describedby', id);

  function show() {
    tooltip.style.display = '';
    positionTooltip(tooltip, targetEl);
  }

  function hide() {
    tooltip.style.display = 'none';
  }

  targetEl.addEventListener('mouseenter', show);
  targetEl.addEventListener('mouseleave', hide);
  targetEl.addEventListener('focus', show);
  targetEl.addEventListener('blur', hide);

  return tooltip;
}

/**
 * Position tooltip above the target element.
 * @param {HTMLElement} tooltip
 * @param {HTMLElement} target
 */
function positionTooltip(tooltip, target) {
  const rect = target.getBoundingClientRect();
  tooltip.style.position = 'absolute';
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.top = `${rect.top - 8}px`;
  tooltip.style.transform = 'translate(-50%, -100%)';
}

/**
 * Severity/status icon map for color-blind safe second channel.
 */
const BADGE_ICONS = {
  'severity-critical': '⬤',
  'severity-high': '▲',
  'severity-medium': '◆',
  'severity-low': '●',
  'status-not-started': '○',
  'status-in-progress': '◐',
  'status-completed': '✓',
  'status-blocked': '✕',
  'status-rejected': '⊘',
};

/**
 * Create a badge element with color and icon for severity/status.
 * @param {string} text - Badge label text
 * @param {string} type - Badge type: 'severity-critical', 'status-blocked', etc.
 * @returns {HTMLElement}
 */
export function createBadge(text, type) {
  const badge = document.createElement('span');
  badge.className = `badge badge--${type}`;

  const icon = document.createElement('span');
  icon.className = 'badge__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = BADGE_ICONS[type] || '';

  const label = document.createElement('span');
  label.className = 'badge__label';
  label.textContent = text;

  badge.appendChild(icon);
  badge.appendChild(label);

  return badge;
}

/**
 * Create a loading spinner with aria-label.
 * @param {'sm' | 'md' | 'lg'} [size='md'] - Spinner size
 * @returns {HTMLElement}
 */
export function createSpinner(size = 'md') {
  const spinner = document.createElement('div');
  spinner.className = `spinner spinner--${size}`;
  spinner.setAttribute('role', 'status');
  spinner.setAttribute('aria-label', 'Cargando');

  const visual = document.createElement('div');
  visual.className = 'spinner__circle';
  visual.setAttribute('aria-hidden', 'true');

  const srText = document.createElement('span');
  srText.className = 'visually-hidden';
  srText.textContent = 'Cargando...';

  spinner.appendChild(visual);
  spinner.appendChild(srText);

  return spinner;
}

/**
 * Create a progress bar with color by severity.
 * @param {number} progress - 0-100
 * @param {string} [severity='Medium'] - 'Critical' | 'High' | 'Medium' | 'Low'
 * @returns {HTMLElement}
 */
export function createProgressBar(progress, severity = 'Medium') {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));
  const severityClass = `severity-${severity.toLowerCase()}`;

  const container = document.createElement('div');
  container.className = 'progress-bar';
  container.setAttribute('role', 'progressbar');
  container.setAttribute('aria-valuenow', String(clamped));
  container.setAttribute('aria-valuemin', '0');
  container.setAttribute('aria-valuemax', '100');
  container.setAttribute('aria-label', `Progreso: ${clamped}%`);

  const fill = document.createElement('div');
  fill.className = `progress-bar__fill progress-bar__fill--${severityClass}`;
  fill.style.width = `${clamped}%`;

  const label = document.createElement('span');
  label.className = 'progress-bar__label';
  label.textContent = `${clamped}%`;

  container.appendChild(fill);
  container.appendChild(label);

  return container;
}

/**
 * Create an empty state message.
 * @param {string} message - Descriptive message
 * @returns {HTMLElement}
 */
export function createEmptyState(message) {
  const container = document.createElement('div');
  container.className = 'empty-state';

  const icon = document.createElement('div');
  icon.className = 'empty-state__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '📭';

  const text = document.createElement('p');
  text.className = 'empty-state__message';
  text.textContent = message;

  container.appendChild(icon);
  container.appendChild(text);

  return container;
}

/**
 * Create an error state with retry button.
 * @param {string} message - Error message
 * @param {() => void} [onRetry] - Retry callback
 * @returns {HTMLElement}
 */
export function createErrorState(message, onRetry) {
  const container = document.createElement('div');
  container.className = 'error-state';
  container.setAttribute('role', 'alert');

  const icon = document.createElement('div');
  icon.className = 'error-state__icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '⚠';

  const text = document.createElement('p');
  text.className = 'error-state__message';
  text.textContent = message;

  container.appendChild(icon);
  container.appendChild(text);

  if (onRetry) {
    const btn = document.createElement('button');
    btn.className = 'btn btn--primary error-state__retry';
    btn.type = 'button';
    btn.textContent = 'Reintentar';
    btn.addEventListener('click', onRetry);
    container.appendChild(btn);
  }

  return container;
}
