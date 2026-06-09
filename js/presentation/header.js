/**
 * Header — AMS Integration & Compliance Tracker
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

/** Saved refs for dynamic banner updates */
let _onConnectRef = null;
let _snapshotDateRef = null;

/**
 * Render the header into the given container.
 */
export function renderHeader(container, { isLive, alertCount, snapshotDate, onConnect, onDisconnect, onRefresh, onToggleDarkMode, googleUser, onSignOut }) {
  headerContainer = container;
  _onConnectRef = onConnect;
  _snapshotDateRef = snapshotDate;

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
  title.textContent = 'AMS Integration & Compliance Tracker';
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

  // Refresh button — only when live
  if (isLive && onRefresh) {
    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.className = 'btn header-refresh-btn';
    refreshBtn.setAttribute('aria-label', 'Actualizar datos desde Jira');
    refreshBtn.title = 'Actualizar datos desde Jira';
    refreshBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`;
    refreshBtn.addEventListener('click', onRefresh);
    actions.appendChild(refreshBtn);
  }

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

  // User chip con cerrar sesión
  if (googleUser && onSignOut) {
    const chip = document.createElement('div');
    chip.className = 'header-user-chip';

    if (googleUser.photoURL) {
      const img = document.createElement('img');
      img.src = googleUser.photoURL;
      img.alt = googleUser.displayName || googleUser.email;
      img.className = 'header-user-avatar';
      chip.appendChild(img);
    } else {
      const initials = document.createElement('span');
      initials.className = 'header-user-initials';
      initials.textContent = (googleUser.displayName || googleUser.email || '?')[0].toUpperCase();
      chip.appendChild(initials);
    }

    const name = document.createElement('span');
    name.className = 'header-user-name';
    name.textContent = googleUser.displayName?.split(' ')[0] || googleUser.email;
    chip.appendChild(name);

    const signOutBtn = document.createElement('button');
    signOutBtn.type = 'button';
    signOutBtn.className = 'header-signout-btn';
    signOutBtn.setAttribute('aria-label', 'Cerrar sesión');
    signOutBtn.title = 'Cerrar sesión';
    signOutBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
    signOutBtn.addEventListener('click', onSignOut);
    chip.appendChild(signOutBtn);

    actions.appendChild(chip);
  }

  headerContent.appendChild(actions);

  // Snapshot banner — shown when offline with cached data
  const existingBanner = container.querySelector('.snapshot-banner');
  if (existingBanner) existingBanner.remove();

  if (!isLive) {
    const banner = document.createElement('div');
    banner.className = 'snapshot-banner';

    if (snapshotDate) {
      const d = new Date(snapshotDate);
      const formatted = d.toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      banner.innerHTML = `
        <span class="snapshot-banner__icon">📅</span>
        <span class="snapshot-banner__text">Datos del <strong>${formatted}</strong> — sin conexión a Jira en vivo</span>
        <button class="snapshot-banner__btn" aria-label="Reconectar a Jira">Reconectar</button>
      `;
      banner.querySelector('.snapshot-banner__btn').addEventListener('click', onConnect);
    } else {
      banner.innerHTML = `
        <span class="snapshot-banner__icon">⚠️</span>
        <span class="snapshot-banner__text">Sin conexión a Jira. Conectate para ver datos en tiempo real.</span>
        <button class="snapshot-banner__btn" aria-label="Conectar Jira">Conectar</button>
      `;
      banner.querySelector('.snapshot-banner__btn').addEventListener('click', onConnect);
    }

    container.appendChild(banner);
  }
}

/**
 * Update the connection status LED indicator and snapshot banner.
 */
export function updateConnectionStatus(isLive, snapshotDate) {
  if (snapshotDate !== undefined) _snapshotDateRef = snapshotDate;

  if (ledIndicator) {
    ledIndicator.className = isLive ? 'led led--online' : 'led led--offline';
  }
  if (ledLabel) {
    ledLabel.textContent = isLive ? 'Live' : 'Offline';
  }
  if (connectBtn) {
    connectBtn.textContent = isLive ? 'Desconectar' : 'Conectar Jira';
    connectBtn.disabled = false;
    connectBtn.classList.remove('header-connect-btn--connecting');
  }

  // Update snapshot banner
  if (headerContainer) {
    const existing = headerContainer.querySelector('.snapshot-banner');
    if (existing) existing.remove();

    if (!isLive) {
      const banner = document.createElement('div');
      banner.className = 'snapshot-banner';

      if (_snapshotDateRef) {
        const d = new Date(_snapshotDateRef);
        const formatted = d.toLocaleString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        banner.innerHTML = `
          <span class="snapshot-banner__icon">📅</span>
          <span class="snapshot-banner__text">Datos del <strong>${formatted}</strong> — sin conexión a Jira en vivo</span>
          <button class="snapshot-banner__btn">Reconectar</button>
        `;
      } else {
        banner.innerHTML = `
          <span class="snapshot-banner__icon">⚠️</span>
          <span class="snapshot-banner__text">Sin conexión a Jira. Conectate para ver datos en tiempo real.</span>
          <button class="snapshot-banner__btn">Conectar</button>
        `;
      }
      if (_onConnectRef) {
        banner.querySelector('.snapshot-banner__btn').addEventListener('click', _onConnectRef);
      }
      headerContainer.appendChild(banner);
    }
  }
}

/**
 * Puts the connect button in a "connecting…" pending state.
 * Disables the button to prevent double-clicks.
 */
export function setConnectingState() {
  if (!connectBtn) return;
  connectBtn.disabled = true;
  connectBtn.textContent = 'Conectando…';
  connectBtn.classList.add('header-connect-btn--connecting');
  if (ledIndicator) ledIndicator.className = 'led led--connecting';
  if (ledLabel) ledLabel.textContent = 'Conectando…';
}

/**
 * Resets the connect button back to idle (not connected).
 * Call this if the connection attempt is cancelled or fails.
 */
export function resetConnectingState() {
  updateConnectionStatus(false);
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
