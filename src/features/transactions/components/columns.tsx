import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { TransactionRow } from '../data/schema'
import { DataTableColumnHeader } from '@/features/transactions/components/data-table-column-header'
import { CurrencyCell } from '@/components/currency-cell'


export const columns: ColumnDef<TransactionRow>[] = [
  {
    accessorKey: 'transaction_id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => <div className="w-[2vw] font-mono text-xs">{row.getValue('transaction_id')}</div>,
    enableSorting: false,
    enableHiding: true, // Allow hiding this column
  },
  {
    accessorKey: 'transaction_unique_id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Unique ID" />,
    cell: ({ row }) => <div className="w-[8vw] font-mono text-xs">{row.getValue('transaction_unique_id')}</div>,
    enableSorting: false,
    enableHiding: true, // Allow hiding this column
  },
  {
    accessorKey: 'order_no',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Order No" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="w-[6vw] truncate font-mono text-xs">
            {row.getValue('order_no') || '-'}
          </span>
        </div>
      )
    },
    enableHiding: true,
    enableGlobalFilter: true,
  },
  {
    accessorKey: 'full_name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Account Name" />,
    cell: ({ row }) => {
      const fullName = row.getValue('full_name') as string;
      return (
        <div className="flex flex-col space-y-1">
          <span className="font-medium text-sm">{fullName || 'Unknown Account'}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const fullName = row.getValue(id) as string;
      return fullName?.toLowerCase().includes(value.toLowerCase());
    },
    enableHiding: true,
    enableGlobalFilter: true,
  },
  {
    accessorKey: 'order_type',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
    cell: ({ row }) => {
      const type = row.getValue('order_type') as string
      const typeColor = (type: string) => {
        switch (type) {
          case 'bill': return 'bg-blue-100 text-blue-800'
          case 'purchase': return 'bg-amber-100 text-amber-800'
          case 'quotation': return 'bg-violet-100 text-violet-800'
          default: return 'bg-gray-100 text-gray-800'
        }
      }
      return <Badge className={typeColor(type)}>{type}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableGlobalFilter: true,
  },
  {
    accessorKey: 'total_amount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total Amount" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('total_amount') || '0')
      return (
        <div className="text-right">
          <CurrencyCell amount={amount} />
        </div>
      )
    },
    enableHiding: true,
  },
  {
    accessorKey: 'credit',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Credit (Paid)" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('credit') || '0')
      return (
        <div className="text-right">
          <CurrencyCell amount={amount} showColor={amount > 0} />
        </div>
      )
    },
  },
  {
    accessorKey: 'debit',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Debit (Due)" />,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('debit') || '0')
      return (
        <div className="text-right">
          <CurrencyCell amount={amount} showColor={amount > 0} />
        </div>
      )
    },
  },
  {
    accessorKey: 'payment_type',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Payment Type" />,
    cell: ({ row }) => {
      const type = row.getValue('payment_type') as string
      const typeColor = (type: string) => {
        switch (type) {
          case 'credit': return 'bg-green-100 text-green-800'
          case 'debit': return 'bg-red-100 text-red-800'
          default: return 'bg-gray-100 text-gray-800'
        }
      }
      return <Badge className={typeColor(type)}>{type}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'payment_method',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Payment Method" />,
    cell: ({ row }) => {
      const method = row.getValue('payment_method') as string
      const methodColor = (method: string) => {
        switch (method) {
          case 'cash': return 'bg-green-100 text-green-800'
          case 'card': return 'bg-blue-100 text-blue-800'
          case 'ledger': return 'bg-orange-100 text-orange-800'
          default: return 'bg-gray-100 text-gray-800'
        }
      }
      return <Badge className={methodColor(method)}>{method}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'account_unique_id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Account Ref" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="w-[8vw] truncate font-mono text-xs">
            {row.getValue('account_unique_id') || '-'}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'company_id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Company" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="w-[4vw] truncate">
            {row.getValue('company_id')}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'branch_id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Branch" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="w-[4vw] truncate">
            {row.getValue('branch_id')}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'added_by',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Added By" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="w-[5vw] truncate font-mono text-xs">
            {row.getValue('added_by') || '-'}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ row }) => {
      const date = row.getValue('created_at') as string
      if (!date) return <div className="text-xs text-muted-foreground">-</div>
      return (
        <div className="text-xs text-muted-foreground">
          {new Date(date).toLocaleString()}
        </div>
      )
    },
  },
  {
    accessorKey: 'updated_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
    cell: ({ row }) => {
      const date = row.getValue('updated_at') as string
      if (!date) return <div className="text-xs text-muted-foreground">-</div>
      return (
        <div className="text-xs text-muted-foreground">
          {new Date(date).toLocaleString()}
        </div>
      )
    },
  },
]
