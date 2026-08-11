import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const formatHours = (value) => Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 });

function ribbonPath(left, right) {
  const fromX = left.x + left.barWidth / 2;
  const toX = right.x - right.barWidth / 2;
  const distance = toX - fromX;
  const controlFromX = fromX + distance * 0.35;
  const controlToX = toX - distance * 0.35;
  return [
    `M ${fromX} ${left.yTop}`,
    `C ${controlFromX} ${left.yTop}, ${controlToX} ${right.yTop}, ${toX} ${right.yTop}`,
    `L ${toX} ${right.yBottom}`,
    `C ${controlToX} ${right.yBottom}, ${controlFromX} ${left.yBottom}, ${fromX} ${left.yBottom}`,
    'Z',
  ].join(' ');
}

export function buildConnectedStackLayout({ periods = [], categories = [], width, height, compact = false }) {
  const safeWidth = Math.max(220, Number(width) || 480);
  const safeHeight = Math.max(105, Number(height) || 120);
  const plot = { left: 34, right: safeWidth - (compact ? 28 : 14), top: 9, bottom: safeHeight - 22 };
  const plotWidth = Math.max(1, plot.right - plot.left);
  const plotHeight = Math.max(1, plot.bottom - plot.top);
  const periodCount = periods.length;
  const step = periodCount > 1 ? plotWidth / periodCount : plotWidth;
  const barWidth = clamp(step * 0.44, compact ? 18 : 20, compact ? 20 : 24);
  const centerStep = periodCount > 1 ? (plotWidth - barWidth) / (periodCount - 1) : 0;

  const columns = periods.map((period, periodIndex) => {
    const x = periodCount > 1
      ? plot.left + barWidth / 2 + periodIndex * centerStep
      : plot.left + plotWidth / 2;
    let cumulative = 0;
    const segments = categories.map((category) => {
      const percent = Math.max(0, Number(period[category] || 0));
      const detail = period.categoryDetails?.[category] || {};
      const yBottom = plot.bottom - (cumulative / 100) * plotHeight;
      cumulative += percent;
      const yTop = plot.bottom - (cumulative / 100) * plotHeight;
      return {
        category,
        percent,
        hours: Number(detail.hours || 0),
        x,
        barWidth,
        yTop,
        yBottom,
        height: Math.max(0, yBottom - yTop),
      };
    });
    return {
      period,
      periodIndex,
      x,
      barWidth,
      empty: Number(period.totalHours || 0) <= 0,
      partial: Boolean(period.isPartial),
      segments,
    };
  });

  const ribbons = [];
  for (let index = 0; index < columns.length - 1; index += 1) {
    const left = columns[index];
    const right = columns[index + 1];
    if (left.empty || right.empty) continue;
    categories.forEach((category, categoryIndex) => {
      const from = left.segments[categoryIndex];
      const to = right.segments[categoryIndex];
      if (from.percent <= 0 && to.percent <= 0) return;
      ribbons.push({
        key: `${left.period.startDate}-${right.period.startDate}-${category}`,
        category,
        fromColumn: left,
        toColumn: right,
        from,
        to,
        partial: left.partial || right.partial,
        path: ribbonPath(from, to),
      });
    });
  }

  return { width: safeWidth, height: safeHeight, plot, plotHeight, columns, ribbons };
}

function makeSegmentInteraction(column, segment) {
  return {
    type: 'segment',
    category: segment.category,
    period: column.period,
    hours: segment.hours,
    percent: segment.percent,
    totalHours: Number(column.period.totalHours || 0),
    partial: column.partial,
  };
}

function makeRibbonInteraction(ribbon) {
  return {
    type: 'ribbon',
    category: ribbon.category,
    from: {
      period: ribbon.fromColumn.period,
      hours: ribbon.from.hours,
      percent: ribbon.from.percent,
      totalHours: Number(ribbon.fromColumn.period.totalHours || 0),
      partial: ribbon.fromColumn.partial,
    },
    to: {
      period: ribbon.toColumn.period,
      hours: ribbon.to.hours,
      percent: ribbon.to.percent,
      totalHours: Number(ribbon.toColumn.period.totalHours || 0),
      partial: ribbon.toColumn.partial,
    },
    partial: ribbon.partial,
  };
}

