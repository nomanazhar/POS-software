
const axios = require('axios');

/**
 * Syncs selected tables in the SQLite database by sending only updated records as JSON to the remote API.
 * Uses incremental sync based on last_sync_time and updated_at timestamps.
 * @param {SQLiteDatabase} database - A better-sqlite3 Database instance
 * @param {string} accessToken - The access token for authentication
 * @param {string} userId - The user ID
 * @param {string[]} selectedTablesList - Array of table names to sync (optional, defaults to all tables)
 * @param {Function} onProgress - Optional progress callback function
 */
async function syncAllTablesWithServer(database, accessToken, userId, selectedTablesList = null, onProgress = null) {
  const API_URL = 'https://martpos.tfourplus.com/api/get-sql-data';
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 30000; // 30 seconds
  
  if (!accessToken) {
    throw new Error('No access token found. Please log in.');
  }

  // 1. Get last sync time for incremental sync
  const { getLastSyncTime, setLastSyncTime } = require('./electron-db.cjs');
  const lastSyncTime = getLastSyncTime();
  const currentTime = new Date().toISOString();

  // 2. Get all table names except sqlite internal and sync_meta
  let tableNames = [];
  try {
    const rows = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'sync_meta'").all();
    tableNames = rows.map((row) => row.name);
  } catch (err) {
    console.error('[sync] Failed to fetch table names:', err.message);
    throw new Error('Failed to fetch table names');
  }

  // 3. Filter tables based on selection
  const tablesToSync = selectedTablesList ? tableNames.filter(table => selectedTablesList.includes(table)) : tableNames;
  
  if (tablesToSync.length === 0) {
    throw new Error('No tables selected for sync');
  }

  // 4. Collect data from selected tables with incremental logic
  const payload = {};
  let totalRecords = 0;
  let updatedRecords = 0;

  for (let i = 0; i < tablesToSync.length; i++) {
    const table = tablesToSync[i];
    
    try {
      let rows;
      if (lastSyncTime) {
        // Incremental sync: only get records updated since last sync
        rows = database.prepare(`SELECT * FROM ${table} WHERE updated_at > ?`).all(lastSyncTime);
        console.log(`[sync] Table '${table}': ${rows.length} records updated since ${lastSyncTime}`);
      } else {
        // First sync: get all records
        rows = database.prepare(`SELECT * FROM ${table}`).all();
        console.log(`[sync] Table '${table}': ${rows.length} total records (first sync)`);
      }
      
      payload[table] = rows;
      totalRecords += rows.length;
      updatedRecords += rows.length;

      // Update progress
      if (onProgress) {
        onProgress({
          table,
          progress: ((i + 1) / tablesToSync.length) * 100,
          currentTable: i + 1,
          totalTables: tablesToSync.length,
          recordsInCurrentTable: rows.length
        });
      }
    } catch (err) {
      console.warn(`[sync] Failed to read table '${table}':`, err.message);
      // Continue with other tables instead of failing completely
    }
  }

  if (updatedRecords === 0) {
    console.log('[sync] No updated records found since last sync');
    return { success: true, message: 'No updates to sync', recordsSynced: 0 };
  }

  // 5. Send to API with retry logic
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[sync] Attempt ${attempt}/${MAX_RETRIES}: Sending ${updatedRecords} records from ${tablesToSync.length} tables`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Validate response status
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      // Validate API response structure
      if (!responseData || typeof responseData.success !== 'boolean') {
        throw new Error('Invalid API response format');
      }

      if (responseData.success) {
        // Update last sync time only on successful sync
        setLastSyncTime(currentTime);
        console.log('[sync] Sync completed successfully');
        return {
          success: true,
          message: `Synced ${updatedRecords} records from ${tablesToSync.length} tables`,
          recordsSynced: updatedRecords,
          tablesSynced: tablesToSync.length,
          timestamp: currentTime
        };
      } else {
        throw new Error(responseData.message || 'API returned success: false');
      }
    } catch (err) {
      lastError = err;
      console.error(`[sync] Attempt ${attempt} failed:`, err.message);
      
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
        console.log(`[sync] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Sync failed after ${MAX_RETRIES} attempts. Last error: ${lastError.message}`);
}

module.exports = { syncAllTablesWithServer };