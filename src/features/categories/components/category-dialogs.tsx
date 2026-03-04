import { useCategoryContext } from '../context/category-context'
import { CategoryMutateDrawer } from './category-mutate-drawer'
import { CategoryViewDialog } from './category-view-dialog'
import { CategoryDeleteDialog } from './category-delete-dialog'

export function CategoryDialogs() {
  const { dialogState, closeDialog, selectedCategory } = useCategoryContext()

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog()
    }
  }

  return (
    <>
      <CategoryMutateDrawer
        open={dialogState.type === 'create' || dialogState.type === 'update'}
        onOpenChange={handleOpenChange}
        isEdit={dialogState.type === 'update'}
        currentCategory={selectedCategory}
      />
      <CategoryViewDialog
        open={dialogState.type === 'view'}
        onOpenChange={handleOpenChange}
        category={selectedCategory}
      />
      <CategoryDeleteDialog
        open={dialogState.type === 'delete'}
        onOpenChange={handleOpenChange}
        category={selectedCategory}
      />
    </>
  )
} 