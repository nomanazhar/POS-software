import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from './data-table-column-header'
import type { Inventory } from '../data/schema'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { CurrencyCell } from '@/components/currency-cell'

export const columns: ColumnDef<Inventory>[] = [
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
    accessorKey: 'category_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category Name" />
    ),
  },
  {
    accessorKey: 'inventory_unique_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Inventory Unique ID" />
    ),
  },
  {
    accessorKey: 'product_unique_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product Unique ID" />
    ),
  },
  {
    accessorKey: 'barcode',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Barcode" />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.getValue('barcode') || 'N/A'}</div>
    ),
  },
  {
    accessorKey: 'product_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product Name" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="font-medium">{row.getValue('product_name') || 'N/A'}</span>
      </div>
    ),
  },
  {
    accessorKey: 'stock',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stock" />
    ),
    cell: ({ row }) => {
      const stock = row.original.stock;
      const alertqty = row.original.alertqty || 0;
      const productStatus = row.original.product_status || 'active';
      const categoryStatus = row.original.category_status || 'active';
      
      return (
        <div className="text-left">
          <div className="flex flex-col gap-1">
            <span className="font-medium">{stock}</span>
            {categoryStatus === 'inactive' && (
              <Badge variant="destructive" className="w-fit text-xs">
                Category Disabled
              </Badge>
            )}
            {categoryStatus === 'active' && productStatus === 'inactive' && (
              <Badge variant="destructive" className="w-fit text-xs">
                Product Inactive
              </Badge>
            )}
            {categoryStatus === 'active' && productStatus === 'active' && stock === 0 && (
              <Badge variant="destructive" className="w-fit text-xs">
                Zero Stock
              </Badge>
            )}
            {categoryStatus === 'active' && productStatus === 'active' && stock > 0 && stock <= alertqty && (
              <Badge variant="secondary" className="w-fit text-xs bg-yellow-500 text-white">
                Regain Stock
              </Badge>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'retail_price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Retail Price" />
    ),
    cell: ({ row }) => {
      const value = parseFloat(row.getValue('retail_price') || '0')
      return (
        <div className="text-left">
          <CurrencyCell amount={value} />
        </div>
      )
    },
  },
  {
    accessorKey: 'wholesale_price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Wholesale Price" />
    ),
    cell: ({ row }) => {
      const value = parseFloat(row.getValue('wholesale_price') || '0')
      return (
        <div className="text-left">
          <CurrencyCell amount={value} className="text-muted-foreground" />
        </div>
      )
    },
  },
  {
    accessorKey: 'purchase_price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Purchase Price" />
    ),
    cell: ({ row }) => {
      const value = parseFloat(row.getValue('purchase_price') || '0')
      return (
        <div className="text-left">
          <CurrencyCell amount={value} className="text-muted-foreground" />
        </div>
      )
    },
  },
  
  {
    accessorKey: 'alertqty',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Alert Quantity" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-sm">{row.getValue('alertqty') || 0}</span>
      </div>
    ),
  },
  {
    accessorKey: 'branch_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Branch" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-sm">{row.getValue('branch_id')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'added_by',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Added By" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-sm">{row.getValue('added_by')}</span>
      </div>
    ),
  },  
  {
    accessorKey: 'company_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-sm">{row.getValue('company_id')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => {
      const val = row.getValue('created_at');
      if (!val) return <span>N/A</span>;
      let date: Date;
      if (val instanceof Date) {
        date = val;
      } else if (typeof val === 'string' || typeof val === 'number') {
        date = new Date(val);
      } else {
        return <span>N/A</span>;
      }
      return (
        <div className="text-left">
          <span className="text-sm">{date.toLocaleString()}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'updated_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated At" />
    ),
    cell: ({ row }) => {
      const val = row.getValue('updated_at');
      if (!val) return <span>N/A</span>;
      let date: Date;
      if (val instanceof Date) {
        date = val;
      } else if (typeof val === 'string' || typeof val === 'number') {
        date = new Date(val);
      } else {
        return <span>N/A</span>;
      }
      return (
        <div className="text-left">
          <span className="text-sm">{date.toLocaleString()}</span>
        </div>
      );
    },
  },
]
