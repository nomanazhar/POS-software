import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'
import { MixerHorizontalIcon } from '@radix-ui/react-icons'
import { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='ml-auto hidden h-8 lg:flex'
        >
          <MixerHorizontalIcon className='mr-2 h-4 w-4' />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[200px]'>
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => {
            // Create a mapping of column IDs to readable titles
            const columnTitles: Record<string, string> = {
              'transaction_id': 'ID',
              'transaction_unique_id': 'Unique ID',
              'order_no': 'Order No',
              'order_type': 'Type',
              'total_amount': 'Total Amount',
              'credit': 'Credit (Paid)',
              'debit': 'Debit (Due)',
              'payment_type': 'Payment Type',
              'payment_method': 'Payment Method',
              'account_unique_id': 'Account Ref',
              'company_id': 'Company',
              'branch_id': 'Branch',
              'added_by': 'Added By',
              'created_at': 'Created',
              'updated_at': 'Updated',
            };

            // Skip the select and actions columns from the dropdown
            if (column.id === 'select' || column.id === 'actions') return null;

            // Use the mapping or fallback to formatted column ID
            const title = columnTitles[column.id] || column.id.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className='capitalize'
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {title}
              </DropdownMenuCheckboxItem>
            )
          })
          .filter(Boolean)}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
