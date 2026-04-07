/**
 * Unit tests for js/business/alerts.js
 *
 * Validates: Requirements 6.1, 6.2, 6.3
 */

import { describe, it, expect } from 'vitest';
import { detectDelayedTracks } from '../../js/business/alerts.js';
import { transformJiraData } from '../../js/business/transformer.js';
import { OFFLINE_ISSUES } from '../../js/data/offline-data.js';

const model = transformJiraData(OFFLINE_ISSUES);

/* ------------------------------------------------------------------ */
/*  detectDelayedTracks — with offline data                            */
/* ------------------------------------------------------------------ */

describe('detectDelayedTracks', () => {
  const alerts = detectDelayedTracks(model);

  it('returns an array of alerts', () => {
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('generates alerts for Critical+Bloqueado tracks', () => {
    // Omni Pro track 08 (Critical) has subtask GLO586-208 Bloqueado
    // Grupo ASSA track 04 (Critical) has subtask GLO586-604 Bloqueado
    const criticalAlerts = alerts.filter((a) => a.severity === 'Critical');
    expect(criticalAlerts.length).toBeGreaterThanOrEqual(2);
  });

  it('generates alerts for High+Bloqueado tracks', () => {
    // In offline data, no High track has a Bloqueado subtask
    // But the function should detect them if they exist
    const highAlerts = alerts.filter((a) => a.severity === 'High');
    // Adbid track 05 (High) has no Bloqueado/Rechazado subtasks
    // So no High alerts from offline data
    expect(highAlerts).toHaveLength(0);
  });

  it('does NOT generate alerts for Medium severity tracks', () => {
    const mediumAlerts = alerts.filter((a) => a.severity === 'Medium');
    expect(mediumAlerts).toHaveLength(0);
  });

  it('does NOT generate alerts for Low severity tracks', () => {
    const lowAlerts = alerts.filter((a) => a.severity === 'Low');
    expect(lowAlerts).toHaveLength(0);
  });

  it('each alert has required fields', () => {
    for (const alert of alerts) {
      expect(alert).toHaveProperty('companyId');
      expect(alert).toHaveProperty('companyName');
      expect(alert).toHaveProperty('trackNumber');
      expect(alert).toHaveProperty('trackName');
      expect(alert).toHaveProperty('severity');
      expect(alert).toHaveProperty('blockingSubtask');
      expect(alert.blockingSubtask).toHaveProperty('key');
      expect(alert.blockingSubtask).toHaveProperty('summary');
      expect(alert.blockingSubtask).toHaveProperty('status');
    }
  });

  it('blockingSubtask status is Bloqueado or Rechazado', () => {
    for (const alert of alerts) {
      expect(['Bloqueado', 'Rechazado']).toContain(alert.blockingSubtask.status);
    }
  });

  it('returns empty array for empty model', () => {
    const emptyModel = { companies: [], metadata: {} };
    expect(detectDelayedTracks(emptyModel)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  detectDelayedTracks — synthetic scenarios                          */
/* ------------------------------------------------------------------ */

describe('detectDelayedTracks — synthetic data', () => {
  it('Medium+Bloqueado does NOT generate alert', () => {
    const syntheticModel = {
      companies: [
        {
          id: 'TEST-1',
          name: 'Test Co',
          year: 2025,
          region: 'Americas',
          tracks: [
            {
              trackNumber: 6,
              trackName: 'Acquired Official Site',
              severity: 'Medium',
              epicKey: 'TEST-E1',
              progress: 50,
              status: 'Bloqueado',
              subtasks: [
                { key: 'TEST-S1', summary: 'Blocked task', status: 'Bloqueado', jiraStatus: 'Blocked', assignee: null },
              ],
              assignee: null,
              totalSubtasks: 1,
              closedSubtasks: 0,
            },
          ],
          others: [],
        },
      ],
      metadata: { mode: 'offline', lastUpdated: null, totalIssues: 0 },
    };
    const alerts = detectDelayedTracks(syntheticModel);
    expect(alerts).toHaveLength(0);
  });

  it('High+Rechazado generates alert', () => {
    const syntheticModel = {
      companies: [
        {
          id: 'TEST-2',
          name: 'Test Co 2',
          year: 2025,
          region: 'Americas',
          tracks: [
            {
              trackNumber: 2,
              trackName: 'Initial Package',
              severity: 'High',
              epicKey: 'TEST-E2',
              progress: 50,
              status: 'Rechazado',
              subtasks: [
                { key: 'TEST-S2', summary: 'Rejected task', status: 'Rechazado', jiraStatus: 'Rejected', assignee: null },
                { key: 'TEST-S3', summary: 'Done task', status: 'Completado', jiraStatus: 'Closed', assignee: null },
              ],
              assignee: null,
              totalSubtasks: 2,
              closedSubtasks: 1,
            },
          ],
          others: [],
        },
      ],
      metadata: { mode: 'offline', lastUpdated: null, totalIssues: 0 },
    };
    const alerts = detectDelayedTracks(syntheticModel);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('High');
    expect(alerts[0].blockingSubtask.status).toBe('Rechazado');
    expect(alerts[0].companyName).toBe('Test Co 2');
    expect(alerts[0].trackNumber).toBe(2);
  });

  it('Critical+Bloqueado generates alert with correct details', () => {
    const syntheticModel = {
      companies: [
        {
          id: 'TEST-3',
          name: 'Test Co 3',
          year: 2024,
          region: 'EMEA & New Markets',
          tracks: [
            {
              trackNumber: 3,
              trackName: 'E-mail & Drives Migration',
              severity: 'Critical',
              epicKey: 'TEST-E3',
              progress: 33,
              status: 'Bloqueado',
              subtasks: [
                { key: 'TEST-S4', summary: 'Blocked migration', status: 'Bloqueado', jiraStatus: 'Blocked', assignee: 'John' },
                { key: 'TEST-S5', summary: 'Done step', status: 'Completado', jiraStatus: 'Closed', assignee: 'Jane' },
                { key: 'TEST-S6', summary: 'Pending step', status: 'No Iniciado', jiraStatus: 'Open', assignee: null },
              ],
              assignee: 'John',
              totalSubtasks: 3,
              closedSubtasks: 1,
            },
          ],
          others: [],
        },
      ],
      metadata: { mode: 'offline', lastUpdated: null, totalIssues: 0 },
    };
    const alerts = detectDelayedTracks(syntheticModel);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].companyId).toBe('TEST-3');
    expect(alerts[0].companyName).toBe('Test Co 3');
    expect(alerts[0].trackNumber).toBe(3);
    expect(alerts[0].trackName).toBe('E-mail & Drives Migration');
    expect(alerts[0].severity).toBe('Critical');
    expect(alerts[0].blockingSubtask.key).toBe('TEST-S4');
    expect(alerts[0].blockingSubtask.summary).toBe('Blocked migration');
    expect(alerts[0].blockingSubtask.status).toBe('Bloqueado');
  });
});
