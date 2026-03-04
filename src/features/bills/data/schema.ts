import { z } from 'zod'

// Product line item schema for bills (matches what IPC handler returns)
export const billLineItemSchema = z.object({
  product_unique_id: z.string().default(''),
  product_name: z.string().optional().default(''),
  item_qty: z.number().min(0, 'Quantity cannot be negative').optional().default(0),
  retail_price: z.number().min(0, 'Unit price cannot be negative').optional().default(0),
  total_price: z.number().min(0, 'Total price cannot be negative').optional().default(0)
})

// Bill schema that matches what the bills:getAll IPC handler actually returns
// The IPC handler maps bill_orders table to this format for backward compatibility
export const billSchema = z.object({
  // Fields returned by bills:getAll IPC handler (old format for backward compatibility)
  bill_id: z.union([z.string(), z.number()]).optional().default(''),
  bill_unique_id: z.string().optional().default(''), // Made optional to handle missing data
  billno: z.string().optional().default(''),
  account_unique_id: z.string().optional().default(''),
  total_amount: z.number().min(0).optional().default(0),
  paid_amount: z.number().min(0).optional().default(0),
  balance: z.number().optional().default(0),
  payment_method: z.enum(['cash', 'card', 'ledger']).nullable().optional(),
  payment_status: z.enum(['paid', 'pending', 'cancelled']).optional().default('pending'),
  sale_type: z.enum(['retail', 'wholesale']).optional().default('retail'),
  isreturned: z.union([z.boolean(), z.number()]).transform(val => typeof val === 'boolean' ? (val ? 1 : 0) : val).optional().default(0),
  total_tax: z.number().min(0).optional().default(0),
  total_discount: z.number().min(0).optional().default(0),
  extracharges: z.number().min(0).optional().default(0),
  item_count: z.number().int().min(0).optional().default(0),
  bill_items: z.array(billLineItemSchema),
  original_bill_billno: z.string().optional(), // Track original bill number for returns
  added_by: z.string().min(1, 'Added by is required'),
  company_id: z.string().min(1, 'Company is required'),
  branch_id: z.string().min(1, 'Branch is required'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

// For creating new bills (omits auto-generated fields)
export const newBillSchema = billSchema.omit({
  bill_id: true,
  created_at: true,
  updated_at: true,
})

export type BillLineItem = z.infer<typeof billLineItemSchema>
export type Bill = z.infer<typeof billSchema>
export type NewBill = z.infer<typeof newBillSchema> 