import { z } from 'zod'

export const billItemSchema = z.object({
  product_id: z.number().int().optional(),
  product_unique_id: z.string().min(1),
  product_name: z.string().min(1),
  barcode: z.string().min(1),
  quantity: z.number().int().min(1),
  unit_price: z.number().min(0),
  total_price: z.number().min(0),
  discount: z.number().default(0),
  tax: z.number().default(0),
  is_returned: z.number().int().min(0).max(1).default(0),
  retail_price: z.number().min(0).default(0), // Added to match LocalBill interface
  item_qty: z.number().int().min(0).default(0), 
  originalSoldQuantity: z.number().int().min(0).optional(), // For return sales
  added_by: z.string().optional(),
  company_id: z.string().optional(),
  branch_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const billOrderSchema = z.object({
  bill_id: z.number().int().positive().optional(),
  bill_unique_id: z.string().min(1),
  billno: z.string().min(1),
  account_unique_id: z.string().min(1),
  total_amount: z.number().min(0),
  paid_amount: z.number().default(0),
  balance: z.number().default(0),
  payment_method: z.string().optional(),
  payment_status: z.string().default('pending'),
  sale_type: z.string().default('retail'),
  is_returned: z.number().int().min(0).max(1).default(0),
  total_tax: z.number().default(0),
  total_discount: z.number().default(0),
  extracharges: z.number().default(0), // Added to match database schema
  item_count: z.number().int().min(0).default(0),
  bill_items: z.string(), // Stored as JSON string in DB
  original_bill_billno: z.string().optional(), // Track original bill number for returns
  added_by: z.string().optional(),
  company_id: z.string().optional(),
  branch_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type BillItem = z.infer<typeof billItemSchema>
export type BillOrder = z.infer<typeof billOrderSchema>

export const newBillOrderSchema = billOrderSchema.omit({
  bill_id: true,
  created_at: true,
  updated_at: true,
})

export type NewBillOrder = z.infer<typeof newBillOrderSchema> 