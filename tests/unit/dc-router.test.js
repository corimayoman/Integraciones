/**
 * Unit tests for data-collection routes in js/presentation/router.js
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getCurrentRoute,
  destroyRouter,
} from '../../js/presentation/router.js';

describe('router — data-collection routes', () => {
  beforeEach(() => {
    window.location.hash = '';
    destroyRouter();
  });

  afterEach(() => {
    destroyRouter();
    window.location.hash = '';
  });

  it('returns dc-home for #/data-collection', () => {
    window.location.hash = '#/data-collection';
    const route = getCurrentRoute();
    expect(route.name).toBe('dc-home');
    expect(route.params).toEqual({});
  });

  it('returns dc-login for #/data-collection/login', () => {
    window.location.hash = '#/data-collection/login';
    const route = getCurrentRoute();
    expect(route.name).toBe('dc-login');
    expect(route.params).toEqual({});
  });

  it('returns dc-admin for #/data-collection/admin', () => {
    window.location.hash = '#/data-collection/admin';
    const route = getCurrentRoute();
    expect(route.name).toBe('dc-admin');
    expect(route.params).toEqual({});
  });

  it('returns dc-company with empresaId param', () => {
    window.location.hash = '#/data-collection/5';
    const route = getCurrentRoute();
    expect(route.name).toBe('dc-company');
    expect(route.params).toEqual({ empresaId: '5' });
  });

  it('returns dc-sheet with empresaId and hojaId params', () => {
    window.location.hash = '#/data-collection/3/apps';
    const route = getCurrentRoute();
    expect(route.name).toBe('dc-sheet');
    expect(route.params).toEqual({ empresaId: '3', hojaId: 'apps' });
  });

  it('decodes URI-encoded empresaId', () => {
    window.location.hash = '#/data-collection/Grupo%20ASSA';
    const route = getCurrentRoute();
    expect(route.name).toBe('dc-company');
    expect(route.params.empresaId).toBe('Grupo ASSA');
  });

  it('existing routes still work — matrix', () => {
    window.location.hash = '#/';
    const route = getCurrentRoute();
    expect(route.name).toBe('matrix');
  });

  it('existing routes still work — region', () => {
    window.location.hash = '#/region';
    const route = getCurrentRoute();
    expect(route.name).toBe('region');
  });

  it('existing routes still work — alerts', () => {
    window.location.hash = '#/alerts';
    const route = getCurrentRoute();
    expect(route.name).toBe('alerts');
  });

  it('existing routes still work — company-detail', () => {
    window.location.hash = '#/company/G4G-100';
    const route = getCurrentRoute();
    expect(route.name).toBe('company-detail');
    expect(route.params.id).toBe('G4G-100');
  });
});
