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
import { renderHeader, updateConnectionStatus, showOfflineBanner, hideOfflineBanner, showConnectionLostBanner, hideConnectionLostBanner, updateAlertCount } from './presentation/header.js';
import { renderFilters } from './presentation/filters-view.js';
import { renderKPIPanel, updateKPIPanel } from './presentation/kpi-panel.js';
import { renderMatrixView, updateMatrixView } from './presentation/matrix-view.js';
import { renderRegionView } from './presentation/region-view.js';
import { renderAlertsView } from './presentation/alerts-view.js';
import { renderDetailView } from './presentation/detail-view.js';
import { initRouter, onRouteChange, getCurrentRoute } from './presentation/router.js';
import { login, logout, checkAuth, fetchRawIssues, onConnectionChange } from './data/api-client.js';
import { isAuthenticated, getCurrentUser as getDCUser } from './data/dc-api-client.js';
import { clearToken } from './business/auth-logic.js';
import { renderLoginView } from './presentation/dc/login-view.js';
import { renderCompanyListView } from './presentation/dc/company-list-view.js';
import { renderSheetTabsView } from './presentation/dc/sheet-tabs-view.js';
import { renderInventorySheet } from './presentation/dc/inventory-sheet.js';
import { renderQAMgmtSheet } from './presentation/dc/qa-mgmt-sheet.js';
import { renderQASimpleSheet } from './presentation/dc/qa-simple-sheet.js';
import { getSheetPattern, SHEET_TABS } from './business/sheet-logic.js';
import { renderAdminView } from './presentation/dc/admin-view.js';

/* ------------------------------------------------------------------ */
/*  Application state                                                  */
/* ------------------------------------------------------------------ */

/** @type {object} Current DashboardModel */
let model = null;

/** @type {object} Current filter state */
let currentFilters = { severity: null, year: null, region: null, status: null };

/** @type {boolean} Whether we are connected to Jira */
let isLive = false;

/** @type {number|null} Auth polling interval ID */
let authPollInterval = null;

/* ------------------------------------------------------------------ */
/*  Dark mode                                                          */
/* ------------------------------------------------------------------ */

function detectDarkModePreference() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  if (prefersDark.matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
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

  const links = [
    { hash: '#/', label: 'Matriz' },
    { hash: '#/region', label: 'Región' },
    { hash: '#/alerts', label: 'Alertas' },
    { hash: '#/data-collection', label: 'Recolección de Datos' },
  ];

  const ul = document.createElement('ul');
  ul.className = 'nav-list';

  for (const link of links) {
    const li = document.createElement('li');
    li.className = 'nav-item';

    const a = document.createElement('a');
    a.href = link.hash;
    a.className = 'nav-link';
    a.textContent = link.label;

    const currentRoute = getCurrentRoute();
    if (
      (link.hash === '#/' && currentRoute.name === 'matrix') ||
      (link.hash === '#/region' && currentRoute.name === 'region') ||
      (link.hash === '#/alerts' && currentRoute.name === 'alerts') ||
      (link.hash === '#/data-collection' && currentRoute.name.startsWith('dc-'))
    ) {
      a.classList.add('nav-link--active');
      a.setAttribute('aria-current', 'page');
    }

    li.appendChild(a);
    ul.appendChild(li);
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

  // Auth guard for data-collection routes (except login)
  if (route.name.startsWith('dc-') && route.name !== 'dc-login') {
    if (!isAuthenticated()) {
      window.location.hash = '#/data-collection/login';
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
      renderLoginView(main);
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

  // Filters container
  const filtersContainer = document.createElement('div');
  filtersContainer.className = 'filters-container';
  filtersContainer.id = 'filters-container';
  main.appendChild(filtersContainer);

  // KPI panel container
  const kpiContainer = document.createElement('div');
  kpiContainer.className = 'kpi-container';
  kpiContainer.id = 'kpi-container';
  main.appendChild(kpiContainer);

  // Matrix container
  const matrixContainer = document.createElement('div');
  matrixContainer.className = 'matrix-container';
  matrixContainer.id = 'matrix-container';
  main.appendChild(matrixContainer);

  const filteredModel = applyFilters(model, currentFilters);

  renderFilters(filtersContainer, model, onFilterChange);
  renderKPIPanel(kpiContainer, filteredModel);
  renderMatrixView(matrixContainer, filteredModel);
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

  const kpiContainer = document.getElementById('kpi-container');
  const matrixContainer = document.getElementById('matrix-container');

  const filteredModel = applyFilters(model, currentFilters);

  if (kpiContainer) {
    updateKPIPanel(filteredModel);
  }
  if (matrixContainer) {
    updateMatrixView(filteredModel);
  }
}

/* ------------------------------------------------------------------ */
/*  Jira connection flow                                               */
/* ------------------------------------------------------------------ */

function onConnect() {
  login();

  // Poll for auth status every 2 seconds
  authPollInterval = setInterval(async () => {
    const result = await checkAuth();
    if (result.authenticated) {
      clearInterval(authPollInterval);
      authPollInterval = null;

      // Fetch live data
      const rawIssues = await fetchRawIssues();
      model = transformJiraData(rawIssues);
      model.metadata.mode = 'live';
      isLive = true;

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

document.addEventListener('DOMContentLoaded', () => {
  // Detect dark mode preference
  detectDarkModePreference();

  // Load offline data by default
  model = transformJiraData(OFFLINE_ISSUES);
  model.metadata.mode = 'offline';

  // Register connection change listener
  onConnectionChange(handleConnectionChange);

  // Listen for DC auth expiration — redirect to login when token expires
  window.addEventListener('dc:auth-expired', () => {
    clearToken();
    window.location.hash = '#/data-collection/login';
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
});
