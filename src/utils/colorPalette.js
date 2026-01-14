// Unified color palette for the survey dashboard
// Based on the successful warm earth tones from Section 1

// Core palette - warm, professional earth tones
export const corePalette = {
  // Primary warm colors (based on Section 1)
  amber: '#c4a747',      // Golden amber
  terracotta: '#d46b47', // Warm terracotta
  bronze: '#d89333',     // Rich bronze
  slate: '#5a92a8',      // Cool slate blue (for contrast)
  
  // Extended warm palette
  rust: '#b85450',       // Deep rust red
  sienna: '#a0522d',     // Warm sienna brown
  copper: '#b87333',     // Copper orange
  sand: '#c2b280',       // Warm sand
  
  // Cool complementary colors
  sage: '#87a96b',       // Sage green
  ocean: '#4682b4',      // Ocean blue
  lavender: '#967bb6',   // Soft lavender
  stone: '#78866b',      // Cool stone gray
};

// Semantic color assignments for different chart types
export const chartColors = {
  // Single value charts (BarChart, VerticalBarChart)
  primary: corePalette.amber,
  secondary: corePalette.terracotta,
  tertiary: corePalette.bronze,
  quaternary: corePalette.slate,
  
  // Multi-value charts (use arrays)
  sequential: [
    corePalette.amber,
    corePalette.terracotta,
    corePalette.bronze,
    corePalette.rust,
    corePalette.sienna,
    corePalette.copper,
    corePalette.sand,
  ],
  
  diverging: [
    corePalette.rust,
    corePalette.terracotta,
    corePalette.bronze,
    corePalette.amber,
    corePalette.sand,
    corePalette.sage,
    corePalette.ocean,
  ],
};

// Color schemes for rating charts (gradients within same hue)
export const ratingSchemes = {
  warm: [
    '#f4e4bc', // Lightest
    '#e8d5a6',
    '#dcc690',
    '#d0b77a',
    '#c4a864',
    '#b8994e',
    '#ac8a38', // Darkest
  ],
  
  earth: [
    '#e8c4a0',
    '#ddb492',
    '#d2a484',
    '#c79476',
    '#bc8468',
    '#b1745a',
    '#a6644c',
  ],
  
  bronze: [
    '#f0d9b5',
    '#e6c9a1',
    '#dcb98d',
    '#d2a979',
    '#c89965',
    '#be8951',
    '#b4793d',
  ],
  
  slate: [
    '#a8c5d8',
    '#96b7cd',
    '#84a9c2',
    '#729bb7',
    '#608dac',
    '#4e7fa1',
    '#3c7196',
  ],
  
  sage: [
    '#c5d5c0',
    '#b5c7ae',
    '#a5b99c',
    '#95ab8a',
    '#859d78',
    '#758f66',
    '#658154',
  ],
};

