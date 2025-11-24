import * as duckdb from '@duckdb/duckdb-wasm';
import { createEmptyFilters, buildFilterWhereClause, getQuestionMetadata, FILTER_MAPPINGS, QUESTION_TO_FILTER } from '../utils/filter-utils.js';
import { FILTER_DEFINITIONS } from '../utils/filter-definitions.js';
import { getDashboardQuery, getSegmentQuery } from '../queries/dashboard-queries.js';

class DuckDBWasmService {
  constructor() {
    this.db = null;
    this.conn = null;
    this.worker = null; // Store worker reference for proper cleanup
    this.initialized = false;
    this.initializing = false; // Track if initialization is in progress
    this.initPromise = null; // Store the initialization promise
    this.mockMode = false; // Track if we're in mock mode
    this.filterOptions = null;
    this.segments = [];
    this.needsSchemaPrefix = false;
  }



  // Build WHERE clause from filters using the integrated filter-utils logic
  async buildFilterWhereClause(filters) {
    try {
      if (import.meta.env.DEV) console.log('Building WHERE clause for filters:', JSON.stringify(filters, null, 2));
      
      // Use the imported buildFilterWhereClause function from filter-utils.js
      const whereClause = await buildFilterWhereClause(filters);
      if (import.meta.env.DEV) console.log('Generated WHERE clause from filter-utils:', whereClause);
      
      // Add survey. prefix to responses table references in WHERE clause
      let processedClause = whereClause;
      if (this.needsSchemaPrefix && whereClause && whereClause.trim() && whereClause !== '1=1') {
        // Replace 'FROM responses ' with 'FROM survey.responses ' in the WHERE clause
        processedClause = whereClause.replace(/FROM responses /g, 'FROM survey.responses ');
        if (import.meta.env.DEV) console.log('Added schema prefix to WHERE clause');
      }
      
      // If no conditions were generated, return '1=1' as default
      const result = processedClause && processedClause.trim() ? processedClause : '1=1';
      if (import.meta.env.DEV) console.log('Final WHERE clause:', result === '1=1' ? '1=1 (no filters)' : result.substring(0, 200));
      
      return result;
    } catch (error) {
      console.error('Error building filter WHERE clause:', error);
      console.error('Error details:', error.stack);
      return '1=1'; // Fallback to no filtering on error
    }
  }

