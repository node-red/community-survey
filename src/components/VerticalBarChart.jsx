import { useState, useEffect } from 'react';
import { FILTER_MAPPINGS } from '../utils/filter-utils';
import { getChartColor } from '../utils/colorPalette';
import { sortByOrdinalOrder, ORDINAL_ORDERS, applyBaselineOrder } from '../utils/ordinalOrdering';
import RespondentIcon from './RespondentIcon';
import { getTooltipPosition, useHideTooltipOnScroll } from '../utils/tooltip-utils';
import Tooltip from './Tooltip';
import ChartHeader from './ChartHeader';

// Map filter questions to their display titles
const FILTER_QUESTION_TITLES = {
  'ElR6d2': 'Experience with Node-RED',
  'VPeNQ6': 'Primary Purpose',
  'joRz61': 'Organization Size',
  '2AWoaM': 'Industry',
  'P9xr1x': 'Decision Influence',
  'xDqzMk': 'Programming Background',
  'kG2v5Z': 'Flow Complexity',
  'ZO7eJB': 'Production Usage',
  'ZO7eO5': 'Number of Instances',
  '476OJ5': 'Run Environment'
};

const VerticalBarChart = ({ questionId, questionTitle, filterType, filters = {}, color, wasmService, baselineOrder }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [respondentInfo, setRespondentInfo] = useState(null);
  const [tooltipContent, setTooltipContent] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useHideTooltipOnScroll(setShowTooltip);

  // Determine the actual questionId and title based on props
  const actualQuestionId = questionId || (filterType ? FILTER_MAPPINGS[filterType] : null);
  const actualQuestionTitle = questionTitle || (filterType ? FILTER_QUESTION_TITLES[actualQuestionId] || filterType : 'Chart');
  const actualColor = actualQuestionId ? getChartColor(actualQuestionId, color) : (color || '#c4a747');

  // Fetch quantitative data with filters
  useEffect(() => {
    if (!actualQuestionId || !wasmService) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        const result = await wasmService.getQuantitativeData(actualQuestionId, filters);
        
        // Transform data for VerticalBarChart component
        if (result.data && result.data.length > 0) {
          const totalResponses = result.total_respondents || 0;
          const filteredResponses = result.filtered_respondents || totalResponses;
          
          // Calculate total count from all items to determine percentages
          const totalCount = result.data.reduce((sum, item) => sum + (item.count || 0), 0);
          
          let chartData = result.data.map(item => {
            // Clean up the answer text
            let cleanAnswer = item.answer_text ? item.answer_text.replace(/[[\]"]/g, '') : 'Unknown';

            // Truncate very long answers for better display
            if (filterType && cleanAnswer.length > 30) {
              cleanAnswer = cleanAnswer.substring(0, 27) + '...';
            }

            // Calculate percentage from count data
            const count = item.count || 0;
            const rawPercentage = totalCount > 0 ? count / totalCount * 100 : 0;
            const percentage = Math.round(rawPercentage);

            // Format display percentage:
            // - count === 0 → "No data"
            // - count > 0 but rounds to 0% → "<1%"
            // - otherwise → actual percentage with %
            let displayPercentage;
            if (count === 0) {
              displayPercentage = '-';
            } else if (percentage === 0) {
              displayPercentage = '<1%';
            } else {
              displayPercentage = `${percentage}%`;
            }

            return {
              category: cleanAnswer,
              percentage: percentage,
              displayPercentage: displayPercentage,
              count: count,
              hasData: count > 0
            };
          });

          // Fill in missing categories with 0 values if ordinal order is defined
          if (ORDINAL_ORDERS[actualQuestionId]) {
            const expectedCategories = ORDINAL_ORDERS[actualQuestionId];
            const existingCategories = new Set(chartData.map(d => d.category));

            // Add missing categories with 0 values
            expectedCategories.forEach(category => {
              if (!existingCategories.has(category)) {
                chartData.push({
                  category: category,
                  percentage: 0,
                  displayPercentage: '-',
                  count: 0,
                  hasData: false
                });
              }
            });
          }

          // Apply ordinal sorting if applicable, otherwise use baseline order
          if (ORDINAL_ORDERS[actualQuestionId]) {
            // Use predefined ordinal ordering
            chartData = sortByOrdinalOrder(chartData, actualQuestionId);
          } else if (baselineOrder) {
            // Use baseline ordering - need to convert format for applyBaselineOrder
            const dataWithAnswerText = chartData.map(item => ({
              ...item,
              answer_text: item.category
            }));
            const sortedData = applyBaselineOrder(dataWithAnswerText, baselineOrder);
            chartData = sortedData.map(item => {
              // eslint-disable-next-line no-unused-vars
              const { answer_text, ...rest } = item;
              return rest;
            });
          }
          
          setData(chartData);
          setRespondentInfo({
            filtered: filteredResponses,
            total: totalResponses
          });
        } else {
          // No data matches filters - check if we can generate placeholder structure
          // so the chart stays visible with 0% bars
          let chartData = [];

          if (ORDINAL_ORDERS[actualQuestionId]) {
            // Use ordinal order as category source
            chartData = ORDINAL_ORDERS[actualQuestionId].map(category => ({
              category,
              percentage: 0,
              displayPercentage: '-',
              count: 0,
              hasData: false
            }));
          } else if (baselineOrder && baselineOrder.length > 0) {
            // Use baseline order as category source
            chartData = baselineOrder.map(category => ({
              category,
              percentage: 0,
              displayPercentage: '-',
              count: 0,
              hasData: false
            }));
          }

          setData(chartData); // May still be [] if no category source available
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
  }, [actualQuestionId, filterType, filters, wasmService, baselineOrder]);

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

  // This triggers when no ORDINAL_ORDERS or baselineOrder is available for the question
  // For questions with predefined categories, we generate placeholder data instead
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No data available for this question.</p>
      </div>
    );
  }

  // Calculate the maximum percentage for scaling (largest bar will be 85% of height)
  const maxPercentage = Math.max(...data.map(d => d.percentage));
  const scaleFactor = maxPercentage > 0 ? 85 / maxPercentage : 1;
  
  return (
    <div className="w-full bg-white border border-gray-300 rounded-[5px] flex overflow-hidden transition-all duration-200 shadow-sm" data-chart-id={actualQuestionId}>
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <ChartHeader title={actualQuestionTitle} />
                </div>
                {/* Respondent Count Badge - Minimal */}
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

        {/* Chart Content */}
        <div className="flex-1 p-4">
          <div className="flex items-end justify-between h-96 gap-2">
            {data.map((item, index) => {
              // Calculate if text fits inside bar (needs at least 60px height for text)
              const barHeightPercent = item.percentage * scaleFactor;
              const barHeightPixels = (barHeightPercent / 100) * 384; // h-96 = 384px
              const textFitsInside = barHeightPixels >= 60;
              
              const handleMouseEnter = (event) => {
                event.currentTarget.style.transform = 'scale(1.03)';

                if (item.count) {
                  const totalResponses = data.reduce((sum, d) => sum + (d.count || 0), 0);
                  const percentage = totalResponses > 0 ? ((item.count / totalResponses) * 100).toFixed(0) : 0;

                  setTooltipContent(`${item.category}\n${item.count} respondents (${percentage}%)`);
                  setTooltipPosition(getTooltipPosition(event, 200, 80));
                  setShowTooltip(true);
                }
              };

              const handleMouseLeave = (event) => {
                event.currentTarget.style.transform = 'scale(1)';
                setShowTooltip(false);
              };

              const handleMouseMove = (event) => {
                if (showTooltip) {
                  setTooltipPosition(getTooltipPosition(event, 200, 80));
                }
              };

              return (
                <div
                  key={index}
                  className="relative flex-1 h-full flex flex-col justify-end transform-gpu transition-transform duration-200"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  onMouseMove={handleMouseMove}
                >
                  {/* Light background for full range */}
                  <div className="absolute inset-0 bg-gray-100"></div>
                  
                  {/* Text above bar when it doesn't fit inside */}
                  {item.percentage > 0 && !textFitsInside && (
                    <div
                      className="absolute left-0 right-0 flex flex-col items-start p-2 overflow-hidden"
                      style={{
                        bottom: `${barHeightPercent}%`,
                        transition: 'bottom 0.3s ease-in-out'
                      }}
                    >
                      <span className="text-gray-900 text-xs font-bold whitespace-nowrap">
                        {item.displayPercentage}
                      </span>
                      <span className="text-gray-700 text-xs leading-tight mt-1 uppercase break-words max-w-full">
                        {item.category}
                      </span>
                    </div>
                  )}

                  {/* Bar that grows from bottom up based on percentage */}
                  <div
                    className="relative w-full flex flex-col justify-between"
                    style={{
                      height: `${barHeightPercent}%`,
                      backgroundColor: actualColor,
                      minHeight: '4px', // Always show minimum bar height
                      opacity: item.hasData ? 1 : 0.6, // Reduce opacity for no-data bars
                      transition: 'height 0.3s ease-in-out'
                    }}
                  >
                    {/* Text inside the bar - positioned at top (only when it fits) */}
                    {item.hasData && textFitsInside && (
                      <div className="absolute inset-x-0 top-0 flex flex-col items-start p-2 overflow-hidden">
                        <span className="text-white text-xs font-bold whitespace-nowrap">
                          {item.displayPercentage}
                        </span>
                        <span className="text-white text-xs leading-tight mt-1 uppercase break-words max-w-full">
                          {item.category}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Show label for 0%/<1%/No data bars with consistent styling */}
                  {item.percentage === 0 && (
                    <div className="absolute left-0 right-0 flex flex-col items-start p-2 bottom-0 overflow-hidden">
                      <span className="text-gray-900 text-xs font-bold whitespace-nowrap">
                        {item.displayPercentage}
                      </span>
                      <span className="text-gray-700 text-xs leading-tight mt-1 uppercase break-words max-w-full">
                        {item.category}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <Tooltip
        show={showTooltip}
        position={tooltipPosition}
        content={tooltipContent}
      />
    </div>
  );
};

export default VerticalBarChart;