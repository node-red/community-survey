import { useState, useCallback, memo } from 'react';
import {
  serializeFiltersToURL,
  getFullURLWithFiltersState,
  generateSectionId,
} from '../utils/url-utils';
import { useFilters } from '../contexts/FilterContext';
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

  // Get filters from context - this is the source of truth
  const filters = useFilters();
  const sectionId = generateSectionId(title);

  const handleAnchorClick = useCallback((e) => {
    e.preventDefault();
    setShowTooltip(false);

    if (!sectionId) return;

    // Build hash from React state (source of truth, not potentially stale URL)
    const newHash = serializeFiltersToURL(filters, sectionId);
    window.history.pushState(null, '', newHash);

    // Copy full URL with current filters from React state
    const fullUrl = getFullURLWithFiltersState(filters, sectionId);
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {
      // Fallback: just update the hash without clipboard notification
    });
  }, [sectionId, filters]);

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
        href={`#${sectionId}`}
        onClick={handleAnchorClick}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-gray-400 hover:text-nodered-red"
        aria-label={`Link to ${title}`}
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
