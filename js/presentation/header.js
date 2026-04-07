/**
 * Header — AMS Integration Tracker
 *
 * Renders header with LED connection indicator, alert count, dark mode toggle.
 * No more ugly banners — just a clean LED dot next to the title.
 *
 * @module header
 */

/** @type {HTMLElement|null} */
let headerContainer = null;

/** @type {HTMLElement|null} */
let connectBtn = null;

/** @type {HTMLElement|null} */
let alertBadge = null;

/** @type {HTMLElement|null} */
let ledIndicator = null;

/** @type {HTMLElement|null} */
let ledLabel = null;

/**
 * Render the header into the given container.
 */
export function renderHeader(container, { isLive, alertCount, onConnect, onDisconnect, onToggleDarkMode }) {
  headerContainer = container;

  let headerContent = container.querySelector('.header-content');
  if (!headerContent) {
    headerContent = document.createElement('div');
    headerContent.className = 'header-content';
    container.appendChild(headerContent);
  }

  headerContent.textContent = '';

  // Remove old banners if they exist
  const oldBanner = container.querySelector('.offline-banner');
  if (oldBanner) oldBanner.remove();
  const oldLost = container.querySelector('.connection-lost-banner');
  if (oldLost) oldLost.remove();

  // Left side: title + LED indicator
  const leftGroup = document.createElement('div');
  leftGroup.className = 'header-left';

  const title = document.createElement('h1');
  title.className = 'app-title';
  title.textContent = 'AMS Integration Tracker';
  leftGroup.appendChild(title);

  // LED connection indicator
  const ledContainer = document.createElement('div');
  ledContainer.className = 'header-led';
  ledContainer.setAttribute('role', 'status');

  ledIndicator = document.createElement('span');
  ledIndicator.className = isLive ? 'led led--online' : 'led led--offline';
  ledContainer.appendChild(ledIndicator);

  ledLabel = document.createElement('span');
  ledLabel.className = 'led-label';
  ledLabel.textContent = isLive ? 'Live' : 'Offline';
  ledContainer.appendChild(ledLabel);

  leftGroup.appendChild(ledContainer);
  headerContent.appendChild(leftGroup);

  // Right side: actions
  const actions = document.createElement('div');
  actions.className = 'header-actions';
  actions.setAttribute('aria-label', 'Acciones del header');

  // Alert count badge
  alertBadge = document.createElement('span');
  alertBadge.className = 'header-alert-badge';
  alertBadge.setAttribute('aria-label', `${alertCount} alertas activas`);
  alertBadge.textContent = String(alertCount);
  if (alertCount === 0) alertBadge.style.display = 'none';
  actions.appendChild(alertBadge);

  // Connect/Disconnect button
  connectBtn = document.createElement('button');
  connectBtn.type = 'button';
  connectBtn.className = 'btn header-connect-btn';
  if (isLive) {
    connectBtn.textContent = 'Desconectar';
    connectBtn.setAttribute('aria-label', 'Desconectar de Jira');
    connectBtn.addEventListener('click', onDisconnect);
  } else {
    connectBtn.textContent = 'Conectar Jira';
    connectBtn.setAttribute('aria-label', 'Conectar con Jira');
    connectBtn.addEventListener('click', onConnect);
  }
  actions.appendChild(connectBtn);

  // Dark mode toggle
  const darkToggle = document.createElement('button');
  darkToggle.type = 'button';
  darkToggle.className = 'btn header-dark-toggle';
  darkToggle.setAttribute('aria-label', 'Alternar modo oscuro');
  darkToggle.textContent = '🌙';
  darkToggle.addEventListener('click', onToggleDarkMode);
  actions.appendChild(darkToggle);

  headerContent.appendChild(actions);
}

/**
 * Update the connection status LED indicator.
 */
export function updateConnectionStatus(isLive) {
  if (ledIndicator) {
    ledIndicator.className = isLive ? 'led led--online' : 'led led--offline';
  }
  if (ledLabel) {
    ledLabel.textContent = isLive ? 'Live' : 'Offline';
  }
  if (connectBtn) {
    connectBtn.textContent = isLive ? 'Desconectar' : 'Conectar Jira';
  }
}

/**
 * Update the alert count badge.
 */
export function updateAlertCount(count) {
  if (!alertBadge) return;
  alertBadge.textContent = String(count);
  alertBadge.setAttribute('aria-label', `${count} alertas activas`);
  alertBadge.style.display = count > 0 ? '' : 'none';
}

// Keep these for backward compatibility but they're no-ops now
export function showOfflineBanner() { updateConnectionStatus(false); }
export function hideOfflineBanner() {}
export function showConnectionLostBanner() { updateConnectionStatus(false); }
export function hideConnectionLostBanner() {}
