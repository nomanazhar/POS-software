# Database Schema Documentation

## Overview
This document contains the complete database schema for the ShadCN Admin application. All tables use SQLite-compatible data types and include proper constraints, indexes, and relationships.

## Database Tables

### 1. Categories Table
```sql
CREATE TABLE categories (
    categoryId TEXT PRIMARY KEY,
    unique_id TEXT,
    categoryName TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
    icon TEXT,
    added_By TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Validation Schema (Zod):**
```typescript
const categorySchema = z.object({
    categoryId: z.union([z.string(), z.number()]),
    unique_id: z.string().min(1, 'Unique ID is required'),
    categoryName: z.string().min(1, 'Category name is required'),
    description: z.string().optional(),
    status: z.enum(['active', 'inactive']),
    icon: z.string().optional().nullable(),
    added_By: z.string().min(1, 'Added by is required'),
    company_id: z.string().min(1, 'Company is required'),
    branch_id: z.string().min(1, 'Branch is required'),
    created_at: z.string().default(new Date().toISOString()),
    updated_at: z.string().default(new Date().toISOString()),
});
```

### 2. Products Table
```sql
CREATE TABLE products (
    productId INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_id TEXT,
    productName TEXT NOT NULL,
    barcode TEXT NOT NULL UNIQUE,
    price REAL NOT NULL CHECK (price >= 0),
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    wholesaleRate REAL NOT NULL CHECK (wholesaleRate >= 0),
    alertQuantity INTEGER NOT NULL CHECK (alertQuantity >= 0),
    tax REAL DEFAULT 0 CHECK (tax >= 0),
    discount REAL DEFAULT 0 CHECK (discount >= 0),
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive')),
    returnable INTEGER DEFAULT 0 CHECK (returnable IN (0, 1)),
    added_By TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Validation Schema (Zod):**
```typescript
const productSchema = z.object({
    productId: z.string().optional(),
    unique_id: z.string().min(1, 'Unique ID is required'),
    productName: z.string().min(1, 'Product name is required'),
    barcode: z.string().min(1, 'Barcode is required'),
    price: z.number().min(0, 'Price cannot be negative'),
    brand: z.string().optional().default(''),
    category: z.string().optional().default(''),
    wholesaleRate: z.number().min(0, 'Wholesale rate cannot be negative'),
    alertQuantity: z.number().int().min(0, 'Alert quantity cannot be negative'),
    tax: z.number().min(0, 'Tax cannot be negative').optional().default(0),
    discount: z.number().min(0, 'Discount cannot be negative').optional().default(0),
    status: z.enum(['active', 'inactive']).default('active'),
    returnable: z.boolean().default(false),
    added_By: z.string().min(1, 'Added by is required'),
    company_id: z.string().min(1, 'Company is required'),
    branch_id: z.string().min(1, 'Branch is required'),
    created_at: z.string().default(new Date().toISOString()),
    updated_at: z.string().default(new Date().toISOString()),
});
```

### 3. Customers Table
```sql
CREATE TABLE customers (
    customerId TEXT PRIMARY KEY,
    unique_id TEXT,
    fullName TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    email TEXT NOT NULL UNIQUE,
    phoneNumber TEXT,
    address TEXT,
    secondAddress TEXT,
    city TEXT NOT NULL,
    customerType TEXT NOT NULL CHECK (customerType IN ('regular', 'wholesale', 'vip')),
    totalAmount REAL NOT NULL DEFAULT 0 CHECK (totalAmount >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    loyaltyPoints INTEGER NOT NULL DEFAULT 0 CHECK (loyaltyPoints >= 0),
    discountRate REAL NOT NULL DEFAULT 0 CHECK (discountRate >= 0),
    remarks TEXT,
    dueBalance REAL NOT NULL DEFAULT 0 CHECK (dueBalance >= 0),
    creditLimit REAL NOT NULL DEFAULT 0 CHECK (creditLimit >= 0),
    added_By TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Validation Schema (Zod):**
```typescript
const customerSchema = z.object({
    customerId: z.string().min(1, 'Customer ID is required'),
    unique_id: z.string().min(1, 'Unique ID is required'),
    fullName: z.string().min(1, 'Full name is required'),
    gender: z.enum(['male', 'female', 'other']),
    email: z.string().email('Invalid email format'),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    secondAddress: z.string().optional(),
    city: z.string(),
    customerType: z.enum(['regular', 'wholesale', 'vip']),
    totalAmount: z.number().min(0, 'Total amount cannot be negative'),
    status: z.enum(['active', 'inactive', 'suspended']),
    loyaltyPoints: z.number().int().min(0, 'Loyalty points cannot be negative'),
    discountRate: z.number().min(0, 'Discount rate cannot be negative').default(0),
    remarks: z.string().optional(),
    dueBalance: z.number().min(0, 'Due balance cannot be negative'),
    creditLimit: z.number().min(0, 'Credit limit cannot be negative'),
    added_By: z.string().min(1, 'Added by is required'),
    company_id: z.string().min(1, 'Company is required'),
    branch_id: z.string().min(1, 'Branch is required'),
    created_at: z.string().default(new Date().toISOString()),
    updated_at: z.string().default(new Date().toISOString()),
});
```

### 4. Suppliers Table
```sql
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    unique_id TEXT,
    fullname TEXT NOT NULL,
    phoneno TEXT NOT NULL,
    companyname TEXT NOT NULL,
    city TEXT NOT NULL,
    totalbill REAL NOT NULL DEFAULT 0 CHECK (totalbill >= 0),
    balance REAL NOT NULL DEFAULT 0 CHECK (balance >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    creditLimit REAL NOT NULL DEFAULT 0 CHECK (creditLimit >= 0),
    registeredDate TEXT NOT NULL,
    comment TEXT,
    added_By TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Validation Schema (Zod):**
```typescript
const supplierSchema = z.object({
    id: z.string().min(1, 'ID is required'),
    unique_id: z.string().min(1, 'Unique ID is required'),
    fullname: z.string().min(1, 'Full name is required'),
    phoneno: z.string().min(1, 'Phone number is required'),
    companyname: z.string().min(1, 'Company name is required'),
    city: z.string().min(1, 'City is required'),
    totalbill: z.number().min(0, 'Total bill cannot be negative'),
    balance: z.number().min(0, 'Balance cannot be negative'),
    status: z.enum(['active', 'inactive', 'suspended']),
    creditLimit: z.number().min(0, 'Credit limit cannot be negative'),
    registeredDate: z.string().min(1, 'Registered date is required'),
    comment: z.string().optional().nullable(),
    added_By: z.string().min(1, 'Added by is required'),
    company_id: z.string().min(1, 'Company is required'),
    branch_id: z.string().min(1, 'Branch is required'),
    created_at: z.string().default(new Date().toISOString()),
    updated_at: z.string().default(new Date().toISOString()),
});
```

### 5. Bills Table
```sql
CREATE TABLE bills (
    billId TEXT PRIMARY KEY,
    customerId TEXT,
    customerName TEXT,
    cashierName TEXT NOT NULL,
    companyname TEXT,
    billNumber TEXT NOT NULL UNIQUE,
    billDate TEXT NOT NULL,
    items TEXT, -- JSON string of items
    taxAmount REAL DEFAULT 0 CHECK (taxAmount >= 0),
    discountAmount REAL DEFAULT 0 CHECK (discountAmount >= 0),
    totalAmount REAL NOT NULL CHECK (totalAmount >= 0),
    paymentStatus TEXT CHECK (paymentStatus IN ('paid', 'pending', 'cancelled', 'overdue')),
    paymentMethod TEXT CHECK (paymentMethod IN ('cash', 'card', 'bank_transfer', 'digital_wallet', 'other')),
    paymentDate TEXT,
    phonenumber TEXT,
    itemCount INTEGER CHECK (itemCount >= 0),
    itemQty INTEGER CHECK (itemQty >= 0),
    saleType TEXT CHECK (saleType IN ('retail', 'wholesale')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    isReturned INTEGER DEFAULT 0 CHECK (isReturned IN (0, 1)),
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    added_By TEXT NOT NULL,
    FOREIGN KEY (customerId) REFERENCES customers(customerId)
);
```

### 6. Bill Items Table
```sql
CREATE TABLE bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    billId TEXT NOT NULL,
    productId TEXT NOT NULL,
    unique_id TEXT,
    productName TEXT NOT NULL,
    barcode TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unitPrice REAL NOT NULL CHECK (unitPrice >= 0),
    totalPrice REAL NOT NULL CHECK (totalPrice >= 0),
    discount REAL DEFAULT 0 CHECK (discount >= 0),
    tax REAL DEFAULT 0 CHECK (tax >= 0),
    isReturned INTEGER DEFAULT 0 CHECK (isReturned IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    addedBy TEXT NOT NULL,
    companyId TEXT NOT NULL,
    branchId TEXT NOT NULL,
    FOREIGN KEY (billId) REFERENCES bills(billId) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(productId)
);
```

**Validation Schema (Zod):**
```typescript
const billLineItemSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    unique_id: z.string().min(1, 'Unique ID is required'),
    productName: z.string().min(1, 'Product name is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().min(0, 'Unit price cannot be negative'),
    totalPrice: z.number().min(0, 'Total price cannot be negative'),
    discount: z.number().min(0, 'Discount cannot be negative').default(0),
    tax: z.number().min(0, 'Tax cannot be negative').default(0),
});

const billSchema = z.object({
    bill_id: z.string().min(1, 'Bill ID is required'),
    customer_id: z.string().optional(),
    customer_name: z.string().optional(),
    cashier_name: z.string().min(1, 'Cashier name is required'),
    companyname: z.string().optional(),
    bill_number: z.string().min(1, 'Bill number is required'),
    bill_date: z.string().min(1, 'Bill date is required'),
    items: z.array(billLineItemSchema).min(1, 'At least one item is required'),
    tax_amount: z.number().min(0, 'Tax amount cannot be negative').default(0).optional(),
    discount_amount: z.number().min(0, 'Discount amount cannot be negative').default(0).optional(),
    total_amount: z.number().min(0, 'Total amount cannot be negative'),
    payment_status: z.enum(['paid', 'pending', 'cancelled', 'overdue']).default('paid'),
    payment_method: z.enum(['cash', 'card', 'bank_transfer', 'digital_wallet', 'other']).nullish(),
    payment_date: z.string().optional(),
    phonenumber: z.string().optional(),
    item_count: z.number().int().min(0),
    item_qty: z.number().int().min(0),
    sale_type: z.enum(['retail', 'wholesale']),
    created_at: z.string().default(new Date().toISOString()),
    updated_at: z.string().default(new Date().toISOString()),
    is_returned: z.number().default(0),
    added_by: z.string().min(1, 'Added by is required'),
    company_id: z.string().min(1, 'Company is required'),
    branch_id: z.string().min(1, 'Branch is required'),
});
```

### 7. Inventory Table
```sql
CREATE TABLE inventory (
    productId INTEGER PRIMARY KEY AUTOINCREMENT,
    unique_id TEXT,
    productName TEXT NOT NULL,
    barcode TEXT NOT NULL UNIQUE,
    stock INTEGER NOT NULL CHECK (stock >= 0),
    price REAL NOT NULL CHECK (price >= 0),
    wholesalePrice REAL NOT NULL CHECK (wholesalePrice >= 0),
    purchaseprice REAL NOT NULL DEFAULT 0 CHECK (purchaseprice >= 0),
    supplier TEXT,
    alertQuantity INTEGER NOT NULL CHECK (alertQuantity >= 0),
    category TEXT,
    added_By TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    discount REAL DEFAULT 0 CHECK (discount >= 0),
    tax REAL DEFAULT 0 CHECK (tax >= 0),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Validation Schema (Zod):**
```typescript
const inventorySchema = z.object({
    productId: z.string().optional(),
    unique_id: z.string().min(1, 'Unique ID is required'),
    productName: z.string().min(1, 'Product name is required'),
    barcode: z.string().min(1, 'Barcode is required'),
    stock: z.number().int().min(0, 'Stock cannot be negative'),
    price: z.number().min(0, 'Price cannot be negative'),
    wholesalePrice: z.number().min(0, 'Wholesale price cannot be negative'),
    purchaseprice: z.number().min(0, 'Purchase price cannot be negative'),
    supplier: z.string().optional().default(''),
    alertQuantity: z.number().int().min(0, 'Alert quantity cannot be negative'),
    category: z.string().optional().default(''),
    discount: z.number().min(0, 'Discount cannot be negative').default(0),
    tax: z.number().min(0, 'Tax cannot be negative').default(0),
    added_By: z.string().min(1, 'Added by is required'),
    company_id: z.string().min(1, 'Company is required'),
    branch_id: z.string().min(1, 'Branch is required'),
    created_at: z.string().default(new Date().toISOString()),
    updated_at: z.string().default(new Date().toISOString()),
});
```

### 8. Purchases Table
```sql
CREATE TABLE purchases (
    purchaseId TEXT PRIMARY KEY,
    supplierName TEXT NOT NULL,
    suppliercontact TEXT,
    supplier_unique_id TEXT,
    companyname TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    added_By TEXT NOT NULL,
    billNo TEXT,
    receivedBy TEXT,
    dateTime TEXT NOT NULL,
    totalAmount REAL NOT NULL DEFAULT 0 CHECK (totalAmount >= 0),
    paidAmount REAL DEFAULT 0 CHECK (paidAmount >= 0),
    balance REAL DEFAULT 0 CHECK (balance >= 0),
    profitMargin REAL DEFAULT 0 CHECK (profitMargin >= 0),
    itemCount INTEGER DEFAULT 0 CHECK (itemCount >= 0),
    itemsQty INTEGER DEFAULT 0 CHECK (itemsQty >= 0),
    isReturned INTEGER DEFAULT 0 CHECK (isReturned IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_unique_id) REFERENCES suppliers(unique_id)
);
```

### 9. Purchase Items Table
```sql
CREATE TABLE purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchaseId TEXT NOT NULL,
    productId TEXT NOT NULL,
    unique_id TEXT,
    productName TEXT NOT NULL,
    barcode TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price REAL NOT NULL CHECK (price >= 0),
    wholesaleRate REAL NOT NULL CHECK (wholesaleRate >= 0),
    purchaseprice REAL NOT NULL DEFAULT 0 CHECK (purchaseprice >= 0),
    category TEXT NOT NULL,
    isReturned INTEGER DEFAULT 0 CHECK (isReturned IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    added_By TEXT NOT NULL,
    company_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    FOREIGN KEY (purchaseId) REFERENCES purchases(purchaseId) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(productId)
);
```

**Validation Schema (Zod):**
```typescript
const purchaseLineItemSchema = z.object({
    productId: z.string().min(1, 'Product ID is required'),
    unique_id: z.string().min(1, 'Unique ID is required'),
    productName: z.string().min(1, 'Product name is required'),
    barcode: z.string().min(1, 'Barcode is required'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    price: z.number().min(0, 'Price cannot be negative'),
    wholesaleRate: z.number().min(0, 'Wholesale rate cannot be negative'),
    purchaseprice: z.number().min(0, 'Purchase price cannot be negative'),
    category: z.string().optional(),
});

const purchaseSchema = z.object({
    purchaseId: z.string(),
    supplierName: z.string(),
    suppliercontact: z.string().optional(),
    supplier_unique_id: z.string().optional(),
    companyname: z.string().min(1, 'Company is required'),
    billNo: z.string().optional(),
    receivedBy: z.string(),
    dateTime: z.string(),
    lineItems: z.array(z.any()),
    totalAmount: z.number(),
    paidAmount: z.number().optional(),
    balance: z.number().optional(),
    profitMargin: z.number().optional(),
    itemCount: z.number().optional(),
    itemsQty: z.number().optional(),
    isReturned: z.boolean().default(false),
    added_By: z.string().min(1, 'Added by is required'),
    company_id: z.string().min(1, 'Company is required'),
    branch_id: z.string().min(1, 'Branch is required'),
    created_at: z.string().default(new Date().toISOString()),
    updated_at: z.string().default(new Date().toISOString()),
});
```

### 10. Sales Table
```sql
CREATE TABLE sales (
    id TEXT PRIMARY KEY,
    subtotal REAL NOT NULL CHECK (subtotal >= 0),
    tax REAL NOT NULL CHECK (tax >= 0),
    total REAL NOT NULL CHECK (total >= 0),
    paymentMethod TEXT NOT NULL CHECK (paymentMethod IN ('cash', 'card', 'mobile')),
    customerName TEXT,
    customerPhone TEXT,
    createdAt TEXT NOT NULL,
    isWholesale INTEGER DEFAULT 0 CHECK (isWholesale IN (0, 1))
);
```

### 11. Sales Items Table
```sql
CREATE TABLE sales_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    saleId TEXT NOT NULL,
    productId TEXT NOT NULL,
    productName TEXT NOT NULL,
    barcode TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    wholesalePrice REAL NOT NULL CHECK (wholesalePrice >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    stock INTEGER NOT NULL CHECK (stock >= 0),
    isWholesale INTEGER DEFAULT 0 CHECK (isWholesale IN (0, 1)),
    FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (productId) REFERENCES products(productId)
);
```

**Validation Schema (Zod):**
```typescript
const cartItemSchema = z.object({
    productId: z.string(),
    productName: z.string(),
    barcode: z.string(),
    price: z.number(),
    wholesalePrice: z.number(),
    quantity: z.number().int().min(1),
    stock: z.number().int().min(0),
    isWholesale: z.boolean().default(false),
    discount: z.number().default(0),
    tax: z.number().default(0),
});

const saleTransactionSchema = z.object({
    id: z.string(),
    items: z.array(cartItemSchema),
    subtotal: z.number(),
    tax: z.number(),
    total: z.number(),
    paymentMethod: z.enum(['cash', 'card', 'mobile']),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    createdAt: z.date(),
    isWholesale: z.boolean().default(false),
});
```

### 12. Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyId TEXT,
    branchId TEXT,
    addedBy TEXT,
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    phoneNumber TEXT,
    plan TEXT,
    planDuration TEXT,
    planStartedAt TEXT,
    planEndedAt TEXT,
    status TEXT NOT NULL CHECK (status IN ('active', 'invited', 'archived')),
    userDetails TEXT,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'cashier', 'manager')),
    password TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Validation Schema (Zod):**
```typescript
const userRoleSchema = z.union([
    z.literal('superadmin'),
    z.literal('admin'),
    z.literal('cashier'),
    z.literal('manager'),
]);

const userSchema = z.object({
    id: z.string(),
    companyId: z.string().nullable().optional(),
    branchId: z.string().nullable().optional(),
    addedBy: z.string().nullable().optional(),
    name: z.string(),
    username: z.string().nullable().optional(),
    email: z.string(),
    phoneNumber: z.string().nullable().optional(),
    plan: z.string().nullable().optional(),
    planDuration: z.string().nullable().optional(),
    planStartedAt: z.string().nullable().optional(),
    planEndedAt: z.string().nullable().optional(),
    status: z.string(),
    userDetails: z.string().nullable().optional(),
    role: userRoleSchema,
    password: z.string().min(5, 'password must be 5 character'),
    created_at: z.string().default(new Date().toISOString()),
});
```

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_company_branch ON products(company_id, branch_id);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phoneNumber);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_company_branch ON customers(company_id, branch_id);

CREATE INDEX idx_suppliers_phone ON suppliers(phoneno);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_company_branch ON suppliers(company_id, branch_id);

CREATE INDEX idx_bills_billNumber ON bills(billNumber);
CREATE INDEX idx_bills_customerId ON bills(customerId);
CREATE INDEX idx_bills_date ON bills(billDate);
CREATE INDEX idx_bills_status ON bills(paymentStatus);
CREATE INDEX idx_bills_company_branch ON bills(company_id, branch_id);

CREATE INDEX idx_bill_items_billId ON bill_items(billId);
CREATE INDEX idx_bill_items_productId ON bill_items(productId);

CREATE INDEX idx_inventory_barcode ON inventory(barcode);
CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_company_branch ON inventory(company_id, branch_id);

CREATE INDEX idx_purchases_supplier ON purchases(supplierName);
CREATE INDEX idx_purchases_date ON purchases(dateTime);
CREATE INDEX idx_purchases_company_branch ON purchases(company_id, branch_id);

CREATE INDEX idx_purchase_items_purchaseId ON purchase_items(purchaseId);
CREATE INDEX idx_purchase_items_productId ON purchase_items(productId);

CREATE INDEX idx_sales_date ON sales(createdAt);
CREATE INDEX idx_sales_customer ON sales(customerName);

CREATE INDEX idx_sales_items_saleId ON sales_items(saleId);
CREATE INDEX idx_sales_items_productId ON sales_items(productId);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

## Data Types Mapping

| Frontend Type | Database Type | Description |
|---------------|---------------|-------------|
| `string` | `TEXT` | Text data |
| `number` | `REAL` | Decimal numbers |
| `integer` | `INTEGER` | Whole numbers |
| `boolean` | `INTEGER` | 0 = false, 1 = true |
| `date` | `TEXT` | ISO 8601 format |
| `enum` | `TEXT` | With CHECK constraints |

## Important Notes

1. **Timestamps**: All tables use `created_at` and `updated_at` fields in ISO 8601 format
2. **Unique IDs**: Most tables have a `unique_id` field for cross-system identification
3. **Company/Branch**: All business data is scoped to `company_id` and `branch_id`
4. **Soft Deletes**: Use `status` field instead of hard deletes
5. **Foreign Keys**: Proper relationships are maintained with CASCADE deletes where appropriate
6. **Validation**: All numeric fields have CHECK constraints for non-negative values
7. **Enums**: Status and type fields use CHECK constraints for valid values

## API Endpoints Structure

For consistent API design, use these patterns:

```
GET    /api/{resource}           # List all (with pagination)
GET    /api/{resource}/:id       # Get single item
POST   /api/{resource}           # Create new item
PUT    /api/{resource}/:id       # Update item
DELETE /api/{resource}/:id       # Delete item (soft delete)
```

Resources: `categories`, `products`, `customers`, `suppliers`, `bills`, `inventory`, `purchases`, `sales`, `users`

## Sync Strategy

1. **Incremental Sync**: Use `updated_at` timestamps for delta syncs
2. **Conflict Resolution**: Use `unique_id` for conflict detection
3. **Batch Operations**: Support bulk create/update operations
4. **Offline Support**: Queue operations when offline, sync when online
5. **Data Integrity**: Validate all data against Zod schemas before storage 