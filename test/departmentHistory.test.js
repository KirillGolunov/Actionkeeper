const test=require('node:test'),assert=require('node:assert/strict'),sqlite3=require('sqlite3');
const {createDepartmentHistory}=require('../departmentHistory');
function database(db){return {runDb:(s,p=[])=>new Promise((r,j)=>db.run(s,p,function(e){e?j(e):r(this);})),getDb:(s,p=[])=>new Promise((r,j)=>db.get(s,p,(e,v)=>e?j(e):r(v))),allDb:(s,p=[])=>new Promise((r,j)=>db.all(s,p,(e,v)=>e?j(e):r(v)))};}
async function fixture(){const db=new sqlite3.Database(':memory:'),sql=database(db);for(const query of [
'CREATE TABLE schema_migrations(migration_key TEXT PRIMARY KEY)',
'CREATE TABLE departments(id INTEGER PRIMARY KEY,name TEXT,short_name TEXT,is_system INTEGER,manager_user_id INTEGER)',
'CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT,surname TEXT,role TEXT,department_id INTEGER,deleted INTEGER DEFAULT 0,invited INTEGER DEFAULT 0,created_at TEXT)',
'CREATE TABLE time_entries(id INTEGER PRIMARY KEY,user_id INTEGER,project_id INTEGER,date TEXT,hours REAL,description TEXT)',
'CREATE TABLE project_departments(project_id INTEGER,department_id INTEGER)',
'CREATE TABLE projects(id INTEGER PRIMARY KEY)',
'INSERT INTO projects VALUES(1)',
"INSERT INTO departments VALUES(1,'System','SYS',1,NULL),(2,'Engineering','ENG',0,10),(3,'Design','DES',0,20)",
"INSERT INTO users(id,name,surname,role,department_id,created_at) VALUES(1,'Employee','Test','user',2,'2025-01-01'),(10,'Head','A','user',1,'2025-01-01'),(20,'Head','B','user',1,'2025-01-01')",
"INSERT INTO time_entries VALUES(1,1,1,'2026-01-06',6,'Keep me'),(2,1,1,'2026-01-09',3,'Keep me too')",
'INSERT INTO project_departments VALUES(1,2),(1,3)'])await sql.runDb(query);const h=createDepartmentHistory(sql);await h.migrate();return {db,sql,h,close:()=>new Promise(r=>db.close(r))};}
async function transfer(h,id,departmentId,effectiveFrom){const b={departmentId,effectiveFrom},p=await h.preview(1,id?'update':'create',id,b);return h.mutate(1,id?'update':'create',id,{...b,expectedVersion:p.version},99);}
test('migration preserves legacy totals and unknown attribution, repeated startup preserves assignments',async()=>{const f=await fixture();try{assert.deepEqual((await f.sql.allDb('SELECT department_id,legacy_department_unknown FROM time_entries')).map(x=>[x.department_id,x.legacy_department_unknown]),[[1,1],[1,1]]);assert.equal((await f.sql.getDb('SELECT SUM(hours) AS total FROM time_entries')).total,9);await transfer(f.h,null,2,'2026-01-01');await f.h.migrate();assert.equal((await f.sql.getDb('SELECT department_id FROM time_entries WHERE id=1')).department_id,2);assert.equal((await f.h.history(1)).filter(x=>x.is_initial).length,1);}finally{await f.close();}});
test('work-date permissions follow history; correcting a date reattributes without changing records',async()=>{const f=await fixture();try{await transfer(f.h,null,2,'2026-01-01');await transfer(f.h,null,3,'2026-01-08');const a={id:10,role:'user'},b={id:20,role:'user'};assert.equal(await f.h.canDay(a,1,'2026-01-06'),true);assert.equal(await f.h.canDay(a,1,'2026-01-09'),false);await assert.rejects(f.h.assertNew(a,1,1,'2026-01-09'),e=>e.status===403);assert.equal(await f.h.assertNew(b,1,1,'2026-01-09'),3);const row=(await f.h.history(1)).find(x=>x.effective_from==='2026-01-08');await transfer(f.h,row.id,3,'2026-01-05');const entry=await f.sql.getDb('SELECT * FROM time_entries WHERE id=1');assert.equal(entry.department_id,3);assert.equal(entry.hours,6);assert.equal(entry.description,'Keep me');assert.equal(await f.h.canEntry(a,entry),false);assert.equal(await f.h.canEntry(b,entry),true);}finally{await f.close();}});
test('history conflicts and recalculation failures roll back the complete mutation',async()=>{const f=await fixture();try{await transfer(f.h,null,2,'2026-01-01');const before=await f.h.history(1),p=await f.h.preview(1,'create',null,{departmentId:3,effectiveFrom:'2026-01-08'});await f.sql.runDb("CREATE TRIGGER reject_recalc BEFORE UPDATE ON time_entries BEGIN SELECT RAISE(ABORT,'test failure');END");await assert.rejects(f.h.mutate(1,'create',null,{departmentId:3,effectiveFrom:'2026-01-08',expectedVersion:p.version},99));assert.deepEqual(await f.h.history(1),before);await f.sql.runDb('DROP TRIGGER reject_recalc');await transfer(f.h,null,3,'2026-01-08');await assert.rejects(f.h.mutate(1,'create',null,{departmentId:2,effectiveFrom:'2026-01-10',expectedVersion:p.version},99),e=>e.status===409);await assert.rejects(f.h.preview(1,'delete',before[0].id,{}),e=>e.status===403);}finally{await f.close();}});
test('archive keeps historical hours, replaces future assignments and revokes the old manager',async()=>{const f=await fixture();try{await transfer(f.h,null,2,'2026-01-01');await transfer(f.h,null,2,'2099-01-01');await f.sql.runDb('BEGIN');await f.h.archive(2,1);await f.sql.runDb('COMMIT');assert.equal((await f.sql.getDb('SELECT department_id FROM time_entries WHERE id=1')).department_id,2);assert.equal(await f.h.at(1,'2099-01-02'),1);assert.deepEqual(await f.h.managed({id:10}),[]);assert.equal((await f.sql.getDb('SELECT SUM(hours) AS total FROM time_entries')).total,9);}finally{await f.close();}});
test('new employees receive an immutable explicit initial assignment',async()=>{const f=await fixture();try{await f.sql.runDb("INSERT INTO users(id,name,role,department_id) VALUES(2,'New','user',3)");const rows=await f.h.history(2);assert.equal(rows.length,1);assert.equal(rows[0].department_id,3);assert.equal(rows[0].is_initial,1);await assert.rejects(f.h.preview(2,'delete',rows[0].id,{}),e=>e.status===403);}finally{await f.close();}});

