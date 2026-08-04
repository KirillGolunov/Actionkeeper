export const modalScrollStabilityStyles = {
  html: {
    scrollbarGutter: 'stable',
  },
  body: {
    overflowY: 'scroll',
  },
  '@supports (scrollbar-gutter: stable)': {
    'body[style*="overflow: hidden"]': {
      paddingRight: '0 !important',
    },
  },
};
