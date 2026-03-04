const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
// Note: app import removed since we're using root directory instead of userData

// Determine the database path - use userData directory in production, project root in development
let dbPath;

if (process.env.NODE_ENV === 'development') {
  // In development, use project root for easier access
  dbPath = path.join(__dirname, 'app-data.db');
} else {
  // In production, use app.getPath('userData') which points to a writable directory
  const { app } = require('electron');
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'app-data.db');
}

console.log('Using database at:', dbPath);

// Ensure the directory for the database exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Database initialization and mock data seeding functions

// Helper to get local date and time as 'YYYY-MM-DD HH:mm:ss'
function getLocalDateTime() {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
}

// Initialize db at module level
let db = null;

function initializeDatabase() {
  try {
    // Initialize the database with error handling
    db = new Database(dbPath); // Remove verbose logging to prevent console spam
    console.log('Database opened successfully at:', dbPath);

    // Enable foreign keys
    db.prepare('PRAGMA foreign_keys = ON').run();

    // Drop old tables if they exist to start fresh
    const tablesToDrop = [
      'sales', 'sales_items', 'customers', 'suppliers', 
      'bill_items', 'purchase_items', 'quotation_items'
    ];
    
    tablesToDrop.forEach(table => {
      try {
        db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
        console.log(`Dropped old table: ${table}`);
      } catch (e) {
        console.log(`Table ${table} didn't exist or couldn't be dropped: ${e.message}`);
      }
    });

    // Create categories table
    db.prepare(`CREATE TABLE IF NOT EXISTS categories (
      category_id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_unique_id TEXT UNIQUE NOT NULL,
      category_name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      added_by TEXT NOT NULL,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();

    // Create products table
    db.prepare(`CREATE TABLE IF NOT EXISTS products (
      product_id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_unique_id TEXT UNIQUE NOT NULL,
      product_name TEXT NOT NULL,
      barcode TEXT NOT NULL,
      brand TEXT NOT NULL,
      category_unique_id TEXT NOT NULL,
      retail_price REAL NOT NULL,
      wholesale_price REAL NOT NULL,
      purchase_price REAL NOT NULL DEFAULT 0,
      alertqty INTEGER NOT NULL DEFAULT 0,
      tax REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      returnable INTEGER DEFAULT 0,
      added_by TEXT NOT NULL,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_unique_id) REFERENCES categories(category_unique_id)
    )`).run();

    // Create accounts table (replaces customers and suppliers)
    db.prepare(`CREATE TABLE IF NOT EXISTS accounts (
      account_id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_unique_id TEXT UNIQUE NOT NULL,
      fullname TEXT NOT NULL,
      email TEXT,
      phone_no TEXT,
      address TEXT,
      second_address TEXT,
      city TEXT,
      account_type TEXT NOT NULL CHECK (account_type IN ('customer', 'supplier', 'user')),
      account_status TEXT NOT NULL DEFAULT 'active',
      account_limit REAL NOT NULL DEFAULT 0,
      total_credit REAL NOT NULL DEFAULT 0,
      total_debit REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0,
      loyality_points INTEGER DEFAULT 0,
      discount_rate REAL DEFAULT 0,
      remarks TEXT,
      added_by TEXT NOT NULL,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();

    // Create users table
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone_no TEXT,
      plan TEXT,
      plan_duration TEXT,
      plan_start TEXT,
      plan_enddate TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      user_details TEXT,
      role TEXT NOT NULL,
      password TEXT NOT NULL,
      added_by TEXT,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();

    // Create system_settings table
    db.prepare(`CREATE TABLE IF NOT EXISTS system_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();

    // Create transactions table
    db.prepare(`CREATE TABLE IF NOT EXISTS transactions (
      transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_unique_id TEXT UNIQUE NOT NULL,
      account_unique_id TEXT NOT NULL,
      order_no TEXT NOT NULL,
      order_type TEXT NOT NULL CHECK (order_type IN ('bill', 'purchase', 'quotation', 'voucher')),
      total_amount REAL NOT NULL DEFAULT 0,
      credit REAL NOT NULL DEFAULT 0,
      debit REAL NOT NULL DEFAULT 0,
      payment_type TEXT NOT NULL CHECK (payment_type IN ('credit', 'debit')),
      payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'ledger')),
      added_by TEXT NOT NULL,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_unique_id) REFERENCES accounts(account_unique_id)
    )`).run();

    // Create inventory table
    db.prepare(`CREATE TABLE IF NOT EXISTS inventory (
      inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_unique_id TEXT UNIQUE NOT NULL,
      product_unique_id TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      retail_price REAL NOT NULL,
      category_name TEXT,
      added_by TEXT NOT NULL,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_unique_id) REFERENCES products(product_unique_id)
    )`).run();

    // Create inventory_reservations table (for pending bills stock holds)
    db.prepare(`CREATE TABLE IF NOT EXISTS inventory_reservations (
      reservation_id TEXT PRIMARY KEY,
      product_unique_id TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      reserved_quantity INTEGER NOT NULL,
      bill_id TEXT,
      bill_status TEXT DEFAULT 'draft',
      status TEXT DEFAULT 'active', -- active, completed, cancelled, expired
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT DEFAULT (datetime('now', '+10 minutes')),
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`).run();

    // Create purchase_orders table (with embedded purchase_items as JSON)
    db.prepare(`CREATE TABLE IF NOT EXISTS purchase_orders (
      purchase_id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_unique_id TEXT UNIQUE NOT NULL,
      account_unique_id TEXT NOT NULL,
      purchase_billno TEXT NOT NULL,
      po_no TEXT,
      received_by TEXT,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      profit_margin REAL DEFAULT 0,
      item_count INTEGER DEFAULT 0,
      isreturned INTEGER DEFAULT 0,
      purchase_items TEXT, -- JSON array of current items
      original_purchase_items TEXT, -- JSON array of original items (before any returns)
      original_purchase_billno TEXT, -- Track original purchase bill number for returns
      added_by TEXT NOT NULL,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_unique_id) REFERENCES accounts(account_unique_id)
    )`).run();

    // Create bill_orders table (with embedded bill_items as JSON)
    db.prepare(`CREATE TABLE IF NOT EXISTS bill_orders (
      bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_unique_id TEXT UNIQUE NOT NULL,
      billno TEXT NOT NULL,
      account_unique_id TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      payment_method TEXT,
      payment_status TEXT DEFAULT 'pending',
      sale_type TEXT DEFAULT 'retail',
      isreturned INTEGER DEFAULT 0,
      total_tax REAL DEFAULT 0,
      total_discount REAL DEFAULT 0,
      extracharges REAL DEFAULT 0,
      item_count INTEGER DEFAULT 0,
      bill_items TEXT, -- JSON array of items
      original_bill_billno TEXT, -- Track original bill number for returns
      added_by TEXT NOT NULL,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_unique_id) REFERENCES accounts(account_unique_id)
    )`).run();

    // Create quotations table (with embedded quotation_items as JSON)
    db.prepare(`CREATE TABLE IF NOT EXISTS quotations (
      quotation_id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_unique_id TEXT UNIQUE NOT NULL,
      quotationno TEXT NOT NULL,
      account_unique_id TEXT NOT NULL,
      tax_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      item_count INTEGER DEFAULT 0,
      sale_type TEXT DEFAULT 'retail',
      quotation_items TEXT, -- JSON array of items
      added_by TEXT NOT NULL,
      company_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_unique_id) REFERENCES accounts(account_unique_id)
    )`).run();

    // Create sync_meta table for incremental sync
    db.prepare(`CREATE TABLE IF NOT EXISTS sync_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_sync_time TEXT
    )`).run();

    // Run migrations
    try {
      // Add email column to users table if it doesn't exist
      db.prepare('ALTER TABLE users ADD COLUMN email TEXT').run();
      console.log('Migration: Added email column to users table');
    } catch (e) {
      console.log('Migration: Email column already exists in users table');
    }

    // Ensure transactions table has correct schema (remove user_id if it exists)
    try {
      const tableInfo = db.prepare("PRAGMA table_info(transactions)").all();
      const hasUserIdColumn = tableInfo.some(col => col.name === 'user_id');
      
      if (hasUserIdColumn) {
        db.prepare(`
          CREATE TABLE transactions_new (
            transaction_id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_unique_id TEXT UNIQUE NOT NULL,
            account_unique_id TEXT NOT NULL,
            order_no TEXT NOT NULL,
            order_type TEXT NOT NULL CHECK (order_type IN ('bill', 'purchase', 'quotation', 'voucher')),
            total_amount REAL NOT NULL DEFAULT 0,
            credit REAL NOT NULL DEFAULT 0,
            debit REAL NOT NULL DEFAULT 0,
            payment_type TEXT NOT NULL CHECK (payment_type IN ('credit', 'debit')),
            payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'ledger')),
            added_by TEXT NOT NULL,
            company_id TEXT NOT NULL,
            branch_id TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
        
        db.prepare(`
          INSERT INTO transactions_new (
            transaction_id, transaction_unique_id, account_unique_id, order_no, order_type,
            total_amount, credit, debit, payment_type, payment_method, added_by, company_id, branch_id,
            created_at, updated_at
          )
          SELECT 
            transaction_id, transaction_unique_id, account_unique_id, order_no, order_type,
            total_amount, credit, debit, payment_type, payment_method, added_by, company_id, branch_id,
            created_at, updated_at
          FROM transactions
        `).run();
        
        db.prepare('DROP TABLE transactions').run();
        db.prepare('ALTER TABLE transactions_new RENAME TO transactions').run();
        
        console.log('Migration: Removed user_id column from transactions table');
      }
    } catch (e) {
      console.log('Migration: Transactions table schema is already correct');
    }

    // Migration: Add original_purchase_items column to purchase_orders table
    try {
      const tableInfo = db.prepare("PRAGMA table_info(purchase_orders)").all();
      const hasOriginalItemsColumn = tableInfo.some(col => col.name === 'original_purchase_items');
      
      if (!hasOriginalItemsColumn) {
        db.prepare('ALTER TABLE purchase_orders ADD COLUMN original_purchase_items TEXT').run();
        db.prepare(`
          UPDATE purchase_orders 
          SET original_purchase_items = purchase_items 
          WHERE original_purchase_items IS NULL
        `).run();
        
        console.log('Migration: Added original_purchase_items column to purchase_orders table');
      }
    } catch (e) {
      console.log('Migration: original_purchase_items column already exists in purchase_orders table');
    }

    // Migration: Add original_purchase_billno column to purchase_orders table
    try {
      const tableInfo = db.prepare("PRAGMA table_info(purchase_orders)").all();
      const hasOriginalBillNoColumn = tableInfo.some(col => col.name === 'original_purchase_billno');
      
      if (!hasOriginalBillNoColumn) {
        db.prepare('ALTER TABLE purchase_orders ADD COLUMN original_purchase_billno TEXT').run();
        db.prepare(`
          UPDATE purchase_orders 
          SET original_purchase_billno = purchase_billno 
          WHERE original_purchase_billno IS NULL
        `).run();
        
        console.log('Migration: Added original_purchase_billno column to purchase_orders table');
      }
    } catch (e) {
      console.log('Migration: original_purchase_billno column already exists in purchase_orders table');
    }

    // Create indexes for better performance
    createIndexes();

    // Seed with mock data if tables are empty
    seedMockData();

    console.log('Database initialized successfully with new schema');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
    throw error; // Rethrow to allow the caller to handle the error
  }
}

function createIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_unique_id)',
    'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)',
    'CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type)',
    'CREATE INDEX IF NOT EXISTS idx_accounts_company_branch ON accounts(company_id, branch_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_unique_id)',
    'CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_no, order_type)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_order_account ON transactions(order_no, order_type, account_unique_id)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_unique_id)',
    'CREATE INDEX IF NOT EXISTS idx_purchase_orders_account ON purchase_orders(account_unique_id)',
    'CREATE INDEX IF NOT EXISTS idx_bill_orders_account ON bill_orders(account_unique_id)',
    'CREATE INDEX IF NOT EXISTS idx_quotations_account ON quotations(account_unique_id)'
  ];

  indexes.forEach(indexSql => {
    try {
      db.prepare(indexSql).run();
    } catch (e) {
      console.error('Failed to create index:', e.message);
    }
  });
}

function seedMockData() {
  try {
    // Check if data already exists
    const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
    if (categoryCount > 0) {
      console.log('Mock data already exists, skipping seeding');
      return;
    }

    console.log('Seeding mock data...');

    // Seed categories
    const insertCategory = db.prepare(`
      INSERT INTO categories (category_unique_id, category_name, description, icon, status, added_by, company_id, branch_id, created_at, updated_at)
      VALUES (@category_unique_id, @category_name, @description, @icon, @status, @added_by, @company_id, @branch_id, @created_at, @updated_at)
    `);

    const newCategories = [
      
    ];

    const insertCategoriesTransaction = db.transaction((cats) => {
      for (const cat of cats) {
        insertCategory.run(cat);
      }
    });
    insertCategoriesTransaction(newCategories);

    // Seed accounts (customers and suppliers)
    const insertAccount = db.prepare(`
      INSERT INTO accounts (account_unique_id, fullname, email, phone_no, address, second_address, city, account_type, account_status, account_limit, total_credit, total_debit, balance, loyality_points, discount_rate, remarks, added_by, company_id, branch_id, created_at, updated_at)
      VALUES (@account_unique_id, @fullname, @email, @phone_no, @address, @second_address, @city, @account_type, @account_status, @account_limit, @total_credit, @total_debit, @balance, @loyality_points, @discount_rate, @remarks, @added_by, @company_id, @branch_id, @created_at, @updated_at)
    `);

    const newAccounts = [
      {
        account_unique_id: '1_1_walkin_customer',
        fullname: 'Walk-in Customer',
        email: '',
        phone_no: '',
        address: '',
        second_address: '',
        city: '',
        account_type: 'customer',
        account_status: 'active',
        account_limit: 0,
        total_credit: 0,
        total_debit: 0,
        balance: 0,
        loyality_points: 0,
        discount_rate: 0,
        remarks: 'Default customer for retail sales',
        added_by: 'admin',
        company_id: '1',
        branch_id: '1',
        created_at: getLocalDateTime(),
        updated_at: getLocalDateTime()
      },
     
      {
        account_unique_id: '1_1_mart_account',
        fullname: 'mart-account',
        email: '',
        phone_no: '',
        address: '',
        second_address: '',
        city: '',
        account_type: 'user',
        account_status: 'active',
        account_limit: 0,
        total_credit: 0,
        total_debit: 0,
        balance: 0,
        loyality_points: 0,
        discount_rate: 0,
        remarks: 'Central cash/bank control account',
        added_by: 'admin',
        company_id: '1',
        branch_id: '1',
        created_at: getLocalDateTime(),
        updated_at: getLocalDateTime()
      }
    ];

    const insertAccountsTransaction = db.transaction((accounts) => {
      for (const account of accounts) {
        insertAccount.run(account);
      }
    });
    insertAccountsTransaction(newAccounts);

    // Seed products
    const insertProduct = db.prepare(`
      INSERT INTO products (product_unique_id, product_name, barcode, brand, category_unique_id, retail_price, wholesale_price, purchase_price, alertqty, tax, discount, status, returnable, added_by, company_id, branch_id, created_at, updated_at)
      VALUES (@product_unique_id, @product_name, @barcode, @brand, @category_unique_id, @retail_price, @wholesale_price, @purchase_price, @alertqty, @tax, @discount, @status, @returnable, @added_by, @company_id, @branch_id, @created_at, @updated_at)
    `);

    const newProducts = [
    
    ];

    const insertProductsTransaction = db.transaction((products) => {
      for (const product of products) {
        insertProduct.run(product);
      }
    });
    insertProductsTransaction(newProducts);

    // Seed inventory
    const insertInventory = db.prepare(`
      INSERT INTO inventory (inventory_unique_id, product_unique_id, stock, retail_price, category_name, added_by, company_id, branch_id, created_at, updated_at)
      VALUES (@inventory_unique_id, @product_unique_id, @stock, @retail_price, @category_name, @added_by, @company_id, @branch_id, @created_at, @updated_at)
    `);

    const newInventory = [
     
    ];

    const insertInventoryTransaction = db.transaction((inventory) => {
      for (const item of inventory) {
        insertInventory.run(item);
      }
    });
    insertInventoryTransaction(newInventory);

    // Seed purchase orders
    const insertPurchaseOrder = db.prepare(`
      INSERT INTO purchase_orders (purchase_unique_id, account_unique_id, purchase_billno, po_no, received_by, total_amount, paid_amount, balance, profit_margin, item_count, isreturned, purchase_items, original_purchase_items, original_purchase_billno, added_by, company_id, branch_id, created_at, updated_at)
      VALUES (@purchase_unique_id, @account_unique_id, @purchase_billno, @po_no, @received_by, @total_amount, @paid_amount, @balance, @profit_margin, @item_count, @isreturned, @purchase_items, @original_purchase_items, @original_purchase_billno, @added_by, @company_id, @branch_id, @created_at, @updated_at)
    `);

    const purchaseItems = [
     
    ];

    const newPurchaseOrder = {
      
    };

    insertPurchaseOrder.run(newPurchaseOrder);

    // Seed bill orders
    const insertBillOrder = db.prepare(`
      INSERT INTO bill_orders (bill_unique_id, billno, account_unique_id, total_amount, paid_amount, balance, payment_method, payment_status, sale_type, isreturned, total_tax, total_discount, extracharges, item_count, bill_items, original_bill_billno, added_by, company_id, branch_id, created_at, updated_at)
      VALUES (@bill_unique_id, @billno, @account_unique_id, @total_amount, @paid_amount, @balance, @payment_method, @payment_status, @sale_type, @isreturned, @total_tax, @total_discount, @extracharges, @item_count, @bill_items, @original_bill_billno, @added_by, @company_id, @branch_id, @created_at, @updated_at)
    `);

    const billItems = [
    ];

    const newBillOrder = {
      
    };

    insertBillOrder.run(newBillOrder);

    // Seed quotations
    const insertQuotation = db.prepare(`
      INSERT INTO quotations (quotation_unique_id, quotationno, account_unique_id, tax_amount, discount_amount, total_amount, paid_amount, item_count, sale_type, quotation_items, added_by, company_id, branch_id, created_at, updated_at)
      VALUES (@quotation_unique_id, @quotationno, @account_unique_id, @tax_amount, @discount_amount, @total_amount, @paid_amount, @item_count, @sale_type, @quotation_items, @added_by, @company_id, @branch_id, @created_at, @updated_at)
    `);

    const quotationItems = [
   
    ];

    const newQuotation = {
      
    };

    insertQuotation.run(newQuotation);

    const quotationItems2 = [
     
    ];

    const newQuotation2 = {
     
    };

    insertQuotation.run(newQuotation2);

    console.log('Mock data seeded successfully');
  } catch (error) {
    console.error('Error seeding mock data:', error.message);
  }
}

