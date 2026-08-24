'use strict';

function buildContractComparisonProjects(rows = []) {
  return rows
    .map((row) => ({
      projectId: Number(row.project_id),
      name: row.name || '',
      code: row.code || '',
      contractAmountExVatRub: Number((Number(row.contract_amount_kopecks || 0) / 100).toFixed(2)),
      lifetimeHours: Number(Number(row.lifetime_hours || 0).toFixed(2)),
    }))
    .sort((left, right) => right.contractAmountExVatRub - left.contractAmountExVatRub || left.name.localeCompare(right.name, 'ru'));
}

module.exports = { buildContractComparisonProjects };
