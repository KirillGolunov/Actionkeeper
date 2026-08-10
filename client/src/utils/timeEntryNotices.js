const getProjectDisplay = (project) => {
  if (!project) return '';
  return project.code ? `${project.code} - ${project.name}` : project.name;
};

export function buildWeeklyValidationIssues({ rows, selectedUser, weekStart, days, projects, t }) {
  if (!selectedUser) {
    return [{ type: 'user', message: t('timeEntries.validation.selectUserBeforeSubmit') }];
  }
  if (!rows.length) {
    return [{ type: 'emptyWeek', message: t('timeEntries.validation.addOneProject') }];
  }

  const issues = [];
  const seen = new Map();
  rows.forEach((entry, rowIndex) => {
    const project = projects.find((item) => Number(item.id) === Number(entry.project_id));
    const projectName = getProjectDisplay(project) || entry.project_name || t('timeEntries.project');
    if (!entry.project_id) {
      issues.push({
        type: 'missingProject', rowId: entry.id, rowIndex,
        message: t('timeEntries.validation.projectForEachRow'),
      });
      return;
    }

    const duplicateKey = `${selectedUser}|${entry.project_id}|${new Date(weekStart).toISOString()}`;
    if (seen.has(duplicateKey)) {
      issues.push({
        type: 'duplicateProject', rowId: entry.id, rowIndex,
        message: t('timeEntries.validation.noDuplicateProjects'),
      });
    } else {
      seen.set(duplicateKey, rowIndex);
    }

    let totalHours = 0;
    days.forEach((day) => {
      const value = entry.hours?.[day.key]?.value;
      const numericValue = value === '' || value === undefined ? 0 : Number(value);
      if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 24) {
        issues.push({
          type: 'invalidHours', rowId: entry.id, rowIndex, dayKey: day.key,
          message: t('timeEntries.validation.invalidHours', { day: day.label }),
        });
      } else {
        totalHours += numericValue;
      }
    });

    if (totalHours === 0) {
      issues.push({
        type: 'zeroHours', rowId: entry.id, rowIndex,
        message: `Добавьте часы в проект «${projectName}» или удалите пустую строку через ⋮`,
      });
    }
  });
  return issues;
}

export function buildPayrollSaveNotice(warnings, projects, currentUser) {
  const uniqueWarnings = Array.from(new Map(
    (warnings || []).filter((warning) => warning?.projectId).map((warning) => [Number(warning.projectId), warning])
  ).values());
  if (!uniqueWarnings.length) return null;

  const warningProjects = uniqueWarnings.map((warning) => {
    const project = projects.find((item) => Number(item.id) === Number(warning.projectId));
    return {
      id: Number(warning.projectId),
      label: getProjectDisplay(project) || `Проект #${warning.projectId}`,
      canManage: currentUser?.role === 'admin'
        || Number(project?.manager_user_id) === Number(currentUser?.id),
    };
  });
  const visibleNames = warningProjects.slice(0, 2).map((project) => `«${project.label}»`).join(', ');
  const moreCount = Math.max(0, warningProjects.length - 2);
  const projectText = warningProjects.length === 1
    ? `В проекте ${visibleNames}`
    : `В проектах ${visibleNames}${moreCount ? ` и ещё ${moreCount}` : ''}`;
  const canManage = warningProjects.some((project) => project.canManage);

  return {
    severity: 'warning',
    autoHideDuration: 8000,
    message: `Часы сохранены. ${projectText} лимит ФОТ достигнут или превышен. ${canManage
      ? 'Проверьте бюджет проекта и при необходимости измените лимит.'
      : 'Изменять запись не нужно — руководитель проекта и администраторы уведомлены.'}`,
    actionLabel: canManage
      ? (warningProjects.length === 1 ? 'Открыть бюджет' : 'Открыть проекты')
      : 'Понятно',
    actionPath: canManage
      ? (warningProjects.length === 1
        ? `/projects?projectId=${warningProjects[0].id}&budget=1`
        : '/projects')
      : null,
  };
}