function getDatabase() {
  if (!db) {
    db = initializeDatabase();
  }
  return db;
}

function getLastSyncTime() {
  const database = getDatabase();
  const row = database.prepare('SELECT last_sync_time FROM sync_meta WHERE id = 1').get();
  return row ? row.last_sync_time : null;
}

function setLastSyncTime(ts) {
  const database = getDatabase();
  database.prepare('INSERT OR REPLACE INTO sync_meta (id, last_sync_time) VALUES (1, ?)').run(ts);
}

function resetAutoIncrement(tableName) {
  const database = getDatabase();
  database.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(tableName);
  database.prepare(`VACUUM`).run();
}

// ===== Reservation helpers =====

function getReservedQuantity(productUniqueId) {
  const database = getDatabase();
  const row = database.prepare(`
    SELECT COALESCE(SUM(reserved_quantity), 0) AS total
    FROM inventory_reservations
    WHERE product_unique_id = ? AND status = 'active' AND expires_at > datetime('now')
  `).get(productUniqueId);
  return Number(row?.total || 0);
}

function getCurrentStock(productUniqueId) {
  const database = getDatabase();
  const row = database.prepare(`SELECT stock FROM inventory WHERE product_unique_id = ? LIMIT 1`).get(productUniqueId);
  return Number(row?.stock || 0);
}

