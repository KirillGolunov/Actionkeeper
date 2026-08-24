import React from 'react';
import { Box, Button, IconButton, Paper, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { keyframes } from '@emotion/react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../i18n/I18nProvider';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  { id: 'home-nav', target: '[data-product-tour="home-nav"]', title: 'homeNav', isComplete: () => window.location.pathname === '/' },
  { id: 'home-period', target: '#mine-analytics-range-12m-tab', highlight: '[data-product-tour="home-time-structure"], [data-product-tour="home-project-distribution"]', outline: '[data-product-tour="home-analytics-period"]', groupHighlight: true, title: 'homePeriod', isComplete: () => document.querySelector('#mine-analytics-range-12m-tab')?.getAttribute('aria-selected') === 'true' },
  { id: 'home-category', target: '[data-product-tour="home-time-structure"] [data-flow-tour-column="true"] [data-flow-segment]', highlight: '[data-product-tour="home-time-structure"], [data-product-tour="home-project-distribution"]', outline: '[data-product-tour="home-time-structure"] [data-flow-tour-column="true"]', groupHighlight: true, title: 'homeCategory', isComplete: (target) => Boolean(target?.getAttribute('data-flow-segment') && document.querySelector(`[data-product-tour="home-project-distribution"] [data-selected-project-category="${target.getAttribute('data-flow-segment')}"]`)) },
  { id: 'analytics-nav', target: '[data-product-tour="analytics-nav"]', title: 'analyticsNav', isComplete: () => window.location.pathname.startsWith('/analytics') },
  { id: 'analytics', target: '[data-product-tour="analytics-tab"]', title: 'analytics', isComplete: () => Boolean(document.querySelector('[data-product-tour="time-structure"]')) },
  { id: 'categories', target: '[data-product-tour="time-structure"] [data-flow-tour-segment="true"]', highlight: '[data-product-tour="time-structure"], [data-product-tour="clients"], [data-product-tour="tornado"], [data-product-tour="projects"]', outline: '[data-product-tour="time-structure"] [data-flow-tour-segment="true"]', groupHighlight: true, title: 'categories', isComplete: (target) => Boolean(target?.getAttribute('data-flow-segment') && document.querySelector(`[data-selected-project-category="${target.getAttribute('data-flow-segment')}"]`)) },
  { id: 'category-filter-result', target: '[data-selected-project-category]', highlight: '[data-product-tour="time-structure"], [data-product-tour="clients"], [data-product-tour="tornado"], [data-product-tour="projects"]', outline: '[data-selected-project-category]', groupHighlight: true, title: 'categoryFilterResult', action: 'advance' },
  { id: 'clients', target: '[data-product-tour="clients"] [data-client-tour-filter="true"]', highlight: '[data-product-tour="time-structure"], [data-product-tour="clients"], [data-product-tour="tornado"], [data-product-tour="projects"]', outline: '[data-product-tour="clients"] [data-client-tour-filter="true"]', groupHighlight: true, title: 'clients', isComplete: (target) => Boolean(target?.getAttribute('data-client-filter') && document.querySelector(`[data-selected-project-client="${target.getAttribute('data-client-filter')}"]`)) },
  { id: 'tornado', target: '[data-product-tour="tornado"]', title: 'tornado', action: 'advance' },
  { id: 'project', target: '[data-product-tour="projects"] [data-product-tour="project-row"]', highlight: '[data-product-tour="projects"]', outline: '[data-product-tour="projects"] [data-product-tour="project-row"]', title: 'project', isComplete: () => Boolean(document.querySelector('[data-product-tour="project-hours-tab"]')) },
  { id: 'project-overview', target: '[data-product-tour="project-dialog"]', title: 'projectOverview', action: 'close-project', isComplete: () => !document.querySelector('[data-product-tour="project-dialog"]') },
  { id: 'completion', target: '[data-product-tour="completion-tab"]', title: 'completion', isComplete: () => Boolean(document.querySelector('[data-product-tour="heatmap"]')) },
  { id: 'week-detail', target: '[data-product-tour="heatmap"] [data-week-tour-filled="true"]', highlight: '[data-product-tour="heatmap"]', outline: '[data-product-tour="heatmap"] [data-week-tour-filled="true"]', title: 'weekDetail', isComplete: () => Boolean(document.querySelector('[data-product-tour="week-detail-dialog"]')) },
  { id: 'close-week-detail', target: '[data-product-tour="week-detail-dialog"] button[aria-label]', title: 'closeWeekDetail', isComplete: () => !document.querySelector('[data-product-tour="week-detail-dialog"]') },
];

