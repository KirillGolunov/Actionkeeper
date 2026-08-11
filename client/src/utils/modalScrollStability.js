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
  '*': {
    scrollbarWidth: 'thin',
    scrollbarColor: '#A7A7A7 transparent',
  },
  '*::-webkit-scrollbar': {
    width: 10,
    height: 10,
  },
  '*::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '*::-webkit-scrollbar-thumb': {
    background: '#A7A7A7',
    borderRadius: 999,
    border: '2px solid transparent',
    backgroundClip: 'content-box',
  },
  '@supports (scrollbar-gutter: stable)': {
    'body[style*="overflow: hidden"]': {
      paddingRight: '0 !important',
    },
  },
};
