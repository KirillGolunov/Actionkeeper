import { modalScrollStabilityStyles } from './modalScrollStability';

test('keeps a stable gutter and suppresses only the redundant MUI modal compensation', () => {
  expect(modalScrollStabilityStyles.html.scrollbarGutter).toBe('stable');
  expect(modalScrollStabilityStyles.body.overflowY).toBe('scroll');
  expect(
    modalScrollStabilityStyles['@supports (scrollbar-gutter: stable)']['body[style*="overflow: hidden"]'].paddingRight
  ).toBe('0 !important');
  expect(modalScrollStabilityStyles.body.paddingRight).toBeUndefined();
});
