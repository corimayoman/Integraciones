/**
 * App Bootstrap — I4G Integration Tracker
 *
 * Orchestrates initialization, routing, data loading, Jira connection,
 * filter handling, dark mode, and connection state management.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.6, 17.8, 18.1, 18.5
 *
 * @module app
 */

import { OFFLINE_ISSUES } from './data/offline-data.js';
import { transformJiraData } from './business/transformer.js';
import { applyFilters } from './business/filters.js';
import { detectDelayedTracks } from './business/alerts.js';
import { renderHeader, updateConnectionStatus, showOfflineBanner, hideOfflineBanner, showConnectionLostBanner, hideConnectionLostBanner, updateAlertCount, setConnectingState, resetConnectingState } from './presentation/header.js';
import { renderFilters } from './presentation/filters-view.js';
import { renderKPIPanel, updateKPIPanel, renderYearSummaryPanel, renderSeverityChartPanel } from './presentation/kpi-panel.js';
import { renderMatrixView, updateMatrixView } from './presentation/matrix-view.js';
import { renderRegionView } from './presentation/region-view.js';
import { renderAlertsView } from './presentation/alerts-view.js';
import { renderDetailView } from './presentation/detail-view.js';
import { initRouter, onRouteChange, getCurrentRoute, navigate } from './presentation/router.js';
import { login, logout, checkAuth, fetchRawIssues, onConnectionChange } from './data/api-client.js';
import { isAuthenticated, getCurrentUser as getDCUser, loginWithGoogle } from './data/dc-api-client.js';
import { clearToken } from './business/auth-logic.js';
import { renderCompanyListView } from './presentation/dc/company-list-view.js';
import { renderSheetTabsView } from './presentation/dc/sheet-tabs-view.js';
import { renderInventorySheet } from './presentation/dc/inventory-sheet.js';
import { renderQAMgmtSheet } from './presentation/dc/qa-mgmt-sheet.js';
import { renderQASimpleSheet } from './presentation/dc/qa-simple-sheet.js';
import { getSheetPattern, SHEET_TABS } from './business/sheet-logic.js';
import { renderAdminView } from './presentation/dc/admin-view.js';
import { waitForAuthState, signOutGoogle, getGoogleUser, getFirebaseIdToken } from './firebase-auth.js';

/* ------------------------------------------------------------------ */
/*  Application state                                                  */
/* ------------------------------------------------------------------ */

/** @type {object} Current DashboardModel */
let model = null;

/** @type {object} Current filter state */
let currentFilters = { severity: null, year: null, region: null, status: null };

/** @type {string} Active sub-tab in the matrix route */
let activeMatrixSubTab = 'empresas';

/** @type {boolean} Whether we are connected to Jira */
let isLive = false;

/** @type {number|null} Auth polling interval ID */
let authPollInterval = null;

/* ------------------------------------------------------------------ */
/*  Dark mode                                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Loading overlay                                                    */
/* ------------------------------------------------------------------ */

function showLoadingOverlay(message = 'Cargando…') {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div class="loading-overlay__card">
      <div class="loading-overlay__spinner"></div>
      <p class="loading-overlay__message">${message}</p>
    </div>
  `;
  overlay.hidden = false;
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.hidden = true;
}

/* ------------------------------------------------------------------ */
/*  DC Module auth via Google SSO                                      */
/* ------------------------------------------------------------------ */

/**
 * Handle "Módulo DC" button click: sign in with Google (if needed),
 * exchange Firebase ID token for a DC session token, then navigate to DC home.
 */
async function handleDCLogin() {
  try {
    showLoadingOverlay('Autenticando con Google…');
    const idToken = await getFirebaseIdToken();

    showLoadingOverlay('Verificando acceso al módulo DC…');
    const result = await loginWithGoogle(idToken);
    hideLoadingOverlay();

    if (result.ok) {
      renderNav();
      const { user } = result;
      if (user.role === 'admin') {
        navigate('#/data-collection');
      } else if (user.companyId) {
        navigate(`#/data-collection/${user.companyId}`);
      } else {
        navigate('#/data-collection');
      }
    } else {
      showDCAccessError(result.error || 'Tu cuenta no tiene acceso al módulo de Recolección de Datos. Contactá a tu administrador.');
    }
  } catch (err) {
    hideLoadingOverlay();
    // Ignore user-cancelled popup
    if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') return;
    showDCAccessError(err.message || 'Error al autenticar. Intentá nuevamente.');
  }
}

