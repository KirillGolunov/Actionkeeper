import React from 'react';

export const LeftArrow = ({ color = '#5673DC', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M20 24L12 16L20 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const RightArrow = ({ color = '#5673DC', size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path d="M12 8L20 16L12 24" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
); 