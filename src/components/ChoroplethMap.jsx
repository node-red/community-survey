import React, { useEffect, useState, useRef, useMemo } from 'react';
import { geoPath, geoMercator } from 'd3-geo';
import { feature } from 'topojson-client';
import RespondentIcon from './RespondentIcon';
import { getTooltipPosition } from '../utils/tooltip-utils';

const ChoroplethMap = ({ questionId, questionTitle, filters, _color, wasmService }) => {
  if (import.meta.env.DEV) console.log('=== ChoroplethMap RENDER ===', { questionId, hasWasmService: !!wasmService });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [respondentInfo, setRespondentInfo] = useState(null);
  const [tooltipContent, setTooltipContent] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hideTooltipTimeout, setHideTooltipTimeout] = useState(null);
  const [geographies, setGeographies] = useState([]);
  const svgRef = useRef(null);

  // Fetch country boundaries TopoJSON and convert to GeoJSON
  useEffect(() => {
    fetch('./countries-110m.json')
      .then(response => response.json())
      .then(topology => {
        // Convert TopoJSON to GeoJSON features
        const geojson = feature(topology, topology.objects.countries);
        setGeographies(geojson.features || []);
      })
      .catch(err => {
        console.error('Error loading TopoJSON:', err);
        setError('Failed to load map data');
      });
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) console.log('=== ChoroplethMap useEffect TRIGGERED ===', { questionId, hasFilters: !!filters, hasWasmService: !!wasmService });
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!wasmService) {
          if (import.meta.env.DEV) console.log('=== NO WASM SERVICE ===');
          return;
        }

        if (import.meta.env.DEV) console.log('=== FETCHING CHOROPLETH DATA ===', questionId);
        const result = await wasmService.getQuantitativeData(questionId, filters);
        if (import.meta.env.DEV) console.log('=== CHOROPLETH DATA RECEIVED ===', result);
        setData(result?.data || []);
        setRespondentInfo({
          filtered: result?.filtered_respondents || 0,
          total: result?.total_respondents || 0
        });
      } catch (err) {
        console.error('Error fetching choropleth data:', err);
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [questionId, filters, wasmService]);

  // Memoized calculations (must be before early returns)
  const totalResponses = respondentInfo?.filtered || 0;
  const maxCount = data.length > 0 ? Math.max(...data.map(item => item.count)) : 0;

  const dataMap = useMemo(() => {
    const map = {};
    data.forEach(item => {
      // Normalize country codes to 3-digit format to match TopoJSON IDs
      // Database returns codes like "36", TopoJSON uses "036"
      const paddedCode = String(item.answer_text).padStart(3, '0');
      map[paddedCode] = item;
    });
    if (import.meta.env.DEV) {
      console.log('ChoroplethMap dataMap:', map);
      console.log('ChoroplethMap data:', data);
    }
    return map;
  }, [data]);

  const width = 1000;
  const height = 700;

  const projection = useMemo(
    () => geoMercator()
      .scale(130)
      .center([0, 20])
      .translate([width / 2, height / 2]),
    [width, height]
  );

  const pathGenerator = useMemo(
    () => geoPath().projection(projection),
    [projection]
  );

  // Only show skeleton during initial load (no data yet)
  // Once we have data, keep showing it while loading new filtered data
  if (loading && data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex">
        <div className="flex items-center justify-center w-8 min-w-[32px] text-sm text-gray-600 bg-gray-100 border-r border-gray-300">
          <svg
            width="20"
            height="20"
            viewBox="0 0 16 16"
            fill="white"
            stroke="#d1d5db"
            strokeWidth="0.5"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-1.83a7 7 0 0 0 .656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146a7 7 0 0 0 .656-2.5h-1.83a13.7 13.7 0 0 1-.312 2.5zm.82-3.5h1.826a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/>
          </svg>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <h3 className="text-lg font-semibold text-nodered-gray-700">{questionTitle}</h3>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-300 flex">
        <div className="flex items-center justify-center w-8 min-w-[32px] text-sm text-gray-600 bg-gray-100 border-r border-gray-300">
          <svg
            width="20"
            height="20"
            viewBox="0 0 16 16"
            fill="white"
            stroke="#d1d5db"
            strokeWidth="0.5"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-1.83a7 7 0 0 0 .656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146a7 7 0 0 0 .656-2.5h-1.83a13.7 13.7 0 0 1-.312 2.5zm.82-3.5h1.826a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/>
          </svg>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <h3 className="text-lg font-semibold text-nodered-gray-700">{questionTitle}</h3>
          </div>
          <div className="p-6">
            <div className="text-red-500">Error loading data: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!Array.isArray(data)) {
    if (import.meta.env.DEV) console.warn('ChoroplethMap: data is not an array:', data);
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Country Distribution</h2>
        <div className="text-center py-8">
          <div className="text-gray-500">No data available</div>
        </div>
      </div>
    );
  }

  // Get color for country based on response count
  const getCountryColor = (countryCode) => {
    const countryData = dataMap[countryCode];
    if (!countryData || countryData.count === 0) {
      return '#f3f4f6';
    }

    const colorScale = [
      '#f4e4bc', '#e8d5a6', '#dcc690', '#d0b77a',
      '#c4a747', '#b8994e', '#ac8a38'
    ];

    const percentage = countryData.count / maxCount;
    let colorIndex;

    if (percentage <= 0.05) colorIndex = 0;
    else if (percentage <= 0.20) colorIndex = 1;
    else if (percentage <= 0.40) colorIndex = 2;
    else if (percentage <= 0.60) colorIndex = 3;
    else if (percentage <= 0.80) colorIndex = 4;
    else if (percentage <= 0.95) colorIndex = 5;
    else colorIndex = 6;

    return colorScale[colorIndex];
  };

  // Handle mouse events for tooltip
  const handleMouseEnter = (geo, event) => {
    if (hideTooltipTimeout) {
      clearTimeout(hideTooltipTimeout);
      setHideTooltipTimeout(null);
    }

    // geo.id is the ISO 3166-1 numeric country code from TopoJSON (3-digit string)
    const countryCode = String(geo.id);
    const countryData = dataMap[countryCode];
    const countryName = geo.properties.name;

    if (countryData) {
      const percentage = (countryData.count / totalResponses) * 100;
      const displayPercentage = countryData.count === 0 ? '-' : (Math.round(percentage) === 0 ? '<1%' : `${Math.round(percentage)}%`);
      setTooltipContent(
        `${countryName}\n${countryData.count} respondents (${displayPercentage})`
      );
    } else {
      setTooltipContent(`${countryName}\nNo responses`);
    }

    setTooltipPosition(getTooltipPosition(event, 200, 80));
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    // No automatic hide - tooltip stays visible when moving between countries
    // Only hide when mouse leaves the entire SVG container
  };

  const handleMouseMove = (event) => {
    if (showTooltip) {
      setTooltipPosition(getTooltipPosition(event, 200, 80));
    }
  };

  return (
    <div 
      className="bg-white rounded-[5px] shadow-sm border border-gray-300 flex overflow-hidden"
      data-testid="choropleth-chart"
      data-test-choropleth-data={JSON.stringify({
        data: data,
        filtered_respondents: respondentInfo?.filtered || 0,
        total_respondents: respondentInfo?.total || 0
      })}
    >
      {/* Left Icon Section */}
      <div className="flex items-center justify-center w-8 min-w-[32px] text-sm text-gray-600 bg-gray-100 border-r border-gray-300">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#d1d5db"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" fill="white"/>
          <path d="M2 12h20"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
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
                  <h3 className="text-lg font-semibold text-nodered-gray-700">
                    {questionTitle}
                  </h3>
                </div>
                {/* Total Respondents Badge */}
                <div className="flex items-center gap-1 text-sm flex-shrink-0">
                  <span className="text-gray-600 font-bold">
                    {totalResponses}
                  </span>
                  <span className="text-gray-500 hidden sm:inline">
                    {' '}respondents
                  </span>
                  <RespondentIcon />
                  <span className="text-gray-500">
                    {' '}from <span className="font-bold text-gray-600">{data.length}</span> countries
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* World Map */}
        <div className="p-4 relative overflow-hidden">
          <div className="bg-white rounded-lg">
            <svg
              ref={svgRef}
              data-testid="choropleth-map-svg"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="xMidYMid meet"
              onMouseLeave={() => setShowTooltip(false)}
              style={{
                width: '100%',
                height: 'auto'
              }}
            >
              {geographies.map((geo, i) => {
                // geo.id is the ISO 3166-1 numeric country code from TopoJSON
                // It's already a 3-digit string (e.g., "036" for Australia)
                const countryCode = String(geo.id);
                const countryData = dataMap[countryCode];
                const pathData = pathGenerator(geo);

                // Debug first few countries
                if (import.meta.env.DEV && i < 3) {
                  console.log(`Country ${i}: geo.id=${geo.id}, countryCode=${countryCode}, hasData=${!!countryData}, name=${geo.properties?.name}`);
                }

                return (
                  <path
                    key={`country-${i}`}
                    d={pathData || ''}
                    fill={getCountryColor(countryCode)}
                    stroke="#EAEAEC"
                    strokeWidth={0.5}
                    style={{
                      cursor: countryData ? 'pointer' : 'default',
                      transition: 'fill 0.2s'
                    }}
                    onMouseEnter={(e) => handleMouseEnter(geo, e)}
                    onMouseLeave={handleMouseLeave}
                    onMouseMove={handleMouseMove}
                    className="hover:opacity-80"
                  />
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-600 mt-8 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f3f4f6' }}></div>
              <span>No data</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#e8d5a6' }}></div>
              <span>Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#c4a747' }}></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ac8a38' }}></div>
              <span>High</span>
            </div>
          </div>

          {/* Tooltip */}
          {showTooltip && (
            <div
              className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none text-sm whitespace-pre-line border border-gray-600"
              data-testid="choropleth-tooltip"
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
      </div>
    </div>
  );
};

export default ChoroplethMap;
