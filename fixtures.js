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
      date TEXT NOT NULL,
      hours INTEGER NOT NULL,
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

const users = [
  { name: 'Alice', email: 'alice@example.com', role: 'user' },
  { name: 'Bob', email: 'bob@example.com', role: 'user' },
  { name: 'Manager', email: 'manager@example.com', role: 'admin' }
];

const clients = [
  { name: 'Acme Corp', type: 'external' },
  { name: 'Internal Ops', type: 'internal' }
];

const projects = [
  { name: 'Website Redesign', description: 'Redesign the Acme Corp website', clientIndex: 0 },
  { name: 'Mobile App', description: 'Develop a new mobile app for Acme', clientIndex: 0 },
  { name: 'Internal Dashboard', description: 'Build dashboard for internal ops', clientIndex: 1 }
];

const weekStart = new Date('2025-05-05T00:00:00.000Z');
const timeEntries = [
  // Alice logs 8h Mon, 6h Tue for Website Redesign
  { userIndex: 0, projectIndex: 0, days: [{ offset: 0, hours: 8 }, { offset: 1, hours: 6 }] },
  // Alice logs 4h Wed for Mobile App
  { userIndex: 0, projectIndex: 1, days: [{ offset: 2, hours: 4 }] },
  // Bob logs 7h Mon for Internal Dashboard
  { userIndex: 1, projectIndex: 2, days: [{ offset: 0, hours: 7 }] }
];

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
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
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
      const client = clients[project.clientIndex];
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO projects (name, description, client_id) VALUES (?, ?, ?)',
          [project.name, project.description, client.id],
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

    console.log('Inserting time entries...');
    for (const entry of timeEntries) {
      const user = users[entry.userIndex];
      const project = projects[entry.projectIndex];
      for (const day of entry.days) {
        const start = new Date(weekStart);
        start.setDate(start.getDate() + day.offset);
        start.setHours(9, 0, 0, 0);
        const end = new Date(start.getTime() + day.hours * 60 * 60 * 1000);
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO time_entries (user_id, project_id, date, hours, description) VALUES (?, ?, ?, ?, ?)',
            [user.id, project.id, start.toISOString(), day.hours, ''],
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
    }
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