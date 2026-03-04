import { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import GeneralError from '@/features/errors/general-error'
import NotFoundError from '@/features/errors/not-found-error'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import SignIn from '@/features/auth/sign-in'

// Loading component for initial auth check
function InitialLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  )
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: () => {
    const [isLoading, setIsLoading] = useState(true)
    const accessToken = useAuthStore((s) => s.auth.accessToken)

    // Add a small delay to ensure auth state is stable
    useEffect(() => {
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 100)
      return () => clearTimeout(timer)
    }, [])

    // Show loading state while checking auth
    if (isLoading) {
      return <InitialLoading />
    }

    // Show sign-in if no access token
    if (!accessToken) {
      return (
        <>
          <NavigationProgress />
          <SignIn />
          <Toaster duration={1000} />
        </>
      )
    }

    // Show the app if authenticated
    return (
      <>
        <NavigationProgress />
        <Outlet />
        <Toaster duration={1000} />
      </>
    )
  },
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