function getAvailableStockWithReservations(productUniqueId) {
  const current = getCurrentStock(productUniqueId);
  const reserved = getReservedQuantity(productUniqueId);
  return Math.max(0, current - reserved);
}

function createReservation({ reservationId, productUniqueId, quantity, terminalId, billId, ttlMinutes = 10 }) {
  const database = getDatabase();
  const available = getAvailableStockWithReservations(productUniqueId);
  if (quantity > available) {
    return { success: false, error: 'INSUFFICIENT_STOCK', available };
  }
  const expiresExpr = `+${Number(ttlMinutes)} minutes`;
  database.prepare(`
    INSERT OR REPLACE INTO inventory_reservations
      (reservation_id, product_unique_id, terminal_id, reserved_quantity, bill_id, bill_status, status, created_at, expires_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'draft', 'active', CURRENT_TIMESTAMP, datetime('now', '${expiresExpr}'), CURRENT_TIMESTAMP)
  `).run(
    String(reservationId), String(productUniqueId), String(terminalId), Number(quantity), billId ? String(billId) : null
  );
  return { success: true, available: getAvailableStockWithReservations(productUniqueId) };
}

function updateReservationQuantity({ reservationId, newQuantity }) {
  const database = getDatabase();
  const row = database.prepare(`SELECT * FROM inventory_reservations WHERE reservation_id = ? AND status = 'active'`).get(String(reservationId));
  if (!row) return { success: false, error: 'RESERVATION_NOT_FOUND' };
  const available = getAvailableStockWithReservations(row.product_unique_id) + Number(row.reserved_quantity);
  if (Number(newQuantity) > available) {
    return { success: false, error: 'INSUFFICIENT_STOCK', available };
  }
  database.prepare(`UPDATE inventory_reservations SET reserved_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE reservation_id = ?`).run(Number(newQuantity), String(reservationId));
  return { success: true, product_unique_id: row.product_unique_id, available: getAvailableStockWithReservations(row.product_unique_id) };
}

