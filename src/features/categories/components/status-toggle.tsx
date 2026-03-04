import { Button } from '@/components/ui/button'
import { useCategoryContext } from '../context/category-context'
import { Category } from '../data/schema'
import { toast } from 'sonner'

interface StatusToggleProps {
  category: Category
}

export function StatusToggle({ category }: StatusToggleProps) {
  const { updateCategory } = useCategoryContext()

  const handleStatusChange = async () => {
    try {
      const newStatus: 'active' | 'inactive' = category.status === 'active' ? 'inactive' : 'active'
      const updatedCategory = {
        ...category,
        status: newStatus,
      }
      
      if (category.category_id) {
        const result = await updateCategory(updatedCategory)
        if (result.success) {
          toast.success(`Category ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`)
        } else {
          toast.error(result.error || 'Failed to update category status')
        }
      }
    } catch (error) {
      toast.error('Failed to update category status. Please try again.')
    }
  }

  const isActive = category.status === 'active'

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
