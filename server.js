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

  if (envBase && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(envBase)) {
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
  projectsNoFieldsToUpdate: { errorCode: 'projects.no_fields_to_update', error: 'No fields to update.' },
  projectsNotFound: { errorCode: 'projects.not_found', error: 'Project not found' },
  timeEntriesDuplicate: { errorCode: 'time_entries.duplicate', error: 'Duplicate time entry for this user, project, and day.' },
  timeEntriesNoFieldsToUpdate: { errorCode: 'time_entries.no_fields_to_update', error: 'No fields to update.' },
  timeEntriesNotFound: { errorCode: 'time_entries.not_found', error: 'Time entry not found' },
  timeEntriesWeekRequired: { errorCode: 'time_entries.week_required', error: 'user_id, project_id, and week_start are required' },
  timeEntriesNoEntries: { errorCode: 'time_entries.no_entries', error: 'No entries provided.' },
  smtpIncomplete: { errorCode: 'smtp.incomplete', error: 'SMTP settings are incomplete.' },
  uploadNoFile: { errorCode: 'upload.no_file', error: 'No file uploaded' },
};

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
const dbPath = process.env.DB_PATH || 'time_tracker.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// SMTP settings
const SMTP_SETTINGS_FILE = './smtp_settings.json';

// Helper to load SMTP settings
function loadSmtpSettings() {
  const required = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM'
  ];
  const allSet = required.every((key) => process.env[key]);
  const isProduction = process.env.NODE_ENV === 'production';

  if (allSet) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      from: process.env.SMTP_FROM,
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1',
    };
  }

  if (isProduction) {
    console.error('[SMTP] FATAL: All SMTP environment variables must be set in production.');
    process.exit(1);
  }

  // In development, fallback to file
  if (fs.existsSync(SMTP_SETTINGS_FILE)) {
    try {
      const data = fs.readFileSync(SMTP_SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('[SMTP] Failed to read or parse smtp_settings.json:', e);
      return {};
    }
  }
  return {};
}

// Helper to save SMTP settings
function saveSmtpSettings(settings) {
  try {
    fs.writeFileSync(SMTP_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    console.log('[SMTP] Settings saved:', settings);
  } catch (e) {
    console.error('[SMTP] Failed to write smtp_settings.json:', e);
  }
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

// Users routes
app.get('/api/users', authenticateJWT, (req, res) => {
  console.log('GET /api/users called');
  db.all('SELECT * FROM users ORDER BY name', [], (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log('Users fetched:', rows);
    res.json(rows);
  });
});

app.post('/api/users', authenticateJWT, (req, res) => {
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
  // Build dynamic update query
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (surname !== undefined) { fields.push('surname = ?'); values.push(surname); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (role !== undefined) { fields.push('role = ?'); values.push(role); }
  if (deleted !== undefined) { fields.push('deleted = ?'); values.push(deleted); }
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
app.delete('/api/users/:id', authenticateJWT, (req, res) => {
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
app.delete('/api/users/:id/full', (req, res) => {
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
  db.all('SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id ORDER BY p.name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/projects', authenticateJWT, (req, res) => {
  const { name, description, client_id, active, code } = req.body;
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
        db.run('INSERT INTO projects (name, description, client_id, active, code) VALUES (?, ?, ?, ?, ?)', 
          [name, description, client_id, active !== undefined ? active : 1, code || null], 
          function(err3) {
            if (err3) {
              res.status(500).json({ error: err3.message });
              return;
            }
            res.json({ id: this.lastID, name, description, client_id, active: active !== undefined ? active : 1, code: code || null });
          });
      });
    } else {
      // No code, proceed to insert
      db.run('INSERT INTO projects (name, description, client_id, active, code) VALUES (?, ?, ?, ?, ?)', 
        [name, description, client_id, active !== undefined ? active : 1, null], 
        function(err3) {
          if (err3) {
            res.status(500).json({ error: err3.message });
            return;
          }
          res.json({ id: this.lastID, name, description, client_id, active: active !== undefined ? active : 1, code: null });
        });
    }
  });
});

// PATCH endpoint to update a project by id
app.patch('/api/projects/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { name, description, client_id, active, code } = req.body;
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
        res.json({ id, name, description, client_id, active, code });
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
app.delete('/api/time-entries/by-project/:project_id', (req, res) => {
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
app.get('/api/smtp-settings', (req, res) => {
  res.json(loadSmtpSettings());
});

// Update SMTP settings
app.post('/api/smtp-settings', (req, res) => {
  const smtp = req.body;
  // Always save in correct structure
  const settings = {
    host: smtp.host,
    port: smtp.port,
    auth: {
      user: smtp.user || (smtp.auth && smtp.auth.user) || '',
      pass: smtp.pass || (smtp.auth && smtp.auth.pass) || ''
    },
    from: smtp.from,
    secure: !!smtp.secure
  };
  saveSmtpSettings(settings);
  res.json({ success: true });
});

// Send a test email
app.post('/api/smtp-test', async (req, res) => {
  // Accept all SMTP fields from the request body for testing
  const body = req.body || {};
  const settings = {
    host: body.host || '',
    port: body.port || '',
    auth: {
      user: body.user || '',
      pass: body.pass || '',
    },
    from: body.from || '',
    secure: !!body.secure,
  };
  const to = body.to || settings.from;
  if (!settings.host || !settings.port || !settings.auth.user || !settings.auth.pass || !settings.from) {
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
app.post('/api/invitations', async (req, res) => {
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
app.get('/api/invitations', (req, res) => {
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

// Serve static files from the React app (adjust path if needed)
app.use(express.static(path.join(__dirname, 'client', 'build')));

// Catch-all route to serve index.html for React SPA (except API routes)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
  }
});

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

  if (isProduction && !hasSmtp) {
    return sendApiError(res, 400, 'setupSmtpRequired');
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
      if (!isProduction && hasSmtp) {
        const settings = {
          host: sanitizedSmtp.host,
          port: sanitizedSmtp.port,
          auth: {
            user: sanitizedSmtp.user,
            pass: sanitizedSmtp.pass
          },
          from: sanitizedSmtp.from,
          secure: !!sanitizedSmtp.secure
        };
        saveSmtpSettings(settings);
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

