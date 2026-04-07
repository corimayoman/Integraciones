/**
 * Unit tests for js/business/presentation-utils.js
 *
 * Validates: Requirements 18.4, 2.2, 2.3, 2.4, 9.1, 9.4, 17.6
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeHTML,
  getCellColor,
  getSeverityColor,
  getTooltipContent,
  sortCompaniesByYear,
  groupByRegion,
  createViewState,
  setLoading,
  setLoaded,
  setError,
} from '../../js/business/presentation-utils.js';

/* ------------------------------------------------------------------ */
/*  sanitizeHTML                                                        */
/* ------------------------------------------------------------------ */

describe('sanitizeHTML', () => {
  it('escapes < and >', () => {
    expect(sanitizeHTML('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('escapes & correctly', () => {
    expect(sanitizeHTML('a & b')).toBe('a &amp; b');
  });

  it('escapes double quotes', () => {
    expect(sanitizeHTML('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(sanitizeHTML("it's")).toBe('it&#x27;s');
  });

  it('is idempotent for safe strings', () => {
    const safe = 'Hello World 123';
    expect(sanitizeHTML(safe)).toBe(safe);
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeHTML(null)).toBe('');
    expect(sanitizeHTML(undefined)).toBe('');
    expect(sanitizeHTML(42)).toBe('');
  });

  it('handles empty string', () => {
    expect(sanitizeHTML('')).toBe('');
  });
});

/* ------------------------------------------------------------------ */
/*  getCellColor                                                       */
/* ------------------------------------------------------------------ */

describe('getCellColor', () => {
  it('maps No Iniciado → status-not-started', () => {
    expect(getCellColor('No Iniciado')).toBe('status-not-started');
  });

  it('maps En Progreso → status-in-progress', () => {
    expect(getCellColor('En Progreso')).toBe('status-in-progress');
  });

  it('maps Completado → status-completed', () => {
    expect(getCellColor('Completado')).toBe('status-completed');
  });

  it('maps Bloqueado → status-blocked', () => {
    expect(getCellColor('Bloqueado')).toBe('status-blocked');
  });

  it('maps Rechazado → status-rejected', () => {
    expect(getCellColor('Rechazado')).toBe('status-rejected');
  });

  it('returns empty string for unknown status', () => {
    expect(getCellColor('Unknown')).toBe('');
  });
});

/* ------------------------------------------------------------------ */
/*  getSeverityColor                                                   */
/* ------------------------------------------------------------------ */

describe('getSeverityColor', () => {
  it('maps Critical → severity-critical', () => {
    expect(getSeverityColor('Critical')).toBe('severity-critical');
  });

  it('maps High → severity-high', () => {
    expect(getSeverityColor('High')).toBe('severity-high');
  });

  it('maps Medium → severity-medium', () => {
    expect(getSeverityColor('Medium')).toBe('severity-medium');
  });

  it('maps Low → severity-low', () => {
    expect(getSeverityColor('Low')).toBe('severity-low');
  });

  it('returns empty string for unknown severity', () => {
    expect(getSeverityColor('None')).toBe('');
  });
});


/* ------------------------------------------------------------------ */
/*  getTooltipContent                                                  */
/* ------------------------------------------------------------------ */

describe('getTooltipContent', () => {
  it('generates tooltip with track name, progress, and subtask counts', () => {
    const track = {
      trackName: 'Kick Off Integration',
      progress: 100,
      closedSubtasks: 2,
      totalSubtasks: 2,
    };
    expect(getTooltipContent(track)).toBe('Kick Off Integration\n100% (2/2)');
  });

  it('handles 0% progress', () => {
    const track = {
      trackName: 'E-mail & Drives Migration',
      progress: 0,
      closedSubtasks: 0,
      totalSubtasks: 5,
    };
    expect(getTooltipContent(track)).toBe('E-mail & Drives Migration\n0% (0/5)');
  });

  it('handles partial progress', () => {
    const track = {
      trackName: 'Compliance',
      progress: 50,
      closedSubtasks: 1,
      totalSubtasks: 2,
    };
    expect(getTooltipContent(track)).toBe('Compliance\n50% (1/2)');
  });

  it('handles missing fields gracefully', () => {
    expect(getTooltipContent({})).toBe('\n0% (0/0)');
  });
});

/* ------------------------------------------------------------------ */
/*  sortCompaniesByYear                                                */
/* ------------------------------------------------------------------ */

describe('sortCompaniesByYear', () => {
  it('sorts companies by year descending', () => {
    const companies = [
      { name: 'A', year: 2023 },
      { name: 'B', year: 2025 },
      { name: 'C', year: 2024 },
    ];
    const sorted = sortCompaniesByYear(companies);
    expect(sorted.map((c) => c.year)).toEqual([2025, 2024, 2023]);
  });

  it('does not mutate the input array', () => {
    const companies = [
      { name: 'A', year: 2023 },
      { name: 'B', year: 2025 },
    ];
    const original = [...companies];
    sortCompaniesByYear(companies);
    expect(companies).toEqual(original);
  });

  it('preserves order for same year (stable sort)', () => {
    const companies = [
      { name: 'First', year: 2025 },
      { name: 'Second', year: 2025 },
      { name: 'Third', year: 2025 },
    ];
    const sorted = sortCompaniesByYear(companies);
    expect(sorted.map((c) => c.name)).toEqual(['First', 'Second', 'Third']);
  });

  it('handles null years by treating them as 0', () => {
    const companies = [
      { name: 'A', year: null },
      { name: 'B', year: 2025 },
    ];
    const sorted = sortCompaniesByYear(companies);
    expect(sorted[0].name).toBe('B');
    expect(sorted[1].name).toBe('A');
  });

  it('returns empty array for empty input', () => {
    expect(sortCompaniesByYear([])).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  groupByRegion                                                      */
/* ------------------------------------------------------------------ */

describe('groupByRegion', () => {
  const companies = [
    {
      name: 'Omni Pro',
      region: 'Americas',
      tracks: [
        { progress: 100, status: 'Completado' },
        { progress: 50, status: 'En Progreso' },
      ],
    },
    {
      name: 'Adbid',
      region: 'Americas',
      tracks: [
        { progress: 0, status: 'Bloqueado' },
      ],
    },
    {
      name: 'MMS',
      region: 'EMEA & New Markets',
      tracks: [
        { progress: 80, status: 'En Progreso' },
        { progress: 60, status: 'Bloqueado' },
      ],
    },
  ];

  it('groups companies by region', () => {
    const groups = groupByRegion(companies);
    expect(Object.keys(groups)).toContain('Americas');
    expect(Object.keys(groups)).toContain('EMEA & New Markets');
    expect(groups['Americas'].companies).toHaveLength(2);
    expect(groups['EMEA & New Markets'].companies).toHaveLength(1);
  });

  it('calculates avgCompletion correctly', () => {
    const groups = groupByRegion(companies);
    // Americas: (100 + 50 + 0) / 3 = 50
    expect(groups['Americas'].avgCompletion).toBe(50);
    // EMEA: (80 + 60) / 2 = 70
    expect(groups['EMEA & New Markets'].avgCompletion).toBe(70);
  });

  it('counts blocked tracks correctly', () => {
    const groups = groupByRegion(companies);
    // Americas: 1 blocked (Adbid track)
    expect(groups['Americas'].blockedTracks).toBe(1);
    // EMEA: 1 blocked (MMS second track)
    expect(groups['EMEA & New Markets'].blockedTracks).toBe(1);
  });

  it('handles empty input', () => {
    const groups = groupByRegion([]);
    expect(Object.keys(groups)).toHaveLength(0);
  });

  it('defaults region to Americas when missing', () => {
    const groups = groupByRegion([{ name: 'X', tracks: [] }]);
    expect(groups['Americas'].companies).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/*  ViewState                                                          */
/* ------------------------------------------------------------------ */

describe('ViewState', () => {
  it('createViewState returns loading state', () => {
    const vs = createViewState();
    expect(vs.state).toBe('loading');
  });

  it('setLoading transitions to loading', () => {
    const vs = { state: 'loaded' };
    setLoading(vs);
    expect(vs.state).toBe('loading');
  });

  it('setLoaded transitions to loaded when data is non-empty array', () => {
    const vs = createViewState();
    setLoaded(vs, [1, 2, 3]);
    expect(vs.state).toBe('loaded');
    expect(vs.data).toEqual([1, 2, 3]);
  });

  it('setLoaded transitions to empty when data is empty array', () => {
    const vs = createViewState();
    setLoaded(vs, []);
    expect(vs.state).toBe('empty');
  });

  it('setLoaded transitions to empty when data is null', () => {
    const vs = createViewState();
    setLoaded(vs, null);
    expect(vs.state).toBe('empty');
  });

  it('setLoaded transitions to empty when data is empty object', () => {
    const vs = createViewState();
    setLoaded(vs, {});
    expect(vs.state).toBe('empty');
  });

  it('setLoaded transitions to loaded when data is non-empty object', () => {
    const vs = createViewState();
    setLoaded(vs, { key: 'value' });
    expect(vs.state).toBe('loaded');
  });

  it('setError transitions to error with message', () => {
    const vs = createViewState();
    setError(vs, 'Network failure');
    expect(vs.state).toBe('error');
    expect(vs.error).toBe('Network failure');
  });

  it('setError extracts message from Error object', () => {
    const vs = createViewState();
    setError(vs, new Error('Something broke'));
    expect(vs.state).toBe('error');
    expect(vs.error).toBe('Something broke');
  });

  it('deterministic transitions: loading → loaded → error → loading', () => {
    const vs = createViewState();
    expect(vs.state).toBe('loading');

    setLoaded(vs, [1]);
    expect(vs.state).toBe('loaded');

    setError(vs, 'fail');
    expect(vs.state).toBe('error');

    setLoading(vs);
    expect(vs.state).toBe('loading');
  });
});
