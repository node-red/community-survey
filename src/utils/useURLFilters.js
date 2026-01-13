// Custom hook for bidirectional URL <-> filter synchronization
// Manages filter state persistence in URL hash parameters
// Supports both normal mode and comparison mode

import { useEffect, useRef, useCallback } from 'react';
import {
  parseFiltersFromURL,
  serializeFiltersToURL,
  hasActiveFilters,
  getCurrentSectionFromURL,
} from './url-utils.js';

/**
 * Custom hook for synchronizing filter state with URL hash.
 * Supports both normal mode and comparison mode.
 *
 * Features:
 * - Restores filters from URL on initial page load
 * - Updates URL when filters change (debounced, using replaceState)
 * - Handles comparison mode state (filtersA, filtersB)
 *
 * @param {Object} filters - Current filter state (normal mode)
 * @param {Object} filterOptions - Filter options from database (for URL deserialization)
 * @param {Function} onFiltersRestored - Callback when filters are restored from URL
 *                                       Signature: (filters, comparisonState) => void
 *                                       comparisonState: { comparisonMode, filtersA, filtersB } | null
 * @returns {Object} - { updateURLWithFilters, updateURLWithComparisonState, isInitialized, isRestoring }
 */
export function useURLFilters(filters, filterOptions, onFiltersRestored) {
  const isInitializedRef = useRef(false);
  const isRestoringRef = useRef(false); // Guard against concurrent restorations
  const debounceTimeoutRef = useRef(null);
  const lastSerializedRef = useRef('');

  // Restore filters from URL on mount (waits for filterOptions to be loaded)
  useEffect(() => {
    // Prevent concurrent restorations
    if (isRestoringRef.current) return;

    // Wait for filterOptions to be populated before parsing URL
    // This ensures we can correctly deserialize database values (e.g., useCases)
    const hasFilterOptions = filterOptions && Object.keys(filterOptions).length > 0;
    if (!hasFilterOptions) return;

    // Only run once after filterOptions are loaded
    if (isInitializedRef.current) return;

    const result = parseFiltersFromURL(window.location.hash, filterOptions);

    // Mark as initialized immediately to prevent re-runs
    isInitializedRef.current = true;

    if (result.comparisonMode) {
      // Comparison mode URL - restore full comparison state
      const hasComparisonFilters = hasActiveFilters(result.filtersA) || hasActiveFilters(result.filtersB);
      if (hasComparisonFilters || result.comparisonMode) {
        isRestoringRef.current = true;
        lastSerializedRef.current = serializeFiltersToURL(null, result.sectionId, {
          comparisonMode: true,
          filtersA: result.filtersA,
          filtersB: result.filtersB,
        });

        // Call restoration callback with comparison state
        Promise.resolve(onFiltersRestored(null, {
          comparisonMode: true,
          filtersA: result.filtersA,
          filtersB: result.filtersB,
        })).finally(() => {
          isRestoringRef.current = false;
        });
      }
    } else if (hasActiveFilters(result.filters)) {
      // Normal mode URL with filters
      isRestoringRef.current = true;
      lastSerializedRef.current = serializeFiltersToURL(result.filters, getCurrentSectionFromURL());

      // Call restoration callback - normal mode (comparisonState = null)
      Promise.resolve(onFiltersRestored(result.filters, null)).finally(() => {
        isRestoringRef.current = false;
      });
    }
  }, [filterOptions, onFiltersRestored]);

  // Listen for hash changes to handle browser back/forward and direct URL changes
  useEffect(() => {
    const handleHashChange = () => {
      // Only handle hash changes if filterOptions are loaded and not already restoring
      const hasFilterOptions = filterOptions && Object.keys(filterOptions).length > 0;
      if (!hasFilterOptions || isRestoringRef.current) return;

      const result = parseFiltersFromURL(window.location.hash, filterOptions);

      if (result.comparisonMode) {
        // Comparison mode URL
        const hasComparisonFilters = hasActiveFilters(result.filtersA) || hasActiveFilters(result.filtersB);
        if (hasComparisonFilters || result.comparisonMode) {
          isRestoringRef.current = true;
          lastSerializedRef.current = serializeFiltersToURL(null, result.sectionId, {
            comparisonMode: true,
            filtersA: result.filtersA,
            filtersB: result.filtersB,
          });

          Promise.resolve(onFiltersRestored(null, {
            comparisonMode: true,
            filtersA: result.filtersA,
            filtersB: result.filtersB,
          })).finally(() => {
            isRestoringRef.current = false;
          });
        }
      } else if (hasActiveFilters(result.filters)) {
        // Normal mode URL
        isRestoringRef.current = true;
        lastSerializedRef.current = serializeFiltersToURL(result.filters, getCurrentSectionFromURL());

        Promise.resolve(onFiltersRestored(result.filters, null)).finally(() => {
          isRestoringRef.current = false;
        });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [filterOptions, onFiltersRestored]);

  /**
   * Update URL with new filter state (normal mode).
   * Debounced to avoid excessive history manipulation during rapid changes.
   * Uses replaceState (no history entry) as per user preference.
   */
  const updateURLWithFilters = useCallback((newFilters) => {
    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const currentSection = getCurrentSectionFromURL();
      const newHash = serializeFiltersToURL(newFilters, currentSection);

      // Avoid unnecessary updates
      if (newHash === lastSerializedRef.current) return;

      lastSerializedRef.current = newHash;

      if (newHash) {
        window.history.replaceState(null, '', newHash);
      } else {
        // No filters and no section - remove hash
        const url = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', url);
      }
    }, 150); // Short debounce for responsive feel
  }, []);

  /**
   * Update URL with comparison mode state.
   * Debounced to avoid excessive history manipulation during rapid changes.
   * Uses replaceState (no history entry) as per user preference.
   *
   * @param {Object} comparisonState - { comparisonMode, filtersA, filtersB }
   */
  const updateURLWithComparisonState = useCallback((comparisonState) => {
    // Clear any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const currentSection = getCurrentSectionFromURL();
      const newHash = serializeFiltersToURL(null, currentSection, comparisonState);

      // Avoid unnecessary updates
      if (newHash === lastSerializedRef.current) return;

      lastSerializedRef.current = newHash;

      if (newHash) {
        window.history.replaceState(null, '', newHash);
      } else {
        // No filters and no section - remove hash
        const url = window.location.pathname + window.location.search;
        window.history.replaceState(null, '', url);
      }
    }, 150); // Short debounce for responsive feel
  }, []);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    updateURLWithFilters,
    updateURLWithComparisonState,
    isInitialized: isInitializedRef.current,
    isRestoring: isRestoringRef.current,
  };
}
