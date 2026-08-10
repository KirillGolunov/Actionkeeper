'use strict';

const pad = (value) => String(value).padStart(2, '0');

function parseDateKey(value) {
  const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateKey(value) {
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}

function addUtcDays(value, amount) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function startOfBucket(value, bucket) {
  const date = parseDateKey(value);
  if (!date) return null;
  if (bucket === 'day') return date;
  if (bucket === 'year') return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  if (bucket === 'quarter') return new Date(Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 1));
  if (bucket === 'month') return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  return addUtcDays(date, -mondayOffset);
}

function endOfBucket(value, bucket) {
  if (bucket === 'day') return value;
  if (bucket === 'year') return new Date(Date.UTC(value.getUTCFullYear(), 11, 31));
  if (bucket === 'quarter') return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 3, 0));
  if (bucket === 'month') {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0));
  }
  return addUtcDays(value, 6);
}

function nextBucket(value, bucket) {
  if (bucket === 'day') return addUtcDays(value, 1);
  if (bucket === 'year') return new Date(Date.UTC(value.getUTCFullYear() + 1, 0, 1));
  if (bucket === 'quarter') return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 3, 1));
  if (bucket === 'month') return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 1));
  return addUtcDays(value, 7);
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function buildDashboardTimeSeries({ rows = [], startDate, endDate, bucket = 'week', categoryKeys = [], todayKey = getTodayKey() }) {
  const normalizedBucket = ['day', 'week', 'month', 'quarter', 'year'].includes(bucket) ? bucket : 'week';
  const firstBucket = startOfBucket(startDate, normalizedBucket);
  const requestedEnd = parseDateKey(endDate);
  if (!firstBucket || !requestedEnd) return { bucket: normalizedBucket, periods: [] };

  const grouped = new Map();
  for (const row of rows) {
    const date = String(row.date || '').slice(0, 10);
    if (!date || date < startDate || date > endDate) continue;
    const periodStart = startOfBucket(date, normalizedBucket);
    if (!periodStart) continue;
    const key = toDateKey(periodStart);
    const category = row.category || 'unclassified';
    if (!grouped.has(key)) grouped.set(key, new Map());
    const categories = grouped.get(key);
    categories.set(category, Number((Number(categories.get(category) || 0) + Number(row.hours || 0)).toFixed(2)));
  }

  const keys = [...new Set([...categoryKeys, ...rows.map((row) => row.category || 'unclassified')])];
  const periods = [];
  for (let cursor = firstBucket; cursor <= requestedEnd; cursor = nextBucket(cursor, normalizedBucket)) {
    const periodStart = toDateKey(cursor);
    const naturalEnd = endOfBucket(cursor, normalizedBucket);
    const periodEnd = toDateKey(naturalEnd);
    const values = grouped.get(periodStart) || new Map();
    const totalHours = Number([...values.values()].reduce((sum, hours) => sum + Number(hours || 0), 0).toFixed(2));
    const categories = keys.map((key) => {
      const hours = Number(values.get(key) || 0);
      return {
        key,
        hours,
        percent: totalHours > 0 ? Number(((hours / totalHours) * 100).toFixed(2)) : 0,
      };
    });
    periods.push({
      startDate: periodStart,
      endDate: periodEnd,
      totalHours,
      isPartial: periodStart < startDate || periodEnd > endDate || periodEnd > todayKey,
      categories,
    });
  }

  return { bucket: normalizedBucket, periods };
}

module.exports = { buildDashboardTimeSeries, startOfBucket, toDateKey };
