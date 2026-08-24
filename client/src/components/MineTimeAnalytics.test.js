import React, { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import MineTimeAnalytics, { buildCategoryChartData, buildDistributionItems } from './MineTimeAnalytics';
import { I18nProvider } from '../i18n/I18nProvider';

const dashboard = {
  timeSeries: {
    bucket: 'week',
    periods: [{
      startDate: '2026-08-03', endDate: '2026-08-09', totalHours: 40, isPartial: false,
      categories: [{ key: 'external_delivery', hours: 30, percent: 75 }, { key: 'operations', hours: 10, percent: 25 }],
    }],
  },
  projects: [
    { project: { id: 1, code: 'A1', name: 'Alpha', category: 'external_delivery' }, periodHours: 20 },
    { project: { id: 2, name: 'Beta', category: 'external_delivery' }, periodHours: 10 },
    { project: { id: 3, name: 'Gamma', category: 'operations' }, periodHours: 5 },
    { project: { id: 4, name: 'Delta', category: 'operations' }, periodHours: 3 },
    { project: { id: 5, name: 'Epsilon', category: 'operations' }, periodHours: 1 },
    { project: { id: 6, name: 'Zeta', category: 'operations' }, periodHours: 1 },
  ],
  breakdowns: { clients: [{ key: 'Client', label: 'Client', hours: 40 }] },
};

test('normalizes category periods for the stacked chart', () => {
  expect(buildCategoryChartData(dashboard.timeSeries)[0]).toMatchObject({
    label: '3 авг.', totalHours: 40, external_delivery: 75, operations: 25,
  });
});

test('uses compact labels for daily and yearly team periods', () => {
  expect(buildCategoryChartData({
    bucket: 'day',
    periods: [{ startDate: '2026-08-03', endDate: '2026-08-03', totalHours: 0, categories: [] }],
  })[0].label).toBe('Пн');
  expect(buildCategoryChartData({
    bucket: 'year',
    periods: [{ startDate: '2026-01-01', endDate: '2026-12-31', totalHours: 0, categories: [] }],
  })[0].label).toBe('2026');
  expect(buildCategoryChartData({
    bucket: 'quarter',
    periods: [{ startDate: '2026-07-01', endDate: '2026-09-30', totalHours: 0, categories: [] }],
  })[0].label).toBe('III кв. 2026');
});

test('builds top five projects, others and concentration', () => {
  const result = buildDistributionItems(dashboard, 'projects');
  expect(result.count).toBe(6);
  expect(result.items).toHaveLength(6);
  expect(result.items[5]).toMatchObject({ key: 'other', hours: 1 });
  expect(result.topThreePercent).toBe(88);
});

test('uses client breakdown for the client mode', () => {
  expect(buildDistributionItems(dashboard, 'clients')).toMatchObject({ count: 1, topThreePercent: 100 });
});

test('filters project distribution by the selected category and supports an empty category', () => {
  expect(buildDistributionItems(dashboard, 'projects', 'Other', 'external_delivery')).toMatchObject({ count: 2, total: 30, topThreePercent: 100 });
  expect(buildDistributionItems(dashboard, 'projects', 'Other', 'unclassified')).toMatchObject({ count: 0, total: 0, items: [] });
});

test('shows only project distribution without a projects-clients switch', () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(<I18nProvider><MineTimeAnalytics data={dashboard} loading={false} error={null} onRetry={jest.fn()} range="8w" onRangeChange={jest.fn()} /></I18nProvider>);
  });

  expect(host.querySelector('[aria-label="Разрез распределения времени"]')).toBeNull();
  expect(host.textContent).toContain('6 проектов');
  expect(host.textContent).toContain('A1 — Alpha');

  act(() => root.unmount());
  host.remove();
  delete window.IS_REACT_ACT_ENVIRONMENT;
});

test('filters the distribution card after selecting a category and clears it again', async () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<I18nProvider><MineTimeAnalytics data={dashboard} loading={false} error={null} onRetry={jest.fn()} range="8w" onRangeChange={jest.fn()} /></I18nProvider>);
    await Promise.resolve();
  });

  const externalSegment = host.querySelector('[data-flow-segment="external_delivery"]');
  await act(async () => {
    Simulate.click(externalSegment);
    await Promise.resolve();
  });
  const filter = host.querySelector('[data-selected-project-category="external_delivery"]');
  expect(filter).not.toBeNull();
  expect(host.textContent).toContain('2 проектов');
  expect(host.textContent).toContain('A1 — Alpha');
  expect(host.textContent).toContain('Beta');
  expect(host.textContent).not.toContain('Gamma');

  await act(async () => {
    Simulate.click(filter);
    await Promise.resolve();
  });
  expect(host.querySelector('[data-selected-project-category]')).toBeNull();
  expect(host.textContent).toContain('6 проектов');

  await act(async () => {
    Simulate.click(externalSegment);
    await Promise.resolve();
    Simulate.click(externalSegment);
    await Promise.resolve();
  });
  expect(host.querySelector('[data-selected-project-category]')).toBeNull();

  act(() => root.unmount());
  host.remove();
  delete window.IS_REACT_ACT_ENVIRONMENT;
});

test('renders the new analytics cards in English', () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem('locale', 'en');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(<I18nProvider><MineTimeAnalytics data={dashboard} loading={false} error={null} onRetry={jest.fn()} range="8w" onRangeChange={jest.fn()} /></I18nProvider>);
  });

  expect(host.textContent).toContain('Time structure over time');
  expect(host.textContent).toContain('Time distribution');
  expect(host.textContent).toContain('6 projects');
  expect(host.querySelector('[aria-label="Time structure by category and period"]')).not.toBeNull();

  act(() => root.unmount());
  host.remove();
  localStorage.setItem('locale', 'ru');
  delete window.IS_REACT_ACT_ENVIRONMENT;
});

test('shows interaction details in a full-width row with a colored category tag', () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <I18nProvider><MineTimeAnalytics
        data={dashboard}
        loading={false}
        error={null}
        onRetry={jest.fn()}
        range="8w"
        onRangeChange={jest.fn()}
      /></I18nProvider>
    );
  });

  const details = host.querySelector('[data-category-details]');
  expect(details.textContent).toBe('Доля категорий в каждом периоде');
  const segment = host.querySelector('[data-flow-segment="operations"]');
  act(() => Simulate.focus(segment));

  const tag = host.querySelector('[data-category-detail-tag="operations"]');
  const metrics = host.querySelector('[data-category-detail-metrics]');
  expect(tag.textContent).toBe('Операционная деятельность');
  expect(metrics.textContent).toBe('3 авг. · 10 ч · 25%');
  expect(getComputedStyle(tag).backgroundColor).toBe('rgb(242, 243, 245)');
  expect(details.querySelector('[aria-hidden="true"]')).toBeNull();

  act(() => root.unmount());
  host.remove();
  delete window.IS_REACT_ACT_ENVIRONMENT;
});
