/**
 * KPIs — Metrics calculator for the Dashboard model.
 *
 * Computes summary KPIs, year-based summaries, and severity chart data.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 *
 * @module kpis
 */

/**
 * Calculate top-level KPI metrics from the model.
 *
 * @param {object} model - DashboardModel
 * @returns {{
 *   totalActiveCompanies: number,
 *   globalCompletionPercent: number,
 *   blockedTracksCount: number,
 *   criticalInProgressCount: number
 * }}
 */
export function calculateKPIs(model) {
  const { companies } = model;

  const totalActiveCompanies = companies.length;

  // Collect all tracks across all companies
  const allTracks = companies.flatMap((c) => c.tracks);

  // Global completion: average progress of ALL tracks
  const globalCompletionPercent =
    allTracks.length === 0
      ? 0
      : Math.round(
          allTracks.reduce((sum, t) => sum + t.progress, 0) / allTracks.length,
        );

  // Blocked tracks: tracks with at least one subtask "Bloqueado"
  const blockedTracksCount = allTracks.filter((t) =>
    t.subtasks.some((s) => s.status === 'Bloqueado'),
  ).length;

  // Critical in progress: tracks with severity "Critical" and status "En Progreso"
  const criticalInProgressCount = allTracks.filter(
    (t) => t.severity === 'Critical' && t.status === 'En Progreso',
  ).length;

  return {
    totalActiveCompanies,
    globalCompletionPercent,
    blockedTracksCount,
    criticalInProgressCount,
  };
}

/**
 * Calculate year summary table: company count and average completion by severity per year.
 *
 * @param {object} model - DashboardModel
 * @returns {Array<{
 *   year: number,
 *   companyCount: number,
 *   avgCompletionBySeverity: { Critical: number, High: number, Medium: number, Low: number }
 * }>}
 */
export function calculateYearSummary(model) {
  const { companies } = model;

  // Group companies by year
  const byYear = new Map();
  for (const company of companies) {
    const year = company.year;
    if (year === null) continue;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(company);
  }

  const severities = ['Critical', 'High', 'Medium', 'Low'];

  const summaries = [];
  for (const [year, yearCompanies] of byYear) {
    const avgCompletionBySeverity = {};

    for (const sev of severities) {
      const tracks = yearCompanies.flatMap((c) =>
        c.tracks.filter((t) => t.severity === sev),
      );
      avgCompletionBySeverity[sev] =
        tracks.length === 0
          ? 0
          : Math.round(
              tracks.reduce((sum, t) => sum + t.progress, 0) / tracks.length,
            );
    }

    summaries.push({
      year,
      companyCount: yearCompanies.length,
      avgCompletionBySeverity,
    });
  }

  // Sort by year descending
  summaries.sort((a, b) => b.year - a.year);

  return summaries;
}

/**
 * Calculate data for a severity bar chart: years and series by severity.
 *
 * @param {object} model - DashboardModel
 * @returns {{
 *   years: number[],
 *   series: Array<{ severity: string, values: number[] }>
 * }}
 */
export function calculateSeverityChart(model) {
  const yearSummary = calculateYearSummary(model);

  // Years sorted ascending for chart x-axis
  const years = yearSummary.map((s) => s.year).sort((a, b) => a - b);

  const severities = ['Critical', 'High', 'Medium', 'Low'];

  // Build a lookup: year → avgCompletionBySeverity
  const lookup = new Map();
  for (const s of yearSummary) {
    lookup.set(s.year, s.avgCompletionBySeverity);
  }

  const series = severities.map((sev) => ({
    severity: sev,
    values: years.map((y) => lookup.get(y)?.[sev] ?? 0),
  }));

  return { years, series };
}
