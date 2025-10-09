/**
 * SQL Escaping Utilities for Filter Values
 * 
 * Provides secure SQL escaping functions to prevent injection attacks
 * and handle special characters in filter values.
 */

/**
 * Safely escape a string value for use in SQL LIKE patterns
 * @param {string} value - The raw string value to escape
 * @returns {string} - Safely escaped value for SQL
 */
export function escapeSQLLikeValue(value) {
  if (typeof value !== 'string') {
    value = String(value);
  }

  // Remove JSON formatting wrappers
  let cleanValue = value;

  // Case 1: Single-select format: ["value"]
  if (cleanValue.startsWith('["') && cleanValue.endsWith('"]')) {
    cleanValue = cleanValue.slice(2, -2); // Remove [" and "]
  }
  // Case 2: Multi-select format (from unnest): "value"
  else if (cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
    cleanValue = cleanValue.slice(1, -1); // Remove surrounding quotes
  }

  // Escape single quotes by doubling them (SQL standard)
  cleanValue = cleanValue.replace(/'/g, "''");

  // Escape percent signs and underscores for LIKE patterns if needed
  cleanValue = cleanValue.replace(/%/g, '\\%').replace(/_/g, '\\_');

  return cleanValue;
}

/**
 * Safely escape multiple values for SQL OR conditions
 * @param {Array} values - Array of values to escape
 * @param {string} column - Column name for the LIKE condition
 * @returns {string} - Safe SQL OR condition
 */
export function buildSafeLikeOrCondition(values, column = 'answer_text') {
  if (!Array.isArray(values) || values.length === 0) {
    return '';
  }

  const conditions = values.map(value => {
    const escaped = escapeSQLLikeValue(value);
    // Match the value as it appears in JSON arrays: ["value"]
    // The pattern %"escaped"% matches "value" within the JSON array
    // We need the inner quotes because DB stores: ["Less than 6 months"]
    return `${column} LIKE '%"${escaped}"%'`;
  });

  return conditions.join(' OR ');
}

/**
 * Build a safe EXISTS clause for filter conditions
 * @param {string} questionId - The question ID
 * @param {Array} values - Array of filter values
 * @param {boolean} isMultiSelect - Whether this is a multi-select question
 * @returns {string} - Safe SQL EXISTS clause
 */
export function buildSafeExistsClause(questionId, values, isMultiSelect = false, schemaPrefix = '') {
  if (!Array.isArray(values) || values.length === 0) {
    return '';
  }

  // Validate questionId to prevent injection - should only contain alphanumeric characters
  if (!/^[A-Za-z0-9]+$/.test(questionId)) {
    console.error('Invalid questionId format:', questionId);
    return '';
  }

  const orConditions = buildSafeLikeOrCondition(
    values,
    isMultiSelect ? 'answer_text::varchar' : 'answer_text'
  );

  if (!orConditions) {
    return '';
  }

  // Use schema prefix if provided (e.g., 'survey.' for attached databases)
  const tableName = schemaPrefix ? `${schemaPrefix}responses` : 'responses';

  return `EXISTS (
      SELECT 1 FROM ${tableName}
      WHERE respondent_id = r.respondent_id
      AND question_id = '${questionId}'
      AND (${orConditions})
    )`;
}

/**
 * Validate that a SQL clause is safe (basic validation)
 * @param {string} sql - SQL clause to validate
 * @returns {object} - Validation result with isValid and issues
 */
export function validateSQLClause(sql) {
  const issues = [];
  
  // Check for dangerous SQL injection patterns
  // Note: Be careful not to flag legitimate LIKE pattern content
  const dangerousPatterns = [
    /';.*--/,                    // SQL comment injection
    /'\s*;\s*OR\s+/i,           // OR injection after statement end
    /'\s*;\s*AND\s+/i,          // AND injection after statement end
    /'\s*;\s*UNION\s+/i,        // UNION injection after statement end
    /'\s*;\s*DROP\s+/i,         // DROP injection after statement end
    /'\s*;\s*DELETE\s+/i,       // DELETE injection after statement end
    /'\s*;\s*INSERT\s+/i,       // INSERT injection after statement end
    /'\s*;\s*UPDATE\s+/i        // UPDATE injection after statement end
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(sql)) {
      issues.push('Contains potentially dangerous SQL injection pattern');
      break;
    }
  }
  
  // Check for unmatched parentheses
  const openParens = (sql.match(/\(/g) || []).length;
  const closeParens = (sql.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push(`Unmatched parentheses (${openParens} open, ${closeParens} close)`);
  }
  
  // Check for empty conditions
  if (sql.includes('()')) {
    issues.push('Contains empty conditions');
  }
  
  // Check for double AND patterns
  if (sql.includes('AND AND')) {
    issues.push('Contains double AND clauses');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

export default {
  escapeSQLLikeValue,
  buildSafeLikeOrCondition,
  buildSafeExistsClause,
  validateSQLClause
};