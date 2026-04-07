/**
 * Unit tests for js/data/cache.js
 * Validates: Requirement 18.3
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { set, get, clear } from '../../js/data/cache.js';

describe('Cache', () => {
  beforeEach(() => {
    clear();
    vi.restoreAllMocks();
  });

  it('should return data within TTL', () => {
    set('key1', { value: 42 });
    expect(get('key1', 5000)).toEqual({ value: 42 });
  });

  it('should return null for missing key', () => {
    expect(get('nonexistent', 5000)).toBeNull();
  });

  it('should return null when data has expired', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValueOnce(now);
    set('key1', 'data');

    // Advance time past TTL
    vi.spyOn(Date, 'now').mockReturnValue(now + 6000);
    expect(get('key1', 5000)).toBeNull();
  });

  it('should return data exactly before TTL boundary', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValueOnce(now);
    set('key1', 'data');

    // 1ms before expiry
    vi.spyOn(Date, 'now').mockReturnValue(now + 4999);
    expect(get('key1', 5000)).toBe('data');
  });

  it('should return null at exact TTL boundary', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValueOnce(now);
    set('key1', 'data');

    // Exactly at TTL
    vi.spyOn(Date, 'now').mockReturnValue(now + 5000);
    expect(get('key1', 5000)).toBeNull();
  });

  it('should clear all entries', () => {
    set('a', 1);
    set('b', 2);
    clear();
    expect(get('a', 60000)).toBeNull();
    expect(get('b', 60000)).toBeNull();
  });

  it('should overwrite existing key', () => {
    set('key1', 'old');
    set('key1', 'new');
    expect(get('key1', 5000)).toBe('new');
  });
});
