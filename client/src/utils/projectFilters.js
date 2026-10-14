import { PROJECT_CATEGORY_ORDER, PROJECT_CATEGORY_TRANSITION } from './projectCategories';

export const defaultProjectFilters = () => ({ scope: 'all', active: true, closed: false, requiresDecision: false, ...Object.fromEntries(PROJECT_CATEGORY_ORDER.map(key => [key, false])) });

export function filterProjectCatalog(projects, filters, userId, pendingIds) {
  const categories = PROJECT_CATEGORY_ORDER.filter(key => filters[key]);
  return projects.filter(project => {
    if (filters.scope === 'managed' && Number(project.manager_user_id) !== Number(userId)) return false;
    if (filters.scope === 'participated' && !project.has_my_time_entries) return false;
    if (filters.scope.startsWith('department:') && !project.departments?.some(d => Number(d.id) === Number(filters.scope.split(':')[1]))) return false;
    if (filters.requiresDecision && !pendingIds.has(Number(project.id))) return false;
    if (!(project.active ? filters.active : filters.closed)) return false;
    return !categories.length || categories.includes(project.category || PROJECT_CATEGORY_TRANSITION.value);
  });
}

export function availableProjectDepartments(departments, projects, user) {
  const used = new Set(projects.flatMap(p => (p.departments || []).map(d => Number(d.id))));
  const managed = new Set((user?.managedDepartmentIds || []).map(Number));
  const priority = d => d.is_system ? 3 : Number(d.id) === Number(user?.department_id) ? 0 : managed.has(Number(d.id)) ? 1 : 2;
  return departments.filter(d => !d.archived_at && (user?.role === 'admin' || used.has(Number(d.id))))
    .sort((a, b) => priority(a) - priority(b));
}

export function defaultProjectScope(departments, user) {
  const managed = new Set((user?.managedDepartmentIds || []).map(Number));
  const department = departments.find(d => managed.has(Number(d.id))) || departments.find(d => Number(d.id) === Number(user?.department_id));
  return department ? `department:${department.id}` : 'all';
}