export default function ConnectedCategoryFlowChart({ periods, categories, colors, labels, compact = false, onInteractionChange }) {
  const containerRef = useRef(null);
  const clipPrefix = useId().replace(/:/g, '');
  const [size, setSize] = useState({ width: compact ? 320 : 480, height: 120 });
  const [hoveredInteraction, setHoveredInteraction] = useState(null);
  const [lockedInteraction, setLockedInteraction] = useState(null);
  const activeInteraction = lockedInteraction || hoveredInteraction;
  const activeCategory = activeInteraction?.category || null;

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const update = () => {
      const rect = element.getBoundingClientRect();
      const visibleWidth = Math.min(rect.width, Math.max(220, document.documentElement.clientWidth - rect.left - 8));
      if (visibleWidth > 0 && rect.height > 0) setSize({ width: visibleWidth, height: rect.height });
    };
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!lockedInteraction) return undefined;
    const clearOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setLockedInteraction(null);
        setHoveredInteraction(null);
      }
    };
    const clearOnEscape = (event) => {
      if (event.key === 'Escape') {
        setLockedInteraction(null);
        setHoveredInteraction(null);
      }
    };
    document.addEventListener('pointerdown', clearOutside);
    document.addEventListener('keydown', clearOnEscape);
    return () => {
      document.removeEventListener('pointerdown', clearOutside);
      document.removeEventListener('keydown', clearOnEscape);
    };
  }, [lockedInteraction]);

  useEffect(() => {
    onInteractionChange?.(activeInteraction);
  }, [activeInteraction, onInteractionChange]);

  const layout = useMemo(
    () => buildConnectedStackLayout({ periods, categories, width: size.width, height: size.height, compact }),
    [categories, compact, periods, size]
  );

  const clearHover = () => setHoveredInteraction(null);
  const toggleLock = (nextInteraction) => {
    setLockedInteraction((current) => current?.category === nextInteraction.category ? null : nextInteraction);
    setHoveredInteraction(null);
  };

  return (
    <Box
      ref={containerRef}
      onPointerLeave={clearHover}
      sx={{ width: '100%', height: '100%', minHeight: compact ? 80 : 105, position: 'relative', overflow: 'hidden', touchAction: 'manipulation' }}
    >
      <svg width={layout.width} height="100%" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="Структура времени по категориям и периодам" style={{ display: 'block', maxWidth: '100%' }}>
        <defs>
          {layout.columns.filter((column) => !column.empty).map((column) => (
            <clipPath key={column.period.startDate} id={`${clipPrefix}-${column.periodIndex}`}>
              <rect x={column.x - column.barWidth / 2} y={layout.plot.top} width={column.barWidth} height={layout.plotHeight} rx="4" />
            </clipPath>
          ))}
        </defs>

        {[0, 50, 100].map((tick) => {
          const y = layout.plot.bottom - (tick / 100) * layout.plotHeight;
          return <g key={tick}><line x1={layout.plot.left} x2={layout.plot.right} y1={y} y2={y} stroke="#F1F3F6" /><text x={layout.plot.left - 5} y={y + 3} textAnchor="end" fontSize="9" fill="#98A2B3">{tick}%</text></g>;
        })}

        {layout.ribbons.map((ribbon) => {
          const selected = !activeCategory || activeCategory === ribbon.category;
          const interaction = makeRibbonInteraction(ribbon);
          const label = `${labels[ribbon.category] || ribbon.category}: ${ribbon.fromColumn.period.label} ${formatHours(ribbon.from.hours)} ч, ${Math.round(ribbon.from.percent)}%; ${ribbon.toColumn.period.label} ${formatHours(ribbon.to.hours)} ч, ${Math.round(ribbon.to.percent)}%`;
          return (
            <path
              key={ribbon.key}
              data-flow-ribbon={ribbon.category}
              d={ribbon.path}
              fill={colors[ribbon.category]}
              fillOpacity={selected ? (activeCategory ? 0.45 : ribbon.partial ? 0.23 : 0.31) : 0.05}
              tabIndex="0"
              role="button"
              aria-label={label}
              onPointerEnter={() => setHoveredInteraction(interaction)}
              onPointerLeave={clearHover}
              onFocus={() => setHoveredInteraction(interaction)}
              onBlur={clearHover}
              onClick={(event) => { event.stopPropagation(); toggleLock(interaction); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggleLock(interaction);
                }
              }}
            />
          );
        })}

        {layout.columns.map((column) => (
          <g key={column.period.startDate}>
            {column.empty ? (
              <g tabIndex="0" role="button" aria-label={`${column.period.label}: за период часы не зарегистрированы`}>
                <title>За период часы не зарегистрированы</title>
                <line x1={column.x - 4} x2={column.x + 4} y1={layout.plot.bottom - 4} y2={layout.plot.bottom - 4} stroke="#CDD2DC" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            ) : (
              <g clipPath={`url(#${clipPrefix}-${column.periodIndex})`}>
                {column.segments.filter((segment) => segment.percent > 0).map((segment) => {
                  const selected = !activeCategory || activeCategory === segment.category;
                  const interaction = makeSegmentInteraction(column, segment);
                  const label = `${column.period.label}, ${labels[segment.category] || segment.category}: ${formatHours(segment.hours)} ч, ${Math.round(segment.percent)}%`;
                  return (
                    <rect
                      key={segment.category}
                      data-flow-segment={segment.category}
                      x={column.x - column.barWidth / 2}
                      y={segment.yTop}
                      width={column.barWidth}
                      height={Math.max(0.75, segment.height)}
                      fill={colors[segment.category]}
                      fillOpacity={selected ? (activeCategory ? 0.95 : 0.82) : 0.12}
                      tabIndex="0"
                      role="button"
                      aria-label={label}
                      onPointerEnter={() => setHoveredInteraction(interaction)}
                      onPointerLeave={clearHover}
                      onFocus={() => setHoveredInteraction(interaction)}
                      onBlur={clearHover}
                      onClick={(event) => { event.stopPropagation(); toggleLock(interaction); }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleLock(interaction);
                        }
                      }}
                    />
                  );
                })}
              </g>
            )}
            {column.partial && !column.empty && <circle cx={column.x} cy={layout.plot.top - 4} r="2" fill="#91A4E4"><title>Неполный период</title></circle>}
            <text x={column.x} y={layout.height - 5} textAnchor="middle" fontSize={compact ? 8.5 : 9.5} fill="#7F899E">{column.period.label}</text>
          </g>
        ))}
      </svg>
    </Box>
  );
}
