const test = require('node:test');
const assert = require('node:assert/strict');
const sqlite3 = require('sqlite3');
const { createProjectGovernance } = require('../projectGovernance');
function database(db) { return {
  runDb: (sql, params=[]) => new Promise((resolve,reject) => db.run(sql,params,function(e){e?reject(e):resolve(this);})),
  getDb: (sql, params=[]) => new Promise((resolve,reject) => db.get(sql,params,(e,r)=>e?reject(e):resolve(r))),
  allDb: (sql, params=[]) => new Promise((resolve,reject) => db.all(sql,params,(e,r)=>e?reject(e):resolve(r))),
}; }
test('project governance migration assigns only unambiguous owners and preserves assignments on restart', async () => {
  const db = new sqlite3.Database(':memory:'); const sql = database(db); const service = createProjectGovernance(sql);
  try {
    await sql.runDb('CREATE TABLE schema_migrations(migration_key TEXT PRIMARY KEY)');
    await sql.runDb('CREATE TABLE users(id INTEGER PRIMARY KEY, role TEXT, deleted INTEGER DEFAULT 0, invited INTEGER DEFAULT 0, department_id INTEGER)');
    await sql.runDb('CREATE TABLE departments(id INTEGER PRIMARY KEY, name TEXT, short_name TEXT, is_system INTEGER, manager_user_id INTEGER)');
    await sql.runDb('CREATE TABLE projects(id INTEGER PRIMARY KEY, manager_user_id INTEGER)');
    await sql.runDb('CREATE TABLE project_departments(project_id INTEGER, department_id INTEGER)');
    await sql.runDb("CREATE TABLE notifications(id INTEGER PRIMARY KEY, type TEXT CHECK(type IN ('project_budget_request_transferred'))) ");
    await sql.runDb("INSERT INTO users(id,role) VALUES(1,'user'),(2,'user'),(3,'admin')");
    await sql.runDb("INSERT INTO departments VALUES(1,'System','System',1,NULL),(2,'Engineering','ENG',0,1),(3,'Design','DES',0,2)");
    await sql.runDb('INSERT INTO projects VALUES(1,NULL),(2,NULL),(3,NULL)');
    await sql.runDb('INSERT INTO project_departments VALUES(1,1),(2,2),(3,2),(3,3)');
    await sql.runDb("INSERT INTO notifications VALUES(1,'project_budget_request_transferred')");
    await service.migrate();
    assert.deepEqual((await sql.allDb('SELECT responsible_department_id FROM projects ORDER BY id')).map(p=>p.responsible_department_id), [1,2,null]);
    assert.equal((await sql.getDb('SELECT created_by FROM projects WHERE id=2')).created_by, null);
    await sql.runDb('UPDATE projects SET responsible_department_id=3, created_by=1 WHERE id=2');
    await service.migrate(); assert.equal((await sql.getDb('SELECT responsible_department_id FROM projects WHERE id=2')).responsible_department_id,3);
    await sql.runDb("INSERT INTO notifications VALUES(2,'project_responsibility_transferred')"); assert.equal((await sql.allDb('SELECT * FROM notifications')).length,2);
    const p=await sql.getDb('SELECT * FROM projects WHERE id=2');
    assert.equal((await service.permissions({id:1},p)).canTransferResponsibility,true);
    assert.equal((await service.permissions({id:1},p)).canReviewBudget,false);
    assert.equal((await service.permissions({id:2},p)).canReviewBudget,true);
    await sql.runDb('UPDATE departments SET manager_user_id=NULL WHERE id=2');
    assert.equal((await service.permissions({id:1},p)).canTransferResponsibility,false);
    await sql.runDb('DELETE FROM users WHERE id=1'); assert.equal((await sql.getDb('SELECT created_by FROM projects WHERE id=2')).created_by,null);
  } finally { await new Promise(r=>db.close(r)); }
});