  // CRITICAL: Convert BigInts to Numbers for existing components
  convertBigInts(obj) {
    if (typeof obj === 'bigint') {
      // Check for precision loss - JavaScript Number.MAX_SAFE_INTEGER is 2^53-1
      if (obj > Number.MAX_SAFE_INTEGER || obj < Number.MIN_SAFE_INTEGER) {
        if (import.meta.env.DEV) console.warn(`BigInt value ${obj} exceeds JavaScript Number precision, potential data loss`);
        // For very large numbers, return as string to avoid precision loss
        return obj.toString();
      }
      return Number(obj);
    }
    if (Array.isArray(obj)) return obj.map(v => this.convertBigInts(v));
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.convertBigInts(value);
      }
      return result;
    }
    return obj;
  }

  async initialize() {
    // If already initialized, return immediately
    if (this.initialized) {
      if (import.meta.env.DEV) console.log('🔄 DuckDB already initialized, skipping...');
      return;
    }

    // If initialization is in progress, wait for it to complete
    if (this.initializing && this.initPromise) {
      if (import.meta.env.DEV) console.log('🔄 DuckDB initialization already in progress, waiting...');
      return await this.initPromise;
    }

    // Mark as initializing and create the initialization promise
    this.initializing = true;
    this.initPromise = this._doInitialization();

    try {
      await this.initPromise;
    } finally {
      this.initializing = false;
      this.initPromise = null;
    }
  }

  async _doInitialization() {
    try {
      if (import.meta.env.DEV) console.log('🔄 Starting DuckDB WASM initialization...');

      // Use local DuckDB WASM files served by Vite instead of CDN
      // Build proper URLs that work both locally and through Tailscale
      const baseUrl = window.location.origin;
      const basePath = import.meta.env.BASE_URL.replace(/\/$/, ''); // Remove trailing slash
      const MANUAL_BUNDLES = {
        mvp: {
          mainModule: `${baseUrl}${basePath}/node_modules/@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm`,
          mainWorker: `${baseUrl}${basePath}/node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js`,
        },
        eh: {
          mainModule: `${baseUrl}${basePath}/node_modules/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm`,
          mainWorker: `${baseUrl}${basePath}/node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js`,
        },
      };

      if (import.meta.env.DEV) console.log('🔧 Using local DuckDB bundles from Vite...');
      if (import.meta.env.DEV) console.log('🌐 Base URL:', baseUrl);
      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
      if (import.meta.env.DEV) console.log('📦 Selected DuckDB bundle:', bundle);

      // Fetch the worker script content to avoid CORS issues
      if (import.meta.env.DEV) console.log('📥 Fetching worker script...');
      const workerResponse = await fetch(bundle.mainWorker);
      if (!workerResponse.ok) {
        throw new Error(`Failed to fetch worker: ${workerResponse.status} ${workerResponse.statusText}`);
      }
      const workerScript = await workerResponse.text();

      // Create worker with blob URL containing the actual script content
      const worker_url = URL.createObjectURL(
        new Blob([workerScript], { type: 'text/javascript' })
      );
      if (import.meta.env.DEV) console.log('👷 Created worker URL with fetched script');

      this.worker = new Worker(worker_url);
      const logger = new duckdb.ConsoleLogger();
      this.db = new duckdb.AsyncDuckDB(logger, this.worker);
      if (import.meta.env.DEV) console.log('🗃️ Created AsyncDuckDB instance');

      // Wait for instantiation to complete before proceeding with timeout
      if (import.meta.env.DEV) console.log('⚡ Instantiating DuckDB WASM module...');
      if (import.meta.env.DEV) console.log('⏱️ Timeout set to 90 seconds for WASM instantiation');
      const instantiationStart = performance.now();

      const instantiationPromise = this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DuckDB WASM instantiation timeout after 90 seconds')), 90000)
      );

      await Promise.race([instantiationPromise, timeoutPromise]);

      const instantiationEnd = performance.now();
      const instantiationTime = (instantiationEnd - instantiationStart) / 1000;
      if (import.meta.env.DEV) console.log(`✅ DuckDB WASM instantiated successfully in ${instantiationTime.toFixed(2)} seconds`);

      // Verify db is properly initialized before proceeding
      if (!this.db) {
        throw new Error('DuckDB instance is null after instantiation');
      }

      // Additional check to ensure the database is ready
      if (import.meta.env.DEV) console.log('🔍 Verifying DuckDB instance state...');
      if (import.meta.env.DEV) console.log('DB instance type:', typeof this.db);
      if (import.meta.env.DEV) console.log('DB instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.db)));

      // Test that the database can perform basic operations
      try {
        const testConn = await this.db.connect();
        await testConn.query('SELECT 1 as test');
        await testConn.close();
        if (import.meta.env.DEV) console.log('✅ DuckDB instance verified working');
      } catch (testError) {
        console.error('❌ DuckDB instance test failed:', testError);
        throw new Error(`DuckDB instance failed basic test: ${testError.message}`);
      }

      // Load database file
      if (import.meta.env.DEV) console.log('📁 Fetching database file...');
      const response = await fetch(`${basePath}/node_red_survey.duckdb`);
      if (!response.ok) {
        throw new Error(`Failed to fetch database file: ${response.status} ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      if (import.meta.env.DEV) console.log('📦 Registering database file buffer...');
      await this.db.registerFileBuffer('survey.db', new Uint8Array(buffer));
      
      // Connect to the database
      if (import.meta.env.DEV) console.log('🔗 Connecting to database...');
      this.conn = await this.db.connect();
      if (import.meta.env.DEV) console.log('✅ Database connection established');

      // Attach the database - it will be attached with name "survey"
      if (import.meta.env.DEV) console.log('📎 Attaching database as survey schema...');
      await this.conn.query(`ATTACH 'survey.db' AS survey`);
      if (import.meta.env.DEV) console.log('✅ Database attached successfully');

      // Tables are accessible with survey. prefix
      // Verify the connection
      try {
        if (import.meta.env.DEV) console.log('🔍 Verifying database tables...');
        const result = await this.conn.query(`SELECT COUNT(*) as cnt FROM survey.responses`);
        const data = result.toArray();
        if (import.meta.env.DEV) console.log('✅ Database connected successfully. Total responses:', data[0]?.cnt);
        this.needsSchemaPrefix = true;  // We need to use survey. prefix
      } catch (e) {
        console.error('❌ Error accessing database tables:', e);
        throw e;
      }

      URL.revokeObjectURL(worker_url);
      if (import.meta.env.DEV) console.log('🧹 Cleaned up worker URL');

      // Load initial data
      if (import.meta.env.DEV) console.log('📋 Loading filter options...');
      await this.loadFilterOptions();
      if (import.meta.env.DEV) console.log('🎯 Loading segments...');
      await this.loadSegments();

      this.initialized = true;
      if (import.meta.env.DEV) console.log('🎉 DuckDB WASM initialization completed successfully!');
    } catch (error) {
      console.error('💥 DuckDB WASM initialization error:', error);
      console.error('💥 Error stack:', error.stack);

      // Clean up resources on error
      if (this.conn) {
        try {
          await this.conn.close();
        } catch (closeError) {
          if (import.meta.env.DEV) console.warn('⚠️ Error closing connection during cleanup:', closeError);
        }
      }
      if (this.worker) {
        try {
          await this.worker.terminate();
        } catch (termError) {
          if (import.meta.env.DEV) console.warn('⚠️ Error terminating worker during cleanup:', termError);
        }
      }

      // Reset state
      this.db = null;
      this.conn = null;
      this.worker = null;
      this.initialized = false;
      this.initializing = false;
      this.initPromise = null;

      throw error;
    }
  }

  async loadFilterOptions() {
    try {
      const questions = getQuestionMetadata();
      const filterOptions = {};
      
      if (import.meta.env.DEV) console.log('Loading filter options for', Object.keys(questions).length, 'questions');
      
      for (const [qid, name] of Object.entries(questions)) {
        try {
          const isMultiSelect = qid === "476OJ5" || qid === "VPeNQ6" || qid === "rO4YaX" || 
                              qid === "kGozGZ" || qid === "089kZ6" || qid === "erJzEk" || 
                              qid === "8LBr6x" || qid === "Dp8ax5" || qid === "Ma4BjA" || qid === "NXjP0j" ||
                              qid === "2AWoaM"; // Industry is stored as JSON array
          
          const schemaPrefix = this.needsSchemaPrefix ? 'survey.' : '';
          let result;
          
          if (isMultiSelect) {
            // Extract individual options from JSON arrays for multi-select questions
            const sql = `
              WITH expanded AS (
                SELECT
                  respondent_id,
                  unnest(TRY_CAST(answer_text AS JSON[])) as option_value
                FROM ${schemaPrefix}responses
                WHERE question_id = '${qid}'
                AND answer_text IS NOT NULL
                AND answer_text::varchar != '[]'
                AND answer_text::varchar LIKE '[%'
              )
              SELECT
                TRIM(BOTH '"' FROM option_value::varchar) as answer_text,
                CAST(COUNT(DISTINCT respondent_id) AS INTEGER) as count
              FROM expanded
              WHERE option_value IS NOT NULL
              GROUP BY option_value
              ORDER BY count DESC
            `;
            
            const queryResult = await this.conn.query(sql);
            result = this.convertBigInts(queryResult.toArray());
          } else {
            // Original logic for single-select questions
            const sql = `
              SELECT answer_text::varchar as answer_text, CAST(COUNT(*) AS INTEGER) as count
              FROM ${schemaPrefix}responses 
              WHERE question_id = '${qid}' 
              AND answer_text IS NOT NULL 
              AND answer_text::varchar != ''
              AND answer_text::varchar != '[]'
              AND answer_text::varchar NOT LIKE '%null%'
              GROUP BY answer_text
              ORDER BY count DESC
            `;
            
            const queryResult = await this.conn.query(sql);
            result = this.convertBigInts(queryResult.toArray());
          }
          
          // Map results to filter options format
          // Database now contains pre-consolidated values, so we can use them directly
          let consolidatedOptions = result.map((row) => ({
            value: row.answer_text,
            count: row.count,
            label: row.answer_text.replace(/[[\]"]/g, "")
          }));

          // Apply logical ordering based on question type
          consolidatedOptions = this.sortFilterOptionsLogically(qid, consolidatedOptions);
          
          if (import.meta.env.DEV) console.log(`✅ Loaded ${consolidatedOptions.length} options for ${qid} (${name})`);
          
          filterOptions[qid] = {
            name,
            options: consolidatedOptions
          };
        } catch (error) {
          console.error(`❌ Error getting options for ${qid} (${name}):`, error);
          filterOptions[qid] = {
            name,
            options: []
          };
        }
      }
      
      // Transform the raw filter options to match the expected structure
      this.filterOptions = this.transformFilterOptions(filterOptions);
      
    } catch (error) {
      console.error('Error loading filter options:', error);
      // Fallback to empty structure using correct mappings
      this.filterOptions = {};
      for (const [filterKey, questionId] of Object.entries(FILTER_MAPPINGS)) {
        this.filterOptions[filterKey] = {
          questionId: questionId,
          name: FILTER_DEFINITIONS[filterKey]?.name || filterKey,
          options: []
        };
      }
      if (import.meta.env.DEV) console.warn('Using fallback empty filter structure');
    }
  }

  // Helper method to sort filter options logically
  sortFilterOptionsLogically(questionId, options) {
    // Define filter order for questions that need logical ordering
    const FILTER_ORDER = {
      'ElR6d2': [
        '["Less than 6 months"]',
        '["6 months to 1 year"]',
        '["1 to 2 years"]',  
        '["2 to 5 years"]',
        '["More than 5 years (I\'m a veteran!)"]',
        '["Prefer not to say"]'
      ],
      'joRz61': [
        '["Not applicable"]',
        '["1-10 people"]',
        '["11-50 people"]',
        '["51-200 people"]',
        '["201-500 people"]',
        '["500+ people"]'
      ],
      'vJvM01': [
        '["1-10"]',
        '["11-50"]',
        '["51-200"]',
        '["201-1000"]',
        '["1000+"]'
      ],
      'P9xr1x': [
        '["I make the final decision"]',
        '["I strongly influence the decision"]',
        '["I provide input but others decide"]',
        '["I implement what others choose"]',
        '["Not applicable (personal use only)"]'
      ],
      'xDqzMk': [
        '["None - I\'m not a programmer"]',
        '["Beginner - basic scripting or configuration"]',
        '["Intermediate - comfortable with multiple languages"]',
        '["Advanced - professional developer or architect"]',
        '["Expert - deep technical expertise across technologies"]',
        '["Prefer not to say"]'
      ],
      'kG2v5Z': [
        '["Simple flows (under 20 nodes, minimal tabs)"]',
        '["Medium complexity (20-50 nodes, multiple tabs)"]',
        '["Complex flows (50+ nodes, multiple tabs)"]',
        '["Advanced flows (100+ nodes, multiple tabs)"]',
        '["Enterprise-scale deployments (flows utilizing multiple Node-RED instances)"]'
      ],
      'ZO7eJB': [
        '["No, it is not applicable for my work"]',
        '["No, and unlikely to in the future"]',
        '["No, but I would like to"]',
        '["Yes, for some production workloads"]',
        '["Yes, extensively in production systems"]'
      ],
      'ZO7eO5': [
        '["1"]',
        '["2-5"]',
        '["6-10"]',
        '["11-50"]',
        '["51-200"]',
        '["200-999"]',
        '["1000+"]'
      ]
    };
    
    const order = FILTER_ORDER[questionId];
    
    if (!order) {
      // No predefined order, keep as-is (already sorted by count)
      return options;
    }
    
    // Sort based on predefined order
    return options.sort((a, b) => {
      const indexA = order.indexOf(a.value);
      const indexB = order.indexOf(b.value);
      
      // If both are in the order, sort by order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // If only one is in the order, prioritize it
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // Otherwise sort by count (descending)
      return b.count - a.count;
    });
  }

  // Helper method to transform raw filter options to expected structure
  transformFilterOptions(rawOptions) {
    // Use the QUESTION_TO_FILTER mapping from filter-utils.js
    // This ensures consistency with the filter definitions
    const transformed = {};
    
    for (const [questionId, data] of Object.entries(rawOptions)) {
      const filterKey = QUESTION_TO_FILTER[questionId];
      if (filterKey) {
        transformed[filterKey] = {
          questionId: questionId,
          name: data.name,
          options: data.options || []
        };
      } else {
        if (import.meta.env.DEV) console.warn(`No filter mapping found for question ID: ${questionId}`);
      }
    }
    
    if (import.meta.env.DEV) console.log('Transformed filter options:', Object.keys(transformed).length, 'categories');
    return transformed;
  }

  async getSegmentCount(segmentId) {
    try {
      // Create a count query based on the segment definition
      // This extracts just the segment_users CTE and counts it
      const countSql = await this.getSegmentCountQuery(segmentId);
      if (!countSql) return 0;
      
      const result = await this.conn.query(countSql);
      const count = this.convertBigInts(result.toArray())[0]?.count || 0;
      return count;
    } catch (error) {
      if (import.meta.env.DEV) console.warn(`Error getting count for segment ${segmentId}:`, error.message);
      return 0;
    }
  }

  async getSegmentCountQuery(segmentId) {
    // Define the segment count queries based on the SQL files
    const segmentQueries = {
      'professional_builders': `
        WITH segment_users AS (
          SELECT DISTINCT r.respondent_id
          FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r
          WHERE EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'VPeNQ6' 
              AND (answer_text LIKE '%Professional developer%' 
                   OR answer_text LIKE '%System architect%'
                   OR answer_text LIKE '%Enterprise user%')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'ZO7eJB' 
              AND (answer_text LIKE '%Yes%' OR answer_text LIKE '%production%')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'xDqzMk' 
              AND (answer_text LIKE '%Intermediate%' 
                   OR answer_text LIKE '%Advanced%'
                   OR answer_text LIKE '%Expert%')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'kG2v5Z' 
              AND (answer_text LIKE '%20-49 nodes%' 
                   OR answer_text LIKE '%50+ nodes%'
                   OR answer_text LIKE '%100+ nodes%'
                   OR answer_text LIKE '%Enterprise%')
          )
        )
        SELECT COUNT(*) as count FROM segment_users`,
      
      'emerging_adopters': `
        WITH segment_users AS (
          SELECT DISTINCT r.respondent_id
          FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r
          WHERE EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'ZO7eJB' 
              AND answer_text LIKE '%No, but I would like to%'
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'joRz61' 
              AND (answer_text LIKE '%51-500%' 
                   OR answer_text LIKE '%500+%')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'P9xr1x' 
              AND (answer_text = '["I strongly influence the decision"]' 
                   OR answer_text = '["I make the final decision"]')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'ElR6d2' 
              AND (answer_text LIKE '%1-2 years%' 
                   OR answer_text LIKE '%2-5 years%'
                   OR answer_text LIKE '%5+ years%'
                   OR answer_text LIKE '%More than 5%')
          )
        )
        SELECT COUNT(*) as count FROM segment_users`,
      
      'enterprise_production_champions': `
        WITH segment_users AS (
          SELECT DISTINCT r.respondent_id
          FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r
          WHERE EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'ZO7eJB' 
              AND (answer_text LIKE '%Yes%' OR answer_text LIKE '%production%')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'joRz61' 
              AND (answer_text LIKE '%500+%' OR answer_text LIKE '%Large enterprise%')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'P9xr1x' 
              AND (answer_text = '["I strongly influence the decision"]' 
                   OR answer_text = '["I make the final decision"]')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'ElR6d2' 
              AND (answer_text LIKE '%2-5 years%'
                   OR answer_text LIKE '%5+ years%'
                   OR answer_text LIKE '%More than 5%')
          )
        )
        SELECT COUNT(*) as count FROM segment_users`,
      
      'industrial_automation': `
        WITH segment_users AS (
          SELECT DISTINCT r.respondent_id
          FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r
          WHERE EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'VPeNQ6' 
              AND (answer_text LIKE '%Industrial automation%' 
                   OR answer_text LIKE '%IoT%'
                   OR answer_text LIKE '%Manufacturing%')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'ZO7eJB' 
              AND (answer_text LIKE '%Yes%' OR answer_text LIKE '%production%')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'ElR6d2' 
              AND (answer_text LIKE '%1-2 years%'
                   OR answer_text LIKE '%2-5 years%'
                   OR answer_text LIKE '%5+ years%'
                   OR answer_text LIKE '%More than 5%')
          )
        )
        SELECT COUNT(*) as count FROM segment_users`,
      
      'decision_influencers': `
        WITH segment_users AS (
          SELECT DISTINCT r.respondent_id
          FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r
          WHERE EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'P9xr1x' 
              AND (answer_text = '["I strongly influence the decision"]' 
                   OR answer_text = '["I make the final decision"]')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'joRz61' 
              AND (answer_text LIKE '%51-500%' 
                   OR answer_text LIKE '%500+%')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'ElR6d2' 
              AND (answer_text LIKE '%1-2 years%'
                   OR answer_text LIKE '%2-5 years%'
                   OR answer_text LIKE '%5+ years%'
                   OR answer_text LIKE '%More than 5%')
          )
        )
        SELECT COUNT(*) as count FROM segment_users`,
      
      'smb_leaders': `
        WITH segment_users AS (
          SELECT DISTINCT r.respondent_id
          FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r
          WHERE EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'joRz61' 
              AND (answer_text LIKE '%1-10%' 
                   OR answer_text LIKE '%11-50%')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'P9xr1x' 
              AND (answer_text = '["I strongly influence the decision"]' 
                   OR answer_text = '["I make the final decision"]')
          )
          AND EXISTS (
              SELECT 1 FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'} r2 
              WHERE r2.respondent_id = r.respondent_id 
              AND question_id = 'ZO7eJB' 
              AND (answer_text LIKE '%Yes%' OR answer_text LIKE '%production%'
                   OR answer_text LIKE '%No, but I would like to%')
          )
        )
        SELECT COUNT(*) as count FROM segment_users`
    };
    
    return segmentQueries[segmentId] || null;
  }

  async loadSegments() {
    try {
      // Get total respondent count
      const totalSql = `
        SELECT COUNT(DISTINCT respondent_id) as count
        FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'}
      `;

      const totalResult = await this.conn.query(totalSql);
      const totalCount = this.convertBigInts(totalResult.toArray())[0]?.count || 623;
      
      // Initialize segments with 'All Respondents' segment
      this.segments = [
        { id: 'all', name: 'All Respondents', count: totalCount }
      ];
      
      // Get segment counts by executing actual queries
      const segmentNames = {
        'enterprise_production_champions': 'Enterprise Production Champions',
        'industrial_automation': 'Industrial Automation Professionals',
        'professional_builders': 'Professional Solution Builders', 
        'decision_influencers': 'Technical Decision Influencers',
        'emerging_adopters': 'Emerging Enterprise Adopters',
        'smb_leaders': 'SMB Automation Leaders'
      };
      
      // Get real counts for each segment
      for (const [id, name] of Object.entries(segmentNames)) {
        const count = await this.getSegmentCount(id);
        this.segments.push({
          id: id,
          name: name,
          count: count
        });
      }
      
      if (import.meta.env.DEV) console.log(`✅ Loaded ${this.segments.length} segments, total respondents: ${totalCount}`);
      if (import.meta.env.DEV) console.log(`📊 Segment counts:`, this.segments.map(s => `${s.name}: ${s.count}`).join(', '));
      
    } catch (error) {
      console.error('Error loading segments:', error);
      // Fallback segments
      this.segments = [
        { id: 'all', name: 'All Respondents', count: 623 },
        { id: 'emerging_adopters', name: 'Emerging Adopters', count: 0 },
        { id: 'professional_builders', name: 'Professional Builders', count: 0 },
        { id: 'enterprise_production_champions', name: 'Enterprise Production Champions', count: 0 },
        { id: 'decision_influencers', name: 'Decision Influencers', count: 0 },
        { id: 'industrial_automation', name: 'Industrial Automation', count: 0 },
        { id: 'smb_leaders', name: 'SMB Leaders', count: 0 }
      ];
    }
  }

  // Socket event replacements
  async getDashboardData(filters = createEmptyFilters(), segment = 'all') {
    try {
      // Get the appropriate SQL query from the query module
      let sql;
      if (segment === 'all') {
        sql = getDashboardQuery();
      } else {
        try {
          sql = getSegmentQuery(segment);
        } catch (error) {
          console.error(`Invalid segment ${segment}:`, error);
          // Fallback to dashboard query
          sql = getDashboardQuery();
          segment = 'all';
        }
      }
  
    // Clean the SQL (remove comments)
    sql = sql.split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    
    // Schema prefix was already determined during initialization
    if (import.meta.env.DEV) console.log('Processing SQL with needsSchemaPrefix:', this.needsSchemaPrefix);
    
    if (this.needsSchemaPrefix) {
      // Add survey schema prefix to all table references, but not to CTEs
      // First, identify actual database tables vs CTEs by checking for common CTE patterns
      const cteNames = new Set();
      
      // Find CTE definitions (WITH clause)
      const withMatches = sql.match(/WITH\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+AS/gi);
      if (withMatches) {
        withMatches.forEach(match => {
          const cteName = match.replace(/WITH\s+|AS.*$/gi, '').trim();
          cteNames.add(cteName.toLowerCase());
        });
      }
      
      // Find subsequent CTE definitions (comma-separated)
      const cteMatches = sql.match(/,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s+AS\s*\(/gi);
      if (cteMatches) {
        cteMatches.forEach(match => {
          const cteName = match.replace(/,\s*|AS.*$/gi, '').trim();
          cteNames.add(cteName.toLowerCase());
        });
      }
      
      if (import.meta.env.DEV) console.log('Found CTEs:', Array.from(cteNames));
      
      // Replace table references with schema prefix, but skip CTEs
      sql = sql.replace(/\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/gi, (match, tableName) => {
        const isSkipped = cteNames.has(tableName.toLowerCase());
        if (import.meta.env.DEV) console.log(`FROM ${tableName}: ${isSkipped ? 'SKIPPING (CTE)' : 'PREFIXING'}`);
        return isSkipped ? match : `FROM survey.${tableName}`;
      });
      
      sql = sql.replace(/\bJOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/gi, (match, tableName) => {
        const isSkipped = cteNames.has(tableName.toLowerCase());
        if (import.meta.env.DEV) console.log(`JOIN ${tableName}: ${isSkipped ? 'SKIPPING (CTE)' : 'PREFIXING'}`);
        return isSkipped ? match : `JOIN survey.${tableName}`;
      });
      
      sql = sql.replace(/\bINTO\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/gi, (match, tableName) => {
        const isSkipped = cteNames.has(tableName.toLowerCase());
        if (import.meta.env.DEV) console.log(`INTO ${tableName}: ${isSkipped ? 'SKIPPING (CTE)' : 'PREFIXING'}`);
        return isSkipped ? match : `INTO survey.${tableName}`;
      });
      
      sql = sql.replace(/\bUPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/gi, (match, tableName) => {
        const isSkipped = cteNames.has(tableName.toLowerCase());
        if (import.meta.env.DEV) console.log(`UPDATE ${tableName}: ${isSkipped ? 'SKIPPING (CTE)' : 'PREFIXING'}`);
        return isSkipped ? match : `UPDATE survey.${tableName}`;
      });
      
      // Handle function calls that need schema prefix - specifically target custom functions
      // Look for analyze_learning_resources but avoid double prefixing
      sql = sql.replace(/\banalyze_learning_resources\s*\(/gi, (match) => {
        if (!match.includes('survey.')) {
          if (import.meta.env.DEV) console.log(`Function analyze_learning_resources: PREFIXING`);
          return 'survey.analyze_learning_resources(';
        }
        return match;
      });
      
      // Handle analyze_segment_learning_resources function as well
      sql = sql.replace(/\banalyze_segment_learning_resources\s*\(/gi, (match) => {
        if (!match.includes('survey.')) {
          if (import.meta.env.DEV) console.log(`Function analyze_segment_learning_resources: PREFIXING`);
          return 'survey.analyze_segment_learning_resources(';
        }
        return match;
      });
    }
    
    // CRITICAL: Fix double prefixing issue by removing any survey.survey. patterns
    sql = sql.replace(/\bsurvey\.survey\./g, 'survey.');
    
    if (import.meta.env.DEV) console.log('Final SQL after processing:');
    if (import.meta.env.DEV) console.log(sql.substring(0, 500)); // Log first 500 chars
    
    // Apply filters - ALWAYS replace the placeholder, even with '1=1'
    const whereClause = await this.buildFilterWhereClause(filters);
    
    // For segment queries, we need to add the filter conditions to the segment_users CTE
    // For dashboard queries, we add them to the respondent_count CTE
    if (whereClause && whereClause !== '1=1') {
      if (import.meta.env.DEV) console.log(`Applying WHERE clause filters: ${whereClause.substring(0, 150)}`);
      // Replace filter placeholders with AND conditions since queries already have WHERE clauses
      const andCondition = `AND ${whereClause}`;
      if (segment !== 'all') {
        // For segment queries, add filters as additional AND conditions after the existing segment criteria
        sql = sql.replace(/{{WHERE_CLAUSE}}/g, andCondition);
      } else {
        // For dashboard queries, add filters to the respondent counting
        sql = sql.replace(/{{WHERE_CLAUSE}}/g, andCondition);
      }
    } else {
      if (import.meta.env.DEV) console.log('No active filters - replacing placeholder with empty string');
      // Remove the placeholder if no active filters (but always replace it)
      sql = sql.replace(/{{WHERE_CLAUSE}}/g, '');
    }
    
    if (import.meta.env.DEV) console.log('SQL after WHERE clause replacement (first 400 chars):', sql.substring(0, 400));
    
    // Execute query
    let result;
    let data;
    
    try {
      result = await this.conn.query(sql);
      data = this.convertBigInts(result.toArray());

      // Handle edge case: empty result set
      if (!data || data.length === 0) {
        if (import.meta.env.DEV) console.warn('Query returned empty result set');
        return {
          data: [],
          total_respondents: 0,
          filtered_respondents: 0,
          cache_hit: false
        };
      }
    } catch (queryError) {
      console.error('Query execution failed:', queryError);
      throw queryError;
    }
    
        // Return EXACT same structure as server.js
        return {
          segment,
          query: sql,
          data,
          error: null,
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        console.error('Dashboard query error:', error);
        return {
          segment,
          query: null,
          data: [],
          error: error.message,
          lastUpdated: new Date().toISOString()
        };
      }
  }

  async getFilterOptions() {
    // Return the loaded filter options
    return this.filterOptions;
  }

  async getSegments() {
    return this.segments;
  }

  async getFilteredCount(filters) {
    try {
      // DETAILED LOGGING for experience filter debugging
      if (import.meta.env.DEV && filters.experience && filters.experience.length > 0) {
        console.log('🎯 EXPERIENCE FILTER DETECTED IN getFilteredCount:');
        console.log('  Experience filter values:', JSON.stringify(filters.experience));
        console.log('  All active filters:', Object.keys(filters).filter(k => filters[k]?.length > 0));
      }

      const whereClause = await this.buildFilterWhereClause(filters);
      const schemaPrefix = this.needsSchemaPrefix ? 'survey.' : '';

      // Build the SQL query with proper WHERE condition
      let sql;
      if (whereClause && whereClause !== '1=1' && whereClause.trim()) {
        // Use whereClause directly - it should be properly formatted from buildFilterWhereClause
        const whereCondition = whereClause;
        sql = `
          SELECT CAST(COUNT(DISTINCT r.respondent_id) AS INTEGER) as count
          FROM ${schemaPrefix}responses r
          WHERE ${whereCondition}
        `;
      } else {
        // No filters applied, count all respondents
        sql = `
          SELECT CAST(COUNT(DISTINCT r.respondent_id) AS INTEGER) as count
          FROM ${schemaPrefix}responses r
        `;
      }

      if (import.meta.env.DEV) console.log('🔍 Filter count debugging:');
      if (import.meta.env.DEV) console.log('  WHERE clause length:', whereClause?.length || 0);
      if (import.meta.env.DEV) console.log('  WHERE clause preview:', whereClause?.substring(0, 150) + (whereClause?.length > 150 ? '...' : ''));
      if (import.meta.env.DEV) console.log('  Full SQL:', sql.substring(0, 500) + (sql.length > 500 ? '...' : ''));

      // DEBUG: Check what's actually in the database for experience filters
      if (import.meta.env.DEV && filters.experience && filters.experience.length > 0) {
        try {
          console.log('🔍 DEBUG: Checking actual database values for ElR6d2...');
          const debugSql = `SELECT DISTINCT answer_text FROM ${schemaPrefix}responses WHERE question_id = 'ElR6d2' LIMIT 10`;
          console.log('🔍 DEBUG: Running query:', debugSql);
          const debugResult = await this.conn.query(debugSql);
          const debugData = this.convertBigInts(debugResult.toArray());
          console.log('🔍 DEBUG: Actual ElR6d2 values in DB:', debugData.map(r => r.answer_text));
        } catch (err) {
          console.error('🔍 DEBUG: Error checking DB values:', err);
        }
      }

      const result = await this.conn.query(sql);
      const data = this.convertBigInts(result.toArray());
      const count = data[0]?.count || 0;
      if (import.meta.env.DEV) console.log(`✅ Filtered count result: ${count} respondents`);

      // ADDITIONAL LOGGING for experience filter
      if (import.meta.env.DEV && filters.experience && filters.experience.length > 0) {
        console.log(`🎯 EXPERIENCE FILTER RESULT: ${count} respondents (experience: ${JSON.stringify(filters.experience)})`);
      }

      return count;
    } catch (error) {
      console.error('Filter count error:', error);
      return 0;
    }
  }

  async getSectionCounts(filters) {
    try {
      if (import.meta.env.DEV) console.log('🔍 getSectionCounts called with filters:', JSON.stringify(filters));

      const whereClause = await this.buildFilterWhereClause(filters);
      const schemaPrefix = this.needsSchemaPrefix ? 'survey.' : '';

      // Build WHERE condition properly
      let whereCondition = '';
      if (whereClause && whereClause !== '1=1' && whereClause.trim()) {
        whereCondition = `AND (${whereClause})`;
      }

      if (import.meta.env.DEV) console.log('🔍 getSectionCounts whereCondition:', whereCondition);

      // Section 1: Learning resources (NXjPAO)
      const section1Sql = `
        SELECT CAST(COUNT(DISTINCT r.respondent_id) AS INTEGER) as count
        FROM ${schemaPrefix}responses r
        WHERE r.question_id = 'NXjPAO'
        AND r.answer_text IS NOT NULL
        AND TRIM(r.answer_text) != ''
        ${whereCondition}
      `;

      // Section 2: Future concerns (VZBmQy)
      const section2Sql = `
        SELECT CAST(COUNT(DISTINCT r.respondent_id) AS INTEGER) as count
        FROM ${schemaPrefix}responses r
        WHERE r.question_id = 'VZBmQy'
        AND r.answer_text IS NOT NULL
        AND TRIM(r.answer_text) != ''
        ${whereCondition}
      `;

      if (import.meta.env.DEV) console.log('🔍 Section counts SQL (full):', { section1Sql, section2Sql });

      const [result1, result2] = await Promise.all([
        this.conn.query(section1Sql),
        this.conn.query(section2Sql)
      ]);

      const count1 = this.convertBigInts(result1.toArray())[0]?.count || 0;
      const count2 = this.convertBigInts(result2.toArray())[0]?.count || 0;

      if (import.meta.env.DEV) console.log('🔍 Section counts results:', { section1: count1, section2: count2 });
      
      return {
        section1: { filtered: count1, total: 466 },
        section2: { filtered: count2, total: 432 }
      };
    } catch (error) {
      console.error('Section counts error:', error);
      return {
        section1: { filtered: 466, total: 466 },
        section2: { filtered: 432, total: 432 }
      };
    }
  }

  // Helper method to get total respondent counts for a question
  async getTotalRespondentsForQuestion(questionId, filters = null) {
    try {
      const schemaPrefix = this.needsSchemaPrefix ? 'survey.' : '';
      
      // Get total respondents for this question (unfiltered)
      const totalSql = `
        SELECT CAST(COUNT(DISTINCT respondent_id) AS INTEGER) as count
        FROM ${schemaPrefix}responses
        WHERE question_id = '${questionId}'
        AND answer_text IS NOT NULL
        AND TRIM(answer_text) != ''
        AND answer_text != '[]'
        AND answer_text != 'null'
      `;

      if (filters) {
        // Get filtered respondents for this question
        const whereClause = await this.buildFilterWhereClause(filters);
        
        // Build the filtered SQL with proper WHERE condition
        let filteredSql;
        if (whereClause && whereClause !== '1=1' && whereClause.trim()) {
          filteredSql = `
            SELECT CAST(COUNT(DISTINCT r.respondent_id) AS INTEGER) as count
            FROM ${schemaPrefix}responses r
            WHERE r.question_id = '${questionId}'
            AND r.answer_text IS NOT NULL
            AND TRIM(r.answer_text) != ''
            AND r.answer_text != '[]'
            AND r.answer_text != 'null'
            AND ${whereClause}
          `;
        } else {
          // No filters, use the total SQL
          filteredSql = totalSql;
        }
        
        const [totalResult, filteredResult] = await Promise.all([
          this.conn.query(totalSql),
          this.conn.query(filteredSql)
        ]);
        
        const totalData = this.convertBigInts(totalResult.toArray());
        const filteredData = this.convertBigInts(filteredResult.toArray());
        
        return {
          total_respondents: totalData[0]?.count || 0,
          filtered_respondents: filteredData[0]?.count || 0
        };
      } else {
        const totalResult = await this.conn.query(totalSql);
        const totalData = this.convertBigInts(totalResult.toArray());
        const totalCount = totalData[0]?.count || 0;
        
        return {
          total_respondents: totalCount,
          filtered_respondents: totalCount
        };
      }
    } catch (error) {
      console.error(`Error getting respondent counts for ${questionId}:`, error);
      return {
        total_respondents: 0,
        filtered_respondents: 0
      };
    }
  }

  // API endpoint replacements
  async getQuantitativeData(questionId, filters = null) {
    try {
      const schemaPrefix = this.needsSchemaPrefix ? 'survey.' : '';

      // Define question types for all 33 quantitative question IDs
      const questionTypes = this.getQuestionType(questionId);

      let sql;

      // Country data (GpGjoO) is now stored as numeric codes directly in the database
      // No special handling needed - use standard query logic
      if (filters) {
        // Remove only experience self-filter to prevent experience chart from filtering itself
        // This allows experience chart to show all levels while other filters still apply
        const modifiedFilters = { ...filters };
        // Only remove experience filter for experience question (ElR6d2)
        if (questionId === 'ElR6d2' && modifiedFilters['experience']) {
          if (import.meta.env.DEV) console.log(`Excluding experience self-filter for experience chart`);
          delete modifiedFilters['experience'];
        }
        
        const whereClause = await this.buildFilterWhereClause(modifiedFilters);

        if (questionTypes.isMultiSelect) {
          // Multi-select questions need JSON array expansion
          let filterCondition = '';
          if (whereClause && whereClause !== '1=1' && whereClause.trim()) {
            filterCondition = `WHERE ${whereClause}`;
          }

          sql = `
            WITH filtered_responses AS (
              SELECT DISTINCT respondent_id
              FROM ${schemaPrefix}responses r
              ${filterCondition}
            ),
            expanded_responses AS (
              SELECT
                r.respondent_id,
                unnest(TRY_CAST(r.answer_text AS JSON[])) as option_value
              FROM ${schemaPrefix}responses r
              INNER JOIN filtered_responses fr ON r.respondent_id = fr.respondent_id
              WHERE r.question_id = '${questionId}'
              AND r.answer_text IS NOT NULL
              AND r.answer_text != '[]'
              AND r.answer_text LIKE '[%'
            ),
            total_count AS (
              SELECT COUNT(DISTINCT respondent_id) as total
              FROM filtered_responses
            )
            SELECT
              option_value::varchar as answer_text,
              CAST(COUNT(DISTINCT respondent_id) AS INTEGER) as count,
              ROUND((COUNT(DISTINCT respondent_id) * 100.0) / (SELECT total FROM total_count), 1) as percentage
            FROM expanded_responses
            WHERE option_value IS NOT NULL
            GROUP BY option_value
            ORDER BY count DESC
          `;
        } else {
          // Single-select and numeric questions
          let filterCondition = '';
          if (whereClause && whereClause !== '1=1' && whereClause.trim()) {
            filterCondition = `AND ${whereClause}`;
          }

          sql = `
            WITH total_count AS (
              SELECT COUNT(DISTINCT r.respondent_id) as total
              FROM ${schemaPrefix}responses r
              WHERE r.question_id = '${questionId}'
              AND r.answer_text IS NOT NULL
              AND TRIM(r.answer_text) != ''
              AND r.answer_text != '[]'
              ${filterCondition}
            )
            SELECT
              r.answer_text::varchar as answer_text,
              CAST(COUNT(DISTINCT r.respondent_id) AS INTEGER) as count,
              ROUND((COUNT(DISTINCT r.respondent_id) * 100.0) / (SELECT total FROM total_count), 1) as percentage
            FROM ${schemaPrefix}responses r
            WHERE r.question_id = '${questionId}'
            AND r.answer_text IS NOT NULL
            AND TRIM(r.answer_text) != ''
            AND r.answer_text != '[]'
            ${filterCondition}
            GROUP BY r.answer_text
            ORDER BY ${questionTypes.isNumeric ? 'CAST(answer_text AS INTEGER)' : 'count DESC'}
          `;
        }
      } else {
        if (questionTypes.isMultiSelect) {
          // Multi-select questions without filters
          sql = `
            WITH expanded_responses AS (
              SELECT
                r.respondent_id,
                unnest(TRY_CAST(r.answer_text AS JSON[])) as option_value
              FROM ${schemaPrefix}responses r
              WHERE r.question_id = '${questionId}'
              AND r.answer_text IS NOT NULL
              AND r.answer_text != '[]'
              AND r.answer_text LIKE '[%'
            ),
            total_count AS (
              SELECT COUNT(DISTINCT respondent_id) as total
              FROM ${schemaPrefix}responses r
              WHERE r.question_id = '${questionId}'
              AND r.answer_text IS NOT NULL
              AND r.answer_text != '[]'
              AND r.answer_text LIKE '[%'
            )
            SELECT
              option_value::varchar as answer_text,
              CAST(COUNT(DISTINCT respondent_id) AS INTEGER) as count,
              ROUND((COUNT(DISTINCT respondent_id) * 100.0) / (SELECT total FROM total_count), 1) as percentage
            FROM expanded_responses
            WHERE option_value IS NOT NULL
            GROUP BY option_value
            ORDER BY count DESC
          `;
        } else {
          // Single-select and numeric questions without filters
          sql = `
            WITH total_count AS (
              SELECT COUNT(DISTINCT r.respondent_id) as total
              FROM ${schemaPrefix}responses r
              WHERE r.question_id = '${questionId}'
              AND r.answer_text IS NOT NULL
              AND TRIM(r.answer_text) != ''
              AND r.answer_text != '[]'
            )
            SELECT
              r.answer_text::varchar as answer_text,
              CAST(COUNT(DISTINCT r.respondent_id) AS INTEGER) as count,
              ROUND((COUNT(DISTINCT r.respondent_id) * 100.0) / (SELECT total FROM total_count), 1) as percentage
            FROM ${schemaPrefix}responses r
            WHERE r.question_id = '${questionId}'
            AND r.answer_text IS NOT NULL
            AND TRIM(r.answer_text) != ''
            AND r.answer_text != '[]'
            GROUP BY r.answer_text
            ORDER BY ${questionTypes.isNumeric ? 'CAST(answer_text AS INTEGER)' : 'count DESC'}
          `;
        }
      }

      if (import.meta.env.DEV) console.log(`getQuantitativeData for ${questionId} (${questionTypes.type}):`, sql.substring(0, 200) + '...');

      // Execute query directly
      const result = await this.conn.query(sql);
      let data = this.convertBigInts(result.toArray());

      // Clean answer text for single-select questions (remove JSON brackets/quotes)
      // Country data (GpGjoO) is already numeric, so we skip cleaning for it
      if (!questionTypes.isMultiSelect && questionId !== 'GpGjoO') {
        data = data.map(row => ({
          ...row,
          answer_text: row.answer_text ? row.answer_text.replace(/[[\]"]/g, '') : row.answer_text
        }));
      }

      // Get respondent counts
      const respondentCounts = await this.getTotalRespondentsForQuestion(questionId, filters);

      if (import.meta.env.DEV) console.log(`getQuantitativeData result for ${questionId}:`, data.length, 'rows');

      // Return wrapped response structure that components expect
      return {
        data: data,
        total_respondents: respondentCounts.total_respondents,
        filtered_respondents: respondentCounts.filtered_respondents
      };
    } catch (error) {
      console.error(`Quantitative data error for ${questionId}:`, error);
      return {
        data: [],
        total_respondents: 0,
        filtered_respondents: 0
      };
    }
  }

  // Helper method to determine question type
  getQuestionType(questionId) {
    // Multi-select questions (store arrays of selections)
    const multiSelectQuestions = [
      'VPeNQ6',   // Primary Purpose
      'rO4YaX',   // Use Cases
      '476OJ5',   // Run Environment 
      'kGozGZ',   // Frustrations
      '089kZ6',   // Customization
      'erJzEk',   // Dashboard Solutions
      '8LBr6x',   // Accessibility
      'Dp8ax5',   // Automation Tools
      'Ma4BjA',   // Missing Features
      'NXjP0j'    // Production Barriers
    ];
    
    // Numeric/Rating questions (store numeric values)
    const numericQuestions = [
      'qGrzG5',   // Rating/scale question
      'QRZ4R1',   // Rating/scale question
      'RoNgoj',   // Rating/scale question
      'erJzrQ',   // Rating/scale question
      '2AWpaV'    // Rating question
    ];
    
    const isMultiSelect = multiSelectQuestions.includes(questionId);
    const isNumeric = numericQuestions.includes(questionId);
    
    return {
      isMultiSelect,
      isNumeric,
      type: isMultiSelect ? 'multi-select' : (isNumeric ? 'numeric' : 'single-select')
    };
  }

  async getQualitativeData(questionId, filters = null) {
    // TEMPORARY: Return mock data for testing qualitative analysis
    if (this.mockMode) {
      if (import.meta.env.DEV) console.log(`🧪 MOCK: Returning mock qualitative data for question ${questionId}`);
      return await this.getMockQualitativeData(questionId, filters);
    }

    try {
      const schemaPrefix = this.needsSchemaPrefix ? 'survey.' : '';

      let sql;

      // Treat empty filters object the same as null (no filters)
      const hasFilters = filters && Object.keys(filters).length > 0;

      if (hasFilters) {
        const whereClause = await this.buildFilterWhereClause(filters);

        let filterCondition = '';
        if (whereClause && whereClause !== '1=1' && whereClause.trim()) {
          filterCondition = whereClause;
        }

        // Use the pre-computed themes with respondent IDs arrays and apply filters
        sql = `
          WITH filtered_respondents AS (
            SELECT DISTINCT r.respondent_id
            FROM ${schemaPrefix}responses r
            ${filterCondition && filterCondition.trim() ? `WHERE ${filterCondition}` : ''}
          ),
          theme_respondents AS (
            SELECT
              qt.theme_name,
              qt.description,
              qt.representative_quotes,
              unnest(qt.respondent_ids) as respondent_id
            FROM ${schemaPrefix}qualitative_themes qt
            WHERE qt.question_id = '${questionId}'
          ),
          filtered_theme_counts AS (
            SELECT
              tr.theme_name,
              tr.description,
              tr.representative_quotes,
              CAST(COUNT(DISTINCT tr.respondent_id) AS INTEGER) as count
            FROM theme_respondents tr
            INNER JOIN filtered_respondents fr ON tr.respondent_id = fr.respondent_id
            GROUP BY tr.theme_name, tr.description, tr.representative_quotes
          ),
          total_filtered AS (
            SELECT CAST(COUNT(DISTINCT fr.respondent_id) AS INTEGER) as total_respondents
            FROM filtered_respondents fr
            WHERE EXISTS (
              SELECT 1
              FROM ${schemaPrefix}qualitative_themes qt2
              WHERE qt2.question_id = '${questionId}'
              AND fr.respondent_id = ANY(qt2.respondent_ids)
            )
          )
          SELECT
            ftc.theme_name,
            ftc.count,
            ROUND(ftc.count * 100.0 / NULLIF(tf.total_respondents, 0), 0) || '%' as percentage,
            ftc.description,
            ftc.representative_quotes
          FROM filtered_theme_counts ftc
          CROSS JOIN total_filtered tf
          ORDER BY ftc.count DESC
        `;

        if (import.meta.env.DEV) console.log(`getQualitativeData filtered for ${questionId}:`, sql.substring(0, 200) + '...');

        // Execute query directly
        const result = await this.conn.query(sql);
        const data = this.convertBigInts(result.toArray());

        // Get the total respondent count for this question
        const respondentCountSql = `
          WITH total_filtered AS (
            SELECT CAST(COUNT(DISTINCT fr.respondent_id) AS INTEGER) as total_respondents
            FROM (
              SELECT DISTINCT r.respondent_id
              FROM ${schemaPrefix}responses r
              ${filterCondition && filterCondition.trim() ? `WHERE ${filterCondition}` : ''}
            ) fr
            WHERE EXISTS (
              SELECT 1
              FROM ${schemaPrefix}qualitative_themes qt
              WHERE qt.question_id = '${questionId}'
              AND fr.respondent_id = ANY(qt.respondent_ids)
            )
          )
          SELECT total_respondents as filtered FROM total_filtered
        `;

        const countResult = await this.conn.query(respondentCountSql);
        const countData = this.convertBigInts(countResult.toArray());
        const filteredCount = countData[0]?.filtered || 0;
        
        if (import.meta.env.DEV) console.log(`getQualitativeData filtered result for ${questionId}:`, data.length, 'themes,', filteredCount, 'respondents');
        
        return {
          themes: data,
          respondentCount: {
            filtered: filteredCount
          }
        };
      } else {
        // Return unfiltered themes, computing frequency and percentage on-the-fly
        sql = `
          WITH total_respondents AS (
            SELECT CAST(COUNT(DISTINCT t.respondent_id) AS INTEGER) as total
            FROM ${schemaPrefix}qualitative_themes,
                 UNNEST(respondent_ids) AS t(respondent_id)
            WHERE question_id = '${questionId}'
          )
          SELECT
            theme_name,
            array_length(respondent_ids) as count,
            ROUND(array_length(respondent_ids) * 100.0 / (SELECT total FROM total_respondents), 1) || '%' as percentage,
            description,
            representative_quotes
          FROM ${schemaPrefix}qualitative_themes
          WHERE question_id = '${questionId}'
          ORDER BY array_length(respondent_ids) DESC
        `;

        if (import.meta.env.DEV) console.log(`getQualitativeData unfiltered for ${questionId}:`, sql.substring(0, 200) + '...');
        const result = await this.conn.query(sql);
        const data = this.convertBigInts(result.toArray());

        // Get total respondent count for unfiltered data
        const respondentCountSql = `
          SELECT CAST(COUNT(DISTINCT t.respondent_id) AS INTEGER) as total
          FROM ${schemaPrefix}qualitative_themes,
               UNNEST(respondent_ids) AS t(respondent_id)
          WHERE question_id = '${questionId}'
        `;

        const countResult = await this.conn.query(respondentCountSql);
        const countData = this.convertBigInts(countResult.toArray());
        const totalCount = countData[0]?.total || 0;

        if (import.meta.env.DEV) console.log(`getQualitativeData unfiltered result for ${questionId}:`, data.length, 'themes,', totalCount, 'respondents');

        return {
          themes: data,
          respondentCount: {
            filtered: totalCount
          }
        };
      }
    } catch (error) {
      console.error(`Qualitative data error for ${questionId}:`, error);
      return {
        themes: [],
        respondentCount: {
          filtered: 0
        }
      };
    }
  }

  async getMatrixData(questionId, filters = null) {
    try {
      const schemaPrefix = this.needsSchemaPrefix ? 'survey.' : '';

      let filterCondition = '';
      if (filters) {
        const whereClause = await this.buildFilterWhereClause(filters);
        if (whereClause && whereClause !== '1=1' && whereClause.trim()) {
          filterCondition = `AND ${whereClause}`;
        }
      }

      // Build SQL to process each sub-question separately
      const sql = `
        WITH filtered_responses AS (
          SELECT
            r.respondent_id,
            r.answer_text
          FROM ${schemaPrefix}responses r
          WHERE r.question_id = '${questionId}'
          AND r.answer_text IS NOT NULL
          AND TRIM(r.answer_text) != ''
          ${filterCondition}
        ),
        total_respondents AS (
          SELECT COUNT(DISTINCT respondent_id) as total
          FROM filtered_responses
        )
        SELECT
          sub_question_id,
          device,
          CAST(COUNT(*) AS INTEGER) as count,
          ROUND((COUNT(*) * 100.0) / (SELECT total FROM total_respondents), 1) as percentage
        FROM (
          SELECT
            fr.respondent_id,
            '0f096ad2-1241-4657-98ac-1c721f958999' as sub_question_id,
            CASE
              WHEN unnest(TRY_CAST(json_extract(fr.answer_text, '$.0f096ad2-1241-4657-98ac-1c721f958999') AS VARCHAR[])) = 'Smartphone' THEN 'Phone'
              ELSE unnest(TRY_CAST(json_extract(fr.answer_text, '$.0f096ad2-1241-4657-98ac-1c721f958999') AS VARCHAR[]))
            END as device
          FROM filtered_responses fr
          WHERE json_extract(fr.answer_text, '$.0f096ad2-1241-4657-98ac-1c721f958999') IS NOT NULL

          UNION ALL

          SELECT
            fr.respondent_id,
            '31f69859-8ab9-4202-8d56-143007730ee1' as sub_question_id,
            CASE
              WHEN unnest(TRY_CAST(json_extract(fr.answer_text, '$.31f69859-8ab9-4202-8d56-143007730ee1') AS VARCHAR[])) = 'Smartphone' THEN 'Phone'
              ELSE unnest(TRY_CAST(json_extract(fr.answer_text, '$.31f69859-8ab9-4202-8d56-143007730ee1') AS VARCHAR[]))
            END as device
          FROM filtered_responses fr
          WHERE json_extract(fr.answer_text, '$.31f69859-8ab9-4202-8d56-143007730ee1') IS NOT NULL

          UNION ALL

          SELECT
            fr.respondent_id,
            '0be2d6bd-10ce-4387-ab24-9bbb64ce6b09' as sub_question_id,
            CASE
              WHEN unnest(TRY_CAST(json_extract(fr.answer_text, '$.0be2d6bd-10ce-4387-ab24-9bbb64ce6b09') AS VARCHAR[])) = 'Smartphone' THEN 'Phone'
              ELSE unnest(TRY_CAST(json_extract(fr.answer_text, '$.0be2d6bd-10ce-4387-ab24-9bbb64ce6b09') AS VARCHAR[]))
            END as device
          FROM filtered_responses fr
          WHERE json_extract(fr.answer_text, '$.0be2d6bd-10ce-4387-ab24-9bbb64ce6b09') IS NOT NULL

          UNION ALL

          SELECT
            fr.respondent_id,
            '91356092-cf0a-4bb5-b467-2c84645328aa' as sub_question_id,
            CASE
              WHEN unnest(TRY_CAST(json_extract(fr.answer_text, '$.91356092-cf0a-4bb5-b467-2c84645328aa') AS VARCHAR[])) = 'Smartphone' THEN 'Phone'
              ELSE unnest(TRY_CAST(json_extract(fr.answer_text, '$.91356092-cf0a-4bb5-b467-2c84645328aa') AS VARCHAR[]))
            END as device
          FROM filtered_responses fr
          WHERE json_extract(fr.answer_text, '$.91356092-cf0a-4bb5-b467-2c84645328aa') IS NOT NULL
        ) as expanded
        WHERE device IS NOT NULL
        GROUP BY sub_question_id, device
        ORDER BY sub_question_id, device
      `;

      if (import.meta.env.DEV) console.log(`getMatrixData for ${questionId}:`, sql.substring(0, 300) + '...');

      const result = await this.conn.query(sql);
      const rows = this.convertBigInts(result.toArray());

      if (import.meta.env.DEV) console.log(`getMatrixData raw result for ${questionId}:`, rows.length, 'rows', rows);

      // Get total respondents
      const totalSql = `
        SELECT CAST(COUNT(DISTINCT respondent_id) AS INTEGER) as total
        FROM ${schemaPrefix}responses r
        WHERE r.question_id = '${questionId}'
        AND r.answer_text IS NOT NULL
        AND TRIM(r.answer_text) != ''
        ${filterCondition}
      `;
      const totalResult = await this.conn.query(totalSql);
      const totalData = this.convertBigInts(totalResult.toArray());
      const totalRespondents = totalData[0]?.total || 0;

      // Transform rows into the format MatrixChart expects
      // Group by sub_question_id and create device objects
      const dataBySubQuestion = {};

      rows.forEach(row => {
        const subQId = row.sub_question_id;
        if (!dataBySubQuestion[subQId]) {
          dataBySubQuestion[subQId] = {
            sub_question_id: subQId,
            total_respondents: totalRespondents
          };
        }

        // Add device data
        dataBySubQuestion[subQId][row.device] = {
          count: row.count,
          percentage: row.percentage
        };
      });

      // Convert to array
      const data = Object.values(dataBySubQuestion);

      if (import.meta.env.DEV) console.log(`getMatrixData transformed result for ${questionId}:`, data);

      return { data };
    } catch (error) {
      console.error(`Matrix data error for ${questionId}:`, error);
      return { data: [] };
    }
  }

  async getTotalRespondents() {
    try {
      // Use prepared statement for total respondents query
      const statementKey = this.generateStatementKey('total_respondents', []);
      const sql = `
        SELECT COUNT(DISTINCT respondent_id) as count
        FROM ${this.needsSchemaPrefix ? 'survey.responses' : 'responses'}
      `;

      const data = await this.executePreparedQuery(statementKey, sql, []);
      return data[0]?.count || 0;
    } catch (error) {
      console.error('Total respondents error:', error);
      return 623; // Fallback to known value
    }
  }


  async getMockQualitativeData(questionId, filters = null) {
    // Simulate some delay like a real query
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock data structure matching the expected qualitative data format
    const mockThemes = [
      {
        theme_name: "Ease of Use",
        count: 47,
        percentage: "32%",
        description: "Users find the interface intuitive and user-friendly",
        representative_quotes: [
          "Very easy to drag and drop components",
          "The visual interface makes complex logic simple",
          "Intuitive workflow design"
        ]
      },
      {
        theme_name: "Learning Curve",
        count: 38,
        percentage: "26%",
        description: "Initial challenges with understanding concepts",
        representative_quotes: [
          "Takes time to understand the flow concept",
          "Documentation could be better for beginners",
          "Complex at first but powerful once you get it"
        ]
      },
      {
        theme_name: "Flexibility & Power",
        count: 35,
        percentage: "24%",
        description: "Appreciation for the tool's versatility and capabilities",
        representative_quotes: [
          "Can integrate with almost anything",
          "Extremely flexible for automation tasks",
          "Powerful tool for IoT projects"
        ]
      },
      {
        theme_name: "Community Support",
        count: 18,
        percentage: "12%",
        description: "Value of community contributions and help",
        representative_quotes: [
          "Great community with helpful nodes",
          "Active forum for getting help",
          "Lots of examples and tutorials available"
        ]
      },
      {
        theme_name: "Performance Issues",
        count: 9,
        percentage: "6%",
        description: "Concerns about system performance and stability",
        representative_quotes: [
          "Can be slow with large datasets",
          "Memory usage grows over time",
          "Occasional crashes with complex flows"
        ]
      }
    ];

    // If filters are applied, simulate reduced counts
    if (filters && Object.keys(filters).some(key =>
      filters[key] &&
      ((Array.isArray(filters[key]) && filters[key].length > 0) ||
       (!Array.isArray(filters[key]) && filters[key].toString().trim()))
    )) {
      return mockThemes.map(theme => ({
        ...theme,
        count: Math.max(1, Math.floor(theme.count * 0.7)), // Reduce by 30% for filters
        percentage: Math.max(1, Math.floor(parseInt(theme.percentage) * 0.7)) + "%"
      }));
    }

    return mockThemes;
  }


  // Execute a raw SQL query (for testing purposes)
  async executeRawQuery(sql) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this.conn.query(sql);
      return this.convertBigInts(result.toArray());
    } catch (error) {
      console.error('Error executing raw query:', error);
      throw error;
    }
  }

  // Cleanup
  async close() {
    if (this.conn) {
      await this.conn.close();
      this.conn = null;
    }
    if (this.db) {
      await this.db.terminate();
      this.db = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.initialized = false;
  }
}

// Export singleton instance
const wasmService = new DuckDBWasmService();

// Make available for browser console testing and E2E tests
if (typeof window !== 'undefined') {
  window.wasmService = wasmService;
  if (import.meta.env?.DEV) console.log('🔧 Development mode: DuckDB WASM service available globally as wasmService');
}

export default wasmService;