import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Category } from '../data/schema'
import { DataTableColumnHeader } from './data-table-column-header'
import { DataTableRowActions } from './data-table-row-actions'
import { StatusToggle } from './status-toggle'

export const columns: ColumnDef<Category>[] = [
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
  {
    accessorKey: 'category_id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => <div className="w-[2vw]">{row.getValue('category_id')}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'category_unique_id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category Unique ID" />,
    cell: ({ row }) => <div className="w-[10vw]">{row.getValue('category_unique_id')}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'category_name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Category Name" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="w-[8vw] truncate font-medium">
            {row.getValue('category_name')}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      return <StatusToggle category={row.original} />
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'products_count',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Products" />,
    cell: ({ row }) => {
      const productsCount = row.getValue('products_count') as number || 0;
      const category_name = row.getValue('category_name') as string;
      
      return (
        <div className="flex items-center space-x-2">
          <Badge 
            variant={productsCount > 0 ? "default" : "secondary"}
            className="font-mono"
            title={`${productsCount} product${productsCount !== 1 ? 's' : ''} in ${category_name}`}
          >
            {productsCount}
          </Badge>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    accessorKey: 'icon',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Icon" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate">
            {row.getValue('icon') || 'No icon'}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'description',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate">
            {row.getValue('description') || 'No description'}
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
          <span className="w-[5vw]  truncate">
            {row.getValue('added_by')}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'company_id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Company ID" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="w-[5vw]   truncate">
            {row.getValue('company_id')}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'branch_id',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Branch ID" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate">
            {row.getValue('branch_id')}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created At" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate">
            {new Date(row.getValue('created_at')).toLocaleString()}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'updated_at',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Updated At" />,
    cell: ({ row }) => {
      return (
        <div className="flex space-x-2">
          <span className="max-w-[500px] truncate">
            {new Date(row.getValue('updated_at')).toLocaleString()}
          </span>
        </div>
      )
    },
  },
  
] 