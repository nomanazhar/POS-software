const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
// const { fileURLToPath } = require('url');
const { initializeDatabase } = require('./electron-db.cjs');
const { getLocalDateTime } = require('./electron-db.cjs');

// Define database path
const dbPath = path.join(app.getPath('userData'), 'app-data.db');
const {
  getAvailableStockWithReservations,
  createReservation,
  updateReservationQuantity,
  cancelReservation,
  completeReservationsForBill
} = require('./electron-db.cjs');

let wsServer = null;
let wsClients = new Set();
let mainWindow = null;
let db = null;  // Single database instance for the application

const { syncAllTablesWithServer } = require('./sync-service.cjs');

const NodeCache = require('node-cache');
const cache = new NodeCache({
  stdTTL: 300,  // 5 minute cache
  checkperiod: 320, // Check for expired keys every 320 seconds
  deleteOnExpire: true, // Delete expired keys
  maxKeys: 100 // Limit maximum number of keys to prevent memory issues
});

// ===== ACCOUNT REPORT HELPERS =====

/**
 * Get transaction details for an account
 */
function getAccountTransactionDetails(accountId) {
  return safeQuery(`
    SELECT 
      t.transaction_id,
      t.account_unique_id,
      a.fullname AS account_fullname,
      t.credit,
      t.debit,
      t.payment_type,
      t.payment_method,
      t.description,
      t.created_at,
      t.order_type,
      t.order_no
    FROM transactions t
    LEFT JOIN accounts a ON t.account_unique_id = a.account_unique_id
    WHERE t.account_unique_id = ?
    ORDER BY t.created_at DESC
  `, [accountId]);
}

/**
 * Search accounts by name or ID
 */
function searchAccounts(searchTerm) {
  const searchParam = `%${searchTerm}%`;
  return safeQuery(`
    SELECT 
      account_id,
      account_unique_id,
      fullname as name,
      account_type,
      account_status,
      balance
    FROM accounts
    WHERE fullname LIKE ? OR account_unique_id LIKE ?
    ORDER BY fullname
    LIMIT 10
  `, [searchParam, searchParam]);
}

// ===== UTILITY FUNCTIONS =====

/**
 * Retrieves data from cache if available, otherwise fetches it using the provided function and caches the result.
 * @param {string} key - The cache key.
 * @param {Function} fetchFn - The function to call to fetch data if not in cache.
 * @returns {*} The cached or fetched data.
 */
// Track in-flight requests to prevent duplicate fetches
const inFlightRequests = new Map();

function getCached(key, fetchFn) {
  // Check if request is already in flight
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  // Check cache first
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  // If not in cache, fetch and cache the data
  try {
    const data = fetchFn();
    if (data) {
      cache.set(key, data);
      return data;
    }
    return [];
  } catch (error) {
    console.error(`Error fetching data for key ${key}:`, error);
    return [];
  } finally {
    inFlightRequests.delete(key);
  }
}

/**
 * Invalidates cache entries based on provided patterns. If no patterns are provided, all cache will be flushed.
 * @param {string[]} patterns - Array of strings. Any cache key containing any of these strings will be invalidated.
 */
function invalidateCache(patterns = []) {
  if (!patterns.length) {
    cache.flushAll();
    console.log('Cache flushed completely.');
    return;
  }
  const keys = cache.keys();
  patterns.forEach(pattern => {
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.del(key);
        console.log(`Cache invalidated for key: ${key}`);
      }
    });
  });
}

// Input validation and sanitization
function validateRequired(data, requiredFields) {
  const errors = [];
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`${field} is required`);
    }
  }
  return errors;
}

function sanitizeString(value) {
  if (typeof value !== 'string') return String(value || '');
  return value.trim();
}

function sanitizeNumber(value, defaultValue = 0) {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

function sanitizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return false;
}

// ===== IPC: Account APIs =====
// Search accounts with optional filters
ipcMain.handle('accounts:search', async (event, { searchTerm = '', accountType } = {}) => {
  try {
    let query = 'SELECT * FROM accounts WHERE 1=1';
    const params = [];
    
    if (searchTerm) {
      query += ' AND (fullname LIKE ? OR account_unique_id LIKE ? OR phone_no LIKE ?)';
      const searchParam = `%${searchTerm}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    if (accountType) {
      query += ' AND account_type = ?';
      params.push(accountType);
    }
    
    query += ' ORDER BY fullname';
    
    const accounts = safeQuery(query, params);
    return { success: true, accounts: accounts || [] };
  } catch (error) {
    console.error('Error searching accounts:', error);
    return { success: false, error: error.message };
  }
});

// Get account by ID
ipcMain.handle('accounts:getById', async (event, accountId) => {
  try {
    const account = safeQuery('SELECT * FROM accounts WHERE account_id = ?', [accountId]);
    if (!account || account.length === 0) {
      return { success: false, error: 'Account not found' };
    }
    return { success: true, account: account[0] };
  } catch (error) {
    console.error('Error getting account by ID:', error);
    return { success: false, error: error.message };
  }
});



// ===== IPC: Reservation and Stock APIs =====
ipcMain.handle('stock:available', (event, productUniqueId) => {
  try {
    const available = getAvailableStockWithReservations(String(productUniqueId));
    return { success: true, available };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('reservation:create', (event, payload) => {
  try {
    const { reservationId, productUniqueId, quantity, terminalId, billId, ttlMinutes } = payload || {};
    const res = createReservation({ reservationId, productUniqueId, quantity, terminalId, billId, ttlMinutes });
    if (res.success) {
      broadcast({ type: 'inventory_update', productId: String(productUniqueId), available: res.available, ts: Date.now() });
    }
    return res;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('reservation:updateQty', (event, payload) => {
  try {
    const { reservationId, newQuantity } = payload || {};
    const res = updateReservationQuantity({ reservationId, newQuantity });
    if (res.success) {
      broadcast({ type: 'inventory_update', productId: String(res.product_unique_id), available: res.available, ts: Date.now() });
    }
    return res;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('reservation:cancel', (event, reservationId) => {
  try {
    const res = cancelReservation(String(reservationId));
    if (res.success && res.product_unique_id) {
      broadcast({ type: 'inventory_update', productId: String(res.product_unique_id), available: res.available, ts: Date.now() });
    }
    return res;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('reservation:completeBill', (event, payload) => {
  try {
    const { billId, terminalId } = payload || {};
    const res = completeReservationsForBill({ billId, terminalId });
    if (res.success) {
      for (const pid of (res.affected || [])) {
        broadcast({ type: 'inventory_update', productId: String(pid), available: getAvailableStockWithReservations(String(pid)), ts: Date.now() });
      }
    }
    return res;
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ===== WEBSOCKET BROADCAST (lightweight, built-in ws from Electron runtime via Node's 'ws' if present) =====
function initWebSocketServer() {
  try {
    const WebSocket = require('ws');
    const port = Number(process.env.WS_PORT || 3001);
    wsServer = new WebSocket.Server({ port });
    wsServer.on('connection', (socket) => {
      wsClients.add(socket);
      socket.on('close', () => wsClients.delete(socket));
    });
    console.log(`[ws] WebSocket server listening on :${port}`);
  } catch (e) {
    console.warn('[ws] WebSocket not initialized:', e.message);
  }
}

function broadcast(messageObj) {
  if (!wsServer || wsClients.size === 0) return;
  const payload = JSON.stringify(messageObj);
  for (const client of wsClients) {
    try {
      if (client.readyState === 1 /* OPEN */) client.send(payload);
    } catch { }
  }
}

/**
 * Rate limiting implementation using a Map to store request counts
 */
const rateLimit = new Map();

/**
 * Checks if an operation has exceeded its rate limit
 * @param {string} operation - The operation to check
 * @param {number} limit - Maximum number of requests allowed in the window
 * @param {number} window - Time window in milliseconds
 * @throws {Error} If rate limit is exceeded
 */

/**
 * Validates data against business rules
 * @param {Object} data - The data to validate
 * @param {Object} rules - The rules to validate against
 * @returns {string[]} Array of validation errors
 */
function validateBusinessRules(data, rules) {
  const errors = [];

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    if (rule.min !== undefined && value < rule.min) {
      errors.push(`${field} cannot be less than ${rule.min}`);
    }
    if (rule.max !== undefined && value > rule.max) {
      errors.push(`${field} cannot be more than ${rule.max}`);
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${field} format is invalid`);
    }
    if (rule.custom && !rule.custom(value)) {
      errors.push(rule.message || `${field} validation failed`);
    }
  }

  return errors;
}

/**
 * Validates data against a schema
 * @param {Object} data - The data to validate
 * @param {Object} schema - The schema to validate against
 * @returns {string[]} Array of validation errors
 */
function validateData(data, schema) {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    if (rules.type && typeof value !== rules.type) {
      errors.push(`${field} must be of type ${rules.type}`);
    }
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
    }
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
    }
  }

  return errors;
}

/**
 * Executes an operation with retry logic
 * @param {Function} operation - The operation to execute
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise<*>} The result of the operation
 * @throws {Error} The last error encountered after all retries
 */
async function withRetry(operation, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(`Operation failed (attempt ${attempt}/${maxRetries}):`, error);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
}

// Secure database operations
/**
 * Executes a SELECT query with rate limiting and SQL injection checks
 * @param {string} query - The SQL query to execute
 * @param {Array} params - Query parameters
 * @param {Object} options - Additional options
 * @returns {Array} Query results
 * @throws {Error} If rate limit exceeded or operation fails
 */
function safeQuery(query, params = [], options = {}) {
  try {
    // Rate limiting - temporarily disabled to prevent infinite loops
    // checkRateLimit(options.operation || 'query');

    // SQL injection check
    const sqlInjectionPattern = /(\b(union|select|insert|update|delete|drop|alter)\b.*\b(union|select|insert|update|delete|drop|alter)\b)/i;
    if (sqlInjectionPattern.test(query)) {
      throw new Error('Invalid query pattern detected');
    }

    const stmt = db.prepare(query);
    return stmt.all(...params);
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error(`Database operation failed: ${error.message}`);
  }
}

/**
 * Executes an INSERT/UPDATE/DELETE query with rate limiting and SQL injection checks
 * @param {string} query - The SQL query to execute
 * @param {Array} params - Query parameters
 * @param {Object} options - Additional options
 * @returns {Object} Query result
 * @throws {Error} If rate limit exceeded or operation fails
 */
function safeRun(query, params = [], options = {}) {
  try {
    // Rate limiting - temporarily disabled to prevent infinite loops
    // checkRateLimit(options.operation || 'mutation');

    // SQL injection check
    const sqlInjectionPattern = /(\b(union|select|insert|update|delete|drop|alter)\b.*\b(union|select|insert|update|delete|drop|alter)\b)/i;
    if (sqlInjectionPattern.test(query)) {
      throw new Error('Invalid query pattern detected');
    }

    console.log('[SQL DEBUG] Preparing query:', query);
    console.log('[SQL DEBUG] With params:', params);
    console.log('[SQL DEBUG] Param types:', params.map(p => typeof p));
    
    const stmt = db.prepare(query);
    const result = stmt.run(...params);
    
    console.log('[SQL DEBUG] Query executed successfully. Rows affected:', result.changes);
    return result;
  } catch (error) {
    console.error('[SQL ERROR] Database run error details:', {
      error: error.message,
      query: query,
      params: params,
      paramTypes: params.map(p => typeof p),
      stack: error.stack
    });
    throw new Error(`Database operation failed: ${error.message}`);
  }
}

// Consistent error response
function createErrorResponse(error, context = '') {
  console.error(`[${context}] Error:`, error);
  return {
    success: false,
    error: error.message || 'Unknown error occurred',
    timestamp: new Date().toISOString(),
    context
  };
}

function createSuccessResponse(data = null, message = 'Operation completed successfully') {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

// Helper: normalize payment method to cash|card|ledger
function normalizePaymentMethod(method) {
  const m = (method || '').toString().toLowerCase();
  if (m === 'cash') return 'cash';
  if (m === 'card' || m === 'bank' || m === 'pos') return 'card';
  return 'ledger';
}

// Helper: generate unique ID
// Simple in-memory counter to avoid duplicate IDs generated within the same millisecond
let __uniqueCounter = 0;
function generateUniqueId(companyId = '1', branchId = '1') {
  const ts = Date.now();
  // If clock tick hasn't advanced, increment counter; else reset.
  if (generateUniqueId.__lastTs === ts) {
    __uniqueCounter += 1;
  } else {
    __uniqueCounter = 0;
    generateUniqueId.__lastTs = ts;
  }
  return `${companyId}_${branchId}_${ts}_${__uniqueCounter}`;
}


// Helper: get next sequential numeric ID for a table/column
function getNextSequentialId(tableName, idColumn) {
  try {
    const row = safeQuery(`SELECT CAST(${idColumn} AS INTEGER) AS id_num FROM ${tableName} WHERE ${idColumn} IS NOT NULL AND TRIM(${idColumn}) <> '' ORDER BY id_num DESC LIMIT 1`);
    const currentMax = row.length > 0 && typeof row[0].id_num === 'number' ? row[0].id_num : 0;
    return String(currentMax + 1);
  } catch (e) {
    console.error('Error getting sequential ID:', e);
    // Fallback to timestamp-based if query fails, but still numeric-ish
    const ts = Date.now() % 1000000000;
    return String(ts);
  }
}

// Reusable transaction helper that handles both regular and central transactions
async function createTransactionPair({
  accountId, uniqueId, billId, billType, totalAmount,
  paymentType, paymentMethod, companyId, branchId, userId,
  credit, debit, isReturn = false
}) {
  try {
    // Calculate based on transaction type
    let customerSupplierCredit = 0;
    let customerSupplierDebit = 0;
    let martCredit = 0;
    let martDebit = 0;

    if (billType === 'bill') {
      // Sale transaction
      customerSupplierCredit = totalAmount - debit; // Outstanding amount customer owes
      // customerSupplierDebit = debit; // Amount customer paid (recorded as debit)
      martCredit = debit; // Cash received
    } else if (billType === 'purchase') {
      // Purchase transaction
      // customerSupplierCredit = totalAmount - debit; // Outstanding amount we owe supplier
      customerSupplierDebit = debit; // Amount paid to supplier
      martDebit = debit; // Cash paid
    }

    // 1. Create customer/supplier transaction
    const mainTransaction = upsertMainTransaction({
      accountId,
      uniqueId,
      billId,
      billType,
      totalAmount,
      paymentType,
      paymentMethod,
      companyId,
      branchId,
      userId,
      credit: customerSupplierCredit,
      debit: customerSupplierDebit
    });

    // 2. Create mart account transaction
    const martTransaction = upsertMainTransaction({
      accountId: null,
      uniqueId: MART_ACCOUNT_UNIQUE_ID,
      billId,
      billType,
      totalAmount: billType === 'bill' ? martCredit : martDebit,
      paymentType: billType === 'bill' ? 'credit' : 'debit',
      paymentMethod,
      companyId,
      branchId,
      userId,
      credit: martCredit,
      debit: martDebit
    });

    return mainTransaction;
  } finally {
    recalcAccountBalancesFromTransactions();
  }
}

// Synchronous version of createTransactionPair for use in database transactions
function createTransactionPairSync({
  accountId, uniqueId, billId, billType, totalAmount,
  paymentType, paymentMethod, companyId, branchId, userId,
  credit, debit, isReturn = false
}) {
  try {
    console.log('=== createTransactionPairSync START ===');
    console.log('Input parameters:', {
      accountId, uniqueId, billId, billType, totalAmount,
      paymentType, paymentMethod, companyId, branchId, userId,
      credit, debit, isReturn
    });

    // Calculate based on transaction type
    let customerSupplierCredit = 0;
    let customerSupplierDebit = 0;
    let martCredit = 0;
    let martDebit = 0;

    if (billType === 'bill') {
      // Sale transaction
      customerSupplierCredit = totalAmount - debit; // Customer owes this (unpaid)
      martCredit = debit; // Cash received
    } else if (billType === 'purchase') {
      customerSupplierDebit = totalAmount - debit; // Amount we've owe to supplier
      martDebit = debit; // Cash paid out from mart account
    }

    // 1. Create customer/supplier transaction
    console.log('Creating customer/supplier transaction with:', {
      accountId,
      uniqueId,
      billId,
      billType,
      totalAmount,
      paymentType,
      paymentMethod,
      companyId,
      branchId,
      userId,
      credit: customerSupplierCredit,
      debit: customerSupplierDebit
    });
    const mainTransaction = upsertMainTransaction({
      accountId,
      uniqueId,
      billId,
      billType,
      totalAmount,
      paymentType,
      paymentMethod,
      companyId,
      branchId,
      userId,
      credit: customerSupplierCredit,
      debit: customerSupplierDebit
    });

    // 2. Create mart account transaction
    const martTransaction = upsertMainTransaction({
      accountId: null,
      uniqueId: MART_ACCOUNT_UNIQUE_ID,
      billId,
      billType,
      totalAmount: billType === 'bill' ? martCredit : martDebit,
      paymentType: billType === 'bill' ? 'credit' : 'debit',
      paymentMethod,
      companyId,
      branchId,
      userId,
      credit: martCredit,
      debit: martDebit
    });

    return mainTransaction;


  }
  finally {
    recalcAccountBalancesFromTransactions();
  }
}

// Synchronous version of getMartAccountBalance
function getMartAccountBalanceSync() {
  try {
    const result = safeQuery(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_type = 'credit' THEN credit ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN payment_type = 'debit' THEN debit ELSE 0 END), 0) as balance
      FROM transactions 
      WHERE account_unique_id = ?
    `, [MART_ACCOUNT_UNIQUE_ID]);

    return Number(result[0]?.balance || 0);
  } catch (error) {
    console.error('Error getting mart account balance:', error);
    return 0;
  }
}

// Main transaction creation (renamed from upsertTransaction)
function upsertMainTransaction({
  accountId, uniqueId, billId, billType, totalAmount,
  paymentType, paymentMethod, companyId, branchId, userId,
  credit, debit,
}) {
  console.log('=== upsertMainTransaction START ===');
  console.log('Input parameters:', {
    accountId, uniqueId, billId, billType, totalAmount,
    paymentType, paymentMethod, companyId, branchId, userId,
    credit, debit
  });

  try {
    const now = getLocalDateTime();
    const orderType = (billType || '').toString().toLowerCase();
    const orderNo = billId != null ? String(billId) : null;

    // Ensure totalAmount reflects full order total from DB if available
    let resolvedTotal = sanitizeNumber(totalAmount);
    try {
      if (orderType === 'bill' && orderNo) {
        const row = safeQuery('SELECT total_amount FROM bill_orders WHERE billno = ? LIMIT 1', [orderNo]);
        if (row.length > 0 && row[0].total_amount != null) {
          resolvedTotal = sanitizeNumber(row[0].total_amount, resolvedTotal);
        }
      } else if (orderType === 'purchase' && orderNo) {
        const row = safeQuery('SELECT total_amount FROM purchase_orders WHERE purchase_billno = ? LIMIT 1', [orderNo]);
        if (row.length > 0 && row[0].total_amount != null) {
          resolvedTotal = sanitizeNumber(row[0].total_amount, resolvedTotal);
        }
      } else if (orderType === 'quotation' && orderNo) {
        const row = safeQuery('SELECT total_amount FROM quotations WHERE quotationno = ? LIMIT 1', [orderNo]);
        if (row.length > 0 && row[0].total_amount != null) {
          resolvedTotal = sanitizeNumber(row[0].total_amount, resolvedTotal);
        }
      }
    } catch (e) {
      console.error('Error resolving total amount:', e);
    }

    const normalizedMethod = normalizePaymentMethod(paymentMethod);

    // Upsert by (order_no, order_type, account_unique_id)
    const existing = orderNo && uniqueId
      ? safeQuery('SELECT transaction_id FROM transactions WHERE order_no = ? AND order_type = ? AND account_unique_id = ? LIMIT 1', [orderNo, orderType, uniqueId])
      : [];

    console.log('Checking for existing transaction:', { orderNo, orderType, uniqueId, existingCount: existing.length });

    if (existing.length > 0 && existing[0].transaction_id) {
      console.log('Updating existing transaction:', existing[0].transaction_id);
      safeRun(`
        UPDATE transactions SET 
          account_unique_id = ?, total_amount = ?, credit = ?, debit = ?,
          payment_type = ?, payment_method = ?, company_id = ?, branch_id = ?,
          updated_at = ?
        WHERE transaction_id = ?
      `, [
        uniqueId ?? null,
        resolvedTotal,
        sanitizeNumber(credit),
        sanitizeNumber(debit),
        paymentType,
        normalizedMethod,
        companyId,
        branchId,
        now,
        existing[0].transaction_id
      ]);
      console.log('Transaction updated successfully');
    } else {
      console.log('Creating new transaction...');
      const transactionUniqueId = generateUniqueId(companyId, branchId);
      console.log('Generated transaction unique ID:', transactionUniqueId);

      safeRun(`
        INSERT INTO transactions (
          transaction_unique_id, account_unique_id, order_no, order_type, total_amount,
          credit, debit, payment_type, payment_method, added_by, company_id, branch_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        transactionUniqueId,
        uniqueId ?? null,
        orderNo,
        orderType,
        resolvedTotal,
        sanitizeNumber(credit),
        sanitizeNumber(debit),
        paymentType,
        normalizedMethod,
        userId || 'admin',
        companyId,
        branchId,
        now,
        now
      ]);
      console.log('New transaction created successfully');

      // Update account balance
      if (uniqueId) {  // Only update if we have a valid account ID
        const accountUpdate = safeRun(`
          UPDATE accounts 
          SET balance = (
            SELECT COALESCE(SUM(
              CASE 
                WHEN payment_type = 'credit' THEN credit
                WHEN payment_type = 'debit' THEN -debit
                ELSE 0
              END
            ), 0) 
            FROM transactions 
            WHERE account_unique_id = ?
          ),
          updated_at = ?
          WHERE account_unique_id = ?
        `, [uniqueId, now, uniqueId]);

        console.log('Account balance updated for account:', uniqueId);
      }
    }
  } catch (error) {
    console.error('Error in upsertMainTransaction:', error);
    throw error;
  }
  console.log('=== upsertMainTransaction COMPLETE ===');
}

