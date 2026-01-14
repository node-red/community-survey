/**
 * Reusable Tailwind class compositions for Node-RED themed components
 * All styling uses Tailwind utilities - no custom CSS required
 */

// Button styles
export const button = {
  base: "inline-flex items-center px-4 py-2 text-nr-base font-medium text-center no-underline border rounded-nr cursor-pointer transition-all duration-150 ease-in-out outline-none shadow-sm",
  primary:
    "bg-nodered-red-500 text-white border-nodered-red-500 hover:bg-nodered-red-700 hover:border-nodered-red-700",
  secondary:
    "bg-white text-nodered-gray-700 border-gray-400 hover:bg-nodered-gray-50 hover:border-gray-500",
  ghost:
    "bg-transparent text-nodered-gray-600 border-transparent shadow-none hover:bg-nodered-gray-100 hover:text-nodered-gray-700",
  deploy:
    "bg-[#444] text-[#999] border-none px-3 py-1 text-sm hover:bg-[#555] hover:text-[#aaa] transition-colors",
  menu: "bg-[#444] text-[#999] px-2 py-1 text-sm hover:bg-[#555] hover:text-[#aaa] transition-colors",
  focus:
    "focus:outline-none focus:ring-2 focus:ring-nodered-blue-500 focus:ring-offset-2",
};

// Panel styles
export const panel = {
  base: "bg-white border border-nodered-gray-200 rounded-nr-lg shadow-nr",
  header:
    "px-4 py-3 bg-nodered-gray-50 border-b border-nodered-gray-200 rounded-t-nr-lg",
  body: "p-4",
};

// Card styles (Node-RED comment node style)
export const card = {
  base: "bg-white border border-gray-300 rounded-[5px] flex overflow-hidden transition-all duration-200 shadow-sm",
  iconSection:
    "flex items-center justify-center w-8 min-w-[32px] text-sm text-gray-600 bg-gray-100 border-r border-gray-300",
  content: "flex-1 flex flex-col min-w-0 overflow-hidden relative",
  header: "h-1 rounded-t-nr-lg",
  body: "flex-1",
  title: "mb-2 text-nr-base font-semibold text-nodered-gray-700",
};

// Input styles
export const input = {
  base: "block w-full px-3 py-2 text-nr-base leading-tight text-nodered-gray-700 bg-white border border-nodered-gray-300 rounded-nr transition-all duration-150 ease-in-out",
  focus:
    "focus:border-nodered-blue-500 focus:outline-none focus:ring-1 focus:ring-nodered-blue-500/30",
};

// Checkbox styles
export const checkbox = {
  base: "w-4 h-4 accent-nodered-red-500 rounded-sm",
};

// Badge styles
export const badge = {
  base: "inline-flex items-center px-2 py-0.5 text-nr-xs font-medium leading-tight rounded-full",
  primary: "bg-nodered-red-500 text-white",
  secondary: "bg-nodered-gray-200 text-nodered-gray-700",
};

// Header styles - matching Node-RED exactly
export const header = {
  base: "h-12 bg-black border-b-2 border-[#c02020] relative flex items-center justify-between pl-5 pr-8 text-white",
  logo: "w-6 h-6 bg-nodered-red-500 rounded-sm flex items-center justify-center text-[10px] font-bold text-white",
  title: "text-sm font-normal text-white",
  userCount: "flex items-center gap-1 text-sm ml-auto",
  filterBadge: "ml-2 bg-[#c12120] text-white px-2 py-0.5 rounded text-xs",
};

