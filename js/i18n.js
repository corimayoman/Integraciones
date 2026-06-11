/**
 * i18n — Internationalization module
 * Supports English (en) and Spanish (es).
 * Usage: import { t, setLang, getLang, onLangChange } from './i18n.js';
 */

const DICTIONARIES = {
  en: {
    /* --- Common --------------------------------------------------------- */
    'common.all':        'All',
    'common.loading':    'Loading…',
    'common.error':      'Error',
    'common.save':       'Save',
    'common.cancel':     'Cancel',
    'common.search':     'Search',
    'common.status':     'Status',
    'common.noResults':  'No results found.',

    /* --- App / Nav ------------------------------------------------------ */
    'app.title':                'AMS Integration & Compliance Tracker',
    'app.loading':              'Loading…',
    'app.footer':               '2025 Globant — AMS Integration & Compliance Tracker',
    'app.skip':                 'Skip to main content',
    'app.loadingAuth':          'Authenticating with Google…',
    'app.loadingDC':            'Verifying Data Collection module access…',
    'app.dcNoAccess':           'Your account does not have access to the Data Collection module. Contact your administrator.',
    'app.authError':            'Authentication error. Please try again.',
    'app.fetchingJira':         'Fetching data from Jira…',
    'app.refreshingJira':       'Refreshing data from Jira…',
    'app.companyNotFound':      'Company not found.',
    'app.unknownSheet':         'Unrecognised sheet: {sheetId}',

    'nav.matrix':               'Matrix',
    'nav.matrixTitle':          'Overview of all acquired companies and their integration track status',
    'nav.compliance':           'Compliance',
    'nav.complianceTitle':      'G4G compliance dashboard: SOX, Compliance and GIST',
    'nav.sox':                  'SOX Controls',
    'nav.soxTitle':             'SOX IT control execution status — real-time data from Jira',
    'nav.admin':                'Admin',
    'nav.adminTitle':           'User access management',
    'nav.dc':                   'Data Collection',
    'nav.dcTitle':              'Data entry and tracking module by company',
    'nav.backToDashboard':      '← Back to Dashboard',
    'nav.exitDC':               'Exit Data Collection module',

    /* --- Header --------------------------------------------------------- */
    'header.live':              'Live',
    'header.offline':           'Offline',
    'header.connecting':        'Connecting…',
    'header.connect':           'Connect Jira',
    'header.connectLabel':      'Connect to Jira',
    'header.disconnect':        'Disconnect',
    'header.disconnectLabel':   'Disconnect from Jira',
    'header.refresh':           'Refresh data from Jira',
    'header.darkMode':          'Toggle dark mode',
    'header.signOut':           'Sign out',
    'header.headerActions':     'Header actions',
    'header.alerts':            '{count} active alerts',
    'header.snapshotData':      'Data from {date} — not connected to live Jira',
    'header.noConnection':      'No Jira connection. Connect to see real-time data.',
    'header.reconnect':         'Reconnect',
    'header.langToggle':        'Cambiar a Español',

    /* --- Matrix --------------------------------------------------------- */
    'matrix.title':             'Integration Matrix',
    'matrix.noResults':         'No companies to show with the current filters.',
    'matrix.legend':            'Color legend',
    'matrix.statusLabel':       'Status:',
    'matrix.completed':         'Completed',
    'matrix.inProgress':        'In Progress',
    'matrix.notStarted':        'Not Started',
    'matrix.blocked':           'Blocked',
    'matrix.rejected':          'Rejected',
    'matrix.noTrack':           'No track',
    'matrix.severity':          'Severity (border):',
    'matrix.company':           'Company',
    'matrix.stalled':           'Stalled',
    'matrix.tabEmpresas':       'Status by Company',
    'matrix.tabYears':          'Year Summary',
    'matrix.tabSeverity':       'Completeness by Severity',
    'matrix.integrationDone':   'Integration completed',
    'matrix.integrationProg':   'Integration in progress',
    'matrix.integrationNone':   'Integration not started',
    'matrix.integrationStalled':'Integration stalled — no recent activity',

    /* --- Compliance ----------------------------------------------------- */
    'compliance.title':         'G4G Compliance Dashboard',
    'compliance.noData':        'No compliance data yet',
    'compliance.connectPrompt': 'Connect to Jira and click Refresh to load compliance data.',
    'compliance.open':          'Open',
    'compliance.blocked':       'Blocked',
    'compliance.closed':        'Closed',
    'compliance.completed':     '{done}/{total} completed',
    'compliance.overdue':       '{n} overdue',
    'compliance.noOverdue':     'No overdue',
    'compliance.prev':          '← Prev',
    'compliance.next':          'Next →',
    'compliance.pager':         '{from}–{to} of {total}',
    'compliance.colId':         'ID',
    'compliance.colTitle':      'Title',
    'compliance.colAssignedTo': 'Assigned To',
    'compliance.colCreated':    'Created',
    'compliance.colAging':      'Aging (days)',
    'compliance.colDueDate':    'Due Date',
    'compliance.colStatus':     'Status',
    'compliance.colPriority':   'Priority',
    'compliance.showTasks':     'Show tasks ({n})',
    'compliance.vulns':         'Critical and High vulnerabilities · {total} total',
    'compliance.overdueDate':   'Overdue — due {date}',
    'compliance.closedDate':    'Closed — due {date}',
    'compliance.onTrackDate':   'On track — due {date}',

    /* --- SOX Controls --------------------------------------------------- */
    'sox.title':                'SOX Controls',
    'sox.subtitle':             'Execution status by control and month — current year',
    'sox.loading':              'Loading data from Jira…',
    'sox.notConnected':         'Not connected to Jira. Use the Connect button in the header to authenticate.',
    'sox.error':                'Error loading SOX data: {msg}',
    'sox.statusLabel':          'Status:',
    'sox.ok':                   '✓ OK',
    'sox.failed':               '✕ Failed',
    'sox.alert':                '⚠ Alert',
    'sox.pending':              'Pending',
    'sox.onTime':               'On Time',
    'sox.delayed':              '⏱ Delayed',
    'sox.na':                   'N/A',
    'sox.trend':                'Control Execution Trend',
    'sox.filterApp':            'Application',
    'sox.filterType':           'Type',
    'sox.filterFreq':           'Frequency',
    'sox.filterMonth':          'Month',
    'sox.filterSearch':         'Search',
    'sox.filterSearchPlaceholder': 'ID or owner…',
    'sox.totalControls':        'Total Controls',
    'sox.inScope':              'in scope',
    'sox.noResults':            'No controls match the selected filters.',
    'sox.colId':                'Control ID',
    'sox.colApp':               'App',
    'sox.colType':              'Type',
    'sox.colFreq':              'Frequency',
    'sox.colOwner':             'Owner',
    'sox.openInJira':           'Open in Jira',
    'sox.failedIssues':         '{failed} failed · {issues} with issues',
    'sox.withIssues':           'controls with issues',
    'sox.okCount':              '{ok} of {total} passed',
    'sox.pendingCount':         '{pending} pending / on time',
    'sox.onTimeCount':          'on time',

    /* --- Alerts --------------------------------------------------------- */
    'alerts.title':             'Alerts — Delayed Tracks',
    'alerts.noAlerts':          'No active alerts. All critical tracks are on track.',

    /* --- Filters -------------------------------------------------------- */
    'filters.label':            'Matrix filters',
    'filters.severity':         'Severity',
    'filters.year':             'Year',
    'filters.region':           'Region',
    'filters.trackStatus':      'Track status',
    'filters.companyStatus':    'Company status',
    'filters.selected':         '{n} selected',
    'filters.all':              'All',

    /* --- Admin ---------------------------------------------------------- */
    'admin.title':              'User Access Management',
    'admin.description':        'Manage who can access the AMS Integration Tracker. Only @globant.com accounts are permitted.',
    'admin.addUser':            'Add User',
    'admin.placeholder':        'user@globant.com',
    'admin.viewer':             'Viewer',
    'admin.adminRole':          'Admin',
    'admin.add':                'Add',
    'admin.allowedUsers':       'Allowed Users',
    'admin.onlyGlobant':        'Only @globant.com accounts are allowed.',
    'admin.saving':             'Saving…',
    'admin.added':              '{email} added as {role}.',
    'admin.error':              'Error: {msg}',
    'admin.loading':            'Loading…',
    'admin.failedLoad':         'Failed to load users: {msg}',
    'admin.colEmail':           'Email',
    'admin.colRole':            'Role',
    'admin.colStatus':          'Status',
    'admin.colAdded':           'Added',
    'admin.colActions':         'Actions',
    'admin.active':             'Active',
    'admin.inactive':           'Inactive',
    'admin.deactivate':         'Deactivate',
    'admin.activate':           'Activate',
    'admin.delete':             'Delete',
    'admin.confirmDelete':      'Remove {email} from allowed users?',

    /* --- Auth / Login --------------------------------------------------- */
    'auth.subtitle':            'Sign in with your Globant account',
    'auth.continueGoogle':      'Continue with Google',
    'auth.onlyGlobant':         'Only @globant.com accounts',
    'auth.accessDenied':        '<strong>Access Denied.</strong> Your account is not authorized to access this application. Contact your administrator.',
    'auth.signingIn':           'Signing in…',
    'auth.error':               'Sign-in error. Please try again.',

    /* --- Data Collection ------------------------------------------------ */
    'dc.companies':             'Companies',
    'dc.adminPanel':            'Admin Panel',
    'dc.adminPanelTitle':       'Go to admin panel',
    'dc.errorLoad':             'Error loading companies.',
    'dc.noCompanies':           'No companies assigned.',
    'dc.connectionError':       'Connection error loading companies.',
    'dc.sheetTabs':             'Sheet tabs',
    'dc.sheetContent':          'Sheet content',
  },

  es: {
    /* --- Common --------------------------------------------------------- */
    'common.all':        'Todas',
    'common.loading':    'Cargando…',
    'common.error':      'Error',
    'common.save':       'Guardar',
    'common.cancel':     'Cancelar',
    'common.search':     'Buscar',
    'common.status':     'Estado',
    'common.noResults':  'Sin resultados.',

    /* --- App / Nav ------------------------------------------------------ */
    'app.title':                'AMS Integration & Compliance Tracker',
    'app.loading':              'Cargando…',
    'app.footer':               '2025 Globant — AMS Integration & Compliance Tracker',
    'app.skip':                 'Saltar al contenido principal',
    'app.loadingAuth':          'Autenticando con Google…',
    'app.loadingDC':            'Verificando acceso al módulo DC…',
    'app.dcNoAccess':           'Tu cuenta no tiene acceso al módulo de Recolección de Datos. Contactá a tu administrador.',
    'app.authError':            'Error al autenticar. Intentá nuevamente.',
    'app.fetchingJira':         'Obteniendo datos de Jira…',
    'app.refreshingJira':       'Actualizando datos desde Jira…',
    'app.companyNotFound':      'Empresa no encontrada.',
    'app.unknownSheet':         'Hoja no reconocida: {sheetId}',

    'nav.matrix':               'Matriz',
    'nav.matrixTitle':          'Vista general de todas las empresas adquiridas con el estado de sus tracks de integración',
    'nav.compliance':           'Compliance',
    'nav.complianceTitle':      'Dashboard de cumplimiento G4G: SOX, Compliance y GIST',
    'nav.sox':                  'Controles SOX',
    'nav.soxTitle':             'Estado de ejecución de controles SOX IT — datos en tiempo real desde Jira',
    'nav.admin':                'Admin',
    'nav.adminTitle':           'Gestión de accesos de usuarios',
    'nav.dc':                   'Recolección de Datos',
    'nav.dcTitle':              'Módulo de carga y seguimiento de datos de integración por empresa',
    'nav.backToDashboard':      '← Volver al Dashboard',
    'nav.exitDC':               'Salir del módulo de Recolección de Datos',

    /* --- Header --------------------------------------------------------- */
    'header.live':              'En vivo',
    'header.offline':           'Sin conexión',
    'header.connecting':        'Conectando…',
    'header.connect':           'Conectar Jira',
    'header.connectLabel':      'Conectar con Jira',
    'header.disconnect':        'Desconectar',
    'header.disconnectLabel':   'Desconectar de Jira',
    'header.refresh':           'Actualizar datos desde Jira',
    'header.darkMode':          'Alternar modo oscuro',
    'header.signOut':           'Cerrar sesión',
    'header.headerActions':     'Acciones del header',
    'header.alerts':            '{count} alertas activas',
    'header.snapshotData':      'Datos del {date} — sin conexión a Jira en vivo',
    'header.noConnection':      'Sin conexión a Jira. Conectate para ver datos en tiempo real.',
    'header.reconnect':         'Reconectar',
    'header.langToggle':        'Switch to English',

    /* --- Matrix --------------------------------------------------------- */
    'matrix.title':             'Matriz de Integración',
    'matrix.noResults':         'No hay empresas para mostrar con los filtros actuales.',
    'matrix.legend':            'Referencias de color',
    'matrix.statusLabel':       'Estado:',
    'matrix.completed':         'Completado',
    'matrix.inProgress':        'En Progreso',
    'matrix.notStarted':        'No Iniciado',
    'matrix.blocked':           'Bloqueado',
    'matrix.rejected':          'Rechazado',
    'matrix.noTrack':           'Sin track',
    'matrix.severity':          'Severidad (borde):',
    'matrix.company':           'Empresa',
    'matrix.stalled':           'Estancado',
    'matrix.tabEmpresas':       'Estado por Empresa',
    'matrix.tabYears':          'Resumen por Año',
    'matrix.tabSeverity':       'Completitud por Severidad',
    'matrix.integrationDone':   'Integración completada',
    'matrix.integrationProg':   'Integración en progreso',
    'matrix.integrationNone':   'Integración no iniciada',
    'matrix.integrationStalled':'Integración estancada — sin actividad reciente',

    /* --- Compliance ----------------------------------------------------- */
    'compliance.title':         'G4G Compliance Dashboard',
    'compliance.noData':        'Sin datos de compliance',
    'compliance.connectPrompt': 'Conectate a Jira y hacé clic en Actualizar para cargar los datos.',
    'compliance.open':          'Abierto',
    'compliance.blocked':       'Bloqueado',
    'compliance.closed':        'Cerrado',
    'compliance.completed':     '{done}/{total} completados',
    'compliance.overdue':       '{n} vencidos',
    'compliance.noOverdue':     'Sin vencidos',
    'compliance.prev':          '← Ant',
    'compliance.next':          'Sig →',
    'compliance.pager':         '{from}–{to} de {total}',
    'compliance.colId':         'ID',
    'compliance.colTitle':      'Título',
    'compliance.colAssignedTo': 'Asignado A',
    'compliance.colCreated':    'Creado',
    'compliance.colAging':      'Antigüedad (días)',
    'compliance.colDueDate':    'Fecha Límite',
    'compliance.colStatus':     'Estado',
    'compliance.colPriority':   'Prioridad',
    'compliance.showTasks':     'Ver tareas ({n})',
    'compliance.vulns':         'Vulnerabilidades críticas y altas · {total} total',
    'compliance.overdueDate':   'Vencido — límite {date}',
    'compliance.closedDate':    'Cerrado — límite {date}',
    'compliance.onTrackDate':   'En plazo — límite {date}',

    /* --- SOX Controls --------------------------------------------------- */
    'sox.title':                'Controles SOX',
    'sox.subtitle':             'Estado de ejecución por control y mes — año actual',
    'sox.loading':              'Cargando datos desde Jira…',
    'sox.notConnected':         'Sin conexión a Jira. Usá el botón Conectar en el encabezado para autenticarte.',
    'sox.error':                'Error al cargar datos SOX: {msg}',
    'sox.statusLabel':          'Estado:',
    'sox.ok':                   '✓ OK',
    'sox.failed':               '✕ Fallido',
    'sox.alert':                '⚠ Alerta',
    'sox.pending':              'Pendiente',
    'sox.onTime':               'A Tiempo',
    'sox.delayed':              '⏱ Demorado',
    'sox.na':                   'N/A',
    'sox.trend':                'Tendencia de Ejecución de Controles',
    'sox.filterApp':            'Aplicación',
    'sox.filterType':           'Tipo',
    'sox.filterFreq':           'Frecuencia',
    'sox.filterMonth':          'Mes',
    'sox.filterSearch':         'Buscar',
    'sox.filterSearchPlaceholder': 'ID o responsable…',
    'sox.totalControls':        'Total Controles',
    'sox.inScope':              'en alcance',
    'sox.noResults':            'Ningún control coincide con los filtros seleccionados.',
    'sox.colId':                'ID Control',
    'sox.colApp':               'App',
    'sox.colType':              'Tipo',
    'sox.colFreq':              'Frecuencia',
    'sox.colOwner':             'Responsable',
    'sox.openInJira':           'Abrir en Jira',
    'sox.failedIssues':         '{failed} fallidos · {issues} con alertas',
    'sox.withIssues':           'controles con problemas',
    'sox.okCount':              '{ok} de {total} aprobados',
    'sox.pendingCount':         '{pending} pendientes / a tiempo',
    'sox.onTimeCount':          'a tiempo',

    /* --- Alerts --------------------------------------------------------- */
    'alerts.title':             'Alertas — Tracks Demorados',
    'alerts.noAlerts':          'No hay alertas activas. Todos los tracks críticos están en orden.',

    /* --- Filters -------------------------------------------------------- */
    'filters.label':            'Filtros de la matriz',
    'filters.severity':         'Severidad',
    'filters.year':             'Año',
    'filters.region':           'Región',
    'filters.trackStatus':      'Estado track',
    'filters.companyStatus':    'Estado empresa',
    'filters.selected':         '{n} seleccionados',
    'filters.all':              'Todas',

    /* --- Admin ---------------------------------------------------------- */
    'admin.title':              'Gestión de Accesos',
    'admin.description':        'Gestioná quién puede acceder al AMS Integration Tracker. Solo cuentas @globant.com.',
    'admin.addUser':            'Agregar Usuario',
    'admin.placeholder':        'usuario@globant.com',
    'admin.viewer':             'Lector',
    'admin.adminRole':          'Admin',
    'admin.add':                'Agregar',
    'admin.allowedUsers':       'Usuarios Permitidos',
    'admin.onlyGlobant':        'Solo se permiten cuentas @globant.com.',
    'admin.saving':             'Guardando…',
    'admin.added':              '{email} agregado como {role}.',
    'admin.error':              'Error: {msg}',
    'admin.loading':            'Cargando…',
    'admin.failedLoad':         'Error al cargar usuarios: {msg}',
    'admin.colEmail':           'Email',
    'admin.colRole':            'Rol',
    'admin.colStatus':          'Estado',
    'admin.colAdded':           'Agregado',
    'admin.colActions':         'Acciones',
    'admin.active':             'Activo',
    'admin.inactive':           'Inactivo',
    'admin.deactivate':         'Desactivar',
    'admin.activate':           'Activar',
    'admin.delete':             'Eliminar',
    'admin.confirmDelete':      '¿Eliminar a {email} de los usuarios permitidos?',

    /* --- Auth / Login --------------------------------------------------- */
    'auth.subtitle':            'Iniciá sesión con tu cuenta de Globant',
    'auth.continueGoogle':      'Continuar con Google',
    'auth.onlyGlobant':         'Solo cuentas @globant.com',
    'auth.accessDenied':        '<strong>Acceso Denegado.</strong> Tu cuenta no está autorizada para acceder a esta aplicación. Contactá a tu administrador.',
    'auth.signingIn':           'Iniciando sesión…',
    'auth.error':               'Error al iniciar sesión. Intentá nuevamente.',

    /* --- Data Collection ------------------------------------------------ */
    'dc.companies':             'Empresas',
    'dc.adminPanel':            'Panel de Admin',
    'dc.adminPanelTitle':       'Ir al panel de administración',
    'dc.errorLoad':             'Error al cargar empresas.',
    'dc.noCompanies':           'No hay empresas asignadas.',
    'dc.connectionError':       'Error de conexión al cargar empresas.',
    'dc.sheetTabs':             'Pestañas de hojas',
    'dc.sheetContent':          'Contenido de hoja',
  },
};

/* ------------------------------------------------------------------ */
/*  Core                                                               */
/* ------------------------------------------------------------------ */

let currentLang = localStorage.getItem('lang') || 'es';

/**
 * Translate a key, optionally interpolating {var} placeholders.
 * Falls back to the key itself if not found.
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @returns {string}
 */
export function t(key, vars = {}) {
  const dict = DICTIONARIES[currentLang] || DICTIONARIES.es;
  let str = dict[key] ?? DICTIONARIES.es[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}

/**
 * Get the current language code.
 * @returns {'en'|'es'}
 */
export function getLang() {
  return currentLang;
}

/**
 * Set the language and notify listeners.
 * @param {'en'|'es'} lang
 */
export function setLang(lang) {
  if (lang === currentLang) return;
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.setAttribute('lang', lang);
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

/**
 * Register a callback for language changes.
 * @param {(lang: string) => void} cb
 */
export function onLangChange(cb) {
  window.addEventListener('langchange', (e) => cb(e.detail.lang));
}

// Set initial lang attribute on HTML element
document.documentElement.setAttribute('lang', currentLang);
