import React, { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import ProjectHoursOverview, { buildCumulativeData } from './ProjectHoursOverview';
import { I18nProvider } from '../i18n/I18nProvider';

jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart: ({ children }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Line: ({ dataKey, name }) => <div data-chart-line={dataKey}>{name}</div>,
}));

const analytics = {
  summary: { participantsCount: 2, totalHours: 16, averagePerDay: 8, lastEntryDate: '2026-08-04' },
  members: [
    { userId: 1, userName: 'Иван Иванов', totalHours: 10 },
    { userId: 2, userName: 'Анна Петрова', totalHours: 6 },
  ],
  daily: [
    { date: '2026-08-03', totalHours: 10, users: [{ userId: 1, hours: 8 }, { userId: 2, hours: 2 }] },
    { date: '2026-08-04', totalHours: 6, users: [{ userId: 1, hours: 2 }, { userId: 2, hours: 4 }] },
  ],
};

test('builds cumulative series for every participant', () => {
  expect(buildCumulativeData(analytics)).toEqual([
    { date: '2026-08-03', total: 10, user_1: 8, user_2: 2 },
    { date: '2026-08-04', total: 16, user_1: 10, user_2: 6 },
  ]);
});

test('shows participant lines and names in the project-hours modal', async () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem('locale', 'ru');
  axios.get.mockResolvedValue({ data: analytics });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<I18nProvider><ProjectHoursOverview project={{ id: 7 }} active /></I18nProvider>);
    await Promise.resolve();
  });

  expect(host.querySelector('[data-chart-line="total"]')).not.toBeNull();
  expect(host.querySelector('[data-chart-line="user_1"]')).not.toBeNull();
  expect(host.querySelector('[data-chart-line="user_2"]')).not.toBeNull();
  act(() => Simulate.click(host.querySelector('[aria-label="Участники графика"]')));
  expect(document.body.textContent).toContain('Иван Иванов');
  expect(document.body.textContent).toContain('Анна Петрова');

  act(() => root.unmount());
  host.remove();
  localStorage.removeItem('locale');
  delete window.IS_REACT_ACT_ENVIRONMENT;
});
