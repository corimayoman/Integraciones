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
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

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

/** @type {object|null} Current Firebase user */
let currentGoogleUser = null;

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
    if (!snapshot.exists()) return 'denied';
    const data = snapshot.val();
    // Verificar que esté activo (si tiene campo active = false, denegar)
    if (data && data.active === false) return 'denied';
    return 'allowed';
  } catch {
    console.warn('[AMS Auth] Whitelist no disponible, usando solo restricción de dominio.');
    return 'unavailable';
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
  const user = result.user;
  const email = user.email;

  // Capa 1: restricción de dominio
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    await signOut(auth);
    throw new Error(`Solo se permiten cuentas @${ALLOWED_DOMAIN}`);
  }

  // Capa 2: whitelist
  const whitelistResult = await checkWhitelist(email);
  if (whitelistResult === 'denied') {
    await signOut(auth);
    throw new Error('Tu cuenta no está autorizada para acceder a esta aplicación. Contactá a tu administrador.');
  }

  return user;
}

/**
 * Signs out the current user.
 */
export async function signOutGoogle() {
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
        done(null);
        return;
      }

      // Capa 1: dominio
      if (!user.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await signOut(auth);
        return;
      }

      // Capa 2: whitelist (también al restaurar sesión)
      const whitelistResult = await checkWhitelist(user.email);
      if (whitelistResult === 'denied') {
        await signOut(auth);
        return;
      }

      done(user);
    });
  });
}
