'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getProjectEditRole, canEditProjectField } = require('../projectUtils');

test('allows an administrator to edit project fields including active status', () => {
  const role = getProjectEditRole({ id: 1, role: 'admin' }, { manager_user_id: 2 });
  assert.equal(role, 'admin');
  assert.equal(canEditProjectField(role, 'name'), true);
  assert.equal(canEditProjectField(role, 'active'), true);
});

test('allows the current manager to edit project details and active status', () => {
  const role = getProjectEditRole({ id: 2, role: 'user' }, { manager_user_id: 2 });
  assert.equal(role, 'manager');
  assert.equal(canEditProjectField(role, 'description'), true);
  assert.equal(canEditProjectField(role, 'active'), true);
});

test('denies project editing to unrelated users and unknown fields', () => {
  const role = getProjectEditRole({ id: 3, role: 'user' }, { manager_user_id: 2 });
  assert.equal(role, null);
  assert.equal(canEditProjectField(role, 'name'), false);
  assert.equal(canEditProjectField(role, 'active'), false);
  assert.equal(canEditProjectField('admin', 'manager_user_id'), false);
});
