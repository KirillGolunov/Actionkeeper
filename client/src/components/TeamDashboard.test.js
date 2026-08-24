import React, { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import TeamDashboard, { getPayrollUsageDisplay } from './TeamDashboard';
import { I18nProvider } from '../i18n/I18nProvider';

jest.mock('axios', () => ({ get: jest.fn() }));

const weeklyOverview = {
  year: 2026,
  weeklyTargetHours: 40,
  weeks: [{ number: 1, startDate: '2025-12-29', endDate: '2026-01-04', month: 1 }],
  users: [],
  summary: { userCount: 0, attentionCount: 0, missingWeekCount: 0, partialWeekCount: 0 },
};

const analyticsDashboard = {
  summary: { totalHours: 40 },
  timeSeries: {
    bucket: 'month',
    periods: [{
      startDate: '2026-08-01', endDate: '2026-08-31', totalHours: 40, isPartial: false,
      categories: [
        { key: 'external_delivery', hours: 28, percent: 70 },
        { key: 'operations', hours: 12, percent: 30 },
      ],
    }],
  },
  projects: [
    { project: { id: 1, code: 'EXT', name: 'Внешний проект', category: 'external_delivery', clientName: 'Внешний клиент', clientType: 'external', managerName: 'Анна Иванова' }, periodHours: 28, payrollUsage: { usedPercent: 76, warningThresholdPercent: 80, hasPayrollLimit: true, isComplete: true } },
    { project: { id: 2, code: 'OPS', name: 'Операционный проект', category: 'operations', clientName: 'Внутренний клиент', clientType: 'internal', managerName: 'Пётр Смирнов' }, periodHours: 12, payrollUsage: { usedPercent: 85.5, warningThresholdPercent: 80, hasPayrollLimit: true, isComplete: false } },
  ],
  breakdowns: {
    users: [], projectUsers: [],
    clients: [
      { key: 'external\u0000Внешний клиент', label: 'Внешний клиент', clientType: 'external', hours: 28 },
      { key: 'internal\u0000Внутренний клиент', label: 'Внутренний клиент', clientType: 'internal', hours: 12 },
    ],
  },
  contractComparisonProjects: [
    { projectId: 1, name: 'Внешний проект', code: 'EXT', contractAmountExVatRub: 500000, lifetimeHours: 320 },
    { projectId: 2, name: 'Операционный проект', code: 'OPS', contractAmountExVatRub: 300000, lifetimeHours: 180 },
  ],
};

async function renderDashboard(teamView = 'completion', dashboardData = {}, onOpenProject = jest.fn()) {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem('locale', 'ru');
  axios.get.mockImplementation((url) => Promise.resolve({ data: url === '/api/dashboard/team-weekly' ? weeklyOverview : dashboardData }));
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const onTeamViewChange = jest.fn();
  await act(async () => {
    root.render(<I18nProvider><TeamDashboard currentUser={{ id: 1, role: 'admin' }} selectedSubject="team" teamView={teamView} onTeamViewChange={onTeamViewChange} onOpenProject={onOpenProject} /></I18nProvider>);
    await Promise.resolve();
  });
  return {
    host,
    onTeamViewChange,
    onOpenProject,
    cleanup() {
      act(() => root.unmount());
      host.remove();
      localStorage.removeItem('locale');
      delete window.IS_REACT_ACT_ENVIRONMENT;
    },
  };
}

test('combines admin controls and drives the heatmap year from the shared navigation', async () => {
  const view = await renderDashboard();
  const bar = view.host.querySelector('[data-team-control-bar]');
  expect(bar).not.toBeNull();
  expect(view.host.querySelector('#team-period-month-tab').disabled).toBe(true);
  expect(view.host.querySelector('#team-period-year-tab').disabled).toBe(false);
  expect(view.host.querySelector('#team-period-year-tab').getAttribute('aria-selected')).toBe('true');
  expect(view.host.querySelector('[data-option-tooltip="month"]')).not.toBeNull();
  expect(view.host.querySelector('#team-view-completion-tab')).not.toBeNull();
  expect(view.host.querySelector('#team-client-type-all-tab')).toBeNull();
  expect(bar.querySelector('[data-team-period-navigation]')).not.toBeNull();

  await act(async () => { Simulate.click([...bar.querySelectorAll('button')].find((button) => button.getAttribute('aria-label') === 'Предыдущий период')); await Promise.resolve(); });
  expect(axios.get).toHaveBeenLastCalledWith('/api/dashboard/team-weekly', { params: { year: 2025 } });
  view.cleanup();
});

test('filters project hours by the client selected in the client list', async () => {
  const view = await renderDashboard('analytics', analyticsDashboard);
  const client = view.host.querySelector('[data-client-filter="Внешний клиент"]');
  expect(client).not.toBeNull();

  await act(async () => {
    Simulate.click(client);
    await Promise.resolve();
  });

  const table = view.host.querySelector('[data-team-analytics-table="true"]');
  expect(view.host.querySelector('[data-selected-project-client="Внешний клиент"]')).not.toBeNull();
  expect(table.textContent).toContain('Внешний проект');
  expect(table.textContent).not.toContain('Операционный проект');
  view.cleanup();
});

test('opens the shared project dialog flow from a project row', async () => {
  const onOpenProject = jest.fn();
  const view = await renderDashboard('analytics', analyticsDashboard, onOpenProject);
  const projectRow = [...view.host.querySelectorAll('tbody tr')].find((row) => row.textContent.includes('Внешний проект'));
  act(() => Simulate.click(projectRow));
  expect(onOpenProject).toHaveBeenCalledWith(1);
  view.cleanup();
});

test('opens a project from the contract-effort tornado chart', async () => {
  const onOpenProject = jest.fn();
  const view = await renderDashboard('analytics', analyticsDashboard, onOpenProject);
  const tornadoRow = view.host.querySelector('[data-contract-tornado-row="1"]');
  expect(tornadoRow).not.toBeNull();
  act(() => Simulate.click(tornadoRow));
  expect(onOpenProject).toHaveBeenCalledWith(1);
  view.cleanup();
});

test('shows hours and percentage as separate project-table columns', async () => {
  const view = await renderDashboard('analytics', analyticsDashboard);
  const table = view.host.querySelector('[data-team-analytics-table="true"]');
  expect(table.querySelector('thead').textContent).toContain('Часы');
  expect(table.querySelector('thead').textContent).toContain('Руководитель');
  expect(table.querySelector('thead').textContent).toContain('Процент');
  expect(table.querySelector('thead').textContent).toContain('ФОТ, %');
  expect(view.host.querySelector('#team-table-values-hours-tab')).toBeNull();
  expect(view.host.querySelector('#team-table-group-projects-tab')).toBeNull();
  expect(table.querySelector('tbody').textContent).toContain('28 ч');
  expect(table.querySelector('tbody').textContent).toContain('70%');
  expect(table.querySelector('[data-payroll-usage-status="normal"]').textContent).toBe('76%');
  expect(table.querySelector('[data-payroll-usage-status="warning"]').textContent).toContain('85,5%');
  expect(table.querySelector('tbody').textContent).toContain('Анна Иванова');
  view.cleanup();
});

test('formats payroll usage statuses without exposing monetary amounts', () => {
  expect(getPayrollUsageDisplay({ hasPayrollLimit: false })).toMatchObject({ value: '—', tone: 'muted' });
  expect(getPayrollUsageDisplay({ hasPayrollLimit: true, usedPercent: 79.9, warningThresholdPercent: 80, isComplete: true })).toMatchObject({ value: '79,9%', tone: 'normal' });
  expect(getPayrollUsageDisplay({ hasPayrollLimit: true, usedPercent: 80, warningThresholdPercent: 80, isComplete: false })).toMatchObject({ value: '80%', tone: 'warning', incomplete: true });
  expect(getPayrollUsageDisplay({ hasPayrollLimit: true, usedPercent: 100, warningThresholdPercent: 80, isComplete: true })).toMatchObject({ value: '100%', tone: 'critical' });
});

test('enables analytics ranges and does not send the removed client filter', async () => {
  const view = await renderDashboard('analytics');
  const week = view.host.querySelector('#team-period-week-tab');
  expect(week.disabled).toBe(false);
  await act(async () => { Simulate.click(week); await Promise.resolve(); });
  const dashboardRequest = axios.get.mock.calls.filter(([url]) => url === '/api/dashboard').at(-1);
  expect(dashboardRequest[1].params).not.toHaveProperty('clientType');
  view.cleanup();
});

test('filters project hours by the category locked in the time-structure chart', async () => {
  const view = await renderDashboard('analytics', analyticsDashboard);
  const externalSegment = view.host.querySelector('[data-flow-segment="external_delivery"]');
  expect(externalSegment).not.toBeNull();

  await act(async () => {
    Simulate.click(externalSegment);
    await Promise.resolve();
  });

  const filter = view.host.querySelector('[data-selected-project-category="external_delivery"]');
  expect(filter).not.toBeNull();
  const table = view.host.querySelector('[data-team-analytics-table="true"]');
  expect(table.textContent).toContain('Внешний проект');
  expect(table.textContent).not.toContain('Операционный проект');
  expect(table.querySelector('[data-project-category-tag="external_delivery"]').textContent).toBe('Внешние проекты');
  expect(view.host.querySelector('[data-client-filter="Внешний клиент"]')).not.toBeNull();
  expect(view.host.querySelector('[data-client-filter="Внешний клиент"]').textContent).toContain('28 ч');
  expect(view.host.querySelector('[data-client-filter="Внутренний клиент"]')).toBeNull();

  await act(async () => {
    Simulate.click(view.host.querySelector('[data-client-filter="Внешний клиент"]'));
    await Promise.resolve();
  });
  expect(view.host.querySelector('[data-selected-project-client="Внешний клиент"]')).not.toBeNull();

  await act(async () => {
    Simulate.click(filter);
    await Promise.resolve();
  });
  expect(view.host.querySelector('[data-selected-project-client]')).toBeNull();
  expect(table.textContent).toContain('Операционный проект');
  view.cleanup();
});

test('clears the client filter and rebuilds client hours when the category changes', async () => {
  const view = await renderDashboard('analytics', analyticsDashboard);
  const externalClient = view.host.querySelector('[data-client-filter="Внешний клиент"]');
  await act(async () => {
    Simulate.click(externalClient);
    await Promise.resolve();
  });
  expect(view.host.querySelector('[data-selected-project-client="Внешний клиент"]')).not.toBeNull();

  const operationsSegment = view.host.querySelector('[data-flow-segment="operations"]');
  await act(async () => {
    Simulate.click(operationsSegment);
    await Promise.resolve();
  });

  expect(view.host.querySelector('[data-selected-project-client]')).toBeNull();
  expect(view.host.querySelector('[data-client-filter="Внешний клиент"]')).toBeNull();
  expect(view.host.querySelector('[data-client-filter="Внутренний клиент"]').textContent).toContain('12 ч');
  const table = view.host.querySelector('[data-team-analytics-table="true"]');
  expect(table.textContent).toContain('Операционный проект');
  expect(table.textContent).not.toContain('Внешний проект');
  view.cleanup();
});
