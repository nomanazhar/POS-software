import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import InventoryProvider from './context/inventory-context'
import { DataTable } from './components/data-table'
import { columns } from './components/columns'
import { InventoryDialogs } from './components/tasks-dialogs'
import { useInventory } from './context/inventory-context'
import { CategoryProvider } from '@/features/categories/context/category-context'


function InventoryContent() {
  const { products, loading, error } = useInventory()

  return (
    <>
      <Header fixed>
        <div className='ml-auto flex items-center justify-end space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>  
      </Header>
      <Main className='no-scrollbar'>
        <div className='h-[10%] mb-2 flex flex-wrap items-center justify-between space-y-2 gap-x-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight underline'>Inventory</h2>
            <p className='text-muted-foreground'>
              Inventory is read-only. Products come from Products; stock updates via Purchases.
            </p>
          </div>
        </div>
        <div className='h-[90%] -mx-4 flex-1 overflow-auto px-3 py-1 rounded-lg lg:flex-row lg:space-y-0 lg:space-x-12 '>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading inventory...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-destructive mb-2">Error loading inventory</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : (
            <DataTable data={products} columns={columns} />
          )}
        </div>
        <InventoryDialogs />
      </Main>
    </>
  )
}

export default function Inventory() {
  return (
    <CategoryProvider>
      <InventoryProvider>
        <InventoryContent />
      </InventoryProvider>
    </CategoryProvider>
  )
}
