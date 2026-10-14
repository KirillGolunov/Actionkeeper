'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const sqlite3 = require('sqlite3');
const jwt = require('jsonwebtoken');
function database(db) {
  return {
    run: (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(err) { err ? reject(err) : resolve(this); })),
    get: (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row))),
  };
}
test('department API enforces catalog, membership and history access with atomic batches', { timeout: 60000 }, async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'time-tracker-departments-'));
  const probe = net.createServer(); await new Promise(r => probe.listen(0, '127.0.0.1', r)); const port = probe.address().port; await new Promise(r => probe.close(r));
  const secret = 'department-integration-test-only';
  const preload = path.join(tmp, 'mail-stub.cjs');
  await fs.writeFile(preload, `const Module = require('module'); const original = Module._load; Module._load = function(name, ...args) { if (name === 'nodemailer') return { createTransport: () => ({ sendMail: async () => { if (require('fs').existsSync(${JSON.stringify(path.join(tmp, 'mail.fail'))})) throw new Error('Test delivery failure'); return { messageId: 'test' }; } }) }; return original.call(this, name, ...args); };`);
  const child = spawn(process.execPath, ['--require', preload, 'server.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, DB_PATH: path.join(tmp, 'test.db'), PORT: String(port), MAGIC_LINK_SECRET: secret, NODE_ENV: 'development', SMTP_HOST: 'test.invalid', SMTP_PORT: '587', SMTP_USER: 'test', SMTP_PASS: 'test', SMTP_FROM: 'test@test.invalid' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let db;
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Server startup timed out')), 20000);
      child.stdout.on('data', bytes => { if (bytes.toString().includes('Server is running')) { clearTimeout(timer); resolve(); } });
      child.stderr.on('data', () => {});
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
    });
    const base = `http://127.0.0.1:${port}`;
    async function request(method, endpoint, token, body, status = 200) {
      const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      const text = await response.text(); assert.equal(response.status, status, `${method} ${endpoint}: ${text}`); return text && response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : null;
    }
    await request('POST', '/api/setup', null, { name: 'Admin', surname: 'Test', email: 'admin@test.invalid' });
    db = new sqlite3.Database(path.join(tmp, 'test.db')); const sql = database(db);
    async function token(id, role = 'user') {
      const sid = `test-${id}`; await sql.run('INSERT INTO auth_sessions(user_id,token_id,expires_at) VALUES(?,?,?)', [id, sid, '2099-01-01T00:00:00.000Z']);
      // Deliberately stale JWT role: actual permissions must come from the database.
      return jwt.sign({ id, role, sid }, secret, { expiresIn: '1h' });
    }
    const admin = await token(1);
    const dirs = await request('GET', '/api/departments', admin); const system = dirs[0].id;
    await request('PATCH', `/api/departments/${system}`, admin, { name: 'Rename' }, 403);
    const a = await request('POST', '/api/departments', admin, { name: 'A', short_name: 'A' }); const b = await request('POST', '/api/departments', admin, { name: 'B', short_name: 'B' });
    await request('POST', '/api/departments', admin, { name: 'A', short_name: 'A' }, 409);
    await request('PATCH', `/api/departments/${b.id}`, admin, { name: 'B updated' });
    await request('POST', '/api/users', admin, { name: 'Missing', surname: 'Test', email: 'missing@test.invalid' }, 400);
    await request('POST', '/api/invitations', admin, { email: 'new@test.invalid' }, 400);
    await request('POST', '/api/invitations', admin, { email: 'invited@test.invalid', name: 'Invited', surname: 'Test', department_id: a.id });
    const invitation = await sql.get('SELECT token FROM invitations WHERE email = ?', ['invited@test.invalid']);
    await request('POST', `/api/invitations/accept/${invitation.token}`, null, { name: 'Invited', surname: 'Test' });
    assert.equal((await sql.get('SELECT department_id FROM users WHERE email = ?', ['invited@test.invalid'])).department_id, a.id);
    const ua = await request('POST', '/api/users', admin, { name: 'A', surname: 'User', email: 'a@test.invalid', department_id: a.id });
    const ub = await request('POST', '/api/users', admin, { name: 'B', surname: 'User', email: 'b@test.invalid', department_id: b.id });
    const ta = await token(ua.id, 'admin'); const tb = await token(ub.id);
    await request('PATCH', `/api/users/${ua.id}`, ta, { department_id: b.id }, 403);
    await request('POST', '/api/departments', ta, { name: 'Forbidden' }, 403);
    const client = await sql.run("INSERT INTO clients(name,type) VALUES('Client','internal')");
    const payload = { name: 'Shared', category: 'internal_project', client_id: client.lastID, responsibleDepartmentId: a.id };
    await request('POST', '/api/projects', admin, payload, 400);
    const shared = await request('POST', '/api/projects', admin, { ...payload, departmentIds: [a.id,b.id] });
    const onlyA = await request('POST', '/api/projects', admin, { ...payload, name: 'Only A', departmentIds: [a.id] });
    await sql.run('UPDATE projects SET manager_user_id = ? WHERE id = ?', [ub.id, onlyA.id]);
    assert.equal((await request('GET', '/api/projects', tb)).length, 2);
    assert.equal((await request('GET', '/api/projects?purpose=time-entry', tb)).length, 1);
    await request('GET', `/api/projects?purpose=time-entry&user_id=${ua.id}`, tb, undefined, 403);
    assert.equal((await request('GET', `/api/projects?purpose=time-entry&user_id=${ub.id}`, admin)).length, 1);
    await request('PATCH', `/api/projects/${onlyA.id}`, ta, { departmentIds: [b.id] }, 403);
    await request('PATCH', `/api/projects/${onlyA.id}`, tb, { departmentIds: [a.id,b.id] });
    await request('PATCH', `/api/projects/${onlyA.id}`, tb, { departmentIds: [] }, 400);
    await request('PATCH', `/api/projects/${onlyA.id}`, admin, { departmentIds: [a.id] });
    const entry = { user_id: ua.id, project_id: onlyA.id, date: '2026-10-05', hours: 4 };
    const saved = await request('POST', '/api/time-entries', ta, entry);
    await request('POST', '/api/time-entries', tb, { ...entry, user_id: ub.id }, 403);
    const transfer = { operation: 'create', departmentId: b.id, effectiveFrom: '2026-10-06' };
    const preview = await request('POST', `/api/admin/users/${ua.id}/department-history/preview`, admin, transfer);
    await request('POST', `/api/admin/users/${ua.id}/department-history`, admin, { ...transfer, expectedVersion: preview.version });
    assert.equal((await request('GET', '/api/auth/session-status', ta)).user.department_id, b.id);
    assert.equal((await request('GET', '/api/projects', ta)).length, 1);
    await request('PATCH', `/api/time-entries/${saved.id}`, ta, { hours: 5, description: 'Historical correction', date: '2026-10-06' });
    await request('POST', '/api/time-entries/batch', ta, { entries: [{ ...entry, date: '2026-10-06', hours: 6 }] });
    await request('POST', '/api/time-entries/batch', ta, { entries: [{ ...entry, date: '2026-10-06', hours: 7 }, { ...entry, date: '2026-10-07' }] }, 403);
    assert.equal((await sql.get('SELECT hours FROM time_entries WHERE id = ?', [saved.id])).hours, 6);
    await request('POST', '/api/time-entries', ta, { ...entry, date: '2026-10-08' }, 403);
    const other = await request('POST', '/api/time-entries', ta, { ...entry, date: '2026-10-06', project_id: shared.id });
    await request('PATCH', `/api/time-entries/${other.id}`, ta, { project_id: onlyA.id }, 403);
    await request('DELETE', `/api/time-entries/${saved.id}`, ta);
    assert.equal((await request('GET', '/api/projects', admin)).length, 2);
    await request('GET', '/api/dashboard?scope=company', tb);
    await request('GET', '/api/dashboard/team-weekly?year=2026', tb);
    await request('DELETE', `/api/departments/${a.id}`, ta, undefined, 403);
    await request('DELETE', `/api/departments/${system}`, admin, undefined, 403);
    await request('PATCH', `/api/departments/${b.id}`, admin, { manager_user_id: ua.id });
    await request('DELETE', `/api/departments/${b.id}`, admin);
    assert.equal((await request('GET', '/api/auth/session-status', ta)).user.department_id, system);
    assert.equal((await request('GET', '/api/projects?purpose=time-entry', ta)).length, 0);
    await request('DELETE', `/api/departments/${a.id}`, admin);
    assert.equal((await sql.get('SELECT department_id FROM users WHERE id = ?', [ub.id])).department_id, system);
    assert.equal((await request('GET', '/api/projects?purpose=time-entry', ta)).length, 2);
    assert.ok(await sql.get('SELECT id FROM time_entries WHERE id = ?', [other.id]));
    // Department-governance scenarios use the same live sessions to verify immediate changes.
    const c = await request('POST', '/api/departments', admin, { name: 'C', short_name: 'C', manager_user_id: ua.id });
    const d = await request('POST', '/api/departments', admin, { name: 'D', short_name: 'D', manager_user_id: ub.id });
    const candidate = await request('POST', '/api/users', admin, { name: 'Candidate', surname: 'User', email: 'candidate@test.invalid', department_id: d.id });
    const session = await request('GET', '/api/auth/session-status', ta);
    assert.equal(session.user.canCreateProjects, true); assert.deepEqual(session.user.managedDepartmentIds, [c.id]);
    const options = await request('GET', '/api/projects/creation-options', ta);
    assert.ok(options.managerCandidates.some(u => u.id === ua.id)); assert.ok(options.managerCandidates.some(u => u.id === ub.id));
    assert.equal(options.managerCandidates.find(u => u.id === candidate.id).department_id, d.id);
    const initialBudget = { budgetMode: 'manual', projectBudgetLimitRub: 100000, payrollLimitMode: 'fixed_amount', payrollLimitRub: 70000, payrollWarningThresholdPercent: 80 };
    const newPayload = { ...payload, name: 'Governed', departmentIds: [c.id,d.id], responsibleDepartmentId: c.id, managerUserId: ua.id, budget: initialBudget, budgetReason: 'Initial budget' };
    for (const state of ['invited', 'deleted']) {
      await sql.run(`UPDATE users SET ${state} = 1 WHERE id = ?`, [candidate.id]);
      const filtered = await request('GET', '/api/projects/creation-options', ta);
      assert.ok(!filtered.managerCandidates.some(u => u.id === candidate.id));
      await request('POST', '/api/projects', ta, { ...newPayload, managerUserId: candidate.id }, 400);
      await sql.run(`UPDATE users SET ${state} = 0 WHERE id = ?`, [candidate.id]);
    }
    await sql.run('UPDATE departments SET manager_user_id = ? WHERE id = ?', [ub.id, d.id]);
    await request('POST', '/api/projects', ta, { ...newPayload, managerUserId: 999999 }, 400);
    assert.equal(await sql.get("SELECT id FROM projects WHERE name = 'Governed'"), undefined);
    const crossDepartment = await request('POST', '/api/projects', ta, { ...newPayload, name: 'Cross department manager', managerUserId: ub.id });
    assert.equal(crossDepartment.manager_user_id, ub.id);
    await request('PUT', `/api/admin/projects/${crossDepartment.id}/manager`, ta, { managerUserId: ua.id }, 403);
    const governed = await request('POST', '/api/projects', ta, newPayload);
    assert.equal(governed.created_by, ua.id); assert.equal(governed.responsible_department_id, c.id); assert.equal(governed.permissions.canReviewBudget, true);
    assert.equal((await sql.get('SELECT source_type FROM project_budget_versions WHERE project_id = ?', [governed.id])).source_type, 'project_creation');
    await request('PATCH', `/api/admin/projects/${governed.id}/budget`, ta, { reason: 'No direct edits', budget: initialBudget }, 403);
    await request('GET', `/api/projects/${governed.id}/budget`, tb, undefined, 403);
    const proposed = await request('POST', `/api/projects/${governed.id}/budget-change-requests`, ta, { reason: 'More capacity', proposedBudget: { ...initialBudget, projectBudgetLimitRub: 120000 } }, 201);
    const status = await request('GET', `/api/projects/${governed.id}/budget`, ta);
    const activeRequest = status.activeRequest;
    const decision = { decision: 'approve', reason: 'Approved by owner', expectedRevision: activeRequest.currentRevision };
    await request('PATCH', `/api/admin/projects/${governed.id}/budget-change-requests/${activeRequest.id}`, tb, decision, 403);
    await sql.run("CREATE TRIGGER block_owner_transfer BEFORE UPDATE OF responsible_department_id ON projects BEGIN SELECT RAISE(ABORT, 'test rollback'); END");
    await request('POST', `/api/projects/${governed.id}/transfer-responsibility`, ta, { departmentId: d.id }, 500);
    assert.equal((await sql.get('SELECT responsible_department_id FROM projects WHERE id = ?', [governed.id])).responsible_department_id, c.id);
    await sql.run('DROP TRIGGER block_owner_transfer');
    const transferred = await request('POST', `/api/projects/${governed.id}/transfer-responsibility`, ta, { departmentId: d.id });
    assert.equal(transferred.emailDelivery, 'sent');
    assert.equal((await sql.get("SELECT COUNT(*) AS count FROM notifications WHERE project_id = ? AND type = 'project_responsibility_transferred'", [governed.id])).count, 2);
    const pendingForD = await request('GET', '/api/admin/project-budget-change-requests?status=pending', tb);
    assert.ok(pendingForD.some(r => r.projectId === governed.id));
    await request('PATCH', `/api/admin/projects/${governed.id}/budget-change-requests/${activeRequest.id}`, ta, decision, 403);
    const results = await Promise.all([1,2].map(() => fetch(base + `/api/admin/projects/${governed.id}/budget-change-requests/${activeRequest.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tb}` }, body: JSON.stringify(decision) })));
    assert.deepEqual(results.map(r => r.status).sort(), [200,409]);
    assert.equal((await sql.get('SELECT reviewed_by FROM project_budget_change_requests WHERE id = ?', [activeRequest.id])).reviewed_by, ub.id);
    await request('PATCH', `/api/projects/${governed.id}`, ta, { departmentIds: [c.id] }, 400);
    await request('POST', `/api/projects/${governed.id}/transfer-responsibility`, tb, { departmentId: c.id }, 403);
    await request('PATCH', `/api/departments/${c.id}`, admin, { manager_user_id: null });
    assert.equal((await request('GET', '/api/auth/session-status', ta)).user.canCreateProjects, false);
    await request('POST', '/api/projects', ta, { ...newPayload, name: 'Forbidden after removal' }, 403);
    await request('POST', `/api/projects/${governed.id}/transfer-responsibility`, ta, { departmentId: c.id }, 403);
    await request('POST', `/api/projects/${governed.id}/transfer-responsibility`, admin, { departmentId: c.id });
    await request('PATCH', `/api/departments/${c.id}`, admin, { manager_user_id: ua.id });
    const ownRequest = await request('POST', `/api/projects/${governed.id}/budget-change-requests`, ta, { reason: 'Self review allowed', proposedBudget: initialBudget }, 201);
    const ownStatus = await request('GET', `/api/projects/${governed.id}/budget`, ta);
    await request('PATCH', `/api/admin/projects/${governed.id}/budget-change-requests/${ownStatus.activeRequest.id}`, ta, { ...decision, expectedRevision: ownStatus.activeRequest.currentRevision });
    await sql.run("CREATE TRIGGER reject_initial_budget BEFORE INSERT ON project_budget_versions BEGIN SELECT RAISE(ABORT, 'test rollback'); END");
    await request('POST', '/api/projects', ta, { ...newPayload, name: 'Atomic failure' }, 500);
    assert.equal(await sql.get("SELECT id FROM projects WHERE name = 'Atomic failure'"), undefined);
    await sql.run('DROP TRIGGER reject_initial_budget');
    await fs.writeFile(path.join(tmp, 'mail.fail'), '1');
    const mailFailure = await request('POST', '/api/projects', ta, { ...newPayload, name: 'Committed despite delivery failure' });
    assert.equal(mailFailure.emailDelivery, 'failed');
    assert.ok(await sql.get('SELECT id FROM projects WHERE id = ?', [mailFailure.id]));
    await fs.unlink(path.join(tmp, 'mail.fail'));
    await request('DELETE', `/api/departments/${c.id}`, admin);
    assert.equal((await sql.get('SELECT responsible_department_id FROM projects WHERE id = ?', [governed.id])).responsible_department_id, system);
    assert.equal((await sql.get('SELECT COUNT(*) AS count FROM project_responsibility_history WHERE project_id = ?', [governed.id])).count, 3);


  } finally {
    if (db) await new Promise(r => db.close(r));
    child.kill(); await new Promise(r => child.exitCode !== null ? r() : child.once('exit', r));
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
