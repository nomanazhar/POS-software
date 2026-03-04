import { Button } from '@/components/ui/button'
import { Product } from '../data/schema'

interface BulkStatusToggleProps {
  product: Product
  onStatusChange: (productId: number | undefined, newStatus: 'active' | 'inactive') => void
}

export function BulkStatusToggle({ product, onStatusChange }: BulkStatusToggleProps) {
  const handleStatusChange = () => {
    const newStatus: 'active' | 'inactive' = product.status === 'active' ? 'inactive' : 'active'
    if (product.product_id) {
      onStatusChange(product.product_id, newStatus)
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