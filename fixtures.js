const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./time_tracker.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to database');
});

// Create tables if they don't exist
async function createTables() {
  console.log('Creating tables if they\'re not exist...');
  
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('internal', 'external')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      client_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients (id)
    )`,
    `CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects (id),
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`
  ];

  for (const sql of tables) {
    await new Promise((resolve, reject) => {
      db.run(sql, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          reject(err);
        }
        resolve();
      });
    });
  }
  console.log('Tables created successfully');
}

// Generate 30 users
const users = Array.from({ length: 30 }, (_, i) => ({
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: i === 0 ? 'admin' : 'user',
}));

const clients = [
  { name: 'Internal Projects', type: 'internal' },
  { name: 'Acme Corp', type: 'external' },
  { name: 'Tech Solutions', type: 'external' },
  { name: 'Research Division', type: 'internal' }
];

// Generate 30 projects
const projects = Array.from({ length: 30 }, (_, i) => ({
  name: `Project ${i + 1}`,
  description: `Description for project ${i + 1}`,
  client_id: (i % 4) + 1, // rotate through 4 clients
}));

// Helper to get periods
function getPeriods() {
  const now = new Date();
  const periods = [];
  // December 2024
  periods.push({
    label: 'dec2024',
    start: new Date('2024-12-01T00:00:00Z'),
    end: new Date('2024-12-31T23:59:59Z'),
  });
  // Q1 2025
  periods.push({
    label: 'q1_2025',
    start: new Date('2025-01-01T00:00:00Z'),
    end: new Date('2025-03-31T23:59:59Z'),
  });
  // Q2 2025
  periods.push({
    label: 'q2_2025',
    start: new Date('2025-04-01T00:00:00Z'),
    end: new Date('2025-06-30T23:59:59Z'),
  });
  // This month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  periods.push({
    label: 'this_month',
    start: monthStart,
    end: now,
  });
  // This week (Monday to now)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  periods.push({
    label: 'this_week',
    start: weekStart,
    end: now,
  });
  return periods;
}

// Generate time entries for all periods
function generateTimeEntries(users, projects) {
  const periods = getPeriods();
  const timeEntries = [];
  const now = new Date();
  for (const period of periods) {
    for (const project of projects) {
      // Pick 5 unique users for this project in this period
      const userIndices = Array.from({ length: users.length }, (_, i) => i).sort(() => 0.5 - Math.random()).slice(0, 5);
      for (const userIdx of userIndices) {
        const user = users[userIdx];
        // Each user logs hours for at least 3 projects per period
        for (let p = 0; p < 3; p++) {
          const proj = projects[(project.id + p) % projects.length];
          // Pick a random day in the period, not in the future
          let entryDate;
          let attempts = 0;
          do {
            const time = period.start.getTime() + Math.random() * (Math.min(period.end.getTime(), now.getTime()) - period.start.getTime());
            entryDate = new Date(time);
            attempts++;
          } while (entryDate > now && attempts < 10);
          // Random whole hours between 2 and 8
          const durationHours = Math.floor(Math.random() * 7) + 2;
          const startTime = new Date(entryDate);
          const endTime = new Date(entryDate.getTime() + durationHours * 60 * 60 * 1000);
          if (endTime > now) continue; // Don't log future hours
          timeEntries.push({
            user_id: user.id,
            project_id: proj.id,
            description: `Work on ${proj.name}`,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
          });
        }
      }
    }
  }
  return timeEntries;
}

// Clear existing data
async function clearTables() {
  console.log('Clearing existing data...');
  const tables = ['time_entries', 'projects', 'clients', 'users'];
  for (const table of tables) {
    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM ${table}`, (err) => {
        if (err) {
          console.error(`Error clearing ${table}:`, err);
          reject(err);
        }
        console.log(`Cleared ${table} table`);
        resolve();
      });
    });
  }
}

// Insert data
async function insertFixtures() {
  try {
    // Create tables first
    await createTables();
    // Clear existing data
    await clearTables();

    console.log('Inserting users...');
    // Insert users and collect their IDs
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
          [user.name, user.email, user.role],
          function(err) {
            if (err) {
              console.error(`Error inserting user ${user.name}:`, err);
              reject(err);
            }
            user.id = this.lastID;
            console.log(`Inserted user ${user.name} with ID ${this.lastID}`);
            resolve();
          }
        );
      });
    }

    console.log('Inserting clients...');
    // Insert clients and collect their IDs
    for (const client of clients) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO clients (name, type) VALUES (?, ?)',
          [client.name, client.type],
          function(err) {
            if (err) {
              console.error(`Error inserting client ${client.name}:`, err);
              reject(err);
            }
            client.id = this.lastID;
            console.log(`Inserted client ${client.name} with ID ${this.lastID}`);
            resolve();
          }
        );
      });
    }

    console.log('Inserting projects...');
    // Insert projects and collect their IDs
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const clientIndex = i % clients.length;
      project.client_id = clients[clientIndex].id;
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO projects (name, description, client_id) VALUES (?, ?, ?)',
          [project.name, project.description, project.client_id],
          function(err) {
            if (err) {
              console.error(`Error inserting project ${project.name}:`, err);
              reject(err);
            }
            project.id = this.lastID;
            console.log(`Inserted project ${project.name} with ID ${this.lastID}`);
            resolve();
          }
        );
      });
    }

    console.log('Generating and inserting time entries...');
    // Generate and insert time entries AFTER all IDs are set
    const timeEntries = generateTimeEntries(users, projects);
    for (const entry of timeEntries) {
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO time_entries (user_id, project_id, description, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
          [entry.user_id, entry.project_id, entry.description, entry.start_time, entry.end_time],
          function(err) {
            if (err) {
              console.error('Error inserting time entry:', err);
              reject(err);
            }
            resolve();
          }
        );
      });
    }
    console.log(`Inserted ${timeEntries.length} time entries`);

    console.log('All fixtures loaded successfully');
    db.close(() => {
      console.log('Database connection closed');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error inserting fixtures:', error);
    db.close(() => {
      console.log('Database connection closed');
      process.exit(1);
    });
  }
}

// Run the insertion
insertFixtures(); 