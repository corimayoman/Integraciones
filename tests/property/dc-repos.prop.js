/**
 * Property-based tests for repository layer (company, user, sheet, assignment repos).
 * Validates: Properties 1, 7, 19
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';

const Database = (await import('better-sqlite3')).default;
const { runMigrations } = await import('../../proxy/dc-database.js');
const { hashPassword } = await import('../../proxy/dc-auth.js');
const companyRepo = await import('../../proxy/dc-company-repo.js');
const userRepo = await import('../../proxy/dc-user-repo.js');
const assignmentRepo = await import('../../proxy/dc-assignment-repo.js');
const sheetRepo = await import('../../proxy/dc-sheet-repo.js');

import {
  dcCompanyNameArb,
  dcUsernameArb,
  dcPasswordArb,
  dcRoleArb,
  dcAppsRowArb,
  dcComplianceRowArb,
  dcQuestionnaireRowArb,
  dcQuestionnaireSheetIdArb,
} from './dc-generators.js';

let db;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
});

afterEach(() => {
  db.close();
});

// Feature: data-collection-module, Property 1: CRUD Round-Trip
describe('Property 1: CRUD Round-Trip', () => {
  it('company create + findById returns equivalent data', () => {
    fc.assert(
      fc.property(dcCompanyNameArb, (name) => {
        // Ensure unique name
        const existing = db.prepare('SELECT id FROM companies WHERE name = ?').get(name);
        if (existing) return; // skip duplicates

        const created = companyRepo.create(db, { name });
        expect(created.id).toBeGreaterThan(0);
        expect(created.name).toBe(name);

        const fetched = companyRepo.findById(db, created.id);
        expect(fetched).toBeDefined();
        expect(fetched.name).toBe(name);
        expect(fetched.id).toBe(created.id);
      }),
      { numRuns: 100 }
    );
  });

  it('user create + findById returns equivalent data', () => {
    // Pre-compute a single hash to avoid bcrypt overhead per iteration
    const passwordHash = hashPassword('static-password');
    fc.assert(
      fc.property(dcUsernameArb, (username) => {
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) return;

        const created = userRepo.create(db, { name: username, username, passwordHash });
        expect(created.id).toBeGreaterThan(0);
        expect(created.username).toBe(username);

        const fetched = userRepo.findById(db, created.id);
        expect(fetched).toBeDefined();
        expect(fetched.username).toBe(username);
        expect(fetched.name).toBe(username);
      }),
      { numRuns: 100 }
    );
  });

  it('apps row create + getRow returns equivalent data', () => {
    const co = companyRepo.create(db, { name: 'AppsTestCo' });
    fc.assert(
      fc.property(dcAppsRowArb, (rowData) => {
        const created = sheetRepo.addRow(db, co.id, 'apps', rowData);
        expect(created.id).toBeGreaterThan(0);
        const fetched = sheetRepo.getRow(db, co.id, 'apps', created.id);
        expect(fetched).toBeDefined();
        // Verify all provided fields match
        for (const [key, value] of Object.entries(rowData)) {
          expect(fetched[key]).toBe(value);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('compliance row create + getRow returns equivalent data', () => {
    const co = companyRepo.create(db, { name: 'ComplianceTestCo' });
    fc.assert(
      fc.property(dcComplianceRowArb, (rowData) => {
        const created = sheetRepo.addRow(db, co.id, 'compliance', rowData);
        expect(created.id).toBeGreaterThan(0);
        const fetched = sheetRepo.getRow(db, co.id, 'compliance', created.id);
        expect(fetched).toBeDefined();
        for (const [key, value] of Object.entries(rowData)) {
          expect(fetched[key]).toBe(value);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('questionnaire row create + getRow returns equivalent data', () => {
    const co = companyRepo.create(db, { name: 'QuestionnaireTestCo' });
    fc.assert(
      fc.property(dcQuestionnaireSheetIdArb, dcQuestionnaireRowArb, (sheetId, rowData) => {
        const created = sheetRepo.addRow(db, co.id, sheetId, rowData);
        expect(created.id).toBeGreaterThan(0);
        expect(created.sheet_id).toBe(sheetId);
        const fetched = sheetRepo.getRow(db, co.id, sheetId, created.id);
        expect(fetched).toBeDefined();
        expect(fetched.question).toBe(rowData.question);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: data-collection-module, Property 7: Many-to-Many Assignments
describe('Property 7: Asignaciones Muchos-a-Muchos', () => {
  it('multiple assignments between users and companies are independently recoverable', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 4 }),
        fc.integer({ min: 2, max: 4 }),
        (numUsers, numCompanies) => {
          // Fresh DB for each run
          const localDb = new Database(':memory:');
          localDb.pragma('journal_mode = WAL');
          localDb.pragma('foreign_keys = ON');
          runMigrations(localDb);

          // Use a single pre-computed hash to avoid bcrypt overhead
          const hash = hashPassword('pass');

          const users = [];
          for (let i = 0; i < numUsers; i++) {
            const u = userRepo.create(localDb, { name: `User${i}`, username: `user_m2m_${i}_${Date.now()}_${Math.random()}`, passwordHash: hash });
            users.push(u);
          }

          const companies = [];
          for (let i = 0; i < numCompanies; i++) {
            const c = companyRepo.create(localDb, { name: `Company_m2m_${i}_${Date.now()}_${Math.random()}` });
            companies.push(c);
          }

          // Assign each user to each company with a role
          for (const u of users) {
            for (const c of companies) {
              const role = Math.random() > 0.5 ? 'empresa' : 'globant';
              assignmentRepo.create(localDb, { userId: u.id, companyId: c.id, role });
            }
          }

          // Verify each user's assignments
          for (const u of users) {
            const userAssignments = assignmentRepo.findByUser(localDb, u.id);
            expect(userAssignments.length).toBe(numCompanies);
          }

          // Verify each company's assignments
          for (const c of companies) {
            const companyAssignments = assignmentRepo.findByCompany(localDb, c.id);
            expect(companyAssignments.length).toBe(numUsers);
          }

          localDb.close();
        }
      ),
      // Each run creates a fresh DB + bcrypt hash, so limit runs
      { numRuns: 15 }
    );
  }, 30_000);
});

// Feature: data-collection-module, Property 19: All Records Have Valid Timestamps
describe('Property 19: Todos los Registros Tienen Timestamps Válidos', () => {
  function isValidTimestamp(ts) {
    if (typeof ts !== 'string') return false;
    const d = new Date(ts);
    return !isNaN(d.getTime());
  }

  it('companies have valid created_at and updated_at', () => {
    fc.assert(
      fc.property(dcCompanyNameArb, (name) => {
        const existing = db.prepare('SELECT id FROM companies WHERE name = ?').get(name);
        if (existing) return;

        const created = companyRepo.create(db, { name });
        expect(isValidTimestamp(created.created_at)).toBe(true);
        expect(isValidTimestamp(created.updated_at)).toBe(true);
        expect(new Date(created.updated_at) >= new Date(created.created_at)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('users have valid created_at and updated_at', () => {
    const hash = hashPassword('static-password');
    fc.assert(
      fc.property(dcUsernameArb, (username) => {
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existing) return;

        const created = userRepo.create(db, { name: username, username, passwordHash: hash });
        expect(isValidTimestamp(created.created_at)).toBe(true);
        expect(isValidTimestamp(created.updated_at)).toBe(true);
        expect(new Date(created.updated_at) >= new Date(created.created_at)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('sheet rows have valid created_at and updated_at', () => {
    const co = companyRepo.create(db, { name: 'TimestampTestCo' });
    fc.assert(
      fc.property(dcAppsRowArb, (rowData) => {
        const created = sheetRepo.addRow(db, co.id, 'apps', rowData);
        expect(isValidTimestamp(created.created_at)).toBe(true);
        expect(isValidTimestamp(created.updated_at)).toBe(true);
        expect(new Date(created.updated_at) >= new Date(created.created_at)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
