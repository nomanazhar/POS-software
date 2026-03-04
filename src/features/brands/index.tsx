import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { ThemeSwitch } from '@/components/theme-switch'
import { BrandList } from './components/brand-list'
import { SidebarProvider } from '@/components/ui/sidebar'
import { SearchProvider } from '@/context/search-context'
import { ProfileDropdown } from '@/components/profile-dropdown'

export default function BrandsPage() {

  return (
    <SidebarProvider>
      <SearchProvider>
        <div className='flex h-screen overflow-hidden'>
          <AppSidebar />
          <div className='flex-1 flex flex-col overflow-hidden'>
            <Header >
              <div className='ml-auto flex items-center justify-end space-x-2 sm:space-x-4 flex-shrink-0'>
                <ThemeSwitch />
                <ProfileDropdown />
              </div>
            </Header>
            <Main className="p-4 sm:p-6">
              <div className="space-y-6  w-[50vw]">
                <div className="flex items-center justify-between">
                  <h1 className='text-xl sm:text-2xl font-bold tracking-tight'>Brands</h1>
                </div>
                <BrandList />
              </div>
            </Main>
          </div>
        </div>
      </SearchProvider>
    </SidebarProvider>
  )
}
