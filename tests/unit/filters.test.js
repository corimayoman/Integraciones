/**
 * Unit tests for js/business/filters.js
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

import { describe, it, expect } from 'vitest';
import {
  applyFilters,
  filterByYear,
  filterBySeverity,
  filterByRegion,
  filterByStatus,
  getAvailableYears,
} from '../../js/business/filters.js';
import { transformJiraData } from '../../js/business/transformer.js';
import { OFFLINE_ISSUES } from '../../js/data/offline-data.js';

const model = transformJiraData(OFFLINE_ISSUES);

/* ------------------------------------------------------------------ */
/*  filterByYear                                                       */
/* ------------------------------------------------------------------ */

describe('filterByYear', () => {
  it('returns all companies when year is null', () => {
    const result = filterByYear(model.companies, null);
    expect(result).toHaveLength(model.companies.length);
  });

  it('filters companies by year 2025', () => {
    const result = filterByYear(model.companies, 2025);
    expect(result.every((c) => c.year === 2025)).toBe(true);
    // Omni Pro, Adbid, MMS are 2025
    expect(result).toHaveLength(3);
  });

  it('filters companies by year 2024', () => {
    const result = filterByYear(model.companies, 2024);
    expect(result.every((c) => c.year === 2024)).toBe(true);
    // Grupo ASSA, Practia are 2024
    expect(result).toHaveLength(2);
  });

  it('returns empty for non-existent year', () => {
    const result = filterByYear(model.companies, 2020);
    expect(result).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  filterBySeverity                                                   */
/* ------------------------------------------------------------------ */

describe('filterBySeverity', () => {
  it('returns all companies when severity is null', () => {
    const result = filterBySeverity(model.companies, null);
    expect(result).toHaveLength(model.companies.length);
  });

  it('filters to only Critical tracks', () => {
    const result = filterBySeverity(model.companies, 'Critical');
    for (const company of result) {
      expect(company.tracks.every((t) => t.severity === 'Critical')).toBe(true);
    }
  });

  it('excludes companies with no matching tracks', () => {
    // Practia only has tracks 01 (Low), 02 (High), 14 (Low) — no Critical
    const result = filterBySeverity(model.companies, 'Critical');
    const practia = result.find((c) => c.name === 'Practia');
    expect(practia).toBeUndefined();
  });

  it('filters to only Low tracks', () => {
    const result = filterBySeverity(model.companies, 'Low');
    for (const company of result) {
      expect(company.tracks.every((t) => t.severity === 'Low')).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  filterByRegion                                                     */
/* ------------------------------------------------------------------ */

describe('filterByRegion', () => {
  it('returns all companies when region is null', () => {
    const result = filterByRegion(model.companies, null);
    expect(result).toHaveLength(model.companies.length);
  });

  it('filters to Americas only', () => {
    const result = filterByRegion(model.companies, 'Americas');
    expect(result.every((c) => c.region === 'Americas')).toBe(true);
    // Omni Pro, Adbid, Grupo ASSA, Practia
    expect(result).toHaveLength(4);
  });

  it('filters to EMEA & New Markets only', () => {
    const result = filterByRegion(model.companies, 'EMEA & New Markets');
    expect(result.every((c) => c.region === 'EMEA & New Markets')).toBe(true);
    // MMS
    expect(result).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/*  filterByStatus                                                     */
/* ------------------------------------------------------------------ */

describe('filterByStatus', () => {
  it('returns all companies when status is null', () => {
    const result = filterByStatus(model.companies, null);
    expect(result).toHaveLength(model.companies.length);
  });

  it('filters to Bloqueado tracks', () => {
    const result = filterByStatus(model.companies, 'Bloqueado');
    for (const company of result) {
      expect(company.tracks.every((t) => t.status === 'Bloqueado')).toBe(true);
    }
  });

  it('filters to Completado tracks', () => {
    const result = filterByStatus(model.companies, 'Completado');
    for (const company of result) {
      expect(company.tracks.every((t) => t.status === 'Completado')).toBe(true);
    }
    // Practia has all completed tracks
    const practia = result.find((c) => c.name === 'Practia');
    expect(practia).toBeDefined();
  });

  it('excludes companies with no matching status', () => {
    // MMS has tracks: 01 (En Progreso), 03 (No Iniciado) — no Bloqueado
    const result = filterByStatus(model.companies, 'Bloqueado');
    const mms = result.find((c) => c.name === 'MMS');
    expect(mms).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  getAvailableYears                                                  */
/* ------------------------------------------------------------------ */

describe('getAvailableYears', () => {
  it('extracts unique years sorted ascending', () => {
    const years = getAvailableYears(model);
    expect(years).toEqual([2024, 2025]);
  });

  it('returns empty array for empty model', () => {
    const emptyModel = { companies: [], metadata: {} };
    expect(getAvailableYears(emptyModel)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  applyFilters — combined AND logic                                  */
/* ------------------------------------------------------------------ */

describe('applyFilters', () => {
  it('returns full model when all filters are null', () => {
    const result = applyFilters(model, {
      severity: null,
      year: null,
      region: null,
      status: null,
    });
    expect(result.companies).toHaveLength(model.companies.length);
  });

  it('returns full model when filters object is empty', () => {
    const result = applyFilters(model, {});
    expect(result.companies).toHaveLength(model.companies.length);
  });

  it('does not mutate the original model', () => {
    const originalLength = model.companies.length;
    applyFilters(model, { year: 2025 });
    expect(model.companies).toHaveLength(originalLength);
  });

  it('combines year + region filters with AND', () => {
    const result = applyFilters(model, { year: 2025, region: 'Americas' });
    // 2025 Americas: Omni Pro, Adbid
    expect(result.companies).toHaveLength(2);
    expect(result.companies.every((c) => c.year === 2025 && c.region === 'Americas')).toBe(true);
  });

  it('combines severity + status filters with AND', () => {
    const result = applyFilters(model, { severity: 'Critical', status: 'Bloqueado' });
    for (const company of result.companies) {
      for (const track of company.tracks) {
        expect(track.severity).toBe('Critical');
        expect(track.status).toBe('Bloqueado');
      }
    }
  });

  it('preserves metadata in filtered model', () => {
    const result = applyFilters(model, { year: 2025 });
    expect(result.metadata).toEqual(model.metadata);
  });

  it('returns empty companies when no match', () => {
    const result = applyFilters(model, { year: 1999 });
    expect(result.companies).toHaveLength(0);
  });
});
