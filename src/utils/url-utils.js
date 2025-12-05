// URL utilities for filter persistence in the Node-RED survey dashboard
// Handles serialization/deserialization of filters to/from URL hash parameters

import { FILTER_DEFINITIONS } from './filter-definitions.js';
import { createEmptyFilters } from './filter-utils.js';

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
  const dbOptions = filterOptions?.[category];
  const definitionOptions = FILTER_DEFINITIONS[category]?.options;

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
 *
 * @param {Object} filters - Filter state object
 * @param {string|null} sectionId - Current section ID (e.g., 'section-how-did-you-first-learn')
 * @returns {string} URL hash string (e.g., '#section-id?experience=slug1,slug2&purpose=slug3')
 */
export function serializeFiltersToURL(filters, sectionId = null) {
  const filterParams = [];

  // Build filter parameters
  for (const [category, values] of Object.entries(filters)) {
    if (values && values.length > 0) {
      const slugs = values.map(v => createFilterValueSlug(v)).filter(Boolean);
      if (slugs.length > 0) {
        filterParams.push(`${category}=${slugs.join(',')}`);
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
 *
 * @param {string} hash - URL hash (e.g., '#section-id?experience=slug1,slug2')
 * @param {Object|null} filterOptions - Filter options from database (optional)
 * @returns {{ sectionId: string|null, filters: Object }} Parsed section and filters
 */
export function parseFiltersFromURL(hash, filterOptions = null) {
  const emptyResult = { sectionId: null, filters: createEmptyFilters() };

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

  // Parse filter parameters
  if (queryPart) {
    const params = new URLSearchParams(queryPart);

    for (const [category, slugString] of params.entries()) {
      // Only process known filter categories
      if (FILTER_DEFINITIONS[category]) {
        const slugs = slugString.split(',').filter(Boolean);
        const values = slugs
          .map(slug => matchSlugToFilterValue(slug, category, filterOptions))
          .filter(Boolean);

        if (values.length > 0) {
          filters[category] = values;
        } else if (slugs.length > 0 && import.meta.env.DEV) {
          // Slugs provided but none matched - log for debugging
          console.warn(
            `⚠️ URL filter values for "${category}" didn't match any options:`,
            slugs
          );
        }
      } else if (category && import.meta.env.DEV) {
        // Unknown filter category in URL - could be typo or outdated link
        console.warn(
          `⚠️ Unknown filter category in URL: "${category}". ` +
          `Valid categories: ${Object.keys(FILTER_DEFINITIONS).join(', ')}`
        );
      }
    }
  }

  return { sectionId, filters };
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
 *
 * @param {string} sectionId - Section ID
 * @returns {string} Full URL with origin, pathname, and hash with filters
 */
export function getFullURLWithFilters(sectionId) {
  const hash = buildHashPreservingFilters(sectionId);
  return `${window.location.origin}${window.location.pathname}${hash}`;
}
