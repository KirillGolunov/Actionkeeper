'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseBudgetPayload, mapBudgetRow, calculateLaborSummary, buildLaborCostSeries, getProjectFinancialRisk, getProjectPayrollUsage } = require('../budgetUtils');

test('calculates contract reserve, total limit and percent payroll limit', () => {
  const result = parseBudgetPayload({
    budgetMode: 'contract',
    contractAmountExVatRub: 1000000,
    managementReservePercent: 20,
    payrollLimitMode: 'percent',
    payrollLimitPercent: 60,
    payrollWarningThresholdPercent: 80,
  });
  assert.equal(result.management_reserve_kopecks, 20000000);
  assert.equal(result.project_budget_limit_kopecks, 80000000);
  assert.equal(result.payroll_limit_kopecks, 48000000);
});

test('supports a fixed payroll limit and derives its percentage', () => {
  const result = parseBudgetPayload({
    budgetMode: 'manual',
    projectBudgetLimitRub: 800000,
    payrollLimitMode: 'fixed_amount',
    payrollLimitRub: 450000,
  });
  assert.equal(result.payroll_limit_kopecks, 45000000);
  assert.equal(result.payroll_limit_bps, 5625);
});

test('distinguishes no budget and a zero budget', () => {
  assert.deepEqual(parseBudgetPayload({ budgetMode: 'none' }), { budget_mode: 'none', note: '' });
  const zero = parseBudgetPayload({
    budgetMode: 'manual', projectBudgetLimitRub: 0,
    payrollLimitMode: 'fixed_amount', payrollLimitRub: 0,
  });
  assert.equal(zero.project_budget_limit_kopecks, 0);
});

test('rejects payroll above the project limit and invalid warning thresholds', () => {
  assert.throws(() => parseBudgetPayload({
    budgetMode: 'manual', projectBudgetLimitRub: 100,
    payrollLimitMode: 'fixed_amount', payrollLimitRub: 101,
  }), /must not exceed/);
  assert.throws(() => parseBudgetPayload({
    budgetMode: 'manual', projectBudgetLimitRub: 100,
    payrollLimitMode: 'percent', payrollLimitPercent: 50,
    payrollWarningThresholdPercent: 100,
  }), /less than 100/);
});

test('calculates payroll remaining, usage and excess', () => {
  const budget = { payroll_limit_kopecks: 10000 };
  assert.deepEqual(calculateLaborSummary(12500, 2, budget), {
    totalLaborCostRub: 125,
    payrollRemainingRub: 0,
    payrollUsedPercent: 125,
    payrollExceededRub: 25,
    missingRateEntriesCount: 2,
    isComplete: false,
  });
});

test('builds a cumulative labor cost series from daily kopeck totals', () => {
  assert.deepEqual(buildLaborCostSeries([
    { entry_date: '2026-07-01', daily_labor_cost_kopecks: 120050, missing_rate_entries_count: 2 },
    { entry_date: '2026-07-03', daily_labor_cost_kopecks: 79950, missing_rate_entries_count: 0 },
  ]), [
    { date: '2026-07-01', dailyLaborCostRub: 1200.5, cumulativeLaborCostRub: 1200.5, missingRateEntriesCount: 2 },
    { date: '2026-07-03', dailyLaborCostRub: 799.5, cumulativeLaborCostRub: 2000, missingRateEntriesCount: 0 },
  ]);
});

test('maps budget history provenance and falls back to the legacy note', () => {
  const common = {
    id: 7,
    version_number: 3,
    budget_mode: 'manual',
    project_budget_limit_kopecks: 100000,
    payroll_limit_mode: 'percent',
    payroll_limit_bps: 5000,
    payroll_limit_kopecks: 50000,
    payroll_warning_threshold_bps: 8000,
  };
  assert.deepEqual(
    {
      changeReason: mapBudgetRow({ ...common, note: 'Legacy reason' }).changeReason,
      sourceType: mapBudgetRow(common).sourceType,
      sourceRequestId: mapBudgetRow({ ...common, source_request_id: 12 }).sourceRequestId,
    },
    {
      changeReason: 'Legacy reason',
      sourceType: 'admin_direct',
      sourceRequestId: 12,
    }
  );
});

