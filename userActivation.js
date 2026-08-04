'use strict';

const INVITED_USER_ACTIVATION_MIGRATION = 'invited_user_activation_v1';

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

async function activateVerifiedUser(db, userId) {
  await run(db, 'BEGIN IMMEDIATE TRANSACTION');
  try {
    const activation = await run(
      db,
      'UPDATE users SET invited = 0 WHERE id = ? AND deleted = 0 AND invited = 1',
      [userId]
    );
    await run(
      db,
      `UPDATE invitations
       SET accepted = 1
       WHERE accepted = 0
         AND email = (SELECT email FROM users WHERE id = ? AND deleted = 0)`,
      [userId]
    );
    await run(db, 'COMMIT');
    return { activated: activation.changes > 0 };
  } catch (error) {
    await run(db, 'ROLLBACK').catch(() => {});
    throw error;
  }
}

async function migratePreviouslyAuthenticatedInvitedUsers(db) {
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_key TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  const applied = await get(
    db,
    'SELECT migration_key FROM schema_migrations WHERE migration_key = ?',
    [INVITED_USER_ACTIVATION_MIGRATION]
  );
  if (applied) return { applied: false, activatedCount: 0 };

  await run(db, 'BEGIN IMMEDIATE TRANSACTION');
  try {
    const evidenceClause = `
      EXISTS (SELECT 1 FROM auth_sessions session WHERE session.user_id = users.id)
      OR EXISTS (SELECT 1 FROM time_entries entry WHERE entry.user_id = users.id)`;

    await run(
      db,
      `UPDATE invitations
       SET accepted = 1
       WHERE accepted = 0
         AND EXISTS (
           SELECT 1
           FROM users
           WHERE users.email = invitations.email
             AND users.deleted = 0
             AND users.invited = 1
             AND (${evidenceClause})
         )`
    );
    const activation = await run(
      db,
      `UPDATE users
       SET invited = 0
       WHERE deleted = 0
         AND invited = 1
         AND (${evidenceClause})`
    );
    await run(
      db,
      'INSERT INTO schema_migrations (migration_key) VALUES (?)',
      [INVITED_USER_ACTIVATION_MIGRATION]
    );
    await run(db, 'COMMIT');
    return { applied: true, activatedCount: activation.changes };
  } catch (error) {
    await run(db, 'ROLLBACK').catch(() => {});
    throw error;
  }
}

module.exports = {
  INVITED_USER_ACTIVATION_MIGRATION,
  activateVerifiedUser,
  migratePreviouslyAuthenticatedInvitedUsers,
};
