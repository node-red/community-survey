/**
 * Dashboard SQL Queries Module
 * 
 * This module contains all SQL queries used in the dashboard as JavaScript template strings.
 * Each query includes {{WHERE_CLAUSE}} placeholders where filters should be applied.
 * 
 * Usage:
 * - getDashboardQuery() - Main dashboard query for all respondents
 * - getSegmentQuery(segment) - Get SQL for specific segment analysis
 * - getFilteredAnalysisQuery() - Get filtered analysis query with custom filters
 */

// Main dashboard query for all respondents
export const getDashboardQuery = () => `-- Master Dashboard Query with Segment Selector
-- This query will show all resources, even those with zero usage

WITH respondent_count AS (
    -- Count all respondents who answered the learning resources question
    SELECT COUNT(DISTINCT respondent_id) as total
    FROM survey.responses r
    WHERE question_id = 'NXjPAO'
    {{WHERE_CLAUSE}}
),
all_resources AS (
    SELECT channel FROM (
        SELECT 'Official Website & Node-RED documentation' as channel UNION ALL
        SELECT 'Node-RED Flow library' UNION ALL
        SELECT 'YouTube' UNION ALL
        SELECT 'Community forum (Discourse)' UNION ALL
        SELECT 'Stack Overflow' UNION ALL
        SELECT 'AI assistance (ChatGPT/etc)' UNION ALL
        SELECT 'GitHub' UNION ALL
        SELECT 'Node-RED academy' UNION ALL
        SELECT 'Node-RED Cookbook' UNION ALL
        SELECT 'Reddit' UNION ALL
        SELECT 'Discord' UNION ALL
        SELECT 'Slack' UNION ALL
        SELECT 'Facebook Group' UNION ALL
        SELECT 'Blog posts and articles' UNION ALL
        SELECT 'Home Assistant Forum' UNION ALL
        SELECT 'Colleague or mentor guidance' UNION ALL
        SELECT 'Books or formal courses'
    )
),
usage_data AS (
    -- SQL equivalent of analyze_learning_resources function
    WITH individual_resources AS (
        SELECT 
            r.respondent_id,
            TRIM(unnest(try_cast(r.answer_text AS JSON[]))::varchar, '"') as channel
        FROM survey.responses r
        WHERE r.question_id = 'NXjPAO'
        AND r.answer_text != '[]'
        {{WHERE_CLAUSE}}
    ),
    -- Count usage for each resource
    resource_counts AS (
        SELECT 
            channel,
            COUNT(DISTINCT respondent_id) as selected_count,
            ROUND(100.0 * COUNT(DISTINCT respondent_id) / (SELECT total FROM respondent_count), 2) as reach_pct
        FROM individual_resources
        WHERE channel IS NOT NULL AND channel != ''
        GROUP BY channel
    ),
    -- Map resources to their specific rating questions
    resource_rating_mapping AS (
        SELECT 
            ir.respondent_id,
            ir.channel,
            -- Map each respondent's resource usage to corresponding ratings
            CASE 
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ') 
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo' LIMIT 1)
                ELSE NULL
            END as rating
        FROM individual_resources ir
    ),
    -- Calculate statistics for each resource
    resource_stats AS (
        SELECT 
            rc.channel,
            rc.selected_count,
            rc.reach_pct,
            COUNT(rrm.rating) as follow_up_answered,
            ROUND(AVG(rrm.rating::DOUBLE), 2) as avg_rating,
            COALESCE(MIN(rrm.rating)::varchar || '-' || MAX(rrm.rating)::varchar, NULL) as rating_range,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 5 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as quality_pct,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 6 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as top_ratings_pct
        FROM resource_counts rc
        LEFT JOIN resource_rating_mapping rrm ON rc.channel = rrm.channel
        GROUP BY rc.channel, rc.selected_count, rc.reach_pct
    )
    SELECT 
        channel,
        selected_count,
        reach_pct,
        follow_up_answered,
        avg_rating,
        rating_range,
        quality_pct,
        top_ratings_pct,
        -- Impact score: weighted combination of reach and quality (reach 60%, quality 40%)
        CASE 
            WHEN quality_pct IS NOT NULL THEN
                ROUND((reach_pct * 0.6 + quality_pct * 0.4), 1)
            ELSE NULL
        END as impact_score
    FROM resource_stats
)
SELECT 
    'All Respondents (' || (SELECT total FROM respondent_count) || ' users)' as "Segment",
    ar.channel as "Resource",
    COALESCE(CAST(ROUND(ud.reach_pct, 0) AS INTEGER) || '%', '0%') as "Reach %",
    COALESCE(ud.selected_count || '/' || (SELECT total FROM respondent_count), '0/' || (SELECT total FROM respondent_count)) as "Users",
    COALESCE(CAST(ROUND(ud.avg_rating, 0) AS INTEGER) || '/7', '-') as "Rating",
    COALESCE(CAST(ROUND(ud.quality_pct, 0) AS INTEGER) || '%', '-') as "Quality %",
    COALESCE(CAST(ROUND(ud.top_ratings_pct, 0) AS INTEGER) || '%', '-') as "Top Ratings",
    COALESCE(CAST(ROUND(ud.impact_score, 0) AS INTEGER) || '%', '-') as "Impact",
    
    -- Efficiency metrics (quality per reach ratio)
    CASE 
        WHEN ud.quality_pct IS NOT NULL AND ud.reach_pct > 0 
        THEN CAST(ROUND(ud.quality_pct / ud.reach_pct, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Efficiency",
    
    CASE 
        WHEN ud.quality_pct IS NOT NULL AND ud.quality_pct > 0
        THEN CAST(ROUND(ud.reach_pct / ud.quality_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Effectiveness",
    
    -- Opportunity metrics (as percentages)
    CASE 
        WHEN ud.quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - ud.quality_pct) * ud.reach_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Quality Gap Opp",
    
    CASE 
        WHEN ud.quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - ud.reach_pct) * ud.quality_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Reach Gap Opp"
    
FROM all_resources ar
LEFT JOIN usage_data ud ON ar.channel = ud.channel
ORDER BY COALESCE(ud.selected_count, 0) DESC, ar.channel;`;

