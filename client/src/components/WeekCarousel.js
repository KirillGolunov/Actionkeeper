import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { LeftArrow, RightArrow } from './ArrowIcons';

function formatWeekRange(start, end) {
  const pad = n => String(n).padStart(2, '0');
  const s = new Date(start);
  const e = new Date(end);
  return `${pad(s.getDate())}.${pad(s.getMonth() + 1)} - ${pad(e.getDate())}.${pad(e.getMonth() + 1)}`;
}

const WeekCarousel = ({ weeks, selectedWeek, onSelectWeek, requiredHours }) => {
  const scrollRef = useRef();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };
    update();
    el.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [weeks.length]);

  const handleScroll = dir => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = 160; // px, adjust as needed
    el.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
  };

  // Determine if the selected week is the current week
  const selectedWeekObj = weeks.find(w => w.isSelected);
  const isSelectedCurrentWeek = selectedWeekObj && selectedWeekObj.isCurrent;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 2, width: '100vw', maxWidth: '100%' }}>
      <IconButton onClick={() => handleScroll(-1)} sx={{ height: 56, width: 56 }} disabled={!canScrollLeft}>
        <LeftArrow color={canScrollLeft ? '#5673DC' : '#C5C9D3'} />
      </IconButton>
      <Box ref={scrollRef} sx={{ display: 'flex', overflowX: 'auto', overflowY: 'hidden', gap: 2, flex: 1, px: 1, height: 64, minHeight: 64, alignItems: 'center', width: '100%', minWidth: 0, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        {weeks.map((week, idx) => {
          const isCurrent = week.isCurrent;
          const isSelected = week.isSelected;
          const isComplete = week.loggedHours >= requiredHours;
          let bg = isCurrent ? '#fff' : '#EAEEFB';
          let border = '#C5C9D3';
          let color = '#000';
          let hoursColor = '#5673DC';
          let scale = 1;
          let zIndex = 1;
          if (isComplete) {
            bg = '#8196E4';
            color = '#fff';
            hoursColor = '#fff';
          }
          if (isSelected) {
            border = '#4A69D9';
            scale = 1.06;
            zIndex = 2;
          }
          return (
            <Box
              key={week.start}
              onClick={() => onSelectWeek(week.start)}
              sx={{
                minWidth: isSelected ? 116 : 104,
                boxSizing: 'border-box',
                px: isSelected ? 2.5 : 2,
                borderRadius: 2,
                border: `1px solid ${border}`,
                background: bg,
                cursor: 'pointer',
                boxShadow: isSelected ? 4 : 1,
                transition: 'all 0.18s cubic-bezier(.4,2,.6,1)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                userSelect: 'none',
                transform: `scale(${scale})`,
                zIndex,
                '&:hover': {
                  boxShadow: 2,
                  transform: `scale(${isSelected ? 1.12 : 1.04})`,
                  background: isComplete ? '#6b7fd1' : '#f0f3fa',
                  border: `1px solid #C5C9D3`,
                },
                height: 44,
              }}
            >
              <Typography sx={{ fontWeight: 500, color, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1 }}>
                {formatWeekRange(week.start, week.end)}
              </Typography>
              <Typography sx={{ fontWeight: 700, color: hoursColor, fontSize: 14, mt: 0.2, lineHeight: 1.1 }}>
                {week.loggedHours} / {requiredHours}
              </Typography>
            </Box>
          );
        })}
      </Box>
      <IconButton onClick={() => handleScroll(1)} sx={{ height: 56, width: 56 }} disabled={!canScrollRight || isSelectedCurrentWeek}>
        <RightArrow color={(!canScrollRight || isSelectedCurrentWeek) ? '#C5C9D3' : '#5673DC'} />
      </IconButton>
    </Box>
  );
};

export default WeekCarousel; 