import { useState, useEffect, useCallback, useRef } from 'react';
import { card, table, cn } from '../styles/classNames';
import { corePalette } from '../utils/colorPalette';
import BarChart from './BarChart';
import ChannelRatingsGrid from './ChannelRatingsGrid';
import ChartHeader from './ChartHeader';
import RespondentIcon from './RespondentIcon';

/**
 * Learning Channels Section Component
 * Displays the "What helps you learn/troubleshoot Node-RED?" section
 * with data table and opportunity charts.
 */
const LearningChannelsSection = ({ filters = {}, wasmService }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sectionCount, setSectionCount] = useState(null);
  const [baselineOrders, setBaselineOrders] = useState({});
  const [isSingleColumn, setIsSingleColumn] = useState(false);
  const initialLoadDone = useRef(false);

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsSingleColumn(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch data on mount and when filters change
  useEffect(() => {
    const fetchData = async () => {
      if (!wasmService) return;

      try {
        // Only show loading spinner on initial load, not filter changes
        if (!initialLoadDone.current) {
          setLoading(true);
        }

        const [data, counts] = await Promise.all([
          wasmService.getDashboardData(filters, 'all'),
          wasmService.getSectionCounts(filters),
        ]);

        // Store baseline orders on initial load (no filters)
        if (!initialLoadDone.current && data?.data) {
          const orders = {};

          // Quality Ranking baseline: sorted by Quality % descending
          orders['qualityRanking'] = [...data.data]
            .sort((a, b) =>
              parseInt(b['Quality %']?.replace('%', '') || 0) -
              parseInt(a['Quality %']?.replace('%', '') || 0)
            )
            .map(item => item.Resource);

          // Reach Gap Opportunities baseline: sorted by Reach Gap Opp descending
          orders['reachGapOpp'] = [...data.data]
            .sort((a, b) =>
              parseInt(b['Reach Gap Opp']?.replace('%', '') || 0) -
              parseInt(a['Reach Gap Opp']?.replace('%', '') || 0)
            )
            .map(item => item.Resource);

          // Reach Ranking baseline: sorted by Reach % descending
          orders['reachRanking'] = [...data.data]
            .sort((a, b) =>
              parseInt(b['Reach %']?.replace('%', '') || 0) -
              parseInt(a['Reach %']?.replace('%', '') || 0)
            )
            .map(item => item.Resource);

          setBaselineOrders(orders);
        }

        setDashboardData(data);
        setSectionCount(counts?.section1 || null);
        initialLoadDone.current = true;
      } catch (err) {
        console.error('Error fetching learning channels data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, wasmService]);

  // Format cell values for the table
  const formatCellValue = useCallback((value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'number' && !Number.isInteger(value)) {
      return value.toFixed(2);
    }
    return value;
  }, []);

  // Loading skeleton
  if (loading && !dashboardData) {
    return (
      <div className={card.base}>
        <div className={card.iconSection}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="#d1d5db" fill="white" />
          </svg>
        </div>
        <div className="flex-1 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">Error loading data: {error}</p>
      </div>
    );
  }

  const hasData = dashboardData?.data && dashboardData.data.length > 0;
  const columns = hasData
    ? Object.keys(dashboardData.data[0]).filter(col => col !== 'Segment')
    : [];

  // Sort data by baseline orders for comparison mode consistency
  const sortByBaseline = (data, orderKey) => {
    if (!baselineOrders[orderKey]) return data;
    return [...data].sort((a, b) => {
      const orderA = baselineOrders[orderKey].indexOf(a.Resource);
      const orderB = baselineOrders[orderKey].indexOf(b.Resource);
      return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
    });
  };

  return (
    <div className={card.base}>
      <div className={card.iconSection}>
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <ChartHeader title="What helps you learn/troubleshoot Node-RED?" />
                </div>
                {/* Respondent Count Badge */}
                {sectionCount && (
                  <div className="flex items-center gap-1 text-sm flex-shrink-0">
                    <span className="text-gray-600 font-bold">
                      {sectionCount.filtered}
                    </span>
                    <span className="text-gray-500 hidden sm:inline">
                      respondents
                    </span>
                    <RespondentIcon className="w-4 h-4 text-gray-500 sm:hidden" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4">
          <div className="max-w-3xl lg:max-w-5xl">
            <div className="text-sm text-nodered-gray-600 font-light leading-relaxed max-w-2xl lg:max-w-4xl space-y-2">
              <p className="font-medium">
                <strong>Key Metrics:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Reach:</strong> Percentage of survey respondents who selected the channel as helpful
                </li>
                <li>
                  <strong>Quality:</strong> Average helpfulness grade given by those who use the channel
                </li>
              </ul>
              <p className="font-medium">
                <strong>Opportunity Metrics:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Quality Gap Opportunity:</strong> Where quality improvements would create the most value due to existing reach
                </li>
                <li>
                  <strong>Reach Gap Opportunity:</strong> Where expanding reach would create the most value due to existing quality
                </li>
              </ul>
            </div>
          </div>

          {/* Data Table */}
          <div className={cn(card.base, 'my-6')}>
            <div className={card.iconSection}>
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#d1d5db"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" fill="white" stroke="#d1d5db" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="9" x2="9" y2="21" />
                <line x1="15" y1="9" x2="15" y2="21" />
              </svg>
            </div>
            <div className={card.content}>
              <div className={cn(card.body, 'bg-white p-0 overflow-hidden')}>
                {hasData ? (
                  <div className={table.wrapper}>
                    <table className={table.base}>
                      <thead className="bg-[#f3f3f3] border-b border-gray-300">
                        <tr>
                          {columns.map((col, index) => {
                            let headerText = col
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, c => c.toUpperCase());

                            if (index === 0) {
                              headerText = 'Channel';
                            } else if (headerText === 'Reach %') {
                              headerText = 'Reach';
                            } else if (headerText === 'Quality %') {
                              headerText = 'Quality';
                            }

                            return (
                              <th
                                key={col}
                                className={cn(
                                  index === 0
                                    ? table.headerCellFirst
                                    : table.headerCellNumeric
                                )}
                              >
                                {headerText}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className={table.body}>
                        {dashboardData.data.map((row, rowIndex) => (
                          <tr key={rowIndex} className={table.row}>
                            {columns.map((col, colIndex) => (
                              <td
                                key={col}
                                className={cn(
                                  colIndex === 0 ? table.cellFirst : table.cell
                                )}
                              >
                                {formatCellValue(row[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>No data to display</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Charts - always single column (comparison mode handles side-by-side) */}
          {hasData && (
            <div className="grid grid-cols-1 gap-6 my-6">
              {/* Left Column - Quality Charts */}
              <div className="space-y-6">
                {/* Quality Gap Chart */}
                <div className={card.base}>
                  <div className={card.iconSection}>
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="white"
                      stroke="#d1d5db"
                      strokeWidth="1.5"
                    >
                      <path d="M3 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
                      <path d="M15 9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" />
                      <path d="M9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" />
                    </svg>
                  </div>
                  <div className={card.content}>
                    <div className={cn(card.body, 'bg-white')}>
                      <h3 className={cn(card.title, 'hidden')}>Quality Gap Opportunities</h3>
                      <div className="min-h-[300px]">
                        <BarChart
                          data={dashboardData.data}
                          title="Quality Gap Opportunities"
                          subtitle="Where would a quality increase create the most value because of already existing reach"
                          valueColumn="Quality Gap Opp"
                          color={corePalette.amber}
                          isMirrored={false}
                          animationScale={!isSingleColumn ? 1.02 : 1.01}
                          showRespondentsInTooltip={false}
                          filters={filters}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quality Ranking Chart */}
                <div className={card.base}>
                  <div className={card.iconSection}>
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="white"
                      stroke="#d1d5db"
                      strokeWidth="1.5"
                    >
                      <path d="M3 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
                      <path d="M15 9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" />
                      <path d="M9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" />
                    </svg>
                  </div>
                  <div className={card.content}>
                    <div className={cn(card.body, 'bg-white')}>
                      <h3 className={cn(card.title, 'hidden')}>Quality Ranking</h3>
                      <div className="min-h-[300px]">
                        <BarChart
                          data={sortByBaseline(dashboardData.data, 'qualityRanking')}
                          title="Quality Ranking"
                          subtitle="Ratt of channel depicted in percentage"
                          valueColumn="Quality %"
                          color={corePalette.terracotta}
                          isMirrored={false}
                          animationScale={!isSingleColumn ? 1.02 : 1.01}
                          showRespondentsInTooltip={false}
                          filters={filters}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Reach Charts (Mirrored) */}
              <div className="space-y-6">
                {/* Reach Gap Chart */}
                <div className={card.base}>
                  <div className={card.iconSection}>
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="white"
                      stroke="#d1d5db"
                      strokeWidth="1.5"
                    >
                      <path d="M3 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
                      <path d="M15 9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" />
                      <path d="M9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" />
                    </svg>
                  </div>
                  <div className={card.content}>
                    <div className={cn(card.body, 'bg-white')}>
                      <h3 className={cn(card.title, 'hidden')}>Reach Gap Opportunities</h3>
                      <div className="min-h-[300px]">
                        <BarChart
                          data={sortByBaseline(dashboardData.data, 'reachGapOpp')}
                          title="Reach Gap Opportunities"
                          subtitle="Where would a reach increase create the most value because of already existing quality"
                          valueColumn="Reach Gap Opp"
                          color={corePalette.bronze}
                          isMirrored={isSingleColumn ? false : true}
                          animationScale={!isSingleColumn ? 1.02 : 1.01}
                          showRespondentsInTooltip={false}
                          filters={filters}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reach Ranking Chart */}
                <div className={card.base}>
                  <div className={card.iconSection}>
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="white"
                      stroke="#d1d5db"
                      strokeWidth="1.5"
                    >
                      <path d="M3 13a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
                      <path d="M15 9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" />
                      <path d="M9 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z" />
                    </svg>
                  </div>
                  <div className={card.content}>
                    <div className={cn(card.body, 'bg-white')}>
                      <h3 className={cn(card.title, 'hidden')}>Reach Ranking</h3>
                      <div className="min-h-[300px]">
                        <BarChart
                          data={sortByBaseline(dashboardData.data, 'reachRanking')}
                          title="Reach Ranking"
                          subtitle="Percentage of people that have stated that the channel is helpful to them"
                          valueColumn="Reach %"
                          color={corePalette.slate}
                          isMirrored={isSingleColumn ? false : true}
                          animationScale={!isSingleColumn ? 1.02 : 1.01}
                          showRespondentsInTooltip={false}
                          filters={filters}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Channel Ratings Grid */}
          <div className="my-6">
            <ChannelRatingsGrid
              filters={filters}
              wasmService={wasmService}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningChannelsSection;
