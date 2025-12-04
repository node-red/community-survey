/**
 * Tooltip positioning utility.
 *
 * Tooltips are rendered via React Portal to document.body, so they are
 * outside any transform:scale() containers. This means mouse coordinates
 * (clientX, clientY) can be used directly without compensation.
 */

import { useEffect } from 'react';

/**
 * Calculate tooltip position relative to mouse cursor.
 *
 * @param {MouseEvent} event - The mouse event
 * @param {number} tooltipWidth - Expected tooltip width (default: 200)
 * @param {number} tooltipHeight - Expected tooltip height (default: 80)
 * @returns {{ x: number, y: number }} - Tooltip position
 */
export const getTooltipPosition = (event, tooltipWidth = 200, tooltipHeight = 80) => {
  const screenX = event.clientX;
  const screenY = event.clientY;

  let adjustedX = screenX + 15;
  let adjustedY = screenY - tooltipHeight - 10;

  const viewportWidth = window.innerWidth;

  if (adjustedY < 0) {
    adjustedY = screenY + 15;
  }
  if (adjustedX + tooltipWidth > viewportWidth) {
    adjustedX = screenX - tooltipWidth - 15;
  }

  return { x: adjustedX, y: adjustedY };
};

/**
 * Hook to automatically hide tooltip when user scrolls.
 * Useful on mobile where tooltips should dismiss on scroll.
 *
 * @param {Function} setShowTooltip - State setter to hide tooltip
 */
export const useHideTooltipOnScroll = (setShowTooltip) => {
  useEffect(() => {
    const handleScroll = () => {
      setShowTooltip(false);
    };

    // Use capture: true to catch scroll events on any scrollable container
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [setShowTooltip]);
};
