import React, { useRef, useState, useEffect } from 'react';
import { chart, cn } from '../styles/classNames';
import { defaultChartColor } from '../utils/colorPalette';

const BarChart = ({
  data,
  title,
  subtitle,
  valueColumn,
  color = defaultChartColor,
  isMirrored = false,
  containerClassName = '',
  animationScale = 1.01,
  showRespondentsInTooltip = true
}) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(600); // Default fallback
  const [tooltipContent, setTooltipContent] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  // Helper function to truncate text with ellipsis
  const truncateText = (text, maxWidth, charWidth = 8) => {
    const maxChars = Math.floor(maxWidth / charWidth);
    if (text.length <= maxChars) return { text, truncated: false };
    
    // Calculate how many characters we can show before ellipsis
    const charsBeforeEllipsis = maxChars - 3; // Reserve 3 chars for "..."
    
    // For meaningful truncation, we need either:
    // 1. At least 10 characters visible (not including ellipsis) for long text
    // 2. At least 50% of the original text visible for shorter text
    const minMeaningfulChars = Math.max(10, Math.ceil(text.length * 0.5));
    
    if (charsBeforeEllipsis < minMeaningfulChars) {
      // Not enough space for meaningful text - don't truncate, show outside instead
      return { text, truncated: false, tooShortToTruncate: true };
    }
    
    return { 
      text: text.substring(0, charsBeforeEllipsis) + '...', 
      truncated: true,
      original: text 
    };
  };

  // Helper function to determine text positioning
  const getTextPositioning = (resource, percentage, barWidth, isNoData = false) => {
    const resourceWidth = resource.length * 5.5; // Smaller estimate for 10px font
    const percentageWidth = percentage.length * 7; // Smaller estimate for 10px percentage text
    const minPadding = 8; // Minimum padding on each side
    const barPixelWidth = isNoData ? 8 : (barWidth / 100) * containerWidth;
    
    // For no-data bars, always show text outside
    if (isNoData) {
      return {
        showPercentageInside: false,
        showResourceInside: false,
        resourceEllipsis: { text: resource, truncated: false }
      };
    }

    // More conservative thresholds for small bars
    // For bars under 15% width, place text outside
    const isVerySmallBar = barWidth <= 5;
    
    // Check if each element fits independently with ellipsis consideration
    const resourceFitsWithPadding = barPixelWidth > (resourceWidth + (2 * minPadding));
    const percentageFitsWithPadding = barPixelWidth > (percentageWidth + (2 * minPadding));
    
    // For resource: only show inside if we can display meaningful text
    // We need enough space for either the full text or a meaningful truncation
    const minBarWidthForResource = Math.max(60, resource.length * 4); // Dynamic based on text length, smaller for 10px font
    const resourceCanFitInside = !isVerySmallBar && 
      barPixelWidth >= minBarWidthForResource &&
      (resourceFitsWithPadding || barPixelWidth > 80); // Only allow ellipsis in larger bars, reduced threshold
    
    // For percentage: show inside if there's enough space
    const percentageCanFitInside = !isVerySmallBar && 
      barPixelWidth >= 60 && // Need at least 60px width for percentage
      percentageFitsWithPadding;
    
    // Calculate if we need ellipsis
    const resourceNeedsEllipsis = resourceCanFitInside && !resourceFitsWithPadding;
    const availableWidthForResource = barPixelWidth - (2 * minPadding) - (percentageCanFitInside ? percentageWidth + 10 : 0);
    
    // Try to truncate if needed
    let resourceEllipsis = { text: resource, truncated: false };
    let actuallyShowResourceInside = resourceCanFitInside;
    
    if (resourceNeedsEllipsis) {
      resourceEllipsis = truncateText(resource, availableWidthForResource, 8);
      // If truncation would result in too few meaningful characters, show outside instead
      if (resourceEllipsis.tooShortToTruncate) {
        actuallyShowResourceInside = false;
        resourceEllipsis = { text: resource, truncated: false };
      }
    }
    
    return {
      showPercentageInside: percentageCanFitInside,
      showResourceInside: actuallyShowResourceInside,
      resourceEllipsis: resourceEllipsis
    };
  };

  // Process data - ensure data is an array
  // Note: Data order is preserved from parent component (baseline ordering applied upstream)
  const chartData = (Array.isArray(data) ? data : [])
    .map(row => ({
      resource: row.Resource || row.resource || '',
      value: !row[valueColumn] || row[valueColumn] === '-' || row[valueColumn] === 'N/A' ? 0 : parseInt(row[valueColumn].replace('%', ''), 10),
      displayValue: !row[valueColumn] || row[valueColumn] === '-' || row[valueColumn] === 'N/A' ? '-' : row[valueColumn],
      hasData: row[valueColumn] && row[valueColumn] !== '-' && row[valueColumn] !== 'N/A' && parseInt(row[valueColumn].replace('%', ''), 10) >= 0,
      count: row.count // Preserve count for tooltips
    }));

  const maxValue = Math.max(...chartData.filter(d => d.hasData).map(d => d.value));

  if (chartData.length === 0) {
    return (
      <div className={cn(chart.container, containerClassName)}>
        {title && <h3 className={chart.title}>{title}</h3>}
        {subtitle && <p className={chart.subtitle}>{subtitle}</p>}
        <div className="text-center py-6 text-nodered-gray-500 italic text-nr-sm">No data available</div>
      </div>
    );
  }

  return (
    <div className={cn(chart.container, containerClassName)} ref={containerRef}>
      {title && <h3 className={chart.title}>{title}</h3>}
      {subtitle && <p className={chart.subtitle}>{subtitle}</p>}
      <div className={chart.bars}>
        {chartData.map((item, index) => {
          const barWidth = item.hasData && maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const displayText = item.hasData ? item.displayValue : '-';
          const textPos = getTextPositioning(item.resource, displayText, barWidth, !item.hasData);
          
          const barClass = isMirrored ? chart.barMirrored : chart.bar;
          const rowClass = isMirrored ? chart.barRowMirrored : chart.barRow;
          const wrapperClass = isMirrored ? chart.barWrapperMirrored : chart.barWrapper;
          
          // Get the display text for resource (possibly truncated)
          const resourceDisplay = textPos.resourceEllipsis.text;
          const resourceTitle = textPos.resourceEllipsis.truncated ? item.resource : undefined;
          
          // Calculate available width for outside labels
          // Use actual container width, bar takes barWidth%, percentage text takes ~40px
          const barPixelWidth = (barWidth / 100) * containerWidth;
          const percentagePixelWidth = textPos.showPercentageInside ? 0 : 40;
          const availableWidthForOutsideLabel = Math.max(100, containerWidth - barPixelWidth - percentagePixelWidth - 20); // 20px for margins
          
          // For mirrored charts, detect if outside text would overflow on the left
          const resourceTextWidth = item.resource.length * 5.5; // Estimate text width
          const percentageTextWidth = displayText.length * 7; // Estimate percentage width
          const leftSideSpaceNeeded = Math.max(
            !textPos.showResourceInside ? resourceTextWidth : 0,
            !textPos.showPercentageInside ? percentageTextWidth : 0
          );
          const wouldOverflowLeft = isMirrored && leftSideSpaceNeeded > (containerWidth - barPixelWidth - 20); // 20px margin
          
          // Override positioning for mirrored bars that would overflow
          const adjustedTextPos = isMirrored && wouldOverflowLeft ? {
            ...textPos,
            // Force text to show on the right side (outside) instead of left
            showResourceOutsideRight: !textPos.showResourceInside,
            showPercentageOutsideRight: !textPos.showPercentageInside,
            showResourceInside: false,
            showPercentageInside: false
          } : textPos;
          
          const handleMouseEnter = (event) => {
            event.currentTarget.style.transform = `scale(${animationScale})`;

            if (item.hasData) {
              // Tooltip with resource name, percentage, and optionally respondent count
              let tooltipText = `${item.resource}\n${displayText}`;
              if (showRespondentsInTooltip && item.count !== undefined) {
                tooltipText += `\n${item.count} respondents`;
              }

              setTooltipContent(tooltipText);

              const screenY = event.clientY;
              const screenX = event.clientX;
              const tooltipWidth = 200;
              const tooltipHeight = 80;

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
            }
          };

          const handleMouseLeave = (event) => {
            event.currentTarget.style.transform = 'scale(1)';
            setShowTooltip(false);
          };

          const handleMouseMove = (event) => {
            if (showTooltip) {
              const screenY = event.clientY;
              const screenX = event.clientX;
              const tooltipWidth = 200;
              const tooltipHeight = 80;

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
              key={index}
              className={`${rowClass} transform-gpu transition-transform duration-200`}
              style={{ backgroundColor: `${color}28` }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
            >
              {isMirrored ? (
                <div className={wrapperClass}>
                  {/* Outside text elements - positioned left of bar (unless overflowing) */}
                  {!adjustedTextPos.showPercentageInside && !adjustedTextPos.showPercentageOutsideRight && (
                    <span className={cn(
                      chart.barPercentageOutsideMirrored,
                      !adjustedTextPos.showResourceInside && 'ml-auto'
                    )}>{displayText}</span>
                  )}
                  {!adjustedTextPos.showResourceInside && !adjustedTextPos.showResourceOutsideRight && (
                    <span 
                      className={cn(
                        chart.barLabelOutsideMirrored,
                        adjustedTextPos.showPercentageInside && 'ml-auto'
                      )}
                      style={{ maxWidth: `${availableWidthForOutsideLabel}px` }}
                    >{item.resource}</span>
                  )}
                  <div 
                    className={cn(
                      barClass,
                      chart.barHover,
                      !adjustedTextPos.showResourceInside && chart.barSmall,
                      !item.hasData && chart.barNoData,
                      // Only add ml-auto if both text elements are inside the bar
                      (!adjustedTextPos.showResourceInside || !adjustedTextPos.showPercentageInside) && '!ml-0'
                    )}
                    style={{ 
                      width: item.hasData ? `${Math.max(barWidth, 1)}%` : '6px',
                      background: color,
                      boxShadow: item.hasData ? 'var(--nr-shadow)' : 'none'
                    }}
                  >
                    {adjustedTextPos.showPercentageInside && (
                      <span className={adjustedTextPos.showResourceInside ? chart.barPercentageMirrored : chart.barPercentageMirroredAlone}>
                        {displayText}
                      </span>
                    )}
                    {adjustedTextPos.showResourceInside && (
                      <span 
                        className={chart.barLabelMirrored}
                        title={resourceTitle}
                      >
                        {resourceDisplay}
                      </span>
                    )}
                  </div>
                  {/* Outside text elements - positioned right of bar (overflow fallback) */}
                  {adjustedTextPos.showResourceOutsideRight && (
                    <span 
                      className={chart.barLabelOutside}
                      style={{ maxWidth: `${availableWidthForOutsideLabel}px` }}
                    >{item.resource}</span>
                  )}
                  {adjustedTextPos.showPercentageOutsideRight && (
                    <span className={chart.barPercentageOutside}>{displayText}</span>
                  )}
                </div>
              ) : (
                <div className={wrapperClass}>
                  <div 
                    className={cn(
                      barClass,
                      chart.barHover,
                      !textPos.showResourceInside && chart.barSmall,
                      !item.hasData && chart.barNoData,
                      // Use justify-end when only percentage is inside the bar
                      textPos.showPercentageInside && !textPos.showResourceInside && "!justify-end"
                    )}
                    style={{ 
                      width: item.hasData ? `${Math.max(barWidth, 1)}%` : '6px',
                      background: color,
                      boxShadow: item.hasData ? 'var(--nr-shadow)' : 'none'
                    }}
                  >
                    {textPos.showResourceInside && (
                      <span 
                        className={chart.barLabel}
                        title={resourceTitle}
                      >
                        {resourceDisplay}
                      </span>
                    )}
                    {textPos.showPercentageInside && (
                      <span className={textPos.showResourceInside ? chart.barPercentage : chart.barPercentageAlone}>
                        {displayText}
                      </span>
                    )}
                  </div>
                  {!textPos.showResourceInside && (
                    <span 
                      className={chart.barLabelOutside}
                      style={{ maxWidth: `${availableWidthForOutsideLabel}px` }}
                    >{item.resource}</span>
                  )}
                  {!textPos.showPercentageInside && (
                    <span className={chart.barPercentageOutside}>{displayText}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none text-sm whitespace-pre-line border border-gray-600"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            maxWidth: '300px'
          }}
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

export default BarChart;