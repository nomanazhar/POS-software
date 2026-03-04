import { z } from 'zod'

const userStatusSchema = z.union([
  z.literal('active'),
  z.literal('inactive'),
  z.literal('invited'),
  z.literal('suspended'),
])
export type UserStatus = z.infer<typeof userStatusSchema>

const userRoleSchema = z.union([
  z.literal('superadmin'),
  z.literal('admin'),
  z.literal('cashier'),
  z.literal('manager'),
])

export const userSchema = z.object({
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
  password: z.string().min(5, 'password must be 5 chracter').optional(),
  created_at: z.string().default(new Date().toISOString()),
})
export type User = z.infer<typeof userSchema>

export const userListSchema = z.array(userSchema)

export const companySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const branchSchema = z.object({
  id: z.string(),
  name: z.string(),
  companyId: z.string(),
});