// Function to get color for a specific question/chart
export function getChartColor(questionId, defaultColor = null) {
  // Map specific questions to consistent colors
  const questionColorMap = {
    // Section 1 - Keep original successful colors
    'Quality Gap Opp': corePalette.amber,
    'Quality %': corePalette.terracotta,
    'Reach Gap Opp': corePalette.bronze,
    'Reach %': corePalette.slate,
    
    // Demographics & Background
    'GpGjoO': corePalette.ocean,      // Country map
    'ElR6d2': corePalette.sage,       // Experience
    'VPeNQ6': corePalette.bronze,     // Purpose
    'joRz61': corePalette.rust,       // Organization size
    '2AWoaM': corePalette.sienna,     // Industry
    'P9xr1x': corePalette.copper,     // Influence
    'xDqzMk': corePalette.sand,       // Programming experience
    
    // Usage patterns
    'rO4YaX': corePalette.amber,      // What used for
    '476OJ5': corePalette.terracotta, // Where run
    'kG2v5Z': corePalette.bronze,     // Complexity
    'ZO7eJB': corePalette.slate,      // Production usage
    'ZO7eO5': corePalette.sage,       // Number of instances
    
    // Learning & Support
    'NXjPAO': corePalette.rust,       // What helps learn
    'qGrzbg': corePalette.sienna,     // Time to comfortable
    'ZO7ede': corePalette.copper,     // How discovered
    
    // Frustrations & Improvements
    'kGozGZ': corePalette.rust,       // Frustrations
    'Ma4BjA': corePalette.terracotta, // Missing features
    'NXjP0j': corePalette.bronze,     // Production blockers
    
    // Tools & Alternatives
    'Dp8ax5': corePalette.sage,       // Other tools
    'erJzEk': corePalette.lavender,   // Dashboard solutions
    '089kZ6': corePalette.ocean,      // Customization
    '8LBr6x': corePalette.stone,      // Accessibility
    
    // Device satisfaction
    'OX2gBp': corePalette.slate,      // Device matrix
    'bepze7': corePalette.amber,      // Desktop satisfaction
    'Apg9pl': corePalette.bronze,     // Tablet satisfaction
    'Bpyep1': corePalette.terracotta, // Mobile satisfaction
    
    // Qualitative Analysis - Cycle through different colors
    'gqlzqJ': corePalette.amber,      // What's the single biggest improvement Node-RED needs?
    '6KlPdY': corePalette.terracotta, // What would make learning Node-RED easier for newcomers?
    'joRj6E': corePalette.bronze,     // What has made it difficult to create or use Node-RED dashboards?
    'xDqAMo': corePalette.rust,       // What makes sharing flows difficult for you?
    'RoNAMl': corePalette.sienna,     // How would you wish sharing flows would work?
    'oRPqY1': corePalette.copper,     // Why do you choose to use Node-RED over alternatives?
    'P9xrbb': corePalette.sage,       // If you could change one thing about Node-RED, what would it be?
    'oRPZqP': corePalette.ocean,      // What aspects of Node-RED must be changed or be updated?
    'XoaQoz': corePalette.lavender,   // What aspects of Node-RED should ideally never change?
    'JlPolX': corePalette.stone,      // What do you love most about Node-RED right now?
    'y4Q14d': corePalette.sand,       // What makes Node-RED feel like 'Node-RED' to you?
    'OX26KK': corePalette.slate,      // What would draw you away from Node-RED?
    'xDqzdv': corePalette.amber,      // What expectations do you have regarding AI for Node-RED?
    'a4LqQX': corePalette.terracotta, // Why is that? (AI follow-up)
    'ElR6ZN': corePalette.bronze,     // Any concerns about Node-RED's future direction?
    '476O9O': corePalette.rust,       // Any final thoughts or suggestions?
  };
  
  return questionColorMap[questionId] || defaultColor || corePalette.amber;
}

// Function to get rating scheme for a specific question
export function getRatingScheme(questionId) {
  const questionSchemeMap = {
    // Satisfaction & Quality ratings - warm tones
    'qGrzG5': 'warm',    // Overall satisfaction
    'bepze7': 'warm',    // Desktop satisfaction
    'QRZ4R1': 'earth',   // Up-to-date feel
    'RoNgoj': 'earth',   // Professional feel
    
    // Community & Engagement - cool tones
    'erJzrQ': 'slate',   // Community engagement
    'rO4YJv': 'slate',   // Recommend likelihood
    'kGo8b1': 'slate',   // AI assistance
    
    // Usage & Frequency - bronze tones
    'ZO7eO5': 'bronze',  // Number of instances
    '2AWpaV': 'bronze',  // Share frequency
    
    // Device ratings - mixed
    'Apg9pl': 'sage',    // Tablet
    'Bpyep1': 'earth',   // Mobile
    
    // Survey rating
    'a4RvP9': 'warm',    // Survey rating

    // Stay involved
    'joRzJE': 'sage',    // Would you like to stay involved?
  };
  
  return ratingSchemes[questionSchemeMap[questionId]] || ratingSchemes.warm;
}

// Export default color for backwards compatibility
export const defaultChartColor = corePalette.amber;