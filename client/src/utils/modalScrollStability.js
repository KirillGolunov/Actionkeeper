export const modalScrollStabilityStyles = {
  html: {
    height: '100%',
    overflow: 'hidden',
  },
  body: {
    height: '100%',
    overflow: 'hidden',
    margin: 0,
  },
  '#root': {
    height: '100%',
    overflow: 'hidden',
  },
  '@supports (scrollbar-gutter: stable)': {
    'body[style*="overflow: hidden"]': {
      paddingRight: '0 !important',
    },
  },
};
