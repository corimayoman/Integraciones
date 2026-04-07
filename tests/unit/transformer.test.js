/**
 * Unit tests for js/business/transformer.js
 *
 * Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect } from 'vitest';
import {
  parseCompanySummary,
  parseTrackNumber,
  mapJiraStatus,
  calculateTrackProgress,
  determineTrackStatus,
  transformJiraData,
} from '../../js/business/transformer.js';
import { OFFLINE_ISSUES } from '../../js/data/offline-data.js';

/* ------------------------------------------------------------------ */
/*  parseCompanySummary                                                */
/* ------------------------------------------------------------------ */

describe('parseCompanySummary', () => {
  it('extracts name and year from valid pattern', () => {
    expect(parseCompanySummary('Omni Pro - 2025')).toEqual({
      name: 'Omni Pro',
      year: 2025,
    });
  });

  it('handles different years', () => {
    expect(parseCompanySummary('Grupo ASSA - 2024')).toEqual({
      name: 'Grupo ASSA',
      year: 2024,
    });
  });

  it('returns full summary as name and year null when no match', () => {
    expect(parseCompanySummary('No Year Here')).toEqual({
      name: 'No Year Here',
      year: null,
    });
  });

  it('handles summary with extra spaces around dash', () => {
    expect(parseCompanySummary('MMS  -  2025')).toEqual({
      name: 'MMS',
      year: 2025,
    });
  });

  it('handles summary with dash but no year', () => {
    expect(parseCompanySummary('Company - abc')).toEqual({
      name: 'Company - abc',
      year: null,
    });
  });
});

/* ------------------------------------------------------------------ */
/*  parseTrackNumber                                                   */
/* ------------------------------------------------------------------ */

