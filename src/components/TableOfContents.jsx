import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { cn } from '../styles/classNames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfo } from '@fortawesome/free-solid-svg-icons';
import {
  buildHashPreservingFilters,
  getCurrentSectionFromURL,
  generateSectionId,
} from '../utils/url-utils';

const TableOfContents = forwardRef(({ containerRef, width, collapsed, onToggle, onFocusWithin, onItemMouseEnter, onItemMouseLeave, useOverlay }, ref) => {
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebarToggle, setShowSidebarToggle] = useState(false);
  const [showSidebarTooltip, setShowSidebarTooltip] = useState(false);
  const tooltipTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  // Expose focusSearch method to parent components
  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    }
  }), []);
  const [pendingHash, setPendingHash] = useState(() => {
    // Extract just the section ID, ignoring any filter params after '?'
    return getCurrentSectionFromURL();
  });
  const isScrollingRef = useRef(false);

  // Cleanup tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // When loading with a hash, immediately scroll past hero/intro to reduce wait time
  useEffect(() => {
    // Read initial hash directly to avoid stale closure warning
    const initialHash = getCurrentSectionFromURL();
    if (initialHash) {
      // Find the dashboard section start (after intro) and scroll there instantly
      const dashboardStart = document.getElementById('introduction-section');
      if (dashboardStart) {
        // Instant scroll to just past the intro, then smooth scroll to target will happen later
        window.scrollTo({
          top: dashboardStart.offsetTop + dashboardStart.offsetHeight,
          behavior: 'instant'
        });
      }
    }
  }, []); // Only run once on mount

  // Extract headings from chart components and direct h3 headings
  useEffect(() => {
    if (!containerRef?.current) return;

    const extractHeadings = () => {
      const container = containerRef.current;

      // Use a Map to track unique headings by text content
      const uniqueHeadings = new Map();
      const headingsList = [];

      // Find ALL h3 elements in document order
      const allHeadings = container.querySelectorAll('h3');

      Array.from(allHeadings).forEach((heading) => {
        const text = heading.textContent.trim();

        // Skip empty headings
        if (!text) return;

        // Skip specific chart title headings that shouldn't appear in ToC
        const unwantedTitles = [
          'Quality Gap Opportunities',
          'Quality Ranking',
          'Reach Gap Opportunities',
          'Reach Ranking',
          'Channel Ratings Overview',
          'User Count by Learning Resource'
        ];
        if (unwantedTitles.includes(text)) return;

        // Only add if we haven't seen this text before
        if (!uniqueHeadings.has(text)) {
          // Create a stable ID if it doesn't exist, using shared algorithm for URL consistency
          if (!heading.id) {
            heading.id = generateSectionId(text);
          }

          const chartContainer = heading.closest('[data-chart-id]');
          const entry = {
            id: heading.id,
            text: text,
            element: heading,
            chartContainer: chartContainer || undefined
          };

          uniqueHeadings.set(text, entry);
          headingsList.push(entry);
        } else {
          // If duplicate text found, ensure it uses the same ID as the first occurrence
          const existingEntry = uniqueHeadings.get(text);
          if (existingEntry && !heading.id) {
            heading.id = existingEntry.id;
          }
        }
      });

      setSections(headingsList);
    };

    // Initial extraction
    extractHeadings();

    // Set up mutation observer to watch for content changes
    const container = containerRef.current;
    const observer = new MutationObserver(extractHeadings);
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });

    return () => observer.disconnect();
  }, [containerRef]);

  // Scroll to a section by ID
  const scrollToSection = useCallback((sectionId, updateHistory = true) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Try to find the associated chart container for better scrolling
      let targetElement = element;
      const chartContainer = element.closest('[data-chart-id]');
      if (chartContainer) {
        targetElement = chartContainer;
      }

      // Get the element's position relative to the viewport
      const elementRect = targetElement.getBoundingClientRect();

      // Calculate scroll position (current scroll + element position - offset for sticky header)
      const headerOffset = 60; // Account for sticky header (48px) + small buffer
      const targetScrollPosition = window.scrollY + elementRect.top - headerOffset;

      // Mark that we're programmatically scrolling to prevent URL spam
      isScrollingRef.current = true;

      // Update URL hash, preserving any filter params (use pushState for clicks so back button works)
      if (updateHistory) {
        const newHash = buildHashPreservingFilters(sectionId);
        window.history.pushState(null, '', newHash);
      }

      window.scrollTo({
        top: targetScrollPosition,
        behavior: 'smooth'
      });

      // Reset scrolling flag after animation completes
      // Using 800ms to accommodate longer smooth scroll animations
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 800);
    }
  }, []);

  // Simple scroll-based active section tracking
  useEffect(() => {
    if (!containerRef?.current || sections.length === 0) return;

    let rafId = null;

    const updateActiveSection = () => {
      // Cancel previous animation frame
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const viewportHeight = window.innerHeight;

        // Find the first heading that's clearly visible in the viewport
        let activeId = null;
        let fallbackId = null;
        let minDistance = Infinity;

        for (const section of sections) {
          if (!section.element) continue;

          const rect = section.element.getBoundingClientRect();
          const distanceFromTop = rect.top;

          // If heading is in the upper portion of viewport (top 60%), make it active
          if (distanceFromTop >= 0 && distanceFromTop <= viewportHeight * 0.6) {
            activeId = section.id;
            break; // First one wins - this is a clear active section
          }

          // Track closest heading for potential fallback, but only if reasonably close
          const absoluteDistance = Math.abs(distanceFromTop);
          if (absoluteDistance < minDistance && absoluteDistance < viewportHeight * 0.8) {
            minDistance = absoluteDistance;
            fallbackId = section.id;
          }
        }

        // Only update if we found a clearly active section, or if we don't have any active section yet
        if (activeId) {
          // Clear active section found
          if (activeId !== activeSection) {
            setActiveSection(activeId);
            // Update URL hash without triggering scroll (only when not programmatically scrolling
            // or when we have a pending hash from URL navigation that hasn't been processed yet)
            // Preserve any filter params in the URL
            if (!isScrollingRef.current && !pendingHash) {
              const newHash = buildHashPreservingFilters(activeId);
              window.history.replaceState(null, '', newHash);
            }
          }
        } else if (!activeSection && fallbackId) {
          // Only use fallback if we don't have any active section yet (initial load)
          setActiveSection(fallbackId);
        }
        // If activeId is null and we already have an activeSection, keep the current one (persist last active)
      });
    };

    // Listen to scroll events on window (page uses window scrolling, not container scrolling)
    window.addEventListener('scroll', updateActiveSection, { passive: true });

    // Initial update
    updateActiveSection();

    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [containerRef, sections, activeSection, pendingHash]);

  // Handle initial page load with hash - wait for section to be discovered
  useEffect(() => {
    if (!pendingHash || sections.length === 0) return;

    const targetSection = sections.find(s => s.id === pendingHash);
    if (targetSection) {
      // Small delay to ensure layout is stable after charts load
      setTimeout(() => {
        scrollToSection(pendingHash, false);
        // Delay clearing pendingHash until scroll animation completes
        // This prevents URL updates during the smooth scroll animation
        setTimeout(() => {
          setPendingHash(null);
        }, 800); // Allow time for smooth scroll to complete
      }, 100);
    }
  }, [sections, pendingHash, scrollToSection]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // Extract just the section ID, ignoring any filter params
      const sectionId = getCurrentSectionFromURL();
      if (sectionId) {
        scrollToSection(sectionId, false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [scrollToSection]);

  // Filter sections based on search query
  const filteredSections = sections.filter(section =>
    section.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Always render the sidebar frame, even when no sections are available yet

  return (
    <aside
      aria-label="Table of contents"
      className={cn(
        "bg-[#f3f3f3]",
        "z-20",
        useOverlay ? "fixed right-0" : "sticky top-12 right-0 self-start"
      )}
      style={{
        width: collapsed ? "8px" : `${width}px`,
        transition: "width 300ms ease-in-out",
        borderLeft: "1px solid #bbbbbb",
        height: useOverlay ? "calc(100vh - 48px)" : "100vh",
        maxHeight: "calc(100vh - 48px)",
        top: "48px",
      }}
    >
      {/* Sidebar Content */}
      <div
        className={cn(
          "h-full bg-[#f3f3f3] overflow-hidden flex flex-col relative z-10",
          collapsed && "opacity-0 pointer-events-none"
        )}
        style={{
          boxShadow: "rgb(187, 187, 187) -1px 0px 0px, rgb(243, 243, 243) -7px 0px 0px, rgb(187, 187, 187) -8px 0px 0px"
        }}
      >
        {/* Info Tab Header - Styled like Node-RED tab */}
        <div className="bg-[#f3f3f3] border-b border-[#bbbbbb] h-[35px] flex items-center">
          <div className="h-full flex items-end pb-0 ml-1">
            {/* Tab */}
            <div className="bg-white border-t border-t-[#bbbbbb] border-l border-l-[#bbbbbb] border-r border-[#bbbbbb] pl-3 pr-6 py-1 flex items-center justify-start gap-[6px] relative h-[31px] w-[125px]">
              <FontAwesomeIcon icon={faInfo} className="text-[11px] text-[#666]" />
              <span className="text-[14px] text-[#333] font-bold">info</span>
              {/* Bottom border cover to connect with content */}
              <div className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-white"></div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-[#f3f3f3] border-b border-[#ddd] px-3 py-2">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search questions"
              aria-label="Search table of contents questions"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  if (searchQuery) {
                    setSearchQuery(''); // Clear search first
                  } else {
                    onToggle?.(); // Close TOC if search is already empty
                  }
                }
              }}
              className="w-full px-2 py-1 text-[12px] border border-[#ccc] rounded-sm bg-white placeholder-[#999] focus:outline focus:outline-2 focus:outline-[#3b82f6] focus:border-[#3b82f6]"
            />
          </div>
        </div>
      
        {/* Expandable Sections */}
        <div className="flex-1 overflow-y-auto bg-white">
          {/* TOC Items */}
          <nav aria-label="Document sections">
            <ul className="space-y-0" aria-live="polite" aria-atomic="true">
              {filteredSections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "w-full text-left pl-1 pr-3 py-[3px] text-[12px] transition-all duration-150",
                      "hover:bg-[#f0f0f0]",
                      "flex items-center gap-2",
                      "focus:outline focus:outline-2 focus:outline-[#3b82f6]",
                      activeSection === section.id
                        ? "bg-[#e8e8e8] text-[#333] font-medium"
                        : "text-[#555]"
                    )}
                  >
                    <svg className="w-3 h-3 text-[#999] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span
                      className="truncate"
                      onMouseEnter={(e) => onItemMouseEnter && onItemMouseEnter(e, section.text)}
                      onMouseLeave={() => onItemMouseLeave && onItemMouseLeave()}
                    >
                      {section.text}
                    </span>
                  </button>
                </li>
              ))}
              {filteredSections.length === 0 && searchQuery && (
                <li className="px-3 py-2 text-[12px] text-[#999]" role="status">
                  No matching questions
                </li>
              )}
              {sections.length === 0 && (
                <li className="px-3 py-2 text-[12px] text-[#999]">
                  Loading content...
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>

      {/* Always-visible sidebar indicator - Simple grey bar like left sidebar */}
      <div
        className="absolute transition-all duration-300 ease-in-out z-30"
        style={{
          left: collapsed ? "1px" : "-6px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "4px",
          height: "60px",
          borderRadius: "2px",
          backgroundColor: "#999",
        }}
        onMouseEnter={() => setShowSidebarToggle(true)}
        onMouseLeave={() => setShowSidebarToggle(false)}
      />

      {/* Toggle Button Hover Area */}
      <div
        className="absolute z-[1]"
        style={{
          left: collapsed ? "-25px" : "-32px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "30px",
          height: "80px",
          transition: "left 300ms ease-in-out",
        }}
        onMouseEnter={() => {
          setShowSidebarToggle(true);
          if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
          }
          tooltipTimeoutRef.current = setTimeout(() => {
            setShowSidebarTooltip(true);
            setTimeout(() => setShowSidebarTooltip(false), 1000);
          }, 250);
        }}
        onMouseLeave={() => {
          setShowSidebarToggle(false);
          setShowSidebarTooltip(false);
          if (tooltipTimeoutRef.current) {
            clearTimeout(tooltipTimeoutRef.current);
            tooltipTimeoutRef.current = null;
          }
        }}
      >
        <div className="relative group">
          <button
            className={`absolute w-6 h-12 flex items-center justify-center transition-transform duration-200 ${
              showSidebarToggle || collapsed || useOverlay
                ? "opacity-100"
                : "opacity-0 pointer-events-none"
            } ${
              showSidebarToggle || useOverlay
                ? "bg-white hover:bg-gray-50 border border-gray-300 shadow-sm"
                : "bg-transparent border border-transparent"
            }`}
            onClick={onToggle}
            onFocus={() => {
              // Auto-expand sidebar when toggle button receives focus while collapsed (keyboard accessibility)
              if (collapsed && onFocusWithin) {
                onFocusWithin();
              }
            }}
            aria-label={collapsed ? "Show table of contents" : "Hide table of contents"}
            aria-expanded={!collapsed}
            style={{
              right: "0px",
              top: "16px",
              borderRadius: "3px 0 0 3px",
              borderRight: showSidebarToggle ? "none" : undefined,
              position: "relative",
              transform: (showSidebarToggle || collapsed || useOverlay) ? "translateX(0)" : "translateX(10px)",
            }}
          >
            <svg
              className="w-3 h-3 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{
                transform: collapsed
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                transition: "transform 200ms ease",
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Custom Tooltip */}
          {showSidebarTooltip && (
            <div
              className="absolute bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-50 border border-gray-600"
              style={{
                right: "38px",
                top: "19px",
              }}
            >
              {collapsed ? "Show sidebar" : "Hide sidebar"}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
});

export default TableOfContents;