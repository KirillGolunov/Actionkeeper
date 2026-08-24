import React, { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import TeamWeeklyOverview, {
  HEATMAP_ASPECT_RATIO,
  HEATMAP_COMPACT_BREAKPOINT,
  HEATMAP_GAP,
  EMPLOYEE_COLUMN_MIN_WIDTH,
  WEEK_STATUS_COLORS,
  getCurrentQuarter,
  getEmployeeColumnWidth,
  getFullYearMinimumWidth,
  getMonthGroups,
  getWeekNumbersInMonth,
  getWeekMonthGroupIndexes,
  getWeeksForQuarter,
  getWeekStatusChipStyles,
  getWeekVisual,
  isCompactHeatmap,
} from './TeamWeeklyOverview';
import { I18nProvider } from '../i18n/I18nProvider';
import { getProjectCategoryChipStyles, getProjectCategoryVisual } from '../utils/projectCategories';

jest.mock('axios', () => ({ get: jest.fn() }));

const overview = {
  year: 2026,
  weeklyTargetHours: 40,
  weeks: [
    { number: 1, startDate: '2025-12-29', endDate: '2026-01-04', month: 1 },
    { number: 2, startDate: '2026-01-05', endDate: '2026-01-11', month: 1 },
  ],
  users: [{
    id: 7,
    label: 'Иванов Иван',
    counts: { complete: 1, partial: 0, missing: 1 },
    weeks: [
      { weekStart: '2025-12-29', hours: 40, status: 'complete', dominantCategory: 'operations', categoryHours: [{ category: 'operations', hours: 28 }, { category: 'external_delivery', hours: 12 }], projectHours: [{ id: 1, code: 'OP-1', name: 'Операционный проект', category: 'operations', hours: 28 }, { id: 2, code: 'EXT-1', name: 'Внешний проект', category: 'external_delivery', hours: 12 }] },
      { weekStart: '2026-01-05', hours: 0, status: 'missing' },
    ],
  }, {
    id: 8,
    label: 'Петров Пётр',
    counts: { complete: 0, partial: 0, missing: 2 },
    weeks: [
      { weekStart: '2025-12-29', hours: 16, status: 'missing' },
      { weekStart: '2026-01-05', hours: 24, status: 'missing' },
    ],
  }],
  summary: { userCount: 2, attentionCount: 2, missingWeekCount: 3, partialWeekCount: 0 },
};

function setViewportMatch(compact) {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: compact && query === '(max-width:1023px)',
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

async function renderOverview(onOpenTimesheet = jest.fn(), response = overview, compact = false) {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  setViewportMatch(compact);
  localStorage.setItem('locale', 'ru');
  axios.get.mockResolvedValue({ data: response });
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<I18nProvider><TeamWeeklyOverview onOpenTimesheet={onOpenTimesheet} /></I18nProvider>);
    await Promise.resolve();
  });
  return {
    host,
    onOpenTimesheet,
    cleanup() {
      act(() => root.unmount());
      host.remove();
      localStorage.removeItem('locale');
      delete window.IS_REACT_ACT_ENVIRONMENT;
    },
  };
}

test('groups consecutive weeks under compact month headers', () => {
  expect(getMonthGroups([{ month: 1 }, { month: 1 }, { month: 2 }, { month: 2 }, { month: 3 }])).toEqual([
    { month: 1, count: 2, startIndex: 0 },
    { month: 2, count: 2, startIndex: 2 },
    { month: 3, count: 1, startIndex: 4 },
  ]);
});

test('restarts visible week numbering for every month', () => {
  expect(getWeekNumbersInMonth([{ month: 1 }, { month: 1 }, { month: 2 }, { month: 2 }, { month: 2 }, { month: 3 }])).toEqual([1, 2, 1, 2, 3, 1]);
});

test('assigns alternating visual groups to consecutive months', () => {
  expect(getWeekMonthGroupIndexes([{ month: 1 }, { month: 1 }, { month: 2 }, { month: 3 }, { month: 3 }])).toEqual([0, 0, 1, 2, 2]);
});