/**
 * Show a temporary error banner at the top of the page.
 * @param {string} message
 */
function showDCAccessError(message) {
  let toast = document.getElementById('dc-access-error');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'dc-access-error';
    toast.className = 'dc-access-error';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, 6000);
}

/* ------------------------------------------------------------------ */
/*  Dark mode                                                          */
/* ------------------------------------------------------------------ */

function detectDarkModePreference() {
  // Default: modo claro. El toggle permite cambiarlo manualmente.
  document.documentElement.setAttribute('data-theme', 'light');
}

function toggleDarkMode() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
}

/* ------------------------------------------------------------------ */
/*  Navigation tabs                                                    */
/* ------------------------------------------------------------------ */

function renderNav() {
  const nav = document.getElementById('app-nav');
  if (!nav) return;
  nav.textContent = '';

  const dcMode = isAuthenticated(); // usuario logueado en el módulo DC
  const currentRoute = getCurrentRoute();

  const ul = document.createElement('ul');
  ul.className = 'nav-list';

  if (dcMode) {
    // Modo DC: solo Recolección de Datos + botón para volver al dashboard
    const dcLink = { hash: '#/data-collection', label: 'Recolección de Datos', title: 'Módulo de carga y seguimiento de datos de integración por empresa' };
    const li = document.createElement('li');
    li.className = 'nav-item';
    const a = document.createElement('a');
    a.href = dcLink.hash;
    a.className = 'nav-link';
    a.textContent = dcLink.label;
    a.title = dcLink.title;
    if (currentRoute.name.startsWith('dc-')) {
      a.classList.add('nav-link--active');
      a.setAttribute('aria-current', 'page');
    }
    li.appendChild(a);
    ul.appendChild(li);

    // Botón para salir del modo DC
    const exitLi = document.createElement('li');
    exitLi.className = 'nav-item nav-item--end';
    const exitBtn = document.createElement('button');
    exitBtn.type = 'button';
    exitBtn.className = 'nav-exit-dc-btn';
    exitBtn.textContent = '← Volver al Dashboard';
    exitBtn.title = 'Salir del módulo de Recolección de Datos';
    exitBtn.addEventListener('click', () => {
      clearToken();
      window.location.hash = '#/';
    });
    exitLi.appendChild(exitBtn);
    ul.appendChild(exitLi);

  } else {
    // Modo dashboard: Matriz + Alertas + botón para entrar al módulo DC
    const dashLinks = [
      { hash: '#/', label: 'Matriz', title: 'Vista general de todas las empresas adquiridas con el estado de sus tracks de integración' },
      { hash: '#/alerts', label: 'Alertas', title: 'Tracks críticos o de alta severidad con subtareas bloqueadas o rechazadas que requieren atención' },
    ];

    for (const link of dashLinks) {
      const li = document.createElement('li');
      li.className = 'nav-item';
      const a = document.createElement('a');
      a.href = link.hash;
      a.className = 'nav-link';
      a.textContent = link.label;
      a.title = link.title;
      if (
        (link.hash === '#/' && currentRoute.name === 'matrix') ||
        (link.hash === '#/alerts' && currentRoute.name === 'alerts')
      ) {
        a.classList.add('nav-link--active');
        a.setAttribute('aria-current', 'page');
      }
      li.appendChild(a);
      ul.appendChild(li);
    }

    // Botón para entrar al módulo DC
    const dcLi = document.createElement('li');
    dcLi.className = 'nav-item nav-item--end';
    const dcBtn = document.createElement('button');
    dcBtn.type = 'button';
    dcBtn.className = 'nav-dc-btn';
    dcBtn.textContent = 'Módulo DC';
    dcBtn.title = 'Acceder al módulo de Recolección de Datos (requiere cuenta Globant)';
    dcBtn.addEventListener('click', handleDCLogin);
    dcLi.appendChild(dcBtn);
    ul.appendChild(dcLi);
  }

  nav.appendChild(ul);
}

