import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { columns } from './components/columns'
import { DataTable } from './components/data-table'
import { ProductDialogs } from './components/product-dialogs'
import { ProductPrimaryButtons } from './components/product-primary-buttons'
import ProductProvider, { useProductContext } from './context/product-context'
import { CategoryProvider } from '@/features/categories/context/category-context'


function ProductsContent() {
  const { products, loading, error } = useProductContext()

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
          <div className='w-[73%]'>
            <h2 className='text-2xl font-bold tracking-tight underline'>Products</h2>
            <p className='text-muted-foreground'>
              Manage your product catalog, brands, categories, and pricing here.
            </p>
          </div>
          <ProductPrimaryButtons />
        </div>
        <div className='h-[90%] -mx-4 flex-1 overflow-auto px-3 py-1 rounded-lg lg:flex-row lg:space-y-0 lg:space-x-12 '>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-destructive mb-2">Error loading products</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : (
            <DataTable data={products} columns={columns} />
          )}
        </div>
        <ProductDialogs />
      </Main>
    </>
  )
}

export default function Products() {
  return (
    <CategoryProvider>
      <ProductProvider>
        <ProductsContent />
      </ProductProvider>
    </CategoryProvider>
  )
}
