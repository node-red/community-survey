// Custom hook for bidirectional URL <-> filter synchronization
// Manages filter state persistence in URL hash parameters

import { useEffect, useRef, useCallback } from 'react';
import {
  parseFiltersFromURL,
  serializeFiltersToURL,
  hasActiveFilters,
  getCurrentSectionFromURL,
} from './url-utils.js';

// Note: serializeFiltersToURL is used indirectly via getCurrentSectionFromURL for lastSerializedRef

/**
 * Custom hook for synchronizing filter state with URL hash.
 *
 * Features:
 * - Restores filters from URL on initial page load
 * - Updates URL when filters change (debounced, using replaceState)
 * - Provides helper to update section while preserving filter params
 *
 * @param {Object} filters - Current filter state
 * @param {Object} filterOptions - Filter options from database (for URL deserialization)
 * @param {Function} onFiltersRestored - Callback when filters are restored from URL
 *                                       Receives (filters) and should trigger data fetch
 * @returns {Object} - { updateURLWithFilters, buildHashWithFilters, isInitialized }
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

    const { filters: urlFilters } = parseFiltersFromURL(window.location.hash, filterOptions);

    // Mark as initialized immediately to prevent re-runs
    isInitializedRef.current = true;

    if (hasActiveFilters(urlFilters)) {
      // URL has filters - restore them
      isRestoringRef.current = true;
      lastSerializedRef.current = serializeFiltersToURL(urlFilters, getCurrentSectionFromURL());

      // Call restoration callback - async operations handled by caller
      Promise.resolve(onFiltersRestored(urlFilters)).finally(() => {
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

      const { filters: urlFilters } = parseFiltersFromURL(window.location.hash, filterOptions);

      if (hasActiveFilters(urlFilters)) {
        isRestoringRef.current = true;
        lastSerializedRef.current = serializeFiltersToURL(urlFilters, getCurrentSectionFromURL());

        Promise.resolve(onFiltersRestored(urlFilters)).finally(() => {
          isRestoringRef.current = false;
        });
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [filterOptions, onFiltersRestored]);

  /**
   * Update URL with new filter state.
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
    isInitialized: isInitializedRef.current,
    isRestoring: isRestoringRef.current,
  };
}
