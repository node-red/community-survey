// Filter definitions for the Node-RED survey analysis dashboard
// Maps survey questions to filter categories and options

import { CONTINENT_OPTIONS } from './continent-mapping.js';

export const FILTER_DEFINITIONS = {
  // Continent filter (special filter - maps to country question GpGjoO via continent mapping)
  continent: {
    questionId: 'GpGjoO', // Uses country question, filtered by continent mapping
    name: 'Continent',
    description: 'Geographic region',
    options: CONTINENT_OPTIONS,
    isSpecialFilter: true // Marks this as needing special SQL handling
  },

  // Experience Level (ElR6d2)
  experience: {
    questionId: 'ElR6d2',
    name: 'Experience Level',
    description: 'How long have you been using Node-RED?',
    options: [
      { value: '["Less than 6 months"]', label: 'Less than 6 months' },
      { value: '["6 months to 1 year"]', label: '6 months to 1 year' },
      { value: '["1 to 2 years"]', label: '1 to 2 years' },
      { value: '["2 to 5 years"]', label: '2 to 5 years' },
      { value: '["More than 5 years (I\'m a veteran!)"]', label: 'More than 5 years (I\'m a veteran!)' }
    ]
  },

  // Primary Purpose (VPeNQ6)
  purpose: {
    questionId: 'VPeNQ6',
    name: 'Primary Purpose',
    description: 'What best describes your primary use of Node-RED?',
    options: [
      { value: 'Hobbyist/Personal projects (home automation, learning, experiments)', label: 'Hobbyist/Personal projects' },
      { value: 'Professional developer (work projects, client solutions)', label: 'Professional developer' },
      { value: 'System architect/designer (design Node-RED-based solutions)', label: 'System architect/designer' },
      { value: 'Enterprise/Production user (business-critical systems)', label: 'Enterprise/Production user' },
      { value: 'Technical decision maker (evaluate tools for organization)', label: 'Technical decision maker' },
      { value: 'IT manager/director (manage infrastructure)', label: 'IT manager/director' },
      { value: 'Student or Educator (learning or teaching)', label: 'Student or Educator' },
      { value: 'Operations/Plant manager (oversee deployments)', label: 'Operations/Plant manager' },
      { value: 'Product/Platform Developer', label: 'Product/Platform Developer' },
      { value: 'Other', label: 'Other' }
    ]
  },

  // Organization Size (joRz61)
  orgSize: {
    questionId: 'joRz61',
    name: 'Organization Size',
    description: 'What is the size of your organization?',
    options: [
      { value: '["1-10 people"]', label: '1-10 people' },
      { value: '["11-50 people"]', label: '11-50 people' },
      { value: '["51-200 people"]', label: '51-200 people' },
      { value: '["201-500 people"]', label: '201-500 people' },
      { value: '["500+ people"]', label: '500+ people' }
    ]
  },

  // Industry (2AWoaM)
  industry: {
    questionId: '2AWoaM',
    name: 'Industry',
    description: 'What industry do you primarily work in?',
    options: [
      { value: 'Technology/Software', label: 'Technology/Software' },
      { value: 'Manufacturing/Industrial', label: 'Manufacturing/Industrial' },
      { value: 'Automotive', label: 'Automotive' },
      { value: 'Energy/Utilities', label: 'Energy/Utilities' },
      { value: 'Healthcare', label: 'Healthcare' },
      { value: 'Food', label: 'Food' },
      { value: 'Government/Public Sector', label: 'Government/Public Sector' },
      { value: 'Education', label: 'Education' },
      { value: 'Finance/Banking', label: 'Finance/Banking' },
      { value: 'Other', label: 'Other' }
    ]
  },

  // Decision Influence (P9xr1x)
  influence: {
    questionId: 'P9xr1x',
    name: 'Decision Influence',
    description: 'How would you describe your role in technology decisions?',
    options: [
      { value: '["I make the final decision"]', label: 'I make the final decision' },
      { value: '["I strongly influence the decision"]', label: 'I strongly influence the decision' },
      { value: '["I provide input but others decide"]', label: 'I provide input but others decide' },
      { value: '["I implement decisions made by others"]', label: 'I implement decisions made by others' },
      { value: '["Not applicable"]', label: 'Not applicable' }
    ]
  },

  // Programming Background (xDqzMk)
  programming: {
    questionId: 'xDqzMk',
    name: 'Programming Background',
    description: 'How would you rate your programming experience?',
    options: [
      { value: '["No programming experience"]', label: 'No programming experience' },
      { value: '["Beginner"]', label: 'Beginner' },
      { value: '["Some experience"]', label: 'Some experience' },
      { value: '["Intermediate"]', label: 'Intermediate' },
      { value: '["Advanced"]', label: 'Advanced' },
      { value: '["Expert"]', label: 'Expert' }
    ]
  },

  // Flow Complexity (kG2v5Z)
  complexity: {
    questionId: 'kG2v5Z',
    name: 'Flow Complexity',
    description: 'What is the typical complexity of your Node-RED flows?',
    options: [
      { value: '["Simple flows (under 20 nodes, minimal tabs)"]', label: 'Simple flows (under 20 nodes, minimal tabs)' },
      { value: '["Medium complexity (20-50 nodes, multiple tabs)"]', label: 'Medium complexity (20-50 nodes, multiple tabs)' },
      { value: '["Complex flows (50+ nodes, multiple tabs)"]', label: 'Complex flows (50+ nodes, multiple tabs)' },
      { value: '["Advanced flows (100+ nodes, multiple tabs)"]', label: 'Advanced flows (100+ nodes, multiple tabs)' },
      { value: '["Enterprise-scale deployments (flows utilizing multiple Node-RED instances)"]', label: 'Enterprise-scale deployments (flows utilizing multiple Node-RED instances)' }
    ]
  },

  // Production Usage (ZO7eJB)
  production: {
    questionId: 'ZO7eJB',
    name: 'Production Usage',
    description: 'Do you use Node-RED in production systems?',
    options: [
      { value: '["Yes, extensively in production systems"]', label: 'Yes, extensively in production systems' },
      { value: '["Yes, in some production systems"]', label: 'Yes, in some production systems' },
      { value: '["No, but I would like to use it in production"]', label: 'No, but I would like to use it in production' },
      { value: '["No, unlikely to use in production"]', label: 'No, unlikely to use in production' },
      { value: '["Not applicable"]', label: 'Not applicable' }
    ]
  },

  // Number of Instances (ZO7eO5)
  instances: {
    questionId: 'ZO7eO5',
    name: 'Number of Instances',
    description: 'How many Node-RED instances do you typically manage?',
    options: [
      { value: '["1"]', label: '1 instance' },
      { value: '["2-5"]', label: '2-5 instances' },
      { value: '["6-10"]', label: '6-10 instances' },
      { value: '["11-50"]', label: '11-50 instances' },
      { value: '["51-200"]', label: '51-200 instances' },
      { value: '["200-999"]', label: '200-999 instances' },
      { value: '["1000+"]', label: '1000+ instances' }
    ]
  },

  // Use Cases (rO4YaX) - Shows abstracted categories in sidebar AND main chart
  useCases: {
    questionId: 'rO4YaX',
    name: 'Use Cases',
    description: 'What do you use Node-RED for?',
    options: [
      { value: 'Home/Personal', label: 'Home/Personal' },
      { value: 'Industrial/Business', label: 'Industrial/Business' },
      { value: 'Data & Integration', label: 'Data & Integration' },
      { value: 'Education & Prototyping', label: 'Education & Prototyping' },
      { value: 'Specialized Applications', label: 'Specialized Applications' }
    ]
  },

  // Run Environment (476OJ5)
  environment: {
    questionId: '476OJ5',
    name: 'Run Environment',
    description: 'Where do you primarily run Node-RED?',
    options: [
      { value: '["My laptop or desktop computer"]', label: 'My laptop or desktop computer' },
      { value: '["Raspberry Pi or similar single-board computer"]', label: 'Raspberry Pi or similar single-board computer' },
      { value: '["Cloud server (VPS, AWS, Google Cloud, etc.)"]', label: 'Cloud server (VPS, AWS, Google Cloud, etc.)' },
      { value: '["Industrial PC or edge device"]', label: 'Industrial PC or edge device' },
      { value: '["On-premises servers"]', label: 'On-premises servers' },
      { value: '["Edge devices"]', label: 'Edge devices' },
      { value: '["Home automation systems"]', label: 'Home automation systems' },
      { value: '["Other"]', label: 'Other' }
    ]
  },

  // Email Domain (2AWolV)
  emailDomain: {
    questionId: '2AWolV',
    name: 'Email Domain Type',
    description: 'Type of email domain used',
    options: [
      { value: 'Personal Email', label: 'Personal Email' },
      { value: 'Work Email', label: 'Work Email' }
    ]
  }
};

