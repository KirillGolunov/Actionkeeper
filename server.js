require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const handlebars = require('handlebars');
const { endOfNextWeekSession, endOfWeekSession, getWeekProgress } = require('./weeklyProgress');

const app = express();
app.set('trust proxy', true);
let setupRequired = false;
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

const normalizeBaseUrl = (url = '') => (url ? url.replace(/\/+$/, '') : '');
const resolveAppBaseUrl = (req) => {
  const envBase = normalizeBaseUrl(process.env.APP_BASE_URL);
  const originHeader = req.headers.origin;
  const origin = normalizeBaseUrl(Array.isArray(originHeader) ? originHeader[0] : originHeader);

  if (
    envBase &&
    (
      process.env.NODE_ENV !== 'production' ||
      !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(envBase)
    )
  ) {
    return envBase;
  }

  if (origin) {
    return origin;
  }

  if (envBase) {
    return envBase;
  }

  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
  const protocol = proto || (req.secure ? 'https' : req.protocol || 'http');

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host) {
    return normalizeBaseUrl(`${protocol}://${host}`);
  }

  return 'http://localhost:3000';
};

const apiErrors = {
  setupCheckFailed: { errorCode: 'setup.check_failed', error: 'Failed to verify setup state.' },
  setupRequired: { errorCode: 'setup.required', error: 'Initial setup required. Visit /setup.' },
  authHeaderMissing: { errorCode: 'auth.missing_authorization_header', error: 'Missing or invalid Authorization header' },
  authTokenInvalid: { errorCode: 'auth.invalid_or_expired_token', error: 'Invalid or expired token' },
  authSessionNotFound: { errorCode: 'auth.session_not_found', error: 'Session not found' },
  authSessionExpired: { errorCode: 'auth.session_expired', error: 'Session expired' },
  authSessionValidationFailed: { errorCode: 'auth.session_validation_failed', error: 'Failed to validate session' },
  invitationEmailRequired: { errorCode: 'invitations.email_required', error: 'Email is required.' },
  smtpNotConfigured: { errorCode: 'smtp.not_configured', error: 'SMTP settings are not configured.' },
  invitationSendFailed: { errorCode: 'invitations.send_failed', error: 'Failed to send invitation email.' },
  invitationInvalid: { errorCode: 'invitations.invalid_or_expired', error: 'Invalid or expired invitation.' },
  invitationNameSurnameRequired: { errorCode: 'invitations.name_surname_required', error: 'Name and surname are required.' },
  magicLinkEmailRequired: { errorCode: 'auth.email_required', error: 'Email is required.' },
  magicLinkRateLimited: { errorCode: 'auth.magic_link_rate_limited', error: 'Please wait {{secondsLeft}}s before requesting another magic link.' },
  magicLinkUserNotFound: { errorCode: 'auth.user_not_found', error: 'No active user found with this email.' },
  magicLinkSendFailed: { errorCode: 'auth.magic_link_send_failed', error: 'Failed to send magic link.' },
  magicLinkInvalid: { errorCode: 'auth.magic_link_invalid', error: 'Invalid or expired link.' },
  magicLinkUsed: { errorCode: 'auth.magic_link_used', error: 'This link has already been used.' },
  magicLinkExpired: { errorCode: 'auth.magic_link_expired', error: 'This link has expired.' },
  authUserNotFound: { errorCode: 'auth.user_not_found_or_deleted', error: 'User not found or deleted.' },
  authSessionCreateFailed: { errorCode: 'auth.session_create_failed', error: 'Failed to create session.' },
  authSessionStatusFailed: { errorCode: 'auth.session_status_failed', error: 'Failed to load session status.' },
  authLogoutFailed: { errorCode: 'auth.logout_failed', error: 'Failed to logout.' },
  setupCompleted: { errorCode: 'setup.already_completed', error: 'Setup already completed.' },
  setupMissingFields: { errorCode: 'setup.missing_required_fields', error: 'Missing required fields.' },
  setupSmtpRequired: { errorCode: 'setup.smtp_required_in_production', error: 'SMTP settings are required in production.' },
  setupAdminExists: { errorCode: 'setup.admin_already_exists', error: 'Admin already exists. Please sign in.' },
  usersNotFound: { errorCode: 'users.not_found', error: 'User not found' },
  usersNoFieldsToUpdate: { errorCode: 'users.no_fields_to_update', error: 'No fields to update.' },
  clientsNotFound: { errorCode: 'clients.not_found', error: 'Client not found' },
  clientsDuplicate: { errorCode: 'clients.duplicate', error: 'A client with this {{reason}} already exists.' },
  projectsDuplicateName: { errorCode: 'projects.duplicate_name', error: 'A project with this name already exists.' },
  projectsDuplicateCode: { errorCode: 'projects.duplicate_code', error: 'A project with this code already exists.' },
  projectsCategoryRequired: { errorCode: 'projects.category_required', error: 'Project category is required.' },
  projectsCategoryInvalid: { errorCode: 'projects.category_invalid', error: 'Project category is invalid.' },
  projectsNoFieldsToUpdate: { errorCode: 'projects.no_fields_to_update', error: 'No fields to update.' },
  projectsNotFound: { errorCode: 'projects.not_found', error: 'Project not found' },
  timeEntriesDuplicate: { errorCode: 'time_entries.duplicate', error: 'Duplicate time entry for this user, project, and day.' },
  timeEntriesNoFieldsToUpdate: { errorCode: 'time_entries.no_fields_to_update', error: 'No fields to update.' },
  timeEntriesNotFound: { errorCode: 'time_entries.not_found', error: 'Time entry not found' },
  timeEntriesWeekRequired: { errorCode: 'time_entries.week_required', error: 'user_id, project_id, and week_start are required' },
  timeEntriesNoEntries: { errorCode: 'time_entries.no_entries', error: 'No entries provided.' },
  adminForbidden: { errorCode: 'admin.forbidden', error: 'Only administrators can perform this action.' },
  financialForbidden: { errorCode: 'financial.forbidden', error: 'Only administrators can manage financial data.' },
  ratesValidationFailed: { errorCode: 'rates.validation_failed', error: '{{message}}' },
  ratesOverlap: { errorCode: 'rates.overlap', error: 'Rate periods cannot overlap for the same user.' },
  ratesUserNotFound: { errorCode: 'rates.user_not_found', error: 'User not found.' },
  ratesNotFound: { errorCode: 'rates.not_found', error: 'Rate not found.' },
  smtpIncomplete: { errorCode: 'smtp.incomplete', error: 'SMTP settings are incomplete.' },
  smtpForbidden: { errorCode: 'smtp.forbidden', error: 'Only administrators can manage SMTP settings.' },
  smtpSaveFailed: { errorCode: 'smtp.save_failed', error: 'Failed to save SMTP settings.' },
  uploadNoFile: { errorCode: 'upload.no_file', error: 'No file uploaded' },
};

const PROJECT_CATEGORIES = [
  'external_delivery',
  'internal_project',
  'operations',
  'people_development',
  'time_off',
];
const PROJECT_CATEGORY_TRANSITION = 'unclassified';
const PROJECT_CATEGORY_VALUES = [...PROJECT_CATEGORIES, PROJECT_CATEGORY_TRANSITION];

function formatApiError(template, params = {}) {
  return Object.entries(params).reduce((message, entry) => {
    const key = entry[0];
    const value = entry[1];
    return message.replace(new RegExp('{{' + key + '}}', 'g'), String(value));
  }, template);
}

function sendApiError(res, status, errorKey, params = {}, extra = {}) {
  const definition = apiErrors[errorKey];
  if (!definition) {
    return res.status(status).json({ errorCode: 'unknown', error: 'Unknown error', ...extra });
  }

  return res.status(status).json({
    errorCode: definition.errorCode,
    error: formatApiError(definition.error, params),
    ...extra,
  });
}

function formatDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getAnalyticsRangeBounds(range, anchorDateValue = null) {
  if (range === 'all') {
    return { startDate: null, endDate: null };
  }

  const anchorDate = anchorDateValue ? new Date(anchorDateValue) : new Date();
  const now = new Date();
  const safeAnchor = Number.isNaN(anchorDate.getTime()) ? now : anchorDate;
  const start = new Date(safeAnchor);
  const end = new Date(safeAnchor);

  if (range === 'week') {
    const day = start.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + offset);
    end.setDate(start.getDate() + 6);
  } else if (range === 'month') {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 0);
  } else if (range === 'quarter') {
    const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
    start.setMonth(quarterStartMonth, 1);
    end.setMonth(quarterStartMonth + 3, 0);
  } else if (range === 'year') {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  } else {
    return { startDate: null, endDate: null };
  }

  if (end > now) {
    end.setTime(now.getTime());
  }

  return {
    startDate: formatDateOnly(start),
    endDate: formatDateOnly(end),
  };
}

function normalizeProjectCategory(category) {
  if (typeof category !== 'string') return '';
  return category.trim().toLowerCase();
}

function isValidProjectCategory(category) {
  return PROJECT_CATEGORY_VALUES.includes(normalizeProjectCategory(category));
}
// Setup-required middleware (must be before all API/static routes)
const setupBypassPaths = new Set([
  '/api/setup',
  '/api/smtp-test',
  '/api/env',
  '/api/setup-required'
]);

app.use(async (req, res, next) => {
  try {
    await checkFirstRun();
  } catch (err) {
    console.error('[Setup] Failed to evaluate setup state:', err);
    return sendApiError(res, 500, 'setupCheckFailed');
  }

  const isBypassed = setupBypassPaths.has(req.path) || req.path.startsWith('/api/auth/');
  if (setupRequired && req.path.startsWith('/api') && !isBypassed) {
    return sendApiError(res, 403, 'setupRequired');
  }
  next();
});

