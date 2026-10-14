import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, Divider, MenuItem, Popover, Typography, useMediaQuery } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export const projectMenuLabelSx = { display: 'block', color: '#7A8699', fontSize: 11.5, lineHeight: 1.15, mb: 0.3, px: 0.5 };
export const projectMenuFieldSx = { minHeight: 36, px: 1.1, py: 0.625, boxSizing: 'border-box', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 };
export function ProjectMenuCheckboxIcon({ checked = false }) {
  return <Box component="span" sx={{ width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '5px', border: checked ? '1px solid #5673DC' : '1px solid #E0E3E8', background: checked ? '#5673DC' : '#FFFFFF', boxShadow: '0 1px 3px rgba(29,36,51,.12)', color: '#FFFFFF' }}>{checked && <Box component="svg" viewBox="0 0 16 16" sx={{ width: 15, height: 15 }}><path d="M3 8l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Box>}</Box>;
}
export function ProjectMenuRadioIcon({ checked = false }) {
  return <Box component="span" sx={{ width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: checked ? '1px solid #5673DC' : '1px solid #E0E3E8', background: '#FFFFFF', boxShadow: '0 1px 3px rgba(29,36,51,.12)' }}>{checked && <Box component="span" sx={{ width: 10, height: 10, borderRadius: '50%', background: '#5673DC' }} />}</Box>;
}

// Render adjacent columns in one popover so moving between levels never loses hover.
export default function ProjectMenu({ anchor, onClose, nodes, footer, label }) {
  const [path, setPath] = useState([]);
  const menuRef = useRef(null);
  const keyboardDepth = useRef(null);
  const [offsets, setOffsets] = useState([0]);
  const updateOffsets = () => {
    const columns = menuRef.current?.querySelectorAll('[data-menu-column]');
    if (narrow || !columns?.length) return;
    const next = [0];
    const rootTop = menuRef.current.getBoundingClientRect().top;
    for (let depth = 1; depth < columns.length; depth++) {
      const parent = columns[depth - 1];
      const row = [...parent.querySelectorAll('[data-menu-node]')].find(item => item.dataset.menuNode === String(path[depth - 1]?.id));
      const rowTop = row ? row.getBoundingClientRect().top - parent.getBoundingClientRect().top - 5 : 0;
      const maxTop = Math.max(0, window.innerHeight - rootTop - columns[depth].getBoundingClientRect().height - 16);
      next.push(Math.max(0, Math.min(next[depth - 1] + rowTop, maxTop)));
    }
    setOffsets(previous => previous.join(',') === next.join(',') ? previous : next);
  };
  useLayoutEffect(updateOffsets);
  useEffect(() => {
    if (keyboardDepth.current !== null) {
      const columns = menuRef.current?.querySelectorAll('[data-menu-column]');
      const column = narrow ? columns?.[0] : columns?.[keyboardDepth.current];
      column?.querySelector('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
      keyboardDepth.current = null;
    }
  });
  const narrow = useMediaQuery('(max-width:700px)');
  const left = anchor?.getBoundingClientRect().left || 0;
  const opensLeft = left > window.innerWidth / 2;
  const levels = [nodes];
  path.forEach(node => {
    const current = levels[levels.length - 1].find(item => item.id === node.id);
    levels.push(current?.children || []);
  });
  const activate = (node, depth) => { if (node.children) setPath([...path.slice(0, depth), node]); else { if (!node.keepOpen) setPath(path.slice(0, depth)); node.onClick?.(); } };
  const visible = narrow ? [{ items: levels[levels.length - 1], depth: levels.length - 1 }] : levels.map((items, depth) => ({ items, depth }));
  return <Popover open={!!anchor} anchorEl={anchor} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: opensLeft ? 'right' : 'left' }} transformOrigin={{ vertical: 'top', horizontal: opensLeft ? 'right' : 'left' }} PaperProps={{ sx: { mt: 0.75, background: 'transparent', boxShadow: 'none', overflow: 'visible', maxWidth: 'calc(100vw - 24px)' } }}>
    <Box ref={menuRef} role="menu" aria-label={label} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexDirection: opensLeft && !narrow ? 'row-reverse' : 'row' }} onKeyDown={e => {
      if (e.key === 'ArrowLeft' && path.length) { setPath(path.slice(0, -1)); e.preventDefault(); }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        const column = e.target.closest('[data-menu-column]');
        const items = Array.from(column?.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])') || []);
        const index = items.indexOf(e.target.closest('[role="menuitem"]'));
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus(); e.preventDefault();
      }
    }}>
      {visible.map(({ items, depth }) => <Box data-menu-column key={depth} onScroll={updateOffsets} sx={{ width: narrow ? 260 : 210, maxWidth: 'calc(100vw - 32px)', maxHeight: 420, overflowY: 'auto', p: 0.5, mt: narrow ? 0 : `${offsets[depth] || 0}px`, background: '#FFFFFF', border: '1px solid #E7EAF0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(29,36,51,.16)', boxSizing: 'border-box' }}>
        {narrow && depth > 0 && <MenuItem onClick={() => setPath(path.slice(0, -1))}><ArrowBackIcon fontSize="small" /><Typography sx={{ ml: 1, fontSize: 13 }}>{path[depth - 1].label}</Typography></MenuItem>}
        {items.map(node => node.divider ? <Divider key={node.id} sx={{ my: 0.5 }} /> : <MenuItem data-menu-node={node.id} key={node.id} role="menuitem" disabled={node.disabled} aria-label={node.label} tabIndex={0} onMouseEnter={() => { if (!node.disabled) setPath(node.children ? [...path.slice(0, depth), node] : path.slice(0, depth)); }} onClick={() => activate(node, depth)} onKeyDown={e => { if (['ArrowRight', 'Enter', ' '].includes(e.key) && node.children) keyboardDepth.current = depth + 1; if (e.key === 'ArrowRight') { e.preventDefault(); activate(node, depth); } }} sx={{ gap: 0.75, px: 0.75, py: 0.75, minHeight: 34, borderRadius: 1, fontSize: 13, background: path[depth]?.id === node.id ? '#F2F4FA' : undefined, '&:hover': { background: '#F2F4FA' }, ...node.sx }}>
          {node.icon}
          <Typography component="span" noWrap sx={{ flex: 1, minWidth: 0, fontSize: 13, color: 'inherit' }}>{node.label}</Typography>
          {node.children && <ChevronRightIcon sx={{ fontSize: 17, color: '#89919C' }} />}
        </MenuItem>)}
        {footer?.(path[depth - 1]?.id, depth)}
      </Box>)}
    </Box>
  </Popover>;
}
