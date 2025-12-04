import { useState, useEffect, memo } from 'react';
import RespondentIcon from './RespondentIcon';
import { getTooltipPosition, useHideTooltipOnScroll } from '../utils/tooltip-utils';
import Tooltip from './Tooltip';

const QualitativeAnalysis = ({ questionId, questionText, filters = {}, color = '#64748b', wasmService, baselineOrder }) => {
  const [data, setData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tooltipContent, setTooltipContent] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hideTooltipTimeout, setHideTooltipTimeout] = useState(null);

  useHideTooltipOnScroll(setShowTooltip);

  // Convert hex color to lighter background version
  const getBackgroundColor = (hexColor) => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // Create lighter version (add 40% to each channel, max 255)
    const lightR = Math.min(255, Math.round(r + (255 - r) * 0.7));
    const lightG = Math.min(255, Math.round(g + (255 - g) * 0.7));
    const lightB = Math.min(255, Math.round(b + (255 - b) * 0.7));
    return `rgb(${lightR}, ${lightG}, ${lightB})`;
  };

  // Fetch base qualitative data (unfiltered)
  useEffect(() => {
    if (!questionId || !wasmService) return;

    const fetchQualitativeData = async () => {
      try {
        setLoading(true);
        const result = await wasmService.getQualitativeData(questionId);
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQualitativeData();
  }, [questionId, wasmService]);

  // Fetch filtered theme data when filters change
  useEffect(() => {
    if (!questionId || !wasmService) return;

    const fetchFilteredData = async () => {
      try {
        setFilterLoading(true);
        const result = await wasmService.getQualitativeData(questionId, filters);
        setFilteredData(result);
      } catch (err) {
        console.error('Error fetching filtered data:', err);
        setFilteredData(null);
      } finally {
        setFilterLoading(false);
      }
    };

    fetchFilteredData();
  }, [questionId, filters, wasmService]);

  // Helper function to truncate text to approximately 2 lines
  const truncateToLines = (text, maxChars = 100) => {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars).trim() + '...';
  };

  // Handle mouse events for tooltip
  const handleMouseEnter = (theme, event) => {
    // Clear any pending hide timeout
    if (hideTooltipTimeout) {
      clearTimeout(hideTooltipTimeout);
      setHideTooltipTimeout(null);
    }

    if (theme.representative_quotes) {
      // Parse the quotes if they're a JSON string or Apache Arrow Vector
      let quotes;
      try {
        const rawQuotes = theme.representative_quotes;

        if (typeof rawQuotes === 'string') {
          // JSON string format
          quotes = JSON.parse(rawQuotes);
        } else if (rawQuotes && typeof rawQuotes === 'object' && typeof rawQuotes.get === 'function') {
          // Apache Arrow Vector from DuckDB-WASM
          // Convert to plain array using .get(index)
          const length = rawQuotes.length || 0;
          quotes = [];
          for (let i = 0; i < length; i++) {
            const value = rawQuotes.get(i);
            if (value !== null && value !== undefined) {
              quotes.push(value);
            }
          }
        } else if (rawQuotes && typeof rawQuotes.toArray === 'function') {
          // Has toArray method
          quotes = rawQuotes.toArray();
        } else if (Array.isArray(rawQuotes)) {
          // Already a plain array
          quotes = rawQuotes;
        } else {
          quotes = [rawQuotes];
        }
      } catch (error) {
        console.error('Error parsing quotes:', error);
        quotes = [theme.representative_quotes];
      }

      // Format quotes for display (show all quotes, each truncated to ~150 chars)
      const quotesToShow = Array.isArray(quotes) ? quotes : [quotes];
      const formattedQuotes = quotesToShow
        .filter(q => q && String(q).trim()) // Filter out empty/null values
        .map(q => truncateToLines(String(q), 150))
        .join('\n\n');

      // Get count and percentage from theme data
      const count = theme.frequency || theme.count || 0;
      const percentValue = typeof theme.percentage === 'string' ?
        parseFloat(theme.percentage.replace('%', '')) :
        parseFloat(theme.percentage) || 0;
      const percentage = `${Math.round(percentValue)}%`;

      setTooltipContent(
        `${count} respondents (${percentage})\n\n${formattedQuotes}`
      );
      setTooltipPosition(getTooltipPosition(event, 300, 80));
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    // Add a delay before hiding the tooltip
    const timeout = setTimeout(() => {
      setShowTooltip(false);
      setHideTooltipTimeout(null);
    }, 300); // 300ms delay

    setHideTooltipTimeout(timeout);
  };

  const handleMouseMove = (event) => {
    if (showTooltip) {
      setTooltipPosition(getTooltipPosition(event, 300, 80));
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
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-800">
              Error loading qualitative analysis: {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handle both old and new data structure
  const baseThemes = data?.themes || data || [];
  const hasThemes = Array.isArray(baseThemes) && baseThemes.length > 0;
  
  // Helper function to get display themes
  const getDisplayThemes = () => {
    const displayThemes = filteredData?.themes || filteredData || baseThemes;
    return Array.isArray(displayThemes) ? displayThemes : [];
  };
  
  if (!hasThemes) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No qualitative analysis available for this question.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-gray-300 rounded-[5px] flex overflow-hidden transition-all duration-200 shadow-sm relative" data-chart-id={questionId}>
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
                  <h3 className="text-lg font-semibold text-nodered-gray-700">
                    {questionText || 'Qualitative Analysis'}
                  </h3>
                </div>
                {/* Respondent Count Badge - Minimal */}
                {filteredData && filteredData.respondentCount && (
                  <div className="flex items-center gap-1 text-sm flex-shrink-0">
                    {filterLoading ? (
                      <div className="flex items-center gap-1 text-yellow-400">
                        <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs">Updating...</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-gray-600 font-bold">
                          {filteredData.respondentCount.filtered}
                        </span>
                        <span className="text-gray-500 hidden sm:inline">
                          {' '}respondents
                        </span>
                        <RespondentIcon />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Themes - Main Body */}
        <div 
          className="flex-1 p-4 space-y-3"
          onMouseMove={handleMouseMove}
        >
        {(() => {
          const themes = getDisplayThemes();
          // Apply baseline ordering if available, otherwise sort by percentage descending
          if (baselineOrder && baselineOrder.length > 0) {
            const themeMap = new Map(themes.map(theme => [theme.theme_name, theme]));

            // Create ordered list from baseline, including missing items with count: 0
            const baselineThemes = baselineOrder.map(themeName => {
              if (themeMap.has(themeName)) {
                return themeMap.get(themeName);
              } else {
                // Create placeholder for missing baseline item
                return {
                  theme_name: themeName,
                  percentage: 0,
                  frequency: 0,
                  count: 0,
                  representative_quotes: null,
                  description: '-'
                };
              }
            });

            // Find any new themes not in baseline
            const newThemes = themes.filter(theme => !baselineOrder.includes(theme.theme_name));
            // Sort new themes by percentage descending
            newThemes.sort((a, b) => {
              const percentA = typeof a.percentage === 'string' ? parseFloat(a.percentage.replace('%', '')) : parseFloat(a.percentage) || 0;
              const percentB = typeof b.percentage === 'string' ? parseFloat(b.percentage.replace('%', '')) : parseFloat(b.percentage) || 0;
              return percentB - percentA;
            });
            return [...baselineThemes, ...newThemes];
          } else {
            // No baseline, sort by percentage descending
            return [...themes].sort((a, b) => {
              const percentA = typeof a.percentage === 'string' ? parseFloat(a.percentage.replace('%', '')) : parseFloat(a.percentage) || 0;
              const percentB = typeof b.percentage === 'string' ? parseFloat(b.percentage.replace('%', '')) : parseFloat(b.percentage) || 0;
              return percentB - percentA;
            });
          }
        })()
          .map((theme, _index) => {
            const percentValue = typeof theme.percentage === 'string' ?
              parseFloat(theme.percentage.replace('%', '')) :
              parseFloat(theme.percentage) || 0;
            const count = theme.frequency || theme.count || 0;

            // Format display percentage:
            // - count === 0 → "No data"
            // - count > 0 but rounds to 0% → "<1%"
            // - otherwise → actual percentage
            let displayPercentage;
            if (count === 0) {
              displayPercentage = '-';
            } else if (Math.round(percentValue) === 0) {
              displayPercentage = '<1%';
            } else {
              displayPercentage = `${Math.round(percentValue)}%`;
            }

            return (
              <div key={theme.theme_name}>
                {/* Colored Bar with percentage inside */}
                <div
                  className={`flex-1 px-2 py-1 relative transition-all duration-200 ${
                    theme.representative_quotes ? 'cursor-pointer hover:opacity-90' : ''
                  }`}
                  style={{
                    backgroundColor: getBackgroundColor(color),
                    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.015)';
                    handleMouseEnter(theme, e);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    handleMouseLeave(e);
                  }}
                >
                  {/* Percentage Bar Fill - with minimum 46px width */}
                  <div
                    className="absolute inset-y-0 right-0 opacity-80"
                    style={{
                      width: `max(${percentValue}%, 46px)`,
                      backgroundColor: color,
                      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  />

                  {/* Content with Theme Title and Percentage */}
                  <div className="relative z-10 flex items-center justify-between">
                    <h4 className="text-xs text-black font-normal uppercase tracking-[0.2px] leading-4 m-0">
                      {theme.theme_name}
                    </h4>
                    {/* Percentage inside the bar on the right */}
                    <span className="text-xs font-bold text-white">
                      {displayPercentage}
                    </span>
                  </div>
                </div>
                
                {/* Description Below */}
                <p className="mt-1 text-[10px] text-nodered-gray-500 font-normal leading-tight px-2">
                  {theme.description || (count === 0 ? '-' : '')}
                </p>
              </div>
            );
          })}
        </div>

        {/* Tooltip */}
        <Tooltip
          show={showTooltip}
          position={tooltipPosition}
          content={tooltipContent}
        />
      </div>
    </div>
  );
};

export default memo(QualitativeAnalysis);