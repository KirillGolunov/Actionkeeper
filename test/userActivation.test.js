'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sqlite3 = require('sqlite3').verbose();
const {
  activateVerifiedUser,
  migratePreviouslyAuthenticatedInvitedUsers,
} = require('../userActivation');

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error); else resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error); else resolve(row);
    });
  });
}

function close(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) reject(error); else resolve();
    });
  });
}

async function createTestDb() {
  const db = new sqlite3.Database(':memory:');
  await run(db, `CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL,
    deleted INTEGER DEFAULT 0,
    invited INTEGER DEFAULT 0
  )`);
  await run(db, `CREATE TABLE invitations (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL,
    accepted INTEGER DEFAULT 0
  )`);
  await run(db, 'CREATE TABLE auth_sessions (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL)');
  await run(db, 'CREATE TABLE time_entries (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL)');
  return db;
}

test('successful verified login activates an invited user and closes pending invitations', async () => {
  const db = await createTestDb();
  try {
    await run(db, "INSERT INTO users (id, email, invited) VALUES (1, 'user@example.com', 1)");
    await run(db, "INSERT INTO invitations (id, email, accepted) VALUES (1, 'user@example.com', 0)");

    const result = await activateVerifiedUser(db, 1);

    assert.equal(result.activated, true);
    assert.equal((await get(db, 'SELECT invited FROM users WHERE id = 1')).invited, 0);
    assert.equal((await get(db, 'SELECT accepted FROM invitations WHERE id = 1')).accepted, 1);
  } finally {
    await close(db);
  }
});

test('activation does not reactivate a deleted user', async () => {
  const db = await createTestDb();
  try {
    await run(db, "INSERT INTO users (id, email, deleted, invited) VALUES (1, 'deleted@example.com', 1, 1)");
    await run(db, "INSERT INTO invitations (id, email, accepted) VALUES (1, 'deleted@example.com', 0)");

    const result = await activateVerifiedUser(db, 1);

    assert.equal(result.activated, false);
    assert.equal((await get(db, 'SELECT invited FROM users WHERE id = 1')).invited, 1);
    assert.equal((await get(db, 'SELECT accepted FROM invitations WHERE id = 1')).accepted, 0);
  } finally {
    await close(db);
  }
});

test('migration activates only invited users with prior sessions or time entries and is idempotent', async () => {
  const db = await createTestDb();
  try {
    await run(db, `INSERT INTO users (id, email, deleted, invited) VALUES
      (1, 'session@example.com', 0, 1),
      (2, 'hours@example.com', 0, 1),
      (3, 'unused@example.com', 0, 1),
      (4, 'deleted@example.com', 1, 1)`);
    await run(db, `INSERT INTO invitations (id, email, accepted) VALUES
      (1, 'session@example.com', 0),
      (2, 'hours@example.com', 0),
      (3, 'unused@example.com', 0),
      (4, 'deleted@example.com', 0)`);
    await run(db, 'INSERT INTO auth_sessions (id, user_id) VALUES (1, 1), (2, 4)');
    await run(db, 'INSERT INTO time_entries (id, user_id) VALUES (1, 2)');

    const firstRun = await migratePreviouslyAuthenticatedInvitedUsers(db);
    const secondRun = await migratePreviouslyAuthenticatedInvitedUsers(db);

    assert.deepEqual(firstRun, { applied: true, activatedCount: 2 });
    assert.deepEqual(secondRun, { applied: false, activatedCount: 0 });
    assert.deepEqual(
      await new Promise((resolve, reject) => db.all('SELECT id, invited FROM users ORDER BY id', (error, rows) => error ? reject(error) : resolve(rows))),
      [
        { id: 1, invited: 0 },
        { id: 2, invited: 0 },
        { id: 3, invited: 1 },
        { id: 4, invited: 1 },
      ]
    );
    assert.deepEqual(
      await new Promise((resolve, reject) => db.all('SELECT id, accepted FROM invitations ORDER BY id', (error, rows) => error ? reject(error) : resolve(rows))),
      [
        { id: 1, accepted: 1 },
        { id: 2, accepted: 1 },
        { id: 3, accepted: 0 },
        { id: 4, accepted: 0 },
      ]
    );
  } finally {
    await close(db);
  }
});
