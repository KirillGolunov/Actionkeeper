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

test('uses the muted Actionplan palette for active work categories', () => {
  expect(PROJECT_CATEGORY_COLORS).toEqual(expect.objectContaining({
    external_delivery: '#6F86D8',
    internal_project: '#8F7CC8',
    operations: '#6FA7A1',
    people_development: '#C9A36F',
  }));
});

test('uses distinct neutral colors for time off and unclassified projects', () => {
  expect(getProjectCategoryColor('time_off')).toBe('#C9CFD9');
  expect(getProjectCategoryColor('unclassified')).toBe('#AEB7C5');
  expect(getProjectCategoryColor('time_off')).not.toBe(getProjectCategoryColor('unclassified'));
  expect(getProjectCategoryChipStyles('unclassified').border).toBe('1px dashed #C5CBD4');
  expect(getProjectCategoryChipStyles('time_off').border).toBe('1px solid #D0D5DD');
});

test('falls back to the unclassified visual family for unknown category keys', () => {
  expect(getProjectCategoryVisual('unknown')).toBe(PROJECT_CATEGORY_VISUALS.unclassified);
  expect(getProjectCategoryColor('unknown')).toBe('#AEB7C5');
  expect(getProjectCategoryTagStyles('unknown')).toBe(PROJECT_CATEGORY_TAG_STYLES.unclassified);
  expect(getProjectCategoryChipStyles('unknown')).toBe(getProjectCategoryChipStyles('unclassified'));
});