// Central mart account helpers
const MART_ACCOUNT_UNIQUE_ID = '1_1_mart_account';

// Get current mart account balance
async function getMartAccountBalance() {
  try {
    const result = safeQuery(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_type = 'credit' THEN credit ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN payment_type = 'debit' THEN debit ELSE 0 END), 0) as balance
      FROM transactions 
      WHERE account_unique_id = ?
    `, [MART_ACCOUNT_UNIQUE_ID]);

    return result[0]?.balance || 0;
  } catch (error) {
    console.error('Error getting mart account balance:', error);
    return 0;
  }
}

function ensureCentralAccount() {
  try {
    // Check if account exists inside a transaction to prevent race conditions
    const result = db.transaction(() => {
      const existing = safeQuery('SELECT account_unique_id FROM accounts WHERE account_unique_id = ? LIMIT 1', [MART_ACCOUNT_UNIQUE_ID]);
      if (existing.length > 0) return true;

      const now = getLocalDateTime();
      safeRun(`
        INSERT INTO accounts (
          account_unique_id, fullname, email, phone_no, address, second_address, city,
          account_type, account_status, account_limit, total_credit, total_debit, balance,
          loyality_points, discount_rate, remarks, added_by, company_id, branch_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        MART_ACCOUNT_UNIQUE_ID,
        'mart-account',
        null,
        null,
        null,
        null,
        null,
        'user',
        'active',
        0,
        0,
        0,
        0,
        0,
        0,
        'Central cash/bank control account',
        'admin',
        '1',
        '1',
        now,
        now
      ]);
      return false;
    })();

    return MART_ACCOUNT_UNIQUE_ID;
  } catch (e) {
    console.error('Failed to ensure central account exists:', e);
    return MART_ACCOUNT_UNIQUE_ID; // still return the expected id
  }
}


// Helper: find or get account for a bill (by account_unique_id) - IMPROVED
function getOrCreateAccountForBill(bill) {
  if (!bill) return { accountId: null, uniqueId: null };

  try {
    const accountUnique = bill.account_unique_id || bill.accountUniqueId || null;
    if (accountUnique) {
      const acc = safeQuery(
        'SELECT account_id AS id, account_unique_id AS unique_id FROM accounts WHERE account_unique_id = ? LIMIT 1',
        [accountUnique]
      );
      if (acc.length > 0) {
        return { accountId: acc[0].id, uniqueId: acc[0].unique_id };
      }
    }
  } catch (error) {
    console.error('Error getting account for bill:', error);
  }

  return { accountId: null, uniqueId: null };
}

// Helper: find or get account for a purchase (by account_unique_id) - IMPROVED
function getOrCreateAccountForPurchase(purchase) {
  if (!purchase) return { accountId: null, uniqueId: null };

  try {
    const accountUnique = purchase.account_unique_id || purchase.supplier_unique_id || null;
    if (accountUnique) {
      const acc = safeQuery(
        'SELECT account_id AS id, account_unique_id AS unique_id FROM accounts WHERE account_unique_id = ? LIMIT 1',
        [accountUnique]
      );
      if (acc.length > 0) {
        return { accountId: acc[0].id, uniqueId: acc[0].unique_id };
      }
    }
  } catch (error) {
    console.error('Error getting account for purchase:', error);
  }

  return { accountId: null, uniqueId: null };
}

// Helper: Check if product is used in other records
function isProductUsedElsewhere(productId, excludePurchaseId = null) {
  try {
    let otherPurchasesQuery = 'SELECT COUNT(*) as count FROM purchase_orders WHERE purchase_items LIKE ?';
    let otherPurchasesParams = [`%${productId}%`];

    if (excludePurchaseId) {
      otherPurchasesQuery += ' AND purchase_billno != ?';
      otherPurchasesParams.push(excludePurchaseId);
    }

    const otherPurchases = safeQuery(otherPurchasesQuery, otherPurchasesParams);
    const otherBills = safeQuery('SELECT COUNT(*) as count FROM bill_orders WHERE bill_items LIKE ?', [`%${productId}%`]);

    const totalUsage = (otherPurchases[0]?.count || 0) + (otherBills[0]?.count || 0);
    return totalUsage > 0;
  } catch (error) {
    console.error('Error checking product usage:', error);
    return true; // Assume used if error occurs (safer)
  }
}

// Helper: Safely delete unused products
function deleteUnusedProducts(productIds, excludePurchaseId = null) {
  const deletedProducts = [];

  for (const productId of productIds) {
    if (!isProductUsedElsewhere(productId, excludePurchaseId)) {
      try {
        console.log(`Deleting unused product: ${productId}`);
        safeRun('DELETE FROM products WHERE product_unique_id = ?', [productId]);
        safeRun('DELETE FROM inventory WHERE product_unique_id = ?', [productId]);
        deletedProducts.push(productId);
      } catch (error) {
        console.error(`Error deleting product ${productId}:`, error);
      }
    } else {
      console.log(`Product ${productId} is still used elsewhere, keeping it`);
    }
  }

  return deletedProducts;
}

// Calculate account balances from transactions table (proper double-entry accounting)
function recalcAccountBalancesFromTransactions() {
  console.log("[INFO] Recalculating account balances from transactions...");

  try {
    // Get all transactions grouped by account
    const accountBalances = safeQuery(`
      SELECT 
        t.account_unique_id,
        a.account_type,
        COALESCE(SUM(t.credit), 0) as total_credit,
        COALESCE(SUM(t.debit), 0) as total_debit,
        (COALESCE(SUM(t.credit), 0) - COALESCE(SUM(t.debit), 0)) as net_balance
      FROM transactions t
      JOIN accounts a ON a.account_unique_id = t.account_unique_id
      WHERE t.account_unique_id IS NOT NULL 
        AND TRIM(t.account_unique_id) <> ''
      GROUP BY t.account_unique_id, a.account_type
    `);

    console.log(`[INFO] Processing ${accountBalances.length} account balances...`);

    // Update each account's balance
    for (const account of accountBalances) {
      const accId = account.account_unique_id;
      const accountType = (account.account_type || '').toLowerCase();
      
      // Ensure proper type conversion
      const credit = Number(account.total_credit) || 0;
      const debit = Number(account.total_debit) || 0;
      const totalAmount = Number(account.total_amount) || 0;

      let outCredit = 0;
      let outDebit = 0;
      let outBalance = 0;
      
      // Debug log the raw values from the database
      console.log(`[DEBUG] Raw values for account ${accId}:`, {
        credit: account.total_credit,
        creditType: typeof account.total_credit,
        debit: account.total_debit,
        debitType: typeof account.total_debit,
        accountType: account.account_type
      });

      if (accId === MART_ACCOUNT_UNIQUE_ID) {
        // Mart account shows all transactions
        outCredit = credit;
        outDebit = debit;
        outBalance = outCredit - outDebit;
      } else if (accountType === 'customer') {
        outCredit = credit;
        outDebit = debit;
        outBalance = credit - debit;
      } else if (accountType === 'supplier') {
        outDebit = debit;
        outCredit = credit;
        outBalance = debit - credit;
      } else {
        // Other accounts show both sides
        outCredit = credit;
        outDebit = debit;
        outBalance = outCredit - outDebit;
      }

      console.log(`[DEBUG] Updating account ${accId} (${accountType}): ` +
        `Credit=${outCredit} (type: ${typeof outCredit}), ` +
        `Debit=${outDebit} (type: ${typeof outDebit}), ` +
        `Balance=${outBalance} (type: ${typeof outBalance})`);

      // Update the account with both credit and debit
      const query = `
        UPDATE accounts 
        SET total_credit = ?,
            total_debit = ?,
            balance = ?,
            updated_at = ?
        WHERE account_unique_id = ?
      `;
      const now = getLocalDateTime();
      const params = [outCredit, outDebit, outBalance, now, accId];
      console.log('Executing SQL from recalcAccountBalancesFromTransactions:', {
        query,
        params: {
          outCredit,
          outDebit,
          outBalance,
          updatedAt: now,
          accountId: accId
        },
        paramTypes: params.map(p => typeof p)
      });
      safeRun(query, params);
    }
    console.log("[INFO] Account balances updated successfully");
    return { success: true, updated: accountBalances.length };
  } catch (error) {
    console.error("[ERROR] Failed to recalculate account balances:", error);
    throw error;
  }
}


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Detect if running in development (VITE_DEV_SERVER_URL) or production
  const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;
  if (isDev) {
    // Default Vite dev server URL
    const devServerURL = (process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173') + '/sign-in';
    mainWindow.loadURL(devServerURL);

    // Open DevTools in development
    mainWindow.webContents.openDevTools();

    // Enable hot reload for development
    mainWindow.webContents.on('did-fail-load', () => {
      console.log('Failed to load, retrying...');
      setTimeout(() => {
        mainWindow.loadURL(devServerURL);
      }, 1000);
    });
  } else {
    // Load the built index.html from dist with hash routing to /sign-in
    // In production, use app.getAppPath() to get the correct path to the asar file
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'), { hash: '/sign-in' });
  }
}

// Function to ensure users table exists
function ensureUsersTableExists() {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone_no TEXT,
        plan TEXT,
        plan_duration TEXT,
        plan_start TEXT,
        plan_enddate TEXT,
        status TEXT DEFAULT 'active',
        user_details TEXT,
        role TEXT NOT NULL,
        password TEXT NOT NULL,
        added_by TEXT,
        company_id TEXT,
        branch_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table verified/created successfully');
  } catch (error) {
    console.error('Error ensuring users table exists:', error);
    throw new Error(`Failed to ensure users table exists: ${error.message}`);
  }
}

// Function to safely get the database instance
function getDb() {
  if (!db) {
    try {
      db = initializeDatabase();
      console.log('Database initialized successfully');
      return db;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      dialog.showErrorBox(
        'Database Error',
        `Unable to initialize the database. Please check the logs for more details.\n\n` +
        `Error: ${error.message}\n\n` +
        `Database path: ${dbPath}`
      );
      // Give some time for the error dialog to be shown before exiting
      setTimeout(() => process.exit(1), 1000);
      return null;
    }
  }
  return db;
}