function cancelReservation(reservationId) {
  const database = getDatabase();
  const row = database.prepare(`SELECT * FROM inventory_reservations WHERE reservation_id = ?`).get(String(reservationId));
  if (!row) return { success: true };
  database.prepare(`UPDATE inventory_reservations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE reservation_id = ?`).run(String(reservationId));
  return { success: true, product_unique_id: row.product_unique_id, available: getAvailableStockWithReservations(row.product_unique_id) };
}

function completeReservationsForBill({ billId, terminalId }) {
  const database = getDatabase();
  const rows = database.prepare(`
    SELECT * FROM inventory_reservations
    WHERE bill_id = ? AND terminal_id = ? AND status = 'active'
  `).all(String(billId), String(terminalId));
  const updInv = database.prepare(`UPDATE inventory SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE product_unique_id = ?`);
  const tx = database.transaction(() => {
    for (const r of rows) {
      updInv.run(Number(r.reserved_quantity), String(r.product_unique_id));
      database.prepare(`UPDATE inventory_reservations SET status = 'completed', bill_status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE reservation_id = ?`).run(String(r.reservation_id));
    }
  });
  tx();
  const affected = Array.from(new Set(rows.map(r => String(r.product_unique_id))));
  return { success: true, affected };
}

module.exports = {
  initializeDatabase,
  getDatabase,
  getLocalDateTime,
  getLastSyncTime,
  setLastSyncTime,
  resetAutoIncrement,
  // reservations
  getAvailableStockWithReservations,
  createReservation,
  updateReservationQuantity,
  cancelReservation,
  completeReservationsForBill
};