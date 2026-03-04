import {
  IconCash,
  IconShield,
  IconUsersGroup,
  IconUserShield,
} from '@tabler/icons-react'
import { UserStatus } from './schema'

export const callTypes = new Map<UserStatus, string>([
  ['active', 'bg-teal-100/30 text-teal-900 dark:text-teal-200 border-teal-200'],
  ['inactive', 'bg-neutral-300/40 border-neutral-300'],
  ['invited', 'bg-sky-200/40 text-sky-900 dark:text-sky-100 border-sky-300'],
  [
    'suspended',
    'bg-destructive/10 dark:bg-destructive/50 text-destructive dark:text-primary border-destructive/10',
  ],
])

export const userTypes = [
  {
    label: 'Superadmin',
    value: 'superadmin',
    icon: IconShield,
  },
  {
    label: 'Admin',
    value: 'admin',
    icon: IconUserShield,
  },
  {
    label: 'Manager',
    value: 'manager',
    icon: IconUsersGroup,
  },
  {
    label: 'Cashier',
    value: 'cashier',
    icon: IconCash,
  },
] as const

export const companies = [
  { id: 'company-1', name: 'Acme Corp' },
  { id: 'company-2', name: 'Globex Inc' },
  { id: 'company-3', name: 'Umbrella LLC' },
];

export const branches = [
  { id: 'branch-1', name: 'Main Branch', companyId: 'company-1' },
  { id: 'branch-2', name: 'West Side', companyId: 'company-1' },
  { id: 'branch-3', name: 'Downtown', companyId: 'company-2' },
  { id: 'branch-4', name: 'Uptown', companyId: 'company-3' },
];
