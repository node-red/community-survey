import { useState, useEffect, memo } from 'react';
import BarChart from './BarChart';
import { FILTER_MAPPINGS } from '../utils/filter-utils';
import { getChartColor, defaultChartColor } from '../utils/colorPalette';
import { applyBaselineOrder } from '../utils/ordinalOrdering';
import RespondentIcon from './RespondentIcon';
import ChartHeader from './ChartHeader';
import SkipLink from './SkipLink';

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
  '476OJ5': 'Run Environment',
  'ZO7ede': 'How did you first discover Node-RED?'
};






const QuantitativeChart = ({ questionId, questionTitle, filterType, filters = {}, color = defaultChartColor, wasmService, baselineOrder }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [respondentInfo, setRespondentInfo] = useState(null);
  
  // Determine the actual questionId and title based on props
  const actualQuestionId = questionId || (filterType ? FILTER_MAPPINGS[filterType] : null);
  const actualQuestionTitle = questionTitle || FILTER_QUESTION_TITLES[actualQuestionId] || filterType || 'Chart';
  const actualColor = getChartColor(actualQuestionId, color);

  // Fetch quantitative data with filters
  useEffect(() => {
    if (!actualQuestionId || !wasmService) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Use WASM service to get quantitative data
        const result = await wasmService.getQuantitativeData(actualQuestionId, filters);
        
        // Transform data for BarChart component
        if (result.data && result.data.length > 0) {
          const totalResponses = result.total_respondents || 0;
          const filteredResponses = result.filtered_respondents || totalResponses;

          // Apply baseline ordering if available, otherwise sort by count descending
          const processedData = baselineOrder
            ? applyBaselineOrder(result.data, baselineOrder)
            : [...result.data].sort((a, b) => b.count - a.count);

          const chartData = processedData.map(item => {
            // Clean up the answer text
            let cleanAnswer = item.answer_text ? item.answer_text.replace(/[[\]"]/g, '') : 'Unknown';

            // Truncate very long answers for better display
            if (filterType && cleanAnswer.length > 40) {
              cleanAnswer = cleanAnswer.substring(0, 37) + '...';
            }

            // Use appropriate column name based on usage type
            const columnName = filterType ? `${filterType}_pct` : `${actualQuestionId}_pct`;

            // Format percentage display:
            // - count === 0 → "No data"
            // - count > 0 but rounds to 0% → "<1%"
            // - otherwise → actual percentage
            let displayPercentage;
            if (!item.count || item.count === 0) {
              displayPercentage = '-';
            } else if (Math.round(item.percentage) === 0) {
              displayPercentage = '<1%';
            } else {
              displayPercentage = `${Math.round(item.percentage)}%`;
            }

            return {
              Resource: cleanAnswer,
              resource: cleanAnswer,
              [columnName]: displayPercentage,
              count: item.count
            };
          });
          
          setData(chartData);
          setRespondentInfo({
            filtered: filteredResponses,
            total: totalResponses
          });
        } else {
          // No data matches filters - check if we can generate placeholder structure
          // so the chart stays visible with 0% bars
          let chartData = [];
          const columnName = filterType ? `${filterType}_pct` : `${actualQuestionId}_pct`;

          if (baselineOrder && baselineOrder.length > 0) {
            chartData = baselineOrder.map(answerText => {
              // Clean up the answer text
              let cleanAnswer = answerText ? answerText.replace(/[[\]"]/g, '') : 'Unknown';
              if (filterType && cleanAnswer.length > 40) {
                cleanAnswer = cleanAnswer.substring(0, 37) + '...';
              }
              return {
                Resource: cleanAnswer,
                resource: cleanAnswer,
                [columnName]: '-',
                count: 0
              };
            });
          }

          setData(chartData); // May still be [] if no baselineOrder available
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualQuestionId, filterType, JSON.stringify(filters), wasmService, baselineOrder]);

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

  // This triggers when no baselineOrder is available for the question
  // For questions with baseline data, we generate placeholder data instead
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No data available for this question.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-300 rounded-[5px] flex overflow-hidden transition-all duration-200 shadow-sm relative" data-chart-id={actualQuestionId}>
      {/* Icon Section */}
      <div className="flex items-center justify-center w-8 min-w-[32px] text-sm text-gray-600 bg-gray-100 border-r border-gray-300">
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="white"
          stroke="#d1d5db"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            stroke="#d1d5db"
            fill="white"
          />
        </svg>
      </div>

      {/* Content Section */}
      <div className="flex-1 flex flex-col min-w-0">
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
        <SkipLink chartId={actualQuestionId} />

        {/* Chart Content */}
        <div className="flex-1">
          <BarChart
            data={data}
            valueColumn={filterType ? `${filterType}_pct` : `${actualQuestionId}_pct`}
            color={actualColor}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(QuantitativeChart);