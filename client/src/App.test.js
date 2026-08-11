import { appTheme } from './appTheme';

test('uses the shared light tooltip theme', () => {
  const tooltip = appTheme.components.MuiTooltip.styleOverrides.tooltip;
  const arrow = appTheme.components.MuiTooltip.styleOverrides.arrow;

  expect(tooltip).toMatchObject({
    color: '#1D2433',
    backgroundColor: '#FFFFFF',
    border: '1px solid #DDE3EC',
    borderRadius: 8,
  });
  expect(arrow.color).toBe('#FFFFFF');
});
