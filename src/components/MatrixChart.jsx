import React, { useEffect, useState } from 'react';
import RespondentIcon from './RespondentIcon';
import { getTooltipPosition, useHideTooltipOnScroll } from '../utils/tooltip-utils';
import Tooltip from './Tooltip';
import ChartHeader from './ChartHeader';
import SkipLink from './SkipLink';

// Define the sub-questions for the matrix (constant, outside component)
const SUB_QUESTIONS = [
  { id: '0f096ad2-1241-4657-98ac-1c721f958999', label: 'Editing flows' },
  { id: '31f69859-8ab9-4202-8d56-143007730ee1', label: 'Viewing runtime data' },
  { id: '0be2d6bd-10ce-4387-ab24-9bbb64ce6b09', label: 'Accessing dashboards' },
  { id: '91356092-cf0a-4bb5-b467-2c84645328aa', label: 'Managing flows' }
];

const MatrixChart = ({ questionId, questionTitle, filters, _color, wasmService }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tooltipContent, setTooltipContent] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useHideTooltipOnScroll(setShowTooltip);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!wasmService) return;

        const result = await wasmService.getMatrixData(questionId, filters);

        if (result.data && result.data.length > 0) {
          setData(result.data);
        } else {
          // No data matches filters - generate placeholder structure
          // so the chart stays visible with 0% bars
          const placeholderData = SUB_QUESTIONS.map(subQ => {
            const entry = {
              sub_question_id: subQ.id,
              total_respondents: 0
            };
            // Add zero values for each device option
            ['Desktop/Laptop', 'Tablet', 'Phone'].forEach(device => {
              entry[device] = { percentage: 0, count: 0 };
            });
            return entry;
          });
          setData(placeholderData);
        }
      } catch (err) {
        console.error('Error fetching matrix data:', err);
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [questionId, filters, wasmService]);

  // Only show skeleton during initial load (no data yet)
  // Once we have data, keep showing it while loading new filtered data
  if (loading && data.length === 0) {
    return (
      <div className="bg-white rounded-[5px] overflow-hidden shadow-sm border border-gray-300 flex">
        <div className="flex items-center justify-center w-8 min-w-[32px] text-sm text-gray-600 bg-gray-100 border-r border-gray-300">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white" stroke="#d1d5db" strokeWidth="1.5" aria-hidden="true">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="#d1d5db" fill="white" />
          </svg>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <ChartHeader title={questionTitle} />
          </div>
          <div className="p-6">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-[5px] overflow-hidden shadow-sm border border-gray-300 flex">
        <div className="flex items-center justify-center w-8 min-w-[32px] text-sm text-gray-600 bg-gray-100 border-r border-gray-300">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white" stroke="#d1d5db" strokeWidth="1.5" aria-hidden="true">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="#d1d5db" fill="white" />
          </svg>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <ChartHeader title={questionTitle} />
          </div>
          <div className="p-6">
            <div className="text-red-500">Error loading data: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Define device options with shades of the same base color
  const deviceOptions = [
    { label: 'Desktop/Laptop', color: '#b8963f' },  // Dark amber shade
    { label: 'Tablet', color: '#c4a747' },          // Medium amber (base)
    { label: 'Phone', color: '#d4b85a' }            // Light amber shade
  ];

  // Render the matrix as multiple horizontal segmented bars similar to RatingsChart
  return (
    <div
      className="bg-white rounded-[5px] overflow-hidden shadow-sm border border-gray-300 flex"
      data-chart-id={questionId}
      role="img"
      aria-label={`${questionTitle} - Device usage matrix chart showing Desktop/Laptop, Tablet, and Phone usage for different tasks`}
    >
      {/* Left Icon Section */}
      <div className="flex items-center justify-center w-8 min-w-[32px] text-sm text-gray-600 bg-gray-100 border-r border-gray-300">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white" stroke="#d1d5db" strokeWidth="1.5" aria-hidden="true">
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="#d1d5db" fill="white" />
        </svg>
      </div>

      {/* Content Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <ChartHeader title={questionTitle} />
                </div>
                {/* Respondent Count Badge */}
                {data.length > 0 && data[0].total_respondents && (
                  <div className="flex items-center gap-1 text-sm flex-shrink-0">
                    <span className="text-gray-600 font-bold">
                      {data[0].total_respondents}
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
        <SkipLink chartId={questionId} />
        
        {/* Matrix Data */}
        <div className="p-4">
          {SUB_QUESTIONS.map((subQ, index) => {
            const subData = Array.isArray(data) ? (data.find(d => d.sub_question_id === subQ.id) || {}) : {};

            // Calculate percentages for each device option
            const deviceData = deviceOptions.map(device => {
              const deviceInfo = subData[device.label] || { percentage: 0, count: 0 };
              return {
                ...device,
                percentage: deviceInfo.percentage || 0,
                count: deviceInfo.count || 0
              };
            });

            // Get total respondents for this task
            const totalRespondents = subData.total_respondents || 0;

            return (
              <div key={subQ.id} className={`${index > 0 ? 'mt-5' : ''}`}>
                {/* Sub-question label with respondent count */}
                <div className="relative flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">
                    {subQ.label}
                  </h4>
                  <div className="flex items-center gap-1 text-xs flex-shrink-0">
                    <span className="text-gray-600 font-bold">
                      {totalRespondents}
                    </span>
                    <span className="text-gray-500 hidden sm:inline">
                      {' '}respondents
                    </span>
                    <RespondentIcon className="w-3 h-3 text-gray-500 sm:hidden" />
                  </div>
                </div>
                
                {/* Horizontal segmented bar like RatingsChart */}
                <div className="mb-2">
                  <div className="flex h-6 shadow-sm">
                    {deviceData.map((device, idx) => {
                      // Determine alignment based on position: left, center, right
                      const justifyClass = idx === 0 ? 'justify-start' :
                                         idx === 1 ? 'justify-center' :
                                         'justify-end';

                      const handleBarMouseEnter = (event) => {
                        event.stopPropagation();

                        if (device.count > 0) {
                          setTooltipContent(`${device.label}\n${device.count} respondents (${device.count === 0 ? '-' : (Math.round(device.percentage) === 0 ? '<1%' : `${Math.round(device.percentage)}%`)})`);
                          setTooltipPosition(getTooltipPosition(event, 200, 60));
                          setShowTooltip(true);
                        }
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

                      const displayPercentage = device.count === 0 ? '-' : (Math.round(device.percentage) === 0 ? '<1%' : `${Math.round(device.percentage)}%`);
                      const ariaLabel = `${subQ.label} - ${device.label}: ${device.count} respondents (${displayPercentage})`;

                      return (
                        <div
                          key={device.label}
                          className={`relative flex items-center ${justifyClass} border-r border-white/20 last:border-r-0 cursor-pointer focus:outline focus:outline-2 focus:outline-[#3b82f6] focus:z-20`}
                          style={{
                            width: device.percentage > 0 ? `${device.percentage}%` : `${100 / deviceData.length}%`,
                            backgroundColor: device.color,
                            minWidth: '35px',
                            transition: 'width 0.3s ease-in-out, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={ariaLabel}
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
                            // For keyboard focus, calculate position from element bounds
                            const rect = e.currentTarget.getBoundingClientRect();
                            // Guard against NaN values from elements not yet laid out
                            if (rect && !isNaN(rect.left) && !isNaN(rect.top) && device.count > 0) {
                              const syntheticEvent = {
                                clientX: rect.left + rect.width / 2,
                                clientY: rect.top,
                                stopPropagation: () => {}
                              };
                              setTooltipContent(`${device.label}\n${device.count} respondents (${device.count === 0 ? '-' : (Math.round(device.percentage) === 0 ? '<1%' : `${Math.round(device.percentage)}%`)})`);
                              setTooltipPosition(getTooltipPosition(syntheticEvent, 200, 60));
                              setShowTooltip(true);
                            }
                          }}
                          onBlur={(e) => {
                            handleBarMouseLeave(e);
                          }}
                        >
                          <span className={`text-white font-semibold text-xs ${idx === 0 ? 'pl-2 pr-1' : idx === 2 ? 'pl-1 pr-2' : 'px-1'}`}>
                            {displayPercentage}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Labels below bars - aligned with each segment */}
                <div className="flex">
                  {deviceData.map((device, idx) => {
                    // Determine alignment based on position: left, center, right
                    const itemsClass = idx === 0 ? 'items-start' :
                                      idx === 1 ? 'items-center' :
                                      'items-end';
                    const textClass = idx === 0 ? 'text-left' :
                                     idx === 1 ? 'text-center' :
                                     'text-right';

                    return (
                      <div
                        key={device.label}
                        className={`flex flex-col ${itemsClass} justify-start min-w-0`}
                        style={{
                          width: device.percentage > 0 ? `${device.percentage}%` : `${100 / deviceData.length}%`,
                          minWidth: '35px',
                          transition: 'width 0.3s ease-in-out'
                        }}
                      >
                        <div className={`text-xs text-gray-500 ${textClass} font-semibold overflow-hidden text-ellipsis whitespace-nowrap w-full`}>
                          {device.label.toUpperCase()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {/* Average across all tasks */}
          {data.length > 0 && data[0].sub_question_id && (
            <div className="mt-5">
              <div className="text-sm font-semibold text-gray-700 mb-2">
                Average across all tasks
              </div>
              
              {(() => {
                // Calculate averages from all sub-questions
                const averages = deviceOptions.map(device => {
                  const validData = data.filter(d => d[device.label] && d[device.label].percentage > 0);
                  if (validData.length === 0) return { ...device, percentage: 0, count: 0 };

                  const avgPercentage = validData.reduce((sum, d) => sum + d[device.label].percentage, 0) / validData.length;
                  const totalCount = validData.reduce((sum, d) => sum + d[device.label].count, 0);

                  return {
                    ...device,
                    percentage: avgPercentage,
                    count: totalCount
                  };
                });

                return (
                  <>
                    {/* Horizontal segmented bar */}
                    <div className="mb-2">
                      <div className="flex h-6 shadow-sm">
                        {averages.map((device, idx) => {
                          const justifyClass = idx === 0 ? 'justify-start' :
                                             idx === 1 ? 'justify-center' :
                                             'justify-end';

                          const handleBarMouseEnter = (event) => {
                            event.stopPropagation();

                            if (device.count > 0) {
                              setTooltipContent(`${device.label}\n${device.count === 0 ? '-' : (Math.round(device.percentage) === 0 ? '<1%' : `${Math.round(device.percentage)}%`)}`);
                              setTooltipPosition(getTooltipPosition(event, 200, 60));
                              setShowTooltip(true);
                            }
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

                          const displayPercentage = device.count === 0 ? '-' : (Math.round(device.percentage) === 0 ? '<1%' : `${Math.round(device.percentage)}%`);
                          const ariaLabel = `Average across all tasks - ${device.label}: ${displayPercentage}`;

                          return (
                            <div
                              key={device.label}
                              className={`relative flex items-center ${justifyClass} border-r border-white/20 last:border-r-0 cursor-pointer focus:outline focus:outline-2 focus:outline-[#3b82f6] focus:z-20`}
                              style={{
                                width: device.percentage > 0 ? `${device.percentage}%` : `${100 / averages.length}%`,
                                backgroundColor: device.color,
                                minWidth: '35px',
                                transition: 'width 0.3s ease-in-out, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                              }}
                              tabIndex={0}
                              role="button"
                              aria-label={ariaLabel}
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
                                // For keyboard focus, calculate position from element bounds
                                const rect = e.currentTarget.getBoundingClientRect();
                                // Guard against NaN values from elements not yet laid out
                                if (rect && !isNaN(rect.left) && !isNaN(rect.top) && device.count > 0) {
                                  const syntheticEvent = {
                                    clientX: rect.left + rect.width / 2,
                                    clientY: rect.top,
                                    stopPropagation: () => {}
                                  };
                                  setTooltipContent(`${device.label}\n${device.count === 0 ? '-' : (Math.round(device.percentage) === 0 ? '<1%' : `${Math.round(device.percentage)}%`)}`);
                                  setTooltipPosition(getTooltipPosition(syntheticEvent, 200, 60));
                                  setShowTooltip(true);
                                }
                              }}
                              onBlur={(e) => {
                                handleBarMouseLeave(e);
                              }}
                            >
                              <span className={`text-white font-semibold text-xs ${idx === 0 ? 'pl-2 pr-1' : idx === 2 ? 'pl-1 pr-2' : 'px-1'}`}>
                                {displayPercentage}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Labels below bars */}
                    <div className="flex">
                      {averages.map((device, idx) => {
                        const itemsClass = idx === 0 ? 'items-start' :
                                         idx === 1 ? 'items-center' :
                                         'items-end';
                        const textClass = idx === 0 ? 'text-left' :
                                         idx === 1 ? 'text-center' :
                                         'text-right';

                        return (
                          <div
                            key={device.label}
                            className={`flex flex-col ${itemsClass} justify-start min-w-0`}
                            style={{
                              width: device.percentage > 0 ? `${device.percentage}%` : `${100 / averages.length}%`,
                              minWidth: '35px',
                              transition: 'width 0.3s ease-in-out'
                            }}
                          >
                            <div className={`text-xs text-gray-500 ${textClass} font-semibold overflow-hidden text-ellipsis whitespace-nowrap w-full`}>
                              {device.label.toUpperCase()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          
          {/* Fallback for aggregated data if no sub-question data */}
          {data.length > 0 && !data[0].sub_question_id && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-3">
                Device usage across all Node-RED tasks
              </div>
              
              {/* Calculate percentages */}
              {(() => {
                const deviceData = data.map((item, idx) => ({
                  label: item.device,
                  percentage: item.usage_percentage,
                  count: item.usage_count,
                  color: deviceOptions[idx % deviceOptions.length].color
                }));
                
                return (
                  <>
                    {/* Horizontal segmented bar */}
                    <div className="mb-2">
                      <div 
                        className="flex h-8 overflow-hidden shadow-sm transform-gpu transition-transform duration-200"
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        {deviceData.map((device) => (
                          <div
                            key={device.label}
                            className="relative flex items-center justify-center transition-all duration-300 border-r border-white/30 last:border-r-0"
                            style={{
                              width: `${device.percentage}%`,
                              backgroundColor: device.color,
                              transition: 'width 0.3s ease-in-out'
                            }}
                            title={`${device.label}: ${device.count} (${device.percentage}%)`}
                          >
                            {device.percentage > 10 && (
                              <span className="text-white text-sm font-medium">
                                {device.percentage}%
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Legend - simplified */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2">
                      {deviceData.map(device => (
                        <div key={device.label} className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-sm mr-1.5" 
                            style={{ backgroundColor: device.color }}
                          />
                          <span className="text-gray-600">
                            {device.label.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
              
            </div>
          )}
        </div>
      </div>

      {/* Screen reader data table */}
      {data.length > 0 && data[0].sub_question_id && (
        <table className="sr-only">
          <caption>{questionTitle || 'Matrix chart'} data</caption>
          <thead>
            <tr>
              <th scope="col">Task</th>
              <th scope="col">Device</th>
              <th scope="col">Count</th>
              <th scope="col">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {SUB_QUESTIONS.map((subQ) => {
              const subData = data.find(d => d.sub_question_id === subQ.id) || {};
              return deviceOptions.map((device) => {
                const deviceInfo = subData[device.label] || { percentage: 0, count: 0 };
                const displayPercentage = deviceInfo.count === 0 ? '0%' : (Math.round(deviceInfo.percentage) === 0 ? '<1%' : `${Math.round(deviceInfo.percentage)}%`);
                return (
                  <tr key={`${subQ.id}-${device.label}`}>
                    <td>{subQ.label}</td>
                    <td>{device.label}</td>
                    <td>{deviceInfo.count} respondents</td>
                    <td>{displayPercentage}</td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      )}

      {/* Tooltip */}
      <Tooltip
        show={showTooltip}
        position={tooltipPosition}
        content={tooltipContent}
      />
    </div>
  );
};

export default MatrixChart;