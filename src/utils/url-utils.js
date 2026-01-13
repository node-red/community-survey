// URL utilities for filter persistence in the Node-RED survey dashboard
// Handles serialization/deserialization of filters to/from URL hash parameters
// Supports both normal mode and comparison mode (side-by-side filter comparison)

import { FILTER_DEFINITIONS } from './filter-definitions.js';
import { createEmptyFilters } from './filter-utils.js';

// Constants for comparison mode URL parameters
export const COMPARISON_PREFIX_A = 'a_';
export const COMPARISON_PREFIX_B = 'b_';
export const COMPARISON_FLAG = 'compare';

/**
 * Parse a URL parameter key to extract filter category and column (if prefixed).
 * @param {string} param - URL param key (e.g., 'a_experience' or 'experience')
 * @returns {{ category: string, column: 'A'|'B'|null }} Parsed result
 */
function parsePrefixedCategory(param) {
  if (param.startsWith(COMPARISON_PREFIX_A)) {
    return { category: param.slice(COMPARISON_PREFIX_A.length), column: 'A' };
  }
  if (param.startsWith(COMPARISON_PREFIX_B)) {
    return { category: param.slice(COMPARISON_PREFIX_B.length), column: 'B' };
  }
  return { category: param, column: null };
}

/**
 * Generate a stable section ID from text.
 * Used consistently across ChartHeader and TableOfContents.
 * Algorithm: lowercase, replace non-alphanumeric with dashes, collapse multiple dashes, trim edges.
 *
 * @param {string} text - The heading text to convert
 * @returns {string} A stable section ID (e.g., 'section-how-did-you-first-learn')
 */
export function generateSectionId(text) {
  if (!text) return '';
  const cleanText = text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `section-${cleanText}`;
}

/**
 * Convert a filter value to a URL-safe slug.
 * Handles both JSON-wrapped values and plain strings.
 *
 * Examples:
 *   '["Less than 6 months"]' -> 'less-than-6-months'
 *   'Hobbyist/Personal projects (home automation, learning, experiments)' -> 'hobbyist-personal-projects-home-automation-learning-experiments'
 *   'Europe' -> 'europe'
 */