/* ------------------------------------------------------------------ */
/*  View rendering                                                     */
/* ------------------------------------------------------------------ */

function renderCurrentView(route) {
  const main = document.getElementById('main-content');
  if (!main) return;

  // Update nav active state
  renderNav();

  // Auth guard for data-collection routes
  if (route.name.startsWith('dc-')) {
    if (!isAuthenticated()) {
      window.location.hash = '#/';
      return;
    }
  }

  // Admin guard for dc-admin route
  if (route.name === 'dc-admin') {
    const dcUser = getDCUser();
    if (!dcUser || dcUser.role !== 'admin') {
      window.location.hash = '#/data-collection';
      return;
    }
  }

  switch (route.name) {
    case 'matrix':
      renderMatrixRoute(main);
      break;
    case 'region':
      renderRegionRoute(main);
      break;
    case 'alerts':
      renderAlertsRoute(main);
      break;
    case 'company-detail':
      renderDetailRoute(main, route.params.id);
      break;
    case 'dc-login':
      window.location.hash = '#/';
      break;
    case 'dc-home':
      renderCompanyListView(main);
      break;
    case 'dc-company':
      renderDCCompanyRoute(main, route.params.empresaId);
      break;
    case 'dc-sheet':
      renderDCSheetRoute(main, route.params.empresaId, route.params.hojaId);
      break;
    case 'dc-admin':
      renderDCAdminRoute(main);
      break;
    default:
      renderMatrixRoute(main);
  }
}

function renderMatrixRoute(main) {
  main.textContent = '';

  // Filters (shared, always visible)
  const filtersContainer = document.createElement('div');
  filtersContainer.className = 'filters-container';
  filtersContainer.id = 'filters-container';
  main.appendChild(filtersContainer);

  // KPI cards (compact, always visible)
  const kpiContainer = document.createElement('div');
  kpiContainer.className = 'kpi-container';
  kpiContainer.id = 'kpi-container';
  main.appendChild(kpiContainer);

  // Sub-tabs wrapper
  const subtabsWrapper = document.createElement('div');
  subtabsWrapper.className = 'matrix-subtabs';
  main.appendChild(subtabsWrapper);

  // Tab nav buttons
  const tabNav = document.createElement('div');
  tabNav.className = 'matrix-subtabs__nav';
  const tabDefs = [
    { id: 'empresas',  label: 'Estado por Empresa' },
    { id: 'years',     label: 'Resumen por Año' },
    { id: 'severity',  label: 'Completitud por Severidad' },
  ];
  for (const tab of tabDefs) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'matrix-subtab__btn' + (tab.id === activeMatrixSubTab ? ' matrix-subtab__btn--active' : '');
    btn.dataset.tab = tab.id;
    btn.textContent = tab.label;
    btn.addEventListener('click', () => {
      activeMatrixSubTab = tab.id;
      tabNav.querySelectorAll('.matrix-subtab__btn').forEach((b) => {
        b.classList.toggle('matrix-subtab__btn--active', b.dataset.tab === tab.id);
      });
      subtabsWrapper.querySelectorAll('.matrix-subtab-panel').forEach((p) => {
        p.hidden = p.dataset.tab !== tab.id;
      });
    });
    tabNav.appendChild(btn);
  }
  subtabsWrapper.appendChild(tabNav);

  // Panel containers
  const panels = tabDefs.map(({ id }) => {
    const panel = document.createElement('div');
    panel.className = 'matrix-subtab-panel';
    panel.dataset.tab = id;
    panel.id = `subtab-${id}`;
    panel.hidden = id !== activeMatrixSubTab;
    subtabsWrapper.appendChild(panel);
    return panel;
  });
  const [empresasPanel, yearsPanel, severityPanel] = panels;

  const filteredModel = applyFilters(model, currentFilters);

  renderFilters(filtersContainer, model, onFilterChange);
  renderKPIPanel(kpiContainer, filteredModel);
  renderMatrixView(empresasPanel, filteredModel);
  renderYearSummaryPanel(yearsPanel, filteredModel);
  renderSeverityChartPanel(severityPanel, filteredModel);
}

