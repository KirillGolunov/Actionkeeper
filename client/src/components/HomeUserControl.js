import React, { useId, useRef, useState } from 'react';
import {
  Box,
  ButtonBase,
  ClickAwayListener,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  Tooltip,
  Typography,
} from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { useTranslation } from '../i18n/I18nProvider';

export function getUserDisplayName(user) {
  if (!user) return '';
  return [user.surname, user.name].filter(Boolean).join(' ') || user.email || '';
}

export default function HomeUserControl({ currentUser, users = [], value, onChange, loading = false, error = '', forceDropdown = false, disabled: disabledProp = false }) {
  const { t } = useTranslation();
  const triggerRef = useRef(null);
  const menuId = `home-user-menu-${useId().replace(/:/g, '')}`;
  const [open, setOpen] = useState(false);
  const isAdmin = currentUser?.role === 'admin';
  const options = users.length ? users : currentUser ? [currentUser] : [];
  const selectedUser = options.find((user) => String(user.id) === String(value)) || currentUser || options[0];
  const selectedName = getUserDisplayName(selectedUser);
  const disabled = disabledProp || loading || Boolean(error) || options.length === 0;

  if (!isAdmin && !forceDropdown) {
    const name = getUserDisplayName(currentUser);
    return (
      <Tooltip title={name} placement="bottom" arrow>
        <Typography
          noWrap
          aria-label={t('homeUser.current', { name })}
          sx={{ minWidth: 0, maxWidth: { xs: '100%', sm: 320 }, fontSize: 14, lineHeight: '20px', fontWeight: 500, color: '#1D2433' }}
        >
          {name}
        </Typography>
      </Tooltip>
    );
  }

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const selectUser = (userId) => {
    onChange?.(userId);
    closeMenu(true);
  };

  const openFromKeyboard = (event) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      if (!disabled) setOpen(true);
    }
  };

  const field = (
    <ButtonBase
      ref={triggerRef}
      id="home-user-trigger"
      role="combobox"
      aria-label={t('homeUser.user')}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      disabled={disabled}
      onClick={() => setOpen((current) => !current)}
      onKeyDown={openFromKeyboard}
      sx={{
        width: { xs: '100%', sm: 280 },
        minWidth: { xs: 0, sm: 220 },
        maxWidth: { xs: '100%', sm: 280 },
        height: 40,
        px: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        border: `1px solid ${error ? '#D92D20' : '#E2E4E9'}`,
        borderRadius: '8px',
        bgcolor: '#FFFFFF',
        color: '#424957',
        boxShadow: 'none',
        '&:hover': { borderColor: disabled ? (error ? '#D92D20' : '#E2E4E9') : '#C5C9D3', bgcolor: '#FFFFFF' },
        '&.Mui-focusVisible': { borderColor: '#4A68D9', borderWidth: 1, boxShadow: 'none' },
        '&.Mui-disabled': { bgcolor: '#F7F8FA', color: '#98A2B3' },
      }}
    >
      <Typography noWrap title={selectedName} sx={{ minWidth: 0, fontSize: 14, lineHeight: '20px', fontWeight: 400, color: 'inherit' }}>
        {selectedName}
      </Typography>
      <KeyboardArrowDownRoundedIcon aria-hidden="true" sx={{ width: 20, height: 20, flexShrink: 0, color: '#7F899E', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms ease' }} />
    </ButtonBase>
  );

  return (
    <>
      {error ? (
        <Tooltip title={t('homeUser.loadError')} placement="bottom" arrow>
          <Box component="span" sx={{ display: 'block', width: '100%', maxWidth: { xs: '100%', sm: 280 } }}>
            {field}
          </Box>
        </Tooltip>
      ) : field}
      <Popper
        open={open}
        anchorEl={triggerRef.current}
        placement="bottom-start"
        modifiers={[
          { name: 'offset', options: { offset: [0, 0] } },
          { name: 'flip', enabled: true, options: { fallbackPlacements: ['top-start'] } },
          { name: 'preventOverflow', enabled: true, options: { padding: 8 } },
        ]}
        sx={{ zIndex: 1500 }}
      >
        <ClickAwayListener onClickAway={() => closeMenu()}>
          <Paper
            elevation={0}
            sx={{
              width: triggerRef.current?.getBoundingClientRect().width || 280,
              overflow: 'hidden',
              border: '1px solid #E2E4E9',
              borderRadius: '8px',
              bgcolor: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(31,42,68,.14)',
            }}
          >
            <MenuList
              id={menuId}
              role="listbox"
              aria-labelledby="home-user-trigger"
              autoFocusItem
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  closeMenu(true);
                }
                if (event.key === 'Tab') closeMenu();
              }}
              sx={{
                p: 0,
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {options.map((user) => {
                const name = getUserDisplayName(user);
                const selected = String(user.id) === String(value);
                return (
                  <MenuItem
                    key={user.id}
                    role="option"
                    selected={selected}
                    aria-selected={selected}
                    onClick={() => selectUser(user.id)}
                    sx={{
                      height: 44,
                      minHeight: '44px !important',
                      px: 1.5,
                      gap: 0.75,
                      bgcolor: selected ? '#F7F8FD' : '#FFFFFF',
                      '&.Mui-selected': { bgcolor: '#F7F8FD' },
                      '&.Mui-selected:hover': { bgcolor: '#F7F8FA' },
                      '&:hover': { bgcolor: '#F7F8FA' },
                      '&.Mui-focusVisible': { bgcolor: '#F7F8FD', boxShadow: 'inset 0 0 0 2px rgba(74,105,217,.25)' },
                    }}
                  >
                    <Tooltip title={name} placement="right" arrow>
                      <Typography noWrap sx={{ minWidth: 0, flex: 1, fontSize: 13, lineHeight: '18px', color: user.deleted ? '#98A2B3' : '#424957' }}>
                        {name}
                      </Typography>
                    </Tooltip>
                    {user.deleted ? <Typography sx={{ flexShrink: 0, fontSize: 11, lineHeight: '16px', color: '#98A2B3' }}>{t('homeUser.deleted')}</Typography> : null}
                  </MenuItem>
                );
              })}
            </MenuList>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </>
  );
}