test('filters ISO weeks into 13 or 14 week quarter slices', () => {
  const weeks = Array.from({ length: 53 }, (_, index) => ({ month: Math.min(12, Math.floor(index / 4.4) + 1), number: index + 1 }));
  const counts = [1, 2, 3, 4].map((quarter) => getWeeksForQuarter(weeks, quarter).length);
  expect(counts.reduce((sum, count) => sum + count, 0)).toBe(53);
  counts.forEach((count) => expect(count).toBeGreaterThanOrEqual(13));
  counts.forEach((count) => expect(count).toBeLessThanOrEqual(14));
  expect(getCurrentQuarter(new Date(2026, 7, 21))).toBe(3);
});

test('uses the Actionplan palette for every heatmap state', () => {
  expect(WEEK_STATUS_COLORS.complete.background).toBe('#4A68D9');
  expect(WEEK_STATUS_COLORS.missing).toMatchObject({ background: '#F1A28F', hover: '#F6C2B7' });
  expect(WEEK_STATUS_COLORS.future).toMatchObject({ background: '#F7F8FA' });
  expect(WEEK_STATUS_COLORS.not_applicable).toMatchObject({ background: '#F7F8FA' });
  Object.values(WEEK_STATUS_COLORS).forEach((colors) => expect(colors).not.toHaveProperty('border'));
  expect(getWeekVisual('in_progress', 0).background).toBe('#EEF1FC');
  expect(getWeekVisual('in_progress', 40).background).toBe('#4A68D9');
  expect(getWeekVisual('partial', 39.9).background).toBe('#F1A28F');
  expect(getWeekVisual('complete', 40, 40, 'operations').background).toBe(getProjectCategoryVisual('operations').main);
  expect(getWeekStatusChipStyles('complete')).toBe(getProjectCategoryChipStyles('internal_project'));
  expect(getWeekStatusChipStyles('missing')).toEqual({ backgroundColor: '#FCE3DC', color: '#8C3F34', border: '1px solid #F1A28F' });
});

test('switches layout from quarter to full year at the container breakpoint', () => {
  expect(HEATMAP_COMPACT_BREAKPOINT).toBe(1024);
  expect(isCompactHeatmap(1023)).toBe(true);
  expect(isCompactHeatmap(1024)).toBe(false);
});

test('sizes the employee column for the longest full name and missed count', () => {
  const users = [{ label: 'Вишневская Наталья Александровна', counts: { missing: 32 } }];
  const width = getEmployeeColumnWidth(users, (count) => `${count} проп.`, (text) => text.length * 8);
  expect(width).toBeGreaterThan(EMPLOYEE_COLUMN_MIN_WIDTH);
  expect(width).toBe(342);
  expect(getFullYearMinimumWidth(width, 53)).toBe(1188);
});

test('observes the heatmap container rather than only the viewport', async () => {
  let resizeCallback;
  global.ResizeObserver = class ResizeObserver {
    constructor(callback) { resizeCallback = callback; }
    observe() {}
    disconnect() {}
  };
  const view = await renderOverview();
  const grid = view.host.querySelector('[data-testid="team-week-grid"]');
  expect(grid.getAttribute('data-compact')).toBe('false');
  act(() => resizeCallback([{ contentRect: { width: 900 } }]));
  expect(grid.getAttribute('data-compact')).toBe('true');
  act(() => resizeCallback([{ contentRect: { width: 1200 } }]));
  expect(grid.getAttribute('data-compact')).toBe('false');
  view.cleanup();
  delete global.ResizeObserver;
});

