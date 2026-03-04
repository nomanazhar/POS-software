import { Purchase } from './schema'

export const purchases: Purchase[] = [
  {
    purchase_id: 1,
    purchase_unique_id: '1_1_pur_001',
    account_unique_id: '1_1_supp_001',
    purchase_billno: 'BILL-1001',
    received_by: 'Alice',
    total_amount: 799.50,
    paid_amount: 799.50,
    balance: 0.00,
    profit_margin: 10.5,
    item_count: 3,
    isreturned: 0,
    payment_method: 'cash',
    purchase_items: [
      {
        product_unique_id: 'P001',
        product_name: 'iPhone 14',
        barcode: '1234567890123',
        quantity: 10,
        retail_price: 850.00,
        wholesale_price: 800.00,
        purchase_price: 800.00,
      }
    ],
    added_by: 'admin',
    company_id: '1',
    branch_id: '1',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  },
  {
    purchase_id: 2,
    purchase_unique_id: '1_1_pur_002',
    account_unique_id: '1_1_supp_002',
    purchase_billno: 'BILL-1002',
    received_by: 'Bob',
    total_amount: 850.00,
    paid_amount: 800.00,
    balance: 50.00,
    profit_margin: 12.0,
    item_count: 4,
    isreturned: 0,
    payment_method: 'cash',
    purchase_items: [
      {
        product_unique_id: 'P001',
        product_name: 'iPhone 14',
        barcode: '1234567890123',
        quantity: 10,
        retail_price: 850.00,
        wholesale_price: 800.00,
        purchase_price: 800.00,
      }
    ],
    added_by: 'admin',
    company_id: '1',
    branch_id: '1',
    created_at: '2024-01-16T11:00:00Z',
    updated_at: '2024-01-16T11:00:00Z',
  },
] 