const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

/**
 * Inicializa la conexión SQLite y crea el esquema si no existe.
 * @param {string} dbPath - Ruta al archivo de base de datos
 * @returns {Database} Instancia de better-sqlite3
 */
function initDatabase(dbPath = './data-collection.db') {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

/**
 * Ejecuta la migración inicial: crea todas las tablas y el usuario admin por defecto.
 * @param {Database} db
 */
function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin')) DEFAULT NULL,
      active INTEGER DEFAULT 1 CHECK(active IN (0, 1)),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_company_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('empresa', 'globant')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, company_id, role)
    );

    CREATE TABLE IF NOT EXISTS apps_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      app_id TEXT,
      manufacturer TEXT,
      app_name TEXT,
      used_for TEXT,
      license_group TEXT,
      license_level TEXT,
      num_users INTEGER,
      cost_monthly REAL,
      end_date TEXT,
      subscription_path TEXT,
      renewal_path TEXT,
      cancellation_path TEXT,
      information_type TEXT CHECK(information_type IN ('Public', 'Confidential', 'Sensitive', 'High Sensitive') OR information_type IS NULL),
      sso TEXT CHECK(sso IN ('Yes', 'No') OR sso IS NULL),
      owner TEXT,
      project_or_corporate TEXT,
      globant_studio TEXT,
      eligible TEXT CHECK(eligible IN ('Y', 'N') OR eligible IS NULL),
      gist_approval TEXT,
      action TEXT,
      comments TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS compliance_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      norm_certification TEXT,
      scope TEXT,
      issued_by TEXT,
      issued_on TEXT,
      due_date TEXT,
      impact_on TEXT,
      associated_cost TEXT,
      renewal_period TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS questionnaire_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      sheet_id TEXT NOT NULL CHECK(sheet_id IN ('infrastructure', 'it_experience', 'mst', 'building_security')),
      category TEXT,
      question_id TEXT,
      phase_stage TEXT,
      type TEXT,
      question TEXT NOT NULL,
      company_answer TEXT,
      globant_comments TEXT,
      globant_owner TEXT,
      due_date TEXT,
      additional_comments TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS endpoints_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      endpoint_id TEXT,
      user_login TEXT,
      full_name TEXT,
      gut_email TEXT,
      globant_email TEXT,
      area TEXT,
      endpoint_type TEXT,
      manufacturer TEXT,
      model TEXT,
      serial_number TEXT,
      rented_owned TEXT,
      processor TEXT,
      ram TEXT,
      disk_space TEXT,
      year_model TEXT,
      operative_system TEXT,
      supports_windows_11 TEXT,
      supports_ventura_above TEXT,
      reimage_replace TEXT,
      comments_onboard TEXT,
      mac_big_sur_supported TEXT,
      windows_10_supported TEXT,
      warranty_end_date TEXT,
      purchase_date TEXT,
      comments TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Triggers para updated_at automático
    CREATE TRIGGER IF NOT EXISTS trg_companies_updated AFTER UPDATE ON companies
    BEGIN UPDATE companies SET updated_at = datetime('now') WHERE id = NEW.id; END;

    CREATE TRIGGER IF NOT EXISTS trg_users_updated AFTER UPDATE ON users
    BEGIN UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id; END;

    CREATE TRIGGER IF NOT EXISTS trg_apps_updated AFTER UPDATE ON apps_data
    BEGIN UPDATE apps_data SET updated_at = datetime('now') WHERE id = NEW.id; END;

    CREATE TRIGGER IF NOT EXISTS trg_compliance_updated AFTER UPDATE ON compliance_data
    BEGIN UPDATE compliance_data SET updated_at = datetime('now') WHERE id = NEW.id; END;

    CREATE TRIGGER IF NOT EXISTS trg_questionnaire_updated AFTER UPDATE ON questionnaire_data
    BEGIN UPDATE questionnaire_data SET updated_at = datetime('now') WHERE id = NEW.id; END;

    CREATE TRIGGER IF NOT EXISTS trg_endpoints_updated AFTER UPDATE ON endpoints_data
    BEGIN UPDATE endpoints_data SET updated_at = datetime('now') WHERE id = NEW.id; END;
  `);

  // Crear usuario admin por defecto si no existe
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      'INSERT INTO users (name, username, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('Administrador', 'admin', passwordHash, 'admin');
  }
}

module.exports = { initDatabase, runMigrations };