// Database connection
const dbPath = process.env.DB_PATH || './data/time_tracker.db';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// SMTP settings
const SMTP_SETTINGS_FILE = path.join(__dirname, 'data', 'smtp_settings.json');

function normalizeSmtpSettings(raw = {}) {
  const parsedPort = Number.parseInt(raw.port, 10);
  return {
    host: typeof raw.host === 'string' ? raw.host.trim() : '',
    port: Number.isNaN(parsedPort) ? NaN : parsedPort,
    auth: {
      user: typeof raw.auth?.user === 'string' ? raw.auth.user.trim() : '',
      pass: typeof raw.auth?.pass === 'string' ? raw.auth.pass : '',
    },
    from: typeof raw.from === 'string' ? raw.from.trim() : '',
    secure: raw.secure === true || raw.secure === 'true' || raw.secure === '1',
  };
}

function isCompleteSmtpSettings(settings) {
  return Boolean(
    settings &&
    settings.host &&
    settings.port >= 1 &&
    settings.port <= 65535 &&
    settings.auth &&
    settings.auth.user &&
    settings.auth.pass &&
    settings.from
  );
}

function loadSmtpSettingsFromEnv() {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
  if (!required.every((key) => process.env[key])) {
    return {};
  }

  return normalizeSmtpSettings({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.SMTP_FROM,
    secure: process.env.SMTP_SECURE,
  });
}

// Helper to load SMTP settings. Runtime settings have priority over .env.
function loadSmtpSettings() {
  if (fs.existsSync(SMTP_SETTINGS_FILE)) {
    try {
      const data = fs.readFileSync(SMTP_SETTINGS_FILE, 'utf8');
      const settings = normalizeSmtpSettings(JSON.parse(data));
      if (isCompleteSmtpSettings(settings)) {
        return settings;
      }
      console.warn('[SMTP] Runtime SMTP settings are incomplete; falling back to environment settings.');
    } catch (e) {
      console.error('[SMTP] Failed to read or parse runtime SMTP settings:', e);
    }
  }

  return loadSmtpSettingsFromEnv();
}

function toPublicSmtpSettings(settings) {
  const user = settings.auth?.user || '';
  return {
    host: settings.host || '',
    port: settings.port || 587,
    user,
    pass: '',
    auth: {
      user,
      pass: '',
    },
    from: settings.from || '',
    secure: !!settings.secure,
    hasPassword: !!settings.auth?.pass,
  };
}

function buildSmtpSettingsFromBody(body = {}, existing = {}) {
  const rawPass = typeof body.pass === 'string' ? body.pass : (typeof body.auth?.pass === 'string' ? body.auth.pass : '');
  return normalizeSmtpSettings({
    host: body.host,
    port: body.port,
    auth: {
      user: body.user || body.auth?.user,
      pass: rawPass || existing.auth?.pass || '',
    },
    from: body.from,
    secure: body.secure,
  });
}

function validateSmtpSettings(settings) {
  return isCompleteSmtpSettings(settings);
}

// Helper to save SMTP settings
function saveSmtpSettings(settings) {
  fs.mkdirSync(path.dirname(SMTP_SETTINGS_FILE), { recursive: true });
  const tempFile = `${SMTP_SETTINGS_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(settings, null, 2), 'utf8');
  fs.renameSync(tempFile, SMTP_SETTINGS_FILE);
  console.log('[SMTP] Runtime settings saved:', {
    host: settings.host,
    port: settings.port,
    user: settings.auth?.user,
    from: settings.from,
    secure: settings.secure,
    hasPassword: !!settings.auth?.pass,
  });
}

// Helper to check if at least one admin user exists
async function checkAdminUserExists() {
  return new Promise((resolve) => {
    db.get('SELECT COUNT(*) as count FROM users WHERE role = ? AND deleted = 0', ['admin'], (err, row) => {
      if (err || !row || row.count === 0) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// Function to load fixtures - now just creates tables
async function loadFixtures() {
  console.log('Checking if tables exist...');
  await createTables();
  await createInvitationsTable();
  await createMagicLinksTable();
  await createAuthSessionsTable();
  console.log('Tables verified');
}

// Create tables
async function createTables() {
  console.log('Creating tables...');
  
  // Create users table
  await new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      surname TEXT,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating users table:', err);
        reject(err);
      } else {
        console.log('Users table created or already exists');
        resolve();
      }
    });
  });

  // Migration: add surname column if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE users ADD COLUMN surname TEXT`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Create clients table
  await new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('internal', 'external')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating clients table:', err);
        reject(err);
      } else {
        console.log('Clients table created or already exists');
        resolve();
      }
    });
  });

  // Create projects table
  await new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      client_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      category TEXT NOT NULL DEFAULT 'unclassified',
      FOREIGN KEY (client_id) REFERENCES clients (id)
    )`, (err) => {
      if (err) {
        console.error('Error creating projects table:', err);
        reject(err);
      } else {
        console.log('Projects table created or already exists');
        resolve();
      }
    });
  });

  // Create time entries table
  await new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      hours REAL NOT NULL,
      description TEXT,
      submission_time DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`, (err) => {
      if (err) {
        console.error('Error creating time_entries table:', err);
        reject(err);
      } else {
        console.log('Time entries table created or already exists');
        resolve();
      }
    });
  });

  // Create user rate history table. Rates are intentionally separate from users
  // so confidential financial data never leaks through regular user APIs.
  await new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS user_rate_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      rate_rub_per_hour INTEGER NOT NULL CHECK(rate_rub_per_hour >= 0),
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (created_by) REFERENCES users (id)
    )`, (err) => {
      if (err) {
        console.error('Error creating user_rate_history table:', err);
        reject(err);
      } else {
        console.log('User rate history table created or already exists');
        resolve();
      }
    });
  });

  // Migration: add date and hours columns if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE time_entries ADD COLUMN date TEXT`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE time_entries ADD COLUMN hours REAL`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Migration: add active column if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE projects ADD COLUMN active INTEGER DEFAULT 1`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Migration: add code column if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE projects ADD COLUMN code TEXT`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Migration: add category column if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE projects ADD COLUMN category TEXT NOT NULL DEFAULT 'unclassified'`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Migration: backfill missing categories for older projects
  await new Promise((resolve, reject) => {
    db.run(
      `UPDATE projects
       SET category = ?
       WHERE category IS NULL OR TRIM(category) = ''`,
      [PROJECT_CATEGORY_TRANSITION],
      err => {
        if (err) reject(err); else resolve();
      }
    );
  });

  // Migration: add itn column if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE clients ADD COLUMN itn TEXT`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Migration: add deleted column if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE users ADD COLUMN deleted INTEGER DEFAULT 0`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Migration: add invited column if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE users ADD COLUMN invited INTEGER DEFAULT 0`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Migration: add phone column if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE users ADD COLUMN phone TEXT`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Migration: add department column if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE users ADD COLUMN department TEXT`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Migration: add job_title column if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE users ADD COLUMN job_title TEXT`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Migration: add avatar_url column if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE users ADD COLUMN avatar_url TEXT`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Migration: add language column if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE users ADD COLUMN language TEXT`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Migration: add timezone column if not exist
  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE users ADD COLUMN timezone TEXT`, err => {
      if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
    });
  });

  // Ensure unique index for time_entries (user_id, project_id, date)
  await new Promise((resolve, reject) => {
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_time_entry ON time_entries(user_id, project_id, date)`, err => {
      if (err) reject(err); else resolve();
    });
  });

  await new Promise((resolve, reject) => {
    db.run(`CREATE INDEX IF NOT EXISTS idx_user_rate_history_period ON user_rate_history(user_id, effective_from, effective_to)`, err => {
      if (err) reject(err); else resolve();
    });
  });
}

// Create invitations table if not exists
async function createInvitationsTable() {
  await new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      invited_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      accepted INTEGER DEFAULT 0
    )`, (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

// Helper to generate a random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Migration: create magic_links table if not exists
async function createMagicLinksTable() {
  await new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS magic_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`, err => {
      if (err) reject(err); else resolve();
    });
  });
}
createMagicLinksTable();

async function createAuthSessionsTable() {
  await new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_id TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      revoked INTEGER DEFAULT 0,
      granted_week_start TEXT,
      granted_week_end TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
      err => {
        if (err) reject(err); else resolve();
      }
    );
  });
}

function generateSessionTokenId() {
  return crypto.randomBytes(16).toString('hex');
}

function runDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err); else resolve(this);
    });
  });
}

function getDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });
}

function allDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err); else resolve(rows);
    });
  });
}

function normalizeDateOnlyValue(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10) === value ? value : null;
}

function previousDateOnly(value) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}

function mapRateRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    rateRubPerHour: row.rate_rub_per_hour,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: row.created_by_name || null,
  };
}

