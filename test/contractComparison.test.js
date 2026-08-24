'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildContractComparisonProjects } = require('../contractComparison');

test('maps active contract-project comparison data without labor-cost fields', () => {
  const result = buildContractComparisonProjects([
    { project_id: 2, name: 'Бета', code: '', contract_amount_kopecks: 250050, lifetime_hours: 44.5 },
    { project_id: 1, name: 'Альфа', code: 'A-1', contract_amount_kopecks: 500000, lifetime_hours: 120 },
  ]);
  assert.deepEqual(result, [
    { projectId: 1, name: 'Альфа', code: 'A-1', contractAmountExVatRub: 5000, lifetimeHours: 120 },
    { projectId: 2, name: 'Бета', code: '', contractAmountExVatRub: 2500.5, lifetimeHours: 44.5 },
  ]);
  assert.equal(Object.hasOwn(result[0], 'laborCostRub'), false);
});
