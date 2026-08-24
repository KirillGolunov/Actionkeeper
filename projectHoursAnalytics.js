'use strict';

function buildProjectHoursAnalyticsResponse({
  project,
  range,
  summaryRow,
  projectActivityRow,
  membersRows,
  dailyRows,
  baseline = { totalHours: 0, byUser: {} },
}) {
  const dailyMap = new Map();
  (dailyRows || []).forEach((row) => {
    if (!dailyMap.has(row.entry_date)) {
      dailyMap.set(row.entry_date, {
        date: row.entry_date,
        totalHours: 0,
        users: [],
      });
    }
    const point = dailyMap.get(row.entry_date);
    const hours = Number(row.total_hours) || 0;
    point.totalHours += hours;
    point.users.push({ userId: row.user_id, hours });
  });

  const daily = Array.from(dailyMap.values());
  const totalHours = Number(summaryRow?.total_hours) || 0;
  const activeDays = daily.length;
  return {
    project: {
      id: project.id,
      name: project.name,
      code: project.code,
      clientName: project.client_name,
    },
    range,
    summary: {
      participantsCount: Number(summaryRow?.participants_count) || 0,
      totalHours,
      averagePerDay: activeDays > 0 ? totalHours / activeDays : 0,
      firstEntryDate: summaryRow?.first_entry_date || null,
      lastEntryDate: projectActivityRow?.last_entry_date || null,
    },
    members: (membersRows || []).map((row) => ({
      userId: row.user_id,
      userName: row.user_name || 'Unknown User',
      totalHours: Number(row.total_hours) || 0,
    })),
    cumulativeBaseline: baseline,
    daily,
  };
}

module.exports = { buildProjectHoursAnalyticsResponse };
