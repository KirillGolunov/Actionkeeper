function registerDepartmentHistoryRoutes({app,authenticateJWT,requireAdmin,serialize,history,allDb,getDb,runDb,extendSessionIfEligible,onTimeChanged}) {
  const handle=fn=>async(req,res)=>{try{if(req.path.startsWith('/api/admin/')&&req.user.role!=='admin')throw history.fail(403,'Доступ разрешён только администратору','admin_required');await fn(req,res);}catch(e){res.status(e.status||500).json({error:e.message,errorCode:e.errorCode});}};
  app.get('/api/user-selection',authenticateJWT,serialize(handle(async(req,res)=>res.json(await history.selection(req.user,req.query.startDate||history.today(),req.query.endDate||history.today(),req.query.purpose)))));
  app.get('/api/admin/users/:userId/department-history',authenticateJWT,requireAdmin,serialize(handle(async(req,res)=>res.json(await history.history(req.params.userId)))));
  app.post('/api/admin/users/:userId/department-history/preview',authenticateJWT,requireAdmin,serialize(handle(async(req,res)=>res.json(await history.preview(req.params.userId,req.body.operation,req.body.id,req.body)))));
  for(const [method,operation,url] of [['post','create',''],['patch','update','/:id'],['delete','delete','/:id']]) {
    app[method]('/api/admin/users/:userId/department-history'+url,authenticateJWT,requireAdmin,serialize(handle(async(req,res)=>res.json(await history.mutate(req.params.userId,operation,req.params.id,req.body,req.user.id)))));
  }
  app.get('/api/time-entry-permissions',authenticateJWT,serialize(handle(async(req,res)=>{
    const id=Number(req.query.user_id||req.user.id),start=req.query.startDate,end=req.query.endDate;
    if(!history.validDay(start)||!history.validDay(end)||end<start||Date.parse(end)-Date.parse(start)>366*86400000)throw history.fail(400,'Некорректный период','invalid_period');
    const days={};for(let d=new Date(start);d<=new Date(end);d.setUTCDate(d.getUTCDate()+1)){const date=d.toISOString().slice(0,10);days[date]={canEdit:await history.canDay(req.user,id,date),departmentId:await history.at(id,date)};}
    if(Number(req.user.id)!==id&&req.user.role!=='admin'&&!Object.values(days).some(d=>d.canEdit))throw history.fail(403,'Нет доступа к сотруднику в выбранном периоде','period_forbidden');
    res.json({days});
  })));
  const canTarget=async(user,id)=>user.role==='admin'||Number(user.id)===Number(id)||(await history.managed(user)).length>0;
  app.get('/api/time-entries',authenticateJWT,serialize(handle(async(req,res)=>{
    const id=req.query.user_id?Number(req.query.user_id):req.user.role==='admin'?null:req.user.id;
    if(id&&!await canTarget(req.user,id))throw history.fail(403,'Нет доступа к сотруднику','user_forbidden');
    const conditions=[],args=[];
    if(id){conditions.push('t.user_id=?');args.push(id);}if(req.query.project_id){conditions.push('t.project_id=?');args.push(req.query.project_id);}
    if(req.query.start_date){conditions.push('substr(t.date,1,10)>=?');args.push(history.day(req.query.start_date));}if(req.query.end_date){conditions.push('substr(t.date,1,10)<=?');args.push(history.day(req.query.end_date));}
    if(req.user.role!=='admin'&&Number(id)!==Number(req.user.id)){const managed=await history.managed(req.user);if(!managed.length)throw history.fail(403,'Нет доступа','forbidden');conditions.push(`t.department_id IN (${managed.map(()=>'?').join(',')})`);args.push(...managed);}
    res.json(await allDb(`SELECT t.*,trim(coalesce(u.surname,'')||' '||coalesce(u.name,'')) AS user_name,p.name AS project_name FROM time_entries t LEFT JOIN users u ON u.id=t.user_id LEFT JOIN projects p ON p.id=t.project_id ${conditions.length?'WHERE '+conditions.join(' AND '):''} ORDER BY t.date DESC`,args));
  })));
  async function after(userId,projectIds=[],req){await extendSessionIfEligible(userId).catch(()=>{});const warnings=[];if(onTimeChanged)for(const id of new Set(projectIds)){const warning=await onTimeChanged(id,req.user.id,req).catch(()=>null);if(warning)warnings.push(warning);}return warnings;}
  app.post('/api/time-entries',authenticateJWT,serialize(handle(async(req,res)=>{
    const b=req.body;if(!Number.isFinite(b.hours)||b.hours<0)throw history.fail(400,'Некорректное количество часов','invalid_hours');
    const dept=await history.assertNew(req.user,b.user_id,b.project_id,b.date);
    const result=await runDb('INSERT INTO time_entries(project_id,user_id,date,hours,description,submission_time,department_id,legacy_department_unknown) VALUES(?,?,?,?,?,?,?,0)',[b.project_id,b.user_id,b.date,b.hours,b.description,b.submission_time,dept]);
    const warnings=await after(b.user_id,[b.project_id],req);res.json({...b,id:result.lastID,department_id:dept,payrollWarning:warnings[0]||null});
  })));
  app.patch('/api/time-entries/:id',authenticateJWT,serialize(handle(async(req,res)=>{
    const old=await getDb('SELECT * FROM time_entries WHERE id=?',[req.params.id]);if(!old)throw history.fail(404,'Запись не найдена','entry_not_found');await history.assertEntry(req.user,old);
    const b=req.body,fields=[],args=[];
    if(b.hours!==undefined&&(!Number.isFinite(b.hours)||b.hours<0))throw history.fail(400,'Некорректное количество часов','invalid_hours');
    const dateChanged=b.date!==undefined&&history.day(b.date)!==history.day(old.date),projectChanged=b.project_id!==undefined&&Number(b.project_id)!==old.project_id;
    if(dateChanged||projectChanged){
      const targetDate=history.day(b.date||old.date);
      if(!history.validDay(targetDate))throw history.fail(400,'Укажите корректную дату работы','invalid_work_date');
      let dept;
      if(projectChanged)dept=await history.assertNew(req.user,old.user_id,b.project_id||old.project_id,targetDate);
      else {
        if(!await history.canDay(req.user,old.user_id,targetDate))throw history.fail(403,'Нет доступа к сотруднику на эту дату','day_forbidden');
        dept=await history.at(old.user_id,targetDate);
      }
      if(dateChanged){fields.push('department_id=?','legacy_department_unknown=0');args.push(dept);}
    }
    for(const key of ['date','hours','description','project_id'])if(b[key]!==undefined){fields.push(key+'=?');args.push(b[key]);}
    if(!fields.length)throw history.fail(400,'Нет изменений','no_changes');args.push(old.id);await runDb(`UPDATE time_entries SET ${fields.join(',')} WHERE id=?`,args);const warnings=await after(old.user_id,[old.project_id,b.project_id||old.project_id],req);res.json({id:old.id,...b,payrollWarning:warnings[0]||null});
  })));
  app.delete('/api/time-entries/:id',authenticateJWT,serialize(handle(async(req,res)=>{
    const old=await getDb('SELECT * FROM time_entries WHERE id=?',[req.params.id]);if(!old)throw history.fail(404,'Запись не найдена','entry_not_found');await history.assertEntry(req.user,old);await runDb('DELETE FROM time_entries WHERE id=?',[old.id]);await after(old.user_id);res.json({success:true});
  })));
  app.post('/api/time-entries/batch',authenticateJWT,serialize(handle(async(req,res)=>{
    if(!Array.isArray(req.body.entries)||!req.body.entries.length)throw history.fail(400,'Нет записей','no_entries');
    await runDb('BEGIN IMMEDIATE');
    try{for(const b of req.body.entries){
      if(!history.validDay(history.day(b.date))||!Number.isFinite(b.hours)||b.hours<0)throw history.fail(400,'Некорректная запись','invalid_entry');
      const old=await getDb('SELECT * FROM time_entries WHERE user_id=? AND project_id=? AND date=?',[b.user_id,b.project_id,b.date]);
      if(old){await history.assertEntry(req.user,old);await runDb('UPDATE time_entries SET hours=?,submission_time=datetime(\'now\') WHERE id=?',[b.hours,old.id]);}
      else{const dept=await history.assertNew(req.user,b.user_id,b.project_id,b.date);await runDb('INSERT INTO time_entries(user_id,project_id,date,hours,department_id,legacy_department_unknown,submission_time) VALUES(?,?,?,?,?,0,datetime(\'now\'))',[b.user_id,b.project_id,b.date,b.hours,dept]);}
    }await runDb('COMMIT');}catch(e){await runDb('ROLLBACK');throw e;}
    for(const id of new Set(req.body.entries.map(b=>b.user_id)))await after(id);const warnings=await after(req.user.id,req.body.entries.map(b=>b.project_id),req);res.json({success:true,payrollWarnings:warnings});
  })));
  app.post('/api/time-entries/bulk-delete',authenticateJWT,serialize(handle(async(req,res)=>{
    const b=req.body,start=history.day(b.week_start);if(!history.validDay(start)||!b.user_id||!b.project_id)throw history.fail(400,'Укажите сотрудника, проект и неделю','week_required');
    const end=new Date(start);end.setUTCDate(end.getUTCDate()+6);
    await runDb('BEGIN IMMEDIATE');try{const rows=await allDb('SELECT * FROM time_entries WHERE user_id=? AND project_id=? AND substr(date,1,10)>=? AND substr(date,1,10)<=?',[b.user_id,b.project_id,start,end.toISOString().slice(0,10)]);for(const row of rows)await history.assertEntry(req.user,row);for(const row of rows)await runDb('DELETE FROM time_entries WHERE id=?',[row.id]);await runDb('COMMIT');res.json({deleted:rows.length});}catch(e){await runDb('ROLLBACK');throw e;}
  })));
}
module.exports={registerDepartmentHistoryRoutes};
