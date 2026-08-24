'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTeamWeeklyOverview, getIsoWeeks } = require('../teamWeeklyOverview');

test('builds complete ISO years including 52 and 53 week boundaries', () => {
  const weeks2025 = getIsoWeeks(2025);
  const weeks2026 = getIsoWeeks(2026);
  assert.equal(weeks2025.length, 52);
  assert.equal(weeks2026.length, 53);
  assert.deepEqual(weeks2026[0], {
    number: 1,
    startDate: '2025-12-29',
    endDate: '2026-01-04',
    month: 1,
  });
  assert.equal(weeks2026.at(-1).startDate, '2026-12-28');
});

test('classifies weekly hours and keeps current, future, and pre-employment weeks neutral', () => {
  const result = buildTeamWeeklyOverview({
    year: 2026,
    todayKey: '2026-01-14',
    users: [
      { id: 1, name: 'Анна', surname: 'Алексеева', created_at: '2025-01-01' },
      { id: 2, name: 'Борис', surname: 'Белов', created_at: '2026-01-07' },
    ],
    rows: [
      { user_id: 1, date: '2025-12-29', hours: 20 },
      { user_id: 1, date: '2026-01-02', hours: 20 },
      { user_id: 1, date: '2026-01-05', hours: 39.9 },
      { user_id: 1, date: '2026-01-12', hours: 8 },
      { user_id: 2, date: '2026-01-12', hours: 45 },
    ],
  });

  const anna = result.users.find((user) => user.id === 1);
  const boris = result.users.find((user) => user.id === 2);
  assert.deepEqual(anna.weeks.slice(0, 4).map((week) => [week.hours, week.status, week.dominantCategory, week.categoryHours, week.projectHours]), [
    [40, 'complete', 'unclassified', [{ category: 'unclassified', hours: 40 }], [{ id: null, name: null, code: null, category: 'unclassified', hours: 40 }]],
    [39.9, 'missing', null, [{ category: 'unclassified', hours: 39.9 }], [{ id: null, name: null, code: null, category: 'unclassified', hours: 39.9 }]],
    [8, 'in_progress', null, [{ category: 'unclassified', hours: 8 }], [{ id: null, name: null, code: null, category: 'unclassified', hours: 8 }]],
    [0, 'future', null, [], []],
  ]);
  assert.equal(boris.weeks[0].status, 'not_applicable');
  assert.equal(boris.weeks[1].status, 'not_applicable');
  assert.equal(boris.weeks[2].status, 'in_progress');
});

test('treats every incomplete completed week as missing for sorting and summary', () => {
  const result = buildTeamWeeklyOverview({
    year: 2026,
    todayKey: '2026-01-12',
    users: [
      { id: 1, name: 'Полный', created_at: '2025-01-01' },
      { id: 2, name: 'Пропуск', created_at: '2025-01-01' },
    ],
    rows: [
      { user_id: 1, date: '2025-12-29', hours: 40 },
      { user_id: 1, date: '2026-01-05', hours: 40 },
      { user_id: 2, date: '2025-12-29', hours: 10 },
    ],
  });

  assert.equal(result.users[0].id, 2);
  assert.deepEqual(result.users[0].counts, { complete: 0, partial: 0, missing: 2 });
  assert.deepEqual(result.summary, {
    userCount: 2,
    attentionCount: 1,
    missingWeekCount: 2,
    partialWeekCount: 0,
  });
});

test('returns the dominant category only for completed weeks and resolves ties by category order', () => {
  const result = buildTeamWeeklyOverview({
    year: 2026,
    todayKey: '2026-01-12',
    categoryOrder: ['operations', 'external_delivery', 'time_off', 'unclassified'],
    users: [{ id: 1, name: 'Анна', created_at: '2025-01-01' }, { id: 2, name: 'Борис', created_at: '2025-01-01' }],
    rows: [
      { user_id: 1, date: '2025-12-29', hours: 24, category: 'operations', project_id: 11, project_code: 'OP-1', project_name: 'Операционный проект' },
      { user_id: 1, date: '2025-12-30', hours: 16, category: 'external_delivery', project_id: 12, project_code: 'EXT-1', project_name: 'Внешний проект' },
      { user_id: 1, date: '2026-01-05', hours: 20, category: 'external_delivery', project_id: 12, project_code: 'EXT-1', project_name: 'Внешний проект' },
      { user_id: 1, date: '2026-01-06', hours: 20, category: 'operations', project_id: 11, project_code: 'OP-1', project_name: 'Операционный проект' },
      { user_id: 2, date: '2025-12-29', hours: 40, category: 'time_off', project_id: 13, project_code: 'OFF-1', project_name: 'Отсутствие' },
    ],
  });
  const anna = result.users.find((user) => user.id === 1);
  const [dominant, tie, current] = anna.weeks;
  assert.deepEqual(dominant, { weekStart: '2025-12-29', hours: 40, status: 'complete', categoryHours: [{ category: 'operations', hours: 24 }, { category: 'external_delivery', hours: 16 }], projectHours: [{ id: 11, name: 'Операционный проект', code: 'OP-1', category: 'operations', hours: 24 }, { id: 12, name: 'Внешний проект', code: 'EXT-1', category: 'external_delivery', hours: 16 }], dominantCategory: 'operations' });
  assert.deepEqual(tie, { weekStart: '2026-01-05', hours: 40, status: 'complete', categoryHours: [{ category: 'operations', hours: 20 }, { category: 'external_delivery', hours: 20 }], projectHours: [{ id: 11, name: 'Операционный проект', code: 'OP-1', category: 'operations', hours: 20 }, { id: 12, name: 'Внешний проект', code: 'EXT-1', category: 'external_delivery', hours: 20 }], dominantCategory: 'operations' });
  assert.deepEqual(current, { weekStart: '2026-01-12', hours: 0, status: 'in_progress', categoryHours: [], projectHours: [], dominantCategory: null });
  assert.equal(result.users.find((user) => user.id === 2).weeks[0].dominantCategory, 'time_off');
});

test('omits week details from the team grid payload while retaining safe completion data', () => {
  const result = buildTeamWeeklyOverview({
    year: 2026,
    todayKey: '2026-01-12',
    includeDetails: false,
    users: [{ id: 1, name: 'Анна', created_at: '2025-01-01' }],
    rows: [{ user_id: 1, date: '2025-12-29', hours: 40, category: 'external_delivery', project_id: 10, project_name: 'Скрытый проект' }],
  });
  const week = result.users[0].weeks[0];
  assert.deepEqual(week, { weekStart: '2025-12-29', hours: 40, status: 'complete', dominantCategory: 'external_delivery' });
  assert.equal('projectHours' in week, false);
  assert.equal('categoryHours' in week, false);
});
