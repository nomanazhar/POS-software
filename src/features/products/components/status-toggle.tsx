import { Button } from '@/components/ui/button'
import { useProductContext } from '../context/product-context'
import { Product } from '../data/schema'
import { toast } from 'sonner'

interface StatusToggleProps {
  product: Product
}

export function StatusToggle({ product }: StatusToggleProps) {
  const { updateProduct } = useProductContext()

  const handleStatusChange = async () => {
    try {
      const newStatus: 'active' | 'inactive' = product.status === 'active' ? 'inactive' : 'active'
      const updatedProduct = {
        ...product,
        status: newStatus,
      }
      
      if (product.product_id) {
        await updateProduct(product.product_id, updatedProduct)
      }
      toast.success(`Product ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`)
    } catch (error) {
      toast.error('Failed to update product status. Please try again.')
    }
  }

  const isActive = product.status === 'active'

  return (
    <Button
      variant={isActive ? "default" : "secondary"}
      size="sm"
      onClick={handleStatusChange}
      className={`text-xs px-3 py-1 ${isActive ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 hover:bg-gray-600'}`}
    >
      {isActive ? 'Active' : 'Inactive'}
    </Button>
  )
} 