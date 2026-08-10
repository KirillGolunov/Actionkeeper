import React, { act } from 'react';
import { Simulate } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { Table, TableHead, TableRow } from '@mui/material';
import { ru } from 'date-fns/locale';
import EmbeddedWeekTableHeading from '../components/EmbeddedWeekTableHeading';
import HourInput from '../components/HourInput';
import { buildPayrollSaveNotice, buildWeeklyValidationIssues } from '../utils/timeEntryNotices';

function renderHeading(onWeekChange = jest.fn()) {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(
    <Table>
      <TableHead>
        <TableRow>
          <EmbeddedWeekTableHeading
            weekStart={new Date(2026, 7, 3)}
            dateLocale={ru}
            onWeekChange={onWeekChange}
          />
        </TableRow>
      </TableHead>
    </Table>
  ));
  return {
    host,
    onWeekChange,
    cleanup() {
      act(() => root.unmount());
      host.remove();
      delete window.IS_REACT_ACT_ENVIRONMENT;
    },
  };
}

test('renders week controls in one cell spanning the index and project columns', () => {
  const view = renderHeading();
  const cell = view.host.querySelector('[data-testid="embedded-week-table-heading"]');

  expect(cell).not.toBeNull();
  expect(cell.colSpan).toBe(2);
  expect(cell.textContent).toContain('Часы по проектам');
  expect(cell.textContent).toContain('3 августа — 9 августа');
  expect(view.host.querySelectorAll('th')).toHaveLength(1);

  view.cleanup();
});

test('moves to the previous and next week from the table heading', () => {
  const view = renderHeading();
  const previous = view.host.querySelector('[aria-label="Предыдущая неделя"]');
  const next = view.host.querySelector('[aria-label="Следующая неделя"]');

  act(() => Simulate.click(previous));
  act(() => Simulate.click(next));

  expect(view.onWeekChange).toHaveBeenNthCalledWith(1, new Date(2026, 6, 27));
  expect(view.onWeekChange).toHaveBeenNthCalledWith(2, new Date(2026, 7, 10));

  view.cleanup();
});

function renderHourInput(props = {}) {
  window.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const onChange = props.onChange || jest.fn();
  act(() => root.render(
    <HourInput
      value={props.value ?? 8}
      onChange={onChange}
      changed={props.changed}
      invalid={props.invalid}
      disabled={props.disabled}
      decrementLabel="decrement"
      incrementLabel="increment"
    />
  ));
  return {
    host,
    onChange,
    cleanup() {
      act(() => root.unmount());
      host.remove();
      delete window.IS_REACT_ACT_ENVIRONMENT;
    },
  };
}

test('changes a saved hour value on the first button click', () => {
  const view = renderHourInput({ value: 8 });

  act(() => Simulate.click(view.host.querySelector('[aria-label="increment"]')));

  expect(view.onChange).toHaveBeenCalledWith(9);
  view.cleanup();
});

test('marks draft cells and enforces the 0–24 hour bounds', () => {
  const lowerBound = renderHourInput({ value: 0, changed: true });
  expect(lowerBound.host.querySelector('[data-changed="true"]')).not.toBeNull();
  expect(lowerBound.host.querySelector('[aria-label="decrement"]').disabled).toBe(true);
  lowerBound.cleanup();

  const upperBound = renderHourInput({ value: 24 });
  expect(upperBound.host.querySelector('[aria-label="increment"]').disabled).toBe(true);
  upperBound.cleanup();
});

test('marks invalid hour controls without losing the draft state', () => {
  const view = renderHourInput({ value: 0, changed: true, invalid: true });

  expect(view.host.querySelector('[data-changed="true"][data-invalid="true"]')).not.toBeNull();
  view.cleanup();
});

test('returns a contextual validation issue for an all-zero project row', () => {
  const row = {
    id: 'row-1',
    project_id: 7,
    hours: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((key) => [key, { value: '' }])),
  };
  const issues = buildWeeklyValidationIssues({
    rows: [row],
    selectedUser: 2,
    weekStart: new Date(2026, 7, 10),
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((key) => ({ key, label: key })),
    projects: [{ id: 7, code: 'AA7709', name: 'ПРО-ВСМ' }],
    t: (key) => key,
  });

  expect(issues).toHaveLength(1);
  expect(issues[0]).toMatchObject({ type: 'zeroHours', rowId: 'row-1' });
  expect(issues[0].message).toContain('AA7709 - ПРО-ВСМ');
});

test('builds role-aware payroll notices and deduplicates projects', () => {
  const projects = [{ id: 7, code: 'AA7709', name: 'ПРО-ВСМ', manager_user_id: 2 }];
  const warnings = [{ projectId: 7 }, { projectId: 7 }];

  const managerNotice = buildPayrollSaveNotice(warnings, projects, { id: 2, role: 'user' });
  expect(managerNotice.message).toContain('AA7709 - ПРО-ВСМ');
  expect(managerNotice.actionLabel).toBe('Открыть бюджет');
  expect(managerNotice.actionPath).toBe('/projects?projectId=7&budget=1');

  const userNotice = buildPayrollSaveNotice(warnings, projects, { id: 3, role: 'user' });
  expect(userNotice.actionLabel).toBe('Понятно');
  expect(userNotice.actionPath).toBeNull();
  expect(userNotice.message).toContain('Изменять запись не нужно');
});
