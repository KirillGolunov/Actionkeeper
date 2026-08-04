import { isElementOverflowing } from './OverflowTooltip';

test('does not report overflow when content fits or differs only by the subpixel tolerance', () => {
  expect(isElementOverflowing({
    scrollWidth: 200,
    clientWidth: 200,
    scrollHeight: 40,
    clientHeight: 40,
  })).toBe(false);

  expect(isElementOverflowing({
    scrollWidth: 201,
    clientWidth: 200,
    scrollHeight: 40,
    clientHeight: 40,
  })).toBe(false);
});

test('detects horizontally truncated single-line text', () => {
  expect(isElementOverflowing({
    scrollWidth: 202,
    clientWidth: 200,
    scrollHeight: 20,
    clientHeight: 20,
  }, 'horizontal')).toBe(true);
});

test('ignores line-height rounding when checking single-line text', () => {
  expect(isElementOverflowing({
    scrollWidth: 200,
    clientWidth: 200,
    scrollHeight: 22,
    clientHeight: 20,
  }, 'horizontal')).toBe(false);
});

test('detects vertically truncated multiline text', () => {
  expect(isElementOverflowing({
    scrollWidth: 200,
    clientWidth: 200,
    scrollHeight: 62,
    clientHeight: 40,
  }, 'vertical')).toBe(true);
});
