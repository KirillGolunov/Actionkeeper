const test=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),net=require('node:net'),sqlite3=require('sqlite3'),jwt=require('jsonwebtoken');
test('project catalog exposes only current user participation independently from management',{timeout:90000},async()=>{
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
  const dept=await api('POST','/api/departments',admin,{name:'Development',short_name:'DEV'});
  for(const id of [2,3])await run("INSERT INTO users(id,name,surname,email,role,department_id,deleted,invited) VALUES(?,?,'Test',?,'user',?,0,0)",[id,'User '+id,`user${id}@test.invalid`,dept.id]);
  const manager=await token(2),participant=await token(3);
  const client=await run("INSERT INTO clients(name,type) VALUES('Test','internal')");
  const project=await api('POST','/api/projects',admin,{name:'Test',category:'internal_project',client_id:client.lastID,departmentIds:[dept.id],responsibleDepartmentId:dept.id,managerUserId:2});
  const other=await api('POST','/api/projects',admin,{name:'Private',category:'internal_project',client_id:client.lastID,departmentIds:[system],responsibleDepartmentId:system});
  let catalog=await api('GET','/api/projects',manager);
  assert.equal(catalog.find(p=>p.id===project.id).has_my_time_entries,0);
  assert.equal(catalog.find(p=>p.id===project.id).is_my_project,1);
  await api('POST','/api/time-entries',participant,{project_id:project.id,user_id:3,date:'2026-10-14',hours:2});
  assert.equal((await api('GET','/api/projects',participant)).find(p=>p.id===project.id).has_my_time_entries,1);
  assert.equal((await api('GET','/api/projects',manager)).find(p=>p.id===project.id).has_my_time_entries,0);
  assert.equal((await api('GET','/api/projects',admin)).find(p=>p.id===project.id).has_my_time_entries,0);
  assert.equal((await api('GET','/api/projects?purpose=time-entry',participant)).some(p=>p.id===other.id),false);
  assert.equal((await api('GET','/api/projects',participant)).some(p=>p.id===other.id),false);
 }finally{if(db)await new Promise(r=>db.close(r));child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));await fs.rm(tmp,{recursive:true,force:true});}
});
