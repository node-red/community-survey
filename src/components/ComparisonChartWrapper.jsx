import { memo } from 'react';

/**
 * Wrapper component for comparison mode.
 * Renders the same chart component twice side-by-side with different filter configurations.
 *
 * @param {Object} props
 * @param {React.ComponentType} props.ChartComponent - The chart component to render
 * @param {Object} props.chartProps - Props to pass to the chart component (excluding filters)
 * @param {Object} props.filtersA - Filter configuration for column A
 * @param {Object} props.filtersB - Filter configuration for column B
 */
const ComparisonChartWrapper = (props) => {
  const {
    ChartComponent,
    chartProps,
    filtersA,
    filtersB,
  } = props;

  return (
    <div className="flex gap-4">
      {/* Column A */}
      <div className="flex-1 min-w-[500px]">
        <div className="border-l-2 border-blue-500 pl-3 relative">
          <span className="absolute -top-5 -left-px -translate-x-1/2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
            A
          </span>
          <ChartComponent {...chartProps} filters={filtersA} />
        </div>
      </div>

      {/* Column B */}
      <div className="flex-1 min-w-[500px]">
        <div className="border-l-2 border-orange-500 pl-3 relative">
          <span className="absolute -top-5 -left-px -translate-x-1/2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold">
            B
          </span>
          <ChartComponent {...chartProps} filters={filtersB} />
        </div>
      </div>
    </div>
  );
};

export default memo(ComparisonChartWrapper);
