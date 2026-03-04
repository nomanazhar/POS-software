import { ColumnDef } from '@tanstack/react-table'
import type { Quotation } from '../data/schema'
import { DataTableColumnHeader } from '@/features/bills/components/data-table-column-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'

export const columns: ColumnDef<Quotation>[] = [
  {
    id: 'actions',
    header: ({ column }) => (<DataTableColumnHeader column={column} title="Actions" />),
    cell: ({ row }) => {
      const quotation = row.original
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // This will be handled by the parent component
            if (window.quotationViewDialog) {
              window.quotationViewDialog(quotation)
            }
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )
    },
  },
  { 
    accessorKey: 'quotation_id', 
    header: ({ column }) => (<DataTableColumnHeader column={column} title="ID" />),
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.quotation_id}</span>
  },
  { 
    accessorKey: 'quotationno', 
    header: ({ column }) => (<DataTableColumnHeader column={column} title="Quotation No" />),
    cell: ({ row }) => <span className="font-medium">{row.original.quotationno}</span>
  },
  { 
    accessorKey: 'account_unique_id', 
    header: ({ column }) => (<DataTableColumnHeader column={column} title="Customer" />),
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.account_unique_id}</span>
  },
  { 
    accessorKey: 'item_count', 
    header: ({ column }) => (<DataTableColumnHeader column={column} title="Items" />),
    cell: ({ row }) => <Badge variant="secondary">{row.original.item_count}</Badge>
  },
  { 
    accessorKey: 'sale_type', 
    header: ({ column }) => (<DataTableColumnHeader column={column} title="Type" />),
    cell: ({ row }) => (
      <Badge variant={row.original.sale_type === 'retail' ? 'default' : 'outline'}>
        {row.original.sale_type}
      </Badge>
    )
  },
  {
    accessorKey: 'quotation_items',
    header: ({ column }) => (<DataTableColumnHeader column={column} title="Products" />),
    cell: ({ row }) => {
      const items = (row.original.quotation_items || []) as NonNullable<Quotation['quotation_items']>
      return (
        <div className="text-left space-y-1 max-w-[350px]">
          {items.slice(0, 3).map((item, index) => (
            <div key={index} className="text-sm  ">
              <div className="flex items-center gap-2">
                <div className="font-medium truncate">{item.product_name}</div>
              </div>
              <div className="text-muted-foreground text-xs font-mono">
                ID: {item.product_unique_id}
              </div>
              <div className="text-muted-foreground text-xs">
                {Number(item.retail_price).toFixed(2)} × {item.quantity} = ${Number(item.total_price).toFixed(2)}
              </div>
            </div>
          ))}
          {items.length > 3 && (
            <div className="text-muted-foreground text-xs pt-1">
              +{items.length - 3} more items
            </div>
          )}
          {items.length === 0 && <span className="text-muted-foreground text-xs">No items</span>}
        </div>
      )
    },
  },
  { 
    accessorKey: 'tax_amount', 
    header: ({ column }) => (<DataTableColumnHeader column={column} title="Tax" />),
    cell: ({ row }) => <span className="text-sm">{Number(row.original.tax_amount).toFixed(2)}</span>
  },
  { 
    accessorKey: 'discount_amount', 
    header: ({ column }) => (<DataTableColumnHeader column={column} title="Discount" />),
    cell: ({ row }) => <span className="text-sm">{Number(row.original.discount_amount).toFixed(2)}</span>
  },
  { 
    accessorKey: 'total_amount', 
    header: ({ column }) => (<DataTableColumnHeader column={column} title="Total" />),
    cell: ({ row }) => <span className="font-semibold">{Number(row.original.total_amount).toFixed(2)}</span>
  },
  { 
    accessorKey: 'paid_amount', 
    header: ({ column }) => (<DataTableColumnHeader column={column} title="Paid" />),
    cell: ({ row }) => <span className="text-sm">{Number(row.original.paid_amount || 0).toFixed(2)}</span>
  },
  { 
    accessorKey: 'added_by', 
    header: ({ column }) => (<DataTableColumnHeader column={column} title="Created By" />),
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.added_by}</span>
  },
  { 
    accessorKey: 'created_at', 
    header: ({ column }) => (<DataTableColumnHeader column={column} title="Created" />),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : '-'}
      </span>
    )
  },
  
]


