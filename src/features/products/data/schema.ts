import { z } from 'zod'

// We're keeping a simple non-relational schema here.
// IRL, you will have a schema for your data models.
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  label: z.string(),
  priority: z.string(),
})

export type Task = z.infer<typeof taskSchema>

// Updated to match backend products table schema with more flexible validation
export const productSchema = z.object({
  product_id: z.number().int().min(0).optional().default(0), // Changed from positive() to min(0)
  product_unique_id: z.string().optional().default(''), // Removed min(1) requirement
  product_name: z.string().optional().default(''), // Removed min(1) requirement
  barcode: z.string().optional().default(''), // Removed min(1) requirement
  brand: z.string().optional().default(''), // Removed min(1) requirement
  category_unique_id: z.string().optional().default(''), // Removed min(1) requirement
  retail_price: z.number().min(0, 'Retail price cannot be negative').optional().default(0),
  wholesale_price: z.number().min(0, 'Wholesale price cannot be negative').optional().default(0),
  purchase_price: z.number().min(0, 'Purchase price cannot be negative').optional().default(0),
  alertqty: z.number().int().min(0, 'Alert quantity cannot be negative').optional().default(0),
  tax: z.number().min(0, 'Tax cannot be negative').optional().default(0),
  discount: z.number().min(0, 'Discount cannot be negative').optional().default(0),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  returnable: z.number().int().min(0).max(1).optional().default(0),
  added_by: z.string().optional().default('admin'), // Removed min(1) requirement
  company_id: z.string().optional().default('1'), // Removed min(1) requirement
  branch_id: z.string().optional().default('1'), // Removed min(1) requirement
  created_at: z.string().optional(), // Removed datetime() requirement
  updated_at: z.string().optional(), // Removed datetime() requirement
})

export type Product = z.infer<typeof productSchema> & { _modifiedFields?: (keyof Product)[] }

export const newProductSchema = productSchema.omit({
  product_id: true,
  created_at: true,
  updated_at: true,
})

export type NewProduct = z.infer<typeof newProductSchema>
