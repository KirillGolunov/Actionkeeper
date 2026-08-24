import React, { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import ConnectedCategoryFlowChart, { buildConnectedStackLayout } from './ConnectedCategoryFlowChart';

const categories = ['external_delivery', 'operations'];
const colors = { external_delivery: '#7890E3', operations: '#68B597' };
const labels = { external_delivery: 'Внешние проекты', operations: 'Операционная деятельность' };

function period(startDate, totalHours, external, operations, partial = false) {
  return {
    startDate,
    endDate: startDate,
    label: startDate.slice(5),
    totalHours,
    isPartial: partial,
    external_delivery: external,
    operations,
    categoryDetails: {
      external_delivery: { hours: totalHours * external / 100, percent: external },
      operations: { hours: totalHours * operations / 100, percent: operations },
    },
  };
}

test('builds normalized columns in a fixed category order', () => {
  const layout = buildConnectedStackLayout({
    periods: [period('2026-07-01', 40, 60, 40), period('2026-08-01', 40, 30, 70)],
    categories,
    width: 480,
    height: 120,
  });
  expect(layout.columns).toHaveLength(2);
  expect(layout.columns[0].segments.map((item) => item.category)).toEqual(categories);
  expect(layout.columns[0].segments.reduce((sum, item) => sum + item.height, 0)).toBeCloseTo(layout.plotHeight);
  expect(layout.ribbons).toHaveLength(2);
});

test('breaks every ribbon at an empty period', () => {
  const layout = buildConnectedStackLayout({
    periods: [period('2026-06-01', 40, 50, 50), period('2026-07-01', 0, 0, 0), period('2026-08-01', 40, 50, 50)],
    categories,
    width: 480,
    height: 120,
  });
  expect(layout.columns[1].empty).toBe(true);
  expect(layout.ribbons).toHaveLength(0);
});

test('tapers a disappearing category to a point and marks partial ribbons', () => {
  const layout = buildConnectedStackLayout({
    periods: [period('2026-07-01', 40, 50, 50), period('2026-08-01', 40, 100, 0, true)],
    categories,
    width: 480,
    height: 120,
  });
  const ribbon = layout.ribbons.find((item) => item.category === 'operations');
  expect(ribbon).toBeDefined();
  expect(ribbon.to.yTop).toBeCloseTo(ribbon.to.yBottom);
  expect(ribbon.partial).toBe(true);
  expect(ribbon.path).toContain('C ');
});

test('uses the planned responsive column widths', () => {
  const periods = Array.from({ length: 12 }, (_, index) => period(`2026-${String(index + 1).padStart(2, '0')}-01`, 40, 60, 40));
  const desktop = buildConnectedStackLayout({ periods, categories, width: 720, height: 120 });
  const mobile = buildConnectedStackLayout({ periods, categories, width: 360, height: 120, compact: true });
  expect(desktop.columns[0].barWidth).toBeGreaterThanOrEqual(20);
  expect(desktop.columns[0].barWidth).toBeLessThanOrEqual(24);
  expect(mobile.columns[0].barWidth).toBeGreaterThanOrEqual(18);
  expect(mobile.columns[0].barWidth).toBeLessThanOrEqual(20);
});

test('reports focus interaction, removes separators and uses light highlight opacities', () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const onInteractionChange = jest.fn();
  act(() => {
    root.render(
      <ConnectedCategoryFlowChart
        periods={[period('2026-07-01', 40, 60, 40), period('2026-08-01', 40, 30, 70)]}
        categories={categories}
        colors={colors}
        labels={labels}
        onInteractionChange={onInteractionChange}
      />
    );
  });

  expect(host.querySelectorAll('[data-flow-segment]')).toHaveLength(4);
  expect(host.querySelectorAll('[data-flow-ribbon]')).toHaveLength(2);
  const activeRibbon = host.querySelector('[data-flow-ribbon="external_delivery"]');
  expect(activeRibbon.getAttribute('fill-opacity')).toBe('0.31');
  const activeSegment = host.querySelector('[data-flow-segment="external_delivery"]');
  act(() => Simulate.focus(activeSegment));
  const inactiveSegment = host.querySelector('[data-flow-segment="operations"]');
  expect(inactiveSegment.getAttribute('fill-opacity')).toBe('0.12');
  expect(activeSegment.getAttribute('fill-opacity')).toBe('0.95');
  expect(activeRibbon.getAttribute('fill-opacity')).toBe('0.45');
  expect(onInteractionChange).toHaveBeenLastCalledWith(expect.objectContaining({
    type: 'segment', category: 'external_delivery', hours: 24, percent: 60,
  }));
  expect(host.querySelectorAll('line[stroke*="255,255,255"]')).toHaveLength(0);
  expect(host.textContent).not.toContain('Внешние проекты:');

  act(() => root.unmount());
  host.remove();
  delete window.IS_REACT_ACT_ENVIRONMENT;
});

test('uses a slightly stronger base opacity for partial ribbons', () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <ConnectedCategoryFlowChart
        periods={[period('2026-07-01', 40, 60, 40), period('2026-08-01', 40, 30, 70, true)]}
        categories={categories}
        colors={colors}
        labels={labels}
      />
    );
  });

  expect(host.querySelector('[data-flow-ribbon="external_delivery"]').getAttribute('fill-opacity')).toBe('0.23');

  act(() => root.unmount());
  host.remove();
  delete window.IS_REACT_ACT_ENVIRONMENT;
});

test('locks and unlocks interaction by click and Escape', () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const onInteractionChange = jest.fn();
  act(() => {
    root.render(
      <ConnectedCategoryFlowChart
        periods={[period('2026-07-01', 40, 60, 40), period('2026-08-01', 40, 30, 70)]}
        categories={categories}
        colors={colors}
        labels={labels}
        onInteractionChange={onInteractionChange}
      />
    );
  });

  const segment = host.querySelector('[data-flow-segment="external_delivery"]');
  act(() => Simulate.click(segment));
  expect(onInteractionChange).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'external_delivery' }));
  act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(onInteractionChange).toHaveBeenLastCalledWith(null);

  act(() => root.unmount());
  host.remove();
  delete window.IS_REACT_ACT_ENVIRONMENT;
});

test('reports a category selection only when an interaction is locked', () => {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const onSelectedCategoryChange = jest.fn();
  act(() => {
    root.render(
      <ConnectedCategoryFlowChart
        periods={[period('2026-07-01', 40, 60, 40), period('2026-08-01', 40, 30, 70)]}
        categories={categories}
        colors={colors}
        labels={labels}
        onSelectedCategoryChange={onSelectedCategoryChange}
      />
    );
  });

  const external = host.querySelector('[data-flow-segment="external_delivery"]');
  act(() => Simulate.focus(external));
  expect(onSelectedCategoryChange).toHaveBeenLastCalledWith(null);

  act(() => Simulate.click(external));
  expect(onSelectedCategoryChange).toHaveBeenLastCalledWith('external_delivery');
  act(() => Simulate.click(external));
  expect(onSelectedCategoryChange).toHaveBeenLastCalledWith(null);

  act(() => root.unmount());
  host.remove();
  delete window.IS_REACT_ACT_ENVIRONMENT;
});
