import { useState, useEffect, useRef, useCallback } from "react";
import wasmService from "./services/duckdb-wasm";
import { SEGMENT_PRESETS, getAllPresets } from "./utils/filter-definitions.js";
import ErrorBoundary from "./components/ErrorBoundary";
import { FilterProvider, ComparisonProvider } from "./contexts/FilterContext";
import UnifiedChartWrapper from "./components/UnifiedChartWrapper";
import {
  QUESTION_TO_FILTER,
  createEmptyFilters,
  countActiveFilters,
} from "./utils/filter-utils.js";
import { useURLFilters } from "./utils/useURLFilters.js";
import { getChartColor } from "./utils/colorPalette";
import BarChart from "./components/BarChart";
import QualitativeAnalysis from "./components/QualitativeAnalysis";
import QuantitativeChart from "./components/QuantitativeChart";
import ChoroplethMap from "./components/ChoroplethMap";
import VerticalBarChart from "./components/VerticalBarChart";
import RatingsChart from "./components/RatingsChart";
import HorizontalRatingsChart from "./components/HorizontalRatingsChart";
import MatrixChart from "./components/MatrixChart";
import ChannelRatingsGrid from "./components/ChannelRatingsGrid";
import LearningChannelsSection from "./components/LearningChannelsSection";
import DesignChangesRatingsGrid from "./components/DesignChangesRatingsGrid";
import QualityComparisonRatingsGrid from "./components/QualityComparisonRatingsGrid";
import UnderstandingRatingsGrid from "./components/UnderstandingRatingsGrid";
import DeviceSatisfactionGrid from "./components/DeviceSatisfactionGrid";
import TableOfContents from "./components/TableOfContents";
import RespondentIcon from "./components/RespondentIcon";
import ChartHeader from "./components/ChartHeader";
import {
  header,
  sidebar,
  mainContent,
  card,
  error,
  cn,
} from "./styles/classNames";

