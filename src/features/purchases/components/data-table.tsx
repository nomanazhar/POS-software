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
import { DataTablePagination } from './data-table-pagination'
import { DataTableToolbar } from './data-table-toolbar'
import { usePersistentTableState } from '@/hooks/use-persistent-table-state'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData, TValue>({
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
    tableId: 'purchases-table',
    defaultColumnVisibility: {
      // Show all columns by default
      select: false,
      purchase_id: true,
      created_at: true,
      po_no: true,
      purchase_billno: true,
      purchase_unique_id: false,
      account_unique_id: false,
      received_by: false,
      total_amount: true,
      paid_amount: true,
      balance: false,
      profit_margin: true,
      item_count: true,
      purchase_items: true,
      isreturned: true,
      added_by: false,
      company_id: false,
      branch_id: false,
      updated_at: false,
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
      pagination: { pageSize: 10, pageIndex: 0 }, // Default page size
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: onSortingChange,
    onColumnFiltersChange: onColumnFiltersChange,
    onColumnVisibilityChange: onColumnVisibilityChange,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      // Search by purchase_unique_id, purchase_billno, account_unique_id, received_by, and product names in purchase_items
      const { 
        purchase_unique_id, 
        purchase_billno, 
        account_unique_id, 
        received_by,
        purchase_items 
      } = row.original as any
      const value = (filterValue || '').toLowerCase()
      
      // Check main fields
      const mainFieldsMatch = Boolean(
        (purchase_unique_id && String(purchase_unique_id).toLowerCase().includes(value)) ||
        (purchase_billno && String(purchase_billno).toLowerCase().includes(value)) ||
        (account_unique_id && String(account_unique_id).toLowerCase().includes(value)) ||
        (received_by && String(received_by).toLowerCase().includes(value))
      )
      
      // Check product names in purchase_items
      const productNamesMatch = purchase_items && Array.isArray(purchase_items) && 
        purchase_items.some((item: any) => 
          item.product_name && String(item.product_name).toLowerCase().includes(value)
        )
      
      return mainFieldsMatch || productNamesMatch
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  // const rows = table.getRowModel().rows

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