import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { Category } from '../data/schema'
import { eventEmitter } from '@/lib/event-emitter'

type CategoryDialogType = 'create' | 'update' | 'delete' | 'view'

interface CategoryContextType {
  categories: Category[]
  selectedCategory: Category | null
  setSelectedCategory: React.Dispatch<React.SetStateAction<Category | null>>
  dialogState: {
    open: boolean
    type: CategoryDialogType | null
  }
  isLoading: boolean
  error: string | null
  openCreateDialog: () => void
  openUpdateDialog: (category: Category) => void
  openViewDialog: (category: Category) => void
  openDeleteDialog: (category: Category) => void
  closeDialog: () => void
  addCategory: (category: Omit<Category, 'categoryId'>) => Promise<{ success: boolean; error?: string }>
  updateCategory: (category: Category) => Promise<{ success: boolean; error?: string }>
  deleteCategory: (categoryId: number) => Promise<{ success: boolean; error?: string }>
  fetchCategories: () => Promise<void>
  refreshProductCounts: () => Promise<void>
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined)

export function CategoryProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogState, setDialogState] = useState<{
    open: boolean
    type: CategoryDialogType | null
  }>({
    open: false,
    type: null,
  })

  const closeDialog = useCallback(() => {
    setDialogState({ open: false, type: null })
  }, [])

  const openDialog = useCallback((type: CategoryDialogType) => {
    setDialogState({ open: true, type })
  }, [])

  const validateCategoryData = useCallback((data: any[]): any[] => {
    return data
      .map((item, index) => {
        try {
          // Basic validation - ensure required fields exist
          if (!item || typeof item !== 'object') {
            console.error(`Invalid category item at index ${index}:`, item)
            return null
          }

          // Map database field names to schema field names
          const mappedItem = {
            category_id: item.categoryId || item.category_id,
            category_unique_id: item.unique_id || item.category_unique_id,
            category_name: item.categoryName || item.category_name,
            description: item.description || null,
            status: item.status || 'active',
            icon: item.icon || null,
            added_by: item.added_by || 'admin',
            company_id: item.company_id || '1',
            branch_id: item.branch_id || '1',
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString(),
            products_count: item.products_count || 0,
          };
          
          console.log(`Category ${mappedItem.category_name}: products_count = ${item.products_count} -> ${mappedItem.products_count}`);

          // Basic validation - ensure required fields exist
          if (!mappedItem.category_name || !mappedItem.category_unique_id) {
            console.error(`Missing required fields in category at index ${index}:`, item);
            return null;
          }

          return mappedItem;
        } catch (error) {
          console.error(`Invalid category item at index ${index}:`, item, error)
          return null
        }
      })
      .filter((item): item is any => item !== null)
  }, [])

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (!window.electronAPI) {
        console.error('Electron API not available')
        setError('Electron API not available')
        setCategories([])
        return
      }
      
      // Only fetch categories to avoid serialization issues
      const categoriesData = await window.electronAPI.invoke('categories:getAll')
      
      console.log('Categories fetched:', categoriesData)
      
      // Handle new backend response format
      const categories = categoriesData.success ? categoriesData.data : categoriesData
      
      console.log('Categories after format handling:', categories)
      
      // Ensure we have arrays
      if (!Array.isArray(categories)) {
        console.error('Categories data is not an array:', categories)
        setError('Invalid data format received from server')
        setCategories([])
        return
      }
      
      const validatedData = validateCategoryData(categories)
      console.log('Validated categories data:', validatedData)
      setCategories(validatedData)
    } catch (error) {
      console.error('Error fetching categories:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
      setCategories([])
    } finally {
      setIsLoading(false)
    }
  }, [validateCategoryData])

  const refreshProductCounts = useCallback(async () => {
    // For now, just refresh categories without product counts
    // Product counts can be displayed as badges in the UI when needed
    await fetchCategories()
  }, [fetchCategories])

  const addCategory = useCallback(async (category: Omit<Category, 'categoryId'>): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }
      
      const result = await window.electronAPI.invoke('categories:add', category)
      
      // Handle new backend response format
      if (result.success) {
        await fetchCategories() // This will refresh with updated product counts
        eventEmitter.emit('categories:added', category)
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Failed to add category' }
      }
    } catch (error) {
      console.error('Error adding category:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, [fetchCategories])

  const updateCategory = useCallback(async (category: Category): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }
      
      const result = await window.electronAPI.invoke('categories:update', category)
      
      // Handle new backend response format
      if (result.success) {
        await fetchCategories()
        eventEmitter.emit('categories:updated', category)
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Failed to update category' }
      }
    } catch (error) {
      console.error('Error updating category:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, [fetchCategories])

  const deleteCategory = useCallback(async (categoryId: number): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' }
      }
      
      const result = await window.electronAPI.invoke('categories:delete', categoryId)
      
      // Handle new backend response format
      if (result.success) {
        await fetchCategories()
        eventEmitter.emit('categories:deleted', categoryId)
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Failed to delete category' }
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }, [fetchCategories])

  const openCreateDialog = useCallback(() => {
    setSelectedCategory(null)
    openDialog('create')
  }, [openDialog])

  const openUpdateDialog = useCallback((category: Category) => {
    setSelectedCategory(category)
    openDialog('update')
  }, [openDialog])

  const openViewDialog = useCallback((category: Category) => {
    setSelectedCategory(category)
    openDialog('view')
  }, [openDialog])

  const openDeleteDialog = useCallback((category: Category) => {
    setSelectedCategory(category)
    openDialog('delete')
  }, [openDialog])

  useEffect(() => {
    fetchCategories()
  }, []) // Remove fetchCategories from dependencies to prevent infinite loop

  const value = useMemo(() => ({
    categories,
    selectedCategory,
    setSelectedCategory,
    dialogState,
    isLoading,
    error,
    openCreateDialog,
    openUpdateDialog,
    openViewDialog,
    openDeleteDialog,
    closeDialog,
    addCategory,
    updateCategory,
    deleteCategory,
    fetchCategories,
    refreshProductCounts,
  }), [
    categories,
    selectedCategory,
    dialogState,
    isLoading,
    error,
    openCreateDialog,
    openUpdateDialog,
    openViewDialog,
    openDeleteDialog,
    closeDialog,
    addCategory,
    updateCategory,
    deleteCategory,
    fetchCategories,
    refreshProductCounts,
  ])

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  )
}

export function useCategoryContext() {
  const context = useContext(CategoryContext)
  if (context === undefined) {
    throw new Error('useCategoryContext must be used within a CategoryProvider')
  }
  return context
} 