const getTarget = (selector) => (selector ? document.querySelector(selector) : null);
const getTargets = (selector) => (selector ? [...document.querySelectorAll(selector)] : []);
const clickPulseAnimation = keyframes`
  0% { transform: translate(-50%, -50%) scale(.5); opacity: 0; }
  18% { opacity: .8; }
  100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
`;
const tooltipAnimation = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export default function ProductTour({ open, onClose, onComplete }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [index, setIndex] = React.useState(0);
  const [tourSteps, setTourSteps] = React.useState(STEPS);
  const [rect, setRect] = React.useState(null);
  const [highlightRects, setHighlightRects] = React.useState([]);
  const [outlineRects, setOutlineRects] = React.useState([]);
  const [awaitingResult, setAwaitingResult] = React.useState(false);
  const [clickedTarget, setClickedTarget] = React.useState(null);
  const [categoryResultVisible, setCategoryResultVisible] = React.useState(false);
  const [clientResultVisible, setClientResultVisible] = React.useState(false);
  const [clickPulse, setClickPulse] = React.useState(null);
  const [isAnimatingAction, setIsAnimatingAction] = React.useState(false);
  const closeButton = React.useRef(null);
  const actionTimer = React.useRef(null);
  const lastGeometry = React.useRef(null);
  const step = tourSteps[index];
  const advance = React.useCallback(() => {
    if (actionTimer.current) {
      window.clearTimeout(actionTimer.current);
      actionTimer.current = null;
    }
    setAwaitingResult(false); setClickedTarget(null); setCategoryResultVisible(false); setClientResultVisible(false); setIsAnimatingAction(false); setClickPulse(null);
    if (index === tourSteps.length - 1) onComplete?.(); else setIndex((value) => value + 1);
  }, [index, onComplete, tourSteps.length]);
  const runCurrentStep = React.useCallback(() => {
    if (index === tourSteps.length - 1) {
      advance();
      return;
    }
    if (step?.action === 'advance') {
      advance();
      return;
    }
    if (step?.action === 'close-project') {
      const closeTarget = getTarget('[data-product-tour="project-dialog-close"]');
      if (!closeTarget) {
        advance();
        return;
      }
      const targetRect = closeTarget.getBoundingClientRect();
      setClickPulse({ x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 });
      setAwaitingResult(true);
      setIsAnimatingAction(true);
      actionTimer.current = window.setTimeout(() => {
        closeTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        setIsAnimatingAction(false);
        setClickPulse(null);
      }, 300);
      return;
    }
    if (step?.id === 'home-category' && categoryResultVisible) {
      advance();
      return;
    }
    if (step?.id === 'clients' && clientResultVisible) {
      advance();
      return;
    }
    const actionTarget = getTarget(step?.target);
    if (!actionTarget) {
      advance();
      return;
    }
    setClickedTarget(actionTarget);
    setAwaitingResult(true);
    const targetRect = actionTarget.getBoundingClientRect();
    setClickPulse({ x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 });
    setIsAnimatingAction(true);
    actionTimer.current = window.setTimeout(() => {
      actionTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      setIsAnimatingAction(false);
      setClickPulse(null);
    }, 300);
  }, [advance, categoryResultVisible, clientResultVisible, index, step?.action, step?.id, step?.target, tourSteps.length]);
  const updateRect = React.useCallback(() => {
    const nextTarget = getTarget(step?.target);
    if (!nextTarget) {
      if (['home-category', 'category-filter-result', 'clients'].includes(step?.id) && lastGeometry.current) {
        setRect(lastGeometry.current.rect);
        setHighlightRects(lastGeometry.current.highlightRects);
        setOutlineRects(lastGeometry.current.outlineRects);
        return;
      }
      setRect(null);
      setHighlightRects([]);
      setOutlineRects([]);
      return;
    }
    const nextRect = nextTarget.getBoundingClientRect();
    if (nextRect.bottom < 0 || nextRect.top > window.innerHeight || nextRect.right < 0 || nextRect.left > window.innerWidth) {
      nextTarget.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
      window.requestAnimationFrame(updateRect);
      return;
    }
    setRect(nextRect);
    const outlineSelector = step?.id === 'home-category' && categoryResultVisible
      ? '[data-product-tour="home-project-distribution"] [data-selected-project-category]'
      : step?.id === 'clients' && clientResultVisible
        ? '[data-selected-project-client]'
        : step?.outline || step?.highlight || step?.target;
    const nextHighlightRects = getTargets(step?.highlight || step?.target).map((element) => element.getBoundingClientRect());
    const nextOutlineRects = getTargets(outlineSelector).map((element) => element.getBoundingClientRect());
    setHighlightRects(nextHighlightRects);
    setOutlineRects(nextOutlineRects);
    lastGeometry.current = { rect: nextRect, highlightRects: nextHighlightRects, outlineRects: nextOutlineRects };
  }, [categoryResultVisible, clientResultVisible, step?.highlight, step?.id, step?.outline, step?.target]);

  React.useLayoutEffect(() => {
    if (!open) return undefined;
    setTourSteps(STEPS.filter((candidate) => !candidate.skipWhen?.()));
    lastGeometry.current = null;
    setIndex(0); setAwaitingResult(false); setClickedTarget(null); setCategoryResultVisible(false); setClientResultVisible(false);
    return undefined;
  }, [open, user?.role]);
  React.useEffect(() => () => { if (actionTimer.current) window.clearTimeout(actionTimer.current); }, []);
  React.useEffect(() => {
    if (!open) return undefined;
    updateRect();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateRect);
    const mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(updateRect);
    observer?.observe(document.body);
    mutations?.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => { observer?.disconnect(); mutations?.disconnect(); window.removeEventListener('resize', updateRect); window.removeEventListener('scroll', updateRect, true); };
  }, [location.pathname, open, step?.target, updateRect]);
  React.useLayoutEffect(() => {
    if (!open) return undefined;
    updateRect();
    const nextFrame = window.requestAnimationFrame(updateRect);
    const settledFrame = window.setTimeout(updateRect, 180);
    return () => { window.cancelAnimationFrame(nextFrame); window.clearTimeout(settledFrame); };
  }, [open, step?.id, updateRect]);
  React.useEffect(() => {
    if (!open || !awaitingResult || !step?.isComplete) return undefined;
    if (step.id === 'home-category') {
      const timer = window.setInterval(() => {
        if (step.isComplete(clickedTarget)) {
          window.clearInterval(timer);
          setCategoryResultVisible(true);
        }
      }, 80);
      return () => window.clearInterval(timer);
    }
    if (step.id === 'clients') {
      const timer = window.setInterval(() => {
        if (step.isComplete(clickedTarget)) {
          window.clearInterval(timer);
          setClientResultVisible(true);
        }
      }, 80);
      return () => window.clearInterval(timer);
    }
    const timer = window.setInterval(() => { if (step.isComplete(clickedTarget)) advance(); }, 80);
    return () => window.clearInterval(timer);
  }, [advance, awaitingResult, clickedTarget, open, step]);
  React.useEffect(() => {
    if (!open) return undefined;
    closeButton.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);
  React.useEffect(() => {
    if (!open || !step?.target) return undefined;
    const onClick = (event) => {
      const actionTarget = event.target.closest(step.target);
      if (!actionTarget) return;
      setClickedTarget(actionTarget);
      setAwaitingResult(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [open, step?.target]);
  if (!open || !step) return null;

  const viewportWidth = window.innerWidth; const viewportHeight = window.innerHeight; const outlinePadding = 6; const highlightPadding = 14;
  const visualRects = step.groupHighlight && highlightRects.length
    ? [{
      top: Math.min(...highlightRects.map((highlightRect) => highlightRect.top)),
      left: Math.min(...highlightRects.map((highlightRect) => highlightRect.left)),
      right: Math.max(...highlightRects.map((highlightRect) => highlightRect.right)),
      bottom: Math.max(...highlightRects.map((highlightRect) => highlightRect.bottom)),
    }]
    : highlightRects.length ? highlightRects : rect ? [rect] : [];
  const toHighlightArea = (targetRect) => {
    const outlineTop = Math.max(0, targetRect.top - outlinePadding); const outlineLeft = Math.max(0, targetRect.left - outlinePadding);
    const outlineRight = Math.min(viewportWidth, targetRect.right + outlinePadding); const outlineBottom = Math.min(viewportHeight, targetRect.bottom + outlinePadding);
    const highlightTop = Math.max(0, targetRect.top - highlightPadding); const highlightLeft = Math.max(0, targetRect.left - highlightPadding);
    const highlightRight = Math.min(viewportWidth, targetRect.right + highlightPadding); const highlightBottom = Math.min(viewportHeight, targetRect.bottom + highlightPadding);
    const radius = Math.min(14, (highlightRight - highlightLeft) / 2, (highlightBottom - highlightTop) / 2);
    return {
      outlineTop, outlineLeft, outlineRight, outlineBottom,
      hole: `M${highlightLeft + radius} ${highlightTop}H${highlightRight - radius}Q${highlightRight} ${highlightTop} ${highlightRight} ${highlightTop + radius}V${highlightBottom - radius}Q${highlightRight} ${highlightBottom} ${highlightRight - radius} ${highlightBottom}H${highlightLeft + radius}Q${highlightLeft} ${highlightBottom} ${highlightLeft} ${highlightBottom - radius}V${highlightTop + radius}Q${highlightLeft} ${highlightTop} ${highlightLeft + radius} ${highlightTop}Z`,
    };
  };
  const highlightAreas = visualRects.map(toHighlightArea);
  const outlineSourceRects = step.outline ? outlineRects : visualRects;
  const outlineAreas = outlineSourceRects.map(toHighlightArea);
  const primaryArea = highlightAreas[0];
  let cardTop = primaryArea && primaryArea.outlineBottom + 16 < viewportHeight - 180 ? primaryArea.outlineBottom + 16 : 16;
  let cardLeft = primaryArea && primaryArea.outlineRight + 340 < viewportWidth ? primaryArea.outlineRight + 16 : Math.max(16, (primaryArea?.outlineLeft || 0) - 340);
  if (step.id === 'analytics-nav' && viewportWidth >= 600) {
    cardLeft = Math.max(16, Math.min(viewportWidth - 352, Math.max(440, Math.round(viewportWidth * 0.36))));
    cardTop = 16;
  }
  return <Box data-product-tour-overlay="true" sx={{ position: 'fixed', inset: 0, zIndex: 1500, pointerEvents: 'none' }}>
    {highlightAreas.length ? <>
      <svg aria-hidden="true" width={viewportWidth} height={viewportHeight} viewBox={`0 0 ${viewportWidth} ${viewportHeight}`} style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <path d={`M0 0H${viewportWidth}V${viewportHeight}H0Z${highlightAreas.map((area) => area.hole).join('')}`} fill="rgba(20,28,45,.42)" fillRule="evenodd" clipRule="evenodd" style={{ pointerEvents: 'auto' }} />
      </svg>
      {outlineAreas.map((area, areaIndex) => <Box key={areaIndex} aria-hidden="true" sx={{ position: 'fixed', top: area.outlineTop, left: area.outlineLeft, width: area.outlineRight - area.outlineLeft, height: area.outlineBottom - area.outlineTop, border: '2px solid #4A68D9', borderRadius: 2, boxShadow: '0 0 0 2px rgba(255,255,255,.8)', pointerEvents: 'none', willChange: 'top, left, width, height', transition: 'top 440ms cubic-bezier(.16, 1, .3, 1), left 440ms cubic-bezier(.16, 1, .3, 1), width 440ms cubic-bezier(.16, 1, .3, 1), height 440ms cubic-bezier(.16, 1, .3, 1)' }} />)}
    </> : <Box sx={{ position: 'fixed', inset: 0, bgcolor: 'rgba(20,28,45,.42)', pointerEvents: 'auto' }} />}
    {clickPulse ? <Box aria-hidden="true" sx={{ position: 'fixed', zIndex: 2, top: clickPulse.y, left: clickPulse.x, width: 34, height: 34, border: '2px solid #4A68D9', borderRadius: '50%', pointerEvents: 'none', willChange: 'transform, opacity', animation: `${clickPulseAnimation} 650ms cubic-bezier(.16, 1, .3, 1) forwards` }} /> : null}
    <Paper role="dialog" aria-live="polite" sx={{ position: 'fixed', zIndex: 1, top: { xs: 'auto', sm: cardTop }, bottom: { xs: 16, sm: 'auto' }, left: { xs: 16, sm: cardLeft }, right: { xs: 16, sm: 'auto' }, width: { xs: 'auto', sm: 336 }, p: 2, borderRadius: 3, pointerEvents: 'auto', willChange: 'top, left', transition: 'top 440ms cubic-bezier(.16, 1, .3, 1), left 440ms cubic-bezier(.16, 1, .3, 1)' }}>
      <IconButton aria-label={t('common.actions.close')} onClick={onClose} ref={closeButton} size="small" sx={{ position: 'absolute', top: 8, right: 8, color: '#667085', '&:hover': { bgcolor: '#F2F4F7' } }}><CloseRoundedIcon fontSize="small" /></IconButton>
      <Box key={`${step.id}-${categoryResultVisible || clientResultVisible ? 'result' : 'prompt'}`} sx={{ animation: `${tooltipAnimation} 340ms cubic-bezier(.16, 1, .3, 1)` }}>
        <Typography sx={{ fontSize: 11, color: '#667085', mb: 0.5 }}>{t('productTour.step', { current: index + 1, total: tourSteps.length })}</Typography>
        <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1D2433', mb: 0.5 }}>{t(`productTour.steps.${categoryResultVisible && step.id === 'home-category' ? 'homeCategoryApplied' : clientResultVisible && step.id === 'clients' ? 'clientFilterResult' : step.title}.title`)}</Typography>
        <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: '#667085', mb: 0.75 }}>{t(`productTour.steps.${categoryResultVisible && step.id === 'home-category' ? 'homeCategoryApplied' : clientResultVisible && step.id === 'clients' ? 'clientFilterResult' : step.title}.description`)}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        <Button size="small" variant="text" disabled={index === 0} onClick={() => { setAwaitingResult(false); setClickedTarget(null); setCategoryResultVisible(false); setClientResultVisible(false); setIndex((value) => value - 1); }} sx={{ minWidth: 0, height: 32, px: 0, color: '#667085', fontWeight: 400, textTransform: 'none', '&.Mui-disabled': { color: '#B5BDC9' } }}>{t('productTour.back')}</Button>
        <Button size="small" variant="contained" onClick={runCurrentStep} disabled={isAnimatingAction} sx={{ height: 32, px: 1.5, borderRadius: '6px', bgcolor: '#4A68D9', boxShadow: 'none', fontWeight: 500, textTransform: 'none', '&:hover': { bgcolor: '#3E5BC7', boxShadow: 'none' } }}>{t(index === tourSteps.length - 1 ? 'productTour.finish' : 'productTour.next')}</Button>
      </Box>
    </Paper>
  </Box>;
}
