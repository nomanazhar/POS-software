import { ColumnDef } from '@tanstack/react-table'
import { Bill, BillLineItem } from '../data/schema'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from "./data-table-column-header"
import { useBillContext } from '../context/bill-context'
import { ExpandableBillItems } from './expandable-bill-items'
import { CurrencyCell } from '@/components/currency-cell'
import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IconEye, IconPrinter } from '@tabler/icons-react'
import { useState } from 'react'
import { ReceiptDialog } from '@/features/sales/components/receipt-dialog'
import { SalesProvider } from '@/features/sales/context/sales-context'

export const columns: ColumnDef<Bill>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'actions',
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const bill = row.original as Bill;
      const { openDialog } = useBillContext();
      const [printOpen, setPrintOpen] = useState(false);

      const rawItems = Array.isArray(bill.bill_items)
        ? bill.bill_items
        : (() => { try { return JSON.parse(String(bill.bill_items || '[]')); } catch { return []; } })();

      // Normalize items for receipt: ensure quantity & unit_price present
      const itemsArray = rawItems.map((it: any) => ({
        ...it,
        quantity: it.quantity ?? it.item_qty ?? 0,
        unit_price: it.unit_price ?? it.retail_price ?? 0,
      }));

      const transaction = {
        id: bill.bill_unique_id || String(bill.billno || bill.bill_id),
        items: itemsArray,
        subtotal: (bill.total_amount || 0) - (bill.total_tax || 0) + (bill.total_discount || 0),
        total_tax: bill.total_tax || 0,
        total: bill.total_amount || 0,
        paymentMethod: bill.payment_method || 'cash',
        createdAt: new Date(bill.created_at || Date.now()),
        receivedAmount: bill.paid_amount || 0,
        change: bill.balance || 0,
      } as const;

      return (
        <>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="data-[state=open]:bg-muted flex h-8 w-8 p-0">
                <DotsHorizontalIcon className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => openDialog('view', bill)}>
                <IconEye className="mr-2 h-4 w-4" /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPrintOpen(true)}>
                <IconPrinter className="mr-2 h-4 w-4" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {printOpen && (
            <SalesProvider>
              <ReceiptDialog
                onClose={() => setPrintOpen(false)}
                completedTransaction={transaction as any}
              />
            </SalesProvider>
          )}
        </>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  
  {
    accessorKey: 'bill_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Bill ID" />
    ),
    cell: ({ row }) => <span className="font-medium">{row.getValue('bill_id')}</span>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'sale_type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sale Type" />
    ),
    cell: ({ row }) => {
      const type = row.getValue('sale_type') as string
      const getTypeColor = (type: string) => {
        switch (type) {
          case 'retail': return 'bg-blue-100 text-blue-800'
          case 'wholesale': return 'bg-purple-100 text-purple-800'
          default: return 'bg-gray-100 text-gray-800'
        }
      }
      return (
        <div className="text-left">
          <Badge className={getTypeColor(type || '')}>
            {type || 'N/A'}
          </Badge>
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'isreturned',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const isReturned = row.getValue('isreturned') as number;
      const originalBillNo = row.original.original_bill_billno;
      
      if (isReturned === 1) {
        // This is a return bill - show return badge with original bill reference
        return (
          <div className="text-left">
            <Badge variant="destructive" className="text-xs">
              Return Bill
            </Badge>
            {originalBillNo && (
              <div className="text-xs text-muted-foreground mt-1">
                Original: {originalBillNo}
              </div>
            )}
          </div>
        );
      } else {
        // This is an original bill - check if it has returns
        // We'll show this dynamically based on data
        return (
          <div className="text-left">
            <Badge variant="default" className="text-xs bg-green-100 text-green-800">
              Sale Bill
            </Badge>
            {/* TODO: Add dynamic check for returns - this will be handled by the backend */}
          </div>
        );
      }
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'bill_unique_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Bill Unique ID" />
    ),
    cell: ({ row }) => <span className="font-medium">{row.getValue('bill_unique_id')}</span>,
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'billno',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Bill No" />
    ),
    cell: ({ row }) => {
      const { openDialog } = useBillContext()
      const bill = row.original as Bill
      
      return (
        <div className="text-left">
          <button
            onClick={() => openDialog('view', bill)}
            className="font-medium text-primary hover:underline cursor-pointer"
          >
            {row.getValue('billno')}
          </button>
        </div>
      )
    },
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'account_unique_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customer" />
    ),
    cell: ({ row }) => {
      const account_unique_id = row.getValue('account_unique_id') as string
      const isreturned = row.original.isreturned;
      return (
        <div className="text-left">
          <span className="font-medium">
            {account_unique_id || 'Walk-in Customer'}
          </span>
          {isreturned ? (
            <Badge variant="destructive" className="ml-2 text-xs">
              Returned
            </Badge>
          ) : null}
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'total_amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total Amount" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(String(row.getValue('total_amount') ?? 0))
      return <CurrencyCell amount={isNaN(amount) ? 0 : amount} />
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'paid_amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Paid Amount" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(String(row.getValue('paid_amount') ?? 0))
      return <CurrencyCell amount={isNaN(amount) ? 0 : amount} className="text-green-600" />
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'balance',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Change" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(String(row.getValue('balance') ?? 0))
      return <CurrencyCell amount={isNaN(amount) ? 0 : amount} showColor={true} />
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'payment_method',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Method" />
    ),
    cell: ({ row }) => {
        const method = row.getValue('payment_method') as string
      const getMethodColor = (method: string) => {
        switch (method) {
          case 'cash': return 'bg-green-100 text-green-800'
          case 'card': return 'bg-blue-100 text-blue-800'
          case 'ledger': return 'bg-orange-100 text-orange-800'
          default: return 'bg-gray-100 text-gray-800'
        }
      }
      return (
        <div className="text-left">
          <Badge className={getMethodColor(method || '')}>
            {method || 'N/A'}
          </Badge>
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'payment_status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue('payment_status') as string
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'paid': return 'bg-green-100 text-green-800'
          case 'pending': return 'bg-yellow-100 text-yellow-800'
          case 'cancelled': return 'bg-red-100 text-red-800'
          case 'overdue': return 'bg-red-100 text-red-800'
          default: return 'bg-gray-100 text-gray-800'
        }
      }
      return (
        <div className="text-left">
          <Badge className={getStatusColor(status || '')}>
            {status || 'N/A'}
          </Badge>
        </div>
      )
    },
    enableSorting: true,
    enableHiding: true,
  },
  
  {
    accessorKey: 'total_tax',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tax" />
    ),
    cell: ({ row }) => {
      const tax = row.getValue('total_tax') as number
      return <div className="text-left">{tax || 0}</div>
    },
    enableSorting: true,
    enableHiding: true,
  },  
  {
    accessorKey: 'total_discount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Discount" />
    ),
    cell: ({ row }) => {
      const discount = row.getValue('total_discount') as number
      return <div className="text-left">{discount || 0}</div>
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'extracharges',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Extra Charges" />
    ),
    cell: ({ row }) => {
      const extracharges = row.getValue('extracharges') as number
      return <div className="text-left">{extracharges || 0} </div>
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'item_count',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Items" />
    ),
    cell: ({ row }) => {
      const count = row.getValue('item_count') as number
      return <div className="text-left">{count || 0}</div>
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey:"bill_items",
    header:({column})=>(
      <DataTableColumnHeader column={column} title="Products" />
    ),
    cell: ({ row }) => {
      const items = (row.original.bill_items || []) as BillLineItem[]
      return <ExpandableBillItems items={items} />
    },
    enableSorting: true, 
    enableHiding: true,
  },
 
  {
    accessorKey:"company_id",
    header:({column})=>(
      <DataTableColumnHeader column={column} title="Company Id" />
    ),
    cell: ({ row }) => {
      const company_id = row.getValue('company_id') as string
      return <div className="text-left">{company_id || 'N/A'}</div>
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey:"added_by",
    header:({column})=>(
      <DataTableColumnHeader column={column} title="Added By" />
    ),
    cell: ({ row }) => {
      const added_by = row.getValue('added_by') as string
      return <div className="text-left">{added_by || 'N/A'}</div>
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey:"branch_id",
    header:({column})=>(
      <DataTableColumnHeader column={column} title="Branch Id" />
    ),
    cell: ({ row }) => {
      const branch_id = row.getValue('branch_id') as string
      return <div className="text-left">{branch_id || 'N/A'}</div>
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => {
      const date = row.getValue('created_at') as string
      if (!date) return <div className="text-left">-</div>
      
      const formatted = new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      return <div className="text-left text-sm">{formatted}</div>
    },
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'updated_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated" />
    ),
    cell: ({ row }) => {
      const date = row.getValue('updated_at') as string
      if (!date) return <div className="text-left">-</div>
      
      const formatted = new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      return <div className="text-left text-sm">{formatted}</div>
    },
    enableSorting: true,
    enableHiding: true,
  },
  // Actions column
 
] 