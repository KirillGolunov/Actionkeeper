import {
  PROJECT_CATEGORY_COLORS,
  PROJECT_CATEGORY_ORDER,
  PROJECT_CATEGORY_TAG_STYLES,
  PROJECT_CATEGORY_VISUALS,
  getProjectCategoryChipStyles,
  getProjectCategoryColor,
  getProjectCategoryTagStyles,
  getProjectCategoryVisual,
} from './projectCategories';

test('defines chart and subtle colors for every project category', () => {
  PROJECT_CATEGORY_ORDER.forEach((category) => {
    expect(PROJECT_CATEGORY_VISUALS[category]).toEqual(expect.objectContaining({
      main: expect.any(String),
      backgroundColor: expect.any(String),
      color: expect.any(String),
      borderColor: expect.any(String),
    }));
    expect(PROJECT_CATEGORY_COLORS[category]).toBe(PROJECT_CATEGORY_VISUALS[category].main);
    expect(PROJECT_CATEGORY_TAG_STYLES[category]).toEqual(expect.objectContaining({
      backgroundColor: expect.any(String),
      color: expect.any(String),
    }));
  });
});

test('uses the prioritized Actionplan palette for work categories', () => {
  expect(PROJECT_CATEGORY_COLORS).toEqual(expect.objectContaining({
    external_delivery: '#B892E8',
    internal_project: '#8296E0',
    operations: '#A8AFBC',
    people_development: '#B9C5EE',
  }));
});

test('uses distinct neutral colors for time off and unclassified projects', () => {
  expect(getProjectCategoryColor('time_off')).toBe('#E2E4E9');
  expect(getProjectCategoryColor('unclassified')).toBe('#C5C9D2');
  expect(getProjectCategoryColor('time_off')).not.toBe(getProjectCategoryColor('unclassified'));
  expect(getProjectCategoryChipStyles('unclassified').border).toBe('1px dashed #D6DAE1');
  expect(getProjectCategoryChipStyles('time_off').border).toBe('1px solid #EAECF0');
});

test('falls back to the unclassified visual family for unknown category keys', () => {
  expect(getProjectCategoryVisual('unknown')).toBe(PROJECT_CATEGORY_VISUALS.unclassified);
  expect(getProjectCategoryColor('unknown')).toBe('#C5C9D2');
  expect(getProjectCategoryTagStyles('unknown')).toBe(PROJECT_CATEGORY_TAG_STYLES.unclassified);
  expect(getProjectCategoryChipStyles('unknown')).toBe(getProjectCategoryChipStyles('unclassified'));
});
