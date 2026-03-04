import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// Legacy function - use useCurrency hook instead for dynamic currency
export function formatCurrencyLegacy(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

/**
 * Centralized ID generator for various entities.
 * @param context - e.g. 'USER', 'PROD', 'BILL', 'PURCHASE'
 * @param extra - Optional string for more context (e.g. company/branch/user)
 */
export function generateId(context: string, extra?: string): string {
  const timestamp = Date.now();
  let base = context.toUpperCase();
  if (extra) base += `-${extra}`;
  return `${base}-${timestamp}`;
}

/**
 * Generic search utility for filtering arrays of objects by multiple fields.
 * @param items - Array of objects to search
 * @param query - Search string
 * @param fields - Fields to search in each object
 */
export function searchByFields<T>(items: T[], query: string, fields: (keyof T)[]): T[] {
  if (!query || query.length < 2) return [];
  const lower = query.toLowerCase();
  return items.filter(item =>
    fields.some(field =>
      String(item[field] ?? '').toLowerCase().includes(lower)
    )
  );
}
