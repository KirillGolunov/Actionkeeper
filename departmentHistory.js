const { createHash } = require('crypto');
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
const day = value => String(value || '').slice(0,10);
const validDay = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const fail = (status,message,code='unknown') => Object.assign(new Error(message),{status,errorCode:`department_history.${code}`});
function createDepartmentHistory({ runDb,getDb,allDb }) {
  const atSql = (user, date) => `(SELECT h.department_id FROM user_department_history h WHERE h.user_id=${user} AND (h.effective_from IS NULL OR h.effective_from<=${date}) ORDER BY h.effective_from DESC LIMIT 1)`;
  async function migrate() {
    if (await getDb("SELECT 1 FROM schema_migrations WHERE migration_key='department_history_v1'")) return;
    await runDb('BEGIN IMMEDIATE');
    try {
      await runDb('ALTER TABLE departments ADD COLUMN archived_at TEXT');
      await runDb('ALTER TABLE time_entries ADD COLUMN department_id INTEGER REFERENCES departments(id)');
      await runDb('ALTER TABLE time_entries ADD COLUMN legacy_department_unknown INTEGER NOT NULL DEFAULT 0');
      await runDb(`CREATE TABLE user_department_history(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,department_id INTEGER NOT NULL REFERENCES departments(id),effective_from TEXT,is_initial INTEGER NOT NULL DEFAULT 0,is_archive INTEGER NOT NULL DEFAULT 0,created_by INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,effective_from))`);
      await runDb('CREATE UNIQUE INDEX idx_department_history_initial ON user_department_history(user_id) WHERE is_initial=1');
      await runDb('CREATE INDEX idx_time_department_date ON time_entries(department_id,date,user_id)');
      await runDb('CREATE TABLE department_history_audit(id INTEGER PRIMARY KEY,user_id INTEGER,actor_id INTEGER,action TEXT,before_json TEXT,after_json TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP)');
      const system = await getDb('SELECT id FROM departments WHERE is_system=1');
      await runDb('INSERT INTO user_department_history(user_id,department_id,is_initial) SELECT id,?,1 FROM users',[system.id]);
      await runDb('INSERT INTO user_department_history(user_id,department_id,effective_from) SELECT id,department_id,? FROM users WHERE department_id<>?',[today(),system.id]);
      await runDb('UPDATE time_entries SET department_id=?,legacy_department_unknown=1',[system.id]);
      await runDb(`CREATE TRIGGER initialize_department_history AFTER INSERT ON users BEGIN
        INSERT INTO user_department_history(user_id,department_id,is_initial) VALUES(NEW.id,COALESCE(NEW.department_id,(SELECT id FROM departments WHERE is_system=1)),1);
      END`);
      await runDb("INSERT INTO schema_migrations(migration_key) VALUES('department_history_v1')");
      await runDb('COMMIT');
    } catch(e) { await runDb('ROLLBACK');throw e; }
  }
  async function syncCurrent() { await runDb(`UPDATE users SET department_id=${atSql('users.id',"date('now','+3 hours')")} WHERE department_id IS NOT ${atSql('users.id',"date('now','+3 hours')")}`); }
  async function at(userId,date) { const row=await getDb(`SELECT ${atSql('?', '?')} AS id`,[userId,day(date)]); if(!row?.id) throw fail(400,'Нет назначения подразделения на указанную дату','missing_assignment'); return row.id; }
  async function managed(user) { return (await allDb('SELECT d.id FROM departments d JOIN users u ON u.id=d.manager_user_id WHERE d.manager_user_id=? AND d.archived_at IS NULL AND u.deleted=0 AND u.invited=0',[user.id])).map(d=>d.id); }
  async function canDay(user,userId,date) { return user.role==='admin'||Number(user.id)===Number(userId)||(await managed(user)).includes(await at(userId,date)); }
  async function canEntry(user,entry) { return user.role==='admin'||Number(user.id)===Number(entry.user_id)||(await managed(user)).includes(entry.department_id); }
  async function assertEntry(user,entry) { if(!await canEntry(user,entry)) throw fail(403,'Нет доступа к записям этого подразделения','entries_forbidden'); }
  async function assertNew(user,userId,projectId,date) {
    if(!validDay(day(date))) throw fail(400,'Укажите корректную дату работы','invalid_work_date');
    if(!await getDb('SELECT id FROM users WHERE id=? AND deleted=0 AND invited=0',[userId])) throw fail(400,'Сотрудник недоступен','user_unavailable');
    if(!await getDb('SELECT id FROM projects WHERE id=?',[projectId])) throw fail(400,'Проект не найден','project_not_found');
    if(!await canDay(user,userId,date)) throw fail(403,'Нет доступа к сотруднику на эту дату','day_forbidden');
    const departmentId=await at(userId,date);
    if(user.role!=='admin'&&!await getDb('SELECT 1 FROM project_departments WHERE project_id=? AND department_id=?',[projectId,departmentId])) throw fail(403,'Проект недоступен подразделению на дату работы','project_unavailable');
    return departmentId;
  }
  async function history(userId) {
    const rows=await allDb('SELECT h.*,d.name,d.short_name,d.archived_at,u.name AS actor_name,u.surname AS actor_surname FROM user_department_history h JOIN departments d ON d.id=h.department_id LEFT JOIN users u ON u.id=h.created_by WHERE h.user_id=? ORDER BY h.effective_from',[userId]);
    rows.forEach((row,i)=>{row.effective_to=rows[i+1]?.effective_from||null;});
    return rows;
  }
  async function preview(userId,operation,id,body) {
    if(!['create','update','delete'].includes(operation))throw fail(400,'Некорректная операция','invalid_operation');
    if(!await getDb('SELECT id FROM users WHERE id=?',[userId])) throw fail(404,'Сотрудник не найден','user_not_found');
    const before=await history(userId), current=before.find(h=>h.id===Number(id));
    if(operation!=='create'&&(!current||current.is_initial||current.is_archive)) throw fail(403,'Исходное или системное назначение нельзя изменять','protected_assignment');
    const rows=before.filter(h=>h.id!==current?.id).map(h=>({...h}));
    if(operation!=='delete') {
      if(!Number.isInteger(body.departmentId)||body.departmentId<1)throw fail(400,'Укажите подразделение','department_required');
      if(!validDay(body.effectiveFrom)) throw fail(400,'Укажите дату перевода','transfer_date_required');
      const dept=await getDb('SELECT * FROM departments WHERE id=?',[body.departmentId]);
      if(!dept) throw fail(400,'Подразделение не найдено','department_not_found');
      if(dept.archived_at && body.effectiveFrom>=day(dept.archived_at)) throw fail(400,'Подразделение уже архивировано на эту дату','department_archived');
      if(rows.some(h=>h.effective_from===body.effectiveFrom)) throw fail(409,'На эту дату уже есть назначение','date_conflict');
      rows.push({id:current?.id||-1,user_id:Number(userId),department_id:dept.id,effective_from:body.effectiveFrom});
    }
    rows.sort((a,b)=>(a.effective_from||'').localeCompare(b.effective_from||''));
    for(let i=0;i<rows.length;i++) {
      const dept=await getDb('SELECT archived_at FROM departments WHERE id=?',[rows[i].department_id]);
      if(dept.archived_at && (!rows[i+1]?.effective_from || rows[i+1].effective_from>day(dept.archived_at))) throw fail(400,'Назначение архивного подразделения должно закончиться до архивирования','archive_period_invalid');
    }
    const start=[current?.effective_from,operation==='delete'?null:body.effectiveFrom].filter(Boolean).sort()[0];
    const lastChange=[current?.effective_from,operation==='delete'?null:body.effectiveFrom].filter(Boolean).sort().pop();
    const end=rows.find(h=>h.effective_from>lastChange && before.some(old=>old.id===h.id&&old.id!==current?.id))?.effective_from||null;
    const affected=await allDb('SELECT id,date,department_id,legacy_department_unknown FROM time_entries WHERE user_id=? AND substr(date,1,10)>=? AND (? IS NULL OR substr(date,1,10)<?) ORDER BY id',[userId,start,end,end]);
    const version=createHash('sha256').update(JSON.stringify({before,affected})).digest('hex');
    return {startDate:start,endDateExclusive:end,count:affected.length,version,rows};
  }
  async function mutate(userId,operation,id,body,actorId) {
    await runDb('BEGIN IMMEDIATE');
    try {
      const result=await preview(userId,operation,id,body);
      if(body.expectedVersion!==result.version) throw fail(409,'История изменилась. Обновите предварительный расчёт','stale');
      const before=await history(userId);
      if(operation==='create') await runDb('INSERT INTO user_department_history(user_id,department_id,effective_from,created_by) VALUES(?,?,?,?)',[userId,body.departmentId,body.effectiveFrom,actorId]);
      if(operation==='update') await runDb('UPDATE user_department_history SET department_id=?,effective_from=?,created_by=? WHERE id=? AND user_id=?',[body.departmentId,body.effectiveFrom,actorId,id,userId]);
      if(operation==='delete') await runDb('DELETE FROM user_department_history WHERE id=? AND user_id=?',[id,userId]);
      await runDb(`UPDATE time_entries SET department_id=${atSql('time_entries.user_id','substr(time_entries.date,1,10)')},legacy_department_unknown=0 WHERE user_id=? AND substr(date,1,10)>=? AND (? IS NULL OR substr(date,1,10)<?)`,[userId,result.startDate,result.endDateExclusive,result.endDateExclusive]);
      await syncCurrent();
      await runDb('INSERT INTO department_history_audit(user_id,actor_id,action,before_json,after_json) VALUES(?,?,?,?,?)',[userId,actorId,operation,JSON.stringify(before),JSON.stringify(await history(userId))]);
      await runDb('COMMIT'); return {...result,rows:await history(userId)};
    } catch(e) {await runDb('ROLLBACK');throw e;}
  }
  async function archive(id,systemId) {
    const date=today();
    const users=await allDb(`SELECT id FROM users WHERE ${atSql('users.id','?')}=?`,[date,id]);
    for(const user of users) {
      await runDb('INSERT INTO user_department_history(user_id,department_id,effective_from,is_archive) VALUES(?,?,?,1) ON CONFLICT(user_id,effective_from) DO UPDATE SET department_id=excluded.department_id,is_archive=1',[user.id,systemId,date]);
    }
    await runDb('UPDATE user_department_history SET department_id=?,is_archive=1 WHERE department_id=? AND effective_from>=?',[systemId,id,date]);
    await runDb('UPDATE departments SET archived_at=?,manager_user_id=NULL WHERE id=?',[date,id]);
    await syncCurrent();
  }
  async function selection(user,start,end,purpose) {
    if(!validDay(start)||!validDay(end)||end<start) throw fail(400,'Укажите корректный период','invalid_period');
    await syncCurrent();
    const owned=await managed(user);
    const dirs=await allDb('SELECT * FROM departments ORDER BY is_system DESC,name');
    const allowed=dirs.filter(d=>user.role==='admin'||(!d.archived_at&&owned.includes(d.id)));
    const candidates=await allDb('SELECT id,name,surname,department_id FROM users WHERE deleted=0 AND invited=0 ORDER BY surname,name');
    const timeline=await allDb('SELECT * FROM user_department_history ORDER BY user_id,effective_from');
    const groups=allowed.map(d=>({...d,users:candidates.filter(u=>{
      const periods=timeline.filter(h=>h.user_id===u.id);
      return periods.some((h,i)=>h.department_id===d.id&&(h.effective_from||'0000')<=end&&(!periods[i+1]?.effective_from||periods[i+1].effective_from>start));
    })}));
    return {managedDepartmentIds:owned,departments:groups,canChooseOthers:user.role==='admin'||owned.length>0,canChooseCompany:purpose==='analytics'};
  }
  async function scope(user,departmentId,userId) {
    const owned=await managed(user);
    if(departmentId!==undefined&&departmentId!==null&&departmentId!=='') {
      const id=Number(departmentId); if(!Number.isInteger(id)||!await getDb('SELECT id FROM departments WHERE id=?',[id])) throw fail(400,'Подразделение не найдено','department_not_found');
      if(user.role!=='admin'&&!owned.includes(id)) throw fail(403,'Нет доступа к аналитике подразделения','analytics_forbidden'); return [id];
    }
    if(userId&&Number(userId)!==Number(user.id)&&user.role!=='admin') {if(!owned.length) throw fail(403,'Нет доступа к сотруднику','user_forbidden');return owned;}
    return null;
  }
  return {migrate,today,day,validDay,atSql,at,managed,canDay,canEntry,assertEntry,assertNew,history,preview,mutate,archive,syncCurrent,selection,scope,fail};
}
module.exports={createDepartmentHistory};
