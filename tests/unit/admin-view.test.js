/**
 * Unit tests for js/presentation/dc/admin-view.js (Redesigned — company-centric)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderAdminView } from '../../js/presentation/dc/admin-view.js';

vi.mock('../../js/data/dc-api-client.js', () => ({
  fetchUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  fetchAssignments: vi.fn(),
  createAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
  fetchCompanies: vi.fn(),
  createCompany: vi.fn(),
  deleteCompany: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock('../../js/presentation/router.js', () => ({ navigate: vi.fn() }));

vi.mock('../../js/presentation/dc/import-view.js', () => ({
  renderImportView: vi.fn((c) => {
    const d = document.createElement('div');
    d.className = 'dc-import-mock';
    c.appendChild(d);
  }),
}));

import {
  fetchUsers, createUser, updateUser,
  fetchAssignments, fetchCompanies, getCurrentUser,
} from '../../js/data/dc-api-client.js';

async function waitFor(fn, timeout = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try { fn(); return; } catch { await new Promise((r) => setTimeout(r, 30)); }
  }
  fn();
}

/** Flush all pending microtasks/promises */
async function flushPromises() {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 20));
  }
}

/** Helper: setup mocks for a successful admin load */
function setupAdminMocks({ users = [], companies = [] } = {}) {
  getCurrentUser.mockReturnValue({ id: 1, role: 'admin' });
  fetchUsers.mockResolvedValue({ ok: true, data: users });
  fetchCompanies.mockResolvedValue({ ok: true, data: companies });
  fetchAssignments.mockResolvedValue({ ok: true, data: [] });
}

/** Helper: click a tab by label text */
function clickTab(container, label) {
  const tabs = container.querySelectorAll('.dc-admin__tab');
  for (const tab of tabs) {
    if (tab.textContent.includes(label)) { tab.click(); return; }
  }
}

