/**
 * Filters — AND-logic filter engine for the Dashboard model.
 *
 * Each filter accepts an array of selected values. Empty array = no restriction.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 *
 * @module filters
 */

import { getCompanyOverallStatus } from './presentation-utils.js';

/**
 * Filter companies by acquisition year.
 * @param {Array<object>} companies
 * @param {number[]} years - empty = all
 */
export function filterByYear(companies, years) {
  if (!years || years.length === 0) return companies;
  return companies.filter((c) => years.includes(c.year));
}

/**
 * Filter tracks by severity. Companies with zero matching tracks are excluded.
 * @param {Array<object>} companies
 * @param {string[]} severities - empty = all
 */
export function filterBySeverity(companies, severities) {
  if (!severities || severities.length === 0) return companies;
  return companies
    .map((company) => ({
      ...company,
      tracks: company.tracks.filter((t) => severities.includes(t.severity)),
    }))
    .filter((company) => company.tracks.length > 0);
}

/**
 * Filter companies by region.
 * @param {Array<object>} companies
 * @param {string[]} regions - empty = all
 */
export function filterByRegion(companies, regions) {
  if (!regions || regions.length === 0) return companies;
  return companies.filter((c) => regions.includes(c.region));
}

/**
 * Filter tracks by status. Companies with zero matching tracks are excluded.
 * @param {Array<object>} companies
 * @param {string[]} statuses - empty = all
 */
export function filterByStatus(companies, statuses) {
  if (!statuses || statuses.length === 0) return companies;
  return companies
    .map((company) => ({
      ...company,
      tracks: company.tracks.filter((t) => statuses.includes(t.status)),
    }))
    .filter((company) => company.tracks.length > 0);
}

/**
 * Filter companies by their overall integration status.
 * @param {Array<object>} companies
 * @param {string[]} companyStatuses - empty = all
 */
export function filterByCompanyStatus(companies, companyStatuses) {
  if (!companyStatuses || companyStatuses.length === 0) return companies;
  return companies.filter((c) => companyStatuses.includes(getCompanyOverallStatus(c)));
}

/**
 * Extract unique acquisition years from the model's companies.
 * Returns sorted array (ascending).
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
 * Apply all active filters to the model. Each filter is an array of selected
 * values; empty array means "show all" for that dimension.
 *
 * @param {object} model - DashboardModel
 * @param {{ severity: string[], year: number[], region: string[], status: string[], companyStatus: string[] }} filters
 * @returns {object} new model with filtered companies
 */
export function applyFilters(model, filters) {
  const {
    severity = [],
    year = [],
    region = [],
    status = [],
    companyStatus = [],
  } = filters;

  let companies = model.companies;

  companies = filterByYear(companies, year);
  companies = filterByRegion(companies, region);
  companies = filterByCompanyStatus(companies, companyStatus);
  companies = filterBySeverity(companies, severity);
  companies = filterByStatus(companies, status);

  return {
    ...model,
    companies,
  };
}
