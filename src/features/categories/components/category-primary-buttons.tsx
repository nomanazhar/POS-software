import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useCategoryContext } from '../context/category-context'

export function CategoryPrimaryButtons() {
  const { openCreateDialog } = useCategoryContext()

  return (
    <Button onClick={openCreateDialog}>
      <Plus className="mr-2 h-4 w-4" />
      Add Category
    </Button>
  )
} 