/** Format a work date as a calendar date in the browser's local timezone. */
export function toLocalDateKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Return the Monday-Sunday calendar dates for the week containing value. */
export function getWeekDateRange(value) {
  const monday = new Date(value);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return [toLocalDateKey(monday), toLocalDateKey(sunday)];
}

