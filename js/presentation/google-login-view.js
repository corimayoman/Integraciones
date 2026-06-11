/**
 * Google Sign-In screen — shown before the app loads.
 */

import { signInWithGoogle } from '../firebase-auth.js';
import { t } from '../i18n.js';

/**
 * Renders the Google login screen into the document body.
 * Calls onSuccess(user) when sign-in succeeds.
 * @param {(user: object) => void} onSuccess
 */
export function renderGoogleLoginView(onSuccess) {
  // Hide normal app chrome
  document.getElementById('app-header')?.style.setProperty('display', 'none');
  document.getElementById('app-nav')?.style.setProperty('display', 'none');
  document.getElementById('alerts-panel')?.style.setProperty('display', 'none');
  document.getElementById('app-footer')?.style.setProperty('display', 'none');

  const main = document.getElementById('main-content');
  if (!main) return;

  main.innerHTML = `
    <div class="google-login">
      <div class="google-login__card">
        <div class="google-login__logo">
          <span class="google-login__logo-icon">A</span>
        </div>
        <h1 class="google-login__title">${t('app.title')}</h1>
        <p class="google-login__subtitle">${t('auth.subtitle')}</p>
        <button class="google-login__btn" id="google-signin-btn">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
          </svg>
          ${t('auth.continueGoogle')}
        </button>
        <p class="google-login__error" id="google-login-error" hidden></p>
        <p class="google-login__domain-note">${t('auth.onlyGlobant')}</p>
      </div>
    </div>
  `;

  main.style.removeProperty('display');

  // Listen for server-side denial (deactivated account, session restore denied)
  const accessDeniedHandler = () => {
    const errorEl = document.getElementById('google-login-error');
    const btn = document.getElementById('google-signin-btn');
    if (!errorEl) return;
    errorEl.innerHTML = t('auth.accessDenied');
    errorEl.hidden = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
        </svg>
        ${t('auth.continueGoogle')}
      `;
    }
    window.removeEventListener('ams:access-denied', accessDeniedHandler);
  };
  window.addEventListener('ams:access-denied', accessDeniedHandler);

  document.getElementById('google-signin-btn').addEventListener('click', async () => {
    const btn = document.getElementById('google-signin-btn');
    const errorEl = document.getElementById('google-login-error');

    btn.disabled = true;
    btn.textContent = t('auth.signingIn');
    errorEl.hidden = true;

    try {
      const user = await signInWithGoogle();
      onSuccess(user);
    } catch (err) {
      const isAccessDenied = err.message?.includes('autorizada') || err.message?.includes('authorized');
      if (isAccessDenied) {
        errorEl.innerHTML = t('auth.accessDenied');
      } else {
        errorEl.textContent = err.message || t('auth.error');
      }
      errorEl.hidden = false;
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
        </svg>
        ${t('auth.continueGoogle')}
      `;
    }
  });
}

/**
 * Removes the Google login screen and restores app chrome.
 */
export function removeGoogleLoginView() {
  document.getElementById('app-header')?.style.removeProperty('display');
  document.getElementById('app-nav')?.style.removeProperty('display');
  document.getElementById('alerts-panel')?.style.removeProperty('display');
  document.getElementById('app-footer')?.style.removeProperty('display');
}
