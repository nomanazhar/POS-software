import { z } from 'zod'

export const purchaseLineItemSchema = z.object({
  product_unique_id: z.string().min(1, 'Product unique ID is required'),
  product_name: z.string().min(1, 'Product name is required'),
  barcode: z.string().min(1, 'Barcode is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  retail_price: z.number().min(0, 'Retail price cannot be negative'),
  wholesale_price: z.number().min(0, 'Wholesale price cannot be negative').optional(),
  purchase_price: z.number().min(0, 'Purchase price cannot be negative'),
  brand: z.string().optional(),
})

export type PurchaseLineItem = z.infer<typeof purchaseLineItemSchema>


// Updated to match both old purchases table and new purchase_orders table
export const purchaseSchema = z.object({
  purchase_id: z.number().optional(), // Database primary key
  purchase_unique_id: z.string().min(1, 'Purchase unique ID is required'),
  account_unique_id: z.string().min(1, 'Account unique ID is required'),
  purchase_billno: z.string().min(1, 'Purchase bill number is required'),
  po_no: z.string().optional(),
  received_by: z.string().optional(),
  total_amount: z.number().min(0, 'Total amount cannot be negative'),
  paid_amount: z.number().min(0, 'Paid amount cannot be negative').default(0),
  balance: z.number().default(0),
  profit_margin: z.number().default(0),
  item_count: z.number().int().min(0).default(0),
  isreturned: z.number().int().min(0).max(1).default(0),
  payment_method: z.enum(['cash', 'card', 'ledger']).default('cash'), // Payment method for the purchase
  purchase_items: z.array(purchaseLineItemSchema),
  original_purchase_items: z.array(purchaseLineItemSchema).optional(), // Original quantities before any returns
  added_by: z.string().min(1, 'Added by is required'),
  company_id: z.string().min(1, 'Company is required'),
  branch_id: z.string().min(1, 'Branch is required'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  originalPurchaseId: z.string().optional(), // For return purchases to track original purchase
  original_purchase_billno: z.string().optional(), // Database field for original purchase bill number
})

export type Purchase = z.infer<typeof purchaseSchema> 