test('maps a no-limit budget as a numbered version without financial limits', () => {
  const mapped = mapBudgetRow({
    id: 9,
    version_number: 17,
    budget_mode: 'none',
    change_reason: 'Limit removed',
    source_type: 'admin_direct',
  });
  assert.equal(mapped.version, 17);
  assert.equal(mapped.budgetMode, 'none');
  assert.equal(mapped.projectBudgetLimitRub, null);
  assert.equal(mapped.payrollLimitRub, null);
  assert.equal(mapped.payrollWarningThresholdPercent, null);
  assert.equal(mapped.changeReason, 'Limit removed');
});

test('classifies every dashboard financial risk in priority order', () => {
  assert.equal(getProjectFinancialRisk({}).riskStatus, 'not_configured');
  assert.equal(getProjectFinancialRisk({ budget: { budgetMode: 'none' } }).riskStatus, 'no_limit');
  assert.equal(getProjectFinancialRisk({
    budget: { budgetMode: 'manual', payrollWarningThresholdPercent: 80 },
    summary: { payrollUsedPercent: 110, payrollExceededRub: 10 },
  }).riskStatus, 'exceeded');
  assert.equal(getProjectFinancialRisk({
    budget: { budgetMode: 'manual', payrollWarningThresholdPercent: 80 },
    summary: { payrollUsedPercent: 100 },
  }).riskStatus, 'limit_reached');
  assert.equal(getProjectFinancialRisk({
    budget: { budgetMode: 'manual', payrollWarningThresholdPercent: 80 },
    summary: { payrollUsedPercent: 80 },
  }).riskStatus, 'warning');
  assert.equal(getProjectFinancialRisk({
    budget: { budgetMode: 'manual', payrollWarningThresholdPercent: 80 },
    summary: { payrollUsedPercent: 20, missingRateEntriesCount: 1 },
  }).riskStatus, 'incomplete');
  assert.equal(getProjectFinancialRisk({
    budget: { budgetMode: 'manual', payrollWarningThresholdPercent: 80 },
    summary: { payrollUsedPercent: 20 },
  }).riskStatus, 'normal');
});

test('keeps the primary financial risk and exposes incomplete calculations separately', () => {
  const result = getProjectFinancialRisk({
    budget: { budgetMode: 'manual', payrollWarningThresholdPercent: 80 },
    summary: { payrollUsedPercent: 120, payrollExceededRub: 200, missingRateEntriesCount: 3 },
  });
  assert.deepEqual(result, { riskStatus: 'exceeded', isComplete: false, missingRateEntriesCount: 3 });
});

test('treats a configured zero payroll limit as reached when cost is zero', () => {
  const result = getProjectFinancialRisk({
    budget: { budgetMode: 'manual', payrollLimitRub: 0, payrollWarningThresholdPercent: 80 },
    summary: { payrollUsedPercent: 100, payrollExceededRub: 0 },
  });
  assert.equal(result.riskStatus, 'limit_reached');
});

test('exposes only the dashboard-safe payroll usage fields', () => {
  assert.deepEqual(getProjectPayrollUsage({
    budget: { budgetMode: 'manual', payrollWarningThresholdPercent: 75 },
    summary: { payrollUsedPercent: 81.25, isComplete: false },
  }), {
    usedPercent: 81.25,
    warningThresholdPercent: 75,
    hasPayrollLimit: true,
    isComplete: false,
  });
  assert.deepEqual(getProjectPayrollUsage({
    budget: { budgetMode: 'none' },
    summary: { payrollUsedPercent: 0, isComplete: true },
  }), {
    usedPercent: null,
    warningThresholdPercent: null,
    hasPayrollLimit: false,
    isComplete: true,
  });
});