function renderRegionRoute(main) {
  main.textContent = '';
  const filteredModel = applyFilters(model, currentFilters);
  renderRegionView(main, filteredModel);
}

function renderAlertsRoute(main) {
  main.textContent = '';
  const filteredModel = applyFilters(model, currentFilters);
  renderAlertsView(main, filteredModel);
}

function renderDetailRoute(main, companyId) {
  main.textContent = '';
  const company = model.companies.find((c) => c.id === companyId);
  if (company) {
    renderDetailView(main, company);
  } else {
    const msg = document.createElement('p');
    msg.className = 'empty-state__message';
    msg.textContent = 'Empresa no encontrada.';
    main.appendChild(msg);
  }
}

/* ------------------------------------------------------------------ */
/*  Data Collection route stubs (wired in later tasks)                 */
/* ------------------------------------------------------------------ */

function renderDCCompanyRoute(main, empresaId) {
  main.textContent = '';
  // Default to first sheet tab
  const defaultSheet = SHEET_TABS[0].id;
  const content = renderSheetTabsView(main, empresaId, defaultSheet);
  renderSheetByPattern(content, empresaId, defaultSheet);
}

function renderDCSheetRoute(main, empresaId, hojaId) {
  main.textContent = '';
  const content = renderSheetTabsView(main, empresaId, hojaId);
  renderSheetByPattern(content, empresaId, hojaId);
}

/**
 * Render the appropriate sheet pattern view based on the sheet ID.
 */
function renderSheetByPattern(container, empresaId, sheetId) {
  const pattern = getSheetPattern(sheetId);
  switch (pattern) {
    case 'inventory':
      renderInventorySheet(container, empresaId, sheetId);
      break;
    case 'qa-management':
      renderQAMgmtSheet(container, empresaId, sheetId);
      break;
    case 'qa-simple':
      renderQASimpleSheet(container, empresaId, sheetId);
      break;
    default: {
      const msg = document.createElement('p');
      msg.className = 'empty-state__message';
      msg.textContent = `Hoja no reconocida: ${sheetId}`;
      container.appendChild(msg);
    }
  }
}

function renderDCAdminRoute(main) {
  main.textContent = '';
  renderAdminView(main);
}

/* ------------------------------------------------------------------ */
/*  Filter handling                                                    */
/* ------------------------------------------------------------------ */

function onFilterChange(filters) {
  currentFilters = { ...filters };
  const filteredModel = applyFilters(model, currentFilters);

  updateKPIPanel(filteredModel);
  updateMatrixView(filteredModel);

  const yearsPanel = document.getElementById('subtab-years');
  if (yearsPanel) renderYearSummaryPanel(yearsPanel, filteredModel);

  const severityPanel = document.getElementById('subtab-severity');
  if (severityPanel) renderSeverityChartPanel(severityPanel, filteredModel);
}

/* ------------------------------------------------------------------ */
/*  Jira connection flow                                               */
/* ------------------------------------------------------------------ */

