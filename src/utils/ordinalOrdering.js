/**
 * Custom ordering for ordinal/categorical survey questions
 * These questions should be displayed in logical order, not by percentage
 */

export const ORDINAL_ORDERS = {
  // Experience with Node-RED
  'ElR6d2': [
    'Less than 6 months',
    '6 months to 1 year',
    '1 to 2 years',
    '2 to 5 years',
    'More than 5 years (I\'m a veteran!)',
    'Prefer not to say'
  ],
  
  // Organization Size
  'joRz61': [
    'Not applicable',
    '1-10 people',
    '11-50 people',
    '51-200 people',
    '201-500 people',
    '500+ people'
  ],
  
  // Decision Influence
  'P9xr1x': [
    'Not applicable (personal use only)',
    'I implement what others choose',
    'I provide input but others decide',
    'I strongly influence the decision',
    'I make the final decision'
  ],
  
  // Programming Experience
  'xDqzMk': [
    'None - I\'m not a programmer',
    'Beginner - basic scripting or configuration',
    'Intermediate - comfortable with multiple languages',
    'Advanced - professional developer or architect',
    'Expert - deep technical expertise across technologies',
    'Prefer not to say'
  ],
  
  // Time to feel comfortable
  'qGrzbg': [
    'Less than a week',
    '1-2 weeks',
    'About a month',
    '2-3 months',
    'Around 6 months',
    'More than 6 months',
    'Still learning'
  ],
  
  // Production Usage
  'ZO7eJB': [
    'No, it is not applicable for my work',
    'No, and unlikely to in the future',
    'No, but I would like to',
    'Yes, for some production workloads',
    'Yes, extensively in production systems'
  ],
  
  // Flow Complexity
  'kG2v5Z': [
    'Simple flows (under 20 nodes, minimal tabs)',
    'Medium complexity (20-50 nodes, multiple tabs)',
    'Complex flows (50+ nodes, multiple tabs)',
    'Advanced flows (100+ nodes, multiple tabs)',
    'Enterprise-scale deployments (flows utilizing multiple Node-RED instances)'
  ],
  
  // Number of instances
  'ZO7eO5': [
    '1',
    '2-5',
    '6-10',
    '11-50',
    '51-200',
    '200-999',
    '1000+'
  ]
};

/**
 * Sort data according to predefined ordinal order
 * @param {Array} data - Array of objects with 'category' field
 * @param {string} questionId - Question ID to determine ordering
 * @returns {Array} Sorted array
 */
export function sortByOrdinalOrder(data, questionId) {
  const order = ORDINAL_ORDERS[questionId];

  if (!order) {
    // No custom order defined, return as-is
    return data;
  }

  // Create a map for quick lookup of order indices
  const orderMap = new Map(order.map((item, index) => [item, index]));

  // Sort data according to the predefined order
  return [...data].sort((a, b) => {
    const aIndex = orderMap.get(a.category);
    const bIndex = orderMap.get(b.category);

    // Handle items not in the predefined order (put them at the end)
    if (aIndex === undefined && bIndex === undefined) {
      return 0; // Keep original order for undefined items
    }
    if (aIndex === undefined) return 1;
    if (bIndex === undefined) return -1;

    return aIndex - bIndex;
  });
}

/**
 * Apply baseline ordering to data (for charts that sort by count DESC)
 * Items in baseline order appear first (including missing items with count: 0),
 * new items appear at end sorted by count
 * @param {Array} data - Array of objects with 'answer_text' and 'count' fields
 * @param {Array} baselineOrder - Array of answer_text values in baseline order
 * @returns {Array} Sorted array with all baseline items present
 */
export function applyBaselineOrder(data, baselineOrder) {
  if (!baselineOrder || baselineOrder.length === 0) {
    // No baseline, return data sorted by count DESC
    return [...data].sort((a, b) => b.count - a.count);
  }

  // Create a map of existing data items by answer_text
  const dataMap = new Map(data.map(item => [item.answer_text, item]));

  // Build result array with all baseline items in order
  const baselineItems = baselineOrder.map(answerText => {
    if (dataMap.has(answerText)) {
      // Item exists in filtered data
      return dataMap.get(answerText);
    } else {
      // Item missing from filtered data - add with count: 0
      return {
        answer_text: answerText,
        count: 0,
        percentage: 0
      };
    }
  });

  // Find new items not in baseline
  const newItems = data.filter(item => !baselineOrder.includes(item.answer_text));

  // Sort new items by count DESC
  newItems.sort((a, b) => b.count - a.count);

  // Return baseline items first, then new items
  return [...baselineItems, ...newItems];
}