import { z } from 'zod'

export const accountSchema = z.object({
  account_id: z.number().int().positive().optional(),
  account_unique_id: z.string().optional(),
  fullname: z.string().min(1, 'Full name is required'),
  email: z.string().nullable().optional(),
  phone_no: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  second_address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  account_type: z.enum(['customer', 'supplier', 'user']),
  account_status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  account_limit: z.coerce.number().min(0).default(0),
  total_credit: z.coerce.number().min(0).default(0),
  total_debit: z.coerce.number().min(0).default(0),
  balance: z.coerce.number().default(0),
  loyality_points: z.coerce.number().int().min(0).default(0),
  discount_rate: z.coerce.number().min(0).max(100).default(0),
  remarks: z.string().nullable().optional(),
  added_by: z.string().default('admin'),
  company_id: z.string().default('1'),
  branch_id: z.string().default('1'),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export type Account = z.infer<typeof accountSchema>
export type NewAccount = z.infer<typeof accountSchema>
