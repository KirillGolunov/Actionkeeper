'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const sqlite3 = require('sqlite3');
const { createDepartmentService } = require('../departmentService');
function database(db) {
  return {
    runDb: (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(err) { err ? reject(err) : resolve(this); })),
    getDb: (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))),
    allDb: (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows))),
  };
}
test('department migration preserves history, assigns all users, and never resets assignments', async () => {
  const db = new sqlite3.Database(':memory:'); const api = database(db); const service = createDepartmentService(api);
  try {
    await api.runDb('CREATE TABLE users(id INTEGER PRIMARY KEY, invited INTEGER, deleted INTEGER)');
    await api.runDb('CREATE TABLE projects(id INTEGER PRIMARY KEY)');
    await api.runDb('CREATE TABLE time_entries(id INTEGER PRIMARY KEY, hours REAL)');
    await api.runDb('INSERT INTO users VALUES (1,0,0),(2,1,0),(3,0,1)');
    await api.runDb('INSERT INTO projects VALUES (1),(2)'); await api.runDb('INSERT INTO time_entries VALUES(1,8)');
    await service.migrate();
    assert.equal((await api.allDb('SELECT * FROM users WHERE department_id IS NOT NULL')).length, 3);
    assert.equal((await api.allDb('SELECT * FROM project_departments')).length, 2);
    assert.equal((await api.getDb('SELECT hours FROM time_entries')).hours, 8);
    const second = await api.runDb("INSERT INTO departments(name) VALUES ('Engineering')");
    await api.runDb('UPDATE users SET department_id = ? WHERE id = 1', [second.lastID]);
    assert.deepEqual(await service.validateIds([1, second.lastID]), [second.lastID]);
    await service.setProject(1, [second.lastID]); await service.migrate();
    assert.equal((await api.getDb('SELECT department_id FROM users WHERE id = 1')).department_id, second.lastID);
    assert.equal(await service.canLog({ id: 1, role: 'user' }, 1), true);
    assert.equal(await service.canLog({ id: 2, role: 'user' }, 1), false);
    assert.equal(await service.canLog({ id: 1, role: 'admin' }, 1), true);
    await assert.rejects(service.validateIds([])); await assert.rejects(service.validate(999));
  } finally { await new Promise(resolve => db.close(resolve)); }
});
test('department migration initializes an empty database', async () => {
  const db = new sqlite3.Database(':memory:'); const api = database(db);
  try { await api.runDb('CREATE TABLE users(id INTEGER PRIMARY KEY)'); await api.runDb('CREATE TABLE projects(id INTEGER PRIMARY KEY)'); await createDepartmentService(api).migrate(); assert.equal((await api.allDb('SELECT * FROM departments')).length, 1); }
  finally { await new Promise(resolve => db.close(resolve)); }
});
module.exports = { database };

