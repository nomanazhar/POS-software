import { useState } from 'react'
import { VisibilityState, SortingState, ColumnFiltersState, OnChangeFn } from '@tanstack/react-table'

interface UsePersistentTableStateOptions {
  tableId: string
  defaultColumnVisibility?: VisibilityState
  defaultSorting?: SortingState
  defaultColumnFilters?: ColumnFiltersState
}

export function usePersistentTableState({
  tableId,
  defaultColumnVisibility = {},
  defaultSorting = [],
  defaultColumnFilters = [],
}: UsePersistentTableStateOptions) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window === 'undefined') return defaultColumnVisibility
    
    try {
      const saved = localStorage.getItem(`table-${tableId}-column-visibility`)
      return saved ? JSON.parse(saved) : defaultColumnVisibility
    } catch {
      return defaultColumnVisibility
    }
  })

  const [sorting, setSorting] = useState<SortingState>(() => {
    if (typeof window === 'undefined') return defaultSorting
    
    try {
      const saved = localStorage.getItem(`table-${tableId}-sorting`)
      return saved ? JSON.parse(saved) : defaultSorting
    } catch {
      return defaultSorting
    }
  })

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() => {
    if (typeof window === 'undefined') return defaultColumnFilters
    
    try {
      const saved = localStorage.getItem(`table-${tableId}-column-filters`)
      return saved ? JSON.parse(saved) : defaultColumnFilters
    } catch {
      return defaultColumnFilters
    }
  })

  // Persist column visibility changes
  const handleColumnVisibilityChange: OnChangeFn<VisibilityState> = (updaterOrValue) => {
    const newVisibility = typeof updaterOrValue === 'function' 
      ? updaterOrValue(columnVisibility) 
      : updaterOrValue
    
    setColumnVisibility(newVisibility)
    try {
      localStorage.setItem(`table-${tableId}-column-visibility`, JSON.stringify(newVisibility))
    } catch (error) {
      console.warn('Failed to save column visibility to localStorage:', error)
    }
  }

  // Persist sorting changes
  const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
    const newSorting = typeof updaterOrValue === 'function' 
      ? updaterOrValue(sorting) 
      : updaterOrValue
    
    setSorting(newSorting)
    try {
      localStorage.setItem(`table-${tableId}-sorting`, JSON.stringify(newSorting))
    } catch (error) {
      console.warn('Failed to save sorting to localStorage:', error)
    }
  }

  // Persist column filters changes
  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updaterOrValue) => {
    const newFilters = typeof updaterOrValue === 'function' 
      ? updaterOrValue(columnFilters) 
      : updaterOrValue
    
    setColumnFilters(newFilters)
    try {
      localStorage.setItem(`table-${tableId}-column-filters`, JSON.stringify(newFilters))
    } catch (error) {
      console.warn('Failed to save column filters to localStorage:', error)
    }
  }

  return {
    columnVisibility,
    sorting,
    columnFilters,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
  }
} 