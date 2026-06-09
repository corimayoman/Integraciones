/**
 * Constants and shared data models — I4G Integration Tracker
 *
 * Defines integration tracks, status mappings, region mappings,
 * and circuit breaker configuration.
 *
 * @module constants
 */

/**
 * The 14 integration tracks with number, name, and severity.
 * Validates: Requirements 1.4, 8.3
 */
export const INTEGRATION_TRACKS = [
  { number: 1,  name: 'Kick Off Integration',                    severity: 'Low' },
  { number: 2,  name: 'Initial Package',                         severity: 'High' },
  { number: 3,  name: 'E-mail & Drives Migration',               severity: 'Critical' },
  { number: 4,  name: 'IT Experience Integration (Endpoints)',    severity: 'Critical' },
  { number: 5,  name: 'Application Integration',                 severity: 'High' },
  { number: 6,  name: 'Acquired Official Site',                  severity: 'Medium' },
  { number: 7,  name: 'Acquired URL Address',                    severity: 'Medium' },
  { number: 8,  name: 'Acquired Infra IT Offices',               severity: 'Critical' },
  { number: 9,  name: 'Acquired Infra IT DCs',                   severity: 'Critical' },
  { number: 10, name: 'Building Security',                       severity: 'Medium' },
  { number: 11, name: 'Communication Tools',                     severity: 'Medium' },
  { number: 12, name: 'Compliance',                              severity: 'High' },
  { number: 13, name: 'Closure Review & Validate Documentation', severity: 'Low' },
  { number: 14, name: 'Closure Assets Decommissioning',          severity: 'Low' },
];

/**
 * Mapping from Jira status names to simplified Dashboard statuses.
 * Unknown statuses should fall back to 'No Iniciado'.
 * Validates: Requirement 8.5
 */
export const STATUS_MAP = {
  // Open
  'Open':                 'No Iniciado',
  'Backlog':              'No Iniciado',
  'In Progress':          'En Progreso',
  'Analyzing':            'En Progreso',
  'Solution In Progress': 'En Progreso',
  'Reopened':             'En Progreso',
  // Blocked
  'Blocked':              'Bloqueado',
  // Closed (everything else is considered closed)
  'Closed':               'Completado',
  'Cancelled':            'Completado',
  'Done':                 'Completado',
  'Resolved':             'Completado',
  'Rejected':             'Completado',
  'Won\'t Fix':           'Completado',
  'Won\'t Do':            'Completado',
};

/**
 * Static mapping of acquired company name → region.
 * Based on known data from Jira Themes. Companies not in this map
 * default to 'Americas'.
 * Validates: Requirement 9.1
 */
export const REGION_MAP = {
  // Americas
  'Omni Pro':          'Americas',
  'Adbid':             'Americas',
  'Doit':              'Americas',
  'PointSource':       'Americas',
  'Ratio':             'Americas',
  'Vertic':            'EMEA & New Markets',
  'Walmeric':          'Americas',
  'Cloudshift':        'EMEA & New Markets',
  'Grupo ASSA':        'Americas',
  'Navint':            'Americas',
  'Atix':              'Americas',
  'GeneXus Consulting':'Americas',
  'Genexus':           'Americas',
  'Software Delivery': 'Americas',
  'Habitant':          'EMEA & New Markets',
  'Practia':           'Americas',
  'Everis':            'Americas',
  'Bluecap':           'EMEA & New Markets',
  'Gepagni':           'Americas',
  'Exusia':            'EMEA & New Markets',
  'Blankfactor':       'Americas',
  'GUT':               'Americas',
  'Nescara':           'Americas',
  'KTBO':              'Americas',
  'Iteris':            'Americas',
  'Chili':             'EMEA & New Markets',
  'Experience IT':     'Americas',
  // EMEA & New Markets
  'Genexus Europe':    'EMEA & New Markets',
  'Pentalog':          'EMEA & New Markets',
  'Pentalog EU':       'EMEA & New Markets',
  'Vertic EU':         'EMEA & New Markets',
  'Cloudshift EU':     'EMEA & New Markets',
  'MMS':               'EMEA & New Markets',
  'Startechup':        'EMEA & New Markets',
  'Omnia':             'EMEA & New Markets',
  'Common MS':         'EMEA & New Markets',
  'Codebay':           'EMEA & New Markets',
  'Sportian':          'EMEA & New Markets',
  'Sysdata':           'EMEA & New Markets',
  'eWave':             'EMEA & New Markets',
};

/** Default region when a company is not found in REGION_MAP */
export const DEFAULT_REGION = 'Americas';

/**
 * Circuit Breaker configuration.
 * Validates: Requirement 18.2
 */
export const CIRCUIT_BREAKER_CONFIG = {
  /** Number of consecutive failures before the circuit opens */
  failureThreshold: 5,
  /** Time in ms before attempting a probe request (half-open state) */
  resetTimeoutMs: 30_000,
};

/**
 * API Client retry configuration.
 */
export const RETRY_CONFIG = {
  maxAttempts: 3,
  /** Base delay in ms — actual delay = baseDelayMs * 2^(attempt-1) */
  baseDelayMs: 1000,
  /** Request timeout in ms */
  requestTimeoutMs: 10_000,
};

/**
 * Proxy base URL.
 */
export const PROXY_BASE_URL = '';

/**
 * All valid Jira statuses (for validation).
 */
export const JIRA_STATUSES = [
  'Closed', 'Open', 'In Progress', 'Reopened',
  'Blocked', 'Rejected', 'Analyzing', 'Solution In Progress', 'Backlog',
];

/**
 * All valid Dashboard statuses.
 */
export const DASHBOARD_STATUSES = [
  'Completado', 'En Progreso', 'No Iniciado', 'Bloqueado', 'Rechazado',
];

/**
 * Severity levels ordered by criticality (highest first).
 */
export const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];

/**
 * Region list.
 */
export const REGIONS = ['Americas', 'EMEA & New Markets'];

/**
 * Company overall integration status options (for filter).
 * Each has the icon shown in the matrix badge.
 */
export const COMPANY_OVERALL_STATUSES = [
  { value: 'Completado',  icon: '✓', label: 'Completado' },
  { value: 'En Progreso', icon: '●', label: 'En Progreso' },
  { value: 'No Iniciado', icon: '○', label: 'No Iniciado' },
  { value: 'Estancado',   icon: '⏸', label: 'Estancado' },
];