test('renders a fluid grid with a single roving tab stop and keyboard navigation', async () => {
  const view = await renderOverview();
  expect(view.host.querySelector('table')).toBeNull();
  expect(view.host.querySelector('[role="grid"]').getAttribute('aria-colcount')).toBe('2');
  expect(view.host.querySelector('[data-testid="team-week-grid"]').getAttribute('data-cell-gap')).toBe(String(HEATMAP_GAP));
  const cells = [...view.host.querySelectorAll('[data-week-cell]')];
  expect(cells).toHaveLength(4);
  expect(cells.filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
  expect(HEATMAP_ASPECT_RATIO).toBe('1 / 1');
  expect(getComputedStyle(cells[0]).borderTopWidth).toBe('0px');
  expect(getComputedStyle(view.host.querySelector('[data-week-column][data-month-start="true"]') || cells[0]).borderLeftWidth).toBe('0px');
  expect(getComputedStyle(view.host.querySelector('[data-user-name]')).fontSize).toBe('14px');
  expect(getComputedStyle(view.host.querySelector('[data-user-name]')).whiteSpace).toBe('nowrap');
  expect(getComputedStyle(view.host.querySelector('[data-user-name]')).fontFamily).not.toContain('Inter');
  expect(view.host.querySelector('[data-user-name]').textContent).toBe('Иванов Иван');
  expect(getComputedStyle(view.host.querySelector('[data-missing-count]'))).toMatchObject({ color: 'rgb(52, 64, 84)', fontWeight: '400' });
  expect(getComputedStyle(view.host.querySelector('[data-legend-swatch]')).borderTopWidth).toBeFalsy();
  const legend = view.host.querySelector('[data-heatmap-legend]');
  const scrollableGrid = view.host.querySelector('[role="grid"]');
  expect(legend).not.toBeNull();
  expect(scrollableGrid.compareDocumentPosition(legend) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(getComputedStyle(scrollableGrid).overflowY).toBe('auto');
  expect(view.host.querySelector('[data-legend-swatch="operations"]')).not.toBeNull();
  expect(view.host.querySelector('[data-legend-swatch="unclassified"]')).toBeNull();
  expect(view.host.querySelector('[data-legend-swatch="future"]')).toBeNull();
  expect(view.host.querySelector('[data-legend-swatch="in_progress"] [data-legend-current-marker="true"]')).not.toBeNull();
  expect(view.host.querySelector('[data-dominant-category="operations"]')).not.toBeNull();
  expect(view.host.querySelector('[data-dominant-category="operations"]').getAttribute('title')).toContain('Преобладающая категория: Операционная деятельность');
  expect([...view.host.querySelectorAll('[data-week-header]')].map((header) => header.textContent.trim())).toEqual(['1', '2']);
  expect([...view.host.querySelectorAll('[data-week-header]')].map((header) => header.getAttribute('data-month-group'))).toEqual(['0', '0']);
  expect(view.host.querySelector('[data-week-header="0"]').getAttribute('data-month-start')).toBe('false');

  const grid = view.host.querySelector('[role="grid"]');
  expect(view.host.querySelector('[data-week-header="1"]').closest('[role="grid"]')).toBe(grid);
  expect(cells[1].closest('[role="grid"]')).toBe(grid);

  Simulate.mouseEnter(cells[1]);
  expect(view.host.querySelector('[data-heatmap-row="0"]').getAttribute('data-pointer-highlighted')).toBe('true');
  expect(view.host.querySelector('[data-week-column="1"]').getAttribute('data-pointer-highlighted')).toBe('true');
  expect(view.host.querySelector('[data-week-header="1"]').getAttribute('data-pointer-highlighted')).toBe('true');
  Simulate.mouseLeave(cells[1]);
  expect(view.host.querySelector('[data-week-header="1"]').getAttribute('data-pointer-highlighted')).toBe('true');
  Simulate.mouseEnter(cells[2]);
  expect(view.host.querySelector('[data-week-header="0"]').getAttribute('data-pointer-highlighted')).toBe('true');
  expect(view.host.querySelector('[data-week-header="1"]').getAttribute('data-pointer-highlighted')).toBe('false');
  Simulate.mouseLeave(cells[2]);
  expect(view.host.querySelector('[data-week-header="0"]').getAttribute('data-pointer-highlighted')).toBe('true');
  Simulate.mouseLeave(grid);
  expect(view.host.querySelector('[data-week-header="0"]').getAttribute('data-pointer-highlighted')).toBe('false');
  expect(cells[0].getAttribute('title')).toContain('Неделя 1');

  act(() => cells[0].focus());
  act(() => Simulate.keyDown(cells[0], { key: 'ArrowRight' }));
  expect(document.activeElement).toBe(cells[1]);
  act(() => Simulate.keyDown(cells[1], { key: 'ArrowDown' }));
  expect(document.activeElement).toBe(cells[3]);
  act(() => Simulate.keyDown(cells[3], { key: 'Enter' }));
  expect(document.body.textContent).toContain('Открыть табель за эту неделю?');
  expect(document.body.textContent).toContain('За эту неделю часов нет.');
  view.cleanup();
});

test('renders a small number for every one of 53 ISO weeks', async () => {
  const dateAt = (index, offset) => {
    const date = new Date(Date.UTC(2025, 11, 29 + index * 7 + offset));
    return date.toISOString().slice(0, 10);
  };
  const weeks = Array.from({ length: 53 }, (_, index) => ({
    number: index + 1,
    startDate: dateAt(index, 0),
    endDate: dateAt(index, 6),
    month: Math.min(12, Math.floor(index / 4.4) + 1),
  }));
  const fullYearData = {
    ...overview,
    weeks,
    users: [{
      ...overview.users[0],
      weeks: weeks.map((week) => ({ weekStart: week.startDate, hours: 0, status: 'future' })),
    }],
    summary: { userCount: 1, attentionCount: 0, missingWeekCount: 0, partialWeekCount: 0 },
  };
  const originalWidth = window.innerWidth;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 2000 });
  const view = await renderOverview(jest.fn(), fullYearData);
  const headers = [...view.host.querySelectorAll('[data-week-header]')];
  expect(headers).toHaveLength(53);
  expect(headers.map((header) => header.textContent.trim())).toEqual(getWeekNumbersInMonth(weeks).map(String));
  expect(getComputedStyle(headers[0].querySelector('[role="columnheader"]')).fontSize).toBe('8px');
  view.cleanup();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
});

