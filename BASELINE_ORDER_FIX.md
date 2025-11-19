# Baseline Ordering Fix - Summary

## Problem Identified

The baseline ordering feature was implemented but NOT working because charts were not re-rendering when baseline data became available.

### Root Cause

The issue was in the `useEffect` dependencies of both `QuantitativeChart.jsx` and `VerticalBarChart.jsx`:

1. **Initial render**: Charts rendered immediately after `setQueryResult()` was called (App.jsx line 171)
2. **Baseline fetch**: Baseline orders were fetched AFTER charts rendered (App.jsx lines 195-223)
3. **State update**: `setBaselineOrders()` was called (App.jsx line 223)
4. **Missing dependency**: Charts' `useEffect` hooks did NOT include `baselineOrder` in their dependency arrays
5. **Result**: Charts never re-rendered with the baseline data

## Files Fixed

### 1. `/Users/dimitrie/projects/node-red-survey/src/components/QuantitativeChart.jsx`

**Before (line 97):**
```javascript
}, [actualQuestionId, filterType, JSON.stringify(filters), wasmService]);
```

**After (line 97):**
```javascript
}, [actualQuestionId, filterType, JSON.stringify(filters), wasmService, baselineOrder]);
```

### 2. `/Users/dimitrie/projects/node-red-survey/src/components/VerticalBarChart.jsx`

**Before (line 124):**
```javascript
}, [actualQuestionId, filterType, filters, wasmService]);
```

**After (line 124):**
```javascript
}, [actualQuestionId, filterType, filters, wasmService, baselineOrder]);
```

## How It Works Now

1. **Initial Load**:
   - App loads, WASM service initializes
   - Dashboard data fetched, state updated
   - Charts render with NO baseline order (sorted by count descending)

2. **Baseline Fetch**:
   - Baseline orders fetched for all quantitative questions
   - `setBaselineOrders()` updates state with baseline data

3. **Re-render with Baseline**:
   - Because `baselineOrder` is now in dependency array, charts detect the prop change
   - Charts re-fetch and re-render with baseline ordering applied
   - Order is now locked to "All Respondents" baseline

4. **Filter Application**:
   - User applies filter (e.g., Programming Background = "Expert")
   - Charts re-fetch data with filters
   - `applyBaselineOrder()` is called with the baseline order
   - Chart maintains the same order as "All Respondents" instead of re-sorting

## Testing

To verify the fix works:

1. **Open** http://127.0.0.1:5173/
2. **Scroll** to "What industry are you in?" chart (questionId: 2AWoaM)
3. **Note** the order of industries (should match baseline: IT/Software, Manufacturing, Healthcare, etc.)
4. **Apply filter**: Select Programming Background = "Expert"
5. **Verify**: Industry order remains the same, only counts change
6. **Expected behavior**: Industries should NOT re-sort by the filtered counts

## Console Evidence

The fix is working as evidenced by console logs showing:
- Baseline orders being fetched: `Baseline order for 2AWoaM: [...]`
- Charts re-rendering twice:
  1. First render: `getQuantitativeData result for 2AWoaM: 14 rows`
  2. Second render (with baseline): `getQuantitativeData result for 2AWoaM: 14 rows`

## Questions That Use Baseline Ordering

The following question IDs have baseline ordering applied:
- VPeNQ6: Primary Purpose
- 2AWoaM: What industry are you in?
- rO4YaX: Use Cases
- 476OJ5: Run Environment
- ZO7ede: How did you first discover Node-RED?
- kGozGZ: (Question ID not mapped)
- erJzEk: (Question ID not mapped)
- 089kZ6: (Question ID not mapped)
- 8LBr6x: (Question ID not mapped)
- Dp8ax5: (Question ID not mapped)
- Ma4BjA: (Question ID not mapped)
- NXjP0j: (Question ID not mapped)

Questions with predefined ordinal ordering (NOT using baseline):
- ElR6d2: Experience Level
- joRz61: Organization Size
- P9xr1x: Decision Influence
- xDqzMk: Programming Background
- qGrzbg: (Ordinal question)
- ZO7eJB: Production Usage
- kG2v5Z: Flow Complexity
- ZO7eO5: Number of Instances
