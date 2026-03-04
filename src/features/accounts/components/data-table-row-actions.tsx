import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { Row } from '@tanstack/react-table'
import {  IconEdit } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAccountContext } from '../context/account-context'
import { Account } from '../data/schema'

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  // Safely validate and transform the row data
  const rawData = row.original as any;
  const account = {
    account_id: rawData.account_id || 0,
    account_unique_id: rawData.account_unique_id || rawData.unique_id || '',
    fullname: rawData.fullname || rawData.name || '',
    email: rawData.email || '',
    phone_no: rawData.phone_no || rawData.phoneNumber || '',
    address: rawData.address || '',
    second_address: rawData.second_address || '',
    city: rawData.city || '',
    account_type: rawData.account_type || 'customer',
    account_status: rawData.account_status || 'active',
    account_limit: Number(rawData.account_limit || 0),
    total_credit: Number(rawData.total_credit || 0),
    total_debit: Number(rawData.total_debit || 0),
    balance: Number(rawData.balance || 0),
    loyality_points: Number(rawData.loyality_points || 0),
    discount_rate: Number(rawData.discount_rate || 0),
    remarks: rawData.remarks || '',
    added_by: rawData.added_by || rawData.addedBy || 'admin',
    company_id: rawData.company_id || rawData.companyId || '1',
    branch_id: rawData.branch_id || rawData.branchId || '1',
    created_at: rawData.created_at || rawData.createdAt || new Date().toISOString(),
    updated_at: rawData.updated_at || rawData.updatedAt || new Date().toISOString(),
  } as Account;

  const {  openUpdateDialog } = useAccountContext()


  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='data-[state=open]:bg-muted flex h-8 w-8 p-0'
        >
          <DotsHorizontalIcon className='h-4 w-4' />
          <span className='sr-only'>Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        
        <DropdownMenuItem
          onClick={() => openUpdateDialog(account)}
        >
          <IconEdit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        
        {/* <DropdownMenuItem
          onClick={handleDelete}
          className="text-red-600 focus:text-red-600"
        >
          <IconTrash className="mr-2 h-4 w-4" />
          Delete
          <DropdownMenuShortcut>
            
          </DropdownMenuShortcut>
        </DropdownMenuItem> */}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
