/**
 * Unit tests for js/presentation/dc/company-list-view.js
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderCompanyListView } from '../../js/presentation/dc/company-list-view.js';

// Mock dc-api-client
vi.mock('../../js/data/dc-api-client.js', () => ({
  fetchCompanies: vi.fn(),
  getCurrentUser: vi.fn(),
}));

// Mock router
vi.mock('../../js/presentation/router.js', () => ({
  navigate: vi.fn(),
}));

import { fetchCompanies, getCurrentUser } from '../../js/data/dc-api-client.js';
import { navigate } from '../../js/presentation/router.js';

describe('company-list-view', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    vi.clearAllMocks();
  });

  it('renders title and spinner while loading', () => {
    fetchCompanies.mockReturnValue(new Promise(() => {})); // never resolves
    getCurrentUser.mockReturnValue({ id: 1, role: 'admin' });

    renderCompanyListView(container);

    const title = container.querySelector('h2');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe('Empresas');

    const spinner = container.querySelector('[role="status"]');
    expect(spinner).not.toBeNull();
  });

  it('renders company cards after loading', async () => {
    fetchCompanies.mockResolvedValue({
      ok: true,
      data: [
        { id: 1, name: 'Empresa A' },
        { id: 2, name: 'Empresa B' },
      ],
    });
    getCurrentUser.mockReturnValue({ id: 1, role: null });

    renderCompanyListView(container);
    await new Promise((r) => setTimeout(r, 0));

    const cards = container.querySelectorAll('.dc-company-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toBe('Empresa A');
    expect(cards[1].textContent).toBe('Empresa B');
  });

  it('navigates to company on card click', async () => {
    fetchCompanies.mockResolvedValue({
      ok: true,
      data: [{ id: 42, name: 'Test Corp' }],
    });
    getCurrentUser.mockReturnValue({ id: 1, role: null });

    renderCompanyListView(container);
    await new Promise((r) => setTimeout(r, 0));

    const card = container.querySelector('.dc-company-card');
    card.click();

    expect(navigate).toHaveBeenCalledWith('#/data-collection/42');
  });

  it('navigates to company on Enter key', async () => {
    fetchCompanies.mockResolvedValue({
      ok: true,
      data: [{ id: 7, name: 'KeyCorp' }],
    });
    getCurrentUser.mockReturnValue({ id: 1, role: null });

    renderCompanyListView(container);
    await new Promise((r) => setTimeout(r, 0));

    const card = container.querySelector('.dc-company-card');
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(navigate).toHaveBeenCalledWith('#/data-collection/7');
  });

  it('shows admin link for admin users', async () => {
    fetchCompanies.mockResolvedValue({ ok: true, data: [] });
    getCurrentUser.mockReturnValue({ id: 1, role: 'admin' });

    renderCompanyListView(container);

    const adminLink = container.querySelector('.dc-company-list__admin-link');
    expect(adminLink).not.toBeNull();
    expect(adminLink.href).toContain('#/data-collection/admin');
    expect(adminLink.textContent).toBe('Panel de Admin');
  });

  it('does not show admin link for non-admin users', async () => {
    fetchCompanies.mockResolvedValue({ ok: true, data: [] });
    getCurrentUser.mockReturnValue({ id: 1, role: null });

    renderCompanyListView(container);

    const adminLink = container.querySelector('.dc-company-list__admin-link');
    expect(adminLink).toBeNull();
  });

  it('shows empty state when no companies', async () => {
    fetchCompanies.mockResolvedValue({ ok: true, data: [] });
    getCurrentUser.mockReturnValue({ id: 1, role: null });

    renderCompanyListView(container);
    await new Promise((r) => setTimeout(r, 0));

    const emptyState = container.querySelector('.empty-state');
    expect(emptyState).not.toBeNull();
  });

  it('shows error state on API error', async () => {
    fetchCompanies.mockResolvedValue({ ok: false, error: 'Server error' });
    getCurrentUser.mockReturnValue({ id: 1, role: null });

    renderCompanyListView(container);
    await new Promise((r) => setTimeout(r, 0));

    const errorState = container.querySelector('.error-state');
    expect(errorState).not.toBeNull();
  });

  it('shows error state on network failure', async () => {
    fetchCompanies.mockRejectedValue(new Error('Network error'));
    getCurrentUser.mockReturnValue({ id: 1, role: null });

    renderCompanyListView(container);
    await new Promise((r) => setTimeout(r, 0));

    const errorState = container.querySelector('.error-state');
    expect(errorState).not.toBeNull();
  });

  it('cards have proper ARIA attributes', async () => {
    fetchCompanies.mockResolvedValue({
      ok: true,
      data: [{ id: 1, name: 'ARIA Corp' }],
    });
    getCurrentUser.mockReturnValue({ id: 1, role: null });

    renderCompanyListView(container);
    await new Promise((r) => setTimeout(r, 0));

    const card = container.querySelector('.dc-company-card');
    expect(card.getAttribute('role')).toBe('listitem');
    expect(card.getAttribute('tabindex')).toBe('0');
    expect(card.getAttribute('aria-label')).toBe('Empresa: ARIA Corp');
  });
});
