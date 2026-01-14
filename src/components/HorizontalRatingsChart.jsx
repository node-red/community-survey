import { useState, useEffect, useMemo, useRef } from 'react';
import { getRatingScheme } from '../utils/colorPalette';
import { ORDINAL_ORDERS } from '../utils/ordinalOrdering';
import RespondentIcon from './RespondentIcon';
import { getTooltipPosition, useHideTooltipOnScroll } from '../utils/tooltip-utils';
import Tooltip from './Tooltip';
import ChartHeader from './ChartHeader';

const HorizontalRatingsChart = ({ questionId, questionTitle, filters = {}, _showRatingScale = false, _ratingScale = 7, wasmService }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [respondentInfo, setRespondentInfo] = useState(null);
  const [tooltipContent, setTooltipContent] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoveredBar, setHoveredBar] = useState(null);
  const chartContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);

  useHideTooltipOnScroll(setShowTooltip);

  // Memoize filters to prevent infinite re-renders from object reference changes
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  // Fetch rating data with filters (same as RatingsChart)
  useEffect(() => {
    if (!questionId || !wasmService) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const result = await wasmService.getQuantitativeData(questionId, filters);

        // Process rating data
        if (result.data && result.data.length > 0) {
          const totalResponses = result.total_respondents || 0;
          const filteredResponses = result.filtered_respondents || totalResponses;

          // Process data inline to avoid dependency issues
          const fullColors = getRatingScheme(questionId);
          const predefinedOrder = ORDINAL_ORDERS[questionId];

          // Define logical ordering for common rating/instance patterns
          const logicalOrders = {
            instances: ['None', '1', '2-5', '6-10', '11-20', '21-50', '51-100', '100+', 'More than 100'],
            frequency: ['Never', 'Rarely', 'Sometimes', 'Often', 'Always', 'Very Often', 'Constantly'],
            difficulty: ['Very Easy', 'Easy', 'Moderate', 'Difficult', 'Very Difficult'],
            agreement: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
            size: ['Very Small', 'Small', 'Medium', 'Large', 'Very Large'],
            satisfaction: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'],
            importance: ['Not Important', 'Slightly Important', 'Moderately Important', 'Important', 'Very Important', 'Critical']
          };

          const getOrderPattern = (labels) => {
            const labelStr = labels.join(' ').toLowerCase();

            if (labels.some(l => l.match(/^\d+(-\d+)?$|^More than \d+$|^\d+\+$/))) {
              return 'instances';
            }
            if (labelStr.includes('easy') || labelStr.includes('difficult')) {
              return 'difficulty';
            }
            if (labelStr.includes('disagree') || labelStr.includes('agree')) {
              return 'agreement';
            }
            if (labelStr.includes('dissatisfied') || labelStr.includes('satisfied')) {
              return 'satisfaction';
            }
            if (labelStr.includes('never') || labelStr.includes('always') || labelStr.includes('often')) {
              return 'frequency';
            }
            if (labelStr.includes('important') || labelStr.includes('critical')) {
              return 'importance';
            }
            if (labelStr.includes('small') || labelStr.includes('large')) {
              return 'size';
            }
            return null;
          };

          const totalCount = result.data.reduce((sum, item) => sum + (item.count || 0), 0);

          const processedData = result.data
            .map((item) => {
              let label = item.answer_text ? item.answer_text.replace(/[\]"]/g, '').replace('[', '') : 'Unknown';
              const count = item.count || 0;
              const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;

              return {
                label: label,
                percentage: percentage,
                count: count,
                color: fullColors[0]
              };
            });

          // Fill in missing categories with 0 values if predefined order exists
          if (predefinedOrder) {
            const existingLabels = new Set(processedData.map(d => d.label));

            predefinedOrder.forEach(category => {
              if (!existingLabels.has(category)) {
                processedData.push({
                  label: category,
                  percentage: 0,
                  count: 0,
                  color: fullColors[0]
                });
              }
            });
          }

          const labels = processedData.map(d => d.label);

          if (predefinedOrder) {
            const orderMap = new Map(predefinedOrder.map((item, index) => [item, index]));
            processedData.sort((a, b) => {
              const aIndex = orderMap.get(a.label);
              const bIndex = orderMap.get(b.label);

              if (aIndex === undefined && bIndex === undefined) return 0;
              if (aIndex === undefined) return 1;
              if (bIndex === undefined) return -1;

              return aIndex - bIndex;
            });
          } else {
            const orderPattern = getOrderPattern(labels);

            if (orderPattern && logicalOrders[orderPattern]) {
              const order = logicalOrders[orderPattern];
              processedData.sort((a, b) => {
                const aIndex = order.findIndex(o =>
                  a.label.toLowerCase() === o.toLowerCase() ||
                  a.label === o
                );
                const bIndex = order.findIndex(o =>
                  b.label.toLowerCase() === o.toLowerCase() ||
                  b.label === o
                );

                if (aIndex !== -1 && bIndex !== -1) {
                  return aIndex - bIndex;
                }
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;

                const aNum = parseInt(a.label.match(/\d+/)?.[0] || '0');
                const bNum = parseInt(b.label.match(/\d+/)?.[0] || '0');
                if (aNum !== bNum) {
                  return aNum - bNum;
                }

                return 0;
              });
            }
          }

          processedData.forEach((item, index) => {
            item.color = fullColors[Math.min(index, fullColors.length - 1)];
          });

          // Keep all items to preserve baseline ordering (show "No data" for 0% items)
          setData(processedData);
          setRespondentInfo({
            filtered: filteredResponses,
            total: totalResponses
          });
        } else {
          // No data matches filters - generate placeholder structure
          // so the chart stays visible with 0% bars
          const fullColors = getRatingScheme(questionId);
          const predefinedOrder = ORDINAL_ORDERS[questionId];

          if (predefinedOrder && predefinedOrder.length > 0) {
            const placeholderData = predefinedOrder.map((category, index) => ({
              label: category,
              percentage: 0,
              count: 0,
              color: fullColors[Math.min(index, fullColors.length - 1)]
            }));
            setData(placeholderData);
          } else {
            setData([]);
          }
          // Preserve actual respondent info from result
          setRespondentInfo({
            filtered: result.filtered_respondents || 0,
            total: result.total_respondents || 0
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [questionId, filterKey, wasmService, filters]);

  // Measure container width for accurate text fitting calculation
  useEffect(() => {
    const measureWidth = () => {
      if (chartContainerRef.current) {
        setContainerWidth(chartContainerRef.current.offsetWidth);
      }
    };

    measureWidth();
    window.addEventListener('resize', measureWidth);
    return () => window.removeEventListener('resize', measureWidth);
  }, [data]);

  // Calculate average rating (for numeric rating data)
  const calculateAverageRating = (data) => {
    if (!data || data.length === 0) return '0.00';

    let totalScore = 0;
    let totalResponses = 0;

    data.forEach(item => {
      const rating = parseInt(item.label);
      if (!isNaN(rating)) {
        totalScore += rating * item.count;
        totalResponses += item.count;
      }
    });

    return totalResponses > 0 ? (totalScore / totalResponses).toFixed(2) : '0.00';
  };

  // Handle mouse events for individual bar tooltip
  const handleBarMouseEnter = (event, item) => {
    const totalResponses = data.reduce((sum, item) => sum + item.count, 0);
    const percentage = totalResponses > 0 ? ((item.count / totalResponses) * 100).toFixed(0) : 0;

    setTooltipContent(
      `${/^\d+$/.test(item.label) ? 'Rating ' : ''}${item.label}\n${item.count} respondents (${percentage}%)`
    );
    setTooltipPosition(getTooltipPosition(event, 200, 60));
    setShowTooltip(true);
    setHoveredBar(item.label);
  };

  const handleBarMouseLeave = () => {
    setShowTooltip(false);
    setHoveredBar(null);
  };

  const handleBarMouseMove = (event) => {
    if (showTooltip && hoveredBar) {
      setTooltipPosition(getTooltipPosition(event, 200, 60));
    }
  };

  // Handle mouse events for tooltip (chart-level, keep for backward compatibility)
  const handleMouseEnter = (event) => {
    // Only show chart-level tooltip if not hovering a bar
    if (hoveredBar) return;
    
    if (!data) return;
    
    const averageRating = calculateAverageRating(data);
    const totalResponses = data.reduce((sum, item) => sum + item.count, 0);
    
    // Check if this is numeric rating data (1-7) or categorical
    const isNumericRating = data.some(item => /^\d+$/.test(item.label));
    
    if (isNumericRating) {
      setTooltipContent(
        `avg ${averageRating}\nTotal Responses: ${totalResponses}`
      );
    } else {
      setTooltipContent(
        `Total Responses: ${totalResponses}`
      );
    }

    setTooltipPosition(getTooltipPosition(event, 200, 60));
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  const handleMouseMove = (event) => {
    // Don't update if bar has its own tooltip handling
    if (hoveredBar) return;

    if (showTooltip) {
      setTooltipPosition(getTooltipPosition(event, 200, 60));
    }
  };

  // Only show skeleton during initial load (no data yet)
  // Once we have data, keep showing it while loading new filtered data
  if (loading && !data) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">Error loading data: {error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No rating data available for this question.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-x-hidden">
      <div
        className="w-full bg-white border border-gray-300 rounded-[5px] flex overflow-hidden transition-all duration-200 shadow-sm"
        data-chart-id={questionId}
        role="img"
        aria-label={`Rating chart: ${questionTitle || 'Rating Analysis'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
      {/* Icon Section */}
      <div className="flex items-center justify-center w-8 min-w-[32px] text-sm text-gray-600 bg-gray-100 border-r border-gray-300">
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="white"
          stroke="#d1d5db"
          strokeWidth="1.5"
        >
          <path
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            stroke="#d1d5db"
            fill="white"
          />
        </svg>
      </div>
      
      {/* Content Section */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <ChartHeader title={questionTitle ? questionTitle : 'Rating Analysis'} />
                </div>
                {/* Respondent Count Badge */}
                {respondentInfo && (
                  <div className="flex items-center gap-1 text-sm flex-shrink-0">
                    <span className="text-gray-600 font-bold">
                      {respondentInfo.filtered}
                    </span>
                    <span className="text-gray-500 hidden sm:inline">
                      {' '}respondents
                    </span>
                    <RespondentIcon />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Staircase/Waterfall Bars */}
        <div className="p-4">
          <div ref={chartContainerRef} className="relative w-full overflow-x-hidden" style={{ height: `${data.length * 24 + 10}px` }}>
            {data.map((item, index) => {
              // Calculate cumulative percentage for positioning
              const cumulativePercentage = data
                .slice(0, index)
                .reduce((sum, d) => sum + d.percentage, 0);
              
              // Calculate the width for this bar to reach 100% total
              const remainingWidth = 100 - cumulativePercentage;
              const barWidth = Math.min(item.percentage, remainingWidth);

              // Determine if bar is too small for text underneath (less than 8% width)
              const isSmallBar = barWidth < 8;

              // Determine if percentage text fits inside bar with padding
              // Calculate approximate text width: each char ~7px, padding pl-2 pr-2 = 16px total
              const percentageText = item.count === 0 ? '-' : (Math.round(item.percentage) === 0 ? '<1%' : `${Math.round(item.percentage)}%`);
              const textWidth = percentageText.length * 7; // approximate char width for text-xs font-bold
              const paddingWidth = 16; // pl-2 (8px) + pr-2 (8px)
              const minRequiredWidth = textWidth + paddingWidth;
              // Use measured container width to convert percentage to pixels
              const barPixelWidth = (barWidth / 100) * containerWidth;
              const percentageFitsInside = barPixelWidth >= minRequiredWidth;
              
              return (
                <div
                  key={item.label}
                  className="absolute w-full"
                  style={{
                    top: `${index * 24}px`,
                    height: '24px'
                  }}
                >
                  {/* Bar with color */}
                  <div
                    data-testid={`bar-${index}`}
                    className="absolute flex items-center cursor-pointer focus:outline focus:outline-2 focus:outline-[#3b82f6] focus:z-10"
                    style={{
                      left: `${cumulativePercentage}%`,
                      width: barWidth === 0 ? '4px' : `${barWidth}%`,
                      height: '24px',
                      backgroundColor: item.color,
                      opacity: barWidth === 0 ? 0.6 : 1,
                      transition: 'width 0.3s ease-in-out, left 0.3s ease-in-out, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    tabIndex={0}
                    aria-label={`${/^\d+$/.test(item.label) ? 'Rating ' : ''}${item.label}: ${item.percentage.toFixed(0)}% (${item.count} respondents)`}
                    onMouseEnter={(e) => {
                      const currentWidth = e.currentTarget.offsetWidth;
                      const scaleX = (currentWidth + 10) / currentWidth;
                      e.currentTarget.style.transform = `scaleY(1.1) scaleX(${scaleX})`;
                      e.currentTarget.style.zIndex = '10';
                      handleBarMouseEnter(e, item);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.zIndex = '0';
                      handleBarMouseLeave();
                    }}
                    onMouseMove={handleBarMouseMove}
                    onFocus={(e) => {
                      const currentWidth = e.currentTarget.offsetWidth;
                      const scaleX = (currentWidth + 10) / currentWidth;
                      e.currentTarget.style.transform = `scaleY(1.1) scaleX(${scaleX})`;
                      e.currentTarget.style.zIndex = '10';
                      handleBarMouseEnter(e, item);
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.zIndex = '0';
                      handleBarMouseLeave();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleBarMouseEnter(e, item);
                      }
                    }}
                  >
                    {/* Percentage inside the bar on the left (only if it fits) */}
                    {percentageFitsInside && (
                      <span className="text-white text-xs font-bold pl-2 pr-2">
                        {item.count === 0 ? '-' : (Math.round(item.percentage) === 0 ? '<1%' : `${Math.round(item.percentage)}%`)}
                      </span>
                    )}
                  </div>
                  
                  {/* Label positioning - always show descriptors next to bars */}
                  {isSmallBar ? (
                    // For small bars, show label and percentage on the side of the bar
                    <div
                      className="absolute flex items-center gap-1 max-w-full overflow-hidden"
                      style={{
                        // Check if there's enough space on the left (need at least 20% for text)
                        // Also check if this bar itself is wide enough to avoid overlap
                        left: (cumulativePercentage > 20 && barWidth < 15) ? `${cumulativePercentage - 1}%` : `${cumulativePercentage + barWidth + 1}%`,
                        top: '0px',
                        height: '24px',
                        transform: (cumulativePercentage > 20 && barWidth < 15) ? 'translateX(-100%)' : 'none',
                        maxWidth: (cumulativePercentage > 20 && barWidth < 15) ? `${cumulativePercentage - 2}%` : `${100 - cumulativePercentage - barWidth - 2}%`
                      }}
                    >
                      {/* Show percentage closest to bar, then descriptor */}
                      {!percentageFitsInside && (
                        <span className="text-gray-900 text-xs font-bold whitespace-nowrap flex-shrink-0">
                          {item.count === 0 ? '-' : (Math.round(item.percentage) === 0 ? '<1%' : `${Math.round(item.percentage)}%`)}
                        </span>
                      )}
                      <span className="text-gray-700 text-xs font-semibold uppercase truncate">
                        {item.label}
                      </span>
                    </div>
                  ) : (
                    // For normal bars, show descriptor next to the bar (left side if space, otherwise right)
                    <div
                      className="absolute flex items-center gap-1 max-w-full overflow-hidden"
                      style={{
                        // For larger bars, prefer left side if there's enough space (20%)
                        left: cumulativePercentage > 20 ? `${cumulativePercentage - 1}%` : `${cumulativePercentage + barWidth + 1}%`,
                        top: '0px',
                        height: '24px',
                        transform: cumulativePercentage > 20 ? 'translateX(-100%)' : 'none',
                        maxWidth: cumulativePercentage > 20 ? `${cumulativePercentage - 2}%` : `${100 - cumulativePercentage - barWidth - 2}%`
                      }}
                    >
                      {/* Show percentage closest to bar if it doesn't fit inside, then descriptor */}
                      {!percentageFitsInside && (
                        <span className="text-gray-900 text-xs font-bold whitespace-nowrap flex-shrink-0">
                          {item.count === 0 ? '-' : (Math.round(item.percentage) === 0 ? '<1%' : `${Math.round(item.percentage)}%`)}
                        </span>
                      )}
                      <span className="text-gray-700 text-xs font-semibold uppercase truncate">
                        {item.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
      
      {/* Tooltip */}
      <Tooltip
        show={showTooltip}
        position={tooltipPosition}
        content={tooltipContent}
        maxWidth="200px"
      />
    </div>
  );
};

export default HorizontalRatingsChart;