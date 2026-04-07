/**
 * Header — I4G Integration Tracker
 *
 * Renders header with connection status, alert count, dark mode toggle,
 * and offline/connection-lost banners.
 *
 * Validates: Requirements 1.8, 7.2, 7.4, 7.5, 10.3, 6.3, 17.8
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
let offlineBanner = null;

/** @type {HTMLElement|null} */
let connectionLostBanner = null;

/**
 * Render the header into the given container.
 *
 * @param {HTMLElement} container - The #app-header element
 * @param {{
 *   isLive: boolean,
 *   alertCount: number,
 *   onConnect: () => void,
 *   onDisconnect: () => void,
 *   onToggleDarkMode: () => void
 * }} options
 */
export function renderHeader(container, { isLive, alertCount, onConnect, onDisconnect, onToggleDarkMode }) {
  headerContainer = container;

  // Find or create header-content div
  let headerContent = container.querySelector('.header-content');
  if (!headerContent) {
    headerContent = document.createElement('div');
    headerContent.className = 'header-content';
    container.appendChild(headerContent);
  }

  // Clear existing content
  headerContent.textContent = '';

  // Title
  const title = document.createElement('h1');
  title.className = 'app-title';
  title.textContent = 'I4G Integration Tracker';
  headerContent.appendChild(title);

  // Actions container
  const actions = document.createElement('div');
  actions.className = 'header-actions';
  actions.setAttribute('aria-label', 'Acciones del header');

  // Alert count badge
  alertBadge = document.createElement('span');
  alertBadge.className = 'header-alert-badge';
  alertBadge.setAttribute('aria-label', `${alertCount} alertas activas`);
  alertBadge.textContent = String(alertCount);
  if (alertCount === 0) {
    alertBadge.style.display = 'none';
  }
  actions.appendChild(alertBadge);

  // Connect/Disconnect button
  connectBtn = document.createElement('button');
  connectBtn.type = 'button';
  if (isLive) {
    connectBtn.className = 'btn btn--secondary header-connect-btn header-connect-btn--connected';
    connectBtn.textContent = 'Conectado';
    connectBtn.setAttribute('aria-label', 'Desconectar de Jira');
    connectBtn.addEventListener('click', onDisconnect);
  } else {
    connectBtn.className = 'btn btn--primary header-connect-btn';
    connectBtn.textContent = 'Connect Jira';
    connectBtn.setAttribute('aria-label', 'Conectar con Jira');
    connectBtn.addEventListener('click', onConnect);
  }
  actions.appendChild(connectBtn);

  // Dark mode toggle
  const darkToggle = document.createElement('button');
  darkToggle.type = 'button';
  darkToggle.className = 'btn btn--secondary header-dark-toggle';
  darkToggle.setAttribute('aria-label', 'Alternar modo oscuro');
  darkToggle.textContent = '🌙';
  darkToggle.addEventListener('click', onToggleDarkMode);
  actions.appendChild(darkToggle);

  headerContent.appendChild(actions);

  // Offline banner (hidden by default)
  offlineBanner = container.querySelector('.offline-banner');
  if (!offlineBanner) {
    offlineBanner = document.createElement('div');
    offlineBanner.className = 'offline-banner';
    offlineBanner.setAttribute('role', 'status');
    offlineBanner.textContent = 'Modo Offline - Datos de ejemplo';
    offlineBanner.style.display = 'none';
    container.appendChild(offlineBanner);
  }

  // Connection lost banner (hidden by default)
  connectionLostBanner = container.querySelector('.connection-lost-banner');
  if (!connectionLostBanner) {
    connectionLostBanner = document.createElement('div');
    connectionLostBanner.className = 'connection-lost-banner';
    connectionLostBanner.setAttribute('role', 'alert');
    connectionLostBanner.textContent = 'Conexión perdida';
    connectionLostBanner.style.display = 'none';
    container.appendChild(connectionLostBanner);
  }

  // Show offline banner if not live
  if (!isLive) {
    offlineBanner.style.display = '';
  }
}

/**
 * Update the connection status indicator in the header.
 * @param {boolean} isLive
 */
export function updateConnectionStatus(isLive) {
  if (!connectBtn) return;

  if (isLive) {
    connectBtn.className = 'btn btn--secondary header-connect-btn header-connect-btn--connected';
    connectBtn.textContent = 'Conectado';
    hideOfflineBanner();
    hideConnectionLostBanner();
  } else {
    connectBtn.className = 'btn btn--primary header-connect-btn';
    connectBtn.textContent = 'Connect Jira';
  }
}

/**
 * Update the alert count badge.
 * @param {number} count
 */
export function updateAlertCount(count) {
  if (!alertBadge) return;
  alertBadge.textContent = String(count);
  alertBadge.setAttribute('aria-label', `${count} alertas activas`);
  alertBadge.style.display = count > 0 ? '' : 'none';
}

/**
 * Show the offline mode banner.
 */
export function showOfflineBanner() {
  if (offlineBanner) {
    offlineBanner.style.display = '';
  }
}

/**
 * Hide the offline mode banner.
 */
export function hideOfflineBanner() {
  if (offlineBanner) {
    offlineBanner.style.display = 'none';
  }
}

/**
 * Show the "Conexión perdida" banner.
 */
export function showConnectionLostBanner() {
  if (connectionLostBanner) {
    connectionLostBanner.style.display = '';
  }
}

/**
 * Hide the "Conexión perdida" banner.
 */
export function hideConnectionLostBanner() {
  if (connectionLostBanner) {
    connectionLostBanner.style.display = 'none';
  }
}
