import {
  getCalendarDays,
  getCalendarYears,
  getDayStatus,
  getDayTooltip,
  summarizeEntriesByDay,
} from './MonthHeatmapCalendar';

test('calendar always contains complete Monday-Sunday weeks', () => {
  const days = getCalendarDays(new Date(2026, 7, 1));
  expect(days[0].getDay()).toBe(1);
  expect(days[days.length - 1].getDay()).toBe(0);
  expect(days.length % 7).toBe(0);
});

test('calendar aggregates several saved entries on the same day', () => {
  expect(summarizeEntriesByDay([
    { date: '2026-08-03', hours: 2.5 },
    { date: '2026-08-03T12:00:00.000Z', hours: 5.5 },
  ])).toEqual({ '2026-08-03': 8 });
});

test('calendar distinguishes partial, complete and overtime working days', () => {
  expect(getDayStatus(0, false)).toBe('empty');
  expect(getDayStatus(6, false)).toBe('partial');
  expect(getDayStatus(8, false)).toBe('complete');
  expect(getDayStatus(9, false)).toBe('overtime');
  expect(getDayStatus(9, true)).toBe('weekend-filled');
});

test('year selector always keeps a rolling range around the displayed year', () => {
  const years = getCalendarYears(2036);
  expect(years).toHaveLength(21);
  expect(years[0]).toBe(2026);
  expect(years[10]).toBe(2036);
  expect(years[20]).toBe(2046);
});

test('overtime tooltip describes hours above the daily norm without legal wording', () => {
  expect(getDayTooltip(new Date(2026, 7, 12), 10, false)).toContain('10 часов · на 2 часа больше дневной нормы');
});
