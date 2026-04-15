require('dotenv').config();

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const targetDbPath = process.env.DB_PATH || './data/time_tracker.db';
const defaultSourcePath = 'C:/Users/golun/Desktop/data/time_tracker.db';
const sourceDbPath = process.env.SOURCE_DB_PATH || defaultSourcePath;

function openDatabase(dbFilePath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbFilePath, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(db);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

async function closeDatabase(db) {
  await new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function ensureSchema(db) {
  console.log('Ensuring target schema...');

  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      surname TEXT,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted INTEGER DEFAULT 0,
      invited INTEGER DEFAULT 0,
      phone TEXT,
      department TEXT,
      job_title TEXT,
      avatar_url TEXT,
      language TEXT,
      timezone TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('internal', 'external')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      itn TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      client_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      active INTEGER DEFAULT 1,
      code TEXT,
      category TEXT NOT NULL DEFAULT 'unclassified',
      FOREIGN KEY (client_id) REFERENCES clients (id)
    )`,
    `CREATE TABLE IF NOT EXISTS time_entries (
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
    )`,
  ];

  for (const sql of tables) {
    await run(db, sql);
  }

  const optionalColumns = {
    users: [
      ['deleted', 'INTEGER DEFAULT 0'],
      ['invited', 'INTEGER DEFAULT 0'],
      ['phone', 'TEXT'],
      ['department', 'TEXT'],
      ['job_title', 'TEXT'],
      ['avatar_url', 'TEXT'],
      ['language', 'TEXT'],
      ['timezone', 'TEXT'],
    ],
    clients: [['itn', 'TEXT']],
    projects: [
      ['active', 'INTEGER DEFAULT 1'],
      ['code', 'TEXT'],
      ['category', "TEXT NOT NULL DEFAULT 'unclassified'"],
    ],
    time_entries: [
      ['description', 'TEXT'],
      ['submission_time', 'DATETIME'],
    ],
  };

  for (const [tableName, columns] of Object.entries(optionalColumns)) {
    const existingColumns = await all(db, `PRAGMA table_info(${tableName})`);
    const existingColumnNames = new Set(existingColumns.map((column) => column.name));

    for (const [columnName, columnType] of columns) {
      if (!existingColumnNames.has(columnName)) {
        console.log(`Adding missing column ${tableName}.${columnName}`);
        await run(db, `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
      }
    }
  }
}

async function clearTargetData(db) {
  console.log('Clearing target tables...');
  await run(db, 'PRAGMA foreign_keys = OFF');
  await run(db, 'DELETE FROM time_entries');
  await run(db, 'DELETE FROM projects');
  await run(db, 'DELETE FROM clients');
  await run(db, 'DELETE FROM users');
  await run(db, "DELETE FROM sqlite_sequence WHERE name IN ('time_entries', 'projects', 'clients', 'users')");
  await run(db, 'PRAGMA foreign_keys = ON');
}

async function loadSourceData(sourceDb) {
  console.log(`Loading source data from ${sourceDbPath}`);

  const sourceProjectColumns = await all(sourceDb, 'PRAGMA table_info(projects)');
  const sourceHasProjectCategory = sourceProjectColumns.some((column) => column.name === 'category');

  const users = await all(
    sourceDb,
    `SELECT
       id, name, surname, email, role, created_at, deleted, invited,
       phone, department, job_title, avatar_url, language, timezone
     FROM users
     ORDER BY id`
  );
  const clients = await all(
    sourceDb,
    `SELECT id, name, type, created_at, itn
     FROM clients
     ORDER BY id`
  );
  const projects = await all(
    sourceDb,
    `SELECT id, name, description, client_id, created_at, active, code${
      sourceHasProjectCategory ? ', category' : ", 'unclassified' AS category"
    }
     FROM projects
     ORDER BY id`
  );
  const timeEntries = await all(
    sourceDb,
    `SELECT id, project_id, user_id, date, hours, description, submission_time, created_at
     FROM time_entries
     ORDER BY id`
  );

  return { users, clients, projects, timeEntries };
}

async function insertImportedData(targetDb, dataset) {
  console.log('Importing users...');
  for (const user of dataset.users) {
    await run(
      targetDb,
      `INSERT INTO users (
        id, name, surname, email, role, created_at, deleted, invited,
        phone, department, job_title, avatar_url, language, timezone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.name,
        user.surname,
        user.email,
        user.role,
        user.created_at,
        user.deleted || 0,
        user.invited || 0,
        user.phone,
        user.department,
        user.job_title,
        user.avatar_url,
        user.language,
        user.timezone,
      ]
    );
  }

  console.log('Importing clients...');
  for (const client of dataset.clients) {
    await run(
      targetDb,
      `INSERT INTO clients (id, name, type, created_at, itn)
       VALUES (?, ?, ?, ?, ?)`,
      [client.id, client.name, client.type, client.created_at, client.itn]
    );
  }

  console.log('Importing projects...');
  for (const project of dataset.projects) {
    await run(
      targetDb,
      `INSERT INTO projects (id, name, description, client_id, created_at, active, code, category)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        project.id,
        project.name,
        project.description,
        project.client_id,
        project.created_at,
        project.active == null ? 1 : project.active,
        project.code,
        project.category || 'unclassified',
      ]
    );
  }

  console.log('Importing time entries...');
  for (const entry of dataset.timeEntries) {
    await run(
      targetDb,
      `INSERT INTO time_entries (id, project_id, user_id, date, hours, description, submission_time, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.project_id,
        entry.user_id,
        entry.date,
        entry.hours,
        entry.description,
        entry.submission_time,
        entry.created_at,
      ]
    );
  }
}

async function main() {
  if (!fs.existsSync(path.resolve(sourceDbPath))) {
    console.error(`Source database not found: ${sourceDbPath}`);
    process.exit(1);
  }

  let sourceDb;
  let targetDb;

  try {
    sourceDb = await openDatabase(sourceDbPath);
    targetDb = await openDatabase(targetDbPath);

    console.log(`Connected to target database: ${targetDbPath}`);
    await ensureSchema(targetDb);
    await clearTargetData(targetDb);

    const dataset = await loadSourceData(sourceDb);
    console.log(
      `Loaded ${dataset.users.length} users, ${dataset.clients.length} clients, ${dataset.projects.length} projects, ${dataset.timeEntries.length} time entries`
    );

    await insertImportedData(targetDb, dataset);

    console.log('Fixtures imported successfully from source database');
    await closeDatabase(sourceDb);
    await closeDatabase(targetDb);
    process.exit(0);
  } catch (error) {
    console.error('Failed to import fixtures:', error);

    if (sourceDb) {
      try {
        await closeDatabase(sourceDb);
      } catch (closeErr) {
        console.error('Failed to close source database:', closeErr);
      }
    }

    if (targetDb) {
      try {
        await closeDatabase(targetDb);
      } catch (closeErr) {
        console.error('Failed to close target database:', closeErr);
      }
    }

    process.exit(1);
  }
}

main();
