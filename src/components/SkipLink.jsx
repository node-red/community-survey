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
    // Otherwise, find next chart in document order using data-chart-id
    else if (chartId) {
      const allCharts = Array.from(document.querySelectorAll('[data-chart-id]'));

      const currentIndex = allCharts.findIndex(
        el => el.getAttribute('data-chart-id') === chartId
      );

      if (currentIndex >= 0 && currentIndex < allCharts.length - 1) {
        // Find the next chart that isn't a descendant of the current chart
        const currentChart = allCharts[currentIndex];
        let nextChart = null;

        for (let i = currentIndex + 1; i < allCharts.length; i++) {
          const candidate = allCharts[i];
          // Skip charts that are nested inside the current chart
          if (!currentChart.contains(candidate)) {
            nextChart = candidate;
            break;
          }
        }

        if (nextChart) {
          // Find the heading within the next chart
          targetElement = nextChart.querySelector('h3[id], h2[id]') || nextChart;
        }
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
