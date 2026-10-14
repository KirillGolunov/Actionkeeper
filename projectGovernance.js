const createProjectGovernance = ({ runDb, getDb, allDb }) => {
  const fail = (status, errorCode, message) => Object.assign(new Error(message), { status, errorCode });
  async function migrate() {
    if (!await getDb("SELECT 1 FROM schema_migrations WHERE migration_key = 'project_governance_v1'")) {
      await runDb('BEGIN IMMEDIATE TRANSACTION');
      try {
        await runDb('ALTER TABLE projects ADD COLUMN responsible_department_id INTEGER REFERENCES departments(id)');
        await runDb('ALTER TABLE projects ADD COLUMN created_by INTEGER REFERENCES users(id)');
        await runDb(`UPDATE projects SET responsible_department_id = (SELECT MIN(department_id) FROM project_departments WHERE project_id = projects.id) WHERE (SELECT COUNT(*) FROM project_departments WHERE project_id = projects.id) = 1`);
        await runDb('CREATE TABLE project_responsibility_history(id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, from_department_id INTEGER, from_department_name TEXT, to_department_id INTEGER, to_department_name TEXT, actor_user_id INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)');
        await runDb('CREATE TRIGGER clear_project_creator AFTER DELETE ON users BEGIN UPDATE projects SET created_by = NULL WHERE created_by = OLD.id; END');
        await runDb("INSERT INTO schema_migrations(migration_key) VALUES ('project_governance_v1')");
        await runDb('COMMIT');
      } catch (e) { await runDb('ROLLBACK'); throw e; }
    }
    if (await getDb("SELECT 1 FROM schema_migrations WHERE migration_key = 'project_responsibility_notifications_v1'")) return;
    await runDb('BEGIN IMMEDIATE TRANSACTION');
    try {
      const table = await getDb("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'notifications'");
      if (table && !table.sql.includes('project_responsibility_transferred')) {
        const indexes = await allDb("SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'notifications' AND sql IS NOT NULL");
        const sql = table.sql.replace(/CREATE TABLE\s+["`]?notifications["`]?/i, 'CREATE TABLE notifications_governance').replace("'project_budget_request_transferred'", "'project_budget_request_transferred', 'project_responsibility_transferred'");
        await runDb(sql); await runDb('INSERT INTO notifications_governance SELECT * FROM notifications');
        await runDb('DROP TABLE notifications'); await runDb('ALTER TABLE notifications_governance RENAME TO notifications');
        for (const index of indexes) await runDb(index.sql);
      }
      await runDb("INSERT INTO schema_migrations(migration_key) VALUES ('project_responsibility_notifications_v1')");
      await runDb('COMMIT');
    } catch (e) { await runDb('ROLLBACK'); throw e; }
  }
  async function actor(user) { return getDb('SELECT id, role, department_id FROM users WHERE id = ? AND deleted = 0 AND invited = 0', [user.id]); }
  async function managed(user) {
    const current = await actor(user); if (!current) return [];
    return (await allDb('SELECT id FROM departments WHERE manager_user_id = ?', [current.id])).map(d => d.id);
  }
  async function creationOptions(user) {
    const current = await actor(user); const ids = await managed(user);
    if (!current || (current.role !== 'admin' && !ids.length)) throw fail(403, 'projects.creation_forbidden', 'Only administrators and department managers can create projects.');
    const candidates = await allDb('SELECT id, name, surname, email, department_id FROM users WHERE deleted = 0 AND invited = 0 ORDER BY surname, name');
    return { canCreateProjects: true, managedDepartmentIds: ids, managerCandidates: candidates };
  }
  async function permissions(user, project) {
    const current = await actor(user); const ids = await managed(user); const admin = current?.role === 'admin';
    const reviewer = !!current && (admin || ids.includes(project.responsible_department_id));
    return { canViewBudget: !!current && (reviewer || Number(project.manager_user_id) === Number(current.id)), canReviewBudget: reviewer, canTransferResponsibility: !!current && (admin || (Number(project.created_by) === Number(current.id) && ids.length > 0)) };
  }
  async function decorate(user, projects) {
    const dirs = await allDb('SELECT id, name, short_name, is_system FROM departments');
    return Promise.all(projects.map(async p => { const rights = await permissions(user, p); return { ...p, is_my_project: p.is_my_project || (user.role !== 'admin' && rights.canReviewBudget ? 1 : 0), has_pending_budget_request: rights.canReviewBudget ? (await getDb("SELECT 1 FROM project_budget_change_requests WHERE project_id = ? AND status = 'pending'", [p.id]) ? 1 : 0) : p.has_pending_budget_request, responsibleDepartment: dirs.find(d => d.id === p.responsible_department_id) || null, permissions: rights }; }));
  }
  async function assertReview(user, id) {
    const project = await getDb('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project || !(await permissions(user, project)).canReviewBudget) throw fail(403, 'financial.forbidden', 'You cannot review this project budget.');
    return project;
  }
  return { migrate, managed, creationOptions, permissions, decorate, assertReview, fail };
};
module.exports = { createProjectGovernance };
