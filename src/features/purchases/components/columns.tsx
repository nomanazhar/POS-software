import { ColumnDef } from '@tanstack/react-table'
import { Purchase } from '../data/schema'
import { DataTableColumnHeader } from './data-table-column-header'
import { DataTableRowActions } from './data-table-row-actions'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { CurrencyCell } from '@/components/currency-cell'

export const columns: ColumnDef<Purchase>[] = [
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
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
  {
    accessorKey: 'purchase_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => {
      const purchaseId = row.getValue('purchase_id') as number;
      return (
        <div className="text-left">
          <span className="font-medium">{purchaseId}</span>
          {/* {row.original.isreturned && (
            <Badge variant="destructive" className="ml-2 text-xs">Returned</Badge>
          )} */}
        </div>
      );
    },
  },
  {
    accessorKey: 'isreturned',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const isReturned = row.getValue('isreturned') as number;
      const originalPurchaseBillNo = row.original.original_purchase_billno;
      
      if (isReturned === 1) {
        return (
          <div className="text-left">
            <Badge variant="destructive" className="text-xs">
              Return Purchase
            </Badge>
            {originalPurchaseBillNo && (
              <div className="text-xs text-muted-foreground mt-1">
                From: {originalPurchaseBillNo}
              </div>
            )}
          </div>
        );
      }
      
      // Check if this purchase has been returned before
      const hasReturns = originalPurchaseBillNo && originalPurchaseBillNo !== row.original.purchase_billno;
      
      return (
        <div className="text-left">
          <Badge variant={hasReturns ? "secondary" : "default"} className="text-xs">
            {hasReturns ? 'Has Returns' : 'Active Purchase'}
          </Badge>
          {hasReturns && (
            <div className="text-xs text-muted-foreground mt-1">
              Returned: {originalPurchaseBillNo}
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => {
      const dateValue = row.getValue('created_at');
      if (!dateValue || typeof dateValue !== 'string') {
        return (
          <div className="text-left">
            <span className="text-muted-foreground">-</span>
          </div>
        );
      }
      try {
        const date = new Date(dateValue);
        const formattedDate = date.toLocaleDateString();
        const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
          <div className="text-left">
            <div className="font-medium">{formattedDate}</div>
            <div className="text-xs text-muted-foreground">{formattedTime}</div>
          </div>
        );
      } catch (error) {
        return (
          <div className="text-left">
            <span className="text-muted-foreground">Invalid date</span>
          </div>
        );
      }
    },
  },
  {
    accessorKey: 'po_no',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="PO No" />
    ),
    cell: ({ row }) => {
      const value = row.getValue('po_no');
      const poNo = typeof value === 'string' ? value : String(value || '');
      return (
        <div className="text-left">
          <span className="font-medium">{poNo || '-'}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'purchase_billno',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Bill No" />
    ),
    cell: ({ row }) => {
      const value = row.getValue('purchase_billno');
      const billNo = typeof value === 'string' ? value : String(value || '');
      return (
        <div className="text-left">
          <span className="font-medium">{billNo}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'original_purchase_billno',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Original Bill No" />
    ),
    cell: ({ row }) => {
      const value = row.getValue('original_purchase_billno');
      const originalBillNo = typeof value === 'string' ? value : String(value || '');
      const isReturned = row.original.isreturned;
      
      if (!isReturned || !originalBillNo || originalBillNo === row.original.purchase_billno) {
        return (
          <div className="text-left">
            <span className="text-muted-foreground">-</span>
          </div>
        );
      }
      
      return (
        <div className="text-left">
          <span className="font-medium text-blue-600">{originalBillNo}</span>
          <div className="text-xs text-muted-foreground">Original Purchase</div>
        </div>
      );
    },
  },
  {
    accessorKey: 'purchase_unique_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Purchase ID" />
    ),
    cell: ({ row }) => {
      const value = row.getValue('purchase_unique_id');
      const purchaseId = typeof value === 'string' ? value : String(value || '');
      return (
        <div className="text-left">
          <span className="font-mono text-xs">{purchaseId}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'account_unique_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Supplier" />
    ),
    cell: ({ row }) => {
      const value = row.getValue('account_unique_id');
      const supplier = typeof value === 'string' ? value : String(value || '');
      return (
        <div className="text-left">
          <span className="font-medium">{supplier}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'received_by',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Received By" />
    ),
    cell: ({ row }) => {
      const value = row.getValue('received_by');
      const receivedBy = typeof value === 'string' ? value : String(value || '');
      return (
        <div className="text-left">
          <span>{receivedBy}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'total_amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Total Amount" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('total_amount') || '0')
      return (
        <div className="text-left font-medium">
          <CurrencyCell amount={amount} />
        </div>
      )
    },
  },
  {
    accessorKey: 'paid_amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Paid Amount" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('paid_amount') || '0')
      return (
        <div className="text-left">
          <CurrencyCell amount={amount} />
        </div>
      )
    },
  },
  {
    accessorKey: 'balance',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Balance" />
    ),
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('balance') || '0')
      return (
        <div className="text-left">
          <CurrencyCell amount={amount} showColor />
        </div>
      )
    },
  },
  {
    accessorKey: 'profit_margin',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Profit Margin" />
    ),
    cell: ({ row }) => {
      const value = row.getValue('profit_margin');
      const profitMargin = typeof value === 'number' ? value : 0;
      return (
        <div className="text-left">
          <span>{profitMargin}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'item_count',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Items" />
    ),
    cell: ({ row }) => {
      const value = row.getValue('item_count');
      const itemCount = typeof value === 'number' ? value : 0;
      return (
        <div className="text-left">
          <span>{itemCount}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'purchase_items',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Products" />
    ),
    cell: ({ row }) => {
      const items = (row.original.purchase_items || []) as any[];
      return (
        <div className="text-left space-y-1 w-[15vw]">
          {items.slice(0, 3).map((item, index) => (
            <div key={index} className="text-sm">
              <div className="flex items-center gap-2">
                <div className="font-medium truncate">{item.product_name}</div>
              </div>
              <div className="text-muted-foreground text-xs font-mono">
                ID: {item.product_unique_id}
              </div>
              <div className="text-muted-foreground text-xs">
                {Number(item.purchase_price).toFixed(2)} × {item.quantity} = {Number(item.purchase_price * item.quantity).toFixed(2)}
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
      );
    },
  },
  
  {
    accessorKey: 'added_by',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Added By" />
    ),
    cell: ({ row }) => {
      const value = row.getValue('added_by');
      const addedBy = typeof value === 'string' ? value : String(value || '');
      return (
        <div className="text-left">
          <span className="text-sm text-muted-foreground">{addedBy}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'company_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company ID" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-sm">{row.getValue('company_id')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'branch_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Branch ID" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-sm">{row.getValue('branch_id')}</span>
      </div>
    ),
  },
  
  {
    accessorKey: 'updated_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated At" />
    ),
    cell: ({ row }) => {
      const dateValue = row.getValue('updated_at');
      if (!dateValue || typeof dateValue !== 'string') {
        return (
          <div className="text-left">
            <span className="text-muted-foreground">-</span>
          </div>
        );
      }
      try {
        const date = new Date(dateValue);
        const formattedDate = date.toLocaleDateString();
        const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
          <div className="text-left">
            <div className="font-medium">{formattedDate}</div>
            <div className="text-xs text-muted-foreground">{formattedTime}</div>
          </div>
        );
      } catch (error) {
        return (
          <div className="text-left">
            <span className="text-muted-foreground">Invalid date</span>
          </div>
        );
      }
    },
  },
  
] 