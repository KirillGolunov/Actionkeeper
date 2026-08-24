'use strict';

const WEEKLY_TARGET_HOURS = 40;
const DEFAULT_CATEGORY_ORDER = [
  'unclassified',
  'external_delivery',
  'internal_project',
  'operations',
  'people_development',
  'time_off',
];

const pad = (value) => String(value).padStart(2, '0');

function parseDateKey(value) {
  const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateKey(value) {
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}

function addDays(value, amount) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function startOfIsoWeek(value) {
  const date = value instanceof Date ? new Date(value) : parseDateKey(value);
  if (!date) return null;
  const offset = (date.getUTCDay() + 6) % 7;
  return addDays(date, -offset);
}

function getIsoWeekYear(value) {
  const monday = startOfIsoWeek(value);
  return addDays(monday, 3).getUTCFullYear();
}

function getIsoWeeks(year) {
  const firstMonday = startOfIsoWeek(new Date(Date.UTC(year, 0, 4)));
  const weeks = [];
  for (let cursor = firstMonday; getIsoWeekYear(cursor) === year; cursor = addDays(cursor, 7)) {
    const startDate = toDateKey(cursor);
    const endDate = toDateKey(addDays(cursor, 6));
    weeks.push({
      number: weeks.length + 1,
      startDate,
      endDate,
      month: addDays(cursor, 3).getUTCMonth() + 1,
    });
  }
  return weeks;
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function getDominantCategory(categoryHours, categoryOrder = DEFAULT_CATEGORY_ORDER) {
  if (!categoryHours?.size) return null;
  const rank = new Map(categoryOrder.map((category, index) => [category, index]));
  return [...categoryHours.entries()].sort((left, right) => (
    right[1] - left[1]
    || (rank.get(left[0]) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right[0]) ?? Number.MAX_SAFE_INTEGER)
    || left[0].localeCompare(right[0])
  ))[0][0];
}

function getCategoryHours(categoryHours, categoryOrder = DEFAULT_CATEGORY_ORDER) {
  if (!categoryHours?.size) return [];
  const rank = new Map(categoryOrder.map((category, index) => [category, index]));
  return [...categoryHours.entries()]
    .filter(([, hours]) => Number(hours) > 0)
    .sort((left, right) => (
      right[1] - left[1]
      || (rank.get(left[0]) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right[0]) ?? Number.MAX_SAFE_INTEGER)
      || left[0].localeCompare(right[0])
    ))
    .map(([category, hours]) => ({ category, hours }));
}

function getProjectHours(projectHours, categoryOrder = DEFAULT_CATEGORY_ORDER) {
  if (!projectHours?.size) return [];
  const rank = new Map(categoryOrder.map((category, index) => [category, index]));
  return [...projectHours.values()]
    .filter((project) => Number(project.hours) > 0)
    .sort((left, right) => (
      (rank.get(left.category) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right.category) ?? Number.MAX_SAFE_INTEGER)
      || right.hours - left.hours
      || String(left.code || left.name || '').localeCompare(String(right.code || right.name || ''), 'ru')
    ));
}

function buildTeamWeeklyOverview({ year, users = [], rows = [], todayKey = getTodayKey(), targetHours = WEEKLY_TARGET_HOURS, categoryOrder = DEFAULT_CATEGORY_ORDER, includeDetails = true }) {
  const weeks = getIsoWeeks(year);
  const currentWeekStart = toDateKey(startOfIsoWeek(todayKey));
  const hoursByUserWeek = new Map();
  const categoryHoursByUserWeek = new Map();
  const projectHoursByUserWeek = new Map();

  for (const row of rows) {
    const date = String(row.date || '').slice(0, 10);
    const weekStart = startOfIsoWeek(date);
    if (!weekStart || getIsoWeekYear(weekStart) !== year) continue;
    const key = `${row.userId ?? row.user_id}|${toDateKey(weekStart)}`;
    hoursByUserWeek.set(key, Number((Number(hoursByUserWeek.get(key) || 0) + Number(row.hours || 0)).toFixed(2)));
    const category = String(row.category || 'unclassified');
    const categoryHours = categoryHoursByUserWeek.get(key) || new Map();
    categoryHours.set(category, Number((Number(categoryHours.get(category) || 0) + Number(row.hours || 0)).toFixed(2)));
    categoryHoursByUserWeek.set(key, categoryHours);
    const projectId = row.projectId ?? row.project_id ?? null;
    const projectKey = `${category}|${projectId ?? 'none'}`;
    const projectHours = projectHoursByUserWeek.get(key) || new Map();
    const project = projectHours.get(projectKey) || {
      id: projectId === null ? null : Number(projectId),
      name: row.projectName ?? row.project_name ?? null,
      code: row.projectCode ?? row.project_code ?? null,
      category,
      hours: 0,
    };
    project.hours = Number((Number(project.hours) + Number(row.hours || 0)).toFixed(2));
    projectHours.set(projectKey, project);
    projectHoursByUserWeek.set(key, projectHours);
  }

  const overviewUsers = users.map((user) => {
    const userId = Number(user.id);
    const createdDate = String(user.createdAt || user.created_at || '').slice(0, 10);
    const weekly = weeks.map((week) => {
      const hours = Number(hoursByUserWeek.get(`${userId}|${week.startDate}`) || 0);
      let status;
      if (createdDate && week.startDate < createdDate && hours === 0) status = 'not_applicable';
      else if (week.startDate > currentWeekStart) status = 'future';
      else if (week.startDate === currentWeekStart) status = 'in_progress';
      else if (hours >= targetHours) status = 'complete';
      else status = 'missing';
      const item = {
        weekStart: week.startDate,
        hours,
        status,
        dominantCategory: status === 'complete' ? getDominantCategory(categoryHoursByUserWeek.get(`${userId}|${week.startDate}`), categoryOrder) : null,
      };
      if (includeDetails) {
        item.categoryHours = getCategoryHours(categoryHoursByUserWeek.get(`${userId}|${week.startDate}`), categoryOrder);
        item.projectHours = getProjectHours(projectHoursByUserWeek.get(`${userId}|${week.startDate}`), categoryOrder);
      }
      return item;
    });
    const counts = weekly.reduce((result, item) => {
      if (item.status === 'complete') result.complete += 1;
      if (item.status === 'missing') result.missing += 1;
      return result;
    }, { complete: 0, partial: 0, missing: 0 });
    const label = [user.surname, user.name].filter(Boolean).join(' ').trim() || `#${userId}`;
    return {
      id: userId,
      label,
      createdAt: createdDate || null,
      counts,
      weeks: weekly,
    };
  }).sort((left, right) => (
    right.counts.missing - left.counts.missing
    || right.counts.partial - left.counts.partial
    || left.label.localeCompare(right.label, 'ru')
  ));

  return {
    year,
    weeklyTargetHours: targetHours,
    weeks,
    users: overviewUsers,
    summary: {
      userCount: overviewUsers.length,
      attentionCount: overviewUsers.filter((user) => user.counts.missing > 0 || user.counts.partial > 0).length,
      missingWeekCount: overviewUsers.reduce((sum, user) => sum + user.counts.missing, 0),
      partialWeekCount: overviewUsers.reduce((sum, user) => sum + user.counts.partial, 0),
    },
  };
}

module.exports = {
  DEFAULT_CATEGORY_ORDER,
  WEEKLY_TARGET_HOURS,
  buildTeamWeeklyOverview,
  getCategoryHours,
  getDominantCategory,
  getProjectHours,
  getIsoWeeks,
  startOfIsoWeek,
  toDateKey,
};
