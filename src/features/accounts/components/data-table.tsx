import * as React from 'react'
import {
  ColumnDef,
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

export function DataTable<TData extends { 
  account_id?: number; 
  account_unique_id?: string; 
  fullname?: string; 
  email?: string; 
  phone_no?: string; 
  address?: string; 
  city?: string; 
  account_type?: string; 
  account_status?: string;
}, TValue>({
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
    tableId: 'accounts-table',
    defaultColumnVisibility: {
      // Show all columns by default
      select: false,
      account_id: true,
      account_type: true,
      fullname: true,
      contact: true,
      address: true,
      account_limit: false,
      total_credit: true,
      total_debit: true,
      balance: true,
      loyality_points: false,
      discount_rate: true,
      account_status: true,
      created_at: false,
      actions: true,
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
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: (row, _columnId, filterValue) => {
      // Search by fullname, email, phone_no, address, city, or account_unique_id
      const { 
        fullname, 
        email, 
        phone_no, 
        address, 
        city, 
        account_unique_id 
      } = row.original as any
      const value = (filterValue || '').toLowerCase()
      return Boolean(
        (fullname && String(fullname).toLowerCase().includes(value)) ||
        (email && String(email).toLowerCase().includes(value)) ||
        (phone_no && String(phone_no).toLowerCase().includes(value)) ||
        (address && String(address).toLowerCase().includes(value)) ||
        (city && String(city).toLowerCase().includes(value)) ||
        (account_unique_id && String(account_unique_id).toLowerCase().includes(value))
      )
    },
    onGlobalFilterChange: setGlobalFilter,
  })

  // const rows = table.getRowModel().rows

  return (
    <div className="space-y-2  h-[100%] no-scrollbar">
      <DataTableToolbar table={table} />
      <div className="h-[85%] rounded-md border overflow-y-auto no-scrollbar">
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
