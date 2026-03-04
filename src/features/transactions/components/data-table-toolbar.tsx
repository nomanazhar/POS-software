import { Table } from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { DataTableViewOptions } from './data-table-view-options'
import { DataTableFacetedFilter } from './data-table-faceted-filter'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Search by order no, account name, or type..."
          value={table.getState().globalFilter ?? ''}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {table.getColumn('order_type') && (
          <DataTableFacetedFilter
            column={table.getColumn('order_type')}
            title="Type"
            options={[
              {
                label: 'Bill',
                value: 'bill',
              },
              {
                label: 'Purchase',
                value: 'purchase',
              },
              {
                label: 'Quotation',
                value: 'quotation',
              },
            ]}
          />
        )}
        {table.getColumn('payment_method') && (
          <DataTableFacetedFilter
            column={table.getColumn('payment_method')}
            title="Method"
            options={[
              {
                label: 'Cash',
                value: 'cash',
              },
              {
                label: 'Card',
                value: 'card',
              },
              {
                label: 'Ledger',
                value: 'ledger',
              },
            ]}
          />
        )}
        {table.getColumn('payment_type') && (
          <DataTableFacetedFilter
            column={table.getColumn('payment_type')}
            title="Payment Type"
            options={[
              {
                label: 'Credit',
                value: 'credit',
              },
              {
                label: 'Debit',
                value: 'debit',
              },
            ]}
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
