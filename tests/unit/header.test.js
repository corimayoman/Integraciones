/**
 * Unit tests for js/presentation/header.js
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  renderHeader,
  updateConnectionStatus,
  updateAlertCount,
  showOfflineBanner,
  hideOfflineBanner,
} from '../../js/presentation/header.js';

describe('header', () => {
  let container;
  const defaultOpts = {
    isLive: false,
    alertCount: 0,
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
    onToggleDarkMode: vi.fn(),
  };

  beforeEach(() => {
    container = document.createElement('header');
    container.id = 'app-header';
    defaultOpts.onConnect = vi.fn();
    defaultOpts.onDisconnect = vi.fn();
    defaultOpts.onToggleDarkMode = vi.fn();
  });

  describe('renderHeader', () => {
    it('renders title', () => {
      renderHeader(container, defaultOpts);
      const title = container.querySelector('.app-title');
      expect(title.textContent).toBe('I4G Integration Tracker');
    });

    it('renders Connect Jira button when offline', () => {
      renderHeader(container, { ...defaultOpts, isLive: false });
      const btn = container.querySelector('.header-connect-btn');
      expect(btn.textContent).toBe('Connect Jira');
    });

    it('renders Conectado button when live', () => {
      renderHeader(container, { ...defaultOpts, isLive: true });
      const btn = container.querySelector('.header-connect-btn');
      expect(btn.textContent).toBe('Conectado');
    });

    it('calls onConnect when Connect Jira clicked', () => {
      renderHeader(container, defaultOpts);
      const btn = container.querySelector('.header-connect-btn');
      btn.click();
      expect(defaultOpts.onConnect).toHaveBeenCalledOnce();
    });

    it('calls onDisconnect when Conectado clicked', () => {
      renderHeader(container, { ...defaultOpts, isLive: true });
      const btn = container.querySelector('.header-connect-btn');
      btn.click();
      expect(defaultOpts.onDisconnect).toHaveBeenCalledOnce();
    });

    it('renders dark mode toggle', () => {
      renderHeader(container, defaultOpts);
      const toggle = container.querySelector('.header-dark-toggle');
      expect(toggle).not.toBeNull();
      toggle.click();
      expect(defaultOpts.onToggleDarkMode).toHaveBeenCalledOnce();
    });

    it('hides alert badge when count is 0', () => {
      renderHeader(container, { ...defaultOpts, alertCount: 0 });
      const badge = container.querySelector('.header-alert-badge');
      expect(badge.style.display).toBe('none');
    });

    it('shows alert badge when count > 0', () => {
      renderHeader(container, { ...defaultOpts, alertCount: 5 });
      const badge = container.querySelector('.header-alert-badge');
      expect(badge.style.display).not.toBe('none');
      expect(badge.textContent).toBe('5');
    });

    it('shows offline banner when not live', () => {
      renderHeader(container, { ...defaultOpts, isLive: false });
      const banner = container.querySelector('.offline-banner');
      expect(banner.style.display).not.toBe('none');
      expect(banner.textContent).toContain('Modo Offline');
    });

    it('hides offline banner when live', () => {
      renderHeader(container, { ...defaultOpts, isLive: true });
      const banner = container.querySelector('.offline-banner');
      expect(banner.style.display).toBe('none');
    });
  });

  describe('updateConnectionStatus', () => {
    it('updates button text to Conectado when live', () => {
      renderHeader(container, defaultOpts);
      updateConnectionStatus(true);
      const btn = container.querySelector('.header-connect-btn');
      expect(btn.textContent).toBe('Conectado');
    });

    it('updates button text to Connect Jira when offline', () => {
      renderHeader(container, { ...defaultOpts, isLive: true });
      updateConnectionStatus(false);
      const btn = container.querySelector('.header-connect-btn');
      expect(btn.textContent).toBe('Connect Jira');
    });
  });

  describe('updateAlertCount', () => {
    it('updates badge text and visibility', () => {
      renderHeader(container, defaultOpts);
      updateAlertCount(3);
      const badge = container.querySelector('.header-alert-badge');
      expect(badge.textContent).toBe('3');
      expect(badge.style.display).not.toBe('none');
    });

    it('hides badge when count is 0', () => {
      renderHeader(container, { ...defaultOpts, alertCount: 5 });
      updateAlertCount(0);
      const badge = container.querySelector('.header-alert-badge');
      expect(badge.style.display).toBe('none');
    });
  });

  describe('showOfflineBanner / hideOfflineBanner', () => {
    it('toggles offline banner visibility', () => {
      renderHeader(container, { ...defaultOpts, isLive: true });
      const banner = container.querySelector('.offline-banner');
      expect(banner.style.display).toBe('none');

      showOfflineBanner();
      expect(banner.style.display).not.toBe('none');

      hideOfflineBanner();
      expect(banner.style.display).toBe('none');
    });
  });
});
