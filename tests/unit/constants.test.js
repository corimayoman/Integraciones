/**
 * Unit tests for js/constants.js
 * Validates: Requirements 1.4, 8.3, 8.5, 9.1
 */
import { describe, it, expect } from 'vitest';
import {
  INTEGRATION_TRACKS,
  STATUS_MAP,
  REGION_MAP,
  DEFAULT_REGION,
  CIRCUIT_BREAKER_CONFIG,
  RETRY_CONFIG,
  JIRA_STATUSES,
  DASHBOARD_STATUSES,
  SEVERITIES,
  REGIONS,
} from '../../js/constants.js';

describe('INTEGRATION_TRACKS', () => {
  it('should have exactly 14 tracks', () => {
    expect(INTEGRATION_TRACKS).toHaveLength(14);
  });

  it('should have tracks numbered 1 through 14', () => {
    const numbers = INTEGRATION_TRACKS.map(t => t.number);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it('each track should have number, name, and severity', () => {
    for (const track of INTEGRATION_TRACKS) {
      expect(track).toHaveProperty('number');
      expect(track).toHaveProperty('name');
      expect(track).toHaveProperty('severity');
      expect(typeof track.number).toBe('number');
      expect(typeof track.name).toBe('string');
      expect(SEVERITIES).toContain(track.severity);
    }
  });

  it('should have correct severity distribution', () => {
    const bySeverity = {};
    for (const t of INTEGRATION_TRACKS) {
      bySeverity[t.severity] = (bySeverity[t.severity] || 0) + 1;
    }
    expect(bySeverity['Critical']).toBe(4);
    expect(bySeverity['High']).toBe(3);
    expect(bySeverity['Medium']).toBe(4);
    expect(bySeverity['Low']).toBe(3);
  });
});

describe('STATUS_MAP', () => {
  it('should map all known Jira statuses', () => {
    for (const status of JIRA_STATUSES) {
      expect(STATUS_MAP).toHaveProperty(status);
    }
  });

  it('should map to valid Dashboard statuses', () => {
    for (const dashStatus of Object.values(STATUS_MAP)) {
      expect(DASHBOARD_STATUSES).toContain(dashStatus);
    }
  });

  it('should map specific statuses correctly', () => {
    expect(STATUS_MAP['Closed']).toBe('Completado');
    expect(STATUS_MAP['In Progress']).toBe('En Progreso');
    expect(STATUS_MAP['Analyzing']).toBe('En Progreso');
    expect(STATUS_MAP['Solution In Progress']).toBe('En Progreso');
    expect(STATUS_MAP['Open']).toBe('No Iniciado');
    expect(STATUS_MAP['Backlog']).toBe('No Iniciado');
    expect(STATUS_MAP['Blocked']).toBe('Bloqueado');
    expect(STATUS_MAP['Rejected']).toBe('Rechazado');
    expect(STATUS_MAP['Reopened']).toBe('Rechazado');
  });
});

describe('REGION_MAP', () => {
  it('should only contain valid regions', () => {
    for (const region of Object.values(REGION_MAP)) {
      expect(REGIONS).toContain(region);
    }
  });

  it('should have Americas companies', () => {
    expect(REGION_MAP['Omni Pro']).toBe('Americas');
    expect(REGION_MAP['Adbid']).toBe('Americas');
  });

  it('should have EMEA & New Markets companies', () => {
    expect(REGION_MAP['MMS']).toBe('EMEA & New Markets');
    expect(REGION_MAP['Startechup']).toBe('EMEA & New Markets');
  });
});

describe('DEFAULT_REGION', () => {
  it('should be Americas', () => {
    expect(DEFAULT_REGION).toBe('Americas');
  });
});

describe('CIRCUIT_BREAKER_CONFIG', () => {
  it('should have failure threshold of 5', () => {
    expect(CIRCUIT_BREAKER_CONFIG.failureThreshold).toBe(5);
  });

  it('should have reset timeout of 30 seconds', () => {
    expect(CIRCUIT_BREAKER_CONFIG.resetTimeoutMs).toBe(30_000);
  });
});

describe('RETRY_CONFIG', () => {
  it('should have max 3 attempts', () => {
    expect(RETRY_CONFIG.maxAttempts).toBe(3);
  });

  it('should have 1s base delay for exponential backoff', () => {
    expect(RETRY_CONFIG.baseDelayMs).toBe(1000);
  });

  it('should have 10s request timeout', () => {
    expect(RETRY_CONFIG.requestTimeoutMs).toBe(10_000);
  });
});
