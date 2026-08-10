import { addDays, endOfMonth, format, startOfMonth, startOfWeek, subMonths } from 'date-fns';

export const MINE_ANALYTICS_RANGES = [
  { value: '8w', label: '8 недель' },
  { value: '6m', label: '6 месяцев' },
  { value: '12m', label: '12 месяцев' },
];

export function getMineAnalyticsPeriod(selectedWeek, range = '8w') {
  const anchor = new Date(selectedWeek || new Date());
  if (range === '6m' || range === '12m') {
    const months = range === '12m' ? 12 : 6;
    return {
      startDate: format(startOfMonth(subMonths(anchor, months - 1)), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(anchor), 'yyyy-MM-dd'),
      bucket: 'month',
    };
  }
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  return {
    startDate: format(addDays(monday, -49), 'yyyy-MM-dd'),
    endDate: format(addDays(monday, 6), 'yyyy-MM-dd'),
    bucket: 'week',
  };
}
