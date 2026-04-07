/**
 * Filters — AND-logic filter engine for the Dashboard model.
 *
 * Applies severity, year, region, and status filters with AND logic.
 * A filter value of `null` means "all" (no restriction on that dimension).
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 *
 * @module filters
 */

/**
 * Filter companies by acquisition year.
 * If year is null, returns all companies unchanged.
 *
 * @param {Array<object>} companies
 * @param {number | null} year
 * @returns {Array<object>}
 */
export function filterByYear(companies, year) {
  if (year === null) return companies;
  return companies.filter((c) => c.year === year);
}

/**
 * Filter tracks by severity. Returns a new array of companies
 * where each company's tracks are limited to those matching the severity.
 * Companies with zero matching tracks are excluded.
 * If severity is null, returns companies unchanged.
 *
 * @param {Array<object>} companies
 * @param {string | null} severity
 * @returns {Array<object>}
 */
export function filterBySeverity(companies, severity) {
  if (severity === null) return companies;
  return companies
    .map((company) => ({
      ...company,
      tracks: company.tracks.filter((t) => t.severity === severity),
    }))
    .filter((company) => company.tracks.length > 0);
}

/**
 * Filter companies by region.
 * If region is null, returns all companies unchanged.
 *
 * @param {Array<object>} companies
 * @param {string | null} region
 * @returns {Array<object>}
 */
export function filterByRegion(companies, region) {
  if (region === null) return companies;
  return companies.filter((c) => c.region === region);
}

/**
 * Filter companies that have at least one track matching the given status.
 * Tracks that don't match the status are removed from each company.
 * Companies with zero matching tracks are excluded.
 * If status is null, returns companies unchanged.
 *
 * @param {Array<object>} companies
 * @param {string | null} status
 * @returns {Array<object>}
 */
export function filterByStatus(companies, status) {
  if (status === null) return companies;
  return companies
    .map((company) => ({
      ...company,
      tracks: company.tracks.filter((t) => t.status === status),
    }))
    .filter((company) => company.tracks.length > 0);
}

/**
 * Extract unique acquisition years from the model's companies.
 * Returns sorted array (ascending).
 *
 * @param {object} model - DashboardModel
 * @returns {Array<number>}
 */
export function getAvailableYears(model) {
  const years = new Set();
  for (const company of model.companies) {
    if (company.year !== null) {
      years.add(company.year);
    }
  }
  return [...years].sort((a, b) => a - b);
}

/**
 * Apply all active filters with AND logic.
 * Returns a new DashboardModel with filtered companies (original is not mutated).
 *
 * @param {object} model - DashboardModel
 * @param {{ severity?: string|null, year?: number|null, region?: string|null, status?: string|null }} filters
 * @returns {object} Filtered DashboardModel
 */
export function applyFilters(model, filters) {
  const { severity = null, year = null, region = null, status = null } = filters;

  let companies = model.companies;

  companies = filterByYear(companies, year);
  companies = filterByRegion(companies, region);
  companies = filterBySeverity(companies, severity);
  companies = filterByStatus(companies, status);

  return {
    ...model,
    companies,
  };
}
