import { getWeekDateRange, toLocalDateKey } from './timeEntryDates';

test('weekly date ranges use calendar dates and do not overlap on Sunday', () => {
  const previousWeek = getWeekDateRange(new Date(2026, 9, 11));
  const currentWeek = getWeekDateRange(new Date(2026, 9, 12));

  expect(previousWeek).toEqual(['2026-10-05', '2026-10-11']);
  expect(currentWeek).toEqual(['2026-10-12', '2026-10-18']);
  expect(previousWeek[1]).not.toBe(currentWeek[1]);
});

test('formats Sunday work dates without converting local midnight to the previous UTC date', () => {
  expect(toLocalDateKey(new Date(2026, 9, 11))).toBe('2026-10-11');
});