describe('admin-view', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
    // Clean up any modals/toasts left on body
    document.body.querySelectorAll('.dc-admin__modal-overlay, .dc-admin__toast').forEach(el => el.remove());
  });

  it('shows access denied for non-admin users', () => {
    getCurrentUser.mockReturnValue({ id: 1, role: null });
    renderAdminView(container);
    expect(container.querySelector('.error-state')).not.toBeNull();
  });

  it('shows access denied when no user', () => {
    getCurrentUser.mockReturnValue(null);
    renderAdminView(container);
    expect(container.querySelector('.error-state')).not.toBeNull();
  });

  it('renders title and spinner while loading', () => {
    getCurrentUser.mockReturnValue({ id: 1, role: 'admin' });
    fetchUsers.mockReturnValue(new Promise(() => {}));
    fetchCompanies.mockReturnValue(new Promise(() => {}));
    renderAdminView(container);
    expect(container.querySelector('h2').textContent).toBe('Panel de Administración');
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });

  it('renders tabs (Empresas, Usuarios, Importar)', async () => {
    setupAdminMocks();
    renderAdminView(container);
    await waitFor(() => {
      const tabs = container.querySelectorAll('.dc-admin__tab');
      expect(tabs.length).toBe(3);
    });
  });

  it('renders companies tab by default with company cards', async () => {
    setupAdminMocks({ companies: [{ id: 1, name: 'TestCo' }] });
    renderAdminView(container);
    await flushPromises();
    await waitFor(() => {
      expect(container.querySelector('.dc-admin__company-name')).not.toBeNull();
    });
    expect(container.querySelector('.dc-admin__company-name').textContent).toBe('TestCo');
  });

  it('renders user cards in users tab', async () => {
    setupAdminMocks({
      users: [
        { id: 1, name: 'Admin', username: 'admin', active: 1 },
        { id: 2, name: 'User B', username: 'userb', active: 0 },
      ],
    });
    renderAdminView(container);
    await flushPromises();
    await waitFor(() => {
      expect(container.querySelector('.dc-admin__tab')).not.toBeNull();
    });
    clickTab(container, 'Usuarios');
    await waitFor(() => {
      const cards = container.querySelectorAll('.dc-admin__user-card');
      expect(cards.length).toBe(2);
    });
  });

  it('shows user name and status in users tab', async () => {
    setupAdminMocks({
      users: [{ id: 1, name: 'Admin User', username: 'admin', active: 1 }],
    });
    renderAdminView(container);
    await flushPromises();
    await waitFor(() => {
      expect(container.querySelector('.dc-admin__tab')).not.toBeNull();
    });
    clickTab(container, 'Usuarios');
    await waitFor(() => {
      expect(container.querySelector('.dc-admin__user-name')).not.toBeNull();
    });
    expect(container.querySelector('.dc-admin__user-name').textContent).toBe('Admin User');
  });

  it('shows inactive status for inactive users', async () => {
    setupAdminMocks({
      users: [{ id: 2, name: 'Inactive', username: 'inactive', active: 0 }],
    });
    renderAdminView(container);
    await flushPromises();
    await waitFor(() => {
      expect(container.querySelector('.dc-admin__tab')).not.toBeNull();
    });
    clickTab(container, 'Usuarios');
    await waitFor(() => {
      expect(container.querySelector('.dc-admin__user-status')).not.toBeNull();
    });
    expect(container.querySelector('.dc-admin__user-status').textContent).toContain('Inactivo');
  });

  it('renders create user form in users tab', async () => {
    setupAdminMocks();
    renderAdminView(container);
    await flushPromises();
    await waitFor(() => {
      expect(container.querySelector('.dc-admin__tab')).not.toBeNull();
    });
    clickTab(container, 'Usuarios');
    await waitFor(() => {
      expect(container.querySelector('#dc-new-name')).not.toBeNull();
    });
    expect(container.querySelector('#dc-new-username')).not.toBeNull();
    expect(container.querySelector('#dc-new-password')).not.toBeNull();
  });

  it('creates user on form submit', async () => {
    setupAdminMocks();
    createUser.mockResolvedValue({ ok: true, data: { id: 3 } });

    renderAdminView(container);
    await flushPromises();
    await waitFor(() => {
      expect(container.querySelector('.dc-admin__tab')).not.toBeNull();
    });
    clickTab(container, 'Usuarios');
    await waitFor(() => {
      expect(container.querySelector('#dc-new-name')).not.toBeNull();
    });

    container.querySelector('#dc-new-name').value = 'New User';
    container.querySelector('#dc-new-username').value = 'newuser';
    container.querySelector('#dc-new-password').value = 'pass123';

    const form = container.querySelector('.dc-admin__create-user-fields');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await waitFor(() => {
      expect(createUser).toHaveBeenCalled();
    });
    expect(createUser).toHaveBeenCalledWith({ name: 'New User', username: 'newuser', password: 'pass123' });
  });

  it('shows error state on API error', async () => {
    getCurrentUser.mockReturnValue({ id: 1, role: 'admin' });
    fetchUsers.mockResolvedValue({ ok: false, error: 'Server error' });
    fetchCompanies.mockResolvedValue({ ok: true, data: [] });

    renderAdminView(container);
    await waitFor(() => {
      expect(container.querySelector('.error-state')).not.toBeNull();
    });
  });

  it('shows error state on network failure', async () => {
    getCurrentUser.mockReturnValue({ id: 1, role: 'admin' });
    fetchUsers.mockRejectedValue(new Error('Network error'));
    fetchCompanies.mockRejectedValue(new Error('Network error'));

    renderAdminView(container);
    await waitFor(() => {
      expect(container.querySelector('.error-state')).not.toBeNull();
    });
  });

  it('renders back link to companies', () => {
    getCurrentUser.mockReturnValue({ id: 1, role: 'admin' });
    fetchUsers.mockResolvedValue({ ok: true, data: [] });
    fetchCompanies.mockResolvedValue({ ok: true, data: [] });
    renderAdminView(container);
    expect(container.querySelector('a[href="#/data-collection"]')).not.toBeNull();
  });

  it('renders import view in import tab', async () => {
    setupAdminMocks();
    renderAdminView(container);
    await flushPromises();
    await waitFor(() => {
      expect(container.querySelector('.dc-admin__tab')).not.toBeNull();
    });
    clickTab(container, 'Importar');
    await waitFor(() => {
      expect(container.querySelector('.dc-import-mock')).not.toBeNull();
    });
  });

  it('shows user count per company', async () => {
    setupAdminMocks({ companies: [{ id: 1, name: 'Acme' }] });
    renderAdminView(container);
    await flushPromises();
    const countEl = container.querySelector('.dc-admin__company-user-count');
    expect(countEl).not.toBeNull();
    expect(countEl.textContent).toContain('0 usuario');
  });
});