app.whenReady().then(() => {
  try {
    // First initialize the database
    db = getDb();
    if (!db) {
      throw new Error('Failed to initialize database');
    }
    
    // Then ensure the users table exists
    ensureUsersTableExists();
    
    // Only create the window after database is ready
    createWindow();
    
    // Start lightweight WebSocket server for real-time inventory updates
    initWebSocketServer();
    
    console.log('Application started successfully');
  } catch (error) {
    console.error('Failed to start application:', error);
    const errorMessage = `Failed to start application: ${error.message}\n\n` +
      (db ? `Database path: ${db.name}` : 'Database not initialized');
    
    dialog.showErrorBox('Startup Error', errorMessage);
    setTimeout(() => app.quit(), 1000);
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Handle window reload for development
ipcMain.handle('app:reload', () => {
  if (mainWindow) {
    mainWindow.reload();
  }
});

// Handle window reload for development
ipcMain.handle('app:openDevTools', () => {
  if (mainWindow) {
    mainWindow.webContents.openDevTools();
  }
});

// Debug handler to check table schema
ipcMain.handle('debug:checkTableSchema', async () => {
  try {
    // console.log('=== CHECKING TABLE SCHEMA ===');
    const tableInfo = db.prepare("PRAGMA table_info(categories)").all();
    // console.log('Categories table schema:', tableInfo);

    const existingCategories = db.prepare('SELECT * FROM categories LIMIT 3').all();
    // console.log('Existing categories sample:', existingCategories);

    return {
      success: true,
      schema: tableInfo,
      sampleData: existingCategories
    };
  } catch (error) {
    console.error('Schema check error:', error);
    return { success: false, error: error.message };
  }
});

// Temporary debug handler to query transaction data for a specific customer account
ipcMain.handle('debug:getCustomerTransactionData', async (event, accountUniqueId) => {
  try {
    console.log(`[DEBUG] Fetching transaction data for account: ${accountUniqueId}`);
    const rows = db.prepare(`
      SELECT 
        account_unique_id,
        SUM(COALESCE(credit, 0)) AS total_credit,
        SUM(COALESCE(debit, 0)) AS total_debit,
        (SUM(COALESCE(credit, 0)) - SUM(COALESCE(debit, 0))) AS net_balance
      FROM transactions 
      WHERE account_unique_id = ?
      GROUP BY account_unique_id
    `).all(accountUniqueId);

    console.log('[DEBUG] Customer transaction data:', rows);
    return { success: true, data: rows };
  } catch (error) {
    console.error('Error fetching customer transaction data:', error);
    return { success: false, error: error.message };
  }
});

// Debug handler to check supplier table schema
ipcMain.handle('debug:checkSupplierSchema', async () => {
  try {
    // console.log('=== CHECKING SUPPLIER TABLE SCHEMA ===');
    const tableInfo = db.prepare("PRAGMA table_info(suppliers)").all();
    // console.log('Suppliers table schema:', tableInfo);

    const existingSuppliers = db.prepare('SELECT * FROM suppliers LIMIT 3').all();
    // console.log('Existing suppliers sample:', existingSuppliers);

    return {
      success: true,
      schema: tableInfo,
      sampleData: existingSuppliers
    };
  } catch (error) {
    console.error('Supplier schema check error:', error);
    return { success: false, error: error.message };
  }
});

// IPC handlers for categories - IMPROVED
ipcMain.handle('categories:getAll', async () => {
  const cacheKey = 'categories:all';
  try {
    const data = getCached(cacheKey, () => {
      const result = safeQuery(`
        SELECT 
          c.*,
          COALESCE(p.product_count, 0) as products_count
        FROM categories c
        LEFT JOIN (
          SELECT 
            category_unique_id,
            COUNT(*) as product_count
          FROM products
          GROUP BY category_unique_id
        ) p ON c.category_unique_id = p.category_unique_id
        ORDER BY c.category_id ASC
      `);

      // console.log('Raw categories query result:', result);
      // Ensure all data is serializable by converting to plain objects
      if (Array.isArray(result)) {
        return result.map(item => ({
          category_id: item.category_id,
          category_unique_id: item.category_unique_id,
          category_name: item.category_name,
          description: item.description,
          icon: item.icon,
          status: item.status,
          added_by: item.added_by,
          company_id: item.company_id,
          branch_id: item.branch_id,
          created_at: item.created_at,
          updated_at: item.updated_at,
          products_count: item.products_count || 0
        }));
      }
      return [];
    });

    return createSuccessResponse(data);
  } catch (error) {
    console.error('Error in categories:getAll:', error);
    return createErrorResponse(error, 'categories:getAll');
  }
});

ipcMain.handle('categories:add', async (event, category) => {
  try {
    // Validate required fields
    const requiredFields = ['category_name'];
    const validationErrors = validateRequired(category, requiredFields);
    if (validationErrors.length > 0) {
      return createErrorResponse(new Error(validationErrors.join(', ')), 'categories:add');
    }

    // Check for duplicate category name
    const existing = safeQuery(
      'SELECT category_id FROM categories WHERE category_name = ? AND company_id = ? AND branch_id = ? LIMIT 1',
      [sanitizeString(category.category_name), category.company_id || '1', category.branch_id || '1']
    );

    if (existing.length > 0) {
      return createErrorResponse(new Error('Category with this name already exists'), 'categories:add');
    }

    // Prepare data for insertion using new schema
    const insertData = {
      category_unique_id: category.category_unique_id || generateUniqueId(category.company_id, category.branch_id),
      category_name: sanitizeString(category.category_name),
      description: category.description ? sanitizeString(category.description) : null,
      status: sanitizeString(category.status || 'active'),
      icon: category.icon ? sanitizeString(category.icon) : null,
      added_by: sanitizeString(category.added_by || 'admin'),
      company_id: sanitizeString(category.company_id || '1'),
      branch_id: sanitizeString(category.branch_id || '1'),
    };

    const result = safeRun(`
      INSERT INTO categories (
        category_unique_id, category_name, description, status, icon, 
        added_by, company_id, branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      insertData.category_unique_id,
      insertData.category_name,
      insertData.description,
      insertData.status,
      insertData.icon,
      insertData.added_by,
      insertData.company_id,
      insertData.branch_id
    ]);

    invalidateCache(['categories:', 'products:']); // Invalidate related caches
    return createSuccessResponse({ category_id: result.lastInsertRowid }, 'Category added successfully');
  } catch (error) {
    return createErrorResponse(error, 'categories:add');
  }
});

ipcMain.handle('categories:update', async (event, category) => {
  try {
    // Validate required fields
    const requiredFields = ['category_name', 'category_id'];
    const validationErrors = validateRequired(category, requiredFields);
    if (validationErrors.length > 0) {
      return createErrorResponse(new Error(validationErrors.join(', ')), 'categories:update');
    }

    // Check if category exists
    const existingCategory = safeQuery('SELECT * FROM categories WHERE category_id = ? LIMIT 1', [category.category_id]);
    if (existingCategory.length === 0) {
      return createErrorResponse(new Error('Category not found'), 'categories:update');
    }

    // Check for duplicate category name (excluding current category)
    const duplicateCheck = safeQuery(
      'SELECT category_id FROM categories WHERE category_name = ? AND company_id = ? AND branch_id = ? AND category_id != ? LIMIT 1',
      [sanitizeString(category.category_name), category.company_id || '1', category.branch_id || '1', category.category_id]
    );

    if (duplicateCheck.length > 0) {
      return createErrorResponse(new Error('Category with this name already exists'), 'categories:update');
    }

    safeRun(`
      UPDATE categories SET 
        category_unique_id = ?,
        category_name = ?, 
        description = ?, 
        status = ?, 
        icon = ?, 
        added_by = ?, 
        company_id = ?, 
        branch_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE category_id = ?
    `, [
      category.category_unique_id || existingCategory[0].category_unique_id,
      sanitizeString(category.category_name),
      category.description ? sanitizeString(category.description) : null,
      sanitizeString(category.status || 'active'),
      category.icon ? sanitizeString(category.icon) : null,
      sanitizeString(category.added_by || 'admin'),
      sanitizeString(category.company_id || '1'),
      sanitizeString(category.branch_id || '1'),
      category.category_id
    ]);

    invalidateCache(['categories:', 'products:']); // Invalidate related caches
    return createSuccessResponse(null, 'Category updated successfully');
  } catch (error) {
    return createErrorResponse(error, 'categories:update');
  }
});

ipcMain.handle('categories:delete', async (event, categoryId) => {
  try {
    if (!categoryId) {
      return createErrorResponse(new Error('Category ID is required'), 'categories:delete');
    }

    // Check if category exists before deleting
    const existingCategory = safeQuery('SELECT * FROM categories WHERE category_id = ? LIMIT 1', [categoryId]);
    if (existingCategory.length === 0) {
      return createErrorResponse(new Error('Category not found'), 'categories:delete');
    }

    // Check if category is being used by products
    const productsUsingCategory = safeQuery(
      'SELECT COUNT(*) as count FROM products WHERE category_unique_id = ? LIMIT 1',
      [existingCategory[0].category_unique_id]
    );

    if (productsUsingCategory[0].count > 0) {
      return createErrorResponse(
        new Error('Cannot delete category: It is being used by products. Please reassign or delete the products first.'),
        'categories:delete'
      );
    }

    safeRun('DELETE FROM categories WHERE category_id = ?', [categoryId]);

    invalidateCache(['categories:', 'products:']); // Invalidate related caches
    return createSuccessResponse(null, 'Category deleted successfully');
  } catch (error) {
    return createErrorResponse(error, 'categories:delete');
  }
});

ipcMain.handle('categories:getByName', async (event, categoryName) => {
  try {
    if (!categoryName) {
      return createErrorResponse(new Error('Category name is required'), 'categories:getByName');
    }

    const result = safeQuery(
      'SELECT * FROM categories WHERE category_name = ? LIMIT 1',
      [sanitizeString(categoryName)]
    );

    if (result.length === 0) {
      return createSuccessResponse(null, 'Category not found');
    }

    const category = result[0];
    return createSuccessResponse({
      category_id: category.category_id,
      category_unique_id: category.category_unique_id,
      category_name: category.category_name,
      description: category.description,
      icon: category.icon,
      status: category.status,
      added_by: category.added_by,
      company_id: category.company_id,
      branch_id: category.branch_id,
      created_at: category.created_at,
      updated_at: category.updated_at,
      products_count: 0 // Will be calculated separately if needed
    });
  } catch (error) {
    return createErrorResponse(error, 'categories:getByName');
  }
});

// IPC handlers for products - IMPROVED
ipcMain.handle('products:getAll', async () => {
  try {
    console.log('Fetching products from database...');

    const data = safeQuery(`
      SELECT 
        p.*,
        c.category_name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_unique_id = c.category_unique_id
      ORDER BY p.product_id ASC
    `);

    // console.log('Raw products data from database:', data);

    // Ensure all data is serializable by converting to plain objects
    const serializedData = Array.isArray(data) ? data.map(item => {
      const serializedItem = {
        product_id: Number(item.product_id || 0),
        product_unique_id: String(item.product_unique_id || ''),
        product_name: String(item.product_name || ''),
        barcode: String(item.barcode || ''),
        brand: String(item.brand || ''),
        category_unique_id: String(item.category_unique_id || ''),
        category_name: String(item.category_name || ''),
        retail_price: Number(item.retail_price || 0),
        wholesale_price: Number(item.wholesale_price || 0),
        purchase_price: Number(item.purchase_price || 0),
        alertqty: Number(item.alertqty || 0),
        tax: Number(item.tax || 0),
        discount: Number(item.discount || 0),
        status: String(item.status || 'active'),
        returnable: Number(item.returnable || 0),
        added_by: String(item.added_by || 'admin'),
        company_id: String(item.company_id || '1'),
        branch_id: String(item.branch_id || '1'),
        created_at: String(item.created_at || ''),
        updated_at: String(item.updated_at || '')
      };

      // console.log('Serialized product item:', serializedItem);
      return serializedItem;
    }) : [];

    // console.log('Final serialized products data:', serializedData);

    return createSuccessResponse(serializedData);
  } catch (error) {
    console.error('Error in products:getAll:', error);
    return createErrorResponse(error, 'products:getAll');
  }
});

ipcMain.handle('products:add', async (event, product) => {
  try {
    // Validate required fields
    const requiredFields = ['product_name', 'barcode', 'brand', 'category_unique_id'];
    const validationErrors = validateRequired(product, requiredFields);
    if (validationErrors.length > 0) {
      return createErrorResponse(new Error(validationErrors.join(', ')), 'products:add');
    }

    // Check for duplicate barcode
    const existingBarcode = safeQuery(
      'SELECT product_id FROM products WHERE barcode = ? AND company_id = ? AND branch_id = ? LIMIT 1',
      [sanitizeString(product.barcode), product.company_id || '1', product.branch_id || '1']
    );

    if (existingBarcode.length > 0) {
      return createErrorResponse(new Error('Product with this barcode already exists'), 'products:add');
    }

    // Validate category exists
    const categoryExists = safeQuery(
      'SELECT category_id FROM categories WHERE category_unique_id = ? LIMIT 1',
      [product.category_unique_id]
    );

    if (categoryExists.length === 0) {
      return createErrorResponse(new Error('Selected category does not exist'), 'products:add');
    }

    const safeProduct = {
      product_unique_id: product.product_unique_id || generateUniqueId(product.company_id, product.branch_id),
      product_name: sanitizeString(product.product_name),
      barcode: sanitizeString(product.barcode),
      brand: sanitizeString(product.brand),
      category_unique_id: sanitizeString(product.category_unique_id),
      retail_price: sanitizeNumber(product.retail_price),
      wholesale_price: sanitizeNumber(product.wholesale_price),
      purchase_price: sanitizeNumber(product.purchase_price),
      alertqty: sanitizeNumber(product.alertqty),
      tax: sanitizeNumber(product.tax),
      discount: sanitizeNumber(product.discount),
      status: sanitizeString(product.status || 'active'),
      returnable: sanitizeBoolean(product.returnable) ? 1 : 0,
      added_by: sanitizeString(product.added_by || 'admin'),
      company_id: sanitizeString(product.company_id || '1'),
      branch_id: sanitizeString(product.branch_id || '1'),
    };

    // Use transaction for data integrity
    const runTx = db.transaction(() => {
      // Insert product
      const result = safeRun(`
        INSERT INTO products (
          product_unique_id, product_name, barcode, brand, category_unique_id, 
          retail_price, wholesale_price, purchase_price, alertqty, tax, discount, 
          status, returnable, added_by, company_id, branch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        safeProduct.product_unique_id,
        safeProduct.product_name,
        safeProduct.barcode,
        safeProduct.brand,
        safeProduct.category_unique_id,
        safeProduct.retail_price,
        safeProduct.wholesale_price,
        safeProduct.purchase_price,
        safeProduct.alertqty,
        safeProduct.tax,
        safeProduct.discount,
        safeProduct.status,
        safeProduct.returnable,
        safeProduct.added_by,
        safeProduct.company_id,
        safeProduct.branch_id
      ]);

      // Ensure inventory row exists for this product
      const existing = safeQuery('SELECT inventory_id FROM inventory WHERE product_unique_id = ? LIMIT 1', [safeProduct.product_unique_id]);
      if (existing.length === 0) {
        safeRun(`
          INSERT INTO inventory (
            inventory_unique_id, product_unique_id, stock, retail_price, 
            category_name, added_by, company_id, branch_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          generateUniqueId(safeProduct.company_id, safeProduct.branch_id),
          safeProduct.product_unique_id,
          0,
          safeProduct.retail_price,
          null,
          safeProduct.added_by,
          safeProduct.company_id,
          safeProduct.branch_id
        ]);
      }

      return result;
    });

    const result = runTx();

    invalidateCache(['categories:', 'products:', 'inventory:']); // Invalidate related caches
    return createSuccessResponse({ product_id: result.lastInsertRowid }, 'Product added successfully');
  } catch (error) {
    return createErrorResponse(error, 'products:add');
  }
});

ipcMain.handle('products:update', async (event, product) => {
  try {
    const stmt = db.prepare(`
      UPDATE products SET 
        product_unique_id = ?, product_name = ?, barcode = ?, brand = ?, 
        category_unique_id = ?, retail_price = ?, wholesale_price = ?, 
        purchase_price = ?, alertqty = ?, tax = ?, discount = ?, 
        status = ?, returnable = ?, added_by = ?, company_id = ?, 
        branch_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ?
    `);

    const result = stmt.run(
      product.product_unique_id,
      product.product_name,
      product.barcode,
      product.brand,
      product.category_unique_id,
      Number(product.retail_price || 0),
      Number(product.wholesale_price || 0),
      Number(product.purchase_price || 0),
      Number(product.alertqty || 0),
      Number(product.tax || 0),
      Number(product.discount || 0),
      product.status,
      typeof product.returnable === 'boolean' ? (product.returnable ? 1 : 0) : (product.returnable || 0),
      product.added_by,
      product.company_id,
      product.branch_id,
      product.product_id
    );

    invalidateCache(['categories:', 'products:', 'inventory:']); // Invalidate related caches
    return { success: true };
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
});

ipcMain.handle('products:delete', async (event, productId) => {
  try {
    db.prepare('DELETE FROM products WHERE product_id = ?').run(productId);
    invalidateCache(['categories:', 'products:', 'inventory:']); // Invalidate related caches
    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
});

// IPC handlers for accounts (replaces customers and suppliers)
ipcMain.handle('accounts:getAll', async () => {
  try {
    const data = db.prepare('SELECT * FROM accounts ORDER BY account_id ASC').all();
    console.log('[accounts:getAll] Fetched accounts:', data?.length || 0, 'records');
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return { success: false, error: error.message || 'Failed to fetch accounts', data: [] };
  }
});

ipcMain.handle('accounts:getByType', async (event, accountType) => {
  try {
    const data = db.prepare('SELECT * FROM accounts WHERE account_type = ? ORDER BY account_id ASC').all(accountType);
    console.log(`[accounts:getByType] Fetched ${accountType} accounts:`, data?.length || 0, 'records');
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching accounts by type:', error);
    return { success: false, error: error.message || 'Failed to fetch accounts by type', data: [] };
  }
});

ipcMain.handle('accounts:add', async (event, account) => {
  try {
    const safeAccount = {
      account_unique_id: account.account_unique_id || `${account.company_id || '1'}_${account.branch_id || '1'}_${Date.now()}`,
      fullname: account.fullname,
      email: account.email || null,
      phone_no: account.phone_no || null,
      address: account.address || null,
      second_address: account.second_address || null,
      city: account.city || null,
      account_type: account.account_type, // customer, supplier, user
      account_status: account.account_status || 'active',
      account_limit: Number(account.account_limit || 0),
      total_credit: Number(account.total_credit || 0),
      total_debit: Number(account.total_debit || 0),
      balance: Number(account.balance || 0),
      loyality_points: Number(account.loyality_points || 0),
      discount_rate: Number(account.discount_rate || 0),
      remarks: account.remarks || null,
      added_by: account.added_by || 'admin',
      company_id: account.company_id || '1',
      branch_id: account.branch_id || '1',
    };

    const stmt = db.prepare(`
      INSERT INTO accounts (
        account_unique_id, fullname, email, phone_no, address, second_address, city, 
        account_type, account_status, account_limit, total_credit, total_debit, balance, 
        loyality_points, discount_rate, remarks, added_by, company_id, branch_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      safeAccount.account_unique_id,
      safeAccount.fullname,
      safeAccount.email,
      safeAccount.phone_no,
      safeAccount.address,
      safeAccount.second_address,
      safeAccount.city,
      safeAccount.account_type,
      safeAccount.account_status,
      safeAccount.account_limit,
      safeAccount.total_credit,
      safeAccount.total_debit,
      safeAccount.balance,
      safeAccount.loyality_points,
      safeAccount.discount_rate,
      safeAccount.remarks,
      safeAccount.added_by,
      safeAccount.company_id,
      safeAccount.branch_id,
      new Date().toISOString(), // created_at
      new Date().toISOString()  // updated_at
    );

    return { success: true, account_id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding account:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
});

ipcMain.handle('accounts:update', async (event, account) => {
  try {
    // Don't manually update balance fields - they should be calculated from transactions
    const stmt = db.prepare(`
      UPDATE accounts SET 
        account_unique_id = ?, fullname = ?, email = ?, phone_no = ?, 
        address = ?, second_address = ?, city = ?, account_type = ?, 
        account_status = ?, account_limit = ?, loyality_points = ?, 
        discount_rate = ?, remarks = ?, added_by = ?, company_id = ?, 
        branch_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE account_id = ?
    `);

    const result = stmt.run(
      account.account_unique_id,
      account.fullname,
      account.email,
      account.phone_no,
      account.address,
      account.second_address,
      account.city,
      account.account_type,
      account.account_status,
      Number(account.account_limit || 0),
      Number(account.loyality_points || 0),
      Number(account.discount_rate || 0),
      account.remarks,
      account.added_by,
      account.company_id,
      account.branch_id,
      account.account_id
    );

    console.log(`[accounts:update] Updated account ${account.account_id}`);

    // Recalculate balances after update
    recalcAccountBalancesFromTransactions();

    return { success: true };
  } catch (error) {
    console.error('Error updating account:', error);
    return { success: false, error: error.message || 'Failed to update account' };
  }
});

ipcMain.handle('accounts:delete', async (event, accountId) => {
  try {
    // Check if account has transactions before deleting
    const account = db.prepare('SELECT account_unique_id FROM accounts WHERE account_id = ?').get(accountId);
    if (!account) {
      return { success: false, error: 'Account not found' };
    }

    const transactionCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE account_unique_id = ?').get(account.account_unique_id);
    if (transactionCount.count > 0) {
      return { success: false, error: 'Cannot delete account with existing transactions. Please archive instead.' };
    }

    db.prepare('DELETE FROM accounts WHERE account_id = ?').run(accountId);
    console.log(`[accounts:delete] Deleted account ${accountId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting account:', error);
    return { success: false, error: error.message || 'Failed to delete account' };
  }
});

ipcMain.handle('accounts:updateStatus', async (event, { accountId, status }) => {
  try {
    const stmt = db.prepare('UPDATE accounts SET account_status = ?, updated_at = CURRENT_TIMESTAMP WHERE account_id = ?');
    const result = stmt.run(status, accountId);

    if (result.changes === 0) {
      return { success: false, error: 'Account not found' };
    }

    console.log(`[accounts:updateStatus] Updated account ${accountId} status to ${status}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating account status:', error);
    return { success: false, error: error.message || 'Failed to update account status' };
  }
});

// IPC handlers for bill_orders (replaces bills)
ipcMain.handle('bill_orders:getAll', async () => {
  try {
    const bills = db.prepare('SELECT * FROM bill_orders').all();

    // Parse JSON items for each bill
    const result = bills.map(bill => ({
      ...bill,
      bill_items: bill.bill_items ? JSON.parse(bill.bill_items) : []
    }));

    return result || [];
  } catch (error) {
    console.error('Error fetching bill orders:', error);
    return [];
  }
});

// Keep backward compatibility with old bills:getAll handler
ipcMain.handle('bills:getAll', async () => {
  try {
    console.log('Fetching bills from database...');

    const bills = safeQuery('SELECT * FROM bill_orders ORDER BY bill_id DESC');
    // console.log('Raw bills data from database:', bills);

    // Map to expected format with correct field names
    const result = bills.map(bill => {
      const mappedBill = {
        bill_id: String(bill.bill_id || ''),
        bill_unique_id: String(bill.bill_unique_id || ''),
        billno: String(bill.billno || ''),
        account_unique_id: String(bill.account_unique_id || ''),
        total_amount: Number(bill.total_amount || 0),
        paid_amount: Number(bill.paid_amount || 0),
        balance: Number(bill.balance || 0),
        payment_method: String(bill.payment_method || 'cash'),
        payment_status: String(bill.payment_status || 'pending'),
        sale_type: String(bill.sale_type || 'retail'),
        isreturned: Number(bill.isreturned || 0),
        total_tax: Number(bill.total_tax || 0),
        total_discount: Number(bill.total_discount || 0),
        extracharges: Number(bill.extracharges || 0),
        item_count: Number(bill.item_count || (Array.isArray(bill.bill_items) ? bill.bill_items.length : 0)),
        bill_items: bill.bill_items ? JSON.parse(bill.bill_items) : [],
        // Add missing field for return bills
        original_bill_billno: String(bill.original_bill_billno || ''),
        company_id: String(bill.company_id || '1'),
        branch_id: String(bill.branch_id || '1'),
        added_by: String(bill.added_by || 'admin'),
        created_at: String(bill.created_at || ''),
        updated_at: String(bill.updated_at || '')
      };

      // console.log('Mapped bill:', mappedBill);
      return mappedBill;
    });

    // console.log('Final bills result count:', result.length);
    return createSuccessResponse(result || [], 'Bills retrieved successfully');
  } catch (error) {
    console.error('Error fetching bills:', error);
    return createErrorResponse(error, 'bills:getAll');
  }
});
ipcMain.handle('bills:add', async (event, bill) => {
  try {
    // Validate required fields
    const requiredFields = ['account_unique_id', 'total_amount'];
    const validationErrors = validateRequired(bill, requiredFields);
    if (validationErrors.length > 0) {
      return createErrorResponse(new Error(validationErrors.join(', ')), 'bills:add');
    }

    const now = getLocalDateTime();
    const nextBillNo = getNextSequentialId('bill_orders', 'billno');

    // Auto-detect payment method and status
    const autoPaymentMethod = sanitizeNumber(bill.paid_amount || 0) >= sanitizeNumber(bill.total_amount) ? 'cash' : 'ledger';
    const autoPaymentStatus = sanitizeNumber(bill.paid_amount || 0) >= sanitizeNumber(bill.total_amount) ? 'paid' : 'pending';

    const safeBill = {
      bill_unique_id: bill.bill_unique_id || generateUniqueId(bill.company_id || '1', bill.branch_id || '1'),
      billno: bill.billno || nextBillNo,
      account_unique_id: sanitizeString(bill.account_unique_id),
      total_amount: sanitizeNumber(bill.total_amount),
      paid_amount: sanitizeNumber(bill.paid_amount || 0),
      balance: sanitizeNumber(bill.balance ?? (sanitizeNumber(bill.total_amount) - sanitizeNumber(bill.paid_amount || 0))),
      payment_method: autoPaymentMethod,
      payment_status: autoPaymentStatus,
      sale_type: sanitizeString(bill.sale_type || 'retail'),
      isreturned: sanitizeBoolean(bill.isreturned || bill.is_returned) ? 1 : 0,
      total_tax: sanitizeNumber(bill.total_tax || 0),
      total_discount: sanitizeNumber(bill.total_discount || 0),
      extracharges: sanitizeNumber(bill.extracharges || 0),
      item_count: sanitizeNumber(bill.item_count || (Array.isArray(bill.bill_items) ? bill.bill_items.length : 0)),
      bill_items: typeof bill.bill_items === 'string' ? bill.bill_items : JSON.stringify(bill.bill_items || []),
      original_bill_billno: bill.original_bill_billno || null,
      added_by: sanitizeString(bill.added_by || 'admin'),
      company_id: sanitizeString(bill.company_id || '1'),
      branch_id: sanitizeString(bill.branch_id || '1'),
      created_at: bill.created_at || now,
      updated_at: bill.updated_at || now,
    };

    // Debug logging for safeBill object
    console.log('=== DEBUG: safeBill object created ===');
    console.log('safeBill.original_bill_billno:', safeBill.original_bill_billno);
    console.log('=== END DEBUG ===');

    const runTx = db.transaction(() => {
      console.log('=== STARTING BILL TRANSACTION ===');
      console.log('=== DEBUG: Bill object received ===');
      console.log('Bill isreturned:', bill.isreturned);
      console.log('Bill original_bill_billno:', bill.original_bill_billno);
      console.log('Bill original_bill_billno type:', typeof bill.original_bill_billno);
      console.log('Bill original_bill_billno truthy check:', !!bill.original_bill_billno);
      console.log('Bill object keys:', Object.keys(bill));
      console.log('Full bill object:', JSON.stringify(bill, null, 2));
      console.log('=== END DEBUG ===');

      // Note: Original bill quantities are not updated - only tracking returns

      // Insert into bill_orders table
      const insertBill = db.prepare(`
        INSERT INTO bill_orders (
          bill_unique_id, billno, account_unique_id, total_amount, paid_amount, balance,
          payment_method, payment_status, sale_type, isreturned, total_tax, total_discount,
          extracharges, item_count, bill_items, original_bill_billno, added_by, company_id, branch_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      console.log('Inserting bill with data:', {
        bill_unique_id: safeBill.bill_unique_id,
        billno: safeBill.billno,
        account_unique_id: safeBill.account_unique_id,
        total_amount: safeBill.total_amount,
        paid_amount: safeBill.paid_amount,
        balance: safeBill.balance,
        original_bill_billno: safeBill.original_bill_billno
      });

      // Debug logging for INSERT parameters
      console.log('=== DEBUG: INSERT parameters ===');
      console.log('Parameter 16 (original_bill_billno):', safeBill.original_bill_billno);
      console.log('=== END DEBUG ===');

      const result = insertBill.run(
        safeBill.bill_unique_id,
        safeBill.billno,
        safeBill.account_unique_id,
        safeBill.total_amount,
        safeBill.paid_amount,
        safeBill.balance,
        safeBill.payment_method,
        safeBill.payment_status,
        safeBill.sale_type,
        safeBill.isreturned,
        safeBill.total_tax,
        safeBill.total_discount,
        safeBill.extracharges,
        safeBill.item_count,
        safeBill.bill_items,
        safeBill.original_bill_billno,
        safeBill.added_by,
        safeBill.company_id,
        safeBill.branch_id,
        safeBill.created_at,
        safeBill.updated_at
      );

      console.log('Bill inserted successfully, ID:', result.lastInsertRowid);

      // Debug logging: Verify the inserted data
      console.log('=== DEBUG: Verifying inserted data ===');
      try {
        const insertedBill = safeQuery('SELECT * FROM bill_orders WHERE bill_id = ? LIMIT 1', [result.lastInsertRowid]);
        if (insertedBill.length > 0) {
          console.log('Inserted bill data:', {
            bill_id: insertedBill[0].bill_id,
            billno: insertedBill[0].billno,
            isreturned: insertedBill[0].isreturned,
            original_bill_billno: insertedBill[0].original_bill_billno
          });
        }
      } catch (error) {
        console.error('Error verifying inserted data:', error);
      }
      console.log('=== END DEBUG ===');

      // Update inventory stock for each item
      try {
        console.log('=== INVENTORY UPDATE DEBUG ===');
        console.log('Bill isreturned:', safeBill.isreturned);
        console.log('Bill isreturned type:', typeof safeBill.isreturned);
        console.log('Bill isreturned boolean check:', Boolean(safeBill.isreturned));
        console.log('Bill items:', safeBill.bill_items);

        const items = (() => { try { return JSON.parse(safeBill.bill_items || '[]') } catch { return [] } })();
        console.log('Parsed items:', items);

        const getInv = db.prepare('SELECT * FROM inventory WHERE product_unique_id = ? LIMIT 1');
        const updInv = db.prepare(`UPDATE inventory SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE inventory_id = ?`);
        const insInv = db.prepare(`INSERT INTO inventory (inventory_unique_id, product_unique_id, stock, retail_price, category_name, added_by, company_id, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

        for (const it of (items || [])) {
          const prodUid = String(it.product_unique_id || it.productId || '');
          if (!prodUid) continue;
          const qtyRaw = Number(it.quantity || it.item_qty || 0);
          const qty = safeBill.isreturned ? qtyRaw : -qtyRaw; // sale reduces stock; return increases

          console.log(`Processing item: ${prodUid}, qtyRaw: ${qtyRaw}, isreturned: ${safeBill.isreturned}, final qty: ${qty}`);

          const existing = getInv.get(prodUid);
          if (existing && existing.inventory_id) {
            console.log(`Updating inventory for ${prodUid}: current stock ${existing.stock} + ${qty} = ${existing.stock + qty}`);
            updInv.run(qty, existing.inventory_id);
          } else {
            // If no inventory row, create one with qty (could be negative if sale before add; clamp to 0)
            const initQty = Math.max(0, qty);
            console.log(`Creating new inventory for ${prodUid} with stock: ${initQty}`);
            insInv.run(
              generateUniqueId(safeBill.company_id, safeBill.branch_id),
              prodUid,
              initQty,
              Number(it.unit_price || it.retail_price || 0),
              null,
              safeBill.added_by,
              safeBill.company_id,
              safeBill.branch_id
            );
          }
        }
        console.log('=== INVENTORY UPDATE COMPLETE ===');
      } catch (e) {
        console.error('Failed to update inventory for bill:', e);
      }

      // Upsert transaction for this bill
      // Create transaction pair using our new helper (SYNC version)
      try {
        console.log('=== CREATING TRANSACTION FOR BILL ===');
        const { accountId, uniqueId } = getOrCreateAccountForBill({ account_unique_id: safeBill.account_unique_id });
        console.log('Account lookup result:', { accountId, uniqueId });
        const isReturn = Boolean(safeBill.isreturned);
        const totalAmount = Number(safeBill.total_amount || 0);
        const paidAmount = Number(safeBill.paid_amount || 0);
        const balance = Math.max(0, totalAmount - paidAmount);
        console.log('Transaction parameters:', { isReturn, totalAmount, paidAmount, balance });

        // Auto-detect payment method based on payment amount
        const autoPaymentMethod = paidAmount >= totalAmount ? 'cash' : 'ledger';
        const autoPaymentStatus = paidAmount >= totalAmount ? 'paid' : 'pending';

        // For sales:
        // - Credit: Total amount (what customer owes)
        // - Debit: Paid amount (what customer paid)
        // For returns:
        // - Credit: -Total amount (reverse what customer owed)
        // - Debit: -Paid amount (reverse what customer paid)
        createTransactionPairSync({
          accountId,
          uniqueId,
          billId: String(safeBill.billno),
          billType: 'bill',
          totalAmount,
          credit: totalAmount, // Full amount is credited (customer owes this)
          debit: paidAmount,   // Only paid amount is debited
          paymentType: balance > 0 ? 'credit' : 'debit', // If balance exists, customer owes (credit)
          paymentMethod: autoPaymentMethod,
          companyId: safeBill.company_id,
          branchId: safeBill.branch_id,
          userId: safeBill.added_by || null,
          isReturn
        });
        console.log('Transaction created successfully');
      } catch (transactionError) {
        console.error('Error creating transaction:', transactionError);
        throw new Error(`Transaction creation failed: ${transactionError.message}`);
      }

      // After inserting bill and transaction, recalc account balances from transactions
      recalcAccountBalancesFromTransactions();

      console.log('=== EXECUTING BILL TRANSACTION ===');
      return result;
    });

    console.log('=== EXECUTING BILL TRANSACTION ===');
    const result = runTx();
    console.log('=== BILL TRANSACTION COMPLETED ===');
    console.log('Bill result:', result);
    invalidateCache(['bills:', 'bill_orders:', 'inventory:']);

    return createSuccessResponse({ bill_id: result.lastInsertRowid }, 'Bill added successfully');
  } catch (error) {
    console.error('Error adding bill:', error, '\nBill object:', JSON.stringify(bill, null, 2));
    return createErrorResponse(error, 'bills:add');
  }
});
ipcMain.handle('bills:update', async (event, bill) => {
  try {
    // Validate required fields
    const requiredFields = ['bill_id', 'account_unique_id', 'total_amount'];
    const validationErrors = validateRequired(bill, requiredFields);
    if (validationErrors.length > 0) {
      return createErrorResponse(new Error(validationErrors.join(', ')), 'bills:update');
    }

    // Check if bill exists
    const existingBill = safeQuery('SELECT * FROM bill_orders WHERE bill_id = ? LIMIT 1', [bill.bill_id]);
    if (existingBill.length === 0) {
      return createErrorResponse(new Error('Bill not found'), 'bills:update');
    }

    const now = getLocalDateTime();

    const safeBill = {
      bill_unique_id: bill.bill_unique_id || existingBill[0].bill_unique_id,
      billno: bill.billno || existingBill[0].billno,
      account_unique_id: sanitizeString(bill.account_unique_id),
      total_amount: sanitizeNumber(bill.total_amount),
      paid_amount: sanitizeNumber(bill.paid_amount || 0),
      balance: sanitizeNumber(bill.balance ?? (sanitizeNumber(bill.total_amount) - sanitizeNumber(bill.paid_amount || 0))),
      payment_method: sanitizeString(bill.payment_method || 'cash'),
      payment_status: sanitizeString(bill.payment_status || 'pending'),
      sale_type: sanitizeString(bill.sale_type || 'retail'),
      isreturned: sanitizeBoolean(bill.isreturned || bill.is_returned) ? 1 : 0,
      total_tax: sanitizeNumber(bill.total_tax || 0),
      total_discount: sanitizeNumber(bill.total_discount || 0),
      extracharges: sanitizeNumber(bill.extracharges || 0),
      item_count: sanitizeNumber(bill.item_count || (Array.isArray(bill.bill_items) ? bill.bill_items.length : 0)),
      bill_items: typeof bill.bill_items === 'string' ? bill.bill_items : JSON.stringify(bill.bill_items || []),
      original_bill_billno: bill.isreturned && bill.original_bill_billno ? bill.original_bill_billno : null,
      added_by: sanitizeString(bill.added_by || 'admin'),
      company_id: sanitizeString(bill.company_id || '1'),
      branch_id: sanitizeString(bill.branch_id || '1'),
      updated_at: now,
    };

    const runTx = db.transaction(() => {
      // Update bill_orders table
      const updateBill = db.prepare(`
        UPDATE bill_orders SET 
          bill_unique_id = ?, billno = ?, account_unique_id = ?, total_amount = ?, 
          paid_amount = ?, balance = ?, payment_method = ?, payment_status = ?, 
          sale_type = ?, isreturned = ?, total_tax = ?, total_discount = ?, 
          extracharges = ?, item_count = ?, bill_items = ?, original_bill_billno = ?, added_by = ?, 
          company_id = ?, branch_id = ?, updated_at = ?
        WHERE bill_id = ?
      `);

      updateBill.run(
        safeBill.bill_unique_id,
        safeBill.billno,
        safeBill.account_unique_id,
        safeBill.total_amount,
        safeBill.paid_amount,
        safeBill.balance,
        safeBill.payment_method,
        safeBill.payment_status,
        safeBill.sale_type,
        safeBill.isreturned,
        safeBill.total_tax,
        safeBill.total_discount,
        safeBill.extracharges,
        safeBill.item_count,
        safeBill.bill_items,
        safeBill.original_bill_billno,
        safeBill.added_by,
        safeBill.company_id,
        safeBill.branch_id,
        safeBill.updated_at,
        bill.bill_id
      );

      // Update inventory stock for each item (reverse previous effect, apply new effect)
      try {
        const oldItems = (() => { try { return JSON.parse(existingBill[0].bill_items || '[]') } catch { return [] } })();
        const newItems = (() => { try { return JSON.parse(safeBill.bill_items || '[]') } catch { return [] } })();

        const getInv = db.prepare('SELECT * FROM inventory WHERE product_unique_id = ? LIMIT 1');
        const updInv = db.prepare(`UPDATE inventory SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE inventory_id = ?`);

        // Reverse old bill effect
        for (const oldItem of oldItems) {
          const prodUid = String(oldItem.product_unique_id || oldItem.productId || '');
          if (!prodUid) continue;
          const qtyRaw = Number(oldItem.quantity || oldItem.item_qty || 0);
          const qty = existingBill[0].isreturned ? -qtyRaw : qtyRaw; // reverse the old effect
          const existing = getInv.get(prodUid);
          if (existing && existing.inventory_id) {
            updInv.run(qty, existing.inventory_id);
          }
        }

        // Apply new bill effect
        for (const newItem of newItems) {
          const prodUid = String(newItem.product_unique_id || newItem.productId || '');
          if (!prodUid) continue;
          const qtyRaw = Number(newItem.quantity || newItem.item_qty || 0);
          const qty = safeBill.isreturned ? qtyRaw : -qtyRaw; // new effect
          const existing = getInv.get(prodUid);
          if (existing && existing.inventory_id) {
            updInv.run(qty, existing.inventory_id);
          }
        }
      } catch (e) {
        console.error('Failed to update inventory for bill update:', e);
      }

      // Upsert transaction for this bill update
      const { accountId, uniqueId } = getOrCreateAccountForBill({ account_unique_id: safeBill.account_unique_id });
      const isReturn = safeBill.isreturned ? 1 : 0;
      const effBal = isReturn ? -Math.max(0, safeBill.balance) : Math.max(0, safeBill.balance);
      const effPaid = isReturn ? -Math.max(0, safeBill.paid_amount) : Math.max(0, safeBill.paid_amount);
      const paymentType = effBal > 0 ? 'debit' : 'credit';
      const paymentMethod = effBal > 0 ? 'ledger' : (safeBill.payment_method || 'cash');

      upsertTransaction({
        accountId,
        uniqueId,
        billId: String(safeBill.billno),
        billType: 'bill',
        totalAmount: Number(safeBill.total_amount || 0),
        credit: effPaid,
        debit: Math.max(0, effBal),
        paymentType,
        paymentMethod,
        companyId: safeBill.company_id,
        branchId: safeBill.branch_id,
        userId: safeBill.added_by || null,
      });

      // After updating bill and transaction, recalc account balances from transactions
      recalcAccountBalancesFromTransactions();
    });

    runTx();
    invalidateCache(['bills:', 'bill_orders:', 'inventory:']);

    return createSuccessResponse(null, 'Bill updated successfully');
  } catch (error) {
    console.error('Error updating bill:', error);
    return createErrorResponse(error, 'bills:update');
  }
});
ipcMain.handle('bills:delete', async (event, billId) => {
  try {
    if (!billId) {
      return createErrorResponse(new Error('Bill ID is required'), 'bills:delete');
    }

    // Check if bill exists before deleting
    const existingBill = safeQuery('SELECT * FROM bill_orders WHERE bill_id = ? LIMIT 1', [billId]);
    if (existingBill.length === 0) {
      return createErrorResponse(new Error('Bill not found'), 'bills:delete');
    }

    const runTx = db.transaction(() => {
      // Reverse inventory effect before deleting
      try {
        const items = (() => { try { return JSON.parse(existingBill[0].bill_items || '[]') } catch { return [] } })();
        const getInv = db.prepare('SELECT * FROM inventory WHERE product_unique_id = ? LIMIT 1');
        const updInv = db.prepare(`UPDATE inventory SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE inventory_id = ?`);

        for (const it of (items || [])) {
          const prodUid = String(it.product_unique_id || it.productId || '');
          if (!prodUid) continue;
          const qtyRaw = Number(it.quantity || it.item_qty || 0);
          const qty = existingBill[0].isreturned ? -qtyRaw : qtyRaw; // reverse the effect
          const existing = getInv.get(prodUid);
          if (existing && existing.inventory_id) {
            updInv.run(qty, existing.inventory_id);
          }
        }
      } catch (e) {
        console.error('Failed to reverse inventory for bill deletion:', e);
      }

      // Delete from bill_orders table
      safeRun('DELETE FROM bill_orders WHERE bill_id = ?', [billId]);

      // Remove corresponding transaction
      safeRun('DELETE FROM transactions WHERE order_no = ? AND order_type = ?', [existingBill[0].billno, 'bill']);
      // Remove central account mirror
      safeRun('DELETE FROM transactions WHERE order_no = ? AND order_type = ? AND account_unique_id = ?', [existingBill[0].billno, 'bill', '1_1_mart_account']);

      // Recalculate account balances from transactions
      recalcAccountBalancesFromTransactions();
    });

    runTx();
    invalidateCache(['bills:', 'bill_orders:', 'inventory:']);

    return createSuccessResponse(null, 'Bill deleted successfully');
  } catch (error) {
    console.error('Error deleting bill:', error);
    return createErrorResponse(error, 'bills:delete');
  }
});

// IPC handlers for quotations (no transactions or accounts updates)
ipcMain.handle('quotations:getAll', async () => {
  try {
    const quotations = safeQuery('SELECT * FROM quotations ORDER BY quotation_id DESC');

    // Parse JSON items for each quotation
    const result = quotations.map(quotation => ({
      ...quotation,
      quotation_items: quotation.quotation_items ? JSON.parse(quotation.quotation_items) : []
    }));

    return result || [];
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return [];
  }
});

// IPC handlers for bill_orders (new schema; replaces legacy bills)
ipcMain.handle('bill_orders:add', async (event, bill) => {
  try {
    const insertBill = db.prepare(`
      INSERT INTO bill_orders (
        bill_unique_id, billno, account_unique_id, total_amount, paid_amount, balance,
        payment_method, payment_status, sale_type, isreturned, total_tax, total_discount,
        extracharges, item_count, bill_items, added_by, company_id, branch_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = getLocalDateTime();
    const safeBill = {
      bill_unique_id: String(bill.bill_unique_id || `${bill.company_id || '1'}_${bill.branch_id || '1'}_${Date.now()}`),
      billno: String(bill.billno || `${Date.now()}`),
      account_unique_id: String(bill.account_unique_id || ''),
      total_amount: Number(bill.total_amount || 0),
      paid_amount: Number(bill.paid_amount || 0),
      balance: Number(bill.balance ?? (Number(bill.total_amount || 0) - Number(bill.paid_amount || 0))),
      payment_method: String(bill.payment_method || 'cash'),
      payment_status: String(bill.payment_status || 'pending'),
      sale_type: String(bill.sale_type || 'retail'),
      isreturned: bill.isreturned ? 1 : 0,
      total_tax: Number(bill.total_tax || 0),
      total_discount: Number(bill.total_discount || 0),
      extracharges: Number(bill.extracharges || 0),
      item_count: Number(bill.item_count || 0),
      bill_items: typeof bill.bill_items === 'string' ? bill.bill_items : JSON.stringify(bill.bill_items || []),
      original_bill_billno: bill.isreturned && bill.original_bill_billno ? bill.original_bill_billno : null,
      added_by: String(bill.added_by || bill.added_By || 'admin'),
      company_id: String(bill.company_id || '1'),
      branch_id: String(bill.branch_id || '1'),
      created_at: String(bill.created_at || now),
      updated_at: String(bill.updated_at || now),
    };
    insertBill.run(
      safeBill.bill_unique_id,
      safeBill.billno,
      safeBill.account_unique_id,
      safeBill.total_amount,
      safeBill.paid_amount,
      safeBill.balance,
      safeBill.payment_method,
      safeBill.payment_status,
      safeBill.sale_type,
      safeBill.isreturned,
      safeBill.total_tax,
      safeBill.total_discount,
      safeBill.extracharges,
      safeBill.item_count,
      safeBill.bill_items,
      safeBill.added_by,
      safeBill.company_id,
      safeBill.branch_id,
      safeBill.created_at,
      safeBill.updated_at
    );

    // Update inventory stock for each item
    try {
      const items = (() => { try { return JSON.parse(safeBill.bill_items || '[]') } catch { return [] } })();
      const getInv = db.prepare('SELECT * FROM inventory WHERE product_unique_id = ? LIMIT 1');
      const updInv = db.prepare(`UPDATE inventory SET stock = stock + ?, retail_price = ?, updated_at = CURRENT_TIMESTAMP WHERE inventory_id = ?`);
      const insInv = db.prepare(`INSERT INTO inventory (inventory_unique_id, product_unique_id, stock, retail_price, category_name, added_by, company_id, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const it of (items || [])) {
        const prodUid = String(it.product_unique_id || it.productId || '');
        if (!prodUid) continue;
        const qtyRaw = Number(it.quantity || 0);
        const qty = safeBill.isreturned ? qtyRaw : -qtyRaw; // sale reduces stock; return increases
        const existing = getInv.get(prodUid);
        if (existing && existing.inventory_id) {
          updInv.run(qty, existing.retail_price, existing.inventory_id);
        } else {
          // If no inventory row, create one with qty (could be negative if sale before add; clamp to 0)
          const initQty = Math.max(0, qty);
          insInv.run(generateUniqueId(safeBill.company_id, safeBill.branch_id), prodUid, initQty, Number(it.unit_price || 0), null, safeBill.added_by, safeBill.company_id, safeBill.branch_id);
        }
      }
    } catch (e) {
      console.error('Failed to update inventory for bill:', e);
    }

    // Upsert transaction for this bill
    const { accountId, uniqueId } = getOrCreateAccountForBill({ account_unique_id: safeBill.account_unique_id });
    const isReturn = safeBill.isreturned ? 1 : 0;
    const effBal = isReturn ? -Math.max(0, safeBill.balance) : Math.max(0, safeBill.balance);
    const effPaid = isReturn ? -Math.max(0, safeBill.paid_amount) : Math.max(0, safeBill.paid_amount);
    const paymentType = effBal > 0 ? 'debit' : 'credit';
    const paymentMethod = effBal > 0 ? 'ledger' : (safeBill.payment_method || 'cash');
    upsertTransaction({
      accountId,
      uniqueId,
      billId: String(safeBill.billno),
      billType: 'bill',
      totalAmount: Number(safeBill.total_amount || 0),
      credit: effPaid,
      debit: Math.max(0, effBal),
      paymentType,
      paymentMethod,
      companyId: safeBill.company_id,
      branchId: safeBill.branch_id,
      userId: safeBill.added_by || null,
    });

    recalcAccountBalancesFromTransactions();
    return { success: true };
  } catch (error) {
    console.error('Error adding bill_order:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('bill_orders:delete', async (event, billNo) => {
  try {
    db.prepare('DELETE FROM bill_orders WHERE billno = ?').run(String(billNo));
    db.prepare('DELETE FROM transactions WHERE order_no = ? AND order_type = ?').run(String(billNo), 'bill');
    recalcAccountBalancesFromTransactions();
    return { success: true };
  } catch (error) {
    console.error('Error deleting bill_order:', error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle('quotations:add', async (event, quotation) => {
  try {
    // Validate required fields
    const requiredFields = ['account_unique_id', 'total_amount'];
    const validationErrors = validateRequired(quotation, requiredFields);
    if (validationErrors.length > 0) {
      return createErrorResponse(new Error(validationErrors.join(', ')), 'quotations:add');
    }

    const now = getLocalDateTime();
    const nextQuotationNo = getNextSequentialId('quotations', 'quotationno');

    const safeQuotation = {
      quotation_unique_id: quotation.quotation_unique_id || generateUniqueId(quotation.company_id || '1', quotation.branch_id || '1'),
      quotationno: quotation.quotationno || nextQuotationNo,
      account_unique_id: sanitizeString(quotation.account_unique_id),
      tax_amount: sanitizeNumber(quotation.tax_amount || 0),
      discount_amount: sanitizeNumber(quotation.discount_amount || 0),
      total_amount: sanitizeNumber(quotation.total_amount),
      paid_amount: sanitizeNumber(quotation.paid_amount || 0),
      item_count: sanitizeNumber(quotation.item_count || (Array.isArray(quotation.quotation_items) ? quotation.quotation_items.length : 0)),
      sale_type: sanitizeString(quotation.sale_type || 'retail'),
      quotation_items: typeof quotation.quotation_items === 'string' ? quotation.quotation_items : JSON.stringify(quotation.quotation_items || []),
      added_by: sanitizeString(quotation.added_by || 'admin'),
      company_id: sanitizeString(quotation.company_id || '1'),
      branch_id: sanitizeString(quotation.branch_id || '1'),
      created_at: quotation.created_at || now,
      updated_at: quotation.updated_at || now,
    };

    const insertQuotation = db.prepare(`
      INSERT INTO quotations (
        quotation_unique_id, quotationno, account_unique_id, tax_amount, discount_amount,
        total_amount, paid_amount, item_count, sale_type, quotation_items, added_by,
        company_id, branch_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertQuotation.run(
      safeQuotation.quotation_unique_id,
      safeQuotation.quotationno,
      safeQuotation.account_unique_id,
      safeQuotation.tax_amount,
      safeQuotation.discount_amount,
      safeQuotation.total_amount,
      safeQuotation.paid_amount,
      safeQuotation.item_count,
      safeQuotation.sale_type,
      safeQuotation.quotation_items,
      safeQuotation.added_by,
      safeQuotation.company_id,
      safeQuotation.branch_id,
      safeQuotation.created_at,
      safeQuotation.updated_at
    );

    invalidateCache(['quotations:']);
    return createSuccessResponse({ quotation_id: result.lastInsertRowid }, 'Quotation added successfully');
  } catch (error) {
    console.error('Error adding quotation:', error, '\nQuotation object:', JSON.stringify(quotation, null, 2));
    return createErrorResponse(error, 'quotations:add');
  }
});

ipcMain.handle('quotations:delete', async (event, quotationId) => {
  try {
    if (!quotationId) {
      return createErrorResponse(new Error('Quotation ID is required'), 'quotations:delete');
    }

    // Check if quotation exists before deleting
    const existingQuotation = safeQuery('SELECT * FROM quotations WHERE quotation_id = ? LIMIT 1', [quotationId]);
    if (existingQuotation.length === 0) {
      return createErrorResponse(new Error('Quotation not found'), 'quotations:delete');
    }

    // Delete from quotations table
    safeRun('DELETE FROM quotations WHERE quotation_id = ?', [quotationId]);

    invalidateCache(['quotations:']);
    return createSuccessResponse(null, 'Quotation deleted successfully');
  } catch (error) {
    console.error('Error deleting quotation:', error);
    return createErrorResponse(error, 'quotations:delete');
  }
});

// IPC handlers for inventory
ipcMain.handle('inventory:getAll', async () => {
  try {
    const data = db.prepare(`
      SELECT 
        i.*,
        p.product_name,
        p.brand,
        p.barcode as product_barcode,
        p.alertqty,
        p.status as product_status,
        p.wholesale_price,
        p.purchase_price,
        c.category_name as product_category_name,
        c.status as category_status
      FROM inventory i
      LEFT JOIN products p ON i.product_unique_id = p.product_unique_id
      LEFT JOIN categories c ON p.category_unique_id = c.category_unique_id
    `).all();
    return createSuccessResponse(data || []);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return createErrorResponse(error, 'inventory:getAll');
  }
});

ipcMain.handle('inventory:add', async (event, inventoryItem) => {
  try {
    // Check if inventory already exists for this product
    const existing = db.prepare('SELECT inventory_id FROM inventory WHERE product_unique_id = ? LIMIT 1').get(inventoryItem.product_unique_id);
    if (existing) {
      return { success: false, error: 'Inventory already exists for this product' };
    }

    const safeItem = {
      inventory_unique_id: inventoryItem.inventory_unique_id || generateUniqueId(inventoryItem.company_id || '1', inventoryItem.branch_id || '1'),
      product_unique_id: inventoryItem.product_unique_id,
      stock: Number(inventoryItem.stock || 0),
      retail_price: Number(inventoryItem.retail_price || 0),
      category_name: inventoryItem.category_name || null,
      added_by: inventoryItem.added_by || 'admin',
      company_id: inventoryItem.company_id || '1',
      branch_id: inventoryItem.branch_id || '1',
    };

    const stmt = db.prepare(`
      INSERT INTO inventory (
        inventory_unique_id, product_unique_id, stock, retail_price, 
        category_name, added_by, company_id, branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      safeItem.inventory_unique_id,
      safeItem.product_unique_id,
      safeItem.stock,
      safeItem.retail_price,
      safeItem.category_name,
      safeItem.added_by,
      safeItem.company_id,
      safeItem.branch_id
    );

    return { success: true, inventory_id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding inventory:', error);
    throw error;
  }
});

ipcMain.handle('inventory:update', async (event, inventoryItem) => {
  try {
    const stmt = db.prepare(`
      UPDATE inventory SET 
        inventory_unique_id = ?, product_unique_id = ?, stock = ?, 
        retail_price = ?, category_name = ?, added_by = ?, 
        company_id = ?, branch_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE inventory_id = ?
    `);

    const result = stmt.run(
      inventoryItem.inventory_unique_id,
      inventoryItem.product_unique_id,
      Number(inventoryItem.stock || 0),
      Number(inventoryItem.retail_price || 0),
      inventoryItem.category_name,
      inventoryItem.added_by,
      inventoryItem.company_id,
      inventoryItem.branch_id,
      inventoryItem.inventory_id
    );

    return { success: true };
  } catch (error) {
    console.error('Error updating inventory:', error);
    throw error;
  }
});

ipcMain.handle('inventory:delete', async (event, inventoryId) => {
  try {
    db.prepare('DELETE FROM inventory WHERE inventory_id = ?').run(inventoryId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting inventory:', error);
    throw error;
  }
});

ipcMain.handle('inventory:getByProduct', async (event, productUniqueId) => {
  try {
    const data = db.prepare(`
      SELECT 
        i.*,
        p.product_name,
        p.brand,
        p.barcode as product_barcode,
        p.alertqty,
        p.status as product_status,
        p.wholesale_price,
        p.purchase_price,
        c.category_name as product_category_name,
        c.status as category_status
      FROM inventory i
      LEFT JOIN products p ON i.product_unique_id = p.product_unique_id
      LEFT JOIN categories c ON p.category_unique_id = c.category_unique_id
      WHERE i.product_unique_id = ?
    `).all(productUniqueId);
    return data || [];
  } catch (error) {
    console.error('Error fetching inventory by product:', error);
    return [];
  }
});

// IPC handlers for purchases
ipcMain.handle('purchases:getAll', async () => {
  try {
    const rows = db.prepare(`
      SELECT *, ROW_NUMBER() OVER (ORDER BY purchase_id) as display_id 
      FROM purchase_orders
    `).all();
    const result = rows.map((row) => {
      let items = [];
      try { items = JSON.parse(row.purchase_items || '[]'); } catch (_) { items = []; }
      const lineItems = (items || []).map((it) => ({
        productId: String(it.product_unique_id || it.productId || ''),
        unique_id: String(it.product_unique_id || it.unique_id || ''),
        productName: String(it.product_name || it.productName || ''),
        barcode: String(it.barcode || ''),
        quantity: Number(it.item_qty || it.quantity || 0),
        price: Number(it.retail_price || it.price || 0),
        wholesaleRate: Number(it.wholesale_rate || it.wholesaleRate || 0),
        purchaseprice: Number(it.purchase_price || it.purchaseprice || 0),
        category: String(it.category || ''),
        isReturned: Number(row.isreturned || 0),
      }));
      const totalAmount = Number(row.total_amount || 0);
      const paidAmount = Number(row.paid_amount || 0);
      const itemsQty = lineItems.reduce((s, it) => s + Number(it.quantity || 0), 0);
      return {
        purchaseId: Number(row.display_id || 0),
        unique_id: String(row.purchase_unique_id || ''),
        supplierName: String(row.account_unique_id || ''),
        suppliercontact: '',
        supplier_unique_id: String(row.account_unique_id || ''),
        companyname: '',
        branch_id: String(row.branch_id || '1'),
        company_id: String(row.company_id || '1'),
        billNo: String(row.purchase_billno || ''),
        po_no: String(row.po_no || ''),
        receivedBy: String(row.received_by || ''),
        dateTime: String(row.created_at || ''),
        totalAmount,
        paidAmount,
        balance: Math.max(0, Number(row.balance ?? (totalAmount - paidAmount))),
        profitMargin: Number(row.profit_margin || 0),
        itemCount: Number(row.item_count || lineItems.length),
        itemsQty,
        added_By: String(row.added_by || 'admin'),
        created_at: String(row.created_at || ''),
        updated_at: String(row.updated_at || ''),
        isReturned: Number(row.isreturned || 0),
        lineItems,
        // Add missing fields for return purchases
        original_purchase_billno: String(row.original_purchase_billno || ''),
      };
    });
    return createSuccessResponse(result || [], 'Purchases retrieved successfully');
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return createErrorResponse(error, 'purchases:getAll');
  }
});



ipcMain.handle('purchases:add', async (event, purchase) => {
  try {
    console.log('=== ENHANCED PURCHASE ADD START ===');
    console.log('Adding purchase:', JSON.stringify(purchase, null, 2));
    console.log('Line items count:', purchase.lineItems?.length || 0);
    console.log('Purchase isReturned:', purchase.isReturned);

    const now = getLocalDateTime();
    const itemsPayload = (purchase.lineItems || []).map((it) => ({
      product_unique_id: it.productId,
      product_name: it.productName,
      barcode: it.barcode,
      item_qty: Number(it.quantity) || 0,
      retail_price: Number(it.price) || 0,
      wholesale_rate: Number(it.wholesaleRate) || 0,
      purchase_price: Number(it.purchaseprice) || 0,
      category: it.category || null,
    }));
    const totalAmount = Number(purchase.totalAmount || 0);
    const paidAmount = Number(purchase.paidAmount || 0);
    const balance = Number(purchase.balance ?? (totalAmount - paidAmount));
    const billno = String(purchase.billNo || purchase.purchaseId || `${Date.now()}`);
    const uniqueId = String(purchase.unique_id || `${purchase.company_id || '1'}_${purchase.branch_id || '1'}_${billno}`);
    const isReturnedValue = purchase.isReturned ? 1 : 0;

    // Auto-detect payment method and status
    const autoPaymentMethod = paidAmount >= totalAmount ? 'cash' : 'ledger';
    const autoPaymentStatus = paidAmount >= totalAmount ? 'paid' : 'pending';

    // Enhanced transaction-based addition with product lifecycle management
    const runTx = db.transaction(() => {
      console.log('=== ADD TRANSACTION START ===');

      // Note: Original purchase quantities are not updated - only tracking returns

      // 1. Insert purchase record
      const insertPurchase = db.prepare(`INSERT INTO purchase_orders (
        purchase_unique_id, account_unique_id, purchase_billno, po_no, received_by, total_amount, paid_amount, balance, profit_margin, item_count, isreturned, purchase_items, original_purchase_items, original_purchase_billno, added_by, company_id, branch_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      const result = insertPurchase.run(
        uniqueId,
        String(purchase.supplier_unique_id || purchase.supplierName || ''),
        billno,
        String(purchase.po_no || ''),
        String(purchase.receivedBy || ''),
        totalAmount,
        paidAmount,
        Math.max(0, balance),
        Number(purchase.profitMargin || 0),
        Number(purchase.itemCount || itemsPayload.length || 0),
        isReturnedValue,
        JSON.stringify(itemsPayload),
        JSON.stringify(itemsPayload), // Store original quantities same as current for new purchases
        purchase.isReturned && purchase.original_purchase_billno ? purchase.original_purchase_billno : null, // Store original purchase bill number for returns, null for normal purchases
        String(purchase.added_By || 'admin'),
        String(purchase.company_id || '1'),
        String(purchase.branch_id || '1'),
        String(purchase.created_at || now),
        now
      );

      console.log('Purchase record inserted with ID:', result.lastInsertRowid);

      // 2. Handle inventory stock updates
      console.log('=== INVENTORY UPDATE ===');
      const getInv = db.prepare('SELECT * FROM inventory WHERE product_unique_id = ? LIMIT 1');
      const updInv = db.prepare(`UPDATE inventory SET stock = stock + ?, retail_price = ?, updated_at = CURRENT_TIMESTAMP WHERE inventory_id = ?`);
      const insInv = db.prepare(`INSERT INTO inventory (inventory_unique_id, product_unique_id, stock, retail_price, category_name, added_by, company_id, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

      for (const item of (purchase.lineItems || [])) {
        const prodUid = String(item.productId || '');
        if (!prodUid) continue;
        const price = Number(item.price || 0);
        const qtyRaw = Number(item.quantity || 0);
        const qty = (purchase.isReturned ? -1 : 1) * qtyRaw;
        const existing = getInv.get(prodUid);
        if (existing && existing.inventory_id) {
          console.log(`Updating inventory for ${prodUid}: current stock ${existing.stock} + ${qty} = ${existing.stock + qty}`);
          updInv.run(qty, price, existing.inventory_id);
        } else {
          const initQty = Math.max(0, qty);
          console.log(`Creating new inventory for ${prodUid} with stock: ${initQty}`);
          insInv.run(
            generateUniqueId(purchase.company_id || '1', purchase.branch_id || '1'),
            prodUid,
            initQty,
            price,
            null,
            purchase.added_By || 'admin',
            purchase.company_id || '1',
            purchase.branch_id || '1'
          );
        }
      }

      // 3. Handle product lifecycle management (ensure products exist)
      console.log('=== PRODUCT LIFECYCLE MANAGEMENT ===');
      for (const item of (purchase.lineItems || [])) {
        const prodUid = String(item.productId || '');
        if (!prodUid) continue;

        // Check if product exists
        const existingProduct = safeQuery('SELECT product_id FROM products WHERE product_unique_id = ? LIMIT 1', [prodUid]);
        if (existingProduct.length === 0) {
          console.log(`Product ${prodUid} not found in products table - this should not happen for new purchases`);
        }
      }

      // 4. Create transaction record (SYNC version)
      console.log('=== TRANSACTION CREATION ===');
      console.log('Purchase supplier_unique_id:', purchase.supplier_unique_id);
      const { accountId, uniqueId: accUniqueId } = getOrCreateAccountForPurchase({ account_unique_id: purchase.supplier_unique_id });
      console.log('Account lookup result:', { accountId, uniqueId: accUniqueId });
      const isReturn = Boolean(purchase.isReturned);

      // Auto-detect payment method based on payment amount
      const autoPaymentMethod = paidAmount >= totalAmount ? 'cash' : 'ledger';
      const autoPaymentStatus = paidAmount >= totalAmount ? 'paid' : 'pending';

      // For purchases:
      // - Credit: Total amount (what we owe supplier)
      // - Debit: Paid amount (what we paid supplier)
      // For returns:
      // - Credit: -Total amount (reverse what we owed)
      // - Debit: -Paid amount (reverse what we paid)
      console.log('Creating transaction pair with:', {
        accountId,
        uniqueId: accUniqueId,
        billId: billno,
        billType: 'purchase',
        totalAmount,
        credit: totalAmount,
        debit: paidAmount,
        paymentType: balance > 0 ? 'credit' : 'debit',
        paymentMethod: autoPaymentMethod,
        companyId: purchase.company_id || '1',
        branchId: purchase.branch_id || '1',
        userId: purchase.added_By || null,
        isReturn
      });

      createTransactionPairSync({
        accountId,
        uniqueId: accUniqueId,
        billId: billno,
        billType: 'purchase',
        totalAmount,
        credit: totalAmount, // Full amount is credited (we owe this)
        debit: paidAmount,   // Only paid amount is debited
        paymentType: balance > 0 ? 'credit' : 'debit', // If balance exists, we owe (credit)
        paymentMethod: autoPaymentMethod,
        companyId: purchase.company_id || '1',
        branchId: purchase.branch_id || '1',
        userId: purchase.added_By || null,
        isReturn
      });

      console.log('Transaction pair created successfully');

      // 5. Recalculate account balances
      console.log('=== ACCOUNT BALANCE RECALCULATION ===');
      recalcAccountBalancesFromTransactions();

      console.log('=== ADD TRANSACTION COMPLETE ===');
      return result
    });

    const result = runTx();
    invalidateCache(['purchases:', 'products:', 'inventory:', 'transactions:']);

    console.log('=== ENHANCED PURCHASE ADD COMPLETE ===');
    return createSuccessResponse({ purchase_id: result.lastInsertRowid }, 'Purchase added successfully');
  } catch (error) {
    console.error('Error adding purchase:', error);
    return createErrorResponse(error, 'purchases:add');
  }
});
ipcMain.handle('purchases:update', async (event, purchase) => {
  try {
    console.log('=== ENHANCED PURCHASE UPDATE START ===');
    console.log('Purchase to update:', JSON.stringify(purchase, null, 2));

    const now = getLocalDateTime();
    const billno = String(purchase.billNo || purchase.purchaseId || `${Date.now()}`);

    // Get the existing purchase to compare changes
    const existingPurchase = safeQuery('SELECT * FROM purchase_orders WHERE purchase_billno = ? LIMIT 1', [billno]);
    if (existingPurchase.length === 0) {
      return createErrorResponse(new Error('Purchase not found'), 'purchases:update');
    }

    const oldPurchase = existingPurchase[0];
    const oldItems = (() => { try { return JSON.parse(oldPurchase.purchase_items || '[]') } catch { return [] } })();
    const newItems = (purchase.lineItems || []).map((it) => ({
      product_unique_id: it.productId,
      product_name: it.productName,
      barcode: it.barcode,
      item_qty: Number(it.quantity) || 0,
      retail_price: Number(it.price) || 0,
      wholesale_rate: Number(it.wholesaleRate) || 0,
      purchase_price: Number(it.purchaseprice) || 0,
      category: it.category || null,
    }));

    const totalAmount = Number(purchase.totalAmount || 0);
    const paidAmount = Number(purchase.paidAmount || 0);
    const balance = Number(purchase.balance ?? (totalAmount - paidAmount));

    // Enhanced transaction-based update with product lifecycle management
    const runTx = db.transaction(() => {
      console.log('=== TRANSACTION START ===');

      // 1. Update purchase_orders table
      const updatePurchase = db.prepare(`UPDATE purchase_orders SET 
        account_unique_id = ?, po_no = ?, received_by = ?, total_amount = ?, paid_amount = ?, balance = ?, profit_margin = ?, item_count = ?, isreturned = ?, purchase_items = ?, original_purchase_items = ?, original_purchase_billno = ?, added_by = ?, company_id = ?, branch_id = ?, updated_at = ?
        WHERE purchase_billno = ?
      `);

      updatePurchase.run(
        String(purchase.supplier_unique_id || purchase.supplierName || ''),
        String(purchase.po_no || ''),
        String(purchase.receivedBy || ''),
        totalAmount,
        paidAmount,
        Math.max(0, balance),
        Number(purchase.profitMargin || 0),
        Number(purchase.itemCount || newItems.length || 0),
        purchase.isReturned ? 1 : 0,
        JSON.stringify(newItems),
        JSON.stringify(newItems), // Update original quantities for non-return updates
        purchase.isReturned && purchase.original_purchase_billno ? purchase.original_purchase_billno : null, // Update original purchase bill number for returns, null for normal purchases
        String(purchase.added_By || 'admin'),
        String(purchase.company_id || '1'),
        String(purchase.branch_id || '1'),
        now,
        billno
      );

      console.log('Purchase record updated');

      // 2. Handle inventory stock updates (reverse old effect, apply new effect)
      console.log('=== INVENTORY UPDATE ===');
      const getInv = db.prepare('SELECT * FROM inventory WHERE product_unique_id = ? LIMIT 1');
      const updInv = db.prepare(`UPDATE inventory SET stock = stock + ?, retail_price = ?, updated_at = CURRENT_TIMESTAMP WHERE inventory_id = ?`);
      const insInv = db.prepare(`INSERT INTO inventory (inventory_unique_id, product_unique_id, stock, retail_price, category_name, added_by, company_id, branch_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

      // Reverse old purchase effect
      console.log('Reversing old purchase effect...');
      for (const oldItem of oldItems) {
        const prodUid = String(oldItem.product_unique_id || '');
        if (!prodUid) continue;
        const qtyRaw = Number(oldItem.item_qty || 0);
        // FIXED: Proper reversal logic
        // If original purchase was NOT a return (isreturned = 0), we added stock, so reverse by subtracting
        // If original purchase WAS a return (isreturned = 1), we subtracted stock, so reverse by adding
        const qty = oldPurchase.isreturned ? -qtyRaw : qtyRaw; // FIXED: reverse the old effect correctly
        const existing = getInv.get(prodUid);
        if (existing && existing.inventory_id) {
          updInv.run(qty, existing.retail_price, existing.inventory_id);
        }
      }

      // Apply new purchase effect
      console.log('Applying new purchase effect...');
      for (const newItem of newItems) {
        const prodUid = String(newItem.product_unique_id || '');
        if (!prodUid) continue;
        const qtyRaw = Number(newItem.item_qty || 0);
        const qty = purchase.isReturned ? -qtyRaw : qtyRaw; // new effect
        const price = Number(newItem.retail_price || 0);
        const existing = getInv.get(prodUid);
        if (existing && existing.inventory_id) {
          updInv.run(qty, price, existing.inventory_id);
        } else {
          // Create new inventory entry
          const initQty = Math.max(0, qty);
          console.log(`Creating new inventory for ${prodUid} with stock: ${initQty}`);
          insInv.run(
            generateUniqueId(purchase.company_id || '1', purchase.branch_id || '1'),
            prodUid,
            initQty,
            price,
            null,
            purchase.added_By || 'admin',
            purchase.company_id || '1',
            purchase.branch_id || '1'
          );
        }
      }

      // 3. Handle product lifecycle management
      console.log('=== PRODUCT LIFECYCLE MANAGEMENT ===');
      const oldProductIds = new Set(oldItems.map(item => item.product_unique_id));
      const newProductIds = new Set(newItems.map(item => item.product_unique_id));

      // Find products that were removed from this purchase
      const removedProductIds = [...oldProductIds].filter(id => !newProductIds.has(id));
      // console.log('Removed product IDs:', removedProductIds);

      // Delete unused products using helper function
      const deletedProducts = deleteUnusedProducts(removedProductIds, billno);
      // console.log('Deleted products:', deletedProducts);

      // 4. Update existing transaction (don't create new one)
      console.log('=== TRANSACTION UPDATE ===');
      const { accountId, uniqueId } = getOrCreateAccountForPurchase({ account_unique_id: purchase.supplier_unique_id });
      const isReturn = purchase.isReturned ? 1 : 0;
      const effBalance = isReturn ? -Math.max(0, balance) : Math.max(0, balance);
      const effPaid = isReturn ? -paidAmount : paidAmount;
      const paymentType = effBalance > 0 ? 'debit' : 'credit';
      const paymentMethod = effBalance > 0 ? 'ledger' : 'cash';

      // Update existing transaction instead of creating new one (supplier row only)
      const existingTransaction = safeQuery(
        'SELECT transaction_id FROM transactions WHERE order_no = ? AND order_type = ? AND account_unique_id = ? LIMIT 1',
        [billno, 'purchase', uniqueId]
      );

      if (existingTransaction.length > 0) {
        console.log('Updating existing transaction');
        safeRun(`
          UPDATE transactions SET 
            account_unique_id = ?, total_amount = ?, credit = ?, debit = ?,
            payment_type = ?, payment_method = ?, company_id = ?, branch_id = ?,
            updated_at = ?
          WHERE transaction_id = ?
        `, [
          uniqueId ?? null,
          totalAmount,
          effPaid,
          Math.max(0, effBalance),
          paymentType,
          paymentMethod,
          purchase.company_id || '1',
          purchase.branch_id || '1',
          now,
          existingTransaction[0].transaction_id
        ]);
      } else {
        console.log('Creating new transaction (should not happen in update)');
        upsertMainTransaction({
          accountId,
          uniqueId,
          billId: billno,
          billType: 'purchase',
          totalAmount,
          credit: effPaid,
          debit: Math.max(0, effBalance),
          paymentType,
          paymentMethod,
          companyId: purchase.company_id || '1',
          branchId: purchase.branch_id || '1',
          userId: purchase.added_By || null,
        });
      }

      // 5. Recalculate account balances
      console.log('=== ACCOUNT BALANCE RECALCULATION ===');
      recalcAccountBalancesFromTransactions();

      console.log('=== TRANSACTION COMPLETE ===');
    });

    runTx();
    invalidateCache(['purchases:', 'products:', 'inventory:', 'transactions:']);

    console.log('=== ENHANCED PURCHASE UPDATE COMPLETE ===');
    return createSuccessResponse(null, 'Purchase updated successfully');
  } catch (error) {
    console.error('Error updating purchase:', error);
    return createErrorResponse(error, 'purchases:update');
  }
});
ipcMain.handle('purchases:delete', async (event, purchaseId) => {
  try {
    console.log('=== ENHANCED PURCHASE DELETE START ===');
    console.log('Purchase ID to delete:', purchaseId);

    // Get the existing purchase to handle cleanup
    const existingPurchase = safeQuery('SELECT * FROM purchase_orders WHERE purchase_billno = ? LIMIT 1', [String(purchaseId)]);
    if (existingPurchase.length === 0) {
      return createErrorResponse(new Error('Purchase not found'), 'purchases:delete');
    }

    const purchase = existingPurchase[0];
    const items = (() => { try { return JSON.parse(purchase.purchase_items || '[]') } catch { return [] } })();

    console.log('Purchase to delete:', purchase);
    console.log('Items in purchase:', items);

    // Enhanced transaction-based deletion with product lifecycle management
    const runTx = db.transaction(() => {
      console.log('=== DELETE TRANSACTION START ===');

      // 1. Reverse inventory stock changes
      console.log('=== INVENTORY REVERSAL ===');
      const getInv = db.prepare('SELECT * FROM inventory WHERE product_unique_id = ? LIMIT 1');
      const updInv = db.prepare(`UPDATE inventory SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE inventory_id = ?`);

      for (const item of items) {
        const prodUid = String(item.product_unique_id || '');
        if (!prodUid) continue;
        const qtyRaw = Number(item.item_qty || 0);
        const qty = purchase.isreturned ? -qtyRaw : qtyRaw; // reverse the effect
        const existing = getInv.get(prodUid);
        if (existing && existing.inventory_id) {
          console.log(`Reversing inventory for ${prodUid}: current stock ${existing.stock} + ${qty} = ${existing.stock + qty}`);
          updInv.run(qty, existing.inventory_id);
        }
      }

      // 2. Handle product lifecycle management
      console.log('=== PRODUCT LIFECYCLE MANAGEMENT ===');
      const productIds = items.map(item => item.product_unique_id);
      // console.log('Products in deleted purchase:', productIds);

      // Delete unused products using helper function
      const deletedProducts = deleteUnusedProducts(productIds, String(purchaseId));
      // console.log('Deleted products:', deletedProducts);

      // 3. Delete the purchase record
      console.log('=== PURCHASE DELETION ===');
      safeRun('DELETE FROM purchase_orders WHERE purchase_billno = ?', [String(purchaseId)]);
      console.log('Purchase record deleted');

      // 4. Delete the corresponding transaction
      console.log('=== TRANSACTION DELETION ===');
      const deletedTransactions = safeRun('DELETE FROM transactions WHERE order_no = ? AND order_type = ?', [String(purchaseId), 'purchase']);
      // Delete central mirror
      safeRun('DELETE FROM transactions WHERE order_no = ? AND order_type = ? AND account_unique_id = ?', [String(purchaseId), 'purchase', '1_1_mart_account']);
      console.log('Transactions deleted:', deletedTransactions.changes);

      // 5. Recalculate account balances
      console.log('=== ACCOUNT BALANCE RECALCULATION ===');
      recalcAccountBalancesFromTransactions();

      console.log('=== DELETE TRANSACTION COMPLETE ===');
    });

    runTx();
    invalidateCache(['purchases:', 'products:', 'inventory:', 'transactions:']);

    console.log('=== ENHANCED PURCHASE DELETE COMPLETE ===');
    return createSuccessResponse(null, 'Purchase deleted successfully');
  } catch (error) {
    console.error('Error deleting purchase:', error);
    return createErrorResponse(error, 'purchases:delete');
  }
});

// IPC handlers for transactions
ipcMain.handle('transactions:getAll', async () => {
  try {
    console.log('=== FETCHING ALL TRANSACTIONS ===');

    // Get all transactions with account names, including central account
    const rows = safeQuery(`
      SELECT 
        t.*,
        a.fullname as full_name
      FROM transactions t
      LEFT JOIN accounts a ON t.account_unique_id = a.account_unique_id
      ORDER BY t.transaction_id DESC
    `);

    console.log('Found transactions:', rows.length);
    // console.log('Sample transactions:', rows.slice(0, 3));

    return createSuccessResponse(rows || [], 'Transactions retrieved successfully');
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return createErrorResponse(error, 'transactions:getAll');
  }
});

// Get account balance from transactions
ipcMain.handle('transactions:getAccountBalance', async (event, accountId) => {
  try {
    const result = safeQuery(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_type = 'credit' THEN credit ELSE 0 END), 0) AS total_credit,
        COALESCE(SUM(CASE WHEN payment_type = 'debit' THEN debit ELSE 0 END), 0) AS total_debit,
        (COALESCE(SUM(CASE WHEN payment_type = 'credit' THEN credit ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN payment_type = 'debit' THEN debit ELSE 0 END), 0)) AS balance
      FROM transactions 
      WHERE account_unique_id = ?
    `, [accountId]);

    return createSuccessResponse(result[0] || { total_credit: 0, total_debit: 0, balance: 0 });
  } catch (error) {
    console.error('Error getting account balance:', error);
    return createErrorResponse(error, 'transactions:getAccountBalance');
  }
});

// Get detailed account balance with receivables/payables breakdown
ipcMain.handle('transactions:getAccountBalanceDetailed', async (event, accountId) => {
  try {
    const balance = getAccountBalanceDetailed(accountId);
    return createSuccessResponse(balance);
  } catch (error) {
    console.error('Error getting detailed account balance:', error);
    return createErrorResponse(error, 'transactions:getAccountBalanceDetailed');
  }
});

// Get pending amounts (receivables and payables)
ipcMain.handle('transactions:getPendingAmounts', async (event) => {
  try {
    const result = safeQuery(`
      SELECT 
        SUM(CASE 
          WHEN a.account_type = 'customer' AND t.balance > 0 THEN t.balance 
          ELSE 0 
        END) as receivables,
        SUM(CASE 
          WHEN a.account_type = 'supplier' AND t.balance < 0 THEN ABS(t.balance)
          ELSE 0 
        END) as payables
      FROM (
        SELECT 
          account_unique_id,
          (COALESCE(SUM(CASE WHEN payment_type = 'credit' THEN credit ELSE 0 END), 0) - 
           COALESCE(SUM(CASE WHEN payment_type = 'debit' THEN debit ELSE 0 END), 0)) AS balance
        FROM transactions 
        WHERE account_unique_id != '1_1_mart_account'
        GROUP BY account_unique_id
      ) t
      JOIN accounts a ON a.account_unique_id = t.account_unique_id
      WHERE a.account_status = 'active'
    `);

    const amounts = result[0] || { receivables: 0, payables: 0 };
    return createSuccessResponse(amounts);
  } catch (error) {
    console.error('Error getting pending amounts:', error);
    return createErrorResponse(error, 'transactions:getPendingAmounts');
  }
});

// Create transaction with validation
ipcMain.handle('transactions:createTransaction', async (event, transactionData) => {
  try {
    // Validate transaction data
    const validationErrors = validateRequired(transactionData, [
      'accountId', 'uniqueId', 'billId', 'billType', 'totalAmount',
      'paymentType', 'paymentMethod', 'companyId', 'branchId'
    ]);

    if (validationErrors.length > 0) {
      return createErrorResponse(new Error(validationErrors.join(', ')), 'transactions:createTransaction');
    }

    // Check cash balance for cash/card purchases
    if (transactionData.billType === 'purchase' && transactionData.paymentMethod !== 'ledger') {
      const martBalance = await getMartAccountBalance();
      if (transactionData.debit > martBalance) {
        return createErrorResponse(new Error('Insufficient cash balance in mart account'), 'transactions:createTransaction');
      }
    }

    // Create transaction using existing helper
    const result = await createTransactionPair({
      accountId: transactionData.accountId,
      uniqueId: transactionData.uniqueId,
      billId: transactionData.billId,
      billType: transactionData.billType,
      totalAmount: transactionData.totalAmount,
      credit: transactionData.credit,
      debit: transactionData.debit,
      paymentType: transactionData.paymentType,
      paymentMethod: transactionData.paymentMethod,
      companyId: transactionData.companyId,
      branchId: transactionData.branchId,
      userId: transactionData.userId,
      isReturn: transactionData.isReturn || false
    });

    return createSuccessResponse({ transactionId: result.transaction_id });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return createErrorResponse(error, 'transactions:createTransaction');
  }
});

// Helper: Get account current balance with detailed breakdown
function getAccountBalanceDetailed(accountId) {
  try {
    const result = safeQuery(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_type = 'credit' THEN credit ELSE 0 END), 0) AS total_credit,
        COALESCE(SUM(CASE WHEN payment_type = 'debit' THEN debit ELSE 0 END), 0) AS total_debit,
        (COALESCE(SUM(CASE WHEN payment_type = 'credit' THEN credit ELSE 0 END), 0) - 
         COALESCE(SUM(CASE WHEN payment_type = 'debit' THEN debit ELSE 0 END), 0)) AS balance
      FROM transactions 
      WHERE account_unique_id = ?
    `, [accountId]);

    const balance = result[0] || { total_credit: 0, total_debit: 0, balance: 0 };

    // Get account type
    const accountInfo = safeQuery('SELECT account_type FROM accounts WHERE account_unique_id = ?', [accountId]);
    const accountType = accountInfo[0]?.account_type || 'customer';

    return {
      accountId,
      accountType,
      totalCredit: balance.total_credit,
      totalDebit: balance.total_debit,
      balance: balance.balance,
      receivable: accountType === 'customer' ? Math.max(0, balance.balance) : Math.max(0, -balance.balance),
      payable: accountType === 'customer' ? Math.max(0, -balance.balance) : Math.max(0, balance.balance),
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error getting account balance:', error);
    return {
      accountId,
      accountType: 'customer',
      totalCredit: 0,
      totalDebit: 0,
      balance: 0,
      receivable: 0,
      payable: 0,
      lastUpdated: new Date()
    };
  }
}

// Helper: Validate settlement request
function validateSettlementRequest(settlement) {
  const errors = [];
  const isVoucher = settlement.transactionType === 'voucher';

  // Common validations for all transaction types
  if (!settlement.accountId?.trim()) {
    errors.push('Account ID is required');
  }

  if (!settlement.accountType || !['customer', 'supplier'].includes(settlement.accountType)) {
    errors.push('Valid account type (customer/supplier) is required');
  }

  if (!settlement.amount || settlement.amount <= 0) {
    errors.push('Settlement amount must be positive');
  }

  // Payment method validation
  if (isVoucher) {
    // Voucher-specific validations
    if (!settlement.voucherNumber?.trim()) {
      errors.push('Voucher number is required for voucher transactions');
    }
    if (!settlement.voucherDate) {
      errors.push('Voucher date is required');
    }
  } else {
    // Regular transaction validations
    if (!settlement.paymentMethod || !['cash', 'card', 'ledger'].includes(settlement.paymentMethod)) {
      errors.push('Valid payment method is required');
    }
  }

  if (!settlement.description?.trim()) {
    errors.push('Description is required');
  }

  return errors;
}

// Helper: Determine settlement type based on account type and balance
function determineSettlementType(accountType, currentBalance, settlementAmount) {
  if (accountType === 'customer') {
    // Customer settlements: they pay us
    if (currentBalance > 0) {
      // Customer owes us money
      return settlementAmount > currentBalance ? 'advance' : 'payment';
    } else {
      // We owe customer money or balance is zero
      return 'advance';
    }
  } else {
    // Supplier settlements: we pay them
    if (currentBalance < 0) {
      // We owe supplier money
      return settlementAmount > Math.abs(currentBalance) ? 'advance' : 'payment';
    } else {
      // Supplier owes us money or balance is zero
      return 'advance';
    }
  }
}

// Helper: Create settlement transaction entries with proper accounting
function createSettlementTransactions(settlement, settlementId, currentBalance, accountBalance) {
  const transactions = [];
  const { accountType, amount, paymentMethod } = settlement;
  const settlementType = determineSettlementType(accountType, currentBalance, amount);

  console.log('Creating settlement transactions:', {
    accountType,
    currentBalance,
    amount,
    settlementType
  });

  if (accountType === 'customer') {
    // For customer payment, we need to debit their account (reduce their balance)
    transactions.push({
      accountId: settlement.accountId,
      uniqueId: settlement.accountId,
      billId: settlementId,
      billType: 'voucher',
      totalAmount: amount,
      credit: 0,
      debit: amount, // Debit customer account (reduces their balance)
      paymentType: 'debit',
      paymentMethod: settlement.paymentMethod,
      description: `Payment received: ${settlement.description}`,
      settlementType: 'receipt',
      accountType: 'customer'
    });

    // If cash/card payment, credit mart account with the payment amount
    if (paymentMethod === 'cash' || paymentMethod === 'card') {
      const martAccountId = ensureCentralAccount();
      transactions.push({
        accountId: martAccountId,
        uniqueId: martAccountId,
        billId: settlementId,
        billType: 'voucher',
        totalAmount: amount,
        credit: amount, // Credit mart account (cash received)
        debit: 0,
        paymentType: 'credit',
        paymentMethod,
        description: `Cash received from customer: ${settlement.description}`,
        settlementType: 'receipt',
        accountType: 'mart'
      });
    }
  } else {
    // For suppliers, we show net liability (remaining amount after payment)
    const remainingLiability = currentBalance - amount;
    
    // Create transaction for supplier account
    transactions.push({
      accountId: settlement.accountId,
      uniqueId: settlement.accountId,
      billId: settlementId,
      billType: 'voucher',
      totalAmount: amount,
      credit: amount, // Reduce supplier liability (credit)
      debit: 0,
      paymentType: 'credit',
      paymentMethod: 'ledger',
      description: `Payment to supplier: ${settlement.description}`,
      settlementType: 'payment',
      accountType: 'supplier'
    });

    // Create corresponding mart account transaction for cash/card payments
    if (paymentMethod === 'cash' || paymentMethod === 'card') {
      const martAccountId = ensureCentralAccount();
      transactions.push({
        accountId: martAccountId,
        uniqueId: martAccountId,
        billId: settlementId,
        billType: 'voucher',
        totalAmount: amount,
        credit: 0,
        debit: amount, // Debit mart account (cash out)
        paymentType: 'debit',
        paymentMethod,
        description: `Cash paid to supplier: ${settlement.description}`,
        settlementType: 'payment',
        accountType: 'mart'
      });
    }
  }

  return transactions;
}

// Enhanced settlement processing with robust accounting logic
ipcMain.handle('transactions:processPaymentSettlement', async (event, settlement) => {
  try {
    console.log('=== ENHANCED SETTLEMENT PROCESSING START ===');
    console.log('Settlement request:', JSON.stringify(settlement, null, 2));

    // Enhanced validation
    const validationErrors = validateSettlementRequest(settlement);
    if (validationErrors.length > 0) {
      return createErrorResponse(new Error(validationErrors.join(', ')), 'transactions:processPaymentSettlement');
    }

    // Get current account balance
    const accountBalance = getAccountBalanceDetailed(settlement.accountId);
    const currentBalance = accountBalance.balance;

    console.log('Current account balance:', accountBalance);

    // Validate account exists and is active
    const accountExists = safeQuery('SELECT account_unique_id, account_status FROM accounts WHERE account_unique_id = ?', [settlement.accountId]);
    if (!accountExists.length) {
      return createErrorResponse(new Error('Account not found'), 'transactions:processPaymentSettlement');
    }

    if (accountExists[0].account_status !== 'active') {
      return createErrorResponse(new Error('Account is not active'), 'transactions:processPaymentSettlement');
    }

    // Check cash balance for supplier payments (we pay them)
    if (settlement.accountType === 'supplier' && settlement.paymentMethod !== 'ledger') {
      const martBalance = getMartAccountBalanceSync();
      if (settlement.amount > martBalance) {
        return createErrorResponse(
          new Error(`Insufficient cash balance. Available: ${martBalance.toFixed(2)}, Required: ${settlement.amount.toFixed(2)}`),
          'transactions:processPaymentSettlement'
        );
      }
    }

    // For customer overpayments, validate if business allows advances
    if (settlement.accountType === 'customer' && currentBalance > 0 && settlement.amount > currentBalance) {
      const overpayment = settlement.amount - currentBalance;
      console.log(`Customer overpayment detected: ${overpayment}`);
      // Could add business rule validation here
    }

    const now = getLocalDateTime();
    const settlementId = generateUniqueId(settlement.companyId || '1', settlement.branchId || '1');

    // Execute as database transaction for consistency
    const result = db.transaction(() => {
      console.log('=== TRANSACTION START ===');

      // Create settlement transactions with proper accounting
      const transactions = createSettlementTransactions(settlement, settlementId, currentBalance, accountBalance);
      const createdTransactions = [];

      console.log('Transactions to create:', transactions.length);

      for (const txn of transactions) {
        console.log('Creating transaction:', txn);

        const transactionResult = upsertMainTransaction({
          accountId: txn.accountId,
          uniqueId: txn.uniqueId,
          billId: txn.billId,
          billType: txn.billType,
          totalAmount: txn.totalAmount,
          paymentType: txn.paymentType,
          paymentMethod: txn.paymentMethod,
          companyId: settlement.companyId || '1',
          branchId: settlement.branchId || '1',
          userId: settlement.userId || 'admin',
          credit: txn.credit,
          debit: txn.debit
        });

        createdTransactions.push(transactionResult);
      }

      // Skip central transactions as we're already recording in the main transactions table
      if (settlement.paymentMethod === 'cash' || settlement.paymentMethod === 'card') {
        console.log('Skipping central transaction - using main transactions table instead');
      }

      // Calculate new balance
      const newAccountBalance = getAccountBalanceDetailed(settlement.accountId);
      const overpayment = settlement.accountType === 'customer' && currentBalance > 0 && settlement.amount > currentBalance
        ? settlement.amount - currentBalance
        : settlement.accountType === 'supplier' && currentBalance < 0 && settlement.amount > Math.abs(currentBalance)
          ? settlement.amount - Math.abs(currentBalance)
          : 0;

      console.log('=== TRANSACTION COMPLETE ===');
      console.log('Previous balance:', currentBalance);
      console.log('New balance:', newAccountBalance.balance);
      console.log('Overpayment:', overpayment);

      return {
        success: true,
        transactionId: settlementId,
        previousBalance: currentBalance,
        newBalance: newAccountBalance.balance,
        settlementAmount: settlement.amount,
        overpayment: overpayment > 0 ? overpayment : undefined,
        transactionDetails: createdTransactions,
        accountBalance: newAccountBalance
      };
    });

    // Invalidate caches
    invalidateCache(['transactions:', 'accounts:']);
    // Recalculate account balances after settlement to ensure balances reflect new voucher transactions
    recalcAccountBalancesFromTransactions();

    console.log('=== SETTLEMENT PROCESSING COMPLETE ===');
    return createSuccessResponse(result());

  } catch (error) {
    console.error('Error processing payment settlement:', error);
    return createErrorResponse(error, 'transactions:processPaymentSettlement');
  }
});

// Get transaction statistics with enhanced calculations
ipcMain.handle('transactions:getStats', async (event, accountId) => {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END) as cash_transactions,
        SUM(CASE WHEN payment_method = 'card' THEN 1 ELSE 0 END) as card_transactions,
        SUM(CASE WHEN payment_method = 'ledger' THEN 1 ELSE 0 END) as credit_transactions,
        SUM(credit) as total_credit,
        SUM(debit) as total_debit,
        AVG(total_amount) as avg_transaction_amount
      FROM transactions 
      WHERE account_unique_id != '1_1_mart_account'
    `;

    const params = [];
    if (accountId) {
      query += ' AND account_unique_id = ?';
      params.push(accountId);
    }

    const result = safeQuery(query, params);
    const stats = result[0] || {};

    // Calculate additional metrics
    const netCashFlow = (stats.total_credit || 0) - (stats.total_debit || 0);
    const martBalance = await getMartAccountBalance();

    // Get pending receivables and payables
    const pendingQuery = `
      SELECT 
        SUM(CASE WHEN a.account_type = 'customer' AND t.credit > t.debit THEN t.credit - t.debit ELSE 0 END) as pending_receivables,
        SUM(CASE WHEN a.account_type = 'supplier' AND t.debit > t.credit THEN t.debit - t.credit ELSE 0 END) as pending_payables
      FROM transactions t
      LEFT JOIN accounts a ON t.account_unique_id = a.account_unique_id
      WHERE t.account_unique_id != '1_1_mart_account'
    `;

    const pendingResult = safeQuery(pendingQuery);
    const pending = pendingResult[0] || {};

    // Ensure all values are valid numbers
    const enhancedStats = {
      total_transactions: Number(stats.total_transactions) || 0,
      cash_transactions: Number(stats.cash_transactions) || 0,
      card_transactions: Number(stats.card_transactions) || 0,
      credit_transactions: Number(stats.credit_transactions) || 0,
      total_credit: Number(stats.total_credit) || 0,
      total_debit: Number(stats.total_debit) || 0,
      avg_transaction_amount: Number(stats.avg_transaction_amount) || 0,
      net_cash_flow: Number(netCashFlow) || 0,
      mart_balance: Number(martBalance) || 0,
      pending_receivables: Number(pending.pending_receivables) || 0,
      pending_payables: Number(pending.pending_payables) || 0
    };

    return createSuccessResponse(enhancedStats);
  } catch (error) {
    console.error('Error getting transaction stats:', error);
    return createErrorResponse(error, 'transactions:getStats');
  }
});

ipcMain.handle('transactions:add', async (event, transaction) => {
  try {
    // Validate transaction data against schema
    const schema = {
      account_unique_id: { type: 'string', required: true },
      order_no: { type: 'string', required: true },
      order_type: { type: 'string', enum: ['bill', 'purchase', 'quotation'], required: true },
      total_amount: { type: 'number', required: true },
      payment_type: { type: 'string', enum: ['credit', 'debit'], required: true },
      payment_method: { type: 'string', enum: ['cash', 'card', 'ledger'], required: true }
    };

    const validationErrors = validateData(transaction, schema);
    if (validationErrors.length > 0) {
      return createErrorResponse(new Error(validationErrors.join(', ')), 'transactions:add');
    }

    // Validate business rules
    const businessRules = {
      total_amount: { min: 0, message: 'Total amount cannot be negative' },
      credit: { min: 0, message: 'Credit amount cannot be negative' },
      debit: { min: 0, message: 'Debit amount cannot be negative' }
    };

    const ruleErrors = validateBusinessRules(transaction, businessRules);
    if (ruleErrors.length > 0) {
      return createErrorResponse(new Error(ruleErrors.join(', ')), 'transactions:add');
    }

    const safeTransaction = {
      transaction_unique_id: transaction.transaction_unique_id || `${transaction.company_id || '1'}_${transaction.branch_id || '1'}_txn_${Date.now()}`,
      account_unique_id: transaction.account_unique_id,
      order_no: transaction.order_no,
      order_type: transaction.order_type,
      total_amount: Number(transaction.total_amount || 0),
      credit: Number(transaction.credit || 0),
      debit: Number(transaction.debit || 0),
      payment_type: transaction.payment_type,
      payment_method: transaction.payment_method,
      added_by: transaction.added_by || 'admin',
      company_id: transaction.company_id || '1',
      branch_id: transaction.branch_id || '1',
    };

    // Execute with retry logic
    const result = await withRetry(async () => {
      const stmt = db.prepare(`
        INSERT INTO transactions (
          transaction_unique_id, account_unique_id, order_no, order_type, 
          total_amount, credit, debit, payment_type, payment_method, 
          added_by, company_id, branch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      return stmt.run(
        safeTransaction.transaction_unique_id,
        safeTransaction.account_unique_id,
        safeTransaction.order_no,
        safeTransaction.order_type,
        safeTransaction.total_amount,
        safeTransaction.credit,
        safeTransaction.debit,
        safeTransaction.payment_type,
        safeTransaction.payment_method,
        safeTransaction.added_by,
        safeTransaction.company_id,
        safeTransaction.branch_id
      );
    }, 3, 1000); // 3 retries, 1 second delay

    invalidateCache(['transactions:', `accounts:${safeTransaction.account_unique_id}`]);
    return createSuccessResponse({ transaction_id: result.lastInsertRowid }, 'Transaction added successfully');
  } catch (error) {
    console.error('Error adding transaction:', error);
    return createErrorResponse(error, 'transactions:add');
  }
});

ipcMain.handle('transactions:getByAccount', async (event, accountId) => {
  try {
    console.log('Fetching transactions for account ID:', accountId);
    
    // First, verify the account exists using account_id or account_unique_id
    const account = safeQuery(
      'SELECT * FROM accounts WHERE account_id = ? OR account_unique_id = ?', 
      [accountId, accountId]
    );
    
    if (!account || account.length === 0) {
      console.error('Account not found with ID:', accountId);
      return { success: false, error: 'Account not found', data: [] };
    }
    
    const accountData = account[0];
    const accountUniqueId = accountData.account_unique_id;
    
    console.log('Found account:', {
      id: accountData.account_id,
      unique_id: accountData.account_unique_id,
      name: accountData.fullname || accountData.name,
      type: accountData.account_type
    });
    
    // Get all transactions for this account
    const query = `
      SELECT
  t.order_no,
  COALESCE(a.fullname,'System')  AS account_fullname,
  t.credit,
  t.debit
FROM transactions t
LEFT JOIN accounts a ON t.account_unique_id = a.account_unique_id
WHERE t.account_unique_id = ?
ORDER BY t.created_at DESC, t.transaction_id DESC; `;
    
    const rows = safeQuery(query, [accountUniqueId]);
    
    return { 
      success: true, 
      data: rows || [],
      account: {
        id: accountData.account_unique_id,
        name: accountData.fullname || accountData.name || 'Unknown Account',
        account_type: accountData.account_type,
        balance: parseFloat(accountData.balance) || 0,
        account_status: accountData.account_status || 'active',
        _raw: accountData // Include full account data for debugging
      }
    };
  } catch (error) {
    console.error('Error fetching transactions by account:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch transactions',
      data: [] 
    };
  }
});

// Admin endpoint to get all transactions including central account
ipcMain.handle('transactions:getAllIncludingCentral', async () => {
  try {
    const rows = safeQuery(`
      SELECT 
        t.*,
        a.fullname as full_name
      FROM transactions t
      LEFT JOIN accounts a ON t.account_unique_id = a.account_unique_id
      ORDER BY t.transaction_id DESC
    `);
    return rows || [];
  } catch (error) {
    console.error('Error fetching all transactions including central:', error);
    return [];
  }
});



// IPC handlers for users
ipcMain.handle('users:getAll', async () => {
  try {
    const data = db.prepare('SELECT * FROM users').all();

    // Transform database fields to match frontend expectations
    const transformedData = data.map(user => ({
      id: user.user_id,
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      phone_no: user.phone_no,
      phoneNumber: user.phone_no,
      plan: user.plan,
      plan_duration: user.plan_duration,
      planDuration: user.plan_duration,
      plan_start: user.plan_start,
      planStartedAt: user.plan_start,
      plan_enddate: user.plan_enddate,
      planEndedAt: user.plan_enddate,
      status: user.status,
      user_details: user.user_details,
      userDetails: user.user_details,
      role: user.role,
      password: user.password,
      added_by: user.added_by,
      addedBy: user.added_by,
      company_id: user.company_id,
      companyId: user.company_id,
      branch_id: user.branch_id,
      branchId: user.branch_id,
      created_at: user.created_at,
      createdAt: user.created_at,
      updated_at: user.updated_at,
      updatedAt: user.updated_at
    }));

    return transformedData || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
});

const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;

ipcMain.handle('users:add', async (event, user) => {
  try {
    // Check if user has a specific ID from API
    const userId = user.id || user.user_id;
    
    // Only hash password if it's not already hashed
    let passwordToStore = user.password;
    if (passwordToStore && !passwordToStore.startsWith('$2a$') && !passwordToStore.startsWith('$2b$')) {
      passwordToStore = await bcrypt.hash(passwordToStore, SALT_ROUNDS);
    }

    const safeUser = {
      name: user.name,
      email: user.email || null,
      phone_no: user.phoneNumber || user.phone_no || null,
      plan: user.plan || null,
      plan_duration: user.planDuration || user.plan_duration || null,
      plan_start: user.planStartedAt || user.plan_start || null,
      plan_enddate: user.planEndedAt || user.plan_enddate || null,
      status: user.status || 'active',
      user_details: user.userDetails || user.user_details || null,
      role: user.role,
      password: passwordToStore,
      added_by: user.addedBy || user.added_by || null,
      company_id: user.companyId || user.company_id || '1',
      branch_id: user.branchId || user.branch_id || '1',
    };

    let stmt, result;

    if (userId) {
      // If user has a specific ID, use INSERT OR REPLACE to handle existing records
      stmt = db.prepare(`
        INSERT OR REPLACE INTO users (
          user_id, name, email, phone_no, plan, plan_duration, plan_start, plan_enddate, 
          status, user_details, role, password, added_by, company_id, branch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      result = stmt.run(
        userId,
        safeUser.name,
        safeUser.email,
        safeUser.phone_no,
        safeUser.plan,
        safeUser.plan_duration,
        safeUser.plan_start,
        safeUser.plan_enddate,
        safeUser.status,
        safeUser.user_details,
        safeUser.role,
        safeUser.password,
        safeUser.added_by,
        safeUser.company_id,
        safeUser.branch_id
      );
    } else {
      // If no specific ID, let database auto-generate
      stmt = db.prepare(`
        INSERT INTO users (
          name, email, phone_no, plan, plan_duration, plan_start, plan_enddate, 
          status, user_details, role, password, added_by, company_id, branch_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      result = stmt.run(
        safeUser.name,
        safeUser.email,
        safeUser.phone_no,
        safeUser.plan,
        safeUser.plan_duration,
        safeUser.plan_start,
        safeUser.plan_enddate,
        safeUser.status,
        safeUser.user_details,
        safeUser.role,
        safeUser.password,
        safeUser.added_by,
        safeUser.company_id,
        safeUser.branch_id
      );
    }

    return { success: true, user_id: userId || result.lastInsertRowid };
  } catch (error) {
}
});
ipcMain.handle('users:update', async (event, user) => {
  const db = getDb();
  const  transaction = db.transaction(() => {
    try {
      // Get existing user data
      const existingUser = db.prepare('SELECT * FROM users WHERE user_id = ?').get(user.user_id || user.id);
      if (!existingUser) {
        return { success: false, error: 'User not found' };
      }

      // Prepare the update data
      const updateData = {
        name: user.name || existingUser.name,
        email: user.email || existingUser.email || null,
        phone_no: user.phone_no || existingUser.phone_no || null,
        plan: user.plan || existingUser.plan || null,
        plan_duration: user.plan_duration || existingUser.plan_duration || null,
        plan_start: user.plan_start || existingUser.plan_start || null,
        plan_enddate: user.plan_enddate || existingUser.plan_enddate || null,
        status: user.status || existingUser.status || 'active',
        user_details: user.user_details || existingUser.user_details || null,
        role: user.role || existingUser.role,
        company_id: user.company_id || existingUser.company_id || '1',
        branch_id: user.branch_id || existingUser.branch_id || '1',
        // Don't update password by default
      };

      // Handle password update if provided and not empty
      if (user.password && user.password.trim() !== '') {
        // Only hash if not already hashed
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
          // Password is already hashed, use as is
          updateData.password = user.password;
        } else {
          // Hash the new password
          updateData.password = bcrypt.hash(user.password, SALT_ROUNDS);
        }
      }

      // Build the update query
      const setClauses = [];
      const params = [];
      
      Object.entries(updateData).forEach(([key, value]) => {
        // Special handling for password to use COALESCE
        if (key === 'password') {
          setClauses.push('password = ?');
          params.push(value);
        } else {
          setClauses.push(`${key} = ?`);
          params.push(value);
        }
      });

      // Add updated_at
      setClauses.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE users 
        SET ${setClauses.join(', ')}
        WHERE user_id = ?
      `;
      
      params.push(user.user_id || user.id);
      
      // Execute the update
      const stmt = db.prepare(query);
      const result = stmt.run(...params);

      if (result.changes === 0) {
        return { success: false, error: 'No changes made to user' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in user update transaction:', error);
      throw error; // This will trigger the transaction to rollback
    }
  });

  try {
    const result = transaction();
    return result;
  } catch (error) {
    console.error('Error updating user:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update user' 
    };
  }
});

ipcMain.handle('users:delete', async (event, userId) => {
  try {
    db.prepare('DELETE FROM users WHERE user_id = ?').run(userId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
});

// IPC handlers for system settings
ipcMain.handle('settings:get', async (event, key) => {
  try {
    const stmt = db.prepare('SELECT setting_value FROM system_settings WHERE setting_key = ?');
    const result = stmt.get(key);
    return result ? result.setting_value : null;
  } catch (error) {
    console.error('Error getting system setting:', error);
    throw error;
  }
});

ipcMain.handle('settings:set', async (event, key, value) => {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO system_settings (setting_key, setting_value, updated_at) 
      VALUES (?, ?, ?)
    `);
    stmt.run(key, value, getLocalDateTime());
    return { success: true };
  } catch (error) {
    console.error('Error setting system setting:', error);
    throw error;
  }
});

ipcMain.handle('settings:getAll', async () => {
  try {
    const stmt = db.prepare('SELECT * FROM system_settings');
    return stmt.all();
  } catch (error) {
    console.error('Error getting all system settings:', error);
    throw error;
  }
});

// Generic IPC handlers for database operations
ipcMain.handle('db:getAll', (event, sql) => {
  const stmt = db.prepare(sql);
  return stmt.all();
});

ipcMain.handle('sync:all', async (event, accessToken, userId, selectedTablesList) => {
  try {
    const result = await syncAllTablesWithServer(db, accessToken, userId, selectedTablesList);
    return { success: true, result };
  } catch (error) {
    console.error('[sync] IPC handler error:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
});



// IPC handlers for accounts (deduplicated)

ipcMain.handle('accounts:syncFromSource', async (event, payload) => {
  try {
    const safeUserId = payload && payload.userId ? String(payload.userId) : null;

    // Prepare upsert statement to PRESERVE existing row ids
    const upsertAccount = db.prepare(`
      INSERT INTO accounts (
        ref_id, account_name, account_email, account_address, account_status,
        account_type, account_limit, total_credit, total_debit, balance,
        account_adddate, unique_id, source_id, user_id, company_id, branch_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(ref_id, account_type) DO UPDATE SET
        account_name = excluded.account_name,
        account_email = excluded.account_email,
        account_address = excluded.account_address,
        account_status = excluded.account_status,
        account_limit = excluded.account_limit,
        total_credit = excluded.total_credit,
        total_debit = excluded.total_debit,
        balance = excluded.balance,
        unique_id = excluded.unique_id,
        source_id = excluded.source_id,
        user_id = excluded.user_id,
        company_id = excluded.company_id,
        branch_id = excluded.branch_id,
        updated_at = excluded.updated_at
    `);

    // Sync from users table
    const users = db.prepare('SELECT * FROM users').all();

    for (const user of users) {
      const accountData = {
        ref_id: `user_${user.id}`,
        account_name: user.name || user.email,
        account_email: user.email,
        account_address: null,
        account_status: user.status || 'active',
        account_type: 'user',
        account_limit: 0,
        total_credit: 0,
        total_debit: 0,
        balance: 0,
        account_adddate: user.created_at,
        unique_id: null,
        source_id: user.id.toString(),
        user_id: safeUserId,
        company_id: user.companyId || '1',
        branch_id: user.branchId || '1',
        created_at: getLocalDateTime(),
        updated_at: getLocalDateTime()
      };
      upsertAccount.run(accountData);
    }

    // Sync from customers table
    const customers = db.prepare('SELECT * FROM customers').all();
    for (const customer of customers) {
      const accountData = {
        ref_id: `customer_${customer.customerId}`,
        account_name: customer.fullName,
        account_email: customer.email,
        account_address: customer.address || customer.secondAddress || customer.city,
        account_status: customer.status,
        account_type: 'customer',
        account_limit: customer.creditLimit || 0,
        total_credit: 0, // Will be calculated
        total_debit: 0, // Will be calculated
        balance: 0, // Will be calculated
        account_adddate: customer.created_at,
        unique_id: customer.unique_id || null,
        source_id: customer.customerId.toString(),
        user_id: safeUserId,
        company_id: customer.company_id,
        branch_id: customer.branch_id,
        created_at: getLocalDateTime(),
        updated_at: getLocalDateTime()
      };
      upsertAccount.run(accountData);
    }

    // Sync from suppliers table
    const suppliers = db.prepare('SELECT * FROM suppliers').all();
    for (const supplier of suppliers) {
      const accountData = {
        ref_id: `supplier_${supplier.id}`,
        account_name: supplier.fullname,
        account_email: null,
        account_address: supplier.city,
        account_status: supplier.status,
        account_type: 'supplier',
        account_limit: supplier.creditLimit || 0,
        total_credit: 0, // Will be calculated
        total_debit: 0, // Will be calculated
        balance: 0, // Will be calculated
        account_adddate: supplier.created_at,
        unique_id: supplier.unique_id || null,
        source_id: supplier.id.toString(),
        user_id: safeUserId,
        company_id: supplier.company_id,
        branch_id: supplier.branch_id,
        created_at: getLocalDateTime(),
        updated_at: getLocalDateTime()
      };
      upsertAccount.run(accountData);
    }

    return { success: true, message: 'Accounts synced successfully' };
  } catch (error) {
    console.error('Error syncing accounts:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('accounts:calculateBalances', async () => {
  try {
    // Calculate balances from transactions table (proper double-entry accounting)
    recalcAccountBalancesFromTransactions();
    return { success: true, message: 'Balances calculated successfully from transactions' };
  } catch (error) {
    console.error('Error calculating balances:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('accounts:getWithFilters', async (event, filters = {}) => {
  try {
    let query = 'SELECT * FROM accounts WHERE 1=1';
    const params = [];
    
    // By default, only show active accounts unless explicitly filtered
    if (filters.account_status === undefined) {
      query += ' AND account_status = ?';
      params.push('active');
    }

    if (filters.account_type) {
      query += ' AND account_type = ?';
      params.push(filters.account_type);
    }

    if (filters.account_status) {
      query += ' AND account_status = ?';
      params.push(filters.account_status);
    }

    if (filters.search) {
      query += ' AND (fullname LIKE ? OR email LIKE ? OR phone_no LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Default sort by account_id for sequential display
    query += ' ORDER BY account_id ASC';

    const accounts = db.prepare(query).all(...params);
    console.log(`[accounts:getWithFilters] Fetched ${accounts?.length || 0} accounts with filters:`, filters);
    return { success: true, data: accounts || [] };
  } catch (error) {
    console.error('Error fetching accounts with filters:', error);
    return { success: false, error: error.message || 'Failed to fetch accounts with filters', data: [] };
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Debug handler to check products table state
ipcMain.handle('debug:checkProductsTable', async () => {
  try {
    console.log('=== CHECKING PRODUCTS TABLE ===');

    // Check table schema
    const tableInfo = db.prepare("PRAGMA table_info(products)").all();
    console.log('Products table schema:', tableInfo);

    // Check if table exists and has data
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    console.log('Products count:', productCount);

    // Get sample products
    const sampleProducts = db.prepare('SELECT * FROM products LIMIT 3').all();
    // console.log('Sample products:', sampleProducts);

    // Check categories table
    const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
    console.log('Categories count:', categoryCount);

    // Check join query
    const joinQuery = db.prepare(`
      SELECT 
        p.*,
        c.category_name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_unique_id = c.category_unique_id
      ORDER BY p.product_id ASC
    `).all();
    console.log('Join query result count:', joinQuery.length);
    console.log('Join query sample:', joinQuery.slice(0, 2));

    return {
      success: true,
      productCount,
      categoryCount,
      joinQueryCount: joinQuery.length,
      sampleProducts,
      sampleJoinQuery: joinQuery.slice(0, 2)
    };
  } catch (error) {
    console.error('Products table check error:', error);
    return { success: false, error: error.message };
  }
});

// Debug handler to check bills table state
ipcMain.handle('debug:checkBillsTable', async () => {
  try {
    console.log('=== CHECKING BILLS TABLE ===');

    // Check table schema
    const tableInfo = db.prepare("PRAGMA table_info(bill_orders)").all();
    // console.log('Bill_orders table schema:', tableInfo);

    // Check if table exists and has data
    const billCount = db.prepare('SELECT COUNT(*) as count FROM bill_orders').get().count;
    console.log('Bills count:', billCount);

    // Get sample bills
    const sampleBills = db.prepare('SELECT * FROM bill_orders ORDER BY bill_id DESC LIMIT 3').all();
    // console.log('Sample bills:', sampleBills);

    // Check accounts table
    const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get().count;
    console.log('Accounts count:', accountCount);

    return {
      success: true,
      billCount,
      accountCount,
      sampleBills
    };
  } catch (error) {
    console.error('Bills table check error:', error);
    return { success: false, error: error.message };
  }
});

// Debug handler to check transactions table state
ipcMain.handle('debug:checkTransactionsTable', async () => {
  try {
    console.log('=== CHECKING TRANSACTIONS TABLE ===');

    // Check table schema
    const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
    // console.log('Transactions table schema:', tableInfo);

    // Check if table exists and has data
    const transactionCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
    console.log('Transactions count:', transactionCount);

    // Get sample transactions
    const sampleTransactions = db.prepare('SELECT * FROM transactions ORDER BY transaction_id DESC LIMIT 3').all();
    // console.log('Sample transactions:', sampleTransactions);

    return {
      success: true,
      transactionCount,
      tableSchema: tableInfo,
      sampleTransactions
    };
  } catch (error) {
    console.error('Transactions table check error:', error);
    return { success: false, error: error.message };
  }
});

// Debug handler to check transaction table state
ipcMain.handle('debug:checkTransactionTable', async () => {
  try {
    console.log('=== CHECKING TRANSACTION TABLE STATE ===');

    // Get transaction count
    const transactionCount = safeQuery('SELECT COUNT(*) as count FROM transactions').get().count;
    console.log('Total transactions in database:', transactionCount);

    // Get transactions excluding central account
    const regularTransactions = safeQuery('SELECT COUNT(*) as count FROM transactions WHERE account_unique_id != ?', ['1_1_mart_account']).get().count;
    // console.log('Regular transactions (excluding central):', regularTransactions);

    // Get central account transactions
    const centralTransactions = safeQuery('SELECT COUNT(*) as count FROM transactions WHERE account_unique_id = ?', ['1_1_mart_account']).get().count;
    // console.log('Central account transactions:', centralTransactions);

    // Get sample transactions
    const sampleTransactions = safeQuery(`
      SELECT 
        transaction_id,
        transaction_unique_id,
        account_unique_id,
        order_no,
        order_type,
        total_amount,
        credit,
        debit,
        payment_type,
        payment_method,
        created_at
      FROM transactions 
      ORDER BY transaction_id DESC 
      LIMIT 5
    `);

    // console.log('Sample transactions:', sampleTransactions);

    // Check if transactions table exists and has correct schema
    const tableInfo = safeQuery("PRAGMA table_info(transactions)");
    console.log('Transactions table schema:', tableInfo);

    return {
      success: true,
      totalTransactions: transactionCount,
      regularTransactions,
      centralTransactions,
      sampleTransactions,
      tableSchema: tableInfo
    };
  } catch (error) {
    console.error('Transaction table check error:', error);
    return { success: false, error: error.message };
  }
});

// Debug handler to check bill items in database
ipcMain.handle('debug:checkBillItems', async () => {
  try {
    console.log('=== CHECKING BILL ITEMS IN DATABASE ===');

    // Get recent bills with their items
    const recentBills = safeQuery(`
      SELECT 
        bill_id,
        bill_unique_id,
        billno,
        bill_items,
        item_count,
        total_amount,
        created_at
      FROM bill_orders 
      ORDER BY bill_id DESC 
      LIMIT 5
    `);

    // console.log('Recent bills with items:', recentBills);

    // Parse and analyze bill items
    const analyzedBills = recentBills.map(bill => {
      let parsedItems = [];
      try {
        parsedItems = JSON.parse(bill.bill_items || '[]');
      } catch (e) {
        console.error('Failed to parse bill items for bill:', bill.bill_id, e);
      }

      return {
        bill_id: bill.bill_id,
        bill_unique_id: bill.bill_unique_id,
        billno: bill.billno,
        item_count: bill.item_count,
        total_amount: bill.total_amount,
        created_at: bill.created_at,
        parsed_items: parsedItems,
        items_detail: parsedItems.map((item, index) => ({
          index,
          product_unique_id: item.product_unique_id,
          product_name: item.product_name,
          barcode: item.barcode,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          has_complete_details: !!(item.product_name && item.barcode && item.product_unique_id)
        }))
      };
    });

    // console.log('Analyzed bills:', analyzedBills);

    return {
      success: true,
      recentBills: analyzedBills
    };
  } catch (error) {
    console.error('Bill items check error:', error);
    return { success: false, error: error.message };
  }
});

// Debug handler to check bills for return sale
ipcMain.handle('debug:checkBillsForReturn', async () => {
  try {
    console.log('=== CHECKING BILLS FOR RETURN SALE ===');

    // Get all bills with their identifiers
    const allBills = safeQuery(`
      SELECT 
        bill_id,
        bill_unique_id,
        billno,
        account_unique_id,
        total_amount,
        item_count,
        isreturned,
        created_at
      FROM bill_orders 
      ORDER BY bill_id DESC
    `);

    // console.log('All bills in database:', allBills);

    return {
      success: true,
      bills: allBills,
      billCount: allBills.length
    };
  } catch (error) {
    console.error('Bills for return check error:', error);
    return { success: false, error: error.message };
  }
});

// Debug handler to test bill creation
ipcMain.handle('debug:testBillCreation', async () => {
  try {
    console.log('=== TESTING BILL CREATION ===');

    // Create a test bill
    const testBill = {
      account_unique_id: '1_1_cust_001',
      total_amount: 100.00,
      paid_amount: 100.00,
      balance: 0,
      payment_method: 'cash',
      payment_status: 'paid',
      sale_type: 'retail',
      isreturned: 0,
      total_tax: 0,
      total_discount: 0,
      extracharges: 0,
      bill_items: JSON.stringify([
        {
          product_unique_id: '1_1_prod_iphone14',
          product_name: 'iPhone 14',
          quantity: 1,
          unit_price: 100.00,
          total_price: 100.00
        }
      ]),
      added_by: 'admin',
      company_id: '1',
      branch_id: '1'
    };

    // console.log('Test bill data:', testBill);

    // Call the bills:add handler
    const result = await ipcMain.handlers['bills:add'](null, testBill);
    // console.log('Bill creation result:', result);

    return {
      success: true,
      result,
      testBill
    };
  } catch (error) {
    console.error('Test bill creation error:', error);
    return { success: false, error: error.message };
  }
});

// Check if a bill has already been returned
ipcMain.handle('bills:checkIfAlreadyReturned', async (event, billNo) => {
  try {
    console.log('=== CHECKING IF BILL ALREADY RETURNED ===');
    console.log('Bill number to check:', billNo);

    // Check if any return bills reference this bill as original
    const existingReturn = safeQuery(`
      SELECT bill_id, billno, bill_unique_id, created_at 
      FROM bill_orders 
      WHERE original_bill_billno = ? AND isreturned = 1
      LIMIT 1
    `, [billNo]);

    // console.log('Existing return found:', existingReturn);

    if (existingReturn.length > 0) {
      return {
        success: true,
        alreadyReturned: true,
        returnBill: existingReturn[0]
      };
    } else {
      return {
        success: true,
        alreadyReturned: false,
        returnBill: null
      };
    }
  } catch (error) {
    console.error('Error checking if bill already returned:', error);
    return {
      success: false,
      error: error.message,
      alreadyReturned: false
    };
  }
});

// Debug handler to test inventory update for return sale
ipcMain.handle('debug:testReturnSaleInventory', async () => {
  try {
    console.log('=== TESTING RETURN SALE INVENTORY UPDATE ===');

    // Get current inventory state
    const currentInventory = safeQuery(`
      SELECT 
        inventory_id,
        product_unique_id,
        stock,
        retail_price
      FROM inventory 
      ORDER BY inventory_id DESC
      LIMIT 5
    `);

    console.log('Current inventory state:', currentInventory);

    // Simulate a return sale
    const testReturnBill = {
      isreturned: 1,
      bill_items: JSON.stringify([
        {
          product_unique_id: '1_1_prod_iphone14',
          quantity: 2,
          unit_price: 999.99
        }
      ])
    };

    // console.log('Test return bill:', testReturnBill);

    // Test the inventory update logic
    const items = JSON.parse(testReturnBill.bill_items || '[]');
    const getInv = db.prepare('SELECT * FROM inventory WHERE product_unique_id = ? LIMIT 1');
    const updInv = db.prepare(`UPDATE inventory SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE inventory_id = ?`);

    for (const it of items) {
      const prodUid = String(it.product_unique_id || '');
      if (!prodUid) continue;
      const qtyRaw = Number(it.quantity || 0);
      const qty = testReturnBill.isreturned ? qtyRaw : -qtyRaw; // sale reduces stock; return increases

      console.log(`Test processing item: ${prodUid}, qtyRaw: ${qtyRaw}, isreturned: ${testReturnBill.isreturned}, final qty: ${qty}`);

      const existing = getInv.get(prodUid);
      if (existing && existing.inventory_id) {
        console.log(`Test updating inventory for ${prodUid}: current stock ${existing.stock} + ${qty} = ${existing.stock + qty}`);
        // Don't actually update, just simulate
        console.log('SIMULATION: Would update inventory');
      }
    }

    return {
      success: true,
      currentInventory,
      testResult: 'Inventory update logic tested successfully'
    };
  } catch (error) {
    console.error('Test return sale inventory error:', error);
    return { success: false, error: error.message };
  }
});

// Get a specific purchase by ID
ipcMain.handle('purchases:getById', async (event, purchaseId) => {
  try {
    console.log('Getting purchase by ID:', purchaseId);

    const row = db.prepare(`
      SELECT * FROM purchase_orders 
      WHERE purchase_unique_id = ? OR purchase_billno = ?
      LIMIT 1
    `).get(purchaseId, purchaseId);

    if (!row) {
      return createErrorResponse(new Error('Purchase not found'), 'purchases:getById');
    }

    let items = [];
    try { items = JSON.parse(row.purchase_items || '[]'); } catch (_) { items = []; }

    let originalItems = [];
    try { originalItems = JSON.parse(row.original_purchase_items || '[]'); } catch (_) { originalItems = []; }

    // Enrich items with brand information from products table
    const enrichedItems = items.map(item => {
      const product = db.prepare(`
        SELECT brand FROM products 
        WHERE product_unique_id = ? OR barcode = ?
        LIMIT 1
      `).get(item.product_unique_id, item.barcode);

      return {
        ...item,
        brand: product?.brand || ''
      };
    });

    // Enrich original items with brand information from products table
    const enrichedOriginalItems = originalItems.map(item => {
      const product = db.prepare(`
        SELECT brand FROM products 
        WHERE product_unique_id = ? OR barcode = ?
        LIMIT 1
      `).get(item.product_unique_id, item.barcode);

      return {
        ...item,
        brand: product?.brand || ''
      };
    });

    const result = {
      purchase_id: row.purchase_id,
      purchase_unique_id: row.purchase_unique_id,
      purchase_billno: row.purchase_billno,
      account_unique_id: row.account_unique_id,
      po_no: row.po_no,
      received_by: row.received_by,
      total_amount: row.total_amount,
      paid_amount: row.paid_amount,
      balance: row.balance,
      profit_margin: row.profit_margin,
      item_count: row.item_count,
      isreturned: row.isreturned,
      purchase_items: enrichedItems,
      original_purchase_items: enrichedOriginalItems,
      original_purchase_billno: row.original_purchase_billno,
      added_by: row.added_by,
      company_id: row.company_id,
      branch_id: row.branch_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    return createSuccessResponse(result, 'Purchase retrieved successfully');
  } catch (error) {
    console.error('Error fetching purchase by ID:', error);
    return createErrorResponse(error, 'purchases:getById');
  }
});

// ===== DATABASE EXPORT/IMPORT FUNCTIONALITY =====

const XLSX = require('xlsx');
const fs = require('fs');

/**
 * Export entire database to Excel file
 */
ipcMain.handle('database:export', async () => {
  try {
    console.log('Starting database export...');

    if (!db) {
      throw new Error('Database not initialized');
    }

    // Get all table names
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();

    console.log('Found tables:', tables.map(t => t.name));

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Export each table to a separate sheet
    for (const table of tables) {
      try {
        console.log(`Exporting table: ${table.name}`);

        // Get table data
        const data = db.prepare(`SELECT * FROM ${table.name}`).all();

        if (data.length > 0) {
          // Convert to worksheet
          const worksheet = XLSX.utils.json_to_sheet(data);

          // Add worksheet to workbook
          XLSX.utils.book_append_sheet(workbook, worksheet, table.name);

          console.log(`Exported ${data.length} rows from ${table.name}`);
        } else {
          // Create empty sheet with headers
          const headers = db.prepare(`PRAGMA table_info(${table.name})`).all();
          const emptyData = headers.map(h => ({ [h.name]: '' }));
          const worksheet = XLSX.utils.json_to_sheet(emptyData);
          XLSX.utils.book_append_sheet(workbook, worksheet, table.name);

          console.log(`Created empty sheet for ${table.name}`);
        }
      } catch (tableError) {
        console.error(`Error exporting table ${table.name}:`, tableError);
        // Continue with other tables
      }
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 11);
    const filename = `database-export-${timestamp}.xlsx`;

    // Write to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    console.log(`Database export completed. File size: ${buffer.length} bytes`);

    return createSuccessResponse({
      filename,
      buffer: buffer.toString('base64'),
      size: buffer.length,
      tablesExported: tables.length
    }, 'Database exported successfully');

  } catch (error) {
    console.error('Error exporting database:', error);
    return createErrorResponse(error, 'database:export');
  }
});

/**
 * Import database from Excel file
 */
ipcMain.handle('database:import', async (event, { filePath, options = {} }) => {
  try {
    console.log('Starting database import...', { filePath, options });

    if (!db) {
      throw new Error('Database not initialized');
    }

    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('File does not exist');
    }

    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    console.log('Found sheets:', sheetNames);

    // Create backup before import
    const backupPath = path.join(path.dirname(filePath), `backup-${Date.now()}.db`);
    fs.copyFileSync(path.join(__dirname, 'app-data.db'), backupPath);
    console.log(`Database backup created: ${backupPath}`);

    // Start transaction
    const transaction = db.transaction(() => {
      const results = {
        imported: 0,
        errors: 0,
        tables: {},
        errorDetails: []
      };

      // Process each sheet
      for (const sheetName of sheetNames) {
        try {
          console.log(`Processing sheet: ${sheetName}`);

          // Get table data
          const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

          if (data.length === 0) {
            console.log(`Sheet ${sheetName} is empty, skipping`);
            results.tables[sheetName] = { imported: 0, errors: 0, message: 'Empty sheet' };
            continue;
          }

          // Check if table exists
          const tableExists = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name = ?
          `).get(sheetName);

          if (!tableExists) {
            console.log(`Table ${sheetName} does not exist, skipping`);
            results.tables[sheetName] = { imported: 0, errors: 0, message: 'Table does not exist' };
            continue;
          }

          // Get table structure
          const columns = db.prepare(`PRAGMA table_info(${sheetName})`).all();
          const columnNames = columns.map(c => c.name);

          console.log(`Table ${sheetName} columns:`, columnNames);

          let imported = 0;
          let errors = 0;
          const tableErrors = [];

          // Import data row by row
          for (const row of data) {
            try {
              // Filter row data to only include valid columns
              const filteredRow = {};
              for (const [key, value] of Object.entries(row)) {
                if (columnNames.includes(key)) {
                  // Handle different data types
                  if (value === null || value === undefined || value === '') {
                    filteredRow[key] = null;
                  } else {
                    filteredRow[key] = value;
                  }
                }
              }

              // Skip if no valid data
              if (Object.keys(filteredRow).length === 0) {
                continue;
              }

              // Build INSERT query
              const keys = Object.keys(filteredRow);
              const values = Object.values(filteredRow);
              const placeholders = keys.map(() => '?').join(', ');

              const insertQuery = `INSERT OR REPLACE INTO ${sheetName} (${keys.join(', ')}) VALUES (${placeholders})`;

              db.prepare(insertQuery).run(...values);
              imported++;

            } catch (rowError) {
              console.error(`Error importing row in ${sheetName}:`, rowError);
              errors++;
              tableErrors.push({
                table: sheetName,
                error: rowError.message,
                rowData: row,
                errorType: rowError.code || 'UNKNOWN_ERROR'
              });
            }
          }

          results.tables[sheetName] = { imported, errors, errorDetails: tableErrors };
          results.imported += imported;
          results.errors += errors;
          results.errorDetails.push(...tableErrors);

          console.log(`Sheet ${sheetName}: ${imported} imported, ${errors} errors`);

        } catch (sheetError) {
          console.error(`Error processing sheet ${sheetName}:`, sheetError);
          results.tables[sheetName] = {
            imported: 0,
            errors: 1,
            message: sheetError.message,
            errorDetails: [{
              table: sheetName,
              error: sheetError.message,
              errorType: 'SHEET_ERROR'
            }]
          };
          results.errors++;
          results.errorDetails.push({
            table: sheetName,
            error: sheetError.message,
            errorType: 'SHEET_ERROR'
          });
        }
      }

      return results;
    });

    // Execute transaction
    const results = transaction();

    console.log('Database import completed:', results);

    return createSuccessResponse({
      ...results,
      backupPath,
      totalSheets: sheetNames.length
    }, 'Database imported successfully');

  } catch (error) {
    console.error('Error importing database:', error);
    return createErrorResponse(error, 'database:import');
  }
});

/**
 * Validate Excel file structure
 */
ipcMain.handle('database:validateFile', async (event, filePath) => {
  try {
    console.log('Validating Excel file:', filePath);

    if (!fs.existsSync(filePath)) {
      throw new Error('File does not exist');
    }

    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    // Get current database tables
    const dbTables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all().map(t => t.name);

    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      sheets: {},
      summary: {
        totalSheets: sheetNames.length,
        matchingTables: 0,
        extraSheets: 0,
        missingTables: 0
      }
    };

    // Validate each sheet
    for (const sheetName of sheetNames) {
      const sheetValidation = {
        exists: dbTables.includes(sheetName),
        hasData: false,
        rowCount: 0,
        columns: [],
        errors: []
      };

      try {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        sheetValidation.hasData = data.length > 0;
        sheetValidation.rowCount = data.length;

        if (data.length > 0) {
          sheetValidation.columns = Object.keys(data[0]);
        }

        if (sheetValidation.exists) {
          // Get expected columns
          const dbColumns = db.prepare(`PRAGMA table_info(${sheetName})`).all();
          const expectedColumns = dbColumns.map(c => c.name);

          // Check for missing columns (treat as warnings, not errors)
          const missingColumns = expectedColumns.filter(col => !sheetValidation.columns.includes(col));
          if (missingColumns.length > 0) {
            sheetValidation.errors.push(`Missing columns (will be set to default values): ${missingColumns.join(', ')}`);
            // Add to warnings instead of errors
            validation.warnings.push(`${sheetName}: Missing columns: ${missingColumns.join(', ')}`);
          }

          validation.summary.matchingTables++;
        } else {
          sheetValidation.errors.push('Table does not exist in database');
          validation.summary.extraSheets++;
        }

      } catch (error) {
        sheetValidation.errors.push(`Error reading sheet: ${error.message}`);
        validation.isValid = false;
      }

      validation.sheets[sheetName] = sheetValidation;

      // Only add critical errors (not missing columns) to validation errors
      const criticalErrors = sheetValidation.errors.filter(err =>
        !err.includes('Missing columns') && !err.includes('will be set to default values')
      );
      if (criticalErrors.length > 0) {
        validation.errors.push(...criticalErrors.map(err => `${sheetName}: ${err}`));
      }
    }

    // Check for missing tables
    const missingTables = dbTables.filter(table => !sheetNames.includes(table));
    if (missingTables.length > 0) {
      validation.warnings.push(`Missing tables in file: ${missingTables.join(', ')}`);
      validation.summary.missingTables = missingTables.length;
    }

    if (validation.errors.length > 0) {
      validation.isValid = false;
    }

    console.log('File validation completed:', validation);

    return createSuccessResponse(validation, 'File validation completed');

  } catch (error) {
    console.error('Error validating file:', error);
    return createErrorResponse(error, 'database:validateFile');
  }
});

/**
 * Show file dialog for Excel file selection
 */
ipcMain.handle('database:selectFile', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Excel File to Import',
      filters: [
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled) {
      return createSuccessResponse(null, 'File selection cancelled');
    }

    const filePath = result.filePaths[0];
    return createSuccessResponse({ filePath }, 'File selected successfully');

  } catch (error) {
    console.error('Error selecting file:', error);
    return createErrorResponse(error, 'database:selectFile');
  }
});

/**
 * Get database statistics
 */
ipcMain.handle('database:getStats', async () => {
  try {
    if (!db) {
      throw new Error('Database not initialized');
    }

    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();

    const stats = {
      totalTables: tables.length,
      tables: {},
      totalRecords: 0,
      databaseSize: 0
    };

    // Get file size
    try {
      const dbPath = path.join(__dirname, 'app-data.db');
      const stat = fs.statSync(dbPath);
      stats.databaseSize = stat.size;
    } catch (error) {
      console.error('Error getting database size:', error);
    }

    // Get record count for each table
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get().count;
        stats.tables[table.name] = count;
        stats.totalRecords += count;
      } catch (error) {
        console.error(`Error counting records in ${table.name}:`, error);
        stats.tables[table.name] = 0;
      }
    }

    return createSuccessResponse(stats, 'Database statistics retrieved');

  } catch (error) {
    console.error('Error getting database stats:', error);
    return createErrorResponse(error, 'database:getStats');
  }
});