function parseRatePayload(body, partial = false) {
  const parsed = {};

  if (body.rateRubPerHour !== undefined) {
    const rate = Number(body.rateRubPerHour);
    if (!Number.isInteger(rate) || rate < 0) {
      return { error: 'Rate must be a non-negative integer amount in rubles.' };
    }
    parsed.rateRubPerHour = rate;
  } else if (!partial) {
    return { error: 'Rate is required.' };
  }

  if (body.effectiveFrom !== undefined) {
    const effectiveFrom = normalizeDateOnlyValue(body.effectiveFrom);
    if (!effectiveFrom) {
      return { error: 'Effective from must be a valid YYYY-MM-DD date.' };
    }
    parsed.effectiveFrom = effectiveFrom;
  } else if (!partial) {
    return { error: 'Effective from is required.' };
  }

  if (body.effectiveTo !== undefined) {
    if (body.effectiveTo === null || body.effectiveTo === '') {
      parsed.effectiveTo = null;
    } else {
      const effectiveTo = normalizeDateOnlyValue(body.effectiveTo);
      if (!effectiveTo) {
        return { error: 'Effective to must be empty or a valid YYYY-MM-DD date.' };
      }
      parsed.effectiveTo = effectiveTo;
    }
  }

  return { value: parsed };
}

async function ensureUserExists(userId) {
  return getDb('SELECT id FROM users WHERE id = ?', [userId]);
}

async function findOverlappingRates(userId, effectiveFrom, effectiveTo = null, excludeRateId = null) {
  const params = [userId, effectiveTo || '9999-12-31', effectiveFrom];
  let query = `
    SELECT id
    FROM user_rate_history
    WHERE user_id = ?
      AND effective_from <= ?
      AND COALESCE(effective_to, '9999-12-31') >= ?
  `;

  if (excludeRateId) {
    query += ' AND id != ?';
    params.push(excludeRateId);
  }

  return allDb(query, params);
}

async function getRateForEntryDate(userId, entryDate) {
  const dateOnly = normalizeDateOnlyValue(String(entryDate).slice(0, 10));
  if (!dateOnly) {
    return null;
  }

  return getDb(
    `SELECT *
     FROM user_rate_history
     WHERE user_id = ?
       AND effective_from <= ?
       AND (effective_to IS NULL OR effective_to >= ?)
     ORDER BY effective_from DESC
     LIMIT 1`,
    [userId, dateOnly, dateOnly]
  );
}

function calculateEntryCost(hours, rate) {
  if (!rate) {
    return { costRub: null, missingRate: true };
  }

  return {
    costRub: (Number(hours) || 0) * rate.rate_rub_per_hour,
    missingRate: false,
  };
}

function getAutoLoginMessage(progress) {
  if (progress.qualified) {
    return 'All 5 workdays are complete. Your login is saved for next week.';
  }
  if (progress.remainingDays === 1) {
    return 'Fill 1 more day with 8 hours to keep your login next week.';
  }
  return `Fill ${progress.remainingDays} more days with 8 hours to keep your login next week.`;
}

async function issueSessionForUser(user, referenceDate = new Date()) {
  const tokenId = generateSessionTokenId();
  const weekExpiry = endOfWeekSession(referenceDate);
  const expiresAt = weekExpiry > referenceDate ? weekExpiry : endOfNextWeekSession(referenceDate);
  const progress = await getWeekProgress(db, user.id, referenceDate);

  await runDb(
    'INSERT INTO auth_sessions (user_id, token_id, expires_at, granted_week_start, granted_week_end) VALUES (?, ?, ?, ?, ?)',
    [user.id, tokenId, expiresAt.toISOString(), progress.weekStart, progress.weekEnd]
  );

  const payload = {
    sid: tokenId,
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    surname: user.surname,
    avatar_url: user.avatar_url,
  };

  const jwtToken = jwt.sign(payload, process.env.MAGIC_LINK_SECRET || 'changeme-magic-link-secret', { expiresIn: '30d' });
  return { token: jwtToken, payload };
}

async function extendSessionIfEligible(userId) {
  if (!userId) {
    return null;
  }

  const progress = await getWeekProgress(db, userId);
  if (!progress.qualified) {
    return progress;
  }

  const nextExpiry = endOfNextWeekSession(new Date()).toISOString();
  await runDb(
    'UPDATE auth_sessions SET expires_at = ?, granted_week_start = ?, granted_week_end = ? WHERE user_id = ? AND revoked = 0 AND expires_at < ?',
    [nextExpiry, progress.weekStart, progress.weekEnd, userId, nextExpiry]
  );

  return progress;
}

async function buildSessionStatus(user) {
  const progress = await extendSessionIfEligible(user.id) || await getWeekProgress(db, user.id);
  const session = await getDb('SELECT expires_at FROM auth_sessions WHERE token_id = ? AND revoked = 0', [user.sid]);

  return {
    authenticated: true,
    sessionValidUntil: session ? session.expires_at : null,
    autoLoginQualified: progress.qualified,
    progress,
    message: getAutoLoginMessage(progress),
  };
}

// JWT verification middleware
function authenticateJWT(req, res, next) {
  console.log('[JWT] Checking Authorization for', req.path, req.headers['authorization']);
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[JWT] Missing or invalid Authorization header');
    return sendApiError(res, 401, 'authHeaderMissing');
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.MAGIC_LINK_SECRET || 'changeme-magic-link-secret', async (err, user) => {
    if (err || !user.sid) {
      console.log('[JWT] Invalid or expired token');
      return sendApiError(res, 401, 'authTokenInvalid');
    }

    try {
      const session = await getDb('SELECT * FROM auth_sessions WHERE token_id = ? AND revoked = 0', [user.sid]);
      if (!session) {
        return sendApiError(res, 401, 'authSessionNotFound');
      }
      if (new Date(session.expires_at) < new Date()) {
        await runDb('UPDATE auth_sessions SET revoked = 1 WHERE id = ?', [session.id]);
        return sendApiError(res, 401, 'authSessionExpired');
      }

      req.user = user;
      req.session = session;
      next();
    } catch (sessionError) {
      console.error('[JWT] Failed to validate session', sessionError);
      return sendApiError(res, 500, 'authSessionValidationFailed');
    }
  });
}

function optionalAuthenticateJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.MAGIC_LINK_SECRET || 'changeme-magic-link-secret', async (err, user) => {
    if (err || !user.sid) {
      return sendApiError(res, 401, 'authTokenInvalid');
    }

    try {
      const session = await getDb('SELECT * FROM auth_sessions WHERE token_id = ? AND revoked = 0', [user.sid]);
      if (!session) {
        return sendApiError(res, 401, 'authSessionNotFound');
      }
      if (new Date(session.expires_at) < new Date()) {
        await runDb('UPDATE auth_sessions SET revoked = 1 WHERE id = ?', [session.id]);
        return sendApiError(res, 401, 'authSessionExpired');
      }

      req.user = user;
      req.session = session;
      next();
    } catch (sessionError) {
      console.error('[JWT] Failed to validate optional session', sessionError);
      return sendApiError(res, 500, 'authSessionValidationFailed');
    }
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return sendApiError(res, 403, 'adminForbidden');
  }
  next();
}

function requireFinancialAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return sendApiError(res, 403, 'financialForbidden');
  }
  next();
}

let projectsManagerColumnAvailable = null;

async function hasProjectManagerColumn() {
  if (projectsManagerColumnAvailable !== null) {
    return projectsManagerColumnAvailable;
  }

  const columns = await allDb('PRAGMA table_info(projects)');
  projectsManagerColumnAvailable = columns.some((column) => column.name === 'manager_user_id');
  return projectsManagerColumnAvailable;
}

async function canAccessProjectFinancials(user, projectId) {
  if (!user) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }

  const numericProjectId = Number(projectId);
  if (!Number.isInteger(numericProjectId)) {
    return false;
  }

  if (!(await hasProjectManagerColumn())) {
    return false;
  }

  const project = await getDb('SELECT manager_user_id FROM projects WHERE id = ?', [numericProjectId]);
  return Number(project?.manager_user_id) === Number(user.id);
}

function requireProjectFinancialAccess(projectIdParam = 'projectId') {
  return async (req, res, next) => {
    try {
      const projectId = req.params[projectIdParam];
      const allowed = await canAccessProjectFinancials(req.user, projectId);
      if (!allowed) {
        return sendApiError(res, 403, 'financialForbidden');
      }
      next();
    } catch (err) {
      console.error('[FinancialAccess] Failed to verify project access:', err);
      return res.status(500).json({ error: err.message });
    }
  };
}

