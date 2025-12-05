import { useState, useCallback, memo } from 'react';
import {
  buildHashPreservingFilters,
  getFullURLWithFilters,
  generateSectionId,
} from '../utils/url-utils';

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

  const sectionId = generateSectionId(title);

  const handleAnchorClick = useCallback((e) => {
    e.preventDefault();

    if (!sectionId) return;

    // Update browser URL hash, preserving any filter params
    const newHash = buildHashPreservingFilters(sectionId);
    window.history.pushState(null, '', newHash);

    // Copy full URL (with filters) to clipboard
    const fullUrl = getFullURLWithFilters(sectionId);
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {
      // Fallback: just update the hash without clipboard notification
    });
  }, [sectionId]);

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
        className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-gray-400 hover:text-nodered-red"
        aria-label={`Link to ${title}`}
        title={copied ? "Copied!" : "Copy link"}
      >
        <span className={copied ? 'text-[#c12120]' : ''}>#</span>
      </a>
    </h3>
  );
};

export default memo(ChartHeader);