function onConnect() {
  // Prevent double-click: deshabilita el botón y muestra estado "conectando"
  setConnectingState();

  login();

  // Timeout: si en 3 minutos no hubo respuesta, resetear
  const timeoutId = setTimeout(() => {
    if (authPollInterval) {
      clearInterval(authPollInterval);
      authPollInterval = null;
    }
    resetConnectingState();
  }, 3 * 60 * 1000);

  // Poll for auth status every 2 seconds
  authPollInterval = setInterval(async () => {
    const result = await checkAuth();
    if (result.authenticated) {
      clearInterval(authPollInterval);
      authPollInterval = null;
      clearTimeout(timeoutId);

      // Mostrar spinner de carga en el contenido principal
      showLoadingOverlay('Trayendo datos desde Jira…');

      // Fetch live data
      const rawIssues = await fetchRawIssues();
      model = transformJiraData(rawIssues);
      model.metadata.mode = 'live';
      isLive = true;

      hideLoadingOverlay();

      // Re-render header and current view
      renderAppHeader();
      renderCurrentView(getCurrentRoute());
    }
  }, 2000);
}

function onDisconnect() {
  // Stop any pending auth polling
  if (authPollInterval) {
    clearInterval(authPollInterval);
    authPollInterval = null;
  }

  logout();

  // Reload offline data
  model = transformJiraData(OFFLINE_ISSUES);
  model.metadata.mode = 'offline';
  isLive = false;
  currentFilters = { severity: null, year: null, region: null, status: null };

  // Re-render
  renderAppHeader();
  renderCurrentView(getCurrentRoute());
}

/* ------------------------------------------------------------------ */
/*  Header rendering                                                   */
/* ------------------------------------------------------------------ */

function renderAppHeader() {
  const headerEl = document.getElementById('app-header');
  if (!headerEl) return;

  const alerts = detectDelayedTracks(model);

  renderHeader(headerEl, {
    isLive,
    alertCount: alerts.length,
    onConnect,
    onDisconnect,
    onToggleDarkMode: toggleDarkMode,
    googleUser: getGoogleUser(),
    onSignOut: async () => {
      await signOutGoogle();
      clearToken(); // también limpia sesión DC si estaba activa
      window.location.hash = '#/';
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Connection change listener                                         */
/* ------------------------------------------------------------------ */

function handleConnectionChange(newIsLive) {
  isLive = newIsLive;

  if (newIsLive) {
    updateConnectionStatus(true);
    hideOfflineBanner();
    hideConnectionLostBanner();
  } else {
    updateConnectionStatus(false);
    showOfflineBanner();
    // If we were previously live, show connection lost
    if (model && model.metadata.mode === 'live') {
      showConnectionLostBanner();
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Initialization                                                     */
/* ------------------------------------------------------------------ */

function bootApp() {
  // Load offline data by default
  model = transformJiraData(OFFLINE_ISSUES);
  model.metadata.mode = 'offline';

  // Register connection change listener
  onConnectionChange(handleConnectionChange);

  // Listen for DC auth expiration — go back to dashboard
  window.addEventListener('dc:auth-expired', () => {
    clearToken();
    renderNav();
    window.location.hash = '#/';
  });

  // Render header
  renderAppHeader();

  // Render navigation
  renderNav();

  // Initialize router and handle route changes
  onRouteChange((route) => {
    renderCurrentView(route);
  });

  initRouter();
}

document.addEventListener('DOMContentLoaded', () => {
  // Modo claro por defecto
  detectDarkModePreference();

  // El dashboard es público — arrancar inmediatamente sin gate de auth
  bootApp();

  // Escuchar cambios de estado de Google para actualizar el chip de usuario en el header
  waitForAuthState((user) => {
    renderAppHeader();
    renderNav();
    // Si Google cierra sesión y había token DC activo, limpiarlo
    if (!user && isAuthenticated()) {
      clearToken();
    }
  });
});
