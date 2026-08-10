import { modalScrollStabilityStyles } from './modalScrollStability';

test('locks document scrolling while keeping scrolling inside application modules', () => {
  expect(modalScrollStabilityStyles.html.height).toBe('100%');
  expect(modalScrollStabilityStyles.html.overflow).toBe('hidden');
  expect(modalScrollStabilityStyles.body.overflow).toBe('hidden');
  expect(modalScrollStabilityStyles['#root'].height).toBe('100%');
  expect(
    modalScrollStabilityStyles['@supports (scrollbar-gutter: stable)']['body[style*="overflow: hidden"]'].paddingRight
  ).toBe('0 !important');
  expect(modalScrollStabilityStyles.body.paddingRight).toBeUndefined();
});