export function createFilterValueSlug(value) {
  if (!value) return '';

  // Remove JSON array wrapper if present: '["value"]' -> 'value'
  let cleanValue = value;
  if (cleanValue.startsWith('["') && cleanValue.endsWith('"]')) {
    cleanValue = cleanValue.slice(2, -2);
  }

  // Convert to lowercase, replace non-alphanumeric with dashes, collapse multiple dashes
  return cleanValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Find the original filter value from a URL slug.
 * Searches through provided filterOptions first, then falls back to FILTER_DEFINITIONS.
 *
 * @param {string} slug - The URL slug to match
 * @param {string} category - The filter category (e.g., 'experience', 'purpose')
 * @param {Object|null} filterOptions - Filter options from database (optional)
 * @returns {string|null} The original filter value, or null if not found
 */
export function matchSlugToFilterValue(slug, category, filterOptions = null) {
  // Use provided filterOptions if available, fall back to FILTER_DEFINITIONS
  const dbOptionsObj = filterOptions?.[category];
  const definitionOptions = FILTER_DEFINITIONS[category]?.options;

  // Extract the options array from the database options object
  // filterOptions[category] has structure: { questionId, name, options: [...] }
  const dbOptions = dbOptionsObj?.options;

  // Prefer database options (actual values), fall back to definitions
  // Ensure we have an array before iterating
  const options = (Array.isArray(dbOptions) && dbOptions.length > 0)
    ? dbOptions
    : definitionOptions;
  if (!options || !Array.isArray(options)) return null;

  // Search through options to find matching slug
  // Handle both array of strings (from database) and array of objects (from FILTER_DEFINITIONS)
  for (const option of options) {
    const value = typeof option === 'string' ? option : option.value;
    const optionSlug = createFilterValueSlug(value);
    if (optionSlug === slug) {
      return value;
    }
  }

  return null;
}

/**
 * Check if any filters are active (non-empty).
 */
export function hasActiveFilters(filters) {
  if (!filters) return false;
  return Object.values(filters).some(values => values && values.length > 0);
}

/**
 * Serialize filter state and section ID to a URL hash string.
 * Supports both normal mode and comparison mode.
 *
 * @param {Object} filters - Filter state object (used in normal mode, ignored in comparison mode)
 * @param {string|null} sectionId - Current section ID (e.g., 'section-how-did-you-first-learn')
 * @param {Object|null} comparisonState - Comparison mode state (optional)
 * @param {boolean} comparisonState.comparisonMode - Whether comparison mode is active
 * @param {Object} comparisonState.filtersA - Column A filters
 * @param {Object} comparisonState.filtersB - Column B filters
 * @returns {string} URL hash string (e.g., '#section-id?compare=true&a_experience=slug&b_experience=slug')
 */
export function serializeFiltersToURL(filters, sectionId = null, comparisonState = null) {
  const filterParams = [];

  // Check if we're in comparison mode
  const isComparison = comparisonState?.comparisonMode === true;

  if (isComparison) {
    // Add compare flag
    filterParams.push(`${COMPARISON_FLAG}=true`);

    // Serialize Column A filters with 'a_' prefix
    for (const [category, values] of Object.entries(comparisonState.filtersA || {})) {
      if (values && values.length > 0) {
        const slugs = values.map(v => createFilterValueSlug(v)).filter(Boolean);
        if (slugs.length > 0) {
          filterParams.push(`${COMPARISON_PREFIX_A}${category}=${slugs.join(',')}`);
        }
      }
    }

    // Serialize Column B filters with 'b_' prefix
    for (const [category, values] of Object.entries(comparisonState.filtersB || {})) {
      if (values && values.length > 0) {
        const slugs = values.map(v => createFilterValueSlug(v)).filter(Boolean);
        if (slugs.length > 0) {
          filterParams.push(`${COMPARISON_PREFIX_B}${category}=${slugs.join(',')}`);
        }
      }
    }
  } else {
    // Normal mode - existing logic unchanged
    for (const [category, values] of Object.entries(filters || {})) {
      if (values && values.length > 0) {
        const slugs = values.map(v => createFilterValueSlug(v)).filter(Boolean);
        if (slugs.length > 0) {
          filterParams.push(`${category}=${slugs.join(',')}`);
        }
      }
    }
  }

  const filterString = filterParams.length > 0 ? `?${filterParams.join('&')}` : '';
  const sectionString = sectionId || '';

  // Return hash with both section and filters
  if (!sectionString && !filterString) {
    return ''; // No hash needed
  }

  return `#${sectionString}${filterString}`;
}

/**
 * Parse URL hash to extract section ID and filter state.
 * Detects comparison mode via 'compare=true' parameter.
 *
 * @param {string} hash - URL hash (e.g., '#section-id?experience=slug1,slug2' or '#section?compare=true&a_experience=slug')
 * @param {Object|null} filterOptions - Filter options from database (optional)
 * @returns {{ sectionId: string|null, filters: Object, comparisonMode: boolean, filtersA: Object, filtersB: Object }} Parsed state
 */
export function parseFiltersFromURL(hash, filterOptions = null) {
  const emptyResult = {
    sectionId: null,
    filters: createEmptyFilters(),
    comparisonMode: false,
    filtersA: createEmptyFilters(),
    filtersB: createEmptyFilters(),
  };

  if (!hash || hash === '#') {
    return emptyResult;
  }

  // Remove leading #
  const hashContent = hash.startsWith('#') ? hash.slice(1) : hash;

  if (!hashContent) {
    return emptyResult;
  }

  // Split section from query params at first '?'
  const questionMarkIndex = hashContent.indexOf('?');
  let sectionPart = '';
  let queryPart = '';

  if (questionMarkIndex === -1) {
    // No query params, just section ID
    sectionPart = hashContent;
  } else {
    sectionPart = hashContent.slice(0, questionMarkIndex);
    queryPart = hashContent.slice(questionMarkIndex + 1);
  }

  const sectionId = sectionPart || null;
  const filters = createEmptyFilters();
  const filtersA = createEmptyFilters();
  const filtersB = createEmptyFilters();
  let comparisonMode = false;

  // Parse filter parameters
  if (queryPart) {
    const params = new URLSearchParams(queryPart);

    // Check for comparison mode flag first
    if (params.get(COMPARISON_FLAG) === 'true') {
      comparisonMode = true;
    }

    for (const [param, slugString] of params.entries()) {
      // Skip the compare flag itself
      if (param === COMPARISON_FLAG) continue;

      // Parse prefixed or unprefixed category
      const { category, column } = parsePrefixedCategory(param);

      // Only process known filter categories
      if (!FILTER_DEFINITIONS[category]) {
        if (import.meta.env.DEV) {
          console.warn(
            `⚠️ Unknown filter category in URL: "${category}". ` +
            `Valid categories: ${Object.keys(FILTER_DEFINITIONS).join(', ')}`
          );
        }
        continue;
      }

      const slugs = slugString.split(',').filter(Boolean);
      const values = slugs
        .map(slug => matchSlugToFilterValue(slug, category, filterOptions))
        .filter(Boolean);

      if (values.length > 0) {
        if (comparisonMode && column === 'A') {
          filtersA[category] = values;
        } else if (comparisonMode && column === 'B') {
          filtersB[category] = values;
        } else if (!comparisonMode && column === null) {
          // Normal mode - unprefixed params only
          filters[category] = values;
        }
        // Note: Prefixed params in non-comparison URLs are ignored (backwards compatible)
      } else if (slugs.length > 0 && import.meta.env.DEV) {
        // Slugs provided but none matched - log for debugging
        console.warn(
          `⚠️ URL filter values for "${category}" didn't match any options:`,
          slugs
        );
      }
    }
  }

  return { sectionId, filters, comparisonMode, filtersA, filtersB };
}

/**
 * Get the current section ID from the URL hash (excluding filter params).
 */
export function getCurrentSectionFromURL() {
  const { sectionId } = parseFiltersFromURL(window.location.hash);
  return sectionId;
}

/**
 * Compare two filter states for equality.
 */
export function areFiltersEqual(filters1, filters2) {
  if (!filters1 || !filters2) return filters1 === filters2;

  const keys1 = Object.keys(filters1);
  const keys2 = Object.keys(filters2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    const arr1 = filters1[key] || [];
    const arr2 = filters2[key] || [];

    if (arr1.length !== arr2.length) return false;

    // Sort and compare
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();

    for (let i = 0; i < sorted1.length; i++) {
      if (sorted1[i] !== sorted2[i]) return false;
    }
  }

  return true;
}

/**
 * Get the filter query params from the current URL hash.
 * Returns the query string portion (including leading '?') or empty string if no filters.
 */
export function getFilterQueryFromHash() {
  const hash = window.location.hash;
  if (!hash) return '';

  const questionMarkIndex = hash.indexOf('?');
  if (questionMarkIndex === -1) return '';

  return hash.slice(questionMarkIndex);
}

/**
 * Build a hash string combining a section ID with current URL filter params.
 * This reads the filter params directly from the current URL, so no filter state needs to be passed.
 *
 * @param {string} sectionId - Section ID (e.g., 'section-how-did-you-first-learn')
 * @returns {string} Hash string (e.g., '#section-id?filter=params')
 */
export function buildHashPreservingFilters(sectionId) {
  const filterQuery = getFilterQueryFromHash();
  return `#${sectionId || ''}${filterQuery}`;
}

/**
 * Get the full URL for a section, preserving current filter params.
 * NOTE: This reads from window.location.hash which may be stale due to debouncing.
 * Prefer getFullURLWithFiltersState() when you have access to the React filters state.
 *
 * @param {string} sectionId - Section ID
 * @returns {string} Full URL with origin, pathname, and hash with filters
 */
export function getFullURLWithFilters(sectionId) {
  const hash = buildHashPreservingFilters(sectionId);
  return `${window.location.origin}${window.location.pathname}${hash}`;
}

/**
 * Get the full URL for a section using the provided filters state.
 * This is the preferred method when you have access to React filters state,
 * as it ensures the URL reflects the current state rather than potentially stale URL hash.
 *
 * @param {Object} filters - Current filter state from React
 * @param {string} sectionId - Section ID
 * @returns {string} Full URL with origin, pathname, and hash with filters
 */
export function getFullURLWithFiltersState(filters, sectionId) {
  const hash = serializeFiltersToURL(filters, sectionId);
  return `${window.location.origin}${window.location.pathname}${hash}`;
}

/**
 * Get the full URL for a section with comparison mode state.
 * Used by ChartHeader when comparison mode is active.
 *
 * @param {Object} comparisonState - { comparisonMode, filtersA, filtersB }
 * @param {string} sectionId - Section ID
 * @returns {string} Full URL with origin, pathname, and hash with comparison state
 */
export function getFullURLWithComparisonState(comparisonState, sectionId) {
  const hash = serializeFiltersToURL(null, sectionId, comparisonState);
  return `${window.location.origin}${window.location.pathname}${hash}`;
}
