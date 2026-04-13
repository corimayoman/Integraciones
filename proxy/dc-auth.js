const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'dc-default-secret-change-me';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';
const SALT_ROUNDS = 10;

/**
 * Hashea una contraseña con bcrypt.
 * @param {string} password
 * @returns {string} Hash bcrypt
 */
function hashPassword(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/**
 * Verifica una contraseña contra un hash bcrypt.
 * @param {string} password
 * @param {string} hash
 * @returns {boolean}
 */
function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

/**
 * Genera un JWT para un usuario autenticado.
 * @param {{ id: number, username: string, role: string|null }} user
 * @returns {string} Token JWT
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
}

/**
 * Factory que crea el middleware de autenticación JWT con acceso a la DB.
 * Valida el token, verifica que el usuario siga activo, y adjunta req.user.
 * @param {import('better-sqlite3').Database} db
 * @returns {Function} Express middleware
 */
function createAuthMiddleware(db) {
  return function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
    }

    const token = authHeader.slice(7);

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
    }

    // Check user is still active in the database
    const user = db.prepare('SELECT id, username, role, active FROM users WHERE id = ?').get(decoded.id);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
    }

    if (!user.active) {
      return res.status(403).json({ ok: false, error: 'Usuario desactivado' });
    }

    req.user = { id: user.id, username: user.username, role: user.role };
    next();
  };
}

/**
 * Middleware que verifica que el usuario tenga Rol_Admin.
 * Debe usarse después de authMiddleware.
 */
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Se requiere rol de administrador' });
  }
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  createAuthMiddleware,
  adminOnly,
  JWT_SECRET,
  JWT_EXPIRATION,
};
