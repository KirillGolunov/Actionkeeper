'use strict';

const MANAGER_EDITABLE_PROJECT_FIELDS = new Set([
  'name',
  'description',
  'client_id',
  'code',
  'category',
  'active',
]);

const ADMIN_EDITABLE_PROJECT_FIELDS = new Set([
  ...MANAGER_EDITABLE_PROJECT_FIELDS,
]);

function getProjectEditRole(user, project) {
  if (!user || !project) return null;
  if (user.role === 'admin') return 'admin';
  if (Number(project.manager_user_id) === Number(user.id)) return 'manager';
  return null;
}

function canEditProjectField(role, field) {
  if (role === 'admin') return ADMIN_EDITABLE_PROJECT_FIELDS.has(field);
  if (role === 'manager') return MANAGER_EDITABLE_PROJECT_FIELDS.has(field);
  return false;
}

module.exports = {
  ADMIN_EDITABLE_PROJECT_FIELDS,
  MANAGER_EDITABLE_PROJECT_FIELDS,
  getProjectEditRole,
  canEditProjectField,
};