function App() {
  const [queryResult, setQueryResult] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [showQuery] = useState(false);
  const [_segments, setSegments] = useState([]);
  const [selectedSegment] = useState("all");
  const [filterOptions, setFilterOptions] = useState({});
  const [filters, setFilters] = useState(createEmptyFilters());
  const [activePreset, setActivePreset] = useState(null);

  // Comparison mode state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [filtersA, setFiltersA] = useState(createEmptyFilters());
  const [filtersB, setFiltersB] = useState(createEmptyFilters());
  const [activeColumn, setActiveColumn] = useState('A');
  const [hasEverEnabledComparison, setHasEverEnabledComparison] = useState(false);

  // Callback to restore filters from URL on page load
  const handleFiltersRestoredFromURL = useCallback(
    async (urlFilters) => {
      if (import.meta.env.DEV)
        console.log("🔗 Restoring filters from URL:", urlFilters);

      setFilters(urlFilters);
      setFilterLoading(true);

      try {
        // Wait for wasmService to be ready, then fetch data with restored filters
        await wasmService.initialize();
        const [userCount, dashboardData, sectionCounts] = await Promise.all([
          wasmService.getFilteredCount(urlFilters),
          wasmService.getDashboardData(urlFilters, selectedSegment),
          wasmService.getSectionCounts(urlFilters),
        ]);

        setFilteredUserCount(userCount);
        setQueryResult(dashboardData);
        setSectionCounts(sectionCounts);
      } catch (error) {
        console.error("Error restoring filters from URL:", error);
      } finally {
        setFilterLoading(false);
      }
    },
    [selectedSegment],
  );

  // Hook for bidirectional URL <-> filter synchronization
  const { updateURLWithFilters } = useURLFilters(
    filters,
    filterOptions,
    handleFiltersRestoredFromURL,
  );
  const [filteredUserCount, setFilteredUserCount] = useState(0);
  const [baselineOrders, setBaselineOrders] = useState({});
  const [_sectionCounts, setSectionCounts] = useState({
    section1: { filtered: 466, total: 466 },
    section2: { filtered: 432, total: 432 },
  });
  const [filterSearchTerm, setFilterSearchTerm] = useState("");
  const [isSingleColumn, setIsSingleColumn] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const sidebarWidth = 180; // Static width, no longer resizable
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false,
  );
  const [showSidebarToggle, setShowSidebarToggle] = useState(false);
  const [showSidebarTooltip, setShowSidebarTooltip] = useState(false);
  const [sidebarItemTooltip, setSidebarItemTooltip] = useState({
    show: false,
    content: "",
    x: 0,
    y: 0,
  });
  const [tocItemTooltip, setTocItemTooltip] = useState({
    show: false,
    content: "",
    x: 0,
    y: 0,
  });
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);
  const [focusedChartId, setFocusedChartId] = useState(null);
  const [tocWidth, setTocWidth] = useState(240);
  const [tocCollapsed, setTocCollapsed] = useState(true);
  const [heroAnimated, setHeroAnimated] = useState(false);
  const [isTocResizing, setIsTocResizing] = useState(false);
  const footerSectionRef = useRef(null);
  const mainContentRef = useRef(null);
  const dashboardRef = useRef(null);
  const sidebarTooltipTimeoutRef = useRef(null);

  // Toggle visibility of hero, introduction, and footer sections
  const [showHeroSection] = useState(true);
  const [showIntroductionSection] = useState(true);
  const [showFooterSection] = useState(true);

  // Smooth scroll to dashboard section
  const scrollToDashboard = () => {
    dashboardRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Smooth scroll to introduction section
  const scrollToIntroduction = () => {
    document
      .getElementById("introduction-section")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  // Trigger hero animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setHeroAnimated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Effect to handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      const isNarrow = window.innerWidth < 1024; // lg breakpoint
      const isMobileViewport = window.innerWidth < 768; // Mobile breakpoint
      setIsSingleColumn(isNarrow);
      setIsMobile(isMobileViewport);

      // Auto-collapse both sidebars on any resize while in mobile viewport
      if (isMobileViewport) {
        setSidebarCollapsed(true);
        setTocCollapsed(true);
      }
    };

    handleResize(); // Set initial state
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []); // Remove sidebarCollapsed dependency

  // Cleanup sidebar tooltip timeout on unmount
  useEffect(() => {
    return () => {
      if (sidebarTooltipTimeoutRef.current) {
        clearTimeout(sidebarTooltipTimeoutRef.current);
      }
    };
  }, []);

  // Auto-collapse sidebars on initial narrow viewport
  useEffect(() => {
    const isMobileViewport = window.innerWidth < 768;
    if (isMobileViewport) {
      setSidebarCollapsed(true);
      setTocCollapsed(true);
    }
  }, []); // Run only once on mount

  // Total respondent count will be fetched via WASM service in the main initialization
  // No separate API call needed

  // Left sidebar resize removed - now static 180px width

  useEffect(() => {
    // Initialize WASM service
    const initializeWasm = async () => {
      try {
        if (import.meta.env.DEV) console.log("Initializing DuckDB WASM...");
        await wasmService.initialize();
        if (import.meta.env.DEV) console.log("Connected to WASM service");

        // Define question IDs for baseline ordering
        // Exclude questions with predefined ordinal ordering
        const ordinalQuestions = [
          "ElR6d2",
          "joRz61",
          "P9xr1x",
          "xDqzMk",
          "qGrzbg",
          "ZO7eJB",
          "kG2v5Z",
          "ZO7eO5",
        ];
        const quantitativeQuestionIds = [
          "VPeNQ6",
          "2AWoaM",
          "rO4YaX",
          "476OJ5",
          "ZO7ede",
          "kGozGZ",
          "erJzEk",
          "089kZ6",
          "8LBr6x",
          "Dp8ax5",
          "Ma4BjA",
          "NXjP0j",
        ];
        const qualitativeQuestionIds = [
          "gqlzqJ",
          "476O9O",
          "6KlPdY",
          "ElR6ZN",
          "JlPolX",
          "OX26KK",
          "P9xrbb",
          "RoNAMl",
          "XoaQoz",
          "a4LqQX",
          "joRj6E",
          "oRPZqP",
          "oRPqY1",
          "xDqAMo",
          "xDqzdv",
          "y4Q14d",
        ]; // All Qualitative analysis questions
        const questionsNeedingBaseline = quantitativeQuestionIds.filter(
          (id) => !ordinalQuestions.includes(id),
        );

        if (import.meta.env.DEV)
          console.log(
            "Fetching baseline orders for questions:",
            questionsNeedingBaseline,
            qualitativeQuestionIds,
          );

        // Fetch baseline orders BEFORE setting initialLoading to false
        // This ensures components have baselineOrder available on first render
        const baselineOrdersMap = {};

        // Load initial data AND baseline orders in parallel
        const [dashboardData, filterOpts, segmentsList] = await Promise.all([
          wasmService.getDashboardData(filters, selectedSegment),
          wasmService.getFilterOptions(),
          wasmService.getSegments(),
          // Fetch quantitative baselines
          Promise.all(
            questionsNeedingBaseline.map(async (questionId) => {
              try {
                const result = await wasmService.getQuantitativeData(
                  questionId,
                  null,
                );
                if (result && result.data) {
                  baselineOrdersMap[questionId] = result.data.map(
                    (item) => item.answer_text,
                  );
                  if (import.meta.env.DEV)
                    console.log(
                      `Baseline order for ${questionId}:`,
                      baselineOrdersMap[questionId],
                    );
                }
              } catch (error) {
                console.error(
                  `Failed to fetch baseline for ${questionId}:`,
                  error,
                );
              }
            }),
          ),
          // Fetch qualitative baselines
          Promise.all(
            qualitativeQuestionIds.map(async (questionId) => {
              try {
                const result = await wasmService.getQualitativeData(questionId);
                const themes = result?.themes || result || [];
                if (Array.isArray(themes) && themes.length > 0) {
                  // Sort by percentage descending to get baseline order
                  const sorted = [...themes].sort((a, b) => {
                    const percentA =
                      typeof a.percentage === "string"
                        ? parseFloat(a.percentage.replace("%", ""))
                        : parseFloat(a.percentage) || 0;
                    const percentB =
                      typeof b.percentage === "string"
                        ? parseFloat(b.percentage.replace("%", ""))
                        : parseFloat(b.percentage) || 0;
                    return percentB - percentA;
                  });
                  baselineOrdersMap[questionId] = sorted.map(
                    (item) => item.theme_name,
                  );
                  if (import.meta.env.DEV)
                    console.log(
                      `Baseline order for qualitative ${questionId}:`,
                      baselineOrdersMap[questionId],
                    );
                }
              } catch (error) {
                console.error(
                  `Failed to fetch qualitative baseline for ${questionId}:`,
                  error,
                );
              }
            }),
          ),
        ]);

        // Add baseline orders for dashboard charts (sorted by value descending)
        if (dashboardData?.data) {
          // Quality Ranking baseline: sorted by Quality % descending
          baselineOrdersMap["qualityRanking"] = [...dashboardData.data]
            .sort(
              (a, b) =>
                parseInt(b["Quality %"]?.replace("%", "") || 0) -
                parseInt(a["Quality %"]?.replace("%", "") || 0),
            )
            .map((item) => item.Resource);
          // Reach Gap Opportunities baseline: sorted by Reach Gap Opp descending
          baselineOrdersMap["reachGapOpp"] = [...dashboardData.data]
            .sort(
              (a, b) =>
                parseInt(b["Reach Gap Opp"]?.replace("%", "") || 0) -
                parseInt(a["Reach Gap Opp"]?.replace("%", "") || 0),
            )
            .map((item) => item.Resource);
          // Reach Ranking baseline: sorted by Reach % descending
          baselineOrdersMap["reachRanking"] = [...dashboardData.data]
            .sort(
              (a, b) =>
                parseInt(b["Reach %"]?.replace("%", "") || 0) -
                parseInt(a["Reach %"]?.replace("%", "") || 0),
            )
            .map((item) => item.Resource);
        }

        // Set baseline orders BEFORE initialLoading is set to false
        setBaselineOrders(baselineOrdersMap);

        // Update dashboard data
        if (import.meta.env.DEV)
          console.log("Dashboard update received:", dashboardData);
        setQueryResult(dashboardData);
        setInitialLoading(false);
        setFilterLoading(false);

        // Update segments
        if (import.meta.env.DEV)
          console.log("Segments received:", segmentsList);
        setSegments(segmentsList);

        // Update filter options
        if (import.meta.env.DEV)
          console.log("Filter options received:", filterOpts);
        setFilterOptions(filterOpts);

        // Get initial counts
        const userCount = await wasmService.getFilteredCount(filters);
        setFilteredUserCount(userCount);

        const sectionCounts = await wasmService.getSectionCounts(filters);
        if (import.meta.env.DEV)
          console.log("Section counts received:", sectionCounts);
        setSectionCounts(sectionCounts);

        // Restore scroll position when data is loaded
        if (savedScrollPosition > 0 || focusedChartId) {
          setTimeout(() => {
            // Try to scroll to the focused chart first, fall back to saved position
            if (focusedChartId) {
              scrollToChart(focusedChartId);
              setFocusedChartId(null); // Reset after restoring
            } else {
              window.scrollTo({
                top: savedScrollPosition,
                behavior: "smooth",
              });
            }
            setSavedScrollPosition(0); // Reset after restoring
          }, 200); // Slightly longer timeout to allow chart rendering
        }
      } catch (error) {
        console.error("WASM initialization error:", error);
        setInitialLoading(false);
      }
    };

    initializeWasm();

    // Cleanup on unmount
    return () => {
      // wasmService cleanup if needed
      if (wasmService.close) {
        wasmService.close();
      }
    };

    // This initialization effect should only run once on mount to avoid reloading the entire app.
    // The variables used inside (filters, selectedSegment, focusedChartId, savedScrollPosition)
    // are intentionally not dependencies as they are initial values only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Use segment presets from filter definitions
  const segmentPresets = getAllPresets();
  if (import.meta.env.DEV)
    console.log("Loaded segment presets:", Object.keys(segmentPresets));

  // Smart scroll positioning function
  const getCurrentlyVisibleChart = useCallback(() => {
    const charts = document.querySelectorAll("[data-chart-id]");
    const viewportTop = window.scrollY;
    const viewportBottom = viewportTop + window.innerHeight;
    const viewportCenter = viewportTop + window.innerHeight / 2;

    let closestChart = null;
    let minDistance = Infinity;

    charts.forEach((chart) => {
      const rect = chart.getBoundingClientRect();
      const chartTop = rect.top + window.scrollY;
      const chartBottom = chartTop + rect.height;
      const chartCenter = chartTop + rect.height / 2;

      // Check if chart is in viewport
      if (chartBottom >= viewportTop && chartTop <= viewportBottom) {
        // Calculate distance from viewport center to chart center
        const distance = Math.abs(viewportCenter - chartCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestChart = chart.getAttribute("data-chart-id");
        }
      }
    });

    return closestChart;
  }, []);

  // Handle filter changes with real-time counting and automatic application
  const handleFilterChange = useCallback(
    async (category, value, checked) => {
      if (import.meta.env.DEV)
        console.log("🎯 handleFilterChange called:", {
          category,
          value,
          checked,
          comparisonMode,
          activeColumn,
        });

      // Handle comparison mode separately
      if (comparisonMode) {
        const currentColumnFilters = activeColumn === 'A' ? filtersA : filtersB;
        const setColumnFilters = activeColumn === 'A' ? setFiltersA : setFiltersB;

        // Defensive null checking
        if (!currentColumnFilters[category]) {
          console.warn(`❌ Filter category '${category}' not found in column ${activeColumn} filters`);
          return;
        }

        // Compute new filters for this column
        const newColumnFilters = {
          ...currentColumnFilters,
          [category]: checked
            ? currentColumnFilters[category].includes(value)
              ? currentColumnFilters[category]
              : [...currentColumnFilters[category], value]
            : currentColumnFilters[category].filter((v) => v !== value),
        };

        // Update the column's filters (charts will re-render with new filters)
        setColumnFilters(newColumnFilters);
        return;
      }

      // Normal mode handling below
      if (import.meta.env.DEV)
        console.log("🎯 Filter state keys:", Object.keys(filters));
      if (import.meta.env.DEV)
        console.log("🎯 Attempting to access category:", category);

      // Save current scroll position and focused chart before applying filters
      const scrollPosition = window.scrollY;
      const currentChart = getCurrentlyVisibleChart();
      setSavedScrollPosition(scrollPosition);
      setFocusedChartId(currentChart);

      // Defensive null checking - ensure the category exists in filters
      if (!filters[category]) {
        console.warn(
          `❌ Filter category '${category}' not found in filters:`,
          Object.keys(filters),
        );
        console.warn(
          `❌ This means there's a mismatch between filter keys and filter state`,
        );
        return;
      }

      // Compute new filters synchronously BEFORE calling setState
      const newFilters = {
        ...filters,
        [category]: checked
          ? filters[category].includes(value)
            ? filters[category]
            : [...filters[category], value]
          : filters[category].filter((v) => v !== value),
      };

      if (import.meta.env.DEV)
        console.log(
          "🎯",
          checked ? "Added" : "Removed",
          "filter value:",
          value,
          "to/from category:",
          category,
        );
      if (import.meta.env.DEV)
        console.log("🔍 newFilters computed:", JSON.stringify(newFilters));

      // Update state
      setFilters(newFilters);

      setFilterLoading(true);

      // DEBUG: Log the filters being passed
      if (import.meta.env.DEV)
        console.log(
          "🔍 handleFilterChange calling services with newFilters:",
          JSON.stringify(newFilters),
        );

      try {
        // Update count in real-time and automatically apply filters
        const [userCount, dashboardData, sectionCounts] = await Promise.all([
          wasmService.getFilteredCount(newFilters),
          wasmService.getDashboardData(newFilters, selectedSegment),
          wasmService.getSectionCounts(newFilters),
        ]);

        // DEBUG: Log the results
        if (import.meta.env.DEV)
          console.log("🔍 handleFilterChange received userCount:", userCount);
        if (import.meta.env.DEV)
          console.log(
            "🔍 handleFilterChange received sectionCounts:",
            sectionCounts,
          );

        setFilteredUserCount(userCount);
        setQueryResult(dashboardData);
        setSectionCounts(sectionCounts);
        setFilterLoading(false);

        // Update URL with new filter state
        updateURLWithFilters(newFilters);
      } catch (error) {
        console.error("Filter change error:", error);
        setFilterLoading(false);
      }

      setActivePreset(null); // Clear active preset when manually changing filters
    },
    [
      filters,
      selectedSegment,
      getCurrentlyVisibleChart,
      setSavedScrollPosition,
      setFocusedChartId,
      setFilters,
      setFilterLoading,
      setFilteredUserCount,
      setQueryResult,
      setSectionCounts,
      setActivePreset,
      updateURLWithFilters,
      comparisonMode,
      activeColumn,
      filtersA,
      filtersB,
    ],
  );

  // Clear all filters
  const clearFilters = async () => {
    // Save current scroll position and focused chart before applying filters
    const scrollPosition = window.scrollY;
    const currentChart = getCurrentlyVisibleChart();
    setSavedScrollPosition(scrollPosition);
    setFocusedChartId(currentChart);

    const emptyFilters = createEmptyFilters();

    setFilters(emptyFilters);
    setActivePreset(null);
    setFilterLoading(true);

    try {
      // Update count in real-time and apply cleared filters
      const [userCount, dashboardData, sectionCounts] = await Promise.all([
        wasmService.getFilteredCount(emptyFilters),
        wasmService.getDashboardData(emptyFilters, selectedSegment),
        wasmService.getSectionCounts(emptyFilters),
      ]);

      setFilteredUserCount(userCount);
      setQueryResult(dashboardData);
      setSectionCounts(sectionCounts);
      setFilterLoading(false);

      // Update URL to remove filter params
      updateURLWithFilters(emptyFilters);
    } catch (error) {
      console.error("Clear filters error:", error);
      setFilterLoading(false);
    }
  };

  // Apply preset filters
  const applyPreset = async (presetKey) => {
    // Save current scroll position and focused chart before applying filters
    const scrollPosition = window.scrollY;
    const currentChart = getCurrentlyVisibleChart();
    setSavedScrollPosition(scrollPosition);
    setFocusedChartId(currentChart);

    const preset = segmentPresets[presetKey];
    if (preset) {
      const newFilters = createEmptyFilters();
      // Populate only the filters that exist in the preset
      Object.keys(preset.filters).forEach((key) => {
        if (Object.hasOwn(newFilters, key)) {
          newFilters[key] = preset.filters[key] || [];
        }
      });

      if (import.meta.env.DEV)
        console.log(
          "🎯 Applying preset:",
          presetKey,
          comparisonMode ? `to Column ${activeColumn}` : "to main filters",
          "with filters:",
          JSON.stringify(newFilters, null, 2),
        );

      // In comparison mode, apply to active column; otherwise apply to main filters
      if (comparisonMode) {
        if (activeColumn === 'A') {
          setFiltersA(newFilters);
        } else {
          setFiltersB(newFilters);
        }
        // Don't update URL or global counts in comparison mode
        return;
      }

      setFilters(newFilters);
      setActivePreset(presetKey);
      setFilterLoading(true);

      try {
        // Update count in real-time and apply preset filters
        const [userCount, dashboardData, sectionCounts] = await Promise.all([
          wasmService.getFilteredCount(newFilters),
          wasmService.getDashboardData(newFilters, selectedSegment),
          wasmService.getSectionCounts(newFilters),
        ]);

        setFilteredUserCount(userCount);
        setQueryResult(dashboardData);
        setSectionCounts(sectionCounts);
        setFilterLoading(false);

        // Update URL with preset filter state
        updateURLWithFilters(newFilters);
      } catch (error) {
        console.error("Apply preset error:", error);
        setFilterLoading(false);
      }
    }
  };

  // Count active filters
  const getActiveFilterCount = useCallback(() => {
    return countActiveFilters(filters);
  }, [filters]);

  // Toggle comparison mode
  const toggleComparisonMode = useCallback(() => {
    if (!comparisonMode) {
      // Entering comparison mode - copy current filters to column A
      setFiltersA(filters);
      setFiltersB(createEmptyFilters());
      setActiveColumn('A');
      setComparisonMode(true);
      setHasEverEnabledComparison(true); // Triggers Column B to mount
    } else {
      // Exiting comparison mode - keep column A filters as the active filters
      setFilters(filtersA);
      setComparisonMode(false);
      // Keep hasEverEnabledComparison true - Column B stays mounted for fast re-toggle
    }
  }, [comparisonMode, filters, filtersA]);

  // Get current filters based on comparison mode and active column
  const getCurrentFilters = useCallback(() => {
    if (!comparisonMode) return filters;
    return activeColumn === 'A' ? filtersA : filtersB;
  }, [comparisonMode, activeColumn, filters, filtersA, filtersB]);

  // Set current filters based on comparison mode and active column (reserved for future use)
  const _setCurrentFilters = useCallback((newFilters) => {
    if (!comparisonMode) {
      setFilters(newFilters);
    } else if (activeColumn === 'A') {
      setFiltersA(newFilters);
    } else {
      setFiltersB(newFilters);
    }
  }, [comparisonMode, activeColumn]);

  /**
   * Helper function to render a chart with comparison mode support.
   * In normal mode, renders the chart with current filters.
   * In comparison mode, renders the chart twice side-by-side with filtersA and filtersB.
   */
  const renderChart = useCallback((ChartComponent, chartProps) => {
    // Extract filters from chartProps since UnifiedChartWrapper handles them
    const { filters: _, ...restProps } = chartProps;
    void _; // Suppress unused variable warning

    return (
      <UnifiedChartWrapper
        ChartComponent={ChartComponent}
        chartProps={restProps}
        comparisonMode={comparisonMode}
        hasEverEnabledComparison={hasEverEnabledComparison}
        filtersA={comparisonMode ? filtersA : filters}
        filtersB={filtersB}
      />
    );
  }, [comparisonMode, hasEverEnabledComparison, filters, filtersA, filtersB]);

  // Sidebar item tooltip handlers
  const handleSidebarItemMouseEnter = (event, text) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipX = sidebarWidth + 10; // Position 10px to the right of sidebar
    const tooltipHeight = 40; // Approximate tooltip height
    const tooltipY = rect.top - tooltipHeight / 4; // Move up by 1/4 of tooltip height

    setSidebarItemTooltip({
      show: true,
      content: text,
      x: tooltipX,
      y: tooltipY,
    });
  };

  const handleSidebarItemMouseLeave = () => {
    setSidebarItemTooltip({ show: false, content: "", x: 0, y: 0 });
  };

  // ToC item tooltip handlers
  const tocTooltipTimeoutRef = useRef(null);

  const handleTocItemMouseEnter = (event, text) => {
    // Clear any existing timeout
    if (tocTooltipTimeoutRef.current) {
      clearTimeout(tocTooltipTimeoutRef.current);
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipRight = window.innerWidth - rect.right + 10; // Distance from right edge of viewport
    const tooltipY = rect.top - 8; // Position above the item with small gap

    setTocItemTooltip({
      show: true,
      content: text,
      x: tooltipRight, // Now storing right offset instead of left
      y: tooltipY,
    });

    // Auto-dismiss after 1 second
    tocTooltipTimeoutRef.current = setTimeout(() => {
      setTocItemTooltip({ show: false, content: "", x: 0, y: 0 });
    }, 1000);
  };

  const handleTocItemMouseLeave = () => {
    if (tocTooltipTimeoutRef.current) {
      clearTimeout(tocTooltipTimeoutRef.current);
    }
    setTocItemTooltip({ show: false, content: "", x: 0, y: 0 });
  };

  // Helper function to categorize filters by Node-RED node types
  const getCategoryForFilter = (questionId, _categoryName) => {
    // Input data filters (blue) - basic demographic and usage data
    if (["ElR6d2", "joRz61", "2AWoaM"].includes(questionId))
      return "input-data";

    // Processing filters (orange) - role, influence, and technical processing
    if (["VPeNQ6", "P9xr1x", "xDqzMk"].includes(questionId))
      return "processing";

    // Connection/environment filters (light blue) - deployment and technical setup
    if (["kG2v5Z", "ZO7eJB", "ZO7eO5", "476OJ5"].includes(questionId))
      return "connection";

    return "input-data"; // default
  };

  // Filter the filter options based on search term
  const getFilteredOptions = () => {
    if (import.meta.env.DEV) {
      console.log("getFilteredOptions called, filterOptions:", filterOptions);
      console.log("filterOptions keys:", Object.keys(filterOptions));
    }

    // Defensive check: ensure filterOptions is not empty
    if (
      !filterOptions ||
      typeof filterOptions !== "object" ||
      Object.keys(filterOptions).length === 0
    ) {
      if (import.meta.env.DEV)
        console.warn("⚠️ filterOptions is empty or invalid:", filterOptions);
      return [];
    }

    if (!filterSearchTerm.trim()) {
      const entries = Object.entries(filterOptions).map(
        ([filterKey, category]) => [
          filterKey,
          {
            ...category,
            filteredOptions: Array.isArray(category.options)
              ? category.options
              : [],
          },
        ],
      );

      // Ensure continent filter appears first
      const result = entries.sort((a, b) => {
        if (a[0] === "continent") return -1;
        if (b[0] === "continent") return 1;
        return 0;
      });

      if (import.meta.env.DEV)
        console.log("Returning", result.length, "filter categories");
      return result;
    }

    const searchLower = filterSearchTerm.toLowerCase();
    const filteredEntries = [];

    Object.entries(filterOptions).forEach(([filterKey, category]) => {
      // Check if category name matches
      const categoryMatches = category.name.toLowerCase().includes(searchLower);

      // Filter options that match
      const categoryOptions = Array.isArray(category.options)
        ? category.options
        : [];
      const matchingOptions = categoryOptions.filter((option) =>
        option.label.toLowerCase().includes(searchLower),
      );

      // Include category if either the name matches OR it has matching options
      if (categoryMatches || matchingOptions.length > 0) {
        filteredEntries.push([
          filterKey,
          {
            ...category,
            // If category name matches, show all options; otherwise only matching ones
            filteredOptions: categoryMatches
              ? categoryOptions
              : matchingOptions,
          },
        ]);
      }
    });

    // Ensure continent filter appears first in filtered results too
    return filteredEntries.sort((a, b) => {
      if (a[0] === "continent") return -1;
      if (b[0] === "continent") return 1;
      return 0;
    });
  };
  // NOTE: Removed useEffect that was extracting count from query results
  // This was causing a bug where it would overwrite the correct filtered count
  // with the count from the dashboard query's respondent_count CTE (which counts
  // only respondents who answered question NXjPAO = 466 users).
  // The filteredUserCount is already correctly updated in three places:
  // 1. Initial load (line ~216)
  // 2. Filter changes (handleFilterChange, line ~335)
  // 3. Clear filters (clearFilters, line ~369)

  const scrollToChart = (chartId) => {
    if (!chartId) return;

    const chartElement = document.querySelector(`[data-chart-id="${chartId}"]`);
    if (chartElement) {
      const rect = chartElement.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;

      // Scroll to position the chart near the center of the viewport, with some top padding
      const targetPosition = absoluteTop - window.innerHeight / 3;

      setTimeout(() => {
        window.scrollTo({
          top: Math.max(0, targetPosition),
          behavior: "smooth",
        });
      }, 150);
    }
  };

  // Don't block everything on initial loading - only show loading in dashboard section
  const hasData =
    queryResult && queryResult.data && queryResult.data.length > 0;

  return (
    <FilterProvider filters={filters}>
      <ErrorBoundary showDetails={import.meta.env.DEV}>
        <div className="min-h-screen bg-nodered-gray-100 font-sans">
        {/* Landing Page Hero Section */}
        {showHeroSection && (
          <section className="min-h-screen flex items-start pt-24 relative bg-[#8f0000] overflow-hidden z-30">
            {/* Background Wave Image at Bottom */}
            <div className="absolute bottom-0 left-0 right-0 w-full">
              <img
                src="./title-wave.png"
                alt=""
                className="w-full h-auto object-cover object-bottom"
              />
            </div>

            {/* Hero Content */}
            <div className="px-4 py-12 relative z-10 w-full">
              <div className="max-w-5xl mx-auto text-left">
                {/* Main Title */}
                <h1
                  className="text-5xl sm:text-6xl lg:text-7xl font-normal mb-6 max-w-2xl"
                  style={{
                    transform: heroAnimated
                      ? "translateY(0)"
                      : "translateY(-30px)",
                    opacity: heroAnimated ? 1 : 0,
                    transition: "all 0.8s ease-out",
                  }}
                >
                  <span className="text-white">The State of Node-RED's</span>
                  <span className="text-white"> User Experience</span>
                </h1>
                <div
                  className="text-3xl sm:text-4xl font-light text-white/90 mb-8 font-mono"
                  style={{
                    transform: heroAnimated
                      ? "translateX(0)"
                      : "translateX(-40px)",
                    opacity: heroAnimated ? 1 : 0,
                    transition: "all 0.8s ease-out",
                  }}
                >
                  2025
                </div>

                {/* Description */}
                <p className="text-lg sm:text-xl text-white/90 max-w-3xl mb-12 leading-relaxed">
                  Discover insights from over 600 Node-RED users worldwide.
                  Explore how the community uses Node-RED, what they love, and
                  their vision for the future of low-code programming.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                  <button
                    onClick={scrollToDashboard}
                    className="px-8 py-4 bg-white text-[#8f0000] rounded-lg font-semibold text-lg hover:bg-white/90 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                  >
                    Explore the survey results
                  </button>
                  <button
                    onClick={scrollToIntroduction}
                    className="px-8 py-4 bg-transparent text-white rounded-lg font-semibold text-lg hover:bg-white/10 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all border-2 border-white"
                  >
                    Read introduction
                  </button>
                </div>
              </div>
            </div>

            {/* Scroll Indicator */}
            <button
              onClick={scrollToIntroduction}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce cursor-pointer hover:scale-110 transition-transform"
            >
              <svg
                className="w-6 h-6 text-white/70"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>
          </section>
        )}
        {/* Introduction Section - The Modernization Story */}
        {showIntroductionSection && (
          <section
            id="introduction-section"
            className="min-h-screen flex items-center bg-white border-b border-nodered-gray-200 relative z-30"
          >
            <div className="max-w-5xl mx-auto px-6">
              {/* Section Title */}
              <div className="text-left mb-12">
                <h2 className="text-3xl font-bold text-nodered-gray-800 mb-4 mt-12 md:mt-0">
                  Introduction
                </h2>
                <p className="text-lg text-nodered-gray-600 max-w-3xl">
                  We surveyed 623 Node-RED users worldwide as part of the{" "}
                  <a
                    href="https://discourse.nodered.org/t/node-red-survey-shaping-the-future-of-node-reds-user-experience/98346"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                  >
                    Node-RED Modernization Project
                  </a>{" "}
                  to create a clear baseline of where the community stands on
                  the future of Node-RED. This report focuses on objectivity and
                  clarity through verified survey data and rigorous analysis.
                </p>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
                {/* Left Column - The Story */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-nodered-red-500 mb-3">
                      Community-Driven Modernization
                    </h3>
                    <p className="text-nodered-gray-600 leading-relaxed">
                      With{" "}
                      <a
                        href="https://nodered.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                      >
                        Node-RED 4.1 released
                      </a>{" "}
                      and{" "}
                      <a
                        href="https://events.zoom.us/ev/AqhqiQ8mTK2lnAoOEH8c8TA1a_9MzVhZq_T7d1-kMHlHDt2_Qh_0~ArONnIcxMjLKoD3Stc16u8yBa38mn0RO4y2nOMx4AZqewgJ1dZm6TAmYyyVgBk3jzn2T5FyGxH2VdIpi_Oe6V7CxaA"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                      >
                        Node-RED con
                      </a>{" "}
                      behind us, it's time to plan ahead for the future.
                      Development tools have changed significantly since 2013
                      when Node-RED started, and we know there are areas we
                      could improve to keep Node-RED relevant and improve it to
                      the benefit of us all!
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-nodered-red-500 mb-3">
                      Our Approach
                    </h3>
                    <p className="text-nodered-gray-600 leading-relaxed">
                      This isn't about imposing changes—it's about understanding
                      what's working, what's not, and how we can improve
                      Node-RED to ensure it continues to thrive and grow. We're
                      looking at Node-RED holistically: the editor and broader
                      application experience, community resources, contribution
                      flows, and the entire user and contributor experience.
                    </p>
                  </div>
                </div>

                {/* Right Column - Key Points */}
                <div className="space-y-6 mb-12">
                  <div>
                    <h3 className="text-xl font-semibold text-nodered-red-500 mb-3">
                      What We Found
                    </h3>
                    <p className="text-nodered-gray-600 leading-relaxed">
                      This survey showcases the diverse ways people use
                      Node-RED, the challenges they face, and emerging needs
                      like better collaboration features, modern UI
                      improvements, and enhanced learning resources. Our goal is
                      a more vibrant community with diverse contributors, making
                      Node-RED easier to work with, more professional, and
                      welcoming to all skill levels.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-nodered-red-500 mb-3">
                      Join the Conversation
                    </h3>
                    <p className="text-nodered-gray-600 leading-relaxed">
                      These survey results are just the beginning. Share your
                      thoughts and join the discussion on our{" "}
                      <a
                        href="https://discourse.nodered.org/t/modernization-survey-results-now-available/99830"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                      >
                        community forum
                      </a>{" "}
                      or read the full{" "}
                      <a
                        href="https://nodered.org/blog/2025/12/01/modernization-survey-results"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                      >
                        blog post
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Scroll Indicator */}
            <button
              onClick={scrollToDashboard}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce cursor-pointer hover:scale-110 transition-transform"
            >
              <svg
                className="w-6 h-6 text-nodered-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>
          </section>
        )}
        {/* Dashboard Section - Self-contained with sidebars */}
        <div ref={dashboardRef} className="relative">
          {/* Node-RED Header - Sticky to viewport */}
          <header className="h-12 bg-black border-b-2 border-[#c02020] flex items-center justify-between pl-4 pr-4 sm:pr-8 text-white sticky top-0 z-50">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <h1 className="inline font-sans text-base font-normal text-white h-auto leading-[30px] whitespace-nowrap align-middle w-auto">
                Node-RED Modernization Survey Results
              </h1>
            </div>

            {/* User count moved to right side - shows comparison mode indicator when active */}
            <div className="flex items-center gap-1 text-sm flex-shrink-0">
              {comparisonMode ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-600 text-white text-xs font-medium">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Comparison mode
                  </span>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold">A</span>
                    <span className="text-gray-400">{countActiveFilters(filtersA)}</span>
                    <span className="text-gray-500 mx-0.5">vs</span>
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold">B</span>
                    <span className="text-gray-400">{countActiveFilters(filtersB)}</span>
                  </div>
                </div>
              ) : filterLoading ? (
                <div className="flex items-center gap-1 text-yellow-400">
                  <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs">Updating...</span>
                </div>
              ) : (
                <>
                  <span className="font-bold" style={{ color: "#c12120" }}>
                    {filteredUserCount}
                  </span>
                  <span className="text-gray-300 hidden sm:inline">
                    respondents
                  </span>
                  <RespondentIcon className="w-4 h-4 text-gray-300 sm:hidden" />
                </>
              )}
              {!comparisonMode && getActiveFilterCount() > 0 && (
                <span className={header.filterBadge}>
                  <span className="hidden sm:inline">
                    {getActiveFilterCount()}{" "}
                  </span>
                  <span className="sm:hidden">{getActiveFilterCount()}</span>
                  <span className="hidden sm:inline">filters</span>
                </span>
              )}
            </div>
          </header>
          {/* Dashboard Container with Sidebars */}
          <div className="relative flex">
            {/* Mobile Backdrop Overlay */}
            {isMobile && (!sidebarCollapsed || !tocCollapsed) && (
              <div
                className="fixed inset-0 bg-black/50 z-10 transition-opacity duration-300"
                style={{ top: "48px" }}
                onClick={() => {
                  setSidebarCollapsed(true);
                  setTocCollapsed(true);
                }}
              />
            )}
            {/* Left Sidebar - Node-RED Palette Style */}
            <aside
              className={cn(
                "bg-[#f3f3f3] overflow-visible flex flex-col border-r border-[#bbbbbb] z-20 transition-all duration-300 ease-in-out",
                isMobile ? "fixed left-0" : "sticky self-start",
              )}
              style={{
                width: sidebarCollapsed ? "7px" : `${sidebarWidth}px`,
                height: isMobile ? "calc(100vh - 48px)" : "100vh",
                maxHeight: "calc(100vh - 48px)",
                top: "48px",
              }}
            >
              {/* Sidebar Content - Show when expanded, or on mobile when not collapsed */}
              <div
                className={`${!sidebarCollapsed ? "block" : "hidden"} h-full overflow-y-auto overflow-x-hidden flex flex-col relative z-10`}
                data-testid="filter-sidebar"
              >
                <div className={sidebar.header}>
                  <div className={sidebar.filterWrapper}>
                    <svg
                      className={sidebar.filterIcon}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="filter"
                      className={sidebar.filter}
                      value={filterSearchTerm}
                      onChange={(e) => setFilterSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {/* Comparison Mode Toggle */}
                <div className="px-4 py-2 bg-white border-b border-gray-200">
                  <button
                    onClick={toggleComparisonMode}
                    className={cn(
                      comparisonMode
                        ? sidebar.clearButton
                        : sidebar.preset.button
                    )}
                  >
                    {comparisonMode ? "Exit Compare Mode" : "Compare Segments"}
                  </button>
                </div>

                {/* Column Selector Tabs (visible in comparison mode) */}
                {comparisonMode && (
                  <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setActiveColumn('A')}
                        className={cn(
                          "flex-1 px-2 py-1.5 text-xs font-medium rounded-l border transition-colors flex items-center justify-center gap-1.5",
                          activeColumn === 'A'
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">A</span>
                        <span className="truncate">({countActiveFilters(filtersA)})</span>
                      </button>
                      <button
                        onClick={() => setActiveColumn('B')}
                        className={cn(
                          "flex-1 px-2 py-1.5 text-xs font-medium rounded-r border transition-colors flex items-center justify-center gap-1.5",
                          activeColumn === 'B'
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <span className="w-4 h-4 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center font-bold">B</span>
                        <span className="truncate">({countActiveFilters(filtersB)})</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 text-center">
                      Editing Column {activeColumn}
                    </p>
                  </div>
                )}

                <div className={sidebar.content}>
                  {/* Clear Filters - Node-RED Style */}
                  {!comparisonMode && getActiveFilterCount() > 0 && (
                    <div className={cn(sidebar.preset.wrapper, "border-gray-200")}>
                      <button
                        className={sidebar.clearButton}
                        onClick={clearFilters}
                        data-testid="clear-filters"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                  {/* Clear Filters for active column in comparison mode */}
                  {comparisonMode && countActiveFilters(activeColumn === 'A' ? filtersA : filtersB) > 0 && (
                    <div className={cn(sidebar.preset.wrapper, "border-gray-200")}>
                      <button
                        className={sidebar.clearButton}
                        onClick={() => {
                          if (activeColumn === 'A') {
                            setFiltersA(createEmptyFilters());
                          } else {
                            setFiltersB(createEmptyFilters());
                          }
                        }}
                        data-testid="clear-filters-column"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}

                  {/* Segments Category */}
                  <div className={sidebar.category.base}>
                    <div className="bg-[#f3f3f3] border-b border-gray-200 pl-4 pr-4 py-2 text-xs text-left font-medium text-gray-500 uppercase flex justify-between items-center relative">
                      <span
                        className="truncate"
                        onMouseEnter={(e) =>
                          handleSidebarItemMouseEnter(e, "Quick filters")
                        }
                        onMouseLeave={handleSidebarItemMouseLeave}
                      >
                        Quick filters
                      </span>
                    </div>
                    <div className={sidebar.category.content}>
                      <div className="px-4 py-2 bg-white space-y-2">
                        {Object.entries(segmentPresets)
                          .filter(([key]) =>
                            [
                              "hobby-segment",
                              "s-size-comp-segment",
                              "m-size-comp-segment",
                              "manufacturing-icp",
                            ].includes(key),
                          )
                          .sort((a, b) => {
                            const order = [
                              "hobby-segment",
                              "s-size-comp-segment",
                              "m-size-comp-segment",
                              "manufacturing-icp",
                            ];
                            return order.indexOf(a[0]) - order.indexOf(b[0]);
                          })
                          .map(([key, preset]) => (
                            <button
                              key={key}
                              className={cn(
                                sidebar.preset.button,
                                activePreset === key &&
                                  "!bg-[#c02020] !text-white !border-[#c02020] hover:!bg-[#a01818]",
                              )}
                              onClick={() => applyPreset(key)}
                              title={preset.description}
                            >
                              {preset.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Filters Category */}
                  <div className={sidebar.category.base}>
                    <div className={sidebar.category.content}>
                      <div>
                        {getFilteredOptions().map(
                          ([filterKey, category], index) => {
                            // filterKey is already the filter key (e.g., 'experience', 'purpose')
                            // category contains questionId, name, and options
                            if (!filterKey) return null;

                            // Defensive checks for category data
                            if (
                              !category ||
                              !category.filteredOptions ||
                              !Array.isArray(category.filteredOptions)
                            ) {
                              if (import.meta.env.DEV)
                                console.warn(
                                  "⚠️ Invalid category data for",
                                  filterKey,
                                  ":",
                                  category,
                                );
                              return null;
                            }

                            // Use current column's filters in comparison mode
                            const currentFilters = comparisonMode ? getCurrentFilters() : filters;
                            const selectedValues = currentFilters[filterKey] || [];
                            const selectedCount = selectedValues.length;

                            // Debug logging for checkbox state
                            if (
                              import.meta.env.DEV &&
                              filterKey === "purpose"
                            ) {
                              console.log("🔍 Purpose filter state:", {
                                filterKey,
                                selectedValues,
                                availableOptions: category.filteredOptions.map(
                                  (o) => o.value,
                                ),
                              });
                            }

                            const colorClass = getCategoryForFilter(
                              category.questionId,
                              category.name,
                            );

                            return (
                              <div
                                key={filterKey}
                                className={sidebar.filterCategory.base}
                              >
                                <div
                                  className={cn(
                                    "bg-[#f3f3f3] border-b border-gray-300 pl-4 pr-4 py-2 mb-2 text-xs text-left font-medium text-gray-500 uppercase flex justify-between items-center relative",
                                    index > 0 && "border-t",
                                    colorClass,
                                  )}
                                >
                                  <span
                                    className="truncate flex-1 min-w-0 mr-1.5"
                                    onMouseEnter={(e) =>
                                      handleSidebarItemMouseEnter(
                                        e,
                                        category.name,
                                      )
                                    }
                                    onMouseLeave={handleSidebarItemMouseLeave}
                                  >
                                    {category.name.toLowerCase()}
                                  </span>
                                  <div
                                    className={cn(
                                      "bg-gray-400 text-white px-1.5 py-0.5 rounded-full text-[10px] font-normal",
                                      selectedCount > 0 && "!bg-[#c12120]",
                                    )}
                                  >
                                    {selectedCount > 0
                                      ? selectedCount
                                      : category.filteredOptions.length}
                                  </div>
                                </div>
                                <div className={sidebar.filterCategory.options}>
                                  {category.filteredOptions.map((option) => {
                                    const isChecked = selectedValues.includes(
                                      option.value,
                                    );

                                    // Debug logging for purpose filter checkboxes
                                    if (
                                      import.meta.env.DEV &&
                                      filterKey === "purpose" &&
                                      selectedValues.length > 0
                                    ) {
                                      console.log(
                                        `🔍 Checkbox "${option.label}":`,
                                        {
                                          optionValue: option.value,
                                          selectedValues,
                                          isChecked,
                                          exactMatch: selectedValues.some(
                                            (sv) => sv === option.value,
                                          ),
                                        },
                                      );
                                    }

                                    return (
                                      <div
                                        key={option.value}
                                        className="pl-4 pr-4 py-1 text-[11px] text-gray-600 flex items-center gap-1.5 hover:bg-gray-50 min-w-0"
                                      >
                                        <input
                                          type="checkbox"
                                          id={`${filterKey}-${option.value}`}
                                          checked={isChecked}
                                          onChange={(e) => {
                                            if (import.meta.env.DEV)
                                              console.log(
                                                "🔥 BASIC CHECKBOX CLICK:",
                                                {
                                                  filterKey,
                                                  value: option.value,
                                                  checked: e.target.checked,
                                                },
                                              );
                                            if (import.meta.env.DEV)
                                              console.log(
                                                "🔍 handleFilterChange type:",
                                                typeof handleFilterChange,
                                                "exists:",
                                                !!handleFilterChange,
                                              );
                                            if (
                                              typeof handleFilterChange ===
                                              "function"
                                            ) {
                                              handleFilterChange(
                                                filterKey,
                                                option.value,
                                                e.target.checked,
                                              );
                                            } else {
                                              console.error(
                                                "❌ handleFilterChange is not a function!",
                                                handleFilterChange,
                                              );
                                            }
                                          }}
                                          className={`${sidebar.filterCategory.checkbox} flex-shrink-0`}
                                          data-testid={`${filterKey}-filter-${option.label.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`}
                                          data-value={option.value}
                                        />
                                        <label
                                          htmlFor={`${filterKey}-${option.value}`}
                                          className={`${sidebar.filterCategory.label} truncate min-w-0 flex-1`}
                                          onMouseEnter={(e) =>
                                            handleSidebarItemMouseEnter(
                                              e,
                                              option.label,
                                            )
                                          }
                                          onMouseLeave={
                                            handleSidebarItemMouseLeave
                                          }
                                        >
                                          {option.label}
                                        </label>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Always-visible sidebar indicator */}
              <div
                className="absolute bg-gray-400 hover:bg-gray-500 transition-all duration-300 ease-in-out z-30"
                style={{
                  right: "2px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "3px",
                  height: "60px",
                  borderRadius: "2px",
                }}
                onMouseEnter={() => setShowSidebarToggle(true)}
                onMouseLeave={() => setShowSidebarToggle(false)}
              />

              {/* Toggle Button Hover Area - Node-RED Style */}
              <div
                className="absolute z-[1] transition-all duration-300 ease-in-out"
                style={{
                  right: "-24px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "30px",
                  height: "80px",
                }}
                onMouseEnter={() => {
                  setShowSidebarToggle(true);
                  if (sidebarTooltipTimeoutRef.current) {
                    clearTimeout(sidebarTooltipTimeoutRef.current);
                  }
                  sidebarTooltipTimeoutRef.current = setTimeout(() => {
                    setShowSidebarTooltip(true);
                    setTimeout(() => setShowSidebarTooltip(false), 1000);
                  }, 250);
                }}
                onMouseLeave={() => {
                  setShowSidebarToggle(false);
                  setShowSidebarTooltip(false);
                  if (sidebarTooltipTimeoutRef.current) {
                    clearTimeout(sidebarTooltipTimeoutRef.current);
                    sidebarTooltipTimeoutRef.current = null;
                  }
                }}
              >
                <div className="relative group">
                  <button
                    className={`absolute w-6 h-12 flex items-center justify-center transition-transform duration-200 ${
                      showSidebarToggle || sidebarCollapsed || isMobile
                        ? "opacity-100"
                        : "opacity-0 pointer-events-none"
                    } ${
                      showSidebarToggle || isMobile
                        ? "bg-white hover:bg-gray-50 border border-gray-300 shadow-sm"
                        : "bg-transparent border border-transparent"
                    }`}
                    onClick={() => {
                      if (isMobile && sidebarCollapsed) setTocCollapsed(true);
                      setSidebarCollapsed(!sidebarCollapsed);
                    }}
                    style={{
                      left: "7px",
                      top: "16px",
                      borderRadius: "0 4px 4px 0",
                      position: "relative",
                      transform:
                        showSidebarToggle || sidebarCollapsed || isMobile
                          ? "translateX(0)"
                          : "translateX(-10px)",
                    }}
                  >
                    <svg
                      className="w-3 h-3 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{
                        transform: sidebarCollapsed
                          ? "rotate(0deg)"
                          : "rotate(180deg)",
                        transition: "transform 200ms ease",
                      }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>

                  {/* Custom Tooltip */}
                  {showSidebarTooltip && (
                    <div
                      className="absolute bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-50 border border-gray-600"
                      style={{
                        left: "38px",
                        top: "19px",
                      }}
                    >
                      {sidebarCollapsed ? "Show palette" : "Hide palette"}
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Sidebar Item Tooltip */}
            {sidebarItemTooltip.show && (
              <div
                className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none text-sm border border-gray-600"
                style={{
                  left: sidebarItemTooltip.x,
                  top: sidebarItemTooltip.y,
                  maxWidth: "200px",
                }}
              >
                {sidebarItemTooltip.content}
              </div>
            )}

            {/* Main Content Area with Grid */}
            <main
              ref={mainContentRef}
              className={cn(
                mainContent.base,
                mainContent.grid,
                "flex-1 transition-all duration-300 ease-in-out",
              )}
              style={{
                minHeight: "calc(100vh - 48px)",
              }}
            >
              {initialLoading ? (
                <div className="flex justify-center items-center min-h-[calc(100vh-48px)]">
                  <div className="text-center p-6 min-w-[320px] bg-white border border-nodered-gray-200 rounded-lg shadow-lg">
                    <h2 className="text-lg mb-3 text-nodered-gray-700 font-medium">
                      Loading Survey Dashboard
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-nodered-gray-500">
                      <div className="animate-spin w-4 h-4 border-2 border-nodered-red-500 border-t-transparent rounded-full"></div>
                      <span className="text-sm text-nodered-gray-500">
                        Executing SQL query...
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={cn(
                  "w-full mx-auto px-10 py-12 dashboard-mobile-scale",
                  comparisonMode
                    ? "max-w-7xl overflow-x-auto"
                    : "max-w-3xl lg:max-w-5xl"
                )}>
                  {/* SQL Query Card */}
                  {showQuery && queryResult?.query && (
                    <div className={cn(card.base, "mb-6 max-w-4xl")}>
                      <div className={card.iconSection}>
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#d1d5db"
                          strokeWidth="1.5"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            fill="white"
                            stroke="#d1d5db"
                          />
                          <path
                            d="M8 6h2M12 6h4M8 10h8M8 14h5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className={card.content}>
                        <div className={cn(card.body, "bg-white")}>
                          <h3 className={card.title}>Current SQL Query</h3>
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs font-mono overflow-x-auto whitespace-pre">
                            {queryResult.query}
                          </pre>
                          <p className="mt-2 text-xs text-gray-500 italic">
                            Edit src/queries/dashboard-queries.js to change this
                            query
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Card */}
                  {queryResult?.error && (
                    <div
                      className={cn(card.base, "mb-6 max-w-4xl", error.card)}
                    >
                      <div className={card.iconSection}>
                        <svg
                          className="w-5 h-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#dc2626"
                          strokeWidth="1.5"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="9"
                            fill="white"
                            stroke="#dc2626"
                          />
                          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className={card.content}>
                        <div className={cn(card.body, "bg-white")}>
                          <h3 className={cn(card.title, error.title)}>
                            Query Error
                          </h3>
                          <pre className={error.content}>
                            {queryResult.error}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Main Content Layout */}
                  <div className="space-y-12">
                    {/* Text Container for Header and Rich Body Text */}
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
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            stroke="#d1d5db"
                            fill="white"
                          />
                          <path d="M13 3v5a2 2 0 002 2h4" stroke="#d1d5db" />
                        </svg>
                      </div>
                      <div className={card.content}>
                        <div className={cn(card.body, "bg-white p-4")}>
                          <div className="max-w-3xl">
                            <div className="text-sm text-nodered-gray-600 font-light leading-relaxed max-w-2xl">
                              <p className="mb-2">
                                Use the filters in the left sidebar to explore
                                different segments of the community and what
                                they responded regarding the questions. Expand
                                the right sidebar to see a table of contents to
                                quickly navigate to a specific question.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Survey Questions in Order */}
                    {hasData && (
                      <div className="my-12">
                        {/* Section 1: Basic Demographics & Background (Questions 1-10) */}
                        <div className="space-y-12">
                          <div className="grid grid-cols-1 gap-12">
                            {renderChart(ChoroplethMap, {
                              questionId: "GpGjoO",
                              questionTitle: "Country Selection",
                              filters: filters,
                              color: getChartColor("GpGjoO"),
                              wasmService: wasmService,
                            })}
                            {renderChart(HorizontalRatingsChart, {
                              questionId: "ElR6d2",
                              questionTitle: "How long have you been using Node-RED?",
                              filters: filters,
                              wasmService: wasmService,
                            })}
                            {renderChart(QuantitativeChart, {
                              questionId: "VPeNQ6",
                              questionTitle: "What is your primary purpose for using Node-RED?",
                              filters: filters,
                              color: getChartColor("VPeNQ6"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["VPeNQ6"],
                            })}
                            {renderChart(VerticalBarChart, {
                              questionId: "joRz61",
                              questionTitle: "What size organization do you work with?",
                              filters: filters,
                              color: getChartColor("joRz61"),
                              wasmService: wasmService,
                            })}
                            {renderChart(QuantitativeChart, {
                              questionId: "2AWoaM",
                              questionTitle: "What industry are you in?",
                              filters: filters,
                              color: getChartColor("2AWoaM"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["2AWoaM"],
                            })}
                            {renderChart(VerticalBarChart, {
                              questionId: "P9xr1x",
                              questionTitle: "How much influence do you have in choosing automation tools?",
                              filters: filters,
                              color: getChartColor("P9xr1x"),
                              wasmService: wasmService,
                            })}
                            {renderChart(QuantitativeChart, {
                              questionId: "rO4YaX",
                              questionTitle: "What do you use Node-RED for?",
                              filters: filters,
                              color: getChartColor("rO4YaX"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["rO4YaX"],
                            })}
                            {renderChart(QuantitativeChart, {
                              questionId: "476OJ5",
                              questionTitle: "Where do you typically run Node-RED?",
                              filters: filters,
                              color: getChartColor("476OJ5"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["476OJ5"],
                            })}
                            {renderChart(VerticalBarChart, {
                              questionId: "xDqzMk",
                              questionTitle: "What's your programming experience level?",
                              filters: filters,
                              color: getChartColor("xDqzMk"),
                              wasmService: wasmService,
                            })}
                            {renderChart(RatingsChart, {
                              questionId: "qGrzG5",
                              questionTitle: "Overall satisfaction with Node-RED?",
                              filters: filters,
                              wasmService: wasmService,
                            })}
                          </div>
                        </div>

                        {/* Section 2: Early Satisfaction & Perception (Questions 11-25) */}
                        <div className="my-12 space-y-12">
                          <div className="grid grid-cols-1 gap-12">
                            {renderChart(RatingsChart, {
                              questionId: "QRZ4R1",
                              questionTitle: "How up-to-date does Node-RED look and feel?",
                              filters: filters,
                              wasmService: wasmService,
                            })}
                            {renderChart(RatingsChart, {
                              questionId: "RoNgoj",
                              questionTitle: "Does Node-RED look and feel professional?",
                              filters: filters,
                              wasmService: wasmService,
                            })}
                            {renderChart(RatingsChart, {
                              questionId: "erJzrQ",
                              questionTitle: "How engaging does the Node-RED community feel?",
                              filters: filters,
                              wasmService: wasmService,
                            })}
                            {renderChart(MatrixChart, {
                              questionId: "OX2gBp",
                              questionTitle: "Which devices do you use for these Node-RED tasks?",
                              filters: filters,
                              color: getChartColor("OX2gBp"),
                              wasmService: wasmService,
                            })}
                            {renderChart(DeviceSatisfactionGrid, {
                              filters: filters,
                              wasmService: wasmService,
                            })}
                            {renderChart(QuantitativeChart, {
                              questionId: "ZO7ede",
                              questionTitle: "How did you first discover Node-RED?",
                              filters: filters,
                              color: getChartColor("ZO7ede"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["ZO7ede"],
                            })}
                            {renderChart(HorizontalRatingsChart, {
                              questionId: "qGrzbg",
                              questionTitle: "How long did it take to feel comfortable with Node-RED?",
                              filters: filters,
                              wasmService: wasmService,
                            })}
                            {renderChart(VerticalBarChart, {
                              questionId: "ZO7eJB",
                              questionTitle: "Do you use Node-RED in production systems/professionally?",
                              filters: filters,
                              color: getChartColor("ZO7eJB"),
                              wasmService: wasmService,
                            })}
                            {renderChart(HorizontalRatingsChart, {
                              questionId: "ZO7eO5",
                              questionTitle: "How many Node-RED instances do you run/manage?",
                              filters: filters,
                              wasmService: wasmService,
                            })}
                            {renderChart(VerticalBarChart, {
                              questionId: "kG2v5Z",
                              questionTitle: "How complex are your typical Node-RED configurations?",
                              filters: filters,
                              color: getChartColor("kG2v5Z"),
                              wasmService: wasmService,
                            })}
                            {renderChart(UnderstandingRatingsGrid, {
                              filters: filters,
                              wasmService: wasmService,
                            })}

                            {/* Learning Channels Section */}
                            {renderChart(LearningChannelsSection, {
                              filters: filters,
                              wasmService: wasmService,
                            })}
                          </div>
                        </div>

                        {/* Section 3: Frustrations & Design Evaluation (Questions 26-50) */}
                        <div className="my-12 space-y-12">
                          <div className="grid grid-cols-1 gap-12">
                            {renderChart(QuantitativeChart, {
                              questionId: "kGozGZ",
                              questionTitle: "What frustrates you most about Node-RED?",
                              filters: filters,
                              color: getChartColor("kGozGZ"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["kGozGZ"],
                            })}
                          </div>
                          <div className="space-y-12">
                            {renderChart(QualitativeAnalysis, {
                              questionId: "gqlzqJ",
                              questionText: "What's the single biggest improvement Node-RED needs?",
                              filters: filters,
                              color: getChartColor("gqlzqJ"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["gqlzqJ"],
                            })}
                          </div>
                          <div className="grid grid-cols-1 gap-12">
                            {renderChart(DesignChangesRatingsGrid, {
                              filters: filters,
                              wasmService: wasmService,
                            })}
                            {renderChart(QualityComparisonRatingsGrid, {
                              filters: filters,
                              wasmService: wasmService,
                            })}
                          </div>
                        </div>

                        {/* Section 4: Learning, Dashboards & Sharing (Questions 39-50) */}
                        <div className="my-12 space-y-12">
                          <div className="space-y-12">
                            {renderChart(QualitativeAnalysis, {
                              questionId: "6KlPdY",
                              questionText: "What would make learning Node-RED easier for newcomers?",
                              filters: filters,
                              color: getChartColor("6KlPdY"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["6KlPdY"],
                            })}
                          </div>
                          <div className="grid grid-cols-1 gap-12">
                            {renderChart(QuantitativeChart, {
                              questionId: "erJzEk",
                              questionTitle: "Have you built Node-RED dashboards with any of these solutions",
                              filters: filters,
                              color: getChartColor("erJzEk"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["erJzEk"],
                            })}
                          </div>
                          <div className="space-y-12">
                            {renderChart(QualitativeAnalysis, {
                              questionId: "joRj6E",
                              questionText: "What has made it difficult to create or use Node-RED dashboards?",
                              filters: filters,
                              color: getChartColor("joRj6E"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["joRj6E"],
                            })}
                          </div>
                          <div className="grid grid-cols-1 gap-12">
                            {renderChart(RatingsChart, {
                              questionId: "2AWpaV",
                              questionTitle: "How often do you share flows with others?",
                              filters: filters,
                              wasmService: wasmService,
                            })}
                          </div>
                          <div className="space-y-12">
                            {renderChart(QualitativeAnalysis, {
                              questionId: "xDqAMo",
                              questionText: "What makes sharing flows difficult for you?",
                              filters: filters,
                              color: getChartColor("xDqAMo"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["xDqAMo"],
                            })}
                            {renderChart(QualitativeAnalysis, {
                              questionId: "RoNAMl",
                              questionText: "How would you wish sharing flows would work?",
                              filters: filters,
                              color: getChartColor("RoNAMl"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["RoNAMl"],
                            })}
                          </div>
                          <div className="grid grid-cols-1 gap-12">
                            {renderChart(QuantitativeChart, {
                              questionId: "089kZ6",
                              questionTitle: "What customization capabilities are important to you?",
                              filters: filters,
                              color: getChartColor("089kZ6"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["089kZ6"],
                            })}
                            {renderChart(QuantitativeChart, {
                              questionId: "8LBr6x",
                              questionTitle: "Do you have specific accessibility requirements?",
                              filters: filters,
                              color: getChartColor("8LBr6x"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["8LBr6x"],
                            })}
                          </div>
                          <div className="space-y-12">
                            {renderChart(QualitativeAnalysis, {
                              questionId: "oRPqY1",
                              questionText: "Why do you choose to use Node-RED over alternatives?",
                              filters: filters,
                              color: getChartColor("oRPqY1"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["oRPqY1"],
                            })}
                          </div>
                          <div className="grid grid-cols-1 gap-12">
                            {renderChart(QuantitativeChart, {
                              questionId: "Dp8ax5",
                              questionTitle: "What other automation tools do you use?",
                              filters: filters,
                              color: getChartColor("Dp8ax5"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["Dp8ax5"],
                            })}
                            {renderChart(QuantitativeChart, {
                              questionId: "Ma4BjA",
                              questionTitle: "Which missing features would most improve your Node-RED experience?",
                              filters: filters,
                              color: getChartColor("Ma4BjA"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["Ma4BjA"],
                            })}
                            {renderChart(QuantitativeChart, {
                              questionId: "NXjP0j",
                              questionTitle: "Is there anything that holds back production adoption?",
                              filters: filters,
                              color: getChartColor("NXjP0j"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["NXjP0j"],
                            })}
                          </div>
                        </div>

                        {/* Section 5: Future, AI & Final Thoughts (Questions 51-63) */}
                        <div className="my-12 space-y-12">
                          <div className="space-y-12">
                            {renderChart(QualitativeAnalysis, {
                              questionId: "P9xrbb",
                              questionText: "If you could change one thing about Node-RED, what would it be?",
                              filters: filters,
                              color: getChartColor("P9xrbb"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["P9xrbb"],
                            })}
                            {renderChart(QualitativeAnalysis, {
                              questionId: "oRPZqP",
                              questionText: "What aspects of Node-RED must be changed or be updated?",
                              filters: filters,
                              color: getChartColor("oRPZqP"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["oRPZqP"],
                            })}
                            {renderChart(QualitativeAnalysis, {
                              questionId: "XoaQoz",
                              questionText: "What aspects of Node-RED should ideally never change?",
                              filters: filters,
                              color: getChartColor("XoaQoz"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["XoaQoz"],
                            })}
                            {renderChart(QualitativeAnalysis, {
                              questionId: "JlPolX",
                              questionText: "What do you love most about Node-RED right now?",
                              filters: filters,
                              color: getChartColor("JlPolX"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["JlPolX"],
                            })}
                            {renderChart(QualitativeAnalysis, {
                              questionId: "y4Q14d",
                              questionText: "What makes Node-RED feel like 'Node-RED' to you?",
                              filters: filters,
                              color: getChartColor("y4Q14d"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["y4Q14d"],
                            })}
                            {renderChart(QualitativeAnalysis, {
                              questionId: "OX26KK",
                              questionText: "What would draw you away from Node-RED?",
                              filters: filters,
                              color: getChartColor("OX26KK"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["OX26KK"],
                            })}
                            {renderChart(QualitativeAnalysis, {
                              questionId: "xDqzdv",
                              questionText: "What expectations do you have regarding AI for Node-RED?",
                              filters: filters,
                              color: getChartColor("xDqzdv"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["xDqzdv"],
                            })}
                            {renderChart(QualitativeAnalysis, {
                              questionId: "a4LqQX",
                              questionText: "Why is that? (AI follow-up)",
                              filters: filters,
                              color: getChartColor("a4LqQX"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["a4LqQX"],
                            })}
                          </div>
                          <div className="space-y-12">
                            {renderChart(QualitativeAnalysis, {
                              questionId: "ElR6ZN",
                              questionText: "Any concerns about Node-RED's future direction?",
                              filters: filters,
                              color: getChartColor("ElR6ZN"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["ElR6ZN"],
                            })}
                          </div>
                          <div className="grid grid-cols-1 gap-12">
                            {renderChart(RatingsChart, {
                              questionId: "rO4YJv",
                              questionTitle: "How likely are you to recommend Node-RED to a colleague?",
                              filters: filters,
                              wasmService: wasmService,
                            })}
                          </div>
                          <div className="space-y-12">
                            {renderChart(QualitativeAnalysis, {
                              questionId: "476O9O",
                              questionText: "Any final thoughts or suggestions?",
                              filters: filters,
                              color: getChartColor("476O9O"),
                              wasmService: wasmService,
                              baselineOrder: baselineOrders["476O9O"],
                            })}
                          </div>
                          <div className="grid grid-cols-1 gap-12">
                            {renderChart(RatingsChart, {
                              questionId: "a4RvP9",
                              questionTitle: "How would you rate this survey?",
                              filters: filters,
                              ratingScale: 5,
                              wasmService: wasmService,
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </main>

            {/* Table of Contents - Right Sidebar */}
            <TableOfContents
              containerRef={mainContentRef}
              width={tocWidth}
              collapsed={tocCollapsed}
              onToggle={() => {
                if (isMobile && tocCollapsed) setSidebarCollapsed(true);
                setTocCollapsed(!tocCollapsed);
              }}
              onItemMouseEnter={handleTocItemMouseEnter}
              onItemMouseLeave={handleTocItemMouseLeave}
              isMobile={isMobile}
            />

            {/* TOC Resize Handle */}
            {!isSingleColumn && !tocCollapsed && (
              <div
                className="absolute top-0 w-[8px] h-full bg-transparent hover:bg-transparent z-30 cursor-col-resize"
                style={{
                  right: `${tocWidth - 4}px`,
                  transition: isTocResizing
                    ? "none"
                    : "right 300ms ease-in-out",
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsTocResizing(true);
                  const startX = e.clientX;
                  const startWidth = tocWidth;

                  const handleMouseMove = (e) => {
                    const delta = startX - e.clientX;
                    const newWidth = Math.min(
                      Math.max(startWidth + delta, 150),
                      400,
                    );
                    setTocWidth(newWidth);
                  };

                  const handleMouseUp = () => {
                    setIsTocResizing(false);
                    document.removeEventListener("mousemove", handleMouseMove);
                    document.removeEventListener("mouseup", handleMouseUp);
                  };

                  document.addEventListener("mousemove", handleMouseMove);
                  document.addEventListener("mouseup", handleMouseUp);
                }}
              />
            )}

            {/* ToC Item Tooltip */}
            {tocItemTooltip.show && (
              <div
                className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none text-sm border border-gray-600"
                style={{
                  right: `${tocItemTooltip.x}px`,
                  top: `${tocItemTooltip.y}px`,
                  maxWidth: "450px",
                  transform: "translateY(-100%)",
                }}
              >
                {tocItemTooltip.content}
              </div>
            )}
          </div>{" "}
          {/* End of dashboard container with sidebars */}
        </div>{" "}
        {/* End of dashboard section */}
        {/* Closing Section - Full Screen Scrollable */}
        {showFooterSection && (
          <section
            ref={footerSectionRef}
            className="min-h-screen flex items-center bg-white border-t relative z-30"
            style={{ borderTopColor: "#bbbbbb" }}
          >
            <div className="max-w-5xl mx-auto px-6 py-12">
              <div className="text-left mb-12">
                <h2 className="text-3xl font-bold text-nodered-gray-800 mb-4">
                  Thank You
                </h2>
                <p className="text-lg text-nodered-gray-600 max-w-3xl">
                  Thank you for your interest in the Node-RED survey results and
                  participation with the community of Node-RED. The source code
                  can be found in this{" "}
                  <a
                    href="https://github.com/node-red/community-survey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                  >
                    repository
                  </a>
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-nodered-red-500 mb-3">
                      Continued reading
                    </h3>
                    <p className="text-nodered-gray-600 leading-relaxed">
                      If you haven't already, check out the{" "}
                      <a
                        href="https://nodered.org/blog/2025/12/01/modernization-survey-results"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                      >
                        survey results blog post
                      </a>{" "}
                      for our initial take on these findings and our{" "}
                      <a
                        href="https://nodered.org/blog/2025/12/03/node-red-roadmap-to-5"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                      >
                        follow-up blog post
                      </a>{" "}
                      that talks about what is up next with Node-RED 5.0.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-nodered-red-500 mb-3">
                      Join the discussion
                    </h3>
                    <p className="text-nodered-gray-600 leading-relaxed">
                      Join the conversation on our{" "}
                      <a
                        href="https://discourse.nodered.org/t/modernization-survey-results-now-available/99830"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                      >
                        community forum
                      </a>{" "}
                      to add your conclusions.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-nodered-red-500 mb-3">
                      Get Involved
                    </h3>
                    <p className="text-nodered-gray-600 leading-relaxed">
                      The Node-RED community thrives on collaboration. Whether
                      you're a developer, designer, or user, your voice matters.
                      Join the conversation on our{" "}
                      <a
                        href="https://discourse.nodered.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                      >
                        forum
                      </a>
                      , or consider contributing on{" "}
                      <a
                        href="https://github.com/node-red"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                      >
                        GitHub
                      </a>
                      .
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-nodered-red-500 mb-3">
                      Acknowledgements
                    </h3>
                    <p className="text-nodered-gray-600 leading-relaxed">
                      Node-RED is grateful to{" "}
                      <a
                        href="https://flowfuse.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                      >
                        FlowFuse
                      </a>{" "}
                      for actively sponsoring the project.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-nodered-red-500 mb-3">
                      Foundation Owned
                    </h3>
                    <p className="text-nodered-gray-600 leading-relaxed">
                      Node-RED is proudly part of the{" "}
                      <a
                        href="https://openjsf.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                      >
                        OpenJS Foundation
                      </a>
                      , ensuring neutral governance, long-term sustainability,
                      and a commitment to open source values.
                    </p>
                  </div>
                </div>
              </div>

              <footer className="mt-16">
                <div className="border-t border-nodered-gray-200 pt-12">
                  <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start lg:items-start">
                    <div className="flex-shrink-0 mt-2">
                      <a
                        href="https://openjsf.org"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src="./openjs-foundation-logo.svg"
                          alt="OpenJS Foundation"
                          className="h-16 opacity-60 hover:opacity-100 transition-opacity"
                        />
                      </a>
                    </div>

                    <div className="text-left text-xs text-nodered-gray-500 space-y-3 flex-1">
                      <p className="leading-relaxed">
                        Copyright{" "}
                        <a
                          href="https://openjsf.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                        >
                          OpenJS Foundation
                        </a>{" "}
                        and Node-RED contributors. All rights reserved. The{" "}
                        <a
                          href="https://openjsf.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                        >
                          OpenJS Foundation
                        </a>{" "}
                        has registered trademarks and uses trademarks. For a
                        list of trademarks of the{" "}
                        <a
                          href="https://openjsf.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                        >
                          OpenJS Foundation
                        </a>
                        , please see our{" "}
                        <a
                          href="https://trademark-policy.openjsf.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                        >
                          Trademark Policy
                        </a>{" "}
                        and{" "}
                        <a
                          href="https://trademark-list.openjsf.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                        >
                          Trademark List
                        </a>
                        . Trademarks and logos not indicated on the{" "}
                        <a
                          href="https://trademark-list.openjsf.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                        >
                          list of OpenJS Foundation trademarks
                        </a>{" "}
                        are trademarks™ or registered® trademarks of their
                        respective holders. Use of them does not imply any
                        affiliation with or endorsement by them.
                      </p>
                      <div className="flex gap-3 flex-wrap pt-2 text-xs">
                        <a
                          href="https://openjsf.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                        >
                          The OpenJS Foundation
                        </a>
                        <span className="text-nodered-gray-400">|</span>
                        <a
                          href="https://terms-of-use.openjsf.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                        >
                          Terms of Use
                        </a>
                        <span className="text-nodered-gray-400">|</span>
                        <a
                          href="https://privacy-policy.openjsf.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                        >
                          Privacy Policy
                        </a>
                        <span className="text-nodered-gray-400">|</span>
                        <a
                          href="https://bylaws.openjsf.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                        >
                          OpenJS Foundation Bylaws
                        </a>
                        <span className="text-nodered-gray-400">|</span>
                        <a
                          href="https://trademark-policy.openjsf.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                        >
                          Trademark Policy
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </footer>
            </div>
          </section>
        )}
        </div>
      </ErrorBoundary>
    </FilterProvider>
  );
}

export default App;