test('department details validate Unicode duplicates and active managers; deletion preserves history and rolls back failures', async () => {
  const db = new sqlite3.Database(':memory:'); const api = database(db); const service = createDepartmentService(api);
  try {
    await api.runDb('PRAGMA foreign_keys = ON');
    await api.runDb('CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, surname TEXT, invited INTEGER DEFAULT 0, deleted INTEGER DEFAULT 0)');
    await api.runDb('CREATE TABLE projects(id INTEGER PRIMARY KEY)');
    await api.runDb('CREATE TABLE time_entries(id INTEGER PRIMARY KEY, user_id INTEGER, hours REAL)');
    await api.runDb("INSERT INTO users(id,name,surname,invited,deleted) VALUES(1,'Active','User',0,0),(2,'Invited','User',1,0),(3,'Deleted','User',0,1)");
    await api.runDb('INSERT INTO projects VALUES(1),(2)');
    await api.runDb('INSERT INTO time_entries VALUES(1,1,8)');
    await service.migrate();
    const system = await api.getDb('SELECT * FROM departments WHERE is_system = 1');
    assert.equal(system.short_name, system.name);
    const a = await service.save(null, { name: ' Разработка ', short_name: ' РАЗР ', manager_user_id: 1 });
    const b = await service.save(null, { name: 'Design', short_name: 'Design' });
    assert.equal(a.name, 'Разработка'); assert.equal(a.manager_name, 'Active');
    await assert.rejects(service.save(null, { name: 'разработка', short_name: 'Other' }), e => e.errorCode === 'departments.duplicate_name');
    await assert.rejects(service.save(null, { name: 'Other', short_name: 'разр' }), e => e.errorCode === 'departments.duplicate_short_name');
    await assert.rejects(service.save(null, { name: 'Missing' }), e => e.status === 400);
    for (const manager_user_id of [2,3,999,'1']) await assert.rejects(service.save(a.id, { manager_user_id }), e => e.errorCode === 'departments.invalid_manager');
    await service.save(a.id, { name: 'Разработка', short_name: 'РАЗР', manager_user_id: null });
    await service.save(a.id, { manager_user_id: 1 });
    await service.migrate();
    assert.equal((await api.getDb('SELECT * FROM departments WHERE id = ?', [a.id])).manager_user_id, 1);
    await api.runDb('UPDATE users SET deleted = 1 WHERE id = 1');
    assert.equal((await api.getDb('SELECT * FROM departments WHERE id = ?', [a.id])).manager_user_id, null);
    await api.runDb('UPDATE users SET deleted = 0 WHERE id = 1');
    await service.save(a.id, { manager_user_id: 1 });
    await api.runDb('DELETE FROM users WHERE id = 1');
    assert.equal((await api.getDb('SELECT * FROM departments WHERE id = ?', [a.id])).manager_user_id, null);
    await api.runDb('UPDATE users SET department_id = ?', [a.id]);
    await service.setProject(1, [a.id]); await service.setProject(2, [a.id,b.id]);
    await assert.rejects(service.remove(system.id), e => e.status === 403);
    await assert.rejects(service.save(system.id, { name: 'Change' }), e => e.status === 403);
    await api.runDb("CREATE TRIGGER block_delete BEFORE DELETE ON departments WHEN OLD.id = " + a.id + " BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    await assert.rejects(service.remove(a.id));
    assert.equal((await api.getDb('SELECT department_id FROM users WHERE id = 2')).department_id, a.id);
    assert.equal((await api.allDb('SELECT * FROM project_departments WHERE department_id = ?', [a.id])).length, 2);
    await api.runDb('DROP TRIGGER block_delete');
    await service.remove(a.id);
    assert.equal((await api.getDb('SELECT department_id FROM users WHERE id = 2')).department_id, system.id);
    assert.equal((await api.getDb('SELECT department_id FROM users WHERE id = 3')).department_id, system.id);
    assert.equal((await api.getDb('SELECT department_id FROM project_departments WHERE project_id = 1')).department_id, system.id);
    assert.equal((await api.getDb('SELECT department_id FROM project_departments WHERE project_id = 2')).department_id, b.id);
    assert.equal((await api.getDb('SELECT hours FROM time_entries WHERE id = 1')).hours, 8);
    await assert.rejects(service.remove(a.id), e => e.status === 404);
  } finally { await new Promise(resolve => db.close(resolve)); }
});

test('v2 upgrades an existing v1 database once and keeps custom details on restart', async () => {
  const db = new sqlite3.Database(':memory:'); const api = database(db);
  try {
    await api.runDb('CREATE TABLE schema_migrations(migration_key TEXT PRIMARY KEY)');
    await api.runDb("INSERT INTO schema_migrations VALUES('departments_v1')");
    await api.runDb('CREATE TABLE users(id INTEGER PRIMARY KEY, deleted INTEGER)');
    await api.runDb('CREATE TABLE departments(id INTEGER PRIMARY KEY, name TEXT, is_system INTEGER)');
    await api.runDb("INSERT INTO departments VALUES(1,'Без подразделения',1),(2,'Engineering',0)");
    await api.runDb('CREATE TABLE project_departments(project_id INTEGER, department_id INTEGER)');
    await api.runDb('INSERT INTO project_departments VALUES(1,1),(1,2),(2,1)');

    const service = createDepartmentService(api); await service.migrate();
    assert.deepEqual(await api.allDb('SELECT * FROM project_departments ORDER BY project_id'), [{ project_id: 1, department_id: 2 }, { project_id: 2, department_id: 1 }]);

    assert.equal((await api.getDb('SELECT short_name FROM departments WHERE id = 2')).short_name, 'Engineering');
    await api.runDb("UPDATE departments SET short_name = 'ENG' WHERE id = 2");
    await service.migrate();
    assert.equal((await api.getDb('SELECT short_name FROM departments WHERE id = 2')).short_name, 'ENG');
  } finally { await new Promise(resolve => db.close(resolve)); }
});
