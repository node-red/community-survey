import { useState, useEffect, useMemo } from 'react';
import { getRatingScheme } from '../utils/colorPalette';
import RespondentIcon from './RespondentIcon';
import { getTooltipPosition, useHideTooltipOnScroll } from '../utils/tooltip-utils';
import Tooltip from './Tooltip';
import ChartHeader from './ChartHeader';
import SkipLink from './SkipLink';

const RatingsChart = ({ questionId, questionTitle, filters = {}, _color, _colorScheme = "blue", ratingScale = 7, compact = false, wasmService, skipTargetId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [respondentInfo, setRespondentInfo] = useState(null);
  const [tooltipContent, setTooltipContent] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useHideTooltipOnScroll(setShowTooltip);

  // Memoize filters to prevent infinite re-renders from object reference changes
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  // Fetch rating data with filters
  useEffect(() => {
    if (!questionId || !wasmService) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const result = await wasmService.getQuantitativeData(questionId, filters);

        // Process rating data (expecting values based on rating scale)
        if (result.data && result.data.length > 0) {
          const totalResponses = result.total_respondents || 0;
          const filteredResponses = result.filtered_respondents || totalResponses;

          // Process rating data inline to avoid dependency issues
          const colors = getRatingScheme(questionId).slice(0, ratingScale);
          const scores = [];
          const totalCount = result.data.reduce((sum, item) => sum + (item.count || 0), 0);

          for (let score = 1; score <= ratingScale; score++) {
            const count = result.data
              .filter(item => {
                const value = parseInt(item.answer_text?.replace(/[[\]"]/g, '') || '0');
                return value === score;
              })
              .reduce((sum, item) => sum + (item.count || 0), 0);

            const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;

            scores.push({
              label: score.toString(),
              percentage: percentage,
              count: count,
              color: colors[score - 1]
            });
          }

          setData(scores);
          setRespondentInfo({
            filtered: filteredResponses,
            total: totalResponses
          });
        } else {
          // No data matches filters - generate empty rating scale structure
          // so the chart stays visible with 0% bars
          const colors = getRatingScheme(questionId).slice(0, ratingScale);
          const scores = [];
          for (let score = 1; score <= ratingScale; score++) {
            scores.push({
              label: score.toString(),
              percentage: 0,
              count: 0,
              color: colors[score - 1]
            });
          }
          setData(scores);
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
  }, [questionId, filterKey, ratingScale, wasmService, filters]);

  // Calculate average rating
  const calculateAverageRating = (data) => {
    if (!data || data.length === 0) return '0.00';

    let totalScore = 0;
    let totalResponses = 0;

    data.forEach(item => {
      const rating = parseInt(item.label);
      totalScore += rating * item.count;
      totalResponses += item.count;
    });

    return totalResponses > 0 ? (totalScore / totalResponses).toFixed(2) : '0.00';
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

  // This should rarely trigger now since we generate placeholder data in the else branch
  // Kept as a safety fallback for unexpected edge cases
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No rating data available for this question.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        className="w-full bg-white border border-gray-300 rounded-[5px] flex overflow-hidden transition-all duration-200 shadow-sm"
        data-chart-id={questionId}
        role="img"
        aria-label={`Rating chart: ${questionTitle || 'Rating Analysis'}`}
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <ChartHeader
            title={questionTitle ? (questionTitle.endsWith('?') ? questionTitle : questionTitle + '?') : 'Rating Analysis'}
            compact={compact}
          />
        </div>
        <SkipLink chartId={questionId} targetId={skipTargetId} />

        {/* Average and Respondent Count */}
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-600">
              avg {calculateAverageRating(data)}
            </span>
            {respondentInfo && (
              <span className="text-xs text-gray-500">
                {respondentInfo.filtered}{' '}
                <span className="hidden sm:inline">respondents</span>
                <RespondentIcon className="w-3 h-3 text-gray-500 sm:hidden" />
              </span>
            )}
          </div>
        </div>

        {/* Horizontal Percentage Bars */}
        <div className="px-4 pb-4">
          {/* Bar Container */}
          <div className="mb-2">
            <div className="flex h-6 shadow-sm">
              {data.map((item, _index) => {
                const handleBarMouseEnter = (event) => {
                  event.stopPropagation(); // Prevent chart-level tooltip

                  const totalResponses = data.reduce((sum, d) => sum + d.count, 0);
                  const percentage = totalResponses > 0 ? ((item.count / totalResponses) * 100).toFixed(0) : 0;

                  setTooltipContent(`Rating ${item.label}\n${item.count} respondents (${percentage}%)`);
                  setTooltipPosition(getTooltipPosition(event, 200, 60));
                  setShowTooltip(true);
                };

                const handleBarMouseLeave = (event) => {
                  event.stopPropagation();
                  setShowTooltip(false);
                };

                const handleBarMouseMove = (event) => {
                  if (showTooltip) {
                    event.stopPropagation();
                    setTooltipPosition(getTooltipPosition(event, 200, 60));
                  }
                };

                // Show all segments, including 0%
                return (
                  <div
                    key={item.label}
                    className="relative flex items-center justify-center border-r border-white/20 last:border-r-0 cursor-pointer transition-transform duration-200 focus:outline focus:outline-2 focus:outline-[#3b82f6] focus:z-10"
                    style={{
                      width: item.percentage > 0 ? `${item.percentage}%` : 'auto',
                      backgroundColor: item.color,
                      minWidth: '35px', // Always show minimum width for visibility
                      transition: 'width 0.3s ease-in-out'
                    }}
                    tabIndex={0}
                    aria-label={`Rating ${item.label}: ${item.percentage.toFixed(0)}% (${item.count} respondents)`}
                    onMouseEnter={(e) => {
                      const currentWidth = e.currentTarget.offsetWidth;
                      const scaleX = (currentWidth + 10) / currentWidth;
                      e.currentTarget.style.transform = `scaleY(1.1) scaleX(${scaleX})`;
                      e.currentTarget.style.zIndex = '10';
                      handleBarMouseEnter(e);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.zIndex = '0';
                      handleBarMouseLeave(e);
                    }}
                    onMouseMove={handleBarMouseMove}
                    onFocus={(e) => {
                      const currentWidth = e.currentTarget.offsetWidth;
                      const scaleX = (currentWidth + 10) / currentWidth;
                      e.currentTarget.style.transform = `scaleY(1.1) scaleX(${scaleX})`;
                      e.currentTarget.style.zIndex = '10';
                      handleBarMouseEnter(e);
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.zIndex = '0';
                      handleBarMouseLeave(e);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleBarMouseEnter(e);
                      }
                    }}
                  >
                    {/* Rating scale number inside bar */}
                    <span className="text-white font-semibold text-xs px-1">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scale direction indicator */}
          <div className="flex justify-between mt-0.5 px-1">
            <span className="text-[10px] text-gray-400 italic">Worst</span>
            <span className="text-[10px] text-gray-400 italic">Best</span>
          </div>

          {/* Alternative: Stacked view for mobile */}
          <div className="hidden sm:hidden mt-6 space-y-2">
            {data.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-20 text-xs text-gray-600 font-medium">
                  {item.label}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                      minWidth: item.percentage > 0 ? '30px' : '0',
                      transition: 'width 0.3s ease-in-out'
                    }}
                  >
                    {item.percentage >= 5 && (item.count === 0 ? '-' : (Math.round(item.percentage) === 0 ? '<1%' : `${Math.round(item.percentage)}%`))}
                  </div>
                </div>
                <div className="text-xs text-gray-500 w-12 text-right">
                  {item.count}
                </div>
              </div>
            ))}
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

export default RatingsChart;