test('department status changes preserve history, support restoration and roll back archival failures',async()=>{
 const f=await fixture();const service=require('../departmentService').createDepartmentService(f.sql);service.useHistory(f.h);
 try{
  await transfer(f.h,null,2,'2026-01-01');
  await f.sql.runDb("CREATE TRIGGER reject_transfer BEFORE UPDATE ON users BEGIN SELECT RAISE(ABORT,'status rollback');END");
  await assert.rejects(service.save(2,{name:'Changed name',status:'archived'}));
  assert.equal((await f.sql.getDb('SELECT name,archived_at FROM departments WHERE id=2')).name,'Engineering');
  assert.equal((await f.sql.getDb('SELECT archived_at FROM departments WHERE id=2')).archived_at,null);
  assert.ok(await f.sql.getDb('SELECT 1 FROM project_departments WHERE department_id=2'));
  await f.sql.runDb('DROP TRIGGER reject_transfer');
  const archived=await service.save(2,{status:'archived'});assert.ok(archived.archived_at);
  assert.equal(await f.h.at(1,f.h.today()),1);assert.equal((await f.sql.getDb('SELECT department_id FROM time_entries WHERE id=1')).department_id,2);
  const restored=await service.save(2,{status:'active',manager_user_id:10});assert.equal(restored.archived_at,null);
  assert.equal(await f.h.at(1,f.h.today()),1);assert.equal(await f.sql.getDb('SELECT 1 FROM project_departments WHERE department_id=2'),undefined);
  assert.equal(await service.validate(2),2);assert.ok((await f.h.managed({id:10})).includes(2));
  const renamed=await service.save(2,{status:'archived'});assert.ok(renamed.archived_at);
  const stillArchived=await service.save(2,{name:'Renamed archive'});assert.equal(stillArchived.name,'Renamed archive');assert.ok(stillArchived.archived_at);
  await assert.rejects(service.save(1,{status:'archived'}),e=>e.status===403);await assert.rejects(service.save(2,{status:'invalid'}),e=>e.status===400);
 }finally{await f.close();}
});
