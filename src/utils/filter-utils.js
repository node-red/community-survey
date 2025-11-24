// Centralized filter utilities to maintain DRY principle - UPDATED
import { FILTER_DEFINITIONS } from './filter-definitions.js';
import { buildSafeExistsClause, buildSafeExistsClauseNumeric, validateSQLClause } from './sql-escape-utils.js';
import { getCountryCodesForContinents } from './continent-mapping.js';

// Single source of truth for filter to question ID mappings
export const FILTER_MAPPINGS = {
  continent: 'GpGjoO', // Special filter - uses country codes via continent mapping
  experience: 'ElR6d2',
  purpose: 'VPeNQ6',
  orgSize: 'joRz61',
  industry: '2AWoaM',
  influence: 'P9xr1x',
  programming: 'xDqzMk',
  complexity: 'kG2v5Z',
  production: 'ZO7eJB',
  instances: 'ZO7eO5',
  useCases: 'rO4YaX',
  environment: '476OJ5',
  emailDomain: '2AWolV'
};

// Reverse mapping for questionId to filter category
export const QUESTION_TO_FILTER = Object.fromEntries(
  Object.entries(FILTER_MAPPINGS).map(([key, value]) => [value, key])
);

// Get question metadata from filter definitions
export const getQuestionMetadata = () => {
  const metadata = {};
  for (const [filterKey, questionId] of Object.entries(FILTER_MAPPINGS)) {
    const definition = FILTER_DEFINITIONS[filterKey];
    if (definition) {
      metadata[questionId] = definition.name;
    }
  }
  return metadata;
};

// Create empty filter state based on available filters
export const createEmptyFilters = () => {
  return Object.keys(FILTER_MAPPINGS).reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});
};

// Build SQL WHERE clause from filters
export const buildFilterWhereClause = async (filters) => {
  const conditions = [];

  for (const [filterType, questionId] of Object.entries(FILTER_MAPPINGS)) {
    if (filters[filterType] && filters[filterType].length > 0) {
      if (import.meta.env.DEV) console.log(`Building WHERE clause for ${filterType} (${questionId}):`, filters[filterType]);

      // EXTRA LOGGING for experience filter
      if (import.meta.env.DEV && filterType === 'experience') {
        console.log(`🎯 EXPERIENCE FILTER - Raw values:`, JSON.stringify(filters[filterType]));
        console.log(`🎯 EXPERIENCE FILTER - Question ID:`, questionId);
      }

      // Filter out null values
      const validFilterValues = filters[filterType].filter(value => value !== null && value !== undefined && value !== '');

      if (validFilterValues.length === 0) {
        if (import.meta.env.DEV) console.log(`  Skipping ${filterType} - no valid values after filtering nulls`);
        continue;
      }

      // Special handling for continent filter - convert continent names to country codes
      if (filterType === 'continent') {
        const countryCodes = getCountryCodesForContinents(validFilterValues);
        if (import.meta.env.DEV) console.log(`🌍 CONTINENT FILTER - Converting continents ${validFilterValues} to ${countryCodes.length} country codes`);

        if (countryCodes.length > 0) {
          // Build SQL condition matching any of the country codes
          // Country codes are stored as plain JSON numbers (not strings in arrays) in question GpGjoO
          // Use the numeric version which generates: answer_text::varchar = '840' OR answer_text::varchar = '124'
          const sqlCondition = buildSafeExistsClauseNumeric(questionId, countryCodes, 'survey.');
          if (sqlCondition) {
            if (import.meta.env.DEV) console.log(`  Generated continent SQL:`, sqlCondition.substring(0, 150) + '...');
            conditions.push(sqlCondition);
          }
        }
        continue; // Skip normal processing for continent
      }

      // Special handling for multi-select questions
      const isMultiSelect = questionId === '476OJ5' || questionId === 'VPeNQ6' || questionId === 'rO4YaX' || questionId === 'erJzEk' || questionId === 'NXjP0j'; // Run Environment, Primary Purpose, Use Cases, Dashboard Solutions, Production Barriers

      if (import.meta.env.DEV) console.log(`  Processing ${filterType} with ${validFilterValues.length} values`);
      if (import.meta.env.DEV) console.log(`  Is multi-select: ${isMultiSelect}`);

      if (isMultiSelect) {
        // For multi-select, use LIKE to match values within JSON arrays
        if (import.meta.env.DEV) console.log(`    Processing multi-select filter for ${questionId} (${filterType})`);

        // Pass 'survey.' as schema prefix for DuckDB WASM attached databases
        const sqlCondition = buildSafeExistsClause(questionId, validFilterValues, true, 'survey.');
        if (sqlCondition) {
          if (import.meta.env.DEV) console.log(`  Generated secure multi-select SQL:`, sqlCondition.substring(0, 100) + '...');
          conditions.push(sqlCondition);
        } else {
          if (import.meta.env.DEV) console.log(`  Skipping ${filterType} - no valid SQL condition generated`);
        }
      } else {
        // For regular single-select, use secure SQL generation
        if (import.meta.env.DEV) console.log(`    Single-select values before mapping:`, validFilterValues);
        // Pass 'survey.' as schema prefix for DuckDB WASM attached databases
        const sqlCondition = buildSafeExistsClause(questionId, validFilterValues, false, 'survey.');
        if (sqlCondition) {
          if (import.meta.env.DEV) console.log(`  Generated secure single-select SQL:`, sqlCondition.substring(0, 100) + '...');

          // EXTRA LOGGING for experience filter
          if (import.meta.env.DEV && filterType === 'experience') {
            console.log(`🎯 EXPERIENCE FILTER - Full SQL condition:`, sqlCondition);
          }

          conditions.push(sqlCondition);
        } else {
          if (import.meta.env.DEV) console.log(`  Skipping ${filterType} - no valid SQL condition generated`);
        }
      }
    }
  }
  
  // Join conditions with AND - conditions should be clean without leading AND
  const cleanedConditions = conditions.map(condition => condition.trim()).filter(c => c.length > 0);
  const finalSQL = cleanedConditions.join(' AND ');

  if (import.meta.env.DEV) console.log('🔍 Filter debugging:');
  if (import.meta.env.DEV) console.log('  Raw conditions:', conditions.length);
  if (import.meta.env.DEV) console.log('  Cleaned conditions:', cleanedConditions);
  if (import.meta.env.DEV) console.log('  Final WHERE clause:', finalSQL.substring(0, 300) + (finalSQL.length > 300 ? '...' : ''));
  
  // Validate the generated SQL for security issues
  const validation = validateSQLClause(finalSQL);
  if (!validation.isValid) {
    console.error('❌ Generated SQL failed security validation:', validation.issues);
    console.error('❌ Unsafe SQL clause:', finalSQL);
    return ''; // Return empty instead of potentially dangerous SQL
  }
  
  return finalSQL;
};