test('shows one quarter on compact screens and moves focus after switching it', async () => {
  const mobileData = {
    ...overview,
    weeks: [...overview.weeks, { number: 14, startDate: '2026-03-30', endDate: '2026-04-05', month: 4 }],
    users: overview.users.map((user) => ({ ...user, weeks: [...user.weeks, { weekStart: '2026-03-30', hours: 0, status: 'missing' }] })),
  };
  const view = await renderOverview(jest.fn(), mobileData, true);
  const firstQuarter = [...view.host.querySelectorAll('button')].find((button) => button.textContent === '1 кв.');
  await act(async () => { Simulate.click(firstQuarter); await Promise.resolve(); });
  expect(view.host.querySelector('[data-testid="team-week-grid"]').getAttribute('data-week-count')).toBe('2');
  const secondQuarter = [...view.host.querySelectorAll('button')].find((button) => button.textContent === '2 кв.');
  await act(async () => { Simulate.click(secondQuarter); await Promise.resolve(); });
  expect(view.host.querySelector('[data-testid="team-week-grid"]').getAttribute('data-week-count')).toBe('1');
  expect(document.activeElement).toBe(view.host.querySelector('[data-week-cell]'));
  view.cleanup();
});

test('renders accessible week cells and confirms navigation to the selected timesheet', async () => {
  const view = await renderOverview();
  const missingCell = view.host.querySelector('[aria-label*="Иванов Иван"][aria-label*="Не заполнено"]');
  expect(missingCell).not.toBeNull();

  await act(async () => {
    Simulate.click(missingCell);
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(document.body.textContent).toContain('Открыть табель за эту неделю?');
  expect(document.body.textContent).toContain('За эту неделю часов нет.');
  const confirm = [...document.body.querySelectorAll('button')].find((button) => button.textContent === 'Открыть табель');
  act(() => Simulate.click(confirm));

  expect(view.onOpenTimesheet).toHaveBeenCalledWith(7, '2026-01-05');
  view.cleanup();
});

test('shows the selected week category breakdown before opening a timesheet', async () => {
  const view = await renderOverview();
  const completeCell = view.host.querySelector('[data-dominant-category="operations"]');

  await act(async () => {
    Simulate.click(completeCell);
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(document.body.textContent).toContain('Заполнено по категориям');
  expect(document.body.textContent).toContain('Операционная деятельность');
  expect(document.body.textContent).toContain('Внешние проекты');
  expect(document.body.textContent).toContain('OP-1 — Операционный проект');
  expect(document.body.textContent).toContain('EXT-1 — Внешний проект');
  expect(document.body.textContent).toContain('28 ч');
  expect(document.body.textContent).toContain('40 из 40 ч · Заполнено');
  expect(document.body.textContent).toContain('Табель откроется на другой странице.');
  view.cleanup();
});
