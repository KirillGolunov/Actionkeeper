function pad(value) {
  return String(value).padStart(2, '0');
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function getMonday(date = new Date()) {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = value.getDate() - day + (day === 0 ? -6 : 1);
  value.setDate(diff);
  return value;
}

function getWeekBounds(referenceDate = new Date()) {
  const weekStart = getMonday(referenceDate);
  const weekEnd = endOfDay(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 4));
  return { weekStart, weekEnd };
}

function endOfWeekSession(referenceDate = new Date()) {
  const { weekEnd } = getWeekBounds(referenceDate);
  return weekEnd;
}

function endOfNextWeekSession(referenceDate = new Date()) {
  const { weekStart } = getWeekBounds(referenceDate);
  return endOfDay(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 11));
}

function getWorkDays(referenceDate = new Date()) {
  const { weekStart } = getWeekBounds(referenceDate);
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  return labels.map((label, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return { label, date, dateKey: formatDateKey(date) };
  });
}

function getWeekProgress(db, userId, referenceDate = new Date()) {
  const workDays = getWorkDays(referenceDate);
  const weekStart = workDays[0].dateKey;
  const weekEnd = workDays[4].dateKey;
  const todayKey = formatDateKey(new Date());

  return new Promise((resolve, reject) => {
    db.all(
      `SELECT substr(date, 1, 10) as entry_date, SUM(hours) as total_hours
       FROM time_entries
       WHERE user_id = ? AND substr(date, 1, 10) >= ? AND substr(date, 1, 10) <= ?
       GROUP BY substr(date, 1, 10)`,
      [userId, weekStart, weekEnd],
      (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        const totalsByDate = rows.reduce((acc, row) => {
          acc[row.entry_date] = Number(row.total_hours) || 0;
          return acc;
        }, {});

        const days = workDays.map((day) => {
          const hours = totalsByDate[day.dateKey] || 0;
          return {
            label: day.label,
            date: day.dateKey,
            hours,
            complete: hours >= 8,
            isToday: day.dateKey === todayKey,
            isFuture: day.dateKey > todayKey,
          };
        });

        const completedDays = days.filter((day) => day.complete).length;
        const requiredDays = days.length;
        const remainingDays = requiredDays - completedDays;

        resolve({
          weekStart,
          weekEnd,
          completedDays,
          requiredDays,
          remainingDays,
          qualified: remainingDays === 0,
          days,
        });
      }
    );
  });
}

module.exports = {
  endOfNextWeekSession,
  endOfWeekSession,
  getWeekBounds,
  getWeekProgress,
};