// Build filter placeholders for SQL templates
export const buildFilterPlaceholders = async (filters) => {
  const placeholders = {};

  for (const [filterType, questionId] of Object.entries(FILTER_MAPPINGS)) {
    const placeholderKey = `{${filterType.toUpperCase()}_FILTER}`;
    const isMultiSelect = questionId === '476OJ5' || questionId === 'VPeNQ6' || questionId === 'rO4YaX' || questionId === 'erJzEk'; // Run Environment, Primary Purpose, Use Cases, Dashboard Solutions

    if (filters[filterType] && filters[filterType].length > 0) {
      // Filter out null/undefined values before processing
      const cleanedFilters = filters[filterType].filter(value => value != null && value !== '');

      if (cleanedFilters.length === 0) {
        placeholders[placeholderKey] = '';
        continue;
      }

      if (isMultiSelect) {
        // For multi-select, use LIKE to match values within JSON arrays
        const orConditions = cleanedFilters.map(value => {
          const cleanValue = (typeof value === 'string' ? value : value.toString())
            .replace(/^\["/, '').replace(/"\]$/, '').replace(/'/g, "''");
          return `answer_text::varchar LIKE '%"${cleanValue}"%'`;
        }).join(' OR ');

        // Only add placeholder if we have valid OR conditions
        if (orConditions && orConditions.trim()) {
          placeholders[placeholderKey] = `EXISTS (SELECT 1 FROM responses WHERE respondent_id = r.respondent_id AND question_id = '${questionId}' AND (${orConditions}))`;
        } else {
          placeholders[placeholderKey] = '';
        }
      } else {
        // For regular single-select, use LIKE instead of exact match to avoid bracket issues
        const orConditions = cleanedFilters
          .map(v => {
            const valueStr = v.toString();
            // Extract the clean value from JSON array format if needed
            let cleanValue;
            if (valueStr.startsWith('["') && valueStr.endsWith('"]')) {
              // Remove the JSON array wrapper to get the clean value
              cleanValue = valueStr.slice(2, -2); // Remove [" and "]
            } else {
              cleanValue = valueStr;
            }

            // Escape single quotes in the clean value
            const escapedValue = cleanValue.replace(/'/g, "''");

            // Use LIKE pattern matching to avoid bracket parsing issues
            return `answer_text LIKE '%"${escapedValue}"%'`;
          })
          .join(' OR ');

        placeholders[placeholderKey] = `EXISTS (SELECT 1 FROM responses WHERE respondent_id = r.respondent_id AND question_id = '${questionId}' AND (${orConditions}))`;
      }
    } else {
      placeholders[placeholderKey] = '';
    }
  }

  return placeholders;
};

// Count active filters
export const countActiveFilters = (filters) => {
  return Object.values(filters).reduce((total, filterArray) => 
    total + (Array.isArray(filterArray) ? filterArray.length : 0), 0);
};

// Normalize filter values for consistent handling
export const normalizeFilterValue = (value) => {
  // Remove any extra quotes or brackets if they exist
  return value.replace(/^["'[]|["'\]]$/g, '');
};

// Check if two filter sets are equal
export const areFiltersEqual = (filters1, filters2) => {
  const keys1 = Object.keys(filters1).sort();
  const keys2 = Object.keys(filters2).sort();
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    
    const values1 = (filters1[key] || []).sort();
    const values2 = (filters2[key] || []).sort();
    
    if (values1.length !== values2.length) return false;
    if (values1.some((v, i) => v !== values2[i])) return false;
  }
  
  return true;
};

export default {
  FILTER_MAPPINGS,
  QUESTION_TO_FILTER,
  getQuestionMetadata,
  createEmptyFilters,
  buildFilterWhereClause,
  buildFilterPlaceholders,
  countActiveFilters,
  normalizeFilterValue,
  areFiltersEqual
};