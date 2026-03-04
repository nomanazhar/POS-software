import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import ProductProvider, { useProductContext } from '../context/product-context'
import { ProductImportDialog } from './product-import-dialog'

export function ProductPrimaryButtons() {
  const { setOpen } = useProductContext()
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  return (
    <ProductProvider>
      <div className='flex gap-2'>
        <Button 
          variant="outline" 
          onClick={() => setImportDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Import Products
        </Button>
        <Button className='btn btn-primary' onClick={() => setOpen('create')}>
          Add Product
        </Button>
      </div>
      <ProductImportDialog 
        open={importDialogOpen} 
        onOpenChange={setImportDialogOpen} 
      />
    </ProductProvider>
  )
}
