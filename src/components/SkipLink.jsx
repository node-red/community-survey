import { useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * SkipLink - Allows keyboard users to skip past chart/table content
 *
 * Renders as a visually hidden link that appears on keyboard focus.
 * When activated, moves focus to the next chart section.
 *
 * Props:
 * - label: Text shown on the skip link (default: "Skip to next section")
 * - chartId: Used to find the next sibling chart by data-chart-id attribute
 * - targetId: Optional explicit element ID to jump to (bypasses sibling search)
 */
const SkipLink = ({ label = "Skip to next section", chartId, targetId }) => {

  const handleClick = useCallback((e) => {
    e.preventDefault();

    let targetElement = null;

    // If targetId is provided, directly jump to that element
    if (targetId) {
      targetElement = document.getElementById(targetId);
    }
    // Otherwise, find next chart sibling using data-chart-id
    else if (chartId) {
      const allCharts = Array.from(document.querySelectorAll('[data-chart-id]'));

      // Filter out nested charts (those whose parent also has data-chart-id)
      const topLevelCharts = allCharts.filter(el => {
        const parent = el.parentElement?.closest('[data-chart-id]');
        return !parent;
      });

      const currentIndex = topLevelCharts.findIndex(
        el => el.getAttribute('data-chart-id') === chartId
      );

      if (currentIndex >= 0 && currentIndex < topLevelCharts.length - 1) {
        const nextChart = topLevelCharts[currentIndex + 1];
        // Find the heading within the next chart
        targetElement = nextChart.querySelector('h3[id], h2[id]') || nextChart;
      }
    }

    if (targetElement) {
      // Make element focusable if it isn't already
      if (!targetElement.hasAttribute('tabindex')) {
        targetElement.setAttribute('tabindex', '-1');
      }
      targetElement.focus();
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [chartId, targetId]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick(e);
    }
  }, [handleClick]);

  return (
    <a
      href="#"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-10 focus:px-3 focus:py-1.5 focus:text-sm focus:bg-white focus:text-gray-700 focus:rounded focus:shadow-md focus:border focus:border-gray-300 focus:outline focus:outline-2 focus:outline-[#3b82f6] focus:outline-offset-2"
    >
      {label}
    </a>
  );
};

SkipLink.propTypes = {
  label: PropTypes.string,
  chartId: PropTypes.string,
  targetId: PropTypes.string,
};

export default SkipLink;
