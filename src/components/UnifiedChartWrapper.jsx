import { memo } from 'react';
import { cn } from '../styles/classNames';

/**
 * Unified wrapper component that always renders a 2-column structure.
 * Column B is hidden via CSS when not in comparison mode, and lazy-loaded
 * only when comparison mode is first enabled.
 *
 * This approach prevents scroll position jumps by keeping DOM structure stable.
 *
 * @param {Object} props
 * @param {React.ComponentType} props.ChartComponent - The chart component to render
 * @param {Object} props.chartProps - Props to pass to the chart component (excluding filters)
 * @param {boolean} props.comparisonMode - Whether comparison mode is active
 * @param {boolean} props.hasEverEnabledComparison - Whether comparison mode has ever been enabled
 * @param {Object} props.filtersA - Filter configuration for column A
 * @param {Object} props.filtersB - Filter configuration for column B
 */
const UnifiedChartWrapper = (props) => {
  const {
    ChartComponent,
    chartProps,
    comparisonMode,
    hasEverEnabledComparison,
    filtersA,
    filtersB,
  } = props;

  return (
    <div className={cn(
      "flex gap-4",
      !comparisonMode && "justify-center"
    )}>
      {/* Column A - Always visible */}
      <div className={cn(
        comparisonMode ? "flex-1 min-w-[500px]" : "w-full"
      )}>
        <div className={cn(
          "relative",
          comparisonMode && "border-l-2 border-blue-500 pl-3"
        )}>
          {comparisonMode && (
            <span className="absolute -top-5 -left-px -translate-x-1/2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
              A
            </span>
          )}
          <ChartComponent {...chartProps} filters={filtersA} />
        </div>
      </div>

      {/* Column B - Hidden when not in comparison mode, lazy loaded */}
      <div className={cn(
        "flex-1 min-w-[500px]",
        !comparisonMode && "hidden"
      )}>
        {hasEverEnabledComparison && (
          <div className="border-l-2 border-orange-500 pl-3 relative">
            <span className="absolute -top-5 -left-px -translate-x-1/2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold">
              B
            </span>
            <ChartComponent {...chartProps} filters={filtersB} />
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(UnifiedChartWrapper);
