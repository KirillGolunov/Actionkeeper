'use strict';

const BPS_SCALE = 10000;

function decimalToScaledInteger(value, scale, label) {
  if (value === null || value === undefined || value === '') {
    throw new Error(`${label} is required.`);
  }
  const normalized = String(value).trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error(`${label} must be a non-negative number with at most two decimal places.`);
  }
  const [whole, fraction = ''] = normalized.split('.');
  const fractionScale = String(scale).length - 1;
  return Number(whole) * scale + Number(fraction.padEnd(fractionScale, '0'));
}

function rublesToKopecks(value, label = 'Amount') {
  return decimalToScaledInteger(value, 100, label);
}

function percentToBps(value, label = 'Percent') {
  const bps = decimalToScaledInteger(value, 100, label);
  if (bps > BPS_SCALE) throw new Error(`${label} must not exceed 100%.`);
  return bps;
}

function kopecksToRubles(value) {
  return value === null || value === undefined ? null : Number((Number(value) / 100).toFixed(2));
}

function bpsToPercent(value) {
  return value === null || value === undefined ? null : Number((Number(value) / 100).toFixed(2));
}

function parseBudgetPayload(body = {}) {
  const budgetMode = body.budgetMode;
  if (!['none', 'contract', 'manual'].includes(budgetMode)) {
    throw new Error('Budget mode must be none, contract, or manual.');
  }
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : '';
  if (budgetMode === 'none') return { budget_mode: 'none', note };

  let contractAmountKopecks = null;
  let reserveBps = null;
  let reserveKopecks = null;
  let projectBudgetKopecks;

  if (budgetMode === 'contract') {
    contractAmountKopecks = rublesToKopecks(body.contractAmountExVatRub, 'Contract amount');
    reserveBps = percentToBps(body.managementReservePercent, 'Management reserve');
    reserveKopecks = Math.round(contractAmountKopecks * reserveBps / BPS_SCALE);
    projectBudgetKopecks = contractAmountKopecks - reserveKopecks;
  } else {
    projectBudgetKopecks = rublesToKopecks(body.projectBudgetLimitRub, 'Project budget limit');
  }

  const payrollMode = body.payrollLimitMode;
  if (!['fixed_amount', 'percent'].includes(payrollMode)) {
    throw new Error('Payroll limit mode must be fixed_amount or percent.');
  }

  let payrollBps;
  let payrollKopecks;
  if (payrollMode === 'percent') {
    payrollBps = percentToBps(body.payrollLimitPercent, 'Payroll limit percent');
    payrollKopecks = Math.round(projectBudgetKopecks * payrollBps / BPS_SCALE);
  } else {
    payrollKopecks = rublesToKopecks(body.payrollLimitRub, 'Payroll limit');
    if (payrollKopecks > projectBudgetKopecks) {
      throw new Error('Payroll limit must not exceed the project budget limit.');
    }
    payrollBps = projectBudgetKopecks === 0 ? 0 : Math.round(payrollKopecks * BPS_SCALE / projectBudgetKopecks);
  }

  const warningBps = body.payrollWarningThresholdPercent === undefined
    ? 8000
    : percentToBps(body.payrollWarningThresholdPercent, 'Payroll warning threshold');
  if (warningBps <= 0 || warningBps >= BPS_SCALE) {
    throw new Error('Payroll warning threshold must be greater than 0% and less than 100%.');
  }

  return {
    budget_mode: budgetMode,
    contract_amount_kopecks: contractAmountKopecks,
    management_reserve_bps: reserveBps,
    management_reserve_kopecks: reserveKopecks,
    project_budget_limit_kopecks: projectBudgetKopecks,
    payroll_limit_mode: payrollMode,
    payroll_limit_bps: payrollBps,
    payroll_limit_kopecks: payrollKopecks,
    payroll_warning_threshold_bps: warningBps,
    note,
  };
}

function mapBudgetRow(row) {
  if (!row || !row.id) return null;
  const noLimit = row.budget_mode === 'none';
  return {
    id: row.id,
    version: row.version_number,
    budgetMode: row.budget_mode,
    contractAmountExVatRub: noLimit ? null : kopecksToRubles(row.contract_amount_kopecks),
    managementReservePercent: noLimit ? null : bpsToPercent(row.management_reserve_bps),
    managementReserveRub: noLimit ? null : kopecksToRubles(row.management_reserve_kopecks),
    projectBudgetLimitRub: noLimit ? null : kopecksToRubles(row.project_budget_limit_kopecks),
    payrollLimitMode: noLimit ? null : row.payroll_limit_mode,
    payrollLimitPercent: noLimit ? null : bpsToPercent(row.payroll_limit_bps),
    payrollLimitRub: noLimit ? null : kopecksToRubles(row.payroll_limit_kopecks),
    nonPayrollBudgetRub: noLimit ? null : kopecksToRubles(row.project_budget_limit_kopecks - row.payroll_limit_kopecks),
    payrollWarningThresholdPercent: noLimit ? null : bpsToPercent(row.payroll_warning_threshold_bps),
    note: row.note || '',
    changeReason: row.change_reason || row.note || '',
    sourceType: row.source_type || 'admin_direct',
    sourceRequestId: row.source_request_id || null,
    createdBy: row.created_by || null,
    approvedAt: row.approved_at || null,
  };
}

function calculateLaborSummary(totalLaborCostKopecks, missingRateEntriesCount, budgetRow) {
  const total = Number(totalLaborCostKopecks || 0);
  if (!budgetRow) {
    return {
      totalLaborCostRub: kopecksToRubles(total),
      payrollRemainingRub: null,
      payrollUsedPercent: null,
      payrollExceededRub: null,
      missingRateEntriesCount: Number(missingRateEntriesCount || 0),
      isComplete: Number(missingRateEntriesCount || 0) === 0,
    };
  }
  const limit = Number(budgetRow.payroll_limit_kopecks || 0);
  return {
    totalLaborCostRub: kopecksToRubles(total),
    payrollRemainingRub: kopecksToRubles(Math.max(limit - total, 0)),
    payrollUsedPercent: limit === 0 ? (total > 0 ? 100 : 0) : Number((total * 100 / limit).toFixed(2)),
    payrollExceededRub: kopecksToRubles(Math.max(total - limit, 0)),
    missingRateEntriesCount: Number(missingRateEntriesCount || 0),
    isComplete: Number(missingRateEntriesCount || 0) === 0,
  };
}

function buildLaborCostSeries(rows = []) {
  let cumulativeKopecks = 0;
  return rows.map((row) => {
    const dailyKopecks = Number(row.daily_labor_cost_kopecks || 0);
    cumulativeKopecks += dailyKopecks;
    return {
      date: row.entry_date,
      dailyLaborCostRub: kopecksToRubles(dailyKopecks),
      cumulativeLaborCostRub: kopecksToRubles(cumulativeKopecks),
      missingRateEntriesCount: Number(row.missing_rate_entries_count || 0),
    };
  });
}

module.exports = {
  BPS_SCALE,
  rublesToKopecks,
  percentToBps,
  kopecksToRubles,
  bpsToPercent,
  parseBudgetPayload,
  mapBudgetRow,
  calculateLaborSummary,
  buildLaborCostSeries,
};
