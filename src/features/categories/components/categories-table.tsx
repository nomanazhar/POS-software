import { useMemo } from 'react'
import { useCategoryContext } from '../context/category-context'
import { DataTable } from './data-table'
import { columns } from './columns'

export const CategoriesTable = () => {
  const { categories, isLoading, error } = useCategoryContext()

  const memoizedColumns = useMemo(() => columns, [])
  const memoizedData = useMemo(() => categories, [categories])

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading categories...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <p className="text-destructive mb-2">Error loading categories</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return <DataTable columns={memoizedColumns} data={memoizedData} />
} 