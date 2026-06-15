/**
 * Firebase Auth — Google Sign-In gate for AMS Integration Tracker.
 *
 * Dos capas de seguridad:
 * 1. Solo cuentas @globant.com (hd restriction en el provider)
 * 2. Whitelist de emails en Firebase Realtime Database (allowedUsers/)
 *
 * Si el email no está en el whitelist → se deniega el acceso y se cierra sesión.
 * Si RTDB no está disponible → fallback a solo restricción de dominio.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, get, set, remove } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const ALLOWED_DOMAIN = 'globant.com';

const firebaseConfig = {
  apiKey: 'AIzaSyD9PPvxlPrj3QqHPUxrtHf1UK9Zd2-xeeE',
  authDomain: 'prj-istsecintegration-gp-5s.firebaseapp.com',
  projectId: 'prj-istsecintegration-gp-5s',
  storageBucket: 'prj-istsecintegration-gp-5s.firebasestorage.app',
  messagingSenderId: '78101730886',
  appId: '1:78101730886:web:286fd3d276a2bf8eac9c47',
  databaseURL: 'https://prj-istsecintegration-gp-5s-default-rtdb.firebaseio.com',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ hd: ALLOWED_DOMAIN });
provider.addScope('https://www.googleapis.com/auth/gmail.send');

/** @type {object|null} Current Firebase user */
let currentGoogleUser = null;

/** @type {string|null} Role of the currently signed-in user */
let currentUserRole = null;

/** @type {string|null} Google OAuth access token (includes Gmail send scope) */
let googleAccessToken = sessionStorage.getItem('gat') ?? null;

export function getGoogleAccessToken() {
  return googleAccessToken;
}

/**
 * Codifica un email como clave de RTDB.
 * Reemplaza '.' → ',' y '@' → '_at_' para evitar caracteres inválidos.
 * @param {string} email
 * @returns {string}
 */
function encodeEmail(email) {
  return email.replace(/\./g, ',').replace('@', '_at_');
}

/**
 * Verifica si un email está en el whitelist de RTDB.
 * Retorna:
 *   'allowed'     → el email está en el whitelist y active = true
 *   'denied'      → el email NO está en el whitelist (RTDB disponible)
 *   'unavailable' → RTDB no responde → fallback a solo dominio
 *
 * @param {string} email
 * @returns {Promise<'allowed'|'denied'|'unavailable'>}
 */
async function checkWhitelist(email) {
  try {
    const key = encodeEmail(email);
    const snapshot = await get(ref(db, `allowedUsers/${key}`));
    if (!snapshot.exists()) return { status: 'denied', role: null };
    const data = snapshot.val();
    if (data && data.active === false) return { status: 'denied', role: null };
    return { status: 'allowed', role: data?.role ?? 'Viewer' };
  } catch {
    console.warn('[AMS Auth] Whitelist no disponible, usando solo restricción de dominio.');
    return { status: 'unavailable', role: null };
  }
}

/**
 * Returns the currently signed-in Google user, or null.
 * @returns {object|null}
 */
export function getGoogleUser() {
  return currentGoogleUser;
}

/**
 * Triggers Google Sign-In popup.
 * Lanza error si la cuenta no es @globant.com o no está en el whitelist.
 */
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  googleAccessToken = credential?.accessToken ?? null;
  if (googleAccessToken) sessionStorage.setItem('gat', googleAccessToken);
  const user = result.user;
  const email = user.email;

  // Capa 1: restricción de dominio
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    await signOut(auth);
    throw new Error(`Solo se permiten cuentas @${ALLOWED_DOMAIN}`);
  }

  // Capa 2: whitelist
  const whitelistResult = await checkWhitelist(email);
  if (whitelistResult.status === 'denied') {
    await signOut(auth);
    throw new Error('Tu cuenta no está autorizada para acceder a esta aplicación. Contactá a tu administrador.');
  }
  currentUserRole = whitelistResult.role;
  return user;
}

/**
 * Signs out the current user.
 */
export async function signOutGoogle() {
  googleAccessToken = null;
  sessionStorage.removeItem('gat');
  await signOut(auth);
}

/**
 * Returns a Firebase ID token for the current user.
 * Triggers Google Sign-In popup if not already signed in.
 * @returns {Promise<string>} Firebase ID token
 */
export async function getFirebaseIdToken() {
  if (auth.currentUser) {
    return auth.currentUser.getIdToken();
  }
  const user = await signInWithGoogle();
  return user.getIdToken();
}

/** Returns the role of the currently signed-in user: 'Admin', 'Viewer', or null. */
export function getUserRole() {
  return currentUserRole;
}

/** True if the current user is an Admin. */
export function isAdmin() {
  return currentUserRole === 'Admin';
}

/** List all entries in allowedUsers (admin use). */
export async function listAllowedUsers() {
  const snapshot = await get(ref(db, 'allowedUsers'));
  if (!snapshot.exists()) return [];
  const raw = snapshot.val();
  return Object.entries(raw).map(([key, val]) => ({
    key,
    email: val.email ?? '',
    role: val.role ?? 'Viewer',
    active: val.active !== false,
    addedBy: val.addedBy ?? null,
    addedAt: val.addedAt ?? null,
  })).sort((a, b) => a.email.localeCompare(b.email));
}

/**
 * Create or update a user in allowedUsers.
 * @param {string} email
 * @param {'Admin'|'Viewer'} role
 * @param {boolean} active
 */
export async function saveAllowedUser(email, role, active = true) {
  const key = encodeEmail(email.toLowerCase().trim());
  await set(ref(db, `allowedUsers/${key}`), {
    email: email.toLowerCase().trim(),
    role,
    active,
    addedBy: auth.currentUser?.email ?? 'unknown',
    addedAt: new Date().toISOString().slice(0, 10),
  });
}

/**
 * Permanently delete a user from allowedUsers.
 * @param {string} key — the encoded key (as returned by listAllowedUsers)
 */
export async function deleteAllowedUser(key) {
  await remove(ref(db, `allowedUsers/${key}`));
}

/**
 * Llama al callback cuando cambia el estado de auth.
 * Resuelve una vez con el estado inicial (user o null).
 * Verifica el whitelist en cada restauración de sesión.
 *
 * @param {(user: object|null) => void} onChange
 * @returns {Promise<object|null>} Usuario inicial
 */
export function waitForAuthState(onChange) {
  return new Promise((resolve) => {
    let initialResolved = false;

    const done = (user) => {
      currentGoogleUser = user;
      onChange(user);
      if (!initialResolved) {
        initialResolved = true;
        resolve(user);
      }
    };

    onAuthStateChanged(auth, async (user) => {
      // Sin sesión activa
      if (!user) {
        currentUserRole = null;
        done(null);
        return;
      }

      // Capa 1: dominio
      if (!user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await signOut(auth);
        window.dispatchEvent(new CustomEvent('ams:access-denied', { detail: { email: user.email } }));
        return;
      }

      // Capa 2: whitelist (también al restaurar sesión)
      const whitelistResult = await checkWhitelist(user.email);
      if (whitelistResult.status === 'denied') {
        await signOut(auth);
        window.dispatchEvent(new CustomEvent('ams:access-denied', { detail: { email: user.email } }));
        return;
      }
      currentUserRole = whitelistResult.role;
      done(user);
    });
  });
}
