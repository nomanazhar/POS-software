import { Cross2Icon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableViewOptions } from './data-table-view-options'
// import { DataTableFacetedFilter } from './data-table-faceted-filter'
import React from 'react'
import { useDebounce } from '@/hooks/use-debounce'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || table.getState().globalFilter
  const [search, setSearch] = React.useState(table.getState().globalFilter || '')
  const debouncedSearch = useDebounce(search, 300)

  React.useEffect(() => {
    table.setGlobalFilter(debouncedSearch)
  }, [debouncedSearch, table])

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value)
  }

  return (
    <div className="h-[6%] flex items-center justify-between ">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Search purchases by ID, bill number, supplier, received by, or product names..."
          value={search}
          onChange={handleSearch}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter('')
              setSearch('')
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
} 