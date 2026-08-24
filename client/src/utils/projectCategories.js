export const PROJECT_CATEGORY_ORDER = [
  'unclassified',
  'external_delivery',
  'internal_project',
  'operations',
  'people_development',
  'time_off',
];

export const PROJECT_CATEGORY_OPTIONS = [
  {
    value: 'external_delivery',
    label: '\u0412\u043d\u0435\u0448\u043d\u0438\u0435 \u043f\u0440\u043e\u0435\u043a\u0442\u044b',
    description: '\u041a\u043e\u043c\u043c\u0435\u0440\u0447\u0435\u0441\u043a\u0430\u044f \u0440\u0430\u0431\u043e\u0442\u0430 \u0434\u043b\u044f \u0432\u043d\u0435\u0448\u043d\u0435\u0433\u043e \u0437\u0430\u043a\u0430\u0437\u0447\u0438\u043a\u0430',
  },
  {
    value: 'internal_project',
    label: '\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0435 \u043f\u0440\u043e\u0435\u043a\u0442\u044b',
    description: '\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0435 \u0438\u043d\u0438\u0446\u0438\u0430\u0442\u0438\u0432\u044b \u0438 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0432\u043d\u0443\u0442\u0440\u0438 \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u0438',
  },
  {
    value: 'operations',
    label: '\u041e\u043f\u0435\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u0430\u044f \u0434\u0435\u044f\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c',
    description: '\u0420\u0435\u0433\u0443\u043b\u044f\u0440\u043d\u0430\u044f \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u044f\u044f \u0440\u0430\u0431\u043e\u0442\u0430, \u0441\u043e\u043f\u0440\u043e\u0432\u043e\u0436\u0434\u0435\u043d\u0438\u0435 \u0438 \u0443\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435',
  },
  {
    value: 'people_development',
    label: '\u0420\u0430\u0437\u0432\u0438\u0442\u0438\u0435 \u0438 \u043e\u0431\u043c\u0435\u043d \u043e\u043f\u044b\u0442\u043e\u043c',
    description: '\u041e\u0431\u0443\u0447\u0435\u043d\u0438\u0435, \u043d\u0430\u0441\u0442\u0430\u0432\u043d\u0438\u0447\u0435\u0441\u0442\u0432\u043e \u0438 \u0432\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 knowledge sharing',
  },
  {
    value: 'time_off',
    label: '\u041e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u044f',
    description: '\u041e\u0442\u043f\u0443\u0441\u043a\u0430, \u043f\u0440\u0430\u0437\u0434\u043d\u0438\u043a\u0438, \u0431\u043e\u043b\u044c\u043d\u0438\u0447\u043d\u044b\u0435 \u0438 \u043e\u0442\u0433\u0443\u043b\u044b',
  },
];

export const PROJECT_CATEGORY_TRANSITION = {
  value: 'unclassified',
  label: '\u0422\u0440\u0435\u0431\u0443\u0435\u0442 \u043a\u043b\u0430\u0441\u0441\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438',
  description: '\u0412\u0440\u0435\u043c\u0435\u043d\u043d\u043e\u0435 \u0441\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0434\u043b\u044f \u0441\u0442\u0430\u0440\u044b\u0445 \u043f\u0440\u043e\u0435\u043a\u0442\u043e\u0432',
};

export const PROJECT_CATEGORY_VISUALS = Object.freeze({
  external_delivery: Object.freeze({
    main: '#B892E8', backgroundColor: '#F6F1FC', color: '#714F9C', borderColor: '#E3D7F1', borderStyle: 'solid',
  }),
  internal_project: Object.freeze({
    main: '#8296E0', backgroundColor: '#EEF0FC', color: '#5266B0', borderColor: '#D3D9F5', borderStyle: 'solid',
  }),
  operations: Object.freeze({
    main: '#A8AFBC', backgroundColor: '#F2F3F5', color: '#5F6878', borderColor: '#D8DCE3', borderStyle: 'solid',
  }),
  people_development: Object.freeze({
    main: '#B9C5EE', backgroundColor: '#F5F7FD', color: '#6677B8', borderColor: '#E3E8F8', borderStyle: 'solid',
  }),
  time_off: Object.freeze({
    main: '#E2E4E9', backgroundColor: '#F9FAFB', color: '#667085', borderColor: '#EAECF0', borderStyle: 'solid',
  }),
  unclassified: Object.freeze({
    main: '#C5C9D2', backgroundColor: '#F5F6F8', color: '#667085', borderColor: '#D6DAE1', borderStyle: 'dashed',
  }),
});

export const PROJECT_CATEGORY_COLORS = Object.freeze(Object.fromEntries(
  Object.entries(PROJECT_CATEGORY_VISUALS).map(([key, visual]) => [key, visual.main])
));

export const PROJECT_CATEGORY_TAG_STYLES = Object.freeze(Object.fromEntries(
  Object.entries(PROJECT_CATEGORY_VISUALS).map(([key, visual]) => [key, Object.freeze({
    backgroundColor: visual.backgroundColor,
    color: visual.color,
  })])
));

export const PROJECT_CATEGORY_CHIP_STYLES = Object.freeze(Object.fromEntries(
  Object.entries(PROJECT_CATEGORY_VISUALS).map(([key, visual]) => [key, Object.freeze({
    backgroundColor: visual.backgroundColor,
    color: visual.color,
    border: `1px ${visual.borderStyle} ${visual.borderColor}`,
  })])
));

const categoryMap = new Map(
  [...PROJECT_CATEGORY_OPTIONS, PROJECT_CATEGORY_TRANSITION].map((category) => [category.value, category])
);

export function getProjectCategoryMeta(categoryValue) {
  return categoryMap.get(categoryValue) || PROJECT_CATEGORY_TRANSITION;
}

export function getProjectCategoryLabel(categoryValue, t) {
  return t?.(`projectCategories.${categoryValue}`)
    || getProjectCategoryMeta(categoryValue).label;
}

export function getProjectCategoryVisual(categoryValue) {
  return PROJECT_CATEGORY_VISUALS[categoryValue] || PROJECT_CATEGORY_VISUALS.unclassified;
}

export function getProjectCategoryColor(categoryValue) {
  return getProjectCategoryVisual(categoryValue).main;
}

export function getProjectCategoryTagStyles(categoryValue) {
  return PROJECT_CATEGORY_TAG_STYLES[categoryValue] || PROJECT_CATEGORY_TAG_STYLES.unclassified;
}

export function getProjectCategoryChipStyles(categoryValue) {
  return PROJECT_CATEGORY_CHIP_STYLES[categoryValue] || PROJECT_CATEGORY_CHIP_STYLES.unclassified;
}
