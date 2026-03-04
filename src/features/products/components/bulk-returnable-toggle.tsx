import { Switch } from '@/components/ui/switch'
import { Product } from '../data/schema'

interface BulkReturnableToggleProps {
  product: Product
  onReturnableChange: (productId: number | undefined, newReturnable: number) => void
}

export function BulkReturnableToggle({ product, onReturnableChange }: BulkReturnableToggleProps) {
  const handleReturnableChange = (checked: boolean) => {
    if (product.product_id) {
      onReturnableChange(product.product_id, checked ? 1 : 0)
    }
  }

  return (
    <Switch
      checked={Boolean(product.returnable)}
      onCheckedChange={handleReturnableChange}
      aria-label="Toggle returnable status"
    />
  )
} 