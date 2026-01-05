import { memo } from 'react';
import { countActiveFilters } from '../utils/filter-utils';

/**
 * Wrapper component for comparison mode.
 * Renders the same chart component twice side-by-side with different filter configurations.
 *
 * @param {Object} props
 * @param {React.ComponentType} props.ChartComponent - The chart component to render
 * @param {Object} props.chartProps - Props to pass to the chart component (excluding filters)
 * @param {Object} props.filtersA - Filter configuration for column A
 * @param {Object} props.filtersB - Filter configuration for column B
 * @param {string} [props.labelA] - Label for column A (defaults to filter summary)
 * @param {string} [props.labelB] - Label for column B (defaults to filter summary)
 */
const ComparisonChartWrapper = (props) => {
  const {
    ChartComponent,
    chartProps,
    filtersA,
    filtersB,
    labelA,
    labelB,
  } = props;
  // Generate default labels from filter counts if not provided
  const defaultLabelA = getFilterSummary(filtersA, 'A');
  const defaultLabelB = getFilterSummary(filtersB, 'B');

  return (
    <div className="flex gap-4">
      {/* Column A */}
      <div className="flex-1 min-w-[400px] relative">
        <div className="absolute -top-6 left-0 right-0 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
            A
          </span>
          <span className="text-sm font-medium text-gray-600 truncate">
            {labelA || defaultLabelA}
          </span>
        </div>
        <div className="border-l-2 border-blue-500 pl-3">
          <ChartComponent {...chartProps} filters={filtersA} />
        </div>
      </div>

      {/* Column B */}
      <div className="flex-1 min-w-[400px] relative">
        <div className="absolute -top-6 left-0 right-0 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold">
            B
          </span>
          <span className="text-sm font-medium text-gray-600 truncate">
            {labelB || defaultLabelB}
          </span>
        </div>
        <div className="border-l-2 border-orange-500 pl-3">
          <ChartComponent {...chartProps} filters={filtersB} />
        </div>
      </div>
    </div>
  );
};

/**
 * Generate a human-readable summary of active filters.
 * @param {Object} filters - Filter state object
 * @param {string} column - Column identifier ('A' or 'B')
 * @returns {string} Summary string
 */
function getFilterSummary(filters, _column) {
  const activeCount = countActiveFilters(filters);

  if (activeCount === 0) {
    return 'All Respondents';
  }

  // Get first active filter category for a brief summary
  const activeCategories = Object.entries(filters)
    .filter(([, values]) => values && values.length > 0)
    .map(([category]) => category);

  if (activeCategories.length === 1) {
    const category = activeCategories[0];
    const values = filters[category];
    if (values.length === 1) {
      // Single value - show truncated version
      const value = values[0];
      const shortValue = value.length > 25 ? value.substring(0, 22) + '...' : value;
      return shortValue;
    }
    return `${values.length} ${category} filters`;
  }

  return `${activeCount} filters`;
}

export default memo(ComparisonChartWrapper);
