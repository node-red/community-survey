import { useState, useEffect } from 'react';
import { getRatingScheme } from '../utils/colorPalette';

const DEVICE_QUESTIONS = [
  { id: 'bepze7', name: 'Desktop/Laptop', colorScheme: 'yellow' },
  { id: 'Apg9pl', name: 'Tablet', colorScheme: 'indigo' },
  { id: 'Bpyep1', name: 'Smartphone', colorScheme: 'pink' }
];

const DeviceSatisfactionGrid = ({ filters = {}, wasmService }) => {

  const [questionData, setQuestionData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltipContent, setTooltipContent] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchAllQuestionData = async () => {
      try {
        setLoading(true);

        if (!wasmService) return;

        const fetchPromises = DEVICE_QUESTIONS.map(async (question) => {
          const result = await wasmService.getQuantitativeData(question.id, filters);

          if (result.data && result.data.length > 0) {
            const totalResponses = result.total_respondents || 0;
            const filteredResponses = result.filtered_respondents || totalResponses;
            const processedData = processRatingData(result.data, 7, question.id);

            return {
              id: question.id,
              data: processedData,
              respondentCount: filteredResponses
            };
          }

          return {
            id: question.id,
            data: [],
            respondentCount: 0
          };
        });

        const results = await Promise.all(fetchPromises);
        const dataMap = {};
        results.forEach(result => {
          dataMap[result.id] = result;
        });

        setQuestionData(dataMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllQuestionData();
  }, [filters, wasmService]);

  const processRatingData = (rawData, scale = 7, questionId = null) => {
    // Use unified color palette instead of hardcoded schemes
    const fullColors = getRatingScheme(questionId).slice(0, scale);
    const colors = fullColors.slice(0, scale);

    const scores = [];
    const totalCount = rawData.reduce((sum, item) => sum + (item.count || 0), 0);
    
    for (let score = 1; score <= scale; score++) {
      const count = rawData
        .filter(item => {
          const value = parseInt(item.answer_text?.replace(/[\]"]/g, '').replace('[', '') || '0');
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

    return scores;
  };

  // Calculate average rating for a question
  const calculateAverageRating = (data) => {
    if (!data || data.length === 0) return 0;
    
    let totalScore = 0;
    let totalResponses = 0;
    
    data.forEach(item => {
      const rating = parseInt(item.label);
      totalScore += rating * item.count;
      totalResponses += item.count;
    });
    
    return totalResponses > 0 ? Math.round(totalScore / totalResponses) : 0;
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
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

  return (
    <div className="w-full bg-white border border-gray-300 rounded-[5px] overflow-hidden shadow-sm relative">
      {/* Icon Section */}
      <div className="flex">
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
        <div className="flex-1">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <h3 className="text-lg font-semibold text-nodered-gray-700">
              Satisfaction ratings by device type? (1-7)
            </h3>
          </div>

          {/* Questions Grid */}
          <div className="divide-y divide-gray-200">
            {DEVICE_QUESTIONS.map((question) => {
              const data = questionData[question.id];
              if (!data || !data.data || data.data.length === 0) return null;

              const averageRating = calculateAverageRating(data.data);

              return (
                <div key={question.id} className="px-4 py-3">
                  <div className="relative flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">
                      {question.name}
                    </h4>
                    <span className="absolute left-1/2 -translate-x-1/2 text-xs font-bold text-gray-600">
                      {averageRating}/7
                    </span>
                    <span className="text-xs text-gray-500">
                      {data.respondentCount} respondents
                    </span>
                  </div>

                  {/* Horizontal Percentage Bar */}
                  <div className="mb-1">
                    <div
                      className="flex h-6 shadow-sm"
                    >
                      {data.data.map((item) => {
                        const handleBarMouseEnter = (event) => {
                          event.stopPropagation();

                          const totalResponses = data.data.reduce((sum, d) => sum + d.count, 0);
                          const percentage = totalResponses > 0 ? ((item.count / totalResponses) * 100).toFixed(0) : 0;

                          setTooltipContent(`${item.count} respondents (${percentage}%)`);

                          const screenY = event.clientY;
                          const screenX = event.clientX;
                          const tooltipWidth = 200;
                          const tooltipHeight = 60;

                          let adjustedX = screenX + 15;
                          let adjustedY = screenY - tooltipHeight - 10;

                          if (adjustedY < 0) {
                            adjustedY = screenY + 15;
                          }
                          if (adjustedX + tooltipWidth > window.innerWidth) {
                            adjustedX = screenX - tooltipWidth - 15;
                          }

                          setTooltipPosition({ x: adjustedX, y: adjustedY });
                          setShowTooltip(true);
                        };

                        const handleBarMouseLeave = (event) => {
                          event.stopPropagation();
                          setShowTooltip(false);
                        };

                        const handleBarMouseMove = (event) => {
                          if (showTooltip) {
                            event.stopPropagation();

                            const screenY = event.clientY;
                            const screenX = event.clientX;
                            const tooltipWidth = 200;
                            const tooltipHeight = 60;

                            let adjustedX = screenX + 15;
                            let adjustedY = screenY - tooltipHeight - 10;

                            if (adjustedY < 0) {
                              adjustedY = screenY + 15;
                            }
                            if (adjustedX + tooltipWidth > window.innerWidth) {
                              adjustedX = screenX - tooltipWidth - 15;
                            }

                            setTooltipPosition({ x: adjustedX, y: adjustedY });
                          }
                        };

                        return (
                          <div
                            key={item.label}
                            className="relative flex items-center justify-center border-r border-white/20 last:border-r-0 cursor-pointer transition-transform duration-200"
                            style={{
                              width: item.percentage > 0 ? `${item.percentage}%` : 'auto',
                              backgroundColor: item.color,
                              minWidth: '28px'
                            }}
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
                          >
                            <span className="text-white font-semibold text-xs px-1">
                              {item.count === 0 ? 'No data' : (Math.round(item.percentage) === 0 ? '<1%' : `${Math.round(item.percentage)}%`)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Labels below bars */}
                  <div className="flex">
                    {data.data.map((item) => (
                      <div
                        key={item.label}
                        className="flex flex-col items-center justify-start"
                        style={{
                          width: item.percentage > 0 ? `${item.percentage}%` : 'auto',
                          minWidth: '28px'
                        }}
                      >
                        <div className="text-xs text-gray-500 text-center font-semibold">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none text-sm whitespace-pre-line border border-gray-600"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            maxWidth: '200px'
          }}
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

export default DeviceSatisfactionGrid;