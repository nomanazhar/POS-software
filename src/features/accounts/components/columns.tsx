import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Account } from '../data/schema'
import { DataTableRowActions } from './data-table-row-actions'
import { StatusToggle } from './status-toggle'
import { CurrencyCell } from '@/components/currency-cell'

export const columns: ColumnDef<Account>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        className="rounded border-gray-300"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.target.checked)}
        className="rounded border-gray-300"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
  {
    accessorKey: 'account_id',
    header: 'ID',
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.getValue('account_id')}</div>
    ),
  },
  {
    accessorKey: 'account_type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue('account_type') as string
      const getAccountTypeColor = (type: string) => {
        switch (type) {
          case 'user': return 'bg-blue-100 text-blue-800'
          case 'customer': return 'bg-green-100 text-green-800'
          case 'supplier': return 'bg-orange-100 text-orange-800'
          default: return 'bg-gray-100 text-gray-800'
        }
      }
      return (
        <Badge className={getAccountTypeColor(type)}>
          {type}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'fullname',
    header: 'Name',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.getValue('fullname')}</div>
        <div className="text-sm text-muted-foreground font-mono">
          {row.original.account_unique_id}
        </div>
      </div>
    ),
  },
  {
    id: 'contact',
    header: 'Contact',
    cell: ({ row }) => (
      <div className="space-y-1">
        {row.original.email && (
          <div className="text-sm">{row.original.email}</div>
        )}
        {row.original.phone_no && (
          <div className="text-sm text-muted-foreground">{row.original.phone_no}</div>
        )}
      </div>
    ),
  },
  {
    id: 'address',
    header: 'Address',
    cell: ({ row }) => (
      <div className="space-y-1">
        {row.original.address && (
          <div className="text-sm">{row.original.address}</div>
        )}
        {row.original.second_address && (
          <div className="text-sm text-muted-foreground">{row.original.second_address}</div>
        )}
        {row.original.city && (
          <div className="text-sm text-muted-foreground">{row.original.city}</div>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'account_limit',
    header: 'Credit Limit',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('account_limit') as string || '0')
      return (
        <div className="text-right">
          <CurrencyCell amount={amount} />
        </div>
      )
    },
  },
  {
    accessorKey: 'total_credit',
    header: 'Credit',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('total_credit') || '0')
      return (
        <div className="text-right">
          <CurrencyCell amount={amount} />
        </div>
      )
    },
  },
  {
    accessorKey: 'total_debit',
    header: 'Debit',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('total_debit') || '0')
      return (
        <div className="text-right">
          <CurrencyCell amount={amount} />
        </div>
      )
    },
  },
  {
    accessorKey: 'balance',
    header: 'Balance',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('balance') || '0')
      const accountType = row.original.account_type
      
      // Determine if we should invert the color logic for this account type
      const invertColor = accountType === 'supplier'
      
      return (
        <div className="text-right">
          <CurrencyCell 
            amount={amount} 
            showColor 
            invertColor={invertColor}
          />
        </div>
      )
    },
  },
  {
    accessorKey: 'account_status',
    header: 'Status',
    cell: ({ row }) => <StatusToggle account={row.original} />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'loyality_points',
    header: 'Points',
    cell: ({ row }) => (
      <div className="text-right">
        {row.getValue('loyality_points') || 0}
      </div>
    ),
  },
  {
    accessorKey: 'discount_rate',
    header: 'Discount',
    cell: ({ row }) => {
      const rate = row.getValue('discount_rate') as number
      return (
        <div className="text-right">
          {rate ? `${rate}%` : '-'}
        </div>
      )
    },
  },
  
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) => {
      const dateString = row.getValue('created_at') as string
      if (!dateString) return '-'
      return (
        <div className="text-sm text-muted-foreground">
          {new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      )
    },
  },
 
]
