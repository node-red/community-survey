import { createContext, useContext } from 'react';

const FilterContext = createContext(null);

export function FilterProvider({ filters, children }) {
  return (
    <FilterContext.Provider value={filters}>
      {children}
    </FilterContext.Provider>
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
