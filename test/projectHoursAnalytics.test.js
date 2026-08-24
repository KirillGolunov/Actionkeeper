'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildProjectHoursAnalyticsResponse } = require('../projectHoursAnalytics');

test('returns named participant series and baseline for a regular project viewer without financial data', () => {
  const response = buildProjectHoursAnalyticsResponse({
    project: { id: 7, name: 'Alpha', code: 'A-7', client_name: 'Client' },
    range: 'month',
    summaryRow: { participants_count: 2, total_hours: 16, first_entry_date: '2026-08-03' },
    projectActivityRow: { last_entry_date: '2026-08-10' },
    membersRows: [
      { user_id: 1, user_name: 'Иван Иванов', total_hours: 10 },
      { user_id: 2, user_name: 'Анна Петрова', total_hours: 6 },
    ],
    dailyRows: [
      { entry_date: '2026-08-03', user_id: 1, total_hours: 8 },
      { entry_date: '2026-08-03', user_id: 2, total_hours: 2 },
      { entry_date: '2026-08-04', user_id: 2, total_hours: 4 },
    ],
    baseline: { totalHours: 24, byUser: { 1: 16, 2: 8 } },
  });

  assert.deepEqual(response.members, [
    { userId: 1, userName: 'Иван Иванов', totalHours: 10 },
    { userId: 2, userName: 'Анна Петрова', totalHours: 6 },
  ]);
  assert.deepEqual(response.daily, [
    { date: '2026-08-03', totalHours: 10, users: [{ userId: 1, hours: 8 }, { userId: 2, hours: 2 }] },
    { date: '2026-08-04', totalHours: 4, users: [{ userId: 2, hours: 4 }] },
  ]);
  assert.deepEqual(response.cumulativeBaseline, { totalHours: 24, byUser: { 1: 16, 2: 8 } });
  assert.equal('payrollUsage' in response, false);
  assert.equal('laborCost' in response, false);
  assert.equal('contractAmount' in response, false);
});
