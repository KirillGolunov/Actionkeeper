import { availableProjectDepartments, defaultProjectFilters, defaultProjectScope, filterProjectCatalog } from './projectFilters';

const projects = [
  { id: 1, active: 1, category: 'operations', manager_user_id: 5, has_my_time_entries: 0, is_my_project: 1, departments: [{ id: 2 }] },
  { id: 2, active: 1, category: 'internal_project', manager_user_id: 7, has_my_time_entries: 1, departments: [{ id: 2 }, { id: 3 }] },
  { id: 3, active: 0, has_my_time_entries: 1, departments: [{ id: 1 }] },
];
const visible = changes => filterProjectCatalog(projects, { ...defaultProjectFilters(), ...changes }, 5, new Set([2])).map(p => p.id);

test('personal participation is independent from management and governance flags', () => {
  expect(visible({})).toEqual([1, 2]);
  expect(visible({ scope: 'participated' })).toEqual([2]);
  expect(visible({ scope: 'managed' })).toEqual([1]);
  expect(visible({ scope: 'department:3' })).toEqual([2]);
});

test('status, categories and pending decisions combine without broadening the catalog', () => {
  expect(visible({ scope: 'department:2', requiresDecision: true, internal_project: true })).toEqual([2]);
  expect(visible({ scope: 'managed', requiresDecision: true })).toEqual([]);
  expect(visible({ active: false, closed: true, unclassified: true })).toEqual([3]);
  expect(visible({ active: false, closed: false })).toEqual([]);
});

test('department ordering prioritizes own and managed departments, deduplicates, and keeps system last', () => {
  const dirs = [{ id: 1, is_system: 1 }, { id: 4 }, { id: 3 }, { id: 2 }, { id: 9, archived_at: '2026-01-01' }];
  expect(availableProjectDepartments(dirs, projects, { role: 'admin', department_id: 3, managedDepartmentIds: [3, 2] }).map(d => d.id)).toEqual([3, 2, 4, 1]);
  expect(availableProjectDepartments(dirs, projects, { role: 'user', department_id: 3 }).map(d => d.id)).toEqual([3, 2, 1]);
  expect(dirs.map(d => d.id)).toEqual([1, 4, 3, 2, 9]);
});

test('initial scope selects first managed department in menu order, then own, then all', () => {
  const dirs=[{id:4},{id:2},{id:1,is_system:1}];
  expect(defaultProjectScope(dirs,{department_id:1,managedDepartmentIds:[2,4]})).toBe('department:4');
  expect(defaultProjectScope(dirs,{department_id:1,managedDepartmentIds:[]})).toBe('department:1');
  expect(defaultProjectScope(dirs,{department_id:9})).toBe('all');
});
