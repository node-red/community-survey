import { useState, useEffect } from 'react';
import { getRatingScheme } from '../utils/colorPalette';

const DESIGN_CHANGE_QUESTIONS = [
  { id: '089k8A', name: 'Node-RED branding (logo, website, forum)' },
  { id: 'GpGAdp', name: 'Overall visual design (new colors, icons)' },
  { id: 'zM9dMg', name: 'UI Menus layout and navigation' },
  { id: 'GpGVZZ', name: 'Editor design and layout' },
  { id: '597V9Q', name: 'Nodes design and anatomy (node size, information, and visuals)' }
];

const DesignChangesRatingsGrid = ({ filters = {}, wasmService }) => {
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hideTooltipTimeout, setHideTooltipTimeout] = useState(null);

  const [questionData, setQuestionData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllQuestionData = async () => {
      try {
        setLoading(true);

        if (!wasmService) return;

        const fetchPromises = DESIGN_CHANGE_QUESTIONS.map(async (question) => {
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTooltipTimeout) {
        clearTimeout(hideTooltipTimeout);
      }
    };
  }, [hideTooltipTimeout]);

  const processRatingData = (rawData, scale = 7, questionId) => {
    const colors = getRatingScheme(questionId).slice(0, scale);

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

  // Only show skeleton during initial load (no data yet)
  // Once we have data, keep showing it while loading new filtered data
  if (loading && Object.keys(questionData).length === 0) {
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
    <div className="w-full bg-white border border-gray-300 rounded-[5px] overflow-hidden shadow-sm">
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
              How would you feel about potential changes to? (1-7)
            </h3>
          </div>

          {/* Questions Grid */}
          <div className="divide-y divide-gray-200">
            {DESIGN_CHANGE_QUESTIONS.map((question) => {
              const data = questionData[question.id];
              if (!data || !data.data || data.data.length === 0) return null;

              return (
                <div key={question.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">
                      {question.name}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {data.respondentCount} respondents
                    </span>
                  </div>
                  
                  {/* Horizontal Percentage Bar */}
                  <div className="mb-1">
                    <div 
                      className="flex h-6 overflow-hidden shadow-sm transform-gpu transition-transform duration-200"
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      {data.data.map((item) => (
                        <div
                          key={item.label}
                          className="relative flex items-center justify-center border-r border-white/20 last:border-r-0 cursor-pointer transition-opacity hover:opacity-90"
                          style={{
                            width: item.percentage > 0 ? `${item.percentage}%` : 'auto',
                            backgroundColor: item.color,
                            minWidth: '28px',
                            transition: 'width 0.3s ease-in-out'
                          }}
                          onMouseEnter={(e) => {
                            // Clear any pending hide timeout
                            if (hideTooltipTimeout) {
                              clearTimeout(hideTooltipTimeout);
                              setHideTooltipTimeout(null);
                            }
                            
                            // Always show 10px above cursor - use screen coordinates
                            const screenY = e.clientY; // Screen Y position
                            const screenX = e.clientX; // Screen X position
                            const tooltipWidth = 200;
                            const tooltipHeight = 80; // Approximate height
                            
                            let adjustedX = screenX + 15; // 15px to the right of cursor
                            let adjustedY = screenY - tooltipHeight - 10; // Bottom of tooltip 10px above cursor
                            
                            // Only adjust if not enough screen space
                            if (adjustedY < 0) {
                              adjustedY = screenY + 15; // Switch to below cursor
                            }
                            if (adjustedX + tooltipWidth > window.innerWidth) {
                              adjustedX = screenX - tooltipWidth - 15; // Switch to left side
                            }
                            
                            const averageRating = calculateAverageRating(data.data);
                            const totalResponses = data.data.reduce((sum, item) => sum + item.count, 0);
                            
                            setTooltipData({
                              averageRating: averageRating,
                              totalResponses: totalResponses,
                              question: question.name
                            });
                            setTooltipPosition({ x: adjustedX, y: adjustedY });
                          }}
                          onMouseMove={(e) => {
                            if (tooltipData) {
                              // Always show 10px above cursor - use screen coordinates
                              const screenY = e.clientY; // Screen Y position
                              const screenX = e.clientX; // Screen X position
                              const tooltipWidth = 200;
                              const tooltipHeight = 80; // Approximate height
                              
                              let adjustedX = screenX + 15; // 15px to the right of cursor
                              let adjustedY = screenY - tooltipHeight - 10; // Bottom of tooltip 10px above cursor
                              
                              // Only adjust if not enough screen space
                              if (adjustedY < 0) {
                                adjustedY = screenY + 15; // Switch to below cursor
                              }
                              if (adjustedX + tooltipWidth > window.innerWidth) {
                                adjustedX = screenX - tooltipWidth - 15; // Switch to left side
                              }
                              
                              setTooltipPosition({ x: adjustedX, y: adjustedY });
                            }
                          }}
                          onMouseLeave={() => {
                            // Add a delay before hiding the tooltip
                            const timeout = setTimeout(() => {
                              setTooltipData(null);
                              setHideTooltipTimeout(null);
                            }, 300); // 300ms delay
                            
                            setHideTooltipTimeout(timeout);
                          }}
                        >
                          <span className="text-white font-semibold text-[10px] px-1">
                            {item.count === 0 ? 'N/A' : (Math.round(item.percentage) === 0 ? '<1%' : `${Math.round(item.percentage)}%`)}
                          </span>
                        </div>
                      ))}
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
                          minWidth: '28px',
                          transition: 'width 0.3s ease-in-out'
                        }}
                      >
                        <div className="text-[10px] text-gray-500 text-center font-semibold">
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
      {tooltipData && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none text-sm whitespace-pre-line border border-gray-600"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            maxWidth: '200px'
          }}
        >
          <div className="font-semibold">{tooltipData.question}</div>
          <div>Average Rating: {tooltipData.averageRating}/7</div>
          <div>Total Responses: {tooltipData.totalResponses}</div>
        </div>
      )}
    </div>
  );
};

export default DesignChangesRatingsGrid;