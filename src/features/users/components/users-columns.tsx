import { ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
// import LongText from '@/components/long-text'
import { callTypes, userTypes } from '../data/data'
import { User } from '../data/schema'
import { DataTableColumnHeader } from './data-table-column-header'
import { DataTableRowActions } from './data-table-row-actions'

export const columns: ColumnDef<User>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    meta: {
      className: cn(
        'sticky md:table-cell left-0 z-10 rounded-tl',
        'bg-background transition-colors duration-200 group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted'
      ),
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='ID' />
    ),
    cell: ({ row }) => <span>{row.getValue('id')}</span>,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Name' />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-sm">{row.getValue('name')}</span>
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'companyId',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Company ID' />
    ),
    cell: ({ row }) => <span>{row.getValue('companyId') || 'N/A'}</span>,
  },
  {
    accessorKey: 'branchId',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Branch ID' />
    ),
    cell: ({ row }) => <span>{row.getValue('branchId') || 'N/A'}</span>,
  },
  {
    accessorKey: 'addedBy',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Added By' />
    ),
    cell: ({ row }) => <span>{row.getValue('addedBy') || 'N/A'}</span>,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Email' />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-sm">{row.getValue('email')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'phoneNumber',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Phone Number' />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="font-mono text-sm">{row.getValue('phoneNumber')}</span>
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ row }) => {
      const { status } = row.original
      const allowedStatuses = ['active', 'inactive', 'invited', 'suspended'] as const;
      const badgeColor = allowedStatuses.includes(status as any)
        ? callTypes.get(status as typeof allowedStatuses[number])
        : '';
      return (
        <div className="text-left">
          <Badge variant='outline' className={cn('capitalize text-xs', badgeColor)}>
            {row.getValue('status')}
          </Badge>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableHiding: false,
    enableSorting: false,
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Role' />
    ),
    cell: ({ row }) => {
      const { role } = row.original
      const userType = userTypes.find(({ value }) => value === role)

      if (!userType) {
        return null
      }

      return (
        <div className="text-left flex items-center gap-x-2">
          {userType.icon && (
            <userType.icon size={16} className='text-muted-foreground' />
          )}
          <span className='text-sm capitalize'>{row.getValue('role')}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableSorting: false,
    enableHiding: false,
  },
  // {
  //   id: 'companyName',
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title='Companyname' />
  //   ),
  //   cell: ({ row }) => {
  //     const companyName = companies.find(c => c.id === row.original.companyId)?.name || 'N/A';
  //     return <span>{companyName}</span>;
  //   },
  // },
  // {
  //   id: 'branchName',
  //   header: ({ column }) => (
  //     <DataTableColumnHeader column={column} title='Branchname' />
  //   ),
  //   cell: ({ row }) => {
  //     const branchName = branches.find(b => b.id === row.original.branchId)?.name || 'N/A';
  //     return <span>{branchName}</span>;
  //   },
  // },
  
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Created At' />
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
      return <span>{date.toLocaleString()}</span>;
    },
  },
  {
    accessorKey: 'updated_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Updated At' />
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
      return <span>{date.toLocaleString()}</span>;
    },
  },
 {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
    enableSorting: false,
    enableHiding: false,
    meta: {
      className: 'sticky right-0 bg-background',
    },
  },
]
