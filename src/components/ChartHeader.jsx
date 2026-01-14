import { useState, useCallback, useRef, memo } from 'react';
import {
  serializeFiltersToURL,
  getFullURLWithFiltersState,
  getFullURLWithComparisonState,
  generateSectionId,
} from '../utils/url-utils';
import { useFilters, useComparison } from '../contexts/FilterContext';
import Tooltip from './Tooltip';
import { getTooltipPosition } from '../utils/tooltip-utils';

/**
 * ChartHeader component with GitHub-style anchor link.
 *
 * Features:
 * - Generates stable section IDs matching TableOfContents algorithm
 * - Shows anchor icon on hover (desktop) or always visible (mobile)
 * - Clicking anchor copies URL to clipboard and updates browser hash
 * - Brief visual feedback on copy
 */
const ChartHeader = ({ title, compact = false, className }) => {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const anchorRef = useRef(null);

  // Get filters from context - this is the source of truth
  const filters = useFilters();
  // Get comparison state from context
  const { comparisonMode, filtersA, filtersB } = useComparison();
  const sectionId = generateSectionId(title);

  const handleAnchorClick = useCallback((e) => {
    e.preventDefault();
    setShowTooltip(false);

    if (!sectionId) return;

    let newHash, fullUrl;

    if (comparisonMode) {
      // Comparison mode - include both filter sets
      const comparisonState = { comparisonMode: true, filtersA, filtersB };
      newHash = serializeFiltersToURL(null, sectionId, comparisonState);
      fullUrl = getFullURLWithComparisonState(comparisonState, sectionId);
    } else {
      // Normal mode
      newHash = serializeFiltersToURL(filters, sectionId);
      fullUrl = getFullURLWithFiltersState(filters, sectionId);
    }

    // Build hash from React state (source of truth, not potentially stale URL)
    window.history.pushState(null, '', newHash);

    // Copy full URL with current filters from React state
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {
      // Fallback: just update the hash without clipboard notification
    });
  }, [sectionId, filters, comparisonMode, filtersA, filtersB]);

  const handleMouseEnter = useCallback((e) => {
    if (!copied) {
      setShowTooltip(true);
      setTooltipPosition(getTooltipPosition(e, 80, 30));
    }
  }, [copied]);

  const handleMouseMove = useCallback((e) => {
    if (showTooltip) {
      setTooltipPosition(getTooltipPosition(e, 80, 30));
    }
  }, [showTooltip]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  // Find the chart container to highlight
  // Priority: data-chart-wrapper (comparison mode row) > data-chart-id (individual chart)
  const findChartContainer = useCallback(() => {
    // First check for comparison wrapper (highlights entire row with both columns)
    const wrapper = anchorRef.current?.closest('[data-chart-wrapper]');
    if (wrapper) return wrapper;
    // Fall back to closest chart container (highlights individual chart)
    return anchorRef.current?.closest('[data-chart-id]');
  }, []);

  // Highlight parent chart container when anchor receives focus
  const handleFocus = useCallback(() => {
    const chartContainer = findChartContainer();
    if (chartContainer) {
      chartContainer.classList.add('ring-2', 'ring-[#3b82f6]', 'ring-offset-2');
    }
  }, [findChartContainer]);

  const handleBlur = useCallback(() => {
    const chartContainer = findChartContainer();
    if (chartContainer) {
      chartContainer.classList.remove('ring-2', 'ring-[#3b82f6]', 'ring-offset-2');
    }
  }, [findChartContainer]);

  // Determine header classes based on compact mode or custom className
  const headerClasses = className || (compact
    ? "text-sm font-medium text-nodered-gray-700"
    : "text-lg font-semibold text-nodered-gray-700"
  );

  return (
    <h3
      id={sectionId}
      className={`group flex items-center gap-2 ${headerClasses}`}
    >
      {/* Title text */}
      <span>{title}</span>

      {/* Anchor link - positioned after the heading, visible on hover (desktop) or always (mobile) */}
      <a
        ref={anchorRef}
        href={`#${sectionId}`}
        onClick={handleAnchorClick}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-150 text-gray-400 hover:text-nodered-red focus:outline-none rounded-sm"
        aria-label={copied ? `Link copied to clipboard` : `Copy link to ${title}`}
      >
        <span className={copied ? 'text-[#c12120]' : ''}>{copied ? '✓' : '#'}</span>
      </a>

      {/* Tooltip for anchor link */}
      <Tooltip
        show={showTooltip && !copied}
        position={tooltipPosition}
        content="Copy link"
        maxWidth="100px"
      />
    </h3>
  );
};

export default memo(ChartHeader);
