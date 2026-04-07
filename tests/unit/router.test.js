/**
 * Unit tests for js/presentation/router.js
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  navigate,
  getCurrentRoute,
  onRouteChange,
  initRouter,
  destroyRouter,
} from '../../js/presentation/router.js';

describe('router', () => {
  beforeEach(() => {
    window.location.hash = '';
    destroyRouter();
  });

  afterEach(() => {
    destroyRouter();
    window.location.hash = '';
  });

  describe('getCurrentRoute', () => {
    it('returns matrix route for empty hash', () => {
      window.location.hash = '';
      const route = getCurrentRoute();
      expect(route.name).toBe('matrix');
      expect(route.params).toEqual({});
    });

    it('returns matrix route for #/', () => {
      window.location.hash = '#/';
      const route = getCurrentRoute();
      expect(route.name).toBe('matrix');
    });

    it('returns region route for #/region', () => {
      window.location.hash = '#/region';
      const route = getCurrentRoute();
      expect(route.name).toBe('region');
      expect(route.params).toEqual({});
    });

    it('returns alerts route for #/alerts', () => {
      window.location.hash = '#/alerts';
      const route = getCurrentRoute();
      expect(route.name).toBe('alerts');
      expect(route.params).toEqual({});
    });

    it('returns company-detail route with id param', () => {
      window.location.hash = '#/company/G4G-100';
      const route = getCurrentRoute();
      expect(route.name).toBe('company-detail');
      expect(route.params).toEqual({ id: 'G4G-100' });
    });

    it('returns matrix for unrecognized routes', () => {
      window.location.hash = '#/unknown';
      const route = getCurrentRoute();
      expect(route.name).toBe('matrix');
    });

    it('decodes URI-encoded company id', () => {
      window.location.hash = '#/company/Grupo%20ASSA';
      const route = getCurrentRoute();
      expect(route.name).toBe('company-detail');
      expect(route.params.id).toBe('Grupo ASSA');
    });
  });

  describe('navigate', () => {
    it('sets window.location.hash', () => {
      navigate('#/region');
      expect(window.location.hash).toBe('#/region');
    });
  });

  describe('onRouteChange + initRouter', () => {
    it('calls listener on hashchange', async () => {
      const listener = vi.fn();
      onRouteChange(listener);
      initRouter();

      // initRouter triggers initial route
      expect(listener).toHaveBeenCalled();
    });

    it('listener receives parsed route object', () => {
      window.location.hash = '#/alerts';
      const listener = vi.fn();
      onRouteChange(listener);
      initRouter();

      const call = listener.mock.calls[0][0];
      expect(call.name).toBe('alerts');
      expect(call.params).toEqual({});
    });
  });

  describe('destroyRouter', () => {
    it('clears listeners', () => {
      const listener = vi.fn();
      onRouteChange(listener);
      destroyRouter();
      initRouter();
      // After destroy + re-init, old listener should not be called
      // because destroyRouter clears the array
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
