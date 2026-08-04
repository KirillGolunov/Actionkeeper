import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Tooltip } from '@mui/material';

export const OVERFLOW_TOLERANCE_PX = 1;

export function isElementOverflowing(element, axis = 'both', tolerance = OVERFLOW_TOLERANCE_PX) {
  if (!element) return false;

  const horizontallyOverflowing = element.scrollWidth > element.clientWidth + tolerance;
  const verticallyOverflowing = element.scrollHeight > element.clientHeight + tolerance;

  if (axis === 'horizontal') return horizontallyOverflowing;
  if (axis === 'vertical') return verticallyOverflowing;
  return horizontallyOverflowing || verticallyOverflowing;
}

function OverflowTooltip({ children, title, overflowAxis = 'both', ...tooltipProps }) {
  const elementRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);

  const measureOverflow = useCallback(() => {
    setOverflowing(isElementOverflowing(elementRef.current, overflowAxis));
  }, [overflowAxis]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    measureOverflow();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(measureOverflow);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', measureOverflow);
    return () => window.removeEventListener('resize', measureOverflow);
  }, [measureOverflow, title]);

  const measuredChild = React.cloneElement(children, { ref: elementRef });

  if (!overflowing) return measuredChild;

  return (
    <Tooltip title={title} {...tooltipProps}>
      {measuredChild}
    </Tooltip>
  );
}

export default OverflowTooltip;