// Sidebar styles (Node-RED palette)
export const sidebar = {
  base: "bg-[#f3f3f3] fixed top-12 left-0 bottom-0 overflow-y-auto z-10 flex flex-col border-r border-[#bbbbbb]",
  header: "bg-white border-[#bbb] border-b px-[5px] py-[5px]",
  filterWrapper: "relative",
  filterIcon:
    "absolute left-[8px] top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-[#999] pointer-events-none",
  filter:
    "w-full pl-[28px] pr-[8px] py-[3px] h-[24px] rounded-[3px] text-[13px] bg-white text-[#333] placeholder-[#999] focus:outline focus:outline-2 focus:outline-[#3b82f6] focus:border-[#3b82f6]",
  content: "p-0 flex-1 overflow-y-auto",
  category: {
    base: "border-b border-[#ddd]",
    header:
      "bg-[#d9d9d9] border-b border-[#ddd] px-[5px] py-[3px] cursor-pointer flex items-center text-[13px] font-bold text-[#333] hover:bg-[#ddd] select-none",
    toggle:
      "w-2 h-2 mr-1 transition-transform duration-200 after:content-['▶'] after:text-[#333] after:text-[10px] after:leading-none",
    toggleExpanded: "rotate-90",
    content: "bg-white",
    contentCollapsed: "hidden",
  },
  item: "px-[7px] py-[2px] text-[11px] text-[#666] hover:bg-[#f3f3f3] last:border-b-0",
  preset: {
    wrapper: "px-4 py-2 bg-white sticky top-0 z-10 border-b border-[#ddd]",
    button:
      "w-full px-[7px] py-[3px] border border-[#999] rounded-[3px] bg-white text-[#333] text-[11px] cursor-pointer transition-all duration-150 hover:bg-[#f0f0f0] hover:border-[#6baed6] focus:outline focus:outline-2 focus:outline-[#3b82f6]",
    buttonActive: "!bg-[#6baed6] !text-white !border-[#5ba0c5] hover:!bg-[#5ba0c5]",
  },
  filterCategory: {
    base: "pb-2 bg-white rounded-nr",
    header:
      "border-b border-t border-gray-200 px-3 py-2 text-[11px] font-medium text-gray-600 uppercase flex justify-between items-center relative",
    badge:
      "bg-gray-600 text-white px-1.5 py-0.5 rounded-full text-[10px] font-normal",
    badgeActive: "bg-nodered-red-500",
    options: "", // No scrolling - show all options
    option:
      "px-3 py-1 text-[11px] text-gray-600 flex items-center gap-1.5 hover:bg-gray-50",
    checkbox: "w-3 h-3 accent-nodered-red-500",
    label:
      "cursor-pointer",
  },
  filterHeader: {
    base: "border-b border-gray-200 px-3 py-2 text-[11px] font-medium text-gray-600 uppercase flex justify-between items-center relative",
    inputData:
      "border-b border-gray-200 px-3 py-2 text-[11px] font-medium text-gray-600 uppercase flex justify-between items-center relative",
    processing:
      "border-b border-gray-200 px-3 py-2 text-[11px] font-medium text-gray-600 uppercase flex justify-between items-center relative",
    connection:
      "border-b border-gray-200 px-3 py-2 text-[11px] font-medium text-gray-600 uppercase flex justify-between items-center relative",
  },
  clearButton:
    "w-full px-[7px] py-[3px] bg-white border border-[#c12120] rounded-[3px] text-[#c12120] text-[11px] font-bold cursor-pointer transition-all duration-150 uppercase hover:bg-[#c12120] hover:text-white focus:outline focus:outline-2 focus:outline-[#3b82f6]",
};

// Main content area
export const mainContent = {
  base: "", // No constraints - expands naturally with content
  grid: "nr-editor-grid", // Node-RED grid pattern background
};

// Collapsible styles
export const collapsible = {
  header:
    "flex items-center justify-between px-4 py-3 bg-nodered-gray-50 border-b border-nodered-gray-200 cursor-pointer transition-colors duration-150 hover:bg-nodered-gray-100",
  chevron: "transition-transform duration-200",
  chevronExpanded: "rotate-90",
};

// User counter styles
export const userCounter = {
  base: "bg-white border border-[#d1d1d1] rounded-nr p-3 mb-2 flex justify-between items-center shadow-sm",
  main: "flex items-baseline gap-1",
  number: "text-lg font-bold text-nodered-red-500",
  label: "text-xs text-gray-600 font-medium uppercase",
  badge:
    "bg-nodered-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium",
  badgeText: "whitespace-nowrap",
};

// Table styles
export const table = {
  wrapper: "overflow-x-auto overflow-y-hidden",
  base: "w-full min-w-[800px] text-xs",
  header: "bg-gray-50 border-b border-gray-300",
  headerCell:
    "px-3 py-2 text-left font-medium text-gray-500 uppercase whitespace-nowrap",
  headerCellNumeric:
    "px-3 py-2 text-right font-medium text-gray-500 uppercase whitespace-nowrap",
  body: "bg-white divide-y divide-gray-200",
  row: "hover:bg-gray-50",
  cell: "px-3 py-2 whitespace-nowrap text-gray-600 min-w-[80px] text-right font-mono",
  cellNumeric: "text-right font-mono",
  cellFirst:
    "px-3 py-2 whitespace-nowrap font-medium text-gray-900 min-w-[80px] text-left font-sans",
  headerCellFirst:
    "px-3 py-2 text-left font-medium text-gray-500 uppercase whitespace-nowrap",
};

