const test=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),net=require('node:net'),sqlite3=require('sqlite3'),jwt=require('jsonwebtoken');
test('dated department APIs enforce historical editing, atomic batches, split-week norms and archiving',{timeout:90000},async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'department-history-')),secret='department-history-api-test';const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const preload=path.join(tmp,'mail.cjs');await fs.writeFile(preload,"const M=require('module'),load=M._load;M._load=function(n,...a){return n==='nodemailer'?{createTransport:()=>({sendMail:async()=>({messageId:'test'})})}:load.call(this,n,...a)}");
 const child=spawn(process.execPath,['--require',preload,'server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,DB_PATH:path.join(tmp,'test.db'),PORT:String(port),MAGIC_LINK_SECRET:secret,NODE_ENV:'development',SMTP_HOST:'test.invalid',SMTP_PORT:'587',SMTP_USER:'test',SMTP_PASS:'test',SMTP_FROM:'test@test.invalid'},windowsHide:true,stdio:['ignore','pipe','pipe']});let db;
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Startup timeout')),25000);child.stdout.on('data',b=>{if(b.toString().includes('Server is running')){clearTimeout(timer);resolve();}});child.stderr.on('data',()=>{});child.once('exit',c=>{clearTimeout(timer);reject(Error('Server exited '+c));});});
  const base=`http://127.0.0.1:${port}`;
  async function api(method,url,token,body,status=200){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const b=await r.json();assert.equal(r.status,status,`${method} ${url}: ${JSON.stringify(b)}`);return b;}
  await api('POST','/api/setup',null,{name:'Admin',surname:'Test',email:'admin@test.invalid'});
  db=new sqlite3.Database(path.join(tmp,'test.db'));const run=(q,p=[])=>new Promise((r,j)=>db.run(q,p,function(e){e?j(e):r(this)})),get=(q,p=[])=>new Promise((r,j)=>db.get(q,p,(e,v)=>e?j(e):r(v)));
  async function token(id){const sid='history-'+id;await run('INSERT INTO auth_sessions(user_id,token_id,expires_at)VALUES(?,?,?)',[id,sid,'2099-01-01']);return jwt.sign({id,sid},secret,{expiresIn:'1h'});}
  const admin=await token(1),system=(await api('GET','/api/departments',admin))[0].id;
  const a=await api('POST','/api/departments',admin,{name:'Engineering',short_name:'ENG'}),b=await api('POST','/api/departments',admin,{name:'Design',short_name:'DES'});
  for(const [id,dept] of [[2,system],[3,system],[4,a.id],[5,system]])await run("INSERT INTO users(id,name,surname,email,role,department_id,deleted,invited,created_at) VALUES(?,?,'Test',?,'user',?,0,0,'2025-01-01')",[id,'User '+id,`user${id}@test.invalid`,dept]);
  await api('PATCH',`/api/departments/${a.id}`,admin,{manager_user_id:2});await api('PATCH',`/api/departments/${b.id}`,admin,{manager_user_id:3});
  const ta=await token(2),tb=await token(3),employee=await token(4);
  const client=await run("INSERT INTO clients(name,type) VALUES('Test','internal')");const project=await api('POST','/api/projects',admin,{name:'Shared',category:'internal_project',client_id:client.lastID,departmentIds:[a.id,b.id],responsibleDepartmentId:a.id});
  const old=await api('POST','/api/time-entries',ta,{user_id:4,project_id:project.id,date:'2026-01-06',hours:6});assert.equal(old.department_id,a.id);
  const transfer={operation:'create',departmentId:b.id,effectiveFrom:'2026-01-08'};
  const preview=await api('POST','/api/admin/users/4/department-history/preview',admin,transfer);await api('POST','/api/admin/users/4/department-history',admin,{...transfer,expectedVersion:preview.version});
  await api('POST','/api/time-entries',ta,{user_id:4,project_id:project.id,date:'2026-01-09',hours:3},403);
  const newer=await api('POST','/api/time-entries',tb,{user_id:4,project_id:project.id,date:'2026-01-09',hours:3});assert.equal(newer.department_id,b.id);
  await api('PATCH',`/api/time-entries/${old.id}`,tb,{hours:10},403);await api('PATCH',`/api/time-entries/${old.id}`,ta,{description:'Historical edit'});
  const before=(await get('SELECT COUNT(*) AS n FROM time_entries')).n;
  await api('POST','/api/time-entries/batch',tb,{entries:[{user_id:4,project_id:project.id,date:'2026-01-10',hours:1},{user_id:4,project_id:project.id,date:'2026-01-06',hours:10}]},403);assert.equal((await get('SELECT COUNT(*) AS n FROM time_entries')).n,before);
  const entries=await api('GET','/api/time-entries?user_id=4',ta);assert.deepEqual(entries.map(e=>e.id),[old.id]);
  const permissions=await api('GET','/api/time-entry-permissions?user_id=4&startDate=2026-01-05&endDate=2026-01-11',tb);assert.equal(permissions.days['2026-01-06'].canEdit,false);assert.equal(permissions.days['2026-01-09'].canEdit,true);
  await api('GET','/api/users',ta,undefined,403);await api('GET','/api/time-entries?user_id=2',employee,undefined,403);
  const weeklyA=await api('GET',`/api/dashboard/team-weekly?year=2026&departmentId=${a.id}`,ta);const weekA=weeklyA.users.find(u=>u.id===4).weeks.find(w=>w.weekStart==='2026-01-05');assert.equal(weekA.targetHours,24);assert.equal(weekA.hours,6);
  const weeklyB=await api('GET',`/api/dashboard/team-weekly?year=2026&departmentId=${b.id}`,tb);assert.equal(weeklyB.users.find(u=>u.id===4).weeks.find(w=>w.weekStart==='2026-01-05').targetHours,16);
  await api('GET',`/api/dashboard?scope=department&departmentId=${a.id}&startDate=2026-01-01&endDate=2026-01-31`,tb,undefined,403);
  await api('DELETE',`/api/departments/${a.id}`,admin);assert.ok((await get('SELECT archived_at FROM departments WHERE id=?',[a.id])).archived_at);assert.equal((await get('SELECT department_id FROM time_entries WHERE id=?',[old.id])).department_id,a.id);
  assert.ok(!(await api('GET','/api/departments',admin)).some(d=>d.id===a.id));assert.ok((await api('GET','/api/departments?includeArchived=1',admin)).some(d=>d.id===a.id));
  await api('PATCH',`/api/time-entries/${old.id}`,ta,{hours:7},403);assert.equal((await get('SELECT SUM(hours) AS n FROM time_entries')).n,9);
  await api('PATCH',`/api/departments/${a.id}`,ta,{status:'active'},403);
  await api('PATCH',`/api/departments/${a.id}`,admin,{status:'invalid'},400);
  const restored=await api('PATCH',`/api/departments/${a.id}`,admin,{status:'active',manager_user_id:2});assert.equal(restored.archived_at,null);
  assert.ok((await api('GET','/api/departments',admin)).some(d=>d.id===a.id));
  assert.equal(await get('SELECT 1 FROM project_departments WHERE department_id=?',[a.id]),undefined);
  await api('PATCH',`/api/time-entries/${old.id}`,ta,{description:'Restored historical access'});
  await api('POST','/api/time-entries',ta,{user_id:4,project_id:project.id,date:'2026-01-07',hours:1},403);
  const archivedAgain=await api('PATCH',`/api/departments/${a.id}`,admin,{status:'archived'});assert.ok(archivedAgain.archived_at);
  await api('PATCH',`/api/time-entries/${old.id}`,ta,{hours:7},403);

 }finally{if(db)await new Promise(r=>db.close(r));child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));await fs.rm(tmp,{recursive:true,force:true});}
});