// Segment-specific queries
const segmentQueries = {
    professional_builders: `-- Professional Solution Builders Segment
-- Skilled professionals building complex Node-RED solutions in production
WITH segment_users AS (
    SELECT DISTINCT r.respondent_id
    FROM responses r
    WHERE EXISTS (
        -- Purpose: Professional developer OR System architect OR Enterprise user
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'VPeNQ6' 
        AND (answer_text LIKE '%Professional developer%' 
             OR answer_text LIKE '%System architect%'
             OR answer_text LIKE '%Enterprise user%')
    )
    AND EXISTS (
        -- Production use: Yes, any level
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'ZO7eJB' 
        AND (answer_text LIKE '%Yes%' OR answer_text LIKE '%production%')
    )
    AND EXISTS (
        -- Programming: Intermediate or higher
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'xDqzMk' 
        AND (answer_text LIKE '%Intermediate%' 
             OR answer_text LIKE '%Advanced%'
             OR answer_text LIKE '%Expert%')
    )
    AND EXISTS (
        -- Complexity: 20+ nodes
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'kG2v5Z' 
        AND (answer_text LIKE '%20-49 nodes%' 
             OR answer_text LIKE '%50+ nodes%'
             OR answer_text LIKE '%100+ nodes%'
             OR answer_text LIKE '%Enterprise%')
    )
    {{WHERE_CLAUSE}}
),
segment_count AS (
    SELECT COUNT(*) as total FROM segment_users
),
segment_resources AS (
    -- SQL equivalent of analyze_segment_learning_resources function for this segment
    WITH individual_resources AS (
        SELECT 
            r.respondent_id,
            TRIM(unnest(try_cast(r.answer_text AS JSON[]))::varchar, '"') as channel
        FROM survey.responses r
        JOIN segment_users su ON r.respondent_id = su.respondent_id
        WHERE r.question_id = 'NXjPAO'
        AND r.answer_text != '[]'
    ),
    -- Count usage for each resource within the segment
    resource_counts AS (
        SELECT 
            channel,
            COUNT(DISTINCT respondent_id) as selected_count,
            ROUND(100.0 * COUNT(DISTINCT respondent_id) / (SELECT total FROM segment_count), 2) as reach_pct
        FROM individual_resources
        WHERE channel IS NOT NULL AND channel != ''
        GROUP BY channel
    ),
    -- Map resources to their specific rating questions for segment users
    resource_rating_mapping AS (
        SELECT 
            ir.respondent_id,
            ir.channel,
            -- Map each respondent's resource usage to corresponding ratings
            CASE 
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ') 
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo' LIMIT 1)
                ELSE NULL
            END as rating
        FROM individual_resources ir
    ),
    -- Calculate statistics for each resource within the segment
    resource_stats AS (
        SELECT 
            rc.channel,
            rc.selected_count,
            rc.reach_pct,
            COUNT(rrm.rating) as follow_up_answered,
            ROUND(AVG(rrm.rating::DOUBLE), 2) as avg_rating,
            COALESCE(MIN(rrm.rating)::varchar || '-' || MAX(rrm.rating)::varchar, NULL) as rating_range,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 5 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as quality_pct,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 6 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as top_ratings_pct
        FROM resource_counts rc
        LEFT JOIN resource_rating_mapping rrm ON rc.channel = rrm.channel
        GROUP BY rc.channel, rc.selected_count, rc.reach_pct
    )
    SELECT 
        channel,
        selected_count,
        reach_pct,
        follow_up_answered,
        avg_rating,
        rating_range,
        quality_pct,
        top_ratings_pct,
        -- Impact score: weighted combination of reach and quality (reach 60%, quality 40%)
        CASE 
            WHEN quality_pct IS NOT NULL THEN
                ROUND((reach_pct * 0.6 + quality_pct * 0.4), 1)
            ELSE NULL
        END as impact_score
    FROM resource_stats
)
SELECT 
    'Professional Solution Builders (' || (SELECT total FROM segment_count) || ' users)' as "Segment",
    channel as "Resource",
    CAST(ROUND(reach_pct, 0) AS INTEGER) || '%' as "Reach %",
    selected_count || '/' || (SELECT total FROM segment_count) as "Users",
    COALESCE(ROUND(avg_rating, 2) || '/7', '-') as "Rating",
    COALESCE(CAST(ROUND(quality_pct, 0) AS INTEGER) || '%', '-') as "Quality %",
    COALESCE(CAST(ROUND(top_ratings_pct, 0) AS INTEGER) || '%', '-') as "Top Ratings",
    COALESCE(CAST(ROUND(impact_score, 0) AS INTEGER) || '%', '-') as "Impact",
    CASE 
        WHEN quality_pct IS NOT NULL AND reach_pct > 0 
        THEN CAST(ROUND(quality_pct / reach_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Efficiency",
    CASE 
        WHEN quality_pct IS NOT NULL AND quality_pct > 0
        THEN CAST(ROUND(reach_pct / quality_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Effectiveness",
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - quality_pct) * reach_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Quality Gap",
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - reach_pct) * quality_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Reach Gap"
FROM segment_resources
ORDER BY selected_count DESC;`,

    enterprise_production_champions: `-- Enterprise Production Champions Segment
-- High-value decision makers deploying Node-RED at scale in production
WITH segment_users AS (
    SELECT DISTINCT r.respondent_id
    FROM responses r
    WHERE EXISTS (
        -- Extensively using in production
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'ZO7eJB' 
        AND answer_text = '["Yes, extensively in production systems"]'
    )
    AND EXISTS (
        -- Large organization (500+ employees)
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'joRz61' 
        AND answer_text = '["500+ people"]'
    )
    AND EXISTS (
        -- Decision maker or strong influencer
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'P9xr1x' 
        AND (answer_text = '["I make the final decision"]' 
             OR answer_text = '["I strongly influence the decision"]')
    )
    AND EXISTS (
        -- Complex deployments (50+ nodes)
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'kG2v5Z' 
        AND (answer_text LIKE '%50+ nodes%' 
             OR answer_text LIKE '%100+ nodes%' 
             OR answer_text LIKE '%Enterprise%')
    )
    {{WHERE_CLAUSE}}
),
segment_count AS (
    SELECT COUNT(*) as total FROM segment_users
),
segment_resources AS (
    -- SQL equivalent of analyze_segment_learning_resources function for this segment
    WITH individual_resources AS (
        SELECT 
            r.respondent_id,
            TRIM(unnest(try_cast(r.answer_text AS JSON[]))::varchar, '"') as channel
        FROM survey.responses r
        JOIN segment_users su ON r.respondent_id = su.respondent_id
        WHERE r.question_id = 'NXjPAO'
        AND r.answer_text != '[]'
    ),
    -- Count usage for each resource within the segment
    resource_counts AS (
        SELECT 
            channel,
            COUNT(DISTINCT respondent_id) as selected_count,
            ROUND(100.0 * COUNT(DISTINCT respondent_id) / (SELECT total FROM segment_count), 2) as reach_pct
        FROM individual_resources
        WHERE channel IS NOT NULL AND channel != ''
        GROUP BY channel
    ),
    -- Map resources to their specific rating questions for segment users
    resource_rating_mapping AS (
        SELECT 
            ir.respondent_id,
            ir.channel,
            -- Map each respondent's resource usage to corresponding ratings
            CASE 
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ') 
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo' LIMIT 1)
                ELSE NULL
            END as rating
        FROM individual_resources ir
    ),
    -- Calculate statistics for each resource within the segment
    resource_stats AS (
        SELECT 
            rc.channel,
            rc.selected_count,
            rc.reach_pct,
            COUNT(rrm.rating) as follow_up_answered,
            ROUND(AVG(rrm.rating::DOUBLE), 2) as avg_rating,
            COALESCE(MIN(rrm.rating)::varchar || '-' || MAX(rrm.rating)::varchar, NULL) as rating_range,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 5 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as quality_pct,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 6 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as top_ratings_pct
        FROM resource_counts rc
        LEFT JOIN resource_rating_mapping rrm ON rc.channel = rrm.channel
        GROUP BY rc.channel, rc.selected_count, rc.reach_pct
    )
    SELECT 
        channel,
        selected_count,
        reach_pct,
        follow_up_answered,
        avg_rating,
        rating_range,
        quality_pct,
        top_ratings_pct,
        -- Impact score: weighted combination of reach and quality (reach 60%, quality 40%)
        CASE 
            WHEN quality_pct IS NOT NULL THEN
                ROUND((reach_pct * 0.6 + quality_pct * 0.4), 1)
            ELSE NULL
        END as impact_score
    FROM resource_stats
)
SELECT 
    'Enterprise Production Champions (' || (SELECT total FROM segment_count) || ' users)' as "Segment",
    channel as "Resource",
    CAST(ROUND(reach_pct, 0) AS INTEGER) || '%' as "Reach %",
    selected_count || '/' || (SELECT total FROM segment_count) as "Users",
    COALESCE(ROUND(avg_rating, 2) || '/7', '-') as "Rating",
    COALESCE(CAST(ROUND(quality_pct, 0) AS INTEGER) || '%', '-') as "Quality %",
    COALESCE(CAST(ROUND(top_ratings_pct, 0) AS INTEGER) || '%', '-') as "Top Ratings",
    COALESCE(CAST(ROUND(impact_score, 0) AS INTEGER) || '%', '-') as "Impact",
    CASE 
        WHEN quality_pct IS NOT NULL AND reach_pct > 0 
        THEN CAST(ROUND(quality_pct / reach_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Efficiency",
    CASE 
        WHEN quality_pct IS NOT NULL AND quality_pct > 0
        THEN CAST(ROUND(reach_pct / quality_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Effectiveness",
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - quality_pct) * reach_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Quality Gap",
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - reach_pct) * quality_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Reach Gap"
FROM segment_resources
ORDER BY selected_count DESC;`,

    industrial_automation: `-- Industrial Automation Professionals Segment
-- Manufacturing and industrial professionals using Node-RED in production environments
WITH segment_users AS (
    SELECT DISTINCT r.respondent_id
    FROM responses r
    WHERE EXISTS (
        -- Industry: Manufacturing/Industrial OR Energy/Utilities
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = '2AWoaM' 
        AND (answer_text LIKE '%Manufacturing%' 
             OR answer_text LIKE '%Industrial%'
             OR answer_text LIKE '%Energy%'
             OR answer_text LIKE '%Utilities%')
    )
    AND EXISTS (
        -- Production use: Any production usage
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'ZO7eJB' 
        AND (answer_text LIKE '%production%' OR answer_text LIKE '%Yes%')
    )
    AND EXISTS (
        -- Purpose: Professional developer OR System architect
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'VPeNQ6' 
        AND (answer_text LIKE '%Professional developer%' 
             OR answer_text LIKE '%System architect%')
    )
    AND EXISTS (
        -- Experience: 2+ years
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'ElR6d2' 
        AND (answer_text LIKE '%2-5 years%' 
             OR answer_text LIKE '%5+ years%'
             OR answer_text LIKE '%More than 5%')
    )
    {{WHERE_CLAUSE}}
),
segment_count AS (
    SELECT COUNT(*) as total FROM segment_users
),
segment_resources AS (
    -- SQL equivalent of analyze_segment_learning_resources function for this segment
    WITH individual_resources AS (
        SELECT 
            r.respondent_id,
            TRIM(unnest(try_cast(r.answer_text AS JSON[]))::varchar, '"') as channel
        FROM survey.responses r
        JOIN segment_users su ON r.respondent_id = su.respondent_id
        WHERE r.question_id = 'NXjPAO'
        AND r.answer_text != '[]'
    ),
    -- Count usage for each resource within the segment
    resource_counts AS (
        SELECT 
            channel,
            COUNT(DISTINCT respondent_id) as selected_count,
            ROUND(100.0 * COUNT(DISTINCT respondent_id) / (SELECT total FROM segment_count), 2) as reach_pct
        FROM individual_resources
        WHERE channel IS NOT NULL AND channel != ''
        GROUP BY channel
    ),
    -- Map resources to their specific rating questions for segment users
    resource_rating_mapping AS (
        SELECT 
            ir.respondent_id,
            ir.channel,
            -- Map each respondent's resource usage to corresponding ratings
            CASE 
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ') 
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo' LIMIT 1)
                ELSE NULL
            END as rating
        FROM individual_resources ir
    ),
    -- Calculate statistics for each resource within the segment
    resource_stats AS (
        SELECT 
            rc.channel,
            rc.selected_count,
            rc.reach_pct,
            COUNT(rrm.rating) as follow_up_answered,
            ROUND(AVG(rrm.rating::DOUBLE), 2) as avg_rating,
            COALESCE(MIN(rrm.rating)::varchar || '-' || MAX(rrm.rating)::varchar, NULL) as rating_range,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 5 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as quality_pct,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 6 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as top_ratings_pct
        FROM resource_counts rc
        LEFT JOIN resource_rating_mapping rrm ON rc.channel = rrm.channel
        GROUP BY rc.channel, rc.selected_count, rc.reach_pct
    )
    SELECT 
        channel,
        selected_count,
        reach_pct,
        follow_up_answered,
        avg_rating,
        rating_range,
        quality_pct,
        top_ratings_pct,
        -- Impact score: weighted combination of reach and quality (reach 60%, quality 40%)
        CASE 
            WHEN quality_pct IS NOT NULL THEN
                ROUND((reach_pct * 0.6 + quality_pct * 0.4), 1)
            ELSE NULL
        END as impact_score
    FROM resource_stats
)
SELECT 
    'Industrial Automation Professionals (' || (SELECT total FROM segment_count) || ' users)' as "Segment",
    channel as "Resource",
    CAST(ROUND(reach_pct, 0) AS INTEGER) || '%' as "Reach %",
    selected_count || '/' || (SELECT total FROM segment_count) as "Users",
    COALESCE(ROUND(avg_rating, 2) || '/7', '-') as "Rating",
    COALESCE(CAST(ROUND(quality_pct, 0) AS INTEGER) || '%', '-') as "Quality %",
    COALESCE(CAST(ROUND(top_ratings_pct, 0) AS INTEGER) || '%', '-') as "Top Ratings",
    COALESCE(CAST(ROUND(impact_score, 0) AS INTEGER) || '%', '-') as "Impact",
    CASE 
        WHEN quality_pct IS NOT NULL AND reach_pct > 0 
        THEN CAST(ROUND(quality_pct / reach_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Efficiency",
    CASE 
        WHEN quality_pct IS NOT NULL AND quality_pct > 0
        THEN CAST(ROUND(reach_pct / quality_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Effectiveness",
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - quality_pct) * reach_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Quality Gap",
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - reach_pct) * quality_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Reach Gap"
FROM segment_resources
ORDER BY selected_count DESC;`,

    smb_leaders: `-- SMB Automation Leaders Segment
-- Small to medium business leaders implementing Node-RED solutions
WITH segment_users AS (
    SELECT DISTINCT r.respondent_id
    FROM responses r
    WHERE EXISTS (
        -- Organization: 11-500 employees
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'joRz61' 
        AND (answer_text LIKE '%11-50%' 
             OR answer_text LIKE '%51-500%')
    )
    AND EXISTS (
        -- Production: Yes OR would like to
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'ZO7eJB' 
        AND (answer_text LIKE '%Yes%' 
             OR answer_text LIKE '%production%'
             OR answer_text LIKE '%would like to%')
    )
    AND EXISTS (
        -- Purpose: Any professional
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'VPeNQ6' 
        AND answer_text NOT LIKE '%Hobbyist%'
        AND answer_text NOT LIKE '%Personal%'
    )
    AND EXISTS (
        -- Experience: 2+ years
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'ElR6d2' 
        AND (answer_text LIKE '%2-5 years%' 
             OR answer_text LIKE '%5+ years%'
             OR answer_text LIKE '%More than 5%')
    )
    {{WHERE_CLAUSE}}
),
segment_count AS (
    SELECT COUNT(*) as total FROM segment_users
),
segment_resources AS (
    -- SQL equivalent of analyze_segment_learning_resources function for this segment
    WITH individual_resources AS (
        SELECT 
            r.respondent_id,
            TRIM(unnest(try_cast(r.answer_text AS JSON[]))::varchar, '"') as channel
        FROM survey.responses r
        JOIN segment_users su ON r.respondent_id = su.respondent_id
        WHERE r.question_id = 'NXjPAO'
        AND r.answer_text != '[]'
    ),
    -- Count usage for each resource within the segment
    resource_counts AS (
        SELECT 
            channel,
            COUNT(DISTINCT respondent_id) as selected_count,
            ROUND(100.0 * COUNT(DISTINCT respondent_id) / (SELECT total FROM segment_count), 2) as reach_pct
        FROM individual_resources
        WHERE channel IS NOT NULL AND channel != ''
        GROUP BY channel
    ),
    -- Map resources to their specific rating questions for segment users
    resource_rating_mapping AS (
        SELECT 
            ir.respondent_id,
            ir.channel,
            -- Map each respondent's resource usage to corresponding ratings
            CASE 
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ') 
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo' LIMIT 1)
                ELSE NULL
            END as rating
        FROM individual_resources ir
    ),
    -- Calculate statistics for each resource within the segment
    resource_stats AS (
        SELECT 
            rc.channel,
            rc.selected_count,
            rc.reach_pct,
            COUNT(rrm.rating) as follow_up_answered,
            ROUND(AVG(rrm.rating::DOUBLE), 2) as avg_rating,
            COALESCE(MIN(rrm.rating)::varchar || '-' || MAX(rrm.rating)::varchar, NULL) as rating_range,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 5 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as quality_pct,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 6 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as top_ratings_pct
        FROM resource_counts rc
        LEFT JOIN resource_rating_mapping rrm ON rc.channel = rrm.channel
        GROUP BY rc.channel, rc.selected_count, rc.reach_pct
    )
    SELECT 
        channel,
        selected_count,
        reach_pct,
        follow_up_answered,
        avg_rating,
        rating_range,
        quality_pct,
        top_ratings_pct,
        -- Impact score: weighted combination of reach and quality (reach 60%, quality 40%)
        CASE 
            WHEN quality_pct IS NOT NULL THEN
                ROUND((reach_pct * 0.6 + quality_pct * 0.4), 1)
            ELSE NULL
        END as impact_score
    FROM resource_stats
)
SELECT 
    'SMB Automation Leaders (' || (SELECT total FROM segment_count) || ' users)' as "Segment",
    channel as "Resource",
    CAST(ROUND(reach_pct, 0) AS INTEGER) || '%' as "Reach %",
    selected_count || '/' || (SELECT total FROM segment_count) as "Users",
    COALESCE(ROUND(avg_rating, 2) || '/7', '-') as "Rating",
    COALESCE(CAST(ROUND(quality_pct, 0) AS INTEGER) || '%', '-') as "Quality %",
    COALESCE(CAST(ROUND(top_ratings_pct, 0) AS INTEGER) || '%', '-') as "Top Ratings",
    COALESCE(CAST(ROUND(impact_score, 0) AS INTEGER) || '%', '-') as "Impact",
    CASE 
        WHEN quality_pct IS NOT NULL AND reach_pct > 0 
        THEN CAST(ROUND(quality_pct / reach_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Efficiency",
    CASE 
        WHEN quality_pct IS NOT NULL AND quality_pct > 0
        THEN CAST(ROUND(reach_pct / quality_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Effectiveness",
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - quality_pct) * reach_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Quality Gap",
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - reach_pct) * quality_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Reach Gap"
FROM segment_resources
ORDER BY selected_count DESC;`,

    decision_influencers: `-- Technical Decision Influencers Segment
-- Key influencers and decision makers in professional organizations
WITH segment_users AS (
    SELECT DISTINCT r.respondent_id
    FROM responses r
    WHERE EXISTS (
        -- Influence: "I strongly influence" OR "I make the final decision"
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'P9xr1x' 
        AND (answer_text = '["I strongly influence the decision"]' 
             OR answer_text = '["I make the final decision"]')
    )
    AND EXISTS (
        -- Purpose: Any professional purpose, NOT just hobbyist
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'VPeNQ6' 
        AND answer_text NOT LIKE '%Hobbyist%'
        AND answer_text NOT LIKE '%Personal%'
    )
    AND EXISTS (
        -- Organization: 11+ employees
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'joRz61' 
        AND (answer_text LIKE '%11-50%' 
             OR answer_text LIKE '%51-500%'
             OR answer_text LIKE '%500+%')
    )
    AND EXISTS (
        -- Complexity: Medium or higher (20+ nodes)
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'kG2v5Z' 
        AND (answer_text LIKE '%20-49 nodes%' 
             OR answer_text LIKE '%50+ nodes%'
             OR answer_text LIKE '%100+ nodes%'
             OR answer_text LIKE '%Enterprise%')
    )
    {{WHERE_CLAUSE}}
),
segment_count AS (
    SELECT COUNT(*) as total FROM segment_users
),
segment_resources AS (
    -- SQL equivalent of analyze_segment_learning_resources function for this segment
    WITH individual_resources AS (
        SELECT 
            r.respondent_id,
            TRIM(unnest(try_cast(r.answer_text AS JSON[]))::varchar, '"') as channel
        FROM survey.responses r
        JOIN segment_users su ON r.respondent_id = su.respondent_id
        WHERE r.question_id = 'NXjPAO'
        AND r.answer_text != '[]'
    ),
    -- Count usage for each resource within the segment
    resource_counts AS (
        SELECT 
            channel,
            COUNT(DISTINCT respondent_id) as selected_count,
            ROUND(100.0 * COUNT(DISTINCT respondent_id) / (SELECT total FROM segment_count), 2) as reach_pct
        FROM individual_resources
        WHERE channel IS NOT NULL AND channel != ''
        GROUP BY channel
    ),
    -- Map resources to their specific rating questions for segment users
    resource_rating_mapping AS (
        SELECT 
            ir.respondent_id,
            ir.channel,
            -- Map each respondent's resource usage to corresponding ratings
            CASE 
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ') 
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo' LIMIT 1)
                ELSE NULL
            END as rating
        FROM individual_resources ir
    ),
    -- Calculate statistics for each resource within the segment
    resource_stats AS (
        SELECT 
            rc.channel,
            rc.selected_count,
            rc.reach_pct,
            COUNT(rrm.rating) as follow_up_answered,
            ROUND(AVG(rrm.rating::DOUBLE), 2) as avg_rating,
            COALESCE(MIN(rrm.rating)::varchar || '-' || MAX(rrm.rating)::varchar, NULL) as rating_range,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 5 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as quality_pct,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 6 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as top_ratings_pct
        FROM resource_counts rc
        LEFT JOIN resource_rating_mapping rrm ON rc.channel = rrm.channel
        GROUP BY rc.channel, rc.selected_count, rc.reach_pct
    )
    SELECT 
        channel,
        selected_count,
        reach_pct,
        follow_up_answered,
        avg_rating,
        rating_range,
        quality_pct,
        top_ratings_pct,
        -- Impact score: weighted combination of reach and quality (reach 60%, quality 40%)
        CASE 
            WHEN quality_pct IS NOT NULL THEN
                ROUND((reach_pct * 0.6 + quality_pct * 0.4), 1)
            ELSE NULL
        END as impact_score
    FROM resource_stats
)
SELECT 
    'Technical Decision Influencers (' || (SELECT total FROM segment_count) || ' users)' as "Segment",
    channel as "Resource",
    CAST(ROUND(reach_pct, 0) AS INTEGER) || '%' as "Reach %",
    selected_count || '/' || (SELECT total FROM segment_count) as "Users",
    COALESCE(ROUND(avg_rating, 2) || '/7', '-') as "Rating",
    COALESCE(CAST(ROUND(quality_pct, 0) AS INTEGER) || '%', '-') as "Quality %",
    COALESCE(CAST(ROUND(top_ratings_pct, 0) AS INTEGER) || '%', '-') as "Top Ratings",
    COALESCE(CAST(ROUND(impact_score, 0) AS INTEGER) || '%', '-') as "Impact",
    CASE 
        WHEN quality_pct IS NOT NULL AND reach_pct > 0 
        THEN CAST(ROUND(quality_pct / reach_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Efficiency",
    CASE 
        WHEN quality_pct IS NOT NULL AND quality_pct > 0
        THEN CAST(ROUND(reach_pct / quality_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Effectiveness",
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - quality_pct) * reach_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Quality Gap",
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - reach_pct) * quality_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Reach Gap"
FROM segment_resources
ORDER BY selected_count DESC;`,

    emerging_adopters: `-- Emerging Enterprise Adopters Segment
-- Large organization users ready to move to production but haven't yet
WITH segment_users AS (
    SELECT DISTINCT r.respondent_id
    FROM responses r
    WHERE EXISTS (
        -- Production: "No, but I would like to"
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'ZO7eJB' 
        AND answer_text LIKE '%No, but I would like to%'
    )
    AND EXISTS (
        -- Organization: 50+ employees
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'joRz61' 
        AND (answer_text LIKE '%51-500%' 
             OR answer_text LIKE '%500+%')
    )
    AND EXISTS (
        -- Influence: Strong influence or decision maker
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'P9xr1x' 
        AND (answer_text = '["I strongly influence the decision"]' 
             OR answer_text = '["I make the final decision"]')
    )
    AND EXISTS (
        -- Experience: 1+ years
        SELECT 1 FROM survey.responses 
        WHERE respondent_id = r.respondent_id 
        AND question_id = 'ElR6d2' 
        AND (answer_text LIKE '%1-2 years%' 
             OR answer_text LIKE '%2-5 years%'
             OR answer_text LIKE '%5+ years%'
             OR answer_text LIKE '%More than 5%')
    )
    {{WHERE_CLAUSE}}
),
segment_count AS (
    SELECT COUNT(*) as total FROM segment_users
),
segment_resources AS (
    -- SQL equivalent of analyze_segment_learning_resources function for this segment
    WITH individual_resources AS (
        SELECT 
            r.respondent_id,
            TRIM(unnest(try_cast(r.answer_text AS JSON[]))::varchar, '"') as channel
        FROM survey.responses r
        JOIN segment_users su ON r.respondent_id = su.respondent_id
        WHERE r.question_id = 'NXjPAO'
        AND r.answer_text != '[]'
    ),
    -- Count usage for each resource within the segment
    resource_counts AS (
        SELECT 
            channel,
            COUNT(DISTINCT respondent_id) as selected_count,
            ROUND(100.0 * COUNT(DISTINCT respondent_id) / (SELECT total FROM segment_count), 2) as reach_pct
        FROM individual_resources
        WHERE channel IS NOT NULL AND channel != ''
        GROUP BY channel
    ),
    -- Map resources to their specific rating questions for segment users
    resource_rating_mapping AS (
        SELECT 
            ir.respondent_id,
            ir.channel,
            -- Map each respondent's resource usage to corresponding ratings
            CASE 
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGAdp' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ') 
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGVZZ' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGZaj' LIMIT 1)
                WHEN EXISTS(SELECT 1 FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo')
                    THEN (SELECT answer_text::INTEGER FROM survey.responses WHERE respondent_id = ir.respondent_id AND question_id = 'GpGbqo' LIMIT 1)
                ELSE NULL
            END as rating
        FROM individual_resources ir
    ),
    -- Calculate statistics for each resource within the segment
    resource_stats AS (
        SELECT 
            rc.channel,
            rc.selected_count,
            rc.reach_pct,
            COUNT(rrm.rating) as follow_up_answered,
            ROUND(AVG(rrm.rating::DOUBLE), 2) as avg_rating,
            COALESCE(MIN(rrm.rating)::varchar || '-' || MAX(rrm.rating)::varchar, NULL) as rating_range,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 5 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as quality_pct,
            ROUND(100.0 * SUM(CASE WHEN rrm.rating >= 6 THEN 1 ELSE 0 END) / NULLIF(COUNT(rrm.rating), 0), 1) as top_ratings_pct
        FROM resource_counts rc
        LEFT JOIN resource_rating_mapping rrm ON rc.channel = rrm.channel
        GROUP BY rc.channel, rc.selected_count, rc.reach_pct
    )
    SELECT 
        channel,
        selected_count,
        reach_pct,
        follow_up_answered,
        avg_rating,
        rating_range,
        quality_pct,
        top_ratings_pct,
        -- Impact score: weighted combination of reach and quality (reach 60%, quality 40%)
        CASE 
            WHEN quality_pct IS NOT NULL THEN
                ROUND((reach_pct * 0.6 + quality_pct * 0.4), 1)
            ELSE NULL
        END as impact_score
    FROM resource_stats
)
SELECT 
    'Emerging Enterprise Adopters (' || (SELECT total FROM segment_count) || ' users)' as "Segment",
    channel as "Resource",
    CAST(ROUND(reach_pct, 0) AS INTEGER) || '%' as "Reach %",
    selected_count || '/' || (SELECT total FROM segment_count) as "Users",
    COALESCE(ROUND(avg_rating, 2) || '/7', '-') as "Rating",
    COALESCE(CAST(ROUND(quality_pct, 0) AS INTEGER) || '%', '-') as "Quality %",
    COALESCE(CAST(ROUND(top_ratings_pct, 0) AS INTEGER) || '%', '-') as "Top Ratings",
    COALESCE(CAST(ROUND(impact_score, 0) AS INTEGER) || '%', '-') as "Impact",
    CASE 
        WHEN quality_pct IS NOT NULL AND reach_pct > 0 
        THEN CAST(ROUND(quality_pct / reach_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Efficiency",
    CASE 
        WHEN quality_pct IS NOT NULL AND quality_pct > 0
        THEN CAST(ROUND(reach_pct / quality_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Effectiveness",
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - quality_pct) * reach_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Quality Gap",
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - reach_pct) * quality_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Reach Gap"
FROM segment_resources
ORDER BY selected_count DESC;`
};

