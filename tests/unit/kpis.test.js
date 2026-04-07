/**
 * Unit tests for js/business/kpis.js
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 */

import { describe, it, expect } from 'vitest';
import {
  calculateKPIs,
  calculateYearSummary,
  calculateSeverityChart,
} from '../../js/business/kpis.js';
import { transformJiraData } from '../../js/business/transformer.js';
import { OFFLINE_ISSUES } from '../../js/data/offline-data.js';

const model = transformJiraData(OFFLINE_ISSUES);

/* ------------------------------------------------------------------ */
/*  calculateKPIs                                                      */
/* ------------------------------------------------------------------ */

describe('calculateKPIs', () => {
  it('returns correct totalActiveCompanies', () => {
    const kpis = calculateKPIs(model);
    expect(kpis.totalActiveCompanies).toBe(model.companies.length);
    expect(kpis.totalActiveCompanies).toBe(5);
  });

  it('returns globalCompletionPercent as average of all track progress', () => {
    const kpis = calculateKPIs(model);
    const allTracks = model.companies.flatMap((c) => c.tracks);
    const expected = Math.round(
      allTracks.reduce((sum, t) => sum + t.progress, 0) / allTracks.length,
    );
    expect(kpis.globalCompletionPercent).toBe(expected);
  });

  it('counts blocked tracks correctly', () => {
    const kpis = calculateKPIs(model);
    // Omni Pro track 08 has a Bloqueado subtask, Grupo ASSA track 04 has a Bloqueado subtask
    expect(kpis.blockedTracksCount).toBe(2);
  });

  it('counts critical in-progress tracks correctly', () => {
    const kpis = calculateKPIs(model);
    // Omni Pro track 03 (Critical, En Progreso), Grupo ASSA track 09 (Critical, En Progreso)
    expect(kpis.criticalInProgressCount).toBe(2);
  });

  it('returns zeros for empty model', () => {
    const emptyModel = { companies: [], metadata: {} };
    const kpis = calculateKPIs(emptyModel);
    expect(kpis.totalActiveCompanies).toBe(0);
    expect(kpis.globalCompletionPercent).toBe(0);
    expect(kpis.blockedTracksCount).toBe(0);
    expect(kpis.criticalInProgressCount).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  calculateYearSummary                                               */
/* ------------------------------------------------------------------ */

describe('calculateYearSummary', () => {
  it('returns one entry per unique year', () => {
    const summary = calculateYearSummary(model);
    const years = summary.map((s) => s.year);
    expect(new Set(years).size).toBe(years.length);
    expect(years).toContain(2024);
    expect(years).toContain(2025);
  });

  it('is sorted by year descending', () => {
    const summary = calculateYearSummary(model);
    for (let i = 1; i < summary.length; i++) {
      expect(summary[i - 1].year).toBeGreaterThan(summary[i].year);
    }
  });

  it('has correct company count per year', () => {
    const summary = calculateYearSummary(model);
    const y2025 = summary.find((s) => s.year === 2025);
    const y2024 = summary.find((s) => s.year === 2024);
    expect(y2025.companyCount).toBe(3); // Omni Pro, Adbid, MMS
    expect(y2024.companyCount).toBe(2); // Grupo ASSA, Practia
  });

  it('has avgCompletionBySeverity with all four severities', () => {
    const summary = calculateYearSummary(model);
    for (const entry of summary) {
      expect(entry.avgCompletionBySeverity).toHaveProperty('Critical');
      expect(entry.avgCompletionBySeverity).toHaveProperty('High');
      expect(entry.avgCompletionBySeverity).toHaveProperty('Medium');
      expect(entry.avgCompletionBySeverity).toHaveProperty('Low');
    }
  });

  it('returns empty array for empty model', () => {
    const emptyModel = { companies: [], metadata: {} };
    expect(calculateYearSummary(emptyModel)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  calculateSeverityChart                                             */
/* ------------------------------------------------------------------ */

describe('calculateSeverityChart', () => {
  it('returns years sorted ascending', () => {
    const chart = calculateSeverityChart(model);
    for (let i = 1; i < chart.years.length; i++) {
      expect(chart.years[i]).toBeGreaterThan(chart.years[i - 1]);
    }
  });

  it('has four severity series', () => {
    const chart = calculateSeverityChart(model);
    expect(chart.series).toHaveLength(4);
    const names = chart.series.map((s) => s.severity);
    expect(names).toEqual(['Critical', 'High', 'Medium', 'Low']);
  });

  it('each series has values matching years length', () => {
    const chart = calculateSeverityChart(model);
    for (const s of chart.series) {
      expect(s.values).toHaveLength(chart.years.length);
    }
  });

  it('returns empty years and zero-length values for empty model', () => {
    const emptyModel = { companies: [], metadata: {} };
    const chart = calculateSeverityChart(emptyModel);
    expect(chart.years).toEqual([]);
    for (const s of chart.series) {
      expect(s.values).toEqual([]);
    }
  });
});
