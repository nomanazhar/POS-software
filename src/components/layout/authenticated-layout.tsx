import Cookies from 'js-cookie'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { SearchProvider } from '@/context/search-context'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'
import SkipToMain from '@/components/skip-to-main'
import { useAuthStore } from '@/stores/authStore'
import { GlobalKeyboardShortcuts } from '@/components/global-keyboard-shortcuts'
import { useEffect } from 'react'

interface Props {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: Props) {
  const defaultOpen = Cookies.get('sidebar_state') !== 'false'
  const accessToken = useAuthStore((s) => s.auth.accessToken)
  const navigate = useNavigate()

  useEffect(() => {
    if (!accessToken) {
      navigate({ to: '/sign-in' })
    }
  }, [accessToken, navigate])

  if (!accessToken) return null

  return (
    <SearchProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <GlobalKeyboardShortcuts />
        <SkipToMain />
        <AppSidebar />
        <div
          id='content'
          className={cn(
            'relative flex min-h-screen flex-1 flex-col',
            'peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon))]',
            'peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]',
            'sm:transition-[width] sm:duration-200 sm:ease-linear',
            'flex h-svh flex-col',
            'group-data-[scroll-locked=1]/body:h-full',
            'has-[main.fixed-main]:group-data-[scroll-locked=1]/body:h-svh',
            // Responsive improvements
            'w-full max-w-full overflow-x-hidden',
            'md:min-h-screen lg:min-h-screen',
            'sm:max-w-none md:max-w-none lg:max-w-none'
          )}
        >
          {children ? children : <Outlet />}
        </div>
      </SidebarProvider>
    </SearchProvider>
  )
}
