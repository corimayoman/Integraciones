/**
 * Login View — Data Collection Module
 *
 * Renders a login form with username/password fields.
 * On submit, calls dc-api-client.login() and redirects to company list on success.
 *
 * Validates: Requirements 2.1, 10.1, 10.2, 10.3
 *
 * @module dc/login-view
 */

import { login } from '../../data/dc-api-client.js';
import { navigate } from '../router.js';

/**
 * Render the login view into the given container.
 * @param {HTMLElement} container - DOM container to render into
 */
export function renderLoginView(container) {
  container.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'dc-login';

  const heading = document.createElement('h2');
  heading.className = 'dc-login__title';
  heading.textContent = 'Recolección de Datos';
  wrapper.appendChild(heading);

  const form = document.createElement('form');
  form.className = 'dc-login__form';
  form.setAttribute('aria-label', 'Formulario de inicio de sesión');

  // Error message (hidden by default)
  const errorEl = document.createElement('p');
  errorEl.className = 'dc-login__error';
  errorEl.setAttribute('role', 'alert');
  errorEl.setAttribute('aria-live', 'assertive');
  errorEl.style.display = 'none';
  form.appendChild(errorEl);

  // Username field
  const usernameGroup = document.createElement('div');
  usernameGroup.className = 'dc-login__field';

  const usernameLabel = document.createElement('label');
  usernameLabel.className = 'dc-login__label';
  usernameLabel.setAttribute('for', 'dc-username');
  usernameLabel.textContent = 'Usuario';
  usernameGroup.appendChild(usernameLabel);

  const usernameInput = document.createElement('input');
  usernameInput.type = 'text';
  usernameInput.id = 'dc-username';
  usernameInput.name = 'username';
  usernameInput.className = 'dc-login__input';
  usernameInput.required = true;
  usernameInput.autocomplete = 'username';
  usernameInput.setAttribute('aria-required', 'true');
  usernameGroup.appendChild(usernameInput);
  form.appendChild(usernameGroup);

  // Password field
  const passwordGroup = document.createElement('div');
  passwordGroup.className = 'dc-login__field';

  const passwordLabel = document.createElement('label');
  passwordLabel.className = 'dc-login__label';
  passwordLabel.setAttribute('for', 'dc-password');
  passwordLabel.textContent = 'Contraseña';
  passwordGroup.appendChild(passwordLabel);

  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.id = 'dc-password';
  passwordInput.name = 'password';
  passwordInput.className = 'dc-login__input';
  passwordInput.required = true;
  passwordInput.autocomplete = 'current-password';
  passwordInput.setAttribute('aria-required', 'true');
  passwordGroup.appendChild(passwordInput);
  form.appendChild(passwordGroup);

  // Submit button
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn btn--primary dc-login__submit';
  submitBtn.textContent = 'Iniciar sesión';
  form.appendChild(submitBtn);

  // Handle submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.style.display = 'none';
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ingresando...';

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      errorEl.textContent = 'Ingrese usuario y contraseña.';
      errorEl.style.display = '';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Iniciar sesión';
      return;
    }

    try {
      const result = await login(username, password);
      if (result.ok) {
        navigate('#/data-collection');
      } else {
        errorEl.textContent = result.error || 'Credenciales inválidas.';
        errorEl.style.display = '';
      }
    } catch {
      errorEl.textContent = 'Error de conexión. Intente nuevamente.';
      errorEl.style.display = '';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Iniciar sesión';
    }
  });

  wrapper.appendChild(form);
  container.appendChild(wrapper);
}
