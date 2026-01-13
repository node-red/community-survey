import { createContext, useContext } from 'react';

// Filter context for normal mode - provides current filter state
const FilterContext = createContext(null);

// Comparison context for comparison mode - provides comparison state and helpers
const ComparisonContext = createContext({
  comparisonMode: false,
  filtersA: {},
  filtersB: {},
  activeColumn: 'A',
});

export function FilterProvider({ filters, children }) {
  return (
    <FilterContext.Provider value={filters}>
      {children}
    </FilterContext.Provider>
  );
}

export function ComparisonProvider({ value, children }) {
  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFilters() {
  const filters = useContext(FilterContext);
  if (filters === null) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return filters;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useComparison() {
  return useContext(ComparisonContext);
}