// Get segment query by segment key
export const getSegmentQuery = (segment) => {
    const validSegments = Object.keys(segmentQueries);
    if (!validSegments.includes(segment)) {
        throw new Error(`Invalid segment: ${segment}. Valid segments: ${validSegments.join(', ')}`);
    }
    return segmentQueries[segment];
};

// Get list of available segments
export const getAvailableSegments = () => {
    return Object.keys(segmentQueries);
};

// Filtered analysis query with custom filter placeholders
export const getFilteredAnalysisQuery = () => `-- Filtered Analysis SQL
-- This query dynamically filters respondents based on multiple criteria
-- Uses placeholder values that will be replaced by the backend

WITH 
-- Map of resource names to their follow-up question IDs
resource_mapping AS (
    SELECT * FROM (VALUES
        ('Official Website & Node-RED documentation', 'QRZ4AX'),
        ('Node-RED Flow library', '9Zk4d5'),
        ('YouTube', 'qGr8Bk'),
        ('Community forum (Discourse)', 'WRWqAk'),
        ('Stack Overflow', 'vDZ8Xv'),
        ('AI assistance (ChatGPT/etc)', 'kGo8b1'),
        ('GitHub', '6Kl6DP'),
        ('Node-RED academy', 'erJzBl'),
        ('Node-RED Cookbook', 'a4LpOv'),
        ('Reddit', 'BpyJE5'),
        ('Discord', 'bep1Zg'),
        ('Slack', '7KA7XP'),
        ('Facebook Group', 'ApgMr0'),
        ('Blog posts and articles', NULL),
        ('Home Assistant Forum', NULL),
        ('Colleague or mentor guidance', NULL),
        ('Books or formal courses', NULL)
    ) AS t(resource_name, question_id)
),

filtered_users AS (
    SELECT DISTINCT r.respondent_id
    FROM responses r
    WHERE 1=1
    -- Experience level filters (ElR6d2)
    {EXPERIENCE_FILTER}
    
    -- Purpose filters (VPeNQ6) 
    {PURPOSE_FILTER}
    
    -- Organization size filters (joRz61)
    {ORGSIZE_FILTER}
    
    -- Industry filters (2AWoaM)
    {INDUSTRY_FILTER}
    
    -- Decision influence filters (P9xr1x)
    {INFLUENCE_FILTER}
    
    -- Programming background filters (xDqzMk)
    {PROGRAMMING_FILTER}
    
    -- Flow complexity filters (kG2v5Z)
    {COMPLEXITY_FILTER}
    
    -- Production usage filters (ZO7eJB)
    {PRODUCTION_FILTER}
    
    -- Number of instances filters (ZO7eO5)
    {INSTANCES_FILTER}
    
    -- Run environment filters (476OJ5)
    {ENVIRONMENT_FILTER}
),

filtered_count AS (
    SELECT COUNT(*) as total FROM filtered_users
),

-- Extract usage data from multi-select responses for filtered users only
usage_data AS (
    SELECT 
        respondent_id,
        answer_text::varchar as raw_answer
    FROM responses
    WHERE question_id = 'NXjPAO'
      AND answer_text::varchar != '[]'
      AND respondent_id IN (SELECT respondent_id FROM filtered_users)
),

-- Count selections for each resource within the filtered segment
resource_usage AS (
    SELECT 
        rm.resource_name as channel,
        COUNT(CASE 
            -- Handle exact matches and variations
            WHEN rm.resource_name = 'AI assistance (ChatGPT/etc)' 
                AND ud.raw_answer LIKE '%AI assistance (ChatGpt/etc)%' THEN 1
            WHEN ud.raw_answer LIKE '%' || rm.resource_name || '%' THEN 1
        END) as selected_count
    FROM resource_mapping rm
    CROSS JOIN usage_data ud
    GROUP BY rm.resource_name
),

-- Get rating data for resources with follow-up questions from filtered users only
rating_data AS (
    SELECT 
        rm.resource_name as channel,
        r.respondent_id,
        CAST(REPLACE(REPLACE(r.answer_text::varchar, '["', ''), '"]', '') AS INTEGER) as rating
    FROM resource_mapping rm
    INNER JOIN responses r ON r.question_id = rm.question_id
    WHERE rm.question_id IS NOT NULL
      AND r.answer_text::varchar != '[]'
      AND r.answer_text::varchar NOT LIKE '%,%'
      AND r.respondent_id IN (SELECT respondent_id FROM filtered_users)
),

-- Calculate rating statistics for filtered segment
rating_stats AS (
    SELECT 
        channel,
        COUNT(*) as follow_up_answered,
        ROUND(AVG(rating), 2) as avg_rating,
        MIN(rating) || '-' || MAX(rating) as rating_range,
        ROUND((AVG(rating) / 7.0) * 100, 1) as quality_pct,
        COUNT(CASE WHEN rating >= 6 THEN 1 END) as high_ratings,
        ROUND(100.0 * COUNT(CASE WHEN rating >= 6 THEN 1 END) / COUNT(*), 1) as top_ratings_pct
    FROM rating_data
    GROUP BY channel
),

-- Get all possible resources
all_resources AS (
    SELECT DISTINCT channel 
    FROM (
        SELECT resource_name as channel FROM resource_mapping
        UNION ALL
        SELECT 'Blog posts and articles' as channel
        UNION ALL
        SELECT 'Home Assistant Forum' as channel
        UNION ALL
        SELECT 'Colleague or mentor guidance' as channel
        UNION ALL
        SELECT 'Books or formal courses' as channel
    )
),

-- Combine all metrics for filtered segment
final_table AS (
    SELECT 
        ar.channel,
        COALESCE(ru.selected_count, 0) as selected_count,
        CASE 
            WHEN (SELECT total FROM filtered_count) > 0 
            THEN ROUND(100.0 * COALESCE(ru.selected_count, 0) / (SELECT total FROM filtered_count), 2) 
            ELSE 0 
        END as reach_pct,
        rs.follow_up_answered,
        rs.avg_rating,
        rs.rating_range,
        rs.quality_pct,
        rs.top_ratings_pct,
        CASE 
            WHEN rs.quality_pct IS NOT NULL AND (SELECT total FROM filtered_count) > 0
            THEN ROUND((rs.quality_pct * (100.0 * COALESCE(ru.selected_count, 0) / (SELECT total FROM filtered_count))) / 100, 1) 
            ELSE NULL
        END as impact_score
    FROM all_resources ar
    LEFT JOIN resource_usage ru ON ar.channel = ru.channel
    LEFT JOIN rating_stats rs ON ar.channel = rs.channel
)

SELECT 
    'Filtered Users (' || (SELECT total FROM filtered_count) || ' users)' as "Segment",
    channel as "Resource",
    CAST(ROUND(reach_pct, 0) AS INTEGER) || '%' as "Reach %",
    selected_count || '/' || (SELECT total FROM filtered_count) as "Users",
    COALESCE(ROUND(avg_rating, 2) || '/7', '-') as "Rating",
    COALESCE(CAST(ROUND(quality_pct, 0) AS INTEGER) || '%', '-') as "Quality %",
    COALESCE(CAST(ROUND(top_ratings_pct, 0) AS INTEGER) || '%', '-') as "Top Ratings",
    COALESCE(CAST(ROUND(impact_score, 0) AS INTEGER) || '%', '-') as "Impact",
    
    -- Efficiency metrics (as percentages)
    CASE 
        WHEN quality_pct IS NOT NULL AND reach_pct > 0 
        THEN CAST(ROUND(quality_pct / reach_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Efficiency",
    
    CASE 
        WHEN quality_pct IS NOT NULL AND quality_pct > 0
        THEN CAST(ROUND(reach_pct / quality_pct * 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Effectiveness",
    
    -- Opportunity metrics (as percentages)
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - quality_pct) * reach_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Quality Gap Opp",
    
    CASE 
        WHEN quality_pct IS NOT NULL 
        THEN CAST(ROUND((100 - reach_pct) * quality_pct / 100, 0) AS INTEGER) || '%'
        ELSE '-'
    END as "Reach Gap Opp"
    
FROM final_table
ORDER BY selected_count DESC;`;

// Utility function to replace placeholders in queries
export const replacePlaceholder = (query, placeholder, replacement) => {
    return query.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), replacement || '');
};

// Helper function to build WHERE clause for basic filters
export const buildBasicWhereClause = (filters) => {
    if (!filters || Object.keys(filters).length === 0) {
        return '';
    }
    
    const conditions = [];
    
    // Add basic respondent_id filter if provided
    if (filters.respondent_ids && filters.respondent_ids.length > 0) {
        conditions.push(`AND respondent_id IN (${filters.respondent_ids.map(id => `'${id}'`).join(', ')})`);
    }
    
    return conditions.join(' ');
};

export default {
    getDashboardQuery,
    getSegmentQuery,
    getFilteredAnalysisQuery,
    getAvailableSegments,
    replacePlaceholder,
    buildBasicWhereClause
};