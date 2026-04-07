/**
 * Unit tests for js/presentation/components.js
 */
import { describe, it, expect, vi } from 'vitest';
import {
  createTooltip,
  createBadge,
  createSpinner,
  createProgressBar,
  createEmptyState,
  createErrorState,
} from '../../js/presentation/components.js';

describe('components', () => {
  describe('createTooltip', () => {
    it('returns a div with role=tooltip', () => {
      const target = document.createElement('button');
      const tooltip = createTooltip('Hello', target);
      expect(tooltip.tagName).toBe('DIV');
      expect(tooltip.getAttribute('role')).toBe('tooltip');
      expect(tooltip.textContent).toBe('Hello');
    });

    it('sets aria-describedby on target', () => {
      const target = document.createElement('button');
      const tooltip = createTooltip('Info', target);
      expect(target.getAttribute('aria-describedby')).toBe(tooltip.id);
    });

    it('is hidden by default', () => {
      const target = document.createElement('button');
      const tooltip = createTooltip('Info', target);
      expect(tooltip.style.display).toBe('none');
    });
  });

  describe('createBadge', () => {
    it('creates a span with badge class and type', () => {
      const badge = createBadge('Critical', 'severity-critical');
      expect(badge.tagName).toBe('SPAN');
      expect(badge.className).toContain('badge--severity-critical');
    });

    it('includes icon and label children', () => {
      const badge = createBadge('Blocked', 'status-blocked');
      const icon = badge.querySelector('.badge__icon');
      const label = badge.querySelector('.badge__label');
      expect(icon).not.toBeNull();
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(label.textContent).toBe('Blocked');
    });

    it('uses correct icon for severity-high', () => {
      const badge = createBadge('High', 'severity-high');
      const icon = badge.querySelector('.badge__icon');
      expect(icon.textContent).toBe('▲');
    });
  });

  describe('createSpinner', () => {
    it('creates a spinner with role=status', () => {
      const spinner = createSpinner();
      expect(spinner.getAttribute('role')).toBe('status');
      expect(spinner.getAttribute('aria-label')).toBe('Cargando');
    });

    it('applies size class', () => {
      const sm = createSpinner('sm');
      expect(sm.className).toContain('spinner--sm');

      const lg = createSpinner('lg');
      expect(lg.className).toContain('spinner--lg');
    });

    it('includes visually-hidden text', () => {
      const spinner = createSpinner();
      const srText = spinner.querySelector('.visually-hidden');
      expect(srText.textContent).toBe('Cargando...');
    });
  });

  describe('createProgressBar', () => {
    it('creates a progressbar with correct aria attributes', () => {
      const bar = createProgressBar(75, 'High');
      expect(bar.getAttribute('role')).toBe('progressbar');
      expect(bar.getAttribute('aria-valuenow')).toBe('75');
      expect(bar.getAttribute('aria-valuemin')).toBe('0');
      expect(bar.getAttribute('aria-valuemax')).toBe('100');
    });

    it('clamps progress to 0-100', () => {
      const over = createProgressBar(150);
      expect(over.getAttribute('aria-valuenow')).toBe('100');

      const under = createProgressBar(-10);
      expect(under.getAttribute('aria-valuenow')).toBe('0');
    });

    it('applies severity class to fill', () => {
      const bar = createProgressBar(50, 'Critical');
      const fill = bar.querySelector('.progress-bar__fill');
      expect(fill.className).toContain('progress-bar__fill--severity-critical');
    });

    it('shows percentage label', () => {
      const bar = createProgressBar(42, 'Low');
      const label = bar.querySelector('.progress-bar__label');
      expect(label.textContent).toBe('42%');
    });
  });

  describe('createEmptyState', () => {
    it('creates empty state with message', () => {
      const el = createEmptyState('No hay datos');
      expect(el.className).toContain('empty-state');
      const msg = el.querySelector('.empty-state__message');
      expect(msg.textContent).toBe('No hay datos');
    });

    it('includes decorative icon', () => {
      const el = createEmptyState('Empty');
      const icon = el.querySelector('.empty-state__icon');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('createErrorState', () => {
    it('creates error state with role=alert', () => {
      const el = createErrorState('Error occurred');
      expect(el.getAttribute('role')).toBe('alert');
      const msg = el.querySelector('.error-state__message');
      expect(msg.textContent).toBe('Error occurred');
    });

    it('includes retry button when callback provided', () => {
      const onRetry = vi.fn();
      const el = createErrorState('Failed', onRetry);
      const btn = el.querySelector('.error-state__retry');
      expect(btn).not.toBeNull();
      expect(btn.textContent).toBe('Reintentar');

      btn.click();
      expect(onRetry).toHaveBeenCalledOnce();
    });

    it('omits retry button when no callback', () => {
      const el = createErrorState('Failed');
      const btn = el.querySelector('.error-state__retry');
      expect(btn).toBeNull();
    });
  });
});
