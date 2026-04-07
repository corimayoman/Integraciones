/**
 * Unit tests for js/presentation/header.js
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  renderHeader,
  updateConnectionStatus,
  updateAlertCount,
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
      expect(title.textContent).toBe('AMS Integration Tracker');
    });

    it('renders Conectar Jira button when offline', () => {
      renderHeader(container, { ...defaultOpts, isLive: false });
      const btn = container.querySelector('.header-connect-btn');
      expect(btn.textContent).toBe('Conectar Jira');
    });

    it('renders Desconectar button when live', () => {
      renderHeader(container, { ...defaultOpts, isLive: true });
      const btn = container.querySelector('.header-connect-btn');
      expect(btn.textContent).toBe('Desconectar');
    });

    it('calls onConnect when button clicked offline', () => {
      renderHeader(container, defaultOpts);
      container.querySelector('.header-connect-btn').click();
      expect(defaultOpts.onConnect).toHaveBeenCalledOnce();
    });

    it('calls onDisconnect when button clicked live', () => {
      renderHeader(container, { ...defaultOpts, isLive: true });
      container.querySelector('.header-connect-btn').click();
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

    it('shows LED offline indicator when not live', () => {
      renderHeader(container, { ...defaultOpts, isLive: false });
      const led = container.querySelector('.led');
      expect(led.classList.contains('led--offline')).toBe(true);
      const label = container.querySelector('.led-label');
      expect(label.textContent).toBe('Offline');
    });

    it('shows LED online indicator when live', () => {
      renderHeader(container, { ...defaultOpts, isLive: true });
      const led = container.querySelector('.led');
      expect(led.classList.contains('led--online')).toBe(true);
      const label = container.querySelector('.led-label');
      expect(label.textContent).toBe('Live');
    });
  });

  describe('updateConnectionStatus', () => {
    it('updates LED to online', () => {
      renderHeader(container, defaultOpts);
      updateConnectionStatus(true);
      const led = container.querySelector('.led');
      expect(led.classList.contains('led--online')).toBe(true);
    });

    it('updates LED to offline', () => {
      renderHeader(container, { ...defaultOpts, isLive: true });
      updateConnectionStatus(false);
      const led = container.querySelector('.led');
      expect(led.classList.contains('led--offline')).toBe(true);
    });

    it('updates button text', () => {
      renderHeader(container, defaultOpts);
      updateConnectionStatus(true);
      expect(container.querySelector('.header-connect-btn').textContent).toBe('Desconectar');
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
});
