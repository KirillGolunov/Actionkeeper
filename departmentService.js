const createDepartmentService = ({ runDb, getDb, allDb }) => {
  let history = null;
  const useHistory = service => { history=service; };
  const invalid = () => Object.assign(new Error('Choose a valid department.'), { status: 400, errorCode: 'departments.invalid' });
  async function migrate() {
    await runDb('CREATE TABLE IF NOT EXISTS schema_migrations (migration_key TEXT PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
    if (!await getDb("SELECT 1 FROM schema_migrations WHERE migration_key = 'departments_v1'")) {
      await runDb('BEGIN IMMEDIATE TRANSACTION');
      try {
        await runDb('CREATE TABLE departments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL COLLATE NOCASE UNIQUE, is_system INTEGER NOT NULL DEFAULT 0)');
        await runDb('ALTER TABLE users ADD COLUMN department_id INTEGER REFERENCES departments(id)');
        await runDb('CREATE TABLE project_departments (project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, department_id INTEGER NOT NULL REFERENCES departments(id), PRIMARY KEY(project_id, department_id))');
        await runDb('CREATE INDEX idx_project_departments_department ON project_departments(department_id, project_id)');
        await runDb('CREATE TRIGGER delete_project_departments AFTER DELETE ON projects BEGIN DELETE FROM project_departments WHERE project_id = OLD.id; END');
        const result = await runDb("INSERT INTO departments(name, is_system) VALUES ('Без подразделения', 1)");
        await runDb('UPDATE users SET department_id = ?', [result.lastID]);
        await runDb('INSERT INTO project_departments SELECT id, ? FROM projects', [result.lastID]);
        await runDb("INSERT INTO schema_migrations(migration_key) VALUES ('departments_v1')");
        await runDb('COMMIT');
      } catch (error) { await runDb('ROLLBACK'); throw error; }
    }
    if (!await getDb("SELECT 1 FROM schema_migrations WHERE migration_key = 'departments_v2'")) {
      await runDb('BEGIN IMMEDIATE TRANSACTION');
      try {
        await runDb('ALTER TABLE departments ADD COLUMN short_name TEXT');
        await runDb('ALTER TABLE departments ADD COLUMN manager_user_id INTEGER REFERENCES users(id)');
        await runDb('UPDATE departments SET short_name = name');
        await runDb('CREATE TRIGGER clear_department_manager_on_user_delete AFTER DELETE ON users BEGIN UPDATE departments SET manager_user_id = NULL WHERE manager_user_id = OLD.id; END');
        await runDb('CREATE TRIGGER clear_department_manager_on_user_deactivate AFTER UPDATE OF deleted ON users WHEN NEW.deleted = 1 BEGIN UPDATE departments SET manager_user_id = NULL WHERE manager_user_id = NEW.id; END');
        await runDb("INSERT INTO schema_migrations(migration_key) VALUES ('departments_v2')");
        await runDb('COMMIT');
      } catch (error) { await runDb('ROLLBACK'); throw error; }
    }
    if (await getDb("SELECT 1 FROM schema_migrations WHERE migration_key = 'project_departments_exclusive_unassigned'")) return;
    await runDb('BEGIN IMMEDIATE TRANSACTION');
    try {
      await runDb(`DELETE FROM project_departments
        WHERE department_id IN (SELECT id FROM departments WHERE is_system = 1)
          AND project_id IN (SELECT pd.project_id FROM project_departments pd JOIN departments d ON d.id = pd.department_id WHERE d.is_system = 0)`);
      await runDb("INSERT INTO schema_migrations(migration_key) VALUES ('project_departments_exclusive_unassigned')");
      await runDb('COMMIT');
    } catch (error) { await runDb('ROLLBACK'); throw error; }

  }
  const failure = (status, code, message) => Object.assign(new Error(message), { status, errorCode: `departments.${code}` });
  async function list(includeArchived = false) {
    const archived = (await allDb('PRAGMA table_info(departments)')).some(c=>c.name==='archived_at');
    return allDb('SELECT d.*, u.name AS manager_name, u.surname AS manager_surname FROM departments d LEFT JOIN users u ON u.id = d.manager_user_id '+(archived&&!includeArchived?'WHERE d.archived_at IS NULL ':'')+'ORDER BY d.is_system DESC, d.name');
  }
  async function save(id, body) {
    const current = id ? await getDb('SELECT * FROM departments WHERE id = ?', [id]) : null;
    if (id && !current) throw failure(404, 'not_found', 'Department not found.');
    if(body.status!==undefined&&!['active','archived'].includes(body.status)) throw failure(400,'invalid_status','Choose a valid department status.');
    if(body.status==='archived'&&(!current||!history)) throw failure(400,'invalid_status','Only existing departments can be archived.');
    if (current?.is_system) throw failure(403, 'system_protected', 'The system department cannot be changed.');
    const field = key => Object.prototype.hasOwnProperty.call(body, key) ? body[key] : current?.[key];
    const name = typeof field('name') === 'string' ? field('name').trim() : '';
    const shortName = typeof field('short_name') === 'string' ? field('short_name').trim() : '';
    if (!name || name.length > 120) throw failure(400, 'name_required', 'Enter a department name (up to 120 characters).');
    if (!shortName || shortName.length > 120) throw failure(400, 'short_name_required', 'Enter a short name (up to 120 characters).');
    const normalize = value => (value || '').trim().toLocaleLowerCase('ru');
    const others = (await allDb('SELECT id, name, short_name FROM departments')).filter(d => Number(d.id) !== Number(id));
    if (others.some(d => normalize(d.name) === normalize(name))) throw failure(409, 'duplicate_name', 'Department name already exists.');
    if (others.some(d => normalize(d.short_name) === normalize(shortName))) throw failure(409, 'duplicate_short_name', 'Department short name already exists.');
    const managerId = field('manager_user_id') ?? null;
    if (managerId !== null && (!Number.isInteger(managerId) || !await getDb('SELECT id FROM users WHERE id = ? AND deleted = 0 AND invited = 0', [managerId]))) throw failure(400, 'invalid_manager', 'Choose an active user as department manager.');
    const transaction = !!(current && history);
    if(transaction) await runDb('BEGIN IMMEDIATE TRANSACTION');
    try {
      if (current) {
        await runDb('UPDATE departments SET name = ?, short_name = ?, manager_user_id = ? WHERE id = ?', [name, shortName, managerId, id]);
        if(history && body.status==='active') await runDb('UPDATE departments SET archived_at=NULL WHERE id=?',[id]);
        if(history && body.status==='archived'&&!current.archived_at) await remove(id,false);
      } else id = (await runDb('INSERT INTO departments(name, short_name, manager_user_id) VALUES (?, ?, ?)', [name, shortName, managerId])).lastID;
      const saved=(await list(true)).find(d=>Number(d.id)===Number(id));
      if(transaction) await runDb('COMMIT');
      return saved;
    }catch(error){if(transaction)await runDb('ROLLBACK');throw error;}
  }

  async function remove(id,manageTransaction=true) {
    if(manageTransaction) await runDb('BEGIN IMMEDIATE TRANSACTION');
    try {
      const current = await getDb('SELECT * FROM departments WHERE id = ?', [id]);
      if (!current) throw failure(404, 'not_found', 'Department not found.');
      if (current.is_system) throw failure(403, 'system_protected', 'The system department cannot be deleted.');
      const system = await getDb('SELECT id FROM departments WHERE is_system = 1');
      if (!system) throw failure(500, 'delete_failed', 'System department is missing.');
      const affected = await allDb('SELECT project_id FROM project_departments WHERE department_id = ?', [id]);
      const columns = await allDb('PRAGMA table_info(projects)');
      if (columns.some(c => c.name === 'responsible_department_id')) {
        const owned = await allDb('SELECT id FROM projects WHERE responsible_department_id = ?', [id]);
        for (const project of owned) {
          await runDb('DELETE FROM project_departments WHERE project_id = ?', [project.id]);
          await runDb('INSERT INTO project_departments(project_id, department_id) VALUES (?, ?)', [project.id, system.id]);
          await runDb('UPDATE projects SET responsible_department_id = ? WHERE id = ?', [system.id, project.id]);
          await runDb('INSERT INTO project_responsibility_history(project_id,from_department_id,from_department_name,to_department_id,to_department_name) VALUES(?,?,?,?,?)', [project.id, current.id, current.name, system.id, 'Без подразделения']);
        }
      }

      if (!history) await runDb('UPDATE users SET department_id = ? WHERE department_id = ?', [system.id, id]);
      await runDb('DELETE FROM project_departments WHERE department_id = ?', [id]);
      for (const { project_id } of affected) {
        if (!await getDb('SELECT 1 FROM project_departments WHERE project_id = ?', [project_id])) await runDb('INSERT INTO project_departments(project_id, department_id) VALUES (?, ?)', [project_id, system.id]);
      }
      if (history) await history.archive(Number(id),system.id);
      else await runDb('DELETE FROM departments WHERE id = ?', [id]);
      if(manageTransaction) await runDb('COMMIT');
    } catch (error) { if(manageTransaction)await runDb('ROLLBACK'); throw error; }
  }
  async function validate(id) {
    if(history && await getDb('SELECT 1 FROM departments WHERE id=? AND archived_at IS NOT NULL',[id])) throw invalid();
    if (!Number.isInteger(id) || id < 1 || !await getDb('SELECT id FROM departments WHERE id = ?', [id])) throw invalid();
    return id;
  }
  async function validateIds(ids) {
    if (!Array.isArray(ids) || !ids.length) throw invalid();
    const unique = [...new Set(ids)];
    for (const id of unique) await validate(id);
    const system = await getDb('SELECT id FROM departments WHERE is_system = 1');
    return unique.length > 1 ? unique.filter(id => id !== system?.id) : unique;
  }
  async function setProject(id, ids) {
    await runDb('DELETE FROM project_departments WHERE project_id = ?', [id]);
    for (const departmentId of ids) await runDb('INSERT INTO project_departments(project_id, department_id) VALUES (?, ?)', [id, departmentId]);
  }
  async function decorate(projects) {
    const links = await allDb('SELECT pd.project_id, d.id, d.name, d.short_name, d.is_system FROM project_departments pd JOIN departments d ON d.id = pd.department_id ORDER BY d.name');
    return projects.map(project => ({ ...project, departments: links.filter(link => link.project_id === project.id).map(({ id, name, short_name, is_system }) => ({ id, name, short_name, is_system })) }));
  }
  async function canLog(user, projectId, targetId = user.id) {
    if (user.role === 'admin') return !!await getDb('SELECT id FROM projects WHERE id = ?', [projectId]);
    return !!await getDb('SELECT 1 FROM project_departments pd JOIN users u ON u.department_id = pd.department_id WHERE pd.project_id = ? AND u.id = ?', [projectId, targetId]);
  }
  async function assertLog(user, projectId, targetId) {
    if (!await canLog(user, projectId, targetId)) throw Object.assign(new Error('Project is unavailable for new time entries.'), { status: 403, errorCode: 'departments.project_unavailable' });
  }
  return { useHistory, migrate, list, save, remove, validate, validateIds, setProject, decorate, canLog, assertLog };
};
module.exports = { createDepartmentService };