// Segment presets - predefined filter combinations aligned with FlowFuse ICPs
export const SEGMENT_PRESETS = {
  'manufacturing-icp': {
    name: 'L-Size Companies',
    description: 'Enterprise users (500+ employees) in professional/technical roles',
    filters: {
      // Primary Purpose - Professional/technical roles
      purpose: [
        'Professional developer (work projects, client solutions)',
        'System architect/designer (design Node-RED-based solutions)',
        'IT manager/director (manage infrastructure)',
        'Technical decision maker (evaluate tools for organization)',
        'Enterprise/Production user (business-critical systems)',
        'Operations/Plant manager (oversee deployments)',
        'Product/Platform Developer',
        'Other'
      ],
      // Large organizations (500+ employees)
      orgSize: ['["500+ people"]']
    }
  },

  'hobby-segment': {
    name: 'Hobbyists',
    description: 'Hobbyists and personal project users',
    filters: {
      purpose: ['Hobbyist/Personal projects (home automation, learning, experiments)']
    }
  },

  'm-size-comp-segment': {
    name: 'M-Size Companies',
    description: 'Medium-sized companies (51-500 employees) with professional/technical roles',
    filters: {
      // Professional/technical roles excluding hobbyists
      purpose: [
        'Professional developer (work projects, client solutions)',
        'System architect/designer (design Node-RED-based solutions)',
        'IT manager/director (manage infrastructure)',
        'Technical decision maker (evaluate tools for organization)',
        'Enterprise/Production user (business-critical systems)',
        'Operations/Plant manager (oversee deployments)',
        'Product/Platform Developer',
        'Other'
      ],
      // Medium-sized organizations (51-500 employees)
      orgSize: ['["51-200 people"]', '["201-500 people"]']
    }
  },

  's-size-comp-segment': {
    name: 'S-Size Companies',
    description: 'Small-sized companies (1-50 employees) with professional/technical roles',
    filters: {
      // Professional/technical roles excluding hobbyists
      purpose: [
        'Professional developer (work projects, client solutions)',
        'System architect/designer (design Node-RED-based solutions)',
        'IT manager/director (manage infrastructure)',
        'Technical decision maker (evaluate tools for organization)',
        'Enterprise/Production user (business-critical systems)',
        'Operations/Plant manager (oversee deployments)',
        'Product/Platform Developer',
        'Other'
      ],
      // Small-sized organizations (1-50 employees)
      orgSize: ['["1-10 people"]', '["11-50 people"]']
    }
  }
};

