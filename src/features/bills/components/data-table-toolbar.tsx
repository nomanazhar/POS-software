import { Table } from '@tanstack/react-table'
import { X } from 'lucide-react' // eslint-disable-line

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTableViewOptions } from "./data-table-view-options"

// import { DataTableFacetedFilter } from "./data-table-faceted-filter"
// import { Bill } from "../data/schema" // eslint-disable-line 

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  // const paymentStatusOptions = [
  //   {
  //     label: 'Paid',
  //     value: 'paid',
  //   },
  //   {
  //     label: 'Pending',
  //     value: 'pending',
  //   },
  //   {
  //     label: 'Cancelled',
  //     value: 'cancelled',
  //   },
  // ]

  // const paymentMethodOptions = [
  //   {
  //     label: 'Cash',
  //     value: 'cash',
  //   },
  //   {
  //     label: 'Card',
  //     value: 'card',
  //   },
  //   {
  //     label: 'Bank Transfer',
  //     value: 'bank_transfer',
  //   },
  //   {
  //     label: 'Digital Wallet',
  //     value: 'digital_wallet',
  //   },
  //   {
  //     label: 'Other',
  //     value: 'other',
  //   },
  // ]

  return (
    <div className="h-[6%] flex items-center justify-between ">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter bills..."
                  value={(table.getColumn('billno')?.getFilterValue() as string) ?? ''}
        onChange={(event) =>
          table.getColumn('billno')?.setFilterValue(event.target.value)
        }
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {/* {table.getColumn('payment_status') && (
          <DataTableFacetedFilter
            column={table.getColumn('payment_status')}
            title="Payment Status"
            options={paymentStatusOptions}
          />
        )}
        {table.getColumn('payment_method') && (
          <DataTableFacetedFilter
            column={table.getColumn('payment_method')}
            title="Payment Method"
            options={paymentMethodOptions}
          />
        )} */}
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