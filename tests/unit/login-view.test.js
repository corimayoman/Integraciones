/**
 * Unit tests for js/presentation/dc/login-view.js
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderLoginView } from '../../js/presentation/dc/login-view.js';

// Mock dc-api-client
vi.mock('../../js/data/dc-api-client.js', () => ({
  login: vi.fn(),
}));

// Mock router
vi.mock('../../js/presentation/router.js', () => ({
  navigate: vi.fn(),
}));

import { login } from '../../js/data/dc-api-client.js';
import { navigate } from '../../js/presentation/router.js';

describe('login-view', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    vi.clearAllMocks();
  });

  it('renders a form with username and password fields', () => {
    renderLoginView(container);

    const form = container.querySelector('form');
    expect(form).not.toBeNull();

    const usernameInput = container.querySelector('#dc-username');
    expect(usernameInput).not.toBeNull();
    expect(usernameInput.type).toBe('text');
    expect(usernameInput.required).toBe(true);

    const passwordInput = container.querySelector('#dc-password');
    expect(passwordInput).not.toBeNull();
    expect(passwordInput.type).toBe('password');
    expect(passwordInput.required).toBe(true);
  });

  it('renders a submit button', () => {
    renderLoginView(container);

    const btn = container.querySelector('button[type="submit"]');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe('Iniciar sesión');
  });

  it('renders labels for username and password', () => {
    renderLoginView(container);

    const labels = container.querySelectorAll('label');
    const labelTexts = Array.from(labels).map((l) => l.textContent);
    expect(labelTexts).toContain('Usuario');
    expect(labelTexts).toContain('Contraseña');
  });

  it('has ARIA attributes for accessibility', () => {
    renderLoginView(container);

    const form = container.querySelector('form');
    expect(form.getAttribute('aria-label')).toBe('Formulario de inicio de sesión');

    const errorEl = container.querySelector('[role="alert"]');
    expect(errorEl).not.toBeNull();
    expect(errorEl.getAttribute('aria-live')).toBe('assertive');
  });

  it('error message is hidden by default', () => {
    renderLoginView(container);

    const errorEl = container.querySelector('[role="alert"]');
    expect(errorEl.style.display).toBe('none');
  });

  it('shows error when submitting empty fields', async () => {
    renderLoginView(container);

    const form = container.querySelector('form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    // Wait for async handler
    await new Promise((r) => setTimeout(r, 0));

    const errorEl = container.querySelector('[role="alert"]');
    expect(errorEl.style.display).toBe('');
    expect(errorEl.textContent).toBe('Ingrese usuario y contraseña.');
  });

  it('calls login and navigates on success', async () => {
    login.mockResolvedValue({ ok: true, user: { id: 1, username: 'admin' } });

    renderLoginView(container);

    const usernameInput = container.querySelector('#dc-username');
    const passwordInput = container.querySelector('#dc-password');
    usernameInput.value = 'admin';
    passwordInput.value = 'secret';

    const form = container.querySelector('form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    await new Promise((r) => setTimeout(r, 0));

    expect(login).toHaveBeenCalledWith('admin', 'secret');
    expect(navigate).toHaveBeenCalledWith('#/data-collection');
  });

  it('shows error message on login failure', async () => {
    login.mockResolvedValue({ ok: false, error: 'Credenciales inválidas' });

    renderLoginView(container);

    const usernameInput = container.querySelector('#dc-username');
    const passwordInput = container.querySelector('#dc-password');
    usernameInput.value = 'admin';
    passwordInput.value = 'wrong';

    const form = container.querySelector('form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    await new Promise((r) => setTimeout(r, 0));

    const errorEl = container.querySelector('[role="alert"]');
    expect(errorEl.style.display).toBe('');
    expect(errorEl.textContent).toBe('Credenciales inválidas');
  });

  it('shows connection error on network failure', async () => {
    login.mockRejectedValue(new Error('Network error'));

    renderLoginView(container);

    const usernameInput = container.querySelector('#dc-username');
    const passwordInput = container.querySelector('#dc-password');
    usernameInput.value = 'admin';
    passwordInput.value = 'pass';

    const form = container.querySelector('form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    await new Promise((r) => setTimeout(r, 0));

    const errorEl = container.querySelector('[role="alert"]');
    expect(errorEl.style.display).toBe('');
    expect(errorEl.textContent).toBe('Error de conexión. Intente nuevamente.');
  });

  it('renders heading with module title', () => {
    renderLoginView(container);

    const heading = container.querySelector('h2');
    expect(heading).not.toBeNull();
    expect(heading.textContent).toBe('Recolección de Datos');
  });
});