// Admin-only hourly rate routes
app.get('/api/admin/users/:userId/rates', authenticateJWT, requireFinancialAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId)) {
    return sendApiError(res, 400, 'ratesValidationFailed', { message: 'User id is invalid.' });
  }

  try {
    const user = await ensureUserExists(userId);
    if (!user) {
      return sendApiError(res, 404, 'ratesUserNotFound');
    }

    const rates = await allDb(
      `SELECT
         r.*,
         TRIM(COALESCE(u.surname, '') || ' ' || COALESCE(u.name, '')) as created_by_name
       FROM user_rate_history r
       LEFT JOIN users u ON u.id = r.created_by
       WHERE r.user_id = ?
       ORDER BY r.effective_from DESC, r.id DESC`,
      [userId]
    );

    res.json(rates.map(mapRateRow));
  } catch (err) {
    console.error('Error fetching rates:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:userId/rates', authenticateJWT, requireFinancialAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId)) {
    return sendApiError(res, 400, 'ratesValidationFailed', { message: 'User id is invalid.' });
  }

  const parsed = parseRatePayload(req.body);
  if (parsed.error) {
    return sendApiError(res, 400, 'ratesValidationFailed', { message: parsed.error });
  }

  const { rateRubPerHour, effectiveFrom } = parsed.value;

  try {
    const user = await ensureUserExists(userId);
    if (!user) {
      return sendApiError(res, 404, 'ratesUserNotFound');
    }

    await runDb('BEGIN TRANSACTION');

    try {
      const openPriorRate = await getDb(
        `SELECT id, effective_from
         FROM user_rate_history
         WHERE user_id = ?
           AND effective_to IS NULL
           AND effective_from < ?
         ORDER BY effective_from DESC
         LIMIT 1`,
        [userId, effectiveFrom]
      );

      const overlaps = await findOverlappingRates(
        userId,
        effectiveFrom,
        null,
        openPriorRate ? openPriorRate.id : null
      );
      if (overlaps.length > 0) {
        await runDb('ROLLBACK');
        return sendApiError(res, 409, 'ratesOverlap');
      }

      if (openPriorRate) {
        await runDb(
          `UPDATE user_rate_history
           SET effective_to = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [previousDateOnly(effectiveFrom), openPriorRate.id]
        );
      }

      const result = await runDb(
        `INSERT INTO user_rate_history (user_id, rate_rub_per_hour, effective_from, effective_to, created_by)
         VALUES (?, ?, ?, NULL, ?)`,
        [userId, rateRubPerHour, effectiveFrom, req.user.id]
      );

      await runDb('COMMIT');

      const row = await getDb(
        `SELECT
           r.*,
           TRIM(COALESCE(u.surname, '') || ' ' || COALESCE(u.name, '')) as created_by_name
         FROM user_rate_history r
         LEFT JOIN users u ON u.id = r.created_by
         WHERE r.id = ?`,
        [result.lastID]
      );

      res.status(201).json(mapRateRow(row));
    } catch (transactionErr) {
      await runDb('ROLLBACK').catch((rollbackErr) => console.error('Rate rollback failed:', rollbackErr));
      throw transactionErr;
    }
  } catch (err) {
    console.error('Error creating rate:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/users/:userId/rates/:rateId', authenticateJWT, requireFinancialAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const rateId = Number(req.params.rateId);
  if (!Number.isInteger(userId) || !Number.isInteger(rateId)) {
    return sendApiError(res, 400, 'ratesValidationFailed', { message: 'User id or rate id is invalid.' });
  }

  const parsed = parseRatePayload(req.body, true);
  if (parsed.error) {
    return sendApiError(res, 400, 'ratesValidationFailed', { message: parsed.error });
  }

  const changes = parsed.value;
  if (Object.keys(changes).length === 0) {
    return sendApiError(res, 400, 'ratesValidationFailed', { message: 'No fields to update.' });
  }

  try {
    const existing = await getDb(
      'SELECT * FROM user_rate_history WHERE id = ? AND user_id = ?',
      [rateId, userId]
    );
    if (!existing) {
      return sendApiError(res, 404, 'ratesNotFound');
    }

    const effectiveFrom = changes.effectiveFrom !== undefined ? changes.effectiveFrom : existing.effective_from;
    const effectiveTo = changes.effectiveTo !== undefined ? changes.effectiveTo : existing.effective_to;
    const rateRubPerHour = changes.rateRubPerHour !== undefined ? changes.rateRubPerHour : existing.rate_rub_per_hour;

    if (effectiveTo && effectiveTo < effectiveFrom) {
      return sendApiError(res, 400, 'ratesValidationFailed', { message: 'Effective to must be after effective from.' });
    }

    const overlaps = await findOverlappingRates(userId, effectiveFrom, effectiveTo, rateId);
    if (overlaps.length > 0) {
      return sendApiError(res, 409, 'ratesOverlap');
    }

    await runDb(
      `UPDATE user_rate_history
       SET rate_rub_per_hour = ?,
           effective_from = ?,
           effective_to = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [rateRubPerHour, effectiveFrom, effectiveTo, rateId, userId]
    );

    const updated = await getDb(
      `SELECT
         r.*,
         TRIM(COALESCE(u.surname, '') || ' ' || COALESCE(u.name, '')) as created_by_name
       FROM user_rate_history r
       LEFT JOIN users u ON u.id = r.created_by
       WHERE r.id = ?`,
      [rateId]
    );

    res.json(mapRateRow(updated));
  } catch (err) {
    console.error('Error updating rate:', err);
    res.status(500).json({ error: err.message });
  }
});

// Users routes
app.get('/api/users', authenticateJWT, (req, res) => {
  console.log('GET /api/users called');
  db.all(
    `SELECT
       id, name, surname, email, role, created_at, deleted, invited,
       phone, department, job_title, avatar_url, language, timezone
     FROM users
     ORDER BY name`,
    [],
    (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log('Users fetched:', rows);
    res.json(rows);
  });
});

app.post('/api/users', authenticateJWT, requireAdmin, (req, res) => {
  console.log('POST /api/users called with data:', req.body);
  const { name, surname, email, role } = req.body;
  db.run('INSERT INTO users (name, surname, email, role) VALUES (?, ?, ?, ?)',
    [name, surname, email, role || 'user'],
    function(err) {
      if (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      console.log('User created with ID:', this.lastID);
      res.json({ id: this.lastID, name, surname, email, role });
    });
});

app.get('/api/users/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  db.get('SELECT id, name, surname, email, role, deleted, phone, department, job_title, avatar_url, language, timezone FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!user) {
      sendApiError(res, 404, 'usersNotFound');
      return;
    }
    res.json(user);
  });
});

// PATCH endpoint to update a user by id
app.patch('/api/users/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { name, surname, email, role, deleted, phone, department, job_title, avatar_url, language, timezone } = req.body;
  const isAdmin = req.user?.role === 'admin';
  const isSelf = Number(id) === Number(req.user?.id);
  if (!isAdmin && !isSelf) {
    return sendApiError(res, 403, 'adminForbidden');
  }

  // Build dynamic update query
  const fields = [];
  const values = [];

  if (isAdmin) {
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (surname !== undefined) { fields.push('surname = ?'); values.push(surname); }
    if (email !== undefined) { fields.push('email = ?'); values.push(email); }
    if (role !== undefined) { fields.push('role = ?'); values.push(role); }
    if (deleted !== undefined) { fields.push('deleted = ?'); values.push(deleted); }
  } else {
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (surname !== undefined) { fields.push('surname = ?'); values.push(surname); }
  }

  if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
  if (department !== undefined) { fields.push('department = ?'); values.push(department); }
  if (job_title !== undefined) { fields.push('job_title = ?'); values.push(job_title); }
  if (avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(avatar_url); }
  if (language !== undefined) { fields.push('language = ?'); values.push(language); }
  if (timezone !== undefined) { fields.push('timezone = ?'); values.push(timezone); }
  if (fields.length === 0) {
    return sendApiError(res, 400, 'usersNoFieldsToUpdate');
  }
  values.push(id);
  db.run(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values,
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        sendApiError(res, 404, 'usersNotFound');
        return;
      }
      res.json({ id, ...req.body });
    }
  );
});

// DELETE user only (keep logged hours)
app.delete('/api/users/:id', authenticateJWT, requireAdmin, (req, res) => {
  const userId = req.params.id;
  db.run('UPDATE users SET deleted = 1 WHERE id = ?', [userId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      sendApiError(res, 404, 'usersNotFound');
      return;
    }
    res.json({ deleted: 'user (marked as deleted)' });
  });
});

// DELETE user and all their time entries
app.delete('/api/users/:id/full', authenticateJWT, requireAdmin, (req, res) => {
  const userId = req.params.id;
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run('DELETE FROM time_entries WHERE user_id = ?', [userId], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }
      db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        db.run('COMMIT');
        return res.json({ deleted: 'user and time_entries' });
      });
    });
  });
});

// Clients routes
app.get('/api/clients', authenticateJWT, (req, res) => {
  db.all('SELECT * FROM clients ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/clients', authenticateJWT, (req, res) => {
  const { name, type, itn } = req.body;
  // Check for duplicate by name or ITN (case-insensitive)
  db.get('SELECT * FROM clients WHERE LOWER(name) = LOWER(?) OR (itn IS NOT NULL AND LOWER(itn) = LOWER(?))', [name, itn], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      let reason = row.name.toLowerCase() === name.toLowerCase() ? 'name' : 'ITN';
      return sendApiError(res, 409, 'clientsDuplicate', { reason });
    }
    // No duplicate, proceed to insert
    db.run('INSERT INTO clients (name, type, itn) VALUES (?, ?, ?)', [name, type, itn || null], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, type, itn });
    });
  });
});

// PATCH endpoint to update a client by id
app.patch('/api/clients/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { name, type, itn } = req.body;
  db.run(
    'UPDATE clients SET name = ?, type = ?, itn = ? WHERE id = ?',
    [name, type, itn, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        sendApiError(res, 404, 'clientsNotFound');
        return;
      }
      res.json({ id, name, type, itn });
    }
  );
});

// DELETE client and all their projects and time entries
app.delete('/api/clients/:id/full', authenticateJWT, (req, res) => {
  const clientId = req.params.id;
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.all('SELECT id FROM projects WHERE client_id = ?', [clientId], (err, projects) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }
      const projectIds = projects.map(p => p.id);
      if (projectIds.length === 0) {
        // No projects, just delete the client
        db.run('DELETE FROM clients WHERE id = ?', [clientId], function (err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          db.run('COMMIT');
          return res.json({ deleted: 'client' });
        });
      } else {
        // Delete all time entries for these projects
        db.run(`DELETE FROM time_entries WHERE project_id IN (${projectIds.map(() => '?').join(',')})`, projectIds, function (err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: err.message });
          }
          // Delete all projects
          db.run(`DELETE FROM projects WHERE id IN (${projectIds.map(() => '?').join(',')})`, projectIds, function (err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            // Delete the client
            db.run('DELETE FROM clients WHERE id = ?', [clientId], function (err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
              db.run('COMMIT');
              return res.json({ deleted: 'client, projects, time_entries' });
            });
          });
        });
      }
    });
  });
});

