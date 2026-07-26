export const projectCardSurfaceSx = {
  background: 'rgba(255,255,255,0.9)',
  border: '1px solid rgba(214,222,240,0.95)',
  borderRadius: '14px',
  boxShadow: '0 8px 24px rgba(90,112,184,0.08)',
  transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 12px 28px rgba(90,112,184,0.12)',
    borderColor: 'rgba(173,188,228,0.95)',
  },
  '&:focus-visible': {
    outline: '3px solid rgba(86,115,220,0.28)',
    outlineOffset: '2px',
    borderColor: '#5673DC',
  },
};

export const projectCardSelectedSx = {
  transform: 'translateY(-1px)',
  borderColor: 'rgba(173,188,228,0.95)',
  boxShadow: '0 12px 28px rgba(90,112,184,0.12)',
};

export const projectFieldInteractionSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    background: '#FFFFFF',
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(173,188,228,0.95)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#5673DC',
      boxShadow: '0 0 0 3px rgba(86,115,220,0.12)',
    },
  },
};

export const projectActiveSwitchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: '#fff',
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: '#5673DC',
    opacity: 1,
  },
  '& .MuiSwitch-thumb': {
    backgroundColor: '#fff',
    boxShadow: '1',
  },
  '& .MuiSwitch-track': {
    backgroundColor: '#E2E4E9',
    opacity: 1,
  },
};

export const getProjectStatusLabelSx = (active) => ({
  fontWeight: 500,
  fontSize: 13,
  color: active ? '#5673DC' : '#bdbdbd',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  mr: 0.5,
});