// Helper functions
export const getFilterLabel = (categoryKey) => {
  return FILTER_DEFINITIONS[categoryKey]?.name || categoryKey;
};

export const getFilterOptions = (categoryKey) => {
  return FILTER_DEFINITIONS[categoryKey]?.options || [];
};

export const getQuestionId = (categoryKey) => {
  return FILTER_DEFINITIONS[categoryKey]?.questionId;
};

export const getAllFilterCategories = () => {
  return Object.keys(FILTER_DEFINITIONS);
};

export const getPresetByKey = (presetKey) => {
  return SEGMENT_PRESETS[presetKey];
};

export const getAllPresets = () => {
  return SEGMENT_PRESETS;
};

// Function to count active filters across all categories
export const countActiveFilters = (filters) => {
  return Object.values(filters).reduce((total, filterArray) => total + filterArray.length, 0);
};

// Function to build filter summary text
export const buildFilterSummary = (filters) => {
  const activeFilters = [];
  
  for (const [category, values] of Object.entries(filters)) {
    if (values && values.length > 0) {
      const categoryName = getFilterLabel(category);
      activeFilters.push(`${categoryName} (${values.length})`);
    }
  }
  
  return activeFilters.length > 0 
    ? `Active filters: ${activeFilters.join(', ')}` 
    : 'No active filters';
};