import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { Row } from '@tanstack/react-table'
import { IconTrash } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useProductContext } from '../context/product-context'
// import { productSchema } from '../data/schema'

interface DataTableRowActionsProps<TData> {
  row: Row<TData>
}

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  // Safely validate and transform the row data
  const rawData = row.original as any;
  const product = {
    product_id: rawData.product_id || 0,
    product_unique_id: rawData.product_unique_id || rawData.unique_id || '',
    product_name: rawData.product_name || rawData.name || '',
    barcode: rawData.barcode || '',
    brand: rawData.brand || '',
    category_unique_id: rawData.category_unique_id || rawData.categoryId || '',
    retail_price: Number(rawData.retail_price || rawData.price || 0),
    wholesale_price: Number(rawData.wholesale_price || rawData.wholesaleRate || 0),
    purchase_price: Number(rawData.purchase_price || rawData.purchaseprice || 0),
    alertqty: Number(rawData.alertqty || rawData.alertQty || 0),
    tax: Number(rawData.tax || 0),
    discount: Number(rawData.discount || 0),
    status: rawData.status || 'active',
    returnable: Number(rawData.returnable || 0),
    added_by: rawData.added_by || rawData.addedBy || 'admin',
    company_id: rawData.company_id || rawData.companyId || '1',
    branch_id: rawData.branch_id || rawData.branchId || '1',
    created_at: rawData.created_at || rawData.createdAt || new Date().toISOString(),
    updated_at: rawData.updated_at || rawData.updatedAt || new Date().toISOString(),
  } as any;

  const { setCurrentProduct, setOpen } = useProductContext()

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
      <DropdownMenuContent align='end' className='w-[100px] '>
        <DropdownMenuItem
          onClick={() => {
            setCurrentProduct(product)
            setOpen('update')
          }}
        >
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
      
        <DropdownMenuItem
          onClick={() => {
            setCurrentProduct(product)
            setOpen('delete')
          }}
        >
          Delete
          <DropdownMenuShortcut>
            <IconTrash size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
