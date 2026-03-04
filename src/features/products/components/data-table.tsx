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
import { Badge } from '@/components/ui/badge'
import { usePersistentTableState } from '@/hooks/use-persistent-table-state'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

export function DataTable<TData extends { product_name?: string; barcode?: string; product_unique_id?: string; stock?: number }, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = React.useState('')
  
  // Use persistent table state for column visibility, sorting, filters, and pagination
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 50,
  });

  const {
    columnVisibility,
    sorting,
    columnFilters,
    onColumnVisibilityChange,
    onSortingChange,
    onColumnFiltersChange,
  } = usePersistentTableState({
    tableId: 'products-table',
    defaultColumnVisibility: {
      // Show all columns by default except some system fields
      select: false,
      product_id: true,
      product_unique_id: false,
      barcode: true,
      product_name: true,
      brand: true,
      category_unique_id: true,
      purchase_price: false,
      retail_price: false,
      wholesale_price: false,
      discount: false,
      tax: false,
      alertqty: true,
      status: true,
      returnable: true,
      added_by: false,
      company_id: false,
      branch_id: false,
      created_at: true,
      updated_at: false,
      actions: true,
    },
  })

  // Debug: Log column visibility to see what's happening
  React.useEffect(() => {
    console.log('Column visibility state:', columnVisibility);
    console.log('Company ID column visible:', columnVisibility.company_id);
  }, [columnVisibility]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
      pagination,
    },
    onPaginationChange: setPagination,
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
      // Search by product_name, barcode, or product_unique_id
      const { product_name, barcode, product_unique_id } = row.original
      const value = (filterValue || '').toLowerCase()
      return Boolean(
        (product_name && product_name.toLowerCase().includes(value)) ||
        (barcode && barcode.toLowerCase().includes(value)) ||
        (product_unique_id && product_unique_id.toLowerCase().includes(value))
      )
    },
    onGlobalFilterChange: setGlobalFilter,
  })

  return (
    <div className="space-y-2  h-[100%]">
      <DataTableToolbar table={table} />
      <div className="h-[85%] rounded-md border overflow-y-auto ">
        <div className="overflow-x-auto scrollbar-thin">
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
                        {cell.column.id === 'stock' && row.original.stock === 0 && (
                          <Badge variant='destructive' className='ml-2 text-xs'>Out of Stock</Badge>
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
