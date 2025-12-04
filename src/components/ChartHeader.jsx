import { useState, useCallback, memo } from 'react';

/**
 * Generate a stable section ID from text using the same algorithm as TableOfContents.
 * This ensures IDs match between ChartHeader and ToC navigation.
 */
const generateSectionId = (text) => {
  if (!text) return '';
  const cleanText = text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `section-${cleanText}`;
};

/**
 * Link icon SVG (GitHub octicon-link style)
 */
const LinkIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 16 16"
    version="1.1"
    width="16"
    height="16"
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="m7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83Z"
    />
  </svg>
);

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

    // Update browser URL hash
    window.history.pushState(null, '', `#${sectionId}`);

    // Copy full URL to clipboard
    const fullUrl = `${window.location.origin}${window.location.pathname}#${sectionId}`;
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
        <LinkIcon className={`w-4 h-4 ${copied ? 'text-green-500' : ''}`} />
      </a>
    </h3>
  );
};

export default memo(ChartHeader);
