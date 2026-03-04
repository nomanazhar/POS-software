import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { CategoryProvider, useCategoryContext } from './context/category-context'
import { DataTable } from './components/data-table'
import { columns } from './components/columns'
import { CategoryDialogs } from './components/category-dialogs'
import { CategoryPrimaryButtons } from './components/category-primary-buttons'

function CategoriesContent() {
  const { categories, isLoading, error } = useCategoryContext()

  return (
    <>
      <Header fixed>
        <div className='ml-auto flex items-center justify-end space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>  
      </Header>
      <Main className='no-scrollbar' >
        <div className='h-[10%] mb-2 flex flex-wrap items-center justify-between space-y-2 gap-x-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight underline'>Categories</h2>
            <p className='text-muted-foreground'>
              Manage your product categories and organize your inventory.
            </p>
          </div>
          <CategoryPrimaryButtons />
        </div>
        <div className='h-[90%] -mx-4 flex-1 overflow-auto px-3 py-1 rounded-lg lg:flex-row lg:space-y-0 lg:space-x-12 '>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading categories...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-destructive mb-2">Error loading categories</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : (
            <DataTable columns={columns} data={categories} />
          )}
        </div>
        <CategoryDialogs />
      </Main>
    </>
  )
}

export default function CategoriesPage() {
  return (
    <CategoryProvider>
      <CategoriesContent />
    </CategoryProvider>
  )
} 