// Chart container styles (comprehensive chart styling)
export const chart = {
  // Basic container and titles
  container: "bg-white p-4 w-full flex flex-col",
  title: "mb-1 text-xs font-semibold text-nodered-gray-700 leading-4 m-0",
  subtitle:
    "mb-4 text-[10px] text-nodered-gray-500 font-normal leading-tight m-0",
  bars: "flex flex-col gap-2 flex-1",

  // Standard bar chart styles
  barRow: "flex items-center w-full h-6 relative",
  barWrapper: "w-full relative flex items-center h-6",
  bar: "h-6 transition-all duration-200 ease-in-out relative min-w-[6px] flex items-center justify-between px-2 text-white shadow-nr",
  barHover: "hover:opacity-90 hover:shadow-nr-lg",
  barSmall: "", // Keep bars responsive based on percentage width
  barNoData: "w-[6px] min-w-[6px] max-w-[6px] opacity-60 p-0",

  // Bar text styles
  barLabel:
    "text-xs text-white font-normal uppercase tracking-[0.2px] whitespace-nowrap flex-1 min-w-0 overflow-hidden text-ellipsis",
  barPercentage:
    "text-xs font-bold text-white ml-auto pl-2 flex-shrink-0",
  barPercentageAlone:
    "text-xs font-bold text-white pl-2 flex-shrink-0",
  barLabelOutside:
    "text-xs text-nodered-gray-600 font-normal uppercase tracking-[0.2px] ml-2 whitespace-nowrap overflow-hidden text-ellipsis",
  barPercentageOutside:
    "text-xs font-bold text-nodered-gray-700 ml-2 flex-shrink-0 font-mono",

  // Mirrored bar chart styles
  barRowMirrored: "flex items-center w-full h-6 relative",
  barWrapperMirrored:
    "w-full relative flex items-center justify-end h-6",
  barMirrored:
    "h-6 transition-all duration-200 ease-in-out relative ml-auto min-w-[6px] flex items-center justify-end gap-2 px-2 text-white shadow-nr",
  barLabelMirrored:
    "text-xs text-white font-normal uppercase tracking-[0.2px] whitespace-nowrap text-right order-2 flex-1 min-w-0 overflow-hidden text-ellipsis [direction:rtl]",
  barPercentageMirrored:
    "text-xs font-bold text-white order-1 flex-shrink-0",
  barPercentageMirroredAlone:
    "text-xs font-bold text-white pr-2 flex-shrink-0 mr-auto",
  barLabelOutsideMirrored:
    "text-xs text-nodered-gray-600 font-normal uppercase tracking-[0.2px] mr-2 text-right whitespace-nowrap overflow-hidden text-ellipsis",
  barPercentageOutsideMirrored:
    "text-xs font-bold text-nodered-gray-700 mr-2 flex-shrink-0 font-mono text-right whitespace-nowrap",
};

// Utility function to combine classes conditionally
export const cn = (...classes) => {
  return classes.filter(Boolean).join(" ");
};

// Responsive utilities
export const responsive = {
  hideOnMobile: "hidden sm:block",
  hideOnDesktop: "sm:hidden",
  stackOnMobile: "flex flex-col sm:flex-row",
  fullWidthMobile: "w-full sm:w-auto",
};

// Loading states
export const loading = {
  container: "flex justify-center items-center h-screen bg-nodered-gray-100",
  panel:
    "text-center p-6 min-w-[320px] bg-white border border-nodered-gray-200 rounded-nr-lg shadow-nr",
  title: "text-lg mb-3 text-nodered-gray-700 font-medium",
  spinner:
    "animate-spin w-4 h-4 border-2 border-nodered-red-500 border-t-transparent rounded-full",
  text: "text-nr-sm text-nodered-gray-500",
};

// Error states
export const error = {
  card: "border-red-200 bg-red-50",
  title: "text-red-700",
  content:
    "bg-white p-3 rounded text-xs text-red-800 border border-red-200 overflow-x-auto",
};
