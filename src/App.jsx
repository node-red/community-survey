import { useState, useEffect, useRef, useCallback } from "react";
import wasmService from "./services/duckdb-wasm";
import { SEGMENT_PRESETS, getAllPresets } from "./utils/filter-definitions.js";
import ErrorBoundary from "./components/ErrorBoundary";
import {
    QUESTION_TO_FILTER,
    createEmptyFilters,
    countActiveFilters,
} from "./utils/filter-utils.js";
import { getChartColor, corePalette } from "./utils/colorPalette";
import BarChart from "./components/BarChart";
import QualitativeAnalysis from "./components/QualitativeAnalysis";
import QuantitativeChart from "./components/QuantitativeChart";
import ChoroplethMap from "./components/ChoroplethMap";
import VerticalBarChart from "./components/VerticalBarChart";
import RatingsChart from "./components/RatingsChart";
import HorizontalRatingsChart from "./components/HorizontalRatingsChart";
import MatrixChart from "./components/MatrixChart";
import ChannelRatingsGrid from "./components/ChannelRatingsGrid";
import DesignChangesRatingsGrid from "./components/DesignChangesRatingsGrid";
import QualityComparisonRatingsGrid from "./components/QualityComparisonRatingsGrid";
import UnderstandingRatingsGrid from "./components/UnderstandingRatingsGrid";
import DeviceSatisfactionGrid from "./components/DeviceSatisfactionGrid";
import TableOfContents from "./components/TableOfContents";
import {
    header,
    sidebar,
    mainContent,
    card,
    error,
    table,
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
    const [filteredUserCount, setFilteredUserCount] = useState(0);
    const [sectionCounts, setSectionCounts] = useState({
        section1: { filtered: 466, total: 466 },
        section2: { filtered: 432, total: 432 },
    });
    const [filterSearchTerm, setFilterSearchTerm] = useState("");
    const [isSingleColumn, setIsSingleColumn] = useState(false);
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
                if (import.meta.env.DEV)
                    console.log("Initializing DuckDB WASM...");
                await wasmService.initialize();
                if (import.meta.env.DEV)
                    console.log("Connected to WASM service");

                // Load initial data
                const [dashboardData, filterOpts, segmentsList] =
                    await Promise.all([
                        wasmService.getDashboardData(filters, selectedSegment),
                        wasmService.getFilterOptions(),
                        wasmService.getSegments(),
                    ]);

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

                const sectionCounts =
                    await wasmService.getSectionCounts(filters);
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
                });
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
                console.log(
                    "🔍 newFilters computed:",
                    JSON.stringify(newFilters),
                );

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
                const [userCount, dashboardData, sectionCounts] =
                    await Promise.all([
                        wasmService.getFilteredCount(newFilters),
                        wasmService.getDashboardData(
                            newFilters,
                            selectedSegment,
                        ),
                        wasmService.getSectionCounts(newFilters),
                    ]);

                // DEBUG: Log the results
                if (import.meta.env.DEV)
                    console.log(
                        "🔍 handleFilterChange received userCount:",
                        userCount,
                    );
                if (import.meta.env.DEV)
                    console.log(
                        "🔍 handleFilterChange received sectionCounts:",
                        sectionCounts,
                    );

                setFilteredUserCount(userCount);
                setQueryResult(dashboardData);
                setSectionCounts(sectionCounts);
                setFilterLoading(false);
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
            const [userCount, dashboardData, sectionCounts] = await Promise.all(
                [
                    wasmService.getFilteredCount(emptyFilters),
                    wasmService.getDashboardData(emptyFilters, selectedSegment),
                    wasmService.getSectionCounts(emptyFilters),
                ],
            );

            setFilteredUserCount(userCount);
            setQueryResult(dashboardData);
            setSectionCounts(sectionCounts);
            setFilterLoading(false);
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
                    "with filters:",
                    JSON.stringify(newFilters, null, 2),
                );

            setFilters(newFilters);
            setActivePreset(presetKey);
            setFilterLoading(true);

            try {
                // Update count in real-time and apply preset filters
                const [userCount, dashboardData, sectionCounts] =
                    await Promise.all([
                        wasmService.getFilteredCount(newFilters),
                        wasmService.getDashboardData(
                            newFilters,
                            selectedSegment,
                        ),
                        wasmService.getSectionCounts(newFilters),
                    ]);

                setFilteredUserCount(userCount);
                setQueryResult(dashboardData);
                setSectionCounts(sectionCounts);
                setFilterLoading(false);
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
    const handleTocItemMouseEnter = (event, text) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const tooltipX = rect.left - 40; // Position 40px to the left of the item's left edge
        const tooltipY = rect.top + rect.height / 2; // Center vertically with item

        setTocItemTooltip({
            show: true,
            content: text,
            x: tooltipX,
            y: tooltipY,
        });
    };

    const handleTocItemMouseLeave = () => {
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
            console.log(
                "getFilteredOptions called, filterOptions:",
                filterOptions,
            );
            console.log("filterOptions keys:", Object.keys(filterOptions));
        }

        // Defensive check: ensure filterOptions is not empty
        if (
            !filterOptions ||
            typeof filterOptions !== "object" ||
            Object.keys(filterOptions).length === 0
        ) {
            if (import.meta.env.DEV)
                console.warn(
                    "⚠️ filterOptions is empty or invalid:",
                    filterOptions,
                );
            return [];
        }

        if (!filterSearchTerm.trim()) {
            const result = Object.entries(filterOptions).map(
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
            if (import.meta.env.DEV)
                console.log("Returning", result.length, "filter categories");
            return result;
        }

        const searchLower = filterSearchTerm.toLowerCase();
        const filteredEntries = [];

        Object.entries(filterOptions).forEach(([filterKey, category]) => {
            // Check if category name matches
            const categoryMatches = category.name
                .toLowerCase()
                .includes(searchLower);

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

        return filteredEntries;
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

        const chartElement = document.querySelector(
            `[data-chart-id="${chartId}"]`,
        );
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

    // Function to format cell values
    const formatCellValue = (value) => {
        if (value === null || value === undefined) return "-";
        if (typeof value === "object") return JSON.stringify(value);
        if (typeof value === "number" && !Number.isInteger(value)) {
            return value.toFixed(2);
        }
        return value;
    };

    // Don't block everything on initial loading - only show loading in dashboard section
    const hasData =
        queryResult && queryResult.data && queryResult.data.length > 0;
    const columns = hasData
        ? Object.keys(queryResult.data[0]).filter((col) => col !== "Segment")
        : [];

    return (
        <ErrorBoundary showDetails={import.meta.env.DEV}>
            <div className="min-h-screen bg-nodered-gray-100 font-sans">
                {/* Landing Page Hero Section */}
                {showHeroSection && (
                    <section className="min-h-screen flex items-start pt-24 relative bg-[#8f0000] overflow-hidden">
                        {/* Background Wave Image at Bottom */}
                        <div className="absolute bottom-0 left-0 right-0 w-full">
                            <img
                                src="/title-wave.png"
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
                                        transform: heroAnimated ? 'translateY(0)' : 'translateY(-30px)',
                                        opacity: heroAnimated ? 1 : 0,
                                        transition: 'all 0.8s ease-out'
                                    }}
                                >
                                    <span className="text-white">
                                        The State of Node-RED's
                                    </span>
                                    <span className="text-white">
                                        {" "}
                                        User Experience
                                    </span>
                                </h1>
                                <div
                                    className="text-3xl sm:text-4xl font-light text-white/90 mb-8 font-mono"
                                    style={{
                                        transform: heroAnimated ? 'translateX(0)' : 'translateX(-40px)',
                                        opacity: heroAnimated ? 1 : 0,
                                        transition: 'all 0.8s ease-out'
                                    }}
                                >
                                    2025
                                </div>

                                {/* Description */}
                                <p className="text-lg sm:text-xl text-white/90 max-w-3xl mb-12 leading-relaxed">
                                    Discover insights from over 600 Node-RED
                                    users worldwide. Explore how the community
                                    uses Node-RED, what they love, and their
                                    vision for the future of low-code
                                    programming.
                                </p>

                                {/* CTA Buttons */}
                                <div className="flex flex-col sm:flex-row gap-4">
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
                        className="min-h-screen flex items-center bg-white border-b border-nodered-gray-200 relative"
                    >
                        <div className="max-w-5xl mx-auto px-6">
                            {/* Section Title */}
                            <div className="text-left mb-12">
                                <h2 className="text-3xl font-bold text-nodered-gray-800 mb-4">
                                    Introduction
                                </h2>
                                <p className="text-lg text-nodered-gray-600 max-w-3xl">
                                    We surveyed 623 Node-RED users worldwide as
                                    part of the{" "}
                                    <a
                                        href="https://discourse.nodered.org/t/node-red-survey-shaping-the-future-of-node-reds-user-experience/98346"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                                    >
                                        Node-RED Modernization Project
                                    </a>{" "}
                                    to create a clear baseline of where the
                                    community stands on the future of Node-RED.
                                    This report focuses on objectivity and
                                    clarity through verified survey data and
                                    rigorous analysis.
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
                                            </a>
                                            , it's time to look to the future.
                                            Development tools have changed
                                            significantly since 2013 when
                                            Node-RED started, and we know there
                                            are areas we could improve to keep
                                            Node-RED relevant. Join us at{" "}
                                            <a
                                                href="https://events.zoom.us/ev/AqhqiQ8mTK2lnAoOEH8c8TA1a_9MzVhZq_T7d1-kMHlHDt2_Qh_0~ArONnIcxMjLKoD3Stc16u8yBa38mn0RO4y2nOMx4AZqewgJ1dZm6TAmYyyVgBk3jzn2T5FyGxH2VdIpi_Oe6V7CxaA"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                                            >
                                                Node-REDcon on 4th November 2025
                                            </a>{" "}
                                            to be part of this conversation.
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-semibold text-nodered-red-500 mb-3">
                                            Our Approach
                                        </h3>
                                        <p className="text-nodered-gray-600 leading-relaxed">
                                            This isn't about imposing
                                            changes—it's about understanding
                                            what's working, what's not, and how
                                            we can improve Node-RED to ensure it
                                            continues to thrive and grow. We're
                                            looking at Node-RED holistically:
                                            the editor and broader application
                                            experience, community resources,
                                            contribution flows, and the entire
                                            user and contributor experience.
                                        </p>
                                    </div>
                                </div>

                                {/* Right Column - Key Points */}
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold text-nodered-red-500 mb-3">
                                            What We Found
                                        </h3>
                                        <p className="text-nodered-gray-600 leading-relaxed">
                                            This survey showcases the diverse
                                            ways people use Node-RED, the
                                            challenges they face, and emerging
                                            needs like better collaboration
                                            features, modern UI improvements,
                                            and enhanced learning resources. Our
                                            goal is a more vibrant community
                                            with diverse contributors, making
                                            Node-RED easier to work with, more
                                            professional, and welcoming to all
                                            skill levels.
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

                        {/* User count moved to right side */}
                        <div className="flex items-center gap-1 text-sm flex-shrink-0">
                            {filterLoading ? (
                                <div className="flex items-center gap-1 text-yellow-400">
                                    <div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-xs">Updating...</span>
                                </div>
                            ) : (
                                <>
                                    <span
                                        className="font-bold"
                                        style={{ color: "#c12120" }}
                                    >
                                        {filteredUserCount}
                                    </span>
                                    <span className="text-gray-300 hidden sm:inline">
                                        respondents
                                    </span>
                                </>
                            )}
                            {getActiveFilterCount() > 0 && (
                                <span className={header.filterBadge}>
                                    <span className="hidden sm:inline">
                                        {getActiveFilterCount()}{" "}
                                    </span>
                                    <span className="sm:hidden">
                                        {getActiveFilterCount()}
                                    </span>
                                    <span className="hidden sm:inline">
                                        filters
                                    </span>
                                </span>
                            )}
                        </div>
                    </header>
                    {/* Dashboard Container with Sidebars */}
                    <div className="relative flex">
                        {/* Left Sidebar - Node-RED Palette Style */}
                        <aside
                            className="bg-[#f3f3f3] overflow-visible flex flex-col border-r border-[#bbbbbb] transition-all duration-300 ease-in-out sticky self-start z-20"
                            style={{
                                width: sidebarCollapsed
                                    ? "7px"
                                    : `${sidebarWidth}px`,
                                height: "100vh",
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
                                            onChange={(e) =>
                                                setFilterSearchTerm(
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                </div>

                                <div className={sidebar.content}>
                                    {/* Clear Filters - Node-RED Style */}
                                    {getActiveFilterCount() > 0 && (
                                        <div className={sidebar.preset.wrapper}>
                                            <button
                                                className={sidebar.clearButton}
                                                onClick={clearFilters}
                                                data-testid="clear-filters"
                                            >
                                                Clear All Filters (
                                                {getActiveFilterCount()} active)
                                            </button>
                                        </div>
                                    )}

                                    {/* Segments Category */}
                                    <div className={sidebar.category.base}>
                                        <div className="bg-[#f3f3f3] border-t border-b border-gray-300 pl-4 pr-4 py-2 text-xs text-left font-medium text-gray-500 uppercase flex justify-between items-center relative">
                                            <span
                                                className="truncate"
                                                onMouseEnter={(e) =>
                                                    handleSidebarItemMouseEnter(
                                                        e,
                                                        "Quick filters",
                                                    )
                                                }
                                                onMouseLeave={
                                                    handleSidebarItemMouseLeave
                                                }
                                            >
                                                Quick filters
                                            </span>
                                        </div>
                                        <div
                                            className={sidebar.category.content}
                                        >
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
                                                        return (
                                                            order.indexOf(
                                                                a[0],
                                                            ) -
                                                            order.indexOf(b[0])
                                                        );
                                                    })
                                                    .map(([key, preset]) => (
                                                        <button
                                                            key={key}
                                                            className={cn(
                                                                sidebar.preset
                                                                    .button,
                                                                activePreset ===
                                                                    key &&
                                                                    "!bg-[#c02020] !text-white !border-[#c02020] hover:!bg-[#a01818]",
                                                            )}
                                                            onClick={() =>
                                                                applyPreset(key)
                                                            }
                                                            title={
                                                                preset.description
                                                            }
                                                        >
                                                            {preset.name}
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Filters Category */}
                                    <div className={sidebar.category.base}>
                                        <div
                                            className={sidebar.category.content}
                                        >
                                            <div>
                                                {getFilteredOptions().map(
                                                    (
                                                        [filterKey, category],
                                                        index,
                                                    ) => {
                                                        // filterKey is already the filter key (e.g., 'experience', 'purpose')
                                                        // category contains questionId, name, and options
                                                        if (!filterKey)
                                                            return null;

                                                        // Defensive checks for category data
                                                        if (
                                                            !category ||
                                                            !category.filteredOptions ||
                                                            !Array.isArray(
                                                                category.filteredOptions,
                                                            )
                                                        ) {
                                                            if (
                                                                import.meta.env
                                                                    .DEV
                                                            )
                                                                console.warn(
                                                                    "⚠️ Invalid category data for",
                                                                    filterKey,
                                                                    ":",
                                                                    category,
                                                                );
                                                            return null;
                                                        }

                                                        const selectedValues =
                                                            filters[
                                                                filterKey
                                                            ] || [];
                                                        const selectedCount =
                                                            selectedValues.length;

                                                        // Debug logging for checkbox state
                                                        if (
                                                            import.meta.env
                                                                .DEV &&
                                                            filterKey ===
                                                                "purpose"
                                                        ) {
                                                            console.log(
                                                                "🔍 Purpose filter state:",
                                                                {
                                                                    filterKey,
                                                                    selectedValues,
                                                                    availableOptions:
                                                                        category.filteredOptions.map(
                                                                            (
                                                                                o,
                                                                            ) =>
                                                                                o.value,
                                                                        ),
                                                                },
                                                            );
                                                        }

                                                        const colorClass =
                                                            getCategoryForFilter(
                                                                category.questionId,
                                                                category.name,
                                                            );

                                                        return (
                                                            <div
                                                                key={filterKey}
                                                                className={
                                                                    sidebar
                                                                        .filterCategory
                                                                        .base
                                                                }
                                                            >
                                                                <div
                                                                    className={cn(
                                                                        "bg-[#f3f3f3] border-b border-gray-300 pl-4 pr-4 py-2 mb-2 text-xs text-left font-medium text-gray-500 uppercase flex justify-between items-center relative",
                                                                        index >
                                                                            0 &&
                                                                            "border-t",
                                                                        colorClass,
                                                                    )}
                                                                >
                                                                    <span
                                                                        className="truncate flex-1 min-w-0 mr-1.5"
                                                                        onMouseEnter={(
                                                                            e,
                                                                        ) =>
                                                                            handleSidebarItemMouseEnter(
                                                                                e,
                                                                                category.name,
                                                                            )
                                                                        }
                                                                        onMouseLeave={
                                                                            handleSidebarItemMouseLeave
                                                                        }
                                                                    >
                                                                        {category.name.toLowerCase()}
                                                                    </span>
                                                                    <div
                                                                        className={cn(
                                                                            "bg-gray-400 text-white px-1.5 py-0.5 rounded-full text-[10px] font-normal",
                                                                            selectedCount >
                                                                                0 &&
                                                                                "!bg-[#c12120]",
                                                                        )}
                                                                    >
                                                                        {selectedCount >
                                                                        0
                                                                            ? selectedCount
                                                                            : category
                                                                                  .filteredOptions
                                                                                  .length}
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    className={
                                                                        sidebar
                                                                            .filterCategory
                                                                            .options
                                                                    }
                                                                >
                                                                    {category.filteredOptions.map(
                                                                        (
                                                                            option,
                                                                        ) => {
                                                                            const isChecked =
                                                                                selectedValues.includes(
                                                                                    option.value,
                                                                                );

                                                                            // Debug logging for purpose filter checkboxes
                                                                            if (
                                                                                import.meta
                                                                                    .env
                                                                                    .DEV &&
                                                                                filterKey ===
                                                                                    "purpose" &&
                                                                                selectedValues.length >
                                                                                    0
                                                                            ) {
                                                                                console.log(
                                                                                    `🔍 Checkbox "${option.label}":`,
                                                                                    {
                                                                                        optionValue:
                                                                                            option.value,
                                                                                        selectedValues,
                                                                                        isChecked,
                                                                                        exactMatch:
                                                                                            selectedValues.some(
                                                                                                (
                                                                                                    sv,
                                                                                                ) =>
                                                                                                    sv ===
                                                                                                    option.value,
                                                                                            ),
                                                                                    },
                                                                                );
                                                                            }

                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        option.value
                                                                                    }
                                                                                    className="pl-4 pr-4 py-1 text-[11px] text-gray-600 flex items-center gap-1.5 hover:bg-gray-50 min-w-0"
                                                                                >
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        id={`${filterKey}-${option.value}`}
                                                                                        checked={
                                                                                            isChecked
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) => {
                                                                                            if (
                                                                                                import.meta
                                                                                                    .env
                                                                                                    .DEV
                                                                                            )
                                                                                                console.log(
                                                                                                    "🔥 BASIC CHECKBOX CLICK:",
                                                                                                    {
                                                                                                        filterKey,
                                                                                                        value: option.value,
                                                                                                        checked:
                                                                                                            e
                                                                                                                .target
                                                                                                                .checked,
                                                                                                    },
                                                                                                );
                                                                                            if (
                                                                                                import.meta
                                                                                                    .env
                                                                                                    .DEV
                                                                                            )
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
                                                                                                    e
                                                                                                        .target
                                                                                                        .checked,
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
                                                                                        data-value={
                                                                                            option.value
                                                                                        }
                                                                                    />
                                                                                    <label
                                                                                        htmlFor={`${filterKey}-${option.value}`}
                                                                                        className={`${sidebar.filterCategory.label} truncate min-w-0 flex-1`}
                                                                                        onMouseEnter={(
                                                                                            e,
                                                                                        ) =>
                                                                                            handleSidebarItemMouseEnter(
                                                                                                e,
                                                                                                option.label,
                                                                                            )
                                                                                        }
                                                                                        onMouseLeave={
                                                                                            handleSidebarItemMouseLeave
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            option.label
                                                                                        }
                                                                                    </label>
                                                                                </div>
                                                                            );
                                                                        },
                                                                    )}
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
                                        clearTimeout(
                                            sidebarTooltipTimeoutRef.current,
                                        );
                                    }
                                    sidebarTooltipTimeoutRef.current =
                                        setTimeout(
                                            () => setShowSidebarTooltip(true),
                                            250,
                                        );
                                }}
                                onMouseLeave={() => {
                                    setShowSidebarToggle(false);
                                    setShowSidebarTooltip(false);
                                    if (sidebarTooltipTimeoutRef.current) {
                                        clearTimeout(
                                            sidebarTooltipTimeoutRef.current,
                                        );
                                        sidebarTooltipTimeoutRef.current = null;
                                    }
                                }}
                            >
                                <div className="relative group">
                                    <button
                                        className={`absolute w-6 h-12 flex items-center justify-center transition-transform duration-200 ${
                                            showSidebarToggle ||
                                            sidebarCollapsed
                                                ? "opacity-100"
                                                : "opacity-0 pointer-events-none"
                                        } ${
                                            showSidebarToggle
                                                ? "bg-white hover:bg-gray-50 border border-gray-300 shadow-sm"
                                                : "bg-transparent border border-transparent"
                                        }`}
                                        onClick={() =>
                                            setSidebarCollapsed(
                                                !sidebarCollapsed,
                                            )
                                        }
                                        style={{
                                            left: "7px",
                                            top: "16px",
                                            borderRadius: "0 4px 4px 0",
                                            position: "relative",
                                            transform:
                                                showSidebarToggle ||
                                                sidebarCollapsed
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
                                                transition:
                                                    "transform 200ms ease",
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
                                            {sidebarCollapsed
                                                ? "Show palette"
                                                : "Hide palette"}
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
                            <div className="w-full max-w-3xl lg:max-w-5xl mx-auto px-10 py-12">
                                {/* SQL Query Card */}
                                {showQuery && queryResult?.query && (
                                    <div
                                        className={cn(
                                            card.base,
                                            "mb-6 max-w-4xl",
                                        )}
                                    >
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
                                            <div
                                                className={cn(
                                                    card.body,
                                                    "bg-white",
                                                )}
                                            >
                                                <h3 className={card.title}>
                                                    Current SQL Query
                                                </h3>
                                                <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs font-mono overflow-x-auto whitespace-pre">
                                                    {queryResult.query}
                                                </pre>
                                                <p className="mt-2 text-xs text-gray-500 italic">
                                                    Edit
                                                    src/queries/dashboard-queries.js
                                                    to change this query
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Error Card */}
                                {queryResult?.error && (
                                    <div
                                        className={cn(
                                            card.base,
                                            "mb-6 max-w-4xl",
                                            error.card,
                                        )}
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
                                                <path
                                                    d="M12 8v4M12 16h.01"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                        </div>
                                        <div className={card.content}>
                                            <div
                                                className={cn(
                                                    card.body,
                                                    "bg-white",
                                                )}
                                            >
                                                <h3
                                                    className={cn(
                                                        card.title,
                                                        error.title,
                                                    )}
                                                >
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
                                                <path
                                                    d="M13 3v5a2 2 0 002 2h4"
                                                    stroke="#d1d5db"
                                                />
                                            </svg>
                                        </div>
                                        <div className={card.content}>
                                            <div
                                                className={cn(
                                                    card.body,
                                                    "bg-white p-4",
                                                )}
                                            >
                                                <div className="max-w-3xl">
                                                    <div className="text-sm text-nodered-gray-600 font-light leading-relaxed max-w-2xl">
                                                        <p className="mb-2">
                                                            Use the filters in
                                                            the left sidebar to
                                                            explore different
                                                            segments of the
                                                            community and what
                                                            they responded
                                                            regarding the
                                                            questions. Expand
                                                            the right sidebar to
                                                            see a table of
                                                            contents to quickly
                                                            navigate to a
                                                            specific question.
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
                                                    <ChoroplethMap
                                                        questionId="GpGjoO"
                                                        questionTitle="Country Selection"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "GpGjoO",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <HorizontalRatingsChart
                                                        questionId="ElR6d2"
                                                        questionTitle="How long have you been using Node-RED?"
                                                        filters={filters}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QuantitativeChart
                                                        questionId="VPeNQ6"
                                                        questionTitle="What is your primary purpose for using Node-RED?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "VPeNQ6",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <VerticalBarChart
                                                        questionId="joRz61"
                                                        questionTitle="What size organization do you work with?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "joRz61",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QuantitativeChart
                                                        questionId="2AWoaM"
                                                        questionTitle="What industry are you in?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "2AWoaM",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <VerticalBarChart
                                                        questionId="P9xr1x"
                                                        questionTitle="How much influence do you have in choosing automation tools?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "P9xr1x",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QuantitativeChart
                                                        questionId="rO4YaX"
                                                        questionTitle="What do you use Node-RED for?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "rO4YaX",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QuantitativeChart
                                                        questionId="476OJ5"
                                                        questionTitle="Where do you typically run Node-RED?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "476OJ5",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <VerticalBarChart
                                                        questionId="xDqzMk"
                                                        questionTitle="What's your programming experience level?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "xDqzMk",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <RatingsChart
                                                        questionId="qGrzG5"
                                                        questionTitle="Overall satisfaction with Node-RED?"
                                                        filters={filters}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* Section 2: Early Satisfaction & Perception (Questions 11-25) */}
                                            <div className="my-12 space-y-12">
                                                <div className="grid grid-cols-1 gap-12">
                                                    <RatingsChart
                                                        questionId="QRZ4R1"
                                                        questionTitle="How up-to-date does Node-RED look and feel?"
                                                        filters={filters}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <RatingsChart
                                                        questionId="RoNgoj"
                                                        questionTitle="Does Node-RED look and feel professional?"
                                                        filters={filters}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <RatingsChart
                                                        questionId="erJzrQ"
                                                        questionTitle="How engaging does the Node-RED community feel?"
                                                        filters={filters}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <MatrixChart
                                                        questionId="OX2gBp"
                                                        questionTitle="Which devices do you use for these Node-RED tasks?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "OX2gBp",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <DeviceSatisfactionGrid
                                                        filters={filters}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QuantitativeChart
                                                        questionId="ZO7ede"
                                                        questionTitle="How did you first discover Node-RED?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "ZO7ede",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <HorizontalRatingsChart
                                                        questionId="qGrzbg"
                                                        questionTitle="How long did it take to feel comfortable with Node-RED?"
                                                        filters={filters}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <VerticalBarChart
                                                        questionId="ZO7eJB"
                                                        questionTitle="Do you use Node-RED in production systems/professionally?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "ZO7eJB",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <HorizontalRatingsChart
                                                        questionId="ZO7eO5"
                                                        questionTitle="How many Node-RED instances do you run/manage?"
                                                        filters={filters}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <VerticalBarChart
                                                        questionId="kG2v5Z"
                                                        questionTitle="How complex are your typical Node-RED configurations?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "kG2v5Z",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <UnderstandingRatingsGrid
                                                        filters={filters}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />

                                                    {/* Community Channels Explanation Card */}
                                                    <div className={card.base}>
                                                        <div
                                                            className={
                                                                card.iconSection
                                                            }
                                                        >
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
                                                            {/* Header - matching qualitative sections */}
                                                            <div className="px-4 py-3 border-b border-gray-200 bg-white">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center justify-between">
                                                                            <div>
                                                                                <h3 className="text-lg font-semibold text-nodered-gray-700">
                                                                                    What
                                                                                    helps
                                                                                    you
                                                                                    learn/troubleshoot
                                                                                    Node-RED?
                                                                                </h3>
                                                                            </div>
                                                                            {/* Respondent Count Badge - matching qualitative style */}
                                                                            {sectionCounts.section1 && (
                                                                                <div className="flex items-center gap-1 text-sm flex-shrink-0">
                                                                                    <span className="text-gray-600 font-bold">
                                                                                        {
                                                                                            sectionCounts
                                                                                                .section1
                                                                                                .filtered
                                                                                        }
                                                                                    </span>
                                                                                    <span className="text-gray-500 hidden sm:inline">
                                                                                        respondents
                                                                                    </span>
                                                                                    <span className="text-gray-500 sm:hidden">
                                                                                        /
                                                                                        {
                                                                                            sectionCounts
                                                                                                .section1
                                                                                                .total
                                                                                        }
                                                                                    </span>
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
                                                                            <strong>
                                                                                Key
                                                                                Metrics:
                                                                            </strong>
                                                                        </p>
                                                                        <ul className="list-disc pl-5 space-y-1">
                                                                            <li>
                                                                                <strong>
                                                                                    Reach:
                                                                                </strong>{" "}
                                                                                Percentage
                                                                                of
                                                                                survey
                                                                                respondents
                                                                                who
                                                                                selected
                                                                                the
                                                                                channel
                                                                                as
                                                                                helpful
                                                                            </li>
                                                                            <li>
                                                                                <strong>
                                                                                    Quality:
                                                                                </strong>{" "}
                                                                                Average
                                                                                helpfulness
                                                                                grade
                                                                                given
                                                                                by
                                                                                those
                                                                                who
                                                                                use
                                                                                the
                                                                                channel
                                                                            </li>
                                                                        </ul>
                                                                        <p className="font-medium">
                                                                            <strong>
                                                                                Opportunity
                                                                                Metrics:
                                                                            </strong>
                                                                        </p>
                                                                        <ul className="list-disc pl-5 space-y-1">
                                                                            <li>
                                                                                <strong>
                                                                                    Quality
                                                                                    Gap
                                                                                    Opportunity:
                                                                                </strong>{" "}
                                                                                Where
                                                                                quality
                                                                                improvements
                                                                                would
                                                                                create
                                                                                the
                                                                                most
                                                                                value
                                                                                due
                                                                                to
                                                                                existing
                                                                                reach
                                                                            </li>
                                                                            <li>
                                                                                <strong>
                                                                                    Reach
                                                                                    Gap
                                                                                    Opportunity:
                                                                                </strong>{" "}
                                                                                Where
                                                                                expanding
                                                                                reach
                                                                                would
                                                                                create
                                                                                the
                                                                                most
                                                                                value
                                                                                due
                                                                                to
                                                                                existing
                                                                                quality
                                                                            </li>
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                                {/* Data Table - Full Width at Top */}
                                                                <div
                                                                    className={cn(
                                                                        card.base,
                                                                        "my-6",
                                                                    )}
                                                                >
                                                                    <div
                                                                        className={
                                                                            card.iconSection
                                                                        }
                                                                    >
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
                                                                            <line
                                                                                x1="3"
                                                                                y1="9"
                                                                                x2="21"
                                                                                y2="9"
                                                                            />
                                                                            <line
                                                                                x1="3"
                                                                                y1="15"
                                                                                x2="21"
                                                                                y2="15"
                                                                            />
                                                                            <line
                                                                                x1="9"
                                                                                y1="9"
                                                                                x2="9"
                                                                                y2="21"
                                                                            />
                                                                            <line
                                                                                x1="15"
                                                                                y1="9"
                                                                                x2="15"
                                                                                y2="21"
                                                                            />
                                                                        </svg>
                                                                    </div>
                                                                    <div
                                                                        className={
                                                                            card.content
                                                                        }
                                                                    >
                                                                        <div
                                                                            className={cn(
                                                                                card.body,
                                                                                "bg-white p-0 overflow-hidden",
                                                                            )}
                                                                        >
                                                                            {hasData ? (
                                                                                <div
                                                                                    className={
                                                                                        table.wrapper
                                                                                    }
                                                                                >
                                                                                    <table
                                                                                        className={
                                                                                            table.base
                                                                                        }
                                                                                    >
                                                                                        <thead className="bg-[#f3f3f3] border-b border-gray-300">
                                                                                            <tr>
                                                                                                {columns.map(
                                                                                                    (
                                                                                                        col,
                                                                                                        index,
                                                                                                    ) => {
                                                                                                        let headerText =
                                                                                                            col
                                                                                                                .replace(
                                                                                                                    /_/g,
                                                                                                                    " ",
                                                                                                                )
                                                                                                                .replace(
                                                                                                                    /\b\w/g,
                                                                                                                    (
                                                                                                                        c,
                                                                                                                    ) =>
                                                                                                                        c.toUpperCase(),
                                                                                                                );

                                                                                                        if (
                                                                                                            index ===
                                                                                                            0
                                                                                                        ) {
                                                                                                            headerText =
                                                                                                                "Channel";
                                                                                                        } else if (
                                                                                                            headerText ===
                                                                                                            "Reach %"
                                                                                                        ) {
                                                                                                            headerText =
                                                                                                                "Reach";
                                                                                                        } else if (
                                                                                                            headerText ===
                                                                                                            "Quality %"
                                                                                                        ) {
                                                                                                            headerText =
                                                                                                                "Quality";
                                                                                                        }

                                                                                                        const numericCols =
                                                                                                            [
                                                                                                                "count",
                                                                                                                "score",
                                                                                                                "percentage",
                                                                                                                "pct",
                                                                                                                "rating",
                                                                                                                "answered",
                                                                                                                "total",
                                                                                                            ];
                                                                                                        const _isNumeric =
                                                                                                            numericCols.some(
                                                                                                                (
                                                                                                                    term,
                                                                                                                ) =>
                                                                                                                    col
                                                                                                                        .toLowerCase()
                                                                                                                        .includes(
                                                                                                                            term,
                                                                                                                        ),
                                                                                                            );

                                                                                                        return (
                                                                                                            <th
                                                                                                                key={
                                                                                                                    col
                                                                                                                }
                                                                                                                className={cn(
                                                                                                                    index ===
                                                                                                                        0
                                                                                                                        ? table.headerCellFirst
                                                                                                                        : table.headerCellNumeric,
                                                                                                                )}
                                                                                                            >
                                                                                                                {
                                                                                                                    headerText
                                                                                                                }
                                                                                                            </th>
                                                                                                        );
                                                                                                    },
                                                                                                )}
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody
                                                                                            className={
                                                                                                table.body
                                                                                            }
                                                                                        >
                                                                                            {queryResult.data.map(
                                                                                                (
                                                                                                    row,
                                                                                                    rowIndex,
                                                                                                ) => (
                                                                                                    <tr
                                                                                                        key={
                                                                                                            rowIndex
                                                                                                        }
                                                                                                        className={
                                                                                                            table.row
                                                                                                        }
                                                                                                    >
                                                                                                        {columns.map(
                                                                                                            (
                                                                                                                col,
                                                                                                                colIndex,
                                                                                                            ) => {
                                                                                                                const numericCols =
                                                                                                                    [
                                                                                                                        "count",
                                                                                                                        "score",
                                                                                                                        "percentage",
                                                                                                                        "pct",
                                                                                                                        "rating",
                                                                                                                        "answered",
                                                                                                                        "total",
                                                                                                                        "impact",
                                                                                                                    ];
                                                                                                                const _isNumeric =
                                                                                                                    numericCols.some(
                                                                                                                        (
                                                                                                                            term,
                                                                                                                        ) =>
                                                                                                                            col
                                                                                                                                .toLowerCase()
                                                                                                                                .includes(
                                                                                                                                    term,
                                                                                                                                ),
                                                                                                                    ) &&
                                                                                                                    typeof row[
                                                                                                                        col
                                                                                                                    ] ===
                                                                                                                        "number";

                                                                                                                return (
                                                                                                                    <td
                                                                                                                        key={
                                                                                                                            col
                                                                                                                        }
                                                                                                                        className={cn(
                                                                                                                            colIndex ===
                                                                                                                                0
                                                                                                                                ? table.cellFirst
                                                                                                                                : table.cell,
                                                                                                                        )}
                                                                                                                    >
                                                                                                                        {formatCellValue(
                                                                                                                            row[
                                                                                                                                col
                                                                                                                            ],
                                                                                                                        )}
                                                                                                                    </td>
                                                                                                                );
                                                                                                            },
                                                                                                        )}
                                                                                                    </tr>
                                                                                                ),
                                                                                            )}
                                                                                        </tbody>
                                                                                    </table>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="text-center text-gray-500 py-8">
                                                                                    <p>
                                                                                        No
                                                                                        data
                                                                                        to
                                                                                        display
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Charts in 2x2 Grid */}
                                                                {hasData && (
                                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
                                                                        {/* Left Column - Quality Charts */}
                                                                        <div className="space-y-6">
                                                                            {/* Quality Gap Chart */}
                                                                            <div
                                                                                className={
                                                                                    card.base
                                                                                }
                                                                            >
                                                                                <div
                                                                                    className={
                                                                                        card.iconSection
                                                                                    }
                                                                                >
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
                                                                                <div
                                                                                    className={
                                                                                        card.content
                                                                                    }
                                                                                >
                                                                                    <div
                                                                                        className={cn(
                                                                                            card.body,
                                                                                            "bg-white",
                                                                                        )}
                                                                                    >
                                                                                        <h3
                                                                                            className={cn(
                                                                                                card.title,
                                                                                                "hidden",
                                                                                            )}
                                                                                        >
                                                                                            Quality
                                                                                            Gap
                                                                                            Opportunities
                                                                                        </h3>
                                                                                        <div className="min-h-[300px]">
                                                                                            <BarChart
                                                                                                data={
                                                                                                    queryResult.data
                                                                                                }
                                                                                                title="Quality Gap Opportunities"
                                                                                                subtitle="Where would a quality increase create the most value because of already existing reach"
                                                                                                valueColumn="Quality Gap Opp"
                                                                                                color={
                                                                                                    corePalette.amber
                                                                                                }
                                                                                                isMirrored={
                                                                                                    false
                                                                                                }
                                                                                                animationScale={
                                                                                                    !isSingleColumn
                                                                                                        ? 1.02
                                                                                                        : 1.01
                                                                                                }
                                                                                                showRespondentsInTooltip={
                                                                                                    false
                                                                                                }
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Quality Ranking Chart */}
                                                                            <div
                                                                                className={
                                                                                    card.base
                                                                                }
                                                                            >
                                                                                <div
                                                                                    className={
                                                                                        card.iconSection
                                                                                    }
                                                                                >
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
                                                                                <div
                                                                                    className={
                                                                                        card.content
                                                                                    }
                                                                                >
                                                                                    <div
                                                                                        className={cn(
                                                                                            card.body,
                                                                                            "bg-white",
                                                                                        )}
                                                                                    >
                                                                                        <h3
                                                                                            className={cn(
                                                                                                card.title,
                                                                                                "hidden",
                                                                                            )}
                                                                                        >
                                                                                            Quality
                                                                                            Ranking
                                                                                        </h3>
                                                                                        <div className="min-h-[300px]">
                                                                                            <BarChart
                                                                                                data={
                                                                                                    queryResult.data
                                                                                                }
                                                                                                title="Quality Ranking"
                                                                                                subtitle="Ratt of channel depicted in percentage"
                                                                                                valueColumn="Quality %"
                                                                                                color={
                                                                                                    corePalette.terracotta
                                                                                                }
                                                                                                isMirrored={
                                                                                                    false
                                                                                                }
                                                                                                animationScale={
                                                                                                    !isSingleColumn
                                                                                                        ? 1.02
                                                                                                        : 1.01
                                                                                                }
                                                                                                showRespondentsInTooltip={
                                                                                                    false
                                                                                                }
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Right Column - Reach Charts (Mirrored) */}
                                                                        <div className="space-y-6">
                                                                            {/* Reach Gap Chart */}
                                                                            <div
                                                                                className={
                                                                                    card.base
                                                                                }
                                                                            >
                                                                                <div
                                                                                    className={
                                                                                        card.iconSection
                                                                                    }
                                                                                >
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
                                                                                <div
                                                                                    className={
                                                                                        card.content
                                                                                    }
                                                                                >
                                                                                    <div
                                                                                        className={cn(
                                                                                            card.body,
                                                                                            "bg-white",
                                                                                        )}
                                                                                    >
                                                                                        <h3
                                                                                            className={cn(
                                                                                                card.title,
                                                                                                "hidden",
                                                                                            )}
                                                                                        >
                                                                                            Reach
                                                                                            Gap
                                                                                            Opportunities
                                                                                        </h3>
                                                                                        <div className="min-h-[300px]">
                                                                                            <BarChart
                                                                                                data={
                                                                                                    queryResult.data
                                                                                                }
                                                                                                title="Reach Gap Opportunities"
                                                                                                subtitle="Where would a reach increase create the most value because of already existing quality"
                                                                                                valueColumn="Reach Gap Opp"
                                                                                                color={
                                                                                                    corePalette.bronze
                                                                                                }
                                                                                                isMirrored={
                                                                                                    isSingleColumn
                                                                                                        ? false
                                                                                                        : true
                                                                                                }
                                                                                                animationScale={
                                                                                                    !isSingleColumn
                                                                                                        ? 1.02
                                                                                                        : 1.01
                                                                                                }
                                                                                                showRespondentsInTooltip={
                                                                                                    false
                                                                                                }
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* Reach Ranking Chart */}
                                                                            <div
                                                                                className={
                                                                                    card.base
                                                                                }
                                                                            >
                                                                                <div
                                                                                    className={
                                                                                        card.iconSection
                                                                                    }
                                                                                >
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
                                                                                <div
                                                                                    className={
                                                                                        card.content
                                                                                    }
                                                                                >
                                                                                    <div
                                                                                        className={cn(
                                                                                            card.body,
                                                                                            "bg-white",
                                                                                        )}
                                                                                    >
                                                                                        <h3
                                                                                            className={cn(
                                                                                                card.title,
                                                                                                "hidden",
                                                                                            )}
                                                                                        >
                                                                                            Reach
                                                                                            Ranking
                                                                                        </h3>
                                                                                        <div className="min-h-[300px]">
                                                                                            <BarChart
                                                                                                data={
                                                                                                    queryResult.data
                                                                                                }
                                                                                                title="Reach Ranking"
                                                                                                subtitle="Percentage of people that have stated that the channel is helpful to them"
                                                                                                valueColumn="Reach %"
                                                                                                color={
                                                                                                    corePalette.slate
                                                                                                }
                                                                                                isMirrored={
                                                                                                    isSingleColumn
                                                                                                        ? false
                                                                                                        : true
                                                                                                }
                                                                                                animationScale={
                                                                                                    !isSingleColumn
                                                                                                        ? 1.02
                                                                                                        : 1.01
                                                                                                }
                                                                                                showRespondentsInTooltip={
                                                                                                    false
                                                                                                }
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Individual Channel Ratings */}
                                                                {/* Combined Channel Ratings */}
                                                                <div className="my-6">
                                                                    <ChannelRatingsGrid
                                                                        filters={
                                                                            filters
                                                                        }
                                                                        wasmService={
                                                                            wasmService
                                                                        }
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section 3: Frustrations & Design Evaluation (Questions 26-50) */}
                                            <div className="my-12 space-y-12">
                                                <div className="grid grid-cols-1 gap-12">
                                                    <QuantitativeChart
                                                        questionId="kGozGZ"
                                                        questionTitle="What frustrates you most about Node-RED?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "kGozGZ",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-12">
                                                    <QualitativeAnalysis
                                                        questionId="gqlzqJ"
                                                        questionText="What's the single biggest improvement Node-RED needs?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "gqlzqJ",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 gap-6">
                                                    <DesignChangesRatingsGrid
                                                        filters={filters}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QualityComparisonRatingsGrid
                                                        filters={filters}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* Section 4: Learning, Dashboards & Sharing (Questions 39-50) */}
                                            <div className="my-12 space-y-12">
                                                <div className="space-y-12">
                                                    <QualitativeAnalysis
                                                        questionId="6KlPdY"
                                                        questionText="What would make learning Node-RED easier for newcomers?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "6KlPdY",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 gap-12">
                                                    <QuantitativeChart
                                                        questionId="erJzEk"
                                                        questionTitle="Have you built Node-RED dashboards with any of these solutions"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "erJzEk",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-12">
                                                    <QualitativeAnalysis
                                                        questionId="joRj6E"
                                                        questionText="What has made it difficult to create or use Node-RED dashboards?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "joRj6E",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 gap-12">
                                                    <RatingsChart
                                                        questionId="2AWpaV"
                                                        questionTitle="How often do you share flows with others?"
                                                        filters={filters}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-12">
                                                    <QualitativeAnalysis
                                                        questionId="xDqAMo"
                                                        questionText="What makes sharing flows difficult for you?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "xDqAMo",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QualitativeAnalysis
                                                        questionId="RoNAMl"
                                                        questionText="How would you wish sharing flows would work?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "RoNAMl",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 gap-12">
                                                    <QuantitativeChart
                                                        questionId="089kZ6"
                                                        questionTitle="What customization capabilities are important to you?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "089kZ6",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QuantitativeChart
                                                        questionId="8LBr6x"
                                                        questionTitle="Do you have specific accessibility requirements?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "8LBr6x",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-12">
                                                    <QualitativeAnalysis
                                                        questionId="oRPqY1"
                                                        questionText="Why do you choose to use Node-RED over alternatives?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "oRPqY1",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 gap-12">
                                                    <QuantitativeChart
                                                        questionId="Dp8ax5"
                                                        questionTitle="What other automation tools do you use?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "Dp8ax5",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QuantitativeChart
                                                        questionId="Ma4BjA"
                                                        questionTitle="Which missing features would most improve your Node-RED experience?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "Ma4BjA",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QuantitativeChart
                                                        questionId="NXjP0j"
                                                        questionTitle="Is there anything that holds back production adoption?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "NXjP0j",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {/* Section 5: Future, AI & Final Thoughts (Questions 51-63) */}
                                            <div className="my-12 space-y-12">
                                                <div className="space-y-12">
                                                    <QualitativeAnalysis
                                                        questionId="P9xrbb"
                                                        questionText="If you could change one thing about Node-RED, what would it be?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "P9xrbb",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QualitativeAnalysis
                                                        questionId="oRPZqP"
                                                        questionText="What aspects of Node-RED must be changed or be updated?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "oRPZqP",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QualitativeAnalysis
                                                        questionId="XoaQoz"
                                                        questionText="What aspects of Node-RED should ideally never change?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "XoaQoz",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QualitativeAnalysis
                                                        questionId="JlPolX"
                                                        questionText="What do you love most about Node-RED right now?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "JlPolX",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QualitativeAnalysis
                                                        questionId="y4Q14d"
                                                        questionText="What makes Node-RED feel like 'Node-RED' to you?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "y4Q14d",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QualitativeAnalysis
                                                        questionId="OX26KK"
                                                        questionText="What would draw you away from Node-RED?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "OX26KK",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QualitativeAnalysis
                                                        questionId="xDqzdv"
                                                        questionText="What expectations do you have regarding AI for Node-RED?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "xDqzdv",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                    <QualitativeAnalysis
                                                        questionId="a4LqQX"
                                                        questionText="Why is that? (AI follow-up)"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "a4LqQX",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-12">
                                                    <QualitativeAnalysis
                                                        questionId="ElR6ZN"
                                                        questionText="Any concerns about Node-RED's future direction?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "ElR6ZN",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 gap-12">
                                                    <RatingsChart
                                                        questionId="rO4YJv"
                                                        questionTitle="How likely are you to recommend Node-RED to a colleague?"
                                                        filters={filters}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                                <div className="space-y-12">
                                                    <QualitativeAnalysis
                                                        questionId="476O9O"
                                                        questionText="Any final thoughts or suggestions?"
                                                        filters={filters}
                                                        color={getChartColor(
                                                            "476O9O",
                                                        )}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 gap-12">
                                                    <RatingsChart
                                                        questionId="a4RvP9"
                                                        questionTitle="How would you rate this survey (1-5)?"
                                                        filters={filters}
                                                        ratingScale={5}
                                                        wasmService={
                                                            wasmService
                                                        }
                                                    />
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
                            onToggle={() => setTocCollapsed(!tocCollapsed)}
                            onItemMouseEnter={handleTocItemMouseEnter}
                            onItemMouseLeave={handleTocItemMouseLeave}
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
                                        document.removeEventListener(
                                            "mousemove",
                                            handleMouseMove,
                                        );
                                        document.removeEventListener(
                                            "mouseup",
                                            handleMouseUp,
                                        );
                                    };

                                    document.addEventListener(
                                        "mousemove",
                                        handleMouseMove,
                                    );
                                    document.addEventListener(
                                        "mouseup",
                                        handleMouseUp,
                                    );
                                }}
                            />
                        )}

                        {/* ToC Item Tooltip */}
                        {tocItemTooltip.show && (
                            <div
                                className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl pointer-events-none text-sm border border-gray-600"
                                style={{
                                    left: `${tocItemTooltip.x}px`,
                                    top: `${tocItemTooltip.y}px`,
                                    maxWidth: "300px",
                                    transform: "translate(-100%, -50%)",
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
                        className="min-h-screen flex items-center bg-white border-t"
                        style={{ borderTopColor: "#bbbbbb" }}
                    >
                        <div className="max-w-5xl mx-auto px-6 py-12">
                            <div className="text-left mb-12">
                                <h2 className="text-3xl font-bold text-nodered-gray-800 mb-4">
                                    Thank You
                                </h2>
                                <p className="text-lg text-nodered-gray-600 max-w-3xl">
                                    Thank you for your interest in the Node-RED
                                    survey results and participation with the
                                    community of Node-RED.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
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
                                            , ensuring neutral governance,
                                            long-term sustainability, and a
                                            commitment to open source values.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold text-nodered-red-500 mb-3">
                                            Get Involved
                                        </h3>
                                        <p className="text-nodered-gray-600 leading-relaxed">
                                            The Node-RED community thrives on
                                            collaboration. Whether you're a
                                            developer, designer, or user, your
                                            voice matters. Join the conversation
                                            on our{" "}
                                            <a
                                                href="https://discourse.nodered.org"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-nodered-red-500 hover:text-nodered-red-700 underline"
                                            >
                                                forum
                                            </a>{" "}
                                            or consider contributing on{" "}
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
                                                    src="/openjs-foundation-logo.svg"
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
                                                and Node-RED contributors. All
                                                rights reserved. The{" "}
                                                <a
                                                    href="https://openjsf.org"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                                                >
                                                    OpenJS Foundation
                                                </a>{" "}
                                                has registered trademarks and
                                                uses trademarks. For a list of
                                                trademarks of the{" "}
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
                                                . Trademarks and logos not
                                                indicated on the{" "}
                                                <a
                                                    href="https://trademark-list.openjsf.org"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                                                >
                                                    list of OpenJS Foundation
                                                    trademarks
                                                </a>{" "}
                                                are trademarks™ or registered®
                                                trademarks of their respective
                                                holders. Use of them does not
                                                imply any affiliation with or
                                                endorsement by them.
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
                                                <span className="text-nodered-gray-400">
                                                    |
                                                </span>
                                                <a
                                                    href="https://terms-of-use.openjsf.org"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                                                >
                                                    Terms of Use
                                                </a>
                                                <span className="text-nodered-gray-400">
                                                    |
                                                </span>
                                                <a
                                                    href="https://privacy-policy.openjsf.org"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                                                >
                                                    Privacy Policy
                                                </a>
                                                <span className="text-nodered-gray-400">
                                                    |
                                                </span>
                                                <a
                                                    href="https://bylaws.openjsf.org"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-nodered-gray-600 hover:text-nodered-red-500 underline"
                                                >
                                                    OpenJS Foundation Bylaws
                                                </a>
                                                <span className="text-nodered-gray-400">
                                                    |
                                                </span>
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
    );
}

export default App;
