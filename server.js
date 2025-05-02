const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database connection
const db = new sqlite3.Database('time_tracker.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Function to load fixtures - now just creates tables
async function loadFixtures() {
  console.log('Checking if tables exist...');
  await createTables();
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
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
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
}

// Users routes
app.get('/api/users', (req, res) => {
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

app.post('/api/users', (req, res) => {
  console.log('POST /api/users called with data:', req.body);
  const { name, email, role } = req.body;
  db.run('INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
    [name, email, role || 'user'],
    function(err) {
      if (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ error: err.message });
        return;
      }
      console.log('User created with ID:', this.lastID);
      res.json({ id: this.lastID, name, email, role });
    });
});

// PATCH endpoint to update a user by id
app.patch('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body;
  db.run(
    'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
    [name, email, role, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ id, name, email, role });
    }
  );
});

// Clients routes
app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/clients', (req, res) => {
  const { name, type } = req.body;
  db.run('INSERT INTO clients (name, type) VALUES (?, ?)', [name, type], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, name, type });
  });
});

// PATCH endpoint to update a client by id
app.patch('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  const { name, type } = req.body;
  db.run(
    'UPDATE clients SET name = ?, type = ? WHERE id = ?',
    [name, type, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      res.json({ id, name, type });
    }
  );
});

// Projects routes
app.get('/api/projects', (req, res) => {
  db.all('SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id ORDER BY p.name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/projects', (req, res) => {
  const { name, description, client_id } = req.body;
  db.run('INSERT INTO projects (name, description, client_id) VALUES (?, ?, ?)', 
    [name, description, client_id], 
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, name, description, client_id });
    });
});

// PATCH endpoint to update a project by id
app.patch('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, client_id } = req.body;
  db.run(
    'UPDATE projects SET name = ?, description = ?, client_id = ? WHERE id = ?',
    [name, description, client_id, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.json({ id, name, description, client_id });
    }
  );
});

// Time entries routes
app.post('/api/time-entries', (req, res) => {
  const { project_id, user_id, start_time, end_time, description, submission_time } = req.body;
  console.log('Received submission_time:', submission_time);
  db.run(
    'INSERT INTO time_entries (project_id, user_id, start_time, end_time, description, submission_time) VALUES (?, ?, ?, ?, ?, ?)',
    [project_id, user_id, start_time, end_time, description, submission_time],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, project_id, user_id, start_time, end_time, description, submission_time });
    }
  );
});

app.get('/api/time-entries', (req, res) => {
  const { project_id, user_id } = req.query;
  let query = `
    SELECT 
      t.*,
      u.name as user_name,
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

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY t.start_time DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.patch('/api/time-entries/:id', (req, res) => {
  const { id } = req.params;
  const { start_time, end_time, description, project_id } = req.body;
  // Only update fields that are provided
  const fields = [];
  const values = [];
  if (start_time) {
    fields.push('start_time = ?');
    values.push(start_time);
  }
  if (end_time) {
    fields.push('end_time = ?');
    values.push(end_time);
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
    return res.status(400).json({ error: 'No fields to update.' });
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
        res.status(404).json({ error: 'Time entry not found' });
        return;
      }
      res.json({ id, ...req.body });
    }
  );
});

// Add DELETE route for time entries
app.delete('/api/time-entries/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM time_entries WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Time entry not found' });
      return;
    }
    res.json({ success: true });
  });
});

// Analytics routes
app.get('/api/analytics/time-by-project', (req, res) => {
  const { startDate, endDate } = req.query;
  console.log('Analytics - Time by Project request:', { startDate, endDate });
  
  const query = `
    SELECT 
      p.id as project_id,
      p.name as project_name,
      COALESCE(c.name, 'No Client') as client_name,
      COALESCE(c.type, 'unassigned') as client_type,
      SUM((strftime('%s', t.end_time) - strftime('%s', t.start_time)) / 3600.0) as total_hours
    FROM time_entries t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN clients c ON p.client_id = c.id
    ${startDate && endDate ? 'WHERE datetime(t.start_time) >= datetime(?) AND datetime(t.end_time) <= datetime(?)' : ''}
    GROUP BY p.id, p.name, c.name, c.type
    ORDER BY total_hours DESC
  `;

  const params = startDate && endDate ? [startDate, endDate] : [];
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Analytics - Time by Project error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log('Analytics - Time by Project results:', rows);
    res.json(rows);
  });
});

app.get('/api/analytics/time-by-user', (req, res) => {
  const { startDate, endDate } = req.query;
  console.log('Analytics - Time by User request:', { startDate, endDate });
  
  const query = `
    SELECT 
      u.id as user_id,
      u.name as user_name,
      p.name as project_name,
      COALESCE(c.type, 'unassigned') as client_type,
      SUM((strftime('%s', t.end_time) - strftime('%s', t.start_time)) / 3600.0) as total_hours
    FROM time_entries t
    JOIN users u ON t.user_id = u.id
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN clients c ON p.client_id = c.id
    ${startDate && endDate ? 'WHERE datetime(t.start_time) >= datetime(?) AND datetime(t.end_time) <= datetime(?)' : ''}
    GROUP BY u.id, u.name, p.name, c.type
    ORDER BY u.name, total_hours DESC
  `;

  const params = startDate && endDate ? [startDate, endDate] : [];
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Analytics - Time by User error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log('Analytics - Time by User results:', rows);
    res.json(rows);
  });
});

app.get('/api/analytics/time-by-client-type', (req, res) => {
  const { startDate, endDate } = req.query;
  console.log('Analytics - Time by Client Type request:', { startDate, endDate });
  
  const query = `
    SELECT 
      COALESCE(c.type, 'unassigned') as client_type,
      SUM((strftime('%s', t.end_time) - strftime('%s', t.start_time)) / 3600.0) as total_hours
    FROM time_entries t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN clients c ON p.client_id = c.id
    WHERE t.start_time >= ? AND t.end_time <= ?
    GROUP BY c.type
    ORDER BY total_hours DESC
  `;

  db.all(query, [startDate || '1970-01-01', endDate || '9999-12-31'], (err, rows) => {
    if (err) {
      console.error('Analytics - Time by Client Type error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    console.log('Analytics - Time by Client Type results:', rows);
    res.json(rows);
  });
});

// Start server
async function initializeServer() {
  try {
    // Create tables first
    await createTables();
    
    // Only load fixtures if tables are empty
    const checkData = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM users', [], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    
    if (checkData.count === 0) {
      console.log('No data found, loading fixtures...');
      await loadFixtures();
      console.log('Fixtures loaded successfully');
    } else {
      console.log('Existing data found, skipping fixture load');
    }
    
    // Kill any existing process on port 3001
    try {
      await new Promise((resolve) => {
        require('child_process').exec('npx kill-port 3001', resolve);
      });
    } catch (error) {
      console.log('No process to kill on port 3001');
    }
    
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

initializeServer(); 