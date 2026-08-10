'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDashboardTimeSeries } = require('../dashboardAnalytics');

test('builds Monday-Sunday buckets and fills missing weeks', () => {
  const result = buildDashboardTimeSeries({
    startDate: '2026-07-20',
    endDate: '2026-08-09',
    todayKey: '2026-08-09',
    categoryKeys: ['external_delivery', 'operations'],
    rows: [
      { date: '2026-07-20', hours: 8, category: 'operations' },
      { date: '2026-08-03', hours: 6, category: 'external_delivery' },
      { date: '2026-08-04', hours: 2, category: 'operations' },
    ],
  });

  assert.equal(result.bucket, 'week');
  assert.equal(result.periods.length, 3);
  assert.deepEqual(result.periods.map((period) => period.startDate), ['2026-07-20', '2026-07-27', '2026-08-03']);
  assert.equal(result.periods[1].totalHours, 0);
  assert.equal(result.periods[2].totalHours, 8);
  assert.deepEqual(result.periods[2].categories, [
    { key: 'external_delivery', hours: 6, percent: 75 },
    { key: 'operations', hours: 2, percent: 25 },
  ]);
});

test('groups months and marks a future-ended bucket as partial', () => {
  const result = buildDashboardTimeSeries({
    startDate: '2026-07-01',
    endDate: '2026-08-31',
    bucket: 'month',
    todayKey: '2026-08-09',
    categoryKeys: ['internal_project'],
    rows: [{ date: '2026-08-05', hours: 10, category: 'internal_project' }],
  });

  assert.equal(result.periods.length, 2);
  assert.equal(result.periods[0].totalHours, 0);
  assert.equal(result.periods[1].totalHours, 10);
  assert.equal(result.periods[1].isPartial, true);
});

test('supports daily buckets for a selected week', () => {
  const result = buildDashboardTimeSeries({
    startDate: '2026-08-03',
    endDate: '2026-08-09',
    bucket: 'day',
    todayKey: '2026-08-09',
    categoryKeys: ['operations'],
    rows: [{ date: '2026-08-05', hours: 8, category: 'operations' }],
  });

  assert.equal(result.bucket, 'day');
  assert.equal(result.periods.length, 7);
  assert.equal(result.periods[2].totalHours, 8);
  assert.equal(result.periods[2].startDate, '2026-08-05');
  assert.equal(result.periods[2].endDate, '2026-08-05');
});

test('supports yearly buckets for an all-time range', () => {
  const result = buildDashboardTimeSeries({
    startDate: '2024-03-10',
    endDate: '2026-08-09',
    bucket: 'year',
    todayKey: '2026-08-09',
    categoryKeys: ['external_delivery'],
    rows: [
      { date: '2024-03-10', hours: 4, category: 'external_delivery' },
      { date: '2026-08-03', hours: 8, category: 'external_delivery' },
    ],
  });

  assert.equal(result.bucket, 'year');
  assert.deepEqual(result.periods.map((period) => period.startDate), ['2024-01-01', '2025-01-01', '2026-01-01']);
  assert.equal(result.periods[1].totalHours, 0);
  assert.equal(result.periods[2].isPartial, true);
});

test('groups an all-time range into calendar quarters', () => {
  const result = buildDashboardTimeSeries({
    startDate: '2025-04-12',
    endDate: '2026-08-09',
    bucket: 'quarter',
    todayKey: '2026-08-09',
    categoryKeys: ['operations'],
    rows: [
      { date: '2025-04-12', hours: 12, category: 'operations' },
      { date: '2026-07-03', hours: 8, category: 'operations' },
    ],
  });

  assert.equal(result.bucket, 'quarter');
  assert.deepEqual(result.periods.map((period) => period.startDate), [
    '2025-04-01', '2025-07-01', '2025-10-01', '2026-01-01', '2026-04-01', '2026-07-01',
  ]);
  assert.equal(result.periods[2].totalHours, 0);
  assert.equal(result.periods[5].isPartial, true);
});
