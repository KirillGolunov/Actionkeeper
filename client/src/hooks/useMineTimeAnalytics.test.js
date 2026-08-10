import { getMineAnalyticsPeriod } from '../utils/mineTimeAnalytics';

test('builds an eight-week range ending with the selected week', () => {
  expect(getMineAnalyticsPeriod(new Date(2026, 7, 5), '8w')).toEqual({
    startDate: '2026-06-15',
    endDate: '2026-08-09',
    bucket: 'week',
  });
});

test('builds calendar-month ranges for six and twelve months', () => {
  expect(getMineAnalyticsPeriod(new Date(2026, 7, 5), '6m')).toEqual({
    startDate: '2026-03-01',
    endDate: '2026-08-31',
    bucket: 'month',
  });
  expect(getMineAnalyticsPeriod(new Date(2026, 7, 5), '12m')).toEqual({
    startDate: '2025-09-01',
    endDate: '2026-08-31',
    bucket: 'month',
  });
});
