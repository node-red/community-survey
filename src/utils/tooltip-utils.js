/**
 * Tooltip positioning utility that accounts for CSS zoom on mobile viewports.
 *
 * On mobile (≤767px), the dashboard applies CSS `zoom: 0.7` which causes
 * mouse event coordinates to not match the visual element positions.
 * This utility compensates for that zoom factor.
 */

import { useEffect } from 'react';

const MOBILE_ZOOM = 0.7;
const MOBILE_BREAKPOINT = 767;

/**
 * Calculate tooltip position adjusted for CSS zoom.
 *
 * @param {MouseEvent} event - The mouse event
 * @param {number} tooltipWidth - Expected tooltip width (default: 200)
 * @param {number} tooltipHeight - Expected tooltip height (default: 80)
 * @returns {{ x: number, y: number }} - Adjusted tooltip position
 */
export const getTooltipPosition = (event, tooltipWidth = 200, tooltipHeight = 80) => {
  const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
  const zoom = isMobile ? MOBILE_ZOOM : 1;

  // Adjust coordinates for CSS zoom
  const screenX = event.clientX / zoom;
  const screenY = event.clientY / zoom;

  let adjustedX = screenX + 15;
  let adjustedY = screenY - tooltipHeight - 10;

  // Boundary checks (account for zoom in viewport calculations)
  const viewportWidth = window.innerWidth / zoom;

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
