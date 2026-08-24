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
const {
  BPS_SCALE,
  parseBudgetPayload,
  mapBudgetRow,
  calculateLaborSummary,
  buildLaborCostSeries,
  kopecksToRubles,
  getProjectFinancialRisk,
  getProjectPayrollUsage,
} = require('./budgetUtils');
const { getProjectEditRole, canEditProjectField } = require('./projectUtils');
const { activateVerifiedUser, migratePreviouslyAuthenticatedInvitedUsers } = require('./userActivation');
const { buildDashboardTimeSeries } = require('./dashboardAnalytics');
const { buildTeamWeeklyOverview, getIsoWeeks } = require('./teamWeeklyOverview');
const { buildContractComparisonProjects } = require('./contractComparison');
const { buildProjectHoursAnalyticsResponse } = require('./projectHoursAnalytics');

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
  projectsNameRequired: { errorCode: 'projects.name_required', error: 'Project name is required.' },
  projectsClientRequired: { errorCode: 'projects.client_required', error: 'Project client is required.' },
  projectsClientInvalid: { errorCode: 'projects.client_invalid', error: 'Project client was not found.' },
  projectsEditForbidden: { errorCode: 'projects.edit_forbidden', error: 'Only an administrator or the current project manager can edit this project.' },
  projectsFieldForbidden: { errorCode: 'projects.field_forbidden', error: 'You cannot edit this project field.' },
  projectsNoFieldsToUpdate: { errorCode: 'projects.no_fields_to_update', error: 'No fields to update.' },
  projectsNotFound: { errorCode: 'projects.not_found', error: 'Project not found' },
  projectManagerInvalid: { errorCode: 'project_manager.invalid_candidate', error: 'The selected user cannot be assigned as project manager.' },
  projectManagerUpdateFailed: { errorCode: 'project_manager.update_failed', error: 'Failed to update the project manager.' },
  notificationsNotFound: { errorCode: 'notifications.not_found', error: 'Notification not found.' },
  timeEntriesDuplicate: { errorCode: 'time_entries.duplicate', error: 'Duplicate time entry for this user, project, and day.' },
  timeEntriesNoFieldsToUpdate: { errorCode: 'time_entries.no_fields_to_update', error: 'No fields to update.' },
  timeEntriesNotFound: { errorCode: 'time_entries.not_found', error: 'Time entry not found' },
  timeEntriesWeekRequired: { errorCode: 'time_entries.week_required', error: 'user_id, project_id, and week_start are required' },
  timeEntriesNoEntries: { errorCode: 'time_entries.no_entries', error: 'No entries provided.' },
  adminForbidden: { errorCode: 'admin.forbidden', error: 'Only administrators can perform this action.' },
  financialForbidden: { errorCode: 'financial.forbidden', error: 'Only administrators can manage financial data.' },
  budgetValidationFailed: { errorCode: 'budget.validation_failed', error: '{{message}}' },
  budgetNotFound: { errorCode: 'budget.not_found', error: 'Budget was not found.' },
  budgetPendingRequest: { errorCode: 'budget.pending_request_exists', error: 'Resolve the pending budget request first.' },
  budgetRequestNotFound: { errorCode: 'budget_request.not_found', error: 'Budget request was not found.' },
  budgetRequestPending: { errorCode: 'budget_request.pending_exists', error: 'A pending budget request already exists.' },
  budgetRequestStale: { errorCode: 'budget_request.stale', error: 'The budget request is no longer pending.' },
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
  await createBudgetTables();
  await createInvitationsTable();
  await createMagicLinksTable();
  await createAuthSessionsTable();
  const invitedUserMigration = await migratePreviouslyAuthenticatedInvitedUsers(db);
  if (invitedUserMigration.applied) {
    console.log(`[Migration] Activated ${invitedUserMigration.activatedCount} previously authenticated invited user(s)`);
  }
  await createNotificationsTable();
  await createProductUpdateTables();
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

  // Project manager assignment and audit fields. These nullable columns keep
  // upgrades compatible with existing SQLite databases.
  for (const statement of [
    `ALTER TABLE projects ADD COLUMN manager_user_id INTEGER REFERENCES users(id)`,
    `ALTER TABLE projects ADD COLUMN manager_updated_at DATETIME`,
    `ALTER TABLE projects ADD COLUMN manager_updated_by INTEGER REFERENCES users(id)`,
    `ALTER TABLE projects ADD COLUMN current_budget_version_id INTEGER`,
    `ALTER TABLE projects ADD COLUMN budget_updated_at DATETIME`,
    `ALTER TABLE projects ADD COLUMN budget_updated_by INTEGER REFERENCES users(id)`,
  ]) {
    await new Promise((resolve, reject) => {
      db.run(statement, err => {
        if (err && !/duplicate column/.test(err.message)) reject(err); else resolve();
      });
    });
  }

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

  await new Promise((resolve, reject) => {
    db.run(`CREATE INDEX IF NOT EXISTS idx_projects_manager_user_id ON projects(manager_user_id)`, err => {
      if (err) reject(err); else resolve();
    });
  });
}

