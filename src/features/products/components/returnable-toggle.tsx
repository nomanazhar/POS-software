import { Switch } from '@/components/ui/switch'
import { useProductContext } from '../context/product-context'
import { Product } from '../data/schema'
import { toast } from 'sonner'

interface ReturnableToggleProps {
  product: Product
}

export function ReturnableToggle({ product }: ReturnableToggleProps) {
  const { updateProduct } = useProductContext()

  const handleReturnableChange = async (checked: boolean) => {
    try {
      const updatedProduct = {
        ...product,
        returnable: checked ? 1 : 0,
      }
      
      if (product.product_id) {
        await updateProduct(product.product_id, updatedProduct)
      }
      toast.success(`Product ${checked ? 'marked as returnable' : 'marked as non-returnable'} successfully!`)
    } catch (error) {
      toast.error('Failed to update product returnable status. Please try again.')
    }
  }

  return (
    <Switch
      checked={product.returnable === 1}
      onCheckedChange={handleReturnableChange}
      aria-label="Toggle returnable status"
    />
  )
} 