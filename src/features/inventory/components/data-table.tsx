import * as React from 'react'
import {
  ColumnDef,
  // ColumnFiltersState,
  // SortingState,
  // VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination } from '../components/data-table-pagination'
import { DataTableToolbar } from '../components/data-table-toolbar'
import { usePersistentTableState } from '@/hooks/use-persistent-table-state'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData extends { product_unique_id?: string; inventory_unique_id?: string; category_name?: string | null; stock?: number; product_name?: string }, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState('')
  
  // Use persistent table state for column visibility, sorting, and filters
  const {
    columnVisibility,
    sorting,
    columnFilters,
    onColumnVisibilityChange,
    onSortingChange,
    onColumnFiltersChange,
  } = usePersistentTableState({
    tableId: 'inventory-table',
    defaultColumnVisibility: {
      // Show all columns by default
      select: false,
      category_name: true,
      inventory_unique_id: false,
      product_unique_id: false,
      product_name: true,
      stock: true,
      retail_price: true,
      wholesale_price: true,
      purchase_price: true,
      barcode: true,
      alertqty: true,
      branch_id: false,
      added_by:false,
      company_id: false,
      created_at: false,
      updated_at: true,
    },
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: onSortingChange,
    onColumnFiltersChange: onColumnFiltersChange,
    onColumnVisibilityChange: onColumnVisibilityChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: (row, _columnId, filterValue) => {
      // Search by product_name, product_unique_id, inventory_unique_id, or category_name
      const { product_name, product_unique_id, inventory_unique_id, category_name } = row.original as any
      const value = (filterValue || '').toLowerCase()
      return Boolean(
        (product_name && String(product_name).toLowerCase().includes(value)) ||
        (product_unique_id && String(product_unique_id).toLowerCase().includes(value)) ||
        (inventory_unique_id && String(inventory_unique_id).toLowerCase().includes(value)) ||
        (category_name && String(category_name).toLowerCase().includes(value))
      )
    },
    onGlobalFilterChange: setGlobalFilter,
  })


  return (
    <div className="space-y-2  h-[100%]">
      <DataTableToolbar table={table} />
      <div className="h-[85%] rounded-md border overflow-y-auto ">
        <div className="overflow-x-auto ">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="min-h-[80px]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}