async function createBudgetTables() {
  await runDb(`CREATE TABLE IF NOT EXISTS project_budget_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    budget_mode TEXT NOT NULL CHECK(budget_mode IN ('none', 'contract', 'manual')),
    contract_amount_kopecks INTEGER,
    management_reserve_bps INTEGER,
    management_reserve_kopecks INTEGER,
    project_budget_limit_kopecks INTEGER CHECK(project_budget_limit_kopecks >= 0),
    payroll_limit_mode TEXT CHECK(payroll_limit_mode IN ('fixed_amount', 'percent')),
    payroll_limit_bps INTEGER CHECK(payroll_limit_bps >= 0 AND payroll_limit_bps <= 10000),
    payroll_limit_kopecks INTEGER CHECK(payroll_limit_kopecks >= 0),
    payroll_warning_threshold_bps INTEGER CHECK(payroll_warning_threshold_bps > 0 AND payroll_warning_threshold_bps < 10000),
    note TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER,
    approved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users(id),
    FOREIGN KEY(approved_by) REFERENCES users(id),
    UNIQUE(project_id, version_number),
    CHECK(budget_mode = 'none' OR payroll_limit_kopecks <= project_budget_limit_kopecks)
  )`);

  await runDb(`CREATE TABLE IF NOT EXISTS project_budget_change_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    base_budget_version_id INTEGER,
    responsible_manager_user_id INTEGER,
    requested_by INTEGER NOT NULL,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL,
    budget_mode TEXT NOT NULL CHECK(budget_mode IN ('contract', 'manual')),
    contract_amount_kopecks INTEGER,
    management_reserve_bps INTEGER,
    management_reserve_kopecks INTEGER,
    project_budget_limit_kopecks INTEGER NOT NULL,
    payroll_limit_mode TEXT NOT NULL CHECK(payroll_limit_mode IN ('fixed_amount', 'percent')),
    payroll_limit_bps INTEGER NOT NULL,
    payroll_limit_kopecks INTEGER NOT NULL,
    payroll_warning_threshold_bps INTEGER NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    review_comment TEXT,
    approved_budget_version_id INTEGER,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(base_budget_version_id) REFERENCES project_budget_versions(id),
    FOREIGN KEY(responsible_manager_user_id) REFERENCES users(id),
    FOREIGN KEY(requested_by) REFERENCES users(id),
    FOREIGN KEY(reviewed_by) REFERENCES users(id),
    FOREIGN KEY(approved_budget_version_id) REFERENCES project_budget_versions(id)
  )`);
  await runDb('CREATE INDEX IF NOT EXISTS idx_project_budget_versions_project ON project_budget_versions(project_id, version_number DESC)');
  await runDb('CREATE INDEX IF NOT EXISTS idx_budget_requests_project_status ON project_budget_change_requests(project_id, status)');
  await runDb("CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_budget_request ON project_budget_change_requests(project_id) WHERE status = 'pending'");

  const addColumnIfMissing = async (table, column, definition) => {
    const columns = await allDb(`PRAGMA table_info(${table})`);
    if (!columns.some((item) => item.name === column)) {
      await runDb(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };

  await addColumnIfMissing('project_budget_versions', 'change_reason', 'TEXT');
  await addColumnIfMissing('project_budget_versions', 'source_type', "TEXT NOT NULL DEFAULT 'admin_direct'");
  await addColumnIfMissing('project_budget_versions', 'source_request_id', 'INTEGER');
  await addColumnIfMissing('project_budget_change_requests', 'current_revision_number', 'INTEGER NOT NULL DEFAULT 1');
  await addColumnIfMissing('project_budget_change_requests', 'decision_type', 'TEXT');
  await addColumnIfMissing('project_budget_change_requests', 'proposed_version_number', 'INTEGER');
  await ensureBudgetVersionsSupportNoLimit();

  await runDb(`CREATE TABLE IF NOT EXISTS project_budget_request_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    revision_number INTEGER NOT NULL,
    reason TEXT NOT NULL,
    budget_mode TEXT NOT NULL CHECK(budget_mode IN ('contract', 'manual')),
    contract_amount_kopecks INTEGER,
    management_reserve_bps INTEGER,
    management_reserve_kopecks INTEGER,
    project_budget_limit_kopecks INTEGER NOT NULL,
    payroll_limit_mode TEXT NOT NULL CHECK(payroll_limit_mode IN ('fixed_amount', 'percent')),
    payroll_limit_bps INTEGER NOT NULL,
    payroll_limit_kopecks INTEGER NOT NULL,
    payroll_warning_threshold_bps INTEGER NOT NULL,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(request_id) REFERENCES project_budget_change_requests(id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users(id),
    UNIQUE(request_id, revision_number)
  )`);
  await runDb('CREATE INDEX IF NOT EXISTS idx_budget_request_revisions_request ON project_budget_request_revisions(request_id, revision_number DESC)');
  await runDb(`CREATE TABLE IF NOT EXISTS project_budget_audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    actor_user_id INTEGER,
    budget_version_id INTEGER,
    request_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(actor_user_id) REFERENCES users(id),
    FOREIGN KEY(budget_version_id) REFERENCES project_budget_versions(id),
    FOREIGN KEY(request_id) REFERENCES project_budget_change_requests(id)
  )`);
  await runDb('CREATE INDEX IF NOT EXISTS idx_budget_audit_project ON project_budget_audit_events(project_id, id DESC)');
  await runDb(`INSERT OR IGNORE INTO project_budget_request_revisions (
    request_id, revision_number, reason, budget_mode, contract_amount_kopecks,
    management_reserve_bps, management_reserve_kopecks, project_budget_limit_kopecks,
    payroll_limit_mode, payroll_limit_bps, payroll_limit_kopecks,
    payroll_warning_threshold_bps, created_by, created_at
  )
  SELECT id, 1, reason, budget_mode, contract_amount_kopecks,
    management_reserve_bps, management_reserve_kopecks, project_budget_limit_kopecks,
    payroll_limit_mode, payroll_limit_bps, payroll_limit_kopecks,
    payroll_warning_threshold_bps, requested_by, requested_at
  FROM project_budget_change_requests`);
  await runDb(`UPDATE project_budget_versions
    SET change_reason = COALESCE(NULLIF(TRIM(note), ''), 'Причина не указана')
    WHERE change_reason IS NULL OR TRIM(change_reason) = ''`);
  await migrateUnifiedBudgetVersionNumbers();
  await runDb('CREATE INDEX IF NOT EXISTS idx_project_budget_versions_project ON project_budget_versions(project_id, version_number DESC)');
  await runDb(`CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_requests_project_version
    ON project_budget_change_requests(project_id, proposed_version_number)
    WHERE proposed_version_number IS NOT NULL`);
}

async function ensureBudgetVersionsSupportNoLimit() {
  const table = await getDb("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'project_budget_versions'");
  if (!table?.sql || table.sql.includes("'none'")) return;
  await runDb('BEGIN IMMEDIATE TRANSACTION');
  try {
    await runDb(`CREATE TABLE project_budget_versions_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      version_number INTEGER NOT NULL,
      budget_mode TEXT NOT NULL CHECK(budget_mode IN ('none', 'contract', 'manual')),
      contract_amount_kopecks INTEGER,
      management_reserve_bps INTEGER,
      management_reserve_kopecks INTEGER,
      project_budget_limit_kopecks INTEGER CHECK(project_budget_limit_kopecks >= 0),
      payroll_limit_mode TEXT CHECK(payroll_limit_mode IN ('fixed_amount', 'percent')),
      payroll_limit_bps INTEGER CHECK(payroll_limit_bps >= 0 AND payroll_limit_bps <= 10000),
      payroll_limit_kopecks INTEGER CHECK(payroll_limit_kopecks >= 0),
      payroll_warning_threshold_bps INTEGER CHECK(payroll_warning_threshold_bps > 0 AND payroll_warning_threshold_bps < 10000),
      note TEXT,
      change_reason TEXT,
      source_type TEXT NOT NULL DEFAULT 'admin_direct',
      source_request_id INTEGER,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_by INTEGER,
      approved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES users(id),
      FOREIGN KEY(approved_by) REFERENCES users(id),
      UNIQUE(project_id, version_number),
      CHECK(budget_mode = 'none' OR payroll_limit_kopecks <= project_budget_limit_kopecks)
    )`);
    await runDb(`INSERT INTO project_budget_versions_v2 (
      id, project_id, version_number, budget_mode, contract_amount_kopecks,
      management_reserve_bps, management_reserve_kopecks, project_budget_limit_kopecks,
      payroll_limit_mode, payroll_limit_bps, payroll_limit_kopecks,
      payroll_warning_threshold_bps, note, change_reason, source_type, source_request_id,
      created_by, created_at, approved_by, approved_at
    )
    SELECT id, project_id, version_number, budget_mode, contract_amount_kopecks,
      management_reserve_bps, management_reserve_kopecks, project_budget_limit_kopecks,
      payroll_limit_mode, payroll_limit_bps, payroll_limit_kopecks,
      payroll_warning_threshold_bps, note, change_reason, source_type, source_request_id,
      created_by, created_at, approved_by, approved_at
    FROM project_budget_versions`);
    await runDb('DROP TABLE project_budget_versions');
    await runDb('ALTER TABLE project_budget_versions_v2 RENAME TO project_budget_versions');
    await runDb('COMMIT');
  } catch (error) {
    await runDb('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function migrateUnifiedBudgetVersionNumbers() {
  await runDb(`CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_key TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  const migrationKey = 'unified_budget_version_numbers_v1';
  if (await getDb('SELECT migration_key FROM schema_migrations WHERE migration_key = ?', [migrationKey])) return;

  await runDb('BEGIN IMMEDIATE TRANSACTION');
  try {
    const projects = await allDb(`SELECT DISTINCT project_id FROM (
      SELECT project_id FROM project_budget_versions
      UNION SELECT project_id FROM project_budget_change_requests
      UNION SELECT project_id FROM project_budget_audit_events WHERE event_type = 'budget_removed'
    )`);
    for (const { project_id: projectId } of projects) {
      const [versions, requests, removals] = await Promise.all([
        allDb('SELECT * FROM project_budget_versions WHERE project_id = ?', [projectId]),
        allDb('SELECT * FROM project_budget_change_requests WHERE project_id = ?', [projectId]),
        allDb("SELECT * FROM project_budget_audit_events WHERE project_id = ? AND event_type = 'budget_removed'", [projectId]),
      ]);
      const requestById = new Map(requests.map((request) => [Number(request.id), request]));
      const requestByApprovedVersion = new Map(
        requests.filter((request) => request.approved_budget_version_id)
          .map((request) => [Number(request.approved_budget_version_id), request])
      );
      const representedRequestIds = new Set();
      const events = [];

      versions.forEach((version) => {
        const request = requestById.get(Number(version.source_request_id))
          || requestByApprovedVersion.get(Number(version.id))
          || null;
        if (request) representedRequestIds.add(Number(request.id));
        events.push({
          kind: 'version',
          id: Number(version.id),
          version,
          request,
          timestamp: request?.requested_at || version.created_at || version.approved_at || '',
          stableOrder: Number(version.id),
        });
      });
      requests.forEach((request) => {
        if (representedRequestIds.has(Number(request.id))) return;
        events.push({
          kind: 'request',
          id: Number(request.id),
          request,
          timestamp: request.requested_at || '',
          stableOrder: 1000000000 + Number(request.id),
        });
      });
      removals.forEach((event) => {
        events.push({
          kind: 'removal',
          id: Number(event.id),
          event,
          timestamp: event.created_at || '',
          stableOrder: 2000000000 + Number(event.id),
        });
      });
      events.sort((left, right) => (
        String(left.timestamp).localeCompare(String(right.timestamp))
        || left.stableOrder - right.stableOrder
      ));

      await runDb('UPDATE project_budget_versions SET version_number = -id WHERE project_id = ?', [projectId]);
      for (let index = 0; index < events.length; index += 1) {
        const versionNumber = index + 1;
        const event = events[index];
        if (event.kind === 'version') {
          await runDb(
            `UPDATE project_budget_versions SET version_number = ?, source_type = ?,
             source_request_id = COALESCE(?, source_request_id) WHERE id = ?`,
            [versionNumber, event.request ? 'budget_request' : (event.version.source_type || 'admin_direct'), event.request?.id || null, event.id]
          );
          if (event.request) {
            await runDb(
              'UPDATE project_budget_change_requests SET proposed_version_number = ? WHERE id = ?',
              [versionNumber, event.request.id]
            );
          }
        } else if (event.kind === 'request') {
          await runDb(
            'UPDATE project_budget_change_requests SET proposed_version_number = ? WHERE id = ?',
            [versionNumber, event.id]
          );
        } else {
          const insertion = await runDb(
            `INSERT INTO project_budget_versions (
              project_id, version_number, budget_mode, contract_amount_kopecks,
              management_reserve_bps, management_reserve_kopecks, project_budget_limit_kopecks,
              payroll_limit_mode, payroll_limit_bps, payroll_limit_kopecks,
              payroll_warning_threshold_bps, note, change_reason, source_type,
              created_by, created_at, approved_by, approved_at
            ) VALUES (?, ?, 'none', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, 'admin_direct', ?, ?, ?, ?)`,
            [
              projectId, versionNumber, event.event.reason || 'Причина не указана',
              event.event.actor_user_id, event.event.created_at,
              event.event.actor_user_id, event.event.created_at,
            ]
          );
          await runDb(
            'UPDATE project_budget_audit_events SET budget_version_id = ? WHERE id = ?',
            [insertion.lastID, event.id]
          );
        }
      }
      const latestApproved = await getDb(
        'SELECT id FROM project_budget_versions WHERE project_id = ? ORDER BY version_number DESC LIMIT 1',
        [projectId]
      );
      await runDb(
        'UPDATE projects SET current_budget_version_id = ? WHERE id = ?',
        [latestApproved?.id || null, projectId]
      );
    }
    await runDb('INSERT INTO schema_migrations (migration_key) VALUES (?)', [migrationKey]);
    await runDb('COMMIT');
  } catch (error) {
    await runDb('ROLLBACK').catch(() => {});
    throw error;
  }
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

async function createNotificationsTable() {
  const existing = await getDb("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notifications'");
  const needsMigration = existing && (
    !existing.sql.includes('budget_version_id')
    || !existing.sql.includes('project_payroll_warning')
    || !existing.sql.includes('project_budget_change_updated')
  );
  if (needsMigration) {
    await runDb('BEGIN IMMEDIATE TRANSACTION');
    try {
      await runDb('ALTER TABLE notifications RENAME TO notifications_legacy');
      await runDb(`CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK(type IN (
          'project_manager_assigned', 'project_manager_removed',
           'project_payroll_warning', 'project_payroll_limit_reached',
          'project_budget_change_requested', 'project_budget_change_updated', 'project_budget_change_approved',
          'project_budget_change_rejected', 'project_budget_request_transferred'
        )),
        project_id INTEGER,
        project_name TEXT NOT NULL,
        actor_user_id INTEGER,
        budget_version_id INTEGER,
        budget_change_request_id INTEGER,
        threshold_bps INTEGER,
        metadata_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (actor_user_id) REFERENCES users(id),
        FOREIGN KEY (budget_version_id) REFERENCES project_budget_versions(id),
        FOREIGN KEY (budget_change_request_id) REFERENCES project_budget_change_requests(id)
      )`);
      await runDb(`INSERT INTO notifications (id, user_id, type, project_id, project_name, actor_user_id, created_at, read_at)
                   SELECT id, user_id, type, project_id, project_name, actor_user_id, created_at, read_at
                   FROM notifications_legacy`);
      await runDb('DROP TABLE notifications_legacy');
      await runDb('COMMIT');
    } catch (err) {
      await runDb('ROLLBACK').catch(() => {});
      throw err;
    }
  } else {
    await runDb(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN (
        'project_manager_assigned', 'project_manager_removed',
         'project_payroll_warning', 'project_payroll_limit_reached',
        'project_budget_change_requested', 'project_budget_change_updated', 'project_budget_change_approved',
        'project_budget_change_rejected', 'project_budget_request_transferred'
      )),
      project_id INTEGER,
      project_name TEXT NOT NULL,
      actor_user_id INTEGER,
      budget_version_id INTEGER,
      budget_change_request_id INTEGER,
      threshold_bps INTEGER,
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
      FOREIGN KEY (actor_user_id) REFERENCES users(id),
      FOREIGN KEY (budget_version_id) REFERENCES project_budget_versions(id),
      FOREIGN KEY (budget_change_request_id) REFERENCES project_budget_change_requests(id)
    )`);
  }
  await runDb('CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, id DESC)');
  await runDb('CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at)');
  await runDb(`CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_budget_threshold_recipient
               ON notifications(user_id, type, budget_version_id)
               WHERE budget_version_id IS NOT NULL AND type IN ('project_payroll_warning', 'project_payroll_limit_reached')`);
  await runDb(`CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_budget_request_recipient
               ON notifications(user_id, type, budget_change_request_id)
               WHERE budget_change_request_id IS NOT NULL`);
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

function canActForUser(requestUser, targetUserId) {
  return Boolean(
    requestUser
    && (requestUser.role === 'admin' || Number(requestUser.id) === Number(targetUserId))
  );
}

function rejectForeignUser(req, res, targetUserId) {
  if (canActForUser(req.user, targetUserId)) return false;
  sendApiError(res, 403, 'adminForbidden');
  return true;
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

function mapProjectManagerRow(row) {
  return {
    project: row ? { id: row.id, name: row.name } : null,
    manager: row?.manager_user_id ? {
      id: row.manager_user_id,
      name: row.manager_name,
      surname: row.manager_surname || '',
      email: row.manager_email,
    } : null,
    updatedAt: row?.manager_updated_at || null,
    updatedBy: row?.manager_updated_by ? {
      id: row.manager_updated_by,
      name: row.updater_name,
      surname: row.updater_surname || '',
    } : null,
  };
}

function mapBudgetRequestRow(row) {
  if (!row) return null;
  const proposedBudget = mapBudgetRow({ ...row, id: -1, version_number: null, approved_at: null });
  if (proposedBudget) {
    delete proposedBudget.id;
    delete proposedBudget.version;
    delete proposedBudget.approvedAt;
  }
  return {
    id: row.id,
    projectId: row.project_id,
    baseBudgetVersionId: row.base_budget_version_id,
    responsibleManagerUserId: row.responsible_manager_user_id,
    requestedBy: row.requested_by,
    requestedByName: row.requested_by_name || null,
    requestedAt: row.requested_at,
    reason: row.reason,
    status: row.status,
    proposedVersionNumber: Number(row.proposed_version_number || 0) || null,
    currentRevision: Number(row.current_revision_number || 1),
    decisionType: row.decision_type || null,
    proposedBudget,
    reviewedBy: row.reviewed_by,
    reviewedByName: row.reviewed_by_name || null,
    reviewedAt: row.reviewed_at,
    reviewComment: row.review_comment || '',
    approvedBudgetVersionId: row.approved_budget_version_id,
  };
}

function mapBudgetRevisionRow(row) {
  if (!row) return null;
  const proposedBudget = mapBudgetRow({ ...row, id: -1, version_number: null, approved_at: null });
  if (proposedBudget) {
    delete proposedBudget.id;
    delete proposedBudget.version;
    delete proposedBudget.approvedAt;
    delete proposedBudget.changeReason;
    delete proposedBudget.sourceType;
    delete proposedBudget.sourceRequestId;
  }
  return {
    id: row.id,
    requestId: row.request_id,
    revision: Number(row.revision_number),
    reason: row.reason,
    createdBy: row.created_by,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    proposedBudget,
  };
}

async function getCurrentBudgetRow(projectId) {
  return getDb(
    `SELECT v.* FROM projects p
     LEFT JOIN project_budget_versions v ON v.id = p.current_budget_version_id
     WHERE p.id = ?`,
    [projectId]
  );
}

async function getProjectLaborAggregate(projectId) {
  return getDb(
    `SELECT
       COALESCE(SUM(CASE WHEN r.id IS NULL THEN 0 ELSE ROUND(t.hours * r.rate_rub_per_hour * 100) END), 0) AS total_labor_cost_kopecks,
       COALESCE(SUM(CASE WHEN r.id IS NULL THEN 1 ELSE 0 END), 0) AS missing_rate_entries_count
     FROM time_entries t
     LEFT JOIN user_rate_history r ON r.id = (
       SELECT candidate.id FROM user_rate_history candidate
       WHERE candidate.user_id = t.user_id
         AND candidate.effective_from <= substr(t.date, 1, 10)
         AND (candidate.effective_to IS NULL OR candidate.effective_to >= substr(t.date, 1, 10))
       ORDER BY candidate.effective_from DESC, candidate.id DESC LIMIT 1
     )
     WHERE t.project_id = ?`,
    [projectId]
  );
}

async function getProjectLaborCostSeries(projectId) {
  const rows = await allDb(
    `SELECT
       substr(t.date, 1, 10) AS entry_date,
       COALESCE(SUM(CASE WHEN r.id IS NULL THEN 0 ELSE ROUND(t.hours * r.rate_rub_per_hour * 100) END), 0) AS daily_labor_cost_kopecks,
       COALESCE(SUM(CASE WHEN r.id IS NULL THEN 1 ELSE 0 END), 0) AS missing_rate_entries_count
     FROM time_entries t
     LEFT JOIN user_rate_history r ON r.id = (
       SELECT candidate.id FROM user_rate_history candidate
       WHERE candidate.user_id = t.user_id
         AND candidate.effective_from <= substr(t.date, 1, 10)
         AND (candidate.effective_to IS NULL OR candidate.effective_to >= substr(t.date, 1, 10))
       ORDER BY candidate.effective_from DESC, candidate.id DESC LIMIT 1
     )
     WHERE t.project_id = ?
     GROUP BY substr(t.date, 1, 10)
     ORDER BY entry_date ASC`,
    [projectId]
  );
  return buildLaborCostSeries(rows);
}

async function getActiveBudgetRequest(projectId) {
  return getDb(
    `SELECT r.*, TRIM(COALESCE(u.surname, '') || ' ' || COALESCE(u.name, '')) AS requested_by_name,
      TRIM(COALESCE(reviewer.surname, '') || ' ' || COALESCE(reviewer.name, '')) AS reviewed_by_name
     FROM project_budget_change_requests r
     LEFT JOIN users u ON u.id = r.requested_by
     LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
     WHERE r.project_id = ? AND r.status = 'pending'`,
    [projectId]
  );
}

async function insertBudgetRequestRevision(requestId, revisionNumber, normalized, reason, actorUserId) {
  const result = await runDb(
    `INSERT INTO project_budget_request_revisions (
      request_id, revision_number, reason, budget_mode, contract_amount_kopecks,
      management_reserve_bps, management_reserve_kopecks, project_budget_limit_kopecks,
      payroll_limit_mode, payroll_limit_bps, payroll_limit_kopecks,
      payroll_warning_threshold_bps, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      requestId, revisionNumber, reason, normalized.budget_mode, normalized.contract_amount_kopecks,
      normalized.management_reserve_bps, normalized.management_reserve_kopecks,
      normalized.project_budget_limit_kopecks, normalized.payroll_limit_mode,
      normalized.payroll_limit_bps, normalized.payroll_limit_kopecks,
      normalized.payroll_warning_threshold_bps, actorUserId,
    ]
  );
  return result.lastID;
}

async function createBudgetVersion(projectId, normalized, actorUserId, {
  reason = '',
  sourceType = 'admin_direct',
  sourceRequestId = null,
  versionNumber = null,
} = {}) {
  const nextVersionNumber = versionNumber || await getNextBudgetVersionNumber(projectId);
  const result = await runDb(
    `INSERT INTO project_budget_versions (
       project_id, version_number, budget_mode, contract_amount_kopecks,
       management_reserve_bps, management_reserve_kopecks, project_budget_limit_kopecks,
       payroll_limit_mode, payroll_limit_bps, payroll_limit_kopecks,
       payroll_warning_threshold_bps, note, change_reason, source_type, source_request_id,
       created_by, approved_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId, nextVersionNumber, normalized.budget_mode, normalized.contract_amount_kopecks ?? null,
      normalized.management_reserve_bps ?? null, normalized.management_reserve_kopecks ?? null,
      normalized.project_budget_limit_kopecks ?? null,
      normalized.payroll_limit_mode ?? null, normalized.payroll_limit_bps ?? null,
      normalized.payroll_limit_kopecks ?? null,
      normalized.payroll_warning_threshold_bps ?? null, null, reason.trim(), sourceType, sourceRequestId,
      actorUserId, actorUserId,
    ]
  );
  await runDb(
    `UPDATE projects SET current_budget_version_id = ?, budget_updated_at = CURRENT_TIMESTAMP, budget_updated_by = ? WHERE id = ?`,
    [result.lastID, actorUserId, projectId]
  );
  return getDb('SELECT * FROM project_budget_versions WHERE id = ?', [result.lastID]);
}

async function getNextBudgetVersionNumber(projectId) {
  const row = await getDb(
    `SELECT MAX(version_number) AS max_number FROM (
      SELECT version_number FROM project_budget_versions WHERE project_id = ?
      UNION ALL
      SELECT proposed_version_number AS version_number
      FROM project_budget_change_requests
      WHERE project_id = ? AND proposed_version_number IS NOT NULL
    )`,
    [projectId, projectId]
  );
  return Number(row?.max_number || 0) + 1;
}

async function insertBudgetNotification({ userId, type, project, actorUserId = null, budgetVersionId = null, requestId = null, thresholdBps = null, metadata = null }) {
  return runDb(
    `INSERT OR IGNORE INTO notifications (
       user_id, type, project_id, project_name, actor_user_id,
       budget_version_id, budget_change_request_id, threshold_bps, metadata_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, type, project.id, project.name, actorUserId, budgetVersionId, requestId, thresholdBps, metadata ? JSON.stringify(metadata) : null]
  );
}

async function getBudgetNotificationRecipients(project) {
  const admins = await allDb("SELECT id, name, surname, email, language FROM users WHERE role = 'admin' AND deleted = 0 AND invited = 0");
  const recipients = [...admins];
  if (project.manager_user_id && !recipients.some((recipient) => Number(recipient.id) === Number(project.manager_user_id))) {
    const manager = await getDb('SELECT id, name, surname, email, language FROM users WHERE id = ? AND deleted = 0', [project.manager_user_id]);
    if (manager) recipients.push(manager);
  }
  return recipients;
}

async function evaluateProjectBudgetThresholds(projectId, actorUserId = null, reqContext = null) {
  const project = await getDb('SELECT id, name, manager_user_id, current_budget_version_id FROM projects WHERE id = ?', [projectId]);
  if (!project || !project.current_budget_version_id) return null;
  const budget = await getDb('SELECT * FROM project_budget_versions WHERE id = ?', [project.current_budget_version_id]);
  if (!budget || budget.budget_mode === 'none') return null;
  const aggregate = await getProjectLaborAggregate(projectId);
  const total = Number(aggregate.total_labor_cost_kopecks || 0);
  const limit = Number(budget.payroll_limit_kopecks || 0);
  const hasSpendAgainstZero = limit === 0 && total > 0;
  const warningReached = hasSpendAgainstZero || (limit > 0 && total * BPS_SCALE >= limit * budget.payroll_warning_threshold_bps);
  const limitReached = hasSpendAgainstZero || (limit > 0 && total >= limit);
  if (warningReached || limitReached) {
    const recipients = await getBudgetNotificationRecipients(project);
    for (const recipient of recipients) {
      if (warningReached) {
        const inserted = await insertBudgetNotification({
          userId: recipient.id, type: 'project_payroll_warning', project, actorUserId,
          budgetVersionId: budget.id, thresholdBps: budget.payroll_warning_threshold_bps,
        });
        if (inserted.changes && reqContext) {
          sendBudgetNotificationEmail(reqContext, recipient, 'project_payroll_warning', project.name, budget.payroll_warning_threshold_bps / 100)
            .catch((emailError) => console.error('[Budget] Warning email failed:', emailError));
        }
      }
      if (limitReached) {
        const inserted = await insertBudgetNotification({
          userId: recipient.id, type: 'project_payroll_limit_reached', project, actorUserId,
          budgetVersionId: budget.id, thresholdBps: BPS_SCALE,
        });
        if (inserted.changes && reqContext) {
          sendBudgetNotificationEmail(reqContext, recipient, 'project_payroll_limit_reached', project.name)
            .catch((emailError) => console.error('[Budget] Limit email failed:', emailError));
        }
      }
    }
  }
  return limitReached ? { projectId: project.id, type: 'payroll_limit_reached' } : null;
}

async function evaluateProjectsForUserRates(userId, actorUserId = null, reqContext = null) {
  const rows = await allDb('SELECT DISTINCT project_id FROM time_entries WHERE user_id = ?', [userId]);
  for (const row of rows) await evaluateProjectBudgetThresholds(row.project_id, actorUserId, reqContext);
}

async function getBudgetStatus(projectId) {
  const rawBudget = await getCurrentBudgetRow(projectId);
  const budget = rawBudget?.id ? rawBudget : null;
  const [aggregate, activeRequest, laborCostSeries] = await Promise.all([
    getProjectLaborAggregate(projectId),
    getActiveBudgetRequest(projectId),
    getProjectLaborCostSeries(projectId),
  ]);
  return {
    budget: mapBudgetRow(budget),
    summary: calculateLaborSummary(
      aggregate.total_labor_cost_kopecks,
      aggregate.missing_rate_entries_count,
      budget?.budget_mode === 'none' ? null : budget
    ),
    activeRequest: mapBudgetRequestRow(activeRequest),
    laborCostSeries,
  };
}

async function getProjectManagerRow(projectId) {
  return getDb(
    `SELECT
       p.id, p.name, p.manager_user_id, p.manager_updated_at, p.manager_updated_by,
       manager.name AS manager_name, manager.surname AS manager_surname, manager.email AS manager_email,
       manager.language AS manager_language,
       updater.name AS updater_name, updater.surname AS updater_surname
     FROM projects p
     LEFT JOIN users manager ON manager.id = p.manager_user_id
     LEFT JOIN users updater ON updater.id = p.manager_updated_by
     WHERE p.id = ?`,
    [projectId]
  );
}

async function sendProjectManagerEmail(req, recipient, type, projectName, actorName) {
  const settings = loadSmtpSettings();
  if (!isCompleteSmtpSettings(settings)) {
    throw new Error(apiErrors.smtpNotConfigured.error);
  }

  const language = recipient.language === 'en' ? 'en' : 'ru';
  const assigned = type === 'project_manager_assigned';
  const strings = language === 'en'
    ? {
        subject: assigned ? `You are now managing “${projectName}”` : `You are no longer managing “${projectName}”`,
        heading: assigned ? 'Project manager assignment' : 'Project manager assignment removed',
        greeting: `Hello, ${recipient.name || ''}!`,
        message: assigned
          ? `You have been assigned as the manager of “${projectName}”.`
          : `You are no longer the manager of “${projectName}”.`,
        actor: `Changed by: ${actorName}`,
        action: 'Open projects',
      }
    : {
        subject: assigned ? `Вы назначены руководителем проекта «${projectName}»` : `Назначение руководителем проекта «${projectName}» снято`,
        heading: assigned ? 'Назначение руководителем проекта' : 'Снятие с руководства проектом',
        greeting: `Здравствуйте, ${recipient.name || ''}!`,
        message: assigned
          ? `Вы назначены руководителем проекта «${projectName}».`
          : `Вы больше не являетесь руководителем проекта «${projectName}».`,
        actor: `Изменил: ${actorName}`,
        action: 'Открыть проекты',
      };
  const projectsUrl = `${resolveAppBaseUrl(req)}/projects`;
  const templateSource = fs.readFileSync(path.join(__dirname, 'emailTemplates', 'projectManagerNotification.hbs'), 'utf8');
  const html = handlebars.compile(templateSource)({ ...strings, projectsUrl, appName: 'TimeTracker', year: new Date().getFullYear() });
  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth: settings.auth,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000,
  });

  await transporter.sendMail({
    from: settings.from,
    to: recipient.email,
    subject: strings.subject,
    text: `${strings.greeting}\n\n${strings.message}\n${strings.actor}\n\n${projectsUrl}`,
    html,
  });
}

async function sendBudgetNotificationEmail(req, recipient, type, projectName, threshold = null) {
  const settings = loadSmtpSettings();
  if (!isCompleteSmtpSettings(settings)) throw new Error(apiErrors.smtpNotConfigured.error);
  const language = recipient.language === 'en' ? 'en' : 'ru';
  const messages = {
    en: {
      project_payroll_warning: [`Payroll warning for “${projectName}”`, `The project reached ${threshold}% of its payroll limit.`],
      project_payroll_limit_reached: [`Payroll limit reached for “${projectName}”`, 'The project reached or exceeded its payroll limit.'],
      project_budget_change_requested: [`Budget request for “${projectName}”`, 'A project manager submitted a budget request.'],
      project_budget_change_updated: [`Budget request updated for “${projectName}”`, 'The project manager updated the pending budget request.'],
      project_budget_change_approved: [`Budget request approved for “${projectName}”`, 'The project budget request was approved.'],
      project_budget_change_rejected: [`Budget request rejected for “${projectName}”`, 'The project budget request was rejected.'],
      project_budget_request_transferred: [`Budget request transferred for “${projectName}”`, 'An active project budget request was transferred to you.'],
    },
    ru: {
      project_payroll_warning: [`Предупреждение по ФОТ проекта «${projectName}»`, `Проект достиг ${threshold}% лимита ФОТ.`],
      project_payroll_limit_reached: [`Лимит ФОТ проекта «${projectName}» достигнут`, 'Проект достиг или превысил лимит ФОТ.'],
      project_budget_change_requested: [`Запрос бюджета проекта «${projectName}»`, 'Руководитель проекта отправил запрос бюджета.'],
      project_budget_change_updated: [`Запрос бюджета проекта «${projectName}» изменён`, 'Руководитель проекта обновил ожидающий решения запрос.'],
      project_budget_change_approved: [`Бюджет проекта «${projectName}» одобрен`, 'Запрос бюджета проекта одобрен.'],
      project_budget_change_rejected: [`Запрос бюджета проекта «${projectName}» отклонён`, 'Запрос бюджета проекта отклонён.'],
      project_budget_request_transferred: [`Передан запрос бюджета проекта «${projectName}»`, 'Вам передан активный запрос бюджета проекта.'],
    },
  };
  const [subject, message] = messages[language][type];
  const projectsUrl = `${resolveAppBaseUrl(req)}/projects`;
  const templateSource = fs.readFileSync(path.join(__dirname, 'emailTemplates', 'projectManagerNotification.hbs'), 'utf8');
  const html = handlebars.compile(templateSource)({
    heading: subject,
    greeting: language === 'en' ? `Hello, ${recipient.name || ''}!` : `Здравствуйте, ${recipient.name || ''}!`,
    message,
    actor: '',
    action: language === 'en' ? 'Open projects' : 'Открыть проекты',
    projectsUrl,
    appName: 'TimeTracker',
    year: new Date().getFullYear(),
  });
  const transporter = nodemailer.createTransport({
    host: settings.host, port: settings.port, secure: settings.secure, auth: settings.auth,
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000,
  });
  await transporter.sendMail({ from: settings.from, to: recipient.email, subject, text: `${message}\n\n${projectsUrl}`, html });
}

app.get('/api/admin/projects/:projectId/manager', authenticateJWT, requireAdmin, async (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId)) {
    return sendApiError(res, 404, 'projectsNotFound');
  }
  try {
    const row = await getProjectManagerRow(projectId);
    if (!row) return sendApiError(res, 404, 'projectsNotFound');
    res.json(mapProjectManagerRow(row));
  } catch (err) {
    console.error('[ProjectManager] Failed to load assignment:', err);
    res.status(500).json({ errorCode: apiErrors.projectManagerUpdateFailed.errorCode, error: err.message });
  }
});

app.put('/api/admin/projects/:projectId/manager', authenticateJWT, requireAdmin, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const rawManagerId = req.body?.managerUserId;
  const managerUserId = rawManagerId === null ? null : Number(rawManagerId);
  if (!Number.isInteger(projectId)) return sendApiError(res, 404, 'projectsNotFound');
  if (rawManagerId === undefined || (managerUserId !== null && (!Number.isInteger(managerUserId) || managerUserId <= 0))) {
    return sendApiError(res, 400, 'projectManagerInvalid');
  }

  try {
    const current = await getProjectManagerRow(projectId);
    if (!current) return sendApiError(res, 404, 'projectsNotFound');

    let nextManager = null;
    if (managerUserId !== null) {
      nextManager = await getDb(
        `SELECT id, name, surname, email, language
         FROM users
         WHERE id = ? AND role IN ('user', 'admin') AND deleted = 0 AND invited = 0`,
        [managerUserId]
      );
      if (!nextManager) return sendApiError(res, 400, 'projectManagerInvalid');
    }

    if (Number(current.manager_user_id || 0) === Number(managerUserId || 0)) {
      return res.json({ ...mapProjectManagerRow(current), changed: false, emailDelivery: 'not_required' });
    }

    let previousManager = null;
    if (current.manager_user_id) {
      previousManager = await getDb(
        'SELECT id, name, surname, email, language FROM users WHERE id = ?',
        [current.manager_user_id]
      );
    }

    await runDb('BEGIN IMMEDIATE TRANSACTION');
    try {
      await runDb(
        `UPDATE projects
         SET manager_user_id = ?, manager_updated_at = CURRENT_TIMESTAMP, manager_updated_by = ?
         WHERE id = ?`,
        [managerUserId, req.user.id, projectId]
      );
      const pendingBudgetRequest = await getActiveBudgetRequest(projectId);
      if (pendingBudgetRequest) {
        await runDb(
          'UPDATE project_budget_change_requests SET responsible_manager_user_id = ? WHERE id = ?',
          [managerUserId, pendingBudgetRequest.id]
        );
        if (nextManager) {
          await insertBudgetNotification({
            userId: nextManager.id,
            type: 'project_budget_request_transferred',
            project: { id: projectId, name: current.name },
            actorUserId: req.user.id,
            requestId: pendingBudgetRequest.id,
          });
        }
      }
      if (previousManager) {
        await runDb(
          `INSERT INTO notifications (user_id, type, project_id, project_name, actor_user_id)
           VALUES (?, 'project_manager_removed', ?, ?, ?)`,
          [previousManager.id, projectId, current.name, req.user.id]
        );
      }
      if (nextManager) {
        await runDb(
          `INSERT INTO notifications (user_id, type, project_id, project_name, actor_user_id)
           VALUES (?, 'project_manager_assigned', ?, ?, ?)`,
          [nextManager.id, projectId, current.name, req.user.id]
        );
      }
      await runDb('COMMIT');
    } catch (transactionError) {
      await runDb('ROLLBACK').catch(() => {});
      throw transactionError;
    }

    const recipients = [
      previousManager && { user: previousManager, type: 'project_manager_removed' },
      nextManager && { user: nextManager, type: 'project_manager_assigned' },
    ].filter(Boolean);
    const actorName = [req.user.surname, req.user.name].filter(Boolean).join(' ');
    const emailResults = await Promise.allSettled(
      recipients.map(({ user, type }) => sendProjectManagerEmail(req, user, type, current.name, actorName))
    );
    const emailDelivery = emailResults.some((result) => result.status === 'rejected') ? 'failed' : 'sent';
    emailResults.forEach((result) => {
      if (result.status === 'rejected') console.error('[ProjectManager] Email delivery failed:', result.reason);
    });

    const updated = await getProjectManagerRow(projectId);
    if (nextManager) {
      const transferredRequest = await getActiveBudgetRequest(projectId);
      if (transferredRequest) {
        sendBudgetNotificationEmail(req, nextManager, 'project_budget_request_transferred', current.name)
          .catch((emailError) => console.error('[ProjectManager] Budget transfer email failed:', emailError));
      }
    }
    if (nextManager) {
      await evaluateProjectBudgetThresholds(projectId, req.user.id, req).catch((thresholdError) => {
        console.error('[ProjectManager] Failed to evaluate budget thresholds:', thresholdError);
      });
    }
    res.json({ ...mapProjectManagerRow(updated), changed: true, emailDelivery });
  } catch (err) {
    console.error('[ProjectManager] Failed to update assignment:', err);
    res.status(500).json({ errorCode: apiErrors.projectManagerUpdateFailed.errorCode, error: apiErrors.projectManagerUpdateFailed.error });
  }
});

app.get('/api/projects/:projectId/budget', authenticateJWT, requireProjectFinancialAccess('projectId'), async (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId)) return sendApiError(res, 404, 'projectsNotFound');
  try {
    const project = await getDb('SELECT id, name FROM projects WHERE id = ?', [projectId]);
    if (!project) return sendApiError(res, 404, 'projectsNotFound');
    res.json({ project, ...(await getBudgetStatus(projectId)) });
  } catch (err) {
    console.error('[Budget] Failed to load status:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/projects/:projectId/budget', authenticateJWT, requireFinancialAdmin, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (!Number.isInteger(projectId)) return sendApiError(res, 404, 'projectsNotFound');
  if (!reason) return sendApiError(res, 400, 'budgetValidationFailed', { message: 'Change reason is required.' });
  let normalized;
  try {
    normalized = parseBudgetPayload(req.body?.budget || req.body);
  } catch (err) {
    return sendApiError(res, 400, 'budgetValidationFailed', { message: err.message });
  }
  try {
    await runDb('BEGIN IMMEDIATE TRANSACTION');
    const project = await getDb('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      await runDb('ROLLBACK');
      return sendApiError(res, 404, 'projectsNotFound');
    }
    if (await getActiveBudgetRequest(projectId)) {
      await runDb('ROLLBACK');
      return sendApiError(res, 409, 'budgetPendingRequest');
    }
    const budget = await createBudgetVersion(projectId, normalized, req.user.id, {
      reason,
      sourceType: 'admin_direct',
    });
    await runDb('COMMIT');
    if (normalized.budget_mode !== 'none') await evaluateProjectBudgetThresholds(projectId, req.user.id, req).catch((thresholdError) => {
      console.error('[Budget] Failed to evaluate thresholds:', thresholdError);
    });
    res.json(await getBudgetStatus(projectId));
  } catch (err) {
    await runDb('ROLLBACK').catch(() => {});
    console.error('[Budget] Failed to update:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:projectId/budget-change-requests', authenticateJWT, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (!Number.isInteger(projectId)) return sendApiError(res, 404, 'projectsNotFound');
  if (!reason) return sendApiError(res, 400, 'budgetValidationFailed', { message: 'Reason is required.' });
  let normalized;
  try {
    normalized = parseBudgetPayload(req.body.proposedBudget || req.body);
    if (normalized.budget_mode === 'none') throw new Error('A budget request must propose a contract or manual budget.');
  } catch (err) {
    return sendApiError(res, 400, 'budgetValidationFailed', { message: err.message });
  }
  try {
    const project = await getDb('SELECT id, name, manager_user_id, current_budget_version_id FROM projects WHERE id = ?', [projectId]);
    if (!project) return sendApiError(res, 404, 'projectsNotFound');
    if (Number(project.manager_user_id) !== Number(req.user.id)) return sendApiError(res, 403, 'financialForbidden');
    await runDb('BEGIN IMMEDIATE TRANSACTION');
    if (await getActiveBudgetRequest(projectId)) {
      await runDb('ROLLBACK');
      return sendApiError(res, 409, 'budgetRequestPending');
    }
    const lockedProject = await getDb(
      'SELECT current_budget_version_id, manager_user_id FROM projects WHERE id = ?',
      [projectId]
    );
    if (!lockedProject || Number(lockedProject.manager_user_id) !== Number(req.user.id)) {
      await runDb('ROLLBACK');
      return sendApiError(res, lockedProject ? 403 : 404, lockedProject ? 'financialForbidden' : 'projectsNotFound');
    }
    const proposedVersionNumber = await getNextBudgetVersionNumber(projectId);
    const result = await runDb(
      `INSERT INTO project_budget_change_requests (
         project_id, base_budget_version_id, responsible_manager_user_id, requested_by, reason,
         proposed_version_number,
         budget_mode, contract_amount_kopecks, management_reserve_bps, management_reserve_kopecks,
         project_budget_limit_kopecks, payroll_limit_mode, payroll_limit_bps, payroll_limit_kopecks,
         payroll_warning_threshold_bps, note
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId, lockedProject.current_budget_version_id, lockedProject.manager_user_id, req.user.id, reason.slice(0, 2000),
        proposedVersionNumber,
        normalized.budget_mode, normalized.contract_amount_kopecks, normalized.management_reserve_bps,
        normalized.management_reserve_kopecks, normalized.project_budget_limit_kopecks,
        normalized.payroll_limit_mode, normalized.payroll_limit_bps, normalized.payroll_limit_kopecks,
        normalized.payroll_warning_threshold_bps, normalized.note || null,
      ]
    );
    await insertBudgetRequestRevision(result.lastID, 1, normalized, reason.slice(0, 2000), req.user.id);
    const admins = await allDb("SELECT id, name, surname, email, language FROM users WHERE role = 'admin' AND deleted = 0 AND invited = 0");
    for (const admin of admins) {
      await insertBudgetNotification({
        userId: admin.id, type: 'project_budget_change_requested', project,
        actorUserId: req.user.id, requestId: result.lastID,
        metadata: { version: proposedVersionNumber },
      });
    }
    await runDb('COMMIT');
    admins.forEach((admin) => {
      sendBudgetNotificationEmail(req, admin, 'project_budget_change_requested', project.name)
        .catch((emailError) => console.error('[BudgetRequest] Request email failed:', emailError));
    });
    res.status(201).json(mapBudgetRequestRow(await getActiveBudgetRequest(projectId)));
  } catch (err) {
    await runDb('ROLLBACK').catch(() => {});
    if (err.code === 'SQLITE_CONSTRAINT') return sendApiError(res, 409, 'budgetRequestPending');
    console.error('[BudgetRequest] Failed to create:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/projects/:projectId/budget-change-requests/:requestId', authenticateJWT, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const requestId = Number(req.params.requestId);
  const expectedRevision = Number(req.body?.expectedRevision);
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
  if (!Number.isInteger(projectId) || !Number.isInteger(requestId)) return sendApiError(res, 404, 'budgetRequestNotFound');
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return sendApiError(res, 400, 'budgetValidationFailed', { message: 'Expected revision is required.' });
  if (!reason) return sendApiError(res, 400, 'budgetValidationFailed', { message: 'Change reason is required.' });
  let normalized;
  try {
    normalized = parseBudgetPayload(req.body.proposedBudget || {});
    if (normalized.budget_mode === 'none') throw new Error('A budget request must propose a contract or manual budget.');
  } catch (err) {
    return sendApiError(res, 400, 'budgetValidationFailed', { message: err.message });
  }
  try {
    const project = await getDb('SELECT id, name, manager_user_id FROM projects WHERE id = ?', [projectId]);
    if (!project) return sendApiError(res, 404, 'projectsNotFound');
    if (Number(project.manager_user_id) !== Number(req.user.id)) return sendApiError(res, 403, 'financialForbidden');
    await runDb('BEGIN IMMEDIATE TRANSACTION');
    const request = await getDb(
      'SELECT * FROM project_budget_change_requests WHERE id = ? AND project_id = ?',
      [requestId, projectId]
    );
    if (!request || request.status !== 'pending' || Number(request.responsible_manager_user_id) !== Number(req.user.id)) {
      await runDb('ROLLBACK');
      return sendApiError(res, 409, 'budgetRequestStale');
    }
    if (Number(request.current_revision_number || 1) !== expectedRevision) {
      await runDb('ROLLBACK');
      return sendApiError(res, 409, 'budgetRequestStale');
    }
    const nextRevision = expectedRevision + 1;
    await runDb(
      `UPDATE project_budget_change_requests SET
        reason = ?, budget_mode = ?, contract_amount_kopecks = ?,
        management_reserve_bps = ?, management_reserve_kopecks = ?,
        project_budget_limit_kopecks = ?, payroll_limit_mode = ?, payroll_limit_bps = ?,
        payroll_limit_kopecks = ?, payroll_warning_threshold_bps = ?, note = NULL,
        current_revision_number = ?
       WHERE id = ?`,
      [
        reason.slice(0, 2000), normalized.budget_mode, normalized.contract_amount_kopecks,
        normalized.management_reserve_bps, normalized.management_reserve_kopecks,
        normalized.project_budget_limit_kopecks, normalized.payroll_limit_mode,
        normalized.payroll_limit_bps, normalized.payroll_limit_kopecks,
        normalized.payroll_warning_threshold_bps, nextRevision, requestId,
      ]
    );
    await insertBudgetRequestRevision(requestId, nextRevision, normalized, reason.slice(0, 2000), req.user.id);
    const admins = await allDb("SELECT id, name, surname, email, language FROM users WHERE role = 'admin' AND deleted = 0 AND invited = 0");
    for (const admin of admins) {
      const metadata = JSON.stringify({
        version: request.proposed_version_number,
        revision: nextRevision,
      });
      const updated = await runDb(
        `UPDATE notifications SET type = 'project_budget_change_updated', actor_user_id = ?,
          metadata_json = ?, created_at = CURRENT_TIMESTAMP, read_at = NULL
         WHERE user_id = ? AND budget_change_request_id = ?
           AND type IN ('project_budget_change_requested', 'project_budget_change_updated')`,
        [req.user.id, metadata, admin.id, requestId]
      );
      if (!updated.changes) {
        await insertBudgetNotification({
          userId: admin.id,
          type: 'project_budget_change_updated',
          project,
          actorUserId: req.user.id,
          requestId,
          metadata: {
            version: request.proposed_version_number,
            revision: nextRevision,
          },
        });
      }
    }
    await runDb('COMMIT');
    admins.forEach((admin) => {
      sendBudgetNotificationEmail(req, admin, 'project_budget_change_updated', project.name)
        .catch((emailError) => console.error('[BudgetRequest] Update email failed:', emailError));
    });
    res.json(mapBudgetRequestRow(await getActiveBudgetRequest(projectId)));
  } catch (err) {
    await runDb('ROLLBACK').catch(() => {});
    console.error('[BudgetRequest] Failed to update:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:projectId/budget-change-requests', authenticateJWT, requireProjectFinancialAccess('projectId'), async (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId)) return sendApiError(res, 404, 'projectsNotFound');
  try {
    const rows = await allDb(
      `SELECT r.*, TRIM(COALESCE(u.surname, '') || ' ' || COALESCE(u.name, '')) AS requested_by_name,
        TRIM(COALESCE(reviewer.surname, '') || ' ' || COALESCE(reviewer.name, '')) AS reviewed_by_name
       FROM project_budget_change_requests r
       LEFT JOIN users u ON u.id = r.requested_by
       LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
       WHERE r.project_id = ? ORDER BY r.id DESC`,
      [projectId]
    );
    res.json(rows.map(mapBudgetRequestRow));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/project-budget-change-requests', authenticateJWT, requireFinancialAdmin, async (req, res) => {
  const status = req.query.status === 'pending' ? 'pending' : null;
  try {
    const params = [];
    const where = status ? 'WHERE r.status = ?' : '';
    if (status) params.push(status);
    const rows = await allDb(
      `SELECT r.id, r.project_id, r.status, r.requested_at, r.current_revision_number,
        r.proposed_version_number,
        COALESCE((SELECT MAX(rr.created_at) FROM project_budget_request_revisions rr WHERE rr.request_id = r.id), r.requested_at) AS updated_at,
        p.name AS project_name, p.code AS project_code,
        TRIM(COALESCE(requester.surname, '') || ' ' || COALESCE(requester.name, '')) AS requested_by_name
       FROM project_budget_change_requests r
       JOIN projects p ON p.id = r.project_id
       LEFT JOIN users requester ON requester.id = r.requested_by
       ${where}
       ORDER BY updated_at DESC, r.id DESC`,
      params
    );
    res.json(rows.map((row) => ({
      id: row.id,
      projectId: row.project_id,
      projectName: row.project_name,
      projectCode: row.project_code || '',
      status: row.status,
      requestedAt: row.requested_at,
      updatedAt: row.updated_at,
      requestedByName: row.requested_by_name || null,
      proposedVersionNumber: Number(row.proposed_version_number || 0) || null,
      currentRevision: Number(row.current_revision_number || 1),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:projectId/budget-history', authenticateJWT, requireProjectFinancialAccess('projectId'), async (req, res) => {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId)) return sendApiError(res, 404, 'projectsNotFound');
  try {
    const [versionRows, requestRows, revisionRows, eventRows, project] = await Promise.all([
      allDb(
        `SELECT v.*,
          TRIM(COALESCE(actor.surname, '') || ' ' || COALESCE(actor.name, '')) AS actor_name
         FROM project_budget_versions v
         LEFT JOIN users actor ON actor.id = v.approved_by
         WHERE v.project_id = ? ORDER BY v.version_number DESC`,
        [projectId]
      ),
      allDb(
        `SELECT r.*,
          TRIM(COALESCE(requester.surname, '') || ' ' || COALESCE(requester.name, '')) AS requested_by_name,
          TRIM(COALESCE(reviewer.surname, '') || ' ' || COALESCE(reviewer.name, '')) AS reviewed_by_name
         FROM project_budget_change_requests r
         LEFT JOIN users requester ON requester.id = r.requested_by
         LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
         WHERE r.project_id = ? ORDER BY r.id DESC`,
        [projectId]
      ),
      allDb(
        `SELECT rr.*,
          TRIM(COALESCE(author.surname, '') || ' ' || COALESCE(author.name, '')) AS created_by_name
         FROM project_budget_request_revisions rr
         JOIN project_budget_change_requests r ON r.id = rr.request_id
         LEFT JOIN users author ON author.id = rr.created_by
         WHERE r.project_id = ? ORDER BY rr.request_id DESC, rr.revision_number DESC`,
        [projectId]
      ),
      allDb(
        `SELECT e.*, TRIM(COALESCE(actor.surname, '') || ' ' || COALESCE(actor.name, '')) AS actor_name
         FROM project_budget_audit_events e
         LEFT JOIN users actor ON actor.id = e.actor_user_id
         WHERE e.project_id = ? ORDER BY e.id DESC`,
        [projectId]
      ),
      getDb('SELECT current_budget_version_id FROM projects WHERE id = ?', [projectId]),
    ]);
    const versions = versionRows.map((row) => ({
      ...mapBudgetRow(row),
      actorName: row.actor_name || null,
      isCurrent: Number(project?.current_budget_version_id) === Number(row.id),
    }));
    const versionsById = new Map(versions.map((version) => [Number(version.id), version]));
    const revisionsByRequest = new Map();
    revisionRows.forEach((row) => {
      const list = revisionsByRequest.get(Number(row.request_id)) || [];
      list.push(mapBudgetRevisionRow(row));
      revisionsByRequest.set(Number(row.request_id), list);
    });
    const requests = requestRows.map((row) => ({
        ...mapBudgetRequestRow(row),
        revisions: revisionsByRequest.get(Number(row.id)) || [],
        approvedBudget: row.approved_budget_version_id ? versionsById.get(Number(row.approved_budget_version_id)) || null : null,
      }));
    const requestsById = new Map(requests.map((request) => [Number(request.id), request]));
    const requestsByVersionId = new Map(
      requests
        .filter((request) => request.approvedBudgetVersionId)
        .map((request) => [Number(request.approvedBudgetVersionId), request])
    );
    const mergedRequestIds = new Set();
    const entries = versions.map((version) => {
      const request = requestsById.get(Number(version.sourceRequestId))
        || requestsByVersionId.get(Number(version.id))
        || null;
      if (request) mergedRequestIds.add(Number(request.id));
      return {
        key: `version-${version.id}`,
        versionNumber: Number(version.version),
        status: 'approved',
        source: request ? 'budget_request' : 'admin_direct',
        versionId: version.id,
        requestId: request?.id || null,
        isCurrent: version.isCurrent,
        createdAt: request?.requestedAt || version.approvedAt,
        approvedAt: version.approvedAt,
        requestedByName: request?.requestedByName || null,
        approvedByName: version.actorName || request?.reviewedByName || null,
        changeReason: request?.reason || version.changeReason || '',
        decisionReason: request?.reviewComment || version.changeReason || '',
        decisionType: request?.decisionType || (request ? 'approve' : null),
        proposedBudget: request?.proposedBudget || null,
        finalBudget: version,
        revisions: request?.revisions || [],
      };
    });
    requests.forEach((request) => {
      if (mergedRequestIds.has(Number(request.id))) return;
      entries.push({
        key: `request-${request.id}`,
        versionNumber: Number(request.proposedVersionNumber),
        status: request.status,
        source: 'budget_request',
        versionId: null,
        requestId: request.id,
        isCurrent: false,
        createdAt: request.requestedAt,
        approvedAt: request.reviewedAt,
        requestedByName: request.requestedByName,
        approvedByName: request.reviewedByName,
        changeReason: request.reason || '',
        decisionReason: request.reviewComment || '',
        decisionType: request.decisionType,
        proposedBudget: request.proposedBudget,
        finalBudget: null,
        revisions: request.revisions || [],
      });
    });
    entries.sort((left, right) => (
      Number(right.versionNumber || 0) - Number(left.versionNumber || 0)
      || String(right.createdAt || '').localeCompare(String(left.createdAt || ''))
    ));
    res.json({
      entries,
      versions,
      requests,
      events: eventRows
        .filter((row) => !row.budget_version_id)
        .map((row) => ({
          id: row.id,
          type: row.event_type,
          reason: row.reason,
          actorUserId: row.actor_user_id,
          actorName: row.actor_name || null,
          budgetVersionId: row.budget_version_id,
          requestId: row.request_id,
          createdAt: row.created_at,
        })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/projects/:projectId/budget-change-requests/:requestId', authenticateJWT, requireFinancialAdmin, async (req, res) => {
  const projectId = Number(req.params.projectId);
  const requestId = Number(req.params.requestId);
  const decision = req.body?.decision;
  const expectedRevision = Number(req.body?.expectedRevision);
  const comment = typeof req.body?.reason === 'string'
    ? req.body.reason.trim()
    : typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
  if (!Number.isInteger(projectId) || !Number.isInteger(requestId)) return sendApiError(res, 404, 'budgetRequestNotFound');
  if (!['approve', 'approve_with_changes', 'reject'].includes(decision)) {
    return sendApiError(res, 400, 'budgetValidationFailed', { message: 'Decision is invalid.' });
  }
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return sendApiError(res, 400, 'budgetValidationFailed', { message: 'Expected revision is required.' });
  if (!comment) return sendApiError(res, 400, 'budgetValidationFailed', { message: 'Decision reason is required.' });
  let replacement = null;
  if (decision === 'approve_with_changes') {
    try {
      replacement = parseBudgetPayload(req.body.approvedBudget || {});
      if (replacement.budget_mode === 'none') throw new Error('An approved request must create a budget.');
    } catch (err) {
      return sendApiError(res, 400, 'budgetValidationFailed', { message: err.message });
    }
  }
  try {
    await runDb('BEGIN IMMEDIATE TRANSACTION');
    const request = await getDb('SELECT * FROM project_budget_change_requests WHERE id = ? AND project_id = ?', [requestId, projectId]);
    if (!request) {
      await runDb('ROLLBACK');
      return sendApiError(res, 404, 'budgetRequestNotFound');
    }
    if (request.status !== 'pending') {
      await runDb('ROLLBACK');
      return sendApiError(res, 409, 'budgetRequestStale');
    }
    if (Number(request.current_revision_number || 1) !== expectedRevision) {
      await runDb('ROLLBACK');
      return sendApiError(res, 409, 'budgetRequestStale');
    }
    const project = await getDb('SELECT id, name, manager_user_id FROM projects WHERE id = ?', [projectId]);
    let proposedVersionNumber = Number(request.proposed_version_number || 0);
    if (!proposedVersionNumber) {
      proposedVersionNumber = await getNextBudgetVersionNumber(projectId);
      await runDb(
        'UPDATE project_budget_change_requests SET proposed_version_number = ? WHERE id = ?',
        [proposedVersionNumber, requestId]
      );
    }
    let version = null;
    if (decision !== 'reject') {
      const approved = replacement || {
        budget_mode: request.budget_mode,
        contract_amount_kopecks: request.contract_amount_kopecks,
        management_reserve_bps: request.management_reserve_bps,
        management_reserve_kopecks: request.management_reserve_kopecks,
        project_budget_limit_kopecks: request.project_budget_limit_kopecks,
        payroll_limit_mode: request.payroll_limit_mode,
        payroll_limit_bps: request.payroll_limit_bps,
        payroll_limit_kopecks: request.payroll_limit_kopecks,
        payroll_warning_threshold_bps: request.payroll_warning_threshold_bps,
        note: request.note,
      };
      version = await createBudgetVersion(projectId, approved, req.user.id, {
        reason: comment,
        sourceType: 'budget_request',
        sourceRequestId: requestId,
        versionNumber: proposedVersionNumber,
      });
    }
    const status = decision === 'reject' ? 'rejected' : 'approved';
    await runDb(
      `UPDATE project_budget_change_requests SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
       review_comment = ?, approved_budget_version_id = ?, decision_type = ? WHERE id = ?`,
      [status, req.user.id, comment, version?.id || null, decision, requestId]
    );
    if (request.responsible_manager_user_id) {
      await insertBudgetNotification({
        userId: request.responsible_manager_user_id,
        type: status === 'approved' ? 'project_budget_change_approved' : 'project_budget_change_rejected',
        project, actorUserId: req.user.id, budgetVersionId: version?.id || null, requestId,
        metadata: { version: proposedVersionNumber },
      });
    }
    await runDb('COMMIT');
    if (request.responsible_manager_user_id) {
      const recipient = await getDb('SELECT id, name, surname, email, language FROM users WHERE id = ?', [request.responsible_manager_user_id]);
      if (recipient) {
        sendBudgetNotificationEmail(
          req,
          recipient,
          status === 'approved' ? 'project_budget_change_approved' : 'project_budget_change_rejected',
          project.name
        ).catch((emailError) => console.error('[BudgetRequest] Decision email failed:', emailError));
      }
    }
    if (version) await evaluateProjectBudgetThresholds(projectId, req.user.id, req).catch((thresholdError) => {
      console.error('[BudgetRequest] Failed to evaluate thresholds:', thresholdError);
    });
    res.json(await getBudgetStatus(projectId));
  } catch (err) {
    await runDb('ROLLBACK').catch(() => {});
    console.error('[BudgetRequest] Failed to review:', err);
    res.status(500).json({ error: err.message });
  }
});

function mapNotificationRow(row) {
  let metadata = null;
  try {
    metadata = row.metadata_json ? JSON.parse(row.metadata_json) : null;
  } catch (_err) {
    metadata = null;
  }
  return {
    id: row.id,
    type: row.type,
    project: { id: row.project_id, name: row.project_name },
    actor: row.actor_user_id ? {
      id: row.actor_user_id,
      name: row.actor_name,
      surname: row.actor_surname || '',
      avatarUrl: row.actor_avatar_url || null,
    } : null,
    budgetVersionId: row.budget_version_id || null,
    budgetChangeRequestId: row.budget_change_request_id || null,
    thresholdPercent: row.threshold_bps === null || row.threshold_bps === undefined ? null : Number((row.threshold_bps / 100).toFixed(2)),
    metadata,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

app.get('/api/notifications', authenticateJWT, async (req, res) => {
  const requestedLimit = Number(req.query.limit || 20);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 20;
  const before = req.query.before ? Number(req.query.before) : null;
  const params = [req.user.id];
  let beforeClause = '';
  if (Number.isInteger(before) && before > 0) {
    beforeClause = 'AND n.id < ?';
    params.push(before);
  }
  params.push(limit + 1);
  try {
    const rows = await allDb(
      `SELECT n.*, actor.name AS actor_name, actor.surname AS actor_surname,
         actor.avatar_url AS actor_avatar_url
       FROM notifications n
       LEFT JOIN users actor ON actor.id = n.actor_user_id
       WHERE n.user_id = ? ${beforeClause}
       ORDER BY n.id DESC
       LIMIT ?`,
      params
    );
    const unread = await getDb('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL', [req.user.id]);
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    res.json({
      items: items.map(mapNotificationRow),
      unreadCount: unread?.count || 0,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    });
  } catch (err) {
    console.error('[Notifications] Failed to load:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/:id/read', authenticateJWT, async (req, res) => {
  const notificationId = Number(req.params.id);
  if (!Number.isInteger(notificationId)) return sendApiError(res, 404, 'notificationsNotFound');
  try {
    const result = await runDb(
      'UPDATE notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );
    if (!result.changes) return sendApiError(res, 404, 'notificationsNotFound');
    const row = await getDb(
      `SELECT n.*, actor.name AS actor_name, actor.surname AS actor_surname,
         actor.avatar_url AS actor_avatar_url
       FROM notifications n LEFT JOIN users actor ON actor.id = n.actor_user_id
       WHERE n.id = ? AND n.user_id = ?`,
      [notificationId, req.user.id]
    );
    res.json(mapNotificationRow(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read-all', authenticateJWT, async (req, res) => {
  try {
    const result = await runDb(
      'UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL',
      [req.user.id]
    );
    res.json({ updatedCount: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

      await evaluateProjectsForUserRates(userId, req.user.id, req).catch((thresholdError) => {
        console.error('[Rates] Failed to evaluate project budgets:', thresholdError);
      });

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

    await evaluateProjectsForUserRates(userId, req.user.id, req).catch((thresholdError) => {
      console.error('[Rates] Failed to evaluate project budgets:', thresholdError);
    });

    res.json(mapRateRow(updated));
  } catch (err) {
    console.error('Error updating rate:', err);
    res.status(500).json({ error: err.message });
  }
});

// Users routes
app.get('/api/users', authenticateJWT, requireAdmin, (req, res) => {
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
  if (!canActForUser(req.user, id)) return sendApiError(res, 403, 'adminForbidden');
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

app.post('/api/clients', authenticateJWT, requireAdmin, (req, res) => {
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
app.patch('/api/clients/:id', authenticateJWT, requireAdmin, (req, res) => {
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
app.delete('/api/clients/:id/full', authenticateJWT, requireAdmin, (req, res) => {
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
  db.all(
    `SELECT p.*, c.name AS client_name,
            manager.name AS manager_name, manager.surname AS manager_surname,
            CASE
              WHEN p.manager_user_id = ? OR EXISTS (
                SELECT 1 FROM time_entries own_entries
                WHERE own_entries.user_id = ? AND own_entries.project_id = p.id
              ) THEN 1
              ELSE 0
            END AS is_my_project,
            CASE
              WHEN (? = 'admin' OR p.manager_user_id = ?) AND EXISTS (
                SELECT 1 FROM project_budget_change_requests budget_request
                WHERE budget_request.project_id = p.id AND budget_request.status = 'pending'
              ) THEN 1
              ELSE 0
            END AS has_pending_budget_request
     FROM projects p
     LEFT JOIN clients c ON p.client_id = c.id
     LEFT JOIN users manager ON manager.id = p.manager_user_id
     ORDER BY p.category, p.name`,
    [req.user.id, req.user.id, req.user.role, req.user.id],
    (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
    }
  );
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

// PATCH endpoint to update individual project fields through inline editing.
app.patch('/api/projects/:id', authenticateJWT, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return sendApiError(res, 404, 'projectsNotFound');

    const current = await getDb('SELECT * FROM projects WHERE id = ?', [id]);
    if (!current) return sendApiError(res, 404, 'projectsNotFound');

    const editRole = getProjectEditRole(req.user, current);
    if (!editRole) return sendApiError(res, 403, 'projectsEditForbidden');
    const requestedFields = Object.keys(req.body).filter((field) => ['name', 'description', 'client_id', 'code', 'category', 'active'].includes(field));
    if (requestedFields.some((field) => !canEditProjectField(editRole, field))) {
      return sendApiError(res, 403, 'projectsFieldForbidden');
    }

    const fields = [];
    const values = [];
    const has = (field) => Object.prototype.hasOwnProperty.call(req.body, field);

    if (has('name')) {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      if (!name) return sendApiError(res, 400, 'projectsNameRequired');
      const duplicate = await getDb('SELECT id FROM projects WHERE LOWER(name) = LOWER(?) AND id != ?', [name, id]);
      if (duplicate) return sendApiError(res, 409, 'projectsDuplicateName');
      fields.push('name = ?'); values.push(name);
    }
    if (has('description')) {
      fields.push('description = ?'); values.push(typeof req.body.description === 'string' ? req.body.description : '');
    }
    if (has('client_id')) {
      const clientId = Number(req.body.client_id);
      if (!Number.isInteger(clientId)) return sendApiError(res, 400, 'projectsClientRequired');
      const client = await getDb('SELECT id FROM clients WHERE id = ?', [clientId]);
      if (!client) return sendApiError(res, 400, 'projectsClientInvalid');
      fields.push('client_id = ?'); values.push(clientId);
    }
    if (has('code')) {
      const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';
      if (code) {
        const duplicate = await getDb('SELECT id FROM projects WHERE code IS NOT NULL AND LOWER(code) = LOWER(?) AND id != ?', [code, id]);
        if (duplicate) return sendApiError(res, 409, 'projectsDuplicateCode');
      }
      fields.push('code = ?'); values.push(code || null);
    }
    if (has('category')) {
      const category = normalizeProjectCategory(req.body.category);
      if (!category) return sendApiError(res, 400, 'projectsCategoryRequired');
      if (!PROJECT_CATEGORIES.includes(category)) return sendApiError(res, 400, 'projectsCategoryInvalid');
      fields.push('category = ?'); values.push(category);
    }
    if (has('active')) {
      fields.push('active = ?'); values.push(req.body.active ? 1 : 0);
    }
    if (fields.length === 0) return sendApiError(res, 400, 'projectsNoFieldsToUpdate');

    values.push(id);
    await runDb(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, values);
    const updated = await getDb(
      `SELECT p.*, c.name AS client_name,
              manager.name AS manager_name, manager.surname AS manager_surname
       FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id
       LEFT JOIN users manager ON manager.id = p.manager_user_id
       WHERE p.id = ?`,
      [id]
    );
    return res.json(updated);
  } catch (err) {
    console.error('[ProjectInlineEdit] Failed to update project', err);
    return res.status(500).json({ error: err.message });
  }
});

// PATCH endpoint to toggle project active status
app.patch('/api/projects/:id/active', authenticateJWT, (req, res) => {
  if (req.user.role !== 'admin') {
    return sendApiError(res, 403, 'projectsFieldForbidden');
  }
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
app.delete('/api/projects/:id', authenticateJWT, requireAdmin, (req, res) => {
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
app.post('/api/time-entries', authenticateJWT, async (req, res) => {
  const { project_id, user_id, date, hours, description, submission_time } = req.body;
  if (rejectForeignUser(req, res, user_id)) return;
  console.log('Received submission_time:', submission_time);
  try {
    const result = await runDb(
      'INSERT INTO time_entries (project_id, user_id, date, hours, description, submission_time) VALUES (?, ?, ?, ?, ?, ?)',
      [project_id, user_id, date, hours, description, submission_time]
    );
    extendSessionIfEligible(user_id).catch((sessionErr) => console.error('[AutoLogin] Failed after single insert:', sessionErr));
    const payrollWarning = await evaluateProjectBudgetThresholds(project_id, req.user.id, req).catch((thresholdError) => {
      console.error('[TimeEntries] Failed to evaluate project budget:', thresholdError);
      return null;
    });
    res.json({ id: result.lastID, project_id, user_id, date, hours, description, submission_time, payrollWarning });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') return sendApiError(res, 409, 'timeEntriesDuplicate');
    console.error('Error inserting time entry:', err);
    res.status(500).json({ error: err.message });
  }
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
  const effectiveUserId = req.user.role === 'admin' ? user_id : req.user.id;
  if (effectiveUserId) {
    conditions.push('t.user_id = ?');
    params.push(effectiveUserId);
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

app.patch('/api/time-entries/:id', authenticateJWT, async (req, res) => {
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

  try {
    const existingEntry = await getDb('SELECT user_id, project_id FROM time_entries WHERE id = ?', [id]);
    if (!existingEntry) return sendApiError(res, 404, 'timeEntriesNotFound');
    if (rejectForeignUser(req, res, existingEntry.user_id)) return;
    values.push(id);
    const result = await runDb(
      `UPDATE time_entries SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    if (!result.changes) return sendApiError(res, 404, 'timeEntriesNotFound');
    extendSessionIfEligible(existingEntry.user_id).catch((sessionErr) => console.error('[AutoLogin] Failed after patch:', sessionErr));
    const affectedProjectIds = [...new Set([Number(existingEntry.project_id), Number(project_id || existingEntry.project_id)])];
    const warnings = [];
    for (const affectedProjectId of affectedProjectIds) {
      const warning = await evaluateProjectBudgetThresholds(affectedProjectId, req.user.id, req).catch((thresholdError) => {
        console.error('[TimeEntries] Failed to evaluate project budget:', thresholdError);
        return null;
      });
      if (warning) warnings.push(warning);
    }
    res.json({ id, ...req.body, payrollWarning: warnings[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add DELETE route for time entries
app.delete('/api/time-entries/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  db.get('SELECT user_id FROM time_entries WHERE id = ?', [id], (lookupErr, entry) => {
    if (lookupErr) {
      return res.status(500).json({ error: lookupErr.message });
    }
    if (!entry) return sendApiError(res, 404, 'timeEntriesNotFound');
    if (rejectForeignUser(req, res, entry.user_id)) return;
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
  if (rejectForeignUser(req, res, user_id)) return;
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

function getDefaultDashboardPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toKey = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return { startDate: toKey(start), endDate: toKey(end) };
}

async function getDashboardScopes(user) {
  const managed = await getDb('SELECT COUNT(*) AS count FROM projects WHERE manager_user_id = ?', [user.id]);
  const scopes = ['mine'];
  if (Number(managed?.count || 0) > 0) scopes.push('managed');
  scopes.push('company');
  if (user.role === 'admin') scopes.push('portfolio');
  return scopes;
}

function summarizeDashboardBreakdowns(rows) {
  const categoryMap = new Map();
  const clientMap = new Map();
  for (const row of rows) {
    const hours = Number(row.period_hours || 0);
    const category = row.category || 'unclassified';
    const client = row.client_name || '';
    const clientType = row.client_type || '';
    categoryMap.set(category, (categoryMap.get(category) || 0) + hours);
    if (client) {
      const clientKey = `${clientType}\u0000${client}`;
      const current = clientMap.get(clientKey) || { key: clientKey, label: client, clientType, hours: 0 };
      current.hours += hours;
      clientMap.set(clientKey, current);
    }
  }
  const byHours = (a, b) => b.hours - a.hours || a.label.localeCompare(b.label);
  return {
    categories: [...categoryMap].map(([key, hours]) => ({ key, label: key, hours })).sort(byHours),
    clients: [...clientMap.values()].sort(byHours),
  };
}

const MAJOR_UPDATE_ANNOUNCEMENT_ID = 'major-update-guided-tour-v1';

async function createProductUpdateTables() {
  await runDb(`CREATE TABLE IF NOT EXISTS product_update_rollouts (
    announcement_id TEXT PRIMARY KEY,
    released_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await runDb(`CREATE TABLE IF NOT EXISTS product_update_audience (
    announcement_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (announcement_id, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  await runDb(`CREATE TABLE IF NOT EXISTS product_update_states (
    announcement_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    dismissed_at DATETIME,
    completed_at DATETIME,
    PRIMARY KEY (announcement_id, user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // The first startup after deployment establishes a fixed audience of existing users.
  await runDb('INSERT OR IGNORE INTO product_update_rollouts (announcement_id) VALUES (?)', [MAJOR_UPDATE_ANNOUNCEMENT_ID]);
  await runDb(`INSERT OR IGNORE INTO product_update_audience (announcement_id, user_id)
    SELECT ?, u.id FROM users u
    WHERE datetime(u.created_at) <= (SELECT released_at FROM product_update_rollouts WHERE announcement_id = ?)` ,
  [MAJOR_UPDATE_ANNOUNCEMENT_ID, MAJOR_UPDATE_ANNOUNCEMENT_ID]);
}

async function getDashboardProjectPayrollUsage(projectId) {
  const [rawBudget, aggregate] = await Promise.all([
    getCurrentBudgetRow(projectId),
    getProjectLaborAggregate(projectId),
  ]);
  const budget = mapBudgetRow(rawBudget?.id ? rawBudget : null);
  const summary = calculateLaborSummary(
    aggregate.total_labor_cost_kopecks,
    aggregate.missing_rate_entries_count,
    rawBudget?.budget_mode === 'none' ? null : rawBudget
  );
  return getProjectPayrollUsage({ budget, summary });
}

async function getTeamWeeklyRows({ startDate, endDate, userId = null }) {
  const parameters = [PROJECT_CATEGORY_TRANSITION, startDate, endDate];
  const userFilter = userId === null ? '' : ' AND t.user_id = ?';
  if (userId !== null) parameters.push(userId);
  parameters.push(PROJECT_CATEGORY_TRANSITION);
  return allDb(
    `SELECT t.user_id AS user_id,
       substr(t.date, 1, 10) AS date,
       p.id AS project_id,
       p.name AS project_name,
       p.code AS project_code,
       COALESCE(p.category, ?) AS category,
       COALESCE(SUM(t.hours), 0) AS hours
     FROM time_entries t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN projects p ON p.id = t.project_id
     WHERE u.deleted = 0
       AND COALESCE(u.invited, 0) = 0
       AND substr(t.date, 1, 10) >= ?
       AND substr(t.date, 1, 10) <= ?${userFilter}
     GROUP BY t.user_id, substr(t.date, 1, 10), p.id, p.name, p.code, COALESCE(p.category, ?)
     ORDER BY t.user_id, date, category, p.code, p.name`,
    parameters
  );
}

app.get('/api/dashboard/team-weekly', authenticateJWT, async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return sendApiError(res, 400, 'budgetValidationFailed', { message: 'Year must be between 2000 and 2100.' });
    }
    const weeks = getIsoWeeks(year);
    const startDate = weeks[0].startDate;
    const endDate = weeks[weeks.length - 1].endDate;
    const users = await allDb(
      `SELECT id, name, surname, created_at
       FROM users
       WHERE deleted = 0 AND COALESCE(invited, 0) = 0
       ORDER BY surname ASC, name ASC`
    );
    const rows = await getTeamWeeklyRows({ startDate, endDate });
    res.json(buildTeamWeeklyOverview({ year, users, rows, categoryOrder: [PROJECT_CATEGORY_TRANSITION, ...PROJECT_CATEGORIES], includeDetails: false }));
  } catch (err) {
    console.error('[Dashboard] Failed to load weekly team overview:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/team-weekly/detail', authenticateJWT, async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    const weekStart = normalizeDateOnlyValue(req.query.weekStart);
    if (!Number.isInteger(userId) || !weekStart) return sendApiError(res, 400, 'budgetValidationFailed', { message: 'User and week are required.' });
    const calendarYear = Number(weekStart.slice(0, 4));
    if (calendarYear < 2000 || calendarYear > 2100) return sendApiError(res, 400, 'budgetValidationFailed', { message: 'Year must be between 2000 and 2100.' });
    const weekCandidate = [calendarYear - 1, calendarYear, calendarYear + 1]
      .map((year) => ({ year, week: getIsoWeeks(year).find((week) => week.startDate === weekStart) }))
      .find((candidate) => candidate.week);
    if (!weekCandidate) return sendApiError(res, 400, 'budgetValidationFailed', { message: 'Invalid ISO week.' });
    const { year, week: weekMeta } = weekCandidate;
    const user = await getDb(`SELECT id, name, surname, created_at FROM users
      WHERE id = ? AND deleted = 0 AND COALESCE(invited, 0) = 0`, [userId]);
    if (!user) return sendApiError(res, 404, 'budgetValidationFailed', { message: 'User not found.' });
    const rows = await getTeamWeeklyRows({ startDate: weekMeta.startDate, endDate: weekMeta.endDate, userId });
    const overview = buildTeamWeeklyOverview({
      year, users: [user], rows,
      categoryOrder: [PROJECT_CATEGORY_TRANSITION, ...PROJECT_CATEGORIES], includeDetails: true,
    });
    const detail = overview.users[0]?.weeks.find((week) => week.weekStart === weekMeta.startDate);
    const canOpenTimesheet = req.user.role === 'admin' || Number(req.user.id) === userId;
    if (!canOpenTimesheet && detail) delete detail.projectHours;
    res.json({ weeklyTargetHours: overview.weeklyTargetHours, user: overview.users[0] && { id: overview.users[0].id, label: overview.users[0].label }, week: detail, canOpenTimesheet });
  } catch (err) {
    console.error('[Dashboard] Failed to load weekly detail:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/product-updates/:announcementId', authenticateJWT, async (req, res) => {
  const announcementId = req.params.announcementId;
  if (announcementId !== MAJOR_UPDATE_ANNOUNCEMENT_ID) return sendApiError(res, 404, 'budgetValidationFailed', { message: 'Announcement not found.' });
  const [audience, state] = await Promise.all([
    getDb('SELECT 1 AS included FROM product_update_audience WHERE announcement_id = ? AND user_id = ?', [announcementId, req.user.id]),
    getDb('SELECT dismissed_at, completed_at FROM product_update_states WHERE announcement_id = ? AND user_id = ?', [announcementId, req.user.id]),
  ]);
  res.json({ announcementId, eligible: Boolean(audience), dismissed: Boolean(state?.dismissed_at), completed: Boolean(state?.completed_at) });
});

app.post('/api/product-updates/:announcementId', authenticateJWT, async (req, res) => {
  const announcementId = req.params.announcementId;
  const action = req.body?.action;
  if (announcementId !== MAJOR_UPDATE_ANNOUNCEMENT_ID || !['dismiss', 'complete'].includes(action)) return sendApiError(res, 400, 'budgetValidationFailed', { message: 'Invalid product update action.' });
  const audience = await getDb('SELECT 1 AS included FROM product_update_audience WHERE announcement_id = ? AND user_id = ?', [announcementId, req.user.id]);
  if (!audience) return sendApiError(res, 403, 'adminForbidden');
  const column = action === 'dismiss' ? 'dismissed_at' : 'completed_at';
  await runDb(`INSERT INTO product_update_states (announcement_id, user_id, ${column}) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(announcement_id, user_id) DO UPDATE SET ${column} = CURRENT_TIMESTAMP`, [announcementId, req.user.id]);
  res.json({ ok: true });
});

app.get('/api/dashboard', authenticateJWT, async (req, res) => {
  try {
    const availableScopes = await getDashboardScopes(req.user);
    const requestedScope = typeof req.query.scope === 'string' ? req.query.scope : 'mine';
    const scope = availableScopes.includes(requestedScope) ? requestedScope : 'mine';
    const defaults = getDefaultDashboardPeriod();
    const startDate = normalizeDateOnlyValue(req.query.startDate) || defaults.startDate;
    const endDate = normalizeDateOnlyValue(req.query.endDate) || defaults.endDate;
    if (endDate < startDate) return sendApiError(res, 400, 'budgetValidationFailed', { message: 'Invalid dashboard period.' });
    const bucket = ['day', 'week', 'month', 'quarter', 'year'].includes(req.query.bucket) ? req.query.bucket : 'week';
    const clientType = req.query.clientType === 'internal' || req.query.clientType === 'external'
      ? req.query.clientType
      : null;

    let targetUserId = req.user.id;
    if (scope === 'mine' && req.query.userId !== undefined) {
      if (req.user.role !== 'admin') return sendApiError(res, 403, 'adminForbidden');
      targetUserId = Number(req.query.userId);
      if (!Number.isInteger(targetUserId)) return sendApiError(res, 400, 'ratesValidationFailed', { message: 'User id is invalid.' });
      const target = await getDb('SELECT id FROM users WHERE id = ? AND deleted = 0', [targetUserId]);
      if (!target) return sendApiError(res, 404, 'usersNotFound');
    }

    const joinConditions = ['t.project_id = p.id', 'substr(t.date, 1, 10) >= ?', 'substr(t.date, 1, 10) <= ?'];
    const params = [startDate, endDate];
    if (scope === 'mine') {
      joinConditions.push('t.user_id = ?');
      params.push(targetUserId);
    }
    const where = [];
    if (scope === 'managed') {
      where.push('p.manager_user_id = ?');
      params.push(req.user.id);
    }
    if (scope === 'mine' || scope === 'company') where.push('t.id IS NOT NULL');
    if (clientType) {
      where.push('c.type = ?');
      params.push(clientType);
    }

    const rows = await allDb(
      `SELECT p.id, p.name, p.code, p.category, p.active, p.manager_user_id,
         c.name AS client_name, c.type AS client_type,
         TRIM(COALESCE(manager.surname, '') || ' ' || COALESCE(manager.name, '')) AS manager_name,
         COALESCE(SUM(t.hours), 0) AS period_hours,
         MAX(substr(t.date, 1, 10)) AS last_entry_date
       FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id
       LEFT JOIN users manager ON manager.id = p.manager_user_id
       LEFT JOIN time_entries t ON ${joinConditions.join(' AND ')}
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       GROUP BY p.id
       ORDER BY period_hours DESC, p.name ASC`,
      params
    );

    const includeFinance = scope === 'managed' || scope === 'portfolio';
    const projects = await Promise.all(rows.map(async (row) => {
      const project = {
        id: row.id,
        name: row.name,
        code: row.code || '',
        category: row.category || 'unclassified',
        clientName: row.client_name || '',
        clientType: row.client_type || '',
        managerName: row.manager_name || '',
        active: Boolean(row.active),
      };
      const item = {
        project,
        periodHours: Number(row.period_hours || 0),
        lastEntryDate: row.last_entry_date || null,
        payrollUsage: await getDashboardProjectPayrollUsage(row.id),
      };
      if (!includeFinance) return item;

      const status = await getBudgetStatus(row.id);
      const risk = getProjectFinancialRisk(status);
      item.finance = {
        budgetMode: status.budget?.budgetMode || null,
        knownLaborCostRub: Number(status.summary?.totalLaborCostRub || 0),
        payrollLimitRub: status.budget?.payrollLimitRub ?? null,
        remainingRub: status.summary?.payrollRemainingRub ?? null,
        exceededRub: status.summary?.payrollExceededRub ?? null,
        usedPercent: status.summary?.payrollUsedPercent ?? null,
        warningThresholdPercent: status.budget?.payrollWarningThresholdPercent ?? null,
        missingRateEntriesCount: risk.missingRateEntriesCount,
        isComplete: risk.isComplete,
        riskStatus: risk.riskStatus,
        hasPendingBudgetRequest: Boolean(status.activeRequest),
      };
      return item;
    }));

    const financialProjects = projects.filter((item) => item.finance);
    const contractComparisonRows = await allDb(
      `SELECT p.id AS project_id, p.name, p.code, v.contract_amount_kopecks,
         COALESCE(SUM(t.hours), 0) AS lifetime_hours
       FROM projects p
       INNER JOIN project_budget_versions v ON v.id = p.current_budget_version_id AND v.budget_mode = 'contract'
       LEFT JOIN time_entries t ON t.project_id = p.id
       WHERE p.active = 1
       GROUP BY p.id
       ORDER BY v.contract_amount_kopecks DESC, p.name ASC`
    );
    const contractComparisonProjects = buildContractComparisonProjects(contractComparisonRows);
    let timeSeries;
    if (scope === 'mine' || scope === 'company') {
      const timeSeriesConditions = [
        'substr(t.date, 1, 10) >= ?',
        'substr(t.date, 1, 10) <= ?',
      ];
      const timeSeriesParams = [startDate, endDate];
      if (scope === 'mine') {
        timeSeriesConditions.push('t.user_id = ?');
        timeSeriesParams.push(targetUserId);
      }
      if (clientType) {
        timeSeriesConditions.push('c.type = ?');
        timeSeriesParams.push(clientType);
      }
      const timeSeriesRows = await allDb(
        `SELECT substr(t.date, 1, 10) AS date,
           t.hours,
           COALESCE(p.category, ?) AS category
         FROM time_entries t
         INNER JOIN projects p ON p.id = t.project_id
         LEFT JOIN clients c ON c.id = p.client_id
         WHERE ${timeSeriesConditions.join(' AND ')}
         ORDER BY date ASC`,
        [PROJECT_CATEGORY_TRANSITION, ...timeSeriesParams]
      );
      const timeSeriesStartDate = (bucket === 'year' || bucket === 'quarter') && timeSeriesRows.length
        ? String(timeSeriesRows[0].date).slice(0, 10)
        : startDate;
      timeSeries = buildDashboardTimeSeries({
        rows: timeSeriesRows,
        startDate: timeSeriesStartDate,
        endDate,
        bucket,
        categoryKeys: PROJECT_CATEGORY_VALUES,
      });
    }
    const userConditions = [
      'substr(t.date, 1, 10) >= ?',
      'substr(t.date, 1, 10) <= ?',
    ];
    const userParams = [startDate, endDate];
    if (scope === 'mine') {
      userConditions.push('t.user_id = ?');
      userParams.push(targetUserId);
    }
    if (scope === 'managed') {
      userConditions.push('p.manager_user_id = ?');
      userParams.push(req.user.id);
    }
    if (clientType) {
      userConditions.push('c.type = ?');
      userParams.push(clientType);
    }
    const userRows = await allDb(
      `SELECT t.user_id AS id,
         TRIM(COALESCE(u.surname, '') || ' ' || COALESCE(u.name, '')) AS label,
         COALESCE(SUM(t.hours), 0) AS hours
       FROM time_entries t
       INNER JOIN projects p ON p.id = t.project_id
       LEFT JOIN clients c ON c.id = p.client_id
       LEFT JOIN users u ON u.id = t.user_id
       WHERE ${userConditions.join(' AND ')}
       GROUP BY t.user_id
       ORDER BY hours DESC, label ASC`,
      userParams
    );
    const projectUserRows = await allDb(
      `SELECT t.project_id AS project_id,
         t.user_id AS user_id,
         TRIM(COALESCE(u.surname, '') || ' ' || COALESCE(u.name, '')) AS user_label,
         COALESCE(SUM(t.hours), 0) AS hours
       FROM time_entries t
       INNER JOIN projects p ON p.id = t.project_id
       LEFT JOIN clients c ON c.id = p.client_id
       LEFT JOIN users u ON u.id = t.user_id
       WHERE ${userConditions.join(' AND ')}
       GROUP BY t.project_id, t.user_id
       ORDER BY hours DESC, user_label ASC`,
      userParams
    );
    const summary = {
      totalHours: Number(projects.reduce((sum, item) => sum + item.periodHours, 0).toFixed(2)),
      projectCount: projects.length,
      clientCount: new Set(projects.map((item) => item.project.clientName).filter(Boolean)).size,
      warningCount: financialProjects.filter((item) => item.finance.riskStatus === 'warning').length,
      limitReachedCount: financialProjects.filter((item) => item.finance.riskStatus === 'limit_reached').length,
      exceededCount: financialProjects.filter((item) => item.finance.riskStatus === 'exceeded').length,
      incompleteCount: financialProjects.filter((item) => !item.finance.isComplete).length,
      pendingRequestCount: financialProjects.filter((item) => item.finance.hasPendingBudgetRequest).length,
      knownLaborCostRub: Number(financialProjects.reduce((sum, item) => sum + item.finance.knownLaborCostRub, 0).toFixed(2)),
    };

    res.json({
      scope,
      availableScopes,
      period: { startDate, endDate },
      summary,
      breakdowns: {
        ...summarizeDashboardBreakdowns(rows),
        users: userRows.map((row) => ({ key: row.id, label: row.label || `#${row.id}`, hours: Number(row.hours || 0) })),
        projectUsers: projectUserRows.map((row) => ({
          projectId: row.project_id,
          userId: row.user_id,
          userLabel: row.user_label || `#${row.user_id}`,
          hours: Number(row.hours || 0),
        })),
      },
      projects,
      contractComparisonProjects,
      ...(timeSeries ? { timeSeries } : {}),
    });
  } catch (err) {
    console.error('[Dashboard] Failed to load:', err);
    res.status(500).json({ error: err.message });
  }
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
    `SELECT p.id, p.name, p.code, p.manager_user_id, c.name as client_name
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

                  const buildResponse = (baseline = { totalHours: 0, byUser: {} }) => res.json(buildProjectHoursAnalyticsResponse({
                    project,
                    range,
                    summaryRow,
                    projectActivityRow,
                    membersRows,
                    dailyRows,
                    baseline,
                  }));

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
app.post('/api/time-entries/batch', authenticateJWT, async (req, res) => {
  const { entries } = req.body;
  if (!Array.isArray(entries) || entries.length === 0) {
    return sendApiError(res, 400, 'timeEntriesNoEntries');
  }
  if (entries.some((entry) => !canActForUser(req.user, entry.user_id))) {
    return sendApiError(res, 403, 'adminForbidden');
  }
  try {
    await runDb('BEGIN IMMEDIATE TRANSACTION');
    for (const entry of entries) {
      if (!entry.user_id || !entry.project_id || !entry.date || typeof entry.hours !== 'number') {
        throw new Error('Missing required fields in one or more entries.');
      }
      await runDb(
        `INSERT INTO time_entries (user_id, project_id, date, hours, submission_time)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id, project_id, date) DO UPDATE SET hours=excluded.hours, submission_time=datetime('now')`,
        [entry.user_id, entry.project_id, entry.date, entry.hours]
      );
    }
    await runDb('COMMIT');
    const touchedUsers = [...new Set(entries.map((entry) => entry.user_id).filter(Boolean))];
    Promise.all(touchedUsers.map((userId) => extendSessionIfEligible(userId)))
      .catch((sessionErr) => console.error('[AutoLogin] Failed after batch:', sessionErr));
    const payrollWarnings = [];
    for (const projectId of [...new Set(entries.map((entry) => Number(entry.project_id)))]) {
      const warning = await evaluateProjectBudgetThresholds(projectId, req.user.id, req).catch((thresholdError) => {
        console.error('[TimeEntries] Failed to evaluate project budget:', thresholdError);
        return null;
      });
      if (warning) payrollWarnings.push(warning);
    }
    res.json({ success: true, payrollWarnings });
  } catch (err) {
    await runDb('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  }
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
      db.run('UPDATE magic_links SET used = 1 WHERE id = ?', [link.id], async err3 => {
        if (err3) return res.status(500).json({ error: err3.message });
        try {
          await activateVerifiedUser(db, user.id);
          const { token: jwtToken, payload } = await issueSessionForUser(user);
          res.json({ token: jwtToken, user: payload });
        } catch (issueError) {
          console.error('[Magic Link] Failed to activate user or issue session:', issueError);
          res.status(500).json({ errorCode: apiErrors.authSessionCreateFailed.errorCode, error: apiErrors.authSessionCreateFailed.error });
        }
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

