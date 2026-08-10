import React, { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import MineTimeAnalytics, { buildCategoryChartData, buildDistributionItems } from './MineTimeAnalytics';

const dashboard = {
  timeSeries: {
    bucket: 'week',
    periods: [{
      startDate: '2026-08-03', endDate: '2026-08-09', totalHours: 40, isPartial: false,
      categories: [{ key: 'external_delivery', hours: 30, percent: 75 }, { key: 'operations', hours: 10, percent: 25 }],
    }],
  },
  projects: [
    { project: { id: 1, code: 'A1', name: 'Alpha' }, periodHours: 20 },
    { project: { id: 2, name: 'Beta' }, periodHours: 10 },
    { project: { id: 3, name: 'Gamma' }, periodHours: 5 },
    { project: { id: 4, name: 'Delta' }, periodHours: 3 },
    { project: { id: 5, name: 'Epsilon' }, periodHours: 1 },
    { project: { id: 6, name: 'Zeta' }, periodHours: 1 },
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

test('shows interaction details in a full-width row with a colored category tag', () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <MineTimeAnalytics
        data={dashboard}
        loading={false}
        error={null}
        onRetry={jest.fn()}
        range="8w"
        onRangeChange={jest.fn()}
      />
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
  expect(getComputedStyle(tag).backgroundColor).toBe('rgb(238, 245, 244)');
  expect(details.querySelector('[aria-hidden="true"]')).toBeNull();

  act(() => root.unmount());
  host.remove();
  delete window.IS_REACT_ACT_ENVIRONMENT;
});