// Projects routes
app.get('/api/projects', authenticateJWT, (req, res) => {
  db.all('SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id ORDER BY p.category, p.name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/projects', authenticateJWT, (req, res) => {
  const { name, description, client_id, active, code } = req.body;
  const category = normalizeProjectCategory(req.body.category);

  if (!category) {
    return sendApiError(res, 400, 'projectsCategoryRequired');
  }
  if (!PROJECT_CATEGORIES.includes(category)) {
    return sendApiError(res, 400, 'projectsCategoryInvalid');
  }

  // Check for duplicate name (case-insensitive)
  db.get('SELECT * FROM projects WHERE LOWER(name) = LOWER(?)', [name], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return sendApiError(res, 409, 'projectsDuplicateName');
    // Check for duplicate code (if code is set)
    if (code && code.trim()) {
      db.get('SELECT * FROM projects WHERE code IS NOT NULL AND LOWER(code) = LOWER(?)', [code], (err2, row2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        if (row2) return sendApiError(res, 409, 'projectsDuplicateCode');
        // No duplicates, proceed to insert
        db.run('INSERT INTO projects (name, description, client_id, active, code, category) VALUES (?, ?, ?, ?, ?, ?)', 
          [name, description, client_id, active !== undefined ? active : 1, code || null, category], 
          function(err3) {
            if (err3) {
              res.status(500).json({ error: err3.message });
              return;
            }
            res.json({ id: this.lastID, name, description, client_id, active: active !== undefined ? active : 1, code: code || null, category });
          });
      });
    } else {
      // No code, proceed to insert
      db.run('INSERT INTO projects (name, description, client_id, active, code, category) VALUES (?, ?, ?, ?, ?, ?)', 
        [name, description, client_id, active !== undefined ? active : 1, null, category], 
        function(err3) {
          if (err3) {
            res.status(500).json({ error: err3.message });
            return;
          }
          res.json({ id: this.lastID, name, description, client_id, active: active !== undefined ? active : 1, code: null, category });
        });
    }
  });
});

// PATCH endpoint to update a project by id
app.patch('/api/projects/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { name, description, client_id, active, code } = req.body;
  const category = req.body.category !== undefined ? normalizeProjectCategory(req.body.category) : undefined;

  if (req.body.category !== undefined) {
    if (!category) {
      return sendApiError(res, 400, 'projectsCategoryRequired');
    }
    if (!PROJECT_CATEGORIES.includes(category)) {
      return sendApiError(res, 400, 'projectsCategoryInvalid');
    }
  }

  // Check for duplicate name (exclude self)
  if (name !== undefined) {
    db.get('SELECT * FROM projects WHERE LOWER(name) = LOWER(?) AND id != ?', [name, id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) return sendApiError(res, 409, 'projectsDuplicateName');
      // Check for duplicate code (if code is set, exclude self)
      if (code && code.trim()) {
        db.get('SELECT * FROM projects WHERE code IS NOT NULL AND LOWER(code) = LOWER(?) AND id != ?', [code, id], (err2, row2) => {
          if (err2) return res.status(500).json({ error: err2.message });
          if (row2) return sendApiError(res, 409, 'projectsDuplicateCode');
          // No duplicates, proceed to update
          updateProject();
        });
      } else {
        updateProject();
      }
    });
  } else if (code && code.trim()) {
    db.get('SELECT * FROM projects WHERE code IS NOT NULL AND LOWER(code) = LOWER(?) AND id != ?', [code, id], (err2, row2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (row2) return sendApiError(res, 409, 'projectsDuplicateCode');
      updateProject();
    });
  } else {
    updateProject();
  }
  function updateProject() {
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (client_id !== undefined) { fields.push('client_id = ?'); values.push(client_id); }
    if (active !== undefined) { fields.push('active = ?'); values.push(active); }
    if (code !== undefined) { fields.push('code = ?'); values.push(code); }
    if (category !== undefined) { fields.push('category = ?'); values.push(category); }
    if (fields.length === 0) {
      return sendApiError(res, 400, 'projectsNoFieldsToUpdate');
    }
    values.push(id);
    db.run(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`,
      values,
      function (err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        if (this.changes === 0) {
          sendApiError(res, 404, 'projectsNotFound');
          return;
        }
        res.json({ id, name, description, client_id, active, code, category });
      }
    );
  }
});

// PATCH endpoint to toggle project active status
app.patch('/api/projects/:id/active', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  db.run('UPDATE projects SET active = ? WHERE id = ?', [active, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      sendApiError(res, 404, 'projectsNotFound');
      return;
    }
    res.json({ id, active });
  });
});

// DELETE endpoint to delete a project by id
app.delete('/api/projects/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM projects WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      sendApiError(res, 404, 'projectsNotFound');
      return;
    }
    res.json({ success: true });
  });
});

// Time entries routes
app.post('/api/time-entries', authenticateJWT, (req, res) => {
  const { project_id, user_id, date, hours, description, submission_time } = req.body;
  console.log('Received submission_time:', submission_time);
  db.run(
    'INSERT INTO time_entries (project_id, user_id, date, hours, description, submission_time) VALUES (?, ?, ?, ?, ?, ?)',
    [project_id, user_id, date, hours, description, submission_time],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
          sendApiError(res, 409, 'timeEntriesDuplicate');
        } else {
          console.error('Error inserting time entry:', err);
          res.status(500).json({ error: err.message });
        }
        return;
      }
      extendSessionIfEligible(user_id).catch((sessionErr) => console.error('[AutoLogin] Failed after single insert:', sessionErr));
      res.json({ id: this.lastID, project_id, user_id, date, hours, description, submission_time });
    }
  );
});

app.get('/api/time-entries', authenticateJWT, (req, res) => {
  const { project_id, user_id, start_date, end_date } = req.query;
  let query = `
    SELECT 
      t.*,
      (u.surname || ' ' || u.name) as user_name,
      p.name as project_name
    FROM time_entries t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN projects p ON t.project_id = p.id
  `;
  let params = [];
  const conditions = [];
  if (project_id) {
    conditions.push('t.project_id = ?');
    params.push(project_id);
  }
  if (user_id) {
    conditions.push('t.user_id = ?');
    params.push(user_id);
  }
  if (start_date && end_date) {
    conditions.push('t.date >= ? AND t.date <= ?');
    params.push(start_date, end_date);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY t.date DESC';
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.patch('/api/time-entries/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { date, hours, description, project_id } = req.body;
  const fields = [];
  const values = [];
  if (date) {
    fields.push('date = ?');
    values.push(date);
  }
  if (hours !== undefined) {
    fields.push('hours = ?');
    values.push(hours);
  }
  if (description !== undefined) {
    fields.push('description = ?');
    values.push(description);
  }
  if (project_id) {
    fields.push('project_id = ?');
    values.push(project_id);
  }
  if (fields.length === 0) {
    return sendApiError(res, 400, 'timeEntriesNoFieldsToUpdate');
  }

  db.get('SELECT user_id FROM time_entries WHERE id = ?', [id], (lookupErr, existingEntry) => {
    if (lookupErr) {
      return res.status(500).json({ error: lookupErr.message });
    }
    values.push(id);
    db.run(
      `UPDATE time_entries SET ${fields.join(', ')} WHERE id = ?`,
      values,
      function (err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        if (this.changes === 0) {
          sendApiError(res, 404, 'timeEntriesNotFound');
          return;
        }
        extendSessionIfEligible(existingEntry && existingEntry.user_id).catch((sessionErr) => console.error('[AutoLogin] Failed after patch:', sessionErr));
        res.json({ id, ...req.body });
      }
    );
  });
});

// Add DELETE route for time entries
app.delete('/api/time-entries/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  db.get('SELECT user_id FROM time_entries WHERE id = ?', [id], (lookupErr, entry) => {
    if (lookupErr) {
      return res.status(500).json({ error: lookupErr.message });
    }
    db.run('DELETE FROM time_entries WHERE id = ?', [id], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Time entry not found' });
        return;
      }
      extendSessionIfEligible(entry && entry.user_id).catch((sessionErr) => console.error('[AutoLogin] Failed after delete:', sessionErr));
      res.json({ success: true });
    });
  });
});

// Bulk delete all time entries for a user, project, and week (POST for JSON body support)
app.post('/api/time-entries/bulk-delete', authenticateJWT, (req, res) => {
  const { user_id, project_id, week_start } = req.body;
  if (!user_id || !project_id || !week_start) {
    return sendApiError(res, 400, 'timeEntriesWeekRequired');
  }
  const start = new Date(week_start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  db.run(
    `DELETE FROM time_entries
     WHERE user_id = ? AND project_id = ? AND date >= ? AND date <= ?`,
    [user_id, project_id, start.toISOString(), end.toISOString()],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      extendSessionIfEligible(user_id).catch((sessionErr) => console.error('[AutoLogin] Failed after bulk delete:', sessionErr));
      res.json({ deleted: this.changes });
    }
  );
});

// Analytics routes
app.get('/api/analytics/time-by-user', authenticateJWT, (req, res) => {
  const { startDate, endDate } = req.query;
  let query = `
    SELECT 
      t.user_id,
      (u.surname || ' ' || u.name) as user_name,
      t.project_id,
      p.name as project_name,
      p.code as project_code,
      p.category as project_category,
      c.name as client_name,
      c.type as client_type,
      SUM(t.hours) as total_hours
    FROM time_entries t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN clients c ON p.client_id = c.id
  `;
  let params = [];
  const conditions = [];
  if (startDate && endDate) {
    conditions.push('t.date >= ? AND t.date <= ?');
    params.push(startDate, endDate);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' GROUP BY t.user_id, t.project_id';
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/analytics/time-by-project', authenticateJWT, (req, res) => {
  const { startDate, endDate } = req.query;
  let query = `
    SELECT 
      t.project_id,
      p.name as project_name,
      p.code as project_code,
      p.category as project_category,
      c.name as client_name,
      c.type as client_type,
      t.user_id,
      (u.surname || ' ' || u.name) as user_name,
      SUM(t.hours) as total_hours
    FROM time_entries t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN users u ON t.user_id = u.id
  `;
  let params = [];
  const conditions = [];
  if (startDate && endDate) {
    conditions.push('t.date >= ? AND t.date <= ?');
    params.push(startDate, endDate);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' GROUP BY t.project_id, t.user_id';
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/analytics/time-by-client-type', authenticateJWT, (req, res) => {
  const { startDate, endDate } = req.query;
  let query = `
    SELECT 
      c.type as client_type,
      t.user_id,
      (u.surname || ' ' || u.name) as user_name,
      t.project_id,
      SUM(t.hours) as total_hours
    FROM time_entries t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN clients c ON p.client_id = c.id
    LEFT JOIN users u ON t.user_id = u.id
  `;
  let params = [];
  const conditions = [];
  if (startDate && endDate) {
    conditions.push('t.date >= ? AND t.date <= ?');
    params.push(startDate, endDate);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' GROUP BY c.type, t.user_id, t.project_id';
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/projects/:id/analytics', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const allowedRanges = new Set(['week', 'month', 'quarter', 'year', 'all']);
  const range = allowedRanges.has(req.query.range) ? req.query.range : 'month';
  const anchorDate = req.query.anchorDate || null;
  const { startDate, endDate } = getAnalyticsRangeBounds(range, anchorDate);
  const conditions = ['t.project_id = ?'];
  const params = [id];

  if (startDate && endDate) {
    conditions.push('substr(t.date, 1, 10) >= ?');
    conditions.push('substr(t.date, 1, 10) <= ?');
    params.push(startDate, endDate);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  db.get(
    `SELECT p.id, p.name, p.code, c.name as client_name
     FROM projects p
     LEFT JOIN clients c ON c.id = p.client_id
     WHERE p.id = ?`,
    [id],
    (projectErr, project) => {
      if (projectErr) {
        return res.status(500).json({ error: projectErr.message });
      }

      if (!project) {
        return sendApiError(res, 404, 'projectsNotFound');
      }

      db.get(
        `SELECT MAX(substr(t.date, 1, 10)) as last_entry_date
         FROM time_entries t
         WHERE t.project_id = ?`,
        [id],
        (projectActivityErr, projectActivityRow) => {
          if (projectActivityErr) {
            return res.status(500).json({ error: projectActivityErr.message });
          }

          db.get(
        `SELECT
           COUNT(DISTINCT t.user_id) as participants_count,
           COALESCE(SUM(t.hours), 0) as total_hours,
           MIN(substr(t.date, 1, 10)) as first_entry_date,
           MAX(substr(t.date, 1, 10)) as last_entry_date
         FROM time_entries t
         ${whereClause}`,
        params,
        (summaryErr, summaryRow) => {
          if (summaryErr) {
            return res.status(500).json({ error: summaryErr.message });
          }

          db.all(
            `SELECT
               t.user_id as user_id,
               TRIM(COALESCE(u.surname, '') || ' ' || COALESCE(u.name, '')) as user_name,
               COALESCE(SUM(t.hours), 0) as total_hours
             FROM time_entries t
             LEFT JOIN users u ON u.id = t.user_id
             ${whereClause}
             GROUP BY t.user_id
             ORDER BY total_hours DESC, user_name ASC`,
            params,
            (membersErr, membersRows) => {
              if (membersErr) {
                return res.status(500).json({ error: membersErr.message });
              }

              db.all(
                `SELECT
                   substr(t.date, 1, 10) as entry_date,
                   t.user_id as user_id,
                   COALESCE(SUM(t.hours), 0) as total_hours
                 FROM time_entries t
                 ${whereClause}
                 GROUP BY substr(t.date, 1, 10), t.user_id
                 ORDER BY entry_date ASC, t.user_id ASC`,
                params,
                (dailyErr, dailyRows) => {
                  if (dailyErr) {
                    return res.status(500).json({ error: dailyErr.message });
                  }

                  const buildResponse = (baseline = { totalHours: 0, byUser: {} }) => {
                    const dailyMap = new Map();
                    dailyRows.forEach((row) => {
                      if (!dailyMap.has(row.entry_date)) {
                        dailyMap.set(row.entry_date, {
                          date: row.entry_date,
                          totalHours: 0,
                          users: [],
                        });
                      }

                      const point = dailyMap.get(row.entry_date);
                      const hours = Number(row.total_hours) || 0;
                      point.totalHours += hours;
                      point.users.push({
                        userId: row.user_id,
                        hours,
                      });
                    });

                    const daily = Array.from(dailyMap.values());
                    const totalHours = Number(summaryRow?.total_hours) || 0;
                    const activeDays = daily.length;

                    return res.json({
                      project: {
                        id: project.id,
                        name: project.name,
                        code: project.code,
                        clientName: project.client_name,
                      },
                      range,
                      summary: {
                        participantsCount: Number(summaryRow?.participants_count) || 0,
                        totalHours,
                        averagePerDay: activeDays > 0 ? totalHours / activeDays : 0,
                        firstEntryDate: summaryRow?.first_entry_date || null,
                        lastEntryDate: projectActivityRow?.last_entry_date || null,
                      },
                      members: membersRows.map((row) => ({
                        userId: row.user_id,
                        userName: row.user_name || 'Unknown User',
                        totalHours: Number(row.total_hours) || 0,
                      })),
                      cumulativeBaseline: baseline,
                      daily,
                    });
                  };

                  if (!startDate) {
                    return buildResponse();
                  }

                  db.get(
                    `SELECT COALESCE(SUM(t.hours), 0) as total_hours
                     FROM time_entries t
                     WHERE t.project_id = ? AND substr(t.date, 1, 10) < ?`,
                    [id, startDate],
                    (baselineTotalErr, baselineTotalRow) => {
                      if (baselineTotalErr) {
                        return res.status(500).json({ error: baselineTotalErr.message });
                      }

                      db.all(
                        `SELECT
                           t.user_id as user_id,
                           COALESCE(SUM(t.hours), 0) as total_hours
                         FROM time_entries t
                         WHERE t.project_id = ? AND substr(t.date, 1, 10) < ?
                         GROUP BY t.user_id`,
                        [id, startDate],
                        (baselineUsersErr, baselineUsersRows) => {
                          if (baselineUsersErr) {
                            return res.status(500).json({ error: baselineUsersErr.message });
                          }

                          const byUser = {};
                          baselineUsersRows.forEach((row) => {
                            byUser[row.user_id] = Number(row.total_hours) || 0;
                          });

                          return buildResponse({
                            totalHours: Number(baselineTotalRow?.total_hours) || 0,
                            byUser,
                          });
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
          );
        }
      );
    }
  );
});

// Batch insert time entries
app.post('/api/time-entries/batch', authenticateJWT, (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries) || entries.length === 0) {
    return sendApiError(res, 400, 'timeEntriesNoEntries');
  }
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    let hasError = false;
    let errorMsg = '';
    entries.forEach(entry => {
      if (!entry.user_id || !entry.project_id || !entry.date || typeof entry.hours !== 'number') {
        hasError = true;
        errorMsg = 'Missing required fields in one or more entries.';
        return;
      }
      db.run(
        `INSERT INTO time_entries (user_id, project_id, date, hours, submission_time)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, project_id, date) DO UPDATE SET hours=excluded.hours, submission_time=datetime('now')`,
        [entry.user_id, entry.project_id, entry.date, entry.hours],
        function(err) {
          if (err) {
            hasError = true;
            errorMsg = err.message;
          }
        }
      );
    });
    db.run('COMMIT', err => {
      if (hasError || err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: errorMsg || (err && err.message) || 'Failed to insert batch.' });
      }
      const touchedUsers = [...new Set(entries.map((entry) => entry.user_id).filter(Boolean))];
      Promise.all(touchedUsers.map((userId) => extendSessionIfEligible(userId)))
        .catch((sessionErr) => console.error('[AutoLogin] Failed after batch:', sessionErr));
      return res.json({ success: true });
    });
  });
});

// Bulk delete all time entries for a project
app.delete('/api/time-entries/by-project/:project_id', authenticateJWT, requireAdmin, (req, res) => {
  const { project_id } = req.params;
  db.run('DELETE FROM time_entries WHERE project_id = ?', [project_id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ deleted: this.changes });
  });
});

// Get current SMTP settings
app.get('/api/smtp-settings', authenticateJWT, requireAdmin, (req, res) => {
  res.json(toPublicSmtpSettings(loadSmtpSettings()));
});

// Update SMTP settings
app.post('/api/smtp-settings', authenticateJWT, requireAdmin, (req, res) => {
  const settings = buildSmtpSettingsFromBody(req.body, loadSmtpSettings());
  if (!validateSmtpSettings(settings)) {
    return sendApiError(res, 400, 'smtpIncomplete');
  }

  try {
    saveSmtpSettings(settings);
    res.json({ success: true });
  } catch (e) {
    console.error('[SMTP] Failed to write runtime SMTP settings:', e);
    sendApiError(res, 500, 'smtpSaveFailed');
  }
});

// Send a test email
app.post('/api/smtp-test', optionalAuthenticateJWT, async (req, res) => {
  // Accept all SMTP fields from the request body for testing
  const body = req.body || {};
  if (req.user && req.user.role !== 'admin') {
    return sendApiError(res, 403, 'smtpForbidden');
  }

  const existing = req.user?.role === 'admin' ? loadSmtpSettings() : {};
  const settings = buildSmtpSettingsFromBody(body, existing);
  const to = body.to || settings.from;
  if (!validateSmtpSettings(settings)) {
    return sendApiError(res, 400, 'smtpIncomplete');
  }
  try {
    const transporter = require('nodemailer').createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.auth,
    });
    // Render Handlebars template
    let html = '';
    try {
      const templateSource = fs.readFileSync(path.join(__dirname, 'emailTemplates', 'smtpTest.hbs'), 'utf8');
      const template = handlebars.compile(templateSource);
      html = template({
        appName: 'TimeTracker',
        year: new Date().getFullYear()
      });
    } catch (e) {
      console.error('[SMTP Test] Failed to render email template:', e);
      html = 'Это тестовое письмо из настроек SMTP приложения TimeTracker.';
    }
    await transporter.sendMail({
      from: settings.from,
      to,
      subject: 'Тестовое письмо SMTP',
      text: 'Это тестовое письмо из настроек SMTP приложения TimeTracker.',
      html
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invitations - create and send invitation
app.post('/api/invitations', authenticateJWT, requireAdmin, async (req, res) => {
  const { email, invited_by, name, surname, role } = req.body;
  const invitedRole = role === 'admin' ? 'admin' : 'user';
  if (!email) return sendApiError(res, 400, 'invitationEmailRequired');
  // Check if user exists
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, userRow) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!userRow) {
      // Insert placeholder user with invited=1, use name/surname if provided
      db.run('INSERT INTO users (name, surname, email, role, invited, deleted) VALUES (?, ?, ?, ?, 1, 0)',
        [name || '', surname || '', email, invitedRole],
        function(err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          // Continue to invitation logic below
          insertInvitation();
        }
      );
    } else if (userRow.invited || userRow.deleted) {
      db.run(
        'UPDATE users SET name = ?, surname = ?, role = ?, deleted = 0, invited = 1 WHERE id = ?',
        [name ?? userRow.name, surname ?? userRow.surname, invitedRole, userRow.id],
        function(err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          insertInvitation();
        }
      );
    } else {
      insertInvitation();
    }
    function insertInvitation() {
      const token = generateToken();
      db.run('INSERT INTO invitations (email, token, invited_by) VALUES (?, ?, ?)', [email, token, invited_by || null], async function(err3) {
        if (err3) return res.status(500).json({ error: err3.message });
        // Send invitation email
        const settings = loadSmtpSettings();
        console.log('[Invitation] Using SMTP settings:', settings);
        if (!settings.host || !settings.port || !settings.auth || !settings.auth.user || !settings.auth.pass || !settings.from) {
          return sendApiError(res, 500, 'smtpNotConfigured');
        }
        const transporter = nodemailer.createTransport({
          host: settings.host,
          port: settings.port,
          secure: !!settings.secure,
          auth: settings.auth,
        });
        const baseUrl = resolveAppBaseUrl(req);
        const inviteLink = `${baseUrl}/invite/accept/${token}`;
        // Render Handlebars template
        let html = '';
        try {
          const templateSource = fs.readFileSync(path.join(__dirname, 'emailTemplates', 'invitation.hbs'), 'utf8');
          const template = handlebars.compile(templateSource);
          let inviterName = '';
          if (invited_by) {
            // Try to get inviter's name
            const inviterRow = await new Promise(resolve => {
              db.get('SELECT name, surname FROM users WHERE id = ?', [invited_by], (err, row) => {
                if (err || !row) resolve('');
                else resolve((row.name || '') + (row.surname ? ' ' + row.surname : ''));
              });
            });
            inviterName = inviterRow;
          }
          html = template({
            inviteLink,
            appName: 'TimeTracker',
            inviter: inviterName,
            year: new Date().getFullYear()
          });
        } catch (e) {
          console.error('[Invitation] Failed to render email template:', e);
          html = `<p>Вас пригласили в TimeTracker.</p><p><a href="${inviteLink}">${inviteLink}</a></p>`;
        }
        try {
          await transporter.sendMail({
            from: settings.from,
            to: email,
            subject: 'Приглашение в TimeTracker',
            text: `Вас пригласили в TimeTracker. Перейдите по ссылке, чтобы завершить регистрацию: ${inviteLink}`,
            html
          });
          res.json({ success: true });
        } catch (err4) {
          res.status(500).json({ errorCode: apiErrors.invitationSendFailed.errorCode, error: apiErrors.invitationSendFailed.error + ' ' + err4.message });
        }
      });
    }
  });
});

// GET /api/invitations/accept/:token - validate invitation
app.get('/api/invitations/accept/:token', (req, res) => {
  const { token } = req.params;
  db.get('SELECT * FROM invitations WHERE token = ? AND accepted = 0', [token], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return sendApiError(res, 404, 'invitationInvalid');
    // Also fetch name and surname from users table
    db.get('SELECT name, surname FROM users WHERE email = ?', [row.email], (err2, user) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ email: row.email, invited_by: row.invited_by, name: user?.name || '', surname: user?.surname || '' });
    });
  });
});

// GET /api/invitations - list all invitations
app.get('/api/invitations', authenticateJWT, requireAdmin, (req, res) => {
  db.all('SELECT * FROM invitations', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// POST /api/invitations/accept/:token - complete registration
app.post('/api/invitations/accept/:token', (req, res) => {
  const { token } = req.params;
  const { name, surname } = req.body;
  if (!name || !surname) return sendApiError(res, 400, 'invitationNameSurnameRequired');
  db.get('SELECT * FROM invitations WHERE token = ? AND accepted = 0', [token], (err, invite) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!invite) return sendApiError(res, 404, 'invitationInvalid');
    // Update user and mark invitation as accepted
    db.run('UPDATE users SET name = ?, surname = ?, invited = 0 WHERE email = ?', [name, surname, invite.email], function(err2) {
      if (err2) return res.status(500).json({ error: err2.message });
      db.run('UPDATE invitations SET accepted = 1 WHERE token = ?', [token], function(err3) {
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ success: true });
      });
    });
  });
});

// In-memory rate limiter for magic link requests (per email)
const magicLinkRateLimit = {};

// POST /api/auth/magic-link - request a magic link
app.post('/api/auth/magic-link', (req, res) => {
  const { email } = req.body;
  console.log('[Magic Link] Requested for:', email);
  if (!email) return sendApiError(res, 400, 'magicLinkEmailRequired');

  // Rate limiting logic
  const now = Date.now();
  const lastRequest = magicLinkRateLimit[email];
  if (lastRequest && now - lastRequest < 60 * 1000) {
    const secondsLeft = Math.ceil((60 * 1000 - (now - lastRequest)) / 1000);
    return sendApiError(res, 429, 'magicLinkRateLimited', { secondsLeft });
  }
  magicLinkRateLimit[email] = now;

  db.get('SELECT * FROM users WHERE email = ? AND deleted = 0', [email], (err, user) => {
    if (err) {
      console.error('[Magic Link] DB error:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      console.log('[Magic Link] No active user found for:', email);
      return sendApiError(res, 404, 'magicLinkUserNotFound');
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min
    db.run('INSERT INTO magic_links (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt], async function(err2) {
      if (err2) {
        console.error('[Magic Link] Error inserting magic link:', err2);
        return res.status(500).json({ error: err2.message });
      }
      // Send email or return link in development
      const settings = loadSmtpSettings();
      const baseUrl = resolveAppBaseUrl(req);
      const magicLink = `${baseUrl}/auth/magic-link/${token}`;
      console.log('[Magic Link] Using SMTP settings:', settings);

      const hasSmtp = Boolean(
        settings &&
        settings.host &&
        settings.port &&
        settings.auth &&
        settings.auth.user &&
        settings.auth.pass &&
        settings.from
      );

      if (!hasSmtp) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Magic Link] SMTP settings missing; returning link directly for development:', magicLink);
          return res.json({ success: true, magicLink, token });
        }
        console.error('[Magic Link] SMTP settings are not configured. Settings:', settings);
        return sendApiError(res, 500, 'smtpNotConfigured');
      }

      const transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: !!settings.secure,
        auth: settings.auth,
      });
      // Render Handlebars template
      let html = '';
      try {
        const templateSource = fs.readFileSync(path.join(__dirname, 'emailTemplates', 'magicLink.hbs'), 'utf8');
        const template = handlebars.compile(templateSource);
        html = template({
          magicLink,
          expiresIn: 15,
          appName: 'TimeTracker',
          year: new Date().getFullYear()
        });
      } catch (e) {
        console.error('[Magic Link] Failed to render email template:', e);
        html = `<p>Перейдите по ссылке, чтобы войти: <a href="${magicLink}">${magicLink}</a></p><p>Ссылка действует 15 минут и может быть использована только один раз.</p>`;
      }
      try {
        await transporter.sendMail({
          from: settings.from,
          to: email,
          subject: 'Ссылка для входа в TimeTracker',
          text: `Click to log in: ${magicLink}\nThis link expires in 15 minutes and can only be used once.`,
          html
        });
        console.log('[Magic Link] Email sent to:', email);
        res.json({ success: true });
      } catch (err3) {
        console.error('[Magic Link] Failed to send magic link:', err3);
        res.status(500).json({ errorCode: apiErrors.magicLinkSendFailed.errorCode, error: apiErrors.magicLinkSendFailed.error + ' ' + err3.message });
      }
    });
  });
});

// GET /api/auth/magic-link/:token - consume magic link and return JWT
app.get('/api/auth/magic-link/:token', (req, res) => {
  const { token } = req.params;
  db.get('SELECT * FROM magic_links WHERE token = ?', [token], (err, link) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!link) return sendApiError(res, 404, 'magicLinkInvalid');
    if (link.used) return sendApiError(res, 400, 'magicLinkUsed');
    if (new Date(link.expires_at) < new Date()) return sendApiError(res, 400, 'magicLinkExpired');
    db.get('SELECT * FROM users WHERE id = ? AND deleted = 0', [link.user_id], (err2, user) => {
      if (err2) return res.status(500).json({ error: err2.message });
      if (!user) return sendApiError(res, 404, 'authUserNotFound');
      db.run('UPDATE magic_links SET used = 1 WHERE id = ?', [link.id], err3 => {
        if (err3) return res.status(500).json({ error: err3.message });
        issueSessionForUser(user)
          .then(({ token: jwtToken, payload }) => res.json({ token: jwtToken, user: payload }))
          .catch((issueError) => {
            console.error('[Magic Link] Failed to issue session:', issueError);
            res.status(500).json({ errorCode: apiErrors.authSessionCreateFailed.errorCode, error: apiErrors.authSessionCreateFailed.error });
          });
      });
    });
  });
});

app.get('/api/auth/session-status', authenticateJWT, async (req, res) => {
  try {
    const status = await buildSessionStatus(req.user);
    res.json(status);
  } catch (err) {
    console.error('[Session Status] Failed to build status:', err);
    res.status(500).json({ errorCode: apiErrors.authSessionStatusFailed.errorCode, error: apiErrors.authSessionStatusFailed.error });
  }
});

app.post('/api/auth/logout', authenticateJWT, async (req, res) => {
  try {
    await runDb('UPDATE auth_sessions SET revoked = 1 WHERE token_id = ?', [req.user.sid]);
    res.json({ success: true });
  } catch (err) {
    console.error('[Logout] Failed to revoke session:', err);
    res.status(500).json({ errorCode: apiErrors.authLogoutFailed.errorCode, error: apiErrors.authLogoutFailed.error });
  }
});

// --- NEW ANALYTICS ENDPOINTS: TRUE TOTALS ---
// One row per project
app.get('/api/analytics/time-by-project-total', authenticateJWT, (req, res) => {
  console.log('[ANALYTICS] Handler entered');
  let { startDate, endDate } = req.query;
  const start = startDate ? startDate.slice(0, 10) : null;
  const end = endDate ? endDate.slice(0, 10) : null;
  let query = `
    SELECT 
      t.project_id,
      p.name as project_name,
      p.code as project_code,
      p.category as project_category,
      c.name as client_name,
      c.type as client_type,
      SUM(t.hours) as total_hours
    FROM time_entries t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN clients c ON p.client_id = c.id
  `;
  let params = [];
  const conditions = [];
  if (start && end) {
    conditions.push('substr(t.date, 1, 10) >= ? AND substr(t.date, 1, 10) <= ?');
    params.push(start, end);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' GROUP BY t.project_id';
  console.log('[ANALYTICS] SQL:', query);
  console.log('[ANALYTICS] Params:', params);
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    console.log('[ANALYTICS] Result rows:', rows);
    res.json(rows);
  });
});
// One row per user
app.get('/api/analytics/time-by-user-total', authenticateJWT, (req, res) => {
  let { startDate, endDate } = req.query;
  const start = startDate ? startDate.slice(0, 10) : null;
  const end = endDate ? endDate.slice(0, 10) : null;
  let query = `
    SELECT 
      t.user_id,
      (u.surname || ' ' || u.name) as user_name,
      SUM(t.hours) as total_hours
    FROM time_entries t
    LEFT JOIN users u ON t.user_id = u.id
  `;
  let params = [];
  const conditions = [];
  if (start && end) {
    conditions.push('substr(t.date, 1, 10) >= ? AND substr(t.date, 1, 10) <= ?');
    params.push(start, end);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' GROUP BY t.user_id';
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});
// One row per client type
app.get('/api/analytics/time-by-client-type-total', authenticateJWT, (req, res) => {
  let { startDate, endDate } = req.query;
  const start = startDate ? startDate.slice(0, 10) : null;
  const end = endDate ? endDate.slice(0, 10) : null;
  let query = `
    SELECT 
      t.user_id,
      c.type as client_type,
      SUM(t.hours) as total_hours
    FROM time_entries t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN clients c ON p.client_id = c.id
  `;
  let params = [];
  const conditions = [];
  if (start && end) {
    conditions.push('substr(t.date, 1, 10) >= ? AND substr(t.date, 1, 10) <= ?');
    params.push(start, end);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' GROUP BY c.type, t.user_id';
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/analytics/test', (req, res) => {
  console.log('[ANALYTICS] Test endpoint hit');
  res.json({ ok: true });
});

// Endpoint to get current NODE_ENV for frontend
app.get('/api/env', (req, res) => {
  res.json({ NODE_ENV: process.env.NODE_ENV || 'development' });
});

// Endpoint to check if setup is required
app.get('/api/setup-required', async (req, res) => {
  await checkFirstRun();
  res.json({ setupRequired });
});

app.use('/avatars', express.static(path.join(__dirname, 'client', 'public', 'avatars')));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'build')));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    return res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
  });
} else {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    const frontendBaseUrl = normalizeBaseUrl(process.env.APP_BASE_URL) || 'http://localhost:3000';
    return res.redirect(307, `${frontendBaseUrl}${req.originalUrl}`);
  });
}

// On server start, check if any users exist and if an admin exists
async function checkFirstRun() {
  return new Promise((resolve) => {
    db.get('SELECT COUNT(*) as count FROM users', async (err, row) => {
      if (err || !row || row.count === 0) {
        setupRequired = true;
      } else {
        // Check for admin user
        const hasAdmin = await checkAdminUserExists();
        setupRequired = !hasAdmin;
      }
      resolve();
    });
  });
}

// Setup endpoint: create first admin and save SMTP settings
app.post('/api/setup', async (req, res) => {
  if (!setupRequired) return sendApiError(res, 400, 'setupCompleted');
  const { name, surname, email, smtp } = req.body;
  const isProduction = process.env.NODE_ENV === 'production';
  if (!name || !surname || !email) {
    return sendApiError(res, 400, 'setupMissingFields');
  }
  const sanitizedSmtp = smtp || {};
  const hasSmtp = sanitizedSmtp.host && sanitizedSmtp.port && sanitizedSmtp.user && sanitizedSmtp.pass && sanitizedSmtp.from;
  const existingSmtpConfigured = isCompleteSmtpSettings(loadSmtpSettings());
  const setupSmtpSettings = hasSmtp ? buildSmtpSettingsFromBody(sanitizedSmtp) : null;

  if (isProduction && !hasSmtp && !existingSmtpConfigured) {
    return sendApiError(res, 400, 'setupSmtpRequired');
  }
  if (setupSmtpSettings && !validateSmtpSettings(setupSmtpSettings)) {
    return sendApiError(res, 400, 'smtpIncomplete');
  }

  // Create admin user
  db.run('INSERT INTO users (name, surname, email, role, invited, deleted) VALUES (?, ?, ?, ?, 0, 0)',
    [name, surname, email, 'admin'],
    async function(err) {
      if (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
          return db.get('SELECT id, deleted FROM users WHERE email = ?', [email], (lookupErr, existing) => {
            if (lookupErr || !existing) {
              return checkFirstRun().then(() => {
                sendApiError(res, 409, 'setupAdminExists', {}, { setupRequired });
              });
            }
            db.run(
              'UPDATE users SET name = ?, surname = ?, role = ?, deleted = 0, invited = 0 WHERE id = ?',
              [name, surname, 'admin', existing.id],
              async function(updateErr) {
                if (updateErr) {
                  console.error('[Setup] Failed to update existing admin:', updateErr);
                  return res.status(500).json({ error: updateErr.message });
                }
                console.log('[Setup] Re-activated existing admin account for', email);
                await checkFirstRun();
                res.json({ success: true, revived: true });
              }
            );
          });
        }
        return res.status(500).json({ error: err.message });
      }
      if (hasSmtp) {
        try {
          saveSmtpSettings(setupSmtpSettings);
        } catch (saveErr) {
          console.error('[Setup] Failed to save SMTP settings:', saveErr);
          return sendApiError(res, 500, 'smtpSaveFailed');
        }
      } else if (!isProduction && !hasSmtp) {
        console.log('[Setup] SMTP settings not provided; skipping save for development.');
      }
      // Re-check admin user existence
      await checkFirstRun();
      res.json({ success: true });
    });
});

// Start the server after ensuring tables are created
loadFixtures().then(async () => {
  await checkFirstRun();
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    if (setupRequired) {
      console.log('Initial setup required. Visit /setup to configure admin and SMTP.');
    }
  });
});

const uploadDir = path.join(__dirname, 'client', 'public', 'avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, base + '-' + unique + ext);
  }
});
const upload = multer({ storage });

app.post('/api/upload-avatar', authenticateJWT, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return sendApiError(res, 400, 'uploadNoFile');
  }
  const publicUrl = `/avatars/${req.file.filename}`;
  res.json({ url: publicUrl });
});