describe('parseTrackNumber', () => {
  it('extracts track 01', () => {
    expect(parseTrackNumber('01. Kick Off Integration')).toBe(1);
  });

  it('extracts track 14', () => {
    expect(parseTrackNumber('14. Closure Assets Decommissioning')).toBe(14);
  });

  it('extracts track 03', () => {
    expect(parseTrackNumber('03. E-mail & Drives Migration')).toBe(3);
  });

  it('returns null for out of range track 00', () => {
    expect(parseTrackNumber('00. Invalid Track')).toBeNull();
  });

  it('returns null for out of range track 15', () => {
    expect(parseTrackNumber('15. Beyond Range')).toBeNull();
  });

  it('returns null for no prefix', () => {
    expect(parseTrackNumber('No prefix here')).toBeNull();
  });

  it('returns null for single digit prefix', () => {
    expect(parseTrackNumber('3. Single digit')).toBeNull();
  });

  it('returns null for three digit prefix', () => {
    expect(parseTrackNumber('003. Three digits')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  mapJiraStatus                                                      */
/* ------------------------------------------------------------------ */

describe('mapJiraStatus', () => {
  it('maps Closed → Completado', () => {
    expect(mapJiraStatus('Closed')).toBe('Completado');
  });

  it('maps In Progress → En Progreso', () => {
    expect(mapJiraStatus('In Progress')).toBe('En Progreso');
  });

  it('maps Analyzing → En Progreso', () => {
    expect(mapJiraStatus('Analyzing')).toBe('En Progreso');
  });

  it('maps Solution In Progress → En Progreso', () => {
    expect(mapJiraStatus('Solution In Progress')).toBe('En Progreso');
  });

  it('maps Open → No Iniciado', () => {
    expect(mapJiraStatus('Open')).toBe('No Iniciado');
  });

  it('maps Backlog → No Iniciado', () => {
    expect(mapJiraStatus('Backlog')).toBe('No Iniciado');
  });

  it('maps Blocked → Bloqueado', () => {
    expect(mapJiraStatus('Blocked')).toBe('Bloqueado');
  });

  it('maps Rejected → Rechazado', () => {
    expect(mapJiraStatus('Rejected')).toBe('Rechazado');
  });

  it('maps Reopened → Rechazado', () => {
    expect(mapJiraStatus('Reopened')).toBe('Rechazado');
  });

  it('maps unknown status → No Iniciado', () => {
    expect(mapJiraStatus('SomeUnknownStatus')).toBe('No Iniciado');
  });
});

/* ------------------------------------------------------------------ */
/*  calculateTrackProgress                                             */
/* ------------------------------------------------------------------ */

describe('calculateTrackProgress', () => {
  it('returns 0 for empty list', () => {
    expect(calculateTrackProgress([])).toBe(0);
  });

  it('returns 100 when all subtasks are Completado', () => {
    const subtasks = [
      { status: 'Completado' },
      { status: 'Completado' },
    ];
    expect(calculateTrackProgress(subtasks)).toBe(100);
  });

  it('returns 0 when no subtasks are Completado', () => {
    const subtasks = [
      { status: 'En Progreso' },
      { status: 'No Iniciado' },
    ];
    expect(calculateTrackProgress(subtasks)).toBe(0);
  });

  it('calculates mixed statuses correctly', () => {
    const subtasks = [
      { status: 'Completado' },
      { status: 'En Progreso' },
      { status: 'No Iniciado' },
    ];
    // 1/3 * 100 = 33.33 → rounds to 33
    expect(calculateTrackProgress(subtasks)).toBe(33);
  });

  it('rounds to nearest integer', () => {
    const subtasks = [
      { status: 'Completado' },
      { status: 'Completado' },
      { status: 'En Progreso' },
    ];
    // 2/3 * 100 = 66.67 → rounds to 67
    expect(calculateTrackProgress(subtasks)).toBe(67);
  });
});

/* ------------------------------------------------------------------ */
/*  determineTrackStatus                                               */
/* ------------------------------------------------------------------ */

describe('determineTrackStatus', () => {
  it('returns No Iniciado for empty list', () => {
    expect(determineTrackStatus([])).toBe('No Iniciado');
  });

  it('returns Bloqueado if any subtask is Bloqueado', () => {
    const subtasks = [
      { status: 'Completado' },
      { status: 'Bloqueado' },
      { status: 'En Progreso' },
    ];
    expect(determineTrackStatus(subtasks)).toBe('Bloqueado');
  });

  it('returns Completado if all subtasks are Completado', () => {
    const subtasks = [
      { status: 'Completado' },
      { status: 'Completado' },
    ];
    expect(determineTrackStatus(subtasks)).toBe('Completado');
  });

  it('returns En Progreso if any subtask is En Progreso', () => {
    const subtasks = [
      { status: 'Completado' },
      { status: 'En Progreso' },
    ];
    expect(determineTrackStatus(subtasks)).toBe('En Progreso');
  });

  it('returns No Iniciado when all are No Iniciado', () => {
    const subtasks = [
      { status: 'No Iniciado' },
      { status: 'No Iniciado' },
    ];
    expect(determineTrackStatus(subtasks)).toBe('No Iniciado');
  });
});

/* ------------------------------------------------------------------ */
/*  transformJiraData (with offline data)                               */
/* ------------------------------------------------------------------ */

describe('transformJiraData', () => {
  const model = transformJiraData(OFFLINE_ISSUES);

  it('returns a DashboardModel with companies array', () => {
    expect(model).toHaveProperty('companies');
    expect(Array.isArray(model.companies)).toBe(true);
  });

  it('returns metadata with mode offline', () => {
    expect(model.metadata.mode).toBe('offline');
  });

  it('returns metadata with totalIssues matching input length', () => {
    expect(model.metadata.totalIssues).toBe(OFFLINE_ISSUES.length);
  });

  it('creates 5 companies from 5 themes', () => {
    expect(model.companies).toHaveLength(5);
  });

  it('parses Omni Pro company correctly', () => {
    const omni = model.companies.find((c) => c.name === 'Omni Pro');
    expect(omni).toBeDefined();
    expect(omni.year).toBe(2025);
    expect(omni.id).toBe('G4G-100');
    expect(omni.region).toBe('Americas');
  });

  it('parses MMS company with EMEA region', () => {
    const mms = model.companies.find((c) => c.name === 'MMS');
    expect(mms).toBeDefined();
    expect(mms.region).toBe('EMEA & New Markets');
  });

  it('maps Omni Pro tracks correctly', () => {
    const omni = model.companies.find((c) => c.name === 'Omni Pro');
    expect(omni.tracks.length).toBe(4); // epics 01, 02, 03, 08

    const track01 = omni.tracks.find((t) => t.trackNumber === 1);
    expect(track01).toBeDefined();
    expect(track01.trackName).toBe('Kick Off Integration');
    expect(track01.status).toBe('Completado');
    expect(track01.progress).toBe(100);
    expect(track01.subtasks).toHaveLength(2);
  });

  it('calculates blocked track status for Omni Pro track 08', () => {
    const omni = model.companies.find((c) => c.name === 'Omni Pro');
    const track08 = omni.tracks.find((t) => t.trackNumber === 8);
    expect(track08.status).toBe('Bloqueado');
  });

  it('calculates in-progress track status for Omni Pro track 03', () => {
    const omni = model.companies.find((c) => c.name === 'Omni Pro');
    const track03 = omni.tracks.find((t) => t.trackNumber === 3);
    expect(track03.status).toBe('En Progreso');
    // 1 closed out of 3 subtasks → 33%
    expect(track03.progress).toBe(33);
  });

  it('Practia is fully completed', () => {
    const practia = model.companies.find((c) => c.name === 'Practia');
    expect(practia.year).toBe(2024);
    for (const track of practia.tracks) {
      expect(track.status).toBe('Completado');
      expect(track.progress).toBe(100);
    }
  });

  it('has no others for companies with valid track prefixes', () => {
    for (const company of model.companies) {
      expect(company.others).toHaveLength(0);
    }
  });

  it('subtasks have correct structure', () => {
    const omni = model.companies.find((c) => c.name === 'Omni Pro');
    const track01 = omni.tracks.find((t) => t.trackNumber === 1);
    const sub = track01.subtasks[0];
    expect(sub).toHaveProperty('key');
    expect(sub).toHaveProperty('summary');
    expect(sub).toHaveProperty('status');
    expect(sub).toHaveProperty('jiraStatus');
    expect(sub).toHaveProperty('assignee');
  });

  it('total subtasks in model equals Sub-task count in input', () => {
    const inputSubtaskCount = OFFLINE_ISSUES.filter(
      (i) => i.fields.issuetype.name === 'Sub-task',
    ).length;
    const modelSubtaskCount = model.companies.reduce(
      (sum, c) => sum + c.tracks.reduce((s, t) => s + t.subtasks.length, 0),
      0,
    );
    expect(modelSubtaskCount).toBe(inputSubtaskCount);
  });
});
