import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from '../i18n/I18nProvider';
import SingleProjectWeekEditor from './SingleProjectWeekEditor';
import DepartmentSelect, { normalizeProjectDepartments } from './DepartmentSelect';
import DepartmentChips from './DepartmentChips';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function mount(node) {
  const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
  act(() => root.render(<I18nProvider>{node}</I18nProvider>));
  return { host, close: () => { act(() => root.unmount()); host.remove(); } };
}
test('unassigned new employee has no preselected department and the field is required', () => {
  const view = mount(<DepartmentSelect departments={[{ id: 1, name: 'Без подразделения', is_system: 1 }]} value="" onChange={jest.fn()} />);
  expect(view.host.querySelector('input').value).toBe('');
  expect(view.host.querySelector('input').required).toBe(true);
  view.close();
});
test('lost project access keeps existing historical hours editable and disables empty days', () => {
  const view = mount(<SingleProjectWeekEditor entry={{ project_id: 7, project_name: 'Historical', hours: { mon: 5 }, existingDays: ['mon'] }} projects={[]} daysOfWeek={[{ key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' }]} weekStart={new Date(2026, 9, 5)} onChange={jest.fn()} />);
  const buttons = view.host.querySelectorAll('tbody button');
  expect(buttons[0].disabled).toBe(false); expect(buttons[1].disabled).toBe(false);
  expect(buttons[2].disabled).toBe(true); expect(buttons[3].disabled).toBe(true);
  expect(view.host.textContent).toContain('Historical');
  view.close();
});
test('administrator can correct empty historical days', () => {
  const view = mount(<SingleProjectWeekEditor canOverride entry={{ project_id: 7, project_name: 'Historical', hours: {}, existingDays: [] }} projects={[]} daysOfWeek={[{ key: 'mon', label: 'Mon' }]} weekStart={new Date(2026, 9, 5)} onChange={jest.fn()} />);
  expect(view.host.querySelector('tbody button').disabled).toBe(false);
  view.close();
});

test('ordinary project departments replace the system department; explicitly selecting the system resets ordinary selections', () => {
  const departments = [{ id: 1, is_system: 1 }, { id: 2 }, { id: 3 }];
  expect(normalizeProjectDepartments(departments, [1], [1,2])).toEqual([2]);
  expect(normalizeProjectDepartments(departments, [2], [2,1])).toEqual([1]);
  expect(normalizeProjectDepartments(departments, [2], [2,3])).toEqual([2,3]);
  expect(normalizeProjectDepartments(departments, [2], [])).toEqual([]);
});
test('project department chips display short names while retaining full names for tooltips', () => {
  const view = mount(<DepartmentChips departments={[{ id: 2, name: 'Long department name', short_name: 'DEV' }]} />);
  expect(view.host.querySelector('.MuiChip-label').textContent).toBe('DEV');
  expect(view.host.querySelector('.MuiChip-root').getAttribute('aria-label')).toBe('Long department name');
  view.close();
});
