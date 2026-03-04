import { ColumnDef } from '@tanstack/react-table'
import type { Product } from '../data/schema'
// import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from './data-table-column-header'
import { DataTableRowActions } from './data-table-row-actions'
import { StatusToggle } from './status-toggle'
import { ReturnableToggle } from './returnable-toggle'
import { CurrencyCell } from '@/components/currency-cell'
import { useCategoryContext } from '@/features/categories/context/category-context'

export const columns: ColumnDef<Product>[] = [
  // {
  //   id: 'select',
  //   header: ({ table }) => (
  //     <Checkbox
  //       checked={
  //         table.getIsAllPageRowsSelected() ||
  //         (table.getIsSomePageRowsSelected() && 'indeterminate')
  //       }
  //       onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //       aria-label="Select all"
  //       className="translate-y-[2px]"
  //     />
  //   ),
  //   cell: ({ row }) => (
  //     <Checkbox
  //       checked={row.getIsSelected()}
  //       onCheckedChange={(value) => row.toggleSelected(!!value)}
  //       aria-label="Select row"
  //       className="translate-y-[2px]"
  //     />
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
  {
    accessorKey: 'product_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="font-medium">{row.getValue('product_id')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'product_unique_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Unique ID" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="font-mono text-xs">{row.getValue('product_unique_id')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'barcode',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Barcode" />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.getValue('barcode')}</div>
    ),
  },
  {
    accessorKey: 'product_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product Name" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="font-medium">{row.getValue('product_name')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'brand',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Brand" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span>{row.getValue('brand')}</span>
      </div>
    ),
  },
 {
    accessorKey: 'category_unique_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => {
      const { categories } = useCategoryContext()
      const categoryId = row.getValue('category_unique_id') as string
      const category = categories.find(cat => cat.category_unique_id === categoryId)
      
      return (
        <div className="text-left">
          <span>{category?.category_name || categoryId}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'purchase_price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Purchase Price" />
    ),
    cell: ({ row }) => (
      <CurrencyCell 
        amount={row.getValue<number>('purchase_price') || 0} 
        className="text-muted-foreground" 
      />
    ),
  },
  {
    accessorKey: 'retail_price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Retail Price" />
    ),
    cell: ({ row }) => (
      <CurrencyCell 
        amount={row.getValue<number>('retail_price') || 0} 
        className="font-medium" 
      />
    ),
  },
  {
    accessorKey: 'wholesale_price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Wholesale Price" />
    ),
    cell: ({ row }) => (
      <CurrencyCell 
        amount={row.getValue<number>('wholesale_price') || 0} 
        className="text-muted-foreground" 
      />
    ),
  },
  {
    accessorKey: 'alertqty',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Alert Qty" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
            <span className="text-sm">{row.getValue('alertqty') || 0}</span>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <StatusToggle product={row.original} />
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
          <span>{row.getValue('added_by')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'company_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Company ID" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span>{row.getValue('company_id')}</span>
      </div>
    ),
    enableSorting: true,
    enableHiding: true,
  },
  {
    accessorKey: 'branch_id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Branch ID" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span>{row.getValue('branch_id')}</span>
      </div>
    ),
  },

  
  {
    accessorKey: 'discount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Discount" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        {row.getValue<number>('discount') || 0}
      </div>
    ),
  },
  {
    accessorKey: 'tax',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tax" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        {row.getValue<number>('tax') || 0}
      </div>
    ),
  },
  
  {
    accessorKey: 'returnable',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Returnable" />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <ReturnableToggle product={row.original} />
      </div>
    ),
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
  },
  {
    accessorKey: 'updated_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated At" />
    ),
  },
  
]
