import React from 'react';

const BAR_WIDTH = 45;
const LINE_WIDTH = 34;

const lineStyle = {
  height: 4,
  borderRadius: 2,
  margin: '1px 0',
  width: `${LINE_WIDTH}px`,
  background: '#e0e0e0', // lighter grey for backfill
  transition: 'background 0.2s',
};

export default function DayHourBar({ hours = 0, isWeekend = false }) {
  let color = '#5673DC'; // blue
  if (hours > 8) color = '#d32f2f'; // red

  // Border color logic
  let borderColor = '#bdbdbd'; // grey
  if (hours >= 8) borderColor = '#5673DC'; // blue

  if (isWeekend) {
    return (
      <div style={{ position: 'relative', height: 48, width: BAR_WIDTH, margin: '0 auto', borderRadius: 4, background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {hours > 0 && (
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {[...Array(8)].map((_, i, arr) => {
              const lineIndex = arr.length - 1 - i;
              return (
                <div
                  key={i}
                  style={{
                    ...lineStyle,
                    background: lineIndex < Math.min(hours, 8) ? color : 'transparent',
                    opacity: lineIndex < hours ? 1 : 0.5,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 48, width: BAR_WIDTH, margin: '0 auto', borderRadius: 4 }}>
      {[...Array(8)].map((_, i, arr) => {
        const lineIndex = arr.length - 1 - i; // reverse order
        return (
          <div
            key={i}
            style={{
              ...lineStyle,
              background: lineIndex < Math.min(hours, 8) ? color : '#e0e0e0',
              opacity: lineIndex < hours ? 1 : 0.5,
            }}
          />
        );
      })}
    </div>
